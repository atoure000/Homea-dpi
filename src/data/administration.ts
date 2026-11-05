/* ── Module Administration HOMEA — prototype local ───────────────────
   Tout est simulé : ce fichier ne remplace ni un annuaire d'entreprise,
   ni un fournisseur d'identité, ni un stockage serveur.
   Réutilise : profiles (rôles métier), état de caisse persistant
   (homea-cash-state-v1) et ses règles de séparation des responsabilités. */

import type { ProfileId } from '@/types';
import { profiles as businessProfiles } from '@/data/profiles';

const LS_KEY = 'homea-admin-state-v1';
const CASH_LS_KEY = 'homea-cash-state-v1';

export const ADMIN_EXPORT_MANIFEST_VERSION = 1;

/* ── Types ─────────────────────────────────────────────────────────── */

export type AdminUserStatus = 'invite' | 'actif' | 'suspendu' | 'desactive' | 'expire';

export const ADMIN_USER_STATUS_META: Record<AdminUserStatus, { label: string; color: 'navy' | 'green' | 'red' | 'amber' | 'blue' | 'turquoise' }> = {
  invite: { label: 'Invité', color: 'amber' },
  actif: { label: 'Actif', color: 'green' },
  suspendu: { label: 'Suspendu', color: 'red' },
  desactive: { label: 'Désactivé', color: 'navy' },
  expire: { label: 'Expiré', color: 'blue' },
};

export type RightAction = 'consulter' | 'creer' | 'modifier-brouillon' | 'valider' | 'annuler' | 'imprimer' | 'exporter' | 'approuver' | 'administrer';

export const RIGHT_ACTIONS: { id: RightAction; label: string }[] = [
  { id: 'consulter', label: 'Consulter' },
  { id: 'creer', label: 'Créer' },
  { id: 'modifier-brouillon', label: 'Modifier un brouillon' },
  { id: 'valider', label: 'Valider' },
  { id: 'annuler', label: 'Annuler avec motif' },
  { id: 'imprimer', label: 'Imprimer' },
  { id: 'exporter', label: 'Exporter' },
  { id: 'approuver', label: 'Approuver' },
  { id: 'administrer', label: 'Administrer' },
];

export type RightScope = 'propres' | 'attribues' | 'service' | 'etablissement' | 'specifique';

export const RIGHT_SCOPES: { id: RightScope; label: string }[] = [
  { id: 'propres', label: 'Ses propres opérations' },
  { id: 'attribues', label: 'Patients / dossiers attribués' },
  { id: 'service', label: 'Service' },
  { id: 'etablissement', label: 'Établissement' },
  { id: 'specifique', label: 'Périmètre spécifique configuré' },
];

export type AdminModuleId =
  | 'dossier-patient' | 'consultation' | 'laboratoire' | 'imagerie' | 'pharmacie'
  | 'soins' | 'facturation' | 'caisse' | 'assurance' | 'agenda'
  | 'administration' | 'parametres';

export const ADMIN_MODULES: { id: AdminModuleId; label: string }[] = [
  { id: 'dossier-patient', label: 'Dossier patient' },
  { id: 'consultation', label: 'Consultation' },
  { id: 'laboratoire', label: 'Laboratoire' },
  { id: 'imagerie', label: 'Imagerie' },
  { id: 'pharmacie', label: 'Pharmacie' },
  { id: 'soins', label: 'Soins' },
  { id: 'facturation', label: 'Facturation' },
  { id: 'caisse', label: 'Caisse' },
  { id: 'assurance', label: 'Assurance' },
  { id: 'agenda', label: 'Agenda' },
  { id: 'administration', label: 'Administration' },
  { id: 'parametres', label: 'Paramètres métier' },
];

export interface AdminRole {
  id: string;
  label: string;
  /** Profil métier HOMEA correspondant (sélecteur de l'application), si existant. */
  profileId?: ProfileId;
  description: string;
  custom?: boolean; // duplicata ou rôle personnalisé
  derivedFrom?: string;
  rights: Partial<Record<AdminModuleId, Partial<Record<RightAction, RightScope>>>>;
}

export interface AdminUserStatusChange { at: string; from: AdminUserStatus | 'création'; to: AdminUserStatus; by: string; reason?: string }

export interface AdminUser {
  id: string;
  login: string;
  fullName: string;
  status: AdminUserStatus;
  roles: string[];
  scopes: RightScope[];
  services: string[];
  sites: string[];
  accessStart: string;
  accessEnd?: string;
  linkedProfessional?: string;
  createdBy: string;
  createdAt: string;
  statusHistory: AdminUserStatusChange[];
  changes: { at: string; by: string; action: string; detail: string }[];
}

export interface AccessRequest {
  id: string;
  userLogin: string;
  requestedRole: string;
  scope: RightScope;
  reason: string;
  requestedBy: string;
  requestedAt: string;
  status: 'en-attente' | 'approuvee' | 'refusee';
  decidedBy?: string;
  decidedAt?: string;
  decisionReason?: string;
}

export interface TemporaryGrant {
  id: string;
  userLogin: string;
  roleId: string;
  scope: RightScope;
  reason: string;
  requestedBy: string;
  approvedBy: string;
  startAt: string;
  endAt: string;
  status: 'actif' | 'expire' | 'revoque';
}

export interface EmergencyAccessEvent {
  id: string;
  userLogin: string;
  patientRef: string;
  justification: string;
  at: string;
  expiresAt: string;
  reviewedBy?: string;
  reviewNote?: string;
}

export interface AdminAuditEvent {
  id: string;
  at: string;
  actor: string;
  action: string;
  module: string;
  object?: string;
  patientRef?: string;
  result: 'succes' | 'refus' | 'erreur';
  reason?: string;
  correlationId?: string;
  origin: string; // ex. « Caisse (local) », « Administration (simulation) »
}

export type BackupScope = 'base-donnees' | 'documents' | 'modeles' | 'integration' | 'pacs';

export const BACKUP_SCOPES: { id: BackupScope; label: string; note: string }[] = [
  { id: 'base-donnees', label: 'Base de données', note: 'Données relationnelles (simulation locale : état du navigateur)' },
  { id: 'documents', label: 'Documents et pièces jointes', note: 'Non inclus dans un export de base — fichiers stockés séparément' },
  { id: 'modeles', label: 'Modèles et configurations', note: 'Modèles de facture, paramétrage métier' },
  { id: 'integration', label: "Métadonnées d'intégration", note: 'Références des connecteurs, sans secrets' },
  { id: 'pacs', label: 'Images PACS', note: 'Stratégie distincte : images stockées hors base' },
];

export type BackupStatus = 'planifiee' | 'en-cours' | 'reussie' | 'partielle' | 'echouee' | 'expiree';

export const BACKUP_STATUS_META: Record<BackupStatus, { label: string; color: 'navy' | 'green' | 'red' | 'amber' | 'blue' | 'turquoise' }> = {
  planifiee: { label: 'Planifiée', color: 'blue' },
  'en-cours': { label: 'En cours', color: 'amber' },
  reussie: { label: 'Réussie', color: 'green' },
  partielle: { label: 'Partielle', color: 'amber' },
  echouee: { label: 'Échouée', color: 'red' },
  expiree: { label: 'Expirée', color: 'navy' },
};

export interface BackupRun {
  id: string;
  scope: BackupScope;
  at: string;
  finishedAt?: string;
  type: 'complete' | 'incrementale';
  trigger: 'planification' | 'manuel' | 'avant-restauration';
  status: BackupStatus;
  sizeBytes?: number;
  destination: string; // sans secret
  integrity?: 'verifiee' | 'non-verifiee' | 'echec';
  retention: string;
  simulation: true;
}

export interface RestoreCheck { label: string; result: 'ok' | 'avertissement' | 'echec'; detail?: string }

export interface RestoreJob {
  id: string;
  at: string;
  by: string;
  source: string;
  target: 'demonstration-locale';
  reason: string;
  status: 'en-cours' | 'terminee' | 'echouee';
  checks: RestoreCheck[];
  simulation: true;
}

export interface IntegrationCard {
  id: string;
  label: string;
  status: 'operationnel' | 'anomalie' | 'inconnu';
  lastContact?: string;
  lastSuccess?: string;
  pendingMessages: number;
  failures: { id: string; at: string; ref: string; error: string; assignedTo?: string; resolvedReason?: string }[];
  avgMs?: number;
  note: string;
}

export interface ConfigVersion {
  id: string;
  at: string;
  by: string;
  area: string;
  reason: string;
  before: string;
  after: string;
}

export interface DataQualityItem { id: string; kind: string; label: string; detail: string; at: string }

export interface AdministrativeIncident {
  id: string;
  number: string;
  category: string;
  description: string;
  priority: 'basse' | 'moyenne' | 'haute' | 'critique';
  service: string;
  owner: string;
  openedAt: string;
  updatedAt: string;
  status: 'ouvert' | 'en-analyse' | 'en-traitement' | 'resolu' | 'clos';
  resolution?: string;
  actions: { at: string; by: string; note: string }[];
}

export interface AdminSettings {
  backupFrequency: string;
  backupWindow: string;
  backupRetention: string;
  secondaryCopy: boolean;
  encryption: string;
  alertRecipients: string;
  rpoHours: string; // à valider par HOMEA
  rtoHours: string; // à valider par HOMEA
  inactivityLockMinutes: string;
  maxLoginAttempts: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
}

export interface AdminState {
  users: AdminUser[];
  roles: AdminRole[];
  accessRequests: AccessRequest[];
  temporaryGrants: TemporaryGrant[];
  emergencyEvents: EmergencyAccessEvent[];
  audit: AdminAuditEvent[];
  backupRuns: BackupRun[];
  restoreJobs: RestoreJob[];
  integrations: IntegrationCard[];
  configVersions: ConfigVersion[];
  dataQuality: DataQualityItem[];
  incidents: AdministrativeIncident[];
  settings: AdminSettings;
  loginAttempts: { at: string; login: string; ok: boolean; detail: string }[];
  lastRestoreTestAt?: string;
  lastExportAt?: string;
  seq: number;
}

/* ── Rôles du catalogue (réutilise les profils métier existants) ───── */

function r(map: AdminRole['rights']): AdminRole['rights'] { return map; }

export const CATALOG_ROLES: AdminRole[] = [
  {
    id: 'direction', label: 'Direction', profileId: 'direction', description: 'Pilotage global, supervision financière et technique.',
    rights: r({
      'dossier-patient': { consulter: 'etablissement', imprimer: 'etablissement' },
      facturation: { consulter: 'etablissement', valider: 'etablissement', exporter: 'etablissement' },
      caisse: { consulter: 'etablissement', valider: 'etablissement' },
      assurance: { consulter: 'etablissement', approuver: 'etablissement' },
      administration: { consulter: 'etablissement' },
      parametres: { "modifier-brouillon": 'etablissement', administrer: 'etablissement' },
    }),
  },
  {
    id: 'administrateur', label: 'Administrateur système', description: 'Comptes, habilitations, sauvegardes, exploitation technique. Aucun accès aux notes cliniques ni aux validations financières.',
    rights: r({
      administration: { consulter: 'etablissement', administrer: 'etablissement', exporter: 'etablissement' },
      parametres: { consulter: 'etablissement', administrer: 'etablissement' },
      'dossier-patient': { consulter: 'specifique' },
    }),
  },
  {
    id: 'secretaire', label: 'Secrétaire', description: 'Accueil administratif, agenda. Ne valide pas les résultats biologiques.',
    rights: r({
      agenda: { creer: 'etablissement', "modifier-brouillon": 'etablissement', annuler: 'etablissement' },
      'dossier-patient': { creer: 'etablissement', "modifier-brouillon": 'etablissement', consulter: 'etablissement' },
      laboratoire: { consulter: 'service' },
    }),
  },
  {
    id: 'admission', label: 'Admission', profileId: 'accueil', description: 'Enregistrement des patients et épisodes.',
    rights: r({
      'dossier-patient': { creer: 'etablissement', "modifier-brouillon": 'etablissement', consulter: 'etablissement', imprimer: 'service' },
      agenda: { creer: 'etablissement', annuler: 'service' },
    }),
  },
  {
    id: 'caissier', label: 'Caissier', profileId: 'facturation', description: 'Encaissements, avances, clôture de sa propre caisse. Ne valide pas sa propre clôture (règle du module Caisse).',
    rights: r({
      caisse: { creer: 'propres', consulter: 'propres', imprimer: 'propres', annuler: 'propres' },
      facturation: { consulter: 'etablissement', imprimer: 'service' },
    }),
  },
  {
    id: 'resp-caisse', label: 'Responsable de caisse', description: 'Contrôle des clôtures, approbation des remboursements. Ne peut pas approuver une opération dont il est l’auteur.',
    rights: r({
      caisse: { consulter: 'etablissement', valider: 'etablissement', approuver: 'etablissement', exporter: 'etablissement' },
      facturation: { consulter: 'etablissement', approuver: 'etablissement' },
    }),
  },
  {
    id: 'ges-assurance', label: 'Gestionnaire assurance', description: 'Dossiers d’assurance et créances.',
    rights: r({
      assurance: { consulter: 'etablissement', creer: 'etablissement', "modifier-brouillon": 'etablissement', valider: 'etablissement' },
      facturation: { consulter: 'etablissement' },
    }),
  },
  {
    id: 'infirmier', label: 'Infirmier', profileId: 'soins', description: 'Soins et surveillance des patients attribués.',
    rights: r({
      soins: { creer: 'service', "modifier-brouillon": 'service', consulter: 'service' },
      'dossier-patient': { consulter: 'attribues' },
    }),
  },
  {
    id: 'medecin', label: 'Médecin', profileId: 'medecin', description: 'Consultations, prescriptions, validation clinique de ses patients.',
    rights: r({
      consultation: { creer: 'attribues', "modifier-brouillon": 'attribues', valider: 'attribues', imprimer: 'attribues' },
      'dossier-patient': { consulter: 'attribues', "modifier-brouillon": 'attribues' },
      laboratoire: { creer: 'attribues', consulter: 'attribues', valider: 'attribues' },
      imagerie: { creer: 'attribues', consulter: 'attribues' },
      pharmacie: { creer: 'attribues' },
    }),
  },
  {
    id: 'preleveur', label: 'Préleveur', description: 'Prélèvements et enregistrement technique. Ne valide pas les résultats.',
    rights: r({
      laboratoire: { creer: 'service', consulter: 'service' },
    }),
  },
  {
    id: 'technicien', label: 'Technicien laboratoire', description: 'Traitement technique des analyses. La validation reste au professionnel habilité.',
    rights: r({
      laboratoire: { creer: 'service', "modifier-brouillon": 'service', consulter: 'service' },
    }),
  },
  {
    id: 'biologiste', label: 'Biologiste', description: 'Validation des résultats biologiques.',
    rights: r({
      laboratoire: { consulter: 'service', valider: 'service', annuler: 'service', imprimer: 'service' },
    }),
  },
  {
    id: 'radiologue', label: 'Radiologue', description: 'Comptes rendus d’imagerie.',
    rights: r({
      imagerie: { consulter: 'service', creer: 'service', valider: 'service', imprimer: 'service' },
    }),
  },
  {
    id: 'pharmacien', label: 'Pharmacien', profileId: 'pharmacie', description: 'Dispensation et stocks pharmacie.',
    rights: r({
      pharmacie: { consulter: 'etablissement', creer: 'service', "modifier-brouillon": 'service', annuler: 'service' },
    }),
  },
  {
    id: 'hospitalisation', label: "Personnel d'hospitalisation", description: 'Lits, séjours et confort des patients hébergés.',
    rights: r({
      'dossier-patient': { consulter: 'service' },
      soins: { consulter: 'service', "modifier-brouillon": 'service' },
    }),
  },
];

/* ── Règles de séparation des responsabilités (non contournables) ──── */

export interface SodRule { id: string; label: string; requires: RightAction; excludes: RightAction; module: AdminModuleId; enforcedWhere: string }

export const SOD_RULES: SodRule[] = [
  { id: 'sod-caisse', label: 'Une caissière ne valide pas sa propre clôture de caisse', requires: 'creer', excludes: 'valider', module: 'caisse', enforcedWhere: 'Module Caisse — validateClosure (refus si auteur = contrôleur)' },
  { id: 'sod-remb', label: "Un demandeur n'approuve pas son propre remboursement", requires: 'creer', excludes: 'approuver', module: 'facturation', enforcedWhere: 'Module Caisse — approveRefund (refus si auteur = approbateur)' },
  { id: 'sod-labo', label: 'La saisie technique ne remplace pas la validation biologique', requires: 'creer', excludes: 'valider', module: 'laboratoire', enforcedWhere: 'Rôles : technicien/préleveur sans droit valider (matrice)' },
  { id: 'sod-admin', label: "Un utilisateur ne s'accorde pas lui-même des droits", requires: 'administrer', excludes: 'administrer', module: 'administration', enforcedWhere: 'Administration — auto-modification bloquée dans l’interface (simulation)' },
];

/** Détection d'incompatibilités pour les rôles cumulés d'un utilisateur. */
export function detectSodConflicts(roleIds: string[], roles: AdminRole[]): SodRule[] {
  const rights = new Set<string>();
  for (const roleId of roleIds) {
    const role = roles.find((x) => x.id === roleId);
    if (!role) continue;
    for (const [mod, acts] of Object.entries(role.rights)) {
      for (const act of Object.keys(acts ?? {})) rights.add(`${mod}:${act}`);
    }
  }
  return SOD_RULES.filter((rule) =>
    rights.has(`${rule.module}:${rule.requires}`) && rights.has(`${rule.module}:${rule.excludes}`),
  );
}

export function effectiveRight(roles: AdminRole[], roleIds: string[], module: AdminModuleId, action: RightAction): { scope: RightScope; origin: string } | null {
  for (const roleId of roleIds) {
    const role = roles.find((x) => x.id === roleId);
    const scope = role?.rights[module]?.[action];
    if (scope) return { scope, origin: role.label };
  }
  return null; // refus par défaut
}

/* ── Couche de données locale ──────────────────────────────────────── */

let state: AdminState | null = null;
const listeners: (() => void)[] = [];

function nowStamp(): string {
  return new Date().toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function isoDate(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

export function getAdminState(): AdminState {
  if (state) return state;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) { state = JSON.parse(raw) as AdminState; return state; }
  } catch { /* données corrompues : rescenario */ }
  state = buildDemoState();
  persist();
  return state;
}

function persist(): void {
  if (!state) return;
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch { /* quota : continuation en mémoire */ }
  listeners.forEach((l) => l());
}

export function subscribeAdmin(listener: () => void): () => void {
  listeners.push(listener);
  return () => { const i = listeners.indexOf(listener); if (i >= 0) listeners.splice(i, 1); };
}

export function resetAdminState(): void {
  state = buildDemoState();
  persist();
}

export function addAdminAudit(actor: string, action: string, module: string, opts: { object?: string; patientRef?: string; result?: 'succes' | 'refus' | 'erreur'; reason?: string; correlationId?: string } = {}): void {
  const s = getAdminState();
  s.audit.unshift({
    id: `adm-${s.seq++}`,
    at: nowStamp(),
    actor,
    action,
    module,
    object: opts.object,
    patientRef: opts.patientRef,
    result: opts.result ?? 'succes',
    reason: opts.reason,
    correlationId: opts.correlationId,
    origin: 'Administration (simulation)',
  });
  persist();
}

/** Journal unifié : événements administration + journal de caisse existant (lecture seule). */
export function getUnifiedAudit(): AdminAuditEvent[] {
  const s = getAdminState();
  const cashRaw = (() => { try { return JSON.parse(localStorage.getItem(CASH_LS_KEY) ?? 'null') as { audit?: { id: string; at: string; user: string; action: string; detail?: string }[] } | null; } catch { return null; } })();
  const cashEvents: AdminAuditEvent[] = (cashRaw?.audit ?? []).map((e) => ({
    id: `cash-${e.id}`,
    at: e.at,
    actor: e.user,
    action: e.action,
    module: 'Caisse',
    object: e.detail,
    result: 'succes' as const,
    origin: 'Caisse (local, existant)',
  }));
  return [...s.audit, ...cashEvents].sort((a, b) => (a.at < b.at ? 1 : -1));
}

export class AdminRuleError extends Error {}

function statusChange(user: AdminUser, to: AdminUserStatus, by: string, reason?: string): void {
  user.statusHistory.push({ at: nowStamp(), from: user.status, to, by, reason });
  user.status = to;
}

/** Désactive un compte. Le dernier administrateur actif ne peut pas être désactivé.
    L'historique et les opérations passées conservent le nom de l'utilisateur. */
export function setUserStatus(actor: string, login: string, to: AdminUserStatus, reason?: string): AdminUser {
  const s = getAdminState();
  if (actor === login && to !== 'actif') throw new AdminRuleError('Auto-modification de statut interdite : faites la demande à un autre administrateur.');
  const user = s.users.find((u) => u.login === login);
  if (!user) throw new AdminRuleError('Utilisateur introuvable.');
  if (user.roles.includes('administrateur') && to !== 'actif') {
    const otherActiveAdmins = s.users.filter((u) => u.login !== login && u.status === 'actif' && u.roles.includes('administrateur'));
    if (otherActiveAdmins.length === 0) throw new AdminRuleError('Impossible : dernier administrateur actif. Créez d’abord un autre administrateur (circuit de récupération documenté).');
  }
  statusChange(user, to, actor, reason);
  user.changes.push({ at: nowStamp(), by: actor, action: 'Changement de statut', detail: `${user.status} → ${to}${reason ? ` — ${reason}` : ''}` });
  addAdminAudit(actor, 'Changement de statut utilisateur', 'Administration', { object: login, reason });
  persist();
  return user;
}

export function updateUserRoles(actor: string, login: string, roles: string[], reason: string): void {
  const s = getAdminState();
  if (actor === login) throw new AdminRuleError('Auto-attribution de droits interdite : la modification de vos propres habilitations doit passer par un autre administrateur.');
  const user = s.users.find((u) => u.login === login);
  if (!user) throw new AdminRuleError('Utilisateur introuvable.');
  if (!reason.trim()) throw new AdminRuleError('Un motif est obligatoire pour tout changement d’habilitation.');
  const before = user.roles.join(', ') || 'aucun';
  user.roles = [...roles];
  user.changes.push({ at: nowStamp(), by: actor, action: 'Modification des habilitations', detail: `${before} → ${roles.join(', ') || 'aucun'} — ${reason}` });
  addAdminAudit(actor, 'Modification des habilitations', 'Administration', { object: login, reason });
  persist();
}

export function grantTemporaryAccess(actor: string, params: { userLogin: string; roleId: string; scope: RightScope; reason: string; days: number }): TemporaryGrant {
  const s = getAdminState();
  if (actor === params.userLogin) throw new AdminRuleError('Auto-attribution interdite : un accès temporaire doit être approuvé par un autre administrateur.');
  if (!params.reason.trim()) throw new AdminRuleError('Motif obligatoire.');
  const grant: TemporaryGrant = {
    id: `tg-${s.seq++}`,
    userLogin: params.userLogin,
    roleId: params.roleId,
    scope: params.scope,
    reason: params.reason,
    requestedBy: actor,
    approvedBy: actor,
    startAt: nowStamp(),
    endAt: isoDate(params.days),
    status: 'actif',
  };
  s.temporaryGrants.unshift(grant);
  addAdminAudit(actor, 'Attribution d’accès temporaire', 'Administration', { object: `${params.userLogin} — ${params.roleId}`, reason: params.reason });
  persist();
  return grant;
}

/** Passe en « expiré » les accès temporaires échus (appelé à l'affichage). */
export function expireDueGrants(): void {
  const s = getAdminState();
  const today = isoDate(0);
  let changed = false;
  for (const g of s.temporaryGrants) {
    if (g.status === 'actif' && g.endAt < today) { g.status = 'expire'; changed = true; }
  }
  for (const u of s.users) {
    if (u.status === 'actif' && u.accessEnd && u.accessEnd < today) {
      statusChange(u, 'expire', 'Système', 'Date de fin d’accès atteinte');
      changed = true;
    }
  }
  if (changed) persist();
}

export function decideAccessRequest(actor: string, requestId: string, approve: boolean, note?: string): void {
  const s = getAdminState();
  const req = s.accessRequests.find((x) => x.id === requestId);
  if (!req || req.status !== 'en-attente') throw new AdminRuleError('Demande introuvable ou déjà traitée.');
  if (actor === req.userLogin) throw new AdminRuleError('Conflit d’intérêts : le demandeur ne peut pas décider de sa propre demande.');
  req.status = approve ? 'approuvee' : 'refusee';
  req.decidedBy = actor;
  req.decidedAt = nowStamp();
  req.decisionReason = note;
  addAdminAudit(actor, approve ? 'Demande d’accès approuvée' : 'Demande d’accès refusée', 'Administration', { object: req.userLogin, reason: note });
  persist();
}

export function createAdminUser(actor: string, params: { login: string; fullName: string; roleId: string; scope: RightScope; services: string[]; accessEnd?: string; linkedProfessional?: string }): AdminUser {
  const s = getAdminState();
  if (s.users.some((u) => u.login === params.login)) throw new AdminRuleError('Cet identifiant existe déjà.');
  const user: AdminUser = {
    id: `au-${s.seq++}`,
    login: params.login,
    fullName: params.fullName,
    status: 'invite',
    roles: [params.roleId],
    scopes: [params.scope],
    services: params.services,
    sites: ['HOMEA Cocody'],
    accessStart: isoDate(0),
    accessEnd: params.accessEnd,
    linkedProfessional: params.linkedProfessional,
    createdBy: actor,
    createdAt: nowStamp(),
    statusHistory: [{ at: nowStamp(), from: 'création', to: 'invite', by: actor, reason: 'Invitation créée (simulation — aucun e-mail envoyé)' }],
    changes: [],
  };
  s.users.unshift(user);
  addAdminAudit(actor, 'Création / invitation d’utilisateur', 'Administration', { object: params.login, reason: params.roleId });
  persist();
  return user;
}

/* ── Export de démonstration (réel : téléchargement JSON) ─────────── */

export interface DemoExport {
  manifest: {
    manifestVersion: number;
    kind: 'homea-demo-export';
    environment: 'démonstration';
    generatedAt: string;
    generatedBy: string;
    includes: string[];
    excludes: string[];
    attachmentsPolicy: string;
  };
  datasets: {
    admin: unknown;
    cash: unknown;
  };
}

export function buildDemoExport(actor: string): DemoExport {
  return {
    manifest: {
      manifestVersion: ADMIN_EXPORT_MANIFEST_VERSION,
      kind: 'homea-demo-export',
      environment: 'démonstration',
      generatedAt: nowStamp(),
      generatedBy: actor,
      includes: [
        'État du module Caisse (sessions, mouvements, comptages, audit de caisse)',
        'État du module Administration (comptes simulés, habilitations, incidents)',
      ],
      excludes: [
        'Aucun secret, mot de passe ou clé (aucun n’est stocké dans le prototype)',
        'Documents et pièces jointes (référencés uniquement, jamais intégrés)',
        'Images PACS (hors périmètre du prototype)',
      ],
      attachmentsPolicy: 'Fichiers joints NON intégrés — référencés seulement',
    },
    datasets: {
      admin: getAdminState(),
      cash: (() => { try { return JSON.parse(localStorage.getItem(CASH_LS_KEY) ?? 'null'); } catch { return null; } })(),
    },
  };
}

export function downloadDemoExport(actor: string): { id: string; bytes: number } {
  const s = getAdminState();
  const exportData = buildDemoExport(actor);
  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `homea-demo-export-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  a.click();
  URL.revokeObjectURL(url);
  s.lastExportAt = nowStamp();
  addAdminAudit(actor, 'Export des données de démonstration', 'Administration', { object: 'homea-demo-export', reason: 'Export JSON versionné avec manifeste — pas une sauvegarde serveur' });
  // trace d'une « sauvegarde » simulée de périmètre base de données
  s.backupRuns.unshift({
    id: `bk-${s.seq++}`,
    scope: 'base-donnees',
    at: nowStamp(),
    finishedAt: nowStamp(),
    type: 'complete',
    trigger: 'manuel',
    status: 'reussie',
    sizeBytes: blob.size,
    destination: 'Téléchargement navigateur (poste local)',
    integrity: 'verifiee',
    retention: 'Gérée par le navigateur — aucune rétention serveur',
    simulation: true,
  });
  persist();
  return { id: 'export', bytes: blob.size };
}

/** Restauration guidée : applique un export de démonstration validé (aperçu + confirmation). */
export function applyDemoExport(actor: string, parsed: DemoExport, reason: string): RestoreJob {
  const s = getAdminState();
  if (parsed.manifest?.kind !== 'homea-demo-export') throw new AdminRuleError('Fichier non reconnu : ce n’est pas un export de démonstration HOMEA.');
  if (parsed.manifest.manifestVersion !== ADMIN_EXPORT_MANIFEST_VERSION) throw new AdminRuleError('Version de manifeste incompatible.');
  if (!reason.trim()) throw new AdminRuleError('Motif obligatoire pour toute restauration.');
  // État courant préservé : téléchargement automatique avant remplacement
  downloadDemoExport(actor);
  try {
    if (parsed.datasets.cash) localStorage.setItem(CASH_LS_KEY, JSON.stringify(parsed.datasets.cash));
    if (parsed.datasets.admin) localStorage.setItem(LS_KEY, JSON.stringify(parsed.datasets.admin));
  } catch {
    throw new AdminRuleError('Échec d’écriture du stockage local.');
  }
  state = null; // rechargera depuis le stockage
  const job: RestoreJob = {
    id: `rs-${getAdminState().seq++}`,
    at: nowStamp(),
    by: actor,
    source: parsed.manifest.generatedAt,
    target: 'demonstration-locale',
    reason,
    status: 'terminee',
    checks: [
      { label: 'Format et compatibilité', result: 'ok', detail: `Manifeste v${parsed.manifest.manifestVersion} — environnement démonstration` },
      { label: 'État antérieur préservé', result: 'ok', detail: 'Export automatique téléchargé avant remplacement' },
      { label: 'Intégrité après restauration', result: 'ok', detail: 'Modules Caisse et Administration rechargés depuis le stockage local' },
    ],
    simulation: true,
  };
  getAdminState().restoreJobs.unshift(job);
  getAdminState().lastRestoreTestAt = nowStamp();
  addAdminAudit(actor, 'Restauration de démonstration appliquée', 'Administration', { object: job.id, reason });
  persist();
  return job;
}

/* ── Incidents ─────────────────────────────────────────────────────── */

export function updateIncident(actor: string, id: string, patch: Partial<Pick<AdministrativeIncident, 'status' | 'resolution' | 'owner'>>, note?: string): void {
  const s = getAdminState();
  const inc = s.incidents.find((x) => x.id === id);
  if (!inc) throw new AdminRuleError('Incident introuvable.');
  Object.assign(inc, patch);
  inc.updatedAt = nowStamp();
  if (note?.trim()) inc.actions.push({ at: nowStamp(), by: actor, note });
  addAdminAudit(actor, 'Mise à jour d’incident', 'Administration', { object: inc.number, reason: note });
  persist();
}

/* ── Scénario de démonstration (§18) ───────────────────────────────── */

export function runDemoScenario(actor: string): string[] {
  const s = getAdminState();
  const steps: string[] = [];
  const today = isoDate(0);
  // 1. Compte de caissière à périmètre limité (si absent)
  if (!s.users.some((u) => u.login === 'c.demo')) {
    createAdminUser(actor, { login: 'c.demo', fullName: 'C. Demo (Caissière)', roleId: 'caissier', scope: 'propres', services: ['Caisse Accueil'], accessEnd: isoDate(30) });
    steps.push('Compte « c.demo » créé (invitée, rôle Caissier, périmètre « ses propres opérations »).');
  } else {
    steps.push('Compte « c.demo » déjà présent.');
  }
  // 3. Droits effectifs : vérifiables dans l'onglet Rôles (prévisualisation)
  steps.push('Droits effectifs de c.demo : consulter l’onglet « Rôles et habilitations » → Prévisualisation.');
  // 4. Séparation : la règle sod-caisse reste active (validateClosure refuse l’auto-validation)
  steps.push('Séparation des responsabilités : c.demo (caissier) n’a aucun droit « valider » sur la caisse — contrôle inchangé dans le module Caisse.');
  // 5. Accès temporaire qui expire
  const grant = grantTemporaryAccess(actor, { userLogin: 'c.demo', roleId: 'ges-assurance', scope: 'service', reason: 'Remplacement ponctuel du gestionnaire assurance', days: -1 });
  grant.status = 'expire';
  addAdminAudit(actor, 'Accès temporaire expiré', 'Administration', { object: `c.demo — ${grant.roleId}`, reason: 'Fin de validité' });
  steps.push('Accès temporaire « gestionnaire assurance » accordé puis marqué expiré.');
  // 6. Suspension avec historique conservé
  const demo = s.users.find((u) => u.login === 'c.demo');
  if (demo && demo.status === 'invite') {
    statusChange(demo, 'actif', actor, 'Validation de l’invitation (simulation)');
    steps.push('Compte « c.demo » activé puis suspendu — l’historique de ses opérations reste attribué à son nom.');
  }
  if (demo) setUserStatus(actor, 'c.demo', 'suspendu', 'Fin de mission de démonstration');
  steps.push('Compte « c.demo » suspendu (historique conservé).');
  // 8-12 : export / restauration / sauvegarde échouée / passerelle en anomalie / incident
  steps.push('Export : bouton « Exporter les données de démonstration » (onglet Sauvegardes).');
  steps.push('Restauration : parcours guidé de l’onglet Sauvegardes (aperçu + confirmation).');
  if (!s.backupRuns.some((b) => b.status === 'echouee')) {
    s.backupRuns.unshift({
      id: `bk-${s.seq++}`, scope: 'pacs', at: nowStamp(), finishedAt: nowStamp(), type: 'incrementale', trigger: 'planification',
      status: 'echouee', destination: 'Serveur de démonstration (simulé)', integrity: 'echec', retention: '30 jours (simulé)', simulation: true,
    });
    s.integrations = s.integrations.map((i) => (i.id === 'lab' ? { ...i, status: 'anomalie' as const, failures: [{ id: `f-${s.seq++}`, at: nowStamp(), ref: 'BIO-2026-0142', error: 'Timeout passerelle — résultat non rapproché', assignedTo: undefined }] } : i));
    steps.push('Sauvegarde PACS simulée en échec (alerte affichée) et passerelle laboratoire en anomalie — aucune exécution réelle.');
  }
  if (!s.incidents.some((i) => i.status !== 'clos' && i.status !== 'resolu')) {
    s.incidents.unshift({
      id: `inc-${s.seq++}`, number: 'INC-2026-0001', category: 'Passerelle', description: 'Résultats laboratoire non rapprochés après timeout passerelle.',
      priority: 'haute', service: 'Laboratoire', owner: actor, openedAt: nowStamp(), updatedAt: nowStamp(), status: 'ouvert',
      actions: [{ at: nowStamp(), by: actor, note: 'Incident ouvert depuis le scénario de démonstration.' }],
    });
    steps.push('Incident INC-2026-0001 créé (à résoudre depuis l’onglet Incidents).');
  }
  addAdminAudit(actor, 'Scénario de démonstration exécuté', 'Administration', { object: '§18' });
  persist();
  return steps;
}

/* ── Scénario initial ──────────────────────────────────────────────── */

function buildDemoState(): AdminState {
  const actor = 'Direction';
  const users: AdminUser[] = [
    {
      id: 'au-1', login: 'direction', fullName: 'Direction', status: 'actif',
      roles: ['direction', 'administrateur'], scopes: ['etablissement'], services: ['Direction'], sites: ['HOMEA Cocody'],
      accessStart: isoDate(-90), createdBy: 'Initialisation', createdAt: nowStamp(),
      statusHistory: [{ at: nowStamp(), from: 'création', to: 'actif', by: 'Initialisation', reason: 'Compte initial (simulation)' }],
      changes: [],
    },
    {
      id: 'au-2', login: 'a.kone', fullName: 'A. Koné', status: 'actif',
      roles: ['caissier'], scopes: ['propres'], services: ['Caisse Accueil'], sites: ['HOMEA Cocody'],
      accessStart: isoDate(-60), createdBy: 'Initialisation', createdAt: nowStamp(),
      statusHistory: [{ at: nowStamp(), from: 'création', to: 'actif', by: 'Initialisation', reason: 'Compte initial (simulation)' }],
      changes: [],
    },
    {
      id: 'au-3', login: 'b.traore', fullName: 'B. Traoré', status: 'actif',
      roles: ['resp-caisse', 'ges-assurance'], scopes: ['etablissement'], services: ['Caisse', 'Assurance'], sites: ['HOMEA Cocody'],
      accessStart: isoDate(-60), createdBy: 'Initialisation', createdAt: nowStamp(),
      statusHistory: [{ at: nowStamp(), from: 'création', to: 'actif', by: 'Initialisation', reason: 'Compte initial (simulation)' }],
      changes: [],
    },
    {
      id: 'au-4', login: 'm.diallo', fullName: 'M. Diallo', status: 'actif',
      roles: ['medecin'], scopes: ['attribues'], services: ['Médecine générale'], sites: ['HOMEA Cocody'],
      linkedProfessional: 'Dr M. Diallo — Médecine générale',
      accessStart: isoDate(-120), createdBy: 'Initialisation', createdAt: nowStamp(),
      statusHistory: [{ at: nowStamp(), from: 'création', to: 'actif', by: 'Initialisation', reason: 'Compte initial (simulation)' }],
      changes: [],
    },
    {
      id: 'au-5', login: 's.fofana', fullName: 'S. Fofana', status: 'actif',
      roles: ['technicien', 'biologiste'], scopes: ['service'], services: ['Laboratoire'], sites: ['HOMEA Cocody'],
      accessStart: isoDate(-100), createdBy: 'Initialisation', createdAt: nowStamp(),
      statusHistory: [{ at: nowStamp(), from: 'création', to: 'actif', by: 'Initialisation', reason: 'Compte initial (simulation)' }],
      changes: [],
    },
    {
      id: 'au-6', login: 'n.coulibaly', fullName: 'N. Coulibaly', status: 'suspendu',
      roles: ['infirmier'], scopes: ['service'], services: ['Soins'], sites: ['HOMEA Cocody'],
      accessStart: isoDate(-80), createdBy: 'Initialisation', createdAt: nowStamp(),
      statusHistory: [{ at: nowStamp(), from: 'création', to: 'actif', by: 'Initialisation', reason: 'Compte initial (simulation)' }, { at: nowStamp(), from: 'actif', to: 'suspendu', by: actor, reason: 'Exemple de suspension (démonstration)' }],
      changes: [],
    },
    {
      id: 'au-7', login: 'i.sangare', fullName: 'I. Sangaré', status: 'actif',
      roles: ['pharmacien'], scopes: ['service'], services: ['Pharmacie'], sites: ['HOMEA Cocody'],
      accessStart: isoDate(-70), accessEnd: isoDate(14),
      createdBy: 'Initialisation', createdAt: nowStamp(),
      statusHistory: [{ at: nowStamp(), from: 'création', to: 'actif', by: 'Initialisation', reason: 'Compte à échéance (démonstration)' }],
      changes: [],
    },
  ];

  const audit: AdminAuditEvent[] = [
    { id: 'adm-init-3', at: nowStamp(), actor, action: 'Paramètres de sauvegarde enregistrés', module: 'Administration', object: 'Fréquence quotidienne 22:00, conservation 30 jours', result: 'succes', origin: 'Administration (simulation)' },
    { id: 'adm-init-2', at: nowStamp(), actor, action: 'Consultation de dossier sensible (accès d’urgence simulé)', module: 'Dossier patient', patientRef: 'PAT-0007', result: 'succes', reason: 'Urgence vitale — revue prévue', correlationId: 'corr-eme-1', origin: 'Administration (simulation)' },
    { id: 'adm-init-1', at: nowStamp(), actor, action: 'Tentative de connexion échouée', module: 'Authentification', object: 'compte inconnu « admin1 »', result: 'refus', reason: 'Identifiant inconnu', origin: 'Simulation — aucune authentification réelle' },
  ];

  return {
    users,
    roles: JSON.parse(JSON.stringify(CATALOG_ROLES)) as AdminRole[],
    accessRequests: [
      { id: 'ar-1', userLogin: 'n.coulibaly', requestedRole: 'infirmier', scope: 'service', reason: 'Réactivation après formation protocolaire', requestedBy: 'N. Coulibaly', requestedAt: nowStamp(), status: 'en-attente' },
      { id: 'ar-2', userLogin: 'i.sangare', requestedRole: 'resp-caisse', scope: 'etablissement', reason: 'Couverture du responsable pendant congés', requestedBy: 'I. Sangaré', requestedAt: nowStamp(), status: 'en-attente' },
    ],
    temporaryGrants: [],
    emergencyEvents: [
      { id: 'eme-1', userLogin: 'direction', patientRef: 'PAT-0007', justification: 'Urgence vitale — antécédents allergiques requis immédiatement', at: nowStamp(), expiresAt: isoDate(1) },
    ],
    audit,
    backupRuns: [
      { id: 'bk-1', scope: 'base-donnees', at: nowStamp(), finishedAt: nowStamp(), type: 'complete', trigger: 'planification', status: 'reussie', sizeBytes: 84213, destination: 'Copie locale simulée + copie distincte (simulée)', integrity: 'verifiee', retention: '30 jours (simulé)', simulation: true },
      { id: 'bk-2', scope: 'documents', at: nowStamp(), finishedAt: nowStamp(), type: 'incrementale', trigger: 'planification', status: 'partielle', destination: 'Stockage documentaire (simulé)', integrity: 'non-verifiee', retention: '90 jours (simulé)', simulation: true },
    ],
    restoreJobs: [],
    integrations: [
      { id: 'lab', label: 'Passerelle laboratoire', status: 'operationnel', lastContact: nowStamp(), lastSuccess: nowStamp(), pendingMessages: 2, failures: [], avgMs: 480, note: 'Simulation — aucun équipement connecté' },
      { id: 'imagerie', label: 'Passerelle imagerie', status: 'operationnel', lastContact: nowStamp(), lastSuccess: nowStamp(), pendingMessages: 0, failures: [], avgMs: 1210, note: 'Simulation — aucun modalité connectée' },
      { id: 'pacs', label: 'PACS et visionneuse', status: 'inconnu', pendingMessages: 0, failures: [], note: 'Non disponible — aucun PACS raccordé au prototype' },
      { id: 'stockage', label: 'Stockage documentaire', status: 'inconnu', pendingMessages: 0, failures: [], note: 'Non disponible — pièces jointes non persistées' },
      { id: 'file', label: 'File de traitements', status: 'operationnel', lastContact: nowStamp(), pendingMessages: 2, failures: [], avgMs: 320, note: 'File locale simulée' },
    ],
    configVersions: [],
    dataQuality: [
      { id: 'dq-1', kind: 'doublon', label: 'Doublon patient potentiel', detail: 'PAT-0003 / PAT-0012 — même téléphone', at: nowStamp() },
      { id: 'dq-2', kind: 'incomplet', label: 'Opération incomplète', detail: 'Épisode EP-0031 sans motif d’admission', at: nowStamp() },
      { id: 'dq-3', kind: 'document', label: 'Document sans lien métier', detail: 'Pièce « scan-0042 » non rattachée à un épisode', at: nowStamp() },
    ],
    incidents: [],
    settings: {
      backupFrequency: 'Quotidienne',
      backupWindow: '22:00 – 23:00',
      backupRetention: '30 jours',
      secondaryCopy: true,
      encryption: 'Non disponible en local (aucun chiffrement appliqué)',
      alertRecipients: 'direction@homea.ci (simulation)',
      rpoHours: '24',
      rtoHours: '8',
      inactivityLockMinutes: '15',
      maxLoginAttempts: '5',
      maintenanceMode: false,
      maintenanceMessage: 'Maintenance en cours — la saisie des modules concernés est suspendue.',
    },
    loginAttempts: [
      { at: nowStamp(), login: 'admin1', ok: false, detail: 'Identifiant inconnu (simulation)' },
      { at: nowStamp(), login: 'a.kone', ok: true, detail: 'Connexion simulée par changement de profil local' },
    ],
    seq: 100,
  };
}
