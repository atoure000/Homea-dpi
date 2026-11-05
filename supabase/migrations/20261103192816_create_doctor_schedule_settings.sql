/*
# Create doctor schedule settings

1. New Tables
- `doctor_schedule_settings` stores the planning configuration for each doctor.
- `doctor_id` identifies the doctor from the application catalogue.
- `settings` stores the doctor planning overrides as JSON data.
- `updated_at` records the last save time.
2. Security
- Row level security is enabled.
- This prototype has a shared, non-user-scoped workspace, so anon and authenticated roles may read and manage these settings.
- CRUD grants and separate policies are provided for the Data API.
3. Important notes
- Existing appointment and doctor data is not modified.
- The JSON payload is limited by the application to planning fields only.
*/

CREATE TABLE IF NOT EXISTS public.doctor_schedule_settings (
  doctor_id text PRIMARY KEY,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.doctor_schedule_settings ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.doctor_schedule_settings TO anon, authenticated;

DROP POLICY IF EXISTS "shared_select_doctor_schedule_settings" ON public.doctor_schedule_settings;
CREATE POLICY "shared_select_doctor_schedule_settings" ON public.doctor_schedule_settings
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "shared_insert_doctor_schedule_settings" ON public.doctor_schedule_settings;
CREATE POLICY "shared_insert_doctor_schedule_settings" ON public.doctor_schedule_settings
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "shared_update_doctor_schedule_settings" ON public.doctor_schedule_settings;
CREATE POLICY "shared_update_doctor_schedule_settings" ON public.doctor_schedule_settings
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "shared_delete_doctor_schedule_settings" ON public.doctor_schedule_settings;
CREATE POLICY "shared_delete_doctor_schedule_settings" ON public.doctor_schedule_settings
  FOR DELETE TO anon, authenticated USING (true);