import { useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Filter,
  Landmark,
  Lock,
  Paperclip,
  Printer,
  Search,
  Send,
  ShieldAlert,
  X,
} from 'lucide-react';
import { Card, CardHeader, Badge, Button, EmptyState, SectionTitle, Input, Select, TextArea } from '@/components/ui';
import { PrintPreview } from '@/components/PrintPreview';
import type { BillingDoc } from '@/data/billingDocs';
import { docTotals, lineNet, today, time } from '@/data/billingDocs';
import { patients } from '@/data/patients';
import { formatFCFA, formatDateShort } from '@/utils/format';
import type {
  Bordereau,
  DossierAssurance,
  PieceStatus,
  RequiredPiece,
} from '@/data/insuranceDossiers';
import {
  CONTROL_META,
  DOSSIER_STATUS_META,
  PIECE_STATUS_META,
  STEP_LABELS,
  buildControls,
  demoBordereaux,
  nowStamp,
} from '@/data/insuranceDossiers';

type Screen = 'list' | 'detail';
type CounterKey = 'a-preparer' | 'incomplets' | 'a-controler' | 'prets' | 'transmis' | 'a-corriger';

interface Props {
  docs: BillingDoc[];
  setDocs: Dispatch<SetStateAction<BillingDoc[]>>;
  dossiers: DossierAssurance[];
  setDossiers: Dispatch<SetStateAction<DossierAssurance[]>>;
  initialDossierId?: string | null;
  onOpenReceivables: () => void;
  onOpenBilling: () => void;
}

/* ── Étape courante d'un dossier ───────────────────────────────────── */

function currentStep(d: DossierAssurance): number {
  if (d.transmission?.status === 'transmis') return 7;
  if (d.status === 'pret-transmission') return 6;
  if (d.status === 'bloque') {
    if (d.pieces.some((p) => p.stage === 'avant-emission' && p.status !== 'conforme' && p.status !== 'non-applicable')) return 5;
    return 6;
  }
  if (d.status === 'a-corriger') return 7;
  const missing = d.pieces.filter((p) => p.stage === 'avant-emission' && p.status !== 'conforme' && p.status !== 'non-applicable');
  return missing.length ? 5 : 6;
}

function stepState(d: DossierAssurance, step: number): { state: 'done' | 'current' | 'blocked' | 'future'; label: string } {
  const cs = currentStep(d);
  if (step < cs) return { state: 'done', label: d.pieces.filter((p) => p.dueStep === step).length ? 'Validé' : 'Terminé' };
  if (step === cs) {
    if (d.status === 'bloque') return { state: 'blocked', label: 'Dossier incomplet' };
    if (step === 5) return { state: 'current', label: 'Contrôle en cours' };
    if (step === 6) return { state: 'current', label: 'En préparation' };
    if (step === 7) return { state: 'current', label: d.transmission?.status === 'transmis' ? 'Transmis' : 'À transmettre' };
    return { state: 'current', label: 'En cours' };
  }
  return { state: 'future', label: 'À venir' };
}

const STEP_DATES: Record<string, Record<number, { date: string; author: string }>> = {
  'da-871': {
    1: { date: '15/10/2026 06:25', author: 'Agent d\u2019accueil' },
    2: { date: '15/10/2026 08:25', author: 'Agent tiers payant' },
    3: { date: '17/10/2026 10:40', author: 'Sage-femme' },
    4: { date: '17/10/2026 11:15', author: 'Agent de facturation' },
    5: { date: '17/10/2026 11:20', author: 'Agent de facturation' },
  },
};

function stepMeta(d: DossierAssurance, step: number): { date: string; author: string } {
  const fixed = STEP_DATES[d.id]?.[step];
  if (fixed) return fixed;
  return { date: '—', author: '—' };
}

/* ── Composant principal ───────────────────────────────────────────── */

export default function InsuranceDossiers({ docs, setDocs, dossiers, setDossiers, initialDossierId, onOpenReceivables, onOpenBilling }: Props) {
  const [bordereaux, setBordereaux] = useState<Bordereau[]>(() => JSON.parse(JSON.stringify(demoBordereaux)));
  const [screen, setScreen] = useState<Screen>(initialDossierId ? 'detail' : 'list');
  const [selectedId, setSelectedId] = useState<string | null>(initialDossierId ?? null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [insuranceFilter, setInsuranceFilter] = useState<string>('all');
  const [blockedOnly, setBlockedOnly] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showPrint, setShowPrint] = useState(false);
  const [showCorrection, setShowCorrection] = useState(false);
  const [showAttach, setShowAttach] = useState<RequiredPiece | null>(null);
  const [showTransmit, setShowTransmit] = useState(false);
  const [showStepInfo, setShowStepInfo] = useState<number | null>(null);

  useEffect(() => {
    if (initialDossierId) {
      setSelectedId(initialDossierId);
      setScreen('detail');
    }
  }, [initialDossierId]);

  function notify(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 5000);
  }

  function updateDossier(id: string, patch: Partial<DossierAssurance>, historyEntry?: { user: string; action: string; detail?: string }) {
    setDossiers((prev) =>
      prev.map((d) =>
        d.id === id
          ? { ...d, ...patch, lastUpdate: nowStamp(), history: historyEntry ? [...d.history, { timestamp: stampShort(), user: historyEntry.user, action: historyEntry.action, detail: historyEntry.detail }] : d.history }
          : d,
      ),
    );
  }

  function updatePiece(dossierId: string, pieceId: string, patch: Partial<RequiredPiece>) {
    setDossiers((prev) =>
      prev.map((d) => (d.id === dossierId ? { ...d, pieces: d.pieces.map((p) => (p.id === pieceId ? { ...p, ...patch } : p)) } : d)),
    );
  }

  const selected = dossiers.find((d) => d.id === selectedId) ?? null;
  const selectedDoc = selected ? docs.find((doc) => doc.id === selected.docId) ?? null : null;

  /* ── Liste ── */
  const counters = useMemo(() => {
    const c: Record<CounterKey, number> = { 'a-preparer': 0, incomplets: 0, 'a-controler': 0, prets: 0, transmis: 0, 'a-corriger': 0 };
    dossiers.forEach((d) => {
      const step = currentStep(d);
      if (d.status === 'transmis') c.transmis++;
      else if (d.status === 'a-corriger') c['a-corriger']++;
      else if (d.status === 'bloque') c.incomplets++;
      else if (d.status === 'pret-transmission') c.prets++;
      else if (step <= 4) c['a-preparer']++;
      else c['a-controler']++;
    });
    return c;
  }, [dossiers]);

  const filtered = useMemo(() => {
    return dossiers.filter((d) => {
      if (statusFilter !== 'all' && d.status !== statusFilter) return false;
      if (insuranceFilter !== 'all' && d.coverage.insurer !== insuranceFilter) return false;
      if (blockedOnly && d.status !== 'bloque') return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        const doc = docs.find((x) => x.id === d.docId);
        const p = doc ? patients.find((x) => x.id === doc.patientId) : null;
        const hay = `${d.number} ${d.episodeNumber} ${doc?.number ?? ''} ${p ? `${p.firstName} ${p.lastName} ${p.code}` : ''} ${d.coverage.insurer}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [dossiers, statusFilter, insuranceFilter, blockedOnly, query, docs]);

  if (screen === 'detail' && selected) {
    return (
      <DetailView
        dossier={selected}
        doc={selectedDoc}
        bordereaux={bordereaux}
        docs={docs}
        onBack={() => {
          setScreen('list');
          setSelectedId(null);
        }}
        onUpdate={(patch, hist) => updateDossier(selected.id, patch, hist)}
        onUpdatePiece={(pieceId, patch) => updatePiece(selected.id, pieceId, patch)}
        onUpdateBordereaux={setBordereaux}
        onNotify={notify}
        showCorrection={showCorrection}
        setShowCorrection={setShowCorrection}
        showAttach={showAttach}
        setShowAttach={setShowAttach}
        showTransmit={showTransmit}
        setShowTransmit={setShowTransmit}
        showStepInfo={showStepInfo}
        setShowStepInfo={setShowStepInfo}
        showPrint={showPrint}
        setShowPrint={setShowPrint}
        onOpenReceivables={onOpenReceivables}
        onOpenBilling={onOpenBilling}
      />
    );
  }

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Landmark className="w-6 h-6 text-medical-600" />
            <h2 className="text-xl font-bold text-navy-900">Dossiers assurance</h2>
          </div>
          <p className="mt-1 text-sm text-navy-500">Suivi des dossiers de la préfacturation à la transmission à l'organisme payeur.</p>
        </div>
        <Button variant="secondary" onClick={onOpenReceivables}>
          <FileText className="w-4 h-4 mr-1.5" /> Créances assurances
        </Button>
      </div>

      {toast && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm animate-fade-in">
          <CheckCircle2 className="w-4 h-4" /> {toast}
        </div>
      )}

      {/* Compteurs cliquables */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <CounterCard label="À préparer" value={counters['a-preparer']} tone="navy" active={statusFilter === 'en-cours' && !blockedOnly} onClick={() => { setStatusFilter('en-cours'); setBlockedOnly(false); }} />
        <CounterCard label="Incomplets / bloqués" value={counters.incomplets} tone="red" active={blockedOnly} onClick={() => { setBlockedOnly(true); setStatusFilter('all'); }} />
        <CounterCard label="À contrôler" value={counters['a-controler']} tone="amber" active={statusFilter === 'all' && !blockedOnly} onClick={() => { setStatusFilter('all'); setBlockedOnly(false); }} />
        <CounterCard label="Prêts à transmettre" value={counters.prets} tone="green" active={statusFilter === 'pret-transmission'} onClick={() => { setStatusFilter('pret-transmission'); setBlockedOnly(false); }} />
        <CounterCard label="Transmis" value={counters.transmis} tone="blue" active={statusFilter === 'transmis'} onClick={() => { setStatusFilter('transmis'); setBlockedOnly(false); }} />
        <CounterCard label="À corriger" value={counters['a-corriger']} tone="amber" active={statusFilter === 'a-corriger'} onClick={() => { setStatusFilter('a-corriger'); setBlockedOnly(false); }} />
      </div>

      {/* Recherche + filtres */}
      <Card className="p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-navy-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Patient, IUP, facture ou n° dossier assurance…"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-navy-200 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-medical-400"
            />
          </div>
          <Select
            label="Assurance"
            value={insuranceFilter}
            onChange={setInsuranceFilter}
            options={[{ value: 'all', label: 'Toutes' }, ...[...new Set(dossiers.map((d) => d.coverage.insurer))].map((i) => ({ value: i, label: i }))]}
          />
          <div className="flex items-end gap-2 pb-1">
            <label className="flex items-center gap-2 text-sm text-navy-700">
              <input type="checkbox" checked={blockedOnly} onChange={(e) => setBlockedOnly(e.target.checked)} /> Dossiers bloqués uniquement
            </label>
            <Filter className="w-4 h-4 text-navy-400" />
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader title="Liste des dossiers assurance" subtitle={`${filtered.length} dossier(s)`} />
        {filtered.length === 0 ? (
          <EmptyState icon={FileText} title="Aucun dossier" subtitle="Aucun dossier ne correspond aux critères." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-100 text-left text-navy-500">
                  <th className="px-4 py-3 font-medium">N° dossier</th>
                  <th className="px-3 py-3 font-medium">Patient / IUP</th>
                  <th className="px-3 py-3 font-medium">Venue</th>
                  <th className="px-3 py-3 font-medium">Facture</th>
                  <th className="px-3 py-3 font-medium">Assurance</th>
                  <th className="px-3 py-3 font-medium">Période soins</th>
                  <th className="px-3 py-3 text-right font-medium">Total</th>
                  <th className="px-3 py-3 text-right font-medium">Part ass.</th>
                  <th className="px-3 py-3 text-right font-medium">Part pat.</th>
                  <th className="px-3 py-3 font-medium">Étape</th>
                  <th className="px-3 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium">Blocage / resp.</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => {
                  const doc = docs.find((x) => x.id === d.docId);
                  const t = doc ? docTotals(doc) : null;
                  const p = doc ? patients.find((x) => x.id === doc.patientId) : null;
                  const meta = DOSSIER_STATUS_META[d.status];
                  return (
                    <tr
                      key={d.id}
                      onClick={() => {
                        setSelectedId(d.id);
                        setScreen('detail');
                      }}
                      className="border-b border-navy-50 hover:bg-navy-50/60 cursor-pointer"
                    >
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-medical-700 whitespace-nowrap">{d.number}</td>
                      <td className="px-3 py-3">
                        <p className="font-medium text-navy-900 whitespace-nowrap">{p ? `${p.lastName.toUpperCase()} ${p.firstName}` : '—'}</p>
                        <p className="text-xs font-mono text-navy-400">{p?.code ?? '—'}</p>
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-navy-600 whitespace-nowrap">{d.episodeNumber}</td>
                      <td className="px-3 py-3 font-mono text-xs text-navy-600 whitespace-nowrap">{doc?.number ?? '—'}</td>
                      <td className="px-3 py-3 text-navy-600 whitespace-nowrap">{d.coverage.insurer}</td>
                      <td className="px-3 py-3 text-xs text-navy-500 whitespace-nowrap">{d.carePeriod}</td>
                      <td className="px-3 py-3 text-right font-semibold text-navy-900 whitespace-nowrap">{t ? formatFCFA(t.net) : '—'}</td>
                      <td className="px-3 py-3 text-right text-turquoise-700 whitespace-nowrap">{t ? formatFCFA(t.partAssurance) : '—'}</td>
                      <td className="px-3 py-3 text-right text-navy-600 whitespace-nowrap">{t ? formatFCFA(t.partPatient) : '—'}</td>
                      <td className="px-3 py-3"><Badge color="navy">{currentStep(d)} / 7</Badge></td>
                      <td className="px-3 py-3"><Badge color={meta.color}>{meta.label}</Badge></td>
                      <td className="px-4 py-3 text-xs">
                        {d.blockingReason ? <p className="text-red-600 max-w-48">{d.blockingReason}</p> : <p className="text-navy-500">{d.responsible}</p>}
                        <p className="text-navy-400">MAJ {d.lastUpdate}</p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function CounterCard({ label, value, tone, active, onClick }: { label: string; value: number; tone: 'navy' | 'green' | 'red' | 'amber' | 'blue'; active: boolean; onClick: () => void }) {
  const tones: Record<string, string> = {
    navy: 'bg-navy-100 text-navy-700',
    green: 'bg-green-100 text-green-700',
    red: 'bg-red-100 text-red-700',
    amber: 'bg-amber-100 text-amber-700',
    blue: 'bg-medical-100 text-medical-700',
  };
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border p-3 text-left transition-colors ${active ? 'border-medical-400 bg-medical-50' : 'border-navy-100 bg-white hover:border-medical-300'}`}
    >
      <p className="text-xs text-navy-500 font-medium">{label}</p>
      <p className={`mt-1 text-xl font-bold ${active ? 'text-medical-700' : 'text-navy-900'}`}>{value}</p>
      <span className={`mt-1 inline-block h-1 w-8 rounded ${tones[tone]}`} />
    </button>
  );
}

/* ── Vue détail ────────────────────────────────────────────────────── */

function DetailView({
  dossier,
  doc,
  bordereaux,
  docs,
  onBack,
  onUpdate,
  onUpdatePiece,
  onUpdateBordereaux,
  onNotify,
  showCorrection,
  setShowCorrection,
  showAttach,
  setShowAttach,
  showTransmit,
  setShowTransmit,
  showStepInfo,
  setShowStepInfo,
  showPrint,
  setShowPrint,
  onOpenReceivables,
  onOpenBilling,
}: {
  dossier: DossierAssurance;
  doc: BillingDoc | null;
  bordereaux: Bordereau[];
  docs: BillingDoc[];
  onBack: () => void;
  onUpdate: (patch: Partial<DossierAssurance>, hist?: { user: string; action: string; detail?: string }) => void;
  onUpdatePiece: (pieceId: string, patch: Partial<RequiredPiece>) => void;
  onUpdateBordereaux: (b: Bordereau[]) => void;
  onNotify: (m: string) => void;
  showCorrection: boolean;
  setShowCorrection: (v: boolean) => void;
  showAttach: RequiredPiece | null;
  setShowAttach: (p: RequiredPiece | null) => void;
  showTransmit: boolean;
  setShowTransmit: (v: boolean) => void;
  showStepInfo: number | null;
  setShowStepInfo: (n: number | null) => void;
  showPrint: boolean;
  setShowPrint: (v: boolean) => void;
  onOpenReceivables: () => void;
  onOpenBilling: () => void;
}) {
  const t = doc ? docTotals(doc) : null;
  const patient = doc ? patients.find((p) => p.id === doc.patientId) : null;
  const controls = doc ? buildControls(dossier, doc) : [];
  const blockingPieces = dossier.pieces.filter((p) => p.mandatory && p.status !== 'conforme' && p.status !== 'non-applicable');
  const preEmissionBlocked = blockingPieces.filter((p) => p.stage === 'avant-emission');
  const finalBlocked = blockingPieces.filter((p) => p.stage === 'finale');
  const conformCount = dossier.pieces.filter((p) => p.status === 'conforme').length;
  const applicableCount = dossier.pieces.filter((p) => p.status !== 'non-applicable').length;
  const invoiceIssued = dossier.status === 'pret-transmission' || dossier.status === 'transmis' || (dossier.transmission?.status ?? '') !== 'pret';

  const canValidateConformity = preEmissionBlocked.length === 0 && dossier.status === 'bloque';
  const canEmit = preEmissionBlocked.length === 0 && dossier.status !== 'transmis' && dossier.status !== 'a-corriger';
  const canTransmit = finalBlocked.length === 0 && preEmissionBlocked.length === 0 && dossier.status === 'pret-transmission' && dossier.transmission?.status !== 'transmis';

  const headerActions = (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="secondary" size="sm" onClick={() => setShowAttach(dossier.pieces.find((p) => p.status === 'a-fournir') ?? dossier.pieces[0])}>
        <Paperclip className="w-3.5 h-3.5 mr-1" /> Joindre une pièce
      </Button>
      <Button variant="secondary" size="sm" onClick={() => setShowCorrection(true)}>
        <ShieldAlert className="w-3.5 h-3.5 mr-1" /> Renvoyer en correction
      </Button>
      <Button variant="secondary" size="sm" disabled={!doc} onClick={() => onNotify('Édition du bon : aperçu simulé du formulaire ' + dossier.coverage.priorAgreementRef)}>
        <Printer className="w-3.5 h-3.5 mr-1" /> Éditer le bon
      </Button>
      <Button
        variant="secondary"
        size="sm"
        disabled={!canValidateConformity}
        onClick={() => {
          if (!canValidateConformity) { onNotify(`Conformité préalable impossible : ${preEmissionBlocked.map((p) => p.label).join(', ') || 'contrôle déjà validé'}`); return; }
          onUpdate({ status: 'pret-transmission', blockingReason: undefined }, { user: 'Agent de facturation', action: 'Conformité préalable validée', detail: 'Étape 5 — pièces exigibles vérifiées' });
          onNotify('Conformité préalable validée — vous pouvez émettre la facture et le bon.');
        }}
      >
        <ClipboardCheck className="w-3.5 h-3.5 mr-1" /> Valider la conformité
      </Button>
      <Button
        variant="primary"
        size="sm"
        disabled={!canEmit}
        onClick={() => {
          if (!canEmit) { onNotify('Émission impossible tant que les pièces exigibles avant émission ne sont pas conformes.'); return; }
          onUpdate({ status: 'pret-transmission', blockingReason: undefined }, { user: 'Agent de facturation', action: 'Facture et bon émis (étape 6)', detail: `${doc?.number ?? ''} — signatures à recueillir` });
          onNotify('Facture et bon préparés. Ajoutez les signatures (simulées) puis validez le contrôle final.');
        }}
      >
        <FileText className="w-3.5 h-3.5 mr-1" /> Préparer la transmission
      </Button>
      <Button
        variant="turquoise"
        size="sm"
        disabled={!canTransmit}
        onClick={() => {
          if (!canTransmit) { onNotify(`Transmission impossible : ${finalBlocked.map((p) => p.label).join(', ') || 'dossier déjà transmis'}`); return; }
          setShowTransmit(true);
        }}
      >
        <Send className="w-3.5 h-3.5 mr-1" /> Enregistrer la transmission
      </Button>
    </div>
  );

  return (
    <div className="space-y-4 p-6">
      {/* Fil d'ariane */}
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-navy-600 hover:text-navy-900">
        <ArrowLeft className="w-4 h-4" /> Dossiers assurance
      </button>

      {/* Bandeau d'identification */}
      <Card className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-navy-900">Dossier assurance {dossier.number}</h2>
              <Badge color={DOSSIER_STATUS_META[dossier.status].color}>{DOSSIER_STATUS_META[dossier.status].label}</Badge>
              {dossier.blockingReason && (
                <Badge color="red">
                  <Lock className="w-3 h-3" /> Bloqué : {dossier.blockingReason}
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-navy-600">
              {patient ? `${patient.lastName.toUpperCase()} ${patient.firstName}` : '—'} · IUP {patient?.code ?? '—'} · {dossier.episodeNumber} (accomplissement) · Soins du {dossier.carePeriod} · Service {dossier.service} · {doc?.number ?? '—'}
            </p>
          </div>
          {headerActions}
        </div>
      </Card>

      {/* Parcours horizontal en 7 étapes */}
      <Card className="p-3">
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-2">
          {STEP_LABELS.map((s) => {
            const st = stepState(dossier, s.num);
            const meta = stepMeta(dossier, s.num);
            const border =
              st.state === 'done' ? 'border-green-300 bg-green-50' :
              st.state === 'blocked' ? 'border-red-300 bg-red-50' :
              st.state === 'current' ? 'border-medical-300 bg-medical-50' :
              'border-navy-100 bg-navy-50/50';
            const title = s.tab.split(' · ')[1] ?? s.title;
            const tabNum = s.tab.split(' · ')[0];
            return (
              <button
                key={s.num}
                onClick={() => setShowStepInfo(s.num)}
                className={`rounded-lg border p-2.5 text-left transition-colors hover:border-medical-400 ${border}`}
              >
                <p className="text-[10px] font-bold text-navy-500 tracking-wide">{tabNum}</p>
                <p className="text-xs font-bold text-navy-900 leading-tight">{title}</p>
                <p className="text-[11px] text-navy-600 font-medium">{s.subtitle}</p>
                <p className={`mt-1.5 text-[11px] font-semibold ${
                  st.state === 'done' ? 'text-green-700' : st.state === 'blocked' ? 'text-red-700' : st.state === 'current' ? 'text-medical-700' : 'text-navy-400'
                }`}>{st.label}</p>
                <p className="text-[10px] text-navy-400">{meta.date !== '—' ? `${meta.date} · ${meta.author}` : st.state === 'future' ? 'à venir' : ''}</p>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Trois panneaux */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Panneau 1 : assurance et prise en charge */}
        <Card>
          <CardHeader title="Assurance et prise en charge" />
          <div className="p-4 space-y-1.5 text-sm">
            {[
              ['Assureur (gestionnaire)', dossier.coverage.insurer],
              ['N° d\u2019assuré — bénéficiaire', dossier.coverage.memberNumber],
              ['Validité de la carte', dossier.coverage.validity],
              ['Droits vérifiés le', dossier.coverage.rightsChecked],
              ['Taux — franchise', dossier.coverage.deductible],
              ['Plafond annuel restant', dossier.coverage.annualCeiling],
              ['Exclusions', dossier.coverage.exclusions],
              ['Entente préalable', dossier.coverage.priorAgreementRequired ? 'Requise — obtenue' : 'Non requise'],
              ['Réf. bon / accord', dossier.coverage.priorAgreementRef ?? '—'],
              ['Actes autorisés — durée', dossier.coverage.authorizedServices],
              ['Montant autorisé (assureur)', formatFCFA(dossier.coverage.authorizedAmount)],
              ['Validité du bon', dossier.coverage.bonValidity],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 border-b border-navy-50 py-1 last:border-0">
                <span className="text-navy-500">{k}</span>
                <span className="text-right font-medium text-navy-900">{v}</span>
              </div>
            ))}
            <p className="pt-2 text-[11px] text-navy-400">
              Source des droits : {dossier.coverage.rightsSource}. Les paramètres de la convention utilisés pour ce dossier sont figés à la date de la venue.
            </p>
          </div>
        </Card>

        {/* Panneau 2 : facturation et contrôles automatiques */}
        <Card>
          <CardHeader title="Facturation et contrôles automatiques" />
          <div className="p-4 space-y-3">
            {t && (
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg bg-navy-50 p-2.5"><p className="text-[11px] text-navy-500">Total des prestations</p><p className="font-bold text-navy-900">{formatFCFA(t.net)}</p></div>
                <div className="rounded-lg bg-turquoise-50 p-2.5"><p className="text-[11px] text-turquoise-700">Part assurance (80% des actes couverts)</p><p className="font-bold text-turquoise-700">{formatFCFA(t.partAssurance)}</p></div>
                <div className="rounded-lg bg-navy-50 p-2.5"><p className="text-[11px] text-navy-500">Part patient</p><p className="font-bold text-navy-900">{formatFCFA(t.partPatient)}</p></div>
                <div className="rounded-lg bg-green-50 p-2.5"><p className="text-[11px] text-green-700">Montant autorisé</p><p className="font-bold text-green-700">{formatFCFA(dossier.coverage.authorizedAmount)}</p></div>
              </div>
            )}
            <div className="space-y-1.5">
              {controls.map((c) => {
                const meta = CONTROL_META[c.level];
                const icon = meta.icon === 'check' ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : meta.icon === 'warn' ? <ShieldAlert className="w-4 h-4 text-amber-600" /> : meta.icon === 'block' ? <Ban className="w-4 h-4 text-red-600" /> : <span className="inline-block w-4 text-center text-navy-400">—</span>;
                return (
                  <div key={c.id} className="flex items-start gap-2 rounded-lg border border-navy-100 px-2.5 py-1.5">
                    <span className="mt-0.5">{icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-navy-900">{c.label}</p>
                      {c.detail && <p className="text-[11px] text-navy-500">{c.detail}</p>}
                    </div>
                    <Badge color={meta.color}>{meta.color === 'green' ? 'Conforme' : meta.color === 'amber' ? 'Avertissement' : meta.color === 'red' ? 'Bloquant' : 'N/A'}</Badge>
                  </div>
                );
              })}
            </div>
            <button onClick={onOpenBilling} className="text-xs font-medium text-medical-700 hover:underline">
              Ouvrir les lignes détaillées dans Facturation →
            </button>
          </div>
        </Card>

        {/* Panneau 3 : conformité pièces requises */}
        <Card>
          <CardHeader title="Conformité : pièces requises" action={<Badge color={conformCount === applicableCount ? 'green' : 'red'}>{conformCount} / {applicableCount}</Badge>} />
          <div className="p-4 space-y-2">
            {dossier.pieces.map((p) => {
              const meta = PIECE_STATUS_META[p.status];
              return (
                <div key={p.id} className={`rounded-lg border p-2.5 ${p.status === 'a-fournir' || p.status === 'rejetee' ? 'border-red-200 bg-red-50' : 'border-navy-100 bg-white'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-navy-900">{p.label}</p>
                      <p className="text-[11px] text-navy-500">
                        {p.mandatory ? 'Obligatoire' : 'Facultative'} · exigible à l'étape {p.dueStep}
                        {p.document ? ` · ${p.document.name} (${p.document.version}, ajoutée le ${p.document.addedAt} par ${p.document.author})` : ''}
                        {p.document?.simulated ? ' · signature simulée' : ''}
                      </p>
                      {p.controlComment && <p className="text-[11px] text-navy-400 italic">{p.controlComment}</p>}
                    </div>
                    <Badge color={meta.color}>{meta.label}</Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <button onClick={() => setShowAttach(p)} className="rounded-md bg-navy-100 px-2 py-1 text-[11px] font-medium text-navy-700 hover:bg-navy-200">Joindre</button>
                    <button
                      onClick={() => {
                        onUpdatePiece(p.id, { status: 'conforme', controlComment: `Contrôlée le ${stampShort()} par l'agent de facturation` });
                        onNotify(`Pièce « ${p.label} » validée — statut : conforme.`);
                      }}
                      disabled={p.status === 'conforme' || !p.document}
                      className="rounded-md bg-green-100 px-2 py-1 text-[11px] font-medium text-green-700 hover:bg-green-200 disabled:opacity-40"
                    >
                      Valider
                    </button>
                    <button
                      onClick={() => onUpdatePiece(p.id, { status: 'rejetee', rejectedReason: 'Document illisible — à rescanner' })}
                      disabled={p.status !== 'jointe-a-verifier' && p.status !== 'conforme'}
                      className="rounded-md bg-red-100 px-2 py-1 text-[11px] font-medium text-red-700 hover:bg-red-200 disabled:opacity-40"
                    >
                      Rejeter
                    </button>
                  </div>
                  {p.status === 'rejetee' && p.rejectedReason && <p className="mt-1 text-[11px] text-red-600">{p.rejectedReason}</p>}
                </div>
              );
            })}
            {dossier.status === 'bloque' && blockingPieces.length > 0 && (
              <p className="rounded-lg bg-red-50 border border-red-200 p-2.5 text-[11px] text-red-700">
                <strong>Motif de blocage :</strong> {blockingPieces.map((p) => p.label.toLowerCase()).join(', ')}. La soumission reste impossible tant que la pièce n'est pas jointe.
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Validation / transmission / historique */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card>
          <CardHeader title="Validation" />
          <div className="p-4 space-y-1.5 text-sm">
            <Row k="Préparé par" v="Agent de facturation · 17/10 11:15" />
            <Row k="Contrôleur" v="Responsable facturation" />
            <Row k="Conformité validée le" v={dossier.status === 'pret-transmission' || dossier.transmission?.status === 'transmis' ? stampDate(dossier.history.find((h) => h.action.includes('Conformité'))?.timestamp) : '—'} />
            <Row k="Visa de la personne habilitée" v={dossier.transmission?.status === 'transmis' ? 'Mme Traoré (Facturation)' : '—'} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Soumission" subtitle="disponible quand le dossier est prêt" />
          <div className="p-4 space-y-1.5 text-sm">
            <Row k="Mode de transmission" v="Portail · Courrier · Dépôt physique" />
            <Row k="N° de lot / bordereau" v={dossier.transmission?.bordereauId ? bordereaux.find((b) => b.id === dossier.transmission?.bordereauId)?.number ?? '—' : '—'} />
            <Row k="Date de soumission" v={dossier.transmission?.date ?? '—'} />
            <Row k="Preuve de dépôt — agent" v={dossier.transmission?.proofAdded ? 'jointe (simulée)' : '—'} />
            {!canTransmit && dossier.transmission?.status !== 'transmis' && finalBlocked.length > 0 && (
              <p className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-[11px] text-amber-700">
                Contrôle final en attente : {finalBlocked.map((p) => p.label.toLowerCase()).join(', ')}.
              </p>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Historique du dossier" />
          <div className="p-4 max-h-56 overflow-y-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-left text-navy-400 border-b border-navy-100"><th className="py-1.5 font-medium">Date</th><th className="py-1.5 font-medium">Utilisateur</th><th className="py-1.5 font-medium">Action</th></tr></thead>
              <tbody>
                {[...dossier.history].reverse().map((h, i) => (
                  <tr key={i} className="border-b border-navy-50 last:border-0">
                    <td className="py-1.5 text-navy-500 whitespace-nowrap">{h.timestamp}</td>
                    <td className="py-1.5 text-navy-600 whitespace-nowrap">{h.user}</td>
                    <td className="py-1.5 text-navy-900">{h.action}{h.detail ? <span className="text-navy-400"> — {h.detail}</span> : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Modale pièce jointe */}
      {showAttach && (
        <AttachPieceModal
          piece={showAttach}
          onClose={() => setShowAttach(null)}
          onAttach={(name) => {
            onUpdatePiece(showAttach.id, {
              status: 'jointe-a-verifier',
              document: { name, version: 'v1', addedAt: stampShort(), author: 'Agent de facturation' },
              controlComment: 'En attente de contrôle',
            });
            setShowAttach(null);
            onNotify(`Pièce « ${showAttach.label} » jointe — statut : joint à vérifier (un contrôle est nécessaire).`);
          }}
        />
      )}

      {/* Modale renvoi en correction */}
      {showCorrection && (
        <CorrectionModal
          onClose={() => setShowCorrection(false)}
          onSave={(reason, items, service) => {
            const corrections = [...(dossier.corrections ?? []), { reason, items, service, requestedAt: stampShort() }];
            onUpdate(
              { status: 'a-corriger', corrections, blockingReason: reason },
              { user: 'Agent de facturation', action: 'Renvoi en correction', detail: `${reason} — ${service}` },
            );
            setShowCorrection(false);
            onNotify('Correction demandée : une tâche a été créée et un événement ajouté à l\u2019historique.');
          }}
        />
      )}

      {/* Modale transmission */}
      {showTransmit && (
        <TransmitModal
          dossier={dossier}
          doc={doc}
          bordereaux={bordereaux}
          onClose={() => setShowTransmit(false)}
          onConfirm={(mode, bordereauNumber, depositRef, observations) => {
            const existing = bordereaux.find((b) => b.number === bordereauNumber);
            const claimed = t?.partAssurance ?? 0;
            const bordereauId = existing?.id ?? `bord-${Date.now()}`;
            const newOrUpdated: Bordereau[] = existing
              ? bordereaux.map((b) => (b.id === existing.id ? { ...b, lines: [...b.lines.filter((l) => l.dossierId !== dossier.id), { dossierId: dossier.id }], totalClaimed: b.totalClaimed + claimed, invoiceCount: b.invoiceCount + 1 } : b))
              : [...bordereaux, {
                  id: bordereauId,
                  number: bordereauNumber,
                  organism: dossier.coverage.insurer,
                  manager: dossier.coverage.manager ?? '—',
                  status: 'transmis',
                  mode: mode as Bordereau['mode'],
                  lines: [{ dossierId: dossier.id }],
                  totalClaimed: claimed,
                  invoiceCount: 1,
                  date: today,
                  agent: 'Agent de facturation',
                  depositRef,
                  proof: { name: `Preuve-depot-${depositRef}.pdf`, note: 'Preuve de dépôt simulée', addedAt: stampShort() },
                  observations,
                  history: [{ timestamp: stampShort(), action: 'Transmission enregistrée (simulation)', detail: `Dossier ${dossier.number}` }],
                }];
            onUpdateBordereaux(newOrUpdated);
            onUpdate(
              {
                status: 'transmis',
                blockingReason: undefined,
                transmission: { status: 'transmis', bordereauId, date: today, agent: 'Agent de facturation', depositRef, proofAdded: true },
              },
              { user: 'Agent de facturation', action: 'Transmission (simulation)', detail: `Bordereau ${bordereauNumber} · dépôt ${depositRef} — aucune donnée réelle envoyée` },
            );
            setShowTransmit(false);
            onNotify(`Transmission simulée — bordereau ${bordereauNumber}, preuve de dépôt jointe. Aucune donnée réelle n'a été envoyée.`);
          }}
        />
      )}

      {/* Modale info étape */}
      {showStepInfo !== null && (
        <StepInfoModal step={showStepInfo} dossier={dossier} onClose={() => setShowStepInfo(null)} />
      )}

      {/* Impression bordereau */}
      {showPrint && doc && (
        <PrintPreview title={`Bordereau — dossier ${dossier.number}`} onClose={() => setShowPrint(false)}>
          <div>
            <h1 className="text-lg font-bold text-navy-900 mb-1">Groupe Médical HOMEA — Bordereau de transmission</h1>
            <p className="text-sm text-navy-500 mb-4">Dossier {dossier.number} · {patient?.lastName} {patient?.firstName} · {doc.number}</p>
            <table className="w-full text-sm">
              <tbody>
                <tr><td className="py-1 font-medium">Organisme</td><td>{dossier.coverage.insurer}</td></tr>
                <tr><td className="py-1 font-medium">Total réclamé</td><td>{formatFCFA(t?.partAssurance ?? 0)}</td></tr>
                <tr><td className="py-1 font-medium">Période de soins</td><td>{dossier.carePeriod}</td></tr>
              </tbody>
            </table>
          </div>
        </PrintPreview>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-navy-50 py-1 last:border-0">
      <span className="text-navy-500">{k}</span>
      <span className="text-right font-medium text-navy-900">{v}</span>
    </div>
  );
}

/* ── Modales ───────────────────────────────────────────────────────── */

function AttachPieceModal({ piece, onClose, onAttach }: { piece: RequiredPiece; onClose: () => void; onAttach: (name: string) => void }) {
  const [name, setName] = useState('');
  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setName(file?.name ?? '');
  }

  return (
    <Modal title={`Joindre une pièce — ${piece.label}`} onClose={onClose}>
      <label className="block text-sm font-medium text-navy-700 mb-1" htmlFor="attachment-file">Fichier</label>
      <input id="attachment-file" type="file" className="w-full text-sm text-navy-700 file:mr-3 file:rounded-lg file:border-0 file:bg-navy-100 file:px-3 file:py-2 file:font-medium file:text-navy-700 hover:file:bg-navy-200" onChange={handleFileChange} />
      {name && <p className="mt-2 text-xs text-navy-500">Fichier sélectionné : {name}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Annuler</Button>
        <Button variant="primary" disabled={!name} onClick={() => onAttach(name)}>Joindre</Button>
      </div>
    </Modal>
  );
}

function CorrectionModal({ onClose, onSave }: { onClose: () => void; onSave: (reason: string, items: string, service: string) => void }) {
  const [reason, setReason] = useState('');
  const [items, setItems] = useState('');
  const [service, setService] = useState('Maternité');
  return (
    <Modal title="Renvoyer en correction" onClose={onClose}>
      <div className="space-y-3">
        <Input label="Motif" value={reason} onChange={setReason} required />
        <TextArea label="Éléments à corriger" value={items} onChange={setItems} rows={2} />
        <Input label="Service ou responsable" value={service} onChange={setService} />
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Annuler</Button>
        <Button variant="primary" disabled={!reason.trim()} onClick={() => onSave(reason.trim(), items.trim(), service.trim())}>Demander la correction</Button>
      </div>
    </Modal>
  );
}

function TransmitModal({
  dossier,
  doc,
  bordereaux,
  onClose,
  onConfirm,
}: {
  dossier: DossierAssurance;
  doc: BillingDoc | null;
  bordereaux: Bordereau[];
  onClose: () => void;
  onConfirm: (mode: string, bordereauNumber: string, depositRef: string, observations: string) => void;
}) {
  const [mode, setMode] = useState('portail');
  const [bordereauNumber, setBordereauNumber] = useState(`BORD-2026-0${bordereaux.length + 78}`);
  const [depositRef, setDepositRef] = useState(`DEP-2026-045${bordereaux.length + 1}`);
  const [observations, setObservations] = useState('');
  const t = doc ? docTotals(doc) : null;
  return (
    <Modal title="Enregistrer la transmission (simulation)" onClose={onClose}>
      <div className="mb-3 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700">
        <strong>Prototype :</strong> « Simuler la transmission » n'envoie aucune donnée à l'organisme. Une preuve de dépôt fictive est jointe.
      </div>
      <div className="space-y-3">
        <Select label="Mode" value={mode} onChange={setMode} options={[{ value: 'portail', label: 'Portail' }, { value: 'courrier', label: 'Courrier' }, { value: 'depot-physique', label: 'Dépôt physique' }, { value: 'autre', label: 'Autre' }]} />
        <Input label="N° de bordereau / lot" value={bordereauNumber} onChange={setBordereauNumber} />
        <Input label="Référence de dépôt" value={depositRef} onChange={setDepositRef} />
        <TextArea label="Observations" value={observations} onChange={setObservations} rows={2} />
        <p className="text-xs text-navy-500">
          Total réclamé à l'assurance : <strong>{formatFCFA(t?.partAssurance ?? 0)}</strong> · Facture : {doc?.number ?? '—'}
        </p>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Annuler</Button>
        <Button variant="turquoise" onClick={() => onConfirm(mode, bordereauNumber.trim(), depositRef.trim(), observations.trim())}>
          <Send className="w-4 h-4 mr-1.5" /> Simuler la transmission
        </Button>
      </div>
    </Modal>
  );
}

function StepInfoModal({ step, dossier, onClose }: { step: number; dossier: DossierAssurance; onClose: () => void }) {
  const s = STEP_LABELS[step - 1];
  const meta = stepMeta(dossier, step);
  const st = stepState(dossier, step);
  const pieces = dossier.pieces.filter((p) => p.dueStep === step);
  return (
    <Modal title={`Étape ${step} — ${s.title} · ${s.subtitle}`} onClose={onClose}>
      <div className="space-y-2 text-sm">
        <Row k="État" v={st.label} />
        <Row k="Date" v={meta.date} />
        <Row k="Responsable" v={meta.author} />
        {dossier.blockingReason && st.state === 'blocked' && <Row k="Motif de blocage" v={dossier.blockingReason} />}
        {pieces.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-navy-500 mt-2 mb-1">Pièces de cette étape</p>
            {pieces.map((p) => (
              <p key={p.id} className="text-xs text-navy-700">• {p.label} — {PIECE_STATUS_META[p.status].label}</p>
            ))}
          </div>
        )}
      </div>
      <div className="mt-4 flex justify-end">
        <Button variant="secondary" onClick={onClose}>Fermer</Button>
      </div>
    </Modal>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto" >
        <CardHeader title={title} action={<button onClick={onClose} className="text-navy-400 hover:text-navy-700"><X className="w-5 h-5" /></button>} />
        <div className="p-5">{children}</div>
      </Card>
    </div>
  );
}

function stampShort(): string {
  const n = new Date();
  return `${String(n.getDate()).padStart(2, '0')}/${String(n.getMonth() + 1).padStart(2, '0')} ${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`;
}

function stampDate(ts?: string): string {
  return ts ?? '—';
}
