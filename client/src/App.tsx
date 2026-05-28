import { useEffect } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { useSessionStore } from './store/sessionStore';
import { TopBar } from './components/TopBar';
import { SessionGrid } from './components/SessionGrid';
import { BatchBar } from './components/BatchBar';
import { ScriptPanel } from './components/ScriptPanel';
import { BackendBanner } from './components/BackendBanner';

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

export function App() {
  const { send } = useWebSocket();
  const setProxies = useSessionStore((s) => s.setProxies);

  // Load proxies from REST on mount
  useEffect(() => {
    fetch(`${API_URL}/proxies`)
      .then((r) => r.json())
      .then(setProxies)
      .catch(() => {/* backend not yet up */});
  }, [setProxies]);

  return (
    <div className="flex flex-col h-screen bg-surface text-white overflow-hidden">
      <TopBar />

      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        <BackendBanner />
        <SessionGrid send={send} />
        <BatchBar send={send} />
        <ScriptPanel send={send} />
      </div>
    </div>
  );
}
