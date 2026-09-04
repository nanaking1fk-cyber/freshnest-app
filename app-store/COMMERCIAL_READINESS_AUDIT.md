# Work + Workout — commercial and App Store readiness

Historical audit: see [the current September 4 release candidate](APPLE_RELEASE_V69.md) for integrated changes, verification and remaining blockers. The older status below is retained as history, not current completion evidence.

Audit date: 3 September 2026. Decision: **NOT READY for public App Store submission.**

The website is live. That does not mean an iOS app, subscription or commercial operation is ready. The owner approved publishing the website fixes on 3 September; that narrower release is recorded below. Native audit changes remain local. No business enrollment, payment activation or App Store submission was performed.

## Scope and source of truth

- Production source inspected: `06edcf50023cf95619f5b846fa0e3d42eb6e1307` (`30.1.31-agreement60`).
- Candidate work: branch `codex/app-store-readiness-audit`, isolated at `/private/tmp/ww-appstore-audit-v61`.
- The original `/private/tmp/work-and-workout-premium-v19` has substantial uncommitted work, including unfinished billing. Its changes, deleted files, lockfile and Supabase temporary files were preserved, not staged or restored.
- Use **`app-store/`**, not historical `appstore/`, for native releases. Do not publish the original dirty directory wholesale.
- Review included current source, selected pending native fixes, unit/browser tests, native compilation, dependency advisories, read-only Supabase security checks and the visible Apple enrollment screen. It is not a penetration test, legal certification or proof that every device/production integration works.

## Priority launch board

P0 blocks submission or the proposed commercial launch. P1 must be completed before a broad public launch. Owners below describe responsibilities, not assigned personnel.

| Priority | Finding | Next action | Owner / required proof |
| --- | --- | --- | --- |
| P0 | Apple enrollment remains at entity selection; no active distribution team is configured | Complete enrollment under the correct legal seller. Confirm organization eligibility rather than blindly continuing as an individual | Business owner: active team, authorized entity, accepted agreements |
| P0 | Released AI Coach still ends after one lifetime question with an unavailable paid-plan message | Integrate and test the approved free-core / Apple AI Plus implementation, including the database and server entitlement checks | Engineering + owner: purchase/restore and allowance evidence |
| P0 | No proven signed release on physical devices | Produce a clean, signed archive; validate it; distribute through TestFlight | Engineering + owner: exact build, device matrix and review credentials |
| P0 | Web confirmation, cloud restore and deletion now pass with a disposable account; real reset email and installed-device flows remain unproven | Complete a genuine same-browser reset and physical-device confirmation/reset/restore/deletion checks | Engineering: end-to-end evidence, not mocks |
| P0 | Health-data obligations and store declarations need final owner/legal review | Reconcile actual data flows, provider retention, consent, privacy labels, seller identity and export classification | Owner + qualified counsel: approved documents and completed declarations |
| P1 | Commercial listing and subscription disclosures are unfinished | Capture final screens, complete age/privacy/rights answers, localized pricing, support and review notes | Owner + product: completed App Store Connect record |
| P1 | Operational readiness is not established by passing tests | Verify SMTP, alert ownership, spending controls, backup restoration, incident handling and support response | Operations: exercised runbooks and named responders |
| P1 | Broad accessibility, performance and feature testing remains | Complete the physical-device checklist below; verify any advertised feature against the final build | QA + engineering: documented results and fixes |

Apple requires a complete, testable submission, usable purchases, accessible privacy information and in-app account deletion. Its rules also address third-party AI permission, health-data handling and the legal entity submitting sensitive-data apps. These are release requirements, not optional polish. [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

## Code and documentation corrected in this candidate

Several safe native fixes already existed in the pending workspace. They were selectively brought forward onto the latest production source, without bringing the unfinished payment release with them.

1. **Native email return:** app-created signup/reset links return to the packaged app, including a terminated-app launch. The handler validates URLs, rejects token-bearing/ambiguous links, avoids duplicate processing and retains the existing PKCE/account isolation.
2. **External-link safety:** failure to open the native browser no longer replaces the installed app with a remotely hosted executable page. Calendar return handling avoids a reload loop.
3. **iOS privacy packaging:** added the app privacy manifest and required-reason declarations to the target; added startup/background backup exclusion for the WebView's private storage without deleting records. Installed-container verification is still required.
4. **Permission explanations:** camera/photos now cover meals as well as rosters, equipment and barcodes. Speech permissions are declared; step wording acknowledges separately permitted sync/AI.
5. **Review accuracy:** corrected obsolete six-step onboarding and the inaccurate claim that roster-photo processing is always on-device. Added explicit commerce, legal, physical-device and encryption gates.
6. **Private support:** product-problem reporting now offers private email first, rather than directing ordinary customers only to a public GitHub issue.
7. **Release controls:** added code-only CI checks plus a separate submission preflight and evidence record. Passing a build is deliberately not reported as permission to submit.
8. **Regression coverage:** native link/security tests and packaged-browser tests; existing calendar, pay and roster fixtures updated to include the current saved agreement. These fixture changes do not change user consent.

The existing one-time agreement remains intact: terms and optional health-data choices are separate, saved on/off choices are respected, and permissions are not silently switched on. Camera/Health permission sheets are still controlled by the operating system. A materially changed purpose may require a new choice; do not promise consent can never change.

## 1. Apple account and commercial identity

The visible enrollment page still asks for entity type. No membership purchase, agreement or account change was made during the audit.

- Confirm the entity that actually operates Work + Workout and is named in the privacy policy. For an organization, prepare its legal name, D-U-N-S information where required, authority to enroll, work email/domain and public website. Apple verifies organizations; this cannot be completed by changing app code. [Enrollment requirements](https://developer.apple.com/help/account/membership/program-enrollment/)
- Complete Developer Program membership, select the real Xcode team, register the bundle, create the app record and configure signing. Intended bundle: `com.bibiniifarms.workandworkout`.
- Accept the appropriate agreements as the authorized owner; complete tax and banking details before paid products. Assign least-privilege team roles, enable account MFA and keep recovery material outside Git/chat.
- Determine EU trader status and complete Apple's verification/contact requirements for EU availability. [EU trader requirements](https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements)
- Choose supported countries and languages deliberately. A global privacy policy does not establish legal, tax, employment-pay or support readiness in every country.

## 2. Free launch and the $1.99 subscription

### Current gap

`server/v18-lib.js` and `work-gym-planner-v16/ai-coach-v18.js` still implement the legacy lifetime trial. The server returns a paid-plan requirement after the question is used, but this release has no Apple purchase flow. Do not market it as the finished commercial model.

The pending workspace contains StoreKit, server verification, credit limits and tests documented in `app-store/AI_PLUS_LAUNCH.md`. They are **not integrated into this candidate**, and the corresponding billing tables are not in the live database. Earlier pending-work test results are not acceptance evidence for today's production source.

The previously approved design is free core features, **10 free AI credits per month**, and **100 credits per paid period** for the intended **US$1.99/month** Apple subscription. Product ID: `com.bibiniifarms.workandworkout.ai.plus.monthly`. Use Apple's localized price rather than hardcoding $1.99 across countries. The subscription must deliver understandable recurring value. [Apple subscriptions](https://developer.apple.com/app-store/subscriptions/)

**Resolve before release:** the pending design charges 20 credits for roster/schedule AI, exceeding the entire free allowance. Do not enable that design while purchasing is unavailable or imply all AI tools are included free. Keep manual/core paths useful and clearly explain each action's cost, remaining balance, reset and failure policy.

### Engineering delivery checklist

- Reconcile the pending billing code with the latest consent, account deletion, cloud restore and hours/pay code. Preserve user data and existing grants.
- Review/apply `20260904133929_apple_ai_credits_v56.sql` through the migration process. Verify atomic limits, RLS and server-only grants before shipping new endpoints.
- Create the actual monthly product/subscription group in App Store Connect; configure server identity and private signing key securely. Enable purchases only after the real product and verified server are ready. No Stripe checkout is substituted for the selected iOS model.
- Validate Apple-signed transactions server-side, app/environment/account binding, current subscription status, replay handling and notification signatures. Never trust client tier flags or accept sandbox entitlement for arbitrary production users.
- Test purchase, cancel, pending approval, interrupted delivery, duplicate updates, renewal, expiry, grace/billing retry, refund/revocation, reinstall, second-device restore and a different signed-in account. Test repeated restore does not refill credits.
- Provide Restore Purchases, Manage Subscription, localized price/period, auto-renewal explanation, Terms/Privacy links and an understandable monthly allowance before purchase.
- Account deletion must remain available while subscribed. Explain that Apple billing is managed separately and offer its management screen; do not require cancellation first. [Account deletion guidance](https://developer.apple.com/support/offering-account-deletion-in-your-app/)
- Reconcile Purchase History privacy disclosures when transaction/account records are actually collected.

### Profitability is not yet proven

The pending design budgets $0.006 per credit: up to $0.60 model reserve per Plus period and $0.06 per fully used free account/month. These are **earlier design assumptions, not revalidated pricing or measured costs in this audit**. Recheck model availability, actual billed input/output/image/reasoning costs and retries before enabling the policy.

Model cost is only one expense. Forecast actual storefront proceeds, tax, commission, refunds, email/database/hosting, support and the free-to-paid ratio. Request-count caps alone do not cap currency spend. Set account-level and global spending limits, reconcile usage to provider bills, add warning alerts and define what users see when capacity is exhausted. The current default global AI limit of 100 requests/day also needs capacity planning before public scale.

## 3. Accounts, consent and data protection

### Read-only production checks passed

- All **16 public application tables** inspected have RLS enabled.
- `anon` has no public-table grants; no storage buckets were present.
- Direct app-data foreign keys to `auth.users` use cascading deletion, including profile/state, plans, messages, consent, limits and calendar connections.
- The current deletion endpoint checks the confirmation phrase and expected authenticated user, then verifies Auth deletion before clearing the client.
- Server authentication verifies with Supabase Auth rather than accepting decoded client claims alone.
- Supabase security findings were informational `rls_enabled_no_policy` entries on intended backend-only tables. Do not add browser policies merely to clear those messages. [Advisor explanation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)

These checks do not prove all authorization paths safe, or that a customer can complete deletion on a device. No real customer account was modified or deleted in this audit.

### Required end-to-end tests

Use dedicated disposable accounts, never the owner's or a customer's data:

- New signup and confirmation from real iPhone email clients, app open/terminated; existing web account signs into native correctly.
- Password autofill includes email; genuine reset email opens the new-password form; expired/used links and another-device links give safe recovery instructions.
- Confirm exact native redirect allowlist entries and HTTPS website callbacks remain configured. Earlier notes record native entries added; settings and actual delivery were not re-proven here.
- Check SMTP provider, sender verification, SPF/DKIM/DMARC, spam delivery, email-security link scanning and rate-limit feedback. Avoid link tracking that consumes/rewrites auth links. Verify password-leak protection and CAPTCHA/abuse settings rather than merely trusting a client message. [SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [rate limits](https://supabase.com/docs/guides/auth/rate-limits), [password security](https://supabase.com/docs/guides/auth/password-security)
- One-time terms acknowledgement plus separate optional on/off choices persist after reload, reinstall/account restore and cross-device sign-in. Declining cloud/AI must not authorize upload or wipe an existing cloud account.
- Old-account cloud restore, stale/offline conflicts and account switching must never initialize over saved data or expose the previous user's records.
- Permanent deletion removes Auth and linked active records, invalidates access and leaves unrelated accounts intact. Verify OAuth token revocation/connection cleanup and future billing-notification behavior. Explain provider/backup retention honestly; do not promise instantaneous removal from every backup.
- Data export/access/correction/withdrawal requests have a private, identity-verified operational process, not just policy text.

## 4. Privacy, legal and store declarations

Have qualified counsel review the actual global health-data operation before launch. Confirm the operator/contact/address, EEA/UK special-category basis and explicit optional choices, US consumer-health requirements, international transfers, applicable regional representatives, processor contracts, retention/deletion, security incident procedures and age restrictions. Do not label the app HIPAA-compliant or legally certified without the required assessment and arrangements.

Complete App Store privacy answers from the most data-intensive optional path: linked account/health data, AI photos/prompts, calendar content, support and diagnostics. Data briefly processed by a provider still needs assessment; “we do not intentionally store the photo” is not a promise of zero provider retention. Reconcile the native manifest, actual network behavior and provider terms with the listing. [App privacy details](https://developer.apple.com/app-store/app-privacy-details/)

Additional gates:

- Confirm the iOS archive's combined privacy report and required-reason APIs, including SDK manifests. [Privacy manifest guidance](https://developer.apple.com/documentation/bundleresources/adding-a-privacy-manifest-to-your-app-or-third-party-sdk)
- Confirm the installed WebView's health-data files are excluded from automatic backup. Code changes alone are not proof of the container's behavior.
- Preserve the user's no-personal-data analytics direction: opt-in aggregate counts only, no referral/device profiling, user IDs or health payloads. These counts do not provide unique-user funnels; do not quietly expand analytics to obtain them.
- Keep general-wellness language; do not make diagnostic/treatment claims or describe estimated pay as a guaranteed payroll/tax result. Review nutrition sources/attribution and disclose uncertainty in scans.
- Verify rights to food data, exercise media, fonts, icons and calendar integrations; show required acknowledgements. Check Google/Microsoft production OAuth consent/verification and least-privilege scopes.
- Terms currently require adults. Complete Apple's content questionnaire accurately and reconcile the intended 18+ listing with onboarding.
- Assess HTTPS plus optional AES-GCM WebDAV against export rules. Existing `ITSAppUsesNonExemptEncryption=false` is not a legal determination.
- Assess whether mandatory account creation is justified for the submitted experience; current startup gates account access when cloud is configured while copy describes local-only use. Clarify the experience without weakening account isolation.

## 5. Device, accessibility and product quality

The installed toolchain is Xcode 26.5 / iOS SDK 26.5, meeting the current SDK baseline; this is not distribution-signing evidence. [Apple SDK requirement](https://developer.apple.com/news/?id=ueeok6yw)

Run a signed TestFlight build on a small/notched iPhone, a current iPhone and iPad; test current and minimum-supported iOS. Cover:

- Cold launch, update from an existing install, offline startup, slow/dropped connections, interrupted saves and service recovery.
- Camera/photo permission denial; HEIC/large/rotated photos; actual meal/equipment/roster recognition; barcode accuracy; PDF import/share. Sample mocked extraction tests do not establish real AI quality.
- Health Step Count allow/deny, no-data response, day rollover, timezone changes, resuming the app and manual alternatives. Only read-only steps should be requested.
- Notifications/reminders, permission refusal, DST/timezone transitions, canceled/rescheduled items and duplicate prevention.
- Calendar multi-select, personal events, exceptions, holidays, custom rotations, overnight shifts and PDF exports.
- Nutrition servings/units, missing product values, quick-add, meal copies/recipes, edits/deletion and daily totals.
- Planned versus confirmed work hours, breaks/overnights, overlapping shifts, overtime/holiday rules, deductions, multi-job rates and export accuracy. Do not infer local labor-law compliance from arithmetic tests.
- VoiceOver reading/focus, larger text, contrast, Reduced Motion, touch targets, keyboard, long labels and tablet layout. Screenshots at mobile width are not an accessibility audit.
- Performance on a real lower-end phone: record cold-start and key-action timings, inspect long tasks, and set measurable budgets. No claim of a full performance pass is made here.

## 6. Operations and commercial launch

- Verify production crash/error collection with intentional harmless test events and native TestFlight incidents. Assign triage/alert ownership; ensure logs remain redacted and never contain tokens, meal photos or health payloads.
- Exercise a backup restore into an isolated environment. Record recovery objectives, retention and who can restore. Secure administrative accounts and rotate any previously exposed secrets.
- Confirm database/Auth connection capacity; the advisor reports a fixed 10-connection Auth allocation. Review percentage-based allocation before scaling. Informational unused indexes should be assessed with real workload evidence, not deleted during a short audit. [Production checklist](https://supabase.com/docs/guides/deployment/going-into-prod)
- Verify branch protection, required CI, dependency updates and a tested rollback path. A documented ruleset is not proof GitHub has enabled it.
- Enable scheduled production smoke tests only with dedicated empty accounts. Confirm alert recipients and cleanup, not just workflow existence.
- Make the support mailbox operational, choose response targets and create account-recovery, billing/refund, data-request and incident runbooks. Do not publish a response SLA that cannot be staffed.
- Complete actual screenshots, app icon, subtitle, accurate feature availability, support/privacy/deletion URLs, review notes and private reviewer credentials. Use an isolated disposable account for reviewer deletion testing.
- Choose manual release after approval. Pilot through TestFlight, resolve material issues, then expand deliberately; Apple approval alone is not an operational readiness check.

## Initial verification record (before v62 follow-up)

Results are recorded below for this local candidate. API mocks were used for browser journeys; these are not real email, purchase, deletion or AI-provider tests.

- Required bundled-runtime validation and full `npm run ci`: **434 tests passed**, syntax, release and high/critical dependency audits passed.
- Packaged native email + privacy browser flows: **18 Chromium and 18 WebKit tests passed**. Mobile screenshots inspected. The 18 Chromium flows were also rerun successfully against the final clean locked bundle; this rerun is not counted as additional test coverage.
- Core calendar and hours/pay: **12 Chromium tests passed** on mobile/desktop sample data.
- Nutrition portions and roster review: **15 Chromium tests passed** on mobile/desktop sample data. Together with the checks above, **63 browser checks passed**; live provider/mail/payment behavior is not mocked-test evidence.
- Native bundle validation and property-list validation passed.
- Dependency registry scan: **no high/critical advisory**; one moderate development-only `@capacitor/cli > xcode > uuid` advisory remains, reported by npm as three affected packages in that chain. Do not force a breaking major-version override; track the upstream fix. [Advisory](https://github.com/advisories/GHSA-w5hq-g745-h8pq)
- **Clean locked-dependency iOS Release simulator build passed** with Xcode 26.5 and Capacitor 8.5.0. Verified the packaged privacy manifest, property list and bundle ID. Retained the generated Swift package lock; the package contains no paths to the original workspace. This is not a signed physical-device archive.
- Full submission preflight intentionally reports **NOT READY**. `release-evidence.json` is pending; no manual gate is falsely marked verified.

## v62 follow-up: work that does not require LLC or Apple enrollment

Completed 3 September 2026 against the isolated candidate. Apple enrollment,
StoreKit/billing integration, business identity and legal agreements were not
changed. Following the owner's approval, the website-only subset was published
as `685bfe640229254bd1c899782314a5d05d12d3dc`. Native, CI and audit changes were
excluded from that release. Production account/AI checks below used the existing
live API before publication; the post-release website checks are recorded next.

### Website publication record

- The initial push of the broad 59-file audit commit was blocked by safety review.
  It was not published. A separate worktree/commit contains only 25 website and
  regression-test files, with no native, CI, server, billing or database changes.
- Production commit: `685bfe640229254bd1c899782314a5d05d12d3dc` on `main`.
- Vercel deployment: `dpl_6W27v63qjyWjX34agjdpBjyEf77L`, **Ready** at
  **2026-09-03 22:41:46 UTC**, with both Work + Workout domains assigned.
  Static website/serverless project; build duration approximately **10.3 seconds**.
- Narrowed release: **436 code checks**, **28 Chromium + 12 WebKit sample browser
  checks**, and the existing bundle/build checks passed before publication.
  This count excludes the native audit tests that were deliberately not shipped.
- Post-release: all **16 published website assets** compared byte-for-byte with
  the release; the stable index URL is a redirect and was not treated as an asset.
  **12 live website sample-browser checks** passed across mobile/tablet/desktop.
- Public app/configuration/privacy/terms/support/deletion routes returned 200;
  unauthenticated cloud state correctly returned 401. The post-Ready runtime
  scan showed only that expected signed-out test request, not an unexpected
  application failure. This is an early scan, not a guarantee of future uptime.
- Existing error collection remains active. External log drains/alert routing
  were not configured or independently verified during publication.
- Apple enrollment, subscriptions, native publication and customer records were
  untouched. Original dirty workspace items remain preserved.

Post-release browser evidence: `/private/tmp/ww-website62-live-browser`.
Pre-release narrow-suite evidence: `/private/tmp/ww-website62-check.log`,
`/private/tmp/ww-website62-browser`, `/private/tmp/ww-website62-webkit`.
The narrower loader retains the unchanged diagnostics script's prior query
string to remain compatible with the existing native build script; actual
website fix assets and service workers use `30.1.31-readiness62`.

### Additional defects fixed

- **Recovery storage growth:** old recovery snapshots could embed their own
  history, exhausting device storage during account/consent restore. New and
  retained snapshots exclude nested archives and private settings; at most three
  planner versions are retained. Large encrypted downloads no longer spread an
  entire byte array into one function call.
- **Restore protection:** local/cloud/WebDAV restore rolls back changed planner
  values on tested storage failures. A failed account-separation backup keeps the
  original records hidden and prevents device-only/onboarding bypass. The owner
  can sign back into the original account. Existing data and formats are retained.
- **Meal Scan interaction:** the sticky save bar could cover Analyze on a small
  screen. The photo panel now contributes its full height to scrolling; Analyze
  stays reachable. Photos are contained instead of cropped in the preview.
- **Accessibility:** food search and backup fields have labels; status messages
  are announced; dialogs restore focus to their opener, including Safari's
  pointer-click behavior; policy links participate in keyboard focus trapping.
- **PDF sharing:** long entries wrap before PDF escaping, days stay together
  where possible, continuation pages retain context, and changing dates or
  included data requires a fresh preview. The current minimal PDF font does not
  provide full non-Latin/emoji support; do not advertise global-script fidelity.
- **Safer future checks:** sample-only browser CI is separate from optional
  production E2E. Production writes require two explicit test-account IDs, keep
  other planner data, and remove only their own revision-safe markers. No live
  schedule or monitoring job was enabled by this audit.
- **Support and operations:** clearer public account/reset/backup/scan help and
  an [operations runbook](../docs/operations-readiness.md) covering incidents,
  privacy requests, email limits, recovery, release/rollback and spending checks.
  These documents do not establish staffing, delivery SLAs or configured alerts.
- **Cache refresh:** loader and service-worker revision is
  `30.1.31-readiness62`; the diagnostic semantic release remains `30.1.31`, as
  required by the existing collector. No schema migration is needed.

### Real production evidence — one authorized disposable account

- Signup email reached the authorized inbox. The owner opened the link and saw
  Sign in. A subsequent real password grant verified `email_confirmed_at` and
  successful authentication; cross-browser sign-in is not a failed confirmation.
- Saved optional choices and terms persisted. Synthetic planner data round-tripped
  exactly, a stale write returned **409**, and a fresh browser restored it without
  repeating the consent screen.
- Candidate UI with the real production API: a public-domain banana photo returned
  **200 in 3.522 seconds**, staged food for review and preserved the diary on cancel.
  This proves the tested flow, not general calorie-estimation accuracy.
- Candidate UI with the real production API: a synthetic single-person roster
  returned **200 in 4.293 seconds**, matching all seven dates (five shifts including
  an overnight shift, plus two off days). Review was required before saving.
- The server rejected a known compromised password with **422 / weak_password**;
  the disposable strong password was retained.
- Account deletion returned verified success; its old access token then received
  **401**. A scoped read confirmed **zero remaining rows** in Auth and all twelve
  public account-linked tables. Only the newly created disposable account was
  deleted. This does not establish deletion from provider-retained backups.
- One labeled `ReadinessSmokeError` arrived in private `app_error_reports` at
  **22:26:34 UTC**. No customer information was included. The initial smoke script
  hung during browser cleanup after delivery; cleanup was corrected and the
  public-route smoke rerun exited successfully. Native crash delivery still needs
  a physical TestFlight check.
- Public shell, boot, privacy, terms, support, deletion and configuration URLs
  returned **200**; unauthenticated cloud state returned **401**. The signed-out
  production shell loaded without browser errors.

The test credentials stayed in a private temporary file outside Git and were
removed from that file after deletion. No customer account, photo or planner was
used. The sample banana image is ZooFari's public-domain
[Banana Fruit photograph](https://commons.wikimedia.org/wiki/File:Banana_Fruit.JPG).

### Final local verification

- Required bundled-runtime `pnpm run check`: **447 / 447 passed**.
- Full `npm run ci`: **passed**, including release/syntax checks, all 447 tests,
  high/critical dependency audit and native web bundle audit. The same moderate,
  development-only dependency chain noted above remains; no high/critical issue.
- Final standalone sample-browser configuration: **28 / 28 Chromium checks**.
- Readiness flows at 375, 820 and 1440 pixels: **12 / 12 WebKit checks**; the project
  label says Chromium but this spec explicitly selects WebKit through `E2E_BROWSER`.
- Final packaged native confirmation/reset/return/legal checks: **4 / 4 Chromium**.
  These use mocks and do not replace real email/device proof.
- The 1,000-food encrypted restore and 560-row diary/recovery timing checks stayed
  below their **500 ms local test thresholds**. This is not a lower-end phone or
  cold-launch benchmark.
- Parsed the generated four-page PDF, checked every sample's final text and
  punctuation, and visually reviewed all pages for clipping and page grouping.
- Final native web sync and unsigned iOS Release simulator build: **passed**.
  No signed archive, TestFlight build or App Store submission was produced.

Local evidence: `/private/tmp/ww-readiness62-check.log`,
`/private/tmp/ww-readiness62-ci.log`, `/private/tmp/ww-readiness62-all-final`,
`/private/tmp/ww-readiness62-webkit-final`,
`/private/tmp/ww-readiness62-native-browser`,
`/private/tmp/ww-readiness62-xcode.log`. Temporary files are not durable release
records; retain the final signed-device evidence privately before submission.

### Still required, apart from LLC/enrollment and subscriptions

1. A real **same-browser reset email** through new-password save and sign-in,
   followed by the signed physical-device matrix (camera/Health/notifications,
   cold launch, offline/update, accessibility and native crash delivery).
2. Final qualified privacy/legal, processor/retention, content-rights and export
   classification review; final store privacy answers and device screenshots.
3. Verify support mailbox send/receive, assign support/security responders and
   alert recipients, exercise isolated managed-database restore, and confirm
   provider spending/capacity controls. Runbooks are prepared; these operational
   arrangements are not silently claimed complete.
4. Two persistent dedicated accounts and repository configuration before enabling
   production E2E; branch protection and owner-approved publication. The one
   disposable live-test account used here has been removed.

The full submission preflight remains **NOT READY** until those gates and the
separate Apple/business/commerce gates have dated evidence for the exact build.

## Recommended delivery order

1. **Owner, now:** finish correct Apple organization enrollment and confirm legal seller, launch countries and support ownership.
2. **Engineering, next:** reconcile and integrate the pending Apple billing/monthly-credit implementation; remove the legacy AI dead end and test migration/entitlements without enabling unavailable purchases.
3. **Engineering + owner:** configure actual Apple product/server credentials; verify production email, restore/deletion and all sandbox commerce paths with test accounts.
4. **Legal + product:** approve the data/rights/export declarations and final store copy, pricing disclosures and screenshots.
5. **QA + operations:** clean signed archive, TestFlight/device/accessibility/performance testing, backup drill, alert and cost-control checks.
6. Freeze the candidate commit. Fill each release evidence gate with a dated proof reference and that exact revision; run the full submission preflight. Submit only when the evidence and real flows are complete, then release manually after review.

The code-only preflight can run in ordinary CI; the full preflight is the submission gate. Both are available through `app-store/scripts/audit-submission.mjs`. Evidence is a review record, not something the script can independently certify about Apple or production.

## Audit method and retained evidence

The [Supabase skill](/Users/franciskwarteng/.codex/plugins/cache/openai-curated-remote/supabase/1.0.0/skills/supabase/SKILL.md) and [Postgres security guidance](/Users/franciskwarteng/.codex/plugins/cache/openai-curated-remote/supabase/1.0.0/skills/supabase-postgres-best-practices/SKILL.md) shaped the live RLS/grants review; no production schema or customer records were changed. The [browser automation guidance](/Users/franciskwarteng/.codex/plugins/cache/openai-curated-remote/vercel/0.21.4/skills/agent-browser/SKILL.md) and [browser verification skill](/Users/franciskwarteng/.codex/plugins/cache/openai-curated-remote/vercel/0.21.4/skills/agent-browser-verify/SKILL.md) informed journey checks, error assertions and screenshot inspection. Their preferred CLI was unavailable, so the repository's Playwright suites were used with local fixtures instead.

Local screenshots/results are under `/private/tmp/ww-audit61-locked-browser`, `/private/tmp/ww-audit61-webkit`, `/private/tmp/ww-audit61-core-journeys` and `/private/tmp/ww-audit61-food-roster`. The first combined core run encountered a local fixture-server path error before food/roster could load; the server was corrected and all remaining 15 checks passed. Earlier failure artifacts were retained rather than represented as app failures or silently counted as passes.

The clean simulator app is at `/private/tmp/ww-audit61-derived/Build/Products/Release-iphonesimulator/App.app`. Temporary artifacts can disappear; retain signed-build and production acceptance evidence in durable private release records before submission. No credentials should be placed in this document.

The follow-up also used [PDF verification guidance](/Users/franciskwarteng/.codex/plugins/cache/openai-primary-runtime/pdf/26.826.12353/skills/pdf/SKILL.md) to render and inspect the exported pages, [deployment/CI guidance](/Users/franciskwarteng/.codex/plugins/cache/openai-curated-remote/vercel/0.21.4/skills/deployments-cicd/SKILL.md) to separate safe local checks from production jobs, and [OpenAI credential guidance](/Users/franciskwarteng/.codex/plugins/cache/openai-curated-remote/openai-developers/1.2.3/skills/openai-platform-api-key/SKILL.md) to reuse only the already approved provider connection. No new AI credential was requested or exposed.
