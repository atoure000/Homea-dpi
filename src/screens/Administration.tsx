import { useState } from 'react';
import {
  Users,
  ShieldCheck,
  KeyRound,
  ScrollText,
  DatabaseBackup,
  PlugZap,
  Settings2,
  FolderCog,
  Wrench,
  LayoutDashboard,
  Plus,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileDown,
} from 'lucide-react';
import { Button, Card, CardHeader, Badge, EmptyState, Input, Select, TextArea } from '@/components/ui';
import type { LoginSession } from '@/screens/Login';
import {
  ADMIN_MODULES,
  ADMIN_USER_STATUS_META,
  RIGHT_ACTIONS,
  RIGHT_SCOPES,
  SOD_RULES,
  addAdminAudit,
  detectSodConflicts,
  effectiveRight,
  expireDueGrants,
  getAdminState,
  getUnifiedAudit,
  decideAccessRequest,
  createAdminUser,
  downloadDemoExport,
  grantTemporaryAccess,
  resetAdminState,
  runDemoScenario,
  setUserStatus,
  updateIncident,
  updateUserRoles,
  AdminRuleError,
  type AdminAuditEvent,
  type AdminModuleId,
  type AdminRole,
  type AdminUser,
  type AdminUserStatus,
  type BackupRun,
  type RightAction,
  type RightScope,
} from '@/data/administration';
import { BACKUP_STATUS_META } from '@/data/administration';
import { BackupsTab, IntegrationsTab, ConfigTab, DataTab, IncidentsTab } from '@/screens/AdminOps';

type Props = { session: LoginSession };

type TabId =
  | 'overview' | 'users' | 'roles' | 'security' | 'audit'
  | 'backups' | 'integrations' | 'config' | 'data' | 'incidents';

const TABS: { id: TabId; label: string; icon: typeof Users }[] = [
  { id: 'overview', label: 'Vue d’ensemble', icon: LayoutDashboard },
  { id: 'users', label: 'Utilisateurs', icon: Users },
  { id: 'roles', label: 'Rôles et habilitations', icon: ShieldCheck },
  { id: 'security', label: 'Sessions et sécurité', icon: KeyRound },
  { id: 'audit', label: 'Journal d’audit', icon: ScrollText },
  { id: 'backups', label: 'Sauvegardes et restauration', icon: DatabaseBackup },
  { id: 'integrations', label: 'Supervision et intégrations', icon: PlugZap },
  { id: 'config', label: 'Configuration technique', icon: Settings2 },
  { id: 'data', label: 'Gestion des données', icon: FolderCog },
  { 'id': 'incidents', label: 'Incidents et maintenance', icon: Wrench },
];

export default function Administration({ session: user }: Props) {
  const [tab, setTab] = useState<TabId>('overview');
  const [, setTick] = useState(0);
  expireDueGrants();
  const state = getAdminState();
  const refresh = () => setTick((v) => v + 1);

  return (
    <div className="space-y-5 p-6">
      <div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-medical-600" />
          <h2 className="text-xl font-bold text-navy-900">Administration</h2>
        </div>
        <p className="mt-1 text-sm text-navy-500">
          Comptes, habilitations, sauvegardes et exploitation — utilisateur actif : {user.fullName}.
          <span className="ml-2 inline-flex items-center rounded bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-medium text-amber-800">Prototype local — protections applicatives simulées</span>
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <Button key={t.id} variant={tab === t.id ? 'primary' : 'secondary'} size="sm" onClick={() => setTab(t.id)}>
                <Icon className="w-4 h-4 mr-1.5" /> {t.label}
              </Button>
            );
          })}
        </div>
      </div>

      {tab === 'overview' && <OverviewTab state={state} onNavigate={setTab} refresh={refresh} actor={user.fullName} />}
      {tab === 'users' && <UsersTab state={state} refresh={refresh} />}
      {tab === 'roles' && <RolesTab state={state} refresh={refresh} />}
      {tab === 'security' && <SecurityTab state={state} refresh={refresh} />}
      {tab === 'audit' && <AuditTab state={state} refresh={refresh} />}
      {tab === 'backups' && <BackupsTab state={state} refresh={refresh} />}
      {tab === 'integrations' && <IntegrationsTab state={state} refresh={refresh} />}
      {tab === 'config' && <ConfigTab state={state} refresh={refresh} />}
      {tab === 'data' && <DataTab state={state} refresh={refresh} />}
      {tab === 'incidents' && <IncidentsTab state={state} refresh={refresh} />}
    </div>
  );
}

/* ── 2. Vue d'ensemble ─────────────────────────────────────────────── */

function OverviewTab({ state, onNavigate, refresh, actor }: { state: ReturnType<typeof getAdminState>; onNavigate: (t: TabId) => void; refresh: () => void; actor: string }) {
  const actifs = state.users.filter((u) => u.status === 'actif');
  const invites = state.users.filter((u) => u.status === 'invite');
  const suspendus = state.users.filter((u) => u.status === 'suspendu' || u.status === 'desactive' || u.status === 'expire');
  const expiring = state.users.filter((u) => u.accessEnd);
  const grants = state.temporaryGrants.filter((g) => g.status === 'actif');
  const requests = state.accessRequests.filter((r) => r.status === 'en-attente');
  const lastBackup = state.backupRuns[0];
  const openIncidents = state.incidents.filter((i) => i.status !== 'clos' && i.status !== 'resolu');
  const failedLogins = state.loginAttempts.filter((l) => !l.ok).length;
  const failingIntegrations = state.integrations.filter((i) => i.status === 'anomalie');

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Kpi label="Comptes actifs" value={String(actifs.length)} tone="text-green-700" onClick={() => onNavigate('users')} />
          <Kpi label="Invitations en attente" value={String(invites.length)} tone={invites.length ? 'text-amber-600' : 'text-navy-900'} onClick={() => onNavigate('users')} />
          <Kpi label="Suspendus / désactivés" value={String(suspendus.length)} tone="text-navy-900" onClick={() => onNavigate('users')} />
          <Kpi label="Habilitations à échéance" value={String(expiring.length)} tone={expiring.length ? 'text-amber-600' : 'text-navy-900'} onClick={() => onNavigate('users')} />
          <Kpi label="Accès temporaires actifs" value={String(grants.length)} tone="text-navy-900" onClick={() => onNavigate('roles')} />
          <Kpi label="Demandes d’accès à examiner" value={String(requests.length)} tone={requests.length ? 'text-amber-600' : 'text-navy-900'} onClick={() => onNavigate('roles')} />
          <Kpi label="Dernière sauvegarde (simulation)" value={lastBackup ? (lastBackup.status === 'reussie' ? 'Réussie' : lastBackup.status === 'echouee' ? 'Échouée' : lastBackup.status === 'partielle' ? 'Partielle' : BACKUP_STATUS_META[lastBackup.status].label) : 'Non disponible'} tone={lastBackup?.status === 'reussie' ? 'text-green-700' : lastBackup?.status === 'echouee' ? 'text-red-600' : 'text-navy-900'} onClick={() => onNavigate('backups')} />
          <Kpi label="Incidents ouverts" value={String(openIncidents.length)} tone={openIncidents.length ? 'text-red-600' : 'text-green-700'} onClick={() => onNavigate('incidents')} />
        </div>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs text-navy-400 font-medium">Sessions actives</p>
            <p className="font-medium text-navy-900">Simulation — la navigation locale change de profil, sans session serveur.</p>
          </div>
          <div>
            <p className="text-xs text-navy-400 font-medium">Échecs de connexion récents</p>
            <p className="font-medium text-navy-900">{failedLogins} (tracés en simulation)</p>
          </div>
          <div>
            <p className="text-xs text-navy-400 font-medium">Dernier test de restauration</p>
            <p className="font-medium text-navy-900">{state.lastRestoreTestAt ?? 'Non disponible — aucun test effectué'}</p>
          </div>
          <div>
            <p className="text-xs text-navy-400 font-medium">Passerelles en anomalie</p>
            <p className="font-medium text-navy-900">{failingIntegrations.length ? `${failingIntegrations.map((i) => i.label).join(', ')} (simulation)` : 'Aucune'}</p>
          </div>
          <div>
            <p className="text-xs text-navy-400 font-medium">Traitements en erreur</p>
            <p className="font-medium text-navy-900">{state.integrations.reduce((s, i) => s + i.failures.length, 0)} (file locale simulée)</p>
          </div>
          <div>
            <p className="text-xs text-navy-400 font-medium">Capacité de stockage</p>
            <p className="font-medium text-navy-400">Non disponible — aucune mesure au niveau navigateur</p>
          </div>
          <div>
            <p className="text-xs text-navy-400 font-medium">Mode maintenance</p>
            <p className="font-medium text-navy-900">{state.settings.maintenanceMode ? 'ACTIVÉ (simulation)' : 'Inactif'}</p>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Scénario de démonstration" subtitle="Créer une caissière, droits effectifs, accès temporaire, suspension, export, incident — tout est simulé localement" />
        <div className="px-5 pb-5">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => { try { runDemoScenario(actor); } catch (e) { window.alert(e instanceof AdminRuleError ? e.message : 'Erreur'); } refresh(); }}>
              <Plus className="w-4 h-4 mr-1.5" /> Exécuter le scénario (§18)
            </Button>
            <Button size="sm" variant="secondary" onClick={() => { if (window.confirm('Réinitialiser l’état du module Administration (simulation) ?')) { resetAdminState(); refresh(); } }}>
              Réinitialiser le module
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}


/* ── 3. Utilisateurs ───────────────────────────────────────────────── */

function UsersTab({ state, refresh }: { state: ReturnType<typeof getAdminState>; refresh: () => void }) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<AdminUser | null>(null);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="Comptes utilisateurs"
          subtitle="Comptes nominatifs uniquement — les comptes partagés sont déconseillés ; l'auteur des opérations historiques est conservé après désactivation"
          action={<Button size="sm" onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1" /> Créer / inviter</Button>}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-100 text-left text-navy-500">
                <th className="px-4 py-3 font-medium">Identifiant</th>
                <th className="px-3 py-3 font-medium">Nom</th>
                <th className="px-3 py-3 font-medium">Rôles</th>
                <th className="px-3 py-3 font-medium">Services</th>
                <th className="px-3 py-3 font-medium">Accès</th>
                <th className="px-3 py-3 font-medium">Statut</th>
                <th className="px-3 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {state.users.map((u) => {
                const meta = ADMIN_USER_STATUS_META[u.status];
                const conflicts = detectSodConflicts(u.roles, state.roles);
                return (
                  <tr key={u.id} className="border-b border-navy-50">
                    <td className="px-4 py-3 font-mono text-xs text-medical-700">{u.login}</td>
                    <td className="px-3 py-3 font-medium text-navy-900">
                      {u.fullName}
                      {u.roles.includes('administrateur') && <Badge color="navy">admin</Badge>}
                    </td>
                    <td className="px-3 py-3 text-navy-600">{u.roles.map((rid) => state.roles.find((r) => r.id === rid)?.label ?? rid).join(', ')}</td>
                    <td className="px-3 py-3 text-navy-600">{u.services.join(', ') || '—'}</td>
                    <td className="px-3 py-3 text-xs text-navy-500">{u.accessStart} → {u.accessEnd ?? '—'}</td>
                    <td className="px-3 py-3"><Badge color={meta.color}>{meta.label}</Badge></td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <Button size="sm" variant="ghost" onClick={() => setDetail(u)}>Historique</Button>
                        {u.status !== 'actif' && (
                          <Button size="sm" variant="secondary" onClick={() => act(refresh, () => setUserStatus('Direction (simulé)', u.login, 'actif', 'Réactivation'))}>Activer</Button>
                        )}
                        {u.status === 'actif' && (
                          <>
                            <Button size="sm" variant="secondary" onClick={() => act(refresh, () => setUserStatus('Direction (simulé)', u.login, 'suspendu', window.prompt('Motif de suspension :') ?? undefined))}>Suspendre</Button>
                            <Button size="sm" variant="danger" onClick={() => act(refresh, () => setUserStatus('Direction (simulé)', u.login, 'desactive', window.prompt('Motif de désactivation :') ?? undefined))}>Désactiver</Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {detail && <UserHistoryDrawer user={detail} onClose={() => setDetail(null)} />}
      {open && <CreateUserForm state={state} onClose={() => setOpen(false)} refresh={refresh} />}
    </div>
  );
}

function act(refresh: () => void, fn: () => void): void {
  try { fn(); refresh(); } catch (e) { window.alert(e instanceof AdminRuleError ? e.message : 'Erreur inattendue'); }
}

function UserHistoryDrawer({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  return (
    <ModalShell title={`Historique — ${user.fullName} (${user.login})`} onClose={onClose}>
      <p className="text-sm text-navy-600">Les opérations passées (encaissements, soins, consultations…) restent attribuées au nom de cet utilisateur, même après désactivation.</p>
      <div>
        <p className="text-sm font-medium text-navy-800 mb-2">Historique des statuts</p>
        {user.statusHistory.map((h, i) => (
          <div key={i} className="flex items-center gap-2 text-sm py-1 border-b border-navy-50">
            <Clock className="w-3.5 h-3.5 text-navy-400" />
            <span className="text-navy-500 text-xs w-36">{h.at}</span>
            <span className="text-navy-700">{h.from} → <strong>{h.to}</strong></span>
            <span className="text-xs text-navy-400">par {h.by}{h.reason ? ` — ${h.reason}` : ''}</span>
          </div>
        ))}
      </div>
      <div>
        <p className="text-sm font-medium text-navy-800 mb-2">Historique des modifications</p>
        {user.changes.length === 0 ? <p className="text-sm text-navy-400">Aucune modification d’habilitation enregistrée.</p> : user.changes.map((c, i) => (
          <div key={i} className="text-sm py-1 border-b border-navy-50">
            <span className="text-navy-500 text-xs w-36 inline-block">{c.at}</span>
            <strong className="text-navy-800">{c.action}</strong>
            <span className="text-navy-600"> — {c.detail} (par {c.by})</span>
          </div>
        ))}
      </div>
    </ModalShell>
  );
}

function CreateUserForm({ state, onClose, refresh }: { state: ReturnType<typeof getAdminState>; onClose: () => void; refresh: () => void }) {
  const [login, setLogin] = useState('');
  const [fullName, setFullName] = useState('');
  const [roleId, setRoleId] = useState(state.roles.find((r) => !r.custom)?.id ?? '');
  const [scope, setScope] = useState<RightScope>('service');
  const [services, setServices] = useState('');
  const [accessEnd, setAccessEnd] = useState('');
  const [linked, setLinked] = useState('');
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    try {
      createAdminUser('Direction (simulé)', { login, fullName, roleId, scope, services: services.split(',').map((s) => s.trim()).filter(Boolean), accessEnd: accessEnd || undefined, linkedProfessional: linked || undefined });
      window.alert('Compte créé au statut « Invité » (simulation — aucun e-mail d’invitation n’est envoyé).');
      onClose();
      refresh();
    } catch (e) {
      setError(e instanceof AdminRuleError ? e.message : 'Erreur inattendue');
    }
  }

  return (
    <ModalShell title="Créer / inviter un utilisateur" onClose={onClose}>
      <Input label="Identifiant de connexion (simulation — pas de mot de passe stocké ni affiché)" value={login} onChange={setLogin} />
      <Input label="Nom complet" value={fullName} onChange={setFullName} />
      <Select label="Rôle" value={roleId} onChange={setRoleId} options={state.roles.map((r) => ({ value: r.id, label: r.label }))} />
      <Select label="Périmètre principal" value={scope} onChange={(v) => setScope(v as RightScope)} options={RIGHT_SCOPES.map((s) => ({ value: s.id, label: s.label }))} />
      <Input label="Services (séparés par des virgules)" value={services} onChange={setServices} />
      <Input label="Fin d’accès (optionnelle)" type="date" value={accessEnd} onChange={setAccessEnd} />
      <Input label="Professionnel associé (optionnel — annuaire métier)" value={linked} onChange={setLinked} />
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Annuler</Button>
        <Button onClick={submit} disabled={!login.trim() || !fullName.trim()}>Créer le compte</Button>
      </div>
    </ModalShell>
  );
}

/* ── 4. Rôles et habilitations ─────────────────────────────────────── */

function RolesTab({ state, refresh }: { state: ReturnType<typeof getAdminState>; refresh: () => void }) {
  const [selectedRoleId, setSelectedRoleId] = useState(state.roles[0]?.id ?? '');
  const [previewLogin, setPreviewLogin] = useState(state.users.find((u) => u.status === 'actif')?.login ?? '');
  const role = state.roles.find((r) => r.id === selectedRoleId);
  const previewUser = state.users.find((u) => u.login === previewLogin);
  const conflicts = previewUser ? detectSodConflicts(previewUser.roles, state.roles) : [];

  function duplicateRole() {
    if (!role) return;
    act(refresh, () => {
      const s = getAdminState();
      const copy: AdminRole = {
        ...JSON.parse(JSON.stringify(role)) as AdminRole,
        id: `${role.id}-copie-${s.seq++}`,
        label: `${role.label} (copie)`,
        custom: true,
        derivedFrom: role.id,
      };
      s.roles.push(copy);
    });
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="Matrice des habilitations — rôle × module × action × périmètre"
          subtitle="Refus par défaut : toute action sans autorisation explicite est refusée. Le rôle informatique ne donne ni accès aux notes cliniques, ni droit de valider des résultats biologiques ou financiers."
          action={<Button size="sm" variant="secondary" onClick={duplicateRole}><Plus className="w-4 h-4 mr-1" /> Dupliquer le rôle sélectionné</Button>}
        />
        <div className="px-5 pb-5">
          <Select label="Rôle affiché" value={selectedRoleId} onChange={setSelectedRoleId} options={state.roles.map((r) => ({ value: r.id, label: r.label + (r.custom ? ' (personnalisé)' : '') }))} />
          {role && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-navy-100 text-left text-navy-500">
                    <th className="px-3 py-2 font-medium">Module</th>
                    {RIGHT_ACTIONS.map((a) => <th key={a.id} className="px-2 py-2 font-medium text-center">{a.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {ADMIN_MODULES.map((m) => {
                    const row = role.rights[m.id];
                    const hasAny = row && Object.keys(row).length > 0;
                    return (
                      <tr key={m.id} className={hasAny ? '' : 'opacity-50'}>
                        <td className="px-3 py-2 font-medium text-navy-800">{m.label}</td>
                        {RIGHT_ACTIONS.map((a) => {
                          const scope = row?.[a.id];
                          return (
                            <td key={a.id} className="px-2 py-2 text-center">
                              {scope ? <span className="inline-block rounded bg-medical-50 text-medical-700 px-1.5 py-0.5 text-xs font-medium">{RIGHT_SCOPES.find((s) => s.id === scope)?.label}</span> : <span className="text-navy-200">—</span>}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {role?.custom && role.derivedFrom && (
            <p className="mt-2 text-xs text-navy-500">Rôle personnalisé dérivé de « {state.roles.find((r) => r.id === role.derivedFrom)?.label ?? role.derivedFrom} » — modifications tracées dans le journal d’audit.</p>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="Prévisualisation des droits effectifs" subtitle="Cumul de tous les rôles d'un utilisateur — l'origine de chaque droit est affichée" />
        <div className="px-5 pb-5">
          <Select label="Utilisateur" value={previewLogin} onChange={setPreviewLogin} options={state.users.map((u) => ({ value: u.login, label: `${u.fullName} (${u.login})` }))} />
          {previewUser && (
            <div className="mt-4 space-y-1 text-sm">
              {ADMIN_MODULES.flatMap((m) =>
                RIGHT_ACTIONS.map((a) => {
                  const eff = effectiveRight(state.roles, previewUser.roles, m.id, a.id);
                  return eff ? (
                    <div key={`${m.id}-${a.id}`} className="flex flex-wrap items-center gap-2 py-1 border-b border-navy-50">
                      <span className="font-medium text-navy-800">{m.label}</span>
                      <span className="text-navy-600">— {a.label}</span>
                      <Badge color="green">{RIGHT_SCOPES.find((s) => s.id === eff.scope)?.label}</Badge>
                      <span className="text-xs text-navy-400">origine : rôle « {eff.origin} »</span>
                    </div>
                  ) : null;
                }),
              ).filter(Boolean)}
              {conflicts.length > 0 && (
                <div className="mt-3 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                  <p className="font-medium flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> Incompatibilités détectées</p>
                  {conflicts.map((c) => <p key={c.id} className="text-xs mt-1">{c.label} — {c.enforcedWhere}</p>)}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="Séparation des responsabilités" subtitle="Règles non contournables — applicatives dans le module Caisse, matricielles ici (simulation)" />
        <div className="divide-y divide-navy-50">
          {SOD_RULES.map((rule) => (
            <div key={rule.id} className="px-5 py-3 text-sm">
              <p className="font-medium text-navy-800">{rule.label}</p>
              <p className="text-xs text-navy-500">{rule.enforcedWhere}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Demandes d’accès et habilitations temporaires" subtitle="Circuit : demande → examen → décision → attribution → expiration" />
        <div className="divide-y divide-navy-50">
          {state.accessRequests.map((req) => (
            <div key={req.id} className="px-5 py-3 flex flex-wrap items-center justify-between gap-2 text-sm">
              <div>
                <p className="font-medium text-navy-900">{req.userLogin} — rôle « {state.roles.find((r) => r.id === req.requestedRole)?.label ?? req.requestedRole} » ({req.scope})</p>
                <p className="text-xs text-navy-500">{req.reason} — demandé par {req.requestedBy} le {req.requestedAt}</p>
              </div>
              {req.status === 'en-attente' ? (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => act(refresh, () => decideAccessRequest('Direction (simulé)', req.id, true, 'Approuvé après examen'))}>Approuver</Button>
                  <Button size="sm" variant="danger" onClick={() => act(refresh, () => decideAccessRequest('Direction (simulé)', req.id, false, 'Non requis actuellement'))}>Refuser</Button>
                </div>
              ) : (
                <Badge color={req.status === 'approuvee' ? 'green' : 'red'}>{req.status === 'approuvee' ? 'Approuvée' : 'Refusée'} par {req.decidedBy}</Badge>
              )}
            </div>
          ))}
          {state.temporaryGrants.map((g) => (
            <div key={g.id} className="px-5 py-3 flex flex-wrap items-center justify-between gap-2 text-sm">
              <div>
                <p className="font-medium text-navy-900">Accès temporaire : {g.userLogin} — « {state.roles.find((r) => r.id === g.roleId)?.label ?? g.roleId} » ({g.scope})</p>
                <p className="text-xs text-navy-500">{g.reason} — accordé par {g.approvedBy}, du {g.startAt} au {g.endAt}</p>
              </div>
              <Badge color={g.status === 'actif' ? 'green' : 'navy'}>{g.status === 'actif' ? 'Actif' : g.status === 'expire' ? 'Expiré' : 'Révoqué'}</Badge>
            </div>
          ))}
          {state.accessRequests.length === 0 && state.temporaryGrants.length === 0 && <EmptyState icon={Clock} title="Aucune demande ni accès temporaire" />}
        </div>
        <div className="px-5 pb-5">
          <GrantTemporaryForm state={state} refresh={refresh} />
        </div>
      </Card>

      <Card>
        <CardHeader title="Accès d’urgence à un dossier" subtitle="Réservé aux rôles autorisés, justification obligatoire, durée limitée, revue tracée (événements enregistrés en démonstration)" />
        <div className="divide-y divide-navy-50">
          {state.emergencyEvents.map((e) => (
            <div key={e.id} className="px-5 py-3 text-sm">
              <p className="font-medium text-navy-900">{e.userLogin} → {e.patientRef} <Badge color="red">urgence</Badge></p>
              <p className="text-xs text-navy-500">{e.justification} — le {e.at}, expire le {e.expiresAt}</p>
            </div>
          ))}
          {state.emergencyEvents.length === 0 && <p className="px-5 py-3 text-sm text-navy-400">Aucun accès d’urgence enregistré.</p>}
        </div>
      </Card>
    </div>
  );
}

function GrantTemporaryForm({ state, refresh }: { state: ReturnType<typeof getAdminState>; refresh: () => void }) {
  const [login, setLogin] = useState('');
  const [roleId, setRoleId] = useState('');
  const [reason, setReason] = useState('');
  const [days, setDays] = useState('7');
  return (
    <div className="pt-4 grid grid-cols-1 md:grid-cols-5 gap-3">
      <Select label="Utilisateur" value={login} onChange={setLogin} options={[{ value: '', label: '— Choisir —' }, ...state.users.map((u) => ({ value: u.login, label: u.fullName }))]} />
      <Select label="Rôle temporaire" value={roleId} onChange={setRoleId} options={[{ value: '', label: '— Choisir —' }, ...state.roles.map((r) => ({ value: r.id, label: r.label }))]} />
      <Input label="Motif" value={reason} onChange={setReason} />
      <Input label="Durée (jours)" type="number" value={days} onChange={setDays} />
      <div className="flex items-end">
        <Button size="sm" disabled={!login || !roleId || !reason.trim()} onClick={() => act(refresh, () => { grantTemporaryAccess('Direction (simulé)', { userLogin: login, roleId, scope: 'service', reason, days: Number(days) || 7 }); window.alert('Accès temporaire accordé (simulation).'); })}>Accorder</Button>
      </div>
    </div>
  );
}

/* ── 7. Sessions et sécurité ───────────────────────────────────────── */

function SecurityTab({ state, refresh }: { state: ReturnType<typeof getAdminState>; refresh: () => void }) {
  const s = state;
  return (
    <div className="space-y-5">
      <Card className="p-5">
        <p className="font-medium text-navy-900 mb-2">Contrôles simulés — aucune authentification réelle dans le prototype</p>
        <ul className="text-sm text-navy-600 list-disc pl-5 space-y-1">
          <li>Le sélecteur de profil de l’application n’est pas une authentification ; aucune session serveur n’existe.</li>
          <li>Aucun mot de passe n’est stocké ni affiché — l’administrateur ne peut pas consulter celui d’un utilisateur.</li>
          <li>L’authentification multifacteur, la révocation de session et le verrouillage d’inactivité relèvent du fournisseur d’identité en production.</li>
          <li>Une modification d’habilitation s’applique immédiatement à la couche de règles locale (refus par défaut), pas seulement à l’affichage.</li>
        </ul>
      </Card>
      <Card>
        <CardHeader title="Verrouillage d’inactivité et tentatives" subtitle="Paramètres affichés — applicables uniquement à la couche de simulation" />
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Verrouillage après inactivité (minutes)" value={s.settings.inactivityLockMinutes} onChange={() => {}} />
          <Input label="Tentatives de connexion avant blocage" value={s.settings.maxLoginAttempts} onChange={() => {}} />
        </div>
      </Card>
      <Card>
        <CardHeader title="Tentatives de connexion (simulation)" />
        <div className="divide-y divide-navy-50">
          {s.loginAttempts.map((l, i) => (
            <div key={i} className="px-5 py-2.5 text-sm flex items-center gap-2">
              {l.ok ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-500" />}
              <span className="text-navy-500 text-xs w-40">{l.at}</span>
              <span className="font-medium text-navy-800">{l.login}</span>
              <span className="text-navy-500 text-xs">{l.detail}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ── 8. Journal d'audit ────────────────────────────────────────────── */

function AuditTab({ state, refresh }: { state: ReturnType<typeof getAdminState>; refresh: () => void }) {
  void state; void refresh;
  const [q, setQ] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [resultFilter, setResultFilter] = useState('');
  const [page, setPage] = useState(0);
  const all = getUnifiedAudit();
  const filtered = all.filter((e) =>
    (!moduleFilter || e.module === moduleFilter) &&
    (!resultFilter || e.result === resultFilter) &&
    (!q || `${e.at} ${e.actor} ${e.action} ${e.object ?? ''} ${e.reason ?? ''}`.toLowerCase().includes(q.toLowerCase())),
  );
  const pageSize = 20;
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const rows = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const modules = [...new Set(all.map((e) => e.module))];

  function exportCsv() {
    const header = ['Date/heure', 'Acteur', 'Action', 'Module', 'Objet', 'Patient', 'Résultat', 'Motif', 'Corrélation', 'Origine'];
    const body = filtered.map((e) => [e.at, e.actor, e.action, e.module, e.object ?? '', e.patientRef ?? '', e.result, e.reason ?? '', e.correlationId ?? '', e.origin]);
    const csv = [header, ...body].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'journal-audit-homea.csv';
    a.click();
    URL.revokeObjectURL(url);
    // Trace l'export lui-même
    addAdminAudit('Direction (simulé)', 'Export du journal d’audit', 'Administration', { object: `${filtered.length} événements` });
    refresh();
  }

  return (
    <div className="space-y-5">
      <Card className="p-4">
        <p className="text-sm text-navy-600">
          Journal fusionné : événements Administration (simulation) + journal de caisse existant (lecture seule).
          <span className="ml-1 font-medium">Non modifiable depuis l’interface</span> — aucune fonction de modification ou de purge n’existe ; en production, la génération et l’immuabilité relèvent du serveur.
        </p>
      </Card>
      <Card>
        <CardHeader title={`Événements (${filtered.length})`} action={<Button size="sm" variant="secondary" onClick={exportCsv}><FileDown className="w-4 h-4 mr-1" /> Exporter (tracé)</Button>} />
        <div className="px-5 pb-3 grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input label="Recherche" value={q} onChange={setQ} placeholder="Acteur, action, objet…" />
          <Select label="Module" value={moduleFilter} onChange={setModuleFilter} options={[{ value: '', label: 'Tous' }, ...modules.map((m) => ({ value: m, label: m }))]} />
          <Select label="Résultat" value={resultFilter} onChange={setResultFilter} options={[{ value: '', label: 'Tous' }, { value: 'succes', label: 'Succès' }, { value: 'refus', label: 'Refus' }, { value: 'erreur', label: 'Erreur' }]} />
          <div className="flex items-end gap-2 pb-1">
            <Button size="sm" variant="secondary" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Précédent</Button>
            <span className="text-xs text-navy-500">Page {page + 1} / {pages}</span>
            <Button size="sm" variant="secondary" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}>Suivant</Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-100 text-left text-navy-500">
                <th className="px-4 py-2.5 font-medium">Date et heure</th>
                <th className="px-3 py-2.5 font-medium">Acteur</th>
                <th className="px-3 py-2.5 font-medium">Action</th>
                <th className="px-3 py-2.5 font-medium">Module</th>
                <th className="px-3 py-2.5 font-medium">Objet / réf.</th>
                <th className="px-3 py-2.5 font-medium">Résultat</th>
                <th className="px-3 py-2.5 font-medium">Origine</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id} className="border-b border-navy-50">
                  <td className="px-4 py-2 text-xs text-navy-500 whitespace-nowrap">{e.at}</td>
                  <td className="px-3 py-2 font-medium text-navy-800">{e.actor}</td>
                  <td className="px-3 py-2 text-navy-700">{e.action}</td>
                  <td className="px-3 py-2 text-navy-600">{e.module}</td>
                  <td className="px-3 py-2 text-xs text-navy-500">{e.object ?? '—'}{e.patientRef ? ` · ${e.patientRef}` : ''}</td>
                  <td className="px-3 py-2">
                    <Badge color={e.result === 'succes' ? 'green' : e.result === 'refus' ? 'red' : 'amber'}>{e.result === 'succes' ? 'Succès' : e.result === 'refus' ? 'Refus' : 'Erreur'}</Badge>
                  </td>
                  <td className="px-3 py-2 text-xs text-navy-400">{e.origin}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ── Shell de modale partagé ───────────────────────────────────────── */

function ModalShell({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-navy-900/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl clinical-shadow max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-navy-100 sticky top-0 bg-white z-10">
          <h3 className="font-semibold text-navy-900">{title}</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>Fermer</Button>
        </div>
        <div className="p-5 space-y-4">{children}</div>
      </div>
    </div>
  );
}

function Kpi({ label, value, tone, onClick }: { label: string; value: string; tone: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="rounded-xl border border-navy-100 bg-white p-3 text-left hover:border-medical-300 transition-colors">
      <p className="text-xs text-navy-500 font-medium">{label}</p>
      <p className={`mt-1 text-lg font-bold ${tone}`}>{value}</p>
    </button>
  );
}
