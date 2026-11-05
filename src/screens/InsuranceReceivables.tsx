import { useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  Eye,
  FileSpreadsheet,
  Filter,
  Landmark,
  Paperclip,
  Printer,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { Card, CardHeader, Badge, Button, EmptyState, Input, Select, TextArea } from '@/components/ui';
import { PrintPreview } from '@/components/PrintPreview';
import type { BillingDoc } from '@/data/billingDocs';
import { docTotals, today } from '@/data/billingDocs';
import { patients } from '@/data/patients';
import { formatDateShort, formatFCFA } from '@/utils/format';

type Tab = 'overview' | 'detail' | 'rejections' | 'annual';
type GroupBy = 'manager' | 'company';
type PaymentStatus = 'pending' | 'confirmed' | 'cancelled' | 'rejected';
type RejectionStatus = 'a-traiter' | 'conteste' | 'retransmis' | 'resolu';

interface PaymentAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: string;
}

interface InsurancePayment {
  id: string;
  manager: string;
  receivedDate: string;
  amount: number;
  mode: string;
  bank: string;
  reference: string;
  status: PaymentStatus;
  confirmedDate?: string;
  comment: string;
  allocations: { docId: string; amount: number }[];
  attachments: PaymentAttachment[];
}

interface ClaimRejection {
  id: string;
  docId: string;
  date: string;
  amount: number;
  reason: string;
  comment: string;
  action: string;
  owner: string;
  dueDate: string;
  status: RejectionStatus;
  resolution?: string;
}

interface Reminder {
  id: string;
  docId: string;
  date: string;
  channel: string;
  contact: string;
  comment: string;
  nextAction: string;
  nextDate: string;
}

const managers: Record<string, string> = {
  CNAM: 'Gestionnaire CNAM',
  NSIA: 'Gestionnaire NSIA',
  ASKIA: 'Gestionnaire ASKIA',
};

const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const monthLabels = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

const initialPayments: InsurancePayment[] = [
  {
    id: 'pay-ins-1', manager: managers.CNAM, receivedDate: '2026-09-26', amount: 10000, mode: 'Virement', bank: 'BICICI',
    reference: 'VIR-CNAM-0926', status: 'confirmed', confirmedDate: '2026-09-27', comment: 'Règlement partiel du bordereau BORD-2026-077', allocations: [{ docId: 'doc2', amount: 10000 }], attachments: [],
  },
];

function money(value: number): string {
  return formatFCFA(Math.max(0, Math.round(value)));
}

function isInvoice(doc: BillingDoc): boolean {
  return doc.type === 'facture' && doc.insurance !== 'Non assurée' && doc.status !== 'annule' && doc.status !== 'brouillon' && doc.status !== 'transforme';
}

function category(doc: BillingDoc): 'Hospitalisations' | 'Soins externes' {
  return doc.lines.some((line) => line.category === 'Hospitalisation' || line.origin === 'hospitalisation') ? 'Hospitalisations' : 'Soins externes';
}

function managerFor(doc: BillingDoc): string {
  return managers[doc.insurance] ?? `Gestionnaire ${doc.insurance}`;
}

function rejectionLabel(status: RejectionStatus): string {
  return { 'a-traiter': 'À traiter', conteste: 'Contesté', retransmis: 'Retransmis', resolu: 'Résolu' }[status];
}

function statusColor(status: PaymentStatus | RejectionStatus): 'navy' | 'green' | 'red' | 'amber' | 'blue' | 'turquoise' {
  if (status === 'confirmed' || status === 'resolu') return 'green';
  if (status === 'cancelled' || status === 'rejected') return 'red';
  if (status === 'conteste' || status === 'a-traiter' || status === 'pending') return 'amber';
  return 'blue';
}

export default function InsuranceReceivables({ docs, setDocs, onOpenDossier, onOpenBilling }: { docs: BillingDoc[]; setDocs: Dispatch<SetStateAction<BillingDoc[]>>; onOpenDossier?: (docId: string) => void; onOpenBilling?: (docId: string) => void }) {
  const [tab, setTab] = useState<Tab>('overview');
  const [groupBy, setGroupBy] = useState<GroupBy>('manager');
  const [month, setMonth] = useState('09');
  const [year, setYear] = useState('2026');
  const [startDate, setStartDate] = useState('2026-09-01');
  const [endDate, setEndDate] = useState('2026-09-30');
  const [asOfDate, setAsOfDate] = useState('2026-09-30');
  const [periodMode, setPeriodMode] = useState<'month' | 'custom'>('month');
  const [managerFilter, setManagerFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [patientQuery, setPatientQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [rejectedOnly, setRejectedOnly] = useState(false);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [payments, setPayments] = useState<InsurancePayment[]>(initialPayments);
  const [rejections, setRejections] = useState<ClaimRejection[]>([
    { id: 'rej-1', docId: 'doc8', date: '2026-09-15', amount: 21000, reason: 'Numéro d’assuré incomplet', comment: 'Dossier retourné par l’organisme', action: 'Compléter le numéro puis retransmettre', owner: 'Mme Traoré', dueDate: '2026-09-25', status: 'a-traiter' },
  ]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showRejectionForm, setShowRejectionForm] = useState(false);
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [settleItem, setSettleItem] = useState<ClaimItem | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const period = useMemo(() => periodMode === 'month' ? { start: `${year}-${month}-01`, end: `${year}-${month}-31` } : { start: startDate, end: endDate }, [periodMode, year, month, startDate, endDate]);
  const invoices = useMemo(() => docs.filter(isInvoice).map((doc) => {
    const base = makeItem(doc);
    const totals = base.totals;
    const patient = base.patient;
    const adjustment = 0;
    const netDue = Math.max(0, totals.partAssurance - adjustment);
    const recordedPayments = payments.filter((payment) => payment.status === 'confirmed' && (payment.confirmedDate ?? payment.receivedDate) <= asOfDate);
    const paymentAllocations = recordedPayments.flatMap((payment) => payment.allocations.filter((allocation) => allocation.docId === doc.id));
    const paid = paymentAllocations.length > 0 ? paymentAllocations.reduce((sum, allocation) => sum + allocation.amount, 0) : (doc.insuranceTracking?.amountPaid ?? 0);
    const recordedRejections = rejections.filter((r) => r.docId === doc.id);
    const rejection = recordedRejections.length > 0 ? recordedRejections.filter((r) => r.status !== 'resolu').reduce((sum, r) => sum + r.amount, 0) : (doc.insuranceTracking?.amountRejected ?? 0);
    const dueDate = doc.insuranceTracking?.transmissionDate ? addDays(doc.insuranceTracking.transmissionDate, 30) : '';
    const overdue = dueDate !== '' && dueDate < asOfDate && netDue - paid > 0;
    return { doc, totals, patient, manager: managerFor(doc), company: doc.insurance, category: category(doc), adjustment, netDue, paid, rejection, remaining: Math.max(0, netDue - paid), dueDate, overdue };
  }), [docs, payments, rejections, asOfDate]);

  const filteredInvoices = useMemo(() => invoices.filter((item) => {
    const inPeriod = item.doc.date >= period.start && item.doc.date <= period.end;
    const patientText = item.patient ? `${item.patient.firstName} ${item.patient.lastName} ${item.patient.code} ${item.doc.insuranceNumber}`.toLowerCase() : item.doc.patientId;
    const paymentState = item.remaining <= 0 ? 'soldé' : item.paid > 0 ? 'partiel' : 'non-regle';
    return inPeriod
      && (managerFilter === 'all' || item.manager === managerFilter)
      && (companyFilter === 'all' || item.company === companyFilter)
      && (categoryFilter === 'all' || item.category === categoryFilter)
      && (paymentFilter === 'all' || paymentState === paymentFilter)
      && (!patientQuery.trim() || patientText.includes(patientQuery.toLowerCase().trim()))
      && (!rejectedOnly || item.rejection > 0)
      && (!overdueOnly || item.overdue);
  }), [invoices, period, managerFilter, companyFilter, categoryFilter, paymentFilter, patientQuery, rejectedOnly, overdueOnly]);

  const globalOpen = invoices.filter((item) => item.remaining > 0);
  const confirmedAllocated = (items: typeof invoices) => items.reduce((sum, item) => sum + item.paid, 0);
  const kpis = {
    periodDue: filteredInvoices.reduce((sum, item) => sum + item.netDue, 0),
    confirmed: confirmedAllocated(filteredInvoices),
    open: globalOpen.reduce((sum, item) => sum + item.remaining, 0),
    rejected: globalOpen.reduce((sum, item) => sum + item.rejection, 0),
    overdue: globalOpen.filter((item) => item.overdue).reduce((sum, item) => sum + item.remaining, 0),
    unapplied: payments.filter((payment) => payment.status === 'confirmed').reduce((sum, payment) => sum + unapplied(payment), 0),
  };
  const recoveryRate = kpis.periodDue > 0 ? Math.round((kpis.confirmed / kpis.periodDue) * 100) : 0;
  const managersList = [...new Set(invoices.map((item) => item.manager))];
  const companies = [...new Set(invoices.map((item) => item.company))];

  function notify(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 4000);
  }

  function updateInsurance(docId: string, patch: Partial<NonNullable<BillingDoc['insuranceTracking']>>, historyAction: string) {
    setDocs((current) => current.map((doc) => doc.id === docId && doc.insuranceTracking ? {
      ...doc,
      insuranceTracking: { ...doc.insuranceTracking, ...patch },
      history: [...doc.history, { timestamp: `${today} 09:00`, action: historyAction }],
    } : doc));
  }

  function exportCsv(items: typeof invoices, filename: string) {
    const rows = [
      ['Période', `${period.start} au ${period.end}`], ['Date d’arrêté', asOfDate], ['Base', 'Date de facture'], ['Devise', 'FCFA'], [],
      ['Date', 'Facture', 'Organisme gestionnaire', 'Compagnie', 'Patient', 'Matricule assurance', 'Catégorie', 'Part assurance', 'Réglé affecté', 'Rejets en cours', 'Solde'],
      ...items.map((item) => [item.doc.date, item.doc.number, item.manager, item.company, item.patient ? `${item.patient.firstName} ${item.patient.lastName}` : 'Sans détail patient', item.doc.insuranceNumber, item.category, String(item.netDue), String(item.paid), String(item.rejection), String(item.remaining)]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Vue d’ensemble' }, { id: 'detail', label: 'Détail des créances' }, { id: 'rejections', label: 'Rejets et relances' }, { id: 'annual', label: 'Récapitulatif annuel' },
  ];

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2"><Landmark className="w-6 h-6 text-medical-600" /><h2 className="text-xl font-bold text-navy-900">Créances assurances</h2></div>
          <p className="mt-1 text-sm text-navy-500">Suivi des factures validées, règlements affectés et soldes à recouvrer.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => exportCsv(filteredInvoices, 'creances-assurances-detail.csv')}><FileSpreadsheet className="mr-1.5 h-4 w-4" /> Export Excel</Button>
          <Button variant="secondary" onClick={() => setShowPrint(true)}><Printer className="mr-1.5 h-4 w-4" /> Imprimer</Button>
        </div>
      </div>

      {notice && <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"><CheckCircle2 className="h-4 w-4" /> {notice}</div>}

      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-navy-900"><Filter className="h-4 w-4 text-medical-600" /> Filtres communs <span className="font-normal text-navy-400">— période basée sur la date de facture</span></div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Select label="Période" value={periodMode} onChange={(value) => setPeriodMode(value as 'month' | 'custom')} options={[{ value: 'month', label: 'Mois et année' }, { value: 'custom', label: 'Période personnalisée' }]} />
          {periodMode === 'month' ? <div className="grid grid-cols-2 gap-2"><Select label="Mois" value={month} onChange={setMonth} options={months.map((value, index) => ({ value, label: monthLabels[index] }))} /><Input label="Année" value={year} onChange={setYear} /></div> : <div className="grid grid-cols-2 gap-2"><Input label="Du" type="date" value={startDate} onChange={setStartDate} /><Input label="Au" type="date" value={endDate} onChange={setEndDate} /></div>}
          <Input label="Date d’arrêté" type="date" value={asOfDate} onChange={setAsOfDate} />
          <Select label="Regrouper par" value={groupBy} onChange={(value) => setGroupBy(value as GroupBy)} options={[{ value: 'manager', label: 'Organisme gestionnaire' }, { value: 'company', label: 'Compagnie d’assurance' }]} />
          <Select label="Organisme gestionnaire" value={managerFilter} onChange={setManagerFilter} options={[{ value: 'all', label: 'Tous les organismes' }, ...managersList.map((value) => ({ value, label: value }))]} />
          <Select label="Compagnie d’assurance" value={companyFilter} onChange={setCompanyFilter} options={[{ value: 'all', label: 'Toutes les compagnies' }, ...companies.map((value) => ({ value, label: value }))]} />
          <Input label="Patient, identifiant ou matricule" value={patientQuery} onChange={setPatientQuery} placeholder="Rechercher…" />
          <Select label="Catégorie" value={categoryFilter} onChange={setCategoryFilter} options={[{ value: 'all', label: 'Toutes' }, { value: 'Hospitalisations', label: 'Hospitalisations' }, { value: 'Soins externes', label: 'Soins externes' }]} />
          <Select label="État du règlement" value={paymentFilter} onChange={setPaymentFilter} options={[{ value: 'all', label: 'Tous les états' }, { value: 'non-regle', label: 'Non réglé' }, { value: 'partiel', label: 'Partiellement réglé' }, { value: 'soldé', label: 'Soldé' }]} />
          <div className="flex items-end gap-2 pb-1"><label className="flex items-center gap-2 text-sm text-navy-700"><input type="checkbox" checked={rejectedOnly} onChange={(event) => setRejectedOnly(event.target.checked)} /> Avec rejet</label><label className="flex items-center gap-2 text-sm text-navy-700"><input type="checkbox" checked={overdueOnly} onChange={(event) => setOverdueOnly(event.target.checked)} /> Échues</label></div>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2 border-b border-navy-100 pb-2">{tabs.map((item) => <button key={item.id} onClick={() => setTab(item.id)} className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${tab === item.id ? 'bg-medical-600 text-white' : 'text-navy-600 hover:bg-navy-50'}`}>{item.label}</button>)}</div>

      {tab === 'overview' && <Overview invoices={filteredInvoices} globalOpen={globalOpen} kpis={kpis} recoveryRate={recoveryRate} groupBy={groupBy} expandedGroups={expandedGroups} setExpandedGroups={setExpandedGroups} onOpenBilling={onOpenBilling} onSettle={setSettleItem} />}
      {tab === 'detail' && <DetailTable items={filteredInvoices} selectedId={selectedId} onSelect={setSelectedId} onExport={() => exportCsv(filteredInvoices, 'creances-assurances-detail.csv')} onOpenDossier={onOpenDossier} onSettle={setSettleItem} />}
      {tab === 'rejections' && <RejectionsTab invoices={invoices} rejections={rejections} reminders={reminders} onAddRejection={() => setShowRejectionForm(true)} onAddReminder={() => setShowReminderForm(true)} onUpdateRejection={(id, patch) => setRejections((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item))} />}
      {tab === 'annual' && <AnnualTab invoices={invoices} payments={payments} year={year} />}

      {showRejectionForm && <RejectionForm invoices={invoices} onClose={() => setShowRejectionForm(false)} onSave={(rejection) => { setRejections((current) => [rejection, ...current]); setShowRejectionForm(false); notify('Rejet enregistré sans diminuer la créance.'); }} />}
      {showReminderForm && <ReminderForm invoices={invoices} onClose={() => setShowReminderForm(false)} onSave={(reminder) => { setReminders((current) => [reminder, ...current]); setShowReminderForm(false); notify('Relance enregistrée. Aucun message n’a été envoyé.'); }} />}
      {showPrint && <PrintPreview title="Récapitulatif des créances assurances" onClose={() => setShowPrint(false)}><PrintSummary invoices={filteredInvoices} period={period} asOfDate={asOfDate} /></PrintPreview>}
      {settleItem && <SettlementModal item={settleItem} onClose={() => setSettleItem(null)} onSave={(payment, amount) => {
        setPayments((current) => [payment, ...current]);
        const paid = settleItem.paid + amount;
        updateInsurance(settleItem.doc.id, { amountPaid: paid, status: paid >= settleItem.netDue ? 'reglee' : 'en-traitement', settlementDate: payment.confirmedDate ?? payment.receivedDate }, 'Règlement assurance encaissé (assurant)');
        setSettleItem(null);
        notify(`Règlement de ${money(amount)} enregistré sur ${settleItem.doc.number}.`);
      }} />}
    </div>
  );
}

function addDays(date: string, days: number): string { const result = new Date(`${date}T12:00:00`); result.setDate(result.getDate() + days); return result.toISOString().slice(0, 10); }
function unapplied(payment: InsurancePayment): number { return payment.amount - payment.allocations.reduce((sum, allocation) => sum + allocation.amount, 0); }
function stateFor(item: { remaining: number; paid: number }): string { return item.remaining <= 0 ? 'Soldé' : item.paid > 0 ? 'Partiellement réglé' : 'Non réglé'; }

function Kpi({ label, value, tone = 'navy', hint }: { label: string; value: string; tone?: 'navy' | 'green' | 'amber' | 'red' | 'blue'; hint?: string }) {
  return <Card className="p-4"><p className="text-xs font-medium text-navy-500">{label}</p><p className={`mt-1 text-xl font-bold ${tone === 'green' ? 'text-green-700' : tone === 'amber' ? 'text-amber-700' : tone === 'red' ? 'text-red-700' : tone === 'blue' ? 'text-medical-700' : 'text-navy-900'}`}>{value}</p>{hint && <p className="mt-1 text-xs text-navy-400">{hint}</p>}</Card>;
}

function Overview({ invoices, globalOpen, kpis, recoveryRate, groupBy, expandedGroups, setExpandedGroups, onOpenBilling, onSettle }: { invoices: ReturnType<typeof makeItem>[]; globalOpen: ReturnType<typeof makeItem>[]; kpis: { periodDue: number; confirmed: number; open: number; rejected: number; overdue: number; unapplied: number }; recoveryRate: number; groupBy: GroupBy; expandedGroups: string[]; setExpandedGroups: Dispatch<SetStateAction<string[]>>; onOpenBilling?: (docId: string) => void; onSettle: (item: ClaimItem) => void }) {
  const groups = [...new Set(invoices.map((item) => groupBy === 'manager' ? item.manager : item.company))];
  const toggle = (group: string) => setExpandedGroups((current) => current.includes(group) ? current.filter((item) => item !== group) : [...current, group]);
  return <div className="space-y-4">
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-6"><Kpi label="Net dû — factures période" value={money(kpis.periodDue)} tone="blue" /><Kpi label="Règlements affectés" value={money(kpis.confirmed)} tone="green" /><Kpi label="Solde global ouvert" value={money(kpis.open)} tone="amber" hint="Toutes périodes" /><Kpi label="Dont rejets en cours" value={money(kpis.rejected)} tone="red" /><Kpi label="Créances échues" value={money(kpis.overdue)} tone="red" /><Kpi label="Versements non affectés" value={money(kpis.unapplied)} tone="navy" /></div>
    <Card><CardHeader title="Récapitulatif par assurance" subtitle={`${invoices.length} facture(s) dans la période · situation arrêtée au périmètre choisi`} action={<Badge color="green">Taux de recouvrement : {recoveryRate}%</Badge>} /><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-navy-100 text-left text-navy-500"><th className="px-5 py-3">{groupBy === 'manager' ? 'Organisme gestionnaire' : 'Compagnie'}</th><th className="px-3 py-3 text-right">Patients</th><th className="px-3 py-3 text-right">Factures</th><th className="px-3 py-3 text-right">Net dû</th><th className="px-3 py-3 text-right">Réglé affecté</th><th className="px-3 py-3 text-right">Solde</th><th className="px-3 py-3">Enregistrer règlement</th><th className="px-5 py-3 text-right">Rejets</th></tr></thead><tbody>{groups.map((group) => { const rows = invoices.filter((item) => (groupBy === 'manager' ? item.manager : item.company) === group); const patientsCount = new Set(rows.map((item) => item.doc.patientId)).size; const due = rows.reduce((sum, item) => sum + item.netDue, 0); const paid = rows.reduce((sum, item) => sum + item.paid, 0); const rejected = rows.reduce((sum, item) => sum + item.rejection, 0); return <><tr key={group} className="border-b border-navy-50 hover:bg-navy-50/60"><td className="px-5 py-3"><button onClick={() => toggle(group)} className="flex items-center gap-2 font-semibold text-navy-900">{expandedGroups.includes(group) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}{group}</button></td><td className="px-3 py-3 text-right">{patientsCount}</td><td className="px-3 py-3 text-right">{rows.length}</td><td className="px-3 py-3 text-right font-medium">{money(due)}</td><td className="px-3 py-3 text-right text-green-700">{money(paid)}</td><td className="px-3 py-3 text-right font-semibold text-amber-700">{money(Math.max(0, due - paid))}</td><td className="px-5 py-3 text-right text-red-700">{money(rejected)}</td></tr>{expandedGroups.includes(group) && rows.map((item) => <tr key={item.doc.id} className="border-b border-navy-50 bg-navy-50/30"><td className="py-2 pl-12"><button onClick={() => onOpenBilling?.(item.doc.id)} className="text-left text-medical-700 hover:underline">{item.patient ? `${item.patient.firstName} ${item.patient.lastName}` : 'Patient non détaillé'} <span className="text-xs text-navy-400">· {item.doc.number}</span></button></td><td colSpan={2} className="px-3 py-2 text-navy-500">{item.category}</td><td className="px-3 py-2 text-right">{money(item.netDue)}</td><td className="px-3 py-2 text-right">{money(item.paid)}</td><td className="px-3 py-2 text-right">{money(item.remaining)}</td><td className="px-3 py-2">{item.remaining > 0 ? <Button size="sm" variant="secondary" onClick={() => onSettle(item)}><ShieldCheck className="mr-1 h-3.5 w-3.5" /> Règlement</Button> : <Badge color="green">Soldée</Badge>}</td><td className="px-5 py-2 text-right">{money(item.rejection)}</td></tr>)}</>; })}</tbody><tfoot><tr className="border-t-2 border-navy-200 font-bold"><td className="px-5 py-3">Total général</td><td className="px-3 py-3 text-right">{new Set(invoices.map((item) => item.doc.patientId)).size}</td><td className="px-3 py-3 text-right">{invoices.length}</td><td className="px-3 py-3 text-right">{money(invoices.reduce((sum, item) => sum + item.netDue, 0))}</td><td className="px-3 py-3 text-right text-green-700">{money(invoices.reduce((sum, item) => sum + item.paid, 0))}</td><td className="px-3 py-3 text-right text-amber-700">{money(invoices.reduce((sum, item) => sum + item.remaining, 0))}</td><td className="px-5 py-3 text-right text-red-700">{money(invoices.reduce((sum, item) => sum + item.rejection, 0))}</td></tr></tfoot></table></div></Card>
    <Card className="p-4"><p className="mb-2 text-sm font-semibold text-navy-900">Balance âgée — situation globale</p><div className="grid grid-cols-2 gap-2 md:grid-cols-5">{ageBuckets(globalOpen, asOfDateFor(invoices)).map((bucket) => <div key={bucket.label} className="rounded-lg bg-navy-50 p-3"><p className="text-xs text-navy-500">{bucket.label}</p><p className="mt-1 font-semibold text-navy-900">{money(bucket.amount)}</p><p className="text-xs text-navy-400">{bucket.count} facture(s)</p></div>)}</div></Card>
  </div>;
}

function asOfDateFor(items: ReturnType<typeof makeItem>[]): string { return items.length ? items[0].doc.insuranceTracking?.transmissionDate ?? today : today; }
function ageBuckets(items: ReturnType<typeof makeItem>[], asOf: string) { const buckets = [{ label: 'Non échu', amount: 0, count: 0 }, { label: '1–30 jours', amount: 0, count: 0 }, { label: '31–60 jours', amount: 0, count: 0 }, { label: '61–90 jours', amount: 0, count: 0 }, { label: '> 90 jours', amount: 0, count: 0 }]; items.forEach((item) => { if (!item.dueDate || item.dueDate >= asOf) { buckets[0].amount += item.remaining; buckets[0].count++; return; } const days = Math.floor((new Date(`${asOf}T12:00:00`).getTime() - new Date(`${item.dueDate}T12:00:00`).getTime()) / 86400000); const index = days <= 30 ? 1 : days <= 60 ? 2 : days <= 90 ? 3 : 4; buckets[index].amount += item.remaining; buckets[index].count++; }); return buckets; }

function DetailTable({ items, selectedId, onSelect, onExport, onOpenDossier, onSettle }: { items: ReturnType<typeof makeItem>[]; selectedId: string | null; onSelect: (id: string | null) => void; onExport: () => void; onOpenDossier?: (docId: string) => void; onSettle: (item: ClaimItem) => void }) {
  return <Card><CardHeader title="Détail des créances" subtitle={`${items.length} facture(s) · colonnes complémentaires dans le détail`} action={<Button size="sm" variant="secondary" onClick={onExport}><Download className="mr-1 h-3.5 w-3.5" /> Exporter</Button>} />{items.length === 0 ? <EmptyState icon={Search} title="Aucune créance" subtitle="Ajustez les filtres de la période." /> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-navy-100 text-left text-navy-500"><th className="px-4 py-3">Facture / patient</th><th className="px-3 py-3">Enregistrer règlement</th><th className="px-3 py-3">Organisme / compagnie</th><th className="px-3 py-3">Catégorie</th><th className="px-3 py-3 text-right">Part assurance</th><th className="px-3 py-3 text-right">Réglé</th><th className="px-3 py-3 text-right">Solde</th><th className="px-3 py-3">Paiement</th><th className="px-4 py-3">Rejet</th></tr></thead><tbody>{items.map((item) => <><tr key={item.doc.id} className={`border-b border-navy-50 hover:bg-navy-50/60 ${selectedId === item.doc.id ? 'bg-medical-50' : ''}`}><td className="px-4 py-3"><button onClick={() => onSelect(selectedId === item.doc.id ? null : item.doc.id)} className="text-left"><p className="font-semibold text-medical-700">{item.doc.number}</p><p className="text-xs text-navy-700">{item.patient ? `${item.patient.firstName} ${item.patient.lastName}` : 'Sans détail patient'}</p><p className="text-xs text-navy-400">{item.doc.patientId} · {item.doc.insuranceNumber || 'Matricule absent'}</p></button></td><td className="px-3 py-3">{item.remaining > 0 ? <Button size="sm" variant="secondary" onClick={() => onSettle(item)}><ShieldCheck className="mr-1 h-3.5 w-3.5" /> Règlement</Button> : <Badge color="green">Soldée</Badge>}</td><td className="px-3 py-3"><p className="text-navy-800">{item.manager}</p><p className="text-xs text-navy-500">{item.company}</p></td><td className="px-3 py-3 text-navy-600">{item.category}</td><td className="px-3 py-3 text-right font-medium">{money(item.netDue)}</td><td className="px-3 py-3 text-right text-green-700">{money(item.paid)}</td><td className="px-3 py-3 text-right font-semibold text-amber-700">{money(item.remaining)}</td><td className="px-3 py-3"><Badge color={item.remaining <= 0 ? 'green' : item.paid > 0 ? 'amber' : 'navy'}>{stateFor(item)}</Badge></td><td className="px-4 py-3">{item.rejection > 0 ? <Badge color="red">{money(item.rejection)}</Badge> : <span className="text-navy-400">Aucun</span>}{onOpenDossier && <div className="mt-1.5"><button onClick={() => onOpenDossier(item.doc.id)} className="inline-flex items-center gap-1 rounded-md bg-medical-50 px-2 py-1 text-[11px] font-medium text-medical-700 hover:bg-medical-100"><Landmark className="h-3 w-3" /> Suivi facture</button></div>}</td></tr>{selectedId === item.doc.id && <tr key={`${item.doc.id}-detail`}><td colSpan={9} className="bg-navy-50 px-5 py-4"><ClaimDetail item={item} /></td></tr>}</>)}</tbody></table></div>}</Card>;
}

function SettlementModal({ item, onClose, onSave }: { item: ClaimItem; onClose: () => void; onSave: (payment: InsurancePayment, amount: number) => void }) {
  const [amount, setAmount] = useState('0');
  const [receivedDate, setReceivedDate] = useState(today);
  const [mode, setMode] = useState('Virement');
  const [bank, setBank] = useState('');
  const [reference, setReference] = useState('');
  const [comment, setComment] = useState('');
  const [attachments, setAttachments] = useState<PaymentAttachment[]>([]);
  const [error, setError] = useState('');
  const value = Number(amount) || 0;

  function save() {
    if (value <= 0) return setError('Saisissez un montant supérieur à zéro.');
    if (value > item.remaining) return setError(`Le montant dépasse le solde dû par l’assurant (${money(item.remaining)}).`);
    onSave({
      id: `ins-pay-${Date.now()}`,
      manager: item.manager,
      receivedDate,
      amount: value,
      mode,
      bank,
      reference,
      status: 'confirmed',
      confirmedDate: receivedDate,
      comment: comment || `Règlement enregistré depuis le détail des créances — ${item.doc.number}`,
      allocations: [{ docId: item.doc.id, amount: value }],
      attachments,
    }, value);
  }

  return <Modal title={`Règlement de l’assurant — ${item.doc.number}`} onClose={onClose}>
    <div className="mb-3 rounded-lg bg-navy-50 p-3 text-sm">
      <p>{item.patient ? `${item.patient.firstName} ${item.patient.lastName}` : 'Patient non détaillé'} · {item.manager} ({item.company})</p>
      <p>Part assurance : <strong>{money(item.netDue)}</strong> · Déjà réglé : <strong className="text-green-700">{money(item.paid)}</strong> · Solde dû : <strong className="text-amber-700">{money(item.remaining)}</strong></p>
    </div>
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <Input label="Montant du règlement" type="number" value={amount} onChange={setAmount} placeholder="0" />
      <Input label="Date de réception" type="date" value={receivedDate} onChange={setReceivedDate} />
      <Select label="Mode" value={mode} onChange={setMode} options={[{ value: 'Virement', label: 'Virement' }, { value: 'Chèque', label: 'Chèque' }, { value: 'Espèces', label: 'Espèces' }, { value: 'Autre', label: 'Autre mode' }]} />
      <Input label="Banque" value={bank} onChange={setBank} />
      <Input label="Référence / n° de chèque" value={reference} onChange={setReference} />
    </div>
    <div className="mt-3"><TextArea label="Commentaire" value={comment} onChange={setComment} rows={2} /></div>
    <div className="mt-4">
      <p className="mb-1.5 text-xs font-medium text-navy-500">Pièces justificatives (relevé, bordereau, justificatif)</p>
      <AttachmentPicker attachments={attachments} onChange={setAttachments} />
    </div>
    <p className="mt-2 text-xs text-navy-400">Le règlement est enregistré comme confirmé et affecté à cette facture ; le suivi d’assurance est mis à jour.</p>
    {error && <p className="mt-2 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}
    <ModalActions onClose={onClose} onSave={save} saveLabel="Enregistrer le règlement" />
  </Modal>;
}

function ClaimDetail({ item }: { item: ReturnType<typeof makeItem> }) {
  return <div className="grid grid-cols-1 gap-4 md:grid-cols-3"><div><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-400">Informations complémentaires</p><p className="text-sm text-navy-700">Date de facture : {formatDateShort(item.doc.date)}</p><p className="text-sm text-navy-700">Date de transmission : {item.doc.insuranceTracking?.transmissionDate ? formatDateShort(item.doc.insuranceTracking.transmissionDate) : 'À transmettre'}</p><p className="text-sm text-navy-700">Échéance : {item.dueDate ? formatDateShort(item.dueDate) : 'À définir'}</p><p className="text-sm text-navy-700">Médecin : {item.doc.doctor}</p></div><div><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-400">Actes</p>{item.doc.lines.map((line) => <p key={line.id} className="text-sm text-navy-700">{line.description} · {line.quantity} × {money(line.unitPrice)}</p>)}</div><div><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-400">Statuts</p><div className="flex flex-wrap gap-2"><Badge color="blue">Transmission : {item.doc.insuranceTracking?.transmissionDate ? 'Transmis' : 'À transmettre'}</Badge><Badge color={item.remaining <= 0 ? 'green' : item.paid > 0 ? 'amber' : 'navy'}>Paiement : {stateFor(item)}</Badge><Badge color={item.rejection > 0 ? 'red' : 'green'}>Rejet : {item.rejection > 0 ? 'En cours' : 'Aucun'}</Badge></div></div></div>;
}

function RejectionsTab({ invoices, rejections, reminders, onAddRejection, onAddReminder, onUpdateRejection }: { invoices: ReturnType<typeof makeItem>[]; rejections: ClaimRejection[]; reminders: Reminder[]; onAddRejection: () => void; onAddReminder: () => void; onUpdateRejection: (id: string, patch: Partial<ClaimRejection>) => void }) {
  return <div className="space-y-4"><div className="flex justify-end gap-2"><Button variant="secondary" onClick={onAddReminder}>Ajouter une relance</Button><Button variant="primary" onClick={onAddRejection}>Enregistrer un rejet</Button></div><Card><CardHeader title="Rejets et contestations" subtitle="Un rejet reste dans le solde jusqu’à un règlement ou un ajustement validé." /><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-navy-100 text-left text-navy-500"><th className="px-5 py-3">Facture / date</th><th className="px-3 py-3">Motif et action</th><th className="px-3 py-3 text-right">Montant</th><th className="px-3 py-3">Responsable / échéance</th><th className="px-3 py-3">Statut</th></tr></thead><tbody>{rejections.map((rejection) => { const item = invoices.find((candidate) => candidate.doc.id === rejection.docId); return <tr key={rejection.id} className="border-b border-navy-50"><td className="px-5 py-3"><p className="font-medium text-medical-700">{item?.doc.number ?? rejection.docId}</p><p className="text-xs text-navy-500">{formatDateShort(rejection.date)}</p></td><td className="px-3 py-3"><p>{rejection.reason}</p><p className="text-xs text-navy-500">{rejection.action}</p></td><td className="px-3 py-3 text-right font-semibold text-red-700">{money(rejection.amount)}</td><td className="px-3 py-3 text-xs">{rejection.owner}<br />Échéance : {formatDateShort(rejection.dueDate)}</td><td className="px-3 py-3"><select value={rejection.status} onChange={(event) => onUpdateRejection(rejection.id, { status: event.target.value as RejectionStatus })} className="rounded border border-navy-200 bg-white px-2 py-1 text-xs"><option value="a-traiter">À traiter</option><option value="conteste">Contesté</option><option value="retransmis">Retransmis</option><option value="resolu">Résolu</option></select><div className="mt-1"><Badge color={statusColor(rejection.status)}>{rejectionLabel(rejection.status)}</Badge></div></td></tr>; })}</tbody></table>{rejections.length === 0 && <EmptyState icon={AlertTriangle} title="Aucun rejet enregistré" />}</div></Card><Card><CardHeader title="Historique des relances" subtitle="Suivi manuel uniquement — aucun message n’est envoyé automatiquement." />{reminders.length === 0 ? <EmptyState icon={RefreshCw} title="Aucune relance" /> : <div className="divide-y divide-navy-50">{reminders.map((reminder) => <div key={reminder.id} className="flex flex-wrap justify-between gap-2 px-5 py-3 text-sm"><div><p className="font-medium text-navy-900">{reminder.channel} · {reminder.contact}</p><p className="text-xs text-navy-500">{reminder.comment} · prochaine action : {reminder.nextAction}</p></div><p className="text-xs text-navy-500">{formatDateShort(reminder.date)} · prévu le {formatDateShort(reminder.nextDate)}</p></div>)}</div>}</Card></div>;
}

function AnnualTab({ invoices, payments, year }: { invoices: ReturnType<typeof makeItem>[]; payments: InsurancePayment[]; year: string }) {
  const rows = months.map((month, index) => { const monthStart = `${year}-${month}-01`; const monthEnd = `${year}-${month}-31`; const newClaims = invoices.filter((item) => item.doc.date >= monthStart && item.doc.date <= monthEnd).reduce((sum, item) => sum + item.netDue, 0); const settlements = payments.filter((payment) => payment.status === 'confirmed' && payment.receivedDate >= monthStart && payment.receivedDate <= monthEnd).reduce((sum, payment) => sum + payment.allocations.reduce((allocationSum, allocation) => allocationSum + allocation.amount, 0), 0); return { label: monthLabels[index], newClaims, settlements }; }); let opening = 0; return <Card><CardHeader title={`Récapitulatif annuel ${year}`} subtitle="Les soldes sont calculés à partir des créances et opérations enregistrées." /><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-navy-100 text-left text-navy-500"><th className="px-5 py-3">Mois</th><th className="px-3 py-3 text-right">Solde ouverture</th><th className="px-3 py-3 text-right">Nouvelles créances</th><th className="px-3 py-3 text-right">Ajustements validés</th><th className="px-3 py-3 text-right">Règlements affectés</th><th className="px-5 py-3 text-right">Solde clôture</th></tr></thead><tbody>{rows.map((row) => { const closing = Math.max(0, opening + row.newClaims - row.settlements); const currentOpening = opening; opening = closing; return <tr key={row.label} className="border-b border-navy-50"><td className="px-5 py-3 font-medium">{row.label}</td><td className="px-3 py-3 text-right">{money(currentOpening)}</td><td className="px-3 py-3 text-right">{money(row.newClaims)}</td><td className="px-3 py-3 text-right">{money(0)}</td><td className="px-3 py-3 text-right text-green-700">{money(row.settlements)}</td><td className="px-5 py-3 text-right font-semibold">{money(closing)}</td></tr>; })}</tbody></table></div></Card>;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'application/pdf'];
const ATTACHMENT_ERRORS: Record<string, string> = {
  size: 'Le fichier dépasse la taille maximale de 5 Mo.',
  type: 'Format non autorisé. Utilisez PDF, PNG, JPG, GIF ou WEBP.',
  read: 'Impossible de lire ce fichier. Réessayez.',
};

function fileIcon(type: string): string {
  if (type.startsWith('image/')) return '🖼️';
  if (type === 'application/pdf') return '📄';
  return '📎';
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('read'));
    reader.readAsDataURL(file);
  });
}

function AttachmentPicker({ attachments, onChange }: { attachments: PaymentAttachment[]; onChange: Dispatch<SetStateAction<PaymentAttachment[]>> }) {
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | File[]) {
    setFileError(null);
    const list = Array.from(files);
    for (const file of list) {
      if (file.size > MAX_FILE_SIZE) { setFileError(ATTACHMENT_ERRORS.size); continue; }
      if (!ACCEPTED_TYPES.includes(file.type)) { setFileError(ATTACHMENT_ERRORS.type); continue; }
      setUploading(true);
      try {
        const url = await readFileAsDataUrl(file);
        onChange((prev) => [...prev, { id: `att-${Date.now()}-${Math.random().toString(36).slice(2)}`, name: file.name, size: file.size, type: file.type || 'application/octet-stream', url, uploadedAt: `${today} ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` }]);
      } catch { setFileError(ATTACHMENT_ERRORS.read); }
      finally { setUploading(false); }
    }
  }

  return <div>
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); void handleFiles(e.dataTransfer.files); }}
      className={`rounded-lg border-2 border-dashed p-4 text-center transition-colors ${dragOver ? 'border-medical-500 bg-medical-50' : 'border-navy-200 bg-navy-50/50'}`}
    >
      <input ref={fileInputRef} type="file" multiple accept={ACCEPTED_TYPES.join(',')} className="hidden" onChange={(e) => e.target.files && void handleFiles(e.target.files)} />
      <button onClick={() => fileInputRef.current?.click()} className="text-sm font-medium text-medical-700 hover:underline">
        <Paperclip className="mr-1 inline h-4 w-4" /> Cliquer ou déposer des fichiers ici
      </button>
      <p className="mt-1 text-xs text-navy-400">PDF, PNG, JPG, GIF, WEBP — 5 Mo max par fichier</p>
      {uploading && <p className="mt-2 text-xs text-medical-600">Lecture en cours…</p>}
    </div>
    {fileError && <p className="mt-2 rounded bg-red-50 p-2 text-xs text-red-700">{fileError}</p>}
    {attachments.length > 0 && (
      <div className="mt-3 space-y-2">
        {attachments.map((att) => (
          <div key={att.id} className="flex items-center gap-3 rounded-lg border border-navy-100 bg-white p-2.5">
            <span className="text-lg">{fileIcon(att.type)}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-navy-900">{att.name}</p>
              <p className="text-xs text-navy-400">{formatBytes(att.size)} · {att.uploadedAt}</p>
            </div>
            {att.type.startsWith('image/') && <img src={att.url} alt={att.name} className="h-10 w-10 rounded object-cover" />}
            <button onClick={() => onChange((prev) => prev.filter((a) => a.id !== att.id))} className="rounded p-1 text-navy-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    )}
  </div>;
}

function RejectionForm({ invoices, onClose, onSave }: { invoices: ReturnType<typeof makeItem>[]; onClose: () => void; onSave: (rejection: ClaimRejection) => void }) { const [docId, setDocId] = useState(invoices[0]?.doc.id ?? ''); const [date, setDate] = useState(today); const [amount, setAmount] = useState(''); const [reason, setReason] = useState(''); const [comment, setComment] = useState(''); const [action, setAction] = useState(''); const [owner, setOwner] = useState(''); const [dueDate, setDueDate] = useState(''); return <Modal title="Enregistrer un rejet" onClose={onClose}><Select label="Facture concernée" value={docId} onChange={setDocId} options={invoices.map((item) => ({ value: item.doc.id, label: `${item.doc.number} — ${item.company}` }))} /><div className="mt-3 grid grid-cols-2 gap-3"><Input label="Date" type="date" value={date} onChange={setDate} /><Input label="Montant" type="number" value={amount} onChange={setAmount} /><Input label="Motif" value={reason} onChange={setReason} /><Input label="Responsable" value={owner} onChange={setOwner} /><Input label="Échéance" type="date" value={dueDate} onChange={setDueDate} /><Input label="Action à réaliser" value={action} onChange={setAction} /></div><div className="mt-3"><TextArea label="Commentaire de l’organisme" value={comment} onChange={setComment} /></div><ModalActions onClose={onClose} onSave={() => onSave({ id: `rej-${Date.now()}`, docId, date, amount: Number(amount) || 0, reason, comment, action, owner, dueDate, status: 'a-traiter' })} saveLabel="Enregistrer le rejet" /></Modal>; }

function ReminderForm({ invoices, onClose, onSave }: { invoices: ReturnType<typeof makeItem>[]; onClose: () => void; onSave: (reminder: Reminder) => void }) { const [docId, setDocId] = useState(invoices[0]?.doc.id ?? ''); const [date, setDate] = useState(today); const [channel, setChannel] = useState('Téléphone'); const [contact, setContact] = useState(''); const [comment, setComment] = useState(''); const [nextAction, setNextAction] = useState(''); const [nextDate, setNextDate] = useState(''); return <Modal title="Ajouter une relance" onClose={onClose}><Select label="Facture concernée" value={docId} onChange={setDocId} options={invoices.map((item) => ({ value: item.doc.id, label: item.doc.number }))} /><div className="mt-3 grid grid-cols-2 gap-3"><Input label="Date" type="date" value={date} onChange={setDate} /><Select label="Canal" value={channel} onChange={setChannel} options={[{ value: 'Téléphone', label: 'Téléphone' }, { value: 'Email', label: 'Email' }, { value: 'Courrier', label: 'Courrier' }]} /><Input label="Interlocuteur" value={contact} onChange={setContact} /><Input label="Prochaine date" type="date" value={nextDate} onChange={setNextDate} /><Input label="Prochaine action" value={nextAction} onChange={setNextAction} /></div><div className="mt-3"><TextArea label="Commentaire" value={comment} onChange={setComment} /></div><ModalActions onClose={onClose} onSave={() => onSave({ id: `rem-${Date.now()}`, docId, date, channel, contact, comment, nextAction, nextDate })} saveLabel="Enregistrer la relance" /></Modal>; }

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) { return <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/40 p-4 backdrop-blur-sm"><Card className="max-h-[92vh] w-full max-w-2xl overflow-y-auto"><CardHeader title={title} action={<button onClick={onClose} className="text-navy-400 hover:text-navy-700"><X className="h-5 w-5" /></button>} /><div className="p-5">{children}</div></Card></div>; }
function ModalActions({ onClose, onSave, saveLabel, disabled = false }: { onClose: () => void; onSave: () => void; saveLabel: string; disabled?: boolean }) { return <div className="mt-5 flex justify-end gap-2 border-t border-navy-100 pt-4"><Button variant="secondary" onClick={onClose}>Annuler</Button><Button variant="primary" onClick={onSave} disabled={disabled}>{saveLabel}</Button></div>; }

function PrintSummary({ invoices, period, asOfDate }: { invoices: ReturnType<typeof makeItem>[]; period: { start: string; end: string }; asOfDate: string }) { return <div><div className="mb-6 border-b border-navy-200 pb-4"><h1 className="text-xl font-bold text-navy-900">Groupe Médical HOMEA</h1><p className="text-sm text-navy-500">Récapitulatif des créances assurances</p><p className="mt-2 text-xs text-navy-500">Période : {period.start} au {period.end} · Arrêté au : {asOfDate} · Base : date de facture · Devise : FCFA</p></div><table className="w-full text-sm"><thead><tr className="border-b border-navy-200 text-left"><th className="py-2">Facture</th><th className="py-2">Organisme</th><th className="py-2 text-right">Net dû</th><th className="py-2 text-right">Réglé</th><th className="py-2 text-right">Solde</th></tr></thead><tbody>{invoices.map((item) => <tr key={item.doc.id} className="border-b border-navy-100"><td className="py-2">{item.doc.number}</td><td className="py-2">{item.manager} / {item.company}</td><td className="py-2 text-right">{money(item.netDue)}</td><td className="py-2 text-right">{money(item.paid)}</td><td className="py-2 text-right">{money(item.remaining)}</td></tr>)}</tbody></table><div className="mt-5 text-right font-bold">Total solde : {money(invoices.reduce((sum, item) => sum + item.remaining, 0))}</div></div>; }

interface ClaimItem { doc: BillingDoc; totals: ReturnType<typeof docTotals>; patient: typeof patients[number] | undefined; manager: string; company: string; category: 'Hospitalisations' | 'Soins externes'; adjustment: number; netDue: number; paid: number; rejection: number; remaining: number; dueDate: string; overdue: boolean; }
function makeItem(doc: BillingDoc): ClaimItem { const totals = docTotals(doc); const patient = patients.find((p) => p.id === doc.patientId); return { doc, totals, patient, manager: managerFor(doc), company: doc.insurance, category: category(doc), adjustment: 0, netDue: totals.partAssurance, paid: doc.insuranceTracking?.amountPaid ?? 0, rejection: doc.insuranceTracking?.amountRejected ?? 0, remaining: Math.max(0, totals.partAssurance - (doc.insuranceTracking?.amountPaid ?? 0)), dueDate: doc.insuranceTracking?.transmissionDate ? addDays(doc.insuranceTracking.transmissionDate, 30) : '', overdue: false }; }