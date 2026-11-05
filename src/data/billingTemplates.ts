import type { BillingDocType, BillingLine, CoverageLineStatus } from '@/data/billingDocs';
import { CATEGORIES } from '@/data/billingDocs';
import { catalogue } from '@/data/billingDocs';

/* ── Types ─────────────────────────────────────────────────────────── */

export type TemplateDocType = BillingDocType | 'all';

export interface TemplateLine {
  category: string;
  code: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  coverage: CoverageLineStatus;
  coverageRate: number;
  observation?: string;
}

export interface BillingTemplate {
  id: string;
  name: string;
  code: string;
  description: string;
  docType: TemplateDocType;
  service: string;
  category: string;
  validityDays: number;
  active: boolean;
  lines: TemplateLine[];
  applyDiscount: boolean;
  coverageType: string;
  proposedCoverageRate: number;
  usuallyCovered: string;
  usuallyNotCovered: string;
  paymentConditions: string;
  patientObservations: string;
  internalNotes: string;
  createdAt: string;
  updatedAt: string;
  estimatedAmount: number;
}

/* ── Services ──────────────────────────────────────────────────────── */

export const TEMPLATE_SERVICES = [
  'Consultation',
  'Gynécologie',
  'Obstétrique',
  'Laboratoire',
  'Imagerie',
  'Pharmacie',
  'Urgences',
  'Hospitalisation',
  'Chirurgie',
  'Maternité',
  'Soins ambulatoires',
  'Autres',
] as const;

export const TEMPLATE_DOC_TYPES: { value: TemplateDocType; label: string }[] = [
  { value: 'cotation', label: 'Cotation' },
  { value: 'prefacture', label: 'Préfacture' },
  { value: 'facture', label: 'Facture' },
  { value: 'all', label: 'Tous les types' },
];

/* ── Helpers ───────────────────────────────────────────────────────── */

function findCatalogue(code: string) {
  return catalogue.find((c) => c.code === code);
}

function tLine(code: string, quantity: number, coverage: CoverageLineStatus = 'couverte', coverageRate = 80): TemplateLine {
  const c = findCatalogue(code);
  return {
    category: c?.category ?? 'Consultation',
    code,
    description: c?.label ?? code,
    quantity,
    unitPrice: c?.standardPrice ?? 0,
    discount: 0,
    coverage,
    coverageRate,
  };
}

function lineAmount(l: TemplateLine): number {
  return Math.max(0, l.quantity * l.unitPrice - l.discount);
}

export function templateEstimatedAmount(lines: TemplateLine[]): number {
  return lines.reduce((s, l) => s + lineAmount(l), 0);
}

export function templateToBillingLines(lines: TemplateLine[]): BillingLine[] {
  return lines.map((l, i) => ({
    id: `tl${Date.now()}_${i}`,
    category: l.category,
    code: l.code,
    description: l.description,
    quantity: l.quantity,
    unitPrice: l.unitPrice,
    discount: l.discount,
    coverage: l.coverage,
    coverageRate: l.coverageRate,
    origin: 'manuelle' as const,
    lineStatus: 'prevu' as const,
    observation: l.observation,
  }));
}

export function generateTemplateCode(): string {
  return `TPL-${String(Date.now()).slice(-6)}`;
}

/* ── Demo templates ────────────────────────────────────────────────── */

const demoDate = '2026-09-01';

function mk(
  id: string,
  name: string,
  code: string,
  description: string,
  docType: TemplateDocType,
  service: string,
  category: string,
  lines: TemplateLine[],
  opts?: Partial<BillingTemplate>,
): BillingTemplate {
  return {
    id,
    name,
    code,
    description,
    docType,
    service,
    category,
    validityDays: 30,
    active: true,
    lines,
    applyDiscount: false,
    coverageType: 'Patient assuré',
    proposedCoverageRate: 80,
    usuallyCovered: '',
    usuallyNotCovered: '',
    paymentConditions: '',
    patientObservations: '',
    internalNotes: '',
    createdAt: demoDate,
    updatedAt: demoDate,
    estimatedAmount: templateEstimatedAmount(lines),
    ...opts,
  };
}

export const demoTemplates: BillingTemplate[] = [
  mk(
    'tpl01',
    'Bilan prénatal standard',
    'TPL-PRENAT',
    'Bilan prénatal de routine pour consultation obstétricale',
    'all',
    'Obstétrique',
    'Consultation',
    [
      tLine('CS-003', 1),
      tLine('LAB-001', 1),
      tLine('LAB-004', 1, 'couverte', 80),
      tLine('LAB-002', 1),
      tLine('LAB-005', 1, 'partiellement-couverte', 50),
      tLine('IMG-001', 1, 'couverte', 70),
    ],
    { patientObservations: 'Bilan prénatal du 1er trimestre', internalNotes: 'Modèle de démonstration' },
  ),
  mk(
    'tpl02',
    'Consultation gynécologique',
    'TPL-GYNECO',
    'Consultation gynécologique standard avec échographie et prélèvement',
    'all',
    'Gynécologie',
    'Consultation',
    [
      tLine('CS-002', 1),
      tLine('IMG-004', 1, 'couverte', 70),
      tLine('LAB-006', 1, 'partiellement-couverte', 50),
    ],
    { patientObservations: 'Consultation gynécologique de routine' },
  ),
  mk(
    'tpl03',
    'Bilan biologique standard',
    'TPL-BIOLOG',
    'Bilan biologique de routine pour bilan pré-opératoire ou contrôle',
    'all',
    'Laboratoire',
    'Laboratoire',
    [
      tLine('LAB-001', 1),
      tLine('LAB-002', 1),
      tLine('LAB-003', 1),
      tLine('LAB-004', 1, 'couverte', 80),
    ],
  ),
  mk(
    'tpl04',
    'Accouchement voie basse',
    'TPL-ACCOVB',
    'Forfait accouchement voie basse avec surveillance et hospitalisation',
    'facture',
    'Maternité',
    'Hospitalisation',
    [
      tLine('HOSP-003', 1, 'couverte', 80),
      tLine('CS-003', 1, 'couverte', 80),
      tLine('CONS-001', 5, 'non-couverte', 0),
      tLine('PHA-001', 3, 'couverte', 70),
      tLine('HOSP-001', 2, 'couverte', 80),
    ],
    { paymentConditions: 'Forfait salle d\'accouchement inclus', internalNotes: 'Modèle de démonstration — accouchement voie basse' },
  ),
  mk(
    'tpl05',
    'Hospitalisation courte',
    'TPL-HOSPCO',
    'Hospitalisation courte durée avec visite, soins et consommables',
    'prefacture',
    'Hospitalisation',
    'Hospitalisation',
    [
      tLine('HOSP-001', 2, 'couverte', 80),
      tLine('HOSP-002', 2, 'non-couverte', 0),
      tLine('CS-001', 1, 'couverte', 80),
      tLine('CONS-001', 4, 'non-couverte', 0),
      tLine('PHA-001', 2, 'couverte', 70),
    ],
  ),
  mk(
    'tpl06',
    'Consultation générale',
    'TPL-CONSULT',
    'Consultation de médecine générale avec acte de soins',
    'all',
    'Consultation',
    'Consultation',
    [
      tLine('CS-001', 1, 'couverte', 80),
      tLine('ACT-001', 1, 'couverte', 80),
    ],
    { validityDays: 15 },
  ),
  mk(
    'tpl07',
    'Bilan échographique obstétrical',
    'TPL-ECHO',
    'Bilan échographique prénatal complet',
    'cotation',
    'Obstétrique',
    'Imagerie',
    [
      tLine('IMG-001', 1, 'couverte', 70),
      tLine('IMG-004', 1, 'partiellement-couverte', 50),
    ],
    { validityDays: 30, patientObservations: 'À réaliser à jeun' },
  ),
];
