import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import { setupWsServer } from './wsHandler.js';
import restRoutes from './restRoutes.js';
import { sessionManager } from './sessionManager.js';
import { startIdleReaper, stopIdleReaper } from './idleReaper.js';

const PORT = Number(process.env.PORT ?? 4000);

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use(restRoutes);

const httpServer = http.createServer(app);
setupWsServer(httpServer);

httpServer.listen(PORT, () => {
  console.log(`[server] Listening on http://localhost:${PORT}`);
  console.log(`[server] WebSocket at  ws://localhost:${PORT}/ws`);
  startIdleReaper();
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────

async function shutdown(signal: string) {
  console.log(`[server] ${signal} received – shutting down`);
  stopIdleReaper();
  await sessionManager.shutdown();
  httpServer.close(() => {
    console.log('[server] HTTP server closed');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
