import { chromium } from 'playwright-core';
import { v4 as uuidv4 } from 'uuid';
import type {
  Session,
  SessionInfo,
  ProxyRecord,
} from './types.js';
import {
  SCREENCAST_FOCUSED,
  SCREENCAST_THUMB,
  VIEWPORT,
} from './types.js';
import {
  persistSession,
  rehydrateSession,
  upsertSessionMeta,
  markSessionClosed,
  getProxy,
} from './persistence.js';

export type FrameCallback = (sessionId: string, data: string) => void;
export type SessionEventCallback = (info: SessionInfo) => void;

const PERSIST_INTERVAL = Number(process.env.PERSIST_INTERVAL_MS ?? 30_000);

class SessionManager {
  private sessions = new Map<string, Session>();
  private onFrame: FrameCallback = () => {};
  private onSessionUpdate: SessionEventCallback = () => {};

  setFrameCallback(cb: FrameCallback) {
    this.onFrame = cb;
  }

  setSessionUpdateCallback(cb: SessionEventCallback) {
    this.onSessionUpdate = cb;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  listSessions(): SessionInfo[] {
    return Array.from(this.sessions.values()).map(toInfo);
  }

  async spawnSession(label: string, proxyId?: string): Promise<SessionInfo> {
    const id = uuidv4();
    const proxy = proxyId ? await getProxy(proxyId) ?? undefined : undefined;

    const session: Session = {
      id,
      label,
      proxyId,
      proxy,
      status: 'connecting',
      focused: false,
      hidden: false,
      lastActivity: Date.now(),
      screencastActive: false,
    };

    this.sessions.set(id, session);
    this.emit(session);
    await upsertSessionMeta(session);

    // Connect asynchronously so spawn returns immediately
    this.connect(session).catch((err) => {
      console.error(`[session ${id}] Connect failed:`, err);
      session.status = 'error';
      this.emit(session);
    });

    return toInfo(session);
  }

  async closeSession(id: string): Promise<void> {
    const session = this.sessions.get(id);
    if (!session) return;

    await this.teardown(session);
    this.sessions.delete(id);
  }

  async reconnectSession(id: string): Promise<void> {
    const session = this.sessions.get(id);
    if (!session) throw new Error(`Session ${id} not found`);

    // Persist before reconnecting
    await persistSession(session);
    await this.teardown(session, false);

    session.status = 'connecting';
    session.screencastActive = false;
    this.emit(session);

    await this.connect(session);
  }

  /** Record activity and update last-active timestamp. */
  touch(id: string) {
    const s = this.sessions.get(id);
    if (s) s.lastActivity = Date.now();
  }

  async setFocus(id: string, focused: boolean): Promise<void> {
    const session = this.sessions.get(id);
    if (!session || session.status !== 'active') return;

    session.focused = focused;
    this.emit(session);

    if (!session.hidden && session.cdpSession) {
      await this.restartScreencast(session);
    }
  }

  async setHidden(id: string, hidden: boolean): Promise<void> {
    const session = this.sessions.get(id);
    if (!session || session.status !== 'active') return;

    session.hidden = hidden;
    this.emit(session);

    if (!session.cdpSession) return;

    if (hidden) {
      await this.stopScreencast(session);
    } else {
      await this.startScreencast(session);
    }
  }

  // ── Commands ───────────────────────────────────────────────────────────────

  async navigate(id: string, url: string): Promise<void> {
    const { page } = this.getActive(id);
    this.touch(id);
    await page.goto(url, { waitUntil: 'domcontentloaded' });
  }

  async click(id: string, x: number, y: number): Promise<void> {
    const { page } = this.getActive(id);
    this.touch(id);
    await page.mouse.click(x, y);
  }

  async type(id: string, text: string): Promise<void> {
    const { page } = this.getActive(id);
    this.touch(id);
    await page.keyboard.type(text);
  }

  async pressKey(id: string, key: string): Promise<void> {
    const { page } = this.getActive(id);
    this.touch(id);
    await page.keyboard.press(key);
  }

  async scroll(id: string, deltaY: number): Promise<void> {
    const { page } = this.getActive(id);
    this.touch(id);
    await page.mouse.wheel(0, deltaY);
  }

  async runScript(id: string, code: string): Promise<unknown> {
    const { page } = this.getActive(id);
    this.touch(id);
    // eslint-disable-next-line no-new-func
    return await page.evaluate(new Function(code) as () => unknown);
  }

  // ── Graceful shutdown ──────────────────────────────────────────────────────

  async shutdown(): Promise<void> {
    console.log('[sessionManager] Shutting down all sessions…');
    await Promise.all(
      Array.from(this.sessions.values()).map((s) => this.teardown(s))
    );
    this.sessions.clear();
  }

  // ── Idle reaper ────────────────────────────────────────────────────────────

  getIdleSessions(timeoutMs: number): string[] {
    const now = Date.now();
    const idle: string[] = [];
    for (const [id, s] of this.sessions) {
      if (s.status === 'active' && now - s.lastActivity > timeoutMs) {
        idle.push(id);
      }
    }
    return idle;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async connect(session: Session): Promise<void> {
    const wsUrl = buildCdpUrl(session.proxy);

    const browser = await chromium.connectOverCDP(wsUrl);
    session.browser = browser;

    const context = await browser.newContext({
      viewport: VIEWPORT,
      ...(session.proxy ? { proxy: { server: session.proxy.url } } : {}),
    });
    session.context = context;

    const page = await context.newPage();
    session.page = page;

    // Restore persisted cookies/storage
    await rehydrateSession(session);

    const cdpSession = await page.context().newCDPSession(page);
    session.cdpSession = cdpSession;

    session.status = 'active';
    this.emit(session);

    // Start streaming
    await this.startScreencast(session);

    // Auto-persist on interval
    session.persistTimer = setInterval(
      () => persistSession(session),
      PERSIST_INTERVAL
    );

    // Handle unexpected disconnects
    browser.on('disconnected', () => {
      if (session.status === 'active') {
        console.warn(`[session ${session.id}] Browser disconnected unexpectedly`);
        session.status = 'error';
        session.screencastActive = false;
        this.emit(session);
      }
    });
  }

  private async startScreencast(session: Session): Promise<void> {
    if (!session.cdpSession || session.hidden) return;

    const params = session.focused ? SCREENCAST_FOCUSED : SCREENCAST_THUMB;

    const frameHandler = async (event: { data: string; sessionId: number }) => {
      this.onFrame(session.id, event.data);
      try {
        await session.cdpSession!.send('Page.screencastFrameAck', {
          sessionId: event.sessionId,
        });
      } catch {
        // session may have closed
      }
    };

    try {
      await session.cdpSession.send('Page.startScreencast', params);
      session.screencastActive = true;
      session.cdpSession.on('Page.screencastFrame', frameHandler);
      // Store handler so we can remove it on restartScreencast
      (session as unknown as { _frameHandler?: typeof frameHandler })._frameHandler = frameHandler;
    } catch (err) {
      console.error(`[session ${session.id}] startScreencast failed:`, err);
    }
  }

  private async stopScreencast(session: Session): Promise<void> {
    if (!session.cdpSession || !session.screencastActive) return;
    try {
      await session.cdpSession.send('Page.stopScreencast');
      session.screencastActive = false;
    } catch {
      // ignore if already stopped
    }
  }

  private async restartScreencast(session: Session): Promise<void> {
    await this.stopScreencast(session);
    // Remove previously registered frame listener
    const stored = (session as unknown as { _frameHandler?: (...args: unknown[]) => void })._frameHandler;
    if (session.cdpSession && stored) {
      session.cdpSession.removeListener('Page.screencastFrame', stored);
    }
    await this.startScreencast(session);
  }

  private async teardown(session: Session, persist = true): Promise<void> {
    if (session.persistTimer) {
      clearInterval(session.persistTimer);
      session.persistTimer = undefined;
    }

    if (persist) {
      await persistSession(session);
      await markSessionClosed(session.id);
    }

    try {
      await this.stopScreencast(session);
    } catch { /* ignore */ }

    try {
      await session.context?.close();
    } catch { /* ignore */ }

    try {
      await session.browser?.close();
    } catch { /* ignore */ }

    session.status = 'closed';
    session.browser = undefined;
    session.context = undefined;
    session.page = undefined;
    session.cdpSession = undefined;
    session.screencastActive = false;

    this.emit(session);
  }

  private getActive(id: string): { page: NonNullable<Session['page']> } {
    const s = this.sessions.get(id);
    if (!s) throw new Error(`Session ${id} not found`);
    if (s.status !== 'active' || !s.page) throw new Error(`Session ${id} is not active`);
    return { page: s.page };
  }

  private emit(session: Session) {
    this.onSessionUpdate(toInfo(session));
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildCdpUrl(proxy?: ProxyRecord): string {
  const base = process.env.BROWSERLESS_WS_URL ?? 'ws://localhost:3000';
  const url = new URL(base);

  const token = process.env.BROWSERLESS_TOKEN;
  if (token) url.searchParams.set('token', token);

  // Browserless accepts Chrome flags as query params
  if (proxy) {
    url.searchParams.set('--proxy-server', proxy.url);
  }

  return url.toString();
}

function toInfo(s: Session): SessionInfo {
  return {
    id: s.id,
    label: s.label,
    proxyId: s.proxyId,
    proxyLabel: s.proxy?.label,
    status: s.status,
    focused: s.focused,
    hidden: s.hidden,
    lastActivity: s.lastActivity,
  };
}

export const sessionManager = new SessionManager();
