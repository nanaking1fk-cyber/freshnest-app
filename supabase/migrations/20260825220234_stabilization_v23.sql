-- Work + Workout v23: sanitize synced state and make active-plan replacement atomic.

with ranked as (
  select id,row_number() over (partition by user_id,kind order by created_at desc,id desc) as position
  from public.user_plans
  where active
)
update public.user_plans
set active=false
where id in (select id from ranked where position>1);

create unique index if not exists user_plans_one_active_kind_idx
  on public.user_plans(user_id,kind)
  where active;

create index if not exists chat_messages_user_thread_created_idx
  on public.chat_messages(user_id,thread_id,created_at desc);

create or replace function public.replace_active_user_plan(
  target_user_id uuid,
  target_kind text,
  target_plan jsonb,
  target_source text default 'deterministic+ai'
) returns uuid
language plpgsql
security invoker
set search_path=pg_catalog,public
as $$
declare new_id uuid;
begin
  if target_user_id is null or target_plan is null or target_kind not in ('combined','training','nutrition','schedule') then
    raise exception 'Invalid plan replacement request';
  end if;

  update public.user_plans
  set active=false
  where user_id=target_user_id and kind=target_kind and active;

  insert into public.user_plans(user_id,kind,plan,source,active)
  values(target_user_id,target_kind,target_plan,coalesce(nullif(target_source,''),'deterministic+ai'),true)
  returning id into new_id;

  return new_id;
end $$;

revoke all on function public.replace_active_user_plan(uuid,text,jsonb,text) from public;
revoke all on function public.replace_active_user_plan(uuid,text,jsonb,text) from anon,authenticated;
grant execute on function public.replace_active_user_plan(uuid,text,jsonb,text) to service_role;

update public.user_state as current_state
set state=jsonb_build_object(
      'schemaVersion',23,
      'appVersion','23.0.0',
      'capturedAt',coalesce(current_state.state->>'capturedAt',now()::text),
      'storage',coalesce((
        select jsonb_object_agg(entry.key,entry.value)
        from jsonb_each(coalesce(current_state.state->'storage','{}'::jsonb)) as entry
        where (
          entry.key like 'wgp-v15-%'
          or entry.key in ('training-history-v14','nutrition-settings','my-foods','recent-foods','wgp-exercise-alternative-prefs-v1')
          or entry.key like 'bellevue-%'
          or entry.key like 'b-%'
          or entry.key like 'food-diary-%'
          or entry.key like 'water-%'
          or entry.key like 'nutrition-log-%'
          or entry.key like 'training-draft-v14-%'
        )
        and entry.key not in ('wgp-v15-sync-settings','wgp-v15-diagnostics','wgp-v15-ai-chat-local-v18')
      ),'{}'::jsonb)
    ),
    schema_version=23,
    updated_at=now();
