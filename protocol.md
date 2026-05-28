# Browserless Grid – WebSocket Protocol

All communication between the React frontend and the Node backend occurs over a **single WebSocket connection** per browser tab. The backend is the sole owner of CDP connections; the frontend only sends commands and receives frame data / session metadata.

---

## Transport

| Direction | Channel |
|---|---|
| Client → Server | JSON text frames |
| Server → Client | JSON text frames (session updates, errors, script results) |
| Server → Client | JSON text frames with base64 JPEG payload (screencast frames) |

---

## Client → Server Messages

All messages must include a `type` field. Session-scoped messages include `sessionId`.

### `navigate`
Navigate a session to a URL.
```json
{ "type": "navigate", "sessionId": "abc123", "url": "https://example.com" }
```

### `click`
Click at a position within the session viewport. Coordinates are **relative to the rendered canvas size** (0..canvasWidth, 0..canvasHeight); the backend scales them to the 1280×720 internal viewport.
```json
{ "type": "click", "sessionId": "abc123", "x": 320.5, "y": 240.0 }
```

### `type`
Type text into the focused element.
```json
{ "type": "type", "sessionId": "abc123", "text": "hello world" }
```

### `key`
Press a keyboard key (Playwright key name).
```json
{ "type": "key", "sessionId": "abc123", "key": "Enter" }
```

### `scroll`
Scroll the page vertically by `deltaY` pixels (negative = up).
```json
{ "type": "scroll", "sessionId": "abc123", "deltaY": 300 }
```

### `runScript`
Evaluate JavaScript in the page context. Result is returned as `scriptResult`.
```json
{ "type": "runScript", "sessionId": "abc123", "code": "document.title" }
```

### `setFocus`
Mark a session as focused (full framerate) or unfocused (low framerate).
```json
{ "type": "setFocus", "sessionId": "abc123", "focused": true }
```

### `setHidden`
Pause or resume screencast for off-screen tiles (managed by IntersectionObserver on the client).
```json
{ "type": "setHidden", "sessionId": "abc123", "hidden": true }
```

### `restart`
Persist state then reconnect the CDP session.
```json
{ "type": "restart", "sessionId": "abc123" }
```

### `close`
Persist state then permanently close the session.
```json
{ "type": "close", "sessionId": "abc123" }
```

### `batch`
Apply one command to multiple sessions atomically.
```json
{
  "type": "batch",
  "sessionIds": ["abc123", "def456"],
  "command": { "type": "navigate", "url": "https://example.com" }
}
```
Supported batch command types: `navigate`, `type`, `key`, `runScript`.

---

## Server → Client Messages

### `sessionList`
Sent immediately after a client connects and after any session changes.
```json
{
  "type": "sessionList",
  "sessions": [
    {
      "id": "abc123",
      "label": "Session 1",
      "proxyId": "proxy-uuid",
      "proxyLabel": "US Residential",
      "status": "active",
      "focused": true,
      "hidden": false,
      "lastActivity": 1716900000000
    }
  ]
}
```

### `sessionUpdate`
Sent when a single session changes state.
```json
{
  "type": "sessionUpdate",
  "session": { "id": "abc123", "status": "active", "focused": false, ... }
}
```

### `frame`
Screencast JPEG frame for a session. `data` is raw base64 (no data-URI prefix).
```json
{
  "type": "frame",
  "sessionId": "abc123",
  "data": "/9j/4AAQSkZJRgABAQAA..."
}
```

### `scriptResult`
Result of a `runScript` command.
```json
{
  "type": "scriptResult",
  "sessionId": "abc123",
  "result": "Page Title Here"
}
```

### `error`
Runtime or command error.
```json
{
  "type": "error",
  "sessionId": "abc123",
  "message": "Navigation timeout"
}
```

---

## Screencast Quality Tiers

| Tier | Condition | `everyNthFrame` | `quality` |
|---|---|---|---|
| **Focused** | `setFocus(true)` | 2 | 45 |
| **Thumbnail** | `setFocus(false)` | 8 | 30 |
| **Paused** | `setHidden(true)` | — | — |

---

## REST Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/sessions` | List all sessions |
| `POST` | `/sessions` | Spawn a new session `{ label, proxyId? }` |
| `DELETE` | `/sessions/:id` | Close a session |
| `GET` | `/proxies` | List proxy records |
| `POST` | `/proxies` | Create a proxy `{ label, url, type }` |
| `DELETE` | `/proxies/:id` | Delete a proxy |
