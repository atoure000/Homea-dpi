import { useState, useMemo } from 'react';
import {
  Stethoscope,
  CheckCircle2,
  Lock,
  History,
  FileText,
  Loader2,
  AlertTriangle,
  Printer,
  Save,
  Check,
  X,
  Plus,
  ArrowLeft,
  FolderOpen,
  ClipboardList,
} from 'lucide-react';
import type { Consultation, ConsultationFormType, ConsultationFormStatus, FormValues, FormRows, Episode } from '@/types';
import { EPISODE_TYPE_LABELS, ADMIN_STATUS_LABELS, CARE_STATUS_LABELS } from '@/types';
import {
  Card,
  CardHeader,
  Badge,
  StatusBadge,
  Button,
  Select,
  EmptyState,
} from '@/components/ui';
import { patients } from '@/data/patients';
import { consultations } from '@/data/consultations';
import { formatDate } from '@/utils/format';
import { formDefinitions, demoFormValues, demoRows } from '@/data/consultationForms';
import { doctors, getDoctorName } from '@/data/doctors';
import type { LoginSession } from '@/screens/Login';
import {
  GeneralConsultationForm,
  GynecologicalConsultationForm,
  ObstetricalConsultationForm,
  ConsultationFormIcon,
} from '@/components/ConsultationForms';
import { getAllEpisodes } from '@/data/episodes';

type SignState = 'idle' | 'signing' | 'signed';

const formMeta: { id: ConsultationFormType; name: string; description: string }[] = [
  {
    id: 'general',
    name: 'Consultation générale',
    description: 'Consultation médicale courante : motif, constantes, examen clinique et prise en charge.',
  },
  {
    id: 'gynecological',
    name: 'Consultation gynécologique',
    description: 'Suivi gynécologique : motif, histoire, examen et conclusion spécialisée.',
  },
  {
    id: 'obstetrical',
    name: 'Consultation obstétricale',
    description: 'Dossier obstétrical longitudinal : grossesse, consultations prénatales, accouchement et post-partum.',
  },
];

const statusLabel: Record<ConsultationFormStatus, string> = {
  draft: 'Brouillon',
  validated: 'Validée',
  signed: 'Signée',
};

const DEMO_LOGIN_TO_DOCTOR: Record<string, string> = {
  'm.diallo': 'doc001',
  'a.kone': 'doc001',
  'n.coulibaly': 'doc002',
};

export default function Consultation({ session }: { session?: LoginSession | null }) {
  const connectedDoctorId = session
    ? DEMO_LOGIN_TO_DOCTOR[session.identifiant] ?? doctors[0]?.id ?? ''
    : doctors[0]?.id ?? '';
  const [admittedFilter, setAdmittedFilter] = useState<'connected' | 'all' | string>('connected');
  const [selectedPatientId, setSelectedPatientId] = useState<string>(patients[0]?.id ?? '');
  const [formType, setFormType] = useState<ConsultationFormType | null>(null);
  const [values, setValues] = useState<FormValues>({});
  const [rows, setRows] = useState<Record<string, FormRows>>({});
  const [status, setStatus] = useState<ConsultationFormStatus>('draft');
  const [signState, setSignState] = useState<SignState>('idle');
  const [showErrors, setShowErrors] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showPrint, setShowPrint] = useState(false);
  const [showComplement, setShowComplement] = useState(false);
  const [complementText, setComplementText] = useState('');
  const [complements, setComplements] = useState<string[]>([]);
  const [pendingType, setPendingType] = useState<ConsultationFormType | null>(null);
  const [showAdmittedList, setShowAdmittedList] = useState(false);
  const [episodeTick, setEpisodeTick] = useState(0);

  const activeEpisodes = useMemo(() => {
    void episodeTick;
    return getAllEpisodes().filter((e) => e.status === 'actif');
  }, [episodeTick]);

  const filteredAdmittedEpisodes = useMemo(() => {
    if (admittedFilter === 'all') return activeEpisodes;
    const doctorId = admittedFilter === 'connected' ? connectedDoctorId : admittedFilter;
    if (!doctorId) return activeEpisodes;
    return activeEpisodes.filter((e) => e.practitionerId === doctorId);
  }, [activeEpisodes, admittedFilter, connectedDoctorId]);

  const patient = useMemo(
    () => patients.find((p) => p.id === selectedPatientId),
    [selectedPatientId],
  );

  const previousConsultations = useMemo(
    () => consultations.filter((c) => c.patientId === selectedPatientId),
    [selectedPatientId],
  );

  const patientSelectOptions = patients.map((p) => ({
    value: p.id,
    label: `${p.firstName} ${p.lastName} — ${p.code}`,
  }));

  const hasData = useMemo(() => {
    const anyValue = Object.values(values).some((v) => v && v.trim() !== '');
    const anyRow = Object.values(rows).some((r) => r.length > 0);
    return anyValue || anyRow;
  }, [values, rows]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 3000);
  }

  function resetForm() {
    setValues({});
    setRows({});
    setStatus('draft');
    setSignState('idle');
    setShowErrors(false);
    setComplements([]);
    setComplementText('');
  }

  function handlePatientChange(id: string) {
    setSelectedPatientId(id);
    setFormType(null);
    resetForm();
  }

  function handleSelectType(type: ConsultationFormType) {
    setFormType(type);
    setValues({ ...demoFormValues[type] });
    setRows(JSON.parse(JSON.stringify(demoRows[type])));
    setStatus('draft');
    setSignState('idle');
    setShowErrors(false);
    setComplements([]);
  }

  function handleBackToChoice() {
    if (hasData) {
      if (window.confirm('Des données ont été saisies. Revenir au choix du formulaire ? (simulation)')) {
        setFormType(null);
        resetForm();
      }
    } else {
      setFormType(null);
      resetForm();
    }
  }

  function confirmChangeType() {
    if (pendingType) {
      handleSelectType(pendingType);
      setPendingType(null);
    }
  }

  function handleValueChange(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleRowsChange(key: string, next: FormRows) {
    setRows((prev) => ({ ...prev, [key]: next }));
  }

  function validateRequired(): boolean {
    if (!formType) return true;
    const def = formDefinitions[formType];
    for (const section of def.sections) {
      for (const field of section.fields) {
        if (field.required) {
          const visible = !field.conditional || values[field.conditional.key] === field.conditional.value;
          if (visible && !values[field.key]?.trim()) {
            return false;
          }
        }
      }
    }
    return true;
  }

  function handleSaveDraft() {
    setStatus('draft');
    notify('Brouillon enregistré (simulation)');
  }

  function handleValidate() {
    if (!validateRequired()) {
      setShowErrors(true);
      notify('Certains champs obligatoires sont manquants');
      return;
    }
    setShowErrors(false);
    setStatus('validated');
    notify('Consultation validée (simulation)');
  }

  function handleSign() {
    if (signState !== 'idle') return;
    setSignState('signing');
    window.setTimeout(() => {
      setSignState('signed');
      setStatus('signed');
      notify('Consultation signée (simulation)');
    }, 1200);
  }

  function handleCancel() {
    if (!hasData) {
      setFormType(null);
      resetForm();
      return;
    }
    if (window.confirm('Abandonner les modifications de cette consultation ?')) {
      setFormType(null);
      resetForm();
    }
  }

  function handlePrint() {
    setShowPrint(true);
  }

  function handleAddComplement() {
    if (complementText.trim()) {
      setComplements((prev) => [...prev, complementText.trim()]);
      setComplementText('');
      setShowComplement(false);
      notify('Complément ajouté (simulation)');
    }
  }

  const isReadOnly = status === 'validated' || status === 'signed' || signState === 'signed';
  const isSigning = signState === 'signing';

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-navy-900">Consultation médicale</h2>
          <p className="text-sm text-navy-500 mt-0.5">Saisie, validation et signature électronique de la consultation</p>
        </div>
        <div className="flex items-center gap-3">
          {formType && (
            <Badge color={status === 'signed' ? 'green' : status === 'validated' ? 'blue' : 'navy'}>
              {status === 'signed' ? <CheckCircle2 className="w-3 h-3" /> : status === 'validated' ? <Check className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
              {statusLabel[status]}
            </Badge>
          )}
          {isSigning && (
            <Badge color="blue">
              <Loader2 className="w-3 h-3 animate-spin" />
              Signature en cours...
            </Badge>
          )}
          <div className="w-80">
            <Select
              label=""
              value={selectedPatientId}
              onChange={handlePatientChange}
              options={patientSelectOptions}
            />
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-navy-900 text-white text-sm px-4 py-3 rounded-lg shadow-lg animate-fade-in">
          {toast}
        </div>
      )}

      {/* Patient banner */}
      {patient && (
        <Card>
          <div className="p-4 flex items-center gap-3 flex-wrap">
            <div className="w-12 h-12 rounded-xl bg-navy-200 flex items-center justify-center text-sm font-bold text-navy-700">
              {patient.firstName.charAt(0)}{patient.lastName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-navy-900">
                {patient.firstName} {patient.lastName}
              </p>
              <p className="text-xs text-navy-500">
                {patient.code} · {patient.gender === 'M' ? 'Homme' : 'Femme'}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Patients admis — file de travail médecin */}
      <Card>
        <CardHeader
          title="Patients admis"
          subtitle={`${filteredAdmittedEpisodes.length} épisode(s) actif(s)${admittedFilter !== 'all' && admittedFilter !== 'connected' ? ` — ${getDoctorName(admittedFilter)}` : admittedFilter === 'connected' && connectedDoctorId ? ` — ${getDoctorName(connectedDoctorId)}` : ' — tous médecins'}`}
          action={
            <Button variant="ghost" size="sm" onClick={() => setShowAdmittedList((v) => !v)}>
              {showAdmittedList ? 'Masquer' : 'Afficher'}
            </Button>
          }
        />
        {showAdmittedList && (
          <div className="overflow-x-auto">
            {/* Filtre par médecin + bouton « Tous les patients admis » */}
            <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-navy-100 bg-navy-50/40">
              <div className="flex items-center gap-2">
                <label htmlFor="admitted-doctor-filter" className="text-xs font-semibold text-navy-600">Médecin</label>
                <select
                  id="admitted-doctor-filter"
                  value={admittedFilter}
                  onChange={(e) => setAdmittedFilter(e.target.value)}
                  className="rounded-md border border-navy-200 bg-white px-2 py-1 text-xs text-navy-900 focus:outline-none focus:ring-2 focus:ring-medical-400"
                >
                  <option value="connected">
                    {connectedDoctorId ? `${getDoctorName(connectedDoctorId)} (connecté)` : 'Médecin connecté'}
                  </option>
                  <option value="all">Tous les médecins</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>Dr. {d.firstName} {d.lastName}</option>
                  ))}
                </select>
              </div>
              <Button
                variant={admittedFilter === 'all' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setAdmittedFilter('all')}
              >
                <ClipboardList className="w-3.5 h-3.5 mr-1" /> Tous les patients admis
              </Button>
            </div>
            {filteredAdmittedEpisodes.length === 0 ? (
              <EmptyState icon={ClipboardList} title="Aucun patient admis" subtitle="Aucune admission ne correspond au filtre sélectionné" />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-navy-100 text-left text-navy-500">
                    <th className="px-5 py-2.5 font-medium">Patient</th>
                    <th className="px-5 py-2.5 font-medium">N° venue</th>
                    <th className="px-5 py-2.5 font-medium">Médecin</th>
                    <th className="px-5 py-2.5 font-medium">Type</th>
                    <th className="px-5 py-2.5 font-medium">Date/heure</th>
                    <th className="px-5 py-2.5 font-medium">Motif</th>
                    <th className="px-5 py-2.5 font-medium">Statut admin.</th>
                    <th className="px-5 py-2.5 font-medium">Prise en charge</th>
                    <th className="px-5 py-2.5 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAdmittedEpisodes.map((ep: Episode) => {
                    const p = patients.find((pt) => pt.id === ep.patientId);
                    if (!p) return null;
                    return (
                      <tr key={ep.id} className="border-b border-navy-50 hover:bg-navy-50/50 transition-colors">
                        <td className="px-5 py-3">
                          <p className="font-medium text-navy-900">{p.firstName} {p.lastName}</p>
                          <p className="text-xs text-navy-400 font-mono">{p.code}</p>
                        </td>
                        <td className="px-5 py-3 font-mono text-xs text-navy-700">{ep.episodeNumber}</td>
                        <td className="px-5 py-3 text-xs text-navy-700">{ep.practitionerId ? getDoctorName(ep.practitionerId) : '—'}</td>
                        <td className="px-5 py-3 text-navy-700">{EPISODE_TYPE_LABELS[ep.type]}</td>
                        <td className="px-5 py-3 text-xs text-navy-500 whitespace-nowrap">{ep.admittedAt.replace('T', ' ')}</td>
                        <td className="px-5 py-3 text-xs text-navy-600 max-w-[200px] truncate">{ep.admissionReason}</td>
                        <td className="px-5 py-3"><Badge color="amber">{ADMIN_STATUS_LABELS[ep.administrativeStatus]}</Badge></td>
                        <td className="px-5 py-3"><Badge color={ep.careStatus === 'termine' ? 'green' : ep.careStatus === 'en-cours' ? 'blue' : 'navy'}>{CARE_STATUS_LABELS[ep.careStatus]}</Badge></td>
                        <td className="px-5 py-3">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => { setSelectedPatientId(p.id); setFormType(null); resetForm(); setShowAdmittedList(false); }}
                          >
                            <FolderOpen className="w-3.5 h-3.5 mr-1" /> Ouvrir
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </Card>

      {/* Form type selector */}
      {!formType ? (
        <Card>
          <CardHeader title="Choisir le type de consultation" subtitle="Sélectionnez le formulaire électronique à utiliser" />
          <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            {formMeta.map((meta) => (
              <div
                key={meta.id}
                className="border border-navy-100 rounded-xl p-5 flex flex-col hover:border-medical-300 hover:shadow-md transition-all"
              >
                <div className="w-11 h-11 rounded-xl bg-medical-50 text-medical-600 flex items-center justify-center mb-3">
                  <ConsultationFormIcon type={meta.id} />
                </div>
                <h3 className="font-semibold text-navy-900">{meta.name}</h3>
                <p className="text-xs text-navy-500 mt-1.5 flex-1">{meta.description}</p>
                <Button className="mt-4 w-full" onClick={() => handleSelectType(meta.id)}>
                  Sélectionner
                </Button>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main form */}
          <div className="lg:col-span-2 space-y-4">
            {/* Selected type + change */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-medical-50 text-medical-600 flex items-center justify-center">
                  <ConsultationFormIcon type={formType} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-navy-900">{formMeta.find((m) => m.id === formType)?.name}</p>
                  <p className="text-xs text-navy-500">Formulaire associé à la consultation en cours</p>
                </div>
              </div>
              {!isReadOnly && (
                <Button variant="ghost" size="sm" onClick={handleBackToChoice}>
                  <ArrowLeft className="w-4 h-4 mr-1" /> Revenir au choix
                </Button>
              )}
            </div>

            {/* Signing overlay */}
            {isSigning && (
              <div className="flex items-center gap-3 bg-medical-50 border border-medical-200 rounded-xl px-5 py-4 animate-fade-in">
                <Loader2 className="w-5 h-5 text-medical-600 animate-spin" />
                <div>
                  <p className="text-sm font-semibold text-medical-800">Signature électronique en cours...</p>
                  <p className="text-xs text-medical-600">Vérification de l'identité du praticien et horodatage</p>
                </div>
              </div>
            )}

            {/* Signed confirmation */}
            {status === 'signed' && (
              <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-5 py-4 animate-fade-in">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-green-800">Consultation signée et verrouillée</p>
                  <p className="text-xs text-green-600">
                    Signé le {formatDate(new Date().toISOString().split('T')[0])} à {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} — Dr. Kouadio N'Guessan
                  </p>
                </div>
              </div>
            )}

            {/* Read-only recap */}
            {isReadOnly ? (
              <Card>
                <CardHeader
                  title="Vue récapitulative"
                  subtitle="Consultation en lecture seule"
                  action={<Lock className="w-4 h-4 text-navy-400" />}
                />
                <div className="p-5 space-y-3">
                  {formDefinitions[formType].sections.map((section) => {
                    const filled = section.fields.filter((f) => values[f.key]?.trim());
                    const sectionTables = formType === 'obstetrical'
                      ? ['previousPregnancies', 'prenatalConsultations', 'imagingExams', 'hospitalizations', 'newborns']
                        .filter((k) => (rows[k] || []).length > 0)
                      : [];
                    if (filled.length === 0 && sectionTables.length === 0) return null;
                    return (
                      <div key={section.id} className="border border-navy-100 rounded-lg p-3">
                        <p className="text-sm font-semibold text-navy-900 mb-2">{section.title}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                          {filled.map((f) => (
                            <div key={f.key}>
                              <p className="text-xs text-navy-400 font-medium">{f.label}</p>
                              <p className="text-sm text-navy-800 whitespace-pre-wrap">{values[f.key]}</p>
                            </div>
                          ))}
                        </div>
                        {sectionTables.map((k) => (
                          <div key={k} className="mt-2">
                            <p className="text-xs text-navy-400 font-medium mb-1">
                              {repeatTableTitle(k)} ({rows[k].length})
                            </p>
                            <div className="space-y-1">
                              {(rows[k] || []).map((r, i) => (
                                <p key={i} className="text-xs text-navy-700">
                                  {Object.values(r).filter(Boolean).slice(0, 4).join(' · ')}
                                </p>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}

                  {complements.length > 0 && (
                    <div className="border border-turquoise-200 bg-turquoise-50 rounded-lg p-3">
                      <p className="text-sm font-semibold text-navy-900 mb-2">Compléments ajoutés</p>
                      {complements.map((c, i) => (
                        <p key={i} className="text-sm text-navy-800 flex items-start gap-2">
                          <Plus className="w-3.5 h-3.5 mt-0.5 text-turquoise-600 flex-shrink-0" />
                          {c}
                        </p>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2">
                    <Button variant="secondary" size="sm" onClick={() => setShowComplement(true)}>
                      <Plus className="w-4 h-4 mr-1" /> Ajouter un complément
                    </Button>
                  </div>
                </div>
              </Card>
            ) : (
              <Card>
                <CardHeader
                  title="Formulaire de consultation"
                  subtitle="Saisie des observations — les données sont fictives et locales"
                />
                <div className="p-5">
                  {formType === 'general' && (
                    <GeneralConsultationForm
                      values={values}
                      onChange={handleValueChange}
                      rows={rows}
                      onRowsChange={handleRowsChange}
                      showErrors={showErrors}
                    />
                  )}
                  {formType === 'gynecological' && (
                    <GynecologicalConsultationForm
                      values={values}
                      onChange={handleValueChange}
                      rows={rows}
                      onRowsChange={handleRowsChange}
                      showErrors={showErrors}
                    />
                  )}
                  {formType === 'obstetrical' && (
                    <ObstetricalConsultationForm
                      values={values}
                      onChange={handleValueChange}
                      rows={rows}
                      onRowsChange={handleRowsChange}
                      showErrors={showErrors}
                    />
                  )}
                </div>

                {/* Actions */}
                <div className="px-5 py-4 border-t border-navy-100 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-xs text-navy-400">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Brouillon — non signé</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button variant="ghost" size="sm" onClick={handleCancel}>
                      <X className="w-4 h-4 mr-1" /> Annuler
                    </Button>
                    <Button variant="secondary" size="sm" onClick={handlePrint}>
                      <Printer className="w-4 h-4 mr-1" /> Imprimer l'aperçu
                    </Button>
                    <Button variant="secondary" size="sm" onClick={handleSaveDraft}>
                      <Save className="w-4 h-4 mr-1" /> Enregistrer le brouillon
                    </Button>
                    <Button variant="secondary" size="sm" onClick={handleValidate}>
                      <Check className="w-4 h-4 mr-1" /> Valider la consultation
                    </Button>
                    <Button size="sm" onClick={handleSign}>
                      <Lock className="w-4 h-4 mr-1" /> Signer
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader
                title="Historique des consultations"
                subtitle={`${previousConsultations.length} consultation(s) antérieure(s)`}
                action={<History className="w-4 h-4 text-navy-400" />}
              />
              <div className="p-5">
                {previousConsultations.length === 0 ? (
                  <EmptyState
                    icon={Stethoscope}
                    title="Aucune consultation antérieure"
                    subtitle="Première consultation pour ce patient"
                  />
                ) : (
                  <div className="space-y-3">
                    {previousConsultations.map((c: Consultation) => (
                      <div
                        key={c.id}
                        className="bg-navy-50 rounded-lg p-3 border border-navy-100"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-navy-900">
                            {formatDate(c.date)}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {c.signature && (
                              <CheckCircle2 className="w-3 h-3 text-green-600" />
                            )}
                            <StatusBadge status={c.status} />
                          </div>
                        </div>
                        <p className="text-xs text-navy-600 mb-1.5">
                          <span className="font-medium">Motif:</span> {c.chiefComplaint}
                        </p>
                        {c.diagnosis && (
                          <p className="text-xs text-navy-600 mb-1.5">
                            <span className="font-medium">Diagnostic:</span> {c.diagnosis}
                          </p>
                        )}
                        <p className="text-[10px] text-navy-400 mt-1.5 pt-1.5 border-t border-navy-200">
                          {c.doctor} · {c.time}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            {/* Quick patient info */}
            {patient && (
              <Card>
                <CardHeader title="Rappel patient" />
                <div className="p-5 space-y-3 text-xs">
                  <div>
                    <p className="text-navy-400 font-medium mb-1">Affections chroniques</p>
                    {patient.chronicConditions.length === 0 ? (
                      <p className="text-navy-500">Aucune</p>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {patient.chronicConditions.map((c) => (
                          <Badge key={c} color="blue">{c}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-navy-400 font-medium mb-1">Assurance</p>
                    <p className="text-navy-700">{patient.insurance}</p>
                    <p className="text-navy-400">{patient.insuranceNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-navy-400 font-medium mb-1">Contact d'urgence</p>
                    <p className="text-navy-700">{patient.emergencyContact}</p>
                    <p className="text-navy-400">{patient.emergencyPhone}</p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Change form confirmation */}
      {pendingType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="font-semibold text-navy-900">Changer de formulaire ?</h3>
            </div>
            <p className="text-sm text-navy-600 mb-5">
              Des données ont déjà été saisies. Changer de formulaire remplacera les informations actuelles (simulation).
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setPendingType(null)}>Annuler</Button>
              <Button variant="danger" size="sm" onClick={confirmChangeType}>Confirmer le changement</Button>
            </div>
          </div>
        </div>
      )}

      {/* Print preview modal */}
      {showPrint && formType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-navy-100 sticky top-0 bg-white">
              <div>
                <h3 className="font-semibold text-navy-900">Aperçu avant impression</h3>
                <p className="text-xs text-navy-500">Simulation — aucune impression réelle</p>
              </div>
              <button onClick={() => setShowPrint(false)} className="text-navy-400 hover:text-navy-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="border border-navy-100 rounded-lg p-4">
                <p className="text-sm font-bold text-navy-900">Groupe Médical HOMEA</p>
                <p className="text-xs text-navy-500">Dossier Patient Informatisé — {formMeta.find((m) => m.id === formType)?.name}</p>
              </div>
              {patient && (
                <div className="border border-navy-100 rounded-lg p-4">
                  <p className="text-xs text-navy-400 font-medium mb-1">Patient</p>
                  <p className="text-sm text-navy-900 font-semibold">{patient.firstName} {patient.lastName}</p>
                  <p className="text-xs text-navy-500">{patient.code} · {patient.gender === 'M' ? 'Homme' : 'Femme'}</p>
                </div>
              )}
              {formDefinitions[formType].sections.map((section) => {
                const filled = section.fields.filter((f) => values[f.key]?.trim());
                if (filled.length === 0) return null;
                return (
                  <div key={section.id} className="border border-navy-100 rounded-lg p-4">
                    <p className="text-sm font-semibold text-navy-900 mb-2">{section.title}</p>
                    {filled.map((f) => (
                      <div key={f.key} className="mb-1.5">
                        <p className="text-xs text-navy-400 font-medium">{f.label}</p>
                        <p className="text-sm text-navy-800 whitespace-pre-wrap">{values[f.key]}</p>
                      </div>
                    ))}
                  </div>
                );
              })}
              <div className="flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={() => setShowPrint(false)}>Fermer</Button>
                <Button size="sm" onClick={() => { setShowPrint(false); notify('Aperçu imprimé (simulation)'); }}>
                  <Printer className="w-4 h-4 mr-1" /> Imprimer
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Complement modal */}
      {showComplement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-turquoise-100 flex items-center justify-center">
                <Plus className="w-5 h-5 text-turquoise-600" />
              </div>
              <h3 className="font-semibold text-navy-900">Ajouter un complément</h3>
            </div>
            <p className="text-xs text-navy-500 mb-3">Le complément sera ajouté à la consultation validée (simulation).</p>
            <textarea
              value={complementText}
              onChange={(e) => setComplementText(e.target.value)}
              rows={3}
              placeholder="Saisir le complément..."
              className="w-full px-3 py-2 rounded-lg border border-navy-200 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-medical-400 resize-none"
            />
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="secondary" size="sm" onClick={() => setShowComplement(false)}>Annuler</Button>
              <Button size="sm" onClick={handleAddComplement} disabled={!complementText.trim()}>
                Ajouter
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function repeatTableTitle(key: string): string {
  const map: Record<string, string> = {
    previousPregnancies: 'Grossesses antérieures',
    prenatalConsultations: 'Consultations prénatales',
    imagingExams: 'Échographies et examens',
    hospitalizations: 'Hospitalisations',
    newborns: 'Nouveau-nés',
  };
  return map[key] || key;
}
