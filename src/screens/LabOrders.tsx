import { useState } from 'react';
import {
  FlaskConical,
  TestTube,
  Activity,
  Microscope,
  Image,
  CheckCircle2,
  AlertTriangle,
  ClipboardList,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  Badge,
  StatusBadge,
  Button,
  EmptyState,
  SectionTitle,
} from '@/components/ui';
import { patients, getPatientName } from '@/data/patients';
import { labOrders } from '@/data/lab';
import { formatDate } from '@/utils/format';

interface AvailableTest {
  code: string;
  name: string;
  category: string;
}

const availableTests: AvailableTest[] = [
  // Biochimie
  { code: 'BIO-Gly', name: 'Glycémie à jeun', category: 'Biochimie' },
  { code: 'BIO-HbA1c', name: 'Hémoglobine glyquée (HbA1c)', category: 'Biochimie' },
  { code: 'BIO-CRP', name: 'Protéine C réactive (CRP)', category: 'Biochimie' },
  { code: 'BIO-Chol', name: 'Bilan lipidique', category: 'Biochimie' },
  { code: 'BIO-Na', name: 'Ionogramme sanguin', category: 'Biochimie' },
  { code: 'BIO-Lipase', name: 'Lipasémie', category: 'Biochimie' },
  // Hématologie
  { code: 'HEM-NFS', name: 'Numération formule sanguine (NFS)', category: 'Hématologie' },
  { code: 'HEM-TP', name: 'Taux de prothrombine (TP)', category: 'Hématologie' },
  { code: 'HEM-Ferritine', name: 'Ferritine', category: 'Hématologie' },
  { code: 'HEM-GS', name: 'Groupe sanguin / Rhésus', category: 'Hématologie' },
  // Imagerie
  { code: 'IMG-RxThorax', name: 'Radiographie thoracique', category: 'Imagerie' },
  { code: 'IMG-Abdo', name: 'Échographie abdominale', category: 'Imagerie' },
  { code: 'IMG-Cardio', name: 'Électrocardiogramme (ECG)', category: 'Imagerie' },
  // Microbiologie
  { code: 'MICRO-Culture', name: 'Hémoculture', category: 'Microbiologie' },
  { code: 'MICRO-Urinaire', name: 'ECBU (Examen cytobactériologique urinaire)', category: 'Microbiologie' },
  { code: 'MICRO-Copro', name: 'Coproculture', category: 'Microbiologie' },
];

const categories = [
  { name: 'Biochimie', icon: FlaskConical, color: 'text-medical-600 bg-medical-100' },
  { name: 'Hématologie', icon: TestTube, color: 'text-red-600 bg-red-100' },
  { name: 'Imagerie', icon: Image, color: 'text-turquoise-600 bg-turquoise-100' },
  { name: 'Microbiologie', icon: Microscope, color: 'text-purple-600 bg-purple-100' },
];

export default function LabOrdersScreen() {
  const [patientId, setPatientId] = useState('');
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');
  const [validated, setValidated] = useState(false);

  const patientOptions = [
    { value: '', label: '— Sélectionner un patient —' },
    ...patients.map((p) => ({
      value: p.id,
      label: `${p.firstName} ${p.lastName} (${p.code})`,
    })),
  ];

  const patientLabOrders = labOrders.filter((o) => o.patientId === patientId);

  const toggleTest = (code: string) => {
    setSelectedTests((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
    setValidated(false);
  };

  const handleValidate = () => {
    if (!patientId || selectedTests.length === 0) return;
    setValidated(true);
  };

  const resetForm = () => {
    setSelectedTests([]);
    setPriority('normal');
    setValidated(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-medical-100 flex items-center justify-center">
          <FlaskConical className="w-5 h-5 text-medical-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-navy-900">Demandes d'analyses</h2>
          <p className="text-sm text-navy-500">Créer une demande d'examens de laboratoire</p>
        </div>
      </div>

      {/* Success banner */}
      {validated && (
        <Card className="border-turquoise-300 bg-turquoise-50">
          <div className="flex items-center gap-3 px-5 py-4">
            <CheckCircle2 className="w-6 h-6 text-turquoise-600" />
            <div>
              <p className="font-semibold text-turquoise-800">Demande validée avec succès</p>
              <p className="text-sm text-turquoise-700">
                {selectedTests.length} examen(s) demandé(s) pour {getPatientName(patientId)} — Priorité:{' '}
                {priority === 'urgent' ? 'Urgent' : 'Normal'}
              </p>
            </div>
            <Button variant="ghost" size="sm" className="ml-auto" onClick={resetForm}>
              Nouvelle demande
            </Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader
              title="Nouvelle demande d'analyses"
              subtitle="Sélectionnez le patient et les examens"
              action={<ClipboardList className="w-5 h-5 text-navy-400" />}
            />
            <div className="p-5 space-y-5">
              {/* Patient selector */}
              <div className="max-w-md">
                <label className="block text-sm font-medium text-navy-700 mb-1">
                  Patient <span className="text-red-500">*</span>
                </label>
                <select
                  value={patientId}
                  onChange={(e) => {
                    setPatientId(e.target.value);
                    setValidated(false);
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-navy-200 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-medical-400 focus:border-transparent bg-white"
                >
                  {patientOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-2">
                  Priorité <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setPriority('normal'); setValidated(false); }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      priority === 'normal'
                        ? 'border-medical-500 bg-medical-50 text-medical-700'
                        : 'border-navy-200 text-navy-500 hover:bg-navy-50'
                    }`}
                  >
                    <Activity className="w-4 h-4" />
                    Normal
                  </button>
                  <button
                    onClick={() => { setPriority('urgent'); setValidated(false); }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      priority === 'urgent'
                        ? 'border-amber-500 bg-amber-50 text-amber-700'
                        : 'border-navy-200 text-navy-500 hover:bg-navy-50'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4" />
                    Urgent
                  </button>
                </div>
              </div>

              {/* Tests by category */}
              <div>
                <SectionTitle>Examens disponibles</SectionTitle>
                <div className="space-y-4">
                  {categories.map((cat) => {
                    const Icon = cat.icon;
                    const tests = availableTests.filter((t) => t.category === cat.name);
                    return (
                      <div key={cat.name} className="rounded-lg border border-navy-100 p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div className={`w-8 h-8 rounded-md flex items-center justify-center ${cat.color}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <h4 className="font-semibold text-navy-900 text-sm">{cat.name}</h4>
                          <span className="text-xs text-navy-400">
                            ({tests.filter((t) => selectedTests.includes(t.code)).length}/{tests.length})
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {tests.map((test) => {
                            const checked = selectedTests.includes(test.code);
                            return (
                              <label
                                key={test.code}
                                className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors ${
                                  checked
                                    ? 'bg-medical-50 border border-medical-200'
                                    : 'border border-transparent hover:bg-navy-50'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleTest(test.code)}
                                  className="w-4 h-4 rounded text-medical-600 focus:ring-medical-400"
                                />
                                <span className="text-sm text-navy-700">{test.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Validate */}
              <div className="flex items-center justify-between pt-2 border-t border-navy-100">
                <div className="text-sm text-navy-500">
                  <span className="font-semibold text-navy-900">{selectedTests.length}</span> examen(s) sélectionné(s)
                </div>
                <Button
                  variant="turquoise"
                  size="lg"
                  onClick={handleValidate}
                  disabled={!patientId || selectedTests.length === 0}
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  Valider la demande
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Existing orders sidebar */}
        <div>
          <Card>
            <CardHeader
              title="Demandes existantes"
              subtitle={patientId ? getPatientName(patientId) : 'Sélectionnez un patient'}
            />
            <div className="p-5">
              {!patientId ? (
                <EmptyState
                  icon={FlaskConical}
                  title="Aucun patient sélectionné"
                  subtitle="Choisissez un patient pour voir ses demandes"
                />
              ) : patientLabOrders.length === 0 ? (
                <EmptyState
                  icon={FlaskConical}
                  title="Aucune demande"
                  subtitle="Aucune demande d'analyse pour ce patient"
                />
              ) : (
                <div className="space-y-4">
                  {patientLabOrders.map((order) => (
                    <div
                      key={order.id}
                      className="rounded-lg border border-navy-100 p-4 hover:border-medical-200 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-xs text-navy-500">{formatDate(order.date)}</p>
                          <p className="text-sm font-medium text-navy-700 mt-0.5">{order.doctor}</p>
                        </div>
                        <StatusBadge status={order.status} />
                      </div>
                      <div className="flex items-center gap-2 mb-3">
                        <StatusBadge status={order.priority} />
                        <Badge color="navy">{order.tests.length} examen(s)</Badge>
                      </div>
                      <div className="space-y-1">
                        {order.tests.map((test) => (
                          <div key={test.code} className="flex items-center gap-2 text-xs">
                            <span
                              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                test.status === 'completed'
                                  ? 'bg-green-500'
                                  : test.status === 'in-progress'
                                    ? 'bg-medical-500'
                                    : 'bg-amber-500'
                              }`}
                            />
                            <span className="text-navy-700">{test.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
