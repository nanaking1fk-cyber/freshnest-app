# Work + Workout takeover

## Current release

Version 30.1.27 is live from `main`. It includes the premium public landing experience, responsive six-question onboarding, the signed-in workspace, trusted text/photo/PDF schedule review, rotations and multi-source calendars, adaptive or user-owned training plans, nutrition planning/logging, Progressive Coach, and the canonical Capacitor package in `app-store/`.

## Current architecture

- Frontend and API: one Vercel origin at `https://www.workandworkout.com/`
- Database and Auth: Supabase project `work-gym-coach`
- AI: OpenAI Responses API through the Vercel backend
- Native release source: `app-store/` (`appstore/` is historical only)

## Production contract

The backend requires the variables listed in `.env.example`. Secrets must be configured only in Vercel and local ignored env files.

The API permits only the canonical production origins plus explicit native origins. The browser has no configurable API-host override. User-owned database operations run with the caller JWT so Supabase RLS is the enforcing boundary.

## Release sequence

1. Use Node 24 and run `npm ci --prefix app-store` followed by `npm run ci`.
2. Validate the Vercel pull-request preview and wait for `Quality / app`.
3. Run config, CORS, unauthenticated, authenticated, persistence, schedule-review and AI quota checks.
4. Merge through protected `main` after preview verification.
5. Confirm the production commit and aliases; keep GitHub Pages disabled.

The release gate performs syntax and regression tests, a locked dependency audit, native bundle verification, release-version checks and a Supabase migration-policy audit. Every new table migration must enable RLS and explicitly grant or revoke Data API roles. Dependabot monitors `app-store/` weekly. See `docs/release-process.md`.

## Historical v26 post-hardening review (branch `claude/audit-hardening-v26-continuation`)

A follow-up review of the v26 hardening work found and fixed regressions it
introduced. These fixes have since been incorporated into the current release.

1. **Every URL fragment was treated as a retired auth link.**
   `LEGACY_AUTH_FRAGMENT` was `!!location.hash`, so the landing page's own
   anchors (`#landingFeatures`, `#landingHow`, `#landingWorkers`,
   `#landingPrivacy`, `#landingTop`) were stripped on load and the user was
   shown "this older confirmation link can no longer be accepted". A PKCE
   `?code=` link that carried any trailing fragment was refused outright.
   Fixed by adding `isLegacyAuthFragment()` to `shared/v23-core.js`, which
   rejects a fragment only when it actually carries a bearer token
   (`access_token`, `refresh_token`, `provider_token`,
   `provider_refresh_token`, `id_token`) with a non-empty value.
   `accounts-v18.js` delegates to it and keeps an inline fallback so it stays
   correct if the shared module ever fails to load.

2. **The native bundle rewrites became silent no-ops.**
   `app-store/scripts/build-web.mjs` rewrote `schedule.js` by matching literal
   jsDelivr URLs that vendoring had just removed. `String.replace` on a missing
   literal returns the input unchanged, so the iOS bundle would have shipped
   absolute `/work-gym-planner-v16/vendor/...` paths that do not resolve inside
   Capacitor — breaking OCR schedule scanning with no build error.
   `audit-bundle.mjs` could not catch it because nothing remote remained.
   Fixed with an asserting `rewrite()` helper that throws when a target string
   is absent, rewrites of the current vendored paths (including
   `TESSERACT_OPTIONS`), and a new bundle-audit rule that rejects web-only
   absolute `/work-gym-planner-v1[56]/` paths.

3. **An abandoned password recovery stayed armed for the whole tab session.**
   The `wgc-v25-password-recovery` flag was cleared only on a successful
   password change, so quitting the recovery halfway left the "Choose a new
   password" panel showing for the *next* account signed in on that tab.
   `clearRecoveryFlag()` now runs on sign-in, on sign-out, and when a PKCE
   exchange fails.

4. **`deleteChat()` issued an unfiltered PostgREST DELETE.** With no thread id
   the path was bare `chat_messages`, leaning entirely on RLS to scope the
   delete. It now always carries `user_id=eq.<caller>` and refuses to run
   without an owner, so a policy regression cannot widen it and PostgREST never
   sees an unqualified mutation. `api/v18/chat.js` passes `user.id` through.

5. **`work-gym-planner-v16/sw.js` cached its shell atomically.** The first
   follow-up changed every asset to best-effort caching. The Codex review then
   split the list: the essential app shell still installs atomically, while
   large optional OCR/vendor assets use `Promise.allSettled`. A vendor outage
   can no longer block an update, and a missing index or core script can no
   longer produce a falsely successful offline installation.

Regression tests live in `tests/auth-fragment-and-native-bundle-v26.test.js`
and `tests/account-lifecycle-v26.test.js`. Every fix was mutation-checked:
reverting any one of them fails the suite.

6. **The root entrypoint redirected to itself.** Vercel serves the physical
   `/index.html` rather than the `vercel.json` `"source": "/"` rewrite, so that
   file is what `/` does. Its meta refresh pointed at
   `https://www.workandworkout.com/` unconditionally — on the canonical host,
   the current URL. Serving `/` on production would have looped forever, and
   every preview deployment bounced to production instead of showing itself,
   which makes the "validate the preview" release step impossible. Observed on
   the `codex/post-claude-audit-v26` preview: `/` rendered the redirect stub
   while `/work-gym-planner/` served the app. The refresh and the no-JS
   fallback link now use the relative `./work-gym-planner/` target;
   `rel=canonical` still points at production. Covered by
   `tests/root-entrypoint-v26.test.js`.

The v26 suite had 51 tests. The full suite now has 151 passing tests, including
release-engineering regression coverage.

The same file also carries a guard test asserting the shell's script-strip
regexes still match the v15 markup they target — the same silent-no-op failure
mode as defect 2, in the boot path.

## Applied to the live project

- The v26 least-privilege pass was finished on 2026-08-27 with the owner's
  approval: surplus `DELETE`/`REFERENCES`/`TRIGGER`/`TRUNCATE` were revoked
  from `authenticated` on the five user-owned tables, and `ai_usage_daily` was
  reduced to service-role only. It was applied subtractively through the SQL
  editor. The local filenames now match the live migration versions, and the
  least-privilege migration records the final intended grants. Details and the
  verified result table are in `docs/supabase-grants-v26.md`.
- The v25 calendar schema was reconciled on 2026-08-30. Production migration
  `20260830221615_calendar_sync_v25_reconcile` added the missing
  `calendar_connections_touch` trigger without replacing tables or data. The
  pre-existing `20260826120000_calendar_sync_v25` schema was then recorded in
  the migration ledger. Both calendar update triggers are present, RLS remains
  enabled, and `anon`/`authenticated` retain no privileges on the OAuth tables.
- Production deployment `dpl_i7z6MYLRzJkCAUuzwzJRph57Z7gB` is live at
  `https://www.workandworkout.com`. Its app shell uses external scripts under a
  `script-src 'self'` CSP, Speed Insights is active, client errors are reduced
  to category/source/release and accepted by `/api/v18/client-error`, and API
  logs include request IDs, status, routes and duration.

## Codex review after the Claude continuation

- Independently verified the live grants, RLS state, migration list and
  Supabase advisors. No anonymous table grants remain; authenticated access is
  limited to the operations documented above.
- Reconciled the two local migration filenames with the versions already
  recorded live (`20260827140029` and `20260827140126`) so future tooling does
  not mistake the existing migrations for pending work.
- Kept mobile `Sign in` visible beside the primary landing CTA. Desktop and
  390px first-visit checks show no horizontal overflow or legacy-fragment
  warning, and `#landingFeatures` remains intact.
- Split service-worker precaching into required and optional assets so an
  incomplete core shell cannot activate while large OCR dependencies remain
  best-effort.

## Known follow-up

- Enable Supabase leaked-password protection.
- Configure two dedicated GitHub test accounts and set `E2E_ENABLED=true` so
  the scheduled authenticated Playwright journeys run. The suite restores each
  test account's previous state in `finally` and never uses customer accounts.
- Prove Google and Outlook synchronization with real connected test accounts.
- Vercel Speed Insights, categorized client-error logging, and structured API
  duration logs are active. Web Analytics remains off because Vercel identifies
  it as billable and requires an interactive account-holder confirmation.
- Finish the remaining style-policy phase. Production no longer permits inline
  scripts; inline styles remain temporarily allowed because legacy modules
  still inject component CSS at runtime.
- Complete physical iPhone and Android release testing and store signing.

Do not test cloud accounts through a `file://` URL. That copy has no Vercel API
functions and will correctly report that cloud accounts are unavailable.
