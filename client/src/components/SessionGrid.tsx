import { useSessionStore } from '../store/sessionStore';
import { SessionTile } from './SessionTile';
import type { ClientMessage } from '../types';

interface Props {
  send: (msg: ClientMessage) => void;
}

const GRID_COLS: Record<number, string> = {
  0: 'grid-cols-1',
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-2',
  4: 'grid-cols-2',
  5: 'grid-cols-3',
  6: 'grid-cols-3',
};

function getGridCols(count: number): string {
  if (count <= 1) return 'grid-cols-1';
  if (count <= 4) return 'grid-cols-2';
  if (count <= 9) return 'grid-cols-3';
  return 'grid-cols-4';
}

export function SessionGrid({ send }: Props) {
  const sessions = useSessionStore((s) => s.sessions);
  const sessionList = Object.values(sessions).sort((a, b) => a.lastActivity - b.lastActivity);
  const connected = useSessionStore((s) => s.connected);

  if (sessionList.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
        {!connected ? (
          <>
            <div className="w-12 h-12 rounded-full bg-surface-card flex items-center justify-center text-2xl">⬡</div>
            <p className="text-gray-400 text-sm">Connecting to backend…</p>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-full bg-surface-card flex items-center justify-center text-2xl">⬡</div>
            <p className="text-white font-medium">No sessions yet</p>
            <p className="text-gray-500 text-sm max-w-xs">
              Click <span className="text-accent-light font-medium">+ New Session</span> to spawn a browser session connected to Browserless.
            </p>
          </>
        )}
      </div>
    );
  }

  const cols = getGridCols(sessionList.length);

  return (
    <div className={`flex-1 overflow-y-auto p-4 grid ${cols} gap-3 auto-rows-max content-start`}>
      {sessionList.map((session) => (
        <SessionTile key={session.id} session={session} send={send} />
      ))}
    </div>
  );
}
