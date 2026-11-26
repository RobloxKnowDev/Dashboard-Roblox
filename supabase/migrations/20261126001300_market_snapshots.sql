-- =============================================================================
-- 1300 — Daily snapshots of Roblox charts (market intelligence history)
-- =============================================================================
-- Roblox's public charts only show "now". A daily job (Vercel Cron, server
-- side with the service role) records each charted experience's rank and
-- player count, so Discover can show evolution over time.

create table public.market_snapshots (
  id           uuid primary key default gen_random_uuid(),
  recorded_on  date not null,
  sort_id      text not null check (char_length(sort_id) <= 60),
  rank         integer not null check (rank > 0),
  universe_id  bigint not null,
  name         text not null check (char_length(name) <= 200),
  genre        text,
  player_count integer not null default 0 check (player_count >= 0),
  up_votes     integer,
  down_votes   integer,
  created_at   timestamptz not null default now(),
  unique (universe_id, sort_id, recorded_on)
);

comment on table public.market_snapshots is
  'One row per experience per Roblox chart per day. Written only by the daily server job.';

create index market_snapshots_universe_idx on public.market_snapshots (universe_id, recorded_on desc);
create index market_snapshots_sort_day_idx on public.market_snapshots (sort_id, recorded_on desc, rank);

alter table public.market_snapshots enable row level security;

-- Readable by every member with a role; no client writes (service role only).
create policy "market_snapshots: members can read"
  on public.market_snapshots for select to authenticated
  using ((select public.has_min_role('viewer')));

grant select on public.market_snapshots to authenticated;
grant all on public.market_snapshots to service_role;
revoke all on public.market_snapshots from anon;
