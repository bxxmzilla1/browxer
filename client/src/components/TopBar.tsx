import { useState } from 'react';
import { ConnectionStatus } from './ConnectionStatus';
import { NewSessionModal } from './NewSessionModal';
import { ProxyModal } from './ProxyModal';
import { SettingsModal } from './SettingsModal';
import { useSessionStore } from '../store/sessionStore';

export function TopBar() {
  const [showNew, setShowNew] = useState(false);
  const [showProxy, setShowProxy] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const sessionCount = useSessionStore((s) => Object.keys(s.sessions).length);
  const errors = useSessionStore((s) => s.errors);
  const clearErrors = useSessionStore((s) => s.clearErrors);

  return (
    <>
      <header className="flex items-center justify-between px-5 h-14 bg-surface-card border-b border-surface-border shrink-0">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <span className="text-accent-light text-xl font-bold tracking-tight">⬡ Browserless Grid</span>
          <span className="text-xs text-gray-500">{sessionCount} session{sessionCount !== 1 ? 's' : ''}</span>
        </div>

        {/* Center: errors */}
        {errors.length > 0 && (
          <div className="flex items-center gap-2 bg-red-900/30 border border-status-error/40 rounded-lg px-3 py-1 max-w-sm">
            <span className="text-status-error text-xs truncate">{errors[0].message}</span>
            <button onClick={clearErrors} className="text-gray-400 hover:text-white text-xs ml-1">✕</button>
          </div>
        )}

        {/* Right actions */}
        <div className="flex items-center gap-3">
          <ConnectionStatus />
          <button
            onClick={() => setShowSettings(true)}
            className="text-xs text-gray-400 hover:text-white transition px-2 py-1 rounded hover:bg-surface-hover"
            title="Browserless connection settings"
          >
            ⚙ Settings
          </button>
          <button
            onClick={() => setShowProxy(true)}
            className="text-xs text-gray-400 hover:text-white transition px-2 py-1 rounded hover:bg-surface-hover"
          >
            Proxies
          </button>
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-1.5 text-sm bg-accent hover:bg-accent-hover text-white font-medium px-3 py-1.5 rounded-lg transition"
          >
            <span className="text-base leading-none">+</span>
            New Session
          </button>
        </div>
      </header>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showNew && <NewSessionModal onClose={() => setShowNew(false)} />}
      {showProxy && <ProxyModal onClose={() => setShowProxy(false)} />}
    </>
  );
}
