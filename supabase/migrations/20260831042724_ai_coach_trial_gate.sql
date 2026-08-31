-- One lifetime AI Coach trial question per free account. Paid entitlement is
-- supplied only by the trusted API after reading Auth app_metadata. The RPC is
-- service-role-only and reserves trial, user-day and deployment-day capacity
-- in one transaction so concurrent requests cannot overshoot any limit.

create table if not exists public.ai_global_usage_daily (
  day date primary key default current_date,
  requests integer not null default 0 check (requests >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_coach_trial_usage (
  user_id uuid primary key references auth.users(id) on delete cascade,
  questions integer not null default 0 check (questions between 0 and 1),
  first_used_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.ai_global_usage_daily enable row level security;
alter table public.ai_coach_trial_usage enable row level security;
revoke all on public.ai_global_usage_daily from public,anon,authenticated;
revoke all on public.ai_coach_trial_usage from public,anon,authenticated;
grant select,insert,update,delete on public.ai_global_usage_daily to service_role;
grant select,insert,update,delete on public.ai_coach_trial_usage to service_role;

create or replace function public.reserve_ai_coach_request(
  target_user_id uuid,
  paid_access boolean default false,
  user_daily_limit integer default 40,
  global_daily_limit integer default 100
) returns table(
  user_requests integer,
  global_requests integer,
  trial_questions integer,
  allowed boolean,
  access_type text,
  blocked_reason text
)
language plpgsql
security invoker
set search_path=pg_catalog,public
as $$
declare
  current_user_requests integer;
  current_global_requests integer;
  current_trial_questions integer := 0;
begin
  if target_user_id is null
     or user_daily_limit < 1
     or global_daily_limit < 1 then
    raise exception 'Invalid AI Coach usage request';
  end if;

  insert into public.ai_global_usage_daily(day,requests,updated_at)
  values(current_date,0,now())
  on conflict(day) do nothing;

  insert into public.ai_usage_daily(user_id,day,requests,updated_at)
  values(target_user_id,current_date,0,now())
  on conflict(user_id,day) do nothing;

  if not paid_access then
    insert into public.ai_coach_trial_usage(user_id,questions,updated_at)
    values(target_user_id,0,now())
    on conflict(user_id) do nothing;
  end if;

  -- Match reserve_ai_request's lock order before taking the trial row lock.
  select usage.requests into current_global_requests
  from public.ai_global_usage_daily as usage
  where usage.day=current_date
  for update;

  select usage.requests into current_user_requests
  from public.ai_usage_daily as usage
  where usage.user_id=target_user_id and usage.day=current_date
  for update;

  if not paid_access then
    select usage.questions into current_trial_questions
    from public.ai_coach_trial_usage as usage
    where usage.user_id=target_user_id
    for update;
  end if;

  if current_global_requests >= global_daily_limit then
    return query select current_user_requests,current_global_requests,current_trial_questions,false,
      case when paid_access then 'paid'::text else 'trial'::text end,'global'::text;
    return;
  end if;

  if current_user_requests >= user_daily_limit then
    return query select current_user_requests,current_global_requests,current_trial_questions,false,
      case when paid_access then 'paid'::text else 'trial'::text end,'user'::text;
    return;
  end if;

  if not paid_access and current_trial_questions >= 1 then
    return query select current_user_requests,current_global_requests,current_trial_questions,false,
      'trial'::text,'trial_used'::text;
    return;
  end if;

  update public.ai_global_usage_daily as usage
  set requests=usage.requests+1,updated_at=now()
  where usage.day=current_date
  returning usage.requests into current_global_requests;

  update public.ai_usage_daily as usage
  set requests=usage.requests+1,updated_at=now()
  where usage.user_id=target_user_id and usage.day=current_date
  returning usage.requests into current_user_requests;

  if not paid_access then
    update public.ai_coach_trial_usage as usage
    set questions=1,
        first_used_at=coalesce(usage.first_used_at,now()),
        updated_at=now()
    where usage.user_id=target_user_id
    returning usage.questions into current_trial_questions;
  end if;

  return query select current_user_requests,current_global_requests,current_trial_questions,true,
    case when paid_access then 'paid'::text else 'trial'::text end,null::text;
end $$;

revoke all on function public.reserve_ai_coach_request(uuid,boolean,integer,integer) from public;
revoke all on function public.reserve_ai_coach_request(uuid,boolean,integer,integer) from anon,authenticated;
grant execute on function public.reserve_ai_coach_request(uuid,boolean,integer,integer) to service_role;
