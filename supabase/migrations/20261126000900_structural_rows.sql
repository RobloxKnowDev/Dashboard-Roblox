-- =============================================================================
-- 0900 — Structural rows (NOT demo data)
-- =============================================================================
-- Only the rows the application needs to function are created here:
--   * the studio_settings singleton (defaults: 'Dashboard', USD, UTC)
--   * one integrations row per supported provider, disconnected
-- Demo / sample data must never be inserted into the database: it lives in
-- typed fixtures in the application code and is labelled DEMO in the UI.
-- =============================================================================

insert into public.studio_settings (id)
values (true)
on conflict (id) do nothing;

insert into public.integrations (provider, status)
values
  ('roblox', 'disconnected'),
  ('anthropic', 'disconnected')
on conflict (provider) do nothing;
