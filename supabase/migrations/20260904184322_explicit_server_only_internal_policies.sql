-- Existing internal ledgers and OAuth token tables are service-role only.
-- Explicit false policies document the boundary for browser roles and keep the
-- security advisor focused on actionable findings.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'ai_coach_trial_usage',
    'ai_global_usage_daily',
    'ai_usage_daily',
    'app_error_ingest_daily',
    'app_error_reports',
    'app_usage_daily',
    'calendar_connections',
    'calendar_event_links',
    'calendar_oauth_states',
    'state_write_usage_daily'
  ] loop
    execute format('drop policy if exists server_only_no_direct_client_access on public.%I',table_name);
    execute format(
      'create policy server_only_no_direct_client_access on public.%I for all to anon, authenticated using (false) with check (false)',
      table_name
    );
  end loop;
end $$;
