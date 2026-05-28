-- Browserless Grid – Supabase schema
-- Run this in your Supabase SQL editor or via the CLI.

create extension if not exists "pgcrypto";

-- ── Proxies ───────────────────────────────────────────────────────────────────

create table if not exists proxies (
  id          uuid primary key default gen_random_uuid(),
  label       text not null,
  url         text not null,        -- full proxy URL including credentials
  type        text not null check (type in ('http', 'socks5')),
  last_used   timestamptz
);

-- ── Sessions ──────────────────────────────────────────────────────────────────

create table if not exists sessions (
  id          uuid primary key,
  label       text not null,
  proxy_id    uuid references proxies(id) on delete set null,
  cookies     jsonb    default '[]'::jsonb,
  storage     jsonb    default '{}'::jsonb,
  status      text     not null default 'closed',
  last_active timestamptz default now()
);

create index if not exists sessions_status_idx on sessions(status);
create index if not exists sessions_last_active_idx on sessions(last_active);
