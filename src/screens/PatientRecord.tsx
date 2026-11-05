import { useState, useMemo, useEffect } from 'react';
import {
  Search,
  FileText,
  Stethoscope,
  Pill,
  FlaskConical,
  HeartPulse,
  FolderOpen,
  History,
  BedDouble,
  ScanLine,
  ClipboardList,
  LayoutList,
  FolderHeart,
  Printer,
  Droplet,
  Shield,
  User,
  UserCheck,
  Calendar,
  Activity,
  CheckCircle2,
  Copy,
  ChevronRight,
  X,
  Receipt,
  AlertTriangle,
  Info,
} from 'lucide-react';
import type {
  Admission,
  Consultation,
  Prescription,
  LabOrder,
  NursingCareRecord,
  Invoice,
  Patient,
  Vitals,
} from '@/types';
import {
  Card,
  Badge,
  StatusBadge,
  EmptyState,
  Button,
} from '@/components/ui';
import { FormTemplatesTab, ImagingTab, SummaryTab } from '@/components/PatientRecordViews';
import { PatientOverviewMedidoc } from '@/components/PatientOverviewMedidoc';
import { PrintPreview } from '@/components/PrintPreview';
import { LabResultPrint } from '@/components/LabResultPrint';
import type { ImagingReport, PatientDocument, PatientForm, PatientTabId } from '@/data/patientExtras';
import { demoImagingReports, demoPatientForms, staticPatientDocuments, imagingModels, formTemplates, FORM_STATUS_META } from '@/data/patientExtras';
import { admissions as allAdmissions } from '@/data/admissions';
import { patients } from '@/data/patients';
import { consultations } from '@/data/consultations';
import { prescriptions } from '@/data/prescriptions';
import { labOrders } from '@/data/lab';
import { nursingCareRecords } from '@/data/nursing';
import { invoices } from '@/data/billing';
import { calculateAge, formatDate, formatDateShort, formatFCFA, getInitials } from '@/utils/format';
import { getPatientEpisodes, closeEpisode, cancelEpisode, getAllEpisodes } from '@/data/episodes';
import { beds } from '@/data/beds';
import { EPISODE_TYPE_LABELS, EPISODE_STATUS_LABELS, ADMIN_STATUS_LABELS, CARE_STATUS_LABELS } from '@/types';
import type { Episode } from '@/types';
import { doctors, getDoctorName } from '@/data/doctors';
import type { FormValues, FormRows } from '@/types';
import { demoFormValues, demoRows } from '@/data/consultationForms';
import { FieldInput, RepeatTable } from '@/components/consultationForm';
import { formDefinitions, repeatTables } from '@/data/consultationForms';
import type { ConsultationFormType } from '@/types';
// --- Fictitious homonym data: two patients with same name but different birth dates ---
const homonymPatients: (Patient & { homonymNote?: string })[] = [
  ...patients,
  {
    id: 'p007',
    code: 'HOMEA-2026-0007',
    firstName: 'Awa',
    lastName: 'Traoré',
    birthDate: '1990-05-20',
    gender: 'F',
    phone: '+225 07 11 22 33 44',
    address: 'Yopougon, Abidjan',
    chronicConditions: [],
    emergencyContact: 'Sékou Traoré (père)',
    emergencyPhone: '+225 07 99 88 77 66',
    insurance: 'ASKIA',
    insuranceNumber: 'ASKIA-5578',
    homonymNote: 'Homonyme — même nom, date de naissance différente',
  },
];

interface TabConfig {
  id: PatientTabId;
  label: string;
  icon: typeof FileText;
}

const tabs: TabConfig[] = [
  { id: 'overview', label: 'Vue générale', icon: Activity },
  { id: 'venues', label: 'Venues et séjours', icon: ClipboardList },
  { id: 'consultations', label: 'Consultations', icon: Stethoscope },
  { id: 'hospitalisations', label: 'Hospitalisations', icon: BedDouble },
  { id: 'prescriptions', label: 'Prescriptions', icon: Pill },
  { id: 'imaging', label: 'Imagerie', icon: ScanLine },
  { id: 'lab', label: 'Résultats', icon: FlaskConical },
  { id: 'documents', label: 'Documents', icon: FolderOpen },
  { id: 'forms', label: 'Formulaires', icon: ClipboardList },
  { id: 'history', label: 'Historique', icon: History },
  { id: 'resume', label: 'Résumé', icon: LayoutList },
  { id: 'nursing', label: 'Soins', icon: HeartPulse },
  { id: 'medical-file', label: 'Dossier médical', icon: FolderHeart },
];

export default function PatientRecord({ onSelectedPatientChange, onOpenAdministrativeFile, initialPatientId }: { onSelectedPatientChange?: (patient: Patient) => void; onOpenAdministrativeFile?: (patientId: string) => void; initialPatientId?: string }) {
  const [selectedPatientId, setSelectedPatientId] = useState<string>(initialPatientId ?? patients[0]?.id ?? '');
  const [activeTab, setActiveTab] = useState<PatientTabId>('overview');

  // Detect homonyms for the selected patient
  const selectedPatient = useMemo(
    () => homonymPatients.find((p) => p.id === selectedPatientId),
    [selectedPatientId],
  );

  useEffect(() => {
    if (selectedPatient) onSelectedPatientChange?.(selectedPatient);
  }, [onSelectedPatientChange, selectedPatient]);

  const patientConsultations = useMemo(
    () => consultations.filter((c) => c.patientId === selectedPatientId),
    [selectedPatientId],
  );
  const patientPrescriptions = useMemo(
    () => prescriptions.filter((p) => p.patientId === selectedPatientId),
    [selectedPatientId],
  );
  const patientLabOrders = useMemo(
    () => labOrders.filter((l) => l.patientId === selectedPatientId),
    [selectedPatientId],
  );
  const patientNursingCare = useMemo(
    () => nursingCareRecords.filter((n) => n.patientId === selectedPatientId),
    [selectedPatientId],
  );
  const patientInvoices = useMemo(
    () => invoices.filter((i) => i.patientId === selectedPatientId),
    [selectedPatientId],
  );
  const patientAdmissions = useMemo(
    () => allAdmissions.filter((a) => a.patientId === selectedPatientId),
    [selectedPatientId],
  );
  const patientEpisodesList = useMemo(
    () => getPatientEpisodes(selectedPatientId),
    [selectedPatientId],
  );
  const patientImaging = useMemo(
    () => demoImagingReports.filter((r) => r.patientId === selectedPatientId),
    [selectedPatientId],
  );
  const patientForms = useMemo(
    () => demoPatientForms.filter((f) => f.patientId === selectedPatientId),
    [selectedPatientId],
  );
  const patientDocuments = useMemo(
    () => staticPatientDocuments.filter((d) => d.patientId === selectedPatientId),
    [selectedPatientId],
  );

  function selectPatient(id: string) {
    setSelectedPatientId(id);
    setActiveTab('overview');
  }

  if (!selectedPatient) {
    return (
      <div className="p-6">
        <EmptyState icon={User} title="Aucun patient sélectionné" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* === Tabs === */}
      <div className="flex-1 overflow-y-auto px-6 pt-6 pb-6">
        <Card>
          {/* Tab bar */}
          <div className="flex flex-wrap items-center gap-0.5 bg-sky-50 p-1.5">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const count =
                tab.id === 'venues' ? patientEpisodesList.length :
                tab.id === 'consultations' ? patientConsultations.length :
                tab.id === 'hospitalisations' ? patientAdmissions.length :
                tab.id === 'prescriptions' ? patientPrescriptions.length :
                tab.id === 'imaging' ? patientImaging.length :
                tab.id === 'lab' ? patientLabOrders.length :
                tab.id === 'nursing' ? patientNursingCare.length :
                tab.id === 'medical-file' ? (
                  patientConsultations.length + patientAdmissions.length + patientPrescriptions.length +
                  patientLabOrders.length + patientNursingCare.length + patientImaging.length + patientForms.length
                ) :
                tab.id === 'documents' ? patientInvoices.length + patientDocuments.length :
                tab.id === 'forms' ? patientForms.length :
                tab.id === 'history' ? (
                  patientConsultations.length + patientAdmissions.length + patientPrescriptions.length +
                  patientLabOrders.length + patientNursingCare.length + patientInvoices.length +
                  patientImaging.length + patientForms.length
                ) :
                tab.id === 'resume' ? (
                  patientConsultations.length + patientAdmissions.length + patientPrescriptions.length +
                  patientLabOrders.length + patientNursingCare.length + patientInvoices.length +
                  patientImaging.length + patientForms.length
                ) : 0;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 rounded-t px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-sky-700 text-white'
                      : 'bg-sky-500 text-white hover:bg-sky-600'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                  {count > 0 && (
                    <span className={`px-1 py-0.5 rounded-full text-[9px] font-bold ${
                      isActive ? 'bg-white text-sky-800' : 'bg-sky-700 text-white'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div className="p-5">
            {activeTab === 'overview' && (
              <PatientOverviewMedidoc
                patient={selectedPatient}
                consultations={patientConsultations}
                admissions={patientAdmissions}
                prescriptions={patientPrescriptions}
                labOrders={patientLabOrders}
                invoices={patientInvoices}
                documents={patientDocuments}
                imaging={patientImaging}
                onTabChange={setActiveTab}
              />
            )}
            {activeTab === 'venues' && <VenuesTab patientId={selectedPatient.id} />}
            {activeTab === 'consultations' && <ConsultationsTab records={patientConsultations} />}
            {activeTab === 'hospitalisations' && <HospitalisationsTab records={patientAdmissions} />}
            {activeTab === 'prescriptions' && (
              <PrescriptionsTab
                records={patientPrescriptions}
                consultations={patientConsultations}
                nursingRecords={patientNursingCare}
                labOrders={patientLabOrders}
                patient={selectedPatient}
              />
            )}
            {activeTab === 'imaging' && <ImagingTab patientId={selectedPatient.id} />}
            {activeTab === 'lab' && <LabTab records={patientLabOrders} patient={selectedPatient} />}
            {activeTab === 'nursing' && <NursingTab records={patientNursingCare} />}
            {activeTab === 'medical-file' && (
              <MedicalFileTab
                patient={selectedPatient}
                consultations={patientConsultations}
                admissions={patientAdmissions}
                prescriptions={patientPrescriptions}
                labOrders={patientLabOrders}
                nursingCare={patientNursingCare}
                imaging={patientImaging}
                forms={patientForms}
              />
            )}

            {activeTab === 'documents' && (
              <DocumentsTab records={patientInvoices} documents={patientDocuments} />
            )}
            {activeTab === 'forms' && <FormTemplatesTab patientId={selectedPatient.id} />}
            {activeTab === 'history' && (
              <HistoryTab
                consultations={patientConsultations}
                admissions={patientAdmissions}
                prescriptions={patientPrescriptions}
                labOrders={patientLabOrders}
                nursingCare={patientNursingCare}
                invoices={patientInvoices}
                imaging={patientImaging}
              />
            )}
            {activeTab === 'resume' && (
              <SummaryTab
                patient={selectedPatient}
                consultations={patientConsultations}
                admissions={patientAdmissions}
                prescriptions={patientPrescriptions}
                labOrders={patientLabOrders}
                nursingCare={patientNursingCare}
                invoices={patientInvoices}
                imaging={patientImaging}
                forms={patientForms}
                documents={patientDocuments}
                onTabChange={setActiveTab}
              />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

// --- Venues et séjours tab ---
function VenuesTab({ patientId }: { patientId: string }) {
  const [tick, setTick] = useState(0);
  const [cancelTarget, setCancelTarget] = useState<Episode | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const episodes = useMemo(() => {
    void tick;
    return getPatientEpisodes(patientId);
  }, [patientId, tick]);

  function handleClose(epId: string) {
    closeEpisode(epId, 'Médecin');
    setTick((t) => t + 1);
  }

  function handleCancel() {
    if (!cancelTarget || !cancelReason.trim()) return;
    cancelEpisode(cancelTarget.id, 'Accueil', cancelReason.trim());
    setCancelTarget(null);
    setCancelReason('');
    setTick((t) => t + 1);
  }

  if (episodes.length === 0) {
    return <EmptyState icon={ClipboardList} title="Aucune venue enregistrée" subtitle="Les épisodes de soins apparaîtront ici" />;
  }

  return (
    <div className="space-y-4">
      {episodes.map((ep) => (
        <div key={ep.id} className={`rounded-lg p-4 border ${ep.status === 'actif' ? 'border-green-200 bg-green-50/30' : ep.status === 'annule' ? 'border-red-200 bg-red-50/30' : 'border-navy-100 bg-navy-50'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${ep.status === 'actif' ? 'bg-green-100' : 'bg-navy-100'}`}>
                <ClipboardList className={`w-4 h-4 ${ep.status === 'actif' ? 'text-green-600' : 'text-navy-600'}`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-navy-900 font-mono">{ep.episodeNumber}</p>
                <p className="text-xs text-navy-500">
                  {EPISODE_TYPE_LABELS[ep.type]} · {ep.serviceId} · {ep.admittedAt.replace('T', ' ')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge color={ep.status === 'actif' ? 'green' : ep.status === 'annule' ? 'red' : 'navy'}>
                {EPISODE_STATUS_LABELS[ep.status]}
              </Badge>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs mb-3">
            <div>
              <p className="text-navy-400 font-medium">Motif</p>
              <p className="text-navy-700 mt-0.5">{ep.admissionReason}</p>
            </div>
            <div>
              <p className="text-navy-400 font-medium">Professionnel</p>
              <p className="text-navy-700 mt-0.5">{ep.practitionerId ? getDoctorName(ep.practitionerId) : '—'}</p>
            </div>
            <div>
              <p className="text-navy-400 font-medium">Statut administratif</p>
              <p className="text-navy-700 mt-0.5">{ADMIN_STATUS_LABELS[ep.administrativeStatus]}</p>
            </div>
            <div>
              <p className="text-navy-400 font-medium">Prise en charge</p>
              <p className="text-navy-700 mt-0.5">{CARE_STATUS_LABELS[ep.careStatus]}</p>
            </div>
            <div>
              <p className="text-navy-400 font-medium">Fin de venue</p>
              <p className="text-navy-700 mt-0.5">{ep.closedAt ? ep.closedAt.replace('T', ' ') : 'En cours'}</p>
            </div>
            {ep.bedPending && (
              <div>
                <p className="text-navy-400 font-medium">Lit</p>
                <p className="text-amber-700 mt-0.5 font-medium">Affectation en attente</p>
              </div>
            )}
            {ep.cancellationReason && (
              <div className="md:col-span-3">
                <p className="text-red-400 font-medium">Motif d'annulation</p>
                <p className="text-red-700 mt-0.5">{ep.cancellationReason}</p>
              </div>
            )}
          </div>
          {/* Chronologie */}
          <div className="border-t border-navy-200 pt-2 mt-2">
            <p className="text-xs text-navy-400 font-medium mb-1.5">Chronologie</p>
            <div className="space-y-1">
              {ep.events.map((ev, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="text-navy-400 font-mono whitespace-nowrap">{ev.timestamp}</span>
                  <span className="text-navy-700 font-medium">{ev.action}</span>
                  {ev.detail && <span className="text-navy-500">— {ev.detail}</span>}
                  {ev.author && <span className="text-navy-400">({ev.author})</span>}
                </div>
              ))}
            </div>
          </div>
          {/* Actions */}
          {ep.status === 'actif' && (
            <div className="flex items-center gap-2 mt-3 pt-2 border-t border-navy-200">
              <Button variant="secondary" size="sm" onClick={() => handleClose(ep.id)}>
                Terminer la venue
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setCancelTarget(ep)}>
                <X className="w-3.5 h-3.5 mr-1" /> Annuler l'admission
              </Button>
            </div>
          )}
        </div>
      ))}

      {/* Cancel admission modal */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-navy-900">Annuler l'admission</h3>
                <p className="text-xs text-navy-500">{cancelTarget.episodeNumber} — {EPISODE_TYPE_LABELS[cancelTarget.type]}</p>
              </div>
            </div>
            <p className="text-sm text-navy-600">
              L'historique sera conservé. Les opérations financières ou cliniques existantes ne seront pas supprimées.
            </p>
            <div>
              <label className="block text-xs font-bold text-navy-800">Motif d'annulation <span className="text-red-600">*</span></label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={2}
                placeholder="Ex: Erreur d'enregistrement, patient parti..."
                className="mt-1 w-full rounded-lg border border-navy-200 px-3 py-2 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setCancelTarget(null); setCancelReason(''); }}>Fermer</Button>
              <Button variant="danger" size="sm" onClick={handleCancel} disabled={!cancelReason.trim()}>
                Confirmer l'annulation
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Hospitalisations tab ---
function HospitalisationsTab({ records }: { records: Admission[] }) {
  const statusLabels: Record<string, string> = {
    waiting: 'En attente',
    'in-consultation': 'En consultation',
    admitted: 'Hospitalisé',
    discharged: 'Sorti',
    transferred: 'Transféré',
  };
  const priorityLabels: Record<string, string> = {
    normal: 'Normale',
    urgent: 'Urgente',
    critical: 'Critique',
  };

  if (records.length === 0) {
    return <EmptyState icon={BedDouble} title="Aucune hospitalisation" subtitle="Les séjours hospitaliers apparaîtront ici" />;
  }

  return (
    <div className="space-y-4">
      {records.map((a) => (
        <div key={a.id} className="bg-navy-50 rounded-lg p-4 border border-navy-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-navy-100 flex items-center justify-center">
                <BedDouble className="w-4 h-4 text-navy-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-navy-900">{a.department}</p>
                <p className="text-xs text-navy-500">{formatDate(a.date)} à {a.time} — {a.assignedDoctor}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {a.priority !== 'normal' && (
                <Badge color={a.priority === 'critical' ? 'red' : 'amber'}>{priorityLabels[a.priority] ?? a.priority}</Badge>
              )}
              <StatusBadge status={a.status} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="md:col-span-2">
              <p className="text-navy-400 font-medium">Motif d'admission</p>
              <p className="text-navy-700 mt-0.5">{a.reason}</p>
            </div>
            <div>
              <p className="text-navy-400 font-medium">Lit</p>
              <p className="text-navy-700 mt-0.5">{a.bedNumber ?? 'Non attribué'}</p>
            </div>
            <div>
              <p className="text-navy-400 font-medium">Statut du séjour</p>
              <p className="text-navy-700 mt-0.5">{statusLabels[a.status] ?? a.status}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Consultations tab ---
type ConsultSubTab = 'liste' | 'general' | 'gynecological' | 'obstetrical';

const CONSULT_FORM_META: { id: Exclude<ConsultSubTab, 'liste'>; label: string }[] = [
  { id: 'general', label: 'Générale' },
  { id: 'gynecological', label: 'Gynécologique' },
  { id: 'obstetrical', label: 'Obstétricale' },
];

function ConsultationsTab({ records }: { records: Consultation[] }) {
  const [subTab, setSubTab] = useState<ConsultSubTab>('liste');
  const [values, setValues] = useState<FormValues>({});
  const [rows, setRows] = useState<Record<string, FormRows>>({});
  const [showErrors, setShowErrors] = useState(false);

  function openForm(type: Exclude<ConsultSubTab, 'liste'>) {
    setValues({ ...demoFormValues[type] });
    setRows(JSON.parse(JSON.stringify(demoRows[type])));
    setShowErrors(false);
    setSubTab(type);
  }
  function handleValueChange(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }
  function handleRowsChange(key: string, next: FormRows) {
    setRows((prev) => ({ ...prev, [key]: next }));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setSubTab('liste')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${subTab === 'liste' ? 'bg-medical-600 text-white' : 'bg-navy-50 text-navy-600 hover:bg-navy-100'}`}
        >
          Liste ({records.length})
        </button>
        {CONSULT_FORM_META.map((f) => (
          <button
            key={f.id}
            onClick={() => openForm(f.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${subTab === f.id ? 'bg-medical-600 text-white' : 'bg-navy-50 text-navy-600 hover:bg-navy-100'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {subTab === 'liste' && <ConsultationList records={records} />}
      {subTab !== 'liste' && (
        <SectionedConsultationForm
          type={subTab}
          values={values}
          rows={rows}
          onValueChange={handleValueChange}
          onRowsChange={handleRowsChange}
          showErrors={showErrors}
        />
      )}
    </div>
  );
}

const TABLE_SECTION_MAP: Record<ConsultationFormType, Record<string, string>> = {
  general: {},
  gynecological: {},
  obstetrical: {
    previousPregnancies: 'obs-obstetrical-history',
    prenatalConsultations: 'obs-prenatal',
    imagingExams: 'obs-imaging',
    hospitalizations: 'obs-hospitalizations',
    newborns: 'obs-delivery-newborn',
  },
};

const BIOLOGY_STATUS_LEGEND = [
  { label: 'À faire', color: 'navy' as const },
  { label: 'Programmé', color: 'amber' as const },
  { label: 'Réalisé', color: 'blue' as const },
  { label: 'Résultat disponible', color: 'green' as const },
];

function computeBMI(weight: string, height: string): string {
  const w = parseFloat(weight);
  const h = parseFloat(height);
  if (!w || !h || h <= 0) return '';
  return (w / ((h / 100) * (h / 100))).toFixed(1);
}

function SectionedConsultationForm({
  type,
  values,
  rows,
  onValueChange,
  onRowsChange,
  showErrors,
}: {
  type: ConsultationFormType;
  values: FormValues;
  rows: Record<string, FormRows>;
  onValueChange: (key: string, value: string) => void;
  onRowsChange: (key: string, next: FormRows) => void;
  showErrors: boolean;
}) {
  const definition = formDefinitions[type];
  const sections = definition.sections.filter((s) => !(type === 'obstetrical' && s.id === 'obs-identity'));
  const tables = repeatTables[type];
  const tableSectionMap = TABLE_SECTION_MAP[type];
  const [sectionId, setSectionId] = useState(sections[0]?.id ?? '');
  const [detailIndex, setDetailIndex] = useState<number | null>(null);

  const section = sections.find((s) => s.id === sectionId) ?? sections[0];
  const currentIndex = sections.indexOf(section);
  const bmi = computeBMI(values.weight, values.height);
  const prenatal = rows.prenatalConsultations || [];
  const prenatalDef = tables.find((t) => t.key === 'prenatalConsultations');
  const detail = detailIndex !== null ? prenatal[detailIndex] : null;

  function renderSectionExtra(sid: string) {
    if (type === 'general' && sid === 'general-vitals' && bmi) {
      return (
        <div className="flex items-center gap-2 bg-navy-50 border border-navy-100 rounded-lg px-3 py-2 text-sm">
          <Info className="w-4 h-4 text-medical-600" />
          <span className="text-navy-600">Indice de masse corporelle (informatif) :</span>
          <span className="font-semibold text-navy-900">{bmi} kg/m²</span>
        </div>
      );
    }
    if (type === 'obstetrical' && sid === 'obs-prenatal' && prenatal.length > 0) {
      return (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-navy-500 uppercase tracking-wide">Chronologie</p>
          <div className="space-y-2">
            {prenatal.map((c, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg border border-navy-100 bg-navy-50">
                <div className="w-8 h-8 rounded-full bg-medical-100 text-medical-700 flex items-center justify-center text-xs font-bold">
                  {c.number || i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-navy-900">
                    Consultation {c.number || i + 1} — {c.date || 'date inconnue'}
                  </p>
                  <p className="text-xs text-navy-500 truncate">
                    {c.practitioner || 'Praticien'} · {c.gestationalAge || 'AG inconnu'} · Poids {c.weight || '—'} kg · TA {c.bloodPressure || '—'}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setDetailIndex(i)}>
                  Voir le détail
                </Button>
              </div>
            ))}
          </div>
        </div>
      );
    }
    if (type === 'obstetrical' && sid === 'obs-biology') {
      return (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-navy-500">Statuts démonstratifs :</span>
          {BIOLOGY_STATUS_LEGEND.map((s) => (
            <Badge key={s.label} color={s.color}>{s.label}</Badge>
          ))}
        </div>
      );
    }
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {sections.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setSectionId(s.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              s.id === section.id
                ? 'bg-navy-700 text-white'
                : 'bg-white border border-navy-200 text-navy-600 hover:bg-navy-50'
            }`}
          >
            {i + 1}. {s.title}
          </button>
        ))}
      </div>

      {section && (
        <div className="border border-navy-100 rounded-xl bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-navy-100 bg-navy-50">
            <p className="text-sm font-semibold text-navy-900">{section.title}</p>
            {section.subtitle && <p className="text-xs text-navy-500 mt-0.5">{section.subtitle}</p>}
          </div>
          <div className="p-4 space-y-4">
            {section.fields.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {section.fields.map((field) => {
                  const visible = !field.conditional || values[field.conditional.key] === field.conditional.value;
                  if (!visible) return null;
                  const missing = showErrors && field.required && !values[field.key]?.trim();
                  return (
                    <div key={field.key} className={field.span === 2 ? 'sm:col-span-2' : ''}>
                      <label className="block text-sm font-medium text-navy-700 mb-1">
                        {field.label} {field.required && <span className="text-red-500">*</span>}
                      </label>
                      <FieldInput
                        field={field}
                        value={values[field.key] || ''}
                        onChange={(v) => onValueChange(field.key, v)}
                      />
                      {missing && <p className="text-xs text-red-600 mt-1">Champ obligatoire</p>}
                    </div>
                  );
                })}
              </div>
            )}

            {renderSectionExtra(section.id)}

            {tables
              .filter((t) => (tableSectionMap[t.key] || '') === section.id)
              .map((t) => (
                <RepeatTable
                  key={t.key}
                  def={t}
                  rows={rows[t.key] || []}
                  onChange={(next) => onRowsChange(t.key, next)}
                />
              ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button
          variant="secondary"
          size="sm"
          disabled={currentIndex <= 0}
          onClick={() => setSectionId(sections[currentIndex - 1].id)}
        >
          Section précédente
        </Button>
        <span className="text-xs text-navy-400">{currentIndex + 1} / {sections.length}</span>
        <Button
          variant="secondary"
          size="sm"
          disabled={currentIndex >= definition.sections.length - 1}
          onClick={() => setSectionId(sections[currentIndex + 1].id)}
        >
          Section suivante
        </Button>
      </div>

      {detail && prenatalDef && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setDetailIndex(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-navy-100 sticky top-0 bg-white">
              <h3 className="font-semibold text-navy-900">Consultation prénatale n°{detail.number || ''}</h3>
              <button onClick={() => setDetailIndex(null)} className="text-navy-400 hover:text-navy-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {prenatalDef.columns.map((c) => (
                <div key={c.key} className="border-b border-navy-50 pb-2">
                  <p className="text-xs text-navy-400 font-medium">{c.label}</p>
                  <p className="text-sm text-navy-900">{detail[c.key] || '—'}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Patients admis tab (épisodes actifs) ---
export function AdmittedPatientsView({
  patients,
  episodes,
  onSelectPatient,
}: {
  patients: (Patient & { homonymNote?: string })[];
  episodes: Episode[];
  onSelectPatient: (id: string) => void;
}) {
  const [admissionTypeFilter, setAdmissionTypeFilter] = useState<'all' | 'consultation' | 'hospitalisation'>('all');
  const [doctorFilter, setDoctorFilter] = useState('all');

  const activeByPatient = useMemo(() => {
    const map: Record<string, Episode[]> = {};
    episodes
      .filter((ep) => ep.status === 'actif')
      .filter((ep) => admissionTypeFilter === 'all' || ep.type === admissionTypeFilter)
      .filter((ep) => doctorFilter === 'all' || ep.practitionerId === doctorFilter)
      .forEach((ep) => {
        if (!map[ep.patientId]) map[ep.patientId] = [];
        map[ep.patientId].push(ep);
      });
    return map;
  }, [episodes, admissionTypeFilter, doctorFilter]);

  const admitted = patients.filter((p) => activeByPatient[p.id]?.length);
  const hasActiveEpisodes = episodes.some((ep) => ep.status === 'actif');

  if (!hasActiveEpisodes) {
    return <EmptyState icon={UserCheck} title="Aucun patient admis" subtitle="Les patients avec un épisode actif apparaîtront ici" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-navy-100 bg-navy-50/60 p-3">
        <div className="min-w-[13rem]">
          <label htmlFor="admitted-type-filter" className="mb-1 block text-xs font-semibold text-navy-700">Type d’admission</label>
          <select
            id="admitted-type-filter"
            value={admissionTypeFilter}
            onChange={(e) => setAdmissionTypeFilter(e.target.value as 'all' | 'consultation' | 'hospitalisation')}
            className="w-full rounded-md border border-navy-200 bg-white px-3 py-2 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-medical-400"
          >
            <option value="all">Tous les types</option>
            <option value="consultation">Consultation</option>
            <option value="hospitalisation">Hospitalisation</option>
          </select>
        </div>
        <div className="min-w-[15rem]">
          <label htmlFor="admitted-doctor-filter" className="mb-1 block text-xs font-semibold text-navy-700">Médecin</label>
          <select
            id="admitted-doctor-filter"
            value={doctorFilter}
            onChange={(e) => setDoctorFilter(e.target.value)}
            className="w-full rounded-md border border-navy-200 bg-white px-3 py-2 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-medical-400"
          >
            <option value="all">Tous les médecins</option>
            {doctors.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>{getDoctorName(doctor.id)}</option>
            ))}
          </select>
        </div>
      </div>
      <p className="text-xs text-navy-500">
        {admitted.length} patient{admitted.length > 1 ? 's' : ''} actuellement admis (épisode(s) actif(s))
      </p>
      {admitted.length === 0 ? (
        <EmptyState icon={UserCheck} title="Aucun résultat" subtitle="Aucun patient admis ne correspond aux filtres sélectionnés" />
      ) : admitted.map((p) => (
        <div key={p.id} className="border border-navy-100 rounded-lg bg-white overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3 bg-navy-50 border-b border-navy-100">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-navy-200 flex items-center justify-center text-xs font-bold text-navy-700 flex-shrink-0">
                {getInitials(p.firstName, p.lastName)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-navy-900 truncate">{p.firstName} {p.lastName}</p>
                  <Badge color="green">Admis</Badge>
                </div>
                <p className="text-xs text-navy-500 font-mono">{p.code} · {formatDateShort(p.birthDate)} ({calculateAge(p.birthDate)} ans)</p>
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={() => onSelectPatient(p.id)}>
              Ouvrir le dossier
            </Button>
          </div>
          <div className="divide-y divide-navy-50">
            {activeByPatient[p.id].map((ep) => (
              <div key={ep.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-xs">
                <Badge color="blue">{EPISODE_TYPE_LABELS[ep.type]}</Badge>
                <span className="font-mono text-navy-500">{ep.episodeNumber}</span>
                <span className="text-navy-700">{ep.serviceId}</span>
                {ep.bedId && (() => {
                  const bed = beds.find((b) => b.id === ep.bedId);
                  return bed ? <Badge color="navy">Lit {bed.number}</Badge> : null;
                })()}
                <span className="text-navy-500">Admis le {ep.admittedAt.replace('T', ' à ')}</span>
                <span className="text-navy-500">· {ep.practitionerId ? getDoctorName(ep.practitionerId) : 'Médecin non assigné'}</span>
                <span className="text-navy-700 font-medium ml-auto truncate">{ep.admissionReason}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ConsultationList({ records }: { records: Consultation[] }) {
  if (records.length === 0) {
    return <EmptyState icon={Stethoscope} title="Aucune consultation" subtitle="Les consultations apparaîtront ici" />;
  }
  return (
    <div className="space-y-4">
      {records.map((c) => (
        <div key={c.id} className="bg-navy-50 rounded-lg p-4 border border-navy-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-medical-100 flex items-center justify-center">
                <Stethoscope className="w-4 h-4 text-medical-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-navy-900">{c.doctor}</p>
                <p className="text-xs text-navy-500">{formatDate(c.date)} à {c.time}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {c.signature && (
                <Badge color="green"><CheckCircle2 className="w-3 h-3" /> Signé</Badge>
              )}
              <StatusBadge status={c.status} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-navy-400 font-medium">Motif</p>
              <p className="text-navy-700 mt-0.5">{c.chiefComplaint}</p>
            </div>
            <div>
              <p className="text-navy-400 font-medium">Diagnostic</p>
              <p className="text-navy-700 mt-0.5">{c.diagnosis || '—'}</p>
            </div>
          </div>
          {c.vitals && (
            <div className="mt-3 pt-3 border-t border-navy-200">
              <p className="text-navy-400 font-medium text-xs mb-1.5">Constantes</p>
              <div className="flex flex-wrap gap-2">
                <Badge color="navy">TA: {c.vitals.bloodPressureSystolic}/{c.vitals.bloodPressureDiastolic}</Badge>
                <Badge color="navy">FC: {c.vitals.heartRate}</Badge>
                <Badge color="navy">T°: {c.vitals.temperature}°C</Badge>
                <Badge color="navy">SpO₂: {c.vitals.oxygenSaturation}%</Badge>
                <Badge color="navy">FR: {c.vitals.respiratoryRate}</Badge>
                <Badge color="navy">Douleur: {c.vitals.painScore}/10</Badge>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// --- Prescriptions tab ---
type PrescriptionSubTab = 'actes-medicaux' | 'actes-infirmiers' | 'pharmacie' | 'laboratoire' | 'imagerie' | 'protocole';

const PRESCRIPTION_SUB_TABS: { id: PrescriptionSubTab; label: string }[] = [
  { id: 'actes-medicaux', label: 'Actes médicaux' },
  { id: 'actes-infirmiers', label: 'Actes infirmiers' },
  { id: 'pharmacie', label: 'Pharmacie' },
  { id: 'laboratoire', label: 'Laboratoire' },
  { id: 'imagerie', label: 'Imagerie' },
  { id: 'protocole', label: 'Protocole' },
];

function PrescriptionsTab({
  records,
  consultations,
  nursingRecords,
  labOrders,
  patient,
}: {
  records: Prescription[];
  consultations: Consultation[];
  nursingRecords: NursingCareRecord[];
  labOrders: LabOrder[];
  patient: Patient;
}) {
  const [subTab, setSubTab] = useState<PrescriptionSubTab>('actes-medicaux');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {PRESCRIPTION_SUB_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${subTab === t.id ? 'bg-medical-600 text-white' : 'bg-navy-50 text-navy-600 hover:bg-navy-100'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'actes-medicaux' && <MedicalActsList consultations={consultations} prescriptions={records} />}
      {subTab === 'actes-infirmiers' && <NursingActsList records={nursingRecords} />}
      {subTab === 'pharmacie' && <PharmacyPrescriptionsList records={records} />}
      {subTab === 'laboratoire' && <LabPrescriptionsList records={labOrders} patient={patient} />}
      {subTab === 'imagerie' && <ImagingTab patientId={patient.id} />}
      {subTab === 'protocole' && <ProtocolList patient={patient} consultations={consultations} prescriptions={records} />}
    </div>
  );
}

function ProtocolList({
  patient,
  consultations,
  prescriptions,
}: {
  patient: Patient;
  consultations: Consultation[];
  prescriptions: Prescription[];
}) {
  const protocolItems = [
    ...patient.chronicConditions.map((c) => ({
      id: `chronic-${c}`,
      title: `Suivi — ${c}`,
      detail: 'Pathologie chronique : surveillance régulière et traitement de fond',
      author: 'Protocole établissement',
    })),
    ...consultations
      .filter((c) => c.notes || c.diagnosis)
      .map((c) => ({
        id: `cons-${c.id}`,
        title: c.diagnosis ? `Conduite à tenir — ${c.diagnosis}` : 'Conduite à tenir',
        detail: c.notes || '',
        author: c.doctor,
      })),
    ...prescriptions
      .filter((rx) => rx.status === 'active')
      .map((rx) => ({
        id: `rx-${rx.id}`,
        title: `Traitement en cours — ${formatDate(rx.date)}`,
        detail: rx.medications.map((m) => `${m.name} ${m.dosage} (${m.frequency}, ${m.duration})`).join(' · '),
        author: rx.doctor,
      })),
  ];

  if (protocolItems.length === 0) {
    return <EmptyState icon={ClipboardList} title="Aucun protocole" subtitle="Le protocole de suivi et de traitement du patient apparaîtra ici" />;
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-navy-500">
        Synthèse du protocole de suivi et de traitement — {patient.firstName} {patient.lastName}
      </p>
      {protocolItems.map((item) => (
        <div key={item.id} className="bg-navy-50 rounded-lg p-4 border border-navy-100">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-medical-100 flex items-center justify-center flex-shrink-0">
              <ClipboardList className="w-4 h-4 text-medical-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-navy-900">{item.title}</p>
              {item.detail && <p className="text-xs text-navy-700 mt-0.5">{item.detail}</p>}
              <p className="text-xs text-navy-400 mt-1">{item.author}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MedicalActsList({
  consultations,
  prescriptions,
}: {
  consultations: Consultation[];
  prescriptions: Prescription[];
}) {
  if (consultations.length === 0 && prescriptions.length === 0) {
    return <EmptyState icon={Stethoscope} title="Aucun acte médical" subtitle="Les consultations et prescriptions médicales apparaîtront ici" />;
  }
  return (
    <div className="space-y-4">
      {consultations.map((c) => (
        <div key={c.id} className="bg-navy-50 rounded-lg p-4 border border-navy-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-medical-100 flex items-center justify-center">
                <Stethoscope className="w-4 h-4 text-medical-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-navy-900">Consultation — {c.doctor}</p>
                <p className="text-xs text-navy-500">{formatDate(c.date)} à {c.time}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {c.signature && (
                <Badge color="green"><CheckCircle2 className="w-3 h-3" /> Signé</Badge>
              )}
              <StatusBadge status={c.status} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-navy-400 font-medium">Motif</p>
              <p className="text-navy-700 mt-0.5">{c.chiefComplaint}</p>
            </div>
            <div>
              <p className="text-navy-400 font-medium">Diagnostic</p>
              <p className="text-navy-700 mt-0.5">{c.diagnosis || '—'}</p>
            </div>
          </div>
        </div>
      ))}
      {prescriptions.map((rx) => (
        <div key={rx.id} className="bg-navy-50 rounded-lg p-4 border border-navy-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-medical-100 flex items-center justify-center">
                <Stethoscope className="w-4 h-4 text-medical-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-navy-900">Prescription — {rx.doctor}</p>
                <p className="text-xs text-navy-500">{formatDate(rx.date)}</p>
              </div>
            </div>
            <StatusBadge status={rx.status} />
          </div>
          <div className="space-y-2">
            {rx.medications.map((med, idx) => (
              <div key={idx} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-navy-100">
                <div>
                  <p className="text-sm font-medium text-navy-900">{med.name} — {med.dosage}</p>
                  <p className="text-xs text-navy-500">{med.frequency} · {med.duration}</p>
                </div>
                <Badge color="navy">x{med.quantity}</Badge>
              </div>
            ))}
          </div>
          {rx.notes && <p className="text-xs text-navy-500 mt-3 italic">Note: {rx.notes}</p>}
        </div>
      ))}
    </div>
  );
}

function NursingActsList({ records }: { records: NursingCareRecord[] }) {
  if (records.length === 0) {
    return <EmptyState icon={HeartPulse} title="Aucun acte infirmier" subtitle="Les soins infirmiers apparaîtront ici" />;
  }
  return (
    <div className="space-y-4">
      {records.map((n) => (
        <div key={n.id} className="bg-navy-50 rounded-lg p-4 border border-navy-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-turquoise-100 flex items-center justify-center">
                <HeartPulse className="w-4 h-4 text-turquoise-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-navy-900">{n.careType}</p>
                <p className="text-xs text-navy-500">{formatDate(n.date)} à {n.time} — {n.nurse}</p>
              </div>
            </div>
            {n.signature && (
              <Badge color="green"><CheckCircle2 className="w-3 h-3" /> Signé</Badge>
            )}
          </div>
          <p className="text-sm text-navy-700 mb-2">{n.description}</p>
          {n.vitals && (
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge color="navy">TA: {n.vitals.bloodPressureSystolic}/{n.vitals.bloodPressureDiastolic}</Badge>
              <Badge color="navy">FC: {n.vitals.heartRate}</Badge>
              <Badge color="navy">T°: {n.vitals.temperature}°C</Badge>
              <Badge color="navy">SpO₂: {n.vitals.oxygenSaturation}%</Badge>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function PharmacyPrescriptionsList({ records }: { records: Prescription[] }) {
  if (records.length === 0) {
    return <EmptyState icon={Pill} title="Aucune prescription pharmacie" subtitle="Les prescriptions de médicaments apparaîtront ici" />;
  }
  return (
    <div className="space-y-4">
      {records.map((rx) => (
        <div key={rx.id} className="bg-navy-50 rounded-lg p-4 border border-navy-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-medical-100 flex items-center justify-center">
                <Pill className="w-4 h-4 text-medical-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-navy-900">{rx.doctor}</p>
                <p className="text-xs text-navy-500">{formatDate(rx.date)}</p>
              </div>
            </div>
            <StatusBadge status={rx.status} />
          </div>
          <div className="space-y-2">
            {rx.medications.map((med, idx) => (
              <div key={idx} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-navy-100">
                <div>
                  <p className="text-sm font-medium text-navy-900">{med.name} — {med.dosage}</p>
                  <p className="text-xs text-navy-500">{med.instructions || med.frequency}</p>
                </div>
                <Badge color="navy">x{med.quantity}</Badge>
              </div>
            ))}
          </div>
          {rx.notes && <p className="text-xs text-navy-500 mt-3 italic">Note: {rx.notes}</p>}
        </div>
      ))}
    </div>
  );
}

function LabPrescriptionsList({ records, patient }: { records: LabOrder[]; patient: Patient }) {
  const [printing, setPrinting] = useState<LabOrder | null>(null);

  if (records.length === 0) {
    return <EmptyState icon={FlaskConical} title="Aucune prescription laboratoire" subtitle="Les demandes d'analyses apparaîtront ici" />;
  }
  return (
    <div className="space-y-4">
      {printing && (
        <PrintPreview
          title={`Impression — résultat ${printing.id.toUpperCase()}`}
          onClose={() => setPrinting(null)}
        >
          <LabResultPrint order={printing} patient={patient} />
        </PrintPreview>
      )}
      {records.map((order) => (
        <div key={order.id} className="bg-navy-50 rounded-lg p-4 border border-navy-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-medical-100 flex items-center justify-center">
                <FlaskConical className="w-4 h-4 text-medical-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-navy-900">{order.doctor}</p>
                <p className="text-xs text-navy-500">{formatDate(order.date)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={order.priority} />
              <StatusBadge status={order.status} />
              <button
                onClick={() => setPrinting(order)}
                title="Imprimer le résultat"
                className="p-2 rounded-lg text-navy-400 hover:text-white hover:bg-medical-600 transition-colors"
              >
                <Printer className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-navy-400 border-b border-navy-200">
                  <th className="py-1.5 pr-3 font-medium">Code</th>
                  <th className="py-1.5 pr-3 font-medium">Analyse</th>
                  <th className="py-1.5 pr-3 font-medium">Résultat</th>
                  <th className="py-1.5 pr-3 font-medium">Normales</th>
                  <th className="py-1.5 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {order.tests.map((test) => (
                  <tr key={test.code}>
                    <td className="py-2 pr-3 font-mono text-navy-500">{test.code}</td>
                    <td className="py-2 pr-3 text-navy-700">{test.name}</td>
                    <td className="py-2 pr-3 text-navy-900 font-medium">
                      {test.result ? `${test.result}${test.unit ? ` ${test.unit}` : ''}` : '—'}
                    </td>
                    <td className="py-2 pr-3 text-navy-500">{test.normalRange ?? '—'}</td>
                    <td className="py-2">
                      {test.flag && test.flag !== 'normal' ? (
                        <Badge color={test.flag === 'critical' ? 'red' : 'amber'}>{test.flag}</Badge>
                      ) : (
                        <StatusBadge status={test.status} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Lab tab ---
function LabTab({ records, patient }: { records: LabOrder[]; patient: Patient }) {
  const [printing, setPrinting] = useState<LabOrder | null>(null);

  if (records.length === 0) {
    return <EmptyState icon={FlaskConical} title="Aucune analyse" subtitle="Les résultats d'analyses apparaîtront ici" />;
  }
  return (
    <div className="space-y-4">
      {printing && (
        <PrintPreview
          title={`Impression — résultat ${printing.id.toUpperCase()}`}
          onClose={() => setPrinting(null)}
        >
          <LabResultPrint order={printing} patient={patient} />
        </PrintPreview>
      )}
      {records.map((order) => (
        <div key={order.id} className="bg-navy-50 rounded-lg p-4 border border-navy-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-medical-100 flex items-center justify-center">
                <FlaskConical className="w-4 h-4 text-medical-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-navy-900">{order.doctor}</p>
                <p className="text-xs text-navy-500">{formatDate(order.date)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={order.priority} />
              <StatusBadge status={order.status} />
              <button
                onClick={() => setPrinting(order)}
                title="Imprimer le résultat"
                className="p-2 rounded-lg text-navy-400 hover:text-white hover:bg-medical-600 transition-colors"
              >
                <Printer className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-navy-400 border-b border-navy-200">
                  <th className="py-1.5 pr-3 font-medium">Code</th>
                  <th className="py-1.5 pr-3 font-medium">Analyse</th>
                  <th className="py-1.5 pr-3 font-medium">Résultat</th>
                  <th className="py-1.5 pr-3 font-medium">Normales</th>
                  <th className="py-1.5 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {order.tests.map((test) => (
                  <tr key={test.code}>
                    <td className="py-2 pr-3 font-mono text-navy-500">{test.code}</td>
                    <td className="py-2 pr-3 text-navy-700">{test.name}</td>
                    <td className="py-2 pr-3 text-navy-900 font-medium">
                      {test.result ? `${test.result}${test.unit ? ` ${test.unit}` : ''}` : '—'}
                    </td>
                    <td className="py-2 pr-3 text-navy-500">{test.normalRange ?? '—'}</td>
                    <td className="py-2">
                      {test.flag && test.flag !== 'normal' ? (
                        <Badge color={test.flag === 'critical' ? 'red' : 'amber'}>{test.flag}</Badge>
                      ) : (
                        <StatusBadge status={test.status} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Nursing tab ---
function NursingTab({ records }: { records: NursingCareRecord[] }) {
  if (records.length === 0) {
    return <EmptyState icon={HeartPulse} title="Aucun soin" subtitle="Les soins infirmiers apparaîtront ici" />;
  }
  return (
    <div className="space-y-4">
      {records.map((n) => (
        <div key={n.id} className="bg-navy-50 rounded-lg p-4 border border-navy-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-turquoise-100 flex items-center justify-center">
                <HeartPulse className="w-4 h-4 text-turquoise-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-navy-900">{n.careType}</p>
                <p className="text-xs text-navy-500">{formatDate(n.date)} à {n.time} — {n.nurse}</p>
              </div>
            </div>
            {n.signature && (
              <Badge color="green"><CheckCircle2 className="w-3 h-3" /> Signé</Badge>
            )}
          </div>
          <p className="text-sm text-navy-700 mb-2">{n.description}</p>
          {n.vitals && (
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge color="navy">TA: {n.vitals.bloodPressureSystolic}/{n.vitals.bloodPressureDiastolic}</Badge>
              <Badge color="navy">FC: {n.vitals.heartRate}</Badge>
              <Badge color="navy">T°: {n.vitals.temperature}°C</Badge>
              <Badge color="navy">SpO₂: {n.vitals.oxygenSaturation}%</Badge>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// --- Dossier médical tab (chronologie médicale complète) ---
type MedicalEntry = {
  key: string;
  date: string;
  time: string;
  category: string;
  icon: typeof Stethoscope;
  iconColor: string;
  title: string;
  author: string;
  badge?: string;
  badgeColor?: 'navy' | 'green' | 'red' | 'amber' | 'blue' | 'turquoise';
  lines: string[];
  vitals?: Vitals;
};

function vitalBadges(v: Vitals) {
  return [
    `TA: ${v.bloodPressureSystolic}/${v.bloodPressureDiastolic} mmHg`,
    `FC: ${v.heartRate} bpm`,
    `T°: ${v.temperature} °C`,
    `SpO₂: ${v.oxygenSaturation} %`,
    `FR: ${v.respiratoryRate}/min`,
    `Poids: ${v.weight} kg`,
    `Taille: ${v.height} cm`,
    `Douleur: ${v.painScore}/10`,
  ];
}

function MedicalFileTab({
  patient,
  consultations,
  admissions,
  prescriptions,
  labOrders,
  nursingCare,
  imaging,
  forms,
}: {
  patient: Patient;
  consultations: Consultation[];
  admissions: Admission[];
  prescriptions: Prescription[];
  labOrders: LabOrder[];
  nursingCare: NursingCareRecord[];
  imaging: ImagingReport[];
  forms: PatientForm[];
}) {
  const imagingModelsById = useMemo(
    () => Object.fromEntries(imagingModels.map((m) => [m.id, m])),
    [],
  );
  const formTemplatesById = useMemo(
    () => Object.fromEntries(formTemplates.map((t) => [t.id, t])),
    [],
  );

  const entries: MedicalEntry[] = useMemo(() => {
    const list: MedicalEntry[] = [];

    consultations.forEach((c) => {
      list.push({
        key: `c-${c.id}`,
        date: c.date,
        time: c.time,
        category: 'Consultation',
        icon: Stethoscope,
        iconColor: 'bg-medical-100 text-medical-600',
        title: `Consultation — ${c.chiefComplaint}`,
        author: c.doctor,
        badge: c.signature ? 'Signé' : undefined,
        badgeColor: 'green',
        lines: [
          c.diagnosis ? `Diagnostic : ${c.diagnosis}` : '',
          c.examination ? `Examen : ${c.examination}` : '',
          c.history ? `Antécédents / histoire : ${c.history}` : '',
          c.notes ? `Notes : ${c.notes}` : '',
        ].filter(Boolean),
        vitals: c.vitals,
      });
    });

    admissions.forEach((a) => {
      list.push({
        key: `a-${a.id}`,
        date: a.date,
        time: a.time,
        category: 'Hospitalisation',
        icon: BedDouble,
        iconColor: 'bg-navy-200 text-navy-700',
        title: `Hospitalisation — ${a.reason}`,
        author: a.assignedDoctor ? getDoctorName(a.assignedDoctor) : 'Équipe de garde',
        badge: a.priority !== 'normal' ? a.priority === 'urgent' ? 'Urgent' : 'Critique' : undefined,
        badgeColor: a.priority === 'normal' ? undefined : a.priority === 'urgent' ? 'amber' : 'red',
        lines: [
          `Service : ${a.department}`,
          a.bedNumber ? `Lit : ${a.bedNumber}` : '',
        ].filter(Boolean),
      });
    });

    nursingCare.forEach((n) => {
      list.push({
        key: `n-${n.id}`,
        date: n.date,
        time: n.time,
        category: 'Soin',
        icon: HeartPulse,
        iconColor: 'bg-turquoise-100 text-turquoise-700',
        title: `Soin infirmier — ${n.careType}`,
        author: n.nurse,
        badge: n.signature ? 'Signé' : undefined,
        badgeColor: 'green',
        lines: [n.description].filter(Boolean),
        vitals: n.vitals,
      });
    });

    prescriptions.forEach((p) => {
      list.push({
        key: `p-${p.id}`,
        date: p.date,
        time: '',
        category: 'Prescription',
        icon: Pill,
        iconColor: 'bg-blue-100 text-medical-700',
        title: `Prescription — ${p.medications.length} médicament(s)`,
        author: p.doctor,
        lines: p.medications.map((m) => `${m.name} ${m.dosage} — ${m.frequency}, ${m.duration} (x${m.quantity})`),
      });
    });

    labOrders.forEach((l) => {
      const done = l.tests.filter((t) => t.result).length;
      list.push({
        key: `l-${l.id}`,
        date: l.date,
        time: '',
        category: 'Biologie',
        icon: FlaskConical,
        iconColor: 'bg-sky-100 text-sky-700',
        title: `Analyses de biologie — ${l.tests.length} examen(s)`,
        author: l.doctor,
        badge: done === l.tests.length ? `${done}/${l.tests.length} résultats` : done > 0 ? `En cours — ${done}/${l.tests.length}` : 'Prescrit',
        badgeColor: done === l.tests.length ? 'green' : done > 0 ? 'amber' : 'navy',
        lines: l.tests.map((t) =>
          t.result
            ? `${t.name} : ${t.result}${t.unit ? ` ${t.unit}` : ''} (normales : ${t.normalRange ?? '—'})${t.flag && t.flag !== 'normal' ? ` ⚠ ${t.flag}` : ''}`
            : `${t.name} : résultat en attente`,
        ),
      });
    });

    imaging.forEach((r) => {
      const model = imagingModelsById[r.modelId];
      list.push({
        key: `i-${r.id}`,
        date: r.date,
        time: r.time,
        category: 'Imagerie',
        icon: ScanLine,
        iconColor: 'bg-navy-100 text-navy-600',
        title: model ? model.name : 'Compte rendu d\u2019imagerie',
        author: r.radiologist,
        badge: r.status === 'valide' ? 'Validé' : r.status === 'complete' ? 'Complété' : 'Brouillon',
        badgeColor: r.status === 'valide' ? 'green' : r.status === 'complete' ? 'navy' : 'amber',
        lines: Object.entries(r.values)
          .filter(([k, v]) => k !== 'indication' && v)
          .map(([, v]) => v as string)
          .slice(0, 4),
      });
    });

    forms.forEach((f) => {
      const template = formTemplatesById[f.templateId];
      list.push({
        key: `f-${f.id}`,
        date: f.date,
        time: f.time,
        category: 'Formulaire',
        icon: ClipboardList,
        iconColor: 'bg-amber-100 text-amber-700',
        title: template ? template.name : 'Formulaire médical',
        author: f.author,
        badge: FORM_STATUS_META[f.status]?.label,
        badgeColor: FORM_STATUS_META[f.status]?.color,
        lines: Object.entries(f.values)
          .filter(([, v]) => v && v !== 'false')
          .map(([k, v]) => `${k} : ${v === 'true' ? 'Oui' : v}`)
          .slice(0, 6),
      });
    });

    return list.sort((a, b) => {
      const d = b.date.localeCompare(a.date);
      if (d !== 0) return d;
      return b.time.localeCompare(a.time);
    });
  }, [consultations, admissions, prescriptions, labOrders, nursingCare, imaging, forms, imagingModelsById, formTemplatesById]);

  const byDay = useMemo(() => {
    const map = new Map<string, MedicalEntry[]>();
    entries.forEach((e) => {
      const arr = map.get(e.date) ?? [];
      arr.push(e);
      map.set(e.date, arr);
    });
    return Array.from(map.entries());
  }, [entries]);

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={FolderHeart}
        title="Aucun enregistrement médical"
        subtitle="Les consultations, soins, prescriptions, examens et formulaires apparaîtront ici par ordre chronologique"
      />
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <p className="text-sm font-semibold text-navy-900">
            Chronologie médicale — {patient.firstName} {patient.lastName}
          </p>
          <p className="text-xs text-navy-400 mt-0.5">
            {entries.length} enregistrement(s) — consultations, hospitalisations, soins, constantes, prescriptions, biologie, imagerie, formulaires
          </p>
        </div>
        <p className="text-xs text-navy-400">Du plus récent au plus ancien</p>
      </div>

      <div className="space-y-6">
        {byDay.map(([date, dayEntries]) => (
          <div key={date}>
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-sky-700" />
              <p className="text-sm font-bold text-navy-900">{formatDate(date)}</p>
              <span className="text-xs text-navy-400">({dayEntries.length})</span>
              <div className="flex-1 border-t border-navy-100" />
            </div>
            <div className="space-y-3 border-l-2 border-sky-100 ml-1 pl-4">
              {dayEntries.map((e) => {
                const Icon = e.icon;
                return (
                  <div key={e.key} className="relative">
                    <span className="absolute -left-[22px] top-4 w-2.5 h-2.5 rounded-full bg-sky-500 ring-2 ring-white" />
                    <div className="bg-navy-50 rounded-lg border border-navy-100 p-4 hover:bg-navy-100 transition-colors">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${e.iconColor}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-navy-900">{e.title}</p>
                            <p className="text-xs text-navy-500 mt-0.5">
                              {e.category} · {e.time || '—'} · {e.author}
                            </p>
                          </div>
                        </div>
                        {e.badge && e.badgeColor && <Badge color={e.badgeColor}>{e.badge}</Badge>}
                      </div>
                      {e.lines.length > 0 && (
                        <div className="mt-2 space-y-0.5">
                          {e.lines.map((line, i) => (
                            <p key={i} className="text-xs text-navy-600 leading-relaxed">{line}</p>
                          ))}
                        </div>
                      )}
                      {e.vitals && (
                        <div className="mt-2.5 pt-2.5 border-t border-navy-200">
                          <p className="text-navy-400 font-medium text-xs mb-1.5">Constantes</p>
                          <div className="flex flex-wrap gap-1.5">
                            {vitalBadges(e.vitals).map((b) => (
                              <Badge key={b} color="navy">{b}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Documents tab ---
interface DocItem {
  id: string;
  type: string;
  label: string;
  date: string;
  size: string;
  status: string;
}

function DocumentsTab({ records, documents }: { records: Invoice[]; documents: PatientDocument[] }) {
  const docs: DocItem[] = [
    ...records.map((inv) => ({
      id: inv.id,
      type: 'Facture',
      label: inv.number,
      date: inv.date,
      size: 'PDF · 1 page',
      status: inv.status,
    })),
    ...documents.map((d) => ({
      id: d.id,
      type: d.kind,
      label: d.label,
      date: d.date,
      size: d.format,
      status: 'verified',
    })),
  ];

  if (docs.length === 0) {
    return <EmptyState icon={FolderOpen} title="Aucun document" subtitle="Les documents apparaîtront ici" />;
  }

  return (
    <div className="space-y-2.5">
      {docs.map((doc) => (
        <div key={doc.id} className="flex items-center gap-3 bg-navy-50 rounded-lg p-3 border border-navy-100 hover:bg-navy-100 transition-colors cursor-pointer">
          <div className="w-9 h-9 rounded-lg bg-navy-200 flex items-center justify-center flex-shrink-0">
            <FileText className="w-4 h-4 text-navy-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-navy-900">{doc.label}</p>
              <Badge color="navy">{doc.type}</Badge>
            </div>
            <p className="text-xs text-navy-500 mt-0.5">{formatDate(doc.date)} · {doc.size}</p>
          </div>
          <StatusBadge status={doc.status} />
        </div>
      ))}
    </div>
  );
}

// --- History tab ---
function HistoryTab({
  consultations,
  admissions,
  prescriptions,
  labOrders,
  nursingCare,
  invoices,
  imaging,
}: {
  consultations: Consultation[];
  admissions: Admission[];
  prescriptions: Prescription[];
  labOrders: LabOrder[];
  nursingCare: NursingCareRecord[];
  invoices: Invoice[];
  imaging: ImagingReport[];
}) {
  type HistoryEntry = { date: string; time: string; label: string; detail: string; icon: typeof FileText };
  const history: HistoryEntry[] = [
    ...consultations.map((c) => ({ date: c.date, time: c.time, label: 'Consultation', detail: `${c.doctor} — ${c.chiefComplaint}`, icon: Stethoscope })),
    ...admissions.map((a) => ({ date: a.date, time: a.time, label: 'Hospitalisation', detail: `${a.department} — ${a.reason}`, icon: BedDouble })),
    ...prescriptions.map((p) => ({ date: p.date, time: '', label: 'Prescription', detail: `${p.doctor} — ${p.medications.length} médicament(s)`, icon: Pill })),
    ...imaging.map((r) => ({ date: r.date, time: r.time, label: 'Imagerie', detail: `${r.values.conclusion ?? 'Compte rendu d\'imagerie'} — ${r.radiologist}`, icon: ScanLine })),
    ...labOrders.map((l) => ({ date: l.date, time: '', label: 'Analyse labo', detail: `${l.doctor} — ${l.tests.length} test(s)`, icon: FlaskConical })),
    ...nursingCare.map((n) => ({ date: n.date, time: n.time, label: 'Soin infirmier', detail: `${n.careType} — ${n.nurse}`, icon: HeartPulse })),
    ...invoices.map((i) => ({ date: i.date, time: '', label: 'Facture', detail: `${i.number} — ${formatFCFA(i.total)}`, icon: Receipt })),
  ].sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date);
    if (dateCompare !== 0) return dateCompare;
    return b.time.localeCompare(a.time);
  });

  if (history.length === 0) {
    return <EmptyState icon={History} title="Aucun historique" subtitle="L'historique des événements apparaîtra ici" />;
  }

  return (
    <div className="space-y-3">
      {history.map((entry, idx) => (
        <div key={idx} className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-lg bg-navy-100 flex items-center justify-center flex-shrink-0">
              <entry.icon className="w-4 h-4 text-navy-600" />
            </div>
            {idx < history.length - 1 && <div className="w-px flex-1 bg-navy-100 mt-1" />}
          </div>
          <div className="flex-1 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-navy-400">
                {formatDate(entry.date)}{entry.time && ` à ${entry.time}`}
              </span>
              <Badge color="navy">{entry.label}</Badge>
            </div>
            <p className="text-sm text-navy-800 mt-1">{entry.detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function AdmittedPatientsScreen({ onSelectPatient }: { onSelectPatient: (patientId: string) => void }) {
  return (
    <div className="p-6">
      <Card>
        <div className="p-5">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-navy-900">Patients admis</h2>
            <p className="text-sm text-navy-500 mt-0.5">Patients ayant au moins un épisode de soins actif</p>
          </div>
          <AdmittedPatientsView
            patients={homonymPatients}
            episodes={getAllEpisodes()}
            onSelectPatient={onSelectPatient}
          />
        </div>
      </Card>
    </div>
  );
}
