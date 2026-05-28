import { Router } from 'express';
import { sessionManager } from './sessionManager.js';
import {
  listProxies,
  createProxy,
  deleteProxy,
} from './persistence.js';
import type { Request, Response } from 'express';

const router = Router();

// ── Runtime config (Browserless credentials) ──────────────────────────────────

router.get('/config', (_req: Request, res: Response) => {
  // Never return the token – only return whether it's set and the (masked) URL
  const wsUrl = process.env.BROWSERLESS_WS_URL ?? '';
  let maskedUrl = wsUrl;
  try {
    const u = new URL(wsUrl);
    if (u.searchParams.has('token')) {
      u.searchParams.set('token', '••••');
      maskedUrl = u.toString();
    }
  } catch { /* not a valid URL yet */ }

  res.json({
    wsUrl: maskedUrl,
    hasToken: !!process.env.BROWSERLESS_TOKEN,
  });
});

router.post('/config', (req: Request, res: Response) => {
  const { wsUrl, token } = req.body as { wsUrl?: string; token?: string };

  if (wsUrl !== undefined) {
    process.env.BROWSERLESS_WS_URL = wsUrl.trim();
  }
  if (token !== undefined) {
    process.env.BROWSERLESS_TOKEN = token.trim();
  }

  res.json({ ok: true });
});

// ── Sessions ──────────────────────────────────────────────────────────────────

router.get('/sessions', (_req: Request, res: Response) => {
  res.json(sessionManager.listSessions());
});

router.post('/sessions', async (req: Request, res: Response) => {
  const { label, proxyId } = req.body as { label?: string; proxyId?: string };
  if (!label) {
    res.status(400).json({ error: 'label is required' });
    return;
  }
  try {
    const info = await sessionManager.spawnSession(label, proxyId);
    res.status(201).json(info);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

router.delete('/sessions/:id', async (req: Request, res: Response) => {
  try {
    await sessionManager.closeSession(req.params.id);
    res.status(204).send();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

// ── Proxies ───────────────────────────────────────────────────────────────────

router.get('/proxies', async (_req: Request, res: Response) => {
  const proxies = await listProxies();
  // Mask credentials in the URL before sending to client
  res.json(proxies.map(maskProxy));
});

router.post('/proxies', async (req: Request, res: Response) => {
  const { label, url, type } = req.body as {
    label?: string;
    url?: string;
    type?: string;
  };
  if (!label || !url || !type) {
    res.status(400).json({ error: 'label, url, and type are required' });
    return;
  }
  if (type !== 'http' && type !== 'socks5') {
    res.status(400).json({ error: 'type must be http or socks5' });
    return;
  }
  try {
    const proxy = await createProxy({ label, url, type });
    res.status(201).json(proxy ? maskProxy(proxy) : null);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

router.delete('/proxies/:id', async (req: Request, res: Response) => {
  try {
    await deleteProxy(req.params.id);
    res.status(204).send();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

export default router;

// ── Helpers ───────────────────────────────────────────────────────────────────

function maskProxy(p: { id: string; label: string; url: string; type: string; last_used?: string }) {
  let masked = p.url;
  try {
    const u = new URL(p.url);
    if (u.password) u.password = '••••';
    if (u.username) u.username = u.username.slice(0, 3) + '•••';
    masked = u.toString();
  } catch { /* not a valid URL */ }
  return { ...p, url: masked };
}
