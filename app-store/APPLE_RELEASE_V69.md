# Apple release candidate — 4 September 2026

Status: local candidate based on production commit `d3941578a140df812063eb3c1196978bc0b5deb7`. This is not a published release or App Store approval.

Recovery update, 4 September: the Mac restart cleared the temporary source/build directories. The published baseline was cloned into `/Users/franciskwarteng/Documents/ChatGPT/WorkAndWorkout-Recovery`, and the uncommitted text changes were reconstructed from the recorded file-edit history. Public Apple certificate files were downloaded again from Apple's certificate authority; locked dependencies were reinstalled without audit uploads. The owner-selected development team was restored. The recovered bundle audit and 19 Chromium release journeys pass. Historical temporary log paths below are no longer available after the restart and must not be treated as retained artifacts. Device installation remains unverified.

## Completed implementation

Publication check, 4 September: owner authorized publishing all fixes and the npm package-metadata audit. All 480 regression tests pass. Root audit reports zero vulnerabilities; native tooling reports three moderate findings through `@capacitor/cli` → `xcode` → `uuid`, with no high/critical findings. The suggested forced dependency change is breaking and was not applied. Before publication the production subscription route returned HTTP 404, confirming the installed candidate/server mismatch. Production deployment is not established by this pre-release note.

Launch update, 4 September 11:00 local: after the owner completed the developer-trust step, Apple's device tool successfully launched `com.bibiniifarms.workandworkout` on the connected iPhone. Launch permission is now verified; rendered-screen correctness, account flows, camera/Health access and sustained stability still require device testing. This does not mark the broader device-quality release gate complete.

Device build update, 4 September 10:59 local: Debug development build of recovery commit `843472a` succeeded. Strict signature verification passed and Apple's device tool confirmed installation on the owner's iPhone 16 Pro Max. Launch was denied by iOS with its signature/entitlement/developer-trust security message; developer trust is the next user check. No successful app launch or functional device QA is claimed. This development build is not a distribution archive or TestFlight release. The build log is retained locally in `app-store/test-results/recovery/device-build.log` (ignored by Git).

- Latest website recovery, calendar and onboarding fixes retained in the packaged application.
- Apple StoreKit purchase, restore, subscription management and server verification integrated. Client flags alone cannot unlock paid access. Purchases remain disabled until real Apple configuration is available.
- Every AI scan requires AI Plus, including meal/equipment photos and roster uploads. AI schedule generation and plan refinement also require Plus. Manual calendar, workouts, food logging and barcode lookup stay free.
- Free: 10 Coach credits per UTC month. Planned Plus: US$1.99/month, 100 credits per paid period, no rollover. Coach costs 1; meal/equipment scans 10; roster/schedule/plan processing 20. Processing attempts use credits even when the image cannot be interpreted; requests denied before processing do not.
- Server model, input/output and global spend bounds are enforced. The planned maximum model budget is $0.60 per Plus allowance; this does not guarantee business profitability after taxes, Apple commission, hosting, support and other expenses.
- Privacy manifest, native backup exclusions, callback validation, bundled legal pages and subscription disclosures included. Store metadata and reviewer checklist prepared, not submitted.

## Evidence and limitations

- Root release/regression check: 480 tests passed.
- Native web build and bundle audit passed; code-only submission preflight passed.
- All 19 sample-only Chromium browser tests passed, covering paid gating, purchase failure/restore, account recovery, local legal pages, network failure handling and 390px/1280px packaged layouts. These mock Apple/Auth services and are not real purchase or real-device proof. Mobile subscription and calendar screenshots were visually inspected; the layout fits the viewport.
- All 19 release browser tests also passed in WebKit (38 passing browser checks across both engines). Full current test logs are retained under `/private/tmp/ww-apple69-*.log` on this workstation.
- Two unsigned simulator build attempts stalled in Xcode's compiler-discovery step before application compilation. They were stopped; a successful native compilation, archive and device run are NOT established.
- Private billing migration `20260904133929_apple_ai_credits_v56.sql` was applied to the existing backend. All five tables have RLS and no anonymous/authenticated access; only the server can reserve credits. Existing diary/account records were not rewritten. This schema addition does not activate payments or deploy the new APIs.
- Database security advisors reported no warning/error findings; informational no-public-policy notices are expected for server-only tables.
- Public support-domain MX/SPF/DMARC records exist. This does not establish SMTP delivery, DKIM alignment, mailbox ownership or alert delivery.

## Still required before submission

Device preparation update (4 September): the owner's iPhone is paired, Developer Mode is enabled, and Xcode now has the owner-selected team and a valid Apple Development signing identity. A signed device build was attempted but stalled at compiler discovery before application compilation, matching the prior simulator attempts. The same compiler probe completes independently. No successful installation, provisioning completion or real-device app test is claimed; the stalled command-line build was stopped without altering the iPhone.

1. Active Apple membership and seller identity; organization/D-U-N-S if publishing as a company. Complete Apple's agreements, banking/tax and applicable trader declarations.
2. Configure the actual subscription, server signing credentials and notifications; validate real sandbox purchase, renewal, cancellation, refund and restore. Never enable purchases solely because mocked tests pass.
3. Resolve the host compiler stall, build a signed archive and run TestFlight on an actual iPhone (and iPad if supported). Test camera, Health, notifications, PDF sharing, offline behavior and accessibility.
4. Verify real email confirmation and cross-mail-app recovery, cloud restore and permanent deletion with disposable accounts. Browser fixtures are not a substitute.
5. Capture final device screenshots, complete age/privacy questionnaires and provide private reviewer access. Verify operator identity, content rights, international health-data disclosures and retention with appropriate legal review.
6. Confirm support/crash-alert contact, test alerts and email delivery, rehearse an isolated backup restore, and establish incident response. Do not restore over production for testing.
7. Dependency advisory scanning awaits permission to send package names/versions to npm. The attempted check was blocked before transmission; no alternate scan was used to bypass that boundary.
8. Review and publish this candidate separately. Apple enrollment and production payment activation are not completed by preparing code.

`release-evidence.json` deliberately retains pending gates until actual signed-device, service and owner evidence is recorded. Earlier audit documents are historical preparation, not proof that these gates are complete.
