-- Work + Workout v31 launch-cost guardrails.
-- Reserve every AI request against both the account's daily allowance and a
-- deployment-wide daily allowance in one transaction.

create table if not exists public.ai_global_usage_daily (
  day date primary key default current_date,
  requests integer not null default 0 check (requests >= 0),
  updated_at timestamptz not null default now()
);

alter table public.ai_global_usage_daily enable row level security;
revoke all on public.ai_global_usage_daily from public,anon,authenticated;
grant select,insert,update,delete on public.ai_global_usage_daily to service_role;

create or replace function public.reserve_ai_request(
  target_user_id uuid,
  user_daily_limit integer default 40,
  global_daily_limit integer default 100
) returns table(
  user_requests integer,
  global_requests integer,
  allowed boolean,
  blocked_reason text
)
language plpgsql
security invoker
set search_path=pg_catalog,public
as $$
declare
  current_user_requests integer;
  current_global_requests integer;
begin
  if target_user_id is null
     or user_daily_limit < 1
     or global_daily_limit < 1 then
    raise exception 'Invalid AI usage request';
  end if;

  -- Materialize both rows first, then lock them in the same order for every
  -- caller. This prevents concurrent requests from overshooting either cap.
  insert into public.ai_global_usage_daily(day,requests,updated_at)
  values(current_date,0,now())
  on conflict(day) do nothing;

  insert into public.ai_usage_daily(user_id,day,requests,updated_at)
  values(target_user_id,current_date,0,now())
  on conflict(user_id,day) do nothing;

  select requests into current_global_requests
  from public.ai_global_usage_daily
  where day=current_date
  for update;

  select requests into current_user_requests
  from public.ai_usage_daily
  where user_id=target_user_id and day=current_date
  for update;

  if current_global_requests >= global_daily_limit then
    return query select current_user_requests,current_global_requests,false,'global'::text;
    return;
  end if;

  if current_user_requests >= user_daily_limit then
    return query select current_user_requests,current_global_requests,false,'user'::text;
    return;
  end if;

  update public.ai_global_usage_daily
  set requests=requests+1,updated_at=now()
  where day=current_date
  returning requests into current_global_requests;

  update public.ai_usage_daily
  set requests=requests+1,updated_at=now()
  where user_id=target_user_id and day=current_date
  returning requests into current_user_requests;

  return query select current_user_requests,current_global_requests,true,null::text;
end $$;

revoke all on function public.reserve_ai_request(uuid,integer,integer) from public;
revoke all on function public.reserve_ai_request(uuid,integer,integer) from anon,authenticated;
grant execute on function public.reserve_ai_request(uuid,integer,integer) to service_role;
