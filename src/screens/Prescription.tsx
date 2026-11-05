import { useMemo, useState } from 'react';
import {
  Pill,
  Plus,
  Trash2,
  CheckCircle2,
  FileText,
  ClipboardList,
  Loader2,
  X,
  Search,
  Printer,
  FileSignature,
  Layers,
  Info,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  Badge,
  StatusBadge,
  Button,
  TextArea,
  EmptyState,
} from '@/components/ui';
import type { Prescription } from '@/types';
import { patients, getPatientName } from '@/data/patients';
import { prescriptions as initialPrescriptions } from '@/data/prescriptions';
import { formatDate, formatFCFA } from '@/utils/format';
import {
  protocolLines as initialProtocolLines,
  drugFavorites,
  drugSuggestions,
  CATEGORY_META,
  CATEGORY_ORDER,
  type ProtocolPrescriptionLine,
} from '@/data/protocolPrescription';

type CategoryId = ProtocolPrescriptionLine['category'];
type ValidateState = 'editing' | 'validating' | 'validated';

interface FormState {
  drug: string;
  dosage: string;
  route: string;
  frequency: string;
  duration: string;
  hours: string[];
  start: string;
  type: 'systematique' | 'besoin';
  nurseNote: string;
  maxPerDay: string;
  quantity: string;
  unitPrice: string;
}

const emptyForm: FormState = {
  drug: '',
  dosage: '',
  route: 'IV',
  frequency: '',
  duration: '',
  hours: [],
  start: '17/10/2026 12:00',
  type: 'systematique',
  nurseNote: '',
  maxPerDay: '',
  quantity: '',
  unitPrice: '',
};

const HOUR_SLOTS = ['06:00', '12:00', '18:00', '00:00', '08:00', '14:00', '20:00', '02:00'];

const FAVORITE_ROUTES = ['IV', 'SC', 'IM', 'PO'];

const FREQUENCY_OPTIONS = [
  'toutes les 6 h',
  'toutes les 8 h',
  'toutes les 12 h',
  '1 / jour',
  '2 / jour',
  '3 / jour',
  'si douleur, max 3 / jour',
  'si besoin',
];

export default function PrescriptionScreen() {
  const [patientId, setPatientId] = useState('');
  const [medications, setMedications] = useState<ProtocolPrescriptionLine[]>([...initialProtocolLines]);
  const [form, setForm] = useState<FormState>({ ...emptyForm });
  const [drugSearch, setDrugSearch] = useState('');
  const [notes, setNotes] = useState('');
  const [validateState, setValidateState] = useState<ValidateState>('editing');
  const [localPrescriptions, setLocalPrescriptions] = useState<Prescription[]>(initialPrescriptions);
  const [lastValidatedId, setLastValidatedId] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  const patientOptions = [
    { value: '', label: '— Sélectionner un patient —' },
    ...patients.map((p) => ({
      value: p.id,
      label: `${p.firstName} ${p.lastName} (${p.code})`,
    })),
  ];

  const patientPrescriptions = localPrescriptions.filter((rx) => rx.patientId === patientId);

  const filteredSuggestions = useMemo(() => {
    if (!drugSearch.trim()) return drugSuggestions;
    const q = drugSearch.toLowerCase();
    return drugSuggestions.filter((d) => d.label.toLowerCase().includes(q));
  }, [drugSearch]);

  const unsignedCount = medications.filter((m) => m.status === 'brouillon').length;
  const totalLines = medications.length;
  const totalAmount = medications.reduce((sum, m) => sum + m.lineTotal, 0);
  const insuranceShare = Math.round(totalAmount * 0.8);
  const patientShare = totalAmount - insuranceShare;

  const grouped = useMemo(() => {
    const map: Record<CategoryId, ProtocolPrescriptionLine[]> = {
      pharmacie: [],
      infirmier: [],
      laboratoire: [],
      imagerie: [],
      medical: [],
    };
    medications.forEach((m) => map[m.category].push(m));
    return map;
  }, [medications]);

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setValidateState('editing');
  }

  function toggleHour(h: string) {
    setForm((prev) => ({
      ...prev,
      hours: prev.hours.includes(h) ? prev.hours.filter((x) => x !== h) : [...prev.hours, h].sort(),
    }));
    setValidateState('editing');
  }

  function resetForm() {
    setForm({ ...emptyForm });
    setDrugSearch('');
    setShowErrors(false);
  }

  function addLine(keepOpen: boolean) {
    if (!form.drug.trim()) {
      setShowErrors(true);
      return;
    }
    const unitPrice = parseFloat(form.unitPrice) || 0;
    const qty = parseInt(form.quantity, 10) || 1;
    const newLine: ProtocolPrescriptionLine = {
      id: `line-${Date.now()}`,
      category: 'pharmacie',
      drug: form.drug.trim(),
      dosage: form.dosage || '—',
      route: form.route,
      frequency: form.frequency || 'selon protocole',
      duration: form.duration || '—',
      hours: form.hours,
      start: form.start,
      type: form.type,
      nurseNote: form.nurseNote,
      maxPerDay: form.maxPerDay || undefined,
      quantityLabel: `${qty} unité(s)`,
      unitPrice,
      lineTotal: unitPrice * qty,
      status: 'brouillon',
    };
    setMedications((prev) => [newLine, ...prev]);
    if (keepOpen) {
      setForm((prev) => ({ ...emptyForm, drug: '', dosage: prev.dosage, route: prev.route }));
    } else {
      resetForm();
    }
    setValidateState('editing');
  }

  function removeLine(id: string) {
    setMedications((prev) => prev.filter((m) => m.id !== id));
  }

  function cancelDrafts() {
    setMedications((prev) => prev.filter((m) => m.status !== 'brouillon'));
    resetForm();
  }

  function handleValidate() {
    if (unsignedCount === 0) return;
    setValidateState('validating');
    setTimeout(() => {
      setMedications((prev) => prev.map((m) => ({ ...m, status: 'signee' as const })));
      const newId = `rx-local-${Date.now()}`;
      const newRx: Prescription = {
        id: newId,
        patientId: patientId || 'p001',
        date: new Date().toISOString().split('T')[0],
        doctor: "Dr. Kouadio N'Guessan",
        medications: medications.map((m) => ({
          name: m.drug,
          dosage: m.dosage,
          frequency: m.frequency,
          duration: m.duration,
          quantity: parseInt(m.quantityLabel, 10) || 1,
          instructions: m.nurseNote || [m.route, m.frequency, m.hours.join(' / ')].filter(Boolean).join(' · '),
        })),
        status: 'active',
        notes: notes.trim() || undefined,
      };
      setLocalPrescriptions((prev) => [newRx, ...prev]);
      setLastValidatedId(newId);
      setValidateState('validated');
    }, 1200);
  }

  const isValidating = validateState === 'validating';
  const isValidated = validateState === 'validated';

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-medical-100 flex items-center justify-center">
            <Pill className="w-5 h-5 text-medical-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-navy-900">Prescription électronique</h2>
            <p className="text-sm text-navy-500">Saisie à gauche, résumé en direct à droite</p>
          </div>
        </div>
        <div className="w-80">
          <label className="block text-xs font-medium text-navy-500 mb-1">Patient</label>
          <select
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-navy-200 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-medical-400 bg-white"
          >
            {patientOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Validating / success banners */}
      {isValidating && (
        <div className="flex items-center gap-3 bg-medical-50 border border-medical-200 rounded-xl px-5 py-4 animate-fade-in">
          <Loader2 className="w-5 h-5 text-medical-600 animate-spin" />
          <div>
            <p className="text-sm font-semibold text-medical-800">Signature en cours...</p>
            <p className="text-xs text-medical-600">Vérification des interactions médicamenteuses et horodatage</p>
          </div>
        </div>
      )}
      {isValidated && (
        <Card className="border-turquoise-300 bg-turquoise-50 animate-fade-in">
          <div className="flex items-center gap-3 px-5 py-4">
            <div className="w-10 h-10 rounded-full bg-turquoise-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-turquoise-600" />
            </div>
            <div>
              <p className="font-semibold text-turquoise-800">Prescription signée et transmise</p>
              <p className="text-sm text-turquoise-700">
                Les brouillons ont été validés. Pharmacie et laboratoire ont reçu leurs demandes.
              </p>
            </div>
            <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setValidateState('editing')}>
              Continuer
            </Button>
          </div>
        </Card>
      )}

      {/* Dual screen */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
        {/* LEFT — prescription entry */}
        <div>
          <Card>
            <div className="p-5 space-y-4">
              {/* Drug search */}
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1">
                  Médicament <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400" />
                  <input
                    type="text"
                    value={drugSearch}
                    onChange={(e) => setDrugSearch(e.target.value)}
                    placeholder="Recherche par DCI, nom commercial ou code"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-navy-200 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-medical-400 bg-white"
                  />
                </div>
                {showErrors && !form.drug.trim() && (
                  <p className="text-xs text-red-600 mt-1">Sélectionnez un médicament ci-dessous</p>
                )}
                <div className="mt-2 border border-navy-200 rounded-lg divide-y divide-navy-100 overflow-hidden">
                  {filteredSuggestions.length === 0 ? (
                    <p className="px-3 py-3 text-xs italic text-navy-400">Aucun médicament trouvé</p>
                  ) : (
                    filteredSuggestions.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => {
                          updateForm('drug', d.form);
                          setDrugSearch(d.label);
                          setShowErrors(false);
                        }}
                        className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left bg-white hover:bg-medical-50 transition-colors"
                      >
                        <span className="text-sm text-navy-900">{d.label}</span>
                        <Badge color={d.stockLevel === 'out' ? 'red' : d.stockLevel === 'low' ? 'amber' : 'green'}>
                          {d.stockLabel}
                        </Badge>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Dosage / route / frequency / duration */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-navy-700 mb-1">
                    Dose <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.dosage}
                    onChange={(e) => updateForm('dosage', e.target.value)}
                    placeholder="ex : 1 g"
                    className="w-full px-2.5 py-2 rounded-lg border border-navy-200 text-sm focus:outline-none focus:ring-2 focus:ring-medical-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-navy-700 mb-1">
                    Voie <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.route}
                    onChange={(e) => updateForm('route', e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg border border-navy-200 text-sm focus:outline-none focus:ring-2 focus:ring-medical-400 bg-white"
                  >
                    {FAVORITE_ROUTES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-navy-700 mb-1">
                    Fréquence <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.frequency}
                    onChange={(e) => updateForm('frequency', e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg border border-navy-200 text-sm focus:outline-none focus:ring-2 focus:ring-medical-400 bg-white"
                  >
                    <option value="">—</option>
                    {FREQUENCY_OPTIONS.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-navy-700 mb-1">
                    Durée <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.duration}
                    onChange={(e) => updateForm('duration', e.target.value)}
                    placeholder="ex : 3 jours"
                    className="w-full px-2.5 py-2 rounded-lg border border-navy-200 text-sm focus:outline-none focus:ring-2 focus:ring-medical-400"
                  />
                </div>
              </div>

              {/* Hours + start */}
              <div>
                <label className="block text-xs font-medium text-navy-700 mb-1.5">Horaires d'administration</label>
                <div className="flex flex-wrap gap-2">
                  {HOUR_SLOTS.map((h) => (
                    <button
                      key={h}
                      onClick={() => toggleHour(h)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                        form.hours.includes(h)
                          ? 'bg-medical-700 text-white'
                          : 'bg-navy-50 text-navy-600 hover:bg-navy-100'
                      }`}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div>
                  <label className="block text-xs font-medium text-navy-700 mb-1">Début</label>
                  <input
                    type="text"
                    value={form.start}
                    onChange={(e) => updateForm('start', e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg border border-navy-200 text-sm focus:outline-none focus:ring-2 focus:ring-medical-400"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-navy-700 mb-1">Type</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateForm('type', 'systematique')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        form.type === 'systematique' ? 'bg-navy-700 text-white' : 'bg-navy-50 text-navy-600 hover:bg-navy-100'
                      }`}
                    >
                      Systématique
                    </button>
                    <button
                      onClick={() => updateForm('type', 'besoin')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        form.type === 'besoin' ? 'bg-navy-700 text-white' : 'bg-navy-50 text-navy-600 hover:bg-navy-100'
                      }`}
                    >
                      Si besoin
                    </button>
                  </div>
                </div>
              </div>

              {/* Nurse note */}
              <div>
                <label className="block text-xs font-medium text-navy-700 mb-1">Consigne pour l'infirmier(ère)</label>
                <TextArea
                  label="Consigne pour l'infirmier(ère)"
                  value={form.nurseNote}
                  onChange={(v) => updateForm('nurseNote', v)}
                  placeholder="Consigne particulière à l'administration..."
                  rows={2}
                />
              </div>

              {/* Dose max + quantity + price */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-navy-700 mb-1">Dose max / 24 h</label>
                  <input
                    type="text"
                    value={form.maxPerDay}
                    onChange={(e) => updateForm('maxPerDay', e.target.value)}
                    placeholder="ex : 4 g"
                    className="w-full px-2.5 py-2 rounded-lg border border-navy-200 text-sm focus:outline-none focus:ring-2 focus:ring-medical-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-navy-700 mb-1">Quantité à délivrer</label>
                  <input
                    type="text"
                    value={form.quantity}
                    onChange={(e) => updateForm('quantity', e.target.value)}
                    placeholder="ex : 12"
                    className="w-full px-2.5 py-2 rounded-lg border border-navy-200 text-sm focus:outline-none focus:ring-2 focus:ring-medical-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-navy-700 mb-1">Prix unitaire (FCFA)</label>
                  <input
                    type="text"
                    value={form.unitPrice}
                    onChange={(e) => updateForm('unitPrice', e.target.value)}
                    placeholder="ex : 500"
                    className="w-full px-2.5 py-2 rounded-lg border border-navy-200 text-sm focus:outline-none focus:ring-2 focus:ring-medical-400"
                  />
                </div>
              </div>

              {/* Favorites */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-navy-500">Favoris du prescripteur :</span>
                {drugFavorites.map((fav) => (
                  <button
                    key={fav}
                    onClick={() => {
                      updateForm('drug', fav.split(' ')[0]);
                      setDrugSearch(fav);
                    }}
                    className="px-2.5 py-1 rounded-full border border-medical-200 bg-medical-50 text-xs font-medium text-medical-700 hover:bg-medical-100 transition-colors"
                  >
                    {fav}
                  </button>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={resetForm}>
                  Effacer
                </Button>
                <Button variant="secondary" size="sm" onClick={() => addLine(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Ajouter et continuer
                </Button>
                <Button size="sm" onClick={() => addLine(false)}>
                  <Plus className="w-4 h-4 mr-1" /> Ajouter au résumé
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* RIGHT — summary */}
        <Card className="xl:sticky xl:top-0">
          <div className="p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="font-semibold text-navy-900">Résumé des prescriptions</h3>
              <span className="text-xs text-navy-500">
                {totalLines} lignes · {unsignedCount} non signée(s)
              </span>
            </div>

            {totalLines === 0 ? (
              <EmptyState
                icon={FileText}
                title="Aucune ligne"
                subtitle="Ajoutez des lignes à gauche, elles apparaîtront ici en direct"
              />
            ) : (
              <div className="space-y-4 max-h-[560px] overflow-y-auto pr-1">
                {CATEGORY_ORDER.map((cat) => {
                  const lines = grouped[cat];
                  if (lines.length === 0) return null;
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-navy-100">
                        <span className="text-xs font-bold uppercase tracking-wide text-navy-700">
                          {CATEGORY_META[cat].emoji} {CATEGORY_META[cat].label}
                        </span>
                        <span className="text-xs text-navy-400">{lines.length}</span>
                      </div>
                      <div className="space-y-1.5">
                        {lines.map((line) => (
                          <div
                            key={line.id}
                            className={`group flex items-start justify-between gap-2 rounded-lg border px-3 py-2 transition-colors ${
                              line.status === 'brouillon'
                                ? 'border-amber-200 bg-amber-50'
                                : 'border-navy-100 bg-white hover:border-medical-200'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-navy-900 truncate">
                                {line.drug}
                                {line.dosage && line.dosage !== '—' ? ` · ${line.dosage}` : ''}
                                {line.route ? ` · ${line.route}` : ''}
                                {line.frequency ? ` · ${line.frequency}` : ''}
                                {line.duration ? ` · ${line.duration}` : ''}
                              </p>
                              {line.hours.length > 0 && (
                                <p className="text-xs text-navy-500">{line.hours.join(' · ')}</p>
                              )}
                              {line.nurseNote && (
                                <p className="text-xs text-navy-500 italic truncate">{line.nurseNote}</p>
                              )}
                              {line.quantityLabel && (
                                <p className="text-[11px] text-navy-400">{line.quantityLabel}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {line.lineTotal > 0 && (
                                <span className="text-xs text-navy-500 tabular-nums">
                                  {formatFCFA(line.lineTotal)}
                                </span>
                              )}
                              {line.status === 'brouillon' ? (
                                <Badge color="amber">Brouillon</Badge>
                              ) : (
                                <Badge color="green"><CheckCircle2 className="w-3 h-3" /> Signée</Badge>
                              )}
                              <button
                                onClick={() => removeLine(line.id)}
                                className="opacity-0 group-hover:opacity-100 text-navy-300 hover:text-red-600 transition-all"
                                title="Supprimer la ligne"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Totals */}
            <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-navy-100">
              <div className="text-center">
                <p className="text-[11px] text-navy-400">Montant prescrit</p>
                <p className="text-sm font-bold text-navy-900">{formatFCFA(totalAmount)}</p>
              </div>
              <div className="text-center">
                <p className="text-[11px] text-navy-400">Part assurance</p>
                <p className="text-sm font-bold text-medical-700">{formatFCFA(insuranceShare)}</p>
              </div>
              <div className="text-center">
                <p className="text-[11px] text-navy-400">Reste patient</p>
                <p className="text-sm font-bold text-amber-600">{formatFCFA(patientShare)}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Existing prescriptions */}
      <Card>
        <CardHeader
          title="Ordonnances existantes"
          subtitle={patientId ? `Prescriptions de ${getPatientName(patientId)}` : 'Sélectionnez un patient'}
          action={<FileText className="w-5 h-5 text-navy-400" />}
        />
        <div className="p-5">
          {!patientId ? (
            <EmptyState
              icon={FileText}
              title="Aucun patient sélectionné"
              subtitle="Choisissez un patient pour voir son historique d'ordonnances"
            />
          ) : patientPrescriptions.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Aucune ordonnance"
              subtitle="Aucune prescription enregistrée pour ce patient"
            />
          ) : (
            <div className="space-y-4">
              {patientPrescriptions.map((rx) => {
                const isNew = rx.id === lastValidatedId;
                return (
                  <div
                    key={rx.id}
                    className={`rounded-lg border p-4 transition-all ${
                      isNew
                        ? 'border-turquoise-300 bg-turquoise-50 animate-fade-in ring-2 ring-turquoise-200'
                        : 'border-navy-100 hover:border-medical-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-navy-900">{rx.doctor}</span>
                          <StatusBadge status={rx.status} />
                          {isNew && (
                            <Badge color="turquoise">
                              <CheckCircle2 className="w-3 h-3" />
                              Nouvelle
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-navy-500 mt-0.5">{formatDate(rx.date)}</p>
                      </div>
                      <Badge color="navy">{rx.medications.length} médicament(s)</Badge>
                    </div>
                    <div className="space-y-2">
                      {rx.medications.map((med, i) => (
                        <div key={i} className="flex items-start gap-3 rounded-md bg-white px-3 py-2">
                          <Pill className="w-4 h-4 text-medical-500 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-navy-900">{med.name} — {med.dosage}</p>
                            <p className="text-xs text-navy-500">{med.frequency} · {med.duration} · Qté: {med.quantity}</p>
                            {med.instructions && (
                              <p className="text-xs text-navy-400 italic mt-0.5">{med.instructions}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    {rx.notes && (
                      <div className="mt-3 rounded-md bg-amber-50 px-3 py-2">
                        <p className="text-xs text-amber-700">
                          <span className="font-medium">Note:</span> {rx.notes}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* Bottom bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap bg-white border border-navy-100 rounded-xl px-4 py-3">
        <div className="flex items-start gap-2 text-xs text-navy-500 max-w-xl">
          <Info className="w-4 h-4 flex-shrink-0 text-navy-400 mt-0.5" />
          <span>
            « Signer et transmettre » valide les {unsignedCount} ligne(s) en brouillon : la pharmacie et le
            laboratoire reçoivent leurs demandes, les soins rejoignent le plan de soins et les actes alimentent
            la facture de la venue.
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="ghost" size="sm" onClick={cancelDrafts} disabled={unsignedCount === 0}>
            <Trash2 className="w-4 h-4 mr-1" /> Annuler brouillons
          </Button>
          <Button variant="secondary" size="sm" disabled={totalLines === 0}>
            <Printer className="w-4 h-4 mr-1" /> Ordonnance
          </Button>
          <Button variant="secondary" size="sm" disabled={totalLines === 0}>
            <Layers className="w-4 h-4 mr-1" /> Créer un protocole
          </Button>
          <Button size="sm" onClick={handleValidate} disabled={unsignedCount === 0 || isValidating || isValidated}>
            {isValidating ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Signature...
              </>
            ) : isValidated ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-1.5" /> Signée
              </>
            ) : (
              <>
                <FileSignature className="w-4 h-4 mr-1.5" /> Signer et transmettre
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
