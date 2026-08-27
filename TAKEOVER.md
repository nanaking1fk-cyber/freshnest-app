# Work + Workout takeover

## Current release

Version 25.1 is the audit-hardening release. It retains the Working Lives story and trusted adaptive scheduling while hardening account isolation, PKCE email flows, same-origin browser dependencies, API rate limits and upstream error handling.

## Current architecture

- Frontend and API: one Vercel origin at `https://www.workandworkout.com/`
- Database and Auth: Supabase project `work-gym-coach`
- AI: OpenAI Responses API through the Vercel backend

## Production contract

The backend requires the variables listed in `.env.example`. Secrets must be configured only in Vercel and local ignored env files.

The API permits only the canonical production origins plus explicit native origins. The browser has no configurable API-host override. User-owned database operations run with the caller JWT so Supabase RLS is the enforcing boundary.

## Release sequence

1. Validate the pull-request preview deployment.
2. Run config, CORS, unauthenticated, authenticated, persistence, and AI quota checks.
3. Merge the hardening pull request after preview verification.
4. Confirm the production deployment and keep GitHub Pages disabled.

## Known follow-up

- Complete a real-account onboarding and persistence test.
- Add automated API smoke tests and deployment checks.
- Add product analytics and error monitoring before wider launch.
