# Store release checklist

Current decision: **NOT READY for public App Store submission**. Use [the audit and prioritized launch plan](COMMERCIAL_READINESS_AUDIT.md). Native code checks and signed-device/commercial evidence are separate; do not mark a manual gate complete because unit tests pass.

## Automated package checks

- [ ] Node 24 is active and `npm ci --prefix app-store` succeeds from the repository root.
- [ ] Root `npm run ci` passes, including release policy and dependency vulnerability audits.
- [ ] GitHub `Quality / app` and dependency review checks pass.
- [ ] `npm run build:web` passes in `app-store/`.
- [ ] Native bundle audit reports v30.1.31 and no secrets/remote executable scripts.
- [ ] `npm run audit:submission --prefix app-store -- --code-only` passes.
- [ ] Full `npm run audit:submission --prefix app-store` passes with verified evidence for the exact release commit.
- [ ] iOS and Android projects are synced from the same `www/` bundle.
- [ ] Any new Supabase table migration enables RLS and explicitly grants or revokes Data API roles.

## iPhone/iPad device test

- [ ] Cold launch and safe areas work on a notched iPhone.
- [ ] Landing, signup, email confirmation, sign-in and sign-out work.
- [ ] New account starts empty and never sees another user’s profile/schedule.
- [ ] Upfront one-time terms/privacy and three-step onboarding fit the viewport; returning accounts restore without repeating terms or replacing saved data.
- [ ] Schedule photo/PDF/text import shows proposals before save.
- [ ] Recurrences, overnights, conflicts and exceptions behave correctly.
- [ ] Training, nutrition, coach and progress flows save and restore.
- [ ] Notifications, file sharing, camera denial and external OAuth browser work.
- [ ] Permanent account deletion works and returns to signed-out landing.
- [ ] App-created confirmation/reset links return from an external mail app when the app is running or terminated.
- [ ] Health-data storage is excluded from automatic iCloud backup; inspect the installed container without deleting user data.
- [ ] VoiceOver, larger text, contrast, keyboard, Reduced Motion and iPad layout are usable.

## Commerce and legal gates

- [ ] Active Apple organization membership and correct legal seller; complete agreements, tax/banking and EU trader verification.
- [ ] Remove the old one-question paid-plan dead end by integrating the approved recurring allowance and Apple subscription.
- [ ] Test real sandbox purchase, pending approval, renewal, restore, expiry, refund and interrupted fulfillment.
- [ ] Explain localized price, auto-renewal, exact allowance, reset date and failed-scan charges before purchase.
- [ ] No checkout is enabled without valid server verification; deletion never depends on cancelling billing first.
- [ ] Obtain review of global health-data handling, processor agreements, content licenses, retention and encryption/export declarations.

## Android device test

- [ ] Repeat the full iPhone flow on a current physical Android phone.
- [ ] System back closes the top sheet/dialog before leaving the app.
- [ ] Notification permission works on Android 13+.
- [ ] Photo picker/camera and PDF picker work.
- [ ] Signed release is an Android App Bundle targeting API 36.

## Submission owner steps

- [ ] Confirm `com.bibiniifarms.workandworkout` before creating store records.
- [ ] Create the Apple and Google app records.
- [ ] Complete privacy/data safety/health/content rating forms accurately.
- [ ] Add the public privacy, support and deletion URLs.
- [ ] Create a non-personal reviewer account and enter it privately in both consoles.
- [ ] Upload phone screenshots and optional preview video captured from the final build.
- [ ] Use closed/internal testing first, then submit the proven build for review.
- [ ] Keep certificates, provisioning profiles, upload keys and credentials out of Git.
- [ ] Protect `main` with required `Quality / app`, pull requests and signed commits.
