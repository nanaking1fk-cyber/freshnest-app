# App Store privacy worksheet

Use this as a preparation worksheet only. The final App Store Connect answers must match the exact shipping binary and Apple's then-current definitions.

## Developer-operated collection

Current intended shipping model:

- account sign-in is available and account-scoped cloud features are optional
- no developer-operated analytics SDK
- no advertising SDK
- no sale of personal information
- workout, schedule, nutrition, body-stat and recovery data stored locally by default

## Data transmitted off device by optional/user-initiated features

### Open Food Facts
When the user searches packaged foods or looks up a barcode, the search text or barcode is sent to Open Food Facts to retrieve product information. No workout/body profile is intentionally attached to that request by the app.

### User-configured private sync
If the user configures WebDAV/Nextcloud-style sync, encrypted backup data is transmitted to the server URL selected by that user. The developer does not operate that server in the default product model.

### Support
If the user voluntarily opens the external support issue tracker, information they submit there is governed by that service's privacy terms.

## Camera / photos
Camera or photo access occurs only after an explicit scan/import action. The shipping purpose strings must clearly explain barcode and work-schedule use.

## Health information
The iOS app can request read-only access to Apple Health Step Count after the user explicitly connects it. It reads an aggregated daily step total when the app opens, refreshes or returns to the foreground. It does not write HealthKit data, request location for this feature or use HealthKit data for advertising. The daily total is stored locally in the existing health diary and is transmitted only if the user separately enables an account sync or personalized AI path that includes health context. User-selected Apple Health export and CSV files continue to be processed locally.

## Account deletion
The app includes in-app permanent account deletion and public deletion instructions. Account deletion removes the authentication user and associated account-scoped cloud records; local device records can be removed separately through the app’s data controls.

## Checklist before answering App Store Connect

- confirm no analytics/crash SDK was added
- confirm no advertising SDK was added
- inspect all third-party SDK privacy manifests
- confirm exact data sent to Open Food Facts
- decide whether Apple's current disclosure definitions require the food-search/barcode data category to be declared
- confirm optional private-sync semantics
- verify support provider behavior
- verify camera/photo purpose strings
- verify the HealthKit entitlement, Step Count read-only purpose string and connect/disconnect flow
- update the hosted privacy policy if the shipping build differs from this worksheet
