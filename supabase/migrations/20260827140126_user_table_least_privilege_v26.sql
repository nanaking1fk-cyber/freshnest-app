-- User-owned tables are inaccessible to anonymous browser sessions.
-- Revoke authenticated defaults before granting the exact operations used by
-- the app. Supabase projects may inherit broad default table privileges, so a
-- grant by itself is additive rather than a least-privilege boundary.

revoke all on public.profiles from public,anon,authenticated;
revoke all on public.user_state from public,anon,authenticated;
revoke all on public.onboarding_answers from public,anon,authenticated;
revoke all on public.user_plans from public,anon,authenticated;
revoke all on public.chat_messages from public,anon,authenticated;

grant select,insert,update on public.profiles to authenticated;
grant select,insert,update on public.user_state to authenticated;
grant select,insert,update on public.onboarding_answers to authenticated;
grant select,insert,update on public.user_plans to authenticated;
grant select,insert,delete on public.chat_messages to authenticated;

-- AI and sync budgets are server-owned. Browser roles must not touch them
-- directly; the Vercel backend calls their narrowly granted RPCs instead.
revoke all on public.ai_usage_daily from public,anon,authenticated;
