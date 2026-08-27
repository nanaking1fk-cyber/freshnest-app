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

5. **`work-gym-planner-v16/sw.js` cached its shell atomically.** The first
   follow-up changed every asset to best-effort caching. The Codex review then
   split the list: the essential app shell still installs atomically, while
   large optional OCR/vendor assets use `Promise.allSettled`. A vendor outage
   can no longer block an update, and a missing index or core script can no
   longer produce a falsely successful offline installation.

Regression tests live in `tests/auth-fragment-and-native-bundle-v26.test.js`
and `tests/account-lifecycle-v26.test.js`. Every fix was mutation-checked:
reverting any one of them fails the suite. The post-review suite has 45 tests.

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

- Complete a real-account onboarding and persistence test.
- Add automated API smoke tests and deployment checks.
- Add product analytics and error monitoring before wider launch.
- End-to-end browser testing of signup, PKCE confirmation, recovery, sign-out
  and schedule review-before-save has NOT been run; only unit-level checks.
  This is the largest remaining gap and should happen before deploying.
- The Supabase redirect allowlist is still wrong. As of 2026-08-27 it contains
  exactly one entry — `https://nanaking1fk-cyber.github.io/freshnest-app/work-gym-planner/`
  — and does NOT contain `https://www.workandworkout.com/`, which is what
  `authRedirectUrl()` sends. Confirmation currently survives only because
  Supabase falls back to the Site URL, which is set correctly. Add the canonical
  URL and remove the Pages entry.
- `authRedirectUrl()` is hardcoded to `https://www.workandworkout.com/`, but
  `capacitor://localhost` and `ionic://localhost` are in the API CORS
  allowlist. A native build using the PKCE flow would send users to the website,
  where the PKCE verifier is not in storage. The current native bundle uses the
  older `account-v18.js` stack and excludes `accounts-v18.js`, so this is latent
  rather than broken today.
