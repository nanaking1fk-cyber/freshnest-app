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

5. **`work-gym-planner-v16/sw.js` cached its shell atomically.** `cache.addAll()`
   rejects the whole install if any single URL fails — and the shell had just
   gained nine vendor entries including multi-MB `.wasm` cores. It now uses the
   same `Promise.allSettled` pattern as `work-gym-planner/sw.js`.

Regression tests live in `tests/auth-fragment-and-native-bundle-v26.test.js`
(9 tests) and `tests/account-lifecycle-v26.test.js` (7 tests). Every fix was
mutation-checked: reverting any one of them fails the suite. Total: 42 tests
passing.

The same file also carries a guard test asserting the shell's script-strip
regexes still match the v15 markup they target — the same silent-no-op failure
mode as defect 2, in the boot path.

## Known follow-up

- Complete a real-account onboarding and persistence test.
- Add automated API smoke tests and deployment checks.
- Add product analytics and error monitoring before wider launch.
- End-to-end browser testing of signup, PKCE confirmation, recovery, sign-out
  and schedule review-before-save has NOT been run; only unit-level checks.
  This is the largest remaining gap and should happen before deploying.
- The `authenticated` grants still do not match the stated least-privilege
  intent, and `ai_usage_daily` was missed by that pass. The exact SQL, its
  rationale and a verification query are in
  `docs/PENDING-APPROVAL-supabase-grants-v26.md`. It is deliberately outside
  `supabase/migrations/` so no tooling can apply it — it needs owner approval
  and a manual run.
- `authRedirectUrl()` is hardcoded to `https://www.workandworkout.com/`, but
  `capacitor://localhost` and `ionic://localhost` are in the API CORS
  allowlist. A native build using the PKCE flow would send users to the website,
  where the PKCE verifier is not in storage. The current native bundle uses the
  older `account-v18.js` stack and excludes `accounts-v18.js`, so this is latent
  rather than broken today.
