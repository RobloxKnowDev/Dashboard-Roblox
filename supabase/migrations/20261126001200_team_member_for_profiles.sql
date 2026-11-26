-- =============================================================================
-- 1200 — Every account with a role has a team member card
-- =============================================================================
-- Projects and tasks are assigned to team_members (which can also describe
-- people without an account, e.g. freelancers). When an account receives a
-- role, it automatically gets a linked team member so it can be assigned work.

create or replace function public.ensure_team_member_for_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is not null
     and not exists (select 1 from public.team_members tm where tm.profile_id = new.id) then
    insert into public.team_members (profile_id, display_name, avatar_url)
    values (
      new.id,
      coalesce(nullif(trim(new.full_name), ''), split_part(coalesce(new.email, ''), '@', 1), 'Member'),
      new.avatar_url
    );
  end if;
  return new;
end;
$$;

revoke execute on function public.ensure_team_member_for_profile() from public, anon, authenticated;

create trigger ensure_team_member_for_profile
  after insert or update of role on public.profiles
  for each row
  execute function public.ensure_team_member_for_profile();

-- Keep the card's name and avatar in sync when the profile changes.
create or replace function public.sync_team_member_from_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.team_members
     set display_name = coalesce(nullif(trim(new.full_name), ''), display_name),
         avatar_url = new.avatar_url
   where profile_id = new.id;
  return new;
end;
$$;

revoke execute on function public.sync_team_member_from_profile() from public, anon, authenticated;

create trigger sync_team_member_from_profile
  after update of full_name, avatar_url on public.profiles
  for each row
  when (old.full_name is distinct from new.full_name or old.avatar_url is distinct from new.avatar_url)
  execute function public.sync_team_member_from_profile();

-- Backfill: accounts that already have a role.
insert into public.team_members (profile_id, display_name, avatar_url)
select p.id,
       coalesce(nullif(trim(p.full_name), ''), split_part(coalesce(p.email, ''), '@', 1), 'Member'),
       p.avatar_url
  from public.profiles p
 where p.role is not null
   and not exists (select 1 from public.team_members tm where tm.profile_id = p.id);
