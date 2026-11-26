-- =============================================================================
-- 0100 — Extensions, enums and generic trigger helpers
-- =============================================================================
-- Conventions used across all migrations:
--   * uuid primary keys (gen_random_uuid()), timestamptz everywhere
--   * created_at / updated_at maintained by triggers
--   * RLS enabled on every table at creation time; policies live in 0700
--   * No demo data is ever stored in the database
-- =============================================================================

create extension if not exists pg_trgm with schema extensions;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------

-- Access level of an account. Rank (highest first): owner > admin > developer > viewer.
create type public.app_role as enum ('owner', 'admin', 'developer', 'viewer');

create type public.member_status as enum ('active', 'inactive');

create type public.game_status as enum ('in_development', 'testing', 'live', 'paused', 'archived');

create type public.metric_period as enum ('hour', 'day');

create type public.project_status as enum (
  'planning', 'in_progress', 'testing', 'completed', 'on_hold', 'cancelled'
);

create type public.task_status as enum ('todo', 'in_progress', 'in_review', 'done', 'cancelled');

create type public.task_priority as enum ('low', 'medium', 'high', 'critical');

create type public.agent_status as enum ('working', 'waiting', 'completed', 'error', 'offline');

create type public.agent_event_type as enum (
  'started', 'progress', 'waiting', 'completed', 'error', 'log', 'status_change'
);

create type public.transaction_type as enum ('revenue', 'expense');

create type public.transaction_category as enum (
  -- revenue
  'roblox_payout', 'devex', 'sponsorship',
  -- expense
  'development', 'advertising', 'tools', 'salaries', 'assets',
  -- both
  'other'
);

create type public.idea_origin as enum ('manual', 'ai');

create type public.idea_status as enum ('suggested', 'saved', 'archived');

create type public.notification_type as enum (
  'info', 'success', 'warning', 'error', 'task', 'agent', 'finance', 'system'
);

create type public.integration_provider as enum ('roblox', 'anthropic');

create type public.integration_status as enum ('disconnected', 'connected', 'error');

create type public.assistant_role as enum ('user', 'assistant');

-- -----------------------------------------------------------------------------
-- Generic trigger helpers
-- -----------------------------------------------------------------------------

-- Keeps updated_at current on every UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Makes an author column (created_by / added_by) immutable after INSERT so that
-- ownership-based policies cannot be bypassed by rewriting the author.
-- Setting it to NULL stays allowed: that is what `on delete set null` does when
-- the author's account is deleted (blocking it would break account deletion),
-- and a NULL author never matches an ownership check.
-- Usage: before update ... execute function public.preserve_column('created_by')
create or replace function public.preserve_column()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  col       text  := tg_argv[0];
  new_value jsonb := to_jsonb(new) -> col;
  old_value jsonb := to_jsonb(old) -> col;
begin
  if new_value is distinct from old_value and new_value <> 'null'::jsonb then
    new := jsonb_populate_record(new, jsonb_build_object(col, old_value));
  end if;
  return new;
end;
$$;

-- Maintains completed_at from the status column.
-- Usage: before insert or update ... execute function public.sync_completed_at('done')
create or replace function public.sync_completed_at()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  done_status text := tg_argv[0];
begin
  if new.status::text = done_status then
    if tg_op = 'INSERT' or old.status::text is distinct from done_status then
      new.completed_at := coalesce(new.completed_at, now());
    end if;
  else
    new.completed_at := null;
  end if;
  return new;
end;
$$;
