-- =============================================================================
-- 2000 — AI agents: Owners delete the useless ones; images attached to the
-- messages they send
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Deleting an agent: the people who pilot agents (Owners), no longer Admins.
-- Its events, sessions and messages go with it (on delete cascade).
-- -----------------------------------------------------------------------------
drop policy if exists "agents: admins can delete" on public.agents;

create policy "agents: pilots can delete"
  on public.agents for delete to authenticated
  using ((select public.is_agent_controller()));

-- -----------------------------------------------------------------------------
-- Images attached to a message: object paths in the private agent-media
-- bucket ("messages/<agent id>/<uuid>.png"), 4 at most. A message may be
-- images only (empty text).
-- -----------------------------------------------------------------------------
alter table public.agent_messages
  add column images text[] not null default '{}'
    check (cardinality(images) <= 4);

comment on column public.agent_messages.images is
  'Images attached by the sender: paths in the private agent-media bucket (messages/<agent id>/…). The PC downloads them and Claude opens them.';

-- The body check of 1700 required at least one character: replace it.
do $$
declare
  c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.agent_messages'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%char_length(body)%'
  loop
    execute format('alter table public.agent_messages drop constraint %I', c.conname);
  end loop;
end;
$$;

alter table public.agent_messages
  add constraint agent_messages_body_check
    check (char_length(body) <= 8000 and (char_length(body) >= 1 or cardinality(images) > 0));

-- Uploads go straight from the browser to the private bucket, under
-- messages/, for the people who pilot agents. Reading stays server-side
-- (short-lived signed URLs); the bucket keeps its 8 MB and PNG/JPEG/WebP limits.
create policy "agent-media: pilots can upload message images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'agent-media'
    and (storage.foldername(name))[1] = 'messages'
    and (select public.is_agent_controller())
  );
