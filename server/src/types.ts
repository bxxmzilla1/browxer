import type { Browser, BrowserContext, Page, CDPSession } from 'playwright-core';

// ── Domain records ────────────────────────────────────────────────────────────

export interface ProxyRecord {
  id: string;
  label: string;
  url: string;
  type: 'http' | 'socks5';
  last_used?: string;
}

export type SessionStatus = 'connecting' | 'active' | 'error' | 'closed';

/** Full internal session state (server-side only) */
export interface Session {
  id: string;
  label: string;
  proxyId?: string;
  proxy?: ProxyRecord;
  status: SessionStatus;
  focused: boolean;
  hidden: boolean;
  lastActivity: number;
  browser?: Browser;
  context?: BrowserContext;
  page?: Page;
  cdpSession?: CDPSession;
  screencastActive: boolean;
  persistTimer?: ReturnType<typeof setInterval>;
}

/** Serialisable session info sent to the client */
export interface SessionInfo {
  id: string;
  label: string;
  proxyId?: string;
  proxyLabel?: string;
  status: SessionStatus;
  focused: boolean;
  hidden: boolean;
  lastActivity: number;
}

// ── WebSocket message types ───────────────────────────────────────────────────

// Client → Server
export type ClientMessage =
  | { type: 'navigate'; sessionId: string; url: string }
  | { type: 'click'; sessionId: string; x: number; y: number }
  | { type: 'type'; sessionId: string; text: string }
  | { type: 'key'; sessionId: string; key: string }
  | { type: 'scroll'; sessionId: string; deltaY: number }
  | { type: 'runScript'; sessionId: string; code: string }
  | { type: 'setFocus'; sessionId: string; focused: boolean }
  | { type: 'setHidden'; sessionId: string; hidden: boolean }
  | { type: 'restart'; sessionId: string }
  | { type: 'close'; sessionId: string }
  | { type: 'batch'; sessionIds: string[]; command: BatchCommand };

export type BatchCommand =
  | { type: 'navigate'; url: string }
  | { type: 'type'; text: string }
  | { type: 'key'; key: string }
  | { type: 'runScript'; code: string };

// Server → Client
export type ServerMessage =
  | { type: 'frame'; sessionId: string; data: string }
  | { type: 'sessionList'; sessions: SessionInfo[] }
  | { type: 'sessionUpdate'; session: SessionInfo }
  | { type: 'scriptResult'; sessionId: string; result: unknown }
  | { type: 'error'; sessionId?: string; message: string };

// ── Screencast quality tiers ──────────────────────────────────────────────────

export const SCREENCAST_FOCUSED = { format: 'jpeg', quality: 45, everyNthFrame: 2 } as const;
export const SCREENCAST_THUMB = { format: 'jpeg', quality: 30, everyNthFrame: 8 } as const;

// Viewport dimensions sent to every new browser context
export const VIEWPORT = { width: 1280, height: 720 } as const;
