# Work + Workout takeover

## Current release

Version 25.1 is the audit-hardening release. It retains the Working Lives story and trusted adaptive scheduling while hardening account isolation, PKCE email flows, same-origin browser dependencies, API rate limits and upstream error handling.

## Current architecture

- Frontend and API: one Vercel origin at `https://www.workandworkout.com/`
- Database and Auth: Supabase project `work-gym-coach`
- AI: OpenAI Responses API through the Vercel backend

## Production contract

The backend requires the variables listed in `.env.example`. Secrets must be configured only in Vercel and local ignored env files.

The API permits only the canonical production origins plus explicit native origins. The browser has no configurable API-host override. User-owned database operations run with the caller JWT so Supabase RLS is the enforcing boundary.

## Release sequence

1. Validate the pull-request preview deployment.
2. Run config, CORS, unauthenticated, authenticated, persistence, and AI quota checks.
3. Merge the hardening pull request after preview verification.
4. Confirm the production deployment and keep GitHub Pages disabled.

## Post-hardening review (branch `claude/audit-hardening-v26-continuation`)

A follow-up review of the v26 hardening work found and fixed two regressions it
introduced. Both were local only: production still runs v25 at `086108b`, which
does not contain the affected code.

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

Regression tests live in `tests/auth-fragment-and-native-bundle-v26.test.js`
(9 tests). Both fixes were mutation-checked: reverting either one fails the
suite. Total: 35 tests passing.

The same file also carries a guard test asserting the shell's script-strip
regexes still match the v15 markup they target — the same silent-no-op failure
mode as defect 2, in the boot path.

## Known follow-up

- Complete a real-account onboarding and persistence test.
- Add automated API smoke tests and deployment checks.
- Add product analytics and error monitoring before wider launch.
- End-to-end browser testing of signup, PKCE confirmation, recovery, sign-out
  and schedule review-before-save has NOT been run; only unit-level checks.
- The live `authenticated` role still holds `DELETE`/`TRUNCATE` on the
  user-owned tables. `20260827113000_user_table_least_privilege_v26.sql`
  revoked only from `public` and `anon`, so its stated intent
  ("column-action specific") is not yet met. Not reachable through PostgREST,
  but the grants do not match the migration's intent. `ai_usage_daily` was
  missed entirely and still grants everything to `anon` and `authenticated`
  (RLS is on with no policies, so reads return nothing).
- `authRedirectUrl()` is hardcoded to `https://www.workandworkout.com/`, but
  `capacitor://localhost` and `ionic://localhost` are in the API CORS
  allowlist. A native build using the PKCE flow would send users to the website,
  where the PKCE verifier is not in storage. The current native bundle uses the
  older `account-v18.js` stack and excludes `accounts-v18.js`, so this is latent
  rather than broken today.
- `work-gym-planner-v16/sw.js` uses `cache.addAll(SHELL)`, which is atomic: one
  failed vendor asset (including the multi-MB `.wasm` files just added) aborts
  the whole install. `work-gym-planner/sw.js` uses `Promise.allSettled` and is
  resilient. Only the latter is registered by `pwa-patch.js`, so the v16 worker
  is effectively legacy.
