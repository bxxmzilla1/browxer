import { sessionManager } from './sessionManager.js';

const IDLE_TIMEOUT = Number(process.env.IDLE_TIMEOUT_MS ?? 1_800_000); // 30 min
const CHECK_INTERVAL = Math.min(IDLE_TIMEOUT / 4, 5 * 60_000); // check at most every 5 min

let reapTimer: ReturnType<typeof setInterval> | null = null;

export function startIdleReaper(): void {
  if (reapTimer) return;

  reapTimer = setInterval(async () => {
    const idle = sessionManager.getIdleSessions(IDLE_TIMEOUT);
    for (const id of idle) {
      console.log(`[idleReaper] Closing idle session ${id}`);
      await sessionManager.closeSession(id).catch((err) =>
        console.error(`[idleReaper] Failed to close ${id}:`, err)
      );
    }
  }, CHECK_INTERVAL);

  console.log(
    `[idleReaper] Started – timeout ${IDLE_TIMEOUT / 1000}s, check every ${CHECK_INTERVAL / 1000}s`
  );
}

export function stopIdleReaper(): void {
  if (reapTimer) {
    clearInterval(reapTimer);
    reapTimer = null;
  }
}
