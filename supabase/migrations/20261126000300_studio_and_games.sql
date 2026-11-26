-- =============================================================================
-- 0300 — Studio settings, team members, games and game metrics
-- =============================================================================

-- -----------------------------------------------------------------------------
-- studio_settings — single row (id is always true)
-- -----------------------------------------------------------------------------
create table public.studio_settings (
  id                 boolean primary key default true check (id),
  studio_name        text not null default 'Dashboard'
                       check (char_length(studio_name) between 1 and 80),
  currency           char(3) not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  timezone           text not null default 'UTC',
  -- USD paid per Robux through DevEx, used to convert Robux revenue estimates.
  devex_rate_usd     numeric(10, 6) not null default 0.0038 check (devex_rate_usd > 0),
  updated_by         uuid references public.profiles (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on table public.studio_settings is 'Singleton row with studio-wide settings.';

alter table public.studio_settings enable row level security;

create index studio_settings_updated_by_idx on public.studio_settings (updated_by);

create trigger set_updated_at
  before update on public.studio_settings
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- team_members — people of the studio (may or may not have an account)
-- -----------------------------------------------------------------------------
create table public.team_members (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid unique references public.profiles (id) on delete set null,
  display_name  text not null check (char_length(display_name) between 1 and 80),
  avatar_url    text,
  studio_role   text check (char_length(studio_role) <= 80),
  status        public.member_status not null default 'active',
  joined_at     date not null default current_date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.team_members is
  'Studio members. profile_id links to an account when the member can sign in; '
  'access rights come from profiles.role, studio_role is a descriptive job title.';

alter table public.team_members enable row level security;

-- profile_id already indexed by its unique constraint.
create index team_members_status_idx on public.team_members (status);
create index team_members_display_name_trgm_idx
  on public.team_members using gin (display_name extensions.gin_trgm_ops);

create trigger set_updated_at
  before update on public.team_members
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- games — the studio's own Roblox experiences
-- -----------------------------------------------------------------------------
create table public.games (
  id             uuid primary key default gen_random_uuid(),
  universe_id    bigint not null unique check (universe_id > 0),
  place_id       bigint check (place_id > 0),
  name           text not null check (char_length(name) between 1 and 120),
  description    text,
  thumbnail_url  text,
  genre          text,
  status         public.game_status not null default 'in_development',
  launched_at    date,
  created_by     uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table public.games is 'Roblox experiences owned by the studio (identified by universe_id).';

alter table public.games enable row level security;

create index games_status_idx on public.games (status);
create index games_created_by_idx on public.games (created_by);
create index games_name_trgm_idx on public.games using gin (name extensions.gin_trgm_ops);

create trigger set_updated_at
  before update on public.games
  for each row execute function public.set_updated_at();

create trigger preserve_created_by
  before update on public.games
  for each row execute function public.preserve_column('created_by');

-- -----------------------------------------------------------------------------
-- game_metrics — time series per game (append-only, filled by integrations)
-- -----------------------------------------------------------------------------
create table public.game_metrics (
  id             uuid primary key default gen_random_uuid(),
  game_id        uuid not null references public.games (id) on delete cascade,
  period         public.metric_period not null,
  recorded_at    timestamptz not null,
  ccu            integer check (ccu >= 0),
  peak_ccu       integer check (peak_ccu >= 0),
  dau            integer check (dau >= 0),
  visits         bigint check (visits >= 0),
  favorites      bigint check (favorites >= 0),
  revenue_robux  bigint check (revenue_robux >= 0),
  retention_d1   numeric(5, 4) check (retention_d1 between 0 and 1),
  retention_d7   numeric(5, 4) check (retention_d7 between 0 and 1),
  retention_d30  numeric(5, 4) check (retention_d30 between 0 and 1),
  -- Where the numbers come from. 'demo' is deliberately not allowed.
  source         text not null
                   check (source in ('roblox_public_api', 'roblox_open_cloud', 'manual')),
  created_at     timestamptz not null default now(),
  unique (game_id, period, recorded_at)
);

comment on table public.game_metrics is
  'Real metrics only (public Roblox API, Open Cloud analytics or manual entry). Never demo data.';

alter table public.game_metrics enable row level security;

create index game_metrics_game_recorded_idx on public.game_metrics (game_id, recorded_at desc);
create index game_metrics_recorded_idx on public.game_metrics (recorded_at desc);
