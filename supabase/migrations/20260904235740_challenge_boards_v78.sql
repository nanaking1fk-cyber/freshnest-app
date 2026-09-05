-- Invite-only coworker challenge boards. The browser never receives emails,
-- account identifiers, meals, raw workouts or raw health records: only a
-- member-chosen display name and aggregate challenge progress.
create table public.challenge_boards_v78 (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 60),
  metric text not null check (metric in ('steps','workouts','calories_burned','custom')),
  unit_label text not null check (char_length(unit_label) between 1 and 24),
  target_value numeric(14,2) not null check (target_value > 0 and target_value <= 100000000),
  cadence text not null check (cadence in ('daily','total')),
  starts_on date not null,
  ends_on date not null,
  invite_code text not null unique check (invite_code ~ '^[A-Z2-9]{8}$'),
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  check (ends_on >= starts_on and ends_on - starts_on <= 180)
);

create table public.challenge_members_v78 (
  challenge_id uuid not null references public.challenge_boards_v78(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 30),
  member_role text not null default 'member' check (member_role in ('owner','member')),
  sharing_consent_version text not null default '2026-09-04-v1' check (sharing_consent_version='2026-09-04-v1'),
  sharing_consent_at timestamptz not null default now(),
  joined_at timestamptz not null default now(),
  primary key (challenge_id,user_id)
);

create table public.challenge_scores_v78 (
  challenge_id uuid not null,
  user_id uuid not null,
  entry_date date not null,
  value numeric(14,2) not null check (value >= 0 and value <= 100000000),
  source text not null check (source in ('steps','workouts','calories','manual')),
  updated_at timestamptz not null default now(),
  primary key (challenge_id,user_id,entry_date),
  foreign key (challenge_id,user_id)
    references public.challenge_members_v78(challenge_id,user_id) on delete cascade
);

create index challenge_boards_v78_owner on public.challenge_boards_v78(owner_id,archived_at,ends_on desc);
create index challenge_members_v78_user on public.challenge_members_v78(user_id,joined_at desc,challenge_id);
create index challenge_scores_v78_board_day on public.challenge_scores_v78(challenge_id,entry_date,value desc);

alter table public.challenge_boards_v78 enable row level security;
alter table public.challenge_members_v78 enable row level security;
alter table public.challenge_scores_v78 enable row level security;

revoke all on public.challenge_boards_v78 from public,anon,authenticated;
revoke all on public.challenge_members_v78 from public,anon,authenticated;
revoke all on public.challenge_scores_v78 from public,anon,authenticated;
grant select,insert,update,delete on public.challenge_boards_v78 to service_role;
grant select,insert,update,delete on public.challenge_members_v78 to service_role;
grant select,insert,update,delete on public.challenge_scores_v78 to service_role;

-- Explicit deny policies document that all authorization happens in the
-- authenticated server endpoint. The service role bypasses RLS.
create policy server_only_no_direct_client_access on public.challenge_boards_v78
  for all to anon,authenticated using (false) with check (false);
create policy server_only_no_direct_client_access on public.challenge_members_v78
  for all to anon,authenticated using (false) with check (false);
create policy server_only_no_direct_client_access on public.challenge_scores_v78
  for all to anon,authenticated using (false) with check (false);

create function public.create_challenge_v78(
  target_user_id uuid,
  challenge_title text,
  challenge_metric text,
  challenge_unit text,
  challenge_target numeric,
  challenge_cadence text,
  challenge_starts_on date,
  challenge_ends_on date,
  target_invite_code text,
  member_display_name text
) returns uuid
language plpgsql security invoker set search_path = '' set statement_timeout = '4s' as $$
declare new_id uuid;
begin
  if target_user_id is null
    or char_length(btrim(challenge_title)) not between 3 and 60
    or challenge_metric not in ('steps','workouts','calories_burned','custom')
    or char_length(btrim(challenge_unit)) not between 1 and 24
    or challenge_target <= 0 or challenge_target > 100000000
    or challenge_cadence not in ('daily','total')
    or challenge_ends_on < challenge_starts_on
    or challenge_ends_on - challenge_starts_on > 180
    or target_invite_code !~ '^[A-Z2-9]{8}$'
    or char_length(btrim(member_display_name)) not between 2 and 30
  then raise exception 'Invalid challenge'; end if;

  insert into public.challenge_boards_v78(
    owner_id,title,metric,unit_label,target_value,cadence,starts_on,ends_on,invite_code
  ) values (
    target_user_id,btrim(challenge_title),challenge_metric,btrim(challenge_unit),challenge_target,
    challenge_cadence,challenge_starts_on,challenge_ends_on,target_invite_code
  ) returning id into new_id;

  insert into public.challenge_members_v78(challenge_id,user_id,display_name,member_role)
  values(new_id,target_user_id,btrim(member_display_name),'owner');
  return new_id;
end;
$$;

create function public.join_challenge_v78(
  target_user_id uuid,
  target_invite_code text,
  member_display_name text
) returns uuid
language plpgsql security invoker set search_path = '' set statement_timeout = '4s' as $$
declare target_id uuid;
begin
  if target_user_id is null or target_invite_code !~ '^[A-Z2-9]{8}$'
    or char_length(btrim(member_display_name)) not between 2 and 30
  then raise exception 'Invalid invitation'; end if;

  select id into target_id from public.challenge_boards_v78
  where invite_code=target_invite_code and archived_at is null and ends_on >= (now() at time zone 'UTC')::date
  for update;
  if target_id is null then raise exception 'Challenge invitation not found or has ended'; end if;
  if not exists(select 1 from public.challenge_members_v78 where challenge_id=target_id and user_id=target_user_id)
    and (select count(*) from public.challenge_members_v78 where challenge_id=target_id) >= 100
  then raise exception 'Challenge is full'; end if;

  insert into public.challenge_members_v78(challenge_id,user_id,display_name,member_role)
  values(target_id,target_user_id,btrim(member_display_name),'member')
  on conflict(challenge_id,user_id) do update set
    display_name=excluded.display_name,
    sharing_consent_version=excluded.sharing_consent_version,
    sharing_consent_at=now();
  return target_id;
end;
$$;

create function public.record_challenge_score_v78(
  target_user_id uuid,
  target_challenge_id uuid,
  score_date date,
  score_value numeric,
  score_source text
) returns void
language plpgsql security invoker set search_path = '' set statement_timeout = '4s' as $$
declare board public.challenge_boards_v78%rowtype;
begin
  if target_user_id is null or target_challenge_id is null or score_value < 0 or score_value > 100000000
  then raise exception 'Invalid challenge score'; end if;
  select * into board from public.challenge_boards_v78 where id=target_challenge_id;
  if board.id is null or board.archived_at is not null then raise exception 'Challenge is not active'; end if;
  if score_date < board.starts_on or score_date > board.ends_on
    or score_date > (now() at time zone 'UTC')::date + 1
  then raise exception 'Score date is outside this challenge'; end if;
  if not exists(select 1 from public.challenge_members_v78 where challenge_id=target_challenge_id and user_id=target_user_id)
  then raise exception 'Join this challenge first'; end if;
  if (board.metric='steps' and score_source<>'steps')
    or (board.metric='workouts' and score_source<>'workouts')
    or (board.metric='calories_burned' and score_source<>'calories')
    or (board.metric='custom' and score_source<>'manual')
  then raise exception 'Score source does not match this challenge'; end if;

  insert into public.challenge_scores_v78(challenge_id,user_id,entry_date,value,source)
  values(target_challenge_id,target_user_id,score_date,score_value,score_source)
  on conflict(challenge_id,user_id,entry_date) do update
    set value=excluded.value,source=excluded.source,updated_at=now();
end;
$$;

create function public.leave_challenge_v78(target_user_id uuid,target_challenge_id uuid) returns void
language plpgsql security invoker set search_path = '' set statement_timeout = '4s' as $$
begin
  if exists(select 1 from public.challenge_boards_v78 where id=target_challenge_id and owner_id=target_user_id)
  then raise exception 'The challenge owner must end the challenge instead'; end if;
  delete from public.challenge_members_v78 where challenge_id=target_challenge_id and user_id=target_user_id;
  if not found then raise exception 'Challenge membership not found'; end if;
end;
$$;

create function public.archive_challenge_v78(target_user_id uuid,target_challenge_id uuid) returns void
language plpgsql security invoker set search_path = '' set statement_timeout = '4s' as $$
begin
  update public.challenge_boards_v78 set archived_at=coalesce(archived_at,now())
  where id=target_challenge_id and owner_id=target_user_id;
  if not found then raise exception 'Only the challenge owner can end it'; end if;
end;
$$;

create function public.challenge_boards_for_user_v78(target_user_id uuid,board_date date default null) returns jsonb
language plpgsql security invoker stable set search_path = '' set statement_timeout = '5s' as $$
declare
  board record;
  people jsonb;
  result jsonb := '[]'::jsonb;
  today_utc date := coalesce(board_date,(now() at time zone 'UTC')::date);
  expected_days integer;
begin
  if target_user_id is null then raise exception 'Sign in required'; end if;
  for board in
    select b.* from public.challenge_boards_v78 b
    join public.challenge_members_v78 mine on mine.challenge_id=b.id and mine.user_id=target_user_id
    order by (b.archived_at is null and b.ends_on >= today_utc) desc,b.ends_on desc,b.created_at desc
    limit 30
  loop
    expected_days := case when board.cadence='daily' and today_utc >= board.starts_on
      then least(board.ends_on,today_utc)-board.starts_on+1 else 0 end;
    with totals as (
      select m.user_id,m.display_name,m.joined_at,
        coalesce(sum(s.value),0)::numeric as total_value,
        count(s.entry_date) filter(where s.value >= board.target_value)::integer as days_completed,
        coalesce(max(s.value) filter(where s.entry_date=today_utc),0)::numeric as today_value
      from public.challenge_members_v78 m
      left join public.challenge_scores_v78 s
        on s.challenge_id=m.challenge_id and s.user_id=m.user_id
      where m.challenge_id=board.id
      group by m.user_id,m.display_name,m.joined_at
    ), ranked as (
      select *,dense_rank() over(order by
        case when board.cadence='daily' then days_completed else 0 end desc,
        total_value desc,joined_at,user_id
      )::integer as board_rank
      from totals
    )
    select coalesce(jsonb_agg(jsonb_build_object(
      'displayName',display_name,
      'isYou',user_id=target_user_id,
      'rank',board_rank,
      'totalValue',total_value,
      'todayValue',today_value,
      'daysCompleted',days_completed,
      'daysExpected',expected_days,
      'progressPercent',least(100,round(case
        when board.cadence='daily' then days_completed::numeric/greatest(expected_days,1)*100
        else total_value/board.target_value*100 end,1))
    ) order by board_rank,display_name),'[]'::jsonb) into people from ranked;

    result := result || jsonb_build_array(jsonb_build_object(
      'id',board.id,
      'title',board.title,
      'metric',board.metric,
      'unitLabel',board.unit_label,
      'targetValue',board.target_value,
      'cadence',board.cadence,
      'startsOn',board.starts_on,
      'endsOn',board.ends_on,
      'inviteCode',board.invite_code,
      'isOwner',board.owner_id=target_user_id,
      'status',case when board.archived_at is not null then 'ended'
        when board.ends_on < today_utc then 'finished'
        when board.starts_on > today_utc then 'upcoming' else 'active' end,
      'members',people
    ));
  end loop;
  return result;
end;
$$;

revoke all on function public.create_challenge_v78(uuid,text,text,text,numeric,text,date,date,text,text) from public,anon,authenticated;
revoke all on function public.join_challenge_v78(uuid,text,text) from public,anon,authenticated;
revoke all on function public.record_challenge_score_v78(uuid,uuid,date,numeric,text) from public,anon,authenticated;
revoke all on function public.leave_challenge_v78(uuid,uuid) from public,anon,authenticated;
revoke all on function public.archive_challenge_v78(uuid,uuid) from public,anon,authenticated;
revoke all on function public.challenge_boards_for_user_v78(uuid,date) from public,anon,authenticated;
grant execute on function public.create_challenge_v78(uuid,text,text,text,numeric,text,date,date,text,text) to service_role;
grant execute on function public.join_challenge_v78(uuid,text,text) to service_role;
grant execute on function public.record_challenge_score_v78(uuid,uuid,date,numeric,text) to service_role;
grant execute on function public.leave_challenge_v78(uuid,uuid) to service_role;
grant execute on function public.archive_challenge_v78(uuid,uuid) to service_role;
grant execute on function public.challenge_boards_for_user_v78(uuid,date) to service_role;

comment on table public.challenge_boards_v78 is 'Invite-only challenge definitions. Server access only.';
comment on table public.challenge_members_v78 is 'Member-chosen display names. No email or public user identifier is exposed.';
comment on table public.challenge_scores_v78 is 'Daily aggregate challenge scores only; no underlying health records.';
