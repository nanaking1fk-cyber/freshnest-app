# Finishing the v26 least-privilege pass

**Status: APPLIED to the live project on 2026-08-27, with the owner's approval.**

Applied directly through the Supabase SQL editor, deliberately outside
`supabase/migrations/` so the live migration history
(`20260827140029_security_hardening_v26`,
`20260827140126_user_table_least_privilege_v26`) was not rewritten and no
tooling can re-run it.

The applied statements were subtractive only — surplus privileges were revoked
rather than the table being revoked and re-granted, so there was never a window
in which a signed-in user lacked an access the app needs.

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

## What was applied

```sql
revoke delete, references, trigger, truncate on public.profiles           from authenticated;
revoke delete, references, trigger, truncate on public.user_state         from authenticated;
revoke delete, references, trigger, truncate on public.onboarding_answers from authenticated;
revoke delete, references, trigger, truncate on public.user_plans         from authenticated;
revoke references, trigger, truncate         on public.chat_messages      from authenticated;
revoke update                                on public.chat_messages      from authenticated;

revoke all on public.ai_usage_daily from anon;
revoke all on public.ai_usage_daily from authenticated;
grant select, insert, update on public.ai_usage_daily to service_role;
```

## Resulting grants (verified 2026-08-27)

| Table | `authenticated` | `anon` |
| --- | --- | --- |
| `profiles` | `SELECT, INSERT, UPDATE` | none |
| `user_state` | `SELECT, INSERT, UPDATE` | none |
| `onboarding_answers` | `SELECT, INSERT, UPDATE` | none |
| `user_plans` | `SELECT, INSERT, UPDATE` | none |
| `chat_messages` | `SELECT, INSERT, DELETE` | none |
| `ai_usage_daily` | none | none |
| `state_write_usage_daily` | none | none |
| `calendar_*` | none | none |

No `TRUNCATE`, `REFERENCES` or `TRIGGER` remains on any user-owned table, so
the `TRUNCATE`-bypasses-RLS hole is closed. The security advisor reports only
the expected INFO notices for service-role-only tables that have RLS enabled
with no policies (correct by design) and the Free-plan leaked-password WARN.

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
