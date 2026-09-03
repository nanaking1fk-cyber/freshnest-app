# Owner usage report

Open the Work + Workout project in Supabase, then Table Editor → app_usage_dashboard.
Only project administrators can access this report; app users and public API keys cannot.

Each row is one UTC day. App opens counts opted-in document launches, and screen visits
counts transitions into Home, Calendar, Training, Nutrition, Progress and Settings.
The individual columns show which parts of the app are used most. Studio can filter
the date range, sort the results and export them.

These are usage counts, not unique people, sessions, retention cohorts or conversions.
Users opt in under More → Help improve the app. Offline requests, failed requests,
people who decline, and Global Privacy Control / Do Not Track users are not counted.
Counts are approximate and are not suitable for billing or security decisions.
There is no backfill of earlier activity.

No Vercel visitor-tracking script is installed. No referral, browser, device, account,
email, health, food, calendar, or free-text data is accepted. The server keeps only
daily metric totals, not individual reports. Hosting still handles ordinary network
metadata to serve requests; this is separate from the analytics report.

The fixed-size collector has no dependencies, batches requests and never blocks the
planner. Authorization headers, cookies and referrers are omitted. All unexpected
payload properties are rejected. Database access is limited to the server role and
project administrators. No new subscription is required.

Apply the aggregate_usage_counts_v45 migration before publishing the collector.
Existing consent version 2026-08-31-v1 still covers the same four health features;
the optional usage switch is independent and does not send a health consent event.
