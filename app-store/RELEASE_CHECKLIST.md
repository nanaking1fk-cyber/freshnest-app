# Store release checklist

## Automated package checks

- [ ] Root `npm test` passes.
- [ ] `npm run build:web` passes in `app-store/`.
- [ ] Native bundle audit reports v30.1.9 and no secrets/remote executable scripts.
- [ ] iOS and Android projects are synced from the same `www/` bundle.

## iPhone/iPad device test

- [ ] Cold launch and safe areas work on a notched iPhone.
- [ ] Landing, signup, email confirmation, sign-in and sign-out work.
- [ ] New account starts empty and never sees another user’s profile/schedule.
- [ ] Six-step onboarding fits the viewport and can be completed or deferred.
- [ ] Schedule photo/PDF/text import shows proposals before save.
- [ ] Recurrences, overnights, conflicts and exceptions behave correctly.
- [ ] Training, nutrition, coach and progress flows save and restore.
- [ ] Notifications, file sharing, camera denial and external OAuth browser work.
- [ ] Permanent account deletion works and returns to signed-out landing.

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
