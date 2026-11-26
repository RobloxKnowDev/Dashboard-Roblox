-- =============================================================================
-- 0600 — Notifications, activity logs, integrations, AI assistant history
-- =============================================================================

-- -----------------------------------------------------------------------------
-- notifications — per-user inbox
-- -----------------------------------------------------------------------------
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  type        public.notification_type not null default 'info',
  title       text not null check (char_length(title) between 1 and 200),
  body        text,
  link        text,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

alter table public.notifications enable row level security;

create index notifications_user_read_idx on public.notifications (user_id, read_at);
create index notifications_user_created_idx on public.notifications (user_id, created_at desc);

-- -----------------------------------------------------------------------------
-- activity_logs — audit trail, written only by triggers (see 0800)
-- -----------------------------------------------------------------------------
create table public.activity_logs (
  id            uuid primary key default gen_random_uuid(),
  actor_id      uuid references public.profiles (id) on delete set null,
  action        text not null check (action in ('created', 'updated', 'status_changed', 'deleted')),
  entity_type   text not null,
  entity_id     uuid,
  -- Human-readable label captured at the time of the action (name, title…).
  entity_label  text,
  metadata      jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at    timestamptz not null default now()
);

alter table public.activity_logs enable row level security;

create index activity_logs_created_idx on public.activity_logs (created_at desc);
create index activity_logs_entity_idx on public.activity_logs (entity_type, entity_id);
create index activity_logs_actor_idx on public.activity_logs (actor_id);

-- -----------------------------------------------------------------------------
-- integrations — status of external connections (Roblox, Claude…)
-- Secrets (API keys) are NEVER stored here: they live in server-side
-- environment variables. `config` only holds non-sensitive settings.
-- -----------------------------------------------------------------------------
create table public.integrations (
  id            uuid primary key default gen_random_uuid(),
  provider      public.integration_provider not null unique,
  status        public.integration_status not null default 'disconnected',
  config        jsonb not null default '{}'::jsonb check (jsonb_typeof(config) = 'object'),
  last_sync_at  timestamptz,
  last_error    text,
  updated_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on column public.integrations.config is
  'Non-sensitive settings only. API keys and secrets must stay in server environment variables.';

alter table public.integrations enable row level security;

create index integrations_updated_by_idx on public.integrations (updated_by);

create trigger set_updated_at
  before update on public.integrations
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- assistant_conversations / assistant_messages — AI assistant chat history
-- -----------------------------------------------------------------------------
create table public.assistant_conversations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title       text not null default 'New conversation' check (char_length(title) between 1 and 200),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.assistant_conversations enable row level security;

create index assistant_conversations_user_updated_idx
  on public.assistant_conversations (user_id, updated_at desc);

create trigger set_updated_at
  before update on public.assistant_conversations
  for each row execute function public.set_updated_at();

create table public.assistant_messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.assistant_conversations (id) on delete cascade,
  role             public.assistant_role not null,
  content          text not null,
  metadata         jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at       timestamptz not null default now()
);

alter table public.assistant_messages enable row level security;

create index assistant_messages_conversation_created_idx
  on public.assistant_messages (conversation_id, created_at);

-- A new message bumps the conversation to the top of the history.
create or replace function public.touch_assistant_conversation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.assistant_conversations
  set updated_at = now()
  where id = new.conversation_id;
  return null;
end;
$$;

create trigger touch_assistant_conversation
  after insert on public.assistant_messages
  for each row execute function public.touch_assistant_conversation();
