import { useState, useMemo } from 'react';
import {
  HeartPulse,
  Syringe,
  Bandage,
  Wind,
  Droplet,
  Eye,
  Activity,
  PenLine,
  CheckCircle2,
  Clock,
  Stethoscope,
  XCircle,
  Loader2,
  ArrowRightLeft,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  Badge,
  Button,
  Select,
  TextArea,
  Input,
  EmptyState,
  SectionTitle,
} from '@/components/ui';
import type { NursingCareRecord, Vitals } from '@/types';
import { patients, getPatientName } from '@/data/patients';
import { nursingCareRecords } from '@/data/nursing';
import { formatDate } from '@/utils/format';

const careTypes = [
  'Prise de constantes',
  'Administration de traitement',
  'Pansement',
  'Nébulisation',
  'Prise de sang',
  'Surveillance',
];

const careTypeIcons: Record<string, typeof HeartPulse> = {
  'Prise de constantes': HeartPulse,
  'Administration de traitement': Syringe,
  'Pansement': Bandage,
  'Nébulisation': Wind,
  'Prise de sang': Droplet,
  'Surveillance': Eye,
};

const emptyVitals: Vitals = {
  temperature: 0,
  bloodPressureSystolic: 0,
  bloodPressureDiastolic: 0,
  heartRate: 0,
  respiratoryRate: 0,
  oxygenSaturation: 0,
  weight: 0,
  height: 0,
  painScore: 0,
};

const nonAdminReasons = [
  'Patient en consultation',
  'Voie veineuse impossible',
  'Patient refus',
  'Médicament non disponible en pharmacie',
  'Vomissements',
  'Autre',
];

interface LocalRecord extends NursingCareRecord {
  notAdministered?: boolean;
  notAdminReason?: string;
  isNew?: boolean;
}

export default function NursingCareScreen() {
  const [patientId, setPatientId] = useState('');
  const [careType, setCareType] = useState(careTypes[0]);
  const [description, setDescription] = useState('');
  const [showVitals, setShowVitals] = useState(false);
  const [vitals, setVitals] = useState<Vitals>({ ...emptyVitals });
  const [signState, setSignState] = useState<'idle' | 'signing' | 'signed'>('idle');
  const [records, setRecords] = useState<LocalRecord[]>(nursingCareRecords);
  const [notAdministered, setNotAdministered] = useState(false);
  const [notAdminReason, setNotAdminReason] = useState('');
  const [handoverText, setHandoverText] = useState('');
  const [handoverSaved, setHandoverSaved] = useState(false);
  const [lastRecordId, setLastRecordId] = useState<string | null>(null);

  const patientOptions = [
    { value: '', label: '— Sélectionner un patient —' },
    ...patients.map((p) => ({
      value: p.id,
      label: `${p.firstName} ${p.lastName} (${p.code})`,
    })),
  ];

  const careTypeOptions = careTypes.map((t) => ({ value: t, label: t }));

  const patientRecords = records.filter((r) => r.patientId === patientId);

  // Vitals curve data — collect all records with vitals for this patient
  const vitalsSeries = useMemo(() => {
    return patientRecords
      .filter((r) => r.vitals && r.vitals.temperature > 0)
      .map((r) => ({
        time: `${r.time}`,
        temp: r.vitals!.temperature,
        hr: r.vitals!.heartRate,
        spo2: r.vitals!.oxygenSaturation,
        taSys: r.vitals!.bloodPressureSystolic,
        taDia: r.vitals!.bloodPressureDiastolic,
      }))
      .reverse(); // chronological order
  }, [patientRecords]);

  function resetForm() {
    setCareType(careTypes[0]);
    setDescription('');
    setShowVitals(false);
    setVitals({ ...emptyVitals });
    setSignState('idle');
    setNotAdministered(false);
    setNotAdminReason('');
  }

  function handleSign() {
    if (!patientId || !description.trim()) return;
    if (notAdministered && !notAdminReason.trim()) return;
    setSignState('signing');
    setTimeout(() => {
      const newId = `n${Date.now()}`;
      const newRecord: LocalRecord = {
        id: newId,
        patientId,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        nurse: 'Inf. Aya Koné',
        careType,
        description: notAdministered
          ? `Administration non réalisée — Motif: ${notAdminReason}. ${description}`
          : description,
        vitals: showVitals && !notAdministered && vitals.temperature > 0 ? vitals : undefined,
        signature: true,
        notAdministered: notAdministered || undefined,
        notAdminReason: notAdministered ? notAdminReason : undefined,
        isNew: true,
      };
      setRecords([newRecord, ...records]);
      setLastRecordId(newId);
      setSignState('signed');
      setTimeout(() => {
        resetForm();
      }, 1800);
    }, 1000);
  }

  function handleHandoverSave() {
    if (!handoverText.trim()) return;
    setHandoverSaved(true);
    setTimeout(() => setHandoverSaved(false), 3000);
  }

  const updateVital = (field: keyof Vitals, value: string) => {
    setVitals((prev) => ({ ...prev, [field]: Number(value) || 0 }));
  };

  // Vitals curve rendering
  function VitalsCurve() {
    if (vitalsSeries.length === 0) {
      return (
        <EmptyState
          icon={TrendingUp}
          title="Pas encore de constantes"
          subtitle="Les constantes enregistrées apparaîtront sous forme de courbe"
        />
      );
    }

    const width = 100;
    const height = 100;
    const padding = 8;
    const chartW = width - padding * 2;
    const chartH = height - padding * 2;

    const tempData = vitalsSeries.map((d) => d.temp);
    const hrData = vitalsSeries.map((d) => d.hr);
    const spo2Data = vitalsSeries.map((d) => d.spo2);

    const tempMin = 34, tempMax = 42;
    const hrMin = 40, hrMax = 140;
    const spo2Min = 85, spo2Max = 100;

    function toPoints(data: number[], min: number, max: number): string {
      if (data.length === 0) return '';
      if (data.length === 1) data = [data[0], data[0]];
      return data
        .map((v, i) => {
          const x = padding + (i / (data.length - 1)) * chartW;
          const y = padding + chartH - ((v - min) / (max - min)) * chartH;
          return `${x},${y}`;
        })
        .join(' ');
    }

    const tempPoints = toPoints(tempData, tempMin, tempMax);
    const hrPoints = toPoints(hrData, hrMin, hrMax);
    const spo2Points = toPoints(spo2Data, spo2Min, spo2Max);

    return (
      <div className="space-y-4">
        <div className="relative">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40" preserveAspectRatio="none">
            {/* Grid lines */}
            {[0, 25, 50, 75, 100].map((pct) => (
              <line
                key={pct}
                x1={padding} y1={padding + (pct / 100) * chartH}
                x2={width - padding} y2={padding + (pct / 100) * chartH}
                stroke="#e2e8f0" strokeWidth="0.3" strokeDasharray="1,1"
              />
            ))}
            {/* Temp curve */}
            <polyline points={tempPoints} fill="none" stroke="#ef4444" strokeWidth="0.8" strokeLinejoin="round" strokeLinecap="round" />
            {/* HR curve */}
            <polyline points={hrPoints} fill="none" stroke="#1d76db" strokeWidth="0.8" strokeLinejoin="round" strokeLinecap="round" />
            {/* SpO2 curve */}
            <polyline points={spo2Points} fill="none" stroke="#14a8a3" strokeWidth="0.8" strokeLinejoin="round" strokeLinecap="round" />
            {/* Data points */}
            {vitalsSeries.map((d, i) => {
              const x = padding + (i / Math.max(vitalsSeries.length - 1, 1)) * chartW;
              const yTemp = padding + chartH - ((d.temp - tempMin) / (tempMax - tempMin)) * chartH;
              return <circle key={i} cx={x} cy={yTemp} r="0.8" fill="#ef4444" />;
            })}
          </svg>
        </div>
        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-red-500 rounded" />
            <span className="text-navy-600">Température (°C)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-medical-600 rounded" />
            <span className="text-navy-600">Fréquence cardiaque (bpm)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-turquoise-500 rounded" />
            <span className="text-navy-600">SpO₂ (%)</span>
          </div>
        </div>
        {/* Values table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-navy-100 text-left text-navy-400">
                <th className="py-1.5 pr-3 font-medium">Heure</th>
                <th className="py-1.5 pr-3 font-medium">T° (°C)</th>
                <th className="py-1.5 pr-3 font-medium">FC (bpm)</th>
                <th className="py-1.5 pr-3 font-medium">TA (mmHg)</th>
                <th className="py-1.5 pr-3 font-medium">SpO₂ (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-50">
              {vitalsSeries.map((d, i) => (
                <tr key={i} className="hover:bg-navy-50">
                  <td className="py-1.5 pr-3 text-navy-500 tabular-nums">{d.time}</td>
                  <td className="py-1.5 pr-3 text-navy-900 font-medium tabular-nums">{d.temp}</td>
                  <td className="py-1.5 pr-3 text-navy-900 font-medium tabular-nums">{d.hr}</td>
                  <td className="py-1.5 pr-3 text-navy-900 font-medium tabular-nums">{d.taSys}/{d.taDia}</td>
                  <td className="py-1.5 pr-3 text-navy-900 font-medium tabular-nums">{d.spo2}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-medical-100 flex items-center justify-center">
          <HeartPulse className="w-5 h-5 text-medical-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-navy-900">Soins infirmiers</h2>
          <p className="text-sm text-navy-500">Enregistrer et consulter les soins dispensés</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* New care form */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader
              title="Nouveau soin"
              subtitle="Enregistrer un acte de soin"
              action={<Stethoscope className="w-5 h-5 text-navy-400" />}
            />
            <div className="p-5 space-y-4">
              {/* Patient selector */}
              <div className="max-w-full">
                <label className="block text-sm font-medium text-navy-700 mb-1">
                  Patient <span className="text-red-500">*</span>
                </label>
                <select
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-navy-200 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-medical-400 focus:border-transparent bg-white"
                >
                  {patientOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <Select
                label="Type de soin"
                value={careType}
                onChange={setCareType}
                options={careTypeOptions}
                required
              />

              <TextArea
                label="Description"
                value={description}
                onChange={setDescription}
                placeholder="Décrivez le soin dispensé, observations cliniques..."
                rows={3}
                required
              />

              {/* Non-administered toggle */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notAdministered}
                    onChange={(e) => setNotAdministered(e.target.checked)}
                    className="w-4 h-4 rounded text-red-600 focus:ring-red-400"
                  />
                  <span className="text-sm font-medium text-navy-700 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5 text-red-500" />
                    Administration non réalisée
                  </span>
                </label>
              </div>

              {/* Non-admin reason */}
              {notAdministered && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-2 animate-fade-in">
                  <SectionTitle>
                    <span className="flex items-center gap-1.5 text-red-700">
                      <XCircle className="w-3.5 h-3.5" />
                      Motif de non-réalisation
                    </span>
                  </SectionTitle>
                  <select
                    value={notAdminReason}
                    onChange={(e) => setNotAdminReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-red-200 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"
                  >
                    <option value="">— Sélectionner un motif —</option>
                    {nonAdminReasons.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  {notAdminReason === 'Autre' && (
                    <input
                      type="text"
                      placeholder="Précisez le motif..."
                      className="w-full px-3 py-2 rounded-lg border border-red-200 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-red-400"
                      onChange={(e) => setNotAdminReason(e.target.value)}
                    />
                  )}
                </div>
              )}

              {/* Vitals toggle */}
              {!notAdministered && (
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showVitals}
                      onChange={(e) => setShowVitals(e.target.checked)}
                      className="w-4 h-4 rounded text-medical-600 focus:ring-medical-400"
                    />
                    <span className="text-sm font-medium text-navy-700">
                      Enregistrer les constantes vitales
                    </span>
                  </label>
                </div>
              )}

              {/* Vitals fields */}
              {showVitals && !notAdministered && (
                <div className="rounded-lg border border-navy-100 p-4 space-y-3 animate-fade-in">
                  <SectionTitle>Constantes vitales</SectionTitle>
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Température (°C)" type="number" value={vitals.temperature ? String(vitals.temperature) : ''} onChange={(v) => updateVital('temperature', v)} />
                    <Input label="Fréquence cardiaque (bpm)" type="number" value={vitals.heartRate ? String(vitals.heartRate) : ''} onChange={(v) => updateVital('heartRate', v)} />
                    <Input label="TA systolique (mmHg)" type="number" value={vitals.bloodPressureSystolic ? String(vitals.bloodPressureSystolic) : ''} onChange={(v) => updateVital('bloodPressureSystolic', v)} />
                    <Input label="TA diastolique (mmHg)" type="number" value={vitals.bloodPressureDiastolic ? String(vitals.bloodPressureDiastolic) : ''} onChange={(v) => updateVital('bloodPressureDiastolic', v)} />
                    <Input label="Fréquence resp. (/min)" type="number" value={vitals.respiratoryRate ? String(vitals.respiratoryRate) : ''} onChange={(v) => updateVital('respiratoryRate', v)} />
                    <Input label="SpO₂ (%)" type="number" value={vitals.oxygenSaturation ? String(vitals.oxygenSaturation) : ''} onChange={(v) => updateVital('oxygenSaturation', v)} />
                    <Input label="Poids (kg)" type="number" value={vitals.weight ? String(vitals.weight) : ''} onChange={(v) => updateVital('weight', v)} />
                    <Input label="Douleur (0-10)" type="number" value={vitals.painScore ? String(vitals.painScore) : ''} onChange={(v) => updateVital('painScore', v)} />
                  </div>
                </div>
              )}

              {/* Sign button */}
              <div className="pt-2 border-t border-navy-100">
                {signState === 'signed' ? (
                  <div className="flex items-center gap-2 rounded-lg bg-turquoise-50 border border-turquoise-200 px-4 py-3 animate-fade-in">
                    <CheckCircle2 className="w-5 h-5 text-turquoise-600" />
                    <span className="text-sm font-medium text-turquoise-800">
                      {notAdministered ? 'Non-réalisation signée et enregistrée' : 'Soin signé et enregistré'}
                    </span>
                  </div>
                ) : signState === 'signing' ? (
                  <div className="flex items-center gap-2 rounded-lg bg-medical-50 border border-medical-200 px-4 py-3 animate-fade-in">
                    <Loader2 className="w-5 h-5 text-medical-600 animate-spin" />
                    <span className="text-sm font-medium text-medical-800">Signature en cours...</span>
                  </div>
                ) : (
                  <Button
                    variant={notAdministered ? 'danger' : 'turquoise'}
                    size="lg"
                    className="w-full"
                    onClick={handleSign}
                    disabled={!patientId || !description.trim() || (notAdministered && !notAdminReason.trim())}
                  >
                    <PenLine className="w-4 h-4 mr-1.5" />
                    {notAdministered ? 'Signer la non-réalisation' : 'Signer le soin'}
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Timeline + curve + handover */}
        <div className="lg:col-span-2 space-y-6">
          {/* Vitals curve */}
          {patientId && (
            <Card>
              <CardHeader
                title="Courbe de constantes"
                subtitle={patientId ? `Évolution pour ${getPatientName(patientId)}` : 'Sélectionnez un patient'}
                action={<TrendingUp className="w-5 h-5 text-navy-400" />}
              />
              <div className="p-5">
                <VitalsCurve />
              </div>
            </Card>
          )}

          {/* Handover transmission */}
          {patientId && (
            <Card>
              <CardHeader
                title="Transmission de relève"
                subtitle="Notes de transmission à l'équipe suivante"
                action={<ArrowRightLeft className="w-5 h-5 text-navy-400" />}
              />
              <div className="p-5 space-y-3">
                <TextArea
                  label="Notes de relève"
                  value={handoverText}
                  onChange={setHandoverText}
                  placeholder="Éléments à transmettre à l'équipe suivante: surveillance particulière, médicaments en attente, état du patient..."
                  rows={4}
                />
                <div className="flex items-center justify-between">
                  {handoverSaved ? (
                    <div className="flex items-center gap-2 text-sm text-turquoise-700 font-medium animate-fade-in">
                      <CheckCircle2 className="w-4 h-4" />
                      Relève transmise et enregistrée
                    </div>
                  ) : (
                    <span className="text-xs text-navy-400">La relève sera horodatée à la validation</span>
                  )}
                  <Button
                    variant="turquoise"
                    size="md"
                    onClick={handleHandoverSave}
                    disabled={!handoverText.trim() || handoverSaved}
                  >
                    <ArrowRightLeft className="w-4 h-4 mr-1.5" />
                    {handoverSaved ? 'Transmise' : 'Transmettre la relève'}
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Timeline */}
          <Card>
            <CardHeader
              title="Historique des soins"
              subtitle={patientId ? `Soins de ${getPatientName(patientId)}` : 'Sélectionnez un patient'}
              action={<Activity className="w-5 h-5 text-navy-400" />}
            />
            <div className="p-5">
              {!patientId ? (
                <EmptyState
                  icon={HeartPulse}
                  title="Aucun patient sélectionné"
                  subtitle="Choisissez un patient pour consulter l'historique des soins"
                />
              ) : patientRecords.length === 0 ? (
                <EmptyState
                  icon={HeartPulse}
                  title="Aucun soin enregistré"
                  subtitle="Aucun acte de soin pour ce patient"
                />
              ) : (
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-navy-100" />
                  <div className="space-y-4">
                    {patientRecords.map((record) => {
                      const Icon = record.notAdministered ? XCircle : (careTypeIcons[record.careType] || Activity);
                      return (
                        <div key={record.id} className="relative pl-12">
                          <div className={`absolute left-0 top-1 w-8 h-8 rounded-full flex items-center justify-center ring-4 ring-white ${
                            record.notAdministered ? 'bg-red-100' : 'bg-medical-100'
                          } ${record.isNew ? 'animate-pulse-soft' : ''}`}>
                            <Icon className={`w-4 h-4 ${record.notAdministered ? 'text-red-600' : 'text-medical-600'}`} />
                          </div>

                          <div className={`rounded-lg border p-4 transition-all ${
                            record.isNew
                              ? 'border-turquoise-300 bg-turquoise-50 animate-fade-in'
                              : record.notAdministered
                              ? 'border-red-200 bg-red-50'
                              : 'border-navy-100 hover:border-medical-200'
                          }`}>
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5 text-navy-400" />
                                <span className="text-xs text-navy-500">
                                  {formatDate(record.date)} · {record.time}
                                </span>
                              </div>
                              {record.signature ? (
                                <Badge color={record.notAdministered ? 'red' : 'green'}>
                                  <CheckCircle2 className="w-3 h-3" />
                                  Signé
                                </Badge>
                              ) : (
                                <Badge color="amber">
                                  <PenLine className="w-3 h-3" />
                                  Non signé
                                </Badge>
                              )}
                            </div>

                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-semibold text-navy-900">
                                {record.careType}
                              </span>
                              {record.notAdministered && (
                                <Badge color="red">
                                  <XCircle className="w-3 h-3" />
                                  Non réalisé
                                </Badge>
                              )}
                              <span className="text-xs text-navy-400">·</span>
                              <span className="text-xs text-navy-500">{record.nurse}</span>
                            </div>

                            <p className="text-sm text-navy-700 mb-2">{record.description}</p>

                            {record.notAdminReason && (
                              <div className="mt-2 rounded-md bg-red-100 px-3 py-1.5">
                                <p className="text-xs text-red-700">
                                  <span className="font-semibold">Motif:</span> {record.notAdminReason}
                                </p>
                              </div>
                            )}

                            {record.vitals && (
                              <div className="mt-3 rounded-md bg-navy-50 p-3">
                                <p className="text-xs font-medium text-navy-500 mb-2">Constantes vitales:</p>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                  <div><span className="text-navy-400">T°:</span> <span className="font-medium text-navy-900">{record.vitals.temperature}°C</span></div>
                                  <div><span className="text-navy-400">TA:</span> <span className="font-medium text-navy-900">{record.vitals.bloodPressureSystolic}/{record.vitals.bloodPressureDiastolic}</span></div>
                                  <div><span className="text-navy-400">FC:</span> <span className="font-medium text-navy-900">{record.vitals.heartRate} bpm</span></div>
                                  <div><span className="text-navy-400">FR:</span> <span className="font-medium text-navy-900">{record.vitals.respiratoryRate}/min</span></div>
                                  <div><span className="text-navy-400">SpO₂:</span> <span className="font-medium text-navy-900">{record.vitals.oxygenSaturation}%</span></div>
                                  <div><span className="text-navy-400">Poids:</span> <span className="font-medium text-navy-900">{record.vitals.weight} kg</span></div>
                                  <div><span className="text-navy-400">Taille:</span> <span className="font-medium text-navy-900">{record.vitals.height} cm</span></div>
                                  <div><span className="text-navy-400">Douleur:</span> <span className="font-medium text-navy-900">{record.vitals.painScore}/10</span></div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
