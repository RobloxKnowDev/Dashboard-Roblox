-- =============================================================================
-- 1900 — Every Owner pilots the AI agents (was: one designated account)
-- =============================================================================
--
-- The studio decided that both Owners may write to agents, start missions and
-- new games. The rule is now the role: is_agent_controller() keeps its name
-- (the RLS policies of agents and agent_messages call it) and checks "Owner".
-- Admins still see every agent and its results, without writing to them.

create or replace function public.is_agent_controller()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_app_role() = 'owner', false);
$$;

comment on function public.is_agent_controller() is
  'True when the calling user may pilot the AI agents (write to them, start missions and games): every Owner.';

revoke all on function public.is_agent_controller() from public, anon;
grant execute on function public.is_agent_controller() to authenticated, service_role;

-- The single-account setting is gone.
drop trigger if exists guard_agent_controller on public.studio_settings;
drop function if exists public.guard_agent_controller();
drop index if exists public.studio_settings_agent_controller_idx;
alter table public.studio_settings drop column if exists agent_controller_id;
