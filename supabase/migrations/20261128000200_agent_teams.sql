-- =============================================================================
-- 1800 — Game teams: a manager agent delegates to members (game designer,
-- build, UI, SFX, scripting, QA, 3D art); members report back to it
-- =============================================================================

-- New roles
alter table public.agents drop constraint if exists agents_role_check;
alter table public.agents add constraint agents_role_check
  check (role in ('general', 'manager', 'game_designer', 'build', 'ui', 'sfx', 'scripting', 'qa', 'art'));

-- A manager waiting for its team's reports
alter table public.agents drop constraint if exists agents_waiting_reason_check;
alter table public.agents add constraint agents_waiting_reason_check
  check (waiting_reason in ('input', 'permission', 'bridge', 'team'));

-- Team link: a member points to the manager that delegated its mission
alter table public.agents
  add column parent_id uuid references public.agents (id) on delete set null;

comment on column public.agents.parent_id is 'The manager agent that delegated this mission (game teams).';

create index agents_parent_id_idx on public.agents (parent_id);
create index agents_project_id_status_idx on public.agents (project_id, status);

-- Messages between agents: a manager's instruction to a member, a member's report to its manager
alter table public.agent_messages
  add column from_agent_id uuid references public.agents (id) on delete set null;

comment on column public.agent_messages.from_agent_id is 'Sender when the message comes from another agent (manager instruction or member report); null = from the dashboard.';

create index agent_messages_from_agent_idx on public.agent_messages (from_agent_id);
