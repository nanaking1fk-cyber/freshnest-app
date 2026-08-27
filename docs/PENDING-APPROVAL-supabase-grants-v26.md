# Pending: finish the v26 least-privilege pass (requires explicit approval)

**Status: NOT APPLIED. Do not run this without the owner's approval.**

This file is deliberately outside `supabase/migrations/` so that it cannot be
picked up by `supabase db push` or `supabase migration up`. Apply it by hand in
the Supabase SQL editor, then record it however the owner prefers. Do not
rewrite the existing live migration history
(`20260827140029_security_hardening_v26`, `20260827140126_user_table_least_privilege_v26`).

## What is wrong

`20260827113000_user_table_least_privilege_v26.sql` states that authenticated
access is "column-action specific". It is not. The migration revokes only from
`public` and `anon`:

```sql
revoke all on public.user_state from public,anon;
grant select,insert,update on public.user_state to authenticated;
```

Because Supabase's default grants to `authenticated` were never revoked, the
`grant` is additive and the role keeps everything it already had. Verified
live on 2026-08-27 — `authenticated` still holds
`DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE` on
`profiles`, `user_state`, `onboarding_answers`, `user_plans` and
`chat_messages`.

Separately, `ai_usage_daily` was missed by the least-privilege pass entirely
and still grants all seven privileges to both `anon` and `authenticated`.

## Severity

Low, not zero. PostgREST only ever issues SELECT/INSERT/UPDATE/DELETE, so the
surplus privileges are not reachable through the API today, and RLS still scopes
every row to `auth.uid()`. But `TRUNCATE` is not filtered by RLS, so the grant
is a latent hole rather than a cosmetic one, and the schema does not match its
stated intent — which is what a future reader will trust.

## The change

```sql
-- User-owned tables: reduce `authenticated` to the actions the app performs.
revoke all on public.profiles            from authenticated;
revoke all on public.user_state          from authenticated;
revoke all on public.onboarding_answers  from authenticated;
revoke all on public.user_plans          from authenticated;
revoke all on public.chat_messages       from authenticated;

grant select,insert,update on public.profiles           to authenticated;
grant select,insert,update on public.user_state         to authenticated;
grant select,insert,update on public.onboarding_answers to authenticated;
grant select,insert,update on public.user_plans         to authenticated;
grant select,insert,delete on public.chat_messages      to authenticated;

-- ai_usage_daily is service-role only, like state_write_usage_daily.
revoke all on public.ai_usage_daily from public,anon,authenticated;
grant select,insert,update on public.ai_usage_daily to service_role;
```

Each grant is sized to a real call path: `user_state` and `onboarding_answers`
are upserted (`select,insert,update`); `user_plans` is written by
`replace_own_active_user_plan`, which sets `active=false` rather than deleting,
so it needs no `DELETE`; `chat_messages` needs `DELETE` for `deleteChat`.
`count_ai_request` runs as `service_role`, so removing `authenticated` from
`ai_usage_daily` does not affect AI rate limiting.

## Verify after applying

```sql
select table_name, grantee, string_agg(privilege_type,',' order by privilege_type) privs
from information_schema.role_table_grants
where table_schema='public' and grantee in ('anon','authenticated','service_role','PUBLIC')
group by 1,2 order by 1,2;
```

Expected: `anon` absent from every row; `authenticated` limited to the lists
above; `ai_usage_daily`, `state_write_usage_daily` and the `calendar_*` tables
service-role only.

## Then re-check the app

Sign in, sync state, run onboarding to regenerate a plan, send one coach
message, and clear the chat. All five paths run as `authenticated` and would be
the first to break if a grant is sized too tightly.
