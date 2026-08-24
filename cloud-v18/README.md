# Work + Gym Coach v18 cloud setup

The client is local-first but v18 supports authenticated accounts, account migration, cross-device restore, AI onboarding and multimodal AI Coach.

## Required services

1. Supabase project for Auth + Postgres.
2. Vercel (or another Node serverless host) for `/api/v18/*`.
3. OpenAI API key for AI onboarding/chat/equipment-photo understanding.

## Supabase

Run `cloud-v18/schema.sql` in the project SQL editor. Enable email/password authentication. For production, configure the Site URL / redirect URLs for the web app and iOS deep-link strategy. The schema enables RLS on user-owned data; the server-side service role is used only by authenticated API routes.

## Server environment variables

Set these only on the server; never commit their values:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` (or compatible publishable key)
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `OPENAI_MODEL` / `OPENAI_COACH_MODEL` / `OPENAI_PLAN_MODEL` (optional overrides)
- `AI_DAILY_LIMIT` (optional; defaults to 40 requests/user/day)

The browser/native client obtains only the Supabase URL + public/anon key from `/api/v18/config`. Service-role and OpenAI keys never ship in the client.

## Existing-user migration

After account creation/sign-in, `accounts-v18.js` offers **Migrate this device**. The account-security layer serializes `wgp-v15-*` planner records while excluding old WebDAV/private-sync credentials, then PUTs the payload to `/api/v18/state`. On another device, **Restore from account** downloads that user's state. A local recovery snapshot is created before cloud restore.

## AI

`POST /api/v18/onboarding` accepts onboarding answers plus the deterministic availability/nutrition plan. The deterministic planner owns hard schedule constraints; AI refines explanations and familiar-food meal ideas.

`POST /api/v18/coach` accepts text and an optional resized image data URL. The endpoint verifies the Supabase bearer token, enforces a daily request limit, sends only relevant context to OpenAI, and stores text conversation rows. Equipment image bytes are not written to the chat table.

## Account deletion

`DELETE /api/v18/account` verifies the user's session and deletes the Supabase auth user. Foreign-key cascades remove cloud planner state, plans and chat rows. This supports the in-app account deletion requirement for a commercial iOS app.

## Web / GitHub Pages

GitHub Pages cannot securely host the API. Once the Vercel backend is deployed, set `wgc-v18-vercel-api` in the web client's local storage to the full backend prefix (for example `https://APP.vercel.app/api/v18`) during testing. For production, bake the production API base into the client/native build instead of asking users to configure it.

## iOS

The App Store builder in `app-store/scripts/build-web.mjs` includes the v18 account, onboarding, exercise-library, AI Coach, nutrition-plan and training-guide modules. Set `WGC_API_BASE=https://YOUR_BACKEND/api/v18` before `npm run ios:sync` so the native bundle knows the production API endpoint.
