/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Session, ProxyRecord } from './types.js';
import { getSupabase } from './supabaseClient.js';

/** Persist cookies + localStorage snapshot for a session to Supabase. */
export async function persistSession(session: Session): Promise<void> {
  const db = getSupabase();
  if (!db || !session.context || !session.page) return;

  try {
    const cookies = await session.context.cookies();

    let storage: Record<string, string> = {};
    try {
      storage = (await session.page.evaluate(() => {
        // runs in browser context – localStorage is available there
        /* eslint-disable no-undef */
        const result: Record<string, string> = {};
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k) result[k] = localStorage.getItem(k) ?? '';
        }
        return result;
      })) as Record<string, string>;
    } catch {
      // page may be on a chrome:// URL or similar where localStorage is unavailable
    }

    await (db as any)
      .from('sessions')
      .upsert({
        id: session.id,
        label: session.label,
        proxy_id: session.proxyId ?? null,
        cookies,
        storage,
        status: session.status,
        last_active: new Date().toISOString(),
      });
  } catch (err) {
    console.error(`[persistence] Failed to persist session ${session.id}:`, err);
  }
}

/** Rehydrate cookies + localStorage for an existing page from Supabase. */
export async function rehydrateSession(session: Session): Promise<void> {
  const db = getSupabase();
  if (!db || !session.context || !session.page) return;

  try {
    const { data, error } = await (db as any)
      .from('sessions')
      .select('cookies, storage')
      .eq('id', session.id)
      .maybeSingle();

    if (error || !data) return;

    const row = data as { cookies?: any[]; storage?: Record<string, string> };

    if (Array.isArray(row.cookies) && row.cookies.length > 0) {
      await session.context.addCookies(row.cookies);
    }

    if (row.storage && typeof row.storage === 'object') {
      const entries = Object.entries(row.storage);
      if (entries.length > 0) {
        await session.page.evaluate((kv: [string, string][]) => {
          // runs in browser context
          for (const [k, v] of kv) localStorage.setItem(k, v);
        }, entries as [string, string][]);
      }
    }
  } catch (err) {
    console.error(`[persistence] Failed to rehydrate session ${session.id}:`, err);
  }
}

/** Upsert a session row (status only, no cookies). */
export async function upsertSessionMeta(session: Session): Promise<void> {
  const db = getSupabase();
  if (!db) return;
  try {
    await (db as any).from('sessions').upsert({
      id: session.id,
      label: session.label,
      proxy_id: session.proxyId ?? null,
      status: session.status,
      last_active: new Date().toISOString(),
    });
  } catch (err) {
    console.error(`[persistence] Failed to upsert session meta ${session.id}:`, err);
  }
}

/** Mark session as closed in Supabase. */
export async function markSessionClosed(id: string): Promise<void> {
  const db = getSupabase();
  if (!db) return;
  try {
    await (db as any)
      .from('sessions')
      .update({ status: 'closed', last_active: new Date().toISOString() })
      .eq('id', id);
  } catch (err) {
    console.error(`[persistence] Failed to mark session closed ${id}:`, err);
  }
}

// ── Proxy CRUD ────────────────────────────────────────────────────────────────

export async function listProxies(): Promise<ProxyRecord[]> {
  const db = getSupabase();
  if (!db) return [];
  const { data } = await (db as any).from('proxies').select('*').order('label');
  return (data ?? []) as ProxyRecord[];
}

export async function getProxy(id: string): Promise<ProxyRecord | null> {
  const db = getSupabase();
  if (!db) return null;
  const { data } = await (db as any)
    .from('proxies')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return (data as ProxyRecord | null) ?? null;
}

export async function createProxy(record: Omit<ProxyRecord, 'id'>): Promise<ProxyRecord | null> {
  const db = getSupabase();
  if (!db) return null;
  const { data, error } = await (db as any)
    .from('proxies')
    .insert(record)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data as ProxyRecord | null;
}

export async function deleteProxy(id: string): Promise<void> {
  const db = getSupabase();
  if (!db) return;
  await (db as any).from('proxies').delete().eq('id', id);
}
