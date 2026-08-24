-- Work + Gym Coach v18 cloud schema (Supabase/Postgres)
-- Run once in a new Supabase project. RLS keeps every user's data isolated.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  profile jsonb not null default '{}'::jsonb,
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  schema_version integer not null default 18,
  updated_at timestamptz not null default now()
);

create table if not exists public.onboarding_answers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.user_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('combined','training','nutrition','schedule')),
  plan jsonb not null,
  source text not null default 'deterministic+ai',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists user_plans_user_created_idx on public.user_plans(user_id,created_at desc);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  thread_id uuid not null default gen_random_uuid(),
  role text not null check (role in ('user','assistant')),
  message text not null,
  mode text not null default 'coach',
  created_at timestamptz not null default now()
);
create index if not exists chat_messages_user_created_idx on public.chat_messages(user_id,created_at desc);

create table if not exists public.ai_usage_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null default current_date,
  requests integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key(user_id,day)
);

alter table public.profiles enable row level security;
alter table public.user_state enable row level security;
alter table public.onboarding_answers enable row level security;
alter table public.user_plans enable row level security;
alter table public.chat_messages enable row level security;
alter table public.ai_usage_daily enable row level security;

-- User-owned tables.
do $$ begin
  create policy "profiles own row" on public.profiles for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "state own row" on public.user_state for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "onboarding own row" on public.onboarding_answers for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "plans own rows" on public.user_plans for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "chat own rows" on public.chat_messages for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
exception when duplicate_object then null; end $$;
-- ai_usage_daily is intentionally service-role managed by the AI API.

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at=now(); return new; end $$;

do $$ begin
  create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger state_touch before update on public.user_state for each row execute function public.touch_updated_at();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger onboarding_touch before update on public.onboarding_answers for each row execute function public.touch_updated_at();
exception when duplicate_object then null; end $$;

-- App Store guideline-compatible self-service account deletion. The function is
-- security-definer but can only delete auth.uid(), never an arbitrary user id.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path=public,auth as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  delete from auth.users where id=auth.uid();
end $$;
revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
