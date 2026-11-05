import { useState, useMemo } from 'react';
import {
  LayoutDashboard, FlaskConical, FileText, ClipboardCheck, PackageCheck, PackagePlus,
  Cpu, TestTube, Scale, ClipboardList, BellRing, History as HistoryIcon, Search, AlertTriangle,
  AlertCircle, CheckCircle2, Clock, X, Plus, RotateCcw, TrendingDown, TrendingUp,
  Thermometer, Beaker, Activity, ShieldCheck, Ban, Eye,
} from 'lucide-react';
import type {
  StockItem, StockLot, StockMovement, NeedExpression, Quotation, Reception,
  StockAlert, AutomateConsumption, LabReconciliation, LabAutomate, Inventory, Supplier,
  NeedExpressionStatus, QuotationStatus, ReceptionDecision, AlertLevel, AlertStatus,
  ReconciliationClass, MovementType,
} from '@/types';
import { Card, CardHeader, Badge, Button, Select, TextArea, Input, EmptyState, SectionTitle } from '@/components/ui';
import { labItems, labLots, labMovements, labNeedExpressions, labQuotations, labReceptions, labSuppliers, labAlerts, labAutomates, labAutomateConsumption, labReconciliations, labInventories } from '@/data/labStock';
import { formatFCFA, formatDate, formatDateShort } from '@/utils/format';

type BadgeColor = 'navy' | 'green' | 'red' | 'amber' | 'blue' | 'turquoise';

const TABS = [
  { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { id: 'items', label: 'Réactifs et consommables', icon: FlaskConical },
  { id: 'needs', label: 'Expressions de besoin', icon: FileText },
  { id: 'quotations', label: 'Cotations', icon: ClipboardCheck },
  { id: 'receptions', label: 'Réceptions', icon: PackageCheck },
  { id: 'entries', label: 'Entrées en stock', icon: PackagePlus },
  { id: 'automate-consumption', label: 'Consommation des automates', icon: Cpu },
  { id: 'tests', label: 'Tests réalisés', icon: TestTube },
  { id: 'reconciliation', label: 'Rapprochement', icon: Scale },
  { id: 'inventories', label: 'Inventaires', icon: ClipboardList },
  { id: 'alerts', label: 'Alertes', icon: BellRing },
  { id: 'history', label: 'Historique des mouvements', icon: HistoryIcon },
] as const;
type TabId = typeof TABS[number]['id'];

const CAT: Record<string, string> = { 'reactifs':'Réactifs','calibrateurs':'Calibrateurs','controles':'Contrôles','consommables':'Consommables','tubes-prelevement':'Tubes de prélèvement','entretien-automates':'Entretien automates' };
const MVT: Record<MovementType, string> = { 'reception-conforme':'Réception conforme','retour-service':'Retour service','retour-patient':'Retour patient','regularisation-positive':'Régul. positive','transfert-entrant':'Transfert entrant','reintegration-quarantaine':'Réintégration quarantaine','sortie-nominative':'Sortie nominative','dotation-service':'Dotation service','sortie-diverse':'Sortie diverse','consommation-automate':'Conso. automate','consommation-manuelle':'Conso. manuelle','regularisation-negative':'Régul. négative','transfert-sortant':'Transfert sortant','destruction':'Destruction','retour-fournisseur':'Retour fournisseur' };
const NEED_ST: Record<NeedExpressionStatus, string> = { 'brouillon':'Brouillon','soumise':'Soumise','en-validation':'En validation','validee':'Validée','validee-partiellement':'Validée partiellement','rejetee':'Rejetée','transformee-consultation':'Transformée','cloturee':'Clôturée' };
const QUOT_ST: Record<QuotationStatus, string> = { 'recue':'Reçue','en-comparaison':'En comparaison','retenue':'Retenue','en-validation':'En validation','validee':'Validée','rejetee':'Rejetée','expiree':'Expirée' };
const REC_DEC: Record<ReceptionDecision, string> = { 'conforme':'Conforme','partiellement-conforme':'Partiel. conforme','non-conforme':'Non conforme','quarantaine':'Quarantaine','retourne-fournisseur':'Retourné fourn.' };
const AL_LV: Record<AlertLevel, string> = { 'info':'Information','surveiller':'À surveiller','important':'Important','critique':'Critique' };
const AL_ST: Record<AlertStatus, string> = { 'nouvelle':'Nouvelle','prise-en-charge':'Prise en charge','en-cours':'En cours','resolue':'Résolue','justifiee':'Justifiée','cloturee':'Clôturée' };
const REC_CL: Record<ReconciliationClass, string> = { 'conforme':'Conforme','ecart-faible':'Écart faible','ecart-significatif':'Écart significatif','a-investiguer':'À investiguer','justifie':'Justifié','cloture':'Clôturé' };
const REC_CAUSES = [
  { value:'controle-qualite', label:'Contrôle qualité' },{ value:'calibration', label:'Calibration' },
  { value:'reprise-echantillon', label:"Reprise d'échantillon" },{ value:'panne-automate', label:'Panne automate' },
  { value:'erreur-manipulation', label:'Erreur manipulation' },{ value:'perte-reactif', label:'Perte réactif' },
  { value:'test-repete', label:'Test répété' },{ value:'echantillon-non-conforme', label:'Échantillon non conforme' },
  { value:'autre', label:'Autre' },
];

const bcNeed = (s: NeedExpressionStatus): BadgeColor => (s==='validee'||s==='cloturee'||s==='transformee-consultation')?'green':s==='rejetee'?'red':(s==='soumise'||s==='en-validation')?'amber':s==='validee-partiellement'?'blue':'navy';
const bcQuot = (s: QuotationStatus): BadgeColor => (s==='validee'||s==='retenue')?'green':(s==='rejetee'||s==='expiree')?'red':(s==='en-comparaison'||s==='en-validation')?'amber':s==='recue'?'blue':'navy';
const bcRec = (d: ReceptionDecision): BadgeColor => d==='conforme'?'green':(d==='non-conforme'||d==='retourne-fournisseur')?'red':(d==='partiellement-conforme'||d==='quarantaine')?'amber':'navy';
const bcAlLv = (l: AlertLevel): BadgeColor => l==='critique'?'red':l==='important'?'amber':l==='surveiller'?'blue':'navy';
const bcAlSt = (s: AlertStatus): BadgeColor => (s==='resolue'||s==='cloturee'||s==='justifiee')?'green':(s==='en-cours'||s==='prise-en-charge')?'amber':s==='nouvelle'?'red':'navy';
const bcRecCl = (c: ReconciliationClass): BadgeColor => (c==='conforme'||c==='cloture'||c==='justifie')?'green':(c==='ecart-significatif'||c==='a-investiguer')?'red':c==='ecart-faible'?'amber':'navy';

const REF_DATE = new Date('2026-09-15T00:00:00');
const daysUntil = (d: string) => Math.floor((new Date(d).getTime() - REF_DATE.getTime()) / 86400000);
const isExpired = (d: string) => daysUntil(d) < 0;
const isExpiringIn = (d: string, n: number) => { const x = daysUntil(d); return x >= 0 && x <= n; };
const fefo = (ls: StockLot[]) => [...ls].sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
const todayStr = () => new Date().toISOString().slice(0, 10);
const nowISO = () => new Date().toISOString();

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-navy-100 sticky top-0 bg-white rounded-t-xl">
          <h3 className="font-semibold text-navy-900">{title}</h3>
          <button onClick={onClose} className="text-navy-400 hover:text-navy-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-medical-400 rounded"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between items-center"><span className="text-navy-500">{label}</span><span className="text-navy-900 font-medium">{value}</span></div>;
}

export default function LabStock() {
  const [tab, setTab] = useState<TabId>('dashboard');
  const [items, setItems] = useState<StockItem[]>(() => labItems.map((i) => ({ ...i })));
  const [lots, setLots] = useState<StockLot[]>(() => labLots.map((l) => ({ ...l })));
  const [movements, setMovements] = useState<StockMovement[]>(() => labMovements.map((m) => ({ ...m })));
  const [needs, setNeeds] = useState<NeedExpression[]>(() => labNeedExpressions.map((n) => ({ ...n })));
  const [quotations] = useState<Quotation[]>(() => labQuotations.map((q) => ({ ...q })));
  const [receptions] = useState<Reception[]>(() => labReceptions.map((r) => ({ ...r })));
  const [autoCons, setAutoCons] = useState<AutomateConsumption[]>(() => labAutomateConsumption.map((a) => ({ ...a })));
  const [recon, setRecon] = useState<LabReconciliation[]>(() => labReconciliations.map((r) => ({ ...r })));
  const [invs, setInvs] = useState<Inventory[]>(() => labInventories.map((i) => ({ ...i })));
  const [alerts, setAlerts] = useState<StockAlert[]>(() => labAlerts.map((a) => ({ ...a })));
  const [selItem, setSelItem] = useState<string | null>(null);
  const [showNeed, setShowNeed] = useState(false);
  const [showInstall, setShowInstall] = useState(false);
  const [showInv, setShowInv] = useState(false);
  const [showEntry, setShowEntry] = useState(false);
  const [reconJustify, setReconJustify] = useState<LabReconciliation | null>(null);

  const reset = () => {
    setItems(labItems.map((i) => ({ ...i }))); setLots(labLots.map((l) => ({ ...l })));
    setMovements(labMovements.map((m) => ({ ...m }))); setNeeds(labNeedExpressions.map((n) => ({ ...n })));
    setAutoCons(labAutomateConsumption.map((a) => ({ ...a }))); setRecon(labReconciliations.map((r) => ({ ...r })));
    setInvs(labInventories.map((i) => ({ ...i }))); setAlerts(labAlerts.map((a) => ({ ...a })));
    setSelItem(null); setShowNeed(false); setShowInstall(false); setShowInv(false); setShowEntry(false); setReconJustify(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-navy-900 flex items-center gap-2"><FlaskConical className="w-5 h-5 text-medical-600" />Gestion du stock laboratoire</h2>
          <p className="text-sm text-navy-500 mt-0.5">Réactifs, consommables, automates et rapprochement des consommations</p>
        </div>
        <Button variant="secondary" size="sm" onClick={reset}><RotateCcw className="w-4 h-4 mr-1" />Réinitialiser la démonstration</Button>
      </div>
      <div className="flex gap-1 overflow-x-auto pb-2 -mx-1 px-1">
        {TABS.map((t) => { const I = t.icon; const a = tab === t.id; return (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-medical-400 ${a ? 'bg-medical-600 text-white' : 'bg-white text-navy-600 hover:bg-navy-50 border border-navy-100'}`}><I className="w-4 h-4" />{t.label}</button>
        );})}
      </div>
      {tab === 'dashboard' && <Dashboard items={items} lots={lots} autoCons={autoCons} recon={recon} receptions={receptions} needs={needs} quotations={quotations} movements={movements} automates={labAutomates} />}
      {tab === 'items' && <Items items={items} setItems={setItems} lots={lots} suppliers={labSuppliers} sel={selItem} setSel={setSelItem} />}
      {tab === 'needs' && <Needs needs={needs} setNeeds={setNeeds} items={items} suppliers={labSuppliers} show={showNeed} setShow={setShowNeed} />}
      {tab === 'quotations' && <Quotations quotations={quotations} needs={needs} />}
      {tab === 'receptions' && <Receptions receptions={receptions} />}
      {tab === 'entries' && <Entries items={items} setItems={setItems} lots={lots} setLots={setLots} movements={movements} setMovements={setMovements} show={showEntry} setShow={setShowEntry} suppliers={labSuppliers} />}
      {tab === 'automate-consumption' && <AutoConsume automates={labAutomates} items={items} lots={lots} autoCons={autoCons} setAutoCons={setAutoCons} movements={movements} setMovements={setMovements} show={showInstall} setShow={setShowInstall} />}
      {tab === 'tests' && <Tests automates={labAutomates} autoCons={autoCons} />}
      {tab === 'reconciliation' && <Reconciliation recon={recon} setRecon={setRecon} toJustify={reconJustify} setToJustify={setReconJustify} />}
      {tab === 'inventories' && <Inventories invs={invs} setInvs={setInvs} items={items} show={showInv} setShow={setShowInv} />}
      {tab === 'alerts' && <Alerts alerts={alerts} setAlerts={setAlerts} />}
      {tab === 'history' && <History movements={movements} items={items} automates={labAutomates} suppliers={labSuppliers} />}
    </div>
  );
}

// 1. DASHBOARD
function Dashboard({ items, lots, autoCons, recon, receptions, needs, quotations, movements, automates }: {
  items: StockItem[]; lots: StockLot[]; autoCons: AutomateConsumption[]; recon: LabReconciliation[];
  receptions: Reception[]; needs: NeedExpression[]; quotations: Quotation[]; movements: StockMovement[]; automates: LabAutomate[];
}) {
  const ind = useMemo(() => {
    const stockVal = items.reduce((s, i) => s + i.availableStock * i.lastPrice, 0);
    const avail = items.filter((i) => i.availableStock > 0).length;
    const underMin = items.filter((i) => i.availableStock > 0 && i.availableStock < i.minStock).length;
    const rupture = items.filter((i) => i.availableStock === 0).length;
    const e30 = lots.filter((l) => !l.blocked && isExpiringIn(l.expiryDate, 30)).length;
    const e60 = lots.filter((l) => !l.blocked && isExpiringIn(l.expiryDate, 60)).length;
    const e90 = lots.filter((l) => !l.blocked && isExpiringIn(l.expiryDate, 90)).length;
    const installed = autoCons.filter((a) => !a.removalDate).length;
    const testsRem = autoCons.reduce((s, a) => s + a.theoreticalRemaining, 0);
    const unrec = recon.filter((r) => r.classification !== 'cloture' && r.classification !== 'justifie').length;
    const sigGaps = recon.filter((r) => r.classification === 'ecart-significatif' || r.classification === 'a-investiguer').length;
    const pendRec = receptions.filter((r) => r.decision === 'quarantaine' || r.items.some((it) => it.quarantineQty > 0)).length;
    const pendNeed = needs.filter((n) => n.status === 'soumise' || n.status === 'en-validation').length;
    const pendQuot = quotations.filter((q) => q.status === 'en-comparaison' || q.status === 'en-validation').length;
    const cmap = new Map<string, { name: string; qty: number }>();
    movements.filter((m) => m.type === 'consommation-automate' || m.type === 'consommation-manuelle').forEach((m) => {
      const e = cmap.get(m.itemId); if (e) e.qty += m.quantity; else cmap.set(m.itemId, { name: m.itemName, qty: m.quantity });
    });
    const top5 = Array.from(cmap.values()).sort((a, b) => b.qty - a.qty).slice(0, 5);
    const byAut = automates.map((a) => ({ name: a.name, cat: a.category, tests: autoCons.filter((c) => c.automateId === a.id).reduce((s, c) => s + c.testsPerformed, 0) }));
    return { stockVal, avail, underMin, rupture, e30, e60, e90, installed, testsRem, unrec, sigGaps, pendRec, pendNeed, pendQuot, top5, byAut };
  }, [items, lots, autoCons, recon, receptions, needs, quotations, movements, automates]);
  const maxAut = Math.max(1, ...ind.byAut.map((b) => b.tests));
  const cards = [
    { l: 'Valeur du stock', v: formatFCFA(ind.stockVal), I: TrendingUp, c: 'text-medical-600', b: 'bg-medical-50' },
    { l: 'Réactifs disponibles', v: String(ind.avail), I: CheckCircle2, c: 'text-green-600', b: 'bg-green-50' },
    { l: 'Sous le minimum', v: String(ind.underMin), I: AlertTriangle, c: 'text-amber-600', b: 'bg-amber-50' },
    { l: 'En rupture', v: String(ind.rupture), I: AlertCircle, c: 'text-red-600', b: 'bg-red-50' },
    { l: 'Lots expirant ≤ 30 j', v: String(ind.e30), I: Clock, c: 'text-amber-600', b: 'bg-amber-50' },
    { l: 'Lots expirant ≤ 60 j', v: String(ind.e60), I: Clock, c: 'text-blue-600', b: 'bg-blue-50' },
    { l: 'Lots expirant ≤ 90 j', v: String(ind.e90), I: Clock, c: 'text-navy-600', b: 'bg-navy-50' },
    { l: 'Réactifs installés', v: String(ind.installed), I: Cpu, c: 'text-turquoise-600', b: 'bg-turquoise-50' },
    { l: 'Tests réalisables', v: String(ind.testsRem), I: TestTube, c: 'text-medical-600', b: 'bg-medical-50' },
    { l: 'Conso. non rapprochées', v: String(ind.unrec), I: Scale, c: 'text-amber-600', b: 'bg-amber-50' },
    { l: 'Écarts significatifs', v: String(ind.sigGaps), I: AlertTriangle, c: 'text-red-600', b: 'bg-red-50' },
    { l: 'Réceptions en attente', v: String(ind.pendRec), I: PackageCheck, c: 'text-amber-600', b: 'bg-amber-50' },
    { l: 'Expressions en attente', v: String(ind.pendNeed), I: FileText, c: 'text-amber-600', b: 'bg-amber-50' },
    { l: 'Cotations à valider', v: String(ind.pendQuot), I: ClipboardCheck, c: 'text-amber-600', b: 'bg-amber-50' },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {cards.map((c) => { const I = c.I; return (
          <Card key={c.l} className="p-3"><div className="flex items-center gap-2 mb-1.5"><div className={`w-8 h-8 rounded-lg flex items-center justify-center ${c.b}`}><I className={`w-4 h-4 ${c.c}`} /></div></div><p className="text-xs text-navy-500 font-medium">{c.l}</p><p className="text-lg font-bold text-navy-900 mt-0.5">{c.v}</p></Card>
        );})}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Répartition des tests par automate" subtitle="Tests réalisés par automate" />
          <div className="p-5 space-y-3">
            {ind.byAut.map((b) => (
              <div key={b.name}><div className="flex items-center justify-between mb-1"><span className="text-sm font-medium text-navy-700">{b.name}</span><span className="text-sm font-semibold text-navy-900">{b.tests} tests</span></div><div className="w-full bg-navy-100 rounded-full h-6 overflow-hidden"><div className="bg-gradient-to-r from-medical-500 to-medical-600 h-full rounded-full flex items-center justify-end pr-2 transition-all duration-500" style={{ width: `${(b.tests / maxAut) * 100}%` }}><span className="text-xs text-white font-medium">{b.cat}</span></div></div></div>
            ))}
            {ind.byAut.length === 0 && <EmptyState icon={Activity} title="Aucune consommation enregistrée" />}
          </div>
        </Card>
        <Card>
          <CardHeader title="Top 5 réactifs consommés" subtitle="Par quantité sortie" />
          <div className="p-5">
            {ind.top5.length > 0 ? (
              <div className="space-y-2">
                {ind.top5.map((it, i) => (
                  <div key={it.name} className="flex items-center gap-3 p-2.5 rounded-lg bg-navy-50">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-navy-100 text-navy-700' : i === 2 ? 'bg-turquoise-100 text-turquoise-700' : 'bg-navy-50 text-navy-500'}`}>{i + 1}</div>
                    <p className="flex-1 min-w-0 text-sm font-medium text-navy-800 truncate">{it.name}</p>
                    <Badge color="blue">{it.qty} unités</Badge>
                  </div>
                ))}
              </div>
            ) : <EmptyState icon={TrendingDown} title="Aucune consommation enregistrée" />}
          </div>
        </Card>
      </div>
    </div>
  );
}

// 2. ITEMS
function Items({ items, setItems, lots, suppliers, sel, setSel }: { items: StockItem[]; setItems: React.Dispatch<React.SetStateAction<StockItem[]> >; lots: StockLot[]; suppliers: Supplier[]; sel: string | null; setSel: (id: string | null) => void }) {
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('all');
  const [showNew, setShowNew] = useState(false);
  const filtered = useMemo(() => items.filter((i) => (!search || i.name.toLowerCase().includes(search.toLowerCase()) || i.code.toLowerCase().includes(search.toLowerCase())) && (cat === 'all' || i.category === cat)), [items, search, cat]);
  const si = items.find((i) => i.id === sel);
  const sl = si ? fefo(lots.filter((l) => l.itemId === si.id)) : [];
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader title="Réactifs et consommables" subtitle={`${filtered.length} article(s)`} action={<Button size="sm" onClick={() => setShowNew(true)}><Plus className="w-4 h-4 mr-1" />Nouveau</Button>} />
          <div className="p-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1"><Search className="w-4 h-4 text-navy-400 absolute left-3 top-1/2 -translate-y-1/2" /><input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher par nom ou code..." className="w-full pl-9 pr-3 py-2 rounded-lg border border-navy-200 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-medical-400" /></div>
              <select value={cat} onChange={(e) => setCat(e.target.value)} className="px-3 py-2 rounded-lg border border-navy-200 text-sm text-navy-900 bg-white focus:outline-none focus:ring-2 focus:ring-medical-400"><option value="all">Toutes catégories</option>{Object.entries(CAT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-navy-500 border-b border-navy-100"><th className="py-2 pr-3 font-medium">Code</th><th className="py-2 pr-3 font-medium">Désignation</th><th className="py-2 pr-3 font-medium">Catégorie</th><th className="py-2 pr-3 font-medium text-right">Stock</th><th className="py-2 pr-3 font-medium text-right">Min</th><th className="py-2 pr-3 font-medium">État</th><th className="py-2 pr-3"></th></tr></thead>
                <tbody>
                  {filtered.map((it) => { const r = it.availableStock === 0; const u = it.availableStock > 0 && it.availableStock < it.minStock; return (
                    <tr key={it.id} className="border-b border-navy-50 hover:bg-navy-50"><td className="py-2 pr-3 text-navy-600 font-mono text-xs">{it.code}</td><td className="py-2 pr-3 text-navy-900 font-medium">{it.name}</td><td className="py-2 pr-3 text-navy-600">{CAT[it.category] || it.category}</td><td className="py-2 pr-3 text-right font-semibold text-navy-900">{it.availableStock}</td><td className="py-2 pr-3 text-right text-navy-500">{it.minStock}</td><td className="py-2 pr-3">{r ? <Badge color="red"><AlertCircle className="w-3 h-3" />Rupture</Badge> : u ? <Badge color="amber"><AlertTriangle className="w-3 h-3" />Sous min.</Badge> : <Badge color="green"><CheckCircle2 className="w-3 h-3" />OK</Badge>}</td><td className="py-2 pr-3"><Button variant="ghost" size="sm" onClick={() => setSel(it.id)}><Eye className="w-4 h-4" /></Button></td></tr>
                  );})}
                </tbody>
              </table>
              {filtered.length === 0 && <EmptyState icon={Search} title="Aucun article trouvé" subtitle="Modifiez vos critères de recherche" />}
            </div>
          </div>
        </Card>
      </div>
      <div>
        {si ? (
          <Card>
            <CardHeader title={si.name} subtitle={si.code} action={<Button variant="ghost" size="sm" onClick={() => setSel(null)}><X className="w-4 h-4" /></Button>} />
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <InfoRow label="Catégorie" value={CAT[si.category] || si.category} /><InfoRow label="Emplacement" value={si.location} />
                <InfoRow label="Unité gestion" value={si.unitManagement} /><InfoRow label="Unité dispens." value={si.unitDispensing} />
                <InfoRow label="Stock dispo." value={String(si.availableStock)} /><InfoRow label="Stock réservé" value={String(si.reservedStock)} />
                <InfoRow label="Stock quar." value={String(si.quarantineStock)} /><InfoRow label="Stock min." value={String(si.minStock)} />
                <InfoRow label="Stock max." value={String(si.maxStock)} /><InfoRow label="Seuil réappro." value={String(si.reorderPoint)} />
                <InfoRow label="Conso. moyenne" value={`${si.avgConsumption}/mois`} /><InfoRow label="Dernier prix" value={formatFCFA(si.lastPrice)} />
              </div>
              {si.automateCompatible && (
                <div><SectionTitle>Spécifications laboratoire</SectionTitle><div className="space-y-1.5 text-sm">
                  <InfoRow label="Automate" value={si.automateCompatible} />
                  {si.method && <InfoRow label="Méthode" value={si.method} />}
                  {si.theoreticalTests != null && <InfoRow label="Tests théoriques" value={String(si.theoreticalTests)} />}
                  {si.storageConditions && <div className="flex items-center gap-1.5"><Thermometer className="w-3.5 h-3.5 text-blue-500" /><span className="text-navy-500">Conditionnement:</span><span className="text-navy-900 font-medium">{si.storageConditions}</span></div>}
                  {si.thermoSensitive && <Badge color="blue"><Thermometer className="w-3 h-3" />Thermosensible</Badge>}
                </div></div>
              )}
              <div>
                <SectionTitle>Lots ({sl.length})</SectionTitle>
                {sl.length > 0 ? (
                  <div className="space-y-2">
                    {sl.map((l) => { const ex = isExpired(l.expiryDate); const e30 = isExpiringIn(l.expiryDate, 30); return (
                      <div key={l.id} className={`p-2.5 rounded-lg border ${l.blocked ? 'border-red-200 bg-red-50' : ex ? 'border-red-200 bg-red-50' : e30 ? 'border-amber-200 bg-amber-50' : 'border-navy-100 bg-navy-50'}`}>
                        <div className="flex items-center justify-between mb-1"><span className="text-sm font-medium text-navy-900">{l.lotNumber}</span>{l.blocked ? <Badge color="red"><Ban className="w-3 h-3" />{l.blockedReason || 'Bloqué'}</Badge> : ex ? <Badge color="red"><AlertCircle className="w-3 h-3" />Expiré</Badge> : e30 ? <Badge color="amber"><Clock className="w-3 h-3" />Bientôt</Badge> : <Badge color="green"><CheckCircle2 className="w-3 h-3" />Valide</Badge>}</div>
                        <div className="flex items-center justify-between text-xs text-navy-500"><span>Exp. {formatDateShort(l.expiryDate)}</span><span>Dispo: {l.availableQty} | Rés.: {l.reservedQty} | Quar.: {l.quarantineQty}</span></div>
                        {(ex || l.blocked) && <div className="mt-1.5 flex items-center gap-1 text-xs text-red-600 font-medium"><AlertTriangle className="w-3 h-3" />Consommation bloquée</div>}
                      </div>
                    );})}
                  </div>
                ) : <EmptyState icon={PackagePlus} title="Aucun lot" />}
              </div>
              {si.supplierId && (() => { const sup = labSuppliers.find((s) => s.id === si.supplierId); return sup ? <div><SectionTitle>Fournisseur</SectionTitle><div className="text-sm space-y-1"><p className="font-medium text-navy-900">{sup.name}</p><p className="text-navy-500">{sup.contact}</p><p className="text-navy-500">{sup.phone}</p></div></div> : null; })()}
            </div>
          </Card>
        ) : <Card><EmptyState icon={FlaskConical} title="Sélectionnez un article" subtitle="Cliquez sur un article pour voir le détail" /></Card>}
      </div>
      {showNew && <CreateItem onClose={() => setShowNew(false)} onCreate={(it) => { setItems((p) => [...p, it]); setShowNew(false); }} />}
    </div>
  );
}

function CreateItem({ onClose, onCreate }: { onClose: () => void; onCreate: (it: StockItem) => void }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [cat, setCat] = useState('reactifs');
  const [unit, setUnit] = useState('');
  const [minStock, setMinStock] = useState('0');
  const [maxStock, setMaxStock] = useState('0');
  const [reorderPoint, setReorderPoint] = useState('0');
  const [price, setPrice] = useState('0');
  const [location, setLocation] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [automate, setAutomate] = useState('');
  const [method, setMethod] = useState('');
  const [theoreticalTests, setTheoreticalTests] = useState('0');
  const [storageConditions, setStorageConditions] = useState('');
  const [thermoSensitive, setThermoSensitive] = useState(false);
  const submit = () => {
    const min = parseInt(minStock) || 0;
    const max = parseInt(maxStock) || 0;
    const reorder = parseInt(reorderPoint) || 0;
    const lastPrice = parseFloat(price) || 0;
    const tests = parseInt(theoreticalTests) || 0;
    onCreate({
      id: `li-${Date.now()}`,
      domain: 'lab',
      code: code || `ART-${String(Date.now()).slice(-4)}`,
      name: name || 'Nouvel article',
      category: cat,
      unitManagement: unit || 'unité',
      unitDispensing: unit || 'unité',
      conversionFactor: 1,
      location: location || 'Réserve laboratoire',
      supplierId,
      availableStock: 0,
      reservedStock: 0,
      quarantineStock: 0,
      orderedQty: 0,
      minStock: min,
      maxStock: max,
      reorderPoint: reorder,
      avgConsumption: 0,
      lastPrice,
      active: true,
      automateCompatible: automate || undefined,
      method: method || undefined,
      theoreticalTests: tests > 0 ? tests : undefined,
      storageConditions: storageConditions || undefined,
      thermoSensitive,
    });
  };
  return (
    <Modal title="Nouveau produit" onClose={onClose}>
      <div className="space-y-3">
        <Input label="Désignation" value={name} onChange={setName} placeholder="Nom du produit" required />
        <Input label="Code" value={code} onChange={setCode} placeholder="Ex: REA-001" />
        <Select label="Catégorie" value={cat} onChange={setCat} options={Object.entries(CAT).map(([k, v]) => ({ value: k, label: v }))} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Unité" value={unit} onChange={setUnit} placeholder="Ex: boîte, flacon" />
          <Input label="Emplacement" value={location} onChange={setLocation} placeholder="Ex: Réserve laboratoire" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Input label="Stock min." type="number" value={minStock} onChange={setMinStock} />
          <Input label="Stock max." type="number" value={maxStock} onChange={setMaxStock} />
          <Input label="Seuil réappro." type="number" value={reorderPoint} onChange={setReorderPoint} />
        </div>
        <Input label="Dernier prix" type="number" value={price} onChange={setPrice} />
        <Select label="Fournisseur" value={supplierId} onChange={setSupplierId} options={[{ value: '', label: '— Sélectionner —' }, ...labSuppliers.map((s) => ({ value: s.id, label: s.name }))]} />
        <div className="border-t border-navy-100 pt-3">
          <SectionTitle>Spécifications laboratoire</SectionTitle>
          <div className="space-y-3 mt-2">
            <Select label="Automate" value={automate} onChange={setAutomate} options={[{ value: '', label: '— Aucun / Tous —' }, ...labAutomates.map((a) => ({ value: a.name, label: `${a.name} (${a.category})` }))]} />
            <Input label="Méthode" value={method} onChange={setMethod} placeholder="Ex: Hexokinase UV, CMIA..." />
            <Input label="Tests théoriques" type="number" value={theoreticalTests} onChange={setTheoreticalTests} />
            <Input label="Conditionnement" value={storageConditions} onChange={setStorageConditions} placeholder="Ex: 2-8°C, température ambiante..." />
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={thermoSensitive} onChange={(e) => setThermoSensitive(e.target.checked)} className="rounded border-navy-300 text-medical-600 focus:ring-medical-400" /><span className="text-sm text-navy-700 font-medium">Produit thermosensible</span></label>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2"><Button variant="secondary" size="sm" onClick={onClose}>Annuler</Button><Button size="sm" onClick={submit} disabled={!name.trim()}><CheckCircle2 className="w-4 h-4 mr-1" />Créer</Button></div>
      </div>
    </Modal>
  );
}

// 3. NEEDS
function Needs({ needs, setNeeds, items, suppliers, show, setShow }: { needs: NeedExpression[]; setNeeds: React.Dispatch<React.SetStateAction<NeedExpression[]> >; items: StockItem[]; suppliers: Supplier[]; show: boolean; setShow: (v: boolean) => void }) {
  const validate = (id: string) => setNeeds((p) => p.map((n) => n.id === id ? { ...n, status: 'validee', validator: 'Dr. Konan François', history: [...n.history, { timestamp: nowISO(), action: 'Validation', detail: 'Validée par Dr. Konan François' }] } : n));
  const reject = (id: string) => setNeeds((p) => p.map((n) => n.id === id ? { ...n, status: 'rejetee', rejectionReason: 'Rejeté lors de la démonstration', history: [...n.history, { timestamp: nowISO(), action: 'Rejet', detail: 'Rejeté lors de la démonstration' }] } : n));
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={() => setShow(true)} size="sm"><Plus className="w-4 h-4 mr-1" />Nouvelle expression</Button></div>
      {needs.map((n) => (
        <Card key={n.id}>
          <CardHeader title={n.number} subtitle={`${n.service} — ${n.period}`} action={<Badge color={bcNeed(n.status)}>{NEED_ST[n.status]}</Badge>} />
          <div className="p-5 space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <InfoRow label="Date" value={formatDate(n.date)} /><InfoRow label="Demandeur" value={n.requester} />
              <InfoRow label="Validateur" value={n.validator || '—'} /><InfoRow label="Urgence" value={n.urgency === 'critique' ? 'Critique' : n.urgency === 'urgent' ? 'Urgente' : 'Normale'} />
            </div>
            <p className="text-sm text-navy-600 bg-navy-50 p-3 rounded-lg">{n.justification}</p>
            <div>
              <SectionTitle>Articles demandés ({n.items.length})</SectionTitle>
              <div className="overflow-x-auto"><table className="w-full text-sm">
                <thead><tr className="text-left text-navy-500 border-b border-navy-100"><th className="py-1.5 pr-3 font-medium">Article</th><th className="py-1.5 pr-3 font-medium text-right">Dispo.</th><th className="py-1.5 pr-3 font-medium text-right">Min</th><th className="py-1.5 pr-3 font-medium text-right">Demandé</th><th className="py-1.5 pr-3 font-medium text-right">Validé</th><th className="py-1.5 pr-3 font-medium">Fournisseur</th></tr></thead>
                <tbody>{n.items.map((it) => { const sup = suppliers.find((s) => s.id === it.supplierId); return (
                  <tr key={it.itemId} className="border-b border-navy-50"><td className="py-1.5 pr-3 text-navy-900 font-medium">{it.itemName}</td><td className="py-1.5 pr-3 text-right text-navy-600">{it.availableQty}</td><td className="py-1.5 pr-3 text-right text-navy-600">{it.minStock}</td><td className="py-1.5 pr-3 text-right font-semibold text-navy-900">{it.requestedQty}</td><td className="py-1.5 pr-3 text-right font-semibold text-medical-700">{it.validatedQty ?? '—'}</td><td className="py-1.5 pr-3 text-navy-600">{sup?.name || '—'}</td></tr>
                );})}</tbody>
              </table></div>
            </div>
            {n.rejectionReason && <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg text-sm text-red-700"><AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /><span>Motif du rejet : {n.rejectionReason}</span></div>}
            {n.history.length > 0 && <div className="text-xs text-navy-500 space-y-1"><SectionTitle>Historique</SectionTitle>{n.history.map((h, i) => <div key={i} className="flex items-center gap-2"><Clock className="w-3 h-3" /><span className="font-medium">{h.action}</span><span>— {h.detail}</span></div>)}</div>}
            {(n.status === 'soumise' || n.status === 'en-validation') && (
              <div className="flex gap-2 pt-2"><Button variant="primary" size="sm" onClick={() => validate(n.id)}><CheckCircle2 className="w-4 h-4 mr-1" />Valider</Button><Button variant="danger" size="sm" onClick={() => reject(n.id)}><X className="w-4 h-4 mr-1" />Rejeter</Button></div>
            )}
          </div>
        </Card>
      ))}
      {needs.length === 0 && <Card><EmptyState icon={FileText} title="Aucune expression de besoin" /></Card>}
      {show && <CreateNeed items={items} suppliers={suppliers} onClose={() => setShow(false)} onCreate={(n) => { setNeeds((p) => [n, ...p]); setShow(false); }} />}
    </div>
  );
}

function CreateNeed({ items, suppliers, onClose, onCreate }: { items: StockItem[]; suppliers: Supplier[]; onClose: () => void; onCreate: (n: NeedExpression) => void }) {
  const [svc, setSvc] = useState(''); const [per, setPer] = useState(''); const [just, setJust] = useState('');
  const [urg, setUrg] = useState<'normal' | 'urgent' | 'critique'>('normal'); const [sel, setSel] = useState<string[]>([]);
  const toggle = (id: string) => setSel((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  const create = () => {
    const ni = sel.map((id) => { const it = items.find((i) => i.id === id)!; return { itemId: id, itemName: it.name, availableQty: it.availableStock, minStock: it.minStock, avgConsumption: it.avgConsumption, orderedQty: 0, requestedQty: Math.max(it.minStock - it.availableStock, 1), unit: it.unitDispensing, supplierId: it.supplierId, proposedQty: Math.max(it.minStock - it.availableStock, 1) }; });
    onCreate({ id: `lne-${Date.now()}`, domain: 'lab', number: `EB-LAB-2026-${String(Date.now()).slice(-3)}`, date: todayStr(), service: svc || 'Laboratoire', period: per || 'Octobre 2026', justification: just || 'Expression de besoin de démonstration', urgency: urg, requester: 'Mme. Brou Adèle', status: 'soumise', items: ni, history: [{ timestamp: nowISO(), action: 'Création', detail: 'Expression de besoin soumise' }] });
  };
  return (
    <Modal title="Nouvelle expression de besoin" onClose={onClose}>
      <div className="space-y-3">
        <Input label="Service" value={svc} onChange={setSvc} placeholder="Laboratoire de biochimie" />
        <Input label="Période" value={per} onChange={setPer} placeholder="Octobre 2026" />
        <Select label="Urgence" value={urg} onChange={(v) => setUrg(v as 'normal' | 'urgent' | 'critique')} options={[{ value: 'normal', label: 'Normale' }, { value: 'urgent', label: 'Urgente' }, { value: 'critique', label: 'Critique' }]} />
        <TextArea label="Justification" value={just} onChange={setJust} placeholder="Motif de la demande..." rows={3} />
        <div><SectionTitle>Articles à inclure</SectionTitle><div className="max-h-48 overflow-y-auto space-y-1.5 border border-navy-100 rounded-lg p-2">{items.map((it) => <label key={it.id} className="flex items-center gap-2 p-2 rounded hover:bg-navy-50 cursor-pointer"><input type="checkbox" checked={sel.includes(it.id)} onChange={() => toggle(it.id)} className="rounded border-navy-300 text-medical-600 focus:ring-medical-400" /><span className="text-sm text-navy-700 flex-1">{it.name}</span><span className="text-xs text-navy-500">Stock: {it.availableStock}</span></label>)}</div></div>
        <div className="flex justify-end gap-2 pt-2"><Button variant="secondary" size="sm" onClick={onClose}>Annuler</Button><Button size="sm" onClick={create} disabled={sel.length === 0}><CheckCircle2 className="w-4 h-4 mr-1" />Soumettre</Button></div>
      </div>
    </Modal>
  );
}

// 4. QUOTATIONS
function Quotations({ quotations, needs }: { quotations: Quotation[]; needs: NeedExpression[] }) {
  const grouped = useMemo(() => { const m = new Map<string, Quotation[]>(); quotations.forEach((q) => { const l = m.get(q.needExpressionId) || []; l.push(q); m.set(q.needExpressionId, l); }); return m; }, [quotations]);
  return (
    <div className="space-y-4">
      {Array.from(grouped.entries()).map(([nid, qs]) => { const n = needs.find((x) => x.id === nid); return (
        <Card key={nid}>
          <CardHeader title={n ? n.number : 'Expression associée'} subtitle={n ? `${n.service} — ${n.period}` : ''} />
          <div className="p-5"><div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {qs.map((q) => { const tot = q.items.reduce((s, it) => s + it.totalCost, 0); const best = q.status === 'validee'; return (
              <div key={q.id} className={`rounded-xl border p-4 ${best ? 'border-green-300 bg-green-50' : 'border-navy-100 bg-white'}`}>
                <div className="flex items-center justify-between mb-3"><div><p className="font-semibold text-navy-900 text-sm">{q.supplierName}</p><p className="text-xs text-navy-500">{q.number}</p></div><Badge color={bcQuot(q.status)}>{QUOT_ST[q.status]}</Badge></div>
                <div className="space-y-1 text-xs text-navy-600 mb-3"><div className="flex justify-between"><span>Date:</span><span className="font-medium">{formatDateShort(q.date)}</span></div><div className="flex justify-between"><span>Validité:</span><span className="font-medium">{q.validityDays} jours</span></div><div className="flex justify-between"><span>Expiration:</span><span className="font-medium">{formatDateShort(q.expiryDate)}</span></div></div>
                <div className="space-y-2 mb-3">
                  {q.items.map((it) => (
                    <div key={it.itemId} className="text-xs border border-navy-100 rounded-lg p-2">
                      <p className="font-medium text-navy-900">{it.itemName}</p>
                      <div className="grid grid-cols-2 gap-1 mt-1 text-navy-500"><span>Prix: {formatFCFA(it.unitPrice)}</span><span>Qté: {it.proposedQty}</span><span>Remise: {it.discount}%</span><span>Total: {formatFCFA(it.totalCost)}</span></div>
                      {it.automateCompatible && <div className="mt-1.5 flex flex-wrap gap-1"><Badge color="turquoise"><Cpu className="w-3 h-3" />{it.automateCompatible}</Badge>{it.methodConcerned && <Badge color="navy"><Beaker className="w-3 h-3" />{it.methodConcerned}</Badge>}{it.theoreticalTests != null && <Badge color="blue"><TestTube className="w-3 h-3" />{it.theoreticalTests} tests</Badge>}{it.calibrationRequired && <Badge color="amber"><ShieldCheck className="w-3 h-3" />Calibration</Badge>}</div>}
                      {it.storageConditions && <div className="mt-1 flex items-center gap-1 text-navy-500"><Thermometer className="w-3 h-3" />{it.storageConditions}</div>}
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-navy-100"><span className="text-sm font-bold text-navy-900">{formatFCFA(tot)}</span>{best && <Badge color="green"><CheckCircle2 className="w-3 h-3" />Retenue</Badge>}</div>
                {q.selectionReason && <p className="mt-2 text-xs text-green-700 bg-green-100 p-2 rounded">{q.selectionReason}</p>}
              </div>
            );})}
          </div></div>
        </Card>
      );})}
      {quotations.length === 0 && <Card><EmptyState icon={ClipboardCheck} title="Aucune cotation" /></Card>}
    </div>
  );
}

// 5. RECEPTIONS
function Receptions({ receptions }: { receptions: Reception[] }) {
  return (
    <div className="space-y-4">
      {receptions.map((r) => (
        <Card key={r.id}>
          <CardHeader title={r.number} subtitle={`${r.supplierName} — ${formatDate(r.date)} ${r.time}`} action={<Badge color={bcRec(r.decision)}>{REC_DEC[r.decision]}</Badge>} />
          <div className="p-5 space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm"><InfoRow label="Bon de livraison" value={r.deliveryNoteNumber} /><InfoRow label="Récepteur" value={r.receiver} /><InfoRow label="Fournisseur" value={r.supplierName} /><InfoRow label="Expression liée" value={r.needExpressionId} /></div>
            <div><SectionTitle>Articles réceptionnés ({r.items.length})</SectionTitle>
              <div className="overflow-x-auto"><table className="w-full text-sm">
                <thead><tr className="text-left text-navy-500 border-b border-navy-100"><th className="py-2 pr-3 font-medium">Article</th><th className="py-2 pr-3 font-medium">Lot</th><th className="py-2 pr-3 font-medium text-right">Comm.</th><th className="py-2 pr-3 font-medium text-right">Reçu</th><th className="py-2 pr-3 font-medium text-right">Accepté</th><th className="py-2 pr-3 font-medium text-right">Refusé</th><th className="py-2 pr-3 font-medium text-right">Quar.</th><th className="py-2 pr-3 font-medium">Exp.</th><th className="py-2 pr-3 font-medium">Contrôles</th></tr></thead>
                <tbody>{r.items.map((it) => { const ch = [it.packagingOk ? '✓ Emb.' : '✗ Emb.', it.designationOk ? '✓ Dés.' : '✗ Dés.', it.dosageOk ? '✓ Dos.' : '✗ Dos.', it.packagingConformityOk ? '✓ Conf.' : '✗ Conf.', it.quantityOk ? '✓ Qté' : '✗ Qté']; return (
                  <tr key={it.itemId} className="border-b border-navy-50"><td className="py-2 pr-3 text-navy-900 font-medium">{it.itemName}</td><td className="py-2 pr-3 text-navy-600 font-mono text-xs">{it.lotNumber}</td><td className="py-2 pr-3 text-right text-navy-600">{it.orderedQty}</td><td className="py-2 pr-3 text-right text-navy-600">{it.receivedQty}</td><td className="py-2 pr-3 text-right font-semibold text-green-700">{it.acceptedQty}</td><td className="py-2 pr-3 text-right font-semibold text-red-700">{it.refusedQty}</td><td className="py-2 pr-3 text-right font-semibold text-amber-700">{it.quarantineQty}</td><td className="py-2 pr-3 text-navy-600 text-xs">{formatDateShort(it.expiryDate)}</td><td className="py-2 pr-3"><div className="flex flex-wrap gap-1">{ch.map((c, i) => <span key={i} className={`text-xs ${c.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>{c}</span>)}</div></td></tr>
                );})}</tbody>
              </table></div>
            </div>
            {r.items.some((it) => it.quarantineQty > 0) && <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg text-sm text-amber-800"><AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" /><div><p className="font-medium">Lot(s) en quarantaine</p><p className="text-xs mt-0.5">{r.items.filter((it) => it.quarantineQty > 0).map((it) => `${it.lotNumber} (${it.itemName})`).join(', ')} — consommation bloquée.</p></div></div>}
            {r.items.some((it) => it.comment) && <div className="text-xs text-navy-500 space-y-1">{r.items.filter((it) => it.comment).map((it) => <p key={it.itemId}><span className="font-medium">{it.lotNumber}:</span> {it.comment}</p>)}</div>}
          </div>
        </Card>
      ))}
      {receptions.length === 0 && <Card><EmptyState icon={PackageCheck} title="Aucune réception" /></Card>}
    </div>
  );
}

// 6. ENTRIES
function Entries({ items, setItems, lots, setLots, movements, setMovements, show, setShow, suppliers }: {
  items: StockItem[]; setItems: React.Dispatch<React.SetStateAction<StockItem[]> >; lots: StockLot[]; setLots: React.Dispatch<React.SetStateAction<StockLot[]> >;
  movements: StockMovement[]; setMovements: React.Dispatch<React.SetStateAction<StockMovement[]> >; show: boolean; setShow: (v: boolean) => void; suppliers: Supplier[];
}) {
  const entries = movements.filter((m) => ['reception-conforme', 'regularisation-positive', 'transfert-entrant', 'reintegration-quarantaine'].includes(m.type));
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button size="sm" onClick={() => setShow(true)}><Plus className="w-4 h-4 mr-1" />Nouvelle entrée</Button></div>
      <Card>
        <CardHeader title="Entrées en stock" subtitle={`${entries.length} entrée(s)`} />
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="text-left text-navy-500 border-b border-navy-100"><th className="py-2 px-4 font-medium">Date</th><th className="py-2 px-4 font-medium">Type</th><th className="py-2 px-4 font-medium">Article</th><th className="py-2 px-4 font-medium">Lot</th><th className="py-2 px-4 font-medium text-right">Qté</th><th className="py-2 px-4 font-medium text-right">Avant</th><th className="py-2 px-4 font-medium text-right">Après</th><th className="py-2 px-4 font-medium">Origine</th><th className="py-2 px-4 font-medium">Auteur</th></tr></thead>
          <tbody>{entries.map((m) => <tr key={m.id} className="border-b border-navy-50 hover:bg-navy-50"><td className="py-2 px-4 text-navy-600">{formatDateShort(m.date)} {m.time}</td><td className="py-2 px-4"><Badge color="green">{MVT[m.type]}</Badge></td><td className="py-2 px-4 text-navy-900 font-medium">{m.itemName}</td><td className="py-2 px-4 text-navy-600 font-mono text-xs">{m.lotNumber || '—'}</td><td className="py-2 px-4 text-right font-semibold text-green-700">+{m.quantity}</td><td className="py-2 px-4 text-right text-navy-500">{m.stockBefore}</td><td className="py-2 px-4 text-right font-semibold text-navy-900">{m.stockAfter}</td><td className="py-2 px-4 text-navy-600">{m.origin || '—'}</td><td className="py-2 px-4 text-navy-600">{m.author}</td></tr>)}</tbody>
        </table>{entries.length === 0 && <EmptyState icon={PackagePlus} title="Aucune entrée enregistrée" />}</div>
      </Card>
      {show && <EntryModal items={items} lots={lots} suppliers={suppliers} onClose={() => setShow(false)} onSubmit={(e) => { setItems((p) => p.map((it) => it.id === e.itemId ? { ...it, availableStock: it.availableStock + e.qty } : it)); if (e.lotId) setLots((p) => p.map((l) => l.id === e.lotId ? { ...l, availableQty: l.availableQty + e.qty } : l)); setMovements((p) => [e.mvt, ...p]); setShow(false); }} />}
    </div>
  );
}

function EntryModal({ items, lots, suppliers, onClose, onSubmit }: { items: StockItem[]; lots: StockLot[]; suppliers: Supplier[]; onClose: () => void; onSubmit: (e: { itemId: string; qty: number; lotId?: string; mvt: StockMovement }) => void }) {
  const [iid, setIid] = useState(''); const [lid, setLid] = useState(''); const [qty, setQty] = useState('1'); const [ori, setOri] = useState(''); const [rsn, setRsn] = useState('');
  const si = items.find((i) => i.id === iid); const il = si ? fefo(lots.filter((l) => l.itemId === iid && !l.blocked)) : []; const q = parseInt(qty) || 0;
  const submit = () => { if (!si || q <= 0) return; const lot = lid ? lots.find((l) => l.id === lid) : undefined; onSubmit({ itemId: si.id, qty: q, lotId: lot?.id, mvt: { id: `lm-${Date.now()}`, domain: 'lab', date: todayStr(), time: new Date().toTimeString().slice(0, 5), type: 'reception-conforme', itemId: si.id, itemName: si.name, lotId: lot?.id, lotNumber: lot?.lotNumber, quantity: q, unit: si.unitManagement, origin: ori || 'Saisie manuelle', destination: si.location, author: 'M. Kouassi Marc', reference: `ENT-${Date.now()}`, stockBefore: si.availableStock, stockAfter: si.availableStock + q, reason: rsn || 'Entrée manuelle' } }); };
  return (
    <Modal title="Nouvelle entrée en stock" onClose={onClose}>
      <div className="space-y-3">
        <Select label="Article" value={iid} onChange={setIid} required options={[{ value: '', label: '— Sélectionner —' }, ...items.map((i) => ({ value: i.id, label: `${i.name} (stock: ${i.availableStock})` }))]} />
        {si && <Select label="Lot (FEFO)" value={lid} onChange={setLid} options={[{ value: '', label: '— Aucun lot —' }, ...il.map((l) => ({ value: l.id, label: `${l.lotNumber} — exp. ${formatDateShort(l.expiryDate)} (dispo: ${l.availableQty})` }))]} />}
        <Input label="Quantité" type="number" value={qty} onChange={setQty} required />
        <Input label="Origine" value={ori} onChange={setOri} placeholder="Fournisseur, service..." />
        <TextArea label="Motif" value={rsn} onChange={setRsn} rows={2} />
        {si && <div className="bg-navy-50 p-3 rounded-lg text-sm space-y-1"><div className="flex justify-between"><span className="text-navy-500">Stock avant:</span><span className="font-medium">{si.availableStock}</span></div><div className="flex justify-between"><span className="text-navy-500">Quantité:</span><span className="font-medium text-green-700">+{q}</span></div><div className="flex justify-between"><span className="text-navy-500">Stock après:</span><span className="font-bold text-navy-900">{si.availableStock + q}</span></div></div>}
        <div className="flex justify-end gap-2 pt-2"><Button variant="secondary" size="sm" onClick={onClose}>Annuler</Button><Button size="sm" onClick={submit} disabled={!si || q <= 0}><CheckCircle2 className="w-4 h-4 mr-1" />Enregistrer</Button></div>
      </div>
    </Modal>
  );
}

// 7. AUTOMATE CONSUMPTION
function AutoConsume({ automates, items, lots, autoCons, setAutoCons, movements, setMovements, show, setShow }: {
  automates: LabAutomate[]; items: StockItem[]; lots: StockLot[]; autoCons: AutomateConsumption[]; setAutoCons: React.Dispatch<React.SetStateAction<AutomateConsumption[]> >;
  movements: StockMovement[]; setMovements: React.Dispatch<React.SetStateAction<StockMovement[]> >; show: boolean; setShow: (v: boolean) => void;
}) {
  const cols = ['Automate', 'Réactif', 'Lot', 'Ouvert', 'Installé', 'Qté inst.', 'Tests théo.', 'Tests réa.', 'Contrôles', 'Calib.', 'Répétés', 'Annulés', 'Pertes', 'Théo. rest.', 'Obs. rest.', 'Retrait', 'Opérateur'];
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button size="sm" onClick={() => setShow(true)}><Plus className="w-4 h-4 mr-1" />Installer un réactif</Button></div>
      <Card>
        <CardHeader title="Consommation des automates" subtitle={`${autoCons.length} installation(s)`} />
        <div className="overflow-x-auto"><table className="w-full text-xs">
          <thead><tr className="text-left text-navy-500 border-b border-navy-100">{cols.map((c) => <th key={c} className="py-2 px-3 font-medium">{c}</th>)}</tr></thead>
          <tbody>
            {autoCons.map((a) => (
              <tr key={a.id} className="border-b border-navy-50 hover:bg-navy-50">
                <td className="py-2 px-3 text-navy-900 font-medium">{a.automateName}</td><td className="py-2 px-3 text-navy-700">{a.reagentName}</td><td className="py-2 px-3 text-navy-500 font-mono">{a.lotNumber}</td>
                <td className="py-2 px-3 text-navy-500">{formatDateShort(a.openDate)}</td><td className="py-2 px-3 text-navy-500">{formatDateShort(a.installDate)}</td>
                <td className="py-2 px-3 text-right text-navy-900 font-medium">{a.installedQty}</td><td className="py-2 px-3 text-right text-navy-600">{a.theoreticalTests}</td>
                <td className="py-2 px-3 text-right font-semibold text-navy-900">{a.testsPerformed}</td><td className="py-2 px-3 text-right text-navy-600">{a.controlsPerformed}</td>
                <td className="py-2 px-3 text-right text-navy-600">{a.calibrationsPerformed}</td><td className="py-2 px-3 text-right text-amber-600">{a.repeatedTests}</td>
                <td className="py-2 px-3 text-right text-red-600">{a.cancelledTests}</td><td className="py-2 px-3 text-right text-red-600">{a.technicalLosses}</td>
                <td className="py-2 px-3 text-right font-semibold text-medical-700">{a.theoreticalRemaining}</td><td className="py-2 px-3 text-right font-semibold text-turquoise-700">{a.observedRemaining}</td>
                <td className="py-2 px-3 text-navy-500">{a.removalDate ? formatDateShort(a.removalDate) : '—'}</td><td className="py-2 px-3 text-navy-600">{a.operator}</td>
              </tr>
            ))}
          </tbody>
        </table>{autoCons.length === 0 && <EmptyState icon={Cpu} title="Aucune consommation enregistrée" />}</div>
      </Card>
      {show && <InstallModal automates={automates} items={items} lots={lots} onClose={() => setShow(false)} onInstall={(c, m) => { setAutoCons((p) => [c, ...p]); setMovements((p) => [m, ...p]); setShow(false); }} />}
    </div>
  );
}

function InstallModal({ automates, items, lots, onClose, onInstall }: { automates: LabAutomate[]; items: StockItem[]; lots: StockLot[]; onClose: () => void; onInstall: (c: AutomateConsumption, m: StockMovement) => void }) {
  const [aid, setAid] = useState(''); const [rid, setRid] = useState(''); const [lid, setLid] = useState(''); const [qty, setQty] = useState('1'); const [tt, setTt] = useState('0');
  const aut = automates.find((a) => a.id === aid); const rea = items.find((i) => i.id === rid);
  const compat = items.filter((i) => !aut || i.automateCompatible === aut.name || i.automateCompatible === 'Tous');
  const fl = rea ? fefo(lots.filter((l) => l.itemId === rea.id && !l.blocked && !isExpired(l.expiryDate) && l.availableQty > 0)) : [];
  const q = parseInt(qty) || 0; const t = parseInt(tt) || 0;
  const install = () => { if (!aut || !rea) return; const lot = lid ? lots.find((l) => l.id === lid) : undefined; const td = todayStr(); onInstall({ id: `ac-${Date.now()}`, automateId: aut.id, automateName: aut.name, reagentId: rea.id, reagentName: rea.name, lotId: lot?.id || '', lotNumber: lot?.lotNumber || '', openDate: td, installDate: td, installedQty: q, theoreticalTests: t, testsPerformed: 0, controlsPerformed: 0, calibrationsPerformed: 0, repeatedTests: 0, cancelledTests: 0, technicalLosses: 0, theoreticalRemaining: t, observedRemaining: q, operator: 'M. Kouassi Marc' }, { id: `lm-${Date.now()}`, domain: 'lab', date: td, time: new Date().toTimeString().slice(0, 5), type: 'consommation-automate', itemId: rea.id, itemName: rea.name, lotId: lot?.id, lotNumber: lot?.lotNumber, quantity: q, unit: rea.unitManagement, origin: aut.name, destination: 'Consommation automate', author: `Automate ${aut.name}`, reference: `AC-${Date.now()}`, stockBefore: rea.availableStock, stockAfter: rea.availableStock - q, reason: 'Installation sur automate' }); };
  return (
    <Modal title="Installer un réactif sur automate" onClose={onClose}>
      <div className="space-y-3">
        <Select label="Automate" value={aid} onChange={setAid} required options={[{ value: '', label: '— Sélectionner —' }, ...automates.filter((a) => a.active).map((a) => ({ value: a.id, label: `${a.name} (${a.category})` }))]} />
        <Select label="Réactif" value={rid} onChange={setRid} required options={[{ value: '', label: '— Sélectionner —' }, ...compat.map((i) => ({ value: i.id, label: `${i.name} (stock: ${i.availableStock} ${i.unitManagement})` }))]} />
        {rea && <Select label="Lot (FEFO)" value={lid} onChange={setLid} options={[{ value: '', label: '— Aucun lot —' }, ...fl.map((l) => ({ value: l.id, label: `${l.lotNumber} — exp. ${formatDateShort(l.expiryDate)} (dispo: ${l.availableQty})` }))]} />}
        <Input label="Quantité installée" type="number" value={qty} onChange={setQty} required />
        <Input label="Tests théoriques" type="number" value={tt} onChange={setTt} placeholder="0" />
        {rea && rea.theoreticalTests != null && rea.theoreticalTests > 0 && <p className="text-xs text-navy-500">Tests théoriques par défaut : {rea.theoreticalTests}</p>}
        {rea && fl.length === 0 && <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg text-xs text-amber-700"><AlertTriangle className="w-4 h-4" />Aucun lot valide disponible.</div>}
        <div className="flex justify-end gap-2 pt-2"><Button variant="secondary" size="sm" onClick={onClose}>Annuler</Button><Button size="sm" onClick={install} disabled={!aut || !rea || q <= 0}><CheckCircle2 className="w-4 h-4 mr-1" />Installer</Button></div>
      </div>
    </Modal>
  );
}

// 8. TESTS
function Tests({ automates, autoCons }: { automates: LabAutomate[]; autoCons: AutomateConsumption[] }) {
  const sum = useMemo(() => automates.map((a) => { const cs = autoCons.filter((c) => c.automateId === a.id); const tp = cs.reduce((s, c) => s + c.testsPerformed, 0); const tt = cs.reduce((s, c) => s + c.theoreticalTests, 0); const eff = tt > 0 ? Math.round((tp / tt) * 100) : 0; return { a, tp, tt, ctrl: cs.reduce((s, c) => s + c.controlsPerformed, 0), cal: cs.reduce((s, c) => s + c.calibrationsPerformed, 0), rep: cs.reduce((s, c) => s + c.repeatedTests, 0), can: cs.reduce((s, c) => s + c.cancelledTests, 0), loss: cs.reduce((s, c) => s + c.technicalLosses, 0), eff, inst: cs.length }; }), [automates, autoCons]);
  const tot = sum.reduce((a, s) => ({ tp: a.tp + s.tp, tt: a.tt + s.tt, ctrl: a.ctrl + s.ctrl, cal: a.cal + s.cal, rep: a.rep + s.rep, can: a.can + s.can, loss: a.loss + s.loss, inst: a.inst + s.inst }), { tp: 0, tt: 0, ctrl: 0, cal: 0, rep: 0, can: 0, loss: 0, inst: 0 });
  const oEff = tot.tt > 0 ? Math.round((tot.tp / tot.tt) * 100) : 0;
  const sc = [{ l: 'Tests réalisés', v: tot.tp, c: 'text-navy-900' }, { l: 'Tests théoriques', v: tot.tt, c: 'text-navy-900' }, { l: 'Efficacité', v: `${oEff}%`, c: 'text-medical-600' }, { l: 'Contrôles', v: tot.ctrl, c: 'text-blue-600' }, { l: 'Calibrations', v: tot.cal, c: 'text-turquoise-600' }, { l: 'Tests répétés', v: tot.rep, c: 'text-amber-600' }, { l: 'Tests annulés', v: tot.can, c: 'text-red-600' }, { l: 'Pertes tech.', v: tot.loss, c: 'text-red-600' }];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">{sc.map((s) => <Card key={s.l} className="p-3"><p className="text-xs text-navy-500 font-medium">{s.l}</p><p className={`text-xl font-bold ${s.c}`}>{s.v}</p></Card>)}</div>
      <Card>
        <CardHeader title="Tests réalisés par automate" subtitle="Synthèse et indicateurs d'efficacité" />
        <div className="p-5 space-y-4">
          {sum.map((s) => (
            <div key={s.a.id} className="border border-navy-100 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3"><div className="flex items-center gap-2"><Cpu className="w-5 h-5 text-medical-600" /><div><p className="font-semibold text-navy-900">{s.a.name}</p><p className="text-xs text-navy-500">{s.a.category} — {s.inst} installation(s)</p></div></div><div className="flex items-center gap-2"><span className="text-sm text-navy-500">Efficacité</span><Badge color={s.eff >= 80 ? 'green' : s.eff >= 50 ? 'amber' : 'red'}>{s.eff}%</Badge></div></div>
              <div className="w-full bg-navy-100 rounded-full h-3 overflow-hidden mb-3"><div className="bg-gradient-to-r from-medical-400 to-medical-600 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(s.eff, 100)}%` }} /></div>
              <div className="grid grid-cols-3 sm:grid-cols-7 gap-2 text-sm">
                {[{ l: 'Tests réa.', v: s.tp, c: 'text-navy-900' }, { l: 'Tests théo.', v: s.tt, c: 'text-navy-600' }, { l: 'Contrôles', v: s.ctrl, c: 'text-blue-600' }, { l: 'Calib.', v: s.cal, c: 'text-turquoise-600' }, { l: 'Répétés', v: s.rep, c: 'text-amber-600' }, { l: 'Annulés', v: s.can, c: 'text-red-600' }, { l: 'Pertes', v: s.loss, c: 'text-red-600' }].map((b) => <div key={b.l} className="bg-navy-50 rounded-lg p-2 text-center"><p className="text-xs text-navy-500">{b.l}</p><p className={`text-lg font-bold ${b.c}`}>{b.v}</p></div>)}
              </div>
            </div>
          ))}
          {sum.length === 0 && <EmptyState icon={TestTube} title="Aucun test enregistré" />}
        </div>
      </Card>
    </div>
  );
}

// 9. RECONCILIATION
function Reconciliation({ recon, setRecon, toJustify, setToJustify }: { recon: LabReconciliation[]; setRecon: React.Dispatch<React.SetStateAction<LabReconciliation[]> >; toJustify: LabReconciliation | null; setToJustify: (r: LabReconciliation | null) => void }) {
  const [threshold, setThreshold] = useState(5);
  const sigCount = recon.filter((r) => r.gapPercentage > threshold).length;
  const cols = ['Automate', 'Réactif', 'Lot', 'Théo.', 'Presc.', 'Réa.', 'Ctrl.', 'Calib.', 'Rép.', 'Ann.', 'Conso théo.', 'Conso décl.', 'Conso réelle', 'Écart', 'Écart %', 'Classif.', ''];
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <Card className="p-3 flex items-center gap-3"><label className="text-sm text-navy-600 font-medium">Seuil d'alerte écart :</label><input type="number" value={threshold} onChange={(e) => setThreshold(parseInt(e.target.value) || 0)} className="w-16 px-2 py-1 rounded border border-navy-200 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-medical-400" /><span className="text-sm text-navy-500">%</span></Card>
        {sigCount > 0 && <div className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-lg text-sm text-red-700"><AlertTriangle className="w-4 h-4" />{sigCount} écart(s) {'>'} {threshold}%</div>}
      </div>
      <Card>
        <CardHeader title="Rapprochement des consommations" subtitle={`${recon.length} rapprochement(s)`} />
        <div className="overflow-x-auto"><table className="w-full text-xs">
          <thead><tr className="text-left text-navy-500 border-b border-navy-100">{cols.map((c) => <th key={c} className="py-2 px-3 font-medium">{c}</th>)}</tr></thead>
          <tbody>
            {recon.map((r) => { const over = r.gapPercentage > threshold; return (
              <tr key={r.id} className={`border-b border-navy-50 hover:bg-navy-50 ${over ? 'bg-red-50' : ''}`}>
                <td className="py-2 px-3 text-navy-900 font-medium">{r.automateName}</td><td className="py-2 px-3 text-navy-700">{r.reagentName}</td><td className="py-2 px-3 text-navy-500 font-mono">{r.lotNumber}</td>
                <td className="py-2 px-3 text-right text-navy-600">{r.theoreticalTests}</td><td className="py-2 px-3 text-right text-navy-600">{r.prescribedTests}</td><td className="py-2 px-3 text-right font-semibold text-navy-900">{r.performedTests}</td>
                <td className="py-2 px-3 text-right text-navy-600">{r.controlsQty}</td><td className="py-2 px-3 text-right text-navy-600">{r.calibrationsQty}</td><td className="py-2 px-3 text-right text-amber-600">{r.repeatedTests}</td><td className="py-2 px-3 text-right text-red-600">{r.cancelledTests}</td>
                <td className="py-2 px-3 text-right text-navy-600">{r.theoreticalConsumption}</td><td className="py-2 px-3 text-right text-navy-600">{r.declaredConsumption}</td><td className="py-2 px-3 text-right font-semibold text-navy-900">{r.realEstimatedConsumption}</td>
                <td className={`py-2 px-3 text-right font-bold ${over ? 'text-red-700' : 'text-navy-900'}`}>{r.gap}</td><td className={`py-2 px-3 text-right font-bold ${over ? 'text-red-700' : 'text-navy-900'}`}>{r.gapPercentage.toFixed(1)}%</td>
                <td className="py-2 px-3"><Badge color={bcRecCl(r.classification)}>{REC_CL[r.classification]}</Badge></td>
                <td className="py-2 px-3">{['ecart-significatif', 'a-investiguer', 'ecart-faible'].includes(r.classification) && <Button variant="ghost" size="sm" onClick={() => setToJustify(r)}><ShieldCheck className="w-4 h-4 mr-1" />Justifier</Button>}</td>
              </tr>
            );})}
          </tbody>
        </table>{recon.length === 0 && <EmptyState icon={Scale} title="Aucun rapprochement" />}</div>
      </Card>
      {toJustify && <JustifyModal rec={toJustify} onClose={() => setToJustify(null)} onJustify={(j, c) => { setRecon((p) => p.map((r) => r.id === toJustify.id ? { ...r, justification: j, causes: c, classification: 'cloture' } : r)); setToJustify(null); }} />}
    </div>
  );
}

function JustifyModal({ rec, onClose, onJustify }: { rec: LabReconciliation; onClose: () => void; onJustify: (j: string, c: string[]) => void }) {
  const [j, setJ] = useState(''); const [causes, setCauses] = useState<string[]>([]);
  const toggle = (v: string) => setCauses((p) => p.includes(v) ? p.filter((x) => x !== v) : [...p, v]);
  return (
    <Modal title={`Justification — ${rec.reagentName}`} onClose={onClose}>
      <div className="space-y-3">
        <div className="bg-navy-50 p-3 rounded-lg text-sm space-y-1"><div className="flex justify-between"><span className="text-navy-500">Écart:</span><span className="font-bold text-red-700">{rec.gap} tests</span></div><div className="flex justify-between"><span className="text-navy-500">Pourcentage:</span><span className="font-bold text-red-700">{rec.gapPercentage.toFixed(1)}%</span></div><div className="flex justify-between"><span className="text-navy-500">Classification:</span><Badge color={bcRecCl(rec.classification)}>{REC_CL[rec.classification]}</Badge></div></div>
        <div><SectionTitle>Causes de l'écart</SectionTitle><div className="grid grid-cols-2 gap-2">{REC_CAUSES.map((c) => <label key={c.value} className="flex items-center gap-2 p-2 rounded-lg border border-navy-100 hover:bg-navy-50 cursor-pointer"><input type="checkbox" checked={causes.includes(c.value)} onChange={() => toggle(c.value)} className="rounded border-navy-300 text-medical-600 focus:ring-medical-400" /><span className="text-sm text-navy-700">{c.label}</span></label>)}</div></div>
        <TextArea label="Justification détaillée" value={j} onChange={setJ} placeholder="Décrivez l'investigation et les actions correctives..." rows={4} required />
        <div className="flex justify-end gap-2 pt-2"><Button variant="secondary" size="sm" onClick={onClose}>Annuler</Button><Button size="sm" onClick={() => onJustify(j || 'Justification de démonstration', causes)} disabled={causes.length === 0}><CheckCircle2 className="w-4 h-4 mr-1" />Justifier et clôturer</Button></div>
      </div>
    </Modal>
  );
}

// 10. INVENTORIES
function Inventories({ invs, setInvs, items, show, setShow }: { invs: Inventory[]; setInvs: React.Dispatch<React.SetStateAction<Inventory[]> >; items: StockItem[]; show: boolean; setShow: (v: boolean) => void }) {
  const tl: Record<string, string> = { 'complet': 'Complet', 'tournant': 'Tournant', 'cible-categorie': 'Ciblé catégorie', 'cible-emplacement': 'Ciblé emplacement', 'cible-article': 'Ciblé article', 'comptage-lot': 'Comptage par lot' };
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button size="sm" onClick={() => setShow(true)}><Plus className="w-4 h-4 mr-1" />Nouvel inventaire</Button></div>
      {invs.map((inv) => (
        <Card key={inv.id}>
          <CardHeader title={inv.number} subtitle={`${formatDate(inv.date)} — ${tl[inv.type] || inv.type}`} action={<Badge color={inv.status === 'valide' ? 'green' : inv.status === 'cloture' ? 'navy' : 'amber'}>{inv.status === 'en-cours' ? 'En cours' : inv.status === 'valide' ? 'Validé' : 'Clôturé'}</Badge>} />
          <div className="p-5 space-y-3">
            {inv.validator && <p className="text-sm text-navy-500">Validé par {inv.validator}</p>}
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="text-left text-navy-500 border-b border-navy-100"><th className="py-2 pr-3 font-medium">Article</th><th className="py-2 pr-3 font-medium">Lot</th><th className="py-2 pr-3 font-medium text-right">Théorique</th><th className="py-2 pr-3 font-medium text-right">Compté</th><th className="py-2 pr-3 font-medium text-right">Écart</th><th className="py-2 pr-3 font-medium text-right">Valeur écart</th><th className="py-2 pr-3 font-medium">Motif</th><th className="py-2 pr-3 font-medium">Décision</th></tr></thead>
              <tbody>{inv.entries.map((e) => <tr key={e.id} className="border-b border-navy-50"><td className="py-2 pr-3 text-navy-900 font-medium">{e.itemName}</td><td className="py-2 pr-3 text-navy-500 font-mono text-xs">{e.lotNumber || '—'}</td><td className="py-2 pr-3 text-right text-navy-600">{e.theoreticalStock}</td><td className="py-2 pr-3 text-right font-semibold text-navy-900">{e.countedQty}</td><td className={`py-2 pr-3 text-right font-bold ${e.gap === 0 ? 'text-navy-600' : e.gap < 0 ? 'text-red-600' : 'text-green-600'}`}>{e.gap > 0 ? '+' : ''}{e.gap}</td><td className={`py-2 pr-3 text-right font-medium ${e.gapValue === 0 ? 'text-navy-600' : e.gapValue < 0 ? 'text-red-600' : 'text-green-600'}`}>{formatFCFA(e.gapValue)}</td><td className="py-2 pr-3 text-navy-500 text-xs max-w-xs truncate">{e.reason || '—'}</td><td className="py-2 pr-3 text-navy-600 text-xs">{e.decision || '—'}</td></tr>)}</tbody>
            </table></div>
          </div>
        </Card>
      ))}
      {invs.length === 0 && <Card><EmptyState icon={ClipboardList} title="Aucun inventaire" /></Card>}
      {show && <CreateInv items={items} onClose={() => setShow(false)} onCreate={(inv) => { setInvs((p) => [inv, ...p]); setShow(false); }} />}
    </div>
  );
}

function CreateInv({ items, onClose, onCreate }: { items: StockItem[]; onClose: () => void; onCreate: (inv: Inventory) => void }) {
  const [type, setType] = useState<Inventory['type']>('tournant'); const [sel, setSel] = useState<string[]>([]);
  const toggle = (id: string) => setSel((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  const create = () => { const entries = sel.map((id, i) => { const it = items.find((x) => x.id === id)!; const gap = Math.random() > 0.7 ? Math.floor(Math.random() * 5) - 2 : 0; return { id: `inv-e-${i}`, itemId: id, itemName: it.name, theoreticalStock: it.availableStock, countedQty: it.availableStock + gap, gap, gapValue: gap * it.lastPrice, reason: gap === 0 ? 'Aucun écart' : 'Écart de comptage', decision: gap === 0 ? 'Conforme' : 'À régulariser' }; }); onCreate({ id: `linv-${Date.now()}`, domain: 'lab', number: `INV-LAB-2026-${String(Date.now()).slice(-3)}`, type, date: todayStr(), entries, status: 'en-cours' }); };
  return (
    <Modal title="Nouvel inventaire" onClose={onClose}>
      <div className="space-y-3">
        <Select label="Type d'inventaire" value={type} onChange={(v) => setType(v as Inventory['type'])} options={[{ value: 'complet', label: 'Complet' }, { value: 'tournant', label: 'Tournant' }, { value: 'cible-categorie', label: 'Ciblé catégorie' }, { value: 'cible-emplacement', label: 'Ciblé emplacement' }, { value: 'cible-article', label: 'Ciblé article' }, { value: 'comptage-lot', label: 'Comptage par lot' }]} />
        <div><SectionTitle>Articles à inventorier</SectionTitle><div className="max-h-48 overflow-y-auto space-y-1.5 border border-navy-100 rounded-lg p-2">{items.map((it) => <label key={it.id} className="flex items-center gap-2 p-2 rounded hover:bg-navy-50 cursor-pointer"><input type="checkbox" checked={sel.includes(it.id)} onChange={() => toggle(it.id)} className="rounded border-navy-300 text-medical-600 focus:ring-medical-400" /><span className="text-sm text-navy-700 flex-1">{it.name}</span><span className="text-xs text-navy-500">Stock: {it.availableStock}</span></label>)}</div></div>
        <div className="flex justify-end gap-2 pt-2"><Button variant="secondary" size="sm" onClick={onClose}>Annuler</Button><Button size="sm" onClick={create} disabled={sel.length === 0}><CheckCircle2 className="w-4 h-4 mr-1" />Créer</Button></div>
      </div>
    </Modal>
  );
}

// 11. ALERTS
function Alerts({ alerts, setAlerts }: { alerts: StockAlert[]; setAlerts: React.Dispatch<React.SetStateAction<StockAlert[]> > }) {
  const [lv, setLv] = useState('all'); const [st, setSt] = useState('all');
  const filtered = useMemo(() => alerts.filter((a) => (lv === 'all' || a.level === lv) && (st === 'all' || a.status === st)), [alerts, lv, st]);
  const takeCharge = (id: string) => setAlerts((p) => p.map((a) => a.id === id ? { ...a, status: 'prise-en-charge', history: [...a.history, { timestamp: nowISO(), action: 'Prise en charge', detail: 'Alerte prise en charge' }] } : a));
  const resolve = (id: string) => setAlerts((p) => p.map((a) => a.id === id ? { ...a, status: 'resolue', history: [...a.history, { timestamp: nowISO(), action: 'Résolution', detail: 'Alerte résolue' }] } : a));
  const counts = { crit: alerts.filter((a) => a.level === 'critique').length, imp: alerts.filter((a) => a.level === 'important').length, surv: alerts.filter((a) => a.level === 'surveiller').length, new: alerts.filter((a) => a.status === 'nouvelle').length };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3"><p className="text-xs text-navy-500 font-medium">Critiques</p><p className="text-xl font-bold text-red-600">{counts.crit}</p></Card>
        <Card className="p-3"><p className="text-xs text-navy-500 font-medium">Importantes</p><p className="text-xl font-bold text-amber-600">{counts.imp}</p></Card>
        <Card className="p-3"><p className="text-xs text-navy-500 font-medium">À surveiller</p><p className="text-xl font-bold text-blue-600">{counts.surv}</p></Card>
        <Card className="p-3"><p className="text-xs text-navy-500 font-medium">Nouvelles</p><p className="text-xl font-bold text-red-600">{counts.new}</p></Card>
      </div>
      <Card>
        <CardHeader title="Centre d'alertes" subtitle={`${filtered.length} alerte(s)`} action={<div className="flex gap-2"><select value={lv} onChange={(e) => setLv(e.target.value)} className="px-2 py-1 rounded border border-navy-200 text-xs text-navy-900 bg-white focus:outline-none focus:ring-2 focus:ring-medical-400"><option value="all">Tous niveaux</option>{Object.entries(AL_LV).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select><select value={st} onChange={(e) => setSt(e.target.value)} className="px-2 py-1 rounded border border-navy-200 text-xs text-navy-900 bg-white focus:outline-none focus:ring-2 focus:ring-medical-400"><option value="all">Tous statuts</option>{Object.entries(AL_ST).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>} />
        <div className="p-5 space-y-3">
          {filtered.map((a) => (
            <div key={a.id} className={`p-4 rounded-lg border ${a.level === 'critique' ? 'border-red-200 bg-red-50' : a.level === 'important' ? 'border-amber-200 bg-amber-50' : 'border-blue-200 bg-blue-50'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${a.level === 'critique' ? 'bg-red-100' : a.level === 'important' ? 'bg-amber-100' : 'bg-blue-100'}`}>{a.level === 'critique' ? <AlertCircle className="w-5 h-5 text-red-600" /> : a.level === 'important' ? <AlertTriangle className="w-5 h-5 text-amber-600" /> : <BellRing className="w-5 h-5 text-blue-600" />}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1"><Badge color={bcAlLv(a.level)}>{AL_LV[a.level]}</Badge><Badge color={bcAlSt(a.status)}>{AL_ST[a.status]}</Badge><span className="text-xs text-navy-500">{formatDateShort(a.date)}</span></div>
                    <p className="text-sm font-medium text-navy-900">{a.itemName}</p>
                    {a.lotNumber && <p className="text-xs text-navy-500 font-mono">Lot: {a.lotNumber}</p>}
                    <p className="text-sm text-navy-600 mt-1">{a.cause}</p>
                    <div className="mt-2 text-xs text-navy-500 space-y-0.5"><p><span className="font-medium">Responsable:</span> {a.responsible}</p><p><span className="font-medium">Action proposée:</span> {a.proposedAction}</p></div>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  {a.status === 'nouvelle' && <Button variant="secondary" size="sm" onClick={() => takeCharge(a.id)}><Clock className="w-3.5 h-3.5 mr-1" />Prendre en charge</Button>}
                  {['nouvelle', 'prise-en-charge', 'en-cours'].includes(a.status) && <Button variant="primary" size="sm" onClick={() => resolve(a.id)}><CheckCircle2 className="w-3.5 h-3.5 mr-1" />Résoudre</Button>}
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <EmptyState icon={BellRing} title="Aucune alerte" subtitle="Aucune alerte ne correspond aux filtres" />}
        </div>
      </Card>
    </div>
  );
}

// 12. HISTORY
function History({ movements, items, automates, suppliers }: { movements: StockMovement[]; items: StockItem[]; automates: LabAutomate[]; suppliers: Supplier[] }) {
  const [pf, setPf] = useState('all'); const [if_, setIf] = useState('all'); const [tf, setTf] = useState('all'); const [af, setAf] = useState('all'); const [au, setAu] = useState('all'); const [sf, setSf] = useState('all');
  const authors = useMemo(() => Array.from(new Set(movements.map((m) => m.author))), [movements]);
  const filtered = useMemo(() => movements.filter((m) => {
    if (pf !== 'all') { const d = new Date(m.date); const diff = Math.floor((REF_DATE.getTime() - d.getTime()) / 86400000); if (pf === '7j' && diff > 7) return false; if (pf === '30j' && diff > 30) return false; }
    if (if_ !== 'all' && m.itemId !== if_) return false;
    if (tf !== 'all' && m.type !== tf) return false;
    if (af !== 'all' && m.origin !== automates.find((a) => a.id === af)?.name) return false;
    if (au !== 'all' && m.author !== au) return false;
    if (sf !== 'all') { const sup = suppliers.find((s) => s.id === sf); if (sup && m.origin !== sup.name) return false; }
    return true;
  }), [movements, pf, if_, tf, af, au, sf, automates, suppliers]);
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Filtres" />
        <div className="p-4 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Select label="Période" value={pf} onChange={setPf} options={[{ value: 'all', label: 'Toutes' }, { value: '7j', label: '7 derniers jours' }, { value: '30j', label: '30 derniers jours' }]} />
          <Select label="Article" value={if_} onChange={setIf} options={[{ value: 'all', label: 'Tous' }, ...items.map((i) => ({ value: i.id, label: i.name }))]} />
          <Select label="Type" value={tf} onChange={setTf} options={[{ value: 'all', label: 'Tous' }, ...Object.entries(MVT).map(([k, v]) => ({ value: k, label: v }))]} />
          <Select label="Automate" value={af} onChange={setAf} options={[{ value: 'all', label: 'Tous' }, ...automates.map((a) => ({ value: a.id, label: a.name }))]} />
          <Select label="Auteur" value={au} onChange={setAu} options={[{ value: 'all', label: 'Tous' }, ...authors.map((a) => ({ value: a, label: a }))]} />
          <Select label="Fournisseur" value={sf} onChange={setSf} options={[{ value: 'all', label: 'Tous' }, ...suppliers.map((s) => ({ value: s.id, label: s.name }))]} />
        </div>
      </Card>
      <Card>
        <CardHeader title="Historique des mouvements" subtitle={`${filtered.length} mouvement(s)`} />
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="text-left text-navy-500 border-b border-navy-100"><th className="py-2 px-4 font-medium">Date</th><th className="py-2 px-4 font-medium">Type</th><th className="py-2 px-4 font-medium">Article</th><th className="py-2 px-4 font-medium">Lot</th><th className="py-2 px-4 font-medium text-right">Qté</th><th className="py-2 px-4 font-medium text-right">Avant</th><th className="py-2 px-4 font-medium text-right">Après</th><th className="py-2 px-4 font-medium">Origine</th><th className="py-2 px-4 font-medium">Auteur</th><th className="py-2 px-4 font-medium">Motif</th></tr></thead>
          <tbody>
            {filtered.map((m) => { const en = ['reception-conforme', 'regularisation-positive', 'transfert-entrant', 'reintegration-quarantaine', 'retour-service', 'retour-patient'].includes(m.type); return (
              <tr key={m.id} className="border-b border-navy-50 hover:bg-navy-50"><td className="py-2 px-4 text-navy-600 whitespace-nowrap">{formatDateShort(m.date)} {m.time}</td><td className="py-2 px-4"><Badge color={en ? 'green' : m.type === 'consommation-automate' || m.type === 'consommation-manuelle' ? 'blue' : m.type === 'destruction' || m.type === 'retour-fournisseur' ? 'red' : 'amber'}>{MVT[m.type]}</Badge></td><td className="py-2 px-4 text-navy-900 font-medium">{m.itemName}</td><td className="py-2 px-4 text-navy-500 font-mono text-xs">{m.lotNumber || '—'}</td><td className={`py-2 px-4 text-right font-semibold ${en ? 'text-green-700' : 'text-red-700'}`}>{en ? '+' : '-'}{m.quantity}</td><td className="py-2 px-4 text-right text-navy-500">{m.stockBefore}</td><td className="py-2 px-4 text-right font-semibold text-navy-900">{m.stockAfter}</td><td className="py-2 px-4 text-navy-600">{m.origin || '—'}</td><td className="py-2 px-4 text-navy-600">{m.author}</td><td className="py-2 px-4 text-navy-500 text-xs max-w-xs truncate">{m.reason || '—'}</td></tr>
            );})}
          </tbody>
        </table>{filtered.length === 0 && <EmptyState icon={HistoryIcon} title="Aucun mouvement" subtitle="Aucun mouvement ne correspond aux filtres" />}</div>
      </Card>
    </div>
  );
}
