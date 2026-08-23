# Work + Gym Coach — iOS / App Store build

This folder packages the commercial/general-user Work + Gym Coach as a self-contained Capacitor iOS application.

## What is already commercialized
- Generic onboarding: no personal employer/schedule is seeded for a new user.
- 7–28 day repeating work cycles, optional secondary/variable monthly schedules, 2–4 planned lifting days/week, and optional single-job workout availability.
- Equipment-aware exercise alternatives and completed-workout history.
- Nutrition, recovery, body stats/BMI/FFMI/lean mass/fat mass/BMR estimates, backup/restore and privacy controls.
- Public privacy policy, terms and support pages.
- App executable JavaScript is bundled into the native binary; the native build does not use the GitHub runtime loader.

## Requirements
- macOS with a current Xcode release supported by App Store Connect.
- Node.js 20+.
- Apple Developer Program membership and access to App Store Connect.
- Register/confirm the bundle identifier before the first App Store upload. The current candidate is `com.workgymcoach.app`; change it in `capacitor.config.json` before `cap add ios` if you want another identifier.

## Build the Xcode project
From this `app-store` folder:

```bash
npm install
npm run build:web
npm run ios:add
npm run ios:sync
npm run ios:open
```

`build:web` creates `app-store/www` from the reviewed repository source and copies barcode/OCR executable JavaScript locally into the app bundle. It does not package the GitHub Pages loader.

## Xcode settings before archive
1. Select your Apple Developer Team under Signing & Capabilities.
2. Confirm the Bundle Identifier matches the identifier registered in App Store Connect.
3. Set version `1.0.0` and build `1` (or your chosen values).
4. Add the 1024px source icon from `resources/icon-1024.png` to the AppIcon asset set (or generate the full set with your preferred asset tool).
5. Add these Info.plist usage descriptions:
   - `NSCameraUsageDescription`: “Work + Gym Coach uses the camera when you choose to scan a food barcode or schedule image.”
   - `NSPhotoLibraryUsageDescription`: “Work + Gym Coach lets you choose a barcode or schedule image for a scan you request.”
6. Test on a physical iPhone: onboarding, every bottom tab, workout completion/history, exercise alternatives, food logging/search/barcode, body stats, work-cycle editing, variable schedule entry, backup/export/import, privacy/support links, airplane-mode launch, and camera-denied behavior.
7. Archive with Product → Archive, then Validate App and Distribute App to App Store Connect.

## Privacy / review URLs
- Privacy: `https://nanaking1fk-cyber.github.io/freshnest-app/work-gym-planner/privacy.html`
- Support: `https://nanaking1fk-cyber.github.io/freshnest-app/work-gym-planner/support.html`
- Terms: `https://nanaking1fk-cyber.github.io/freshnest-app/work-gym-planner/terms.html`

## Important review notes
The app does not require an account. Core schedule, training, nutrition and body data are device-local by default. Packaged-food/barcode requests use Open Food Facts. Optional WebDAV sync is configured by the user and sends encrypted backup data to the user's chosen server. Fitness coaching is educational and not medical diagnosis or treatment.

Before submission, complete the App Privacy questionnaire accurately for the exact build and any third-party services/SDKs included. If account creation is added later, implement in-app account deletion before submitting that version.
