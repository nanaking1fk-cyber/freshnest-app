# Apple App Store metadata

Draft for the release candidate, not evidence that App Store Connect is complete. Do not submit until `COMMERCIAL_READINESS_AUDIT.md` and `release-evidence.json` are completed. The free-core / intended US$1.99 monthly AI Plus implementation is integrated locally. Purchases remain disabled until Apple product/server setup and sandbox verification. See APPLE_RELEASE_V69.md for current evidence; the older audit is historical.

## Listing

**Name:** Work + Workout

**Subtitle:** Plan health around your shifts

**Primary category:** Health & Fitness

**Secondary category:** Productivity

**Promotional text:** Plan shifts, workouts and meals together. Track work hours and estimated pay. Optional AI Plus helps read photos and schedule notes.

**Keywords:** shift planner,workout,calendar,nutrition,gym,fitness,work schedule,meal plan,recovery,tasks

## Description

Your job already controls enough of your day. Work + Workout helps you protect the rest of it.

Add your work schedule with select-dates and repeating patterns, or use optional AI Plus to read a roster photo or schedule note. Review every item before saving, then let the planner organize workouts, meals, recovery, errands and reminders around the time you actually have.

BUILT FOR REAL WORK SCHEDULES

• Add shifts manually for free; AI-assisted roster photos and schedule reading require AI Plus
• Review detected shifts, confidence and conflicts before anything is saved
• Build repeating patterns such as rotating shifts, nights and custom cycles
• Keep one job or several optional, color-coded work calendars
• See weekly work hours, overlaps and overtime indicators

ONE USEFUL DAY PLAN

• Put work, workouts, meals, recovery and personal tasks on one timeline
• Add plans in everyday language and review the proposed schedule
• Find practical workout and task windows around shifts and commitments
• Connect Google Calendar or Outlook when available for your account

TRAINING THAT ADAPTS

• Build a plan around goals, experience, equipment and weekly availability
• Log sets, reps and effort with exercise guidance and alternatives
• Follow workout history and progressive coaching without generic “Upper A” labels

NUTRITION THAT FITS THE WEEK

• Get calorie, macro and meal guidance aligned with your goal and schedule
• Log food, water and familiar meals
• Search foods or scan supported barcodes
• See automatic daily step progress from Apple Health after you connect it
• Track weight, measurements and recovery context

PRIVATE AND IN YOUR CONTROL

Your account keeps each user’s planner data separate. Imported schedule images are processed for the feature you request, detected entries are shown before saving, and the account menu includes permanent account deletion.

Work + Workout provides planning and general fitness education. It is not a medical device and does not diagnose, treat or replace advice from a qualified professional.

## Optional AI Plus disclosure

The core planner, manual food diary, barcode lookup, workouts, hours and estimated pay stay free. Signed-in users receive 10 Coach credits each calendar month (UTC). AI Plus includes 100 credits per monthly paid period, replacing the free allowance while active, with no rollover. All AI scans and AI schedule/plan tools require Plus: meal/equipment photos use 10 credits; roster photos, AI schedule reading and optional plan refinement use 20. Coach questions use 1 credit. Processing attempts consume the displayed credits, including unreadable results; rejected requests do not. Daily capacity limits apply.

Intended US price: $1.99/month. Display Apple’s actual localized price before purchase. Auto-renewal, cancellation, Restore Purchases, Terms and Privacy links must be available. Do not advertise purchase availability until the product is live. Existing customers can use a verified subscription on the same Work + Workout account; deletion does not cancel Apple billing.

## URLs

- Privacy Policy: https://www.workandworkout.com/work-gym-planner/privacy.html
- User Privacy Choices: https://www.workandworkout.com/work-gym-planner/privacy.html#rights
- Support: https://www.workandworkout.com/work-gym-planner/support.html
- Terms: https://www.workandworkout.com/work-gym-planner/terms.html
- Account deletion: https://www.workandworkout.com/work-gym-planner/delete-account.html

## App Privacy questionnaire

Use these answers for version 1.0.0. They intentionally cover the optional account sync, personalized AI, calendar connection, food search and diagnostic paths even though the planner can remain local-only. Recheck this list whenever a provider or feature changes.

**Does this app or its third-party partners collect data?** Yes.

**Tracking:** No. The app does not combine data with third-party data for targeted advertising or advertising measurement, share data with a data broker, display third-party ads, or request App Tracking Transparency permission.

| App Store data type | Linked to the user | Tracking | Purposes | What the answer covers |
| --- | --- | --- | --- | --- |
| Contact Info — Name | Yes | No | App Functionality; Product Personalization | Optional display/profile name, roster identity and the display name chosen for an invite-only Challenge Board. |
| Contact Info — Email Address | Yes | No | App Functionality | Account authentication and optional Google/Microsoft calendar identity. |
| Health & Fitness — Health | Yes when cloud or AI consent is enabled | No | App Functionality; Product Personalization | Nutrition, meals, body measurements, weight, sleep, heart rate, recovery and wellness inferences. |
| Health & Fitness — Fitness | Yes when cloud, AI or Challenge Board sharing is enabled | No | App Functionality; Product Personalization | Workouts, sets, reps, activity, steps, training history, exercise goals and aggregate progress deliberately shared with invited challenge participants. |
| Location — Coarse Location | No | No | App Functionality | Approximate location that infrastructure may infer from an IP address for delivery, security and abuse prevention; the app does not request device location. |
| User Content — Photos or Videos | Yes when optional AI is used | No | App Functionality; Product Personalization | Meal, selected roster sections and equipment photos sent for AI interpretation after permission. Local barcode scanning and local OCR do not upload those images. Do not describe AI roster reading as on-device. |
| User Content — Customer Support | Yes | No | App Functionality | Messages and contact information users deliberately send to support. |
| User Content — Audio Data | No | No | App Functionality | Voice input is handled by the browser/operating-system speech service; Work + Workout does not intentionally store the recording. Select this data type if Apple treats the enabled OS speech provider as collection for the submitted build. |
| User Content — Other User Content | Yes when cloud, calendar, AI or Challenge Board features are enabled | No | App Functionality; Product Personalization | Schedule entries, tasks, goals, profile answers, calendar events, notes, AI prompts/replies, challenge titles, invite codes and custom aggregate scores. |
| Search History | No | No | App Functionality | Food-search terms and barcode numbers sent directly to Open Food Facts for lookup. |
| Purchases — Purchase History | Yes | No | App Functionality | Apple product/transaction identifiers, period and entitlement status, and a random account-link token. No payment-card details. |\n| Identifiers — User ID | Yes | No | App Functionality | Supabase account ID and account-scoped record identifiers. |
| Usage Data — Product Interaction | Yes for existing account-scoped limits; No for optional aggregate counts | No | App Functionality; Analytics | Account-scoped AI credit and usage limits and feature-operation records. Separately, an off-by-default switch enables anonymous daily totals of app opens and fixed main-screen visits, with no account, device, health, referral or event-level records. This is not used for advertising. |
| Diagnostics — Performance Data | No | No | Analytics; App Functionality | Request duration and page/app performance measurements. |
| Diagnostics — Crash Data | No | No | Analytics; App Functionality | Privacy-filtered iOS MetricKit crash/hang diagnostics and Android native exception class/app stack, delivered after the incident. |
| Diagnostics — Other Diagnostic Data | No | No | Analytics; App Functionality | Error type, filtered message pattern and stack, app-relative route, platform, release, timestamps and occurrence count; no account ID, URL query, request body, planner contents or health data. |

Do **not** select Payment Info: any future App Store payment details are handled by Apple and are not available to Work + Workout. Do **not** select Precise Location, Contacts, Browsing History, Device ID or Advertising Data for this build because the app does not request or collect them. Select Crash Data and Other Diagnostic Data as shown above. If in-app purchases are added, reassess Purchase History before the update is submitted.

The health-data rows should be marked as linked to identity because optional private account sync and personalized AI can associate those records with an authenticated account after separate consent. Product-page disclosure should reflect the most data-intensive optional path, not only the default local-only state.

The HealthKit integration requests read-only access to Step Count only, and only after the user chooses **Connect Apple Health** in Health & steps. The app does not write HealthKit data, request location for step tracking, or use HealthKit data for advertising. It stores the daily aggregate in the existing local health diary; that value leaves the device only if the user separately enables an account sync or personalized AI feature that includes health context.

## Required declarations

- **Regulated Medical Devices:** No. Work + Workout is a consumer wellness planner, not a regulated medical device, healthcare provider, diagnostic service or treatment service.
- **Age rating:** Answer the content questions truthfully (no violence, sexual content, gambling, loot boxes, unrestricted web access or public user-generated content), then choose **Override to Higher Age Rating: 18+** because Section 2 of the Terms requires users to be at least 18.
- **Made for Kids:** No.
- **Advertising:** No advertising and no health-data advertising.
- **Content rights:** Yes, the app accesses third-party food and calendar content. Confirm the right to display it under the applicable Open Food Facts, Google and Microsoft terms before submission and keep required attributions visible.
- **Encryption/export compliance:** HTTPS and optional AES-GCM WebDAV backups need classification. The current `ITSAppUsesNonExemptEncryption=false` setting is not evidence of an exemption. Confirm the correct declaration and any documentation with qualified export-compliance advice before submission.
- **Distribution:** Public App Store distribution after TestFlight. Use manual release so review approval cannot publish before launch checks are finished.

## App Review notes

Work + Workout is a schedule-aware health and productivity planner. The native build packages the application and media locally, provides native local notifications, haptics, file sharing, camera workflows and Android/iOS platform behavior, while authenticated account and AI/calendar features use the production HTTPS API.

To test:

1. Use the reviewer account supplied privately in App Store Connect.
2. Review the upfront Terms & privacy step. Optional backup and AI can be left off. Complete the three-step plan, or resume an existing plan. Password recovery does not require health-data consent.
3. With a verified AI Plus review account, open Calendar → Add → Work → Import roster → Type or paste: “Work Monday–Thursday 7 AM–7 PM. Dentist Tuesday at 2. Buy groceries before Friday. Gym three times this week.”
4. Review the proposals, confidence and conflict warnings before saving.
5. Open Training and Nutrition to inspect/log the generated plan.
6. Open More → Health & steps, choose Connect Apple Health, and allow Step Count. The permission sheet appears only after this action. Return to Home to see the daily step total; use Refresh to read it again. Denying access leaves manual step entry and file import available.
7. Open Profile → Account & privacy to test saved privacy choices, restore, sign out and permanent account deletion. Use a disposable review account for the deletion test.

8. Test Work hours & pay: configure a sample hourly rate and overtime rules, review planned versus confirmed shifts, and export. Pay is an estimate, not a payroll or tax calculation; do not advertise legally guaranteed wages or automatic jurisdiction-specific taxation.

Camera access is requested only after the reviewer chooses a photo/barcode/schedule capture action. HealthKit access is read-only and requested only after the reviewer chooses to connect it. Manual input remains available if either access is denied. Work + Workout is not a medical device.

**Required before review:** add a dedicated reviewer email/password in App Store Connect. Do not use the owner’s personal account and do not commit credentials.

**Required before paid launch:** final StoreKit purchase, Restore Purchases and Manage Subscription instructions; displayed localized price and renewal period; exact recurring AI allowance and reset rules; tested refund/revocation behavior; purchase-history privacy disclosure. Account deletion must remain available without requiring subscription cancellation first.
