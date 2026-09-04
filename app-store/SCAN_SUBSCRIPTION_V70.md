# Subscription-first scans — 4 September 2026

Release assets: `30.1.31-scan70`. This is a web update and a development-signed iPhone update, not an App Store release or payment activation.

## Changes

- Meal Scan entry, meal photo picker, equipment camera, roster camera and roster photo upload check account subscription access before opening the camera or photo library.
- Unknown, stale, expired, exhausted, offline and signed-out access cannot open an AI photo picker. Entitlement responses from an earlier sign-in cannot restore access after the account changes.
- Safari requires a user gesture for camera access. A cold successful entitlement check asks the subscriber to tap the photo button again; a recent verified check allows the picker on the first tap. Server authorization still runs before AI processing.
- Roster photo upload is separate from local PDF import. Barcode scanning and manual entry remain free.
- Everyday screens no longer show credit counters or per-action credit prices. Subscription pricing, auto-renewal and a short monthly-limit disclosure remain visible before purchase; optional plan details describe the shared allowance. The full accounting remains in Terms of Use.
- No allowance, subscription verification, billing storage, consent or account-deletion rules were relaxed. No database migration is needed.

## Verification

- All 480 root regression tests pass; native bundle audit and code-only submission preflight pass.
- All 24 release browser tests pass in both Chromium and WebKit (48 passing checks), including actual file-chooser event checks, free and paid accounts, failed checks, account switching and the generated native bundle. Mobile and desktop screenshots were inspected.
- Signed Debug iPhone build succeeded. Apple's device tool installed the update over the existing app and successfully launched it on the connected iPhone 16 Pro Max. No uninstall or account-data clearing was performed.
- Browser tests use synthetic data and mocked Apple/account services. They do not establish real Apple purchase, renewal, refund or restore functionality. The owner must still confirm the camera-first behavior on the physical phone.

## Remaining launch gates

Apple product/account/server configuration and real sandbox transaction testing remain pending. Purchases must stay unavailable until those are completed. The broader App Store release gates in `COMMERCIAL_READINESS_AUDIT.md` and `release-evidence.json` are not cleared by this update.
