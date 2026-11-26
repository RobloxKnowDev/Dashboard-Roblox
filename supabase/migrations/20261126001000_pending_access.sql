-- =============================================================================
-- 1000 — Pending access: accounts get NO access until a role is assigned
-- =============================================================================
-- Defense in depth on top of "public sign-up disabled": if an account is ever
-- created without an invitation (sign-up re-enabled by mistake, "Add user" in
-- the Supabase dashboard…), it can sign in but sees nothing until an owner
-- assigns it a role. A NULL role means "pending approval".

alter table public.profiles alter column role drop not null;
alter table public.profiles alter column role drop default;

comment on column public.profiles.role is
  'Access role. NULL = pending approval: the account can sign in but has no access to studio data.';

-- New accounts: role from app_metadata.role (set server-side at invitation,
-- writable only with the secret key); otherwise pending (NULL).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_role text := new.raw_app_meta_data ->> 'role';
begin
  insert into public.profiles (id, email, full_name, avatar_url, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'avatar_url',
    case
      when requested_role in ('owner', 'admin', 'developer', 'viewer')
        then requested_role::public.app_role
      else null
    end
  );
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Read policies now require an assigned role (viewer or above).
-- A pending user can still read their own profile (to show the pending screen).
-- -----------------------------------------------------------------------------
alter policy "profiles: members can read" on public.profiles
  using (id = (select auth.uid()) or (select public.has_min_role('viewer')));

alter policy "studio_settings: members can read" on public.studio_settings
  using ((select public.has_min_role('viewer')));

alter policy "team_members: members can read" on public.team_members
  using ((select public.has_min_role('viewer')));

alter policy "games: members can read" on public.games
  using ((select public.has_min_role('viewer')));

alter policy "game_metrics: members can read" on public.game_metrics
  using ((select public.has_min_role('viewer')));

alter policy "projects: members can read" on public.projects
  using ((select public.has_min_role('viewer')));

alter policy "project_members: members can read" on public.project_members
  using ((select public.has_min_role('viewer')));

alter policy "tasks: members can read" on public.tasks
  using ((select public.has_min_role('viewer')));

alter policy "agents: members can read" on public.agents
  using ((select public.has_min_role('viewer')));

alter policy "agent_events: members can read" on public.agent_events
  using ((select public.has_min_role('viewer')));

alter policy "game_watchlist: members can read" on public.game_watchlist
  using ((select public.has_min_role('viewer')));

alter policy "watchlist_snapshots: members can read" on public.watchlist_snapshots
  using ((select public.has_min_role('viewer')));

alter policy "game_ideas: members can read" on public.game_ideas
  using ((select public.has_min_role('viewer')));

alter policy "integrations: members can read" on public.integrations
  using ((select public.has_min_role('viewer')));

alter policy "activity_logs: members can read (finance for admins only)" on public.activity_logs
  using (
    (select public.has_min_role('viewer'))
    and (entity_type <> 'finance_transaction' or (select public.has_min_role('admin')))
  );
