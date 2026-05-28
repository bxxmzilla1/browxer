# Browserless Grid

A PWA that connects to multiple [Browserless](https://browserless.io) (CDP) browser sessions simultaneously, displays them in a live screencasting grid, and lets you control each session individually or in batch.

---

## Architecture

```
Browser (PWA)
    │  WebSocket (frames + commands)
    ▼
Node.js Backend  ──── Supabase (session metadata, cookies, proxies)
    │  CDP (Playwright connectOverCDP)
    ▼
Browserless  (self-hosted Docker or cloud)
```

- The **frontend never holds a CDP connection or any secret token**.
- The **backend owns the session pool** and streams JPEG frames to the client over WebSocket.
- Each session connects to Browserless via `chromium.connectOverCDP()` with an optional per-session proxy injected as a Chrome launch flag.

---

## Prerequisites

| Tool | Version |
|---|---|
| Node.js | ≥ 18 |
| npm | ≥ 9 |
| Docker (for self-hosted Browserless) | ≥ 24 |

---

## Quick Start (self-hosted Browserless)

### 1. Start Browserless

```bash
docker run -p 3000:3000 ghcr.io/browserless/chromium
```

### 2. Configure the backend

```bash
cp .env.example server/.env
# Edit server/.env — set BROWSERLESS_WS_URL=ws://localhost:3000
# Add your Supabase credentials if you have a project, otherwise
# the server runs without persistence (sessions won't survive restarts).
```

### 3. Apply the Supabase schema (optional but recommended)

Run the SQL in `supabase/schema.sql` in the Supabase SQL editor or via the CLI:

```bash
supabase db push --db-url postgresql://...
```

### 4. Install & start the backend

```bash
cd server
npm install
npm run dev        # ts-node watch mode
# or for production:
npm run build && npm start
```

### 5. Install & start the frontend

```bash
cd client
npm install
npm run dev        # Vite dev server at http://localhost:5173
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Environment Variables

All config lives in `server/.env`. **Never commit this file.**

| Variable | Default | Description |
|---|---|---|
| `BROWSERLESS_WS_URL` | `ws://localhost:3000` | Browserless WebSocket endpoint |
| `BROWSERLESS_TOKEN` | _(empty)_ | API token (leave blank for local Docker) |
| `SUPABASE_URL` | — | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | — | Supabase service-role key (server-only) |
| `PORT` | `4000` | Backend HTTP + WS port |
| `IDLE_TIMEOUT_MS` | `1800000` | Idle session reap timeout (30 min) |
| `PERSIST_INTERVAL_MS` | `30000` | Cookie/storage auto-persist interval (30 s) |

The frontend reads `VITE_WS_URL` from `client/.env`:

| Variable | Default | Description |
|---|---|---|
| `VITE_WS_URL` | `ws://localhost:4000/ws` | Backend WebSocket URL |
| `VITE_API_URL` | `http://localhost:4000` | Backend REST base URL |

---

## Pointing at Browserless Cloud

```env
BROWSERLESS_WS_URL=wss://chrome.browserless.io
BROWSERLESS_TOKEN=your_api_token_here
```

---

## Deployment

### Frontend → Vercel

The `vercel.json` at the repo root builds the `client/` directory and serves it as a static SPA.

```bash
vercel --prod
```

Set `VITE_WS_URL` and `VITE_API_URL` as Vercel environment variables pointing to your deployed backend.

### Backend → Railway / Render / Fly.io

Vercel **does not support persistent WebSocket servers**. Deploy the backend separately:

**Railway (recommended):**
```bash
cd server
railway up
```

Set the environment variables in the Railway dashboard.

**Docker:**
```dockerfile
FROM node:20-slim
WORKDIR /app
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/dist ./dist
CMD ["node", "dist/index.js"]
```

Build: `cd server && npm run build`

---

## Supabase Schema

```sql
-- supabase/schema.sql (also at the path below)
```

See `supabase/schema.sql` for the full DDL.

---

## WebSocket Protocol

See [`protocol.md`](./protocol.md) for the full message specification.

---

## Features

- **Live grid** of browser sessions rendered as JPEG screencasts
- **Per-tile controls**: navigate, click, type, key, scroll, eval JS
- **Focused / thumbnail / paused** quality tiers via IntersectionObserver
- **Batch actions**: navigate / type / key / run script across selected sessions
- **Script panel**: evaluate arbitrary JS on focused or all selected sessions
- **Proxy support**: assign a per-session HTTP/SOCKS5 proxy at spawn time
- **Cookie/storage persistence**: rehydrated from Supabase on session reconnect
- **Idle reaper**: configurable auto-close of inactive sessions
- **PWA**: installable, works offline for the control shell (frames need backend)
- **Auto-reconnect**: client WS reconnects with exponential back-off
