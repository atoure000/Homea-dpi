# Schéma MySQL provisoire — HOMEA DPI
# ============================================================
#
# AVERTISSEMENT : ce schéma est PROVISOIRE. Il n'a pas été validé
# par le développeur backend. Il sert de base de discussion et
# doit être adapté aux contrats d'API définitifs.
#
# Conventions adaptées à MySQL (depuis PostgreSQL) :
#   - BIGINT AUTO_INCREMENT au lieu de SERIAL
#   - VARCHAR(n) au lieu de TEXT pour les chaînes bornées
#   - JSON au lieu de JSONB (MySQL 5.7+)
#   - DATETIME au lieu de TIMESTAMPTZ (le fuseau est géré côté app)
#   - Pas de RLS MySQL (sécurité gérée par l'API + rôles MySQL)
#   - Index et clés étrangères explicites
#
# Points à valider avec le développeur :
#   - Choix du moteur : InnoDB (recommandé pour FK + transactions)
#   - Charset : utf8mb4 / utf8mb4_unicode_ci (recommandé)
#   - Stratégie d'ID : AUTO_INCREMENT vs UUID (CHAR(36))
#   - Horodatage : DATETIME vs TIMESTAMP (limite 2038)
#   - Tables d'audit / traçabilité des modifications

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -------------------------------------------------------
-- Table : patients (identité patient)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS patients (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  code            VARCHAR(20)   NOT NULL UNIQUE,
  first_name      VARCHAR(100)  NOT NULL,
  last_name       VARCHAR(100)  NOT NULL,
  birth_date      DATE          NOT NULL,
  gender          ENUM('M','F') NOT NULL,
  phone           VARCHAR(30),
  address         VARCHAR(255),
  blood_type      VARCHAR(5),
  allergies       JSON,
  chronic_conditions JSON,
  emergency_contact VARCHAR(150),
  emergency_phone VARCHAR(30),
  insurance       VARCHAR(100),
  insurance_number VARCHAR(50),
  photo           VARCHAR(500),
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by      BIGINT,
  INDEX idx_patients_code (code),
  INDEX idx_patients_name (last_name, first_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- Table : admissions (venues / hospitalisations)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS admissions (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  patient_id      BIGINT        NOT NULL,
  admission_date  DATE         NOT NULL,
  admission_time  TIME          NOT NULL,
  reason          VARCHAR(500) NOT NULL,
  status          ENUM('waiting','admitted','in-consultation','discharged') NOT NULL DEFAULT 'waiting',
  department      VARCHAR(100),
  bed_number      VARCHAR(20),
  assigned_doctor VARCHAR(150),
  priority        ENUM('normal','urgent','critical') NOT NULL DEFAULT 'normal',
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by      BIGINT,
  CONSTRAINT fk_admissions_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE RESTRICT,
  INDEX idx_admissions_patient (patient_id),
  INDEX idx_admissions_date (admission_date),
  INDEX idx_admissions_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- Table : consultations
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS consultations (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  patient_id      BIGINT        NOT NULL,
  consultation_date DATE        NOT NULL,
  consultation_time TIME       NOT NULL,
  doctor          VARCHAR(150) NOT NULL,
  chief_complaint VARCHAR(500),
  history         TEXT,
  examination     TEXT,
  diagnosis       TEXT,
  notes           TEXT,
  status          ENUM('pending','in-progress','completed') NOT NULL DEFAULT 'pending',
  vitals          JSON,
  signature       BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by      BIGINT,
  CONSTRAINT fk_consultations_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE RESTRICT,
  INDEX idx_consultations_patient (patient_id),
  INDEX idx_consultations_date (consultation_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- Table : prescriptions
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS prescriptions (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  patient_id      BIGINT        NOT NULL,
  prescription_date DATE        NOT NULL,
  doctor          VARCHAR(150) NOT NULL,
  medications     JSON         NOT NULL,
  status          ENUM('active','dispensed','cancelled') NOT NULL DEFAULT 'active',
  notes           TEXT,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by      BIGINT,
  CONSTRAINT fk_prescriptions_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE RESTRICT,
  INDEX idx_prescriptions_patient (patient_id),
  INDEX idx_prescriptions_date (prescription_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- Table : lab_orders
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS lab_orders (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  patient_id      BIGINT        NOT NULL,
  order_date      DATE         NOT NULL,
  doctor          VARCHAR(150) NOT NULL,
  tests           JSON         NOT NULL,
  status          ENUM('ordered','in-progress','completed') NOT NULL DEFAULT 'ordered',
  priority        ENUM('normal','urgent') NOT NULL DEFAULT 'normal',
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by      BIGINT,
  CONSTRAINT fk_lab_orders_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE RESTRICT,
  INDEX idx_lab_orders_patient (patient_id),
  INDEX idx_lab_orders_date (order_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- Table : nursing_care
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS nursing_care (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  patient_id      BIGINT        NOT NULL,
  care_date       DATE         NOT NULL,
  care_time       TIME         NOT NULL,
  nurse           VARCHAR(150) NOT NULL,
  care_type       VARCHAR(100) NOT NULL,
  description     TEXT,
  vitals          JSON,
  signature       BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by      BIGINT,
  CONSTRAINT fk_nursing_care_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE RESTRICT,
  INDEX idx_nursing_care_patient (patient_id),
  INDEX idx_nursing_care_date (care_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- Table : invoices
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoices (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  invoice_number  VARCHAR(30)  NOT NULL UNIQUE,
  patient_id      BIGINT        NOT NULL,
  patient_name    VARCHAR(200) NOT NULL,
  invoice_date    DATE         NOT NULL,
  items           JSON         NOT NULL,
  subtotal        DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount        DECIMAL(12,2) NOT NULL DEFAULT 0,
  insurance_cover DECIMAL(12,2) NOT NULL DEFAULT 0,
  total           DECIMAL(12,2) NOT NULL DEFAULT 0,
  status          ENUM('draft','pending','paid','partial') NOT NULL DEFAULT 'draft',
  amount_paid     DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by      BIGINT,
  CONSTRAINT fk_invoices_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE RESTRICT,
  INDEX idx_invoices_patient (patient_id),
  INDEX idx_invoices_number (invoice_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- Table : beds
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS beds (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  bed_number      VARCHAR(20)  NOT NULL UNIQUE,
  room            VARCHAR(50)  NOT NULL,
  department      VARCHAR(100) NOT NULL,
  status          ENUM('available','occupied','cleaning','reserved') NOT NULL DEFAULT 'available',
  patient_id      BIGINT,
  admission_date  DATE,
  expected_discharge DATE,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_beds_status (status),
  INDEX idx_beds_department (department)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- Table : appointments
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS appointments (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  patient_id      BIGINT        NOT NULL,
  doctor_id       BIGINT        NOT NULL,
  appointment_date DATE        NOT NULL,
  appointment_time TIME       NOT NULL,
  duration        INT          NOT NULL DEFAULT 30,
  type            ENUM('first','follow-up','urgent','teleconsult','walk-in') NOT NULL,
  reason          VARCHAR(500),
  room_id         BIGINT,
  status          ENUM('planned','to-confirm','confirmed','arrived','waiting','in-consultation','completed','cancelled','no-show','rescheduled','walk-in') NOT NULL DEFAULT 'planned',
  coverage        ENUM('particular','insurance','mutual') NOT NULL DEFAULT 'particular',
  priority        ENUM('normal','medical') NOT NULL DEFAULT 'normal',
  comment         TEXT,
  confirmation_channel ENUM('phone','sms','email'),
  arrival_time    TIME,
  is_late         BOOLEAN      NOT NULL DEFAULT FALSE,
  late_reason     VARCHAR(255),
  history         JSON,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by      BIGINT,
  CONSTRAINT fk_appointments_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE RESTRICT,
  INDEX idx_appointments_patient (patient_id),
  INDEX idx_appointments_doctor (doctor_id),
  INDEX idx_appointments_date (appointment_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- Table : audit_log (traçabilité des créations/modifications)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  table_name      VARCHAR(50)  NOT NULL,
  record_id       BIGINT       NOT NULL,
  action          ENUM('INSERT','UPDATE','DELETE') NOT NULL,
  changed_by      BIGINT,
  changed_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  old_values      JSON,
  new_values      JSON,
  INDEX idx_audit_table_record (table_name, record_id),
  INDEX idx_audit_changed_at (changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ===========================================================
-- Points à valider avec le développeur backend :
--   1. Tables des utilisateurs / rôles (médecins, infirmiers, etc.)
--   2. Tables de stock (pharmacie, laboratoire) — non couvertes ici
--   3. Tables d'imagerie et formulaires de consultation
--   4. Politique de mots de passe et gestion des sessions
--   5. Stratégie de sauvegarde et rétention
--   6. Conformité RGPD / protection des données de santé
-- ===========================================================
