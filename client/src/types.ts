export type SessionStatus = 'connecting' | 'active' | 'error' | 'closed';

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

export interface ProxyRecord {
  id: string;
  label: string;
  url: string; // credentials masked by server
  type: 'http' | 'socks5';
  last_used?: string;
}

// ── WS message types (client perspective) ─────────────────────────────────────

export type ServerMessage =
  | { type: 'frame'; sessionId: string; data: string }
  | { type: 'sessionList'; sessions: SessionInfo[] }
  | { type: 'sessionUpdate'; session: SessionInfo }
  | { type: 'scriptResult'; sessionId: string; result: unknown }
  | { type: 'error'; sessionId?: string; message: string };

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

// Viewport the backend uses – used for coordinate scaling
export const REMOTE_VIEWPORT = { width: 1280, height: 720 };
