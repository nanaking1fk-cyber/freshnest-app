-- Work + Workout v25: service-only calendar OAuth connections and event links.
-- Provider tokens are encrypted by the API before insertion. Browser roles have
-- no table privileges and no RLS policies on these tables.

create table if not exists public.calendar_oauth_states (
  state_hash text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('google','microsoft')),
  code_verifier text not null,
  return_to text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.calendar_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('google','microsoft')),
  provider_account_id text,
  provider_email text,
  calendar_id text not null default 'primary',
  encrypted_access_token text not null,
  encrypted_refresh_token text,
  token_expires_at timestamptz,
  scopes text[] not null default '{}'::text[],
  sync_cursor text,
  status text not null default 'active' check (status in ('active','expired','revoked','error')),
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id,provider)
);

create table if not exists public.calendar_event_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('google','microsoft')),
  local_event_id text not null,
  external_event_id text not null,
  local_updated_at timestamptz,
  remote_updated_at timestamptz,
  sync_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id,provider,local_event_id),
  unique (user_id,provider,external_event_id)
);

create index if not exists calendar_oauth_states_user_id_idx
  on public.calendar_oauth_states(user_id);
create index if not exists calendar_oauth_states_expires_at_idx
  on public.calendar_oauth_states(expires_at);
create index if not exists calendar_connections_user_id_idx
  on public.calendar_connections(user_id);
create index if not exists calendar_event_links_user_provider_idx
  on public.calendar_event_links(user_id,provider);

alter table public.calendar_oauth_states enable row level security;
alter table public.calendar_connections enable row level security;
alter table public.calendar_event_links enable row level security;

revoke all on public.calendar_oauth_states from public,anon,authenticated;
revoke all on public.calendar_connections from public,anon,authenticated;
revoke all on public.calendar_event_links from public,anon,authenticated;
grant select,insert,update,delete on public.calendar_oauth_states to service_role;
grant select,insert,update,delete on public.calendar_connections to service_role;
grant select,insert,update,delete on public.calendar_event_links to service_role;

drop trigger if exists calendar_connections_touch on public.calendar_connections;
create trigger calendar_connections_touch before update on public.calendar_connections
for each row execute function public.touch_updated_at();
drop trigger if exists calendar_event_links_touch on public.calendar_event_links;
create trigger calendar_event_links_touch before update on public.calendar_event_links
for each row execute function public.touch_updated_at();
