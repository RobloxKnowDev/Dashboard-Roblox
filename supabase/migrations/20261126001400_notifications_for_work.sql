-- =============================================================================
-- 1400 — In-app notifications for assigned work
-- =============================================================================
-- Members with an account are notified when someone else:
--   * assigns them a task            (preference key: task_assigned)
--   * adds them to a project         (preference key: project_added)
-- Preferences live in profiles.notification_prefs (missing key = enabled).
-- Rows are written by SECURITY DEFINER triggers: clients still can't insert
-- notifications (no INSERT policy), so they can't be forged.

alter table public.profiles
  add column notification_prefs jsonb not null default '{}'::jsonb
  check (jsonb_typeof(notification_prefs) = 'object');

comment on column public.profiles.notification_prefs is
  'In-app notification preferences, e.g. {"task_assigned": false}. A missing key means enabled.';

-- True unless the user turned this notification off.
create or replace function public.notification_enabled(p_profile uuid, p_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select (p.notification_prefs ->> p_key) is distinct from 'false'
       from public.profiles p
      where p.id = p_profile and p.role is not null),
    false
  );
$$;

-- Display name of the user making the change (null for server jobs).
create or replace function public.actor_display_name()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(nullif(trim(p.full_name), ''), split_part(coalesce(p.email, ''), '@', 1))
    from public.profiles p
   where p.id = (select auth.uid());
$$;

revoke execute on function public.notification_enabled(uuid, text) from public, anon, authenticated;
revoke execute on function public.actor_display_name() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Task assigned
-- -----------------------------------------------------------------------------
create or replace function public.notify_task_assignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid;
  actor text := public.actor_display_name();
begin
  if new.assignee_id is null then
    return null;
  end if;
  if tg_op = 'UPDATE' and new.assignee_id is not distinct from old.assignee_id then
    return null;
  end if;

  select tm.profile_id into target from public.team_members tm where tm.id = new.assignee_id;
  if target is null or target = (select auth.uid()) or not public.notification_enabled(target, 'task_assigned') then
    return null;
  end if;

  insert into public.notifications (user_id, type, title, body, link)
  values (
    target,
    'task',
    left('Task assigned: ' || new.title, 200),
    case when actor is not null then 'Assigned by ' || actor end,
    '/tasks?view=mine'
  );
  return null;
end;
$$;

revoke execute on function public.notify_task_assignment() from public, anon, authenticated;

create trigger notify_task_assignment
  after insert or update of assignee_id on public.tasks
  for each row execute function public.notify_task_assignment();

-- -----------------------------------------------------------------------------
-- Added to a project
-- -----------------------------------------------------------------------------
create or replace function public.notify_project_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid;
  project_name text;
  actor text := public.actor_display_name();
begin
  select tm.profile_id into target from public.team_members tm where tm.id = new.team_member_id;
  if target is null or target = (select auth.uid()) or not public.notification_enabled(target, 'project_added') then
    return null;
  end if;

  select p.name into project_name from public.projects p where p.id = new.project_id;
  insert into public.notifications (user_id, type, title, body, link)
  values (
    target,
    'info',
    left('Added to project ' || coalesce(project_name, ''), 200),
    case when actor is not null then 'By ' || actor end,
    '/projects/' || new.project_id
  );
  return null;
end;
$$;

revoke execute on function public.notify_project_member() from public, anon, authenticated;

create trigger notify_project_member
  after insert on public.project_members
  for each row execute function public.notify_project_member();
