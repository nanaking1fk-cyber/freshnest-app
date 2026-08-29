# Work + Workout — iOS and Android release package

This is the canonical native release source for the current Work + Workout product. It bundles the reviewed v30.1.16 web application inside Capacitor and adds native status-bar handling, splash behavior, haptics, local notifications, Android back navigation, OAuth browser presentation, and native file sharing.

The older sibling `appstore/` directory is a legacy Work + Gym Coach prototype. Do not submit or sync that directory.

## Release identity

- Product name: **Work + Workout**
- Version: **1.0.0**
- iOS bundle identifier / Android application ID candidate: `com.bibiniifarms.workandworkout`
- Production API and account origin: `https://www.workandworkout.com`

The identifier becomes difficult to change after the first store record or upload. Confirm it before registering the apps.

## What is packaged

- The same v30.1.16 landing page, account lifecycle and adaptive onboarding as production.
- Schedule photo/PDF/text ingestion with review-before-save, recurring rotations, multi-source calendars, conflicts and overtime indicators.
- Training planning/logging, exercise guidance and history.
- Nutrition planning/logging, food search, barcode capture and recovery/body metrics.
- Account sync, AI Coach and Google/Outlook calendar connections through the production HTTPS API.
- Public privacy, terms, support and account-deletion pages.
- Application JavaScript, images, videos, fonts and OCR/PDF libraries stored in the native bundle. There is no remote web-runtime URL and no service worker inside the app runtime.

## Prerequisites

- Node.js 24.
- Apple: current full Xcode with the iOS 26 SDK, an Apple Developer Program membership, App Store Connect access and a registered bundle ID.
- Android: current Android Studio, JDK 21, Android SDK/API 36, a Google Play Console developer account and a release upload key.

This machine currently has Apple command-line tools but not full Xcode, Android Studio, a JDK or the Android SDK. The source projects can be generated here, but archives must be compiled and signed after those toolchains are installed.

## Generate and sync both projects

Run from `app-store/`:

```bash
npm install
npm run native:add
npm run native:sync
```

After the first `native:add`, use `npm run native:sync` whenever the product changes. The build fails loudly if the production loader or account/calendar integration changes in a way that would create a stale native package.

## iOS release

1. Run `npm run ios:open`.
2. In Xcode, select your developer Team and confirm bundle ID `com.bibiniifarms.workandworkout`.
3. Confirm version `1.0.0` and increment the build number for every upload.
4. Test signup, sign-in/out, onboarding, schedule import, review-before-save, workouts, nutrition, notifications, file export, camera denial, calendar OAuth and permanent account deletion on a physical iPhone.
5. Archive, validate, and upload to App Store Connect.
6. Supply a working reviewer account in App Review Information. Never put reviewer credentials in this repository.

## Android release

1. Run `npm run android:open`.
2. In Android Studio, install/confirm SDK 36 and test the same flows on a physical Android device.
3. Create or select a protected upload key and configure release signing outside source control.
4. Choose **Build → Generate Signed Bundle / APK → Android App Bundle**.
5. Upload the `.aab` to an Internal testing release before Production.
6. Supply a working review account under Play Console App access. Never put reviewer credentials or signing files in this repository.

## Store URLs

- Privacy: `https://www.workandworkout.com/work-gym-planner/privacy.html`
- Terms: `https://www.workandworkout.com/work-gym-planner/terms.html`
- Support: `https://www.workandworkout.com/work-gym-planner/support.html`
- Account deletion: `https://www.workandworkout.com/work-gym-planner/delete-account.html`

## Store declarations that still require the account owner

- Apple App Privacy answers and age rating.
- Google Data safety, Health apps declaration, content rating, ads declaration and target audience.
- Developer identity, tax/banking/contracts where applicable.
- Store screenshots, reviewer credentials, release signing and the final Submit for Review actions.

Use `APP_STORE_METADATA.md`, `PLAY_STORE_METADATA.md` and `RELEASE_CHECKLIST.md` as the submission source of truth.
