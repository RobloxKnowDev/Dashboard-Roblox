-- =============================================================================
-- 1100 — Apply the invitation role when Supabase writes app_metadata
-- =============================================================================
-- Supabase Auth inserts the auth.users row first and writes app_metadata in a
-- second step, so handle_new_user (AFTER INSERT) never sees app_metadata.role.
-- This trigger catches that update and assigns the requested role — only to a
-- profile that is still pending (role IS NULL), so it can never override a
-- role an owner has set. app_metadata is writable only with the secret key.

create or replace function public.handle_user_app_metadata_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_role text := new.raw_app_meta_data ->> 'role';
begin
  if requested_role in ('owner', 'admin', 'developer', 'viewer') then
    update public.profiles
       set role = requested_role::public.app_role
     where id = new.id
       and role is null;
  end if;
  return new;
end;
$$;

revoke execute on function public.handle_user_app_metadata_change() from public, anon, authenticated;

create trigger on_auth_user_app_metadata_updated
  after update of raw_app_meta_data on auth.users
  for each row
  when (old.raw_app_meta_data ->> 'role' is distinct from new.raw_app_meta_data ->> 'role')
  execute function public.handle_user_app_metadata_change();
