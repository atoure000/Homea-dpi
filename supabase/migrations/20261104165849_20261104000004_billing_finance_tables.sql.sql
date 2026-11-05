/*
# Billing & finance tables — HOMEA DPI

1. New Tables
- `invoices` — factures simples (numéro, patient, date, lignes, sous-total, remise, assurance, total, statut, montant payé).
- `billing_docs` — documents de facturation avancés (type: facture/proforma/devis, numéro, patient, épisode, lignes, paiements, historique, validation).
- `billing_catalogue` — catalogue d'actes facturables (code, libellé, catégorie, service, prix standard/assuré/conventionné, taux de couverture).
- `billing_templates` — modèles de documents de facturation (nom, code, type, service, catégorie, lignes, taux de couverture).
- `billing_payments` — paiements liés aux documents de facturation (mode, montant, référence, date).
- `cash_registers` — caisses (nom, emplacement, actif, fond de caisse par défaut).
- `cash_sessions` — sessions de caisse (caisse, ouvreur, ouvert/clôturé, fonds initial, totaux).
- `cash_movements` — mouvements de caisse (session, type, montant, mode, référence, auteur).
- `cash_advances` — avances de caisse (session, montant, bénéficiaire, statut).
- `cash_count_lines` — lignes de comptage de caisse (dénomination, quantité, montant).
- `cash_audit_events` — événements d'audit de caisse (session, type, détail, auteur).
- `cash_settings` — paramètres de caisse (clé-valeur jsonb).
- `insurance_dossiers` — dossiers d'assurance (numéro, document de préfacture, épisode, service, statut, pièces, transmission, historique).
- `insurance_bordereaux` — bordereaux d'assurance (numéro, lignes, statut).
2. Security
- RLS enabled on all tables.
- Grants to `anon, authenticated` (shared non-user-scoped prototype workspace).
- CRUD policies with USING(true)/WITH CHECK(true).
3. Important notes
- Nested arrays/objects stored as jsonb (lines, payments, history, pieces, coverage, transmission).
- Idempotent: IF NOT EXISTS on tables; DROP POLICY IF EXISTS before CREATE POLICY.
*/

-- ── invoices ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invoices (
  id text PRIMARY KEY,
  number varchar(30) NOT NULL UNIQUE,
  patient_id text NOT NULL,
  patient_name varchar(200) NOT NULL,
  date date NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric(14,2) NOT NULL DEFAULT 0,
  discount numeric(14,2) NOT NULL DEFAULT 0,
  insurance_cover numeric(14,2) NOT NULL DEFAULT 0,
  total numeric(14,2) NOT NULL DEFAULT 0,
  status varchar(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending','paid','partial')),
  amount_paid numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO anon, authenticated;
DROP POLICY IF EXISTS "shared_select_invoices" ON public.invoices;
CREATE POLICY "shared_select_invoices" ON public.invoices FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_invoices" ON public.invoices;
CREATE POLICY "shared_insert_invoices" ON public.invoices FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_invoices" ON public.invoices;
CREATE POLICY "shared_update_invoices" ON public.invoices FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_invoices" ON public.invoices;
CREATE POLICY "shared_delete_invoices" ON public.invoices FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_invoices_patient ON public.invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON public.invoices(number);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);

-- ── billing_catalogue ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.billing_catalogue (
  id text PRIMARY KEY,
  code varchar(50) NOT NULL UNIQUE,
  label varchar(300) NOT NULL,
  category varchar(100),
  service varchar(100),
  unit varchar(50),
  standard_price numeric(14,2) NOT NULL DEFAULT 0,
  insured_price numeric(14,2) NOT NULL DEFAULT 0,
  contracted_price numeric(14,2) NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  usually_covered boolean NOT NULL DEFAULT false,
  proposed_rate integer,
  valid_from date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.billing_catalogue ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.billing_catalogue TO anon, authenticated;
DROP POLICY IF EXISTS "shared_select_billing_catalogue" ON public.billing_catalogue;
CREATE POLICY "shared_select_billing_catalogue" ON public.billing_catalogue FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_billing_catalogue" ON public.billing_catalogue;
CREATE POLICY "shared_insert_billing_catalogue" ON public.billing_catalogue FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_billing_catalogue" ON public.billing_catalogue;
CREATE POLICY "shared_update_billing_catalogue" ON public.billing_catalogue FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_billing_catalogue" ON public.billing_catalogue;
CREATE POLICY "shared_delete_billing_catalogue" ON public.billing_catalogue FOR DELETE TO anon, authenticated USING (true);

-- ── billing_docs ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.billing_docs (
  id text PRIMARY KEY,
  type varchar(30) NOT NULL CHECK (type IN ('facture','proforma','devis')),
  number varchar(50) NOT NULL,
  date date NOT NULL,
  patient_id text NOT NULL,
  episode varchar(50),
  service varchar(100),
  insurance varchar(100),
  coverage_rate varchar(10),
  lines jsonb NOT NULL DEFAULT '[]'::jsonb,
  payments jsonb NOT NULL DEFAULT '[]'::jsonb,
  history jsonb NOT NULL DEFAULT '[]'::jsonb,
  status varchar(40) NOT NULL DEFAULT 'brouillon',
  validated_by varchar(150),
  validated_at varchar(30),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.billing_docs ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.billing_docs TO anon, authenticated;
DROP POLICY IF EXISTS "shared_select_billing_docs" ON public.billing_docs;
CREATE POLICY "shared_select_billing_docs" ON public.billing_docs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_billing_docs" ON public.billing_docs;
CREATE POLICY "shared_insert_billing_docs" ON public.billing_docs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_billing_docs" ON public.billing_docs;
CREATE POLICY "shared_update_billing_docs" ON public.billing_docs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_billing_docs" ON public.billing_docs;
CREATE POLICY "shared_delete_billing_docs" ON public.billing_docs FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_billing_docs_patient ON public.billing_docs(patient_id);
CREATE INDEX IF NOT EXISTS idx_billing_docs_number ON public.billing_docs(number);
CREATE INDEX IF NOT EXISTS idx_billing_docs_status ON public.billing_docs(status);

-- ── billing_templates ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.billing_templates (
  id text PRIMARY KEY,
  name varchar(200) NOT NULL,
  code varchar(50) NOT NULL,
  description text,
  doc_type varchar(30) NOT NULL DEFAULT 'all',
  service varchar(100),
  category varchar(100),
  validity_days integer NOT NULL DEFAULT 30,
  active boolean NOT NULL DEFAULT true,
  lines jsonb NOT NULL DEFAULT '[]'::jsonb,
  apply_discount boolean NOT NULL DEFAULT false,
  coverage_type varchar(100),
  proposed_coverage_rate integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.billing_templates ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.billing_templates TO anon, authenticated;
DROP POLICY IF EXISTS "shared_select_billing_templates" ON public.billing_templates;
CREATE POLICY "shared_select_billing_templates" ON public.billing_templates FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_billing_templates" ON public.billing_templates;
CREATE POLICY "shared_insert_billing_templates" ON public.billing_templates FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_billing_templates" ON public.billing_templates;
CREATE POLICY "shared_update_billing_templates" ON public.billing_templates FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_billing_templates" ON public.billing_templates;
CREATE POLICY "shared_delete_billing_templates" ON public.billing_templates FOR DELETE TO anon, authenticated USING (true);

-- ── cash_registers ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cash_registers (
  id text PRIMARY KEY,
  name varchar(200) NOT NULL,
  location varchar(200),
  active boolean NOT NULL DEFAULT true,
  default_float numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_registers TO anon, authenticated;
DROP POLICY IF EXISTS "shared_select_cash_registers" ON public.cash_registers;
CREATE POLICY "shared_select_cash_registers" ON public.cash_registers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_cash_registers" ON public.cash_registers;
CREATE POLICY "shared_insert_cash_registers" ON public.cash_registers FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_cash_registers" ON public.cash_registers;
CREATE POLICY "shared_update_cash_registers" ON public.cash_registers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_cash_registers" ON public.cash_registers;
CREATE POLICY "shared_delete_cash_registers" ON public.cash_registers FOR DELETE TO anon, authenticated USING (true);

-- ── cash_sessions ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cash_sessions (
  id text PRIMARY KEY,
  register_id text NOT NULL,
  opener varchar(150) NOT NULL,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  opening_float numeric(14,2) NOT NULL DEFAULT 0,
  closing_float numeric(14,2),
  status varchar(30) NOT NULL DEFAULT 'ouverte' CHECK (status IN ('ouverte','en-cloture','validee','cloturee','forcee','annulee')),
  approval jsonb,
  totals jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_sessions TO anon, authenticated;
DROP POLICY IF EXISTS "shared_select_cash_sessions" ON public.cash_sessions;
CREATE POLICY "shared_select_cash_sessions" ON public.cash_sessions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_cash_sessions" ON public.cash_sessions;
CREATE POLICY "shared_insert_cash_sessions" ON public.cash_sessions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_cash_sessions" ON public.cash_sessions;
CREATE POLICY "shared_update_cash_sessions" ON public.cash_sessions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_cash_sessions" ON public.cash_sessions;
CREATE POLICY "shared_delete_cash_sessions" ON public.cash_sessions FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_register ON public.cash_sessions(register_id);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_status ON public.cash_sessions(status);

-- ── cash_movements ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cash_movements (
  id text PRIMARY KEY,
  session_id text NOT NULL,
  register_id text NOT NULL,
  kind varchar(40) NOT NULL,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  payment_mode varchar(40),
  payment_state varchar(40),
  reference varchar(100),
  label varchar(300),
  author varchar(150) NOT NULL,
  patient_id text,
  patient_name varchar(200),
  billing_doc_id text,
  reversal_of text,
  reversed boolean NOT NULL DEFAULT false,
  date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_movements TO anon, authenticated;
DROP POLICY IF EXISTS "shared_select_cash_movements" ON public.cash_movements;
CREATE POLICY "shared_select_cash_movements" ON public.cash_movements FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_cash_movements" ON public.cash_movements;
CREATE POLICY "shared_insert_cash_movements" ON public.cash_movements FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_cash_movements" ON public.cash_movements;
CREATE POLICY "shared_update_cash_movements" ON public.cash_movements FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_cash_movements" ON public.cash_movements;
CREATE POLICY "shared_delete_cash_movements" ON public.cash_movements FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_cash_movements_session ON public.cash_movements(session_id);
CREATE INDEX IF NOT EXISTS idx_cash_movements_register ON public.cash_movements(register_id);

-- ── cash_advances ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cash_advances (
  id text PRIMARY KEY,
  session_id text NOT NULL,
  register_id text NOT NULL,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  beneficiary varchar(200) NOT NULL,
  reason varchar(500),
  status varchar(30) NOT NULL DEFAULT 'demandee',
  author varchar(150) NOT NULL,
  date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cash_advances ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_advances TO anon, authenticated;
DROP POLICY IF EXISTS "shared_select_cash_advances" ON public.cash_advances;
CREATE POLICY "shared_select_cash_advances" ON public.cash_advances FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_cash_advances" ON public.cash_advances;
CREATE POLICY "shared_insert_cash_advances" ON public.cash_advances FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_cash_advances" ON public.cash_advances;
CREATE POLICY "shared_update_cash_advances" ON public.cash_advances FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_cash_advances" ON public.cash_advances;
CREATE POLICY "shared_delete_cash_advances" ON public.cash_advances FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_cash_advances_session ON public.cash_advances(session_id);

-- ── cash_count_lines ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cash_count_lines (
  id text PRIMARY KEY,
  session_id text NOT NULL,
  denomination varchar(50) NOT NULL,
  unit_value numeric(14,2) NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 0,
  total numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cash_count_lines ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_count_lines TO anon, authenticated;
DROP POLICY IF EXISTS "shared_select_cash_count_lines" ON public.cash_count_lines;
CREATE POLICY "shared_select_cash_count_lines" ON public.cash_count_lines FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_cash_count_lines" ON public.cash_count_lines;
CREATE POLICY "shared_insert_cash_count_lines" ON public.cash_count_lines FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_cash_count_lines" ON public.cash_count_lines;
CREATE POLICY "shared_update_cash_count_lines" ON public.cash_count_lines FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_cash_count_lines" ON public.cash_count_lines;
CREATE POLICY "shared_delete_cash_count_lines" ON public.cash_count_lines FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_cash_count_lines_session ON public.cash_count_lines(session_id);

-- ── cash_audit_events ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cash_audit_events (
  id text PRIMARY KEY,
  session_id text,
  register_id text,
  type varchar(50) NOT NULL,
  detail varchar(500),
  author varchar(150) NOT NULL,
  date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cash_audit_events ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_audit_events TO anon, authenticated;
DROP POLICY IF EXISTS "shared_select_cash_audit_events" ON public.cash_audit_events;
CREATE POLICY "shared_select_cash_audit_events" ON public.cash_audit_events FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_cash_audit_events" ON public.cash_audit_events;
CREATE POLICY "shared_insert_cash_audit_events" ON public.cash_audit_events FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_cash_audit_events" ON public.cash_audit_events;
CREATE POLICY "shared_update_cash_audit_events" ON public.cash_audit_events FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_cash_audit_events" ON public.cash_audit_events;
CREATE POLICY "shared_delete_cash_audit_events" ON public.cash_audit_events FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_cash_audit_events_session ON public.cash_audit_events(session_id);

-- ── cash_settings ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cash_settings (
  key varchar(100) PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cash_settings ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_settings TO anon, authenticated;
DROP POLICY IF EXISTS "shared_select_cash_settings" ON public.cash_settings;
CREATE POLICY "shared_select_cash_settings" ON public.cash_settings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_cash_settings" ON public.cash_settings;
CREATE POLICY "shared_insert_cash_settings" ON public.cash_settings FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_cash_settings" ON public.cash_settings;
CREATE POLICY "shared_update_cash_settings" ON public.cash_settings FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_cash_settings" ON public.cash_settings;
CREATE POLICY "shared_delete_cash_settings" ON public.cash_settings FOR DELETE TO anon, authenticated USING (true);

-- ── insurance_dossiers ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.insurance_dossiers (
  id text PRIMARY KEY,
  number varchar(50) NOT NULL UNIQUE,
  doc_id text,
  prefacture_ref varchar(50),
  episode_number varchar(50),
  service varchar(100),
  care_period varchar(100),
  status varchar(40) NOT NULL DEFAULT 'nouveau',
  blocking_reason varchar(500),
  responsible varchar(150),
  coverage jsonb NOT NULL DEFAULT '{}'::jsonb,
  pieces jsonb NOT NULL DEFAULT '[]'::jsonb,
  transmission jsonb NOT NULL DEFAULT '{}'::jsonb,
  history jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.insurance_dossiers ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.insurance_dossiers TO anon, authenticated;
DROP POLICY IF EXISTS "shared_select_insurance_dossiers" ON public.insurance_dossiers;
CREATE POLICY "shared_select_insurance_dossiers" ON public.insurance_dossiers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_insurance_dossiers" ON public.insurance_dossiers;
CREATE POLICY "shared_insert_insurance_dossiers" ON public.insurance_dossiers FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_insurance_dossiers" ON public.insurance_dossiers;
CREATE POLICY "shared_update_insurance_dossiers" ON public.insurance_dossiers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_insurance_dossiers" ON public.insurance_dossiers;
CREATE POLICY "shared_delete_insurance_dossiers" ON public.insurance_dossiers FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_insurance_dossiers_number ON public.insurance_dossiers(number);
CREATE INDEX IF NOT EXISTS idx_insurance_dossiers_status ON public.insurance_dossiers(status);

-- ── insurance_bordereaux ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.insurance_bordereaux (
  id text PRIMARY KEY,
  number varchar(50) NOT NULL UNIQUE,
  insurer varchar(100),
  date date NOT NULL,
  lines jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_amount numeric(14,2) NOT NULL DEFAULT 0,
  status varchar(40) NOT NULL DEFAULT 'brouillon',
  history jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.insurance_bordereaux ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.insurance_bordereaux TO anon, authenticated;
DROP POLICY IF EXISTS "shared_select_insurance_bordereaux" ON public.insurance_bordereaux;
CREATE POLICY "shared_select_insurance_bordereaux" ON public.insurance_bordereaux FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_insurance_bordereaux" ON public.insurance_bordereaux;
CREATE POLICY "shared_insert_insurance_bordereaux" ON public.insurance_bordereaux FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_insurance_bordereaux" ON public.insurance_bordereaux;
CREATE POLICY "shared_update_insurance_bordereaux" ON public.insurance_bordereaux FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_insurance_bordereaux" ON public.insurance_bordereaux;
CREATE POLICY "shared_delete_insurance_bordereaux" ON public.insurance_bordereaux FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_insurance_bordereaux_status ON public.insurance_bordereaux(status);
