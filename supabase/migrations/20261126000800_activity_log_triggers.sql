-- =============================================================================
-- 0800 — Activity logging
-- =============================================================================
-- activity_logs has no INSERT policy: rows are written exclusively by this
-- SECURITY DEFINER trigger function, so the audit trail cannot be forged
-- from the client.
--
-- Usage: after insert or update or delete ... execute function public.log_activity('<entity_type>')
-- =============================================================================

create or replace function public.log_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entity_type  text := tg_argv[0];
  rec            jsonb;
  old_rec        jsonb;
  changed        jsonb;
  act            text;
  meta           jsonb := '{}'::jsonb;
  label          text;
begin
  if tg_op = 'DELETE' then
    rec := to_jsonb(old);
  else
    rec := to_jsonb(new);
  end if;

  if tg_op = 'INSERT' then
    act := 'created';
  elsif tg_op = 'DELETE' then
    act := 'deleted';
  else
    old_rec := to_jsonb(old);

    -- Columns that actually changed, ignoring bookkeeping columns
    -- (author columns only change through `on delete set null`).
    select coalesce(jsonb_agg(n.key order by n.key), '[]'::jsonb)
      into changed
    from jsonb_each(rec) as n
    where n.key not in ('updated_at', 'position', 'completed_at', 'created_by', 'added_by')
      and n.value is distinct from (old_rec -> n.key);

    -- Pure re-ordering or no-op updates are not worth an entry.
    if jsonb_array_length(changed) = 0 then
      return null;
    end if;

    if (rec -> 'status') is distinct from (old_rec -> 'status') then
      act := 'status_changed';
      meta := jsonb_build_object('from', old_rec ->> 'status', 'to', rec ->> 'status');
    else
      act := 'updated';
    end if;

    meta := meta || jsonb_build_object('changed', changed);
  end if;

  label := coalesce(rec ->> 'name', rec ->> 'title', rec ->> 'display_name');

  -- Finance entries never carry amounts in the log; the label is the category.
  if v_entity_type = 'finance_transaction' then
    label := coalesce(rec ->> 'category', 'transaction');
  end if;

  insert into public.activity_logs (actor_id, action, entity_type, entity_id, entity_label, metadata)
  values (
    (select auth.uid()),
    act,
    v_entity_type,
    (rec ->> 'id')::uuid,
    left(label, 200),
    meta
  );

  return null;
end;
$$;

create trigger log_activity
  after insert or update or delete on public.projects
  for each row execute function public.log_activity('project');

create trigger log_activity
  after insert or update or delete on public.tasks
  for each row execute function public.log_activity('task');

create trigger log_activity
  after insert or update or delete on public.games
  for each row execute function public.log_activity('game');

create trigger log_activity
  after insert or update or delete on public.finance_transactions
  for each row execute function public.log_activity('finance_transaction');

create trigger log_activity
  after insert or update or delete on public.team_members
  for each row execute function public.log_activity('team_member');
