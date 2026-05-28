import { create } from 'zustand';
import type { SessionInfo, ProxyRecord } from '../types';

export interface SessionFrame {
  dataUrl: string; // data:image/jpeg;base64,...
  ts: number;
}

interface SessionStore {
  // Connection
  connected: boolean;
  reconnecting: boolean;
  setConnected: (v: boolean) => void;
  setReconnecting: (v: boolean) => void;

  // Sessions
  sessions: Record<string, SessionInfo>;
  frames: Record<string, SessionFrame>;
  setSessions: (list: SessionInfo[]) => void;
  upsertSession: (s: SessionInfo) => void;
  removeSession: (id: string) => void;
  putFrame: (sessionId: string, data: string) => void;

  // Selection
  selectedIds: Set<string>;
  toggleSelected: (id: string) => void;
  selectAll: () => void;
  clearSelected: () => void;

  // Focus (single session receiving input)
  focusedId: string | null;
  setFocused: (id: string | null) => void;

  // Script panel
  scriptCode: string;
  setScriptCode: (code: string) => void;
  scriptResults: Record<string, unknown>;
  putScriptResult: (sessionId: string, result: unknown) => void;

  // Proxies
  proxies: ProxyRecord[];
  setProxies: (list: ProxyRecord[]) => void;

  // Errors
  errors: { sessionId?: string; message: string; ts: number }[];
  addError: (sessionId: string | undefined, message: string) => void;
  clearErrors: () => void;
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  // Connection
  connected: false,
  reconnecting: false,
  setConnected: (v) => set({ connected: v }),
  setReconnecting: (v) => set({ reconnecting: v }),

  // Sessions
  sessions: {},
  frames: {},
  setSessions: (list) => {
    const sessions: Record<string, SessionInfo> = {};
    for (const s of list) sessions[s.id] = s;
    set({ sessions });
  },
  upsertSession: (s) =>
    set((state) => ({ sessions: { ...state.sessions, [s.id]: s } })),
  removeSession: (id) =>
    set((state) => {
      const sessions = { ...state.sessions };
      const frames = { ...state.frames };
      delete sessions[id];
      delete frames[id];
      const selectedIds = new Set(state.selectedIds);
      selectedIds.delete(id);
      return { sessions, frames, selectedIds };
    }),
  putFrame: (sessionId, data) =>
    set((state) => ({
      frames: {
        ...state.frames,
        [sessionId]: { dataUrl: `data:image/jpeg;base64,${data}`, ts: Date.now() },
      },
    })),

  // Selection
  selectedIds: new Set(),
  toggleSelected: (id) =>
    set((state) => {
      const selectedIds = new Set(state.selectedIds);
      if (selectedIds.has(id)) selectedIds.delete(id);
      else selectedIds.add(id);
      return { selectedIds };
    }),
  selectAll: () =>
    set((state) => ({
      selectedIds: new Set(Object.keys(state.sessions)),
    })),
  clearSelected: () => set({ selectedIds: new Set() }),

  // Focus
  focusedId: null,
  setFocused: (id) => set({ focusedId: id }),

  // Script panel
  scriptCode: 'document.title',
  setScriptCode: (code) => set({ scriptCode: code }),
  scriptResults: {},
  putScriptResult: (sessionId, result) =>
    set((state) => ({
      scriptResults: { ...state.scriptResults, [sessionId]: result },
    })),

  // Proxies
  proxies: [],
  setProxies: (list) => set({ proxies: list }),

  // Errors
  errors: [],
  addError: (sessionId, message) =>
    set((state) => ({
      errors: [{ sessionId, message, ts: Date.now() }, ...state.errors].slice(0, 50),
    })),
  clearErrors: () => set({ errors: [] }),
}));

/** Helper to get ordered session list from the store */
export function getSessionList(store: SessionStore): SessionInfo[] {
  return Object.values(store.sessions).sort(
    (a, b) => a.lastActivity - b.lastActivity
  );
}
