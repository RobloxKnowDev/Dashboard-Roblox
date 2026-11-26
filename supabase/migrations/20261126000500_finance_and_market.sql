-- =============================================================================
-- 0500 — Finance transactions, market watchlist and game ideas
-- =============================================================================

-- -----------------------------------------------------------------------------
-- finance_transactions — manual entries (revenue and expenses)
-- -----------------------------------------------------------------------------
create table public.finance_transactions (
  id            uuid primary key default gen_random_uuid(),
  type          public.transaction_type not null,
  category      public.transaction_category not null,
  amount        numeric(12, 2) not null check (amount > 0),
  currency      char(3) not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  robux_amount  bigint check (robux_amount >= 0),
  game_id       uuid references public.games (id) on delete set null,
  project_id    uuid references public.projects (id) on delete set null,
  description   text check (char_length(description) <= 500),
  occurred_on   date not null default current_date,
  created_by    uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- A category must match the transaction type.
  constraint finance_transactions_category_matches_type check (
    (type = 'revenue' and category in ('roblox_payout', 'devex', 'sponsorship', 'other'))
    or
    (type = 'expense' and category in ('development', 'advertising', 'tools', 'salaries', 'assets', 'other'))
  )
);

comment on column public.finance_transactions.amount is
  'Always positive; the sign comes from `type`.';

alter table public.finance_transactions enable row level security;

create index finance_transactions_occurred_on_idx on public.finance_transactions (occurred_on desc);
create index finance_transactions_type_occurred_idx on public.finance_transactions (type, occurred_on desc);
create index finance_transactions_category_idx on public.finance_transactions (category);
create index finance_transactions_game_id_idx on public.finance_transactions (game_id);
create index finance_transactions_project_id_idx on public.finance_transactions (project_id);
create index finance_transactions_created_by_idx on public.finance_transactions (created_by);

create trigger set_updated_at
  before update on public.finance_transactions
  for each row execute function public.set_updated_at();

create trigger preserve_created_by
  before update on public.finance_transactions
  for each row execute function public.preserve_column('created_by');

-- -----------------------------------------------------------------------------
-- game_watchlist — other Roblox games followed by the studio
-- -----------------------------------------------------------------------------
create table public.game_watchlist (
  id             uuid primary key default gen_random_uuid(),
  universe_id    bigint not null unique check (universe_id > 0),
  name           text not null check (char_length(name) between 1 and 120),
  thumbnail_url  text,
  genre          text,
  notes          text,
  added_by       uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.game_watchlist enable row level security;

create index game_watchlist_added_by_idx on public.game_watchlist (added_by);
create index game_watchlist_created_at_idx on public.game_watchlist (created_at desc);

create trigger set_updated_at
  before update on public.game_watchlist
  for each row execute function public.set_updated_at();

create trigger preserve_added_by
  before update on public.game_watchlist
  for each row execute function public.preserve_column('added_by');

-- -----------------------------------------------------------------------------
-- watchlist_snapshots — tracking history of watched games (append-only)
-- -----------------------------------------------------------------------------
create table public.watchlist_snapshots (
  id            uuid primary key default gen_random_uuid(),
  watchlist_id  uuid not null references public.game_watchlist (id) on delete cascade,
  recorded_at   timestamptz not null,
  ccu           integer check (ccu >= 0),
  visits        bigint check (visits >= 0),
  favorites     bigint check (favorites >= 0),
  created_at    timestamptz not null default now(),
  -- Also serves as the (watchlist_id, recorded_at) lookup index.
  unique (watchlist_id, recorded_at)
);

alter table public.watchlist_snapshots enable row level security;

create index watchlist_snapshots_recorded_idx on public.watchlist_snapshots (recorded_at desc);

-- -----------------------------------------------------------------------------
-- game_ideas — idea library (manual ideas, and AI suggestions later)
-- -----------------------------------------------------------------------------
create table public.game_ideas (
  id                        uuid primary key default gen_random_uuid(),
  title                     text not null check (char_length(title) between 1 and 160),
  pitch                     text,
  genre                     text,
  target_audience           text,
  core_loop                 text,
  monetization              text,
  score                     numeric(5, 2) check (score between 0 and 100),
  -- Monday of the week the idea belongs to (weekly top ideas).
  week_of                   date check (week_of is null or extract(isodow from week_of) = 1),
  origin                    public.idea_origin not null default 'manual',
  status                    public.idea_status not null default 'saved',
  inspiration_universe_ids  bigint[] not null default '{}',
  created_by                uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

alter table public.game_ideas enable row level security;

create index game_ideas_week_of_idx on public.game_ideas (week_of desc);
create index game_ideas_status_idx on public.game_ideas (status);
create index game_ideas_origin_idx on public.game_ideas (origin);
create index game_ideas_created_by_idx on public.game_ideas (created_by);

create trigger set_updated_at
  before update on public.game_ideas
  for each row execute function public.set_updated_at();

create trigger preserve_created_by
  before update on public.game_ideas
  for each row execute function public.preserve_column('created_by');
