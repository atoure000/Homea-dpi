import { useMemo, useState } from 'react';
import {
  BedDouble,
  Plus,
  CheckCircle2,
  AlertCircle,
  Clock,
  CalendarClock,
  X,
  Activity,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { Card, CardHeader, Badge, Button, Select, TextArea, EmptyState, SectionTitle } from '@/components/ui';
import type { Bed, BedMovement } from '@/types';
import { beds as initialBeds, bedMovements as initialMovements } from '@/data/beds';
import { patients, getPatientName } from '@/data/patients';
import { formatDate } from '@/utils/format';
import { getAllEpisodes } from '@/data/episodes';

type BedStatus = Bed['status'];

const statusConfig: Record<BedStatus, { bg: string; border: string; text: string; dot: string; label: string }> = {
  available: { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-800', dot: 'bg-green-500', label: 'Disponible' },
  occupied: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-800', dot: 'bg-red-500', label: 'Occupé' },
  cleaning: { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-800', dot: 'bg-amber-500', label: 'Nettoyage' },
  reserved: { bg: 'bg-medical-50', border: 'border-medical-300', text: 'text-medical-800', dot: 'bg-medical-500', label: 'Réservé' },
};

const movementTypeConfig: Record<BedMovement['type'], { label: string; color: 'green' | 'blue' | 'turquoise' }> = {
  admission: { label: 'Admission', color: 'green' },
  transfer: { label: 'Transfert', color: 'blue' },
  discharge: { label: 'Sortie', color: 'turquoise' },
};

export default function BedManagement() {
  const [showModal, setShowModal] = useState(false);
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'done'>('idle');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [lastMovementId, setLastMovementId] = useState<string | null>(null);

  // Local state for beds and movements
  const [localBeds, setLocalBeds] = useState<Bed[]>(initialBeds);
  const [localMovements, setLocalMovements] = useState<BedMovement[]>(initialMovements);
  const [changedBedIds, setChangedBedIds] = useState<Set<string>>(new Set());

  // Modal form state
  const [formPatient, setFormPatient] = useState('');
  const [formBed, setFormBed] = useState('');
  const [formType, setFormType] = useState<'admission' | 'transfer' | 'discharge'>('admission');
  const [formReason, setFormReason] = useState('');

  const pendingBedEpisodes = useMemo(
    () => getAllEpisodes().filter((e) => e.status === 'actif' && e.type === 'hospitalisation' && e.bedPending),
    [],
  );

  const departments = useMemo(() => {
    const groups: Record<string, Bed[]> = {};
    for (const bed of localBeds) {
      if (!groups[bed.department]) groups[bed.department] = [];
      groups[bed.department].push(bed);
    }
    return groups;
  }, [localBeds]);

  const summary = useMemo(() => {
    const total = localBeds.length;
    const available = localBeds.filter((b) => b.status === 'available').length;
    const occupied = localBeds.filter((b) => b.status === 'occupied').length;
    const cleaning = localBeds.filter((b) => b.status === 'cleaning').length;
    const reserved = localBeds.filter((b) => b.status === 'reserved').length;
    const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0;
    return { total, available, occupied, cleaning, reserved, occupancyRate };
  }, [localBeds]);

  const availableBeds = useMemo(
    () => localBeds.filter((b) => b.status === 'available' || b.status === 'reserved'),
    [localBeds],
  );

  function resetForm() {
    setFormPatient('');
    setFormBed('');
    setFormType('admission');
    setFormReason('');
  }

  function handleSubmit() {
    if (!formPatient || !formBed) return;
    setSubmitState('submitting');
    setTimeout(() => {
      const patient = patients.find((p) => p.id === formPatient);
      const bed = localBeds.find((b) => b.id === formBed);
      if (!patient || !bed) return;

      const newId = `m${Date.now()}`;
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const timeNow = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

      const newMovement: BedMovement = {
        id: newId,
        patientId: patient.id,
        patientName: `${patient.firstName} ${patient.lastName}`,
        fromBed: formType === 'transfer' ? bed.number : undefined,
        toBed: bed.number,
        date: today,
        time: timeNow,
        reason: formReason || '—',
        type: formType,
      };

      setLocalMovements([newMovement, ...localMovements]);
      setLastMovementId(newId);

      // Update bed status based on movement type
      const newStatus: BedStatus = formType === 'discharge' ? 'cleaning' : 'occupied';
      setLocalBeds(localBeds.map((b) => {
        if (b.id === formBed) {
          return {
            ...b,
            status: newStatus,
            patientId: formType === 'discharge' ? undefined : patient.id,
            admissionDate: formType === 'admission' ? today : b.admissionDate,
            expectedDischarge: formType === 'admission' ? undefined : b.expectedDischarge,
          };
        }
        return b;
      }));

      setChangedBedIds(new Set([formBed]));
      setTimeout(() => setChangedBedIds(new Set()), 3000);

      setSuccessMsg(
        `Mouvement enregistré : ${patient.firstName} ${patient.lastName} → ${bed.number} (${movementTypeConfig[formType].label})`,
      );
      setSubmitState('done');
      setShowModal(false);
      resetForm();
      setTimeout(() => {
        setSuccessMsg(null);
        setSubmitState('idle');
      }, 4000);
    }, 1000);
  }

  function handleCloseModal() {
    setShowModal(false);
    resetForm();
  }

  const summaryCards = [
    { label: 'Total lits', value: summary.total, icon: BedDouble, color: 'navy' as const },
    { label: 'Disponibles', value: summary.available, icon: CheckCircle2, color: 'green' as const },
    { label: 'Occupés', value: summary.occupied, icon: AlertCircle, color: 'red' as const },
    { label: 'Nettoyage', value: summary.cleaning, icon: Clock, color: 'amber' as const },
    { label: 'Réservés', value: summary.reserved, icon: CalendarClock, color: 'blue' as const },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-navy-900">Gestion des lits</h2>
          <p className="text-sm text-navy-500 mt-0.5">Suivi en temps réel de l'occupation des lits par service</p>
        </div>
        <Button variant="primary" onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          Nouveau mouvement
        </Button>
      </div>

      {/* Success message */}
      {successMsg && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm animate-fade-in">
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
          </div>
          <span>{successMsg}</span>
        </div>
      )}

      {/* Summary bar */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-4 h-4 text-navy-400" />
                <span className="text-xs text-navy-500 font-medium">{card.label}</span>
              </div>
              <p className="text-2xl font-bold text-navy-900">{card.value}</p>
            </Card>
          );
        })}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-turquoise-500" />
            <span className="text-xs text-navy-500 font-medium">Taux d'occupation</span>
          </div>
          <p className="text-2xl font-bold text-turquoise-600">{summary.occupancyRate}%</p>
        </Card>
      </div>

      {/* Pending bed assignments from episodes */}
      {pendingBedEpisodes.length > 0 && (
        <Card>
          <CardHeader title="Affectations de lit en attente" subtitle="Patients hospitalisés sans lit attribué" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-100 text-left text-navy-500">
                  <th className="px-5 py-3 font-medium">Patient</th>
                  <th className="px-5 py-3 font-medium">N° venue</th>
                  <th className="px-5 py-3 font-medium">Service</th>
                  <th className="px-5 py-3 font-medium">Motif</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {pendingBedEpisodes.map((ep) => {
                  const p = patients.find((pt) => pt.id === ep.patientId);
                  return (
                    <tr key={ep.id} className="border-b border-navy-50 hover:bg-amber-50/30 transition-colors">
                      <td className="px-5 py-3 font-medium text-navy-900">
                        {p ? `${p.firstName} ${p.lastName}` : '—'}
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-navy-700">{ep.episodeNumber}</td>
                      <td className="px-5 py-3 text-navy-600">{ep.serviceId}</td>
                      <td className="px-5 py-3 text-xs text-navy-600 max-w-[200px] truncate">{ep.admissionReason}</td>
                      <td className="px-5 py-3 text-xs text-navy-500">{ep.admittedAt.replace('T', ' ')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Bed board */}
      <Card>
        <CardHeader title="Plan des lits" subtitle="Vue par service" />
        <div className="p-5 space-y-6">
          {Object.entries(departments).map(([dept, deptBeds]) => {
            const deptOccupied = deptBeds.filter((b) => b.status === 'occupied').length;
            return (
              <div key={dept}>
                <div className="flex items-center justify-between mb-3">
                  <SectionTitle>{dept}</SectionTitle>
                  <Badge color="navy">
                    {deptOccupied}/{deptBeds.length} occupés
                  </Badge>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {deptBeds.map((bed) => {
                    const cfg = statusConfig[bed.status];
                    const patientName = bed.patientId ? getPatientName(bed.patientId) : null;
                    const wasChanged = changedBedIds.has(bed.id);
                    return (
                      <div
                        key={bed.id}
                        className={`rounded-lg border-2 ${cfg.border} ${cfg.bg} p-3 transition-all hover:shadow-md ${
                          wasChanged ? 'ring-2 ring-turquoise-400 animate-pulse-soft' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-sm font-bold ${cfg.text}`}>{bed.number}</span>
                          <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                        </div>
                        <p className="text-xs text-navy-500 mb-1">{bed.room}</p>
                        {patientName && (
                          <p className="text-xs font-medium text-navy-700 truncate">{patientName}</p>
                        )}
                        {bed.expectedDischarge && bed.status === 'occupied' && (
                          <p className="text-[10px] text-navy-400 mt-0.5">
                            Sortie prév. {formatDate(bed.expectedDischarge)}
                          </p>
                        )}
                        <p className={`text-[10px] font-medium mt-1 ${cfg.text}`}>{cfg.label}</p>
                        {wasChanged && (
                          <p className="text-[10px] text-turquoise-600 font-semibold mt-1 flex items-center gap-0.5">
                            <ArrowRight className="w-2.5 h-2.5" />
                            Mis à jour
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Recent movements */}
      <Card>
        <CardHeader title="Mouvements récents" subtitle="Admissions, transferts et sorties" />
        {localMovements.length === 0 ? (
          <EmptyState icon={BedDouble} title="Aucun mouvement récent" subtitle="Les mouvements de lits apparaîtront ici" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-100 text-left text-navy-500">
                  <th className="px-5 py-3 font-medium">Patient</th>
                  <th className="px-5 py-3 font-medium">Lit origine</th>
                  <th className="px-5 py-3 font-medium">Lit destination</th>
                  <th className="px-5 py-3 font-medium">Date / Heure</th>
                  <th className="px-5 py-3 font-medium">Motif</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                </tr>
              </thead>
              <tbody>
                {localMovements.map((m) => {
                  const isNew = m.id === lastMovementId;
                  return (
                    <tr
                      key={m.id}
                      className={`border-b border-navy-50 hover:bg-navy-50/50 transition-colors ${
                        isNew ? 'bg-turquoise-50 animate-fade-in' : ''
                      }`}
                    >
                      <td className="px-5 py-3 font-medium text-navy-900">
                        <div className="flex items-center gap-2">
                          {m.patientName}
                          {isNew && (
                            <Badge color="turquoise">
                              <CheckCircle2 className="w-3 h-3" />
                              Nouveau
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-navy-600">{m.fromBed ?? '—'}</td>
                      <td className="px-5 py-3 text-navy-600">{m.toBed}</td>
                      <td className="px-5 py-3 text-navy-500 whitespace-nowrap">
                        {formatDate(m.date)} · {m.time}
                      </td>
                      <td className="px-5 py-3 text-navy-600 max-w-xs">{m.reason}</td>
                      <td className="px-5 py-3">
                        <Badge color={movementTypeConfig[m.type].color}>{movementTypeConfig[m.type].label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* New movement modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/40 backdrop-blur-sm animate-fade-in">
          <Card className="w-full max-w-lg mx-4">
            <CardHeader
              title="Nouveau mouvement de lit"
              subtitle="Enregistrer une admission, un transfert ou une sortie"
              action={
                <button onClick={handleCloseModal} className="text-navy-400 hover:text-navy-700">
                  <X className="w-5 h-5" />
                </button>
              }
            />
            <div className="p-5 space-y-4">
              <Select
                label="Patient"
                value={formPatient}
                onChange={setFormPatient}
                required
                options={[
                  { value: '', label: '— Sélectionner un patient —' },
                  ...patients.map((p) => ({ value: p.id, label: `${p.firstName} ${p.lastName}` })),
                ]}
              />
              <Select
                label="Lit de destination"
                value={formBed}
                onChange={setFormBed}
                required
                options={[
                  { value: '', label: '— Sélectionner un lit —' },
                  ...availableBeds.map((b) => ({ value: b.id, label: `${b.number} (${b.room}, ${b.department})` })),
                ]}
              />
              <Select
                label="Type de mouvement"
                value={formType}
                onChange={(v) => setFormType(v as typeof formType)}
                required
                options={[
                  { value: 'admission', label: 'Admission' },
                  { value: 'transfer', label: 'Transfert' },
                  { value: 'discharge', label: 'Sortie' },
                ]}
              />
              <TextArea
                label="Motif"
                value={formReason}
                onChange={setFormReason}
                placeholder="Indiquer le motif du mouvement..."
                rows={3}
                required
              />
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={handleCloseModal} disabled={submitState === 'submitting'}>
                  Annuler
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSubmit}
                  disabled={!formPatient || !formBed || submitState === 'submitting' || submitState === 'done'}
                >
                  {submitState === 'submitting' ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                      Enregistrement...
                    </>
                  ) : submitState === 'done' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-1.5" />
                      Enregistré
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-1.5" />
                      Enregistrer
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
