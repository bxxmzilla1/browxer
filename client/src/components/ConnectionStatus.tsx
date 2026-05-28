import { useSessionStore } from '../store/sessionStore';

export function ConnectionStatus() {
  const connected = useSessionStore((s) => s.connected);
  const reconnecting = useSessionStore((s) => s.reconnecting);

  if (connected) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-status-active">
        <span className="w-2 h-2 rounded-full bg-status-active animate-pulse" />
        Connected
      </div>
    );
  }

  if (reconnecting) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-status-connecting">
        <span className="w-2 h-2 rounded-full bg-status-connecting animate-ping" />
        Reconnecting…
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-status-error">
      <span className="w-2 h-2 rounded-full bg-status-error" />
      Disconnected
    </div>
  );
}
