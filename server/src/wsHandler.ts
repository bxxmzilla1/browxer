import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import type { Server } from 'http';
import { sessionManager } from './sessionManager.js';
import type { ClientMessage, ServerMessage, BatchCommand } from './types.js';

const clients = new Set<WebSocket>();

export function setupWsServer(httpServer: Server): WebSocketServer {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Wire session updates → broadcast to all clients
  sessionManager.setSessionUpdateCallback((session) => {
    broadcast({ type: 'sessionUpdate', session });
  });

  // Wire frame callback → broadcast to all clients
  sessionManager.setFrameCallback((sessionId, data) => {
    broadcast({ type: 'frame', sessionId, data });
  });

  wss.on('connection', (ws: WebSocket, _req: IncomingMessage) => {
    clients.add(ws);

    // Send full session list on connect
    send(ws, { type: 'sessionList', sessions: sessionManager.listSessions() });

    ws.on('message', async (raw) => {
      let msg: ClientMessage;
      try {
        msg = JSON.parse(raw.toString()) as ClientMessage;
      } catch {
        send(ws, { type: 'error', message: 'Invalid JSON' });
        return;
      }

      try {
        await handleMessage(ws, msg);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const sessionId = 'sessionId' in msg ? msg.sessionId : undefined;
        send(ws, { type: 'error', sessionId, message });
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
    });

    ws.on('error', (err) => {
      console.error('[ws] Client error:', err.message);
      clients.delete(ws);
    });
  });

  return wss;
}

async function handleMessage(ws: WebSocket, msg: ClientMessage): Promise<void> {
  switch (msg.type) {
    case 'navigate':
      await sessionManager.navigate(msg.sessionId, msg.url);
      break;

    case 'click':
      await sessionManager.click(msg.sessionId, msg.x, msg.y);
      break;

    case 'type':
      await sessionManager.type(msg.sessionId, msg.text);
      break;

    case 'key':
      await sessionManager.pressKey(msg.sessionId, msg.key);
      break;

    case 'scroll':
      await sessionManager.scroll(msg.sessionId, msg.deltaY);
      break;

    case 'runScript': {
      const result = await sessionManager.runScript(msg.sessionId, msg.code);
      send(ws, { type: 'scriptResult', sessionId: msg.sessionId, result });
      break;
    }

    case 'setFocus':
      await sessionManager.setFocus(msg.sessionId, msg.focused);
      break;

    case 'setHidden':
      await sessionManager.setHidden(msg.sessionId, msg.hidden);
      break;

    case 'restart':
      await sessionManager.reconnectSession(msg.sessionId);
      break;

    case 'close':
      await sessionManager.closeSession(msg.sessionId);
      break;

    case 'batch':
      await handleBatch(ws, msg.sessionIds, msg.command);
      break;

    default:
      send(ws, { type: 'error', message: `Unknown message type: ${(msg as { type: string }).type}` });
  }
}

async function handleBatch(ws: WebSocket, sessionIds: string[], command: BatchCommand): Promise<void> {
  await Promise.allSettled(
    sessionIds.map(async (id) => {
      try {
        switch (command.type) {
          case 'navigate':
            await sessionManager.navigate(id, command.url);
            break;
          case 'type':
            await sessionManager.type(id, command.text);
            break;
          case 'key':
            await sessionManager.pressKey(id, command.key);
            break;
          case 'runScript': {
            const result = await sessionManager.runScript(id, command.code);
            send(ws, { type: 'scriptResult', sessionId: id, result });
            break;
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        send(ws, { type: 'error', sessionId: id, message });
      }
    })
  );
}

function send(ws: WebSocket, msg: ServerMessage) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

export function broadcast(msg: ServerMessage) {
  const payload = JSON.stringify(msg);
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}
