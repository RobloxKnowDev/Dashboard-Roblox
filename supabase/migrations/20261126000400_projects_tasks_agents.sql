-- =============================================================================
-- 0400 — Projects, project members, tasks, AI agents and agent events
-- =============================================================================

-- -----------------------------------------------------------------------------
-- projects
-- -----------------------------------------------------------------------------
create table public.projects (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null check (char_length(name) between 1 and 120),
  slug                 text not null unique
                         check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 140),
  description          text,
  cover_image_url      text,
  status               public.project_status not null default 'planning',
  progress             integer not null default 0 check (progress between 0 and 100),
  game_id              uuid references public.games (id) on delete set null,
  target_release_date  date,
  completed_at         timestamptz,
  created_by           uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table public.projects enable row level security;

create index projects_status_idx on public.projects (status);
create index projects_game_id_idx on public.projects (game_id);
create index projects_created_by_idx on public.projects (created_by);
create index projects_target_release_idx on public.projects (target_release_date);
create index projects_name_trgm_idx on public.projects using gin (name extensions.gin_trgm_ops);

create trigger set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

create trigger preserve_created_by
  before update on public.projects
  for each row execute function public.preserve_column('created_by');

create trigger sync_completed_at
  before insert or update of status on public.projects
  for each row execute function public.sync_completed_at('completed');

-- -----------------------------------------------------------------------------
-- project_members — team members assigned to a project
-- -----------------------------------------------------------------------------
create table public.project_members (
  project_id      uuid not null references public.projects (id) on delete cascade,
  team_member_id  uuid not null references public.team_members (id) on delete cascade,
  role            text check (char_length(role) <= 80),
  added_at        timestamptz not null default now(),
  primary key (project_id, team_member_id)
);

alter table public.project_members enable row level security;

-- project_id is covered by the primary key.
create index project_members_team_member_idx on public.project_members (team_member_id);

-- -----------------------------------------------------------------------------
-- tasks
-- -----------------------------------------------------------------------------
create table public.tasks (
  id            uuid primary key default gen_random_uuid(),
  title         text not null check (char_length(title) between 1 and 200),
  description   text,
  project_id    uuid references public.projects (id) on delete cascade,
  assignee_id   uuid references public.team_members (id) on delete set null,
  priority      public.task_priority not null default 'medium',
  status        public.task_status not null default 'todo',
  due_date      date,
  completed_at  timestamptz,
  -- Manual ordering inside a status column (fractional indexing friendly).
  position      double precision not null default 0,
  created_by    uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.tasks enable row level security;

create index tasks_project_id_idx on public.tasks (project_id);
create index tasks_assignee_id_idx on public.tasks (assignee_id);
create index tasks_created_by_idx on public.tasks (created_by);
create index tasks_status_position_idx on public.tasks (status, position);
create index tasks_open_due_date_idx on public.tasks (due_date)
  where status not in ('done', 'cancelled');
create index tasks_title_trgm_idx on public.tasks using gin (title extensions.gin_trgm_ops);

create trigger set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

create trigger preserve_created_by
  before update on public.tasks
  for each row execute function public.preserve_column('created_by');

create trigger sync_completed_at
  before insert or update of status on public.tasks
  for each row execute function public.sync_completed_at('done');

-- -----------------------------------------------------------------------------
-- agents — AI agents monitored by the dashboard
-- -----------------------------------------------------------------------------
create table public.agents (
  id                uuid primary key default gen_random_uuid(),
  name              text not null check (char_length(name) between 1 and 120),
  project_id        uuid references public.projects (id) on delete set null,
  mission           text,
  status            public.agent_status not null default 'offline',
  model             text,
  started_at        timestamptz,
  last_activity_at  timestamptz,
  created_by        uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.agents enable row level security;

create index agents_project_id_idx on public.agents (project_id);
create index agents_status_idx on public.agents (status);
create index agents_created_by_idx on public.agents (created_by);
create index agents_last_activity_idx on public.agents (last_activity_at desc);

create trigger set_updated_at
  before update on public.agents
  for each row execute function public.set_updated_at();

create trigger preserve_created_by
  before update on public.agents
  for each row execute function public.preserve_column('created_by');

-- -----------------------------------------------------------------------------
-- agent_events — append-only history of each agent
-- -----------------------------------------------------------------------------
create table public.agent_events (
  id          uuid primary key default gen_random_uuid(),
  agent_id    uuid not null references public.agents (id) on delete cascade,
  type        public.agent_event_type not null,
  message     text,
  payload     jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  created_at  timestamptz not null default now()
);

alter table public.agent_events enable row level security;

create index agent_events_agent_created_idx on public.agent_events (agent_id, created_at desc);

-- Every new event refreshes the agent's last_activity_at.
create or replace function public.touch_agent_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.agents
  set last_activity_at = greatest(coalesce(last_activity_at, new.created_at), new.created_at)
  where id = new.agent_id;
  return null;
end;
$$;

create trigger touch_agent_activity
  after insert on public.agent_events
  for each row execute function public.touch_agent_activity();
