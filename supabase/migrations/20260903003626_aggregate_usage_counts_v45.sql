-- Only shared UTC daily counters: no events, users, devices, addresses or identifiers.
create table public.app_usage_daily (
 day date not null,
 metric text not null check (metric in ('app_open','screen_home','screen_calendar','screen_training','screen_nutrition','screen_progress','screen_settings')),
 total bigint not null default 0 check (total >= 0),
 primary key (day, metric)
);
alter table public.app_usage_daily enable row level security;
revoke all on public.app_usage_daily from public, anon, authenticated;
grant select, insert, update on public.app_usage_daily to service_role;

create function public.add_app_usage_counts(increments jsonb) returns void
language plpgsql security invoker set search_path = '' set statement_timeout = '3s' as $$
declare current_day date := (now() at time zone 'UTC')::date;
begin
 if jsonb_typeof(increments) is distinct from 'object' then raise exception 'Invalid counts'; end if;
 if not exists(select 1 from jsonb_each(increments)) or exists(
  select 1 from jsonb_each(increments) as item
  where item.key not in ('app_open','screen_home','screen_calendar','screen_training','screen_nutrition','screen_progress','screen_settings')
   or jsonb_typeof(item.value) <> 'number'
   or item.value::text !~ '^(?:[1-9]|1[0-9]|20)$'
 ) then raise exception 'Invalid counts'; end if;
 if (select sum(value::integer) from jsonb_each_text(increments)) > 20 then raise exception 'Too many counts'; end if;
 -- Stable lock ordering prevents deadlocks when batches contain several counters.
 insert into public.app_usage_daily(day, metric, total)
 select current_day, key, value::integer from jsonb_each_text(increments) order by key
 on conflict(day, metric) do update set total = least(public.app_usage_daily.total + excluded.total, 1000000);
end;
$$;
revoke all on function public.add_app_usage_counts(jsonb) from public, anon, authenticated;
grant execute on function public.add_app_usage_counts(jsonb) to service_role;

-- Owner-only report in Supabase Studio. Counts are visits, not unique people.
create view public.app_usage_dashboard with (security_invoker = true) as
select day,
 coalesce(sum(total) filter(where metric='app_open'),0) as app_opens,
 coalesce(sum(total) filter(where metric like 'screen_%'),0) as screen_visits,
 coalesce(sum(total) filter(where metric='screen_home'),0) as home,
 coalesce(sum(total) filter(where metric='screen_calendar'),0) as calendar,
 coalesce(sum(total) filter(where metric='screen_training'),0) as training,
 coalesce(sum(total) filter(where metric='screen_nutrition'),0) as nutrition,
 coalesce(sum(total) filter(where metric='screen_progress'),0) as progress,
 coalesce(sum(total) filter(where metric='screen_settings'),0) as settings
from public.app_usage_daily group by day order by day desc;
revoke all on public.app_usage_dashboard from public, anon, authenticated;
grant select on public.app_usage_dashboard to service_role;
comment on view public.app_usage_dashboard is 'Optional aggregate usage only. UTC dates; visits, not unique users. No visitor or health data. Private to project administrators.';
