import { useState } from 'react';
import { useSessionStore } from '../store/sessionStore';
import type { ProxyRecord } from '../types';

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

interface Props {
  onClose: () => void;
}

export function ProxyModal({ onClose }: Props) {
  const proxies = useSessionStore((s) => s.proxies);
  const setProxies = useSessionStore((s) => s.setProxies);
  const [form, setForm] = useState({ label: '', url: '', type: 'http' as 'http' | 'socks5' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addProxy = async () => {
    if (!form.label || !form.url) { setError('Label and URL are required'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_URL}/proxies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const j = await res.json() as { error?: string };
        throw new Error(j.error ?? 'Failed');
      }
      const created = await res.json() as ProxyRecord;
      setProxies([...proxies, created]);
      setForm({ label: '', url: '', type: 'http' });
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  };

  const removeProxy = async (id: string) => {
    await fetch(`${API_URL}/proxies/${id}`, { method: 'DELETE' });
    setProxies(proxies.filter((p) => p.id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-surface-card border border-surface-border rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-5">
        <h2 className="text-lg font-semibold text-white">Manage Proxies</h2>

        {/* Existing proxies */}
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {proxies.length === 0 && (
            <p className="text-gray-500 text-sm">No proxies configured.</p>
          )}
          {proxies.map((p) => (
            <div key={p.id} className="flex items-center justify-between bg-surface rounded-lg px-3 py-2">
              <div>
                <span className="text-white text-sm font-medium">{p.label}</span>
                <span className="ml-2 text-xs text-gray-400 font-mono">{p.url}</span>
                <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-surface-border text-gray-300">{p.type}</span>
              </div>
              <button
                onClick={() => removeProxy(p.id)}
                className="text-status-error hover:text-red-400 text-xs ml-2"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        {/* Add proxy form */}
        <div className="border-t border-surface-border pt-4 space-y-3">
          <p className="text-sm text-gray-400 font-medium">Add Proxy</p>
          <div className="grid grid-cols-2 gap-2">
            <input
              className="bg-surface border border-surface-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent col-span-2"
              placeholder="Label (e.g. US Residential)"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
            />
            <input
              className="bg-surface border border-surface-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent col-span-2 font-mono"
              placeholder="http://user:pass@host:port"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
            />
            <select
              className="bg-surface border border-surface-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as 'http' | 'socks5' })}
            >
              <option value="http">HTTP</option>
              <option value="socks5">SOCKS5</option>
            </select>
            <button
              onClick={addProxy}
              disabled={loading}
              className="px-4 py-2 rounded-lg text-sm bg-accent hover:bg-accent-hover text-white font-medium transition disabled:opacity-50"
            >
              {loading ? 'Adding…' : 'Add Proxy'}
            </button>
          </div>
          {error && <p className="text-status-error text-xs">{error}</p>}
        </div>

        <div className="flex justify-end pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-surface-hover transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
