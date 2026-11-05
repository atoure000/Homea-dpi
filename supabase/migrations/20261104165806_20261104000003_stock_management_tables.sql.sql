/*
# Stock management tables — HOMEA DPI

1. New Tables
- `suppliers` — fournisseurs (nom, contact, téléphone, email, adresse, domaines, délai de livraison, actif).
- `stock_items` — articles de stock pharmacie et laboratoire (code, nom, catégorie, unités, stocks, seuils, prix, conditions de stockage, compatibilité automate).
- `stock_lots` — lots de stock (article, numéro de lot, dates, quantités, blocage, réception).
- `stock_movements` — mouvements de stock (type, article, lot, quantité, origine, destination, auteur, stock avant/après).
- `stock_need_expressions` — expressions de besoin (domaine, numéro, service, période, urgence, articles, statut, historique).
- `stock_quotations` — devis (domaine, numéro, fournisseur, date, validité, statut, articles, historique).
- `stock_receptions` — réceptions de marchandises (domaine, numéro, bon de livraison, décision, articles, historique).
- `stock_alerts` — alertes de stock (domaine, type, niveau, article, lot, cause, statut, historique).
- `pharmacy_medication_stock` — stock médicaments (legacy: nom, catégorie, unité, stock, prix, expiration, lot).
- `pharmacy_dispensing_records` — dispensations pharmacie (patient, date, médicaments, coût, prescription, statut).
- `nominal_dispensings` — dispensations nominatives (patient, prescription, article, lot, quantité, statut).
- `service_dotations` — dotations de service (service, article, lot, quantités, statut, accusé de réception).
- `product_returns` — retours produits (origine, article, lot, quantité, raison, décision, date).
- `lab_automates` — automates de laboratoire (nom, catégorie, actif).
- `automate_consumptions` — consommations automate (automate, réactif, lot, dates, tests, contrôles, calibrations, pertes).
- `lab_reconciliations` — réconciliations laboratoire (automate, réactif, lot, tests théoriques/réels, écarts, classification).
- `inventories` — inventaires (domaine, numéro, type, date, entrées, validateur, statut).
- `patient_extras` — données extra patient (formulaires, imagerie, documents).
2. Security
- RLS enabled on all tables.
- Grants to `anon, authenticated` (shared non-user-scoped prototype workspace).
- CRUD policies with USING(true)/WITH CHECK(true).
3. Important notes
- stock_items unifies both pharmacy and lab domains via a `domain` column ('pharmacy' | 'lab').
- Nested arrays/objects stored as jsonb (items, history, pieces, entries, etc.).
- Idempotent: IF NOT EXISTS on tables; DROP POLICY IF EXISTS before CREATE POLICY.
*/

-- ── suppliers ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.suppliers (
  id text PRIMARY KEY,
  name varchar(200) NOT NULL,
  contact varchar(150),
  phone varchar(30),
  email varchar(100),
  address varchar(255),
  domains jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  delivery_delay integer NOT NULL DEFAULT 0
);
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO anon, authenticated;
DROP POLICY IF EXISTS "shared_select_suppliers" ON public.suppliers;
CREATE POLICY "shared_select_suppliers" ON public.suppliers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_suppliers" ON public.suppliers;
CREATE POLICY "shared_insert_suppliers" ON public.suppliers FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_suppliers" ON public.suppliers;
CREATE POLICY "shared_update_suppliers" ON public.suppliers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_suppliers" ON public.suppliers;
CREATE POLICY "shared_delete_suppliers" ON public.suppliers FOR DELETE TO anon, authenticated USING (true);

-- ── stock_items ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.stock_items (
  id text PRIMARY KEY,
  domain varchar(20) NOT NULL CHECK (domain IN ('pharmacy','lab')),
  code varchar(50) NOT NULL,
  name varchar(200) NOT NULL,
  category varchar(100) NOT NULL,
  unit_management varchar(50),
  unit_dispensing varchar(50),
  conversion_factor numeric(12,4) NOT NULL DEFAULT 1,
  location varchar(100),
  supplier_id text,
  available_stock numeric(12,2) NOT NULL DEFAULT 0,
  reserved_stock numeric(12,2) NOT NULL DEFAULT 0,
  quarantine_stock numeric(12,2) NOT NULL DEFAULT 0,
  ordered_qty numeric(12,2) NOT NULL DEFAULT 0,
  min_stock numeric(12,2) NOT NULL DEFAULT 0,
  max_stock numeric(12,2) NOT NULL DEFAULT 0,
  reorder_point numeric(12,2) NOT NULL DEFAULT 0,
  avg_consumption numeric(12,2) NOT NULL DEFAULT 0,
  last_price numeric(14,2) NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  automate_compatible varchar(200),
  method varchar(200),
  theoretical_tests integer,
  storage_conditions varchar(100),
  thermo_sensitive boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_items TO anon, authenticated;
DROP POLICY IF EXISTS "shared_select_stock_items" ON public.stock_items;
CREATE POLICY "shared_select_stock_items" ON public.stock_items FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_stock_items" ON public.stock_items;
CREATE POLICY "shared_insert_stock_items" ON public.stock_items FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_stock_items" ON public.stock_items;
CREATE POLICY "shared_update_stock_items" ON public.stock_items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_stock_items" ON public.stock_items;
CREATE POLICY "shared_delete_stock_items" ON public.stock_items FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_stock_items_domain ON public.stock_items(domain);
CREATE INDEX IF NOT EXISTS idx_stock_items_code ON public.stock_items(code);
CREATE INDEX IF NOT EXISTS idx_stock_items_category ON public.stock_items(category);

-- ── stock_lots ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.stock_lots (
  id text PRIMARY KEY,
  item_id text NOT NULL,
  domain varchar(20) NOT NULL CHECK (domain IN ('pharmacy','lab')),
  lot_number varchar(100) NOT NULL,
  expiry_date date,
  manufacture_date date,
  available_qty numeric(12,2) NOT NULL DEFAULT 0,
  reserved_qty numeric(12,2) NOT NULL DEFAULT 0,
  quarantine_qty numeric(12,2) NOT NULL DEFAULT 0,
  blocked boolean NOT NULL DEFAULT false,
  blocked_reason varchar(500),
  reception_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stock_lots ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_lots TO anon, authenticated;
DROP POLICY IF EXISTS "shared_select_stock_lots" ON public.stock_lots;
CREATE POLICY "shared_select_stock_lots" ON public.stock_lots FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_stock_lots" ON public.stock_lots;
CREATE POLICY "shared_insert_stock_lots" ON public.stock_lots FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_stock_lots" ON public.stock_lots;
CREATE POLICY "shared_update_stock_lots" ON public.stock_lots FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_stock_lots" ON public.stock_lots;
CREATE POLICY "shared_delete_stock_lots" ON public.stock_lots FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_stock_lots_item ON public.stock_lots(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_lots_domain ON public.stock_lots(domain);
CREATE INDEX IF NOT EXISTS idx_stock_lots_expiry ON public.stock_lots(expiry_date);

-- ── stock_movements ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id text PRIMARY KEY,
  domain varchar(20) NOT NULL CHECK (domain IN ('pharmacy','lab')),
  date date NOT NULL,
  time varchar(10) NOT NULL,
  type varchar(50) NOT NULL,
  item_id text NOT NULL,
  item_name varchar(200) NOT NULL,
  lot_id text,
  lot_number varchar(100),
  quantity numeric(12,2) NOT NULL DEFAULT 0,
  unit varchar(50),
  origin varchar(200),
  destination varchar(200),
  author varchar(150) NOT NULL,
  reference varchar(100),
  stock_before numeric(12,2) NOT NULL DEFAULT 0,
  stock_after numeric(12,2) NOT NULL DEFAULT 0,
  reason varchar(500),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_movements TO anon, authenticated;
DROP POLICY IF EXISTS "shared_select_stock_movements" ON public.stock_movements;
CREATE POLICY "shared_select_stock_movements" ON public.stock_movements FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_stock_movements" ON public.stock_movements;
CREATE POLICY "shared_insert_stock_movements" ON public.stock_movements FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_stock_movements" ON public.stock_movements;
CREATE POLICY "shared_update_stock_movements" ON public.stock_movements FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_stock_movements" ON public.stock_movements;
CREATE POLICY "shared_delete_stock_movements" ON public.stock_movements FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON public.stock_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_domain ON public.stock_movements(domain);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON public.stock_movements(date);

-- ── stock_need_expressions ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.stock_need_expressions (
  id text PRIMARY KEY,
  domain varchar(20) NOT NULL CHECK (domain IN ('pharmacy','lab')),
  number varchar(50) NOT NULL,
  date date NOT NULL,
  service varchar(100) NOT NULL,
  period varchar(100),
  justification text,
  urgency varchar(20) NOT NULL DEFAULT 'normal' CHECK (urgency IN ('normal','urgent','critique')),
  requester varchar(150) NOT NULL,
  validator varchar(150),
  status varchar(40) NOT NULL DEFAULT 'brouillon',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  rejection_reason varchar(500),
  history jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stock_need_expressions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_need_expressions TO anon, authenticated;
DROP POLICY IF EXISTS "shared_select_stock_need_expressions" ON public.stock_need_expressions;
CREATE POLICY "shared_select_stock_need_expressions" ON public.stock_need_expressions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_stock_need_expressions" ON public.stock_need_expressions;
CREATE POLICY "shared_insert_stock_need_expressions" ON public.stock_need_expressions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_stock_need_expressions" ON public.stock_need_expressions;
CREATE POLICY "shared_update_stock_need_expressions" ON public.stock_need_expressions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_stock_need_expressions" ON public.stock_need_expressions;
CREATE POLICY "shared_delete_stock_need_expressions" ON public.stock_need_expressions FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_need_expressions_domain ON public.stock_need_expressions(domain);
CREATE INDEX IF NOT EXISTS idx_need_expressions_status ON public.stock_need_expressions(status);

-- ── stock_quotations ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.stock_quotations (
  id text PRIMARY KEY,
  domain varchar(20) NOT NULL CHECK (domain IN ('pharmacy','lab')),
  number varchar(50) NOT NULL,
  need_expression_id text,
  supplier_id text,
  supplier_name varchar(200),
  date date NOT NULL,
  validity_days integer NOT NULL DEFAULT 30,
  expiry_date date,
  status varchar(40) NOT NULL DEFAULT 'recue',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  selection_reason text,
  validator varchar(150),
  history jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stock_quotations ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_quotations TO anon, authenticated;
DROP POLICY IF EXISTS "shared_select_stock_quotations" ON public.stock_quotations;
CREATE POLICY "shared_select_stock_quotations" ON public.stock_quotations FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_stock_quotations" ON public.stock_quotations;
CREATE POLICY "shared_insert_stock_quotations" ON public.stock_quotations FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_stock_quotations" ON public.stock_quotations;
CREATE POLICY "shared_update_stock_quotations" ON public.stock_quotations FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_stock_quotations" ON public.stock_quotations;
CREATE POLICY "shared_delete_stock_quotations" ON public.stock_quotations FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_quotations_domain ON public.stock_quotations(domain);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON public.stock_quotations(status);

-- ── stock_receptions ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.stock_receptions (
  id text PRIMARY KEY,
  domain varchar(20) NOT NULL CHECK (domain IN ('pharmacy','lab')),
  number varchar(50) NOT NULL,
  need_expression_id text,
  quotation_id text,
  supplier_name varchar(200),
  date date NOT NULL,
  time varchar(10) NOT NULL,
  receiver varchar(150) NOT NULL,
  delivery_note_number varchar(100),
  decision varchar(40) NOT NULL DEFAULT 'conforme',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  history jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stock_receptions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_receptions TO anon, authenticated;
DROP POLICY IF EXISTS "shared_select_stock_receptions" ON public.stock_receptions;
CREATE POLICY "shared_select_stock_receptions" ON public.stock_receptions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_stock_receptions" ON public.stock_receptions;
CREATE POLICY "shared_insert_stock_receptions" ON public.stock_receptions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_stock_receptions" ON public.stock_receptions;
CREATE POLICY "shared_update_stock_receptions" ON public.stock_receptions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_stock_receptions" ON public.stock_receptions;
CREATE POLICY "shared_delete_stock_receptions" ON public.stock_receptions FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_receptions_domain ON public.stock_receptions(domain);

-- ── stock_alerts ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.stock_alerts (
  id text PRIMARY KEY,
  domain varchar(20) NOT NULL CHECK (domain IN ('pharmacy','lab')),
  type varchar(100) NOT NULL,
  level varchar(20) NOT NULL DEFAULT 'info' CHECK (level IN ('info','surveiller','important','critique')),
  item_id text,
  item_name varchar(200) NOT NULL,
  lot_number varchar(100),
  available_qty numeric(12,2),
  threshold numeric(12,2),
  date date NOT NULL,
  cause varchar(500) NOT NULL,
  responsible varchar(150) NOT NULL,
  proposed_action text,
  status varchar(30) NOT NULL DEFAULT 'nouvelle',
  history jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stock_alerts ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_alerts TO anon, authenticated;
DROP POLICY IF EXISTS "shared_select_stock_alerts" ON public.stock_alerts;
CREATE POLICY "shared_select_stock_alerts" ON public.stock_alerts FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_stock_alerts" ON public.stock_alerts;
CREATE POLICY "shared_insert_stock_alerts" ON public.stock_alerts FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_stock_alerts" ON public.stock_alerts;
CREATE POLICY "shared_update_stock_alerts" ON public.stock_alerts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_stock_alerts" ON public.stock_alerts;
CREATE POLICY "shared_delete_stock_alerts" ON public.stock_alerts FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_domain ON public.stock_alerts(domain);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_status ON public.stock_alerts(status);

-- ── pharmacy_medication_stock ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.pharmacy_medication_stock (
  id text PRIMARY KEY,
  name varchar(200) NOT NULL,
  category varchar(100) NOT NULL,
  unit varchar(50) NOT NULL,
  stock integer NOT NULL DEFAULT 0,
  min_stock integer NOT NULL DEFAULT 0,
  price_per_unit numeric(14,2) NOT NULL DEFAULT 0,
  expiry_date date,
  batch_number varchar(100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pharmacy_medication_stock ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pharmacy_medication_stock TO anon, authenticated;
DROP POLICY IF EXISTS "shared_select_pharmacy_medication_stock" ON public.pharmacy_medication_stock;
CREATE POLICY "shared_select_pharmacy_medication_stock" ON public.pharmacy_medication_stock FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_pharmacy_medication_stock" ON public.pharmacy_medication_stock;
CREATE POLICY "shared_insert_pharmacy_medication_stock" ON public.pharmacy_medication_stock FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_pharmacy_medication_stock" ON public.pharmacy_medication_stock;
CREATE POLICY "shared_update_pharmacy_medication_stock" ON public.pharmacy_medication_stock FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_pharmacy_medication_stock" ON public.pharmacy_medication_stock;
CREATE POLICY "shared_delete_pharmacy_medication_stock" ON public.pharmacy_medication_stock FOR DELETE TO anon, authenticated USING (true);

-- ── pharmacy_dispensing_records ───────────────────────────
CREATE TABLE IF NOT EXISTS public.pharmacy_dispensing_records (
  id text PRIMARY KEY,
  patient_id text NOT NULL,
  patient_name varchar(200) NOT NULL,
  date date NOT NULL,
  time varchar(10) NOT NULL,
  pharmacist varchar(150) NOT NULL,
  medications jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_cost numeric(14,2) NOT NULL DEFAULT 0,
  prescription_id text,
  status varchar(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','dispensed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pharmacy_dispensing_records ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pharmacy_dispensing_records TO anon, authenticated;
DROP POLICY IF EXISTS "shared_select_pharmacy_dispensing_records" ON public.pharmacy_dispensing_records;
CREATE POLICY "shared_select_pharmacy_dispensing_records" ON public.pharmacy_dispensing_records FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_pharmacy_dispensing_records" ON public.pharmacy_dispensing_records;
CREATE POLICY "shared_insert_pharmacy_dispensing_records" ON public.pharmacy_dispensing_records FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_pharmacy_dispensing_records" ON public.pharmacy_dispensing_records;
CREATE POLICY "shared_update_pharmacy_dispensing_records" ON public.pharmacy_dispensing_records FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_pharmacy_dispensing_records" ON public.pharmacy_dispensing_records;
CREATE POLICY "shared_delete_pharmacy_dispensing_records" ON public.pharmacy_dispensing_records FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_pharmacy_dispensing_patient ON public.pharmacy_dispensing_records(patient_id);

-- ── nominal_dispensings ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.nominal_dispensings (
  id text PRIMARY KEY,
  patient_id text NOT NULL,
  patient_name varchar(200) NOT NULL,
  encounter_id text,
  prescription_id text,
  service varchar(100),
  prescriber varchar(150),
  item_id text,
  item_name varchar(200) NOT NULL,
  lot_id text,
  lot_number varchar(100),
  prescribed_qty numeric(12,2) NOT NULL DEFAULT 0,
  delivered_qty numeric(12,2) NOT NULL DEFAULT 0,
  date date NOT NULL,
  pharmacist varchar(150) NOT NULL,
  status varchar(40) NOT NULL DEFAULT 'a-preparer',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.nominal_dispensings ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nominal_dispensings TO anon, authenticated;
DROP POLICY IF EXISTS "shared_select_nominal_dispensings" ON public.nominal_dispensings;
CREATE POLICY "shared_select_nominal_dispensings" ON public.nominal_dispensings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_nominal_dispensings" ON public.nominal_dispensings;
CREATE POLICY "shared_insert_nominal_dispensings" ON public.nominal_dispensings FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_nominal_dispensings" ON public.nominal_dispensings;
CREATE POLICY "shared_update_nominal_dispensings" ON public.nominal_dispensings FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_nominal_dispensings" ON public.nominal_dispensings;
CREATE POLICY "shared_delete_nominal_dispensings" ON public.nominal_dispensings FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_nominal_dispensings_patient ON public.nominal_dispensings(patient_id);

-- ── service_dotations ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.service_dotations (
  id text PRIMARY KEY,
  service varchar(100) NOT NULL,
  requester varchar(150) NOT NULL,
  item_id text,
  item_name varchar(200) NOT NULL,
  lot_id text,
  lot_number varchar(100),
  requested_qty numeric(12,2) NOT NULL DEFAULT 0,
  validated_qty numeric(12,2) NOT NULL DEFAULT 0,
  delivered_qty numeric(12,2) NOT NULL DEFAULT 0,
  date date NOT NULL,
  responsible varchar(150) NOT NULL,
  status varchar(40) NOT NULL DEFAULT 'demandee',
  receipt_acknowledged boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.service_dotations ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_dotations TO anon, authenticated;
DROP POLICY IF EXISTS "shared_select_service_dotations" ON public.service_dotations;
CREATE POLICY "shared_select_service_dotations" ON public.service_dotations FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_service_dotations" ON public.service_dotations;
CREATE POLICY "shared_insert_service_dotations" ON public.service_dotations FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_service_dotations" ON public.service_dotations;
CREATE POLICY "shared_update_service_dotations" ON public.service_dotations FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_service_dotations" ON public.service_dotations;
CREATE POLICY "shared_delete_service_dotations" ON public.service_dotations FOR DELETE TO anon, authenticated USING (true);

-- ── product_returns ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.product_returns (
  id text PRIMARY KEY,
  origin varchar(200) NOT NULL,
  item_id text,
  item_name varchar(200) NOT NULL,
  lot_id text,
  lot_number varchar(100),
  quantity numeric(12,2) NOT NULL DEFAULT 0,
  reason varchar(500) NOT NULL,
  packaging_intact boolean NOT NULL DEFAULT true,
  storage_respected boolean NOT NULL DEFAULT true,
  expiry_date date,
  controlled_by varchar(150) NOT NULL,
  decision varchar(40) NOT NULL DEFAULT 'remis-stock',
  date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.product_returns ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_returns TO anon, authenticated;
DROP POLICY IF EXISTS "shared_select_product_returns" ON public.product_returns;
CREATE POLICY "shared_select_product_returns" ON public.product_returns FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_product_returns" ON public.product_returns;
CREATE POLICY "shared_insert_product_returns" ON public.product_returns FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_product_returns" ON public.product_returns;
CREATE POLICY "shared_update_product_returns" ON public.product_returns FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_product_returns" ON public.product_returns;
CREATE POLICY "shared_delete_product_returns" ON public.product_returns FOR DELETE TO anon, authenticated USING (true);

-- ── lab_automates ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lab_automates (
  id text PRIMARY KEY,
  name varchar(200) NOT NULL,
  category varchar(100),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lab_automates ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_automates TO anon, authenticated;
DROP POLICY IF EXISTS "shared_select_lab_automates" ON public.lab_automates;
CREATE POLICY "shared_select_lab_automates" ON public.lab_automates FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_lab_automates" ON public.lab_automates;
CREATE POLICY "shared_insert_lab_automates" ON public.lab_automates FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_lab_automates" ON public.lab_automates;
CREATE POLICY "shared_update_lab_automates" ON public.lab_automates FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_lab_automates" ON public.lab_automates;
CREATE POLICY "shared_delete_lab_automates" ON public.lab_automates FOR DELETE TO anon, authenticated USING (true);

-- ── automate_consumptions ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.automate_consumptions (
  id text PRIMARY KEY,
  automate_id text,
  automate_name varchar(200),
  reagent_id text,
  reagent_name varchar(200),
  lot_id text,
  lot_number varchar(100),
  open_date date,
  install_date date,
  installed_qty numeric(12,2) NOT NULL DEFAULT 0,
  theoretical_tests integer NOT NULL DEFAULT 0,
  tests_performed integer NOT NULL DEFAULT 0,
  controls_performed integer NOT NULL DEFAULT 0,
  calibrations_performed integer NOT NULL DEFAULT 0,
  repeated_tests integer NOT NULL DEFAULT 0,
  cancelled_tests integer NOT NULL DEFAULT 0,
  technical_losses integer NOT NULL DEFAULT 0,
  theoretical_remaining integer NOT NULL DEFAULT 0,
  observed_remaining integer NOT NULL DEFAULT 0,
  removal_date date,
  operator varchar(150),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.automate_consumptions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automate_consumptions TO anon, authenticated;
DROP POLICY IF EXISTS "shared_select_automate_consumptions" ON public.automate_consumptions;
CREATE POLICY "shared_select_automate_consumptions" ON public.automate_consumptions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_automate_consumptions" ON public.automate_consumptions;
CREATE POLICY "shared_insert_automate_consumptions" ON public.automate_consumptions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_automate_consumptions" ON public.automate_consumptions;
CREATE POLICY "shared_update_automate_consumptions" ON public.automate_consumptions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_automate_consumptions" ON public.automate_consumptions;
CREATE POLICY "shared_delete_automate_consumptions" ON public.automate_consumptions FOR DELETE TO anon, authenticated USING (true);

-- ── lab_reconciliations ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lab_reconciliations (
  id text PRIMARY KEY,
  automate_id text,
  automate_name varchar(200),
  reagent_id text,
  reagent_name varchar(200),
  lot_number varchar(100),
  theoretical_tests integer NOT NULL DEFAULT 0,
  prescribed_tests integer NOT NULL DEFAULT 0,
  performed_tests integer NOT NULL DEFAULT 0,
  controls_qty integer NOT NULL DEFAULT 0,
  calibrations_qty integer NOT NULL DEFAULT 0,
  repeated_tests integer NOT NULL DEFAULT 0,
  cancelled_tests integer NOT NULL DEFAULT 0,
  theoretical_consumption integer NOT NULL DEFAULT 0,
  declared_consumption integer NOT NULL DEFAULT 0,
  real_estimated_consumption integer NOT NULL DEFAULT 0,
  gap integer NOT NULL DEFAULT 0,
  gap_percentage numeric(8,2) NOT NULL DEFAULT 0,
  classification varchar(40) NOT NULL DEFAULT 'conforme',
  justification text,
  causes jsonb NOT NULL DEFAULT '[]'::jsonb,
  date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lab_reconciliations ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_reconciliations TO anon, authenticated;
DROP POLICY IF EXISTS "shared_select_lab_reconciliations" ON public.lab_reconciliations;
CREATE POLICY "shared_select_lab_reconciliations" ON public.lab_reconciliations FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_lab_reconciliations" ON public.lab_reconciliations;
CREATE POLICY "shared_insert_lab_reconciliations" ON public.lab_reconciliations FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_lab_reconciliations" ON public.lab_reconciliations;
CREATE POLICY "shared_update_lab_reconciliations" ON public.lab_reconciliations FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_lab_reconciliations" ON public.lab_reconciliations;
CREATE POLICY "shared_delete_lab_reconciliations" ON public.lab_reconciliations FOR DELETE TO anon, authenticated USING (true);

-- ── inventories ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.inventories (
  id text PRIMARY KEY,
  domain varchar(20) NOT NULL CHECK (domain IN ('pharmacy','lab')),
  number varchar(50) NOT NULL,
  type varchar(50) NOT NULL DEFAULT 'complet',
  date date NOT NULL,
  entries jsonb NOT NULL DEFAULT '[]'::jsonb,
  validator varchar(150),
  status varchar(20) NOT NULL DEFAULT 'en-cours' CHECK (status IN ('en-cours','valide','cloture')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.inventories ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventories TO anon, authenticated;
DROP POLICY IF EXISTS "shared_select_inventories" ON public.inventories;
CREATE POLICY "shared_select_inventories" ON public.inventories FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_inventories" ON public.inventories;
CREATE POLICY "shared_insert_inventories" ON public.inventories FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_inventories" ON public.inventories;
CREATE POLICY "shared_update_inventories" ON public.inventories FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_inventories" ON public.inventories;
CREATE POLICY "shared_delete_inventories" ON public.inventories FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_inventories_domain ON public.inventories(domain);

-- ── patient_extras (forms, imaging, documents) ────────────
CREATE TABLE IF NOT EXISTS public.patient_form_templates (
  id text PRIMARY KEY,
  code varchar(50) NOT NULL,
  name varchar(200) NOT NULL,
  description text,
  category varchar(100),
  sections jsonb NOT NULL DEFAULT '[]'::jsonb
);
ALTER TABLE public.patient_form_templates ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_form_templates TO anon, authenticated;
DROP POLICY IF EXISTS "shared_select_patient_form_templates" ON public.patient_form_templates;
CREATE POLICY "shared_select_patient_form_templates" ON public.patient_form_templates FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_patient_form_templates" ON public.patient_form_templates;
CREATE POLICY "shared_insert_patient_form_templates" ON public.patient_form_templates FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_patient_form_templates" ON public.patient_form_templates;
CREATE POLICY "shared_update_patient_form_templates" ON public.patient_form_templates FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_patient_form_templates" ON public.patient_form_templates;
CREATE POLICY "shared_delete_patient_form_templates" ON public.patient_form_templates FOR DELETE TO anon, authenticated USING (true);

-- ── patient_forms ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.patient_forms (
  id text PRIMARY KEY,
  template_id text NOT NULL,
  patient_id text NOT NULL,
  episode_id text,
  values jsonb NOT NULL DEFAULT '{}'::jsonb,
  rows jsonb NOT NULL DEFAULT '{}'::jsonb,
  status varchar(20) NOT NULL DEFAULT 'draft',
  author varchar(150),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.patient_forms ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_forms TO anon, authenticated;
DROP POLICY IF EXISTS "shared_select_patient_forms" ON public.patient_forms;
CREATE POLICY "shared_select_patient_forms" ON public.patient_forms FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_patient_forms" ON public.patient_forms;
CREATE POLICY "shared_insert_patient_forms" ON public.patient_forms FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_patient_forms" ON public.patient_forms;
CREATE POLICY "shared_update_patient_forms" ON public.patient_forms FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_patient_forms" ON public.patient_forms;
CREATE POLICY "shared_delete_patient_forms" ON public.patient_forms FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_patient_forms_patient ON public.patient_forms(patient_id);

-- ── imaging_models ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.imaging_models (
  id text PRIMARY KEY,
  name varchar(200) NOT NULL,
  modality varchar(100),
  body_part varchar(100),
  default_contrast boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true
);
ALTER TABLE public.imaging_models ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.imaging_models TO anon, authenticated;
DROP POLICY IF EXISTS "shared_select_imaging_models" ON public.imaging_models;
CREATE POLICY "shared_select_imaging_models" ON public.imaging_models FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_imaging_models" ON public.imaging_models;
CREATE POLICY "shared_insert_imaging_models" ON public.imaging_models FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_imaging_models" ON public.imaging_models;
CREATE POLICY "shared_update_imaging_models" ON public.imaging_models FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_imaging_models" ON public.imaging_models;
CREATE POLICY "shared_delete_imaging_models" ON public.imaging_models FOR DELETE TO anon, authenticated USING (true);

-- ── imaging_reports ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.imaging_reports (
  id text PRIMARY KEY,
  patient_id text NOT NULL,
  episode_id text,
  model_id text,
  exam_date date NOT NULL,
  modality varchar(100),
  body_part varchar(100),
  contrast boolean NOT NULL DEFAULT false,
  findings text,
  conclusion text,
  radiologist varchar(150),
  status varchar(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','validated','signed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.imaging_reports ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.imaging_reports TO anon, authenticated;
DROP POLICY IF EXISTS "shared_select_imaging_reports" ON public.imaging_reports;
CREATE POLICY "shared_select_imaging_reports" ON public.imaging_reports FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_imaging_reports" ON public.imaging_reports;
CREATE POLICY "shared_insert_imaging_reports" ON public.imaging_reports FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_imaging_reports" ON public.imaging_reports;
CREATE POLICY "shared_update_imaging_reports" ON public.imaging_reports FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_imaging_reports" ON public.imaging_reports;
CREATE POLICY "shared_delete_imaging_reports" ON public.imaging_reports FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_imaging_reports_patient ON public.imaging_reports(patient_id);

-- ── patient_documents ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.patient_documents (
  id text PRIMARY KEY,
  patient_id text NOT NULL,
  title varchar(200) NOT NULL,
  category varchar(100),
  date date NOT NULL,
  author varchar(150),
  file_url text,
  size_bytes bigint,
  mime_type varchar(100),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.patient_documents ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_documents TO anon, authenticated;
DROP POLICY IF EXISTS "shared_select_patient_documents" ON public.patient_documents;
CREATE POLICY "shared_select_patient_documents" ON public.patient_documents FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_patient_documents" ON public.patient_documents;
CREATE POLICY "shared_insert_patient_documents" ON public.patient_documents FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_patient_documents" ON public.patient_documents;
CREATE POLICY "shared_update_patient_documents" ON public.patient_documents FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_patient_documents" ON public.patient_documents;
CREATE POLICY "shared_delete_patient_documents" ON public.patient_documents FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_patient_documents_patient ON public.patient_documents(patient_id);
