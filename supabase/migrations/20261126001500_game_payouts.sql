-- =============================================================================
-- 1500 — Roblox payouts that the Analytics API doesn't report
-- =============================================================================
-- The Analytics Query API "DailyRevenue" metric only covers game passes,
-- developer products, private servers and avatar commissions. Creator Rewards
-- and Roblox Plus payouts are paid by Roblox separately and have no API, so
-- the team records them per game and per month (Robux), from the Creator Hub.

create type public.payout_source as enum ('creator_rewards', 'roblox_plus');

create table public.game_payouts (
  id          uuid primary key default gen_random_uuid(),
  game_id     uuid not null references public.games (id) on delete cascade,
  source      public.payout_source not null,
  -- First day of the month the payout covers.
  month       date not null check (extract(day from month) = 1),
  robux       bigint not null check (robux >= 0),
  created_by  uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (game_id, source, month)
);

comment on table public.game_payouts is
  'Monthly Robux per game from Creator Rewards and Roblox Plus (entered from the Creator Hub; not available through any Roblox API).';

alter table public.game_payouts enable row level security;

create index game_payouts_month_idx on public.game_payouts (month);
create index game_payouts_created_by_idx on public.game_payouts (created_by);
-- game_id is covered by the unique (game_id, source, month) index.

create trigger set_updated_at
  before update on public.game_payouts
  for each row execute function public.set_updated_at();

create trigger preserve_created_by
  before update on public.game_payouts
  for each row execute function public.preserve_column('created_by');

-- Same visibility as game revenue (every member); edits like games: admins.
create policy "game_payouts: members can read"
  on public.game_payouts for select to authenticated
  using ((select public.has_min_role('viewer')));

create policy "game_payouts: admins can insert"
  on public.game_payouts for insert to authenticated
  with check ((select public.has_min_role('admin')));

create policy "game_payouts: admins can update"
  on public.game_payouts for update to authenticated
  using ((select public.has_min_role('admin')))
  with check ((select public.has_min_role('admin')));

create policy "game_payouts: admins can delete"
  on public.game_payouts for delete to authenticated
  using ((select public.has_min_role('admin')));

grant select, insert, update, delete on public.game_payouts to authenticated;
grant all on public.game_payouts to service_role;
