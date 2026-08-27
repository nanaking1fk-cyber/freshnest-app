-- User-owned tables are inaccessible to anonymous browser sessions.
-- Authenticated access remains column-action specific and RLS-scoped.

revoke all on public.profiles from public,anon;
revoke all on public.user_state from public,anon;
revoke all on public.onboarding_answers from public,anon;
revoke all on public.user_plans from public,anon;
revoke all on public.chat_messages from public,anon;

grant select,insert,update on public.profiles to authenticated;
grant select,insert,update on public.user_state to authenticated;
grant select,insert,update on public.onboarding_answers to authenticated;
grant select,insert,update on public.user_plans to authenticated;
grant select,insert,delete on public.chat_messages to authenticated;
