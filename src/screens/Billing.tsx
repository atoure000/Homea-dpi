import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import {
  FileText,
  Plus,
  X,
  CheckCircle2,
  ArrowLeft,
  Wallet,
  Receipt,
  Printer,
  Search,
  Filter,
  Pencil,
  Copy,
  RefreshCw,
  Ban,
  FilePlus2,
  BookOpen,
  ShieldCheck,
  History,
  Download,
  Upload,
  Layers,
  Save,
} from 'lucide-react';
import { Card, CardHeader, Badge, Button, EmptyState, SectionTitle } from '@/components/ui';
import { InvoicePrint } from '@/components/InvoicePrint';
import { NewBillingDocModal } from '@/components/NewBillingDocModal';
import {
  BillingTemplatesModal,
  TemplateSelectionModal,
  SaveAsTemplateModal,
  DocTypeChooser,
} from '@/components/BillingTemplates';
import type { BillingTemplate } from '@/data/billingTemplates';
import { demoTemplates } from '@/data/billingTemplates';
import type {
  BillingDoc,
  BillingDocStatus,
  BillingDocType,
  BillingLine,
  BillingPayment,
  CatalogueItem,
} from '@/data/billingDocs';
import {
  DOC_STATUS_META,
  DOC_TYPE_LABELS,
  INSURANCE_TRACKING_META,
  LINE_STATUS_LABELS,
  ORIGIN_LABELS,
  PAYMENT_MODES,
  catalogue,
  docTotals,
  lineAssurance,
  lineNet,
  linePatient,
  today,
  time,
} from '@/data/billingDocs';
import { patients } from '@/data/patients';
import { formatFCFA, formatDate } from '@/utils/format';

type FilterValue = 'all' | BillingDocType | 'a-encaisser' | 'partiellement-payees' | 'payees' | 'annulees';

const filters: { value: FilterValue; label: string }[] = [
  { value: 'all', label: 'Toutes' },
  { value: 'cotation', label: 'Cotations' },
  { value: 'prefacture', label: 'Préfactures' },
  { value: 'facture', label: 'Factures' },
  { value: 'a-encaisser', label: 'À encaisser' },
  { value: 'partiellement-payees', label: 'Partiellement payées' },
  { value: 'payees', label: 'Payées' },
  { value: 'annulees', label: 'Annulées' },
];

function DocStatusBadge({ status }: { status: BillingDocStatus }) {
  const meta = DOC_STATUS_META[status];
  return <Badge color={meta.color}>{meta.label}</Badge>;
}

function TypeBadge({ type }: { type: BillingDocType }) {
  const color = type === 'cotation' ? 'blue' : type === 'prefacture' ? 'amber' : 'green';
  return <Badge color={color}>{DOC_TYPE_LABELS[type]}</Badge>;
}

function nextNumbers(docs: BillingDoc[]): Record<BillingDocType, number> {
  const count = (t: BillingDocType) => docs.filter((d) => d.type === t).length;
  return {
    cotation: count('cotation') + 1,
    prefacture: count('prefacture') + 1,
    facture: count('facture') + 1,
  };
}

export default function Billing({ docs, setDocs, onOpenDossier, initialSelectedDocId, onConsumedDocId }: { docs: BillingDoc[]; setDocs: Dispatch<SetStateAction<BillingDoc[]>>; onOpenDossier?: (docId: string) => void; initialSelectedDocId?: string | null; onConsumedDocId?: () => void }) {
  const [filter, setFilter] = useState<FilterValue>('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [showCatalogue, setShowCatalogue] = useState(false);
  const [transformTarget, setTransformTarget] = useState<BillingDocType | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (initialSelectedDocId) {
      setSelectedId(initialSelectedDocId);
      onConsumedDocId?.();
    }
  }, [initialSelectedDocId, onConsumedDocId]);
  const [templates, setTemplates] = useState<BillingTemplate[]>(demoTemplates);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showDocTypeChooser, setShowDocTypeChooser] = useState(false);
  const [templateSelectionFor, setTemplateSelectionFor] = useState<BillingDocType | null>(null);
  const [pendingDocType, setPendingDocType] = useState<BillingDocType | null>(null);
  const [newDocTemplate, setNewDocTemplate] = useState<BillingTemplate | null>(null);
  const [showSaveAsTemplate, setShowSaveAsTemplate] = useState(false);

  const selected = docs.find((d) => d.id === selectedId) ?? null;
  const templateDoc = selectedId ? docs.find((d) => d.id === selectedId) ?? null : null;

  function notify(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  function updateDoc(id: string, patch: Partial<BillingDoc>) {
    setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }

  function pushHistory(id: string, action: string, detail?: string) {
    setDocs((prev) =>
      prev.map((d) => (d.id === id ? { ...d, history: [...d.history, { timestamp: `${today} ${time}`, action, detail }] } : d)),
    );
  }

  const filtered = useMemo(() => {
    let list = docs;
    if (filter === 'cotation' || filter === 'prefacture' || filter === 'facture') list = list.filter((d) => d.type === filter);
    else if (filter === 'a-encaisser') list = list.filter((d) => d.type === 'facture' && (d.status === 'valide' || d.status === 'en-attente'));
    else if (filter === 'partiellement-payees') list = list.filter((d) => d.status === 'partiellement-paye');
    else if (filter === 'payees') list = list.filter((d) => d.status === 'paye');
    else if (filter === 'annulees') list = list.filter((d) => d.status === 'annule');

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((d) => {
        const p = patients.find((x) => x.id === d.patientId);
        return (
          d.number.toLowerCase().includes(q) ||
          (p && `${p.firstName} ${p.lastName}`.toLowerCase().includes(q)) ||
          (p && p.code.toLowerCase().includes(q)) ||
          (p && p.phone.toLowerCase().includes(q)) ||
          d.insurance.toLowerCase().includes(q) ||
          d.episode.toLowerCase().includes(q) ||
          d.date.includes(q)
        );
      });
    }
    return list;
  }, [docs, filter, query]);

  const kpis = useMemo(() => {
    const cotations = docs.filter((d) => d.type === 'cotation' && d.status === 'en-attente').length;
    const prefactures = docs.filter((d) => d.type === 'prefacture' && d.status !== 'annule' && d.status !== 'transforme').length;
    const aEncaisser = docs.filter((d) => d.type === 'facture' && (d.status === 'valide' || d.status === 'en-attente')).length;
    const partielles = docs.filter((d) => d.status === 'partiellement-paye').length;
    const factures = docs.filter((d) => d.type === 'facture');
    const totalFacture = factures.reduce((s, d) => s + docTotals(d).net, 0);
    const encaisse = docs.reduce((s, d) => s + docTotals(d).encaisse, 0);
    const restePatient = docs.reduce((s, d) => s + docTotals(d).restePatient, 0);
    const resteAssurance = docs.reduce((s, d) => s + docTotals(d).resteAssurance, 0);
    const annulees = docs.filter((d) => d.status === 'annule').length;
    return { cotations, prefactures, aEncaisser, partielles, totalFacture, encaisse, restePatient, resteAssurance, annulees };
  }, [docs]);

  /* ── Detail view ── */
  if (selected) {
    return (
      <DetailView
        doc={selected}
        onBack={() => setSelectedId(null)}
        onUpdate={(patch) => updateDoc(selected.id, patch)}
        onHistory={(action, detail) => pushHistory(selected.id, action, detail)}
        onPayment={() => setShowPayment(true)}
        onPrint={() => setShowPrint(true)}
        onTransform={(t) => setTransformTarget(t)}
        onToast={notify}
        onOpenDossier={onOpenDossier}
        onSaveAsTemplate={() => setShowSaveAsTemplate(true)}
        showPayment={showPayment}
        setShowPayment={setShowPayment}
        showPrint={showPrint}
        setShowPrint={setShowPrint}
        transformTarget={transformTarget}
        setTransformTarget={setTransformTarget}
        onTransformSave={(target) => {
          const nums = nextNumbers(docs);
          const prefix = target === 'facture' ? 'FAC' : 'PREF';
          const number = `${prefix}-2026-${String(nums[target]).padStart(4, '0')}`;
          const newDoc: BillingDoc = {
            ...selected,
            id: `doc${Date.now()}`,
            type: target,
            number,
            date: today,
            time,
            sourceRef: selected.number,
            status: 'brouillon',
            payments: [],
            insuranceTracking: undefined,
            validityDays: undefined,
            entryDate: target === 'prefacture' ? selected.entryDate : undefined,
            exitDate: target === 'prefacture' ? selected.exitDate : undefined,
            lines: selected.lines.map((l) => ({ ...l, lineStatus: target === 'facture' ? 'facturable' : l.lineStatus })),
            history: [{ timestamp: `${today} ${time}`, action: 'Document créé', detail: `Issue de ${selected.type === 'cotation' ? 'la cotation' : 'la préfacture'} ${selected.number}` }],
          };
          setDocs((prev) => [newDoc, ...prev.map((d) => (d.id === selected.id ? { ...d, status: 'transforme' as BillingDocStatus, history: [...d.history, { timestamp: `${today} ${time}`, action: 'Document transformé', detail: number }] } : d))]);
          setSelectedId(newDoc.id);
          setTransformTarget(null);
          notify(`Document transformé en ${DOC_TYPE_LABELS[target]} ${number}`);
        }}
      />
    );
  }

  /* ── List view ── */
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-navy-900">Facturation</h2>
          <p className="text-sm text-navy-500 mt-0.5">Cotations, préfactures, factures et encaissements</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowCatalogue(true)}>
            <BookOpen className="w-4 h-4 mr-1.5" /> Catalogue
          </Button>
          <Button variant="secondary" onClick={() => setShowTemplates(true)}>
            <Layers className="w-4 h-4 mr-1.5" /> Modèles de facture
          </Button>
          <Button variant="primary" onClick={() => setShowDocTypeChooser(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Nouveau document
          </Button>
        </div>
      </div>

      {toast && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm animate-fade-in">
          <CheckCircle2 className="w-4 h-4" /> {toast}
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard label="Cotations en attente" value={kpis.cotations} color="blue" icon={FileText} />
        <KpiCard label="Préfactures ouvertes" value={kpis.prefactures} color="amber" icon={FilePlus2} />
        <KpiCard label="Factures à encaisser" value={kpis.aEncaisser} color="navy" icon={Receipt} />
        <KpiCard label="Partiellement payées" value={kpis.partielles} color="amber" icon={Wallet} />
        <KpiCard label="Factures annulées" value={kpis.annulees} color="red" icon={Ban} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Montant total facturé" value={formatFCFA(kpis.totalFacture)} color="green" icon={Receipt} money />
        <KpiCard label="Montant encaissé" value={formatFCFA(kpis.encaisse)} color="green" icon={Wallet} money />
        <KpiCard label="Reste à recouvrer (patients)" value={formatFCFA(kpis.restePatient)} color="amber" icon={Wallet} money />
        <KpiCard label="Reste à recouvrer (assurances)" value={formatFCFA(kpis.resteAssurance)} color="turquoise" icon={ShieldCheck} money />
      </div>

      {/* Search + filters */}
      <div className="flex flex-col gap-3">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-navy-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher par numéro, patient, dossier, téléphone, assurance, période…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-navy-200 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-medical-400 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-navy-400" />
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f.value ? 'bg-medical-600 text-white' : 'bg-navy-50 text-navy-600 hover:bg-navy-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader title="Documents de facturation" subtitle={`${filtered.length} document(s)`} />
        {filtered.length === 0 ? (
          <EmptyState icon={FileText} title="Aucun document" subtitle="Aucun document ne correspond aux critères" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-100 text-left text-navy-500">
                  <th className="px-5 py-3 font-medium">N° document</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Patient</th>
                  <th className="px-5 py-3 font-medium">Dossier</th>
                  <th className="px-5 py-3 font-medium">Épisode</th>
                  <th className="px-5 py-3 font-medium">Assurance</th>
                  <th className="px-5 py-3 font-medium text-right">Total</th>
                  <th className="px-5 py-3 font-medium text-right">Part patient</th>
                  <th className="px-5 py-3 font-medium text-right">Part assurance</th>
                  <th className="px-5 py-3 font-medium text-right">Encaissé</th>
                  <th className="px-5 py-3 font-medium text-right">Solde</th>
                  <th className="px-5 py-3 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => {
                  const t = docTotals(d);
                  const p = patients.find((x) => x.id === d.patientId);
                  return (
                    <tr key={d.id} onClick={() => setSelectedId(d.id)} className="border-b border-navy-50 hover:bg-navy-50/50 cursor-pointer">
                      <td className="px-5 py-3 font-mono text-xs font-medium text-medical-700 whitespace-nowrap">{d.number}</td>
                      <td className="px-5 py-3"><TypeBadge type={d.type} /></td>
                      <td className="px-5 py-3 text-navy-500 whitespace-nowrap">{formatDate(d.date)}</td>
                      <td className="px-5 py-3 font-medium text-navy-900 whitespace-nowrap">{p ? `${p.firstName} ${p.lastName}` : d.patientId}</td>
                      <td className="px-5 py-3 text-navy-500 font-mono text-xs whitespace-nowrap">{p?.code ?? '—'}</td>
                      <td className="px-5 py-3 text-navy-500 whitespace-nowrap">{d.episode}</td>
                      <td className="px-5 py-3 text-navy-500 whitespace-nowrap">{d.insurance}</td>
                      <td className="px-5 py-3 text-right font-semibold text-navy-900 whitespace-nowrap">{formatFCFA(t.net)}</td>
                      <td className="px-5 py-3 text-right text-navy-600 whitespace-nowrap">{formatFCFA(t.partPatient)}</td>
                      <td className="px-5 py-3 text-right text-turquoise-600 whitespace-nowrap">{formatFCFA(t.partAssurance)}</td>
                      <td className="px-5 py-3 text-right text-green-700 whitespace-nowrap">{formatFCFA(t.encaisse)}</td>
                      <td className="px-5 py-3 text-right font-medium text-navy-900 whitespace-nowrap">{formatFCFA(t.solde)}</td>
                      <td className="px-5 py-3"><DocStatusBadge status={d.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showNew && (
        <NewBillingDocModal
          onClose={() => { setShowNew(false); setNewDocTemplate(null); setPendingDocType(null); }}
          onSave={(doc) => {
            setDocs((prev) => [doc, ...prev]);
            setShowNew(false);
            setNewDocTemplate(null);
            setPendingDocType(null);
            notify(`${DOC_TYPE_LABELS[doc.type]} ${doc.number} créée`);
          }}
          nextNumbers={nextNumbers(docs)}
          initialTemplate={newDocTemplate}
          initialDocType={pendingDocType ?? undefined}
        />
      )}

      {showCatalogue && <CatalogueModal onClose={() => setShowCatalogue(false)} />}

      {/* Template management modal */}
      {showTemplates && (
        <BillingTemplatesModal
          onClose={() => setShowTemplates(false)}
          templates={templates}
          setTemplates={setTemplates}
        />
      )}

      {/* Step 1: choose document type */}
      {showDocTypeChooser && (
        <DocTypeChooser
          onClose={() => setShowDocTypeChooser(false)}
          onChoose={(t) => {
            setShowDocTypeChooser(false);
            setTemplateSelectionFor(t);
          }}
        />
      )}

      {/* Template selection before creating a document */}
      {templateSelectionFor && (
        <TemplateSelectionModal
          docType={templateSelectionFor}
          templates={templates}
          onClose={() => setTemplateSelectionFor(null)}
          onUse={(tpl) => {
            setNewDocTemplate(tpl);
            setPendingDocType(templateSelectionFor);
            setShowNew(true);
            setTemplateSelectionFor(null);
          }}
          onContinueWithout={() => {
            setNewDocTemplate(null);
            setPendingDocType(templateSelectionFor);
            setShowNew(true);
            setTemplateSelectionFor(null);
          }}
          onCreateNew={() => {
            setTemplateSelectionFor(null);
            setShowTemplates(true);
          }}
        />
      )}

      {/* Save as template from detail view */}
      {showSaveAsTemplate && templateDoc && (
        <SaveAsTemplateModal
          lines={templateDoc.lines}
          docType={templateDoc.type}
          onClose={() => setShowSaveAsTemplate(false)}
          onSave={(tpl) => {
            setTemplates((prev) => [...prev, tpl]);
            setShowSaveAsTemplate(false);
            notify('Le modèle a été enregistré pour cette démonstration.');
          }}
        />
      )}
    </div>
  );
}

/* ── KPI card ── */
function KpiCard({ label, value, color, icon: Icon, money = false }: {
  label: string; value: string | number; color: 'navy' | 'green' | 'red' | 'amber' | 'blue' | 'turquoise'; icon: typeof FileText; money?: boolean;
}) {
  const bg: Record<string, string> = {
    navy: 'bg-navy-50 text-navy-700',
    green: 'bg-green-50 text-green-700',
    red: 'bg-red-50 text-red-700',
    amber: 'bg-amber-50 text-amber-700',
    blue: 'bg-medical-50 text-medical-700',
    turquoise: 'bg-turquoise-50 text-turquoise-700',
  };
  return (
    <Card className="p-4">
      <div className={`w-9 h-9 rounded-lg ${bg[color]} flex items-center justify-center mb-2`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-xs text-navy-500 font-medium mb-0.5">{label}</p>
      <p className={`${money ? 'text-base' : 'text-lg'} font-bold text-navy-900 leading-tight`}>{value}</p>
    </Card>
  );
}

/* ── Detail view ── */
function DetailView({ doc, onBack, onUpdate, onHistory, onPayment, onPrint, onTransform, onToast, onOpenDossier, onSaveAsTemplate, showPayment, setShowPayment, showPrint, setShowPrint, transformTarget, setTransformTarget, onTransformSave }: {
  doc: BillingDoc;
  onBack: () => void;
  onUpdate: (patch: Partial<BillingDoc>) => void;
  onHistory: (action: string, detail?: string) => void;
  onPayment: () => void;
  onPrint: () => void;
  onTransform: (t: BillingDocType) => void;
  onToast: (m: string) => void;
  onOpenDossier?: (docId: string) => void;
  onSaveAsTemplate: () => void;
  showPayment: boolean;
  setShowPayment: (v: boolean) => void;
  showPrint: boolean;
  setShowPrint: (v: boolean) => void;
  transformTarget: BillingDocType | null;
  setTransformTarget: (v: BillingDocType | null) => void;
  onTransformSave: (target: BillingDocType) => void;
}) {
  const t = docTotals(doc);
  const p = patients.find((x) => x.id === doc.patientId);
  const locked = doc.type === 'facture' && doc.status !== 'brouillon';
  const [showHistory, setShowHistory] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancel, setShowCancel] = useState(false);
  const [showCreditNote, setShowCreditNote] = useState(false);
  const [creditReason, setCreditReason] = useState('');
  const [confirmValidate, setConfirmValidate] = useState(false);
  const [editLineId, setEditLineId] = useState<string | null>(null);

  function validateDoc() {
    if (doc.lines.length === 0) {
      onToast('Document sans ligne — impossible de valider');
      return;
    }
    setConfirmValidate(true);
  }

  function confirmValidateDoc() {
    onUpdate({
      status: 'valide',
      validatedBy: 'Mme Traoré (Facturation)',
      validatedAt: `${today} ${time}`,
      insuranceTracking: doc.type === 'facture' && t.partAssurance > 0 ? { status: 'a-preparer', amountToClaim: t.partAssurance, amountTransmitted: 0, amountAccepted: 0, amountRejected: 0, amountPaid: 0 } : doc.insuranceTracking,
    });
    onHistory('Document validé', 'Validé par Mme Traoré (Facturation)');
    setConfirmValidate(false);
    onToast('Document validé');
  }

  function cancelDoc() {
    if (!cancelReason.trim()) {
      onToast('Le motif d\'annulation est obligatoire');
      return;
    }
    onUpdate({ status: 'annule', cancelReason });
    onHistory('Document annulé', cancelReason);
    setShowCancel(false);
    setCancelReason('');
    onToast('Document annulé');
  }

  function createCreditNote() {
    if (!creditReason.trim()) return;
    onUpdate({ creditNote: { number: `AV-2026-${String(Date.now()).slice(-4)}`, date: today, reason: creditReason, amount: t.net } });
    onHistory('Avoir créé', creditReason);
    setShowCreditNote(false);
    setCreditReason('');
    onToast('Avoir créé');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-navy-600 hover:text-navy-900">
          <ArrowLeft className="w-4 h-4" /> Retour à la liste
        </button>
        <div className="flex items-center gap-2">
          <TypeBadge type={doc.type} />
          <Badge color="navy">{doc.number}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader
          title={`${DOC_TYPE_LABELS[doc.type]} ${doc.number}`}
          subtitle={`${p ? `${p.firstName} ${p.lastName}` : doc.patientId} · ${formatDate(doc.date)} · ${doc.episode}`}
          action={<DocStatusBadge status={doc.status} />}
        />
        <div className="p-5 space-y-6">
          {/* Source ref */}
          {doc.sourceRef && (
            <div className="rounded-lg bg-turquoise-50 border border-turquoise-200 p-3 text-sm text-turquoise-700">
              Issue de {doc.type === 'facture' ? 'la cotation / préfacture' : 'la cotation'} {doc.sourceRef}
            </div>
          )}

          {/* Identity banner */}
          <div className="rounded-lg bg-navy-50 p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div><p className="text-xs text-navy-400">Patient</p><p className="font-semibold text-navy-900">{p ? `${p.firstName} ${p.lastName}` : doc.patientId}</p></div>
            <div><p className="text-xs text-navy-400">Dossier</p><p className="font-medium text-navy-800 font-mono text-xs">{p?.code ?? '—'}</p></div>
            <div><p className="text-xs text-navy-400">Assurance</p><p className="font-medium text-navy-800">{doc.insurance} · {doc.coverageRate}%</p></div>
            <div><p className="text-xs text-navy-400">N° assuré</p><p className="font-medium text-navy-800 font-mono text-xs">{doc.insuranceNumber || '—'}</p></div>
            {doc.entryDate && <div><p className="text-xs text-navy-400">Entrée</p><p className="font-medium text-navy-800">{doc.entryDate}</p></div>}
            {doc.exitDate && <div><p className="text-xs text-navy-400">Sortie</p><p className="font-medium text-navy-800">{doc.exitDate}</p></div>}
            {doc.validityDays && <div><p className="text-xs text-navy-400">Validité</p><p className="font-medium text-navy-800">{doc.validityDays} jours</p></div>}
            <div><p className="text-xs text-navy-400">Service</p><p className="font-medium text-navy-800">{doc.service}</p></div>
          </div>

          {/* Lines */}
          <div>
            <SectionTitle>Prestations</SectionTitle>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-navy-100 text-left text-navy-500">
                    <th className="py-2 pr-3 font-medium">Code</th>
                    <th className="py-2 px-3 font-medium">Désignation</th>
                    <th className="py-2 px-3 font-medium text-right">Qté</th>
                    <th className="py-2 px-3 font-medium text-right">P.U.</th>
                    <th className="py-2 px-3 font-medium text-right">Remise</th>
                    <th className="py-2 px-3 font-medium text-right">Montant</th>
                    <th className="py-2 px-3 font-medium">Couverture</th>
                    <th className="py-2 px-3 font-medium text-right">Part assurance</th>
                    <th className="py-2 px-3 font-medium text-right">Part patient</th>
                    <th className="py-2 px-3 font-medium">Origine</th>
                    <th className="py-2 px-3 font-medium">Statut ligne</th>
                    {!locked && <th className="py-2 pl-3 font-medium">Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {doc.lines.map((l) => (
                    <tr key={l.id} className="border-b border-navy-50">
                      <td className="py-2.5 pr-3 font-mono text-xs text-navy-500">{l.code || '—'}</td>
                      <td className="py-2.5 px-3 text-navy-900">{l.description}{l.observation && <p className="text-xs text-navy-400 mt-0.5">{l.observation}</p>}</td>
                      <td className="py-2.5 px-3 text-right text-navy-600">{l.quantity}</td>
                      <td className="py-2.5 px-3 text-right text-navy-600 whitespace-nowrap">{formatFCFA(l.unitPrice)}</td>
                      <td className="py-2.5 px-3 text-right text-red-600 whitespace-nowrap">{l.discount ? `-${formatFCFA(l.discount)}` : '—'}</td>
                      <td className="py-2.5 px-3 text-right font-medium text-navy-900 whitespace-nowrap">{formatFCFA(lineNet(l))}</td>
                      <td className="py-2.5 px-3"><Badge color={l.coverage === 'non-couverte' ? 'navy' : l.coverage === 'couverte' ? 'green' : l.coverage === 'partiellement-couverte' ? 'amber' : 'blue'}>{l.coverage === 'couverte' ? 'Couverte' : l.coverage === 'non-couverte' ? 'Non couverte' : l.coverage === 'partiellement-couverte' ? `Partielle ${l.coverageRate}%` : "En attente"}</Badge></td>
                      <td className="py-2.5 px-3 text-right text-turquoise-600 whitespace-nowrap">{formatFCFA(lineAssurance(l))}</td>
                      <td className="py-2.5 px-3 text-right text-navy-600 whitespace-nowrap">{formatFCFA(linePatient(l))}</td>
                      <td className="py-2.5 px-3 text-navy-500 text-xs">{ORIGIN_LABELS[l.origin]}</td>
                      <td className="py-2.5 px-3 text-navy-500 text-xs">{LINE_STATUS_LABELS[l.lineStatus]}</td>
                      {!locked && (
                        <td className="py-2.5 pl-3">
                          <button onClick={() => setEditLineId(l.id)} className="p-1 text-navy-400 hover:text-medical-600 rounded focus:outline-none"><Pencil className="w-3.5 h-3.5" /></button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="md:flex md:justify-end">
            <div className="w-full md:w-80 space-y-2 text-sm">
              <TotalRow label="Montant brut" value={formatFCFA(t.brut)} />
              <TotalRow label="Total des remises" value={`-${formatFCFA(t.remises)}`} />
              <TotalRow label="Montant net" value={formatFCFA(t.net)} strong />
              <TotalRow label="Sous-total part assurance" value={formatFCFA(t.partAssurance)} />
              <TotalRow label="Sous-total part patient" value={formatFCFA(t.partPatient)} />
              <TotalRow label="Montant déjà encaissé" value={formatFCFA(t.encaisse)} />
              <TotalRow label="Reste patient" value={formatFCFA(t.restePatient)} />
              <TotalRow label="Reste assurance" value={formatFCFA(t.resteAssurance)} />
              <TotalRow label="Solde global" value={formatFCFA(t.solde)} strong />
            </div>
          </div>

          {/* Payments */}
          {doc.payments.length > 0 && (
            <div>
              <SectionTitle>Versements</SectionTitle>
              <div className="space-y-2">
                {doc.payments.map((pay) => (
                  <div key={pay.id} className="flex items-center justify-between rounded-lg border border-navy-100 p-3">
                    <div>
                      <p className="text-sm font-medium text-navy-900">{formatFCFA(pay.amount)} — {pay.mode}</p>
                      <p className="text-xs text-navy-500">{pay.date} {pay.time} · {pay.cashier}{pay.reference ? ` · ${pay.reference}` : ''}</p>
                    </div>
                    <Badge color="green">Encaissé</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Insurance tracking */}
          {doc.insuranceTracking && (
            <div>
              <SectionTitle>Suivi de la part assurance</SectionTitle>
              <div className="rounded-lg border border-navy-100 p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div><p className="text-xs text-navy-400">Statut</p><Badge color={INSURANCE_TRACKING_META[doc.insuranceTracking.status].color}>{INSURANCE_TRACKING_META[doc.insuranceTracking.status].label}</Badge></div>
                <div><p className="text-xs text-navy-400">À réclamer</p><p className="font-medium text-navy-800">{formatFCFA(doc.insuranceTracking.amountToClaim)}</p></div>
                <div><p className="text-xs text-navy-400">Transmis</p><p className="font-medium text-navy-800">{formatFCFA(doc.insuranceTracking.amountTransmitted)}</p></div>
                <div><p className="text-xs text-navy-400">Payé</p><p className="font-medium text-navy-800">{formatFCFA(doc.insuranceTracking.amountPaid)}</p></div>
                {doc.insuranceTracking.bordereauNumber && <div><p className="text-xs text-navy-400">Bordereau</p><p className="font-medium text-navy-800 font-mono text-xs">{doc.insuranceTracking.bordereauNumber}</p></div>}
                {doc.insuranceTracking.transmissionDate && <div><p className="text-xs text-navy-400">Transmission</p><p className="font-medium text-navy-800">{doc.insuranceTracking.transmissionDate}</p></div>}
                {doc.insuranceTracking.rejectionReason && <div className="col-span-2"><p className="text-xs text-navy-400">Motif de rejet</p><p className="font-medium text-red-600">{doc.insuranceTracking.rejectionReason}</p></div>}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="border-t border-navy-100 pt-5">
            <SectionTitle>Actions</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {doc.status === 'brouillon' && (
                <Button variant="primary" onClick={validateDoc}><CheckCircle2 className="w-4 h-4 mr-1.5" /> Valider</Button>
              )}
              {doc.type === 'facture' && (doc.status === 'valide' || doc.status === 'en-attente' || doc.status === 'partiellement-paye') && (
                <Button variant="primary" onClick={onPayment}><Wallet className="w-4 h-4 mr-1.5" /> Encaisser</Button>
              )}
              {(doc.type === 'cotation' || doc.type === 'prefacture') && doc.status !== 'annule' && doc.status !== 'transforme' && (
                <>
                  {doc.type === 'cotation' && (
                    <Button variant="secondary" onClick={() => onTransform('prefacture')}><FilePlus2 className="w-4 h-4 mr-1.5" /> Transformer en préfacture</Button>
                  )}
                  <Button variant="primary" onClick={() => onTransform('facture')}><Receipt className="w-4 h-4 mr-1.5" /> Transformer en facture</Button>
                </>
              )}
              <Button variant="secondary" onClick={onPrint}><Printer className="w-4 h-4 mr-1.5" /> Imprimer</Button>
              {doc.type === 'facture' && doc.status !== 'brouillon' && (
                <Button variant="secondary" onClick={() => onToast('Duplicata imprimé — mention DUPLICATA')}><Copy className="w-4 h-4 mr-1.5" /> Duplicata</Button>
              )}
              {doc.type === 'facture' && doc.status !== 'brouillon' && doc.status !== 'annule' && (
                <Button variant="secondary" onClick={() => setShowCreditNote(true)}><RefreshCw className="w-4 h-4 mr-1.5" /> Créer un avoir</Button>
              )}
              {onOpenDossier && doc.type === 'facture' && doc.insurance !== 'Non assurée' && t.partAssurance > 0 && (
                <Button variant="secondary" onClick={() => onOpenDossier(doc.id)}><ShieldCheck className="w-4 h-4 mr-1.5" /> Suivi assurance</Button>
              )}
              {doc.status !== 'annule' && (
                <Button variant="danger" onClick={() => setShowCancel(true)}><Ban className="w-4 h-4 mr-1.5" /> Annuler</Button>
              )}
              {doc.status !== 'annule' && doc.status !== 'valide' && doc.status !== 'paye' && (
                <Button variant="secondary" onClick={onSaveAsTemplate}><Save className="w-4 h-4 mr-1.5" /> Enregistrer comme modèle</Button>
              )}
              <Button variant="ghost" onClick={() => setShowHistory((s) => !s)}><History className="w-4 h-4 mr-1.5" /> {showHistory ? 'Masquer' : 'Consulter'} l'historique</Button>
            </div>
          </div>

          {/* History */}
          {showHistory && (
            <div className="space-y-2">
              {doc.history.map((h, i) => (
                <div key={i} className="flex gap-2">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full bg-medical-500 mt-1" />
                    {i < doc.history.length - 1 && <div className="w-0.5 flex-1 bg-navy-200" />}
                  </div>
                  <div className="pb-2">
                    <p className="text-xs font-medium text-navy-800">{h.action}</p>
                    {h.detail && <p className="text-[11px] text-navy-500">{h.detail}</p>}
                    <p className="text-[10px] text-navy-400">{h.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Validated info */}
          {doc.validatedAt && (
            <p className="text-xs text-navy-400">Validé le {doc.validatedAt} par {doc.validatedBy}</p>
          )}
        </div>
      </Card>

      {/* Validate confirmation */}
      {confirmValidate && (
        <ConfirmModal
          title="Valider définitivement"
          message="La validation verrouille les éléments essentiels du document. Confirmer ?"
          onCancel={() => setConfirmValidate(false)}
          onConfirm={confirmValidateDoc}
        />
      )}

      {/* Cancel */}
      {showCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/40 backdrop-blur-sm">
          <Card className="w-full max-w-sm mx-4">
            <CardHeader title="Annuler le document" />
            <div className="p-5">
              <label className="block text-sm font-medium text-navy-700 mb-1">Motif d'annulation <span className="text-red-500">*</span></label>
              <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg border border-navy-200 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-medical-400 resize-none" />
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="secondary" onClick={() => setShowCancel(false)}>Annuler</Button>
                <Button variant="danger" onClick={cancelDoc}>Confirmer l'annulation</Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Credit note */}
      {showCreditNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/40 backdrop-blur-sm">
          <Card className="w-full max-w-sm mx-4">
            <CardHeader title="Créer un avoir" />
            <div className="p-5">
              <p className="text-sm text-navy-600 mb-3">Montant de l'avoir : <span className="font-semibold text-navy-900">{formatFCFA(t.net)}</span></p>
              <label className="block text-sm font-medium text-navy-700 mb-1">Motif</label>
              <textarea value={creditReason} onChange={(e) => setCreditReason(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg border border-navy-200 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-medical-400 resize-none" />
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="secondary" onClick={() => setShowCreditNote(false)}>Annuler</Button>
                <Button variant="primary" onClick={createCreditNote} disabled={!creditReason.trim()}>Créer l'avoir</Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Payment modal */}
      {showPayment && (
        <PaymentModal
          doc={doc}
          onClose={() => setShowPayment(false)}
          onSave={(payments, status) => {
            onUpdate({ payments, status });
            onHistory('Facture encaissée', `${formatFCFA(payments[payments.length - 1]?.amount ?? 0)}`);
            setShowPayment(false);
            onToast('Encaissement enregistré');
          }}
        />
      )}

      {/* Print modal */}
      {showPrint && (
        <PrintModal doc={doc} onClose={() => setShowPrint(false)} />
      )}

      {/* Transform confirmation */}
      {transformTarget && (
        <ConfirmModal
          title={`Transformer en ${DOC_TYPE_LABELS[transformTarget]}`}
          message={`Un nouveau numéro sera attribué et la date du jour utilisée. La ${DOC_TYPE_LABELS[doc.type].toLowerCase()} d'origine sera conservée dans l'historique.`}
          onCancel={() => setTransformTarget(null)}
          onConfirm={() => onTransformSave(transformTarget)}
        />
      )}

      {/* Line edit (simplified) */}
      {editLineId && (
        <LineEditModal
          line={doc.lines.find((l) => l.id === editLineId)!}
          onClose={() => setEditLineId(null)}
          onSave={(patch) => {
            onUpdate({ lines: doc.lines.map((l) => (l.id === editLineId ? { ...l, ...patch } : l)) });
            onHistory('Prestation modifiée');
            setEditLineId(null);
          }}
        />
      )}
    </div>
  );
}

function TotalRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between py-1.5 ${strong ? 'font-bold text-navy-900 border-t border-navy-100 pt-2' : 'text-navy-600'}`}>
      <span>{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function ConfirmModal({ title, message, onCancel, onConfirm }: { title: string; message: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/40 backdrop-blur-sm">
      <Card className="w-full max-w-sm mx-4">
        <CardHeader title={title} />
        <div className="p-5">
          <p className="text-sm text-navy-600">{message}</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="secondary" onClick={onCancel}>Annuler</Button>
            <Button variant="primary" onClick={onConfirm}>Confirmer</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ── Payment modal ── */
function PaymentModal({ doc, onClose, onSave }: {
  doc: BillingDoc;
  onClose: () => void;
  onSave: (payments: BillingPayment[], status: BillingDocStatus) => void;
}) {
  const t = docTotals(doc);
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<string>('Espèces');
  const [reference, setReference] = useState('');
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  const received = Number(amount) || 0;
  const change = Math.max(0, received - t.restePatient);

  function submit() {
    if (received <= 0) {
      setError('Montant reçu invalide.');
      return;
    }
    const newTotal = t.encaisse + received;
    const status: BillingDocStatus = newTotal >= t.partPatient ? 'paye' : 'partiellement-paye';
    const payment: BillingPayment = {
      id: `pay${Date.now()}`,
      date: today,
      time,
      mode,
      amount: received,
      reference: reference || undefined,
      cashier: 'M. Koné (Caisse)',
      comment: comment || undefined,
    };
    onSave([...doc.payments, payment], status);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/40 backdrop-blur-sm">
      <Card className="w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader title="Encaisser la facture" subtitle={doc.number} action={<button onClick={onClose} className="text-navy-400 hover:text-navy-700"><X className="w-5 h-5" /></button>} />
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-navy-50 p-3"><p className="text-xs text-navy-500">Part patient</p><p className="font-bold text-navy-900">{formatFCFA(t.partPatient)}</p></div>
            <div className="rounded-lg bg-green-50 p-3"><p className="text-xs text-green-600">Déjà payé</p><p className="font-bold text-green-700">{formatFCFA(t.encaisse)}</p></div>
            <div className="rounded-lg bg-amber-50 p-3"><p className="text-xs text-amber-600">Reste à payer</p><p className="font-bold text-amber-700">{formatFCFA(t.restePatient)}</p></div>
            <div className="rounded-lg bg-navy-50 p-3"><p className="text-xs text-navy-500">Monnaie à rendre</p><p className="font-bold text-navy-900">{formatFCFA(change)}</p></div>
          </div>

          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1">Montant reçu</label>
            <input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={String(t.restePatient)} className="w-full px-3 py-2 rounded-lg border border-navy-200 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-medical-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">Mode de paiement</label>
              <select value={mode} onChange={(e) => setMode(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-navy-200 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-medical-400 bg-white">
                {PAYMENT_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">Référence</label>
              <input type="text" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Réf. paiement (optionnel)" className="w-full px-3 py-2 rounded-lg border border-navy-200 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-medical-400" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1">Commentaire</label>
            <input type="text" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Commentaire (optionnel)" className="w-full px-3 py-2 rounded-lg border border-navy-200 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-medical-400" />
          </div>
          <p className="text-xs text-navy-400">Caissier fictif : M. Koné (Caisse) · {today} {time}</p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2 border-t border-navy-100">
            <Button variant="secondary" onClick={onClose}>Annuler</Button>
            <Button variant="primary" onClick={submit}><CheckCircle2 className="w-4 h-4 mr-1.5" /> Valider l'encaissement</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ── Print modal ── */
function PrintModal({ doc, onClose }: { doc: BillingDoc; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/40 backdrop-blur-sm">
      <div className="w-full max-w-3xl mx-4 max-h-[92vh] overflow-y-auto bg-white rounded-xl shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3 border-b border-navy-100 sticky top-0 bg-white z-10">
          <h3 className="font-semibold text-navy-900">Aperçu avant impression</h3>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => window.print()}><Printer className="w-3.5 h-3.5 mr-1" /> Imprimer</Button>
            <button onClick={onClose} className="text-navy-400 hover:text-navy-700"><X className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="p-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <img src="/logo_Homea.png" alt="" className="h-64 w-auto opacity-[0.06]" />
            </div>
            <div className="relative">
              <InvoicePrint doc={doc} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Catalogue modal ── */
function CatalogueModal({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<CatalogueItem[]>(catalogue);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [editItem, setEditItem] = useState<CatalogueItem | null>(null);
  const [showForm, setShowForm] = useState(false);

  const categories = [...new Set(catalogue.map((c) => c.category))];

  const filtered = items.filter((c) => {
    const okCat = catFilter === 'all' || c.category === catFilter;
    const q = search.toLowerCase();
    const okSearch = !q || c.label.toLowerCase().includes(q) || c.code.toLowerCase().includes(q);
    return okCat && okSearch;
  });

  function saveItem(item: CatalogueItem) {
    setItems((prev) => {
      const exists = prev.some((x) => x.id === item.id);
      return exists ? prev.map((x) => (x.id === item.id ? item : x)) : [...prev, item];
    });
    setShowForm(false);
    setEditItem(null);
  }

  function toggleActive(id: string) {
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, active: !x.active } : x)));
  }

  function duplicate(id: string) {
    const src = items.find((x) => x.id === id);
    if (!src) return;
    setItems((prev) => [...prev, { ...src, id: `cat${Date.now()}`, code: `${src.code}-B`, label: `${src.label} (copie)` }]);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/40 backdrop-blur-sm">
      <Card className="w-full max-w-5xl mx-4 max-h-[92vh] overflow-y-auto">
        <CardHeader
          title="Catalogue des prestations et tarifs"
          subtitle="Paramétrage local — données fictives"
          action={<button onClick={onClose} className="text-navy-400 hover:text-navy-700"><X className="w-5 h-5" /></button>}
        />
        <div className="p-5 space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-navy-400" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher par code ou libellé…" className="w-full pl-9 pr-3 py-2 rounded-lg border border-navy-200 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-medical-400" />
            </div>
            <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-navy-200 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-medical-400 bg-white">
              <option value="all">Toutes catégories</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <Button variant="primary" size="sm" onClick={() => { setEditItem(null); setShowForm(true); }}><Plus className="w-3.5 h-3.5 mr-1" /> Ajouter</Button>
            <Button variant="secondary" size="sm" onClick={() => setItems(catalogue)}><Upload className="w-3.5 h-3.5 mr-1" /> Importer l'exemple</Button>
            <Button variant="secondary" size="sm" onClick={() => window.print()}><Download className="w-3.5 h-3.5 mr-1" /> Exporter</Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-100 text-left text-navy-500">
                  <th className="px-3 py-2 font-medium">Code</th>
                  <th className="px-3 py-2 font-medium">Libellé</th>
                  <th className="px-3 py-2 font-medium">Catégorie</th>
                  <th className="px-3 py-2 font-medium">Service</th>
                  <th className="px-3 py-2 font-medium">Unité</th>
                  <th className="px-3 py-2 font-medium text-right">Tarif standard</th>
                  <th className="px-3 py-2 font-medium text-right">Tarif assuré</th>
                  <th className="px-3 py-2 font-medium text-right">Tarif conventionné</th>
                  <th className="px-3 py-2 font-medium text-right">Taux proposé</th>
                  <th className="px-3 py-2 font-medium">Statut</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b border-navy-50 hover:bg-navy-50/50">
                    <td className="px-3 py-2 font-mono text-xs text-medical-700">{c.code}</td>
                    <td className="px-3 py-2 font-medium text-navy-900">{c.label}</td>
                    <td className="px-3 py-2 text-navy-500">{c.category}</td>
                    <td className="px-3 py-2 text-navy-500">{c.service}</td>
                    <td className="px-3 py-2 text-navy-500">{c.unit}</td>
                    <td className="px-3 py-2 text-right text-navy-600 whitespace-nowrap">{formatFCFA(c.standardPrice)}</td>
                    <td className="px-3 py-2 text-right text-navy-600 whitespace-nowrap">{formatFCFA(c.insuredPrice)}</td>
                    <td className="px-3 py-2 text-right text-navy-600 whitespace-nowrap">{formatFCFA(c.contractedPrice)}</td>
                    <td className="px-3 py-2 text-right text-navy-600">{c.proposedRate}%</td>
                    <td className="px-3 py-2">
                      <Badge color={c.active ? 'green' : 'navy'}>{c.active ? 'Actif' : 'Inactif'}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <button onClick={() => { setEditItem(c); setShowForm(true); }} className="p-1 text-navy-400 hover:text-medical-600 rounded"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => duplicate(c.id)} className="p-1 text-navy-400 hover:text-medical-600 rounded"><Copy className="w-3.5 h-3.5" /></button>
                        <button onClick={() => toggleActive(c.id)} className="p-1 text-navy-400 hover:text-amber-600 rounded"><Ban className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {showForm && <CatalogueForm item={editItem} onClose={() => setShowForm(false)} onSave={saveItem} />}
    </div>
  );
}

function CatalogueForm({ item, onClose, onSave }: { item: CatalogueItem | null; onClose: () => void; onSave: (i: CatalogueItem) => void }) {
  const [code, setCode] = useState(item?.code ?? '');
  const [label, setLabel] = useState(item?.label ?? '');
  const [category, setCategory] = useState(item?.category ?? 'Consultation');
  const [service, setService] = useState(item?.service ?? '');
  const [unit, setUnit] = useState(item?.unit ?? 'Acte');
  const [standardPrice, setStandardPrice] = useState(item?.standardPrice ?? 0);
  const [insuredPrice, setInsuredPrice] = useState(item?.insuredPrice ?? 0);
  const [contractedPrice, setContractedPrice] = useState(item?.contractedPrice ?? 0);
  const [proposedRate, setProposedRate] = useState(item?.proposedRate ?? 80);
  const [active, setActive] = useState(item?.active ?? true);
  const [usuallyCovered, setUsuallyCovered] = useState(item?.usuallyCovered ?? true);

  function submit() {
    onSave({
      id: item?.id ?? `cat${Date.now()}`,
      code: code || 'CS-XXX',
      label: label || 'Nouvelle prestation',
      category,
      service: service || '—',
      unit: unit || 'Acte',
      standardPrice: Number(standardPrice) || 0,
      insuredPrice: Number(insuredPrice) || 0,
      contractedPrice: Number(contractedPrice) || 0,
      active,
      usuallyCovered,
      proposedRate: Number(proposedRate) || 0,
      validFrom: item?.validFrom ?? today,
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-navy-950/50">
      <Card className="w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader title={item ? 'Modifier la prestation' : 'Nouvelle prestation'} action={<button onClick={onClose} className="text-navy-400 hover:text-navy-700"><X className="w-5 h-5" /></button>} />
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <CField label="Code" value={code} onChange={setCode} />
            <CField label="Unité" value={unit} onChange={setUnit} />
          </div>
          <CField label="Libellé" value={label} onChange={setLabel} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">Catégorie</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-navy-200 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-medical-400 bg-white">
                {[...new Set(catalogue.map((c) => c.category))].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <CField label="Service" value={service} onChange={setService} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <CField label="Tarif standard" value={String(standardPrice)} onChange={(v) => setStandardPrice(Number(v) || 0)} type="number" />
            <CField label="Tarif assuré" value={String(insuredPrice)} onChange={(v) => setInsuredPrice(Number(v) || 0)} type="number" />
            <CField label="Tarif conventionné" value={String(contractedPrice)} onChange={(v) => setContractedPrice(Number(v) || 0)} type="number" />
          </div>
          <CField label="Taux de couverture proposé (%)" value={String(proposedRate)} onChange={(v) => setProposedRate(Number(v) || 0)} type="number" />
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-navy-700">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="rounded" /> Actif
            </label>
            <label className="flex items-center gap-2 text-sm text-navy-700">
              <input type="checkbox" checked={usuallyCovered} onChange={(e) => setUsuallyCovered(e.target.checked)} className="rounded" /> Habituellement couverte
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-navy-100">
            <Button variant="secondary" onClick={onClose}>Annuler</Button>
            <Button variant="primary" onClick={submit}><CheckCircle2 className="w-4 h-4 mr-1.5" /> Enregistrer</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function CField({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-navy-700 mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-navy-200 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-medical-400" />
    </div>
  );
}

/* ── Line edit modal ── */
function LineEditModal({ line, onClose, onSave }: { line: BillingLine; onClose: () => void; onSave: (patch: Partial<BillingLine>) => void }) {
  const [quantity, setQuantity] = useState(line.quantity);
  const [unitPrice, setUnitPrice] = useState(line.unitPrice);
  const [discount, setDiscount] = useState(line.discount);
  const [coverageRate, setCoverageRate] = useState(line.coverageRate);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-navy-950/50">
      <Card className="w-full max-w-sm mx-4">
        <CardHeader title="Modifier la ligne" action={<button onClick={onClose} className="text-navy-400 hover:text-navy-700"><X className="w-5 h-5" /></button>} />
        <div className="p-5 space-y-3">
          <p className="text-sm font-medium text-navy-900">{line.description}</p>
          <div className="grid grid-cols-2 gap-3">
            <CField label="Quantité" value={String(quantity)} onChange={(v) => setQuantity(Number(v) || 0)} type="number" />
            <CField label="Prix unitaire" value={String(unitPrice)} onChange={(v) => setUnitPrice(Number(v) || 0)} type="number" />
            <CField label="Remise" value={String(discount)} onChange={(v) => setDiscount(Number(v) || 0)} type="number" />
            <CField label="Taux assurance %" value={String(coverageRate)} onChange={(v) => setCoverageRate(Math.min(100, Math.max(0, Number(v) || 0)))} type="number" />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-navy-100">
            <Button variant="secondary" onClick={onClose}>Annuler</Button>
            <Button variant="primary" onClick={() => onSave({ quantity, unitPrice, discount, coverageRate })}>Enregistrer</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* DocTypeChooser is now imported from @/components/BillingTemplates */

