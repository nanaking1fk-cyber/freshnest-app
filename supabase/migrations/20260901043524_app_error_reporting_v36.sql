-- Privacy-filtered, first-party web and native incident reporting.
-- Reports contain app diagnostics only: no account identifier, planner state,
-- health data, request body, cookie, authorization header or raw IP address.

create table if not exists public.app_error_reports (
  id uuid primary key default gen_random_uuid(),
  bucket_day date not null default current_date,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  occurrence_count bigint not null default 1 check (occurrence_count > 0),
  fingerprint text not null check (fingerprint ~ '^[0-9a-f]{64}$'),
  release text not null check (release ~ '^\d+\.\d+\.\d+$'),
  surface text not null check (surface in ('web','ios','android')),
  source text not null check (source in ('window_error','unhandled_rejection','boot_load','resource_error','network_error','api_error','native_bridge','native_crash','native_hang')),
  category text not null check (category in ('network','script','storage','auth','client','api','native')),
  route text,
  error_name text,
  message text,
  stack text,
  constraint app_error_reports_fingerprint_day_unique unique (bucket_day,fingerprint)
);

create index if not exists app_error_reports_last_seen_idx
  on public.app_error_reports(last_seen_at desc);
create index if not exists app_error_reports_release_surface_idx
  on public.app_error_reports(release,surface,last_seen_at desc);

create table if not exists public.app_error_ingest_daily (
  day date not null default current_date,
  client_hash text not null check (client_hash ~ '^[0-9a-f]{64}$'),
  requests integer not null default 0 check (requests >= 0),
  updated_at timestamptz not null default now(),
  primary key (day,client_hash)
);

alter table public.app_error_reports enable row level security;
alter table public.app_error_ingest_daily enable row level security;

revoke all on table public.app_error_reports from public,anon,authenticated;
revoke all on table public.app_error_ingest_daily from public,anon,authenticated;
grant select,insert,update,delete on table public.app_error_reports to service_role;
grant select,insert,update,delete on table public.app_error_ingest_daily to service_role;

create or replace function public.record_app_error(
  report_client_hash text,
  report_fingerprint text,
  report_release text,
  report_surface text,
  report_source text,
  report_category text,
  report_route text default null,
  report_error_name text default null,
  report_message text default null,
  report_stack text default null,
  daily_limit integer default 100
) returns table(report_id uuid, occurrence_count bigint, accepted boolean)
language plpgsql
security invoker
set search_path=pg_catalog,public
as $$
declare
  request_count integer;
  stored_id uuid;
  stored_occurrences bigint;
begin
  if report_client_hash !~ '^[0-9a-f]{64}$'
     or report_fingerprint !~ '^[0-9a-f]{64}$'
     or report_release !~ '^\d+\.\d+\.\d+$'
     or report_surface not in ('web','ios','android')
     or report_source not in ('window_error','unhandled_rejection','boot_load','resource_error','network_error','api_error','native_bridge','native_crash','native_hang')
     or report_category not in ('network','script','storage','auth','client','api','native')
     or daily_limit < 1 or daily_limit > 1000 then
    raise exception 'Invalid diagnostic report';
  end if;

  delete from public.app_error_ingest_daily where day < current_date - 7;
  delete from public.app_error_reports where bucket_day < current_date - 90;

  insert into public.app_error_ingest_daily(day,client_hash,requests,updated_at)
  values(current_date,report_client_hash,0,now())
  on conflict(day,client_hash) do nothing;

  select requests into request_count
  from public.app_error_ingest_daily
  where day=current_date and client_hash=report_client_hash
  for update;

  if request_count >= daily_limit then
    return query select null::uuid,0::bigint,false;
    return;
  end if;

  update public.app_error_ingest_daily
  set requests=requests+1,updated_at=now()
  where day=current_date and client_hash=report_client_hash;

  insert into public.app_error_reports(
    bucket_day,fingerprint,release,surface,source,category,route,error_name,message,stack
  ) values(
    current_date,report_fingerprint,report_release,report_surface,report_source,report_category,
    left(report_route,240),left(report_error_name,80),left(report_message,240),left(report_stack,4000)
  )
  on conflict(bucket_day,fingerprint) do update
  set last_seen_at=now(),occurrence_count=public.app_error_reports.occurrence_count+1
  returning id,public.app_error_reports.occurrence_count into stored_id,stored_occurrences;

  return query select stored_id,stored_occurrences,true;
end $$;

revoke all on function public.record_app_error(text,text,text,text,text,text,text,text,text,text,integer) from public,anon,authenticated;
grant execute on function public.record_app_error(text,text,text,text,text,text,text,text,text,text,integer) to service_role;

comment on table public.app_error_reports is
  'Privacy-filtered web and native diagnostics, aggregated by fingerprint and day.';
comment on table public.app_error_ingest_daily is
  'Short-lived daily HMAC hashes used only to rate-limit diagnostic ingestion.';
