# Calendar migration reconciliation

Before reconciliation, the production database already contained the three
v25 calendar tables, their indexes, constraints, RLS settings, and
service-role-only grants. The applied migration ledger did not contain local
migration `20260826120000`, and the live `calendar_connections` table was
missing its `calendar_connections_touch` trigger.

The repository now contains a non-destructive reconciliation migration:

`supabase/migrations/20260830170000_calendar_sync_v25_reconcile.sql`

It validates that all three tables exist, creates only the missing trigger,
and reasserts the intended RLS and grants without replacing tables or data.

## Applied production result

The reconciliation was applied on August 30, 2026 and Supabase recorded it as
`20260830221615_calendar_sync_v25_reconcile`. The already-present original
schema was recorded as `20260826120000_calendar_sync_v25` without rerunning its
table creation SQL.

Post-application verification confirmed:

- `calendar_connections_touch` exists.
- `calendar_event_links_touch` exists.
- RLS is enabled on the calendar token/link tables.
- `anon`, `authenticated`, and `PUBLIC` have no table privileges on them.
- Both migration versions are present in the production ledger.

Do not rerun the original table-creation migration against production. Future
schema changes should be new additive migrations.
