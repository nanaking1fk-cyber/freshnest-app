-- Reconcile the live v25 calendar schema without overwriting existing data.
-- The original tables already exist in production; this migration restores
-- the one missing updated_at trigger and reasserts service-only privileges.

do $$
begin
  if to_regclass('public.calendar_oauth_states') is null
    or to_regclass('public.calendar_connections') is null
    or to_regclass('public.calendar_event_links') is null then
    raise exception 'Calendar v25 tables are incomplete; apply 20260826120000_calendar_sync_v25.sql first';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.calendar_connections'::regclass
      and tgname = 'calendar_connections_touch'
      and not tgisinternal
  ) then
    create trigger calendar_connections_touch
    before update on public.calendar_connections
    for each row execute function public.touch_updated_at();
  end if;
end $$;

alter table public.calendar_oauth_states enable row level security;
alter table public.calendar_connections enable row level security;
alter table public.calendar_event_links enable row level security;

revoke all on public.calendar_oauth_states from public,anon,authenticated;
revoke all on public.calendar_connections from public,anon,authenticated;
revoke all on public.calendar_event_links from public,anon,authenticated;

grant select,insert,update,delete on public.calendar_oauth_states to service_role;
grant select,insert,update,delete on public.calendar_connections to service_role;
grant select,insert,update,delete on public.calendar_event_links to service_role;
