import { useState, useMemo } from 'react';
import { X, UserPlus, Stethoscope, FlaskConical, BedDouble, AlertTriangle, Loader2, CheckCircle2, Receipt, FolderOpen } from 'lucide-react';
import type { Patient, EpisodeType, Episode } from '@/types';
import { EPISODE_TYPE_LABELS } from '@/types';
import { doctors } from '@/data/doctors';
import { beds as allBeds } from '@/data/beds';
import { appointments as allAppointments } from '@/data/appointments';
import { getActiveEpisodesForPatient, createEpisode } from '@/data/episodes';
import { Button, Select } from '@/components/ui';

const SERVICE_OPTIONS = [
  'Médecine générale',
  'Médecine interne',
  'Cardiologie',
  'Pneumologie',
  'Gynécologie-obstétrique',
  'Pédiatrie',
  'Urgences',
  'Chirurgie',
  'Endocrinologie',
  'Anesthésie',
];

const doctorOptions = doctors.map((d) => ({
  value: d.id,
  label: `Dr. ${d.firstName} ${d.lastName} — ${d.specialty}`,
}));

function nowDateTimeLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDateTime(s: string): string {
  if (!s) return '';
  const [date, time] = s.split('T');
  return `${date} ${time ?? ''}`.trim();
}

export function AdmitPatientModal({
  patient,
  onClose,
  onAdmitted,
  onOpenEpisode,
  onGoToBilling,
}: {
  patient: Patient;
  onClose: () => void;
  onAdmitted: (episode: Episode) => void;
  onOpenEpisode: (episode: Episode) => void;
  onGoToBilling: (patientId: string) => void;
}) {
  const activeEpisodes = useMemo(() => getActiveEpisodesForPatient(patient.id), [patient.id]);

  const [mode, setMode] = useState<'choose' | 'form' | 'confirm'>(activeEpisodes.length > 0 ? 'choose' : 'form');
  const [episodeType, setEpisodeType] = useState<EpisodeType>('consultation');
  const [admittedAt, setAdmittedAt] = useState(nowDateTimeLocal());
  const [serviceId, setServiceId] = useState('Médecine générale');
  const [practitionerId, setPractitionerId] = useState('');
  const [admissionReason, setAdmissionReason] = useState('');
  const [observation, setObservation] = useState('');
  const [consultationType, setConsultationType] = useState<'premiere' | 'suivi'>('premiere');
  const [examCategories, setExamCategories] = useState<('laboratoire' | 'imagerie')[]>(['laboratoire']);
  const [examPrescriptionOrigin, setExamPrescriptionOrigin] = useState<'interne' | 'externe'>('interne');
  const [examPrescriber, setExamPrescriber] = useState('');
  const [bedId, setBedId] = useState('');
  const [bedPending, setBedPending] = useState(false);
  const [justification, setJustification] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createdEpisode, setCreatedEpisode] = useState<Episode | null>(null);

  const patientAppointments = useMemo(
    () => allAppointments.filter((a) => a.patientId === patient.id && a.status !== 'cancelled' && a.status !== 'no-show'),
    [patient.id],
  );
  const [appointmentId, setAppointmentId] = useState('');

  const availableBeds = useMemo(
    () => allBeds.filter((b) => b.status === 'available'),
    [],
  );
  const bedsForService = useMemo(
    () => availableBeds.filter((b) => b.department === serviceId),
    [availableBeds, serviceId],
  );

  function toggleExamCat(cat: 'laboratoire' | 'imagerie') {
    setExamCategories((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  }

  function canSubmit(): boolean {
    if (!admissionReason.trim()) return false;
    if (episodeType === 'examens' && examCategories.length === 0) return false;
    if (activeEpisodes.length > 0 && mode === 'choose' && !justification.trim()) return false;
    return true;
  }

  function handleConfirm() {
    if (submitting || !canSubmit()) return;
    setSubmitting(true);
    setTimeout(() => {
      const ep = createEpisode({
        patientId: patient.id,
        type: episodeType,
        serviceId,
        practitionerId: practitionerId || undefined,
        appointmentId: appointmentId || undefined,
        admissionReason,
        createdBy: 'Accueil',
        bedId: episodeType === 'hospitalisation' && bedId ? bedId : undefined,
        bedPending: episodeType === 'hospitalisation' && !bedId,
        examCategories: episodeType === 'examens' ? examCategories : undefined,
        examPrescriptionOrigin: episodeType === 'examens' ? examPrescriptionOrigin : undefined,
        examPrescriber: episodeType === 'examens' ? examPrescriber : undefined,
        consultationType: episodeType === 'consultation' ? consultationType : undefined,
      });
      setCreatedEpisode(ep);
      setSubmitting(false);
      setMode('confirm');
      onAdmitted(ep);
    }, 700);
  }

  const typeIcons: Record<EpisodeType, typeof Stethoscope> = {
    consultation: Stethoscope,
    examens: FlaskConical,
    hospitalisation: BedDouble,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-gray-200 bg-white clinical-shadow-lg animate-fade-in">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-medical-50">
              <UserPlus className="w-5 h-5 text-medical-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Admettre le patient</h3>
              <p className="text-xs text-gray-500">Nouvel épisode de soins</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-50 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Patient identity banner */}
        <div className="border-b border-gray-100 bg-sky-50 px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 text-sm font-bold text-sky-700">
              {patient.firstName.charAt(0)}{patient.lastName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">
                {patient.lastName.toUpperCase()} {patient.firstName}
              </p>
              <div className="flex flex-wrap gap-x-3 text-xs text-gray-600">
                <span>IUP: <span className="font-mono font-medium">{patient.code}</span></span>
                <span>Né(e) le {patient.birthDate}</span>
                {patient.cmuNumber && <span>CMU: {patient.cmuNumber}</span>}
                <span>Assurance: {patient.insurance}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-6">
          {/* Already admitted warning */}
          {activeEpisodes.length > 0 && mode === 'choose' && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-800">
                    Ce patient a déjà {activeEpisodes.length} épisode(s) actif(s)
                  </p>
                  <div className="mt-2 space-y-1.5">
                    {activeEpisodes.map((ep) => (
                      <div key={ep.id} className="flex items-center justify-between rounded-md border border-amber-200 bg-white px-3 py-2">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {ep.episodeNumber} — {EPISODE_TYPE_LABELS[ep.type]}
                          </p>
                          <p className="text-xs text-gray-500">{ep.serviceId} · {formatDateTime(ep.admittedAt)}</p>
                        </div>
                        <Button variant="secondary" size="sm" onClick={() => onOpenEpisode(ep)}>
                          <FolderOpen className="w-3 h-3 mr-1" /> Ouvrir la venue
                        </Button>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-amber-700">
                    Vous pouvez utiliser la venue existante ou en créer une nouvelle avec justification.
                  </p>
                  <div className="mt-3">
                    <label className="block text-xs font-bold text-gray-800">Justification (obligatoire pour une nouvelle venue)</label>
                    <textarea
                      value={justification}
                      onChange={(e) => setJustification(e.target.value)}
                      rows={2}
                      placeholder="Ex: Nouveau motif indépendant de la venue en cours..."
                      className="mt-1 w-full rounded-sm border border-gray-400 bg-white px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button variant="primary" onClick={() => setMode('form')} disabled={!justification.trim()}>
                      Créer une autre venue
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Form mode */}
          {mode === 'form' && (
            <>
              {/* Type de venue */}
              <div>
                <h4 className="mb-3 text-sm font-semibold text-gray-900">Type de venue</h4>
                <div className="grid grid-cols-3 gap-3">
                  {(['consultation', 'examens', 'hospitalisation'] as const).map((t) => {
                    const Icon = typeIcons[t];
                    const selected = episodeType === t;
                    return (
                      <button
                        key={t}
                        onClick={() => setEpisodeType(t)}
                        className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all ${
                          selected
                            ? 'border-medical-500 bg-medical-50 text-medical-700'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <Icon className="w-6 h-6" />
                        <span className="text-sm font-semibold">{EPISODE_TYPE_LABELS[t]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Champs communs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-800">Date et heure d'admission</label>
                  <input
                    type="datetime-local"
                    value={admittedAt}
                    onChange={(e) => setAdmittedAt(e.target.value)}
                    className="mt-1 w-full rounded-sm border border-gray-400 bg-white px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-800">Service / Spécialité</label>
                  <select
                    value={serviceId}
                    onChange={(e) => setServiceId(e.target.value)}
                    className="mt-1 w-full rounded-sm border border-gray-400 bg-white px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    {SERVICE_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-800">Motif administratif de venue <span className="text-red-600">*</span></label>
                  <input
                    type="text"
                    value={admissionReason}
                    onChange={(e) => setAdmissionReason(e.target.value)}
                    placeholder="Ex: Consultation de suivi, bilan biologique, etc."
                    className="mt-1 w-full rounded-sm border border-gray-400 bg-white px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                {patientAppointments.length > 0 && (
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-800">Rendez-vous associé</label>
                    <select
                      value={appointmentId}
                      onChange={(e) => setAppointmentId(e.target.value)}
                      className="mt-1 w-full rounded-sm border border-gray-400 bg-white px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="">Aucun rendez-vous</option>
                      {patientAppointments.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.date} {a.time} — {a.reason}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-800">Couverture / Assurance existante (à vérifier)</label>
                  <div className="mt-1 flex items-center gap-2 rounded-sm border border-gray-300 bg-gray-50 px-2 py-1.5 text-sm text-gray-700">
                    <span className="font-medium">{patient.insurance || 'Non assurée'}</span>
                    {patient.insuranceNumber && <span className="text-gray-500">· N° {patient.insuranceNumber}</span>}
                    {patient.coverageRate && <span className="text-gray-500">· {patient.coverageRate}</span>}
                  </div>
                </div>
              </div>

              {/* Champs spécifiques: Consultation */}
              {episodeType === 'consultation' && (
                <div className="grid grid-cols-2 gap-3">
                  <Select label="Médecin / File de service" value={practitionerId} onChange={setPractitionerId} options={[{ value: '', label: 'Sélectionner...' }, ...doctorOptions]} />
                  <div>
                    <label className="block text-xs font-bold text-gray-800">Type de consultation</label>
                    <select
                      value={consultationType}
                      onChange={(e) => setConsultationType(e.target.value as 'premiere' | 'suivi')}
                      className="mt-1 w-full rounded-sm border border-gray-400 bg-white px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="premiere">Première consultation</option>
                      <option value="suivi">Suivi</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Champs spécifiques: Examens */}
              {episodeType === 'examens' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-800">Examens demandés <span className="text-red-600">*</span></label>
                    <div className="mt-1 flex gap-3">
                      {(['laboratoire', 'imagerie'] as const).map((cat) => (
                        <label key={cat} className="flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={examCategories.includes(cat)}
                            onChange={() => toggleExamCat(cat)}
                            className="rounded border-gray-400"
                          />
                          {cat === 'laboratoire' ? 'Laboratoire' : 'Imagerie'}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-800">Prescription</label>
                      <select
                        value={examPrescriptionOrigin}
                        onChange={(e) => setExamPrescriptionOrigin(e.target.value as 'interne' | 'externe')}
                        className="mt-1 w-full rounded-sm border border-gray-400 bg-white px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="interne">Interne</option>
                        <option value="externe">Externe</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-800">Prescripteur</label>
                      <input
                        type="text"
                        value={examPrescriber}
                        onChange={(e) => setExamPrescriber(e.target.value)}
                        placeholder="Nom du prescripteur"
                        className="mt-1 w-full rounded-sm border border-gray-400 bg-white px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Champs spécifiques: Hospitalisation */}
              {episodeType === 'hospitalisation' && (
                <div className="space-y-3">
                  <Select label="Médecin responsable" value={practitionerId} onChange={setPractitionerId} options={[{ value: '', label: 'Sélectionner...' }, ...doctorOptions]} />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-800">Chambre et lit</label>
                      <select
                        value={bedId}
                        onChange={(e) => setBedId(e.target.value)}
                        disabled={bedPending}
                        className="mt-1 w-full rounded-sm border border-gray-400 bg-white px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-gray-100"
                      >
                        <option value="">Aucun lit sélectionné</option>
                        {bedsForService.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.number} — {b.room}
                          </option>
                        ))}
                        {bedsForService.length === 0 && (
                          <option value="" disabled>Aucun lit disponible dans ce service</option>
                        )}
                      </select>
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={bedPending}
                          onChange={(e) => { setBedPending(e.target.checked); if (e.target.checked) setBedId(''); }}
                          className="rounded border-gray-400"
                        />
                        Affectation de lit en attente
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Observation administrative */}
              <div>
                <label className="block text-xs font-bold text-gray-800">Observation administrative (facultatif)</label>
                <textarea
                  value={observation}
                  onChange={(e) => setObservation(e.target.value)}
                  rows={2}
                  placeholder="Notes administratives éventuelles..."
                  className="mt-1 w-full rounded-sm border border-gray-400 bg-white px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
                <Button variant="ghost" onClick={onClose}>Annuler</Button>
                <Button variant="primary" onClick={handleConfirm} disabled={!canSubmit() || submitting}>
                  {submitting ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Enregistrement...</> : 'Confirmer l\'admission'}
                </Button>
              </div>
            </>
          )}

          {/* Confirmation */}
          {mode === 'confirm' && createdEpisode && (
            <div className="space-y-4">
              <div className="flex flex-col items-center text-center py-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 mb-3">
                  <CheckCircle2 className="w-7 h-7 text-green-600" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900">Admission enregistrée</h4>
                <p className="mt-1 text-sm text-gray-600">
                  Épisode <span className="font-mono font-semibold text-gray-900">{createdEpisode.episodeNumber}</span> créé pour {patient.firstName} {patient.lastName}
                </p>
                <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-left text-sm">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                    <div><span className="text-gray-500">Type:</span> <span className="font-medium text-gray-900">{EPISODE_TYPE_LABELS[createdEpisode.type]}</span></div>
                    <div><span className="text-gray-500">Service:</span> <span className="font-medium text-gray-900">{createdEpisode.serviceId}</span></div>
                    <div><span className="text-gray-500">Date:</span> <span className="font-medium text-gray-900">{formatDateTime(createdEpisode.admittedAt)}</span></div>
                    <div><span className="text-gray-500">Statut:</span> <span className="font-medium text-green-700">Patient Admis</span></div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-3 border-t border-gray-100 pt-4">
                <Button variant="secondary" onClick={() => onOpenEpisode(createdEpisode)}>
                  <FolderOpen className="w-4 h-4 mr-1.5" /> Ouvrir la venue
                </Button>
                <Button variant="primary" onClick={() => onGoToBilling(patient.id)}>
                  <Receipt className="w-4 h-4 mr-1.5" /> Poursuivre vers la facturation
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
