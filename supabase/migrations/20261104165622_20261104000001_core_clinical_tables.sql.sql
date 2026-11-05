/*
# Core clinical tables — HOMEA DPI

1. New Tables
- `patients` — identité patient (code, nom, naissance, genre, contact, assurance, pièce d'identité, photo).
- `doctors` — praticiens (nom, spécialité, couleur, créneaux, pauses, absences, salle, paramètres de rendez-vous).
- `consultation_rooms` — salles de consultation (nom, étage, équipement).
- `beds` — lits hospitaliers (numéro, salle, département, statut, patient affecté, dates).
- `bed_movements` — mouvements de lits (admission/transfer/décharge).
- `episodes` — venues et séjours (numéro, type, service, praticien, statut administratif et de soins, événements).
- `admissions` — admissions (patient, date/heure, motif, statut, département, lit, médecin, priorité).
- `appointments` — rendez-vous (patient, médecin, date/heure, durée, type, statut, couverture, priorité, historique).
2. Security
- RLS enabled on all tables.
- Grants to `anon, authenticated` (shared non-user-scoped prototype workspace).
- CRUD policies with USING(true)/WITH CHECK(true) — data is intentionally shared/public.
3. Important notes
- Uses text PKs matching the existing frontend IDs (p001, doc001, etc.) to allow seamless import/export.
- Nested arrays/objects stored as jsonb (events, history, breaks, absences, vitals, etc.).
- Idempotent: IF NOT EXISTS on tables; DROP POLICY IF EXISTS before CREATE POLICY.
*/

-- ── patients ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.patients (
  id text PRIMARY KEY,
  code varchar(20) NOT NULL UNIQUE,
  first_name varchar(100) NOT NULL,
  last_name varchar(100) NOT NULL,
  birth_name varchar(100),
  birth_date date NOT NULL,
  gender varchar(1) NOT NULL CHECK (gender IN ('M','F')),
  phone varchar(30),
  address varchar(255),
  chronic_conditions jsonb NOT NULL DEFAULT '[]'::jsonb,
  emergency_contact varchar(150),
  emergency_phone varchar(30),
  insurance varchar(100),
  insurance_number varchar(50),
  cmu_number varchar(50),
  coverage_rate varchar(10),
  id_type varchar(30),
  id_number varchar(100),
  photo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patients TO anon, authenticated;
DROP POLICY IF EXISTS "shared_select_patients" ON public.patients;
CREATE POLICY "shared_select_patients" ON public.patients FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_patients" ON public.patients;
CREATE POLICY "shared_insert_patients" ON public.patients FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_patients" ON public.patients;
CREATE POLICY "shared_update_patients" ON public.patients FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_patients" ON public.patients;
CREATE POLICY "shared_delete_patients" ON public.patients FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_patients_code ON public.patients(code);
CREATE INDEX IF NOT EXISTS idx_patients_name ON public.patients(last_name, first_name);

-- ── doctors ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.doctors (
  id text PRIMARY KEY,
  first_name varchar(100) NOT NULL,
  last_name varchar(100) NOT NULL,
  specialty varchar(100) NOT NULL,
  color varchar(20),
  consultation_days jsonb NOT NULL DEFAULT '[]'::jsonb,
  consultation_start_date date,
  consultation_end_date date,
  start_time varchar(10),
  end_time varchar(10),
  slot_duration integer NOT NULL DEFAULT 30,
  breaks jsonb NOT NULL DEFAULT '[]'::jsonb,
  room_id text,
  absences jsonb NOT NULL DEFAULT '[]'::jsonb,
  unavailabilities jsonb NOT NULL DEFAULT '[]'::jsonb,
  max_per_half_day integer NOT NULL DEFAULT 8,
  allow_urgency boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.doctors TO anon, authenticated;
DROP POLICY IF EXISTS "shared_select_doctors" ON public.doctors;
CREATE POLICY "shared_select_doctors" ON public.doctors FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_doctors" ON public.doctors;
CREATE POLICY "shared_insert_doctors" ON public.doctors FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_doctors" ON public.doctors;
CREATE POLICY "shared_update_doctors" ON public.doctors FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_doctors" ON public.doctors;
CREATE POLICY "shared_delete_doctors" ON public.doctors FOR DELETE TO anon, authenticated USING (true);

-- ── consultation_rooms ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.consultation_rooms (
  id text PRIMARY KEY,
  name varchar(150) NOT NULL,
  floor varchar(50),
  equipment jsonb NOT NULL DEFAULT '[]'::jsonb
);
ALTER TABLE public.consultation_rooms ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consultation_rooms TO anon, authenticated;
DROP POLICY IF EXISTS "shared_select_consultation_rooms" ON public.consultation_rooms;
CREATE POLICY "shared_select_consultation_rooms" ON public.consultation_rooms FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_consultation_rooms" ON public.consultation_rooms;
CREATE POLICY "shared_insert_consultation_rooms" ON public.consultation_rooms FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_consultation_rooms" ON public.consultation_rooms;
CREATE POLICY "shared_update_consultation_rooms" ON public.consultation_rooms FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_consultation_rooms" ON public.consultation_rooms;
CREATE POLICY "shared_delete_consultation_rooms" ON public.consultation_rooms FOR DELETE TO anon, authenticated USING (true);

-- ── beds ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.beds (
  id text PRIMARY KEY,
  number varchar(20) NOT NULL UNIQUE,
  room varchar(50) NOT NULL,
  department varchar(100) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available','occupied','cleaning','reserved')),
  patient_id text,
  admission_date date,
  expected_discharge date,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.beds ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.beds TO anon, authenticated;
DROP POLICY IF EXISTS "shared_select_beds" ON public.beds;
CREATE POLICY "shared_select_beds" ON public.beds FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_beds" ON public.beds;
CREATE POLICY "shared_insert_beds" ON public.beds FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_beds" ON public.beds;
CREATE POLICY "shared_update_beds" ON public.beds FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_beds" ON public.beds;
CREATE POLICY "shared_delete_beds" ON public.beds FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_beds_status ON public.beds(status);
CREATE INDEX IF NOT EXISTS idx_beds_department ON public.beds(department);

-- ── bed_movements ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bed_movements (
  id text PRIMARY KEY,
  patient_id text NOT NULL,
  patient_name varchar(200) NOT NULL,
  from_bed varchar(20),
  to_bed varchar(20) NOT NULL,
  date date NOT NULL,
  time varchar(10) NOT NULL,
  reason varchar(500),
  type varchar(20) NOT NULL CHECK (type IN ('admission','transfer','discharge')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.bed_movements ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bed_movements TO anon, authenticated;
DROP POLICY IF EXISTS "shared_select_bed_movements" ON public.bed_movements;
CREATE POLICY "shared_select_bed_movements" ON public.bed_movements FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_bed_movements" ON public.bed_movements;
CREATE POLICY "shared_insert_bed_movements" ON public.bed_movements FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_bed_movements" ON public.bed_movements;
CREATE POLICY "shared_update_bed_movements" ON public.bed_movements FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_bed_movements" ON public.bed_movements;
CREATE POLICY "shared_delete_bed_movements" ON public.bed_movements FOR DELETE TO anon, authenticated USING (true);

-- ── episodes ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.episodes (
  id text PRIMARY KEY,
  patient_id text NOT NULL,
  episode_number varchar(30) NOT NULL UNIQUE,
  type varchar(30) NOT NULL CHECK (type IN ('consultation','examens','hospitalisation')),
  service_id varchar(100) NOT NULL,
  practitioner_id text,
  appointment_id text,
  admitted_at varchar(30) NOT NULL,
  closed_at varchar(30),
  status varchar(20) NOT NULL DEFAULT 'actif' CHECK (status IN ('actif','clos','annule')),
  administrative_status varchar(50) NOT NULL DEFAULT 'formalites-en-cours',
  care_status varchar(20) NOT NULL DEFAULT 'en-attente' CHECK (care_status IN ('en-attente','en-cours','termine')),
  admission_reason varchar(500),
  created_by varchar(100),
  cancellation_reason varchar(500),
  bed_id text,
  bed_pending boolean NOT NULL DEFAULT false,
  exam_categories jsonb NOT NULL DEFAULT '[]'::jsonb,
  exam_prescription_origin varchar(20),
  exam_prescriber varchar(150),
  consultation_type varchar(20),
  events jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.episodes TO anon, authenticated;
DROP POLICY IF EXISTS "shared_select_episodes" ON public.episodes;
CREATE POLICY "shared_select_episodes" ON public.episodes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_episodes" ON public.episodes;
CREATE POLICY "shared_insert_episodes" ON public.episodes FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_episodes" ON public.episodes;
CREATE POLICY "shared_update_episodes" ON public.episodes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_episodes" ON public.episodes;
CREATE POLICY "shared_delete_episodes" ON public.episodes FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_episodes_patient ON public.episodes(patient_id);
CREATE INDEX IF NOT EXISTS idx_episodes_status ON public.episodes(status);

-- ── admissions ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admissions (
  id text PRIMARY KEY,
  patient_id text NOT NULL,
  date date NOT NULL,
  time varchar(10) NOT NULL,
  reason varchar(500) NOT NULL,
  status varchar(30) NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','admitted','in-consultation','discharged')),
  department varchar(100),
  bed_number varchar(20),
  assigned_doctor varchar(150),
  priority varchar(20) NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal','urgent','critical')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admissions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admissions TO anon, authenticated;
DROP POLICY IF EXISTS "shared_select_admissions" ON public.admissions;
CREATE POLICY "shared_select_admissions" ON public.admissions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_admissions" ON public.admissions;
CREATE POLICY "shared_insert_admissions" ON public.admissions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_admissions" ON public.admissions;
CREATE POLICY "shared_update_admissions" ON public.admissions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_admissions" ON public.admissions;
CREATE POLICY "shared_delete_admissions" ON public.admissions FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_admissions_patient ON public.admissions(patient_id);
CREATE INDEX IF NOT EXISTS idx_admissions_date ON public.admissions(date);
CREATE INDEX IF NOT EXISTS idx_admissions_status ON public.admissions(status);

-- ── appointments ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.appointments (
  id text PRIMARY KEY,
  patient_id text NOT NULL,
  doctor_id text NOT NULL,
  date date NOT NULL,
  time varchar(10) NOT NULL,
  duration integer NOT NULL DEFAULT 30,
  type varchar(20) NOT NULL CHECK (type IN ('first','follow-up','urgent','teleconsult','walk-in')),
  reason varchar(500),
  room_id text,
  status varchar(30) NOT NULL DEFAULT 'planned',
  coverage varchar(20) NOT NULL DEFAULT 'particular' CHECK (coverage IN ('particular','insurance','mutual')),
  priority varchar(20) NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal','medical')),
  comment text,
  confirmation_channel varchar(20),
  arrival_time varchar(10),
  is_late boolean NOT NULL DEFAULT false,
  late_reason varchar(255),
  history jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO anon, authenticated;
DROP POLICY IF EXISTS "shared_select_appointments" ON public.appointments;
CREATE POLICY "shared_select_appointments" ON public.appointments FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_appointments" ON public.appointments;
CREATE POLICY "shared_insert_appointments" ON public.appointments FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_appointments" ON public.appointments;
CREATE POLICY "shared_update_appointments" ON public.appointments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_appointments" ON public.appointments;
CREATE POLICY "shared_delete_appointments" ON public.appointments FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON public.appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(date);
