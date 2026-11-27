-- =============================================================================
-- 1600 — Claude: assistant settings, usage log, weekly game ideas from Steam
-- =============================================================================

-- -----------------------------------------------------------------------------
-- AI settings on the studio singleton — changed by the Owner only
-- -----------------------------------------------------------------------------
alter table public.studio_settings
  add column ai_assistant_enabled  boolean not null default true,
  add column ai_monthly_budget_usd numeric(10, 2) not null default 20 check (ai_monthly_budget_usd >= 0);

comment on column public.studio_settings.ai_assistant_enabled is 'AI Assistant answers with Claude (otherwise it is switched off for everyone).';
comment on column public.studio_settings.ai_monthly_budget_usd is 'Estimated Claude spend per calendar month above which the assistant and manual idea runs stop.';

-- Admins may update studio settings (RLS), but the AI columns are the Owner's.
-- The service role (no auth.uid()) is not concerned.
create or replace function public.guard_ai_settings()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.ai_assistant_enabled is distinct from old.ai_assistant_enabled
      or new.ai_monthly_budget_usd is distinct from old.ai_monthly_budget_usd)
     and (select auth.uid()) is not null
     and not public.has_min_role('owner') then
    raise exception 'Only an owner can change the AI settings' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger guard_ai_settings
  before update on public.studio_settings
  for each row execute function public.guard_ai_settings();

-- -----------------------------------------------------------------------------
-- ai_usage — one row per Claude request, for cost tracking (Owner reads)
-- -----------------------------------------------------------------------------
create table public.ai_usage (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  user_id             uuid references public.profiles (id) on delete set null,
  feature             text not null check (feature in ('assistant', 'ideas')),
  model               text not null check (char_length(model) between 1 and 80),
  input_tokens        integer not null default 0 check (input_tokens >= 0),
  output_tokens       integer not null default 0 check (output_tokens >= 0),
  cache_read_tokens   integer not null default 0 check (cache_read_tokens >= 0),
  cache_write_tokens  integer not null default 0 check (cache_write_tokens >= 0),
  cost_usd            numeric(12, 6) not null default 0 check (cost_usd >= 0)
);

comment on table public.ai_usage is 'Claude requests made by the dashboard (written with the secret key), with an estimated cost.';

alter table public.ai_usage enable row level security;

create index ai_usage_created_idx on public.ai_usage (created_at desc);
create index ai_usage_user_idx on public.ai_usage (user_id);

create policy "ai_usage: owners can read"
  on public.ai_usage for select to authenticated
  using ((select public.has_min_role('owner')));

-- -----------------------------------------------------------------------------
-- idea_runs — one weekly (or manual) generation of game ideas from Steam
-- -----------------------------------------------------------------------------
create table public.idea_runs (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  finished_at  timestamptz,
  started_by   uuid references public.profiles (id) on delete set null,
  trigger      text not null check (trigger in ('cron', 'manual')),
  status       text not null default 'running' check (status in ('running', 'succeeded', 'failed')),
  -- Monday of the week the ideas belong to.
  week_of      date not null check (extract(isodow from week_of) = 1),
  model        text,
  cost_usd     numeric(12, 6) not null default 0,
  error        text,
  -- Steam games examined and what the Roblox check found (already on Roblox or free).
  candidates   jsonb not null default '[]'::jsonb check (jsonb_typeof(candidates) = 'array')
);

comment on table public.idea_runs is 'Generations of the weekly top 5 game ideas (Steam trends checked against Roblox).';

alter table public.idea_runs enable row level security;

create index idea_runs_created_idx on public.idea_runs (created_at desc);
create index idea_runs_started_by_idx on public.idea_runs (started_by);

create policy "idea_runs: members can read"
  on public.idea_runs for select to authenticated
  using ((select public.has_min_role('viewer')));

-- -----------------------------------------------------------------------------
-- weekly_ideas — the ideas of a run, in English and French
-- -----------------------------------------------------------------------------
create table public.weekly_ideas (
  id            uuid primary key default gen_random_uuid(),
  run_id        uuid not null references public.idea_runs (id) on delete cascade,
  rank          smallint not null check (rank between 1 and 10),
  score         smallint check (score between 0 and 100),
  -- Steam game the idea is inspired by: { appId, name, url, image, ccu, reviewsPercent, reviewsCount, price, released, genres }
  steam         jsonb not null default '{}'::jsonb check (jsonb_typeof(steam) = 'object'),
  -- { en: {title, pitch, genre, targetAudience, coreLoop, monetization, why}, fr: {...} }
  content       jsonb not null check (jsonb_typeof(content) = 'object'),
  -- { verdict, summary: {en, fr}, queries: [...], closest: [{ name, universeId, placeId, playing, upVotes, downVotes }] }
  roblox_check  jsonb not null default '{}'::jsonb check (jsonb_typeof(roblox_check) = 'object'),
  created_at    timestamptz not null default now(),
  unique (run_id, rank)
);

comment on table public.weekly_ideas is 'Top game ideas generated by Claude from Steam trends, each checked against Roblox before being proposed.';

alter table public.weekly_ideas enable row level security;

create policy "weekly_ideas: members can read"
  on public.weekly_ideas for select to authenticated
  using ((select public.has_min_role('viewer')));
