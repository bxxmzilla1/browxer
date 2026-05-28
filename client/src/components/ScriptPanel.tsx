import { useState } from 'react';
import { useSessionStore } from '../store/sessionStore';
import type { ClientMessage } from '../types';

interface Props {
  send: (msg: ClientMessage) => void;
}

export function ScriptPanel({ send }: Props) {
  const [open, setOpen] = useState(false);
  const code = useSessionStore((s) => s.scriptCode);
  const setCode = useSessionStore((s) => s.setScriptCode);
  const focusedId = useSessionStore((s) => s.focusedId);
  const selectedIds = useSessionStore((s) => s.selectedIds);
  const scriptResults = useSessionStore((s) => s.scriptResults);

  const targets = focusedId
    ? [focusedId]
    : Array.from(selectedIds);

  const run = () => {
    if (targets.length === 0) return;
    if (targets.length === 1) {
      send({ type: 'runScript', sessionId: targets[0], code });
    } else {
      send({ type: 'batch', sessionIds: targets, command: { type: 'runScript', code } });
    }
  };

  const resultEntries = targets
    .filter((id) => id in scriptResults)
    .map((id) => ({ id, result: scriptResults[id] }));

  return (
    <div className="border-t border-surface-border bg-surface-card">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-2 text-xs text-gray-400 hover:text-white transition"
      >
        <span className="flex items-center gap-2">
          <span className="text-accent-light">{'</>'}</span>
          Script Panel
          {targets.length > 0 && (
            <span className="text-gray-500">— {targets.length} target{targets.length !== 1 ? 's' : ''}</span>
          )}
        </span>
        <span>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-5 pb-4 space-y-3">
          <textarea
            className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-accent resize-none h-28"
            placeholder="// JavaScript to evaluate in the page context&#10;document.title"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                run();
              }
            }}
            spellCheck={false}
          />

          <div className="flex items-center gap-3">
            <button
              onClick={run}
              disabled={targets.length === 0}
              className="text-xs bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-lg transition disabled:opacity-40"
            >
              Run ⌘↵
            </button>
            {targets.length === 0 && (
              <span className="text-xs text-gray-500">Focus or select a session first</span>
            )}
          </div>

          {resultEntries.length > 0 && (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {resultEntries.map(({ id, result }) => (
                <div key={id} className="bg-surface rounded px-3 py-2">
                  <span className="text-xs text-gray-500 font-mono">[{id.slice(0, 8)}] </span>
                  <span className="text-xs text-green-400 font-mono">
                    {JSON.stringify(result, null, 2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
