# Work + Workout

A schedule-aware fitness, nutrition and recovery coach designed for people whose real life does not fit a generic Monday-Friday workout plan.

## v22 Working Lives Edition

- **Worker-first story:** a premium, auto-advancing carousel gives healthcare, construction, transit, hospitality, education and logistics equal prominence, with job-specific planning benefits and manual/swipe controls.
- **Autoplay product demonstration:** the hero continuously follows a demanding day from pre-shift planning through a late-shift adjustment, gym logging, meal logging and Progressive Coach guidance. Real footage and the Work + Workout interface stay visible together; there is no separate film modal.
- **Quick Plan:** users can type or dictate ordinary language such as “work Tuesday 7–7, meal prep Sunday at 4, dentist tomorrow at 3.” The app previews and adds shifts, workouts, meals, appointments and tasks in one pass.
- **Adaptive calendar:** newly captured work shifts block unavailable time and immediately influence workout placement; personal calendar items remain in the agenda.
- **Useful reminders:** each captured item can include an alert, with an `.ics` calendar export for device-level reminders.
- **Occupational visuals:** the landing page and app feature people in scrubs, road-safety gear, transit uniform, chef whites, education and logistics settings so the experience visibly reflects working people.

Licensed footage sources and usage notes are recorded in `VIDEO_SOURCES.md`.

## Product architecture

- **Local-first planner:** existing v15-v17 planner data continues to work on-device.
- **Accounts & migration:** Supabase Auth + Postgres. A signed-in user can migrate all current planner records to their account and restore them on another device. Private legacy WebDAV credentials are excluded.
- **Personalized onboarding:** asks about goals, body data, sleep, work days/times, commute, a second job, recurring outings/commitments, training preferences/equipment, food preferences, cuisines, restrictions, budget and cooking habits.
- **Deterministic availability engine:** work, commute, sleep and commitments are blocked first; workout windows are selected only from remaining time. AI can explain/refine the plan but cannot override hard availability.
- **Nutrition:** estimates BMR/TDEE, calorie/protein/fat/fiber targets and generates practical meal ideas centered on foods/cuisines the user already knows.
- **Workout library:** searchable technique guides, common mistakes, equipment and demonstration links; training cards link to the library.
- **AI Coach:** authenticated server-side OpenAI Responses API endpoint for plan questions and multimodal gym-equipment photo guidance. API keys never ship in the client.
- **Account deletion:** available in-app and deletes the Supabase Auth user; database rows cascade.

## Cloud setup

1. Create a Supabase project, run `cloud-v18/schema.sql`, then apply the ordered files in `supabase/migrations/`.
2. In Supabase Auth, enable Email/Password, leaked-password protection, and a minimum password policy. Set the Site URL and exact web redirect to `https://www.workandworkout.com/`; add only explicit native deep links that are actually shipped. Confirmation and recovery use PKCE and must finish in the browser where they started.
3. Deploy this repository to Vercel and set server environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server only)
   - `OPENAI_API_KEY` (server only)
   - `OPENAI_MODEL` / `OPENAI_COACH_MODEL` / `OPENAI_PLAN_MODEL` optional; defaults use `gpt-5.6-terra` in the current source
   - `AI_DAILY_LIMIT` optional; defaults to 40 requests/user/day
   - `STATE_DAILY_WRITE_LIMIT` optional; defaults to 300 account-sync writes/user/day
   - `STATE_DAILY_BYTE_LIMIT` optional; defaults to 256 MB of account-sync data/user/day
4. Serve the web product only from Vercel at `https://www.workandworkout.com/`. GitHub Pages is intentionally unsupported and should remain disabled; the client will not send bearer tokens to a configurable API origin.
5. For the native apps, use the canonical `app-store/` package. Run `npm install` and `npm run native:sync`, then open iOS with `npm run ios:open` or Android with `npm run android:open`. The signed-in API origin is fixed to `https://www.workandworkout.com`; no secret or configurable bearer-token destination is bundled.

## Security notes

- Supabase service-role and OpenAI keys belong only in server environment variables.
- The public Supabase anon/publishable key is intentionally returned by `/api/v18/config`. User-owned reads and writes forward the caller JWT to Supabase, so Row Level Security is the enforcing boundary; the service role is reserved for counters and administrative account deletion.
- AI requests and state writes are authenticated and rate-limited. Equipment images are sent to the AI endpoint for the current answer but are not stored in `chat_messages` by the app API.
- Browser-executed PDF, OCR and barcode libraries are pinned in `work-gym-planner-v16/vendor/` and served from the same origin. Their versions, checksums and licenses are recorded beside the files.
- Treat nutrition and training outputs as educational planning, not medical diagnosis or treatment.

## Apple App Store and Google Play readiness

The canonical native package is in `app-store/`, including checked-in Xcode and Android Studio projects, native capabilities, store metadata and a release checklist. Privacy, support, terms and public account-deletion instructions are in `work-gym-planner/`. Before submission, test account creation/confirmation/password reset, migration/restore, account deletion, schedule import review, AI image analysis, offline launch, notifications, file sharing and all camera permission flows on physical iPhone and Android devices.
