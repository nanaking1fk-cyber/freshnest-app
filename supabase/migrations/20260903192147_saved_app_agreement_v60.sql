-- Additive: existing health-data grants remain valid and are never backfilled
-- as terms acceptance. The user explicitly acknowledges terms once in-app.
alter table public.health_data_consent_events
  add column if not exists app_agreement jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname='health_consent_app_agreement_shape' and conrelid='public.health_data_consent_events'::regclass) then
    alter table public.health_data_consent_events
      add constraint health_consent_app_agreement_shape check (
        app_agreement is null or (
          jsonb_typeof(app_agreement)='object'
          and app_agreement ?& array['termsVersion','privacyVersion','acceptedAt','statement']
          and jsonb_typeof(app_agreement->'termsVersion')='string'
          and jsonb_typeof(app_agreement->'privacyVersion')='string'
          and jsonb_typeof(app_agreement->'acceptedAt')='string'
          and jsonb_typeof(app_agreement->'statement')='string'
        )
      );
  end if;
end $$;

comment on column public.health_data_consent_events.app_agreement is
  'Separate terms acceptance and privacy acknowledgment: versions, statement and original server timestamp. Retained when optional consent is withdrawn. Existing owner-only RLS and account-deletion cascade apply.';
