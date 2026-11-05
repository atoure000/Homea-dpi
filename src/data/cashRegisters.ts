/* ── Module Caisse HOMEA — prototype simulé ─────────────────────────
   Postes, sessions de caisse, mouvements, comptages, clôtures.
   Auteurs issus de l'utilisateur actif (LoginSession), jamais saisis.
   Les validations sont simulées : elles ne sont pas des signatures
   électroniques certifiées. Contrôles appliqués dans cette couche.   */

export type CashSessionStatus =
  | 'ouverture-a-confirmer'
  | 'ouverte'
  | 'cloture-en-preparation'
  | 'soumise-au-controle'
  | 'correction-demandee'
  | 'cloturee';

export const CASH_SESSION_STATUS_META: Record<CashSessionStatus, { label: string; color: 'navy' | 'green' | 'red' | 'amber' | 'blue' | 'turquoise' }> = {
  'ouverture-a-confirmer': { label: 'Ouverture à confirmer', color: 'amber' },
  ouverte: { label: 'Ouverte', color: 'green' },
  'cloture-en-preparation': { label: 'Clôture en préparation', color: 'blue' },
  'soumise-au-controle': { label: 'Soumise au contrôle', color: 'turquoise' },
  'correction-demandee': { label: 'Correction demandée', color: 'red' },
  cloturee: { label: 'Clôturée', color: 'navy' },
};

export type CashPaymentMode = 'Espèces' | 'Mobile Money' | 'Carte bancaire' | 'Virement' | 'Chèque' | 'Autre';
export const CASH_PAYMENT_MODES: CashPaymentMode[] = ['Espèces', 'Mobile Money', 'Carte bancaire', 'Virement', 'Chèque', 'Autre'];

export type CashPaymentState = 'en-attente' | 'confirme' | 'echoue' | 'annule';
export const CASH_PAYMENT_STATE_META: Record<CashPaymentState, { label: string; color: 'navy' | 'green' | 'red' | 'amber' | 'blue' | 'turquoise' }> = {
  'en-attente': { label: 'En attente', color: 'amber' },
  confirme: { label: 'Confirmé', color: 'green' },
  echoue: { label: 'Échoué', color: 'red' },
  annule: { label: 'Annulé', color: 'navy' },
};

export type MovementKind =
  | 'encaissement'
  | 'remboursement'
  | 'apport-fonds'
  | 'retrait-securite'
  | 'remise-responsable'
  | 'transfert-sortant'
  | 'transfert-entrant'
  | 'sortie-exceptionnelle';

export const MOVEMENT_KIND_META: Record<MovementKind, { label: string; sign: 1 | -1 | 0 }> = {
  encaissement: { label: 'Encaissement', sign: 1 },
  remboursement: { label: 'Remboursement', sign: -1 },
  'apport-fonds': { label: 'Apport de fonds', sign: 1 },
  'retrait-securite': { label: 'Retrait de sécurité', sign: -1 },
  'remise-responsable': { label: 'Remise au responsable / coffre', sign: -1 },
  'transfert-sortant': { label: 'Transfert sortant', sign: -1 },
  'transfert-entrant': { label: 'Transfert entrant', sign: 1 },
  'sortie-exceptionnelle': { label: 'Sortie exceptionnelle', sign: -1 },
};

/** Mouvements qui touchent le tiroir en espèces (signe non nul). */
export const CASH_MOVEMENT_KINDS: MovementKind[] = ['encaissement', 'remboursement', 'apport-fonds', 'retrait-securite', 'remise-responsable', 'transfert-sortant', 'transfert-entrant', 'sortie-exceptionnelle'];

export interface CashDenomination {
  coupure: number; // 10000, 5000, 2000, 1000, 500, 250, 200, 100...
  quantity: number;
}

export interface CashRegister {
  id: string;
  name: string;
  location: string;
  active: boolean;
  defaultFloat: number;
}

export interface CashSessionApproval {
  action: string;
  approver: string;
  at: string;
  reason?: string;
}

export interface CashSession {
  id: string;
  number: string;
  registerId: string;
  agent: string; // nom de l'utilisateur actif, jamais librement saisi
  activityDate: string; // date d'activité explicite (peut traverser minuit)
  openedAt: string; // horodatage réel
  initialFloat: number;
  floatOrigin: string;
  openingNote?: string;
  openingCount: CashDenomination[];
  openingGap: number; // compté - attendu à l'ouverture
  status: CashSessionStatus;
  submittedAt?: string;
  submittedCount?: CashDenomination[];
  submittedNote?: string;
  submittedGap?: number;
  submittedGapReason?: string;
  submittedTotal?: number;
  controller?: string;
  controllerCount?: CashDenomination[];
  controllerTotal?: number;
  controllerNote?: string;
  validatedAt?: string;
  returnedReason?: string;
  approvals: CashSessionApproval[];
  handover?: {
    countedBefore: number;
    remitted: number;
    kept: number;
    afterRemittance: number;
    receiptNumber: string;
    at: string;
    receivedBy: string;
  };
  exceptionalClosure?: { reason: string; by: string; note: string; at: string };
}

export interface CashMovement {
  id: string;
  number: string;
  sessionId: string;
  kind: MovementKind;
  amount: number; // toujours positif ; le signe dépend du kind
  cashAmount: number; // entrée/sortie réelle d'espèces (0 si autre mode)
  mode: CashPaymentMode;
  paymentState: CashPaymentState;
  patientId?: string;
  docId?: string;
  creditNoteId?: string;
  advanceId?: string;
  refundOfPaymentId?: string;
  transferToSessionId?: string;
  reference?: string;
  label: string;
  reason?: string;
  beneficiary?: string;
  createdBy: string;
  approvedBy?: string;
  occurredAt: string;
  recordedAt: string;
  status: 'actif' | 'annule';
  cancelOfId?: string;
  cancelledBy?: string;
  cancellationReason?: string;
  receiptNumber?: string;
  reprintOfReceipt?: string; // duplicata
}

export interface CashCountLine {
  coupure: number;
  quantity: number;
}

export interface CashAdvance {
  id: string;
  number: string;
  sessionId: string;
  patientId?: string;
  beneficiary: string;
  amount: number;
  mode: CashPaymentMode;
  reason: string;
  createdBy: string;
  occurredAt: string;
  appliedAmount: number; // affecté à des factures
  status: 'disponible' | 'affectee' | 'remboursee';
}

export interface CashAuditEvent {
  id: string;
  at: string;
  user: string;
  action: string;
  detail?: string;
}

export interface CashSettings {
  allowMultipleSessionsPerDay: boolean;
  securityWithdrawalThreshold: number;
  refundApprovalThreshold: number;
  gapValidationThreshold: number;
  expectedFloat: number;
}

/* ── Postes par défaut ─────────────────────────────────────────────── */

export const DEFAULT_REGISTERS: CashRegister[] = [
  { id: 'reg-accueil', name: 'Caisse Accueil', location: 'Hall principal', active: true, defaultFloat: 50000 },
  { id: 'reg-urgences', name: 'Caisse Urgences', location: 'Service Urgences', active: true, defaultFloat: 25000 },
  { id: 'reg-pharmacie', name: 'Caisse Pharmacie', location: 'Guichet pharmacie', active: true, defaultFloat: 20000 },
];

/* ── Paramétrage par défaut ────────────────────────────────────────── */

export const DEFAULT_CASH_SETTINGS: CashSettings = {
  allowMultipleSessionsPerDay: false,
  securityWithdrawalThreshold: 300000,
  refundApprovalThreshold: 25000,
  gapValidationThreshold: 5000,
  expectedFloat: 50000,
};

/* ── Coupures FCFA ─────────────────────────────────────────────────── */

export const DENOMINATIONS: number[] = [10000, 5000, 2000, 1000, 500, 250, 200, 100, 50, 25, 10, 5];

export function countTotal(lines: CashCountLine[] | CashDenomination[] | undefined): number {
  if (!lines) return 0;
  return lines.reduce((s, l) => s + l.coupure * l.quantity, 0);
}

/* ── Couche commune de données (prototype local) ───────────────────── */

const LS_KEY = 'homea-cash-state-v1';

export interface CashState {
  registers: CashRegister[];
  sessions: CashSession[];
  movements: CashMovement[];
  advances: CashAdvance[];
  settings: CashSettings;
  audit: CashAuditEvent[];
  reprints: Record<string, number>;
  seq: number;
}

let state: CashState | null = null;
const listeners: (() => void)[] = [];

function nowStamp(): string {
  return new Date().toISOString();
}

function stampShort(): string {
  return new Date().toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function load(): CashState {
  if (state) return state;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      state = JSON.parse(raw) as CashState;
      if (state && !state.reprints) state.reprints = {};
      return state;
    }
  } catch {
    /* donnée corrompue : on repart du scénario */
  }
  state = buildDemoState();
  persist();
  return state;
}

function persist() {
  if (!state) return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {
    /* quota : le prototype continue en mémoire */
  }
  listeners.forEach((l) => l());
}

export function subscribeCash(listener: () => void): () => void {
  listeners.push(listener);
  return () => {
    const i = listeners.indexOf(listener);
    if (i >= 0) listeners.splice(i, 1);
  };
}

export function getCashState(): CashState {
  return load();
}

export function resetCashState(): void {
  state = buildDemoState();
  persist();
}

export function addAudit(user: string, action: string, detail?: string): void {
  const s = load();
  s.audit.unshift({ id: `aud-${s.seq++}`, at: stampShort(), user, action, detail });
  persist();
}

export function getAudit(): CashAuditEvent[] {
  return load().audit;
}

function nextNumber(prefix: string): string {
  const s = load();
  return `${prefix}-${String(s.seq++).padStart(4, '0')}`;
}

/* ── Règles de gestion ─────────────────────────────────────────────── */

export class CashRuleError extends Error {}

function requireOpenSession(sessionId: string): CashSession {
  const s = load();
  const session = s.sessions.find((x) => x.id === sessionId);
  if (!session) throw new CashRuleError('Session introuvable.');
  if (session.status !== 'ouverte') throw new CashRuleError('Session non ouverte aux mouvements (statut : ' + CASH_SESSION_STATUS_META[session.status].label + ').');
  return session;
}

/** Seule la session ouverte de l'agent courant accepte ses mouvements. */
export function getMyOpenSession(agent: string): CashSession | null {
  const s = load();
  return s.sessions.find((x) => x.agent === agent && x.status === 'ouverte') ?? null;
}

export function openSession(params: {
  agent: string;
  registerId: string;
  activityDate: string;
  initialFloat: number;
  floatOrigin: string;
  note?: string;
  count: CashDenomination[];
  expectedFloat?: number;
}): CashSession {
  const s = load();
  if (s.sessions.some((x) => x.agent === params.agent && x.status === 'ouverte')) {
    throw new CashRuleError('Vous avez déjà une session ouverte. Clôturez-la avant d’en ouvrir une nouvelle.');
  }
  const registerBusy = s.sessions.find((x) => x.registerId === params.registerId && ['ouverte', 'cloture-en-preparation', 'soumise-au-controle', 'correction-demandee'].includes(x.status));
  if (registerBusy) {
    throw new CashRuleError(`Le poste « ${s.registers.find((r) => r.id === params.registerId)?.name} » est déjà occupé par une session active (agent : ${registerBusy.agent}).`);
  }
  if (!s.settings.allowMultipleSessionsPerDay && s.sessions.some((x) => x.agent === params.agent && x.activityDate === params.activityDate && x.status !== 'cloturee')) {
    throw new CashRuleError('Une session existe déjà à votre nom pour cette date d’activité (paramétrage : une session par agent et par jour).');
  }
  const counted = countTotal(params.count);
  const gap = params.initialFloat - counted;
  if (gap !== 0 && !params.note) {
    throw new CashRuleError('Un écart entre le fonds attendu et le comptage doit être expliqué (observation obligatoire).');
  }
  const id = `cs-${s.seq++}`;
  const session: CashSession = {
    id,
    number: `SESS-${new Date().getFullYear()}-${String(s.seq).padStart(4, '0')}`,
    registerId: params.registerId,
    agent: params.agent,
    activityDate: params.activityDate,
    openedAt: stampShort(),
    initialFloat: params.initialFloat,
    floatOrigin: params.floatOrigin,
    openingNote: params.note,
    openingCount: params.count,
    openingGap: gap,
    status: 'ouverte',
    approvals: [],
  };
  s.sessions.unshift(session);
  addAudit(params.agent, 'Ouverture de caisse', `Session ${session.number} — poste ${s.registers.find((r) => r.id === params.registerId)?.name}, fonds ${params.initialFloat.toLocaleString('fr-FR')} FCFA`);
  persist();
  return session;
}

export interface PaymentSplitLine {
  mode: CashPaymentMode;
  amount: number;
  reference?: string;
  state?: CashPaymentState;
  cashGiven?: number; // espèces : somme remise
  cashChange?: number; // espèces : monnaie rendue
}

export function addPayment(params: {
  sessionId: string;
  agent: string;
  docId: string;
  lines: PaymentSplitLine[];
  label?: string;
}): CashMovement[] {
  const session = requireOpenSession(params.sessionId);
  const s = load();
  const created: CashMovement[] = [];
  for (const line of params.lines) {
    if (line.amount <= 0) continue;
    const isCash = line.mode === 'Espèces';
    const cashIn = isCash ? (line.cashGiven ?? line.amount) - (line.cashChange ?? 0) : 0;
    const st: CashPaymentState = line.state ?? (isCash ? 'confirme' : 'en-attente');
    const mv: CashMovement = {
      id: `cm-${s.seq++}`,
      number: nextNumber('ENC'),
      sessionId: session.id,
      kind: 'encaissement',
      amount: line.amount,
      cashAmount: st === 'confirme' ? cashIn : 0,
      mode: line.mode,
      paymentState: st,
      docId: params.docId,
      reference: line.reference,
      label: params.label ?? 'Encaissement facture',
      createdBy: params.agent,
      occurredAt: stampShort(),
      recordedAt: stampShort(),
      status: 'actif',
    };
    s.movements.unshift(mv);
    created.push(mv);
  }
  addAudit(params.agent, 'Encaissement', `${created.length} ligne(s) sur facture ${params.docId}`);
  persist();
  return created;
}

export function addAdvance(params: {
  sessionId: string;
  agent: string;
  beneficiary: string;
  patientId?: string;
  amount: number;
  mode: CashPaymentMode;
  reason: string;
  cashGiven?: number;
  cashChange?: number;
}): CashAdvance {
  const session = requireOpenSession(params.sessionId);
  const s = load();
  const isCash = params.mode === 'Espèces';
  const adv: CashAdvance = {
    id: `adv-${s.seq++}`,
    number: nextNumber('AV'),
    sessionId: session.id,
    patientId: params.patientId,
    beneficiary: params.beneficiary,
    amount: params.amount,
    mode: params.mode,
    reason: params.reason,
    createdBy: params.agent,
    occurredAt: stampShort(),
    appliedAmount: 0,
    status: 'disponible',
  };
  s.advances.unshift(adv);
  const mv: CashMovement = {
    id: `cm-${s.seq++}`,
    number: nextNumber('ENC'),
    sessionId: session.id,
    kind: 'encaissement',
    amount: params.amount,
    cashAmount: isCash ? (params.cashGiven ?? params.amount) - (params.cashChange ?? 0) : 0,
    mode: params.mode,
    paymentState: isCash ? 'confirme' : 'en-attente',
    patientId: params.patientId,
    advanceId: adv.id,
    label: `Avance / acompte — ${params.beneficiary}`,
    reason: params.reason,
    createdBy: params.agent,
    occurredAt: stampShort(),
    recordedAt: stampShort(),
    status: 'actif',
  };
  s.movements.unshift(mv);
  addAudit(params.agent, 'Avance / acompte', `${adv.number} — ${params.amount.toLocaleString('fr-FR')} FCFA`);
  persist();
  return adv;
}

/** Affecte une avance existante à une facture : aucun nouvel encaissement. */
export function applyAdvance(params: { agent: string; advanceId: string; docId: string; amount: number }): void {
  const s = load();
  const adv = s.advances.find((a) => a.id === params.advanceId);
  if (!adv) throw new CashRuleError('Avance introuvable.');
  if (adv.status !== 'disponible' && adv.amount - adv.appliedAmount < params.amount) {
    throw new CashRuleError('Montant disponible insuffisant sur cette avance.');
  }
  adv.appliedAmount += params.amount;
  if (adv.appliedAmount >= adv.amount) adv.status = 'affectee';
  addAudit(params.agent, 'Affectation d’avance', `${adv.number} → facture ${params.docId} : ${params.amount.toLocaleString('fr-FR')} FCFA (aucun nouvel encaissement)`);
  persist();
}

export function requestRefund(params: {
  sessionId: string;
  agent: string;
  refundOfPaymentId?: string;
  advanceId?: string;
  creditNoteId?: string;
  docId?: string;
  amount: number;
  mode: CashPaymentMode;
  reason: string;
  beneficiary: string;
  settings: CashSettings;
}): CashMovement {
  const session = requireOpenSession(params.sessionId);
  const s = load();
  if (params.refundOfPaymentId) {
    const src = s.movements.find((m) => m.id === params.refundOfPaymentId);
    if (!src) throw new CashRuleError('Paiement d’origine introuvable.');
    if (src.sessionId !== session.id && src.kind === 'encaissement') {
      // autorisé : le remboursement est enregistré dans la session ACTUELLE avec lien
    }
    const alreadyRefunded = s.movements
      .filter((m) => m.kind === 'remboursement' && m.status === 'actif' && m.refundOfPaymentId === params.refundOfPaymentId)
      .reduce((sum, m) => sum + m.amount, 0);
    const pending = s.movements.filter((m) => m.kind === 'remboursement' && m.status === 'actif' && m.refundOfPaymentId === params.refundOfPaymentId && m.paymentState === 'en-attente').reduce((sum, m) => sum + m.amount, 0);
    if (alreadyRefunded + params.amount > src.amount) {
      throw new CashRuleError(`Montant à rembourser supérieur au disponible : payé ${src.amount.toLocaleString('fr-FR')} FCFA, déjà remboursé/en cours ${alreadyRefunded.toLocaleString('fr-FR')} FCFA.`);
    }
    if (pending >= params.amount) {
      throw new CashRuleError('Un remboursement est déjà en cours pour ce paiement.');
    }
  }
  const needsApproval = params.amount >= params.settings.refundApprovalThreshold;
  const isCash = params.mode === 'Espèces';
  if (isCash && !needsApproval) {
    const theoretical = theoreticalCash(session.id);
    if (params.amount > theoretical) {
      throw new CashRuleError('Espèces en tiroir insuffisantes pour ce remboursement immédiat.');
    }
  }
  const mv: CashMovement = {
    id: `cm-${s.seq++}`,
    number: nextNumber('REM'),
    sessionId: session.id,
    kind: 'remboursement',
    amount: params.amount,
    cashAmount: isCash ? params.amount : 0,
    mode: params.mode,
    paymentState: needsApproval ? 'en-attente' : 'confirme',
    docId: params.docId,
    refundOfPaymentId: params.refundOfPaymentId,
    advanceId: params.advanceId,
    creditNoteId: params.creditNoteId,
    label: params.advanceId ? 'Remboursement d’avance' : 'Remboursement',
    reason: params.reason,
    beneficiary: params.beneficiary,
    createdBy: params.agent,
    occurredAt: stampShort(),
    recordedAt: stampShort(),
    status: 'actif',
  };
  s.movements.unshift(mv);
  addAudit(params.agent, 'Demande de remboursement', `${mv.number} — ${params.amount.toLocaleString('fr-FR')} FCFA${needsApproval ? ' (approbation requise)' : ''}`);
  persist();
  return mv;
}

export function approveRefund(agent: string, approver: string, movementId: string, approve: boolean, note?: string): void {
  const s = load();
  const mv = s.movements.find((m) => m.id === movementId);
  if (!mv || mv.kind !== 'remboursement') throw new CashRuleError('Remboursement introuvable.');
  if (mv.createdBy === approver) throw new CashRuleError('Auto-approbation interdite : l’auteur d’un remboursement ne peut pas l’approuver.');
  if (mv.paymentState !== 'en-attente') throw new CashRuleError('Ce remboursement n’est pas en attente.');
  if (approve) {
    mv.paymentState = 'confirme';
    mv.approvedBy = approver;
    if (mv.mode === 'Espèces') mv.cashAmount = mv.amount;
    mv.reference = note;
  } else {
    mv.paymentState = 'annule';
    mv.approvedBy = approver;
    mv.cancellationReason = note ?? 'Refusé par le responsable';
  }
  addAudit(approver, approve ? 'Remboursement approuvé' : 'Remboursement refusé', `${mv.number}${note ? ' — ' + note : ''}`);
  persist();
}

/** Avoir : corrige la facture, jamais de sortie d'espèces automatique. */
export function addCreditNote(params: {
  sessionId: string | null;
  agent: string;
  docId: string;
  amount: number;
  reason: string;
}): { id: string; number: string; amount: number; reason: string; createdBy: string; createdAt: string; docId: string } {
  const s = load();
  const cn = {
    id: `cn-${s.seq++}`,
    number: nextNumber('AVOIR'),
    amount: params.amount,
    reason: params.reason,
    createdBy: params.agent,
    createdAt: stampShort(),
    docId: params.docId,
  };
  // L'avoir est tracé comme mouvement à montant nul (aucun flux de trésorerie)
  const mv: CashMovement = {
    id: `cm-${s.seq++}`,
    number: cn.number,
    sessionId: params.sessionId ?? '',
    kind: 'encaissement',
    amount: 0,
    cashAmount: 0,
    mode: 'Autre',
    paymentState: 'confirme',
    docId: params.docId,
    creditNoteId: cn.id,
    label: `Avoir — ${params.reason}`,
    reason: params.reason,
    createdBy: params.agent,
    occurredAt: stampShort(),
    recordedAt: stampShort(),
    status: 'actif',
  };
  s.movements.unshift(mv);
  addAudit(params.agent, 'Avoir créé', `${cn.number} — ${params.amount.toLocaleString('fr-FR')} FCFA sur ${params.docId} (aucune sortie d’espèces automatique)`);
  persist();
  return cn;
}

/** Contrepassation : annule une opération sans l'effacer. */
export function reverseMovement(params: { agent: string; movementId: string; reason: string; moneyActuallyReturned: boolean }): void {
  const s = load();
  const mv = s.movements.find((m) => m.id === params.movementId);
  if (!mv) throw new CashRuleError('Opération introuvable.');
  if (mv.status === 'annule') throw new CashRuleError('Opération déjà annulée.');
  const session = s.sessions.find((x) => x.id === mv.sessionId);
  if (session && session.agent !== params.agent && ['ouverte', 'cloture-en-preparation', 'soumise-au-controle', 'cloturee'].includes(session.status)) {
    throw new CashRuleError('Seul le titulaire de la session peut contrepasser, tant que la session n’est pas clôturée.');
  }
  mv.status = 'annule';
  mv.cancelledBy = params.agent;
  mv.cancellationReason = params.reason;
  const reversal: CashMovement = {
    id: `cm-${s.seq++}`,
    number: nextNumber('CONT'),
    sessionId: mv.sessionId,
    kind: mv.kind === 'encaissement' ? 'remboursement' : 'encaissement',
    amount: mv.amount,
    cashAmount: params.moneyActuallyReturned ? mv.cashAmount : 0,
    mode: mv.mode,
    paymentState: 'confirme',
    docId: mv.docId,
    refundOfPaymentId: mv.id,
    label: `Contrepassation de ${mv.number}`,
    reason: params.reason,
    createdBy: params.agent,
    occurredAt: stampShort(),
    recordedAt: stampShort(),
    status: 'actif',
    cancelOfId: mv.id,
  };
  s.movements.unshift(reversal);
  addAudit(params.agent, 'Contrepassation', `${mv.number} — ${params.reason}${params.moneyActuallyReturned ? ' (argent effectivement rendu/reçu)' : ' (aucun flux d’argent)'}`);
  persist();
}

export function addFundsMovement(params: {
  sessionId: string;
  agent: string;
  kind: Exclude<MovementKind, 'encaissement' | 'remboursement'>;
  amount: number;
  reason: string;
  counterpart?: string; // origine ou destinataire
  transferToSessionId?: string;
  approvedBy?: string;
  reference?: string;
}): CashMovement {
  const session = requireOpenSession(params.sessionId);
  const s = load();
  if (params.kind === 'transfert-sortant') {
    const theoretical = theoreticalCash(session.id);
    if (params.amount > theoretical) throw new CashRuleError('Espèces en tiroir insuffisantes pour ce transfert.');
  }
  const mv: CashMovement = {
    id: `cm-${s.seq++}`,
    number: nextNumber('MVT'),
    sessionId: session.id,
    kind: params.kind,
    amount: params.amount,
    cashAmount: params.kind === 'transfert-sortant' ? 0 : params.amount, // l'entrant n'est compté qu'à la confirmation
    mode: 'Espèces',
    paymentState: params.kind === 'transfert-sortant' ? 'confirme' : 'en-attente',
    label: MOVEMENT_KIND_META[params.kind].label,
    reason: params.reason,
    beneficiary: params.counterpart,
    transferToSessionId: params.transferToSessionId,
    createdBy: params.agent,
    approvedBy: params.approvedBy,
    reference: params.reference,
    occurredAt: stampShort(),
    recordedAt: stampShort(),
    status: 'actif',
  };
  s.movements.unshift(mv);
  addAudit(params.agent, MOVEMENT_KIND_META[params.kind].label, `${mv.number} — ${params.amount.toLocaleString('fr-FR')} FCFA — ${params.reason}`);
  persist();
  return mv;
}

/** Le responsable confirme la réception d'un transfert : crée l'entrée dans la caisse destinataire. */
export function confirmTransfer(agent: string, outgoingMovementId: string): void {
  const s = load();
  const out = s.movements.find((m) => m.id === outgoingMovementId);
  if (!out || out.kind !== 'transfert-sortant') throw new CashRuleError('Transfert introuvable.');
  if (out.paymentState !== 'en-attente') throw new CashRuleError('Transfert déjà confirmé.');
  const target = s.sessions.find((x) => x.id === out.transferToSessionId);
  if (!target || target.status !== 'ouverte') throw new CashRuleError('La session destinataire n’est pas ouverte.');
  if (target.agent === out.createdBy) throw new CashRuleError('La confirmation doit être faite par un autre agent que l’émetteur.');
  out.paymentState = 'confirme';
  out.approvedBy = agent;
  const inMv: CashMovement = {
    id: `cm-${s.seq++}`,
    number: nextNumber('MVT'),
    sessionId: target.id,
    kind: 'transfert-entrant',
    amount: out.amount,
    cashAmount: out.amount,
    mode: 'Espèces',
    paymentState: 'confirme',
    label: 'Transfert entrant',
    reason: `Transfert de ${out.number} (${out.createdBy})`,
    transferToSessionId: out.sessionId,
    createdBy: agent,
    approvedBy: agent,
    occurredAt: stampShort(),
    recordedAt: stampShort(),
    status: 'actif',
  };
  s.movements.unshift(inMv);
  addAudit(agent, 'Transfert confirmé', `${out.number} → ${target.number}`);
  persist();
}

/* ── Soldes ────────────────────────────────────────────────────────── */

export interface SessionTotals {
  cashIn: number;
  cashOut: number;
  theoreticalCash: number;
  byMode: { mode: CashPaymentMode; confirmed: number; pending: number }[];
  pendingCount: number;
  advancesAvailable: number;
}

/** Espèces par convention : fonds + encaissements + apports + transferts entrants
    − remboursements − retraits/remises/transferts sortants, opérations actives
    et confirmées uniquement. Une remise déjà enregistrée n'est déduite qu'une fois. */
export function theoreticalCash(sessionId: string): number {
  const s = load();
  const session = s.sessions.find((x) => x.id === sessionId);
  if (!session) return 0;
  let t = session.initialFloat;
  for (const m of s.movements) {
    if (m.sessionId !== sessionId || m.status !== 'actif') continue;
    const sign = MOVEMENT_KIND_META[m.kind].sign;
    if (m.kind === 'encaissement' && m.advanceId && m.paymentState !== 'confirme') continue;
    if (sign === 1 && m.cashAmount > 0) t += m.cashAmount;
    else if (sign === -1 && m.cashAmount > 0) t -= m.cashAmount;
  }
  return t;
}

export function sessionTotals(sessionId: string): SessionTotals {
  const s = load();
  const byModeMap = new Map<CashPaymentMode, { confirmed: number; pending: number }>();
  let cashIn = 0;
  let cashOut = 0;
  let pendingCount = 0;
  let advancesAvailable = 0;
  for (const m of s.movements) {
    if (m.sessionId !== sessionId || m.status !== 'actif') continue;
    if (m.kind === 'encaissement' && !m.advanceId) {
      const e = byModeMap.get(m.mode) ?? { confirmed: 0, pending: 0 };
      if (m.paymentState === 'confirme') e.confirmed += m.amount;
      else if (m.paymentState === 'en-attente') {
        e.pending += m.amount;
        pendingCount++;
      }
      byModeMap.set(m.mode, e);
    }
    if (m.cashAmount > 0 && MOVEMENT_KIND_META[m.kind].sign === 1) cashIn += m.cashAmount;
    if (m.cashAmount > 0 && MOVEMENT_KIND_META[m.kind].sign === -1) cashOut += m.cashAmount;
  }
  for (const a of s.advances) {
    if (a.sessionId === sessionId && a.status === 'disponible') advancesAvailable += a.amount - a.appliedAmount;
  }
  const byMode = CASH_PAYMENT_MODES.filter((m) => byModeMap.has(m)).map((m) => ({ mode: m, ...byModeMap.get(m)! }));
  return { cashIn, cashOut, theoreticalCash: theoreticalCash(sessionId), byMode, pendingCount, advancesAvailable };
}

/* ── Comptage & clôture ────────────────────────────────────────────── */

export function prepareClosure(agent: string, sessionId: string): void {
  const s = load();
  const session = s.sessions.find((x) => x.id === sessionId);
  if (!session || session.agent !== agent) throw new CashRuleError('Session introuvable ou non autorisée.');
  if (session.status !== 'ouverte') throw new CashRuleError('La session n’est plus ouverte.');
  session.status = 'cloture-en-preparation';
  session.submittedCount = undefined; // invalide un comptage précédent non soumis
  session.submittedTotal = undefined;
  session.submittedGap = undefined;
  addAudit(agent, 'Préparation de clôture', `Session ${session.number} — nouveaux mouvements suspendus`);
  persist();
}

export function resumeOperations(agent: string, sessionId: string): void {
  const s = load();
  const session = s.sessions.find((x) => x.id === sessionId);
  if (!session || session.agent !== agent) throw new CashRuleError('Session introuvable ou non autorisée.');
  if (session.status !== 'cloture-en-preparation') throw new CashRuleError('La session n’est pas en préparation de clôture.');
  session.status = 'ouverte';
  session.submittedCount = undefined;
  session.submittedTotal = undefined;
  session.submittedGap = undefined;
  addAudit(agent, 'Reprise des opérations', `Session ${session.number} — comptage précédent invalidé`);
  persist();
}

export function submitClosure(params: {
  agent: string;
  sessionId: string;
  count?: CashDenomination[];
  countedTotal?: number;
  gapReason?: string;
}): { gap: number } {
  const s = load();
  const session = s.sessions.find((x) => x.id === params.sessionId);
  if (!session || session.agent !== params.agent) throw new CashRuleError('Session introuvable ou non autorisée.');
  if (session.status !== 'cloture-en-preparation' && session.status !== 'correction-demandee') throw new CashRuleError('La session doit être en préparation de clôture.');
  const theoretical = theoreticalCash(session.id);
  const counted = params.countedTotal ?? countTotal(params.count);
  const gap = counted - theoretical;
  if (gap !== 0 && !params.gapReason) throw new CashRuleError('Un écart non nul doit être justifié avant la soumission.');
  session.status = 'soumise-au-controle';
  session.submittedAt = stampShort();
  session.submittedCount = params.count;
  session.submittedTotal = counted;
  session.submittedGap = gap;
  session.submittedGapReason = params.gapReason;
  addAudit(params.agent, 'Clôture soumise au contrôle', `Session ${session.number} — compté ${counted.toLocaleString('fr-FR')} FCFA, écart ${gap.toLocaleString('fr-FR')} FCFA`);
  persist();
  return { gap };
}

export function validateClosure(params: {
  controller: string;
  sessionId: string;
  approve: boolean;
  controllerCount?: CashDenomination[];
  note?: string;
  handover?: { remitted: number; kept: number; receivedBy: string };
}): void {
  const s = load();
  const session = s.sessions.find((x) => x.id === params.sessionId);
  if (!session) throw new CashRuleError('Session introuvable.');
  if (session.status !== 'soumise-au-controle') throw new CashRuleError('La session n’est pas soumise au contrôle.');
  if (session.agent === params.controller) throw new CashRuleError('Auto-approbation interdite : la clôture doit être contrôlée par une autre personne.');
  const gap = session.submittedGap ?? 0;
  if (Math.abs(gap) >= s.settings.gapValidationThreshold && !params.note) {
    throw new CashRuleError('Un écart important exige un commentaire de validation (décision autorisée).');
  }
  if (params.approve) {
    session.status = 'cloturee';
    session.controller = params.controller;
    session.controllerCount = params.controllerCount;
    session.controllerTotal = countTotal(params.controllerCount);
    session.controllerNote = params.note;
    session.validatedAt = stampShort();
    const countedBefore = session.submittedTotal ?? 0;
    const remitted = params.handover?.remitted ?? 0;
    const kept = params.handover?.kept ?? 0;
    session.handover = {
      countedBefore,
      remitted,
      kept,
      afterRemittance: countedBefore - remitted,
      receiptNumber: nextNumber('BON'),
      at: stampShort(),
      receivedBy: params.handover?.receivedBy ?? params.controller,
    };
    if (remitted > 0) {
      // mouvement de remise créé une seule fois, à la validation
      const already = s.movements.some((m) => m.sessionId === session.id && m.kind === 'remise-responsable' && m.amount === remitted && m.status === 'actif');
      if (!already) {
        s.movements.unshift({
          id: `cm-${s.seq++}`,
          number: nextNumber('MVT'),
          sessionId: session.id,
          kind: 'remise-responsable',
          amount: remitted,
          cashAmount: remitted,
          mode: 'Espèces',
          paymentState: 'confirme',
          label: 'Remise des fonds (clôture)',
          reason: 'Remise validée en clôture',
          beneficiary: session.handover.receivedBy,
          createdBy: session.agent,
          approvedBy: params.controller,
          occurredAt: stampShort(),
          recordedAt: stampShort(),
          status: 'actif',
          receiptNumber: session.handover.receiptNumber,
        });
      }
    }
    addAudit(params.controller, 'Clôture validée', `Session ${session.number} — écart reconnu : ${gap.toLocaleString('fr-FR')} FCFA${session.handover ? `, remise ${remitted.toLocaleString('fr-FR')} FCFA à ${session.handover.receivedBy}` : ''}`);
  } else {
    session.status = 'correction-demandee';
    session.controller = params.controller;
    session.controllerNote = params.note;
    session.returnedReason = params.note ?? 'À corriger';
    addAudit(params.controller, 'Clôture renvoyée', `Session ${session.number} — motif : ${params.note ?? 'non précisé'}`);
  }
  persist();
}

/** Clôture exceptionnelle par le responsable (agent absent). */
export function forceClosure(params: { controller: string; sessionId: string; reason: string; countedTotal: number }): void {
  const s = load();
  const session = s.sessions.find((x) => x.id === params.sessionId);
  if (!session) throw new CashRuleError('Session introuvable.');
  if (session.status === 'cloturee') throw new CashRuleError('Session déjà clôturée.');
  if (session.agent === params.controller) throw new CashRuleError('Le responsable ne peut pas clôturer sa propre session.');
  const theoretical = theoreticalCash(session.id);
  session.status = 'cloturee';
  session.validatedAt = stampShort();
  session.controller = params.controller;
  session.controllerTotal = params.countedTotal;
  session.submittedTotal = params.countedTotal;
  session.submittedGap = params.countedTotal - theoretical;
  session.submittedGapReason = session.submittedGap !== 0 ? 'Clôture exceptionnelle sans comptage du titulaire' : undefined;
  session.exceptionalClosure = {
    reason: params.reason,
    by: params.controller,
    note: 'Clôture exceptionnelle : validation par le titulaire absente. Revue ultérieure requise.',
    at: stampShort(),
  };
  addAudit(params.controller, 'Clôture exceptionnelle', `Session ${session.number} — motif : ${params.reason}`);
  persist();
}

/** Session active de l'agent : toute session non clôturée (ouverte, en préparation, soumise, correction). */
export function getAgentCurrentSession(agent: string): CashSession | null {
  const s = load();
  return s.sessions.find((x) => x.agent === agent && x.status !== 'cloturee') ?? null;
}

export function journalReprints(): Record<string, number> {
  return load().reprints ?? {};
}

/** Trace une réimpression du journal d'une session (duplicata). */
export function countJournalReprint(user: string, sessionId: string): number {
  const s = load();
  s.reprints = s.reprints ?? {};
  s.reprints[sessionId] = (s.reprints[sessionId] ?? 0) + 1;
  const session = s.sessions.find((x) => x.id === sessionId);
  addAudit(user, 'Réimpression du journal', `Session ${session?.number ?? sessionId} — duplicata n°${s.reprints[sessionId]}`);
  persist();
  return s.reprints[sessionId];
}

/* ── Journal ───────────────────────────────────────────────────────── */

export function exportCashCsv(rows: (string | number)[][]): void {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `journal-caisse-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── Scénario de démonstration (§18) ───────────────────────────────── */

function buildDemoState(): CashState {
  const now = new Date();
  const activityDate = now.toISOString().split('T')[0];
  const seq = 100;
  const registers = JSON.parse(JSON.stringify(DEFAULT_REGISTERS)) as CashRegister[];
  const settings = { ...DEFAULT_CASH_SETTINGS };

  const session: CashSession = {
    id: 'cs-demo',
    number: 'SESS-2026-0100',
    registerId: 'reg-accueil',
    agent: 'A. Koné (Caissière)',
    activityDate,
    openedAt: stampShort(),
    initialFloat: 50000,
    floatOrigin: 'Fonds fourni par le coffre (conforme)',
    openingCount: [{ coupure: 10000, quantity: 5 }],
    openingGap: 0,
    status: 'ouverte',
    approvals: [],
  };

  const mk = (i: number, p: Partial<CashMovement>): CashMovement => ({
    id: `cm-demo-${i}`,
    number: `ENC-2026-0${100 + i}`,
    sessionId: 'cs-demo',
    kind: 'encaissement',
    amount: 0,
    cashAmount: 0,
    mode: 'Espèces',
    paymentState: 'confirme',
    label: '',
    createdBy: 'A. Koné (Caissière)',
    occurredAt: stampShort(),
    recordedAt: stampShort(),
    status: 'actif',
    ...p,
  });

  const movements: CashMovement[] = [
    mk(1, { number: 'ENC-2026-0101', amount: 120000, cashAmount: 120000, mode: 'Espèces', paymentState: 'confirme', docId: 'doc2', label: 'Encaissement facture FAC-2026-0102' }),
    mk(2, { number: 'ENC-2026-0102', amount: 30000, cashAmount: 0, mode: 'Mobile Money', paymentState: 'confirme', docId: 'doc3', reference: 'MM-2026-0912', label: 'Encaissement facture FAC-2026-0103' }),
    mk(3, { number: 'REM-2026-0103', kind: 'remboursement', amount: 10000, cashAmount: 10000, mode: 'Espèces', paymentState: 'confirme', docId: 'doc1', refundOfPaymentId: 'pay1', label: 'Remboursement trop-perçu', reason: 'Trop-perçu sur FAC-2026-0101', beneficiary: 'Patient doc1', approvedBy: 'B. Traoré (Resp. caisses)' }),
    mk(4, { number: 'MVT-2026-0104', kind: 'retrait-securite', amount: 80000, cashAmount: 80000, mode: 'Espèces', paymentState: 'confirme', label: 'Retrait de sécurité', reason: 'Seuil de tiroir atteint', beneficiary: 'Coffre — B. Traoré', approvedBy: 'B. Traoré (Resp. caisses)' }),
  ];
  movements.reverse(); // ordre anti-chronologique

  return {
    registers,
    sessions: [session],
    movements,
    advances: [],
    settings,
    reprints: {},
    audit: [
      { id: 'aud-1', at: stampShort(), user: 'B. Traoré (Resp. caisses)', action: 'Retrait de sécurité confirmé', detail: '80 000 FCFA remis au coffre' },
      { id: 'aud-2', at: stampShort(), user: 'A. Koné (Caissière)', action: 'Session ouverte', detail: 'SESS-2026-0100 — fonds 50 000 FCFA' },
    ],
    seq,
  };
}
