import { useState } from 'react';
import {
  FlaskConical,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  FileText,
  Edit3,
  X,
  Loader2,
  Syringe,
  Microscope,
  Bell,
  BellRing,
  Clock,
  Printer,
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
import { PrintPreview } from '@/components/PrintPreview';
import { LabResultPrint } from '@/components/LabResultPrint';
import type { LabOrder, LabTest } from '@/types';
import { patients, getPatient, getPatientName } from '@/data/patients';
import { labOrders as initialLabOrders } from '@/data/lab';
import { formatDate } from '@/utils/format';

function ResultFlag({ flag }: { flag?: LabTest['flag'] }) {
  if (!flag) return null;
  const config: Record<string, { color: string; bg: string; icon: typeof CheckCircle2 | null; label: string }> = {
    normal: { color: 'text-green-700', bg: 'bg-green-100', icon: CheckCircle2, label: 'Normal' },
    low: { color: 'text-amber-700', bg: 'bg-amber-100', icon: ArrowDown, label: 'Bas' },
    high: { color: 'text-red-700', bg: 'bg-red-100', icon: ArrowUp, label: 'Élevé' },
    critical: { color: 'text-red-700', bg: 'bg-red-100', icon: AlertCircle, label: 'Critique' },
  };
  const cfg = config[flag] || config.normal;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
      {Icon && <Icon className="w-3 h-3" />}
      {cfg.label}
    </span>
  );
}

type TestStage = 'ordered' | 'sampling' | 'analyzing' | 'completed';

interface LocalTest extends LabTest {
  stage?: TestStage;
  acknowledged?: boolean;
}

interface LocalOrder extends LabOrder {
  tests: LocalTest[];
}

const stageConfig: Record<TestStage, { label: string; icon: typeof Syringe; color: string }> = {
  ordered: { label: 'Prélevé', icon: Syringe, color: 'text-navy-400' },
  sampling: { label: 'Prélèvement...', icon: Loader2, color: 'text-medical-600' },
  analyzing: { label: 'Analyse...', icon: Microscope, color: 'text-turquoise-600' },
  completed: { label: 'Validé', icon: CheckCircle2, color: 'text-green-600' },
};

export default function LabResultsScreen() {
  const [patientFilter, setPatientFilter] = useState('all');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [enteredResults, setEnteredResults] = useState<Record<string, string>>({});
  const [editingTestCode, setEditingTestCode] = useState<string | null>(null);
  const [validated, setValidated] = useState(false);
  const [localOrders, setLocalOrders] = useState<LocalOrder[]>(initialLabOrders as LocalOrder[]);
  const [processingTestId, setProcessingTestId] = useState<string | null>(null);
  const [acknowledgedCriticals, setAcknowledgedCriticals] = useState<Set<string>>(new Set());
  const [ackAnimation, setAckAnimation] = useState<string | null>(null);
  const [printing, setPrinting] = useState<LocalOrder | null>(null);

  const filteredOrders = localOrders.filter(
    (o) => patientFilter === 'all' || o.patientId === patientFilter,
  );

  const selectedOrder = localOrders.find((o) => o.id === selectedOrderId) || null;

  const patientOptions = [
    { value: 'all', label: 'Tous les patients' },
    ...patients.map((p) => ({
      value: p.id,
      label: `${p.firstName} ${p.lastName}`,
    })),
  ];

  // Detect critical unacknowledged results across all orders
  const criticalAlerts = localOrders.flatMap((order) =>
    order.tests
      .filter((t) => t.flag === 'critical' && t.status === 'completed' && !acknowledgedCriticals.has(`${order.id}-${t.code}`))
      .map((t) => ({ orderId: order.id, testCode: t.code, testName: t.name, patientName: getPatientName(order.patientId), result: t.result, unit: t.unit }))
  );

  function handleSelectOrder(order: LocalOrder) {
    setSelectedOrderId(order.id);
    setEditingTestCode(null);
    setValidated(false);
  }

  function handleStartEdit(testCode: string) {
    setEditingTestCode(testCode);
  }

  function handleSaveResult(testCode: string) {
    if (enteredResults[testCode] !== undefined) {
      setEditingTestCode(null);
    }
  }

  function handleCancelEdit() {
    setEditingTestCode(null);
  }

  // Simulate the pipeline: ordered → sampling → analyzing → completed
  function handleProcessTest(orderId: string, testCode: string) {
    setProcessingTestId(`${orderId}-${testCode}`);
    const stageKey = `${orderId}-${testCode}`;

    // Step 1: sampling after 800ms
    setTimeout(() => {
      setLocalOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, tests: o.tests.map((t) => t.code === testCode ? { ...t, stage: 'sampling', status: 'in-progress' } : t) }
            : o,
        ),
      );
    }, 400);

    // Step 2: analyzing after 1200ms
    setTimeout(() => {
      setLocalOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, tests: o.tests.map((t) => t.code === testCode ? { ...t, stage: 'analyzing' } : t) }
            : o,
        ),
      );
    }, 1200);

    // Step 3: completed with fictitious result after 2000ms
    setTimeout(() => {
      // Generate a fictitious result based on test code
      const fictitiousResults: Record<string, { result: string; unit: string; normalRange: string; flag: LabTest['flag'] }> = {
        'BIO-Gly': { result: '1.26', unit: 'g/L', normalRange: '0.70-1.10', flag: 'high' },
        'BIO-HbA1c': { result: '7.2', unit: '%', normalRange: '< 5.7', flag: 'high' },
        'BIO-Chol': { result: '2.4', unit: 'g/L', normalRange: '< 2.00', flag: 'high' },
        'BIO-Lipase': { result: '320', unit: 'UI/L', normalRange: '13-60', flag: 'critical' },
        'IMG-Abdo': { result: 'Foie de taille normale, pas d\'anomalie décelée', unit: '', normalRange: '—', flag: 'normal' },
      };
      const fict = fictitiousResults[testCode] || { result: 'Normal', unit: '', normalRange: '—', flag: 'normal' as LabTest['flag'] };

      setLocalOrders((prev) =>
        prev.map((o) => {
          if (o.id !== orderId) return o;
          const updatedTests = o.tests.map((t) =>
            t.code === testCode
              ? {
                  ...t,
                  status: 'completed' as const,
                  stage: 'completed' as TestStage,
                  result: fict.result,
                  unit: fict.unit,
                  normalRange: fict.normalRange,
                  flag: fict.flag,
                  completedAt: new Date().toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
                }
              : t,
          );
          const allCompleted = updatedTests.every((t) => t.status === 'completed');
          return { ...o, tests: updatedTests, status: allCompleted ? 'completed' as const : 'in-progress' as const };
        }),
      );
      setProcessingTestId(null);
    }, 2200);
  }

  function handleValidateResults() {
    setValidated(true);
    setTimeout(() => setValidated(false), 4000);
  }

  function handleAcknowledgeCritical(orderId: string, testCode: string) {
    const key = `${orderId}-${testCode}`;
    setAckAnimation(key);
    setTimeout(() => {
      setAcknowledgedCriticals((prev) => new Set([...prev, key]));
      setAckAnimation(null);
    }, 800);
  }

  // Count in-progress tests in selected order
  const inProgressTests = selectedOrder?.tests.filter(
    (t) => t.status === 'in-progress' || t.status === 'ordered',
  ) || [];
  const enteredCount = inProgressTests.filter((t) => enteredResults[t.code]).length;

  return (
    <div className="space-y-6">
      {printing && (
        <PrintPreview
          title={`Impression — résultat ${printing.id.toUpperCase()}`}
          onClose={() => setPrinting(null)}
        >
          <LabResultPrint order={printing} patient={getPatient(printing.patientId)} />
        </PrintPreview>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-medical-100 flex items-center justify-center">
          <FlaskConical className="w-5 h-5 text-medical-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-navy-900">Résultats de laboratoire</h2>
          <p className="text-sm text-navy-500">Consulter et saisir les résultats d'analyses</p>
        </div>
      </div>

      {/* Critical results alert banner */}
      {criticalAlerts.length > 0 && (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 animate-fade-in">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
              <BellRing className="w-4 h-4 text-red-600 animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-bold text-red-700 uppercase tracking-wide">Alerte résultat critique</p>
              <p className="text-xs text-red-600">{criticalAlerts.length} résultat(s) critique(s) — accusé de réception requis</p>
            </div>
          </div>
          <div className="space-y-2">
            {criticalAlerts.map((alert) => {
              const key = `${alert.orderId}-${alert.testCode}`;
              const isAnimating = ackAnimation === key;
              return (
                <div key={key} className={`flex items-center gap-3 bg-white rounded-lg border border-red-200 px-3 py-2.5 ${isAnimating ? 'animate-pulse-soft' : ''}`}>
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-navy-900">
                      {alert.patientName} — {alert.testName}
                    </p>
                    <p className="text-xs text-red-600">
                      Résultat: <span className="font-bold">{alert.result}{alert.unit ? ` ${alert.unit}` : ''}</span>
                    </p>
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleAcknowledgeCritical(alert.orderId, alert.testCode)}
                    disabled={isAnimating}
                  >
                    {isAnimating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                        Accusé...
                      </>
                    ) : (
                      <>
                        <Bell className="w-3.5 h-3.5 mr-1" />
                        Accuser réception
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Success banner */}
      {validated && selectedOrder && (
        <Card className="border-turquoise-300 bg-turquoise-50 animate-fade-in">
          <div className="flex items-center gap-3 px-5 py-4">
            <CheckCircle2 className="w-6 h-6 text-turquoise-600" />
            <div>
              <p className="font-semibold text-turquoise-800">Résultats validés avec succès</p>
              <p className="text-sm text-turquoise-700">
                Les résultats pour la demande {selectedOrder.id} ont été enregistrés et transmis au prescripteur.
              </p>
            </div>
            <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setValidated(false)}>
              Fermer
            </Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Orders list */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader title="Demandes d'analyses" subtitle={`${filteredOrders.length} demande(s)`} />
            <div className="p-4 space-y-3">
              {/* Patient filter */}
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1">
                  Filtrer par patient
                </label>
                <select
                  value={patientFilter}
                  onChange={(e) => {
                    setPatientFilter(e.target.value);
                    setSelectedOrderId(null);
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

              {filteredOrders.length === 0 ? (
                <EmptyState
                  icon={FlaskConical}
                  title="Aucune demande"
                  subtitle="Aucune demande pour ce filtre"
                />
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {filteredOrders.map((order) => (
                    <button
                      key={order.id}
                      onClick={() => handleSelectOrder(order)}
                      className={`w-full text-left rounded-lg border p-3 transition-colors ${
                        selectedOrderId === order.id
                          ? 'border-medical-500 bg-medical-50'
                          : 'border-navy-100 hover:border-medical-200 hover:bg-navy-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-navy-900">
                          {getPatientName(order.patientId)}
                        </span>
                        <StatusBadge status={order.status} />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-navy-500">{formatDate(order.date)}</span>
                        <StatusBadge status={order.priority} />
                        <Badge color="navy">{order.tests.length} examen(s)</Badge>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Detail view */}
        <div className="lg:col-span-2">
          {!selectedOrder ? (
            <Card>
              <div className="p-8">
                <EmptyState
                  icon={FileText}
                  title="Aucune demande sélectionnée"
                  subtitle="Sélectionnez une demande dans la liste pour voir les résultats"
                />
              </div>
            </Card>
          ) : (
            <Card>
              <CardHeader
                title={`Demande ${selectedOrder.id}`}
                subtitle={`${getPatientName(selectedOrder.patientId)} · ${selectedOrder.doctor} · ${formatDate(selectedOrder.date)}`}
                action={
                  <div className="flex items-center gap-2">
                    <StatusBadge status={selectedOrder.status} />
                    <StatusBadge status={selectedOrder.priority} />
                    <Button variant="secondary" size="sm" onClick={() => setPrinting(selectedOrder)}>
                      <Printer className="w-3.5 h-3.5 mr-1" /> Imprimer
                    </Button>
                  </div>
                }
              />
              <div className="p-5 space-y-5">
                {/* Pipeline visualization */}
                <div className="flex items-center justify-between bg-navy-50 rounded-lg p-3">
                  {(['ordered', 'sampling', 'analyzing', 'completed'] as TestStage[]).map((stage, idx) => {
                    const stageTests = selectedOrder.tests.filter((t) => (t.stage || 'ordered') === stage);
                    const Icon = stageConfig[stage].icon;
                    const isActive = stageTests.length > 0;
                    return (
                      <div key={stage} className="flex items-center">
                        <div className={`flex flex-col items-center gap-1 ${isActive ? '' : 'opacity-40'}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            isActive ? 'bg-white border-2 border-medical-300' : 'bg-navy-100'
                          }`}>
                            <Icon className={`w-4 h-4 ${isActive ? stageConfig[stage].color : 'text-navy-300'} ${stage === 'sampling' || stage === 'analyzing' ? 'animate-spin' : ''}`} />
                          </div>
                          <span className={`text-[10px] font-medium ${isActive ? 'text-navy-700' : 'text-navy-400'}`}>
                            {stageConfig[stage].label}
                          </span>
                          {isActive && <span className="text-[10px] text-navy-500">{stageTests.length}</span>}
                        </div>
                        {idx < 3 && <div className={`w-8 h-0.5 mx-1 ${stageTests.length > 0 ? 'bg-medical-300' : 'bg-navy-200'}`} />}
                      </div>
                    );
                  })}
                </div>

                {/* Results table */}
                <div>
                  <SectionTitle>Résultats des examens</SectionTitle>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-navy-200 text-left text-navy-500">
                          <th className="pb-2 pr-3 font-medium">Examen</th>
                          <th className="pb-2 px-3 font-medium">Résultat</th>
                          <th className="pb-2 px-3 font-medium">Unité</th>
                          <th className="pb-2 px-3 font-medium">Normales</th>
                          <th className="pb-2 px-3 font-medium">Statut</th>
                          <th className="pb-2 pl-3 font-medium">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOrder.tests.map((test) => {
                          const stage = test.stage || 'ordered';
                          const isProcessing = processingTestId === `${selectedOrder.id}-${test.code}`;
                          const showProcessBtn = test.status === 'ordered' || (test.status === 'in-progress' && !test.result);
                          return (
                            <tr key={test.code} className="border-b border-navy-100">
                              <td className="py-3 pr-3">
                                <p className="font-medium text-navy-900">{test.name}</p>
                                <p className="text-xs text-navy-400">{test.category}</p>
                              </td>
                              <td className="py-3 px-3">
                                {test.status === 'completed' ? (
                                  <span className={`font-semibold ${test.flag === 'critical' || test.flag === 'high' || test.flag === 'low' ? 'text-red-600' : 'text-navy-900'}`}>
                                    {test.result}
                                  </span>
                                ) : editingTestCode === test.code ? (
                                  <input
                                    type="text"
                                    value={enteredResults[test.code] || ''}
                                    onChange={(e) =>
                                      setEnteredResults((prev) => ({ ...prev, [test.code]: e.target.value }))
                                    }
                                    placeholder="Saisir la valeur"
                                    className="w-28 px-2 py-1.5 rounded-md border border-medical-300 text-sm focus:outline-none focus:ring-2 focus:ring-medical-400"
                                    autoFocus
                                  />
                                ) : enteredResults[test.code] ? (
                                  <span className="font-semibold text-turquoise-700">{enteredResults[test.code]}</span>
                                ) : (
                                  <span className="text-navy-400 italic">—</span>
                                )}
                              </td>
                              <td className="py-3 px-3 text-navy-500">{test.unit || '—'}</td>
                              <td className="py-3 px-3 text-navy-500">{test.normalRange || '—'}</td>
                              <td className="py-3 px-3">
                                {test.status === 'completed' ? (
                                  <ResultFlag flag={test.flag} />
                                ) : isProcessing ? (
                                  <Badge color="blue">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    {stage === 'sampling' ? 'Prélèvement' : stage === 'analyzing' ? 'Analyse' : 'Traitement'}
                                  </Badge>
                                ) : enteredResults[test.code] ? (
                                  <Badge color="turquoise">Saisi</Badge>
                                ) : (
                                  <StatusBadge status={test.status} />
                                )}
                              </td>
                              <td className="py-3 pl-3">
                                {test.status === 'completed' ? (
                                  <span className="text-xs text-navy-400 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {test.completedAt?.split(' ')[1] || ''}
                                  </span>
                                ) : editingTestCode === test.code ? (
                                  <div className="flex items-center gap-1">
                                    <button onClick={() => handleSaveResult(test.code)} className="text-turquoise-600 hover:text-turquoise-700" title="Enregistrer">
                                      <CheckCircle2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={handleCancelEdit} className="text-red-500 hover:text-red-700" title="Annuler">
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ) : showProcessBtn ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleProcessTest(selectedOrder.id, test.code)}
                                    disabled={isProcessing}
                                  >
                                    {isProcessing ? (
                                      <>
                                        <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                                        En cours
                                      </>
                                    ) : (
                                      <>
                                        <Syringe className="w-3.5 h-3.5 mr-1" />
                                        Prélever
                                      </>
                                    )}
                                  </Button>
                                ) : (
                                  <button
                                    onClick={() => handleStartEdit(test.code)}
                                    className="inline-flex items-center gap-1 text-xs font-medium text-medical-600 hover:text-medical-700"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                    Saisir
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Summary + Validate */}
                <div className="flex items-center justify-between pt-3 border-t border-navy-100">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-navy-500">
                      Validés: <span className="font-semibold text-navy-900">{selectedOrder.tests.filter((t) => t.status === 'completed').length}</span> / {selectedOrder.tests.length}
                    </span>
                    {selectedOrder.tests.some((t) => t.flag === 'critical') && (
                      <span className="inline-flex items-center gap-1 text-red-600 font-medium">
                        <AlertTriangle className="w-4 h-4" />
                        Valeurs critiques
                      </span>
                    )}
                  </div>
                  <Button
                    variant="turquoise"
                    size="lg"
                    onClick={handleValidateResults}
                    disabled={selectedOrder.tests.some((t) => t.status !== 'completed')}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    Valider les résultats
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
