import type { Patient } from '@/types';
import { patients } from '@/data/patients';

/* ── Types ─────────────────────────────────────────────────────────── */

export type BillingDocType = 'cotation' | 'prefacture' | 'facture';

export type BillingDocStatus =
  | 'brouillon'
  | 'en-attente'
  | 'valide'
  | 'transforme'
  | 'partiellement-paye'
  | 'paye'
  | 'annule';

export type CoverageLineStatus = 'couverte' | 'non-couverte' | 'partiellement-couverte' | 'en-attente-accord';

export type LineOrigin = 'manuelle' | 'laboratoire' | 'imagerie' | 'pharmacie' | 'hospitalisation' | 'acte-de-soins';

export type LineStatus = 'prevu' | 'realise' | 'a-confirmer' | 'annule' | 'facturable' | 'non-facturable';

export interface BillingLine {
  id: string;
  category: string;
  code: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  coverage: CoverageLineStatus;
  coverageRate: number;
  origin: LineOrigin;
  lineStatus: LineStatus;
  observation?: string;
}

export type InsuranceTrackingStatus =
  | 'a-preparer'
  | 'transmise'
  | 'en-traitement'
  | 'acceptee'
  | 'partiellement-acceptee'
  | 'rejetee'
  | 'reglee';

export interface InsuranceTracking {
  status: InsuranceTrackingStatus;
  amountToClaim: number;
  amountTransmitted: number;
  amountAccepted: number;
  amountRejected: number;
  amountPaid: number;
  rejectionReason?: string;
  bordereauNumber?: string;
  transmissionDate?: string;
  settlementDate?: string;
}

export interface BillingPayment {
  id: string;
  date: string;
  time: string;
  mode: string;
  amount: number;
  reference?: string;
  cashier: string;
  comment?: string;
}

export interface BillingHistoryEntry {
  timestamp: string;
  action: string;
  detail?: string;
}

export interface BillingDoc {
  id: string;
  type: BillingDocType;
  number: string;
  date: string;
  time: string;
  patientId: string;
  episode: string;
  service: string;
  doctor: string;
  insurance: string;
  insuranceNumber: string;
  coverageRate: number;
  sourceRef?: string;
  validityDays?: number;
  entryDate?: string;
  exitDate?: string;
  lines: BillingLine[];
  status: BillingDocStatus;
  payments: BillingPayment[];
  insuranceTracking?: InsuranceTracking;
  history: BillingHistoryEntry[];
  validatedBy?: string;
  validatedAt?: string;
  cancelReason?: string;
  creditNote?: { number: string; date: string; reason: string; amount: number };
}

export interface CatalogueItem {
  id: string;
  code: string;
  label: string;
  category: string;
  service: string;
  unit: string;
  standardPrice: number;
  insuredPrice: number;
  contractedPrice: number;
  active: boolean;
  usuallyCovered: boolean;
  proposedRate: number;
  validFrom: string;
}

/* ── Constantes ────────────────────────────────────────────────────── */

export const DOC_TYPE_LABELS: Record<BillingDocType, string> = {
  cotation: 'Cotation',
  prefacture: 'Préfacture',
  facture: 'Facture définitive',
};

export const DOC_STATUS_META: Record<BillingDocStatus, { label: string; color: 'navy' | 'green' | 'red' | 'amber' | 'blue' | 'turquoise' }> = {
  brouillon: { label: 'Brouillon', color: 'navy' },
  'en-attente': { label: 'En attente', color: 'amber' },
  valide: { label: 'Validé', color: 'blue' },
  transforme: { label: 'Transformé', color: 'turquoise' },
  'partiellement-paye': { label: 'Partiellement payé', color: 'amber' },
  paye: { label: 'Payé', color: 'green' },
  annule: { label: 'Annulé', color: 'red' },
};

export const COVERAGE_LABELS: Record<CoverageLineStatus, string> = {
  couverte: 'Couverte',
  'non-couverte': 'Non couverte',
  'partiellement-couverte': 'Partiellement couverte',
  'en-attente-accord': "En attente d'accord",
};

export const LINE_STATUS_LABELS: Record<LineStatus, string> = {
  prevu: 'Prévu',
  realise: 'Réalisé',
  'a-confirmer': 'À confirmer',
  annule: 'Annulé',
  facturable: 'Facturable',
  'non-facturable': 'Non facturable',
};

export const ORIGIN_LABELS: Record<LineOrigin, string> = {
  manuelle: 'Saisie manuelle',
  laboratoire: 'Laboratoire',
  imagerie: 'Imagerie',
  pharmacie: 'Pharmacie',
  hospitalisation: 'Hospitalisation',
  'acte-de-soins': 'Acte de soins',
};

export const CATEGORIES = [
  'Consultation',
  'Laboratoire',
  'Imagerie',
  'Pharmacie',
  'Hospitalisation',
  'Urgence',
  'Soins ambulatoires',
  'Actes médicaux',
  'Actes chirurgicaux',
  'Dispositifs médicaux',
  'Consommables',
  'Autres',
] as const;

export const PAYMENT_MODES = ['Espèces', 'Carte bancaire', 'Mobile Money', 'Chèque', 'Virement', 'Paiement mixte'] as const;

export const INSURANCE_TRACKING_META: Record<InsuranceTrackingStatus, { label: string; color: 'navy' | 'green' | 'red' | 'amber' | 'blue' | 'turquoise' }> = {
  'a-preparer': { label: 'À préparer', color: 'navy' },
  transmise: { label: 'Transmise', color: 'blue' },
  'en-traitement': { label: 'En traitement', color: 'amber' },
  acceptee: { label: 'Acceptée', color: 'green' },
  'partiellement-acceptee': { label: 'Partiellement acceptée', color: 'amber' },
  rejetee: { label: 'Rejetée', color: 'red' },
  reglee: { label: 'Réglée', color: 'turquoise' },
};

export const COVERAGE_SITUATIONS = [
  'Patient non assuré',
  'Patient assuré',
  'Convention entreprise',
  'Prise en charge particulière',
  'Paiement intégral par le patient',
] as const;

/* ── Catalogue fictif ─────────────────────────────────────────────── */

export const catalogue: CatalogueItem[] = [
  { id: 'cat01', code: 'CS-001', label: 'Consultation de médecine générale', category: 'Consultation', service: 'Médecine générale', unit: 'Acte', standardPrice: 15000, insuredPrice: 12000, contractedPrice: 10000, active: true, usuallyCovered: true, proposedRate: 80, validFrom: '2026-01-01' },
  { id: 'cat02', code: 'CS-002', label: 'Consultation gynécologique', category: 'Consultation', service: 'Gynécologie', unit: 'Acte', standardPrice: 20000, insuredPrice: 16000, contractedPrice: 14000, active: true, usuallyCovered: true, proposedRate: 80, validFrom: '2026-01-01' },
  { id: 'cat03', code: 'CS-003', label: 'Consultation obstétricale', category: 'Consultation', service: 'Maternité', unit: 'Acte', standardPrice: 20000, insuredPrice: 16000, contractedPrice: 14000, active: true, usuallyCovered: true, proposedRate: 80, validFrom: '2026-01-01' },
  { id: 'cat04', code: 'LAB-001', label: 'Numération formule sanguine', category: 'Laboratoire', service: 'Hématologie', unit: 'Test', standardPrice: 8000, insuredPrice: 6400, contractedPrice: 5500, active: true, usuallyCovered: true, proposedRate: 80, validFrom: '2026-01-01' },
  { id: 'cat05', code: 'LAB-002', label: 'Glycémie', category: 'Laboratoire', service: 'Biochimie', unit: 'Test', standardPrice: 3000, insuredPrice: 2400, contractedPrice: 2000, active: true, usuallyCovered: true, proposedRate: 80, validFrom: '2026-01-01' },
  { id: 'cat06', code: 'LAB-003', label: 'Créatinine', category: 'Laboratoire', service: 'Biochimie', unit: 'Test', standardPrice: 4000, insuredPrice: 3200, contractedPrice: 2800, active: true, usuallyCovered: true, proposedRate: 80, validFrom: '2026-01-01' },
  { id: 'cat07', code: 'IMG-001', label: 'Échographie obstétricale', category: 'Imagerie', service: 'Imagerie', unit: 'Examen', standardPrice: 30000, insuredPrice: 24000, contractedPrice: 20000, active: true, usuallyCovered: true, proposedRate: 70, validFrom: '2026-01-01' },
  { id: 'cat08', code: 'IMG-002', label: 'Radiographie', category: 'Imagerie', service: 'Imagerie', unit: 'Examen', standardPrice: 12000, insuredPrice: 9600, contractedPrice: 8000, active: true, usuallyCovered: true, proposedRate: 70, validFrom: '2026-01-01' },
  { id: 'cat09', code: 'IMG-003', label: 'Scanner', category: 'Imagerie', service: 'Imagerie', unit: 'Examen', standardPrice: 60000, insuredPrice: 48000, contractedPrice: 40000, active: true, usuallyCovered: false, proposedRate: 50, validFrom: '2026-01-01' },
  { id: 'cat10', code: 'HOSP-001', label: "Journée d'hospitalisation", category: 'Hospitalisation', service: 'Hospitalisation', unit: 'Jour', standardPrice: 25000, insuredPrice: 20000, contractedPrice: 18000, active: true, usuallyCovered: true, proposedRate: 80, validFrom: '2026-01-01' },
  { id: 'cat11', code: 'HOSP-002', label: 'Chambre individuelle', category: 'Hospitalisation', service: 'Hospitalisation', unit: 'Jour', standardPrice: 15000, insuredPrice: 0, contractedPrice: 0, active: true, usuallyCovered: false, proposedRate: 0, validFrom: '2026-01-01' },
  { id: 'cat12', code: 'CHIR-001', label: 'Frais de bloc opératoire', category: 'Actes chirurgicaux', service: 'Chirurgie', unit: 'Acte', standardPrice: 150000, insuredPrice: 120000, contractedPrice: 100000, active: true, usuallyCovered: true, proposedRate: 80, validFrom: '2026-01-01' },
  { id: 'cat13', code: 'PHA-001', label: 'Médicament de démonstration', category: 'Pharmacie', service: 'Pharmacie', unit: 'Boîte', standardPrice: 5000, insuredPrice: 4000, contractedPrice: 3500, active: true, usuallyCovered: true, proposedRate: 70, validFrom: '2026-01-01' },
  { id: 'cat14', code: 'DM-001', label: 'Dispositif médical de démonstration', category: 'Dispositifs médicaux', service: 'Pharmacie', unit: 'Unité', standardPrice: 20000, insuredPrice: 16000, contractedPrice: 14000, active: true, usuallyCovered: true, proposedRate: 70, validFrom: '2026-01-01' },
  { id: 'cat15', code: 'CONS-001', label: 'Consommable de soins', category: 'Consommables', service: 'Soins', unit: 'Unité', standardPrice: 1500, insuredPrice: 0, contractedPrice: 0, active: true, usuallyCovered: false, proposedRate: 0, validFrom: '2026-01-01' },
  { id: 'cat16', code: 'LAB-004', label: 'Groupe sanguin et rhésus', category: 'Laboratoire', service: 'Hématologie', unit: 'Test', standardPrice: 6000, insuredPrice: 4800, contractedPrice: 4000, active: true, usuallyCovered: true, proposedRate: 80, validFrom: '2026-01-01' },
  { id: 'cat17', code: 'LAB-005', label: 'Sérologie prénatale', category: 'Laboratoire', service: 'Sérologie', unit: 'Test', standardPrice: 10000, insuredPrice: 8000, contractedPrice: 7000, active: true, usuallyCovered: true, proposedRate: 50, validFrom: '2026-01-01' },
  { id: 'cat18', code: 'LAB-006', label: 'Prélèvement de laboratoire', category: 'Laboratoire', service: 'Laboratoire', unit: 'Test', standardPrice: 5000, insuredPrice: 4000, contractedPrice: 3500, active: true, usuallyCovered: true, proposedRate: 50, validFrom: '2026-01-01' },
  { id: 'cat19', code: 'LAB-007', label: 'Urée', category: 'Laboratoire', service: 'Biochimie', unit: 'Test', standardPrice: 3500, insuredPrice: 2800, contractedPrice: 2500, active: true, usuallyCovered: true, proposedRate: 80, validFrom: '2026-01-01' },
  { id: 'cat20', code: 'IMG-004', label: 'Échographie pelvienne', category: 'Imagerie', service: 'Imagerie', unit: 'Examen', standardPrice: 25000, insuredPrice: 20000, contractedPrice: 18000, active: true, usuallyCovered: true, proposedRate: 70, validFrom: '2026-01-01' },
  { id: 'cat21', code: 'HOSP-003', label: 'Forfait salle d\'accouchement', category: 'Hospitalisation', service: 'Maternité', unit: 'Forfait', standardPrice: 80000, insuredPrice: 64000, contractedPrice: 56000, active: true, usuallyCovered: true, proposedRate: 80, validFrom: '2026-01-01' },
  { id: 'cat22', code: 'ACT-001', label: 'Acte de soins infirmiers', category: 'Actes médicaux', service: 'Soins', unit: 'Acte', standardPrice: 3000, insuredPrice: 2400, contractedPrice: 2000, active: true, usuallyCovered: true, proposedRate: 80, validFrom: '2026-01-01' },
];

/* ── Calculs locaux ────────────────────────────────────────────────── */

export function lineGross(l: BillingLine): number {
  return l.quantity * l.unitPrice;
}

export function lineNet(l: BillingLine): number {
  return Math.max(0, lineGross(l) - l.discount);
}

export function lineAssurance(l: BillingLine): number {
  if (l.coverage === 'couverte' || l.coverage === 'partiellement-couverte') {
    return Math.round((lineNet(l) * l.coverageRate) / 100);
  }
  return 0;
}

export function linePatient(l: BillingLine): number {
  return lineNet(l) - lineAssurance(l);
}

export interface DocTotals {
  brut: number;
  remises: number;
  net: number;
  partAssurance: number;
  partPatient: number;
  encaisse: number;
  assurancePaye: number;
  restePatient: number;
  resteAssurance: number;
  solde: number;
}

export function docTotals(doc: BillingDoc): DocTotals {
  const brut = doc.lines.reduce((s, l) => s + lineGross(l), 0);
  const remises = doc.lines.reduce((s, l) => s + l.discount, 0);
  const net = doc.lines.reduce((s, l) => s + lineNet(l), 0);
  const partAssurance = doc.lines.reduce((s, l) => s + lineAssurance(l), 0);
  const partPatient = doc.lines.reduce((s, l) => s + linePatient(l), 0);
  const encaisse = doc.payments.reduce((s, p) => s + p.amount, 0);
  const assurancePaye = doc.insuranceTracking?.amountPaid ?? 0;
  const restePatient = Math.max(0, partPatient - encaisse);
  const resteAssurance = Math.max(0, partAssurance - assurancePaye);
  return { brut, remises, net, partAssurance, partPatient, encaisse, assurancePaye, restePatient, resteAssurance, solde: restePatient + resteAssurance };
}

export function patientInsuranceInfo(p: Patient) {
  const uninsured = !p.insurance || p.insurance === 'Non assurée';
  return {
    uninsured,
    insurer: uninsured ? 'Non assuré' : p.insurance,
    insuredNumber: p.insuranceNumber || '—',
    coverageRate: uninsured ? 0 : 80,
  };
}

/* ── Montant en lettres (simulation locale) ────────────────────────── */

const UNITS = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
const TENS = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];

function below100(n: number): string {
  if (n < 20) return UNITS[n];
  const t = Math.floor(n / 10);
  const u = n % 10;
  if (t === 7 || t === 9) return TENS[t - 1] + (u === 1 ? ' et un' : u > 0 ? ' ' + UNITS[10 + u] : '');
  return TENS[t] + (u === 1 && t !== 8 ? ' et un' : u > 0 ? ' ' + UNITS[u] : '');
}

function below1000(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  let out = '';
  if (h > 0) out = (h === 1 ? 'cent' : UNITS[h] + ' cent') + (rest > 0 ? ' ' : '');
  if (rest > 0) out += below100(rest);
  return out;
}

export function numberToWords(n: number): string {
  if (n === 0) return 'zéro';
  let out = '';
  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const rest = n % 1000;
  if (millions > 0) out += (millions === 1 ? 'un million' : below1000(millions) + ' millions') + ' ';
  if (thousands > 0) out += (thousands === 1 ? 'mille' : below1000(thousands) + ' mille') + ' ';
  if (rest > 0) out += below1000(rest);
  return out.trim();
}

/* ── Données de démonstration ──────────────────────────────────────── */

const now = new Date();
const today = now.toISOString().split('T')[0];
const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

function ts(date: string, t: string): string {
  return `${date} ${t}`;
}

export const demoDocs: BillingDoc[] = [
  /* 1 — Patient non assuré, facture payée intégralement */
  {
    id: 'doc1',
    type: 'facture',
    number: 'FAC-2026-0101',
    date: '2026-09-10',
    time: '10:25',
    patientId: 'p006',
    episode: 'EP-2026-0042',
    service: 'Urgences',
    doctor: 'Dr Koffi N\'Guessan',
    insurance: 'Non assurée',
    insuranceNumber: '',
    coverageRate: 0,
    lines: [
      { id: 'l1', category: 'Urgence', code: 'URG-001', description: 'Consultation urgences', quantity: 1, unitPrice: 20000, discount: 0, coverage: 'non-couverte', coverageRate: 0, origin: 'acte-de-soins', lineStatus: 'facturable' },
      { id: 'l2', category: 'Pharmacie', code: 'PHA-001', description: 'Médicament de démonstration', quantity: 2, unitPrice: 5000, discount: 0, coverage: 'non-couverte', coverageRate: 0, origin: 'pharmacie', lineStatus: 'facturable' },
    ],
    status: 'paye',
    payments: [
      { id: 'pay1', date: '2026-09-10', time: '11:05', mode: 'Espèces', amount: 30000, reference: 'REF-0001', cashier: 'M. Koné (Caisse)' },
    ],
    history: [
      { timestamp: ts('2026-09-10', '10:25'), action: 'Document créé' },
      { timestamp: ts('2026-09-10', '10:30'), action: 'Document validé', detail: 'Validé par M. Koné (Caisse)' },
      { timestamp: ts('2026-09-10', '11:05'), action: 'Facture encaissée', detail: '30 000 FCFA — Espèces' },
    ],
    validatedBy: 'M. Koné (Caisse)',
    validatedAt: ts('2026-09-10', '10:30'),
  },
  /* 2 — Patient assuré à 80 % */
  {
    id: 'doc2',
    type: 'facture',
    number: 'FAC-2026-0102',
    date: '2026-09-12',
    time: '09:10',
    patientId: 'p001',
    episode: 'EP-2026-0045',
    service: 'Médecine interne',
    doctor: 'Dr Awa Koné',
    insurance: 'CNAM',
    insuranceNumber: 'CNAM-225-789456',
    coverageRate: 80,
    lines: [
      { id: 'l3', category: 'Consultation', code: 'CS-001', description: 'Consultation de médecine générale', quantity: 1, unitPrice: 15000, discount: 0, coverage: 'couverte', coverageRate: 80, origin: 'manuelle', lineStatus: 'facturable' },
      { id: 'l4', category: 'Laboratoire', code: 'LAB-002', description: 'Glycémie', quantity: 1, unitPrice: 3000, discount: 0, coverage: 'couverte', coverageRate: 80, origin: 'laboratoire', lineStatus: 'facturable' },
    ],
    status: 'en-attente',
    payments: [],
    insuranceTracking: {
      status: 'transmise',
      amountToClaim: 14400,
      amountTransmitted: 14400,
      amountAccepted: 0,
      amountRejected: 0,
      amountPaid: 0,
      bordereauNumber: 'BORD-2026-077',
      transmissionDate: '2026-09-13',
    },
    history: [
      { timestamp: ts('2026-09-12', '09:10'), action: 'Document créé' },
      { timestamp: ts('2026-09-12', '09:15'), action: 'Document validé', detail: 'Validé par Mme Traoré (Facturation)' },
      { timestamp: ts('2026-09-13', '08:00'), action: 'Part assurance transmise', detail: 'Bordereau BORD-2026-077' },
    ],
    validatedBy: 'Mme Traoré (Facturation)',
    validatedAt: ts('2026-09-12', '09:15'),
  },
  /* 3 — Prestation non couverte affectée au patient */
  {
    id: 'doc3',
    type: 'facture',
    number: 'FAC-2026-0103',
    date: '2026-09-13',
    time: '14:40',
    patientId: 'p002',
    episode: 'EP-2026-0046',
    service: 'Endocrinologie',
    doctor: 'Dr Yao Brou',
    insurance: 'NSIA',
    insuranceNumber: 'NSIA-2026-1234',
    coverageRate: 80,
    lines: [
      { id: 'l5', category: 'Consultation', code: 'CS-001', description: 'Consultation de médecine générale', quantity: 1, unitPrice: 15000, discount: 0, coverage: 'couverte', coverageRate: 80, origin: 'manuelle', lineStatus: 'facturable' },
      { id: 'l6', category: 'Hospitalisation', code: 'HOSP-002', description: 'Chambre individuelle', quantity: 1, unitPrice: 15000, discount: 0, coverage: 'non-couverte', coverageRate: 0, origin: 'hospitalisation', lineStatus: 'facturable', observation: 'Confort non pris en charge' },
    ],
    status: 'partiellement-paye',
    payments: [
      { id: 'pay2', date: '2026-09-13', time: '15:20', mode: 'Mobile Money', amount: 10000, reference: 'MM-9988', cashier: 'M. Koné (Caisse)' },
    ],
    history: [
      { timestamp: ts('2026-09-13', '14:40'), action: 'Document créé' },
      { timestamp: ts('2026-09-13', '14:45'), action: 'Document validé' },
      { timestamp: ts('2026-09-13', '15:20'), action: 'Paiement partiel', detail: '10 000 FCFA — Mobile Money' },
    ],
    validatedBy: 'M. Koné (Caisse)',
    validatedAt: ts('2026-09-13', '14:45'),
  },
  /* 4 — Cotation transformée en facture */
  {
    id: 'doc4',
    type: 'cotation',
    number: 'COT-2026-0001',
    date: '2026-09-08',
    time: '11:00',
    patientId: 'p004',
    episode: 'EP-2026-0047',
    service: 'Cardiologie',
    doctor: 'Dr Ibrahim Koné',
    insurance: 'CNAM',
    insuranceNumber: 'CNAM-225-456789',
    coverageRate: 80,
    validityDays: 30,
    lines: [
      { id: 'l7', category: 'Imagerie', code: 'IMG-003', description: 'Scanner', quantity: 1, unitPrice: 60000, discount: 0, coverage: 'partiellement-couverte', coverageRate: 50, origin: 'imagerie', lineStatus: 'prevu' },
      { id: 'l8', category: 'Consultation', code: 'CS-001', description: 'Consultation de médecine générale', quantity: 1, unitPrice: 15000, discount: 0, coverage: 'couverte', coverageRate: 80, origin: 'manuelle', lineStatus: 'prevu' },
    ],
    status: 'transforme',
    payments: [],
    history: [
      { timestamp: ts('2026-09-08', '11:00'), action: 'Document créé' },
      { timestamp: ts('2026-09-08', '11:05'), action: 'Cotation validée' },
      { timestamp: ts('2026-09-14', '09:00'), action: 'Transformée en facture', detail: 'FAC-2026-0104' },
    ],
  },
  {
    id: 'doc5',
    type: 'facture',
    number: 'FAC-2026-0104',
    date: '2026-09-14',
    time: '09:00',
    patientId: 'p004',
    episode: 'EP-2026-0047',
    service: 'Cardiologie',
    doctor: 'Dr Ibrahim Koné',
    insurance: 'CNAM',
    insuranceNumber: 'CNAM-225-456789',
    coverageRate: 80,
    sourceRef: 'COT-2026-0001',
    lines: [
      { id: 'l9', category: 'Imagerie', code: 'IMG-003', description: 'Scanner', quantity: 1, unitPrice: 60000, discount: 0, coverage: 'partiellement-couverte', coverageRate: 50, origin: 'imagerie', lineStatus: 'facturable' },
      { id: 'l10', category: 'Consultation', code: 'CS-001', description: 'Consultation de médecine générale', quantity: 1, unitPrice: 15000, discount: 0, coverage: 'couverte', coverageRate: 80, origin: 'manuelle', lineStatus: 'facturable' },
    ],
    status: 'valide',
    payments: [],
    insuranceTracking: {
      status: 'a-preparer',
      amountToClaim: 42000,
      amountTransmitted: 0,
      amountAccepted: 0,
      amountRejected: 0,
      amountPaid: 0,
    },
    history: [
      { timestamp: ts('2026-09-14', '09:00'), action: 'Document créé', detail: 'Issue de la cotation COT-2026-0001' },
      { timestamp: ts('2026-09-14', '09:05'), action: 'Document validé', detail: 'Validé par Mme Traoré (Facturation)' },
    ],
    validatedBy: 'Mme Traoré (Facturation)',
    validatedAt: ts('2026-09-14', '09:05'),
  },
  /* 5 — Préfacture d'hospitalisation enrichie */
  {
    id: 'doc6',
    type: 'prefacture',
    number: 'PREF-2026-0001',
    date: '2026-09-11',
    time: '08:30',
    patientId: 'p005',
    episode: 'SEJ-2026-0012',
    service: 'Pneumologie',
    doctor: 'Dr Adjoua Kouassi',
    insurance: 'NSIA',
    insuranceNumber: 'NSIA-2026-5678',
    coverageRate: 80,
    entryDate: '2026-09-10',
    exitDate: '2026-09-14',
    lines: [
      { id: 'l11', category: 'Hospitalisation', code: 'HOSP-001', description: "Journée d'hospitalisation", quantity: 4, unitPrice: 25000, discount: 0, coverage: 'couverte', coverageRate: 80, origin: 'hospitalisation', lineStatus: 'realise' },
      { id: 'l12', category: 'Laboratoire', code: 'LAB-001', description: 'Numération formule sanguine', quantity: 1, unitPrice: 8000, discount: 0, coverage: 'couverte', coverageRate: 80, origin: 'laboratoire', lineStatus: 'realise' },
      { id: 'l13', category: 'Imagerie', code: 'IMG-002', description: 'Radiographie', quantity: 1, unitPrice: 12000, discount: 0, coverage: 'couverte', coverageRate: 70, origin: 'imagerie', lineStatus: 'realise' },
      { id: 'l14', category: 'Pharmacie', code: 'PHA-001', description: 'Médicament de démonstration', quantity: 3, unitPrice: 5000, discount: 0, coverage: 'couverte', coverageRate: 70, origin: 'pharmacie', lineStatus: 'realise' },
      { id: 'l15', category: 'Actes médicaux', code: 'ACT-001', description: 'Nébulisation thérapeutique', quantity: 3, unitPrice: 3000, discount: 0, coverage: 'couverte', coverageRate: 80, origin: 'acte-de-soins', lineStatus: 'a-confirmer' },
    ],
    status: 'en-attente',
    payments: [],
    history: [
      { timestamp: ts('2026-09-11', '08:30'), action: 'Document créé' },
      { timestamp: ts('2026-09-11', '08:35'), action: 'Prestation ajoutée', detail: 'Journée d\'hospitalisation' },
      { timestamp: ts('2026-09-12', '10:00'), action: 'Prestations actualisées', detail: 'Laboratoire + Imagerie + Pharmacie' },
    ],
  },
  /* 6 — Facture partiellement payée */
  {
    id: 'doc7',
    type: 'facture',
    number: 'FAC-2026-0105',
    date: '2026-09-15',
    time: '16:00',
    patientId: 'p008',
    episode: 'EP-2026-0048',
    service: 'Médecine interne',
    doctor: 'Dr Mamadou Diallo',
    insurance: 'NSIA',
    insuranceNumber: 'NSIA-2026-9090',
    coverageRate: 80,
    lines: [
      { id: 'l16', category: 'Consultation', code: 'CS-001', description: 'Consultation de médecine générale', quantity: 1, unitPrice: 15000, discount: 0, coverage: 'couverte', coverageRate: 80, origin: 'manuelle', lineStatus: 'facturable' },
      { id: 'l17', category: 'Laboratoire', code: 'LAB-003', description: 'Créatinine', quantity: 1, unitPrice: 4000, discount: 0, coverage: 'couverte', coverageRate: 80, origin: 'laboratoire', lineStatus: 'facturable' },
    ],
    status: 'partiellement-paye',
    payments: [
      { id: 'pay3', date: '2026-09-15', time: '16:30', mode: 'Carte bancaire', amount: 2000, reference: 'CB-4455', cashier: 'M. Koné (Caisse)' },
    ],
    history: [
      { timestamp: ts('2026-09-15', '16:00'), action: 'Document créé' },
      { timestamp: ts('2026-09-15', '16:05'), action: 'Document validé' },
      { timestamp: ts('2026-09-15', '16:30'), action: 'Paiement partiel', detail: '2 000 FCFA — Carte bancaire' },
    ],
    validatedBy: 'M. Koné (Caisse)',
    validatedAt: ts('2026-09-15', '16:05'),
  },
  /* 7 — Facture avec part assurance en attente (rejetée) */
  {
    id: 'doc8',
    type: 'facture',
    number: 'FAC-2026-0106',
    date: '2026-09-14',
    time: '13:00',
    patientId: 'p009',
    episode: 'EP-2026-0049',
    service: 'Gynécologie',
    doctor: 'Dr Mariam Koné',
    insurance: 'ASKIA',
    insuranceNumber: 'ASKIA-5566',
    coverageRate: 80,
    lines: [
      { id: 'l18', category: 'Imagerie', code: 'IMG-001', description: 'Échographie obstétricale', quantity: 1, unitPrice: 30000, discount: 0, coverage: 'couverte', coverageRate: 70, origin: 'imagerie', lineStatus: 'facturable' },
    ],
    status: 'en-attente',
    payments: [],
    insuranceTracking: {
      status: 'rejetee',
      amountToClaim: 21000,
      amountTransmitted: 21000,
      amountAccepted: 0,
      amountRejected: 21000,
      amountPaid: 0,
      rejectionReason: 'Numéro d\'assuré incomplet',
      bordereauNumber: 'BORD-2026-081',
      transmissionDate: '2026-09-14',
    },
    history: [
      { timestamp: ts('2026-09-14', '13:00'), action: 'Document créé' },
      { timestamp: ts('2026-09-14', '13:05'), action: 'Document validé' },
      { timestamp: ts('2026-09-15', '09:00'), action: 'Part assurance rejetée', detail: 'Numéro d\'assuré incomplet' },
    ],
    validatedBy: 'Mme Traoré (Facturation)',
    validatedAt: ts('2026-09-14', '13:05'),
  },
];

export { today, time };
