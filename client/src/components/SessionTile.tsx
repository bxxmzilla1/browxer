import { useRef, useEffect, useCallback, useState } from 'react';
import { useSessionStore } from '../store/sessionStore';
import { REMOTE_VIEWPORT } from '../types';
import type { SessionInfo, ClientMessage } from '../types';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-status-active',
  connecting: 'bg-status-connecting',
  error: 'bg-status-error',
  closed: 'bg-status-closed',
};

interface Props {
  session: SessionInfo;
  send: (msg: ClientMessage) => void;
}

export function SessionTile({ session, send }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastFrameRef = useRef<string>('');

  const frame = useSessionStore((s) => s.frames[session.id]);
  const focusedId = useSessionStore((s) => s.focusedId);
  const setFocused = useSessionStore((s) => s.setFocused);
  const selectedIds = useSessionStore((s) => s.selectedIds);
  const toggleSelected = useSessionStore((s) => s.toggleSelected);

  const isFocused = focusedId === session.id;
  const isSelected = selectedIds.has(session.id);

  const [navUrl, setNavUrl] = useState('');
  const [showNav, setShowNav] = useState(false);

  // Draw incoming JPEG frames onto canvas
  useEffect(() => {
    if (!frame || frame.dataUrl === lastFrameRef.current) return;
    lastFrameRef.current = frame.dataUrl;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    img.src = frame.dataUrl;
  }, [frame]);

  // IntersectionObserver: pause screencast for off-screen tiles
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const hidden = !entry.isIntersecting;
        send({ type: 'setHidden', sessionId: session.id, hidden });
      },
      { threshold: 0.05 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [session.id, send]);

  // Focus handling: tell backend to change screencast quality
  const focusSession = useCallback(() => {
    const prev = useSessionStore.getState().focusedId;
    if (prev && prev !== session.id) {
      send({ type: 'setFocus', sessionId: prev, focused: false });
    }
    setFocused(session.id);
    send({ type: 'setFocus', sessionId: session.id, focused: true });
  }, [session.id, send, setFocused]);

  const unfocus = useCallback(() => {
    setFocused(null);
    send({ type: 'setFocus', sessionId: session.id, focused: false });
  }, [session.id, send, setFocused]);

  // ── Input capture (only when focused) ────────────────────────────────────

  const toRemoteCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = REMOTE_VIEWPORT.width / rect.width;
    const scaleY = REMOTE_VIEWPORT.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isFocused) { focusSession(); return; }
    if (session.status !== 'active') return;
    const { x, y } = toRemoteCoords(e);
    send({ type: 'click', sessionId: session.id, x, y });
  };

  const handleCanvasWheel = useCallback(
    (e: WheelEvent) => {
      if (!isFocused || session.status !== 'active') return;
      e.preventDefault();
      send({ type: 'scroll', sessionId: session.id, deltaY: e.deltaY });
    },
    [isFocused, session.id, session.status, send]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener('wheel', handleCanvasWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleCanvasWheel);
  }, [handleCanvasWheel]);

  // Global keydown captured when this tile is focused
  useEffect(() => {
    if (!isFocused) return;
    const onKey = (e: KeyboardEvent) => {
      // Don't capture while typing in our own inputs
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (session.status !== 'active') return;

      e.preventDefault();
      send({ type: 'key', sessionId: session.id, key: e.key });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isFocused, session.id, session.status, send]);

  // ── Navigate ──────────────────────────────────────────────────────────────

  const navigate = () => {
    if (!navUrl.trim()) return;
    let url = navUrl.trim();
    if (!url.startsWith('http')) url = `https://${url}`;
    send({ type: 'navigate', sessionId: session.id, url });
    setNavUrl('');
    setShowNav(false);
  };

  // ── Close / Restart ───────────────────────────────────────────────────────

  const closeSession = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFocused) unfocus();
    send({ type: 'close', sessionId: session.id });
  };

  const restartSession = (e: React.MouseEvent) => {
    e.stopPropagation();
    send({ type: 'restart', sessionId: session.id });
  };

  return (
    <div
      ref={containerRef}
      className={[
        'relative flex flex-col bg-surface-card rounded-xl overflow-hidden border transition-all',
        isFocused
          ? 'border-accent shadow-lg shadow-accent/20'
          : isSelected
          ? 'border-accent/50'
          : 'border-surface-border',
      ].join(' ')}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-2 bg-surface border-b border-surface-border">
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => toggleSelected(session.id)}
          onClick={(e) => e.stopPropagation()}
          className="accent-accent w-3.5 h-3.5 cursor-pointer"
        />

        {/* Status dot */}
        <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_COLORS[session.status] ?? 'bg-gray-500'}`} />

        {/* Label */}
        <span className="text-xs font-medium text-white truncate flex-1">{session.label}</span>

        {/* Proxy badge */}
        {session.proxyLabel && (
          <span className="text-xs text-gray-500 truncate max-w-[80px]">🔀 {session.proxyLabel}</span>
        )}

        {/* Focus toggle */}
        {isFocused ? (
          <button
            onClick={(e) => { e.stopPropagation(); unfocus(); }}
            title="Unfocus"
            className="text-accent-light text-xs hover:text-white transition"
          >
            ◉
          </button>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); focusSession(); }}
            title="Focus"
            className="text-gray-500 text-xs hover:text-accent-light transition"
          >
            ○
          </button>
        )}

        {/* Nav toggle */}
        <button
          onClick={(e) => { e.stopPropagation(); setShowNav((v) => !v); }}
          title="Navigate"
          className="text-gray-500 text-xs hover:text-white transition"
        >
          ↗
        </button>

        {/* Restart */}
        <button onClick={restartSession} title="Restart" className="text-gray-500 text-xs hover:text-status-connecting transition">↺</button>

        {/* Close */}
        <button onClick={closeSession} title="Close" className="text-gray-500 text-xs hover:text-status-error transition">✕</button>
      </div>

      {/* ── Nav input ──────────────────────────────────────────────────────── */}
      {showNav && (
        <div className="flex items-center gap-1 px-3 py-1.5 bg-surface border-b border-surface-border">
          <input
            autoFocus
            className="flex-1 bg-transparent text-white text-xs font-mono focus:outline-none placeholder-gray-600"
            placeholder="https://example.com"
            value={navUrl}
            onChange={(e) => setNavUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') navigate();
              if (e.key === 'Escape') setShowNav(false);
              e.stopPropagation();
            }}
          />
          <button onClick={navigate} className="text-xs text-accent-light hover:text-white transition">Go</button>
        </div>
      )}

      {/* ── Canvas ─────────────────────────────────────────────────────────── */}
      <div className="relative flex-1 bg-black min-h-0" style={{ aspectRatio: '16/9' }}>
        <canvas
          ref={canvasRef}
          width={REMOTE_VIEWPORT.width}
          height={REMOTE_VIEWPORT.height}
          onClick={handleCanvasClick}
          className="w-full h-full object-contain cursor-crosshair"
          style={{ imageRendering: 'pixelated' }}
        />

        {/* Overlay: status for non-active sessions */}
        {session.status !== 'active' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 gap-2">
            <div className={`w-3 h-3 rounded-full ${STATUS_COLORS[session.status]}`} />
            <span className="text-xs text-gray-300 capitalize">{session.status}…</span>
          </div>
        )}

        {/* Focus indicator */}
        {isFocused && session.status === 'active' && (
          <div className="absolute top-1 right-1 bg-accent/80 text-white text-xs px-1.5 py-0.5 rounded font-medium pointer-events-none">
            LIVE
          </div>
        )}
      </div>
    </div>
  );
}
