import type { BillingDoc } from '@/data/billingDocs';
import { docTotals, today, time } from '@/data/billingDocs';

/* ── Objets distincts ──────────────────────────────────────────────── */

export type BordereauStatus = 'en-preparation' | 'transmis' | 'echec' | 'correction-demandee';

export interface BordereauLine {
  dossierId: string;
}

export interface Bordereau {
  id: string;
  number: string;
  organism: string;
  manager: string;
  status: BordereauStatus;
  mode: 'portail' | 'courrier' | 'depot-physique' | 'autre';
  lines: BordereauLine[];
  totalClaimed: number;
  invoiceCount: number;
  date: string;
  agent: string;
  depositRef?: string;
  proof?: { name: string; note: string; addedAt: string };
  observations?: string;
  history: { timestamp: string; action: string; detail?: string }[];
}

export type PieceStatus = 'a-fournir' | 'jointe-a-verifier' | 'conforme' | 'rejetee' | 'non-applicable';
export type PieceStage = 'avant-emission' | 'finale';

export interface RequiredPiece {
  id: string;
  label: string;
  mandatory: boolean;
  stage: PieceStage;
  dueStep: number;
  status: PieceStatus;
  document?: { name: string; version: string; addedAt: string; author: string; simulated?: boolean };
  ownerService?: string;
  controlComment?: string;
  rejectedReason?: string;
}

export type ControlLevel = 'ok' | 'warning' | 'blocking' | 'n/a';

export interface AutoControl {
  id: string;
  label: string;
  level: ControlLevel;
  detail?: string;
}

/* ── Dossier assurance ─────────────────────────────────────────────── */

export type DossierStatus = 'en-cours' | 'bloque' | 'pret-transmission' | 'transmis' | 'a-corriger';

export interface DossierAssurance {
  id: string;
  number: string;
  docId: string;
  prefactureRef?: string;
  episodeNumber: string;
  service: string;
  carePeriod: string;
  status: DossierStatus;
  blockingReason?: string;
  responsible: string;
  lastUpdate: string;
  coverage: {
    insurer: string;
    manager?: string;
    memberNumber: string;
    beneficiary?: string;
    validity: string;
    rightsChecked: string;
    rightsSource: 'saisie manuelle' | 'intégration';
    rate: number;
    deductible: string;
    exclusions: string;
    annualCeiling: string;
    ceilingChecked: string;
    priorAgreementRequired: boolean;
    priorAgreementRef?: string;
    priorAgreementDate?: string;
    priorAgreementDoc?: string;
    authorizedServices: string;
    authorizedAmount: number;
    bonValidity: string;
  };
  pieces: RequiredPiece[];
  transmission?: {
    status: 'pret' | 'en-cours' | 'transmis' | 'echec' | 'correction-demandee';
    bordereauId?: string;
    date?: string;
    agent?: string;
    depositRef?: string;
    proofAdded?: boolean;
  };
  corrections?: { reason: string; items: string; service: string; requestedAt: string }[];
  history: { timestamp: string; user: string; action: string; detail?: string }[];
}

export const DOSSIER_STATUS_META: Record<DossierStatus, { label: string; color: 'navy' | 'green' | 'red' | 'amber' | 'blue' | 'turquoise' }> = {
  'en-cours': { label: 'En cours', color: 'blue' },
  'bloque': { label: 'Bloqué', color: 'red' },
  'pret-transmission': { label: 'Prêt à transmettre', color: 'green' },
  'transmis': { label: 'Transmis', color: 'turquoise' },
  'a-corriger': { label: 'À corriger', color: 'amber' },
};

export const STEP_LABELS = [
  { num: 1, title: 'Accueil', subtitle: 'Admission', tab: '1 · ACCUEIL' },
  { num: 2, title: 'Accueil / Assurance', subtitle: 'Prise en charge', tab: '2 · ACCUEIL / ASSURANCE' },
  { num: 3, title: 'Soignants', subtitle: 'Soins', tab: '3 · SOIGNANTS' },
  { num: 4, title: 'Facturation', subtitle: 'Préfacturation', tab: '4 · FACTURATION' },
  { num: 5, title: 'Contrôle', subtitle: 'Conformité', tab: '5 · CONTRÔLE' },
  { num: 6, title: 'Facturation', subtitle: 'Facture et bon', tab: '6 · FACTURATION' },
  { num: 7, title: 'Soumission', subtitle: 'Transmission', tab: '7 · SOUMISSION' },
] as const;

export const PIECE_STATUS_META: Record<PieceStatus, { label: string; color: 'navy' | 'green' | 'red' | 'amber' | 'blue' }> = {
  'a-fournir': { label: 'À fournir', color: 'navy' },
  'jointe-a-verifier': { label: 'Joint à vérifier', color: 'amber' },
  'conforme': { label: 'Conforme', color: 'green' },
  'rejetee': { label: 'Rejeté', color: 'red' },
  'non-applicable': { label: 'Non applicable', color: 'blue' },
};

export const CONTROL_META: Record<ControlLevel, { color: 'green' | 'amber' | 'red' | 'navy'; icon: 'check' | 'warn' | 'block' | 'na' }> = {
  ok: { color: 'green', icon: 'check' },
  warning: { color: 'amber', icon: 'warn' },
  blocking: { color: 'red', icon: 'block' },
  'n/a': { color: 'navy', icon: 'na' },
};

/* ── Contrôles automatiques ────────────────────────────────────────── */

export function buildControls(dossier: DossierAssurance, doc: BillingDoc): AutoControl[] {
  const t = docTotals(doc);
  const cov = dossier.coverage;
  const controls: AutoControl[] = [];

  const bonValid = cov.bonValidity !== '—' && cov.bonValidity >= (doc.entryDate ?? doc.date);
  controls.push({
    id: 'bon',
    label: 'Bon de prise en charge valide',
    level: bonValid ? 'ok' : 'blocking',
    detail: bonValid ? `expire le ${cov.bonValidity}` : `expiré depuis le ${cov.bonValidity}`,
  });

  controls.push({
    id: 'taux',
    label: `Tarif assurance ≤ montant autorisé`,
    level: t.partAssurance <= cov.authorizedAmount ? 'ok' : 'blocking',
    detail: `${t.partAssurance} ≤ ${cov.authorizedAmount}`,
  });

  const conventions = doc.lines.every((l) => l.coverage === 'couverte' || l.coverage === 'partiellement-couverte' || l.coverage === 'non-couverte');
  controls.push({ id: 'conventions', label: 'Tarifs conventionnés appliqués', level: conventions ? 'ok' : 'warning', detail: '12 lignes conformes à la convention 2026' });

  const coherent = t.net === t.partAssurance + t.partPatient;
  controls.push({ id: 'coherence', label: 'Cohérence total = part patient + part assurance', level: coherent ? 'ok' : 'blocking', detail: `${t.net} = ${t.partPatient} + ${t.partAssurance}` });

  const doubles = doc.lines.filter((l, i) => doc.lines.findIndex((x) => x.code && x.code === l.code) !== i);
  controls.push({ id: 'doubles', label: 'Aucun doublon de facture ou prestation', level: doubles.length ? 'blocking' : 'ok', detail: doubles.length ? `${doubles.length} doublon(s)` : undefined });

  const excluded = doc.lines.filter((l) => l.coverage === 'non-couverte');
  controls.push({
    id: 'exclusion',
    label: 'Prestation non couverte détectée',
    level: excluded.length ? 'warning' : 'n/a',
    detail: excluded.length
      ? `${excluded.reduce((s, l) => s + l.quantity * l.unitPrice - l.discount, 0)} FCFA reportés en part patient`
      : undefined,
  });

  return controls;
}

/* ── Liste des pièces finales attendues à l'étape 6 ────────────────── */

export const FINAL_STEP_PIECE_IDS = ['facture', 'signatures', 'cachet'];

/* ── Scénario de démonstration ─────────────────────────────────────── */

export const demoDossiers: DossierAssurance[] = [
  {
    id: 'da-871',
    number: 'DA-2026-00871',
    docId: 'doc-pref-871',
    prefactureRef: 'PP-2026-00188',
    episodeNumber: 'V-2026-02390',
    service: 'Maternité',
    carePeriod: '15/10/2026 au 17/10/2026',
    status: 'bloque',
    blockingReason: "compte rendu d'accouchement absent — la soumission reste impossible tant que la pièce n'est pas jointe",
    responsible: 'Agent de facturation',
    lastUpdate: '2026-10-17 11:20',
    coverage: {
      insurer: 'Assureur A (gestionnaire B)',
      manager: 'Gestionnaire B',
      memberNumber: 'AS-458 221 — assurée principale',
      beneficiary: 'YAO Adjoua Estelle (assurée)',
      validity: '01/01 — 31/12/2026',
      rightsChecked: '15/10/2026 08:25 (portail)',
      rightsSource: 'saisie manuelle',
      rate: 80,
      deductible: '80% — aucune',
      exclusions: 'Périodable non couverte',
      annualCeiling: '1 250 000 FCFA',
      ceilingChecked: '15/10/2026 08:25 (portail)',
      priorAgreementRequired: true,
      priorAgreementRef: 'BPC-A-26-55120',
      priorAgreementDate: '15/10/2026',
      priorAgreementDoc: 'Accord BPC-A-26-55120 joint',
      authorizedServices: 'Forfait accouchement VB · 3 jours',
      authorizedAmount: 350000,
      bonValidity: '14/11/2026',
    },
    pieces: [
      { id: 'bpc', label: 'Bon de prise en charge en cours (scan) joint le 15/10 — tiers payant', mandatory: true, stage: 'avant-emission', dueStep: 2, status: 'conforme', document: { name: 'BPC-A-26-55120.pdf', version: 'v1', addedAt: '15/10/2026', author: 'Accueil' }, ownerService: 'Accueil', controlComment: 'Conforme' },
      { id: 'fiche-soins', label: 'Fiche de soins / bulletin de prestations', mandatory: true, stage: 'avant-emission', dueStep: 3, status: 'conforme', document: { name: 'Fiche-soins-V-02390.pdf', version: 'v1', addedAt: '16/10/2026', author: 'Soignants' }, ownerService: 'Soins', controlComment: 'Conforme' },
      { id: 'labo', label: 'Résultats de laboratoire', mandatory: true, stage: 'avant-emission', dueStep: 3, status: 'conforme', document: { name: 'Labo-NFS-02390.pdf', version: 'v1', addedAt: '16/10/2026', author: 'Laboratoire' }, ownerService: 'Laboratoire', controlComment: 'Conforme' },
      { id: 'ordonnance', label: 'Ordonnance de sortie', mandatory: false, stage: 'avant-emission', dueStep: 3, status: 'conforme', document: { name: 'Ordonnance-02390.pdf', version: 'v1', addedAt: '17/10/2026', author: 'Dr Sagé-femme' }, ownerService: 'Soins', controlComment: 'Conforme' },
      { id: 'cr-accouchement', label: "Compte rendu d'accouchement", mandatory: true, stage: 'avant-emission', dueStep: 3, status: 'a-fournir', ownerService: 'Sage-femme', controlComment: "demandé à la sage-femme le 17/10 11:20" },
      { id: 'signatures', label: 'Signatures patient, praticien, cachet clinique', mandatory: true, stage: 'finale', dueStep: 6, status: 'a-fournir', ownerService: 'Facturation', controlComment: 'à recueillir à l\u2019étape 6' },
    ],
    transmission: { status: 'pret' },
    history: [
      { timestamp: '15/10 07:40', user: 'Agent tiers payant', action: 'Accord BPC-A-26-55120 joint' },
      { timestamp: '17/10 10:02', user: 'Agent de facturation', action: 'Préfacture passée en part patient' },
      { timestamp: '17/10 11:15', user: 'Agent de facturation', action: 'Préfacture validée' },
      { timestamp: '17/10 11:20', user: 'Contrôle automatique', action: 'Dossier incomplet : CR d\u2019accouchement' },
    ],
  },
  {
    id: 'da-854',
    number: 'DA-2026-00854',
    docId: 'doc5',
    episodeNumber: 'EP-2026-0047',
    service: 'Cardiologie',
    carePeriod: '08/09/2026 au 14/09/2026',
    status: 'transmis',
    responsible: 'Mme Traoré (Facturation)',
    lastUpdate: '2026-09-15 10:30',
    coverage: {
      insurer: 'CNAM',
      manager: 'Gestionnaire CNAM',
      memberNumber: 'CNAM-225-456789 — assurée principale',
      beneficiary: 'KOFFI Tanoh (assuré)',
      validity: '01/01 — 31/12/2026',
      rightsChecked: '08/09/2026 09:00 (portail)',
      rightsSource: 'intégration',
      rate: 80,
      deductible: '80% — aucune',
      exclusions: 'Aucune',
      annualCeiling: '2 000 000 FCFA',
      ceilingChecked: '08/09/2026 09:00 (portail)',
      priorAgreementRequired: false,
      authorizedServices: 'Cardiologie — consultations et imagerie',
      authorizedAmount: 2000000,
      bonValidity: '30/09/2026',
    },
    pieces: [
      { id: 'bpc', label: 'Bon de prise en charge', mandatory: true, stage: 'avant-emission', dueStep: 2, status: 'conforme', document: { name: 'BPC-CARD-0047.pdf', version: 'v1', addedAt: '08/09/2026', author: 'Accueil' }, ownerService: 'Accueil' },
      { id: 'fiche-soins', label: 'Fiche de soins / bulletin de prestations', mandatory: true, stage: 'avant-emission', dueStep: 3, status: 'conforme', document: { name: 'Fiche-soins-0047.pdf', version: 'v1', addedAt: '12/09/2026', author: 'Soignants' }, ownerService: 'Soins' },
      { id: 'labo', label: 'Résultats de laboratoire', mandatory: false, stage: 'avant-emission', dueStep: 3, status: 'non-applicable' },
      { id: 'facture', label: 'Facture', mandatory: true, stage: 'finale', dueStep: 6, status: 'conforme', document: { name: 'FAC-2026-0104.pdf', version: 'v1', addedAt: '15/09/2026', author: 'Facturation' }, ownerService: 'Facturation' },
      { id: 'signatures', label: 'Signatures patient, praticien, cachet clinique', mandatory: true, stage: 'finale', dueStep: 6, status: 'conforme', document: { name: 'Signatures-0104.pdf', version: 'v1', addedAt: '15/09/2026', author: 'Facturation', simulated: true }, ownerService: 'Facturation', controlComment: 'signatures simulées dans le prototype' },
    ],
    transmission: {
      status: 'transmis',
      bordereauId: 'bord-077',
      date: '2026-09-15',
      agent: 'Mme Traoré (Facturation)',
      depositRef: 'DEP-2026-0455',
      proofAdded: true,
    },
    history: [
      { timestamp: '14/09 09:00', user: 'Facturation', action: 'Facture émise', detail: 'FAC-2026-0104' },
      { timestamp: '15/09 10:00', user: 'Mme Traoré', action: 'Contrôle final conforme' },
      { timestamp: '15/09 10:30', user: 'Mme Traoré', action: 'Transmission', detail: 'Bordereau BORD-2026-077 · dépôt DEP-2026-0455' },
    ],
  },
  {
    id: 'da-812',
    number: 'DA-2026-00812',
    docId: 'doc8',
    episodeNumber: 'EP-2026-0049',
    service: 'Gynécologie',
    carePeriod: '14/09/2026',
    status: 'a-corriger',
    blockingReason: "rejet organisme : numéro d'assuré incomplet",
    responsible: 'Mme Traoré (Facturation)',
    lastUpdate: '2026-09-16 09:00',
    coverage: {
      insurer: 'ASKIA',
      manager: 'Gestionnaire ASKIA',
      memberNumber: 'ASKIA-5566 — assurée principale',
      beneficiary: 'KONÉ Mariam (assurée)',
      validity: '01/01 — 31/12/2026',
      rightsChecked: '14/09/2026 09:00 (portail)',
      rightsSource: 'saisie manuelle',
      rate: 80,
      deductible: '80% — aucune',
      exclusions: 'Aucune',
      annualCeiling: '1 500 000 FCFA',
      ceilingChecked: '14/09/2026 09:00 (portail)',
      priorAgreementRequired: false,
      authorizedServices: 'Gynécologie — échographie',
      authorizedAmount: 500000,
      bonValidity: '30/09/2026',
    },
    pieces: [
      { id: 'bpc', label: 'Bon de prise en charge', mandatory: true, stage: 'avant-emission', dueStep: 2, status: 'conforme', document: { name: 'BPC-GYN-0049.pdf', version: 'v1', addedAt: '14/09/2026', author: 'Accueil' }, ownerService: 'Accueil' },
      { id: 'fiche-soins', label: 'Fiche de soins / bulletin de prestations', mandatory: true, stage: 'avant-emission', dueStep: 3, status: 'conforme', document: { name: 'Fiche-soins-0049.pdf', version: 'v1', addedAt: '14/09/2026', author: 'Soignants' }, ownerService: 'Soins' },
      { id: 'facture', label: 'Facture', mandatory: true, stage: 'finale', dueStep: 6, status: 'conforme', document: { name: 'FAC-2026-0106.pdf', version: 'v1', addedAt: '14/09/2026', author: 'Facturation' }, ownerService: 'Facturation' },
      { id: 'signatures', label: 'Signatures patient, praticien, cachet clinique', mandatory: true, stage: 'finale', dueStep: 6, status: 'conforme', document: { name: 'Signatures-0106.pdf', version: 'v1', addedAt: '14/09/2026', author: 'Facturation', simulated: true }, ownerService: 'Facturation', controlComment: 'signatures simulées' },
    ],
    transmission: { status: 'correction-demandee', bordereauId: 'bord-081', date: '2026-09-14', agent: 'Mme Traoré (Facturation)', depositRef: 'DEP-2026-0448' },
    history: [
      { timestamp: '14/09 13:05', user: 'Facturation', action: 'Facture émise', detail: 'FAC-2026-0106' },
      { timestamp: '14/09 16:00', user: 'Mme Traoré', action: 'Transmission', detail: 'Bordereau BORD-2026-081' },
      { timestamp: '15/09 09:00', user: 'Organisme', action: 'Rejet', detail: "Numéro d'assuré incomplet" },
      { timestamp: '16/09 09:00', user: 'Mme Traoré', action: 'Renvoi en correction', detail: 'Compléter le numéro d\u2019assuré puis retransmettre' },
    ],
  },
];

/* Bordereaux existants (liés aux transmissions) */
export const demoBordereaux: Bordereau[] = [
  {
    id: 'bord-077',
    number: 'BORD-2026-077',
    organism: 'CNAM',
    manager: 'Gestionnaire CNAM',
    status: 'transmis',
    mode: 'portail',
    lines: [{ dossierId: 'da-854' }],
    totalClaimed: 42000,
    invoiceCount: 1,
    date: '2026-09-15',
    agent: 'Mme Traoré (Facturation)',
    depositRef: 'DEP-2026-0455',
    proof: { name: 'Accusé-depot-0455.pdf', note: 'Accusé de dépôt portail (simulé)', addedAt: '15/09/2026' },
    history: [{ timestamp: '15/09 10:30', action: 'Transmission enregistrée', detail: 'Preuve de dépôt jointe (simulée)' }],
  },
  {
    id: 'bord-081',
    number: 'BORD-2026-081',
    organism: 'ASKIA',
    manager: 'Gestionnaire ASKIA',
    status: 'correction-demandee',
    mode: 'courrier',
    lines: [{ dossierId: 'da-812' }],
    totalClaimed: 21000,
    invoiceCount: 1,
    date: '2026-09-14',
    agent: 'Mme Traoré (Facturation)',
    depositRef: 'DEP-2026-0448',
    history: [{ timestamp: '14/09 16:00', action: 'Transmission enregistrée' }, { timestamp: '15/09 09:00', action: 'Correction demandée', detail: "Numéro d'assuré incomplet" }],
  },
];

/* ── Préfacture du scénario DA-2026-00871 ──────────────────────────── */

export const scenarioPrefacture: BillingDoc = {
  id: 'doc-pref-871',
  type: 'prefacture',
  number: 'PP-2026-00188',
  date: '2026-10-17',
  time: '11:15',
  patientId: 'p021',
  episode: 'V-2026-02390',
  service: 'Maternité',
  doctor: 'Dr Mariam Koné (Sage-femme)',
  insurance: 'Assureur A (gestionnaire B)',
  insuranceNumber: 'AS-458 221',
  coverageRate: 80,
  entryDate: '2026-10-15',
  exitDate: '2026-10-17',
  status: 'en-attente',
  payments: [],
  lines: [
    { id: 'pl1', category: 'Hospitalisation', code: 'HOSP-003', description: 'Forfait salle d\u2019accouchement', quantity: 1, unitPrice: 80000, discount: 0, coverage: 'couverte', coverageRate: 80, origin: 'hospitalisation', lineStatus: 'realise' },
    { id: 'pl2', category: 'Hospitalisation', code: 'HOSP-001', description: "Journée d'hospitalisation", quantity: 3, unitPrice: 25000, discount: 0, coverage: 'couverte', coverageRate: 80, origin: 'hospitalisation', lineStatus: 'realise' },
    { id: 'pl3', category: 'Actes médicaux', code: 'ACT-001', description: 'Actes de soins accouchement', quantity: 3, unitPrice: 12000, discount: 0, coverage: 'couverte', coverageRate: 80, origin: 'acte-de-soins', lineStatus: 'realise' },
    { id: 'pl4', category: 'Laboratoire', code: 'LAB-001', description: 'Numération formule sanguine', quantity: 1, unitPrice: 8000, discount: 0, coverage: 'couverte', coverageRate: 80, origin: 'laboratoire', lineStatus: 'realise' },
    { id: 'pl5', category: 'Pharmacie', code: 'PHA-001', description: 'Médicaments et consommables non couverts', quantity: 1, unitPrice: 45000, discount: 0, coverage: 'non-couverte', coverageRate: 0, origin: 'pharmacie', lineStatus: 'facturable', observation: 'Prestation exclue reportée en part patient' },
    { id: 'pl6', category: 'Actes médicaux', code: 'ACT-001', description: 'Surveillance post-partum', quantity: 2, unitPrice: 9500, discount: 0, coverage: 'couverte', coverageRate: 80, origin: 'acte-de-soins', lineStatus: 'realise' },
  ],
  history: [
    { timestamp: '2026-10-15 07:40', action: 'Préfacture créée', detail: 'Venue V-2026-02390 — Maternité' },
    { timestamp: '2026-10-17 10:02', action: 'Préfacture passée en part patient', detail: '45 000 FCFA (exclusion)' },
    { timestamp: '2026-10-17 11:15', action: 'Préfacture validée', detail: 'Validée par Agent de facturation' },
  ],
  validatedBy: 'Agent de facturation',
  validatedAt: '2026-10-17 11:15',
};

export function newDossierNumber(existing: DossierAssurance[]): string {
  return `DA-2026-${String(existing.length + 872).padStart(5, '0')}`;
}

/* Retrouve le dossier assurance lié à une facture : lien direct (docId),
   ou via la préfacture d'origine (sourceRef contient le n° de la préfacture). */
export function findDossierByDocId(docs: BillingDoc[], dossiers: DossierAssurance[], docId: string): DossierAssurance | undefined {
  const doc = docs.find((d) => d.id === docId);
  if (!doc) return undefined;
  const direct = dossiers.find((d) => d.docId === docId);
  if (direct) return direct;
  if (doc.sourceRef) {
    const source = docs.find((d) => d.number === doc.sourceRef);
    if (source) return dossiers.find((d) => d.docId === source.id);
  }
  return undefined;
}

/* Crée (simulation) un dossier assurance minimal pour une facture qui n'en a pas encore,
   en réutilisant la couverture de la préfacture si elle existe. */
export function createDossierForDoc(doc: BillingDoc): DossierAssurance {
  const covRate = doc.coverageRate;
  return {
    id: `da-${Date.now()}`,
    number: newDossierNumber(demoDossiers),
    docId: doc.id,
    prefactureRef: doc.sourceRef,
    episodeNumber: doc.episode,
    service: doc.service,
    carePeriod: doc.entryDate && doc.exitDate ? `${formatDateFr(doc.entryDate)} au ${formatDateFr(doc.exitDate)}` : formatDateFr(doc.date),
    status: 'en-cours',
    responsible: 'Agent de facturation',
    lastUpdate: nowStamp(),
    coverage: {
      insurer: doc.insurance,
      manager: undefined,
      memberNumber: doc.insuranceNumber || 'Non renseigné',
      beneficiary: undefined,
      validity: '01/01 — 31/12/2026',
      rightsChecked: '—',
      rightsSource: 'saisie manuelle',
      rate: covRate,
      deductible: `${covRate}% — aucune`,
      exclusions: 'Aucune',
      annualCeiling: '—',
      ceilingChecked: '—',
      priorAgreementRequired: false,
      authorizedServices: doc.service,
      authorizedAmount: Number.MAX_SAFE_INTEGER,
      bonValidity: '31/12/2026',
    },
    pieces: [
      { id: 'bpc', label: 'Bon de prise en charge', mandatory: true, stage: 'avant-emission', dueStep: 2, status: 'a-fournir', ownerService: 'Accueil' },
      { id: 'fiche-soins', label: 'Fiche de soins / bulletin de prestations', mandatory: true, stage: 'avant-emission', dueStep: 3, status: 'a-fournir', ownerService: 'Soins' },
      { id: 'facture', label: 'Facture', mandatory: true, stage: 'finale', dueStep: 6, status: 'jointe-a-verifier', document: { name: `${doc.number}.pdf`, version: 'v1', addedAt: nowStamp(), author: 'Facturation' }, ownerService: 'Facturation' },
      { id: 'signatures', label: 'Signatures patient, praticien, cachet clinique', mandatory: true, stage: 'finale', dueStep: 6, status: 'a-fournir', ownerService: 'Facturation' },
    ],
    transmission: { status: 'pret' },
    history: [
      { timestamp: nowStamp(), user: 'Agent de facturation', action: 'Dossier assurance créé depuis la facture', detail: doc.number },
    ],
  };
}

function formatDateFr(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function nowStamp(): string {
  return `${today} ${time}`;
}
