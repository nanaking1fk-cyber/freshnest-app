# Work + Workout v20 takeover

## Current release

Version 20.0 is the Cinematic Worker Edition. It adds real licensed moving footage to the landing hero and a 26-second product film while preserving the worker-first story, natural-language Quick Plan, adaptive shift-to-workout scheduling, calendar reminders, Supabase accounts and AI architecture.

## Current architecture

- Frontend: GitHub Pages (`work-gym-planner/`)
- API: Vercel serverless functions (`api/v18/`)
- Database and Auth: Supabase project `work-gym-coach`
- AI: OpenAI Responses API through the Vercel backend

## Production contract

The backend requires the variables listed in `.env.example`. Secrets must be configured only in Vercel and local ignored env files.

The public frontend origin is explicitly allowlisted with `CORS_ORIGINS`.

## Release sequence

1. Validate the pull-request preview deployment.
2. Run config, CORS, unauthenticated, authenticated, persistence, and AI quota checks.
3. Merge the hardening pull request after preview verification.
4. Confirm the production deployment and GitHub Pages frontend integration.

## Known follow-up

- Complete a real-account onboarding and persistence test.
- Add automated API smoke tests and deployment checks.
- Add product analytics and error monitoring before wider launch.
