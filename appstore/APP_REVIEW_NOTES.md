# App Review notes draft

Work + Gym Coach is a local-first fitness planning application designed for users with standard, rotating, multi-job or variable work schedules.

## Review access

No login is required. On first launch, choose **Start my setup** and select one of the work-schedule templates. The app is fully usable without creating an account.

## Key review flows

1. Home: review work status, training recommendation, nutrition progress and recovery readiness.
2. Calendar: configure a repeating work cycle and see scheduled/available workout days.
3. Training: log weight/reps/RIR, select an alternative exercise, complete the workout, and view it under Completed Workout History.
4. Nutrition: add a manual food, search Open Food Facts, or use barcode lookup.
5. Body Stats: enter height and a check-in to view BMI and other calculated body-composition metrics.
6. More: export/import/delete local data and open privacy/support information.

## Data and accounts

- Core app use requires no account.
- User-created schedule, workout, nutrition and body data are stored locally on device by default.
- The app includes an in-app Delete All Data control.
- Optional encrypted WebDAV-style sync is user-configured and sends encrypted backup data only to the server selected by the user.
- Packaged-food search and barcode lookup send the query/barcode to Open Food Facts for product data.

## Health / fitness calculations

BMI, estimated 1RM, FFMI, lean/fat mass, BMR, calorie targets and recovery scores are educational estimates. The app does not diagnose or treat medical conditions. The Terms of Use state this clearly.

## Camera

Camera access is initiated only after the user taps a barcode/schedule photo action. The camera purpose string should explain these uses. Manual entry remains available.

## Native first-release OCR behavior

The native App Store build intentionally does not download the web Tesseract OCR executable at runtime. Automatic work-schedule OCR should remain disabled until replaced with a bundled/native implementation. Manual monthly schedule review remains functional, and unknown days are never automatically treated as days off.

## Third-party network service

Open Food Facts is used only for food/product data lookup. The application functionality itself is bundled in the binary; it is not downloaded from GitHub/Vercel after installation.

## Background behavior

The first App Store release should use native/local notification APIs only for user-requested reminders. No continuous background tracking is required for core operation.
