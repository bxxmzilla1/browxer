import { useState } from 'react';
import { useSessionStore } from '../store/sessionStore';
import type { ClientMessage } from '../types';

interface Props {
  send: (msg: ClientMessage) => void;
}

export function BatchBar({ send }: Props) {
  const selectedIds = useSessionStore((s) => s.selectedIds);
  const clearSelected = useSessionStore((s) => s.clearSelected);
  const selectAll = useSessionStore((s) => s.selectAll);
  const sessionCount = useSessionStore((s) => Object.keys(s.sessions).length);

  const [batchUrl, setBatchUrl] = useState('');
  const [batchText, setBatchText] = useState('');
  const [activeAction, setActiveAction] = useState<'navigate' | 'type' | 'reload' | null>(null);

  const ids = Array.from(selectedIds);
  if (ids.length === 0) return null;

  const batchNavigate = () => {
    if (!batchUrl.trim()) return;
    send({ type: 'batch', sessionIds: ids, command: { type: 'navigate', url: batchUrl.trim() } });
    setBatchUrl('');
    setActiveAction(null);
  };

  const batchType = () => {
    if (!batchText) return;
    send({ type: 'batch', sessionIds: ids, command: { type: 'type', text: batchText } });
    setBatchText('');
    setActiveAction(null);
  };

  const batchReload = () => {
    send({ type: 'batch', sessionIds: ids, command: { type: 'key', key: 'F5' } });
  };

  return (
    <div className="bg-surface-card border-t border-surface-border px-5 py-2 flex flex-wrap items-center gap-3 text-sm">
      {/* Selection summary */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-accent-light font-semibold">{ids.length}</span>
        <span className="text-gray-400">selected</span>
        {ids.length < sessionCount && (
          <button onClick={selectAll} className="text-xs text-gray-500 hover:text-white transition">select all</button>
        )}
        <button onClick={clearSelected} className="text-xs text-gray-500 hover:text-white transition">deselect</button>
      </div>

      <div className="w-px h-5 bg-surface-border" />

      {/* Batch actions */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Navigate */}
        {activeAction === 'navigate' ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              className="bg-surface border border-accent rounded px-2 py-1 text-white text-xs w-56 focus:outline-none"
              placeholder="https://…"
              value={batchUrl}
              onChange={(e) => setBatchUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') batchNavigate(); if (e.key === 'Escape') setActiveAction(null); }}
            />
            <button onClick={batchNavigate} className="text-xs bg-accent hover:bg-accent-hover text-white px-2 py-1 rounded transition">Go</button>
            <button onClick={() => setActiveAction(null)} className="text-xs text-gray-500 hover:text-white">✕</button>
          </div>
        ) : (
          <button
            onClick={() => setActiveAction('navigate')}
            className="text-xs text-gray-300 hover:text-white bg-surface-hover px-2 py-1 rounded transition"
          >
            Navigate all
          </button>
        )}

        {/* Type */}
        {activeAction === 'type' ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              className="bg-surface border border-accent rounded px-2 py-1 text-white text-xs w-40 focus:outline-none"
              placeholder="text to type…"
              value={batchText}
              onChange={(e) => setBatchText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') batchType(); if (e.key === 'Escape') setActiveAction(null); }}
            />
            <button onClick={batchType} className="text-xs bg-accent hover:bg-accent-hover text-white px-2 py-1 rounded transition">Type</button>
            <button onClick={() => setActiveAction(null)} className="text-xs text-gray-500 hover:text-white">✕</button>
          </div>
        ) : (
          <button
            onClick={() => setActiveAction('type')}
            className="text-xs text-gray-300 hover:text-white bg-surface-hover px-2 py-1 rounded transition"
          >
            Type all
          </button>
        )}

        <button
          onClick={batchReload}
          className="text-xs text-gray-300 hover:text-white bg-surface-hover px-2 py-1 rounded transition"
        >
          Reload all
        </button>
      </div>
    </div>
  );
}
