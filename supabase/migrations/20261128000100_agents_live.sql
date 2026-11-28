-- =============================================================================
-- 1700 — Live AI agents: Claude Code sessions reported by hooks, messages sent
-- from the dashboard, screenshots shared by the agents
-- =============================================================================
--
-- An "agent" is one Claude Code conversation. It may span several Claude Code
-- sessions (a mission resumed by the bridge, a VS Code conversation continued
-- in the background) — agent_sessions maps every session id to its agent.
-- Rows are written by the ingestion API with the secret key; people only read,
-- and the single "agent controller" sends messages and starts missions.

-- New event types (not used in this migration: a new enum value can't be used
-- in the transaction that adds it).
alter type public.agent_event_type add value if not exists 'instruction'; -- a person's instruction (VS Code or dashboard)
alter type public.agent_event_type add value if not exists 'action';      -- Claude used a tool (summary in payload)
alter type public.agent_event_type add value if not exists 'reply';       -- Claude's message at the end of a step
alter type public.agent_event_type add value if not exists 'screenshot';  -- image shared by the agent

-- -----------------------------------------------------------------------------
-- The only person allowed to talk to agents (a user id, never an email in code)
-- -----------------------------------------------------------------------------
alter table public.studio_settings
  add column agent_controller_id uuid references public.profiles (id) on delete set null;

comment on column public.studio_settings.agent_controller_id is
  'The one account allowed to send messages to AI agents and start missions (set with the secret key).';

create index studio_settings_agent_controller_idx on public.studio_settings (agent_controller_id);

-- Only the server (secret key, no auth.uid()) may change it.
create or replace function public.guard_agent_controller()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.agent_controller_id is distinct from old.agent_controller_id and (select auth.uid()) is not null then
    raise exception 'The agent controller can only be changed by the server' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger guard_agent_controller
  before update on public.studio_settings
  for each row execute function public.guard_agent_controller();

create or replace function public.is_agent_controller()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.studio_settings s
    where s.agent_controller_id is not null and s.agent_controller_id = (select auth.uid())
  );
$$;

revoke all on function public.is_agent_controller() from public, anon;
grant execute on function public.is_agent_controller() to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- agent_machines — computers allowed to report (only the token's SHA-256 is kept)
-- -----------------------------------------------------------------------------
create table public.agent_machines (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (char_length(name) between 1 and 80),
  token_hash    text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz,
  revoked_at    timestamptz
);

comment on table public.agent_machines is 'Computers whose Claude Code sessions report to the dashboard (hooks + bridge), one secret token each.';

alter table public.agent_machines enable row level security;

create policy "agent_machines: admins can read"
  on public.agent_machines for select to authenticated
  using ((select public.has_min_role('admin')));

-- -----------------------------------------------------------------------------
-- agents — live columns
-- -----------------------------------------------------------------------------
alter table public.agents
  add column origin          text not null default 'manual' check (origin in ('manual', 'claude_code', 'mission')),
  add column machine_id      uuid references public.agent_machines (id) on delete set null,
  add column session_id      text check (char_length(session_id) between 1 and 100),
  add column cwd             text check (char_length(cwd) <= 500),
  add column role            text not null default 'general' check (role in ('general', 'ui', 'build', 'scripting', 'qa', 'art')),
  add column waiting_reason  text check (waiting_reason in ('input', 'permission', 'bridge')),
  add column permission_mode text check (char_length(permission_mode) <= 40),
  add column stop_requested  boolean not null default false,
  add column ended_at        timestamptz;

comment on column public.agents.origin is 'claude_code = a session opened by a person (VS Code, terminal), reported by hooks; mission = started from the dashboard and run by the bridge.';
comment on column public.agents.session_id is 'Latest Claude Code session of this conversation (the bridge resumes from it).';
comment on column public.agents.waiting_reason is 'Why a waiting agent waits: input (its turn is over), permission (a prompt to approve), bridge (the PC has not picked the mission up yet).';

create index agents_machine_id_idx on public.agents (machine_id);
create index agents_session_id_idx on public.agents (session_id);

-- -----------------------------------------------------------------------------
-- agent_sessions — every Claude Code session id → its agent
-- -----------------------------------------------------------------------------
create table public.agent_sessions (
  session_id  text primary key check (char_length(session_id) between 1 and 100),
  agent_id    uuid not null references public.agents (id) on delete cascade,
  created_at  timestamptz not null default now()
);

alter table public.agent_sessions enable row level security;

create index agent_sessions_agent_idx on public.agent_sessions (agent_id);

create policy "agent_sessions: admins can read"
  on public.agent_sessions for select to authenticated
  using ((select public.has_min_role('admin')));

-- -----------------------------------------------------------------------------
-- agent_events — screenshots
-- -----------------------------------------------------------------------------
alter table public.agent_events
  add column image_path text check (char_length(image_path) <= 300);

comment on column public.agent_events.image_path is 'Object path in the private agent-media bucket (screenshot events).';

-- -----------------------------------------------------------------------------
-- agent_messages — what the controller sends, until it reaches Claude
-- -----------------------------------------------------------------------------
create table public.agent_messages (
  id             uuid primary key default gen_random_uuid(),
  agent_id       uuid not null references public.agents (id) on delete cascade,
  body           text not null check (char_length(body) between 1 and 8000),
  created_by     uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  status         text not null default 'pending' check (status in ('pending', 'delivered', 'cancelled', 'failed')),
  delivered_at   timestamptz,
  delivered_via  text check (delivered_via in ('hook', 'bridge'))
);

comment on table public.agent_messages is 'Messages from the dashboard to an agent: delivered by the Stop hook (agent working) or by the bridge (new mission, agent idle).';

alter table public.agent_messages enable row level security;

create index agent_messages_agent_idx on public.agent_messages (agent_id, created_at);
create index agent_messages_pending_idx on public.agent_messages (status) where status = 'pending';
create index agent_messages_created_by_idx on public.agent_messages (created_by);

create policy "agent_messages: admins can read"
  on public.agent_messages for select to authenticated
  using ((select public.has_min_role('admin')));

create policy "agent_messages: the controller can send"
  on public.agent_messages for insert to authenticated
  with check ((select public.is_agent_controller()) and created_by = (select auth.uid()) and status = 'pending');

create policy "agent_messages: the controller can cancel pending ones"
  on public.agent_messages for update to authenticated
  using ((select public.is_agent_controller()) and status = 'pending')
  with check ((select public.is_agent_controller()) and status = 'cancelled');

-- -----------------------------------------------------------------------------
-- Who sees agents: Owner and Admin (results included); who acts: the controller
-- -----------------------------------------------------------------------------
alter policy "agents: members can read" on public.agents
  using ((select public.has_min_role('admin')));
alter policy "agent_events: members can read" on public.agent_events
  using ((select public.has_min_role('admin')));

drop policy "agents: developers can insert" on public.agents;
drop policy "agents: developers can update" on public.agents;
drop policy "agent_events: developers can insert" on public.agent_events;

create policy "agents: the controller can start missions"
  on public.agents for insert to authenticated
  with check ((select public.is_agent_controller()) and created_by = (select auth.uid()) and origin = 'mission');

create policy "agents: the controller can update"
  on public.agents for update to authenticated
  using ((select public.is_agent_controller()))
  with check ((select public.is_agent_controller()));

-- -----------------------------------------------------------------------------
-- Screenshots: private bucket, read through short-lived signed URLs made by
-- the server after its own Admin+ check (no storage policy for users)
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('agent-media', 'agent-media', false, 8388608, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;
