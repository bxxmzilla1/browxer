import { useState } from 'react';
import { useSessionStore } from '../store/sessionStore';

/**
 * Shown when the WS connection has never succeeded and VITE_API_URL is not
 * explicitly configured — i.e. the frontend is deployed on Vercel but the
 * backend isn't set up yet.
 */
export function BackendBanner() {
  const connected = useSessionStore((s) => s.connected);
  const reconnecting = useSessionStore((s) => s.reconnecting);
  const [dismissed, setDismissed] = useState(false);

  // Only show when we're not connected and have been trying for a while
  const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
  const wsUrl  = import.meta.env.VITE_WS_URL  as string | undefined;

  // If explicit env vars are set the user knows what they're doing — stay quiet
  const hasExplicitConfig = !!(apiUrl || wsUrl);
  if (hasExplicitConfig || connected || dismissed) return null;
  // Only start showing after the first retry attempt
  if (!reconnecting) return null;

  return (
    <div className="mx-4 mt-3 rounded-xl border border-yellow-500/40 bg-yellow-900/20 p-4 text-sm space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="font-semibold text-yellow-300">Backend not reachable</p>
          <p className="text-yellow-200/70 text-xs leading-relaxed">
            The frontend is running but can't find the Node.js backend.
            Vercel only hosts the static UI — the backend (WebSocket + CDP proxy) must
            be deployed separately.
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-yellow-500 hover:text-white shrink-0 text-lg leading-none"
        >
          ✕
        </button>
      </div>

      <div className="space-y-2 text-xs text-yellow-200/80">
        <p className="font-medium text-yellow-300">Deploy the backend in 2 minutes:</p>

        <div className="bg-black/30 rounded-lg p-3 font-mono space-y-1 text-yellow-100/90">
          <p className="text-yellow-400"># Option A – Railway (recommended)</p>
          <p>1. Go to <a href="https://railway.app/new" target="_blank" rel="noreferrer" className="underline text-yellow-300">railway.app/new</a> → "Deploy from GitHub repo"</p>
          <p>2. Select this repo, Railway auto-detects <code>railway.json</code></p>
          <p>3. Add env vars: <code>BROWSERLESS_WS_URL</code>, <code>BROWSERLESS_TOKEN</code></p>
          <p>4. Copy the Railway URL, e.g. <code>https://browxer.up.railway.app</code></p>
        </div>

        <div className="bg-black/30 rounded-lg p-3 font-mono space-y-1 text-yellow-100/90">
          <p className="text-yellow-400"># Option B – Render</p>
          <p>New Web Service → connect repo → Render reads <code>render.yaml</code> automatically</p>
        </div>

        <div className="bg-black/30 rounded-lg p-3 font-mono space-y-1 text-yellow-100/90">
          <p className="text-yellow-400"># Then set these in Vercel → Settings → Environment Variables:</p>
          <p>VITE_API_URL = https://your-backend.up.railway.app</p>
          <p>VITE_WS_URL  = wss://your-backend.up.railway.app/ws</p>
          <p className="text-yellow-400/70"># Redeploy Vercel after saving.</p>
        </div>
      </div>
    </div>
  );
}
