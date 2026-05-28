import { useEffect, useRef, useCallback } from 'react';
import { useSessionStore } from '../store/sessionStore';
import type { ClientMessage, ServerMessage } from '../types';

const WS_URL =
  (import.meta.env.VITE_WS_URL as string | undefined) ??
  `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;

const INITIAL_DELAY = 1_000;
const MAX_DELAY = 30_000;

export function useWebSocket() {
  const ws = useRef<WebSocket | null>(null);
  const retryDelay = useRef(INITIAL_DELAY);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendQueue = useRef<string[]>([]);

  const store = useSessionStore.getState;

  const flushQueue = () => {
    while (sendQueue.current.length && ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(sendQueue.current.shift()!);
    }
  };

  const connect = useCallback(() => {
    if (ws.current) return;

    const socket = new WebSocket(WS_URL);
    ws.current = socket;

    socket.onopen = () => {
      retryDelay.current = INITIAL_DELAY;
      store().setConnected(true);
      store().setReconnecting(false);
      flushQueue();
    };

    socket.onmessage = (ev) => {
      let msg: ServerMessage;
      try {
        msg = JSON.parse(ev.data as string) as ServerMessage;
      } catch {
        return;
      }

      const s = store();
      switch (msg.type) {
        case 'sessionList':
          s.setSessions(msg.sessions);
          break;
        case 'sessionUpdate':
          if (msg.session.status === 'closed') {
            s.removeSession(msg.session.id);
          } else {
            s.upsertSession(msg.session);
          }
          break;
        case 'frame':
          s.putFrame(msg.sessionId, msg.data);
          break;
        case 'scriptResult':
          s.putScriptResult(msg.sessionId, msg.result);
          break;
        case 'error':
          s.addError(msg.sessionId, msg.message);
          break;
      }
    };

    socket.onclose = () => {
      ws.current = null;
      store().setConnected(false);
      store().setReconnecting(true);

      retryTimer.current = setTimeout(() => {
        retryDelay.current = Math.min(retryDelay.current * 2, MAX_DELAY);
        connect();
      }, retryDelay.current);
    };

    socket.onerror = () => {
      socket.close();
    };
  }, [store]);

  const send = useCallback((msg: ClientMessage) => {
    const payload = JSON.stringify(msg);
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(payload);
    } else {
      sendQueue.current.push(payload);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (retryTimer.current) clearTimeout(retryTimer.current);
      ws.current?.close();
      ws.current = null;
    };
  }, [connect]);

  return { send };
}
