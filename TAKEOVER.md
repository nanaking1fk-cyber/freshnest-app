# Work + Workout v19 takeover

## Current release

Version 19.0 is the Worker Edition. It adds a premium first-visit landing page, a captioned interactive product film, occupational photography, natural-language Quick Plan, adaptive shift-to-workout scheduling and calendar reminder export while preserving the v18 account, Supabase and AI architecture.

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
