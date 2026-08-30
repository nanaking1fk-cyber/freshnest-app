# Release process

Work + Workout deploys from `main` to Vercel. The canonical native package is
`app-store/`; `appstore/` is retained only as historical source and must not be
used for new releases.

## Required local checks

Use Node 24 and run:

```sh
npm ci --prefix app-store
npm run ci
```

`npm run ci` parses the server and client entrypoints, runs the complete Node
test suite, enforces release metadata and Supabase migration policy, audits the
locked native dependency tree at high severity, and builds/audits the native
web bundle.

The current registry audit has no high or critical advisories. It reports one
moderate advisory in the development-only chain
`@capacitor/cli > xcode > uuid` (`GHSA-w5hq-g745-h8pq`). The latest Capacitor
CLI and `xcode` package still select that dependency, and it is not bundled in
the web or store application. Do not force a breaking transitive override;
Dependabot should surface the compatible upstream fix when one is published.

## Supabase migration policy

Every migration that creates a table in an exposed schema must, in the same
migration:

1. Enable Row Level Security.
2. Explicitly `GRANT` or `REVOKE` access for `anon`, `authenticated`, and
   `service_role` according to the real call path.
3. Add owner-scoped policies for any browser-accessible user data.
4. Keep server-only token, quota, and OAuth tables inaccessible to browser
   roles.

The release audit enforces the first two requirements for new migration files.
This keeps releases compatible with Supabase's opt-in Data API grants.

## GitHub protection

Repository administrators should create a ruleset for `main` that:

- Requires a pull request and the `Quality / app` status check.
- Requires signed commits and linear history.
- Blocks force pushes and branch deletion.
- Requires conversation resolution before merge.

Use a GitHub-verified email and SSH or GPG commit signing. Existing unsigned
commits cannot be made verified retroactively; the rule protects new history.

## Vercel promotion

1. Push a feature branch and validate its Vercel preview.
2. Wait for GitHub `Quality` to pass.
3. Exercise authentication, schedule review-before-save, persistence, and any
   changed feature on the preview.
4. Merge through the protected `main` branch.
5. Confirm the production deployment commit, custom-domain aliases, config
   endpoint, unauthenticated 401 responses, and absence of new 5xx logs.

Vercel's Git integration owns deployment; CI intentionally validates but does
not store a second long-lived Vercel deployment token.

## Production E2E and monitoring

The scheduled `production-e2e` job uses two dedicated, empty test accounts and
restores their prior state after isolation and cross-session checks. Configure
the repository variable `E2E_ENABLED=true` and the four secrets documented in
`e2e/authenticated.spec.mjs`; never use a real customer account.

The production shell loads Vercel Speed Insights and sends sanitized
`client_error` events to a same-origin endpoint for Vercel Runtime Logs. Client
telemetry contains only the release, source area, and broad category—never raw
messages, schedules, email addresses, or user IDs. API responses and errors log
request ID, route, status, and duration for correlation in Vercel Runtime Logs.
