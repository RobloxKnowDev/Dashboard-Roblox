-- =============================================================================
-- 0700 — Row Level Security policies and privileges
-- =============================================================================
-- Permission matrix (approved):
--
--   Capability                                          Owner Admin Dev Viewer
--   Read games, projects, tasks, agents, market, team     x     x    x    x
--   Create / edit projects, tasks, ideas, watchlist       x     x    x    -
--   Delete projects / other people's tasks                x     x    -    -
--   Add / edit the studio's games                         x     x    -    -
--   Finance (read and write)                              x     x    -    -
--   Manage members (team), integrations, studio settings  x     x    -    -
--   Change roles                                          x     -    -    -
--
-- Notes
--   * `(select ...)` wrappers let Postgres evaluate auth helpers once per
--     statement instead of once per row.
--   * Nothing is granted to `anon`: every table requires a signed-in user.
--   * Role changes are enforced by the trigger public.guard_profile_changes.
--   * The service role (server-side only) bypasses RLS: server code using it
--     must perform its own permission checks.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Privileges: nothing for anon, ever
-- -----------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke execute on all functions in schema public from public, anon;

alter default privileges for role postgres in schema public revoke all on tables from anon;
alter default privileges for role postgres in schema public revoke all on sequences from anon;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon;

-- RLS helpers must stay callable by signed-in users (policies run as them).
grant execute on function public.role_rank(public.app_role) to authenticated, service_role;
grant execute on function public.current_app_role() to authenticated, service_role;
grant execute on function public.has_min_role(public.app_role) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
create policy "profiles: members can read"
  on public.profiles for select to authenticated
  using (true);

-- A user edits their own profile; an owner may edit any profile (role changes
-- are further restricted by guard_profile_changes). Inserts come from the
-- auth trigger, deletions from auth.users cascades.
create policy "profiles: self or owner can update"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()) or (select public.has_min_role('owner')))
  with check (id = (select auth.uid()) or (select public.has_min_role('owner')));

-- -----------------------------------------------------------------------------
-- studio_settings
-- -----------------------------------------------------------------------------
create policy "studio_settings: members can read"
  on public.studio_settings for select to authenticated
  using (true);

create policy "studio_settings: admins can update"
  on public.studio_settings for update to authenticated
  using ((select public.has_min_role('admin')))
  with check ((select public.has_min_role('admin')));

-- -----------------------------------------------------------------------------
-- team_members
-- -----------------------------------------------------------------------------
create policy "team_members: members can read"
  on public.team_members for select to authenticated
  using (true);

create policy "team_members: admins can insert"
  on public.team_members for insert to authenticated
  with check ((select public.has_min_role('admin')));

create policy "team_members: admins can update"
  on public.team_members for update to authenticated
  using ((select public.has_min_role('admin')))
  with check ((select public.has_min_role('admin')));

create policy "team_members: admins can delete"
  on public.team_members for delete to authenticated
  using ((select public.has_min_role('admin')));

-- -----------------------------------------------------------------------------
-- games
-- -----------------------------------------------------------------------------
create policy "games: members can read"
  on public.games for select to authenticated
  using (true);

create policy "games: admins can insert"
  on public.games for insert to authenticated
  with check ((select public.has_min_role('admin')) and created_by = (select auth.uid()));

create policy "games: admins can update"
  on public.games for update to authenticated
  using ((select public.has_min_role('admin')))
  with check ((select public.has_min_role('admin')));

create policy "games: admins can delete"
  on public.games for delete to authenticated
  using ((select public.has_min_role('admin')));

-- -----------------------------------------------------------------------------
-- game_metrics (normally written by server-side sync with the service role)
-- -----------------------------------------------------------------------------
create policy "game_metrics: members can read"
  on public.game_metrics for select to authenticated
  using (true);

create policy "game_metrics: admins can insert"
  on public.game_metrics for insert to authenticated
  with check ((select public.has_min_role('admin')));

create policy "game_metrics: admins can update"
  on public.game_metrics for update to authenticated
  using ((select public.has_min_role('admin')))
  with check ((select public.has_min_role('admin')));

create policy "game_metrics: admins can delete"
  on public.game_metrics for delete to authenticated
  using ((select public.has_min_role('admin')));

-- -----------------------------------------------------------------------------
-- projects
-- -----------------------------------------------------------------------------
create policy "projects: members can read"
  on public.projects for select to authenticated
  using (true);

create policy "projects: developers can insert"
  on public.projects for insert to authenticated
  with check ((select public.has_min_role('developer')) and created_by = (select auth.uid()));

create policy "projects: developers can update"
  on public.projects for update to authenticated
  using ((select public.has_min_role('developer')))
  with check ((select public.has_min_role('developer')));

create policy "projects: admins can delete"
  on public.projects for delete to authenticated
  using ((select public.has_min_role('admin')));

-- -----------------------------------------------------------------------------
-- project_members
-- -----------------------------------------------------------------------------
create policy "project_members: members can read"
  on public.project_members for select to authenticated
  using (true);

create policy "project_members: developers can insert"
  on public.project_members for insert to authenticated
  with check ((select public.has_min_role('developer')));

create policy "project_members: developers can update"
  on public.project_members for update to authenticated
  using ((select public.has_min_role('developer')))
  with check ((select public.has_min_role('developer')));

create policy "project_members: developers can delete"
  on public.project_members for delete to authenticated
  using ((select public.has_min_role('developer')));

-- -----------------------------------------------------------------------------
-- tasks
-- -----------------------------------------------------------------------------
create policy "tasks: members can read"
  on public.tasks for select to authenticated
  using (true);

create policy "tasks: developers can insert"
  on public.tasks for insert to authenticated
  with check ((select public.has_min_role('developer')) and created_by = (select auth.uid()));

create policy "tasks: developers can update"
  on public.tasks for update to authenticated
  using ((select public.has_min_role('developer')))
  with check ((select public.has_min_role('developer')));

-- Admins delete any task; developers delete the tasks they created.
create policy "tasks: admins or authors can delete"
  on public.tasks for delete to authenticated
  using (
    (select public.has_min_role('admin'))
    or ((select public.has_min_role('developer')) and created_by = (select auth.uid()))
  );

-- -----------------------------------------------------------------------------
-- agents
-- -----------------------------------------------------------------------------
create policy "agents: members can read"
  on public.agents for select to authenticated
  using (true);

create policy "agents: developers can insert"
  on public.agents for insert to authenticated
  with check ((select public.has_min_role('developer')) and created_by = (select auth.uid()));

create policy "agents: developers can update"
  on public.agents for update to authenticated
  using ((select public.has_min_role('developer')))
  with check ((select public.has_min_role('developer')));

create policy "agents: admins can delete"
  on public.agents for delete to authenticated
  using ((select public.has_min_role('admin')));

-- -----------------------------------------------------------------------------
-- agent_events (append-only; normally written by the ingestion API)
-- -----------------------------------------------------------------------------
create policy "agent_events: members can read"
  on public.agent_events for select to authenticated
  using (true);

create policy "agent_events: developers can insert"
  on public.agent_events for insert to authenticated
  with check ((select public.has_min_role('developer')));

create policy "agent_events: admins can delete"
  on public.agent_events for delete to authenticated
  using ((select public.has_min_role('admin')));

-- -----------------------------------------------------------------------------
-- finance_transactions — owner / admin only, read AND write
-- -----------------------------------------------------------------------------
create policy "finance_transactions: admins can read"
  on public.finance_transactions for select to authenticated
  using ((select public.has_min_role('admin')));

create policy "finance_transactions: admins can insert"
  on public.finance_transactions for insert to authenticated
  with check ((select public.has_min_role('admin')) and created_by = (select auth.uid()));

create policy "finance_transactions: admins can update"
  on public.finance_transactions for update to authenticated
  using ((select public.has_min_role('admin')))
  with check ((select public.has_min_role('admin')));

create policy "finance_transactions: admins can delete"
  on public.finance_transactions for delete to authenticated
  using ((select public.has_min_role('admin')));

-- -----------------------------------------------------------------------------
-- game_watchlist
-- -----------------------------------------------------------------------------
create policy "game_watchlist: members can read"
  on public.game_watchlist for select to authenticated
  using (true);

create policy "game_watchlist: developers can insert"
  on public.game_watchlist for insert to authenticated
  with check ((select public.has_min_role('developer')) and added_by = (select auth.uid()));

create policy "game_watchlist: developers can update"
  on public.game_watchlist for update to authenticated
  using ((select public.has_min_role('developer')))
  with check ((select public.has_min_role('developer')));

create policy "game_watchlist: admins or authors can delete"
  on public.game_watchlist for delete to authenticated
  using (
    (select public.has_min_role('admin'))
    or ((select public.has_min_role('developer')) and added_by = (select auth.uid()))
  );

-- -----------------------------------------------------------------------------
-- watchlist_snapshots (normally written by server-side sync)
-- -----------------------------------------------------------------------------
create policy "watchlist_snapshots: members can read"
  on public.watchlist_snapshots for select to authenticated
  using (true);

create policy "watchlist_snapshots: admins can insert"
  on public.watchlist_snapshots for insert to authenticated
  with check ((select public.has_min_role('admin')));

create policy "watchlist_snapshots: admins can delete"
  on public.watchlist_snapshots for delete to authenticated
  using ((select public.has_min_role('admin')));

-- -----------------------------------------------------------------------------
-- game_ideas — users create 'manual' ideas; 'ai' ideas come from the server
-- -----------------------------------------------------------------------------
create policy "game_ideas: members can read"
  on public.game_ideas for select to authenticated
  using (true);

create policy "game_ideas: developers can insert manual ideas"
  on public.game_ideas for insert to authenticated
  with check (
    (select public.has_min_role('developer'))
    and origin = 'manual'
    and created_by = (select auth.uid())
  );

create policy "game_ideas: developers can update"
  on public.game_ideas for update to authenticated
  using ((select public.has_min_role('developer')))
  with check ((select public.has_min_role('developer')));

create policy "game_ideas: admins or authors can delete"
  on public.game_ideas for delete to authenticated
  using (
    (select public.has_min_role('admin'))
    or ((select public.has_min_role('developer')) and created_by = (select auth.uid()))
  );

-- -----------------------------------------------------------------------------
-- notifications — own rows only; clients may only mark them as read
-- -----------------------------------------------------------------------------
create policy "notifications: users read their own"
  on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));

create policy "notifications: users update their own"
  on public.notifications for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "notifications: users delete their own"
  on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()));

-- Column-level privilege: only read_at can be changed by clients.
revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

-- -----------------------------------------------------------------------------
-- activity_logs — read-only for clients; finance entries visible to admins only
-- -----------------------------------------------------------------------------
create policy "activity_logs: members can read (finance for admins only)"
  on public.activity_logs for select to authenticated
  using (
    entity_type <> 'finance_transaction'
    or (select public.has_min_role('admin'))
  );

-- -----------------------------------------------------------------------------
-- integrations
-- -----------------------------------------------------------------------------
create policy "integrations: members can read"
  on public.integrations for select to authenticated
  using (true);

create policy "integrations: admins can insert"
  on public.integrations for insert to authenticated
  with check ((select public.has_min_role('admin')));

create policy "integrations: admins can update"
  on public.integrations for update to authenticated
  using ((select public.has_min_role('admin')))
  with check ((select public.has_min_role('admin')));

create policy "integrations: admins can delete"
  on public.integrations for delete to authenticated
  using ((select public.has_min_role('admin')));

-- -----------------------------------------------------------------------------
-- assistant_conversations / assistant_messages — private to each user
-- -----------------------------------------------------------------------------
create policy "assistant_conversations: users read their own"
  on public.assistant_conversations for select to authenticated
  using (user_id = (select auth.uid()));

create policy "assistant_conversations: users create their own"
  on public.assistant_conversations for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "assistant_conversations: users update their own"
  on public.assistant_conversations for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "assistant_conversations: users delete their own"
  on public.assistant_conversations for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "assistant_messages: users read their own"
  on public.assistant_messages for select to authenticated
  using (
    exists (
      select 1 from public.assistant_conversations c
      where c.id = conversation_id and c.user_id = (select auth.uid())
    )
  );

create policy "assistant_messages: users write in their own conversations"
  on public.assistant_messages for insert to authenticated
  with check (
    exists (
      select 1 from public.assistant_conversations c
      where c.id = conversation_id and c.user_id = (select auth.uid())
    )
  );

create policy "assistant_messages: users delete their own"
  on public.assistant_messages for delete to authenticated
  using (
    exists (
      select 1 from public.assistant_conversations c
      where c.id = conversation_id and c.user_id = (select auth.uid())
    )
  );
