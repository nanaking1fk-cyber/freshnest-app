-- Meal Scan was added as a purpose in the app and API, but the original
-- database allow-list did not include it. Expand only the check constraint;
-- existing append-only consent receipts and RLS policies remain unchanged.

alter table public.health_data_consent_events
  drop constraint if exists health_data_consent_allowed_purposes;

alter table public.health_data_consent_events
  add constraint health_data_consent_allowed_purposes
  check (
    purposes <@ array[
      'account_cloud_sync',
      'encrypted_webdav_sync',
      'personalized_ai',
      'meal_scan_ai'
    ]::text[]
  ) not valid;

alter table public.health_data_consent_events
  validate constraint health_data_consent_allowed_purposes;
