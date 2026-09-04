-- These billing ledgers are reachable only by the server service role. Explicit
-- false policies document that boundary and prevent RLS-no-policy advisories
-- without giving browser roles access to any row.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'ai_billing_accounts',
    'apple_ai_subscriptions',
    'ai_credit_periods',
    'ai_credit_days',
    'ai_credit_requests'
  ] loop
    execute format('drop policy if exists server_only_no_direct_client_access on public.%I',table_name);
    execute format(
      'create policy server_only_no_direct_client_access on public.%I for all to anon, authenticated using (false) with check (false)',
      table_name
    );
  end loop;
end $$;
