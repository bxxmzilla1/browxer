import { useState, useEffect } from 'react';

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

interface Props {
  onClose: () => void;
}

export function SettingsModal({ onClose }: Props) {
  const [wsUrl, setWsUrl] = useState('');
  const [token, setToken] = useState('');
  const [hasToken, setHasToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Load current (masked) config on open
  useEffect(() => {
    fetch(`${API_URL}/config`)
      .then((r) => r.json())
      .then((d: { wsUrl: string; hasToken: boolean }) => {
        setWsUrl(d.wsUrl);
        setHasToken(d.hasToken);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const save = async () => {
    setLoading(true); setSaved(false); setError('');
    try {
      const body: { wsUrl?: string; token?: string } = {};
      if (wsUrl.trim()) body.wsUrl = wsUrl.trim();
      // Only send token if the user typed something new
      if (token.trim()) body.token = token.trim();

      let res: Response;
      try {
        res = await fetch(`${API_URL}/config`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } catch {
        throw new Error(
          'Could not reach the backend. Make sure VITE_API_URL points to your deployed server.'
        );
      }
      if (!res.ok) {
        if (res.status === 405) {
          throw new Error(
            `Backend returned 405 – VITE_API_URL is probably pointing at Vercel (static host) instead of your Node server. ` +
            `Set VITE_API_URL=https://your-backend.railway.app in Vercel env vars and redeploy.`
          );
        }
        throw new Error(`Server responded ${res.status}`);
      }
      setSaved(true);
      setToken(''); // clear plaintext field after saving
      setHasToken(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-surface-card border border-surface-border rounded-xl shadow-2xl w-full max-w-md p-6 space-y-5">

        {/* Header */}
        <div>
          <h2 className="text-lg font-semibold text-white">Browserless Settings</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Credentials are stored server-side only and never sent back to the browser.
          </p>
        </div>

        {/* Fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">
              Browserless WebSocket URL
            </label>
            <input
              autoFocus
              className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="ws://localhost:3000  or  wss://chrome.browserless.io"
              value={wsUrl}
              onChange={(e) => setWsUrl(e.target.value)}
            />
            <p className="text-xs text-gray-600 mt-1">
              Self-hosted Docker: <code className="text-gray-400">ws://localhost:3000</code>
              &nbsp;·&nbsp;
              Cloud: <code className="text-gray-400">wss://chrome.browserless.io</code>
            </p>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">
              API Token
              {hasToken && !token && (
                <span className="ml-2 text-status-active">● token set</span>
              )}
            </label>
            <input
              type="password"
              className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder={hasToken ? '••••••••  (leave blank to keep current)' : 'your-api-token'}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') save(); }}
            />
            <p className="text-xs text-gray-600 mt-1">
              Leave blank for a self-hosted instance with no auth.
            </p>
          </div>
        </div>

        {/* Feedback */}
        {error && <p className="text-status-error text-xs">{error}</p>}
        {saved && <p className="text-status-active text-xs">✓ Settings saved — applies to new sessions</p>}

        {/* Actions */}
        <div className="flex gap-2 justify-end pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-surface-hover transition"
          >
            Close
          </button>
          <button
            onClick={save}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm bg-accent hover:bg-accent-hover text-white font-medium transition disabled:opacity-50"
          >
            {loading ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
