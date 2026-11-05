import { useEffect, useMemo, useState } from 'react';
import {
  X,
  Search,
  AlertTriangle,
  User,
  CheckCircle2,
  Plus,
  Trash2,
  Copy,
  FileText,
  FilePlus2,
  Receipt,
  UserCheck,
  ShieldCheck,
  Layers,
} from 'lucide-react';
import { Card, CardHeader, Button, Badge } from '@/components/ui';
import type {
  BillingDoc,
  BillingDocType,
  BillingLine,
  CoverageLineStatus,
} from '@/data/billingDocs';
import {
  CATEGORIES,
  COVERAGE_LABELS,
  COVERAGE_SITUATIONS,
  catalogue,
  patientInsuranceInfo,
  today,
  time,
} from '@/data/billingDocs';
import type { BillingTemplate } from '@/data/billingTemplates';
import { templateToBillingLines } from '@/data/billingTemplates';
import { ChangeTemplateConfirm, type ChangeTemplateChoice } from '@/components/BillingTemplates';
import { patients } from '@/data/patients';
import { formatFCFA, formatDate, calculateAge } from '@/utils/format';

interface NewBillingDocModalProps {
  onClose: () => void;
  onSave: (doc: BillingDoc) => void;
  nextNumbers: Record<BillingDocType, number>;
  initialPatientId?: string;
  initialTemplate?: BillingTemplate | null;
  initialDocType?: BillingDocType;
}

function newLine(insured: boolean): BillingLine {
  return {
    id: `l${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
    category: 'Consultation',
    code: '',
    description: '',
    quantity: 1,
    unitPrice: 0,
    discount: 0,
    coverage: insured ? 'couverte' : 'non-couverte',
    coverageRate: insured ? 80 : 0,
    origin: 'manuelle',
    lineStatus: 'prevu',
  };
}

export function NewBillingDocModal({ onClose, onSave, nextNumbers, initialPatientId, initialTemplate, initialDocType }: NewBillingDocModalProps) {
  const [step, setStep] = useState<'type' | 'form'>(initialDocType ? 'form' : 'type');
  const [docType, setDocType] = useState<BillingDocType>(initialDocType ?? 'facture');
  const [activeTemplate, setActiveTemplate] = useState<BillingTemplate | null>(initialTemplate ?? null);
  const [patientSearch, setPatientSearch] = useState(() => {
    const p = initialPatientId ? patients.find((x) => x.id === initialPatientId) : undefined;
    return p ? `${p.firstName} ${p.lastName}` : '';
  });
  const [patientId, setPatientId] = useState(initialPatientId ?? '');
  const [homonymConfirmed, setHomonymConfirmed] = useState(false);
  const [coverageSituation, setCoverageSituation] = useState('Patient assuré');
  const [episode, setEpisode] = useState('');
  const [service, setService] = useState('');
  const [doctor, setDoctor] = useState('');
  const [validityDays, setValidityDays] = useState('30');
  const [entryDate, setEntryDate] = useState('');
  const [exitDate, setExitDate] = useState('');
  const [conditions, setConditions] = useState('');
  const [lines, setLines] = useState<BillingLine[]>(() =>
    initialTemplate ? templateToBillingLines(initialTemplate.lines) : [newLine(true)],
  );
  const [error, setError] = useState<string | null>(null);
  const [confirmPatient, setConfirmPatient] = useState(false);
  const [showTemplateWarning, setShowTemplateWarning] = useState(false);

  const patient = patientId ? patients.find((p) => p.id === patientId) : undefined;
  const info = patient ? patientInsuranceInfo(patient) : null;

  const results = useMemo(() => {
    if (!patientSearch.trim()) return [];
    const q = patientSearch.toLowerCase();
    return patients.filter(
      (p) =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.phone.toLowerCase().includes(q) ||
        p.birthDate.includes(q),
    );
  }, [patientSearch]);

  const homonymGroups = useMemo(() => {
    const groups = new Map<string, typeof results>();
    results.forEach((p) => {
      const key = `${p.firstName} ${p.lastName}`.toLowerCase();
      groups.set(key, [...(groups.get(key) ?? []), p]);
    });
    return [...groups.values()].filter((g) => g.length > 1);
  }, [results]);

  function chooseType(t: BillingDocType) {
    setDocType(t);
    setStep('form');
  }

  function selectPatient(id: string) {
    const p = patients.find((x) => x.id === id)!;
    const ins = patientInsuranceInfo(p);
    setPatientId(id);
    setPatientSearch(`${p.firstName} ${p.lastName}`);
    setHomonymConfirmed(false);
    setCoverageSituation(ins.uninsured ? 'Patient non assuré' : 'Patient assuré');
    setLines((prev) =>
      prev.map((l) =>
        l.description
          ? l
          : { ...l, coverage: ins.uninsured ? 'non-couverte' : 'couverte', coverageRate: ins.coverageRate },
      ),
    );
  }

  useEffect(() => {
    if (!initialPatientId) return;
    const p = patients.find((x) => x.id === initialPatientId);
    if (p) selectPatient(p.id);
  }, [initialPatientId]);

  function changePatient() {
    setPatientId('');
    setPatientSearch('');
    setHomonymConfirmed(false);
  }

  function updateLine(id: string, patch: Partial<BillingLine>) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function addLine() {
    setLines((prev) => [...prev, newLine(info?.uninsured === false)]);
  }

  function duplicateLine(id: string) {
    const src = lines.find((l) => l.id === id);
    if (!src) return;
    setLines((prev) => [...prev, { ...src, id: `l${Date.now()}${Math.random().toString(36).slice(2, 6)}` }]);
  }

  function removeLine(id: string) {
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.id !== id) : prev));
  }

  const totals = useMemo(() => {
    const brut = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
    const remises = lines.reduce((s, l) => s + l.discount, 0);
    const net = lines.reduce((s, l) => s + Math.max(0, l.quantity * l.unitPrice - l.discount), 0);
    const partAssurance = lines.reduce((s, l) => {
      const n = Math.max(0, l.quantity * l.unitPrice - l.discount);
      if (l.coverage === 'couverte' || l.coverage === 'partiellement-couverte') return s + Math.round((n * l.coverageRate) / 100);
      return s;
    }, 0);
    const partPatient = net - partAssurance;
    return { brut, remises, net, partAssurance, partPatient };
  }, [lines]);

  function validate(): string | null {
    if (!patientId) return 'Veuillez sélectionner un patient.';
    if (homonymGroups.length > 0 && !homonymConfirmed) return 'Homonymie détectée — sélectionnez explicitement un patient.';
    if (lines.every((l) => !l.description.trim())) return 'Ajoutez au moins une prestation.';
    for (const l of lines) {
      if (!l.description.trim()) continue;
      if (l.quantity <= 0) return `Quantité invalide pour « ${l.description} ».`;
      if (l.unitPrice < 0) return `Prix négatif pour « ${l.description} ».`;
      if (l.coverageRate < 0 || l.coverageRate > 100) return 'Le taux de couverture doit être entre 0 et 100.';
    }
    return null;
  }

  function save() {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    const prefix = docType === 'cotation' ? 'COT' : docType === 'prefacture' ? 'PREF' : 'FAC';
    const number = `${prefix}-2026-${String(nextNumbers[docType]).padStart(4, '0')}`;
    const validLines = lines.filter((l) => l.description.trim());
    const doc: BillingDoc = {
      id: `doc${Date.now()}`,
      type: docType,
      number,
      date: today,
      time,
      patientId,
      episode: episode || 'EP-2026-XXXX',
      service: service || '—',
      doctor: doctor || '—',
      insurance: info?.insurer ?? '—',
      insuranceNumber: info?.insuredNumber ?? '',
      coverageRate: info?.coverageRate ?? 0,
      validityDays: docType === 'cotation' ? Number(validityDays) || 30 : undefined,
      entryDate: docType === 'prefacture' ? entryDate || undefined : undefined,
      exitDate: docType === 'prefacture' ? exitDate || undefined : undefined,
      lines: validLines,
      status: 'brouillon',
      payments: [],
      history: [{ timestamp: `${today} ${time}`, action: 'Document créé' }],
    };
    onSave(doc);
  }

  /* ── Step: choose type ── */
  if (step === 'type') {
    const cards: { type: BillingDocType; icon: typeof FileText; title: string; desc: string }[] = [
      { type: 'cotation', icon: FileText, title: 'Nouvelle cotation', desc: 'Estimation financière remise au patient avant réalisation des prestations.' },
      { type: 'prefacture', icon: FilePlus2, title: 'Nouvelle préfacture', desc: 'Document provisoire et modifiable en attente de la finalisation des soins.' },
      { type: 'facture', icon: Receipt, title: 'Nouvelle facture', desc: 'Facture définitive prête à être encaissée.' },
    ];
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/40 backdrop-blur-sm animate-fade-in">
        <Card className="w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
          <CardHeader
            title="Nouveau document de facturation"
            subtitle="Choisissez le type de document à créer"
            action={<button onClick={onClose} className="text-navy-400 hover:text-navy-700"><X className="w-5 h-5" /></button>}
          />
          <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            {cards.map((c) => {
              const Icon = c.icon;
              return (
                <button
                  key={c.type}
                  onClick={() => chooseType(c.type)}
                  className="text-left p-5 rounded-xl border border-navy-200 hover:border-medical-400 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-medical-400 bg-white"
                >
                  <div className="w-10 h-10 rounded-lg bg-medical-50 flex items-center justify-center mb-3">
                    <Icon className="w-5 h-5 text-medical-600" />
                  </div>
                  <p className="font-semibold text-navy-900 mb-1">{c.title}</p>
                  <p className="text-xs text-navy-500 leading-relaxed">{c.desc}</p>
                </button>
              );
            })}
          </div>
        </Card>
      </div>
    );
  }

  /* ── Step: form ── */
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/40 backdrop-blur-sm animate-fade-in">
      <Card className="w-full max-w-5xl mx-4 max-h-[92vh] overflow-y-auto">
        <CardHeader
          title={`Nouveau document de facturation — ${docType === 'cotation' ? 'Cotation' : docType === 'prefacture' ? 'Préfacture' : 'Facture'}`}
          subtitle="Complétez les informations du document"
          action={
            <button onClick={() => setStep('type')} className="text-sm text-medical-600 hover:text-medical-700 font-medium">
              Changer de type
            </button>
          }
        />
        <div className="p-5 space-y-5">
          {/* Template badge */}
          {activeTemplate && (
            <div className="flex items-center justify-between rounded-lg bg-turquoise-50 border border-turquoise-200 p-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-turquoise-600" />
                <span className="text-sm font-medium text-turquoise-700">Modèle utilisé : {activeTemplate.name}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowTemplateWarning(true)}>Changer de modèle</Button>
            </div>
          )}

          {/* Patient search */}
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1">Patient <span className="text-red-500">*</span></label>
            {!patientId ? (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-navy-400" />
                  <input
                    type="text"
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    placeholder="Rechercher par nom, prénom, dossier, téléphone ou date de naissance…"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-navy-200 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-medical-400 focus:border-transparent"
                  />
                </div>
                {homonymGroups.length > 0 && (
                  <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                    <p className="text-sm text-red-700 font-medium">Homonymie détectée — vérifiez la date de naissance, le dossier et le téléphone avant de sélectionner.</p>
                  </div>
                )}
                {results.length > 0 && (
                  <div className="mt-2 border border-navy-100 rounded-lg max-h-64 overflow-y-auto">
                    {results.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => selectPatient(p.id)}
                        className="w-full text-left px-3 py-2.5 hover:bg-navy-50 focus:outline-none focus:bg-navy-50 border-b border-navy-50 last:border-0"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-navy-900">{p.firstName} {p.lastName}</p>
                          <Badge color={p.insurance === 'Non assurée' ? 'navy' : 'green'}>{p.insurance}</Badge>
                        </div>
                        <p className="text-xs text-navy-500 mt-0.5">
                          Né(e) le {formatDate(p.birthDate)} · {calculateAge(p.birthDate)} ans · {p.gender === 'M' ? 'Homme' : 'Femme'}
                        </p>
                        <p className="text-xs text-navy-400">{p.code} · {p.phone}</p>
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="bg-navy-50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-medical-100 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-medical-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-navy-900">{patient?.firstName} {patient?.lastName}</p>
                    <p className="text-xs text-navy-500">
                      {patient?.code} · Né(e) le {patient ? formatDate(patient.birthDate) : ''} · {patient?.phone}
                    </p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={changePatient}>
                    <UserCheck className="w-3.5 h-3.5 mr-1" /> Changer de patient
                  </Button>
                </div>
                <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div><p className="text-navy-400">Prise en charge</p><p className="font-medium text-navy-800">{coverageSituation}</p></div>
                  <div><p className="text-navy-400">Assurance</p><p className="font-medium text-navy-800">{info?.insurer}</p></div>
                  <div><p className="text-navy-400">Taux de couverture</p><p className="font-medium text-navy-800">{info?.coverageRate}%</p></div>
                  <div><p className="text-navy-400">N° assuré</p><p className="font-medium text-navy-800 font-mono">{info?.insuredNumber}</p></div>
                </div>
              </div>
            )}
          </div>

          {/* Coverage card */}
          {patientId && (
            <div className="rounded-xl border border-navy-100 p-4">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="w-4 h-4 text-medical-600" />
                <p className="text-sm font-semibold text-navy-900">Couverture financière</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {COVERAGE_SITUATIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setCoverageSituation(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      coverageSituation === s ? 'bg-medical-600 text-white' : 'bg-navy-50 text-navy-600 hover:bg-navy-100'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {info?.uninsured && (
                <p className="mt-2 text-xs text-navy-500">Patient non assuré : 100 % du montant est affecté à la part patient.</p>
              )}
            </div>
          )}

          {/* Episode / service / doctor */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label={docType === 'prefacture' ? 'Épisode / séjour' : 'Épisode'} value={episode} onChange={setEpisode} placeholder="EP-2026-XXXX" />
            <Field label="Service" value={service} onChange={setService} placeholder="Ex : Médecine interne" />
            <Field label="Médecin / demandeur" value={doctor} onChange={setDoctor} placeholder="Ex : Dr Awa Koné" />
            {docType === 'cotation' && <Field label="Durée de validité (jours)" value={validityDays} onChange={setValidityDays} type="number" />}
            {docType === 'prefacture' && (
              <>
                <Field label="Date d'entrée" value={entryDate} onChange={setEntryDate} type="date" />
                <Field label="Date de sortie (prévue/réelle)" value={exitDate} onChange={setExitDate} type="date" />
              </>
            )}
          </div>

          {/* Lines */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-navy-700">Prestations</label>
              <Button variant="ghost" size="sm" onClick={addLine}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Ajouter une ligne
              </Button>
            </div>
            <div className="space-y-2">
              {lines.map((l) => (
                <LineRow
                  key={l.id}
                  line={l}
                  onChange={(patch) => updateLine(l.id, patch)}
                  onDuplicate={() => duplicateLine(l.id)}
                  onRemove={() => removeLine(l.id)}
                  canRemove={lines.length > 1}
                />
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-full md:w-80 space-y-2 text-sm border-t border-navy-100 pt-3">
              <TotalRow label="Montant brut" value={formatFCFA(totals.brut)} />
              <TotalRow label="Total des remises" value={`-${formatFCFA(totals.remises)}`} />
              <TotalRow label="Montant net" value={formatFCFA(totals.net)} strong />
              <TotalRow label="Sous-total part assurance" value={formatFCFA(totals.partAssurance)} />
              <TotalRow label="Sous-total part patient" value={formatFCFA(totals.partPatient)} />
            </div>
          </div>

          {/* Conditions */}
          {docType === 'cotation' && (
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">Conditions ou observations</label>
              <textarea
                value={conditions}
                onChange={(e) => setConditions(e.target.value)}
                rows={2}
                placeholder="Conditions de validité de la cotation…"
                className="w-full px-3 py-2 rounded-lg border border-navy-200 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-medical-400 focus:border-transparent resize-none"
              />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-navy-100">
            <Button variant="secondary" onClick={onClose}>Annuler</Button>
            <Button variant="primary" onClick={save}>
              <CheckCircle2 className="w-4 h-4 mr-1.5" /> Enregistrer le brouillon
            </Button>
          </div>
        </div>
      </Card>

      {/* Template change warning */}
      {showTemplateWarning && (
        <ChangeTemplateConfirm
          hasDuplicates={false}
          onChoose={(choice: ChangeTemplateChoice) => {
            setShowTemplateWarning(false);
            if (choice === 'replace') {
              setLines([]);
              setActiveTemplate(null);
              setStep('type');
            } else if (choice === 'add') {
              setActiveTemplate(null);
              setStep('type');
            }
          }}
        />
      )}

      {/* Homonym confirmation */}
      {confirmPatient && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-navy-950/50">
          <Card className="w-full max-w-sm mx-4">
            <CardHeader title="Confirmer le patient" />
            <div className="p-5">
              <p className="text-sm text-navy-600">Confirmez la sélection de ce patient homonyme.</p>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="secondary" onClick={() => setConfirmPatient(false)}>Annuler</Button>
                <Button variant="primary" onClick={() => { setConfirmPatient(false); setHomonymConfirmed(true); }}>Confirmer</Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-navy-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg border border-navy-200 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-medical-400 focus:border-transparent"
      />
    </div>
  );
}

function LineRow({ line, onChange, onDuplicate, onRemove, canRemove }: {
  line: BillingLine;
  onChange: (patch: Partial<BillingLine>) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const [search, setSearch] = useState('');
  const suggestions = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return catalogue.filter((c) => c.category === line.category && (c.label.toLowerCase().includes(q) || c.code.toLowerCase().includes(q))).slice(0, 6);
  }, [search, line.category]);

  function pickCatalogue(id: string) {
    const c = catalogue.find((x) => x.id === id);
    if (!c) return;
    onChange({ code: c.code, description: c.label, unitPrice: c.standardPrice });
    setSearch('');
  }

  return (
    <div className="rounded-lg border border-navy-100 p-3 bg-navy-50/40">
      <div className="grid grid-cols-12 gap-2 items-start">
        <div className="col-span-12 sm:col-span-2">
          <label className="block text-[11px] text-navy-500 mb-0.5">Catégorie</label>
          <select
            value={line.category}
            onChange={(e) => onChange({ category: e.target.value })}
            className="w-full px-2 py-1.5 rounded-md border border-navy-200 text-xs text-navy-900 focus:outline-none focus:ring-1 focus:ring-medical-400 bg-white"
          >
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="col-span-12 sm:col-span-3">
          <label className="block text-[11px] text-navy-500 mb-0.5">Recherche prestation</label>
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Saisir pour autocompléter…"
              className="w-full px-2 py-1.5 rounded-md border border-navy-200 text-xs text-navy-900 focus:outline-none focus:ring-1 focus:ring-medical-400"
            />
            {suggestions.length > 0 && (
              <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border border-navy-200 rounded-md shadow-lg max-h-44 overflow-y-auto">
                {suggestions.map((c) => (
                  <button key={c.id} onClick={() => pickCatalogue(c.id)} className="w-full text-left px-2 py-1.5 hover:bg-navy-50 border-b border-navy-50 last:border-0">
                    <p className="text-xs font-medium text-navy-900">{c.label}</p>
                    <p className="text-[10px] text-navy-400">{c.code} · {formatFCFA(c.standardPrice)}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="col-span-12 sm:col-span-2">
          <label className="block text-[11px] text-navy-500 mb-0.5">Code</label>
          <input type="text" value={line.code} onChange={(e) => onChange({ code: e.target.value })} className="w-full px-2 py-1.5 rounded-md border border-navy-200 text-xs text-navy-900 focus:outline-none focus:ring-1 focus:ring-medical-400" />
        </div>
        <div className="col-span-12 sm:col-span-5">
          <label className="block text-[11px] text-navy-500 mb-0.5">Description</label>
          <input type="text" value={line.description} onChange={(e) => onChange({ description: e.target.value })} placeholder="Désignation de la prestation" className="w-full px-2 py-1.5 rounded-md border border-navy-200 text-xs text-navy-900 focus:outline-none focus:ring-1 focus:ring-medical-400" />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-2 items-start mt-2">
        <div className="col-span-3 sm:col-span-1">
          <label className="block text-[11px] text-navy-500 mb-0.5">Qté</label>
          <input type="number" min={1} value={line.quantity} onChange={(e) => onChange({ quantity: Number(e.target.value) || 0 })} className="w-full px-2 py-1.5 rounded-md border border-navy-200 text-xs text-navy-900 focus:outline-none focus:ring-1 focus:ring-medical-400" />
        </div>
        <div className="col-span-4 sm:col-span-2">
          <label className="block text-[11px] text-navy-500 mb-0.5">Prix unitaire</label>
          <input type="number" min={0} value={line.unitPrice} onChange={(e) => onChange({ unitPrice: Number(e.target.value) || 0 })} className="w-full px-2 py-1.5 rounded-md border border-navy-200 text-xs text-navy-900 focus:outline-none focus:ring-1 focus:ring-medical-400" />
        </div>
        <div className="col-span-4 sm:col-span-2">
          <label className="block text-[11px] text-navy-500 mb-0.5">Remise</label>
          <input type="number" min={0} value={line.discount} onChange={(e) => onChange({ discount: Number(e.target.value) || 0 })} className="w-full px-2 py-1.5 rounded-md border border-navy-200 text-xs text-navy-900 focus:outline-none focus:ring-1 focus:ring-medical-400" />
        </div>
        <div className="col-span-4 sm:col-span-2">
          <label className="block text-[11px] text-navy-500 mb-0.5">Couverture</label>
          <select
            value={line.coverage}
            onChange={(e) => {
              const cov = e.target.value as CoverageLineStatus;
              onChange({ coverage: cov, coverageRate: cov === 'couverte' ? (line.coverageRate || 80) : cov === 'non-couverte' ? 0 : line.coverageRate });
            }}
            className="w-full px-2 py-1.5 rounded-md border border-navy-200 text-xs text-navy-900 focus:outline-none focus:ring-1 focus:ring-medical-400 bg-white"
          >
            {(Object.keys(COVERAGE_LABELS) as CoverageLineStatus[]).map((c) => (
              <option key={c} value={c}>{COVERAGE_LABELS[c]}</option>
            ))}
          </select>
        </div>
        <div className="col-span-4 sm:col-span-2">
          <label className="block text-[11px] text-navy-500 mb-0.5">Taux assurance %</label>
          <input
            type="number"
            min={0}
            max={100}
            value={line.coverageRate}
            disabled={line.coverage === 'non-couverte'}
            onChange={(e) => onChange({ coverageRate: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })}
            className="w-full px-2 py-1.5 rounded-md border border-navy-200 text-xs text-navy-900 focus:outline-none focus:ring-1 focus:ring-medical-400 disabled:bg-navy-100 disabled:text-navy-400"
          />
        </div>
        <div className="col-span-12 sm:col-span-3 flex items-end justify-end gap-1">
          <span className="text-xs font-semibold text-navy-900 mr-auto">
            {formatFCFA(Math.max(0, line.quantity * line.unitPrice - line.discount))}
          </span>
          <button onClick={onDuplicate} title="Dupliquer" className="p-1.5 text-navy-400 hover:text-medical-600 hover:bg-medical-50 rounded focus:outline-none focus:ring-1 focus:ring-medical-400"><Copy className="w-3.5 h-3.5" /></button>
          <button onClick={onRemove} disabled={!canRemove} title="Supprimer" className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-40 focus:outline-none focus:ring-1 focus:ring-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-12 gap-2 items-center">
        <div className="col-span-12 sm:col-span-6">
          <input
            type="text"
            value={line.observation ?? ''}
            onChange={(e) => onChange({ observation: e.target.value || undefined })}
            placeholder="Observation (optionnel)"
            className="w-full px-2 py-1.5 rounded-md border border-navy-200 text-xs text-navy-900 focus:outline-none focus:ring-1 focus:ring-medical-400"
          />
        </div>
        <div className="col-span-6 sm:col-span-3 text-right">
          <span className="text-[11px] text-turquoise-600">Part assurance : {formatFCFA(line.coverage === 'non-couverte' ? 0 : Math.round((Math.max(0, line.quantity * line.unitPrice - line.discount) * line.coverageRate) / 100))}</span>
        </div>
        <div className="col-span-6 sm:col-span-3 text-right">
          <span className="text-[11px] text-navy-600">Part patient : {formatFCFA(Math.max(0, line.quantity * line.unitPrice - line.discount) - (line.coverage === 'non-couverte' ? 0 : Math.round((Math.max(0, line.quantity * line.unitPrice - line.discount) * line.coverageRate) / 100)))}</span>
        </div>
      </div>
    </div>
  );
}

function TotalRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between py-1 ${strong ? 'font-bold text-navy-900 border-t border-navy-100 pt-2' : 'text-navy-600'}`}>
      <span>{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
