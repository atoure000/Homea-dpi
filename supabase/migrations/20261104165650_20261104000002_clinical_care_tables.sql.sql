/*
# Clinical care tables — HOMEA DPI

1. New Tables
- `consultations` — consultations médicales (patient, date/heure, médecin, motif, histoire, examen, diagnostic, notes, signes vitaux, signature).
- `consultation_form_definitions` — formulaires de consultation (général, gynéco, obstétrical) avec sections, champs et tables répétées.
- `consultation_form_values` — valeurs saisies pour les formulaires de consultation.
- `prescriptions` — prescriptions médicales avec médicaments (jsonb), statut, notes.
- `nursing_care` — soins infirmiers (patient, date/heure, infirmier, type, description, signes vitaux, signature).
- `lab_orders` — ordonnances de laboratoire (patient, date, médecin, tests en jsonb, statut, priorité).
2. Security
- RLS enabled on all tables.
- Grants to `anon, authenticated` (shared non-user-scoped prototype workspace).
- CRUD policies with USING(true)/WITH CHECK(true) — data is intentionally shared/public.
3. Important notes
- Uses text PKs matching the existing frontend IDs.
- Vitals stored as jsonb (nested object).
- Medications/tests stored as jsonb arrays.
- Idempotent: IF NOT EXISTS on tables; DROP POLICY IF EXISTS before CREATE POLICY.
*/

-- ── consultations ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.consultations (
  id text PRIMARY KEY,
  patient_id text NOT NULL,
  date date NOT NULL,
  time varchar(10) NOT NULL,
  doctor varchar(150) NOT NULL,
  chief_complaint varchar(500),
  history text,
  examination text,
  diagnosis text,
  notes text,
  status varchar(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in-progress','completed')),
  vitals jsonb,
  signature boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consultations TO anon, authenticated;
DROP POLICY IF EXISTS "shared_select_consultations" ON public.consultations;
CREATE POLICY "shared_select_consultations" ON public.consultations FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_consultations" ON public.consultations;
CREATE POLICY "shared_insert_consultations" ON public.consultations FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_consultations" ON public.consultations;
CREATE POLICY "shared_update_consultations" ON public.consultations FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_consultations" ON public.consultations;
CREATE POLICY "shared_delete_consultations" ON public.consultations FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_consultations_patient ON public.consultations(patient_id);
CREATE INDEX IF NOT EXISTS idx_consultations_date ON public.consultations(date);

-- ── consultation_form_definitions ─────────────────────────
CREATE TABLE IF NOT EXISTS public.consultation_form_definitions (
  id varchar(30) PRIMARY KEY,
  name varchar(150) NOT NULL,
  description text,
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  repeat_tables jsonb NOT NULL DEFAULT '[]'::jsonb
);
ALTER TABLE public.consultation_form_definitions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consultation_form_definitions TO anon, authenticated;
DROP POLICY IF EXISTS "shared_select_consultation_form_definitions" ON public.consultation_form_definitions;
CREATE POLICY "shared_select_consultation_form_definitions" ON public.consultation_form_definitions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_consultation_form_definitions" ON public.consultation_form_definitions;
CREATE POLICY "shared_insert_consultation_form_definitions" ON public.consultation_form_definitions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_consultation_form_definitions" ON public.consultation_form_definitions;
CREATE POLICY "shared_update_consultation_form_definitions" ON public.consultation_form_definitions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_consultation_form_definitions" ON public.consultation_form_definitions;
CREATE POLICY "shared_delete_consultation_form_definitions" ON public.consultation_form_definitions FOR DELETE TO anon, authenticated USING (true);

-- ── consultation_form_values ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.consultation_form_values (
  id text PRIMARY KEY,
  form_type varchar(30) NOT NULL,
  patient_id text,
  episode_id text,
  values jsonb NOT NULL DEFAULT '{}'::jsonb,
  rows jsonb NOT NULL DEFAULT '{}'::jsonb,
  status varchar(20) NOT NULL DEFAULT 'draft',
  created_by varchar(100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.consultation_form_values ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consultation_form_values TO anon, authenticated;
DROP POLICY IF EXISTS "shared_select_consultation_form_values" ON public.consultation_form_values;
CREATE POLICY "shared_select_consultation_form_values" ON public.consultation_form_values FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_consultation_form_values" ON public.consultation_form_values;
CREATE POLICY "shared_insert_consultation_form_values" ON public.consultation_form_values FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_consultation_form_values" ON public.consultation_form_values;
CREATE POLICY "shared_update_consultation_form_values" ON public.consultation_form_values FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_consultation_form_values" ON public.consultation_form_values;
CREATE POLICY "shared_delete_consultation_form_values" ON public.consultation_form_values FOR DELETE TO anon, authenticated USING (true);

-- ── prescriptions ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.prescriptions (
  id text PRIMARY KEY,
  patient_id text NOT NULL,
  date date NOT NULL,
  doctor varchar(150) NOT NULL,
  medications jsonb NOT NULL DEFAULT '[]'::jsonb,
  status varchar(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','dispensed','cancelled')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prescriptions TO anon, authenticated;
DROP POLICY IF EXISTS "shared_select_prescriptions" ON public.prescriptions;
CREATE POLICY "shared_select_prescriptions" ON public.prescriptions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_prescriptions" ON public.prescriptions;
CREATE POLICY "shared_insert_prescriptions" ON public.prescriptions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_prescriptions" ON public.prescriptions;
CREATE POLICY "shared_update_prescriptions" ON public.prescriptions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_prescriptions" ON public.prescriptions;
CREATE POLICY "shared_delete_prescriptions" ON public.prescriptions FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON public.prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_date ON public.prescriptions(date);

-- ── nursing_care ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.nursing_care (
  id text PRIMARY KEY,
  patient_id text NOT NULL,
  date date NOT NULL,
  time varchar(10) NOT NULL,
  nurse varchar(150) NOT NULL,
  care_type varchar(100) NOT NULL,
  description text,
  vitals jsonb,
  signature boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.nursing_care ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nursing_care TO anon, authenticated;
DROP POLICY IF EXISTS "shared_select_nursing_care" ON public.nursing_care;
CREATE POLICY "shared_select_nursing_care" ON public.nursing_care FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_nursing_care" ON public.nursing_care;
CREATE POLICY "shared_insert_nursing_care" ON public.nursing_care FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_nursing_care" ON public.nursing_care;
CREATE POLICY "shared_update_nursing_care" ON public.nursing_care FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_nursing_care" ON public.nursing_care;
CREATE POLICY "shared_delete_nursing_care" ON public.nursing_care FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_nursing_care_patient ON public.nursing_care(patient_id);
CREATE INDEX IF NOT EXISTS idx_nursing_care_date ON public.nursing_care(date);

-- ── lab_orders ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lab_orders (
  id text PRIMARY KEY,
  patient_id text NOT NULL,
  date date NOT NULL,
  doctor varchar(150) NOT NULL,
  tests jsonb NOT NULL DEFAULT '[]'::jsonb,
  status varchar(20) NOT NULL DEFAULT 'ordered' CHECK (status IN ('ordered','in-progress','completed')),
  priority varchar(20) NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal','urgent')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lab_orders ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_orders TO anon, authenticated;
DROP POLICY IF EXISTS "shared_select_lab_orders" ON public.lab_orders;
CREATE POLICY "shared_select_lab_orders" ON public.lab_orders FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_lab_orders" ON public.lab_orders;
CREATE POLICY "shared_insert_lab_orders" ON public.lab_orders FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_lab_orders" ON public.lab_orders;
CREATE POLICY "shared_update_lab_orders" ON public.lab_orders FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_lab_orders" ON public.lab_orders;
CREATE POLICY "shared_delete_lab_orders" ON public.lab_orders FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_lab_orders_patient ON public.lab_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_date ON public.lab_orders(date);
