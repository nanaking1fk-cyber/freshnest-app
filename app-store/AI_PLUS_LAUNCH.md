# Free launch and Apple AI Plus

## Approved product

- Core calendar, manual food logging, workouts, progress and local planning: free.
- Free: 10 AI credits per calendar month, resetting at 00:00 UTC on the first.
- AI Plus: 100 credits per Apple monthly paid period, replacing the free allowance while active. No rollover.
- Intended US price: **US$1.99/month**, auto-renewable. The app uses Apple's localized price, never a hardcoded checkout amount.
- Product: `com.bibiniifarms.workandworkout.ai.plus.monthly`.
- App bundle: `com.bibiniifarms.workandworkout`.

| AI action | Credits | Model | Maximum output tokens |
| --- | ---: | --- | ---: |
| Coach question | 1 | gpt-5.6-luna | 1,200 |
| Equipment photo | 10 | gpt-5.6-terra | 1,800 |
| Meal photo | 10 | gpt-5.6-terra | 2,200 |
| Roster photo | 20 | gpt-5.6-terra | 6,000 |
| Schedule reading | 20 | gpt-5.6-terra | 4,000 |
| Optional plan refinement | 20 | gpt-5.6-terra | 1,800 |

For example, Plus covers 100 questions, 10 meal scans, five roster scans, or a mixture within 100 credits. A free monthly allowance covers ten Coach questions only. All photo scans, AI schedule reading and optional AI refinement require a verified active Plus subscription, even when the free balance could otherwise cover the cost. Onboarding builds its ordinary plan locally without spending credits. Users explicitly request AI refinement from the preview.

## Cost reasoning, checked 3 September 2026

Standard input/output pricing per million tokens is $0.20/$1.20 for [Luna](https://developers.openai.com/api/docs/models/gpt-5.6-luna) and $2/$12 for [Terra](https://developers.openai.com/api/docs/models/gpt-5.6-terra). [Image token rules](https://developers.openai.com/api/docs/guides/images-vision#calculating-costs) use 32-pixel patches with a 1.2 multiplier for these models. Original roster images are limited to 8,192 patches; other images use bounded high detail.

The code reserves **$0.006 per credit**. Request byte limits include instructions and response schemas. The regression calculation allows another 2,048 input tokens for protocol overhead and a conservative 25% input-price uplift for cache writes. All output, including reasoning, is capped. Model environment overrides cannot bypass the reviewed policy. No automatic provider retries are made.

The maximum reserved model cost is **$0.60 per Plus period** and **$0.06 per free account/month**. Using Apple's conservative first-year [70% subscription proceeds](https://developer.apple.com/app-store/subscriptions/) before applicable taxes:

- $1.99 × 70% = $1.393 before taxes.
- Less $0.60 maximum reserved model spend = **$0.793** before infrastructure, tax, support, refunds and free-account costs.
- At nine fully-used free accounts per paid account, free model spend consumes another $0.54, leaving about $0.253 before those other expenses.

This protects **per-subscriber AI margin**, not guaranteed overall business profit. Eligible Small Business Program proceeds may improve margins but enrollment is not assumed. Reassess after observing conversion, local proceeds/tax and infrastructure costs. Server-wide capacity remains at most 100 AI requests and $10 reserved model spend per UTC day. Requests rejected before processing do not debit credits; started processing uses credits even if the result is unreadable. Keep that disclosed policy visible.

## Security and delivery

- Apple's official Node server library verifies certificate chains, signatures, environment and app identity. Public Apple root CAs are bundled; no private key is in the app or repository.
- Hosted functions explicitly include the Apple CA files. Root and native dependency audits run in CI. Photo dimensions use a bounded JPEG/PNG/WebP-only reader; the vulnerable general image-size library was removed.
- A fresh App Store Server API status check prevents replaying an old receipt after refund/expiry. Status is cached for at most two minutes; the database refuses paid rows older than ten minutes.
- A random app-account token binds the subscription to the authenticated account. Client metadata, local flags and a caller-supplied tier cannot unlock Plus. Family-shared entitlements are not enabled.
- StoreKit transactions are finished only after verified server delivery is saved. Unfinished transactions, launch reconciliation, purchase updates and Restore Purchases retry interrupted delivery.
- Refund, revocation and expiry remove paid access. Cancelling auto-renewal alone does not remove the remaining paid period.
- Notifications are signed and trigger a current Apple status lookup. Duplicate/out-of-order notifications cannot recreate an expired subscription or refill a period. Deleted accounts are never recreated by notifications.
- Atomic database reservations prevent parallel requests exceeding an allowance. Purchase/AI metadata is service-role-only. Existing diary, schedule and account-state tables are unchanged.
- Account deletion removes account-linked billing records but does **not** cancel Apple's subscription. The app warns users and offers Manage Subscription without blocking deletion.

## External release gates — not yet completed

The Apple account inspected on 3 September 2026 shows **“Join the Apple Developer Program”**, with no active membership available for app/subscription setup. App Store Connect exposes Users and Access but no usable Apps management. The owner must activate enrollment, or sign in with the account holding the active membership. Do not claim App Store readiness or enable payments until these steps are complete.

1. Owner completes Apple Developer enrollment and any required legal, tax and banking agreements. Do not sign them on the owner's behalf.
2. Confirm/create the app using the bundle ID above; obtain its numeric Apple app ID and select the real signing team in Xcode.
3. Create one auto-renewable subscription group and the exact product ID above, duration one month, US storefront price $1.99. Configure reviewed local prices and availability. Do not enable Family Sharing, trials or promotional offers without a separate decision.
4. Obtain authorization to create/reuse an **In-App Purchase** server key, then configure it only in the Vercel server environment. Never paste the key into chat or package it in the app.
5. Server configuration: `APPLE_APP_ID`, `APPLE_ISSUER_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` (P8 PEM), and `APPLE_IAP_ENABLED=true` only when the product and verified server flow are ready. `APPLE_SANDBOX_USER_IDS` is an explicit comma-separated allowlist of test/reviewer account UUIDs; ordinary production users cannot claim sandbox entitlements. Keep the existing `OPENAI_API_KEY` and Supabase server connection.
6. Apply `supabase/migrations/20260904133929_apple_ai_credits_v56.sql` through the normal reviewed migration process **before** deploying the new APIs. Run advisors and the service-role tests. This migration does not migrate health or diary data.
7. Configure both applicable App Store Server Notifications V2 destinations to `https://www.workandworkout.com/api/v18/apple-notifications`. Test a notification. Live signatures are mandatory; local StoreKit test certificates are never accepted by the production server.
8. Run real-device/sandbox purchase, approval-pending, cancel, renewal, restore after reinstall, second-device restore, refund, expired billing, different app-account and interrupted server-delivery tests. Verify exact price and credit period with the reviewer account.
9. Keep web and native assets aligned, test native email return on the installed app, then build a signed distribution archive. The two exact native confirmation/recovery redirects were added to the production Supabase allowlist on 3 September 2026 and confirmed after reload; all five website redirects remain. Submit accurate purchase-history privacy answers, subscription metadata/screenshots, review credentials and review instructions.

The candidate intentionally locks every AI scan until an active subscription is verified. Keep Apple purchase controls disabled and explain availability until real products are configured. A website rollout requires the allowance migration first. The UI deliberately disables purchase when Apple/server configuration is unavailable rather than pretending to take payment.

## Historical local verification (3 September; superseded by APPLE_RELEASE_V69.md)

The following results describe the earlier candidate, not the current merged build.



The release is tested in an isolated copy made from HEAD plus intended changes. Unrelated deleted files and the user's untracked lock/temp files are not restored or staged. Automated purchase UI tests use synthetic transactions, not real payments; they do not replace Apple's sandbox requirements. The unsigned iOS simulator build verifies Swift compilation, not distribution signing or a live charge.

Final local results: **393 root checks passed**, **10 Chromium and 10 WebKit browser tests passed**, native bundle audit passed, and the unsigned iOS Release simulator build passed. Payment tests cover forged signatures, account ownership, atomic limits, restore without refills and expired/revoked subscriptions. Mobile/desktop views and keyboard navigation were checked. Server dependencies have zero audit findings; native build tooling has three moderate advisory entries but no high/critical findings. Full evidence and remaining gates are in `SUBMISSION_AUDIT.md`.

No payment product, Apple server key, charge or production billing migration was created. Code is still local. The only live configuration change in this continuation is the two native auth callback URLs; existing accounts and health/diary data were not modified.
