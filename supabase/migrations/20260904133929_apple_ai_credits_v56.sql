-- Private billing metadata only. No prompts, photos, meals or health records.
create table public.ai_billing_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  app_account_token uuid not null unique default gen_random_uuid()
);
create table public.apple_ai_subscriptions (
  environment text not null check(environment in ('Production','Sandbox')),
  original_transaction_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_id text not null,
  purchased_at timestamptz not null,
  expires_at timestamptz not null,
  signed_at timestamptz not null,
  active boolean not null,
  verified_at timestamptz not null default now(),
  primary key(environment,original_transaction_id),
  check(expires_at>purchased_at)
);
create index apple_ai_subscriptions_owner on public.apple_ai_subscriptions(user_id,expires_at desc);
create table public.ai_credit_periods (
  user_id uuid not null references auth.users(id) on delete cascade,
  period_key text not null,
  used integer not null default 0 check(used>=0),
  primary key(user_id,period_key)
);
create table public.ai_credit_days (
  day date primary key,
  requests integer not null default 0 check(requests>=0),
  reserved_micros bigint not null default 0 check(reserved_micros>=0)
);
create table public.ai_credit_requests (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  period_key text not null,
  feature text not null check(feature in ('coach','equipment','meal','roster','schedule','plan')),
  credits integer not null check(credits>0),
  created_at timestamptz not null default now()
);
create index ai_credit_requests_owner_date on public.ai_credit_requests(user_id,created_at desc);
alter table public.ai_billing_accounts enable row level security;
alter table public.apple_ai_subscriptions enable row level security;
alter table public.ai_credit_periods enable row level security;
alter table public.ai_credit_days enable row level security;
alter table public.ai_credit_requests enable row level security;
revoke all on public.ai_billing_accounts from public,anon,authenticated;
revoke all on public.apple_ai_subscriptions from public,anon,authenticated;
revoke all on public.ai_credit_periods from public,anon,authenticated;
revoke all on public.ai_credit_days from public,anon,authenticated;
revoke all on public.ai_credit_requests from public,anon,authenticated;
grant select,insert,update,delete on public.ai_billing_accounts to service_role;
grant select,insert,update,delete on public.apple_ai_subscriptions to service_role;
grant select,insert,update,delete on public.ai_credit_periods to service_role;
grant select,insert,update,delete on public.ai_credit_days to service_role;
grant select,insert,update,delete on public.ai_credit_requests to service_role;

-- Called only after Apple's SDK AND a fresh Server API status verify the purchase.
-- The owner binding cannot be moved to another account, even by receipt replay.
create function public.record_apple_ai_subscription_v56(target_user_id uuid,account_token uuid,store_environment text,original_id text,current_id text,purchase_time timestamptz,expiry_time timestamptz,signature_time timestamptz,is_active boolean)
returns void language plpgsql security invoker set search_path=pg_catalog,public as $$
begin
  if not exists(select 1 from public.ai_billing_accounts where user_id=target_user_id and app_account_token=account_token) then
    raise exception 'Purchase account mismatch';
  end if;
  insert into public.apple_ai_subscriptions(environment,original_transaction_id,user_id,transaction_id,purchased_at,expires_at,signed_at,active)
  values(store_environment,original_id,target_user_id,current_id,purchase_time,expiry_time,signature_time,is_active)
  on conflict(environment,original_transaction_id) do update set
    transaction_id=excluded.transaction_id,purchased_at=excluded.purchased_at,expires_at=excluded.expires_at,
    signed_at=excluded.signed_at,active=excluded.active,verified_at=now()
  where apple_ai_subscriptions.user_id=excluded.user_id and apple_ai_subscriptions.signed_at<=excluded.signed_at;
  if not found then raise exception 'Purchase update rejected'; end if;
end $$;

-- Status and reservations share the same calculation. The paid period comes
-- from Apple's verified transaction, never from a browser-supplied tier/date.
create function public.ai_allowance_v56(target_user_id uuid,feature_name text default null,reservation_id uuid default null,global_request_limit integer default 100)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
declare
  billing public.ai_billing_accounts%rowtype;
  sub public.apple_ai_subscriptions%rowtype;
  daily public.ai_credit_days%rowtype;
  day_key date := (now() at time zone 'UTC')::date;
  period_start timestamptz := date_trunc('month',now() at time zone 'UTC') at time zone 'UTC';
  period_end timestamptz;
  period_id text;
  tier text := 'free';
  allowance integer := 10;
  used_credits integer := 0;
  cost integer := 0;
  reason text := null;
begin
  if target_user_id is null or global_request_limit not between 1 and 100 then raise exception 'Invalid allowance request'; end if;
  if feature_name is not null then
    cost := case feature_name when 'coach' then 1 when 'equipment' then 10 when 'meal' then 10 when 'roster' then 20 when 'schedule' then 20 when 'plan' then 20 else 0 end;
    if cost=0 or reservation_id is null then raise exception 'Invalid feature reservation'; end if;
    -- Fixed lock order: global then owner. No external call holds these locks.
    insert into public.ai_credit_days(day) values(day_key) on conflict do nothing;
    select * into daily from public.ai_credit_days where day=day_key for update;
  end if;
  insert into public.ai_billing_accounts(user_id) values(target_user_id) on conflict do nothing;
  select * into billing from public.ai_billing_accounts where user_id=target_user_id for update;
  select * into sub from public.apple_ai_subscriptions
    where user_id=target_user_id and active and purchased_at<=now() and expires_at>now() and verified_at>now()-interval '10 minutes'
    order by (environment='Production') desc,expires_at desc limit 1;
  period_end := period_start+interval '1 month';
  period_id := 'free:'||to_char(period_start at time zone 'UTC','YYYY-MM');
  if sub.user_id is not null then
    tier := 'plus'; allowance := 100;
    period_start := sub.purchased_at; period_end := sub.expires_at;
    period_id := sub.environment||':'||sub.transaction_id;
  end if;
  select used into used_credits from public.ai_credit_periods where user_id=target_user_id and period_key=period_id;
  used_credits := coalesce(used_credits,0);
  if feature_name is not null then
    if exists(select 1 from public.ai_credit_requests where id=reservation_id) then reason := 'duplicate';
    elsif feature_name<>'coach' and tier<>'plus' then reason := 'subscription';
    elsif used_credits+cost>allowance then reason := 'credits';
    elsif daily.requests>=global_request_limit or daily.reserved_micros+cost*6000>10000000 then reason := 'capacity';
    end if;
    if reason is null then
      insert into public.ai_credit_periods(user_id,period_key,used) values(target_user_id,period_id,cost)
      on conflict(user_id,period_key) do update set used=ai_credit_periods.used+excluded.used returning used into used_credits;
      update public.ai_credit_days set requests=requests+1,reserved_micros=reserved_micros+cost*6000 where day=day_key;
      insert into public.ai_credit_requests(id,user_id,period_key,feature,credits) values(reservation_id,target_user_id,period_id,feature_name,cost);
    end if;
  end if;
  return jsonb_build_object('allowed',reason is null,'reason',reason,'tier',tier,'credits',allowance,'used',used_credits,'remaining',greatest(0,allowance-used_credits),'resetsAt',period_end,'cost',cost,'appAccountToken',billing.app_account_token);
end $$;
revoke all on function public.record_apple_ai_subscription_v56(uuid,uuid,text,text,text,timestamptz,timestamptz,timestamptz,boolean),public.ai_allowance_v56(uuid,text,uuid,integer) from public,anon,authenticated;
grant execute on function public.record_apple_ai_subscription_v56(uuid,uuid,text,text,text,timestamptz,timestamptz,timestamptz,boolean),public.ai_allowance_v56(uuid,text,uuid,integer) to service_role;
