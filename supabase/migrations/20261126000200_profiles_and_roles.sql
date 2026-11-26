-- =============================================================================
-- 0200 — Profiles (1-1 with auth.users), role helpers, role guards
-- =============================================================================

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text not null default '' check (char_length(full_name) <= 120),
  avatar_url  text,
  role        public.app_role not null default 'viewer',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is
  'One row per account (auth.users). Holds the access role used by every RLS policy.';
comment on column public.profiles.email is
  'Copy of auth.users.email, kept in sync by trigger. Read-only for clients.';

alter table public.profiles enable row level security;

create index profiles_role_idx on public.profiles (role);

create trigger set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Role helpers (used by RLS policies)
-- -----------------------------------------------------------------------------

-- Numeric rank of a role: owner 4 > admin 3 > developer 2 > viewer 1.
create or replace function public.role_rank(r public.app_role)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case r
    when 'owner' then 4
    when 'admin' then 3
    when 'developer' then 2
    when 'viewer' then 1
  end;
$$;

-- Role of the calling user (null when not authenticated or no profile).
create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p where p.id = (select auth.uid());
$$;

-- True when the calling user's role is at least `min_role`.
create or replace function public.has_min_role(min_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    public.role_rank(public.current_app_role()) >= public.role_rank(min_role),
    false
  );
$$;

revoke execute on function public.role_rank(public.app_role) from public, anon;
revoke execute on function public.current_app_role() from public, anon;
revoke execute on function public.has_min_role(public.app_role) from public, anon;
grant execute on function public.role_rank(public.app_role) to authenticated, service_role;
grant execute on function public.current_app_role() to authenticated, service_role;
grant execute on function public.has_min_role(public.app_role) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Guard: role changes and owner protection
-- -----------------------------------------------------------------------------
-- Runs with the caller's privileges (SECURITY INVOKER) so that `current_user`
-- tells API clients ('anon' / 'authenticated') apart from trusted server
-- contexts (service_role key, SQL editor, auth triggers).
--
-- Rules for API clients:
--   * nobody can change their own role
--   * only an owner can change someone else's role
--   * email is read-only (synced from auth.users)
-- Rules for everyone (including trusted contexts):
--   * the last owner cannot be demoted or deleted
create or replace function public.guard_profile_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  is_api_client boolean := current_user in ('anon', 'authenticated');
  other_owners integer;
begin
  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id then
      raise exception 'Profile id cannot be changed' using errcode = '42501';
    end if;

    if is_api_client and new.email is distinct from old.email then
      raise exception 'Email is managed by authentication and cannot be edited here'
        using errcode = '42501';
    end if;

    if new.role is distinct from old.role then
      if is_api_client then
        if old.id = (select auth.uid()) then
          raise exception 'You cannot change your own role' using errcode = '42501';
        end if;
        if public.current_app_role() is distinct from 'owner' then
          raise exception 'Only an owner can change roles' using errcode = '42501';
        end if;
      end if;

      if old.role = 'owner' then
        select count(*) into other_owners
        from public.profiles
        where role = 'owner' and id <> old.id;

        if other_owners = 0 then
          raise exception 'The last owner cannot be demoted' using errcode = '42501';
        end if;
      end if;
    end if;

    return new;
  end if;

  if tg_op = 'DELETE' then
    if old.role = 'owner' then
      select count(*) into other_owners
      from public.profiles
      where role = 'owner' and id <> old.id;

      if other_owners = 0 then
        raise exception 'The last owner cannot be deleted' using errcode = '42501';
      end if;
    end if;

    return old;
  end if;

  return null;
end;
$$;

create trigger guard_profile_changes
  before update or delete on public.profiles
  for each row execute function public.guard_profile_changes();

-- -----------------------------------------------------------------------------
-- auth.users -> profiles synchronisation
-- -----------------------------------------------------------------------------

-- Creates the profile of every new account.
-- The initial role can be provided at invitation time through app_metadata.role
-- (app_metadata is writable only with the service role key, never by the user).
-- Anything else defaults to 'viewer'.
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
      else 'viewer'::public.app_role
    end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keeps profiles.email in sync with auth.users.email.
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();
