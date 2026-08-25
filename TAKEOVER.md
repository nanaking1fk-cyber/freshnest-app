# Work + Workout v22 takeover

## Current release

Version 22.0 is the Working Lives Edition. Its autoplay hero demonstrates the app throughout a worker's day, while an accessible six-profession carousel shows how the plan adapts for healthcare, construction, transit, hospitality, education and logistics. It preserves the natural-language Quick Plan, adaptive scheduling, reminders, Supabase accounts and AI architecture.

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
