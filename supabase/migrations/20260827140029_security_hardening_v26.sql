-- Work + Workout v25.1 security hardening.
-- User-owned data is written with the caller's JWT so RLS is load-bearing.
-- High-volume state sync retains a service-only atomic daily budget.

create table if not exists public.state_write_usage_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null default current_date,
  writes integer not null default 0 check (writes >= 0),
  bytes bigint not null default 0 check (bytes >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id,day)
);

alter table public.state_write_usage_daily enable row level security;
revoke all on public.state_write_usage_daily from public,anon,authenticated;
grant select,insert,update,delete on public.state_write_usage_daily to service_role;

create or replace function public.count_state_write(
  target_user_id uuid,
  payload_bytes bigint,
  daily_write_limit integer default 300,
  daily_byte_limit bigint default 256000000
) returns table(writes integer,bytes bigint)
language plpgsql
security invoker
set search_path=pg_catalog,public
as $$
declare
  next_writes integer;
  next_bytes bigint;
begin
  if target_user_id is null
     or payload_bytes < 1
     or daily_write_limit < 1
     or daily_byte_limit < 1
     or payload_bytes > daily_byte_limit then
    return;
  end if;

  insert into public.state_write_usage_daily(user_id,day,writes,bytes,updated_at)
  values(target_user_id,current_date,1,payload_bytes,now())
  on conflict(user_id,day) do update
    set writes=public.state_write_usage_daily.writes+1,
        bytes=public.state_write_usage_daily.bytes+excluded.bytes,
        updated_at=now()
    where public.state_write_usage_daily.writes < daily_write_limit
      and public.state_write_usage_daily.bytes+excluded.bytes <= daily_byte_limit
  returning public.state_write_usage_daily.writes,public.state_write_usage_daily.bytes
  into next_writes,next_bytes;

  if next_writes is not null then
    return query select next_writes,next_bytes;
  end if;
end $$;

revoke all on function public.count_state_write(uuid,bigint,integer,bigint) from public;
revoke all on function public.count_state_write(uuid,bigint,integer,bigint) from anon,authenticated;
grant execute on function public.count_state_write(uuid,bigint,integer,bigint) to service_role;

create or replace function public.replace_own_active_user_plan(
  target_kind text,
  target_plan jsonb,
  target_source text default 'deterministic+ai'
) returns uuid
language plpgsql
security invoker
set search_path=pg_catalog,public
as $$
declare
  owner_id uuid := auth.uid();
  new_id uuid;
begin
  if owner_id is null
     or target_plan is null
     or target_kind not in ('combined','training','nutrition','schedule') then
    raise exception 'Invalid plan replacement request';
  end if;

  -- Serialize replacements for the same account and plan kind. Without this,
  -- concurrent calls can both race on the partial unique active-plan index.
  perform pg_advisory_xact_lock(hashtextextended(owner_id::text||':'||target_kind,0));

  update public.user_plans
  set active=false
  where user_id=owner_id and kind=target_kind and active;

  insert into public.user_plans(user_id,kind,plan,source,active)
  values(owner_id,target_kind,target_plan,coalesce(nullif(target_source,''),'deterministic+ai'),true)
  returning id into new_id;

  return new_id;
end $$;

revoke all on function public.replace_own_active_user_plan(text,jsonb,text) from public;
revoke all on function public.replace_own_active_user_plan(text,jsonb,text) from anon;
grant execute on function public.replace_own_active_user_plan(text,jsonb,text) to authenticated;

-- Explicit privileges pair with the existing auth.uid() RLS policies.
grant select,insert,update on public.user_state to authenticated;
grant select,insert,update on public.onboarding_answers to authenticated;
grant select,insert,update on public.user_plans to authenticated;
grant select,insert,delete on public.chat_messages to authenticated;
