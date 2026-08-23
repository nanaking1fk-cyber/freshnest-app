# Work + Gym Coach — iOS / App Store build

This folder converts the generalized Work + Gym Coach web code into a **self-contained Capacitor iOS application**. The shipping iOS bundle does not use the GitHub loader and does not download application JavaScript after installation.

## Product status

Already generalized for public users:

- first-run onboarding with the user's own name, work cycle, shifts, commute, sleep target, equipment access and training frequency
- standard, rotating, variable-monthly and no-work-schedule setup templates
- 7–28 day repeating work-cycle support
- adaptive 2–4 day planned lifting frequency
- optional extra workouts on single-job days
- exercise alternatives based on available equipment
- completed-workout history, RIR/load/reps, e1RM and fatigue coaching
- nutrition diary, food search, barcode lookup, recipes and macro targets
- body statistics including BMI, waist, body-fat %, lean/fat mass, FFMI, BMR estimate and measurement trends
- local backup/import/delete-data controls
- privacy policy, terms and support pages

Existing users keep their current local profile/data. New users start with a blank personalized setup rather than a Francis-specific template.

## Native architecture

- Capacitor 8
- all planner HTML/CSS/JavaScript copied into `www/` at build time
- barcode fallback library copied locally into the bundle
- native haptics enabled when available
- no remote `server.url`
- no GitHub/Vercel app-code loader in the iOS binary
- schedule editing remains available if OCR is unavailable

The first native build deliberately disables the web Tesseract OCR downloader. Before enabling automatic schedule-photo OCR in an App Store binary, replace it with a bundled implementation or Apple Vision-based native OCR.

## Build on a Mac

Requirements: current Xcode, Node.js 22+, an Apple Account, and for App Store/TestFlight distribution an active Apple Developer Program membership.

```bash
cd appstore
npm install
npm run ios:add        # first build only
npm run ios:open
```

For later changes:

```bash
cd appstore
npm run ios:sync
npm run ios:open
```

`npm run build:web` rebuilds `www/` and fails if an executable CDN reference remains in the bundled application code.

## Xcode settings before TestFlight

1. Open the generated iOS workspace/project from `npx cap open ios`.
2. Select your Apple Developer Team under Signing & Capabilities.
3. Confirm the final bundle identifier. The scaffold currently uses `com.bibiniifarms.workgymcoach`; change it **before** registering the production App ID if you want another identifier.
4. Set the deployment target supported by the current Capacitor/Xcode release.
5. Add a clear camera purpose string, for example:
   - `NSCameraUsageDescription`: “Work + Gym Coach uses the camera only when you choose to scan a food barcode or capture a work-schedule image.”
6. If the shipping build requests photo-library access beyond the system picker, add the corresponding photo-library purpose string.
7. Replace the generated AppIcon asset with the final 1024×1024 commercial icon and verify every required rendition.
8. Test every tab and permission flow on a real iPhone.
9. Product → Archive → Distribute App → App Store Connect → Upload.
10. Use TestFlight before submitting the production version for App Review.

## App Store submission URLs

Use the hosted pages from the stable product path:

- Privacy: `https://nanaking1fk-cyber.github.io/freshnest-app/work-gym-planner/privacy.html`
- Support: `https://nanaking1fk-cyber.github.io/freshnest-app/work-gym-planner/support.html`
- Terms: `https://nanaking1fk-cyber.github.io/freshnest-app/work-gym-planner/terms.html`

## Before production submission

- test fresh-install onboarding and migration from an existing local profile
- test camera permissions, barcode photo/live scan and manual fallback
- test workout completion/history and alternative-exercise progression
- test all nutrition tabs and food serving math
- test work cycles of 7, 14 and non-14-day lengths
- test variable work months with unknown days
- test backup/export/import/delete-all-data
- test airplane-mode behavior for local features
- verify Open Food Facts network failures degrade gracefully
- complete App Store privacy answers for the exact shipping binary
- provide screenshots for required iPhone display sizes
- enter a real support/contact identity in App Store Connect
- ensure the final product name and trademarks are available before release

## Important

This repository can prepare the source, build system and metadata, but **code signing, certificates, App Store Connect ownership, legal agreements and final submission require the developer's Apple credentials** and must be performed in Xcode/App Store Connect by the account holder or an authorized team member.
