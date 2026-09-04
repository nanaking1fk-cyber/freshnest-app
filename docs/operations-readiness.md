# Operations and support readiness

Owner checklist and runbooks, 3 September 2026. These procedures are prepared,
not a claim that a staffed support service, alerts or disaster recovery is live.
Apple enrollment and subscription activation are separate release gates.

Owner confirmed `info@bibiniifarms.com` as the support and crash-alert contact
on 4 September 2026. This records the approved destination, not proof that
alert delivery is configured or that the mailbox has passed a delivery test.

## Before public launch

Assign a primary and backup responder for account/data incidents, production
deployments, support/privacy requests and provider billing. Record contact
details in a private team directory, not this repository. Confirm access with
MFA and least privilege. Test the published `info@bibiniifarms.com` mailbox by
sending and receiving a message; this audit has not verified that mailbox.

Record the current deployment, database-backup date/retention, recovery targets,
SMTP configuration, provider budget limits and alert recipients in the private
release record. Do not fill evidence gates with intended settings.

## Account or cloud-restore incident

1. Ask privately for account email, app version, approximate time, device/browser
   and the visible error. Never ask for a password, verification/reset link,
   one-time code, session token or unredacted health export.
2. Ask the user not to clear browser storage, reinstall, create a replacement
   account or accept an empty planner as a restore. If accessible, download an
   encrypted backup first. Keep its passphrase separately.
3. Verify identity through the established account process before viewing or
   changing account data. Access should be limited to the responder and scoped
   to the confirmed account. Do not use direct database writes to fake consent.
4. Check the correct email/account and restored privacy choices. A declined
   cloud choice is not proof that the account is empty. Review redacted errors
   and the state revision without copying planner contents to tickets.
5. For conflicts, preserve both versions and have the owner choose. Never
   replace cloud data with a blank local state or blindly retry a stale update.
6. Escalate failed isolation or suspected overwrite immediately. Stop the
   affected write path if necessary using a reviewed, authorized change;
   protect recovery copies. Verify the resolution with the account owner.

## Confirmation, reset and email rate limits

- A confirmed user may land on Sign in when the email is opened in another
  browser. Verify sign-in; do not create another account to fix that screen.
- Request password resets from the browser/app the user will use to open the
  email, then use the newest link. An older or used link can be invalid.
- Honor the displayed cooldown. Do not repeatedly resend as a delivery test.
  Check provider delivery/bounce logs and Auth rate-limit responses without
  retaining the verification link. Separate acceptance, inbox delivery, link
  exchange and successful password change in the test record.
- Verify the actual SMTP sender, verified domain and SPF/DKIM/DMARC with the
  email provider. Do not disable leak protection or remove rate limits to mask
  delivery problems. Sender reputation, recipient-provider filtering and abuse
  controls are operational responsibilities.
- Before release, exercise a real reset on the same browser and installed
  physical app, including an expired link, new-password sign-in and rejection
  of the old password. Mocked browser tests do not prove email delivery.

## Backups and recovery drill

The planner's encrypted download is separate from work-hours/pay CSV exports.
A pay CSV is a readable export, not a full settings/import backup. Cloud sync
is not an independent historical backup. Recovery snapshots remain on-device
and are not included recursively in new downloads or cloud planner state.

Use an isolated sample account/browser. Save an encrypted planner export and
separate hours/pay export; record representative counts/totals privately. In
the isolated browser, restore the planner and compare calendar, food rows,
training and profile. Test a wrong passphrase and storage failure preserve the
existing version. Never run a destructive drill on a customer account.

Separately exercise managed database restoration into an isolated non-production
project, with owner approval, provider encryption/access controls and a disposal
plan. Measure recovery time and acceptable data loss. The local encrypted-file
drill does not prove this server disaster-recovery step. Never overwrite the
production project as a drill. Document provider backup retention accurately.

## Deletion and privacy requests

Direct users to in-app account deletion or the private support email, not a
public issue. Verify identity before manual action. Normal deletion must target
only the signed-in account and be verified by the server; do not report success
when verification fails. After an authorized disposable test, confirm the old
session can no longer access cloud state and linked active records are gone.

Explain active-account deletion separately from legally required retention and
provider backup expiry described in the policy. Never promise instant removal
from every provider backup. Future Apple subscription billing is separately
managed by Apple; account deletion must not be blocked by a subscription.

For access, correction or withdrawal, minimize ticket contents, verify identity,
record receipt/action dates and use a private delivery channel. Have qualified
counsel set applicable regional deadlines and escalation requirements; this
runbook is not legal advice or a substitute for the global privacy review.

## Diagnostics and security incident response

Read private `app_error_reports` and Vercel runtime outcomes by time, release,
route and error group. Distinguish handled API failures, browser crashes and
intentional `ReadinessSmokeError` test events. Do not delete genuine reports to
make the dashboard look clear. Correlate deployment timing and reproduce using
sample data; never paste raw tokens, photos or health payloads into diagnostics.

The collector groups reports and prunes reports older than 90 days when its
recording function runs. That is not a separately verified daily retention job.
Review access and retention behavior regularly. Error diagnostics and optional
aggregate usage counts are different systems; do not add referral, device,
account or health tracking to obtain richer analytics.

For suspected exposure: assign an incident lead, contain the affected access,
preserve restricted evidence, assess impacted data/accounts, rotate compromised
credentials through secure provider controls and involve legal/privacy owners
for notification decisions. Record timeline, remedy and recurrence prevention.
Do not send speculative notices or export customer data without approval.

Native crash delivery still needs a physical TestFlight test. Browser collection
proof does not establish MetricKit/Android crash behavior.

## Release, rollback and cost controls

Follow [release-process.md](release-process.md). Preserve unrelated uncommitted
work; build the exact candidate. Require tests, browser evidence and a review of
data/privacy changes. Verify production is Ready at the intended commit, then
check shell, legal/support routes, unauthorized account access and error rates.

Rollback through the known-good Vercel deployment only after checking schema and
data compatibility. Database changes require a separately reviewed recovery
plan. Do not force-push history or delete user records to undo a release.

Assign provider billing/abuse alerts, monthly and daily AI spend budgets, and a
graceful capacity message. Confirm actual billed photo/text costs against the
allowance; request counts alone do not cap spend. Subscription economics and
purchase flows are intentionally not changed by this audit.

## Support response standards

Choose staffed response targets before advertising them. Acknowledge the issue
in plain language, describe what is known versus still being checked, and give
one safe next action. State estimated nutrition/pay limitations honestly.
Close a ticket only after verifying the result or clearly recording the remaining
owner/provider action. Keep redacted reproduction steps for regression tests.
