# App Store privacy worksheet

Use this as a preparation worksheet only. The final App Store Connect answers must match the exact shipping binary and Apple's then-current definitions.

## Developer-operated collection

Current intended shipping model:

- no account required
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
The current product can import health/recovery data from a user-selected file. Processing is intended to occur locally. If direct HealthKit integration is added later, update the privacy policy, App Store privacy answers, permissions and review notes before shipping that update.

## Account deletion
The current version has no product account creation. If a future version adds user accounts, add in-app account deletion before submission and update this worksheet.

## Checklist before answering App Store Connect

- confirm no analytics/crash SDK was added
- confirm no advertising SDK was added
- inspect all third-party SDK privacy manifests
- confirm exact data sent to Open Food Facts
- decide whether Apple's current disclosure definitions require the food-search/barcode data category to be declared
- confirm optional private-sync semantics
- verify support provider behavior
- verify camera/photo purpose strings
- update the hosted privacy policy if the shipping build differs from this worksheet
