import { useState, useEffect } from 'react';
import { useSessionStore } from '../store/sessionStore';

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

interface Props {
  onClose: () => void;
}

export function NewSessionModal({ onClose }: Props) {
  const [label, setLabel] = useState('');
  const [proxyId, setProxyId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const proxies = useSessionStore((s) => s.proxies);

  const spawn = async () => {
    if (!label.trim()) { setError('Label is required'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: label.trim(), proxyId: proxyId || undefined }),
      });
      if (!res.ok) {
        let message = `Spawn failed (${res.status})`;
        try {
          const j = await res.json() as { error?: string };
          if (j.error) message = j.error;
        } catch { /* non-JSON body */ }
        throw new Error(message);
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-surface-card border border-surface-border rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">New Session</h2>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Session label</label>
            <input
              autoFocus
              className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="e.g. Account #1"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') spawn(); }}
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Proxy (optional)</label>
            <select
              className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              value={proxyId}
              onChange={(e) => setProxyId(e.target.value)}
            >
              <option value="">— No proxy —</option>
              {proxies.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label} ({p.type})
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <p className="text-status-error text-xs">{error}</p>}

        <div className="flex gap-2 justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-surface-hover transition"
          >
            Cancel
          </button>
          <button
            onClick={spawn}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm bg-accent hover:bg-accent-hover text-white font-medium transition disabled:opacity-50"
          >
            {loading ? 'Spawning…' : 'Spawn'}
          </button>
        </div>
      </div>
    </div>
  );
}
