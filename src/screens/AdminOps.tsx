/* Onglets « exploitation » du module Administration : sauvegardes, supervision,
   configuration technique, gestion des données, incidents et maintenance. */

import { useState } from 'react';
import {
  DatabaseBackup,
  FileDown,
  PlugZap,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Wrench,
} from 'lucide-react';
import { Button, Card, CardHeader, Badge, EmptyState, Input, TextArea } from '@/components/ui';
import {
  BACKUP_SCOPES,
  BACKUP_STATUS_META,
  applyDemoExport,
  addAdminAudit,
  downloadDemoExport,
  getAdminState,
  updateIncident,
  AdminRuleError,
  type AdminState,
  type BackupRun,
  type RestoreJob,
  type IntegrationCard,
  type AdministrativeIncident,
  type DemoExport,
} from '@/data/administration';

type Refresh = () => void;
const ACTOR = 'Direction (simulé)';

function run(refresh: Refresh, fn: () => void): void {
  try { fn(); refresh(); } catch (e) { window.alert(e instanceof AdminRuleError ? e.message : 'Erreur inattendue'); }
}

/* ── 10-12. Sauvegardes et restauration ────────────────────────────── */

export function BackupsTab({ state, refresh }: { state: AdminState; refresh: Refresh }) {
  const [selectedRun, setSelectedRun] = useState<BackupRun | null>(null);
  const [restoring, setRestoring] = useState<RestoreJob | null>(null);
  const [reason, setReason] = useState('');
  const [step, setStep] = useState(0);
  const [parsed, setParsed] = useState<DemoExport | null>(null);
  const [error, setError] = useState<string | null>(null);

  function readFile(file: File) {
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const p = JSON.parse(String(reader.result)) as DemoExport;
        if (p.manifest?.kind !== 'homea-demo-export') throw new Error();
        setParsed(p);
        setStep(1);
      } catch {
        setError('Fichier non reconnu : ce n’est pas un export de démonstration HOMEA valide.');
      }
    };
    reader.readAsText(file);
  }

  const failedBackup = state.backupRuns.find((b) => b.status === 'echouee');

  return (
    <div className="space-y-5">
      <Card className="p-4">
        <p className="text-sm text-navy-600">
          <strong>Mode démonstration :</strong> l’export télécharge un fichier JSON versionné (avec manifeste) de l’état local —
          ce n’est <strong>pas une sauvegarde serveur</strong>. Aucun fichier joint ni image n’est inclus ; seules les données de
          démonstration Caisse et Administration sont exportées. Aucune exécution automatique n’a lieu navigateur fermé.
        </p>
      </Card>

      <Card>
        <CardHeader
          title="Périmètres de sauvegarde"
          subtitle="La base, les documents et les images PACS exigent des stratégies distinctes — une sauvegarde de base n’inclut jamais les fichiers"
        />
        <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-5 gap-3">
          {BACKUP_SCOPES.map((sc) => (
            <div key={sc.id} className="rounded-xl border border-navy-100 p-3">
              <p className="text-sm font-medium text-navy-900">{sc.label}</p>
              <p className="text-xs text-navy-500 mt-1">{sc.note}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Configuration (simulée — à valider par HOMEA)" subtitle="RPO / RTO : objectifs à renseigner par l’établissement, aucun engagement inventé" />
        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input label="Fréquence" value={state.settings.backupFrequency} onChange={() => {}} />
          <Input label="Fenêtre d’exécution" value={state.settings.backupWindow} onChange={() => {}} />
          <Input label="Conservation" value={state.settings.backupRetention} onChange={() => {}} />
          <Input label="Copie distincte" value={state.settings.secondaryCopy ? 'Oui (simulée)' : 'Non'} onChange={() => {}} />
          <Input label="Chiffrement" value={state.settings.encryption} onChange={() => {}} />
          <Input label="Destinataires d’alerte d’échec" value={state.settings.alertRecipients} onChange={() => {}} />
          <Input label="Perte de données max. (heures) — à valider" value={state.settings.rpoHours} onChange={() => {}} />
          <Input label="Délai de reprise (heures) — à valider" value={state.settings.rtoHours} onChange={() => {}} />
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Exécutions de sauvegarde (simulation)"
          subtitle="Statuts : planifiée, en cours, réussie, partielle, échouée, expirée"
          action={
            <Button size="sm" onClick={() => run(refresh, () => { downloadDemoExport(ACTOR); window.alert('Export de démonstration téléchargé — ce n’est pas une sauvegarde serveur.'); })}>
              <FileDown className="w-4 h-4 mr-1" /> Exporter les données de démonstration
            </Button>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-100 text-left text-navy-500">
                <th className="px-4 py-3 font-medium">Périmètre</th>
                <th className="px-3 py-3 font-medium">Date</th>
                <th className="px-3 py-3 font-medium">Type</th>
                <th className="px-3 py-3 font-medium">Déclencheur</th>
                <th className="px-3 py-3 font-medium">Statut</th>
                <th className="px-3 py-3 font-medium">Destination</th>
                <th className="px-3 py-3 font-medium">Intégrité</th>
                <th className="px-3 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {state.backupRuns.map((b) => (
                <tr key={b.id} className="border-b border-navy-50">
                  <td className="px-4 py-3 text-navy-700">{BACKUP_SCOPES.find((s) => s.id === b.scope)?.label}</td>
                  <td className="px-3 py-3 text-xs text-navy-500">{b.at}</td>
                  <td className="px-3 py-3 text-navy-600">{b.type}</td>
                  <td className="px-3 py-3 text-navy-600">{b.trigger}</td>
                  <td className="px-3 py-3"><Badge color={BACKUP_STATUS_META[b.status].color}>{BACKUP_STATUS_META[b.status].label}</Badge></td>
                  <td className="px-3 py-3 text-xs text-navy-500">{b.destination}</td>
                  <td className="px-3 py-3 text-xs text-navy-500">{b.integrity ?? '—'}</td>
                  <td className="px-3 py-3"><Button size="sm" variant="ghost" onClick={() => setSelectedRun(b)}>Détails</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {failedBackup && (
          <div className="px-5 pb-5">
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5" />
              <p>Alerte d’échec simulée : sauvegarde « {BACKUP_SCOPES.find((s) => s.id === failedBackup.scope)?.label} » en échec — destinataires : {state.settings.alertRecipients}. Aucune exécution réelle n’a eu lieu.</p>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Restauration guidée (données de démonstration uniquement)" subtitle="Aperçu, confirmation, état antérieur préservé — jamais un remplacement silencieux des données" />
        <div className="p-5 space-y-4">
          {step === 0 && (
            <>
              <p className="text-sm text-navy-600">1. Sélectionnez un fichier d’export de démonstration (JSON, manifeste requis).</p>
              <input type="file" accept="application/json" onChange={(e) => { const f = e.target.files?.[0]; if (f) readFile(f); }} className="text-sm" />
              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            </>
          )}
          {step >= 1 && parsed && (
            <>
              <div className="rounded-lg border border-navy-100 p-3 text-sm">
                <p className="font-medium text-navy-900">2. Vérification</p>
                <p className="text-navy-600">Manifeste v{parsed.manifest.manifestVersion} — environnement « {parsed.manifest.environment} » — généré le {parsed.manifest.generatedAt} par {parsed.manifest.generatedBy}.</p>
                <p className="font-medium text-navy-900 mt-2">3. Contenu et impact</p>
                <p className="text-navy-600">Inclus : {parsed.manifest.includes.join(' ; ')}</p>
                <p className="text-navy-600">Exclus : {parsed.manifest.excludes.join(' ; ')}</p>
                <p className="text-navy-600">Pièces jointes : {parsed.manifest.attachmentsPolicy}</p>
                <p className="text-amber-700 mt-1">Impact : remplace l’état local des modules Caisse et Administration. Un export de l’état actuel est téléchargé automatiquement avant remplacement.</p>
              </div>
              {step === 1 && (
                <>
                  <p className="text-sm text-navy-600">4. Environnement cible : <strong>démonstration locale (seul environnement disponible)</strong> — aucune restauration production n’est possible depuis un formulaire.</p>
                  <TextArea label="5. Motif de la restauration (obligatoire)" value={reason} onChange={setReason} rows={2} />
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => { setStep(0); setParsed(null); }}>Annuler</Button>
                    <Button disabled={!reason.trim()} onClick={() => setStep(2)}>Continuer</Button>
                  </div>
                </>
              )}
              {step === 2 && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                  <p className="font-medium">Confirmation autorisée requise</p>
                  <p className="mt-1">Simulation : la « confirmation » locale remplace la double validation d’un circuit réel. La restauration remplacera l’état local après téléchargement de l’état antérieur.</p>
                  <div className="mt-3 flex gap-2">
                    <Button variant="secondary" onClick={() => setStep(1)}>Retour</Button>
                    <Button variant="danger" onClick={() => run(refresh, () => { const job = applyDemoExport(ACTOR, parsed, reason); setRestoring(job); setStep(3); })}>Exécuter la restauration</Button>
                  </div>
                </div>
              )}
              {step === 3 && restoring && (
                <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-800">
                  <p className="font-medium">7-8. Contrôles après restauration et rapport</p>
                  {restoring.checks.map((c, i) => (
                    <p key={i} className="mt-1">{c.result === 'ok' ? '✓' : '⚠'} {c.label} — {c.detail}</p>
                  ))}
                  <p className="mt-2 text-xs">Restauration n°{restoring.id} tracée dans le journal. Recommandé : rejouer ce test dans un environnement isolé.</p>
                  <Button size="sm" variant="secondary" className="mt-2" onClick={() => { setStep(0); setParsed(null); setRestoring(null); setReason(''); }}>Nouvelle restauration</Button>
                </div>
              )}
            </>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="Tests de restauration" subtitle="Dernier test : le plus récent de la liste" />
        {state.restoreJobs.length === 0 ? (
          <EmptyState icon={DatabaseBackup} title="Aucun test de restauration" subtitle="Privilégier des tests en environnement isolé." />
        ) : (
          <div className="divide-y divide-navy-50">
            {state.restoreJobs.map((j) => (
              <div key={j.id} className="px-5 py-3 text-sm">
                <p className="font-medium text-navy-900">{j.at} — par {j.by}</p>
                <p className="text-xs text-navy-500">Source : {j.source} · Cible : {j.target} · Motif : {j.reason}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {selectedRun && (
        <Modal title={`Sauvegarde — ${BACKUP_SCOPES.find((s) => s.id === selectedRun.scope)?.label}`} onClose={() => setSelectedRun(null)}>
          <Row label="Identifiant" value={selectedRun.id} />
          <Row label="Date de début" value={selectedRun.at} />
          <Row label="Date de fin" value={selectedRun.finishedAt ?? '—'} />
          <Row label="Type / déclencheur" value={`${selectedRun.type} · ${selectedRun.trigger}`} />
          <Row label="Statut" value={BACKUP_STATUS_META[selectedRun.status].label} />
          <Row label="Taille" value={selectedRun.sizeBytes ? `${(selectedRun.sizeBytes / 1024).toFixed(1)} Ko` : 'Non disponible'} />
          <Row label="Destination (sans secret)" value={selectedRun.destination} />
          <Row label="Contrôle d’intégrité" value={selectedRun.integrity ?? '—'} />
          <Row label="Conservation applicable" value={selectedRun.retention} />
          <p className="text-xs text-navy-400">Enregistrement simulé — aucune donnée n’a été copiée hors de ce navigateur.</p>
        </Modal>
      )}
    </div>
  );
}

/* ── 13. Supervision des intégrations ──────────────────────────────── */

export function IntegrationsTab({ state, refresh }: { state: AdminState; refresh: Refresh }) {
  function retry(integration: IntegrationCard, failureId: string) {
    run(refresh, () => {
      const s = getAdminState();
      const card = s.integrations.find((i) => i.id === integration.id);
      const failure = card?.failures.find((f) => f.id === failureId);
      if (!card || !failure) return;
      card.failures = card.failures.filter((f) => f.id !== failureId);
      card.pendingMessages = Math.max(0, card.pendingMessages - 1);
      if (card.failures.length === 0 && card.pendingMessages === 0) card.status = 'operationnel';
      addAdminAudit(ACTOR, 'Relance de traitement contrôlée', 'Supervision', { object: `${card.label} — ${failure.ref}`, reason: 'Reprise sans duplication (idempotence simulée : la relance réutilise le même message, elle n’en crée pas de copie)' });
      window.alert('Traitement relancé (simulation) — le même message est réutilisé, aucun résultat ni opération n’est dupliqué.');
    });
  }

  return (
    <div className="space-y-5">
      <Card className="p-4">
        <p className="text-sm text-navy-600">Cartes de supervision simulées — aucun équipement ni PACS n’est raccordé. Les comptes techniques sont distincts des utilisateurs humains et à droits limités (principe affiché, à appliquer côté serveur en production).</p>
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {state.integrations.map((i) => (
          <Card key={i.id} className="p-4">
            <div className="flex items-center justify-between">
              <p className="font-medium text-navy-900 flex items-center gap-2"><PlugZap className="w-4 h-4 text-medical-600" /> {i.label}</p>
              <Badge color={i.status === 'operationnel' ? 'green' : i.status === 'anomalie' ? 'red' : 'navy'}>
                {i.status === 'operationnel' ? 'Opérationnel (simulé)' : i.status === 'anomalie' ? 'Anomalie' : 'Non disponible'}
              </Badge>
            </div>
            <div className="mt-2 text-sm text-navy-600 space-y-0.5">
              <p>Dernier contact : {i.lastContact ?? 'Non disponible'}</p>
              <p>Dernier échange réussi : {i.lastSuccess ?? 'Non disponible'}</p>
              <p>Messages en attente : {i.pendingMessages} · Échecs : {i.failures.length}{i.avgMs ? ` · Temps moyen : ${i.avgMs} ms` : ''}</p>
              <p className="text-xs text-navy-400">{i.note}</p>
            </div>
            {i.failures.length > 0 && (
              <div className="mt-3 space-y-2">
                {i.failures.map((f) => (
                  <div key={f.id} className="rounded-lg bg-red-50 border border-red-200 p-2.5 text-xs text-red-700">
                    <p className="font-medium flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> {f.ref} — {f.error}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <Button size="sm" variant="secondary" onClick={() => window.alert(`Métadonnées du message ${f.ref} (sans contenu clinique) :\nRéférence : ${f.ref}\nDate : ${f.at}\nErreur : ${f.error}`)}>Métadonnées</Button>
                      <Button size="sm" variant="secondary" onClick={() => run(refresh, () => { const s = getAdminState(); const c = s.integrations.find((x) => x.id === i.id); const fl = c?.failures.find((x) => x.id === f.id); if (c && fl) { fl.assignedTo = ACTOR; addAdminAudit(ACTOR, 'Anomalie affectée', 'Supervision', { object: `${c.label} — ${fl.ref}` }); } })}>Affecter</Button>
                      <Button size="sm" variant="secondary" onClick={() => run(refresh, () => { const s = getAdminState(); const c = s.integrations.find((x) => x.id === i.id); const fl = c?.failures.find((x) => x.id === f.id); if (c && fl) { fl.resolvedReason = window.prompt('Motif de résolution :') ?? undefined; if (!fl.resolvedReason) { window.alert('Motif obligatoire.'); return; } c.failures = c.failures.filter((x) => x.id !== f.id); if (c.failures.length === 0 && c.pendingMessages === 0) c.status = 'operationnel'; addAdminAudit(ACTOR, 'Anomalie marquée résolue', 'Supervision', { object: `${c.label} — ${fl.ref}`, reason: fl.resolvedReason }); } })}>Résoudre (motif)</Button>
                      {i.id === 'lab' && <Button size="sm" onClick={() => retry(i, f.id)}>Relancer</Button>}
                    </div>
                    {f.assignedTo && <p className="mt-1">Affectée à : {f.assignedTo}</p>}
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ── 14. Configuration technique ───────────────────────────────────── */

export function ConfigTab({ state, refresh }: { state: AdminState; refresh: Refresh }) {
  const [reason, setReason] = useState('');
  const s = state;

  function toggleMaintenance() {
    run(refresh, () => {
      if (!reason.trim()) { window.alert('Un motif est obligatoire pour activer ou désactiver le mode maintenance.'); return; }
      const st = getAdminState();
      const before = st.settings.maintenanceMode ? 'activé' : 'inactif';
      const after = !st.settings.maintenanceMode;
      st.settings.maintenanceMode = after;
      st.configVersions.unshift({ id: `cv-${st.seq++}`, at: new Date().toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }), by: ACTOR, area: 'Mode maintenance', reason, before, after: after ? 'activé' : 'inactif' });
      addAdminAudit(ACTOR, after ? 'Mode maintenance activé' : 'Mode maintenance désactivé', 'Administration', { object: 'Paramètres techniques', reason });
      setReason('');
      window.alert(after
        ? 'Mode maintenance activé (simulation) — message affiché aux écrans concernés. En production, les écritures seraient bloquées côté serveur ; ici seule l’information est affichée.'
        : 'Mode maintenance désactivé (simulation).');
    });
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Identification de l’environnement" />
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <Row label="Environnement" value="Démonstration (prototype local)" />
          <Row label="Version" value="DPI HOMEA — prototype v1.0" />
          <Row label="Fuseau / paramètres régionaux" value={`${Intl.DateTimeFormat().resolvedOptions().timeZone} · fr-FR · FCFA`} />
          <Row label="Notifications" value="Simulation — aucun envoi réel" />
          <Row label="Connecteurs" value="Laboratoire et imagerie simulés (aucun endpoint réel)" />
          <Row label="Seuils de supervision" value="Non disponibles — aucune métrique serveur" />
          <Row label="Secrets" value="Aucun secret stocké ni affiché ; en production, ils restent dans le mécanisme sécurisé du backend" />
        </div>
      </Card>

      <Card>
        <CardHeader title="Historique des modifications sensibles" subtitle="Ancienne et nouvelle version conservées, motif obligatoire" />
        {s.configVersions.length === 0 ? (
          <EmptyState icon={Wrench} title="Aucune modification sensible enregistrée" />
        ) : (
          <div className="divide-y divide-navy-50">
            {s.configVersions.map((v) => (
              <div key={v.id} className="px-5 py-3 text-sm">
                <p className="font-medium text-navy-900">{v.area} — {v.before} → {v.after}</p>
                <p className="text-xs text-navy-500">{v.at} · par {v.by} · motif : {v.reason}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Mode maintenance" subtitle="Affiche un message clair et précise les limites — sans masquer une écriture encore possible côté serveur (aucune écriture serveur n’existe ici)" />
        <div className="p-5 space-y-3">
          <p className="text-sm text-navy-600">Message affiché : « {s.settings.maintenanceMessage} »</p>
          <p className="text-sm"><strong>État : {s.settings.maintenanceMode ? 'ACTIVÉ (simulation)' : 'Inactif'}</strong></p>
          <TextArea label="Motif de la modification (obligatoire)" value={reason} onChange={setReason} rows={2} />
          <Button onClick={toggleMaintenance}>{s.settings.maintenanceMode ? 'Désactiver le mode maintenance' : 'Activer le mode maintenance'}</Button>
          <p className="text-xs text-navy-400">Procédure de reprise : désactiver le mode, vérifier les passerelles (onglet Supervision), contrôler le journal d’audit, informer les services. Aucune console SQL ni commande système n’est proposée depuis ce module.</p>
        </div>
      </Card>
    </div>
  );
}

/* ── 15. Gestion des données ───────────────────────────────────────── */

export function DataTab({ state, refresh }: { state: AdminState; refresh: Refresh }) {
  void refresh;
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Qualité et suivi des données" subtitle="Doublons, incomplétude, documents orphelins — le rapprochement reste à examiner par le métier" />
        <div className="divide-y divide-navy-50">
          {state.dataQuality.map((d) => (
            <div key={d.id} className="px-5 py-3 text-sm flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium text-navy-900 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 text-amber-500" /> {d.label}</p>
                <p className="text-xs text-navy-500">{d.detail} · constaté le {d.at}</p>
              </div>
              <Badge color={d.kind === 'doublon' ? 'amber' : d.kind === 'incomplet' ? 'blue' : 'navy'}>{d.kind}</Badge>
            </div>
          ))}
          {state.dataQuality.length === 0 && <EmptyState icon={CheckCircle2} title="Aucun point à examiner" />}
        </div>
      </Card>

      <Card>
        <CardHeader title="Capacité et conservation" subtitle="Mesures et durées à valider par une politique HOMEA — aucun délai légal codé en dur" />
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <Row label="Capacité de stockage" value="Non disponible — aucune mesure au niveau navigateur" />
          <Row label="Archivages prévus" value="Non disponible — à définir avec la politique de conservation" />
          <Row label="Imports" value="Aucun import en cours (fonction non présente dans le prototype)" />
          <Row label="Erreurs de validation" value="Suivies module par module (caisse, facturation…)" />
        </div>
        <div className="px-5 pb-5 text-xs text-navy-500 space-y-1">
          <p>Archive, sauvegarde et suppression sont trois opérations distinctes — aucune suppression libre n’est proposée ici.</p>
          <p>Les fusions d’identité restent dans le circuit métier (module Dossier patient), pas dans l’administration.</p>
          <p>Toute extraction contenant des données patients doit être limitée au périmètre autorisé et tracée — l’export du journal est tracé ; l’export de démonstration ne contient pas de données réelles de patients.</p>
        </div>
      </Card>
    </div>
  );
}

/* ── 16. Incidents et maintenance ──────────────────────────────────── */

const INCIDENT_STATUS_META: Record<AdministrativeIncident['status'], { label: string; color: 'navy' | 'green' | 'red' | 'amber' | 'blue' | 'turquoise' }> = {
  ouvert: { label: 'Ouvert', color: 'red' },
  'en-analyse': { label: 'En analyse', color: 'amber' },
  'en-traitement': { label: 'En traitement', color: 'blue' },
  resolu: { label: 'Résolu', color: 'green' },
  clos: { label: 'Clos', color: 'navy' },
};

export function IncidentsTab({ state, refresh }: { state: AdminState; refresh: Refresh }) {
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<AdministrativeIncident['priority']>('moyenne');

  function create() {
    run(refresh, () => {
      if (!description.trim()) { window.alert('Description obligatoire.'); return; }
      const s = getAdminState();
      const n = s.incidents.length + 1;
      const now = new Date().toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      s.incidents.unshift({
        id: `inc-${s.seq++}`, number: `INC-2026-${String(n).padStart(4, '0')}`, category: category || 'Général', description,
        priority, service: 'Système', owner: ACTOR, openedAt: now, updatedAt: now, status: 'ouvert',
        actions: [{ at: now, by: ACTOR, note: 'Incident créé.' }],
      });
      addAdminAudit(ACTOR, 'Incident créé', 'Administration', { object: `INC-2026-${String(n).padStart(4, '0')}` });
      setCategory(''); setDescription(''); setPriority('moyenne');
    });
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Nouvel incident" />
        <div className="p-5 grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input label="Catégorie" value={category} onChange={setCategory} placeholder="Passerelle, matériel…" />
          <Input label="Description" value={description} onChange={setDescription} />
          <Input label="Priorité (basse/moyenne/haute/critique)" value={priority} onChange={(v) => setPriority((v as AdministrativeIncident['priority']) || 'moyenne')} />
          <div className="flex items-end"><Button onClick={create}>Enregistrer</Button></div>
        </div>
      </Card>

      <Card>
        <CardHeader title={`Incidents (${state.incidents.length})`} subtitle="Statuts : ouvert, en analyse, en traitement, résolu, clos" />
        {state.incidents.length === 0 ? (
          <EmptyState icon={Wrench} title="Aucun incident" />
        ) : (
          <div className="divide-y divide-navy-50">
            {state.incidents.map((i) => (
              <div key={i.id} className="px-5 py-4 space-y-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-navy-900">{i.number} — {i.category} <Badge color={INCIDENT_STATUS_META[i.status].color}>{INCIDENT_STATUS_META[i.status].label}</Badge> <Badge color={i.priority === 'critique' || i.priority === 'haute' ? 'red' : 'amber'}>{i.priority}</Badge></p>
                  <div className="flex flex-wrap gap-1.5">
                    {i.status === 'ouvert' && <Button size="sm" variant="secondary" onClick={() => run(refresh, () => updateIncident(ACTOR, i.id, { status: 'en-analyse' }, 'Passage en analyse'))}>En analyse</Button>}
                    {(i.status === 'en-analyse' || i.status === 'ouvert') && <Button size="sm" variant="secondary" onClick={() => run(refresh, () => updateIncident(ACTOR, i.id, { status: 'en-traitement' }, 'Prise en charge'))}>En traitement</Button>}
                    {i.status !== 'resolu' && i.status !== 'clos' && (
                      <Button size="sm" onClick={() => run(refresh, () => { const r = window.prompt('Description de la résolution (obligatoire) :'); if (!r) return; updateIncident(ACTOR, i.id, { status: 'resolu', resolution: r }, r); })}>Résoudre</Button>
                    )}
                    {i.status === 'resolu' && <Button size="sm" variant="secondary" onClick={() => run(refresh, () => updateIncident(ACTOR, i.id, { status: 'clos' }, 'Clôture'))}>Clore</Button>}
                  </div>
                </div>
                <p className="text-navy-700">{i.description}</p>
                <p className="text-xs text-navy-500">Service : {i.service} · Responsable : {i.owner} · Ouvert le {i.openedAt} · MAJ {i.updatedAt}</p>
                {i.resolution && <p className="text-xs text-green-700">Résolution : {i.resolution}</p>}
                {i.actions.length > 0 && (
                  <div className="text-xs text-navy-500 border-t border-navy-50 pt-1.5">
                    {i.actions.slice(-3).map((a, k) => <p key={k}>{a.at} — {a.by} : {a.note}</p>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ── Aides locales ─────────────────────────────────────────────────── */

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 py-1">
      <span className="text-navy-500">{label}</span>
      <span className="text-right font-medium text-navy-800">{value}</span>
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-navy-900/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl clinical-shadow max-w-xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-navy-100 sticky top-0 bg-white z-10">
          <h3 className="font-semibold text-navy-900">{title}</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>Fermer</Button>
        </div>
        <div className="p-5 space-y-2">{children}</div>
      </div>
    </div>
  );
}
