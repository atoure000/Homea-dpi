import { useState, useMemo, useEffect, useRef } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import {
  Calendar, Clock, Plus, Search, ChevronLeft, ChevronRight,
  CheckCircle2, X, AlertCircle, AlertTriangle, User, Users, Stethoscope, Activity,
  CalendarDays, List, Grid3x3, Settings, Phone, Mail, MessageSquare, Printer,
  RotateCcw, Copy, Edit3, Ban, CalendarClock, UserCheck, UserPlus, Play,
  TrendingUp, FileText, Bell, Zap,
} from 'lucide-react';
import type {
  Appointment, Doctor, AppointmentStatus, AppointmentType, CoverageMode,
  ConfirmationChannel, PriorityLevel,
} from '@/types';
import {
  Card, CardHeader, Badge, Button, Select, TextArea, EmptyState, SectionTitle,
} from '@/components/ui';
import { patients, getPatientName, getPatient } from '@/data/patients';
import { doctors, getDoctorName, getDoctorSpecialty } from '@/data/doctors';
import { rooms, getRoomName } from '@/data/rooms';
import { appointments as initialAppointments } from '@/data/appointments';
import { calculateAge, formatDate } from '@/utils/format';
import { fetchDoctorScheduleSettings, saveDoctorScheduleSettings } from '@/lib/api';

/* ── Helpers ── */

const HOURS: string[] = [];
for (let h = 7; h <= 20; h++) { HOURS.push(`${String(h).padStart(2, '0')}:00`); HOURS.push(`${String(h).padStart(2, '0')}:30`); }
const SLOT_PX = 64;
const DAY_START_MIN = 7 * 60;
const DAY_END_MIN = 20 * 60 + 30;
const GRID_HEIGHT = ((DAY_END_MIN - DAY_START_MIN) / 30) * SLOT_PX;
const timeToTop = (time: string): number => { const [h, m] = time.split(':').map(Number); return ((h * 60 + m) - DAY_START_MIN) / 30 * SLOT_PX; };
const durationToHeight = (duration: number): number => Math.max((duration / 30) * SLOT_PX - 3, 18);

interface DragInfo { appt: Appointment; startY: number; startX: number; origTime: string; origDate: string; }

function useApptDrag(
  onMove: (appt: Appointment, newDate: string, newTime: string) => void,
  onClick: (appt: Appointment) => void,
  dates?: string[],
) {
  const [drag, setDrag] = useState<DragInfo | null>(null);
  const [preview, setPreview] = useState<{ date: string; time: string } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragInfo | null>(null);
  const previewRef = useRef<{ date: string; time: string } | null>(null);
  const movedRef = useRef(false);
  const onMoveRef = useRef(onMove);
  const onClickRef = useRef(onClick);
  const datesRef = useRef(dates);

  dragRef.current = drag;
  previewRef.current = preview;
  onMoveRef.current = onMove;
  onClickRef.current = onClick;
  datesRef.current = dates;

  useEffect(() => {
    if (!drag) return;
    function handleMove(e: MouseEvent) {
      const d = dragRef.current; if (!d) return;
      const dy = e.clientY - d.startY;
      const dx = e.clientX - d.startX;
      if (Math.abs(dy) > 4 || Math.abs(dx) > 4) movedRef.current = true;
      const slotDelta = Math.round(dy / SLOT_PX);
      let newMin = tToM(d.origTime) + slotDelta * 30;
      newMin = Math.max(DAY_START_MIN, Math.min(DAY_END_MIN - 30, newMin));
      const newTime = mToT(newMin);
      let newDate = d.origDate;
      const ds = datesRef.current;
      if (ds && gridRef.current) {
        const rect = gridRef.current.getBoundingClientRect();
        const relX = e.clientX - rect.left;
        const timeColW = 56;
        const dayW = (rect.width - timeColW) / ds.length;
        const dayIdx = Math.max(0, Math.min(ds.length - 1, Math.floor((relX - timeColW) / dayW)));
        newDate = ds[dayIdx];
      }
      setPreview({ date: newDate, time: newTime });
    }
    function handleUp() {
      const d = dragRef.current; const p = previewRef.current;
      if (movedRef.current && p && d) onMoveRef.current(d.appt, p.date, p.time);
      else if (d) onClickRef.current(d.appt);
      movedRef.current = false;
      setDrag(null); setPreview(null);
    }
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
  }, [drag]);

  const startDrag = (appt: Appointment, e: ReactMouseEvent) => {
    e.preventDefault();
    movedRef.current = false;
    setDrag({ appt, startY: e.clientY, startX: e.clientX, origTime: appt.time, origDate: appt.date });
    setPreview({ date: appt.date, time: appt.time });
  };

  return { gridRef, drag, preview, startDrag };
}

const STATUS_META: Record<AppointmentStatus, { label: string; color: 'navy' | 'green' | 'red' | 'amber' | 'blue' | 'turquoise'; icon: typeof CheckCircle2 }> = {
  planned: { label: 'Planifié', color: 'navy', icon: Calendar },
  'to-confirm': { label: 'À confirmer', color: 'amber', icon: AlertCircle },
  confirmed: { label: 'Confirmé', color: 'blue', icon: CheckCircle2 },
  arrived: { label: 'Patient arrivé', color: 'turquoise', icon: UserCheck },
  waiting: { label: 'En attente', color: 'amber', icon: Clock },
  'in-consultation': { label: 'En consultation', color: 'turquoise', icon: Stethoscope },
  completed: { label: 'Terminé', color: 'green', icon: CheckCircle2 },
  cancelled: { label: 'Annulé', color: 'red', icon: Ban },
  'no-show': { label: 'Non honoré', color: 'red', icon: AlertTriangle },
  rescheduled: { label: 'Reporté', color: 'navy', icon: CalendarClock },
  'walk-in': { label: 'Tout venant', color: 'turquoise', icon: User },
};
const TYPE_META: Record<AppointmentType, { label: string; icon: typeof Stethoscope }> = {
  first: { label: 'Première consultation', icon: User },
  'follow-up': { label: 'Suivi', icon: Activity },
  urgent: { label: 'Urgence', icon: Zap },
  teleconsult: { label: 'Téléconsultation', icon: MessageSquare },
  'walk-in': { label: 'Tout venant', icon: User },
};
const COVERAGE_META: Record<CoverageMode, string> = { particular: 'Particulier', insurance: 'Assurance', mutual: 'Mutuelle' };
const CHANNEL_META: Record<ConfirmationChannel, { label: string; icon: typeof Phone }> = {
  phone: { label: 'Téléphone', icon: Phone }, sms: { label: 'SMS', icon: MessageSquare }, email: { label: 'E-mail', icon: Mail },
};
const PRIORITY_META: Record<PriorityLevel, { label: string; color: 'navy' | 'red' }> = {
  normal: { label: 'Normale', color: 'navy' }, medical: { label: 'Médicale', color: 'red' },
};
const STATUS_COLORS: Record<string, string> = { navy: '#15233a', green: '#16a34a', red: '#dc2626', amber: '#d97706', blue: '#1d76db', turquoise: '#14a8a3' };
const TODAY = '2026-09-15';

const getDayOfWeek = (s: string): number => { const d = new Date(s + 'T00:00:00'); const js = d.getDay(); return js === 0 ? 7 : js; };
const addDays = (s: string, n: number): string => { const d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const getWeekDates = (start: string): string[] => { const m = addDays(start, -(getDayOfWeek(start) - 1)); return Array.from({ length: 6 }, (_, i) => addDays(m, i)); };
const isDoctorAvailable = (doc: Doctor, ds: string): boolean => {
  if (!doc.consultationDays.includes(getDayOfWeek(ds))) return false;
  if (doc.unavailabilities.some((u) => u.date === ds)) return false;
  if (doc.absences.some((a) => ds >= a.start && ds <= a.end)) return false;
  return true;
};
const isInBreak = (doc: Doctor, t: string): boolean => doc.breaks.some((b) => t >= b.start && t < b.end);
const isInSlot = (t: string, s: string, e: string): boolean => t >= s && t < e;
const tToM = (t: string): number => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const mToT = (m: number): string => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const formatTimeRange = (t: string, d: number): string => `${t} – ${mToT(tToM(t) + d)}`;
const overlaps = (aS: string, aD: number, bS: string, bD: number): boolean => { const a = tToM(aS), b = tToM(bS); return a < b + bD && b < a + aD; };
function countAppointmentsInHalfDay(appts: Appointment[], docId: string, ds: string, morning: boolean): number {
  return appts.filter((a) => a.doctorId === docId && a.date === ds && a.status !== 'cancelled' && a.status !== 'no-show' && (morning ? tToM(a.time) < 720 : tToM(a.time) >= 720)).length;
}
function getAvailableSlots(docId: string, ds: string, dur: number, excl: string, appts: Appointment[]): string[] {
  const doc = doctors.find((d) => d.id === docId); if (!doc) return [];
  const out: string[] = [];
  for (let m = tToM(doc.startTime); m + dur <= tToM(doc.endTime); m += doc.slotDuration) {
    const t = mToT(m);
    if (t === excl || isInBreak(doc, t) || isInBreak(doc, mToT(m + dur - 1))) continue;
    if (!appts.some((a) => a.doctorId === docId && a.date === ds && a.status !== 'cancelled' && a.status !== 'no-show' && overlaps(t, dur, a.time, a.duration))) out.push(t);
  }
  return out;
}
function getAlternativeSlots(docId: string, ds: string, dur: number, excl: string, appts: Appointment[]): string[] {
  return getAvailableSlots(docId, ds, dur, excl, appts).slice(0, 3);
}
const nowTs = (): string => new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
const formatFrDate = (ds: string): string => new Date(ds + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'Africa/Abidjan' });

const AVAIL_BG: Record<string, string> = { consultation: 'bg-green-100/40', absence: 'bg-red-100/40', unavail: 'bg-amber-100/40', rest: 'bg-navy-100/40' };
const AVAIL_LABEL: Record<string, string> = { consultation: 'Consultation', absence: 'Absence', unavail: 'Indispo.', rest: 'Repos' };
function doctorDayStatus(doc: Doctor, date: string, overrides: Record<string, Partial<Doctor>>): 'consultation' | 'absence' | 'unavail' | 'rest' {
  const m = { ...doc, ...overrides[doc.id] } as Doctor;
  if (m.absences?.some((a) => date >= a.start && date <= a.end)) return 'absence';
  if (m.unavailabilities?.some((u) => u.date === date)) return 'unavail';
  if (!m.consultationDays?.includes(getDayOfWeek(date))) return 'rest';
  return 'consultation';
}
function AvailabilityLegend() {
  return (
    <div className="flex items-center gap-2 text-[10px] text-navy-500">
      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-green-100 border border-green-200" /> Consultation</span>
      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-100 border border-red-200" /> Absence</span>
      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-100 border border-amber-200" /> Indispo.</span>
      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-navy-100 border border-navy-200" /> Repos</span>
    </div>
  );
}
function DoctorAvailabilityBands({ date, overrides, doctorId }: { date: string; overrides: Record<string, Partial<Doctor>>; doctorId?: string }) {
  const list = doctorId ? doctors.filter((d) => d.id === doctorId) : doctors;
  return (
    <>
      {list.map((doc, i) => {
        const st = doctorDayStatus(doc, date, overrides);
        const m = { ...doc, ...overrides[doc.id] } as Doctor;
        const isConsult = st === 'consultation';
        return (
          <div key={doc.id} className="absolute top-0 bottom-0 border-r border-white/40" style={{ left: `${(i / list.length) * 100}%`, width: `${100 / list.length}%` }} title={`${getDoctorName(doc.id)} — ${AVAIL_LABEL[st]}`}>
            {isConsult ? (
              <>
                <div className={`absolute left-0 right-0 ${AVAIL_BG.consultation}`} style={{ top: timeToTop(m.startTime), height: timeToTop(m.endTime) - timeToTop(m.startTime) }} />
                {m.breaks?.map((b, j) => (
                  <div key={j} className="absolute left-0 right-0 bg-navy-200/40" style={{ top: timeToTop(b.start), height: Math.max(timeToTop(b.end) - timeToTop(b.start), 2) }} />
                ))}
              </>
            ) : (
              <div className={`absolute inset-0 ${AVAIL_BG[st]}`} />
            )}
          </div>
        );
      })}
    </>
  );
}

/* ── Sub-components ── */

function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  const m = STATUS_META[status]; const Icon = m.icon;
  return (<Badge color={m.color}><Icon className="w-3 h-3" />{m.label}</Badge>);
}
function TypeIcon({ type }: { type: AppointmentType }) {
  const I = TYPE_META[type].icon;
  return <span title={TYPE_META[type].label}><I className="w-3.5 h-3.5 text-navy-400" /></span>;
}
function Toast({ toast }: { toast: { id: number; msg: string; type: 'success' | 'error' | 'info' } | null }) {
  if (!toast) return null;
  const bg = toast.type === 'success' ? 'bg-green-600' : toast.type === 'error' ? 'bg-red-600' : 'bg-navy-700';
  return (<div className="fixed bottom-6 right-6 z-50 animate-fade-in"><div className={`${bg} text-white px-4 py-3 rounded-lg shadow-lg text-sm font-medium max-w-sm`}>{toast.msg}</div></div>);
}
function IndicatorCard({ icon: Icon, label, value, color }: { icon: typeof Calendar; label: string; value: string | number; color: string }) {
  return (<Card className="p-2.5 flex items-center gap-2"><div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color} shrink-0`}><Icon className="w-4 h-4 text-white" /></div><div className="min-w-0"><p className="text-lg font-bold text-navy-900 leading-none">{value}</p><p className="text-[11px] text-navy-500 mt-0.5 truncate">{label}</p></div></Card>);
}
function AppointmentBlock({ appt, doctor, onMouseDown, compact, isDragging }: { appt: Appointment; doctor?: Doctor; onMouseDown: (e: ReactMouseEvent) => void; compact?: boolean; isDragging?: boolean }) {
  const color = doctor?.color || '#6b7c9b';
  const dim = appt.status === 'cancelled' || appt.status === 'no-show';
  return (
    <div onMouseDown={onMouseDown}
      style={{ borderLeftColor: color, backgroundColor: `${color}12` }}
      className={`w-full h-full text-left rounded-md border border-black/10 border-l-2 px-1.5 py-1 hover:shadow-md hover:z-10 transition-all cursor-grab active:cursor-grabbing ${dim ? 'opacity-60' : ''} ${isDragging ? 'opacity-30' : ''}`}
      title={`${getPatientName(appt.patientId)} — ${appt.reason}`}>
      <div className="flex items-center justify-between gap-0.5">
        <span className="text-[11px] font-bold text-navy-900 truncate">{formatTimeRange(appt.time, appt.duration)}</span>
        <div className="flex items-center gap-0.5 shrink-0"><TypeIcon type={appt.type} />{appt.isLate && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse-soft" />}</div>
      </div>
      <p className="text-[11px] font-semibold text-navy-800 truncate leading-tight">{getPatientName(appt.patientId)}</p>
      {!compact && <p className="text-[10px] text-navy-500 truncate leading-tight">{appt.reason}</p>}
      <div className="flex items-center justify-between gap-0.5 mt-0.5">
        <span className="text-[9px] font-medium truncate" style={{ color }}>{getDoctorName(appt.doctorId)}</span>
        <AppointmentStatusBadge status={appt.status} />
      </div>
    </div>
  );
}
function NowIndicator() {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  if (nowMin < DAY_START_MIN || nowMin > DAY_END_MIN) return null;
  const top = ((nowMin - DAY_START_MIN) / 30) * SLOT_PX;
  return (
    <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top }}>
      <div className="flex items-center">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1 border-2 border-white shadow-sm" />
        <div className="h-0.5 flex-1 bg-red-500" />
      </div>
    </div>
  );
}
function HistoryTimeline({ history }: { history: { timestamp: string; action: string; detail?: string }[] }) {
  return (<div className="space-y-2">{history.map((h, i) => (<div key={i} className="flex gap-2"><div className="flex flex-col items-center"><div className="w-2 h-2 rounded-full bg-medical-500 mt-1" />{i < history.length - 1 && <div className="w-0.5 flex-1 bg-navy-200" />}</div><div className="pb-2"><p className="text-xs font-medium text-navy-800">{h.action}</p>{h.detail && <p className="text-[11px] text-navy-500">{h.detail}</p>}<p className="text-[10px] text-navy-400">{h.timestamp}</p></div></div>))}</div>);
}
function BarChart({ data }: { data: { label: string; count: number; color?: string }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (<div className="flex items-end gap-2 h-32 px-1">{data.map((d, i) => (<div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0"><span className="text-[10px] font-semibold text-navy-700">{d.count}</span><div className="w-full rounded-t transition-all hover:opacity-80" style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count > 0 ? '4px' : '0', backgroundColor: d.color || '#1d76db' }} title={`${d.label}: ${d.count}`} /><span className="text-[10px] text-navy-500 truncate w-full text-center" title={d.label}>{d.label}</span></div>))}</div>);
}

/* ── New appointment modal ── */

interface NewApptForm {
  patientSearch: string; patientId: string; homonymVerified: boolean;
  doctorId: string; date: string; time: string; duration: number;
  type: AppointmentType; reason: string; roomId: string; coverage: CoverageMode;
  priority: PriorityLevel; comment: string; confirmationChannel: ConfirmationChannel;
}

function NewAppointmentModal({ onClose, onSave, appts, defaultDate, defaultTime, defaultDoctorId = '', walkIn = false, initialPatientId = '' }: {
  onClose: () => void; onSave: (a: Appointment) => void; appts: Appointment[]; defaultDate: string; defaultTime: string; defaultDoctorId?: string; walkIn?: boolean; initialPatientId?: string;
}) {
  const initPatient = initialPatientId ? getPatient(initialPatientId) : undefined;
  const [f, setF] = useState<NewApptForm>({ patientSearch: initPatient ? `${initPatient.firstName} ${initPatient.lastName}` : '', patientId: initialPatientId, homonymVerified: false, doctorId: defaultDoctorId, date: defaultDate, time: defaultTime, duration: 30, type: walkIn ? 'walk-in' : 'first', reason: '', roomId: '', coverage: 'particular', priority: 'normal', comment: '', confirmationChannel: 'sms' });
  const [error, setError] = useState<string | null>(null);
  const [alternatives, setAlternatives] = useState<string[]>([]);
  const [urgencyConfirm, setUrgencyConfirm] = useState(false);
  const set = (k: keyof NewApptForm, v: string | number | boolean) => setF((p) => ({ ...p, [k]: v }));

  const matchingPatients = useMemo(() => {
    if (!f.patientSearch.trim()) return [];
    const q = f.patientSearch.toLowerCase();
    return patients.filter((p) => `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) || p.code.toLowerCase().includes(q));
  }, [f.patientSearch]);

  const selectedPatient = f.patientId ? getPatient(f.patientId) : undefined;
  const homonyms = useMemo(() => selectedPatient ? patients.filter((p) => p.id !== selectedPatient.id && p.firstName === selectedPatient.firstName && p.lastName === selectedPatient.lastName) : [], [selectedPatient]);
  const selectedDoctor = doctors.find((d) => d.id === f.doctorId);
  const firstSlots = useMemo(() => {
    if (!f.doctorId || !f.date) return [];
    return getAvailableSlots(f.doctorId, f.date, f.duration, '', appts);
  }, [f.doctorId, f.date, f.duration, appts]);
  const docOccupation = useMemo(() => {
    if (!selectedDoctor || !f.date) return null;
    return {
      morning: countAppointmentsInHalfDay(appts, selectedDoctor.id, f.date, true),
      afternoon: countAppointmentsInHalfDay(appts, selectedDoctor.id, f.date, false),
      max: selectedDoctor.maxPerHalfDay,
    };
  }, [selectedDoctor, f.date, appts]);

  function validate(): string | null {
    if (!f.patientId) return 'Veuillez sélectionner un patient.';
    if (homonyms.length > 0 && !f.homonymVerified) return 'Homonyme détecté — vérifiez la date de naissance et le code patient avant de continuer.';
    if (!f.doctorId) return 'Veuillez sélectionner un médecin.';
    if (!f.date || !f.time) return 'Veuillez sélectionner une date et une heure.';
    if (!f.reason.trim()) return 'Veuillez indiquer le motif.';
    if (walkIn) return null;
    const doc = doctors.find((d) => d.id === f.doctorId)!;
    if (f.type === 'urgent' && !doc.allowUrgency) return `${getDoctorName(doc.id)} n'accepte pas les urgences. Veuillez choisir un autre médecin.`;
    if (f.type !== 'urgent') {
      if (!isDoctorAvailable(doc, f.date)) return `${getDoctorName(doc.id)} n'est pas disponible à cette date.`;
      if (isInBreak(doc, f.time) || isInBreak(doc, mToT(tToM(f.time) + f.duration - 1))) return 'L\'horaire choisi correspond à une pause du médecin.';
      if (!isInSlot(f.time, doc.startTime, doc.endTime)) return `L'horaire doit être entre ${doc.startTime} et ${doc.endTime}.`;
    }
    const morning = tToM(f.time) < 720;
    if (countAppointmentsInHalfDay(appts, doc.id, f.date, morning) >= doc.maxPerHalfDay) return 'Nombre maximum de rendez-vous pour ce demi-jour atteint.';
    if (appts.find((a) => a.doctorId === doc.id && a.date === f.date && a.status !== 'cancelled' && a.status !== 'no-show' && overlaps(f.time, f.duration, a.time, a.duration))) return 'Le médecin a déjà un rendez-vous à cet horaire.';
    if (f.roomId && appts.find((a) => a.roomId === f.roomId && a.date === f.date && a.status !== 'cancelled' && a.status !== 'no-show' && overlaps(f.time, f.duration, a.time, a.duration))) return 'La salle est déjà occupée à cet horaire.';
    if (appts.find((a) => a.patientId === f.patientId && a.date === f.date && a.status !== 'cancelled' && a.status !== 'no-show' && overlaps(f.time, f.duration, a.time, a.duration))) return 'Le patient a déjà un rendez-vous à cet horaire.';
    return null;
  }

  function handleSave() {
    setError(null); setAlternatives([]);
    const v = validate();
    if (v) { setError(v); if (f.doctorId) { const a = getAlternativeSlots(f.doctorId, f.date, f.duration, f.time, appts); if (a.length) setAlternatives(a); } return; }
    if (f.type === 'urgent' && !urgencyConfirm) { setUrgencyConfirm(true); return; }
    onSave({ id: `apt${Date.now()}`, patientId: f.patientId, doctorId: f.doctorId, date: f.date, time: f.time, duration: f.duration, type: walkIn ? 'walk-in' : f.type, reason: f.reason, roomId: f.roomId || selectedDoctor?.roomId || 'room1', status: walkIn ? 'walk-in' : 'planned', coverage: f.coverage, priority: f.priority, comment: f.comment || undefined, confirmationChannel: f.confirmationChannel, history: [{ timestamp: `${f.date} ${nowTs()}`, action: walkIn ? 'Tout venant enregistré' : 'Créé', detail: walkIn ? 'Patient sans rendez-vous' : 'Rendez-vous planifié' }] });
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-navy-900/50 animate-fade-in">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader title={walkIn ? 'Tout venant' : 'Nouveau rendez-vous'} subtitle={walkIn ? 'Enregistrer un patient sans rendez-vous' : 'Planifier un rendez-vous médical'} action={<button onClick={onClose} className="text-navy-400 hover:text-navy-700 focus:outline-none focus:ring-2 focus:ring-medical-400 rounded"><X className="w-5 h-5" /></button>} />
        <div className="p-5 space-y-4">
          {/* Patient search */}
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1">Patient <span className="text-red-500">*</span></label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-navy-400" />
              <input type="text" value={f.patientSearch} onChange={(e) => { set('patientSearch', e.target.value); set('patientId', ''); set('homonymVerified', false); }} placeholder="Rechercher par nom ou code…" className="w-full pl-9 pr-3 py-2 rounded-lg border border-navy-200 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-medical-400 focus:border-transparent" />
            </div>
            {matchingPatients.length > 0 && !f.patientId && (
              <div className="mt-2 border border-navy-100 rounded-lg max-h-40 overflow-y-auto">
                {matchingPatients.map((p) => (
                  <button key={p.id} onClick={() => { set('patientId', p.id); set('patientSearch', `${p.firstName} ${p.lastName}`); }} className="w-full text-left px-3 py-2 hover:bg-navy-50 focus:outline-none focus:bg-navy-50 border-b border-navy-50 last:border-0">
                    <p className="text-sm font-medium text-navy-800">{p.firstName} {p.lastName}</p>
                    <p className="text-xs text-navy-400">{p.code} — {calculateAge(p.birthDate)} ans — {p.gender === 'M' ? 'Homme' : 'Femme'}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Homonym alert */}
          {selectedPatient && homonyms.length > 0 && !f.homonymVerified && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4 text-red-600" /><p className="text-sm font-semibold text-red-700">Homonyme détecté</p></div>
              <p className="text-xs text-red-600 mb-2">{homonyms.length + 1} patient(s) partagent ce nom. Vérifiez la date de naissance et le code avant de continuer.</p>
              <div className="bg-white rounded p-2 text-xs space-y-1">
                <p><strong>Sélectionné :</strong> {selectedPatient.firstName} {selectedPatient.lastName} — Né(e) le {formatDate(selectedPatient.birthDate)} — {selectedPatient.code}</p>
                {homonyms.map((h) => (<p key={h.id} className="text-navy-500"><strong>Autre :</strong> {h.firstName} {h.lastName} — Né(e) le {formatDate(h.birthDate)} — {h.code}</p>))}
              </div>
              <Button size="sm" variant="danger" className="mt-2" onClick={() => set('homonymVerified', true)}><UserCheck className="w-3.5 h-3.5 mr-1" /> J'ai vérifié l'identité</Button>
            </div>
          )}
          {/* Selected patient */}
          {selectedPatient && (
            <div className="bg-navy-50 rounded-lg p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-medical-100 flex items-center justify-center"><User className="w-5 h-5 text-medical-600" /></div>
              <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-navy-900">{selectedPatient.firstName} {selectedPatient.lastName}</p><p className="text-xs text-navy-500">{selectedPatient.code} · {calculateAge(selectedPatient.birthDate)} ans · {selectedPatient.gender === 'M' ? 'Homme' : 'Femme'} · {selectedPatient.phone}</p></div>
            </div>
          )}
          {/* Doctor + specialty */}
          <div className="grid grid-cols-2 gap-3">
            <Select label="Médecin" value={f.doctorId} onChange={(v) => set('doctorId', v)} required options={[{ value: '', label: '— Choisir —' }, ...doctors.map((d) => ({ value: d.id, label: getDoctorName(d.id) }))]} />
            <div><label className="block text-sm font-medium text-navy-700 mb-1">Spécialité</label><input type="text" readOnly value={f.doctorId ? getDoctorSpecialty(f.doctorId) : ''} className="w-full px-3 py-2 rounded-lg border border-navy-200 text-sm text-navy-500 bg-navy-50" /></div>
          </div>
          {/* Date + time + duration */}
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block text-sm font-medium text-navy-700 mb-1">Date <span className="text-red-500">*</span></label><input type="date" value={f.date} onChange={(e) => set('date', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-navy-200 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-medical-400" /></div>
            <div><label className="block text-sm font-medium text-navy-700 mb-1">Heure <span className="text-red-500">*</span></label><input type="time" value={f.time} onChange={(e) => set('time', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-navy-200 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-medical-400" /></div>
            <Select label="Durée" value={String(f.duration)} onChange={(v) => set('duration', Number(v))} options={[15, 20, 30, 45, 60].map((d) => ({ value: String(d), label: `${d} min` }))} />
          </div>
          {/* Type */}
          <div>
            {walkIn ? (<div><label className="block text-sm font-medium text-navy-700 mb-1">Type</label><div className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-turquoise-200 bg-turquoise-50 text-sm text-turquoise-700 font-medium"><UserPlus className="w-4 h-4" /> Tout venant</div></div>) : (<Select label="Type" value={f.type} onChange={(v) => set('type', v as AppointmentType)} options={(Object.keys(TYPE_META) as AppointmentType[]).filter((t) => t !== 'walk-in').map((t) => ({ value: t, label: TYPE_META[t].label }))} />)}
          </div>
          {/* Disponibilités du médecin */}
          {selectedDoctor && (
            <div className="bg-navy-50 rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-medical-600" />
                  <p className="text-sm font-semibold text-navy-800">Disponibilités — {getDoctorName(selectedDoctor.id)}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isDoctorAvailable(selectedDoctor, f.date) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{isDoctorAvailable(selectedDoctor, f.date) ? 'Disponible' : 'Indisponible'}</span>
              </div>
              {isDoctorAvailable(selectedDoctor, f.date) ? (<>
                <div className="flex items-center gap-4 text-xs text-navy-600">
                  <span>Matin : <strong className={docOccupation && docOccupation.morning >= docOccupation.max ? 'text-red-600' : 'text-navy-900'}>{docOccupation?.morning}/{docOccupation?.max}</strong></span>
                  <span>Après-midi : <strong className={docOccupation && docOccupation.afternoon >= docOccupation.max ? 'text-red-600' : 'text-navy-900'}>{docOccupation?.afternoon}/{docOccupation?.max}</strong></span>
                  <span className="text-navy-400">· {selectedDoctor.startTime}–{selectedDoctor.endTime} · {selectedDoctor.slotDuration} min</span>
                </div>
                <div>
                  <p className="text-xs text-navy-500 mb-1.5">Créneaux libres de la journée :</p>
                  {firstSlots.length > 0 ? (<div className="flex flex-wrap gap-2">{firstSlots.map((t) => (<button key={t} type="button" onClick={() => set('time', t)} className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${f.time === t ? 'bg-medical-600 text-white border-medical-600' : 'bg-white text-navy-700 border-navy-200 hover:border-medical-400 hover:bg-medical-50'}`}>{t}</button>))}</div>) : <p className="text-xs text-red-500">Aucun créneau libre pour cette date.</p>}
                </div>
              </>) : (<p className="text-xs text-red-600">Ce médecin ne consulte pas à cette date. Choisissez une autre date ou un autre médecin.</p>)}
            </div>
          )}
          {/* Reason */}
          <div><label className="block text-sm font-medium text-navy-700 mb-1">Motif <span className="text-red-500">*</span></label><select value={f.reason} onChange={(e) => set('reason', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-navy-200 bg-white text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-medical-400"><option value="">Sélectionner un motif...</option><option value="Consultation">Consultation</option><option value="Contrôle">Contrôle</option><option value="Présentation de résultat">Présentation de résultat</option><option value="Examen biologique">Examen biologique</option><option value="Examen d'imagerie">Examen d'imagerie</option><option value="Autre">Autre</option></select></div>
          <TextArea label="Commentaire" value={f.comment} onChange={(v) => set('comment', v)} placeholder="Notes complémentaires…" rows={2} />
          {/* Urgency confirm */}
          {urgencyConfirm && f.type === 'urgent' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div><p className="text-sm text-amber-700 font-medium">Urgence médicale</p><p className="text-xs text-amber-600 mt-0.5">Cette urgence peut modifier l'ordre de passage et augmenter le temps d'attente des autres patients.</p><Button size="sm" className="mt-2" onClick={handleSave}><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Confirmer et enregistrer</Button></div>
            </div>
          )}
          {/* Error + alternatives */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2"><AlertCircle className="w-4 h-4 text-red-600 shrink-0" /><p className="text-sm text-red-700">{error}</p></div>
              {alternatives.length > 0 && (<div className="mt-2"><p className="text-xs text-red-600 mb-1">Créneaux alternatifs suggérés :</p><div className="flex flex-wrap gap-2">{alternatives.map((t) => (<button key={t} onClick={() => { set('time', t); setError(null); setAlternatives([]); setUrgencyConfirm(false); }} className="px-2 py-1 bg-white border border-red-200 rounded text-xs text-navy-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-medical-400">{t}</button>))}</div></div>)}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-navy-100">
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          {!urgencyConfirm && <Button onClick={handleSave}><Plus className="w-4 h-4 mr-1" /> Enregistrer</Button>}
        </div>
      </Card>
    </div>
  );
}

/* ── Detail panel ── */

function DetailPanel({ appt, onClose, onUpdate, onDuplicate, onPrint, onToast }: {
  appt: Appointment; onClose: () => void; onUpdate: (a: Appointment) => void; onDuplicate: (a: Appointment) => void; onPrint: () => void; onToast: (m: string, t: 'success' | 'error' | 'info') => void;
}) {
  const [editingTime, setEditingTime] = useState(false);
  const [newDate, setNewDate] = useState(appt.date);
  const [newTime, setNewTime] = useState(appt.time);
  const [newDoctor, setNewDoctor] = useState(appt.doctorId);
  const [newRoom, setNewRoom] = useState(appt.roomId);
  const [showHistory, setShowHistory] = useState(false);
  const patient = getPatient(appt.patientId);
  const upd = (patch: Partial<Appointment>, action: string, detail?: string) => onUpdate({ ...appt, ...patch, history: [...appt.history, { timestamp: `${appt.date} ${nowTs()}`, action, detail }] });
  const setSt = (status: AppointmentStatus, action: string, detail?: string) => { upd({ status }, action, detail); onToast(`Statut mis à jour : ${STATUS_META[status].label}`, 'success'); };

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-navy-900/50 animate-fade-in" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md h-full bg-white rounded-l-xl shadow-2xl overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-navy-100 sticky top-0 bg-white z-10">
          <h3 className="font-semibold text-navy-900">Détail du rendez-vous</h3>
          <button onClick={onClose} className="text-navy-400 hover:text-navy-700 focus:outline-none focus:ring-2 focus:ring-medical-400 rounded"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          {/* Patient */}
          <div className="bg-navy-50 rounded-lg p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-medical-100 flex items-center justify-center"><User className="w-5 h-5 text-medical-600" /></div>
            <div><p className="text-sm font-semibold text-navy-900">{getPatientName(appt.patientId)}</p><p className="text-xs text-navy-500">{patient?.code} · {patient ? `${calculateAge(patient.birthDate)} ans` : ''} · {patient?.phone}</p></div>
          </div>
          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-xs text-navy-400">Médecin</p><p className="font-medium text-navy-800">{getDoctorName(appt.doctorId)}</p><p className="text-xs text-navy-500">{getDoctorSpecialty(appt.doctorId)}</p></div>
            <div><p className="text-xs text-navy-400">Salle</p><p className="font-medium text-navy-800">{getRoomName(appt.roomId)}</p></div>
            <div>
              <p className="text-xs text-navy-400">Date / Heure</p>
              {editingTime ? (<div className="flex gap-1"><input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="px-2 py-1 rounded border border-navy-200 text-xs" /><input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} className="px-2 py-1 rounded border border-navy-200 text-xs" /></div>) : (<p className="font-medium text-navy-800">{formatDate(appt.date)} · {formatTimeRange(appt.time, appt.duration)}</p>)}
            </div>
            <div><p className="text-xs text-navy-400">Type</p><p className="font-medium text-navy-800 flex items-center gap-1"><TypeIcon type={appt.type} /> {TYPE_META[appt.type].label}</p></div>
            <div><p className="text-xs text-navy-400">Statut</p><div className="mt-0.5"><AppointmentStatusBadge status={appt.status} /></div></div>
            <div><p className="text-xs text-navy-400">Priorité</p><Badge color={PRIORITY_META[appt.priority].color}>{PRIORITY_META[appt.priority].label}</Badge></div>
            <div><p className="text-xs text-navy-400">Couverture</p><p className="font-medium text-navy-800">{COVERAGE_META[appt.coverage]}</p></div>
            <div><p className="text-xs text-navy-400">Confirmation</p><p className="font-medium text-navy-800 flex items-center gap-1">{(() => { const I = CHANNEL_META[appt.confirmationChannel || 'sms'].icon; return <I className="w-3 h-3" />; })()}{CHANNEL_META[appt.confirmationChannel || 'sms'].label}</p></div>
          </div>
          <div><p className="text-xs text-navy-400">Motif</p><p className="text-sm text-navy-800">{appt.reason}</p></div>
          {appt.comment && <div><p className="text-xs text-navy-400">Commentaire</p><p className="text-sm text-navy-600">{appt.comment}</p></div>}
          {appt.arrivalTime && <div><p className="text-xs text-navy-400">Heure d'arrivée</p><p className="text-sm text-navy-800">{appt.arrivalTime}</p></div>}
          {/* Status actions */}
          <div>
            <SectionTitle>Actions sur le statut</SectionTitle>
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="secondary" onClick={() => setSt('confirmed', 'Confirmé')}><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Confirmer</Button>
              <Button size="sm" variant="turquoise" onClick={() => { upd({ status: 'arrived', arrivalTime: nowTs() }, 'Arrivée patient', nowTs()); onToast('Arrivée enregistrée', 'success'); }}><UserCheck className="w-3.5 h-3.5 mr-1" /> Arrivée</Button>
              <Button size="sm" variant="secondary" onClick={() => setSt('waiting', 'En attente')}><Clock className="w-3.5 h-3.5 mr-1" /> En attente</Button>
              <Button size="sm" variant="turquoise" onClick={() => setSt('in-consultation', 'Consultation démarrée')}><Play className="w-3.5 h-3.5 mr-1" /> Démarrer</Button>
              <Button size="sm" variant="primary" onClick={() => setSt('completed', 'Consultation terminée')}><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Terminer</Button>
              <Button size="sm" variant="danger" onClick={() => { const r = window.prompt('Motif d\'annulation :'); if (r) { upd({ status: 'cancelled' }, 'Annulé', r); onToast('Rendez-vous annulé', 'success'); } }}><Ban className="w-3.5 h-3.5 mr-1" /> Annuler</Button>
              <Button size="sm" variant="secondary" onClick={() => { const r = window.prompt('Motif du report :'); if (r) { upd({ status: 'rescheduled' }, 'Reporté', r); onToast('Rendez-vous reporté', 'success'); } }}><CalendarClock className="w-3.5 h-3.5 mr-1" /> Reporter</Button>
              <Button size="sm" variant="danger" onClick={() => setSt('no-show', 'Non honoré', 'Patient absent')}><AlertTriangle className="w-3.5 h-3.5 mr-1" /> Non honoré</Button>
            </div>
          </div>
          {/* Other actions */}
          <div>
            <SectionTitle>Autres actions</SectionTitle>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" className="flex-1" onClick={() => { if (editingTime) { upd({ date: newDate, time: newTime }, 'Modifié', `Reporté au ${formatDate(newDate)} à ${newTime}`); onToast('Date/heure modifiées', 'success'); setEditingTime(false); } else setEditingTime(true); }}><Edit3 className="w-3.5 h-3.5 mr-1" /> {editingTime ? 'Valider' : 'Modifier date/heure'}</Button>
                <Button size="sm" variant="secondary" className="flex-1" onClick={onPrint}><Printer className="w-3.5 h-3.5 mr-1" /> Imprimer</Button>
              </div>
              <Button size="sm" variant="secondary" className="w-full" onClick={() => onDuplicate(appt)}><Copy className="w-3.5 h-3.5 mr-1" /> Dupliquer (suivi)</Button>
              <Select label="Changer de médecin" value={newDoctor} onChange={(v) => setNewDoctor(v)} options={doctors.map((d) => ({ value: d.id, label: getDoctorName(d.id) }))} />
              {newDoctor !== appt.doctorId && <Button size="sm" className="w-full" onClick={() => { upd({ doctorId: newDoctor }, 'Changement de médecin', getDoctorName(newDoctor)); onToast('Médecin changé', 'success'); }}>Appliquer</Button>}
              <Select label="Changer de salle" value={newRoom} onChange={(v) => setNewRoom(v)} options={rooms.map((r) => ({ value: r.id, label: r.name }))} />
              {newRoom !== appt.roomId && <Button size="sm" className="w-full" onClick={() => { upd({ roomId: newRoom }, 'Changement de salle', getRoomName(newRoom)); onToast('Salle changée', 'success'); }}>Appliquer</Button>}
              <button onClick={() => setShowHistory((s) => !s)} className="w-full text-left text-sm text-medical-600 hover:text-medical-700 font-medium flex items-center gap-1 focus:outline-none"><FileText className="w-4 h-4" /> {showHistory ? 'Masquer' : 'Afficher'} l'historique</button>
              {showHistory && <HistoryTimeline history={appt.history} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Queue view ── */

function QueueView({ appts, onAction, onToast }: { appts: Appointment[]; onAction: (a: Appointment) => void; onToast: (m: string, t: 'success' | 'error' | 'info') => void }) {
  const queue = appts.filter((a) => a.date === TODAY && (a.status === 'arrived' || a.status === 'waiting')).sort((a, b) => { if (a.priority !== b.priority) return a.priority === 'medical' ? -1 : 1; return a.time.localeCompare(b.time); });
  if (queue.length === 0) return <Card><EmptyState icon={Users} title="Aucun patient en file d'attente" subtitle="Les patients arrivés apparaîtront ici" /></Card>;
  return (
    <Card>
      <CardHeader title="File d'attente — Aujourd'hui" subtitle={`${queue.length} patient(s) en attente`} />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-navy-50 text-navy-500 text-xs"><tr><th className="px-3 py-2 text-left">#</th><th className="px-3 py-2 text-left">Patient</th><th className="px-3 py-2 text-left">Médecin</th><th className="px-3 py-2 text-left">Heure RDV</th><th className="px-3 py-2 text-left">Arrivée</th><th className="px-3 py-2 text-left">Attente</th><th className="px-3 py-2 text-left">Priorité</th><th className="px-3 py-2 text-left">Statut</th><th className="px-3 py-2 text-left">Salle</th><th className="px-3 py-2 text-left">Actions</th></tr></thead>
          <tbody>
            {queue.map((a, i) => {
              const waitMin = a.arrivalTime ? 18 + i * 4 : 0;
              const doctorDelay = a.status === 'waiting' && i > 0 && i % 2 === 0;
              return (
                <tr key={a.id} className="border-b border-navy-50 hover:bg-navy-50/50">
                  <td className="px-3 py-2 font-bold text-navy-700">{i + 1}</td>
                  <td className="px-3 py-2 font-medium text-navy-800">{getPatientName(a.patientId)}</td>
                  <td className="px-3 py-2 text-navy-600">{getDoctorName(a.doctorId)}{doctorDelay && <span className="ml-1 inline-flex items-center" title="Médecin en retard"><AlertCircle className="w-3 h-3 text-red-600" /></span>}</td>
                  <td className="px-3 py-2 text-navy-600">{a.time}</td>
                  <td className="px-3 py-2 text-navy-600">{a.arrivalTime || '—'}</td>
                  <td className="px-3 py-2">{waitMin > 0 ? <span className={waitMin > 30 ? 'text-red-600 font-medium' : 'text-navy-600'}>{waitMin} min</span> : '—'}</td>
                  <td className="px-3 py-2"><Badge color={PRIORITY_META[a.priority].color}>{PRIORITY_META[a.priority].label}</Badge></td>
                  <td className="px-3 py-2"><AppointmentStatusBadge status={a.status} /></td>
                  <td className="px-3 py-2 text-navy-600 text-xs">{getRoomName(a.roomId)}</td>
                  <td className="px-3 py-2"><div className="flex gap-1">
                    <button title="Appeler le patient" onClick={() => onToast(`Patient appelé — ${getRoomName(a.roomId)}`, 'info')} className="p-1 text-medical-600 hover:bg-medical-50 rounded focus:outline-none focus:ring-2 focus:ring-medical-400"><Bell className="w-3.5 h-3.5" /></button>
                    <button title="Démarrer la consultation" onClick={() => { onAction({ ...a, status: 'in-consultation', history: [...a.history, { timestamp: `${a.date} ${nowTs()}`, action: 'Consultation démarrée' }] }); onToast('Consultation démarrée', 'success'); }} className="p-1 text-turquoise-600 hover:bg-turquoise-50 rounded focus:outline-none focus:ring-2 focus:ring-turquoise-400"><Play className="w-3.5 h-3.5" /></button>
                    <button title="Changer la priorité" onClick={() => { const r = window.prompt('Motif du changement de priorité :'); if (!r) return; const np: PriorityLevel = a.priority === 'normal' ? 'medical' : 'normal'; onAction({ ...a, priority: np, history: [...a.history, { timestamp: `${a.date} ${nowTs()}`, action: 'Priorité modifiée', detail: `${PRIORITY_META[np].label} — ${r}` }] }); onToast('Priorité modifiée', 'success'); }} className="p-1 text-amber-600 hover:bg-amber-50 rounded focus:outline-none focus:ring-2 focus:ring-amber-400"><Zap className="w-3.5 h-3.5" /></button>
                    <button title="Retirer de la file" onClick={() => { onAction({ ...a, status: 'cancelled', history: [...a.history, { timestamp: `${a.date} ${nowTs()}`, action: 'Retiré de la file' }] }); onToast('Patient retiré de la file', 'info'); }} className="p-1 text-red-600 hover:bg-red-50 rounded focus:outline-none focus:ring-2 focus:ring-red-400"><X className="w-3.5 h-3.5" /></button>
                  </div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/* ── Availability view ── */

function ScheduleSettingsModal({ doctor, current, onClose, onSave }: { doctor: Doctor; current: Partial<Doctor>; onClose: () => void; onSave: (patch: Partial<Doctor>) => void }) {
  const [mode, setMode] = useState<'vacation' | 'absence' | 'unavailable' | 'break'>('vacation');
  const [days, setDays] = useState<number[]>(current.consultationDays ?? doctor.consultationDays);
  const [startTime, setStartTime] = useState(current.startTime ?? doctor.startTime);
  const [endTime, setEndTime] = useState(current.endTime ?? doctor.endTime);
  const [vacationStartDate, setVacationStartDate] = useState(current.consultationStartDate ?? '');
  const [vacationEndDate, setVacationEndDate] = useState(current.consultationEndDate ?? '');
  const [date, setDate] = useState(TODAY);
  const [endDate, setEndDate] = useState(TODAY);
  const [reason, setReason] = useState('');
  const [breakStart, setBreakStart] = useState('12:00');
  const [breakEnd, setBreakEnd] = useState('13:00');
  const [breakLabel, setBreakLabel] = useState('Pause');
  const dayLabels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const save = () => {
    if (mode === 'vacation') onSave({ consultationDays: days, consultationStartDate: vacationStartDate || undefined, consultationEndDate: vacationEndDate || undefined, startTime, endTime });
    if (mode === 'absence') onSave({ absences: [...(current.absences ?? doctor.absences), { start: date, end: endDate, reason: reason || 'Absence' }] });
    if (mode === 'unavailable') onSave({ unavailabilities: [...(current.unavailabilities ?? doctor.unavailabilities), { date, reason: reason || 'Indisponibilité' }] });
    if (mode === 'break') onSave({ breaks: [...(current.breaks ?? doctor.breaks), { start: breakStart, end: breakEnd, label: breakLabel || 'Pause' }] });
    onClose();
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 p-4" onClick={onClose}>
    <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between border-b border-navy-100 px-5 py-4"><div><h3 className="font-semibold text-navy-900">Paramétrer le planning</h3><p className="mt-0.5 text-xs text-navy-500">{getDoctorName(doctor.id)} · {doctor.specialty}</p></div><button onClick={onClose} className="rounded p-1 text-navy-400 hover:bg-navy-50"><X className="h-5 w-5" /></button></div>
      <div className="p-5 space-y-4"><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{([['vacation', 'Vacations'], ['absence', 'Absence'], ['unavailable', 'Indispo.'], ['break', 'Repos / Pause']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setMode(value)} className={`rounded-lg border px-2 py-2 text-xs font-medium ${mode === value ? 'border-medical-500 bg-medical-50 text-medical-700' : 'border-navy-200 text-navy-600 hover:bg-navy-50'}`}>{label}</button>)}</div>
        {mode === 'vacation' && <div className="space-y-4"><div><p className="mb-2 text-sm font-medium text-navy-700">Jours de consultation</p><div className="flex flex-wrap gap-2">{dayLabels.map((label, index) => { const day = index + 1; return <label key={day} className={`cursor-pointer rounded-lg border px-3 py-2 text-xs ${days.includes(day) ? 'border-green-300 bg-green-50 text-green-700' : 'border-navy-200 text-navy-500'}`}><input type="checkbox" className="sr-only" checked={days.includes(day)} onChange={() => setDays((old) => old.includes(day) ? old.filter((item) => item !== day) : [...old, day].sort())} />{label}</label>; })}</div></div><div className="grid grid-cols-2 gap-3"><div><label className="mb-1 block text-xs font-medium text-navy-700">Début</label><input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full rounded-lg border border-navy-200 px-3 py-2 text-sm" /></div><div><label className="mb-1 block text-xs font-medium text-navy-700">Fin</label><input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full rounded-lg border border-navy-200 px-3 py-2 text-sm" /></div></div><div className="grid grid-cols-2 gap-3"><div><label className="mb-1 block text-xs font-medium text-navy-700">Du</label><input type="date" value={vacationStartDate} onChange={(e) => setVacationStartDate(e.target.value)} className="w-full rounded-lg border border-navy-200 px-3 py-2 text-sm" /></div><div><label className="mb-1 block text-xs font-medium text-navy-700">Au</label><input type="date" value={vacationEndDate} onChange={(e) => setVacationEndDate(e.target.value)} className="w-full rounded-lg border border-navy-200 px-3 py-2 text-sm" /></div></div></div>}
        {mode === 'absence' && <div className="grid grid-cols-2 gap-3"><div><label className="mb-1 block text-xs font-medium text-navy-700">Du</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-lg border border-navy-200 px-3 py-2 text-sm" /></div><div><label className="mb-1 block text-xs font-medium text-navy-700">Au</label><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full rounded-lg border border-navy-200 px-3 py-2 text-sm" /></div><div className="col-span-2"><label className="mb-1 block text-xs font-medium text-navy-700">Motif</label><input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Congé, formation…" className="w-full rounded-lg border border-navy-200 px-3 py-2 text-sm" /></div></div>}
        {mode === 'unavailable' && <div className="space-y-3"><div><label className="mb-1 block text-xs font-medium text-navy-700">Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-lg border border-navy-200 px-3 py-2 text-sm" /></div><div><label className="mb-1 block text-xs font-medium text-navy-700">Motif</label><input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Bloc opératoire, réunion…" className="w-full rounded-lg border border-navy-200 px-3 py-2 text-sm" /></div></div>}
        {mode === 'break' && <div className="grid grid-cols-2 gap-3"><div><label className="mb-1 block text-xs font-medium text-navy-700">Début</label><input type="time" value={breakStart} onChange={(e) => setBreakStart(e.target.value)} className="w-full rounded-lg border border-navy-200 px-3 py-2 text-sm" /></div><div><label className="mb-1 block text-xs font-medium text-navy-700">Fin</label><input type="time" value={breakEnd} onChange={(e) => setBreakEnd(e.target.value)} className="w-full rounded-lg border border-navy-200 px-3 py-2 text-sm" /></div><div className="col-span-2"><label className="mb-1 block text-xs font-medium text-navy-700">Libellé</label><input value={breakLabel} onChange={(e) => setBreakLabel(e.target.value)} className="w-full rounded-lg border border-navy-200 px-3 py-2 text-sm" /></div></div>}
      </div><div className="flex justify-end gap-2 border-t border-navy-100 px-5 py-3"><Button variant="ghost" onClick={onClose}>Annuler</Button><Button onClick={save}><CheckCircle2 className="mr-1 inline h-4 w-4" /> Enregistrer</Button></div>
    </div>
  </div>;
}

function DayPlanningModal({ doctor, date, status, current, onClose, onSave }: { doctor: Doctor; date: string; status: string; current: Partial<Doctor>; onClose: () => void; onSave: (patch: Partial<Doctor>, deleted: boolean) => void }) {
  const [nextStatus, setNextStatus] = useState(status);
  const save = () => {
    const day = getDayOfWeek(date);
    const absences = (current.absences ?? doctor.absences).filter((item) => !(date >= item.start && date <= item.end));
    const unavailabilities = (current.unavailabilities ?? doctor.unavailabilities).filter((item) => item.date !== date);
    const consultationDays = (current.consultationDays ?? doctor.consultationDays).filter((item) => item !== day);
    if (nextStatus === 'Consultation') consultationDays.push(day);
    if (nextStatus === 'Absence') absences.push({ start: date, end: date, reason: 'Absence' });
    if (nextStatus === 'Indispo.') unavailabilities.push({ date, reason: 'Indisponibilité' });
    onSave({ consultationDays: consultationDays.sort(), absences, unavailabilities }, false);
  };
  const remove = () => {
    const day = getDayOfWeek(date);
    const absences = (current.absences ?? doctor.absences).filter((item) => !(date >= item.start && date <= item.end));
    const unavailabilities = (current.unavailabilities ?? doctor.unavailabilities).filter((item) => item.date !== date);
    const consultationDays = (current.consultationDays ?? doctor.consultationDays).filter((item) => item !== day);
    onSave({ consultationDays, absences, unavailabilities }, true);
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 p-4" onClick={onClose}>
    <div className="w-full max-w-sm rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between border-b border-navy-100 px-5 py-4"><div><h3 className="font-semibold text-navy-900">Modifier le planning</h3><p className="mt-0.5 text-xs text-navy-500">{getDoctorName(doctor.id)} · {formatDate(date)}</p></div><button onClick={onClose} className="rounded p-1 text-navy-400 hover:bg-navy-50"><X className="h-5 w-5" /></button></div>
      <div className="space-y-3 p-5"><label className="block text-sm font-medium text-navy-700">Statut de la journée<select value={nextStatus} onChange={(e) => setNextStatus(e.target.value)} className="mt-1 w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm text-navy-900"><option>Consultation</option><option>Absence</option><option>Indispo.</option><option>Repos</option></select></label><p className="text-xs text-navy-500">Le statut choisi remplace la programmation de cette journée. Les horaires habituels sont conservés pour une consultation.</p></div>
      <div className="flex items-center justify-between border-t border-navy-100 px-5 py-3"><button onClick={remove} className="text-xs font-medium text-red-600 hover:underline">Supprimer la programmation</button><div className="flex gap-2"><Button variant="ghost" onClick={onClose}>Annuler</Button><Button onClick={save}>Enregistrer</Button></div></div>
    </div>
  </div>;
}

function AvailabilityView({ doctorOverrides, onAction, onToast }: { doctorOverrides: Record<string, Partial<Doctor>>; onAction: (docId: string, patch: Partial<Doctor>) => void; onToast: (m: string, t: 'success' | 'error' | 'info') => void }) {
  const [settingsDoctor, setSettingsDoctor] = useState<Doctor | null>(null);
  const [dayPlanning, setDayPlanning] = useState<{ doctor: Doctor; date: string; status: string } | null>(null);
  const [weekStart, setWeekStart] = useState(TODAY);
  const weekDates = getWeekDates(weekStart);
  const getStatus = (d: Doctor, date: string): { label: string; color: string } => {
    const m = { ...d, ...doctorOverrides[d.id] };
    if ((m.consultationStartDate && date < m.consultationStartDate) || (m.consultationEndDate && date > m.consultationEndDate)) return { label: 'Repos', color: 'bg-navy-100 text-navy-500 border-navy-200' };
    if (m.absences?.some((a) => date >= a.start && date <= a.end)) return { label: 'Absence', color: 'bg-red-100 text-red-700 border-red-200' };
    if (m.unavailabilities?.some((u) => u.date === date)) return { label: 'Indispo.', color: 'bg-amber-100 text-amber-700 border-amber-200' };
    if (!m.consultationDays?.includes(getDayOfWeek(date))) return { label: 'Repos', color: 'bg-navy-100 text-navy-500 border-navy-200' };
    return { label: 'Consultation', color: 'bg-green-100 text-green-700 border-green-200' };
  };
  return (
    <Card>
      <CardHeader title="Disponibilités des médecins" subtitle={`Semaine du ${formatFrDate(weekDates[0])} au ${formatFrDate(weekDates[weekDates.length - 1])}`} action={<div className="flex items-center gap-2"><button type="button" onClick={() => setWeekStart((current) => addDays(current, -7))} title="Semaine précédente" aria-label="Semaine précédente" className="rounded-md border border-navy-200 p-1.5 text-navy-500 transition-colors hover:border-medical-300 hover:bg-medical-50 hover:text-medical-700 focus:outline-none focus:ring-2 focus:ring-medical-400"><ChevronLeft className="h-4 w-4" /></button><button type="button" onClick={() => setWeekStart((current) => addDays(current, 7))} title="Semaine suivante" aria-label="Semaine suivante" className="rounded-md border border-navy-200 p-1.5 text-navy-500 transition-colors hover:border-medical-300 hover:bg-medical-50 hover:text-medical-700 focus:outline-none focus:ring-2 focus:ring-medical-400"><ChevronRight className="h-4 w-4" /></button><AvailabilityLegend /></div>} />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-navy-50 text-navy-500 text-xs"><tr><th className="px-3 py-2 text-left sticky left-0 bg-navy-50">Médecin</th>{weekDates.map((d) => (<th key={d} className="px-3 py-2 text-center min-w-[110px]">{formatFrDate(d).replace(/^\w/, (c) => c.toUpperCase())}</th>))}<th className="px-3 py-2 text-left">Config</th></tr></thead>
          <tbody>
            {doctors.map((d) => {
              const m = { ...d, ...doctorOverrides[d.id] };
              return (
                <tr key={d.id} className="border-b border-navy-50">
                  <td className="px-3 py-2 sticky left-0 bg-white"><p className="font-medium text-navy-800 text-xs">{getDoctorName(d.id)}</p><p className="text-[11px] text-navy-400">{d.specialty}</p><p className="text-[10px] text-navy-400">Max {m.maxPerHalfDay}/demi-j · {m.slotDuration} min</p><p className="text-[10px]">{m.allowUrgency ? <span className="text-turquoise-600">Urgences acceptées</span> : <span className="text-navy-400">Pas d'urgence</span>}</p></td>
                  {weekDates.map((date) => {
                    const st = getStatus(d, date);
                    return (<td key={date} className="px-2 py-2 text-center"><div onDoubleClick={() => setDayPlanning({ doctor: d, date, status: st.label })} title="Double-cliquer pour modifier" className={`cursor-pointer rounded border px-2 py-1 text-[11px] font-medium transition-all hover:shadow-sm ${st.color}`}>{st.label}</div>{st.label === 'Consultation' && (<div className="mt-1 space-y-0.5"><p className="text-[10px] text-navy-400">{m.startTime}–{m.endTime}</p>{m.breaks?.map((b, i) => (<p key={i} className="text-[10px] text-navy-500 flex items-center justify-center gap-0.5"><span className="w-1.5 h-1.5 rounded-sm bg-navy-700" />{b.start}–{b.end}</p>))}</div>)}</td>);
                  })}
                  <td className="px-3 py-2"><div className="flex flex-col gap-1">
                    <button onClick={() => setSettingsDoctor(d)} className="flex items-center gap-1 text-left text-[10px] font-semibold text-medical-700 hover:underline focus:outline-none focus:ring-1 focus:ring-medical-400 rounded"><Settings className="h-3 w-3" /> Paramétrer ce médecin</button>
                    <button onClick={() => { onAction(d.id, { allowUrgency: !m.allowUrgency }); onToast('Urgence modifiée', 'success'); }} className="text-[10px] text-medical-600 hover:underline focus:outline-none focus:ring-1 focus:ring-medical-400 rounded">{m.allowUrgency ? 'Bloquer urgences' : 'Autoriser urgences'}</button>
                    <button onClick={() => { const dur = window.prompt('Durée du créneau (min) :', String(m.slotDuration)); if (dur && !isNaN(Number(dur))) { onAction(d.id, { slotDuration: Number(dur) }); onToast('Durée modifiée', 'success'); } }} className="text-[10px] text-medical-600 hover:underline focus:outline-none focus:ring-1 focus:ring-medical-400 rounded">Durée: {m.slotDuration} min</button>
                    <button onClick={() => { const rId = window.prompt('ID salle (room1, room2, room3) :', m.roomId); if (rId) { onAction(d.id, { roomId: rId }); onToast('Salle réaffectée', 'success'); } }} className="text-[10px] text-medical-600 hover:underline focus:outline-none focus:ring-1 focus:ring-medical-400 rounded">Salle: {getRoomName(m.roomId || d.roomId).split(' — ')[0]}</button>
                    <button onClick={() => { const start = window.prompt('Heure de début de la pause (HH:MM) :', '15:00'); if (!start) return; const end = window.prompt('Heure de fin de la pause (HH:MM) :', '15:15'); if (end) { onAction(d.id, { breaks: [...(m.breaks || []), { start, end, label: 'Pause' }] }); onToast('Pause ajoutée', 'success'); } }} className="text-[10px] text-navy-600 hover:underline focus:outline-none focus:ring-1 focus:ring-navy-400 rounded">+ Pause</button>
                  </div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {settingsDoctor && <ScheduleSettingsModal doctor={settingsDoctor} current={doctorOverrides[settingsDoctor.id] ?? {}} onClose={() => setSettingsDoctor(null)} onSave={(patch) => { onAction(settingsDoctor.id, patch); onToast('Planning du médecin enregistré', 'success'); }} />}
      {dayPlanning && <DayPlanningModal doctor={dayPlanning.doctor} date={dayPlanning.date} status={dayPlanning.status} current={doctorOverrides[dayPlanning.doctor.id] ?? {}} onClose={() => setDayPlanning(null)} onSave={(patch, deleted) => { onAction(dayPlanning.doctor.id, patch); onToast(deleted ? 'Programmation supprimée' : 'Planning de la journée enregistré', 'success'); setDayPlanning(null); }} />}
    </Card>
  );
}

/* ── Day grid ── */

function DayGrid({ appts, date, onApptClick, onEmptyClick, onMoveAppt, doctorOverrides, doctorId }: { appts: Appointment[]; date: string; onApptClick: (a: Appointment) => void; onEmptyClick: (t: string) => void; onMoveAppt: (a: Appointment, newDate: string, newTime: string) => void; doctorOverrides: Record<string, Partial<Doctor>>; doctorId?: string }) {
  const isToday = date === TODAY;
  const { gridRef, drag, preview, startDrag } = useApptDrag(onMoveAppt, onApptClick);
  return (
    <Card className="overflow-hidden">
      <CardHeader title={formatDate(date)} subtitle={`${appts.length} rendez-vous`} action={<AvailabilityLegend />} />
      <div className="flex select-none">
        <div className="w-14 shrink-0 relative bg-navy-50/30" style={{ height: GRID_HEIGHT }}>
          {HOURS.filter((_, i) => i % 2 === 0).map((time) => {
            const idx = HOURS.indexOf(time);
            return <div key={time} className="absolute left-0 right-0 text-[10px] text-navy-400 font-medium pl-2" style={{ top: idx * SLOT_PX - 6 }}>{time}</div>;
          })}
        </div>
        <div ref={gridRef} className="flex-1 relative" style={{ height: GRID_HEIGHT }}>
          <DoctorAvailabilityBands date={date} overrides={doctorOverrides} doctorId={doctorId} />
          {HOURS.map((_, i) => <div key={i} className="absolute left-0 right-0 border-t border-navy-50/40" style={{ top: i * SLOT_PX }} />)}
          {isToday && <NowIndicator />}
          {HOURS.map((time, i) => <button key={time} onClick={() => onEmptyClick(time)} className="absolute left-0 right-0 hover:bg-medical-50/20 transition-colors focus:outline-none" style={{ top: i * SLOT_PX, height: SLOT_PX }} title={`Ajouter à ${time}`} />)}
          {preview && drag && (
            <div className="absolute left-1 right-1 border-2 border-dashed border-medical-400 rounded-md bg-medical-50/40 pointer-events-none z-30" style={{ top: timeToTop(preview.time), height: durationToHeight(drag.appt.duration) }} />
          )}
          {appts.map((a) => {
            const doctor = doctors.find((d) => d.id === a.doctorId);
            const isDragging = drag?.appt.id === a.id;
            return <div key={a.id} className="absolute left-1 right-1" style={{ top: timeToTop(a.time), height: durationToHeight(a.duration) }}><AppointmentBlock appt={a} doctor={doctor} onMouseDown={(e) => startDrag(a, e)} isDragging={isDragging} /></div>;
          })}
        </div>
      </div>
    </Card>
  );
}

/* ── Week grid ── */

function WeekGrid({ weekDates, appts, onApptClick, onEmptyClick, onMoveAppt, doctorOverrides, doctorId }: { weekDates: string[]; appts: Appointment[]; onApptClick: (a: Appointment) => void; onEmptyClick: (date: string, time: string) => void; onMoveAppt: (a: Appointment, newDate: string, newTime: string) => void; doctorOverrides: Record<string, Partial<Doctor>>; doctorId?: string }) {
  const { gridRef, drag, preview, startDrag } = useApptDrag(onMoveAppt, onApptClick, weekDates);
  return (
    <Card className="overflow-hidden">
      <CardHeader title="Vue de la semaine" subtitle={`${formatFrDate(weekDates[0])} – ${formatFrDate(weekDates[weekDates.length - 1])}`} action={<AvailabilityLegend />} />
      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          <div className="flex border-b border-navy-100 bg-navy-50/30">
            <div className="w-14 shrink-0" />
            {weekDates.map((d) => (
              <div key={d} className={`flex-1 text-center py-2 border-l border-navy-50 ${d === TODAY ? 'bg-medical-50' : ''}`}>
                <p className="text-xs font-semibold text-navy-700 capitalize">{formatFrDate(d).split(' ')[0]}</p>
                <p className="text-[10px] text-navy-400">{formatFrDate(d).split(' ').slice(1).join(' ')}</p>
              </div>
            ))}
          </div>
          <div ref={gridRef} className="flex select-none">
            <div className="w-14 shrink-0 relative bg-navy-50/20" style={{ height: GRID_HEIGHT }}>
              {HOURS.filter((_, i) => i % 2 === 0).map((time) => {
                const idx = HOURS.indexOf(time);
                return <div key={time} className="absolute left-0 right-0 text-[10px] text-navy-400 font-medium pl-2" style={{ top: idx * SLOT_PX - 6 }}>{time}</div>;
              })}
            </div>
            {weekDates.map((d) => {
              const dayAppts = appts.filter((a) => a.date === d);
              const isToday = d === TODAY;
              return (
                <div key={d} className={`flex-1 relative border-l border-navy-50 ${isToday ? 'bg-medical-50/10' : ''}`} style={{ height: GRID_HEIGHT }}>
                  <DoctorAvailabilityBands date={d} overrides={doctorOverrides} doctorId={doctorId} />
                  {HOURS.map((_, i) => <div key={i} className="absolute left-0 right-0 border-t border-navy-50/30" style={{ top: i * SLOT_PX }} />)}
                  {isToday && <NowIndicator />}
                  {HOURS.map((time, i) => <button key={time} onClick={() => onEmptyClick(d, time)} className="absolute left-0 right-0 hover:bg-medical-50/20 transition-colors focus:outline-none" style={{ top: i * SLOT_PX, height: SLOT_PX }} title={`Ajouter à ${time}`} />)}
                  {preview && drag && preview.date === d && (
                    <div className="absolute left-0.5 right-0.5 border-2 border-dashed border-medical-400 rounded-md bg-medical-50/40 pointer-events-none z-30" style={{ top: timeToTop(preview.time), height: durationToHeight(drag.appt.duration) }} />
                  )}
                  {dayAppts.map((a) => {
                    const doctor = doctors.find((dd) => dd.id === a.doctorId);
                    const isDragging = drag?.appt.id === a.id;
                    return <div key={a.id} className="absolute left-0.5 right-0.5" style={{ top: timeToTop(a.time), height: durationToHeight(a.duration) }}><AppointmentBlock appt={a} doctor={doctor} onMouseDown={(e) => startDrag(a, e)} compact isDragging={isDragging} /></div>;
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ── Main component ── */

type ViewId = 'today' | 'day' | 'week' | 'list';
const VIEW_TABS: { id: ViewId; label: string; icon: typeof Calendar }[] = [
  { id: 'today', label: "Aujourd'hui", icon: Calendar },
  { id: 'day', label: 'Jour', icon: CalendarDays },
  { id: 'week', label: 'Semaine', icon: Grid3x3 },
  { id: 'list', label: 'Liste', icon: List },
];

export default function AppointmentScheduling({ availabilityOpen, onAvailabilityOpen, pendingAppt, onPendingApptConsumed }: { availabilityOpen: boolean; onAvailabilityOpen: (v: boolean) => void; pendingAppt?: { patientId: string; walkIn: boolean } | null; onPendingApptConsumed?: () => void }) {
  const [view, setView] = useState<ViewId>('week');
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [filterDoctor, setFilterDoctor] = useState(doctors[0]?.id ?? '');
  const [filterSpecialty, setFilterSpecialty] = useState('');
  const [filterRoom, setFilterRoom] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchPatient, setSearchPatient] = useState('');
  const [appts, setAppts] = useState<Appointment[]>(initialAppointments);
  const [doctorOverrides, setDoctorOverrides] = useState<Record<string, Partial<Doctor>>>({});
  const [showModal, setShowModal] = useState(false);
  const [walkInModal, setWalkInModal] = useState(false);
  const [slotChooser, setSlotChooser] = useState<{ date: string; time: string } | null>(null);
  const [modalDefaultDate, setModalDefaultDate] = useState(TODAY);
  const [modalDefaultTime, setModalDefaultTime] = useState('08:00');
  const [modalInitialPatient, setModalInitialPatient] = useState('');
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [toast, setToast] = useState<{ id: number; msg: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [sortCol, setSortCol] = useState('time');
  const [sortAsc, setSortAsc] = useState(true);
  const [chartMode, setChartMode] = useState<'status' | 'specialty'>('status');

  useEffect(() => { const s = localStorage.getItem('appt-prefs'); if (s) { try { const p = JSON.parse(s); if (p.view) setView(p.view); if (p.chartMode) setChartMode(p.chartMode); } catch { /* ignore */ } } }, []);
  useEffect(() => { localStorage.setItem('appt-prefs', JSON.stringify({ view, chartMode })); }, [view, chartMode]);
  useEffect(() => {
    let active = true;
    void fetchDoctorScheduleSettings().then((loaded) => {
      if (active) setDoctorOverrides(loaded);
    });
    return () => { active = false; };
  }, []);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); }, [toast]);
  useEffect(() => {
    if (!pendingAppt) return;
    setModalDefaultDate(TODAY);
    setModalDefaultTime('08:00');
    setModalInitialPatient(pendingAppt.patientId);
    setSlotChooser(null);
    if (pendingAppt.walkIn) setWalkInModal(true); else setShowModal(true);
    onPendingApptConsumed?.();
  }, [pendingAppt, onPendingApptConsumed]);
  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => setToast({ id: Date.now(), msg, type });
  const handleDoctorAction = (docId: string, patch: Partial<Doctor>) => {
    setDoctorOverrides((previous) => {
      const settings = { ...previous[docId], ...patch };
      void saveDoctorScheduleSettings(docId, settings);
      return { ...previous, [docId]: settings };
    });
  };

  const specialties = useMemo(() => Array.from(new Set(doctors.map((d) => d.specialty))), []);
  const filteredAppts = useMemo(() => appts.filter((a) => {
    if (filterDoctor && a.doctorId !== filterDoctor) return false;
    if (filterSpecialty && doctors.find((d) => d.id === a.doctorId)?.specialty !== filterSpecialty) return false;
    if (filterRoom && a.roomId !== filterRoom) return false;
    if (filterStatus && a.status !== filterStatus) return false;
    if (searchPatient.trim() && !getPatientName(a.patientId).toLowerCase().includes(searchPatient.toLowerCase())) return false;
    return true;
  }), [appts, filterDoctor, filterSpecialty, filterRoom, filterStatus, searchPatient]);

  const todayAppts = useMemo(() => filteredAppts.filter((a) => a.date === TODAY), [filteredAppts]);
  const dayAppts = useMemo(() => filteredAppts.filter((a) => a.date === selectedDate), [filteredAppts]);
  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);

  const indicators = useMemo(() => {
    const scopeDoctors = filterDoctor ? doctors.filter((d) => d.id === filterDoctor) : doctors;
    const t = appts.filter((a) => a.date === TODAY && (!filterDoctor || a.doctorId === filterDoctor));
    const totalSlots = (HOURS.length / 2) * scopeDoctors.length;
    const filled = t.filter((a) => a.status !== 'cancelled' && a.status !== 'no-show').length;
    return {
      todays: t.length, confirmed: t.filter((a) => a.status === 'confirmed').length,
      arrived: t.filter((a) => a.status === 'arrived').length, waiting: t.filter((a) => a.status === 'waiting').length,
      noShow: t.filter((a) => a.status === 'no-show').length, cancelled: t.filter((a) => a.status === 'cancelled').length,
      inConsultDocs: new Set(t.filter((a) => a.status === 'in-consultation').map((a) => a.doctorId)).size,
      unavailableDocs: scopeDoctors.filter((d) => !isDoctorAvailable(d, TODAY)).length,
      occupancy: totalSlots > 0 ? Math.round((filled / totalSlots) * 100) : 0,
    };
  }, [appts, filterDoctor]);

  const chartData = useMemo(() => {
    if (chartMode === 'status') return (Object.keys(STATUS_META) as AppointmentStatus[]).map((s) => ({ label: STATUS_META[s].label, count: appts.filter((a) => a.status === s).length, color: STATUS_COLORS[STATUS_META[s].color] }));
    return specialties.map((sp) => ({ label: sp, count: appts.filter((a) => doctors.find((d) => d.id === a.doctorId)?.specialty === sp).length, color: doctors.find((d) => d.specialty === sp)?.color }));
  }, [appts, chartMode, specialties]);

  const sortedList = useMemo(() => {
    const arr = [...filteredAppts];
    arr.sort((a, b) => {
      let cmp = 0;
      const col: Record<string, () => number> = {
        time: () => a.time.localeCompare(b.time),
        patient: () => getPatientName(a.patientId).localeCompare(getPatientName(b.patientId)),
        doctor: () => getDoctorName(a.doctorId).localeCompare(getDoctorName(b.doctorId)),
        specialty: () => getDoctorSpecialty(a.doctorId).localeCompare(getDoctorSpecialty(b.doctorId)),
        reason: () => a.reason.localeCompare(b.reason),
        room: () => getRoomName(a.roomId).localeCompare(getRoomName(b.roomId)),
        type: () => a.type.localeCompare(b.type),
        status: () => a.status.localeCompare(b.status),
        priority: () => a.priority.localeCompare(b.priority),
      };
      cmp = (col[sortCol] || (() => 0))();
      return sortAsc ? cmp : -cmp;
    });
    return arr;
  }, [filteredAppts, sortCol, sortAsc]);

  const handleSaveNew = (a: Appointment) => { setAppts((p) => [...p, a]); setShowModal(false); setWalkInModal(false); showToast(a.type === 'walk-in' ? 'Tout venant enregistré' : 'Rendez-vous créé avec succès', 'success'); };
  const handleUpdateAppt = (a: Appointment) => { setAppts((p) => p.map((x) => (x.id === a.id ? a : x))); setSelectedAppt(a); };
  const handleDuplicate = (a: Appointment) => { setAppts((p) => [...p, { ...a, id: `apt${Date.now()}`, status: 'planned', arrivalTime: undefined, date: addDays(a.date, 7), history: [{ timestamp: `${a.date} ${nowTs()}`, action: 'Dupliqué', detail: `Copie du ${formatDate(a.date)}` }] }]); showToast('Rendez-vous dupliqué (suivi)', 'success'); };
  const handleMoveAppt = (appt: Appointment, newDate: string, newTime: string) => {
    if (newDate === appt.date && newTime === appt.time) return;
    const updated: Appointment = { ...appt, date: newDate, time: newTime, history: [...appt.history, { timestamp: `${newDate} ${nowTs()}`, action: 'Déplacé', detail: `De ${formatDate(appt.date)} à ${appt.time} → ${formatDate(newDate)} à ${newTime}` }] };
    setAppts((p) => p.map((x) => (x.id === updated.id ? updated : x)));
    showToast(`RDV déplacé au ${formatDate(newDate)} à ${newTime}`, 'success');
  };
  const handleReset = () => { setAppts(initialAppointments); setDoctorOverrides({}); setFilterDoctor(doctors[0]?.id ?? ''); setFilterSpecialty(''); setFilterRoom(''); setFilterStatus(''); setSearchPatient(''); showToast('Démonstration réinitialisée', 'info'); };
  const navigateDay = (d: number) => setSelectedDate((s) => addDays(s, d));
  const openNewAt = (t: string, d?: string) => { setSlotChooser({ date: d || selectedDate, time: t }); };
  const sortList = (c: string) => { if (sortCol === c) setSortAsc((s) => !s); else { setSortCol(c); setSortAsc(true); } };
  const listColumns = [{ key: 'time', label: 'Heure' }, { key: 'patient', label: 'Patient' }, { key: 'doctor', label: 'Médecin' }, { key: 'specialty', label: 'Spé' }, { key: 'reason', label: 'Motif' }, { key: 'room', label: 'Salle' }, { key: 'type', label: 'Type' }, { key: 'status', label: 'Statut' }, { key: 'priority', label: 'Priorité' }];

  return (
    <div className="space-y-4">
      <Toast toast={toast} />
      {/* View tabs + controls */}
      <div className="flex flex-nowrap items-center gap-2 border-b border-navy-100 pb-2 overflow-x-auto [&>div:last-child]:flex-nowrap [&>div:last-child]:shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto">
          {VIEW_TABS.map((t) => { const I = t.icon; return (<button key={t.id} onClick={() => setView(t.id)} className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-medical-400 rounded-t ${view === t.id ? 'border-medical-600 text-medical-700' : 'border-transparent text-navy-500 hover:text-navy-700 hover:border-navy-200'}`}><I className="w-4 h-4" />{t.label}</button>); })}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="h-8 rounded-md border border-navy-200 bg-white px-2 text-xs text-navy-900 focus:outline-none focus:ring-2 focus:ring-medical-400" />
          <span title="Précédent"><Button size="sm" variant="ghost" onClick={() => navigateDay(-1)}><ChevronLeft className="h-4 w-4" /></Button></span>
          <span title="Suivant"><Button size="sm" variant="ghost" onClick={() => navigateDay(1)}><ChevronRight className="h-4 w-4" /></Button></span>
          <div className="w-36 flex items-center gap-1.5">
            <Stethoscope className="w-3.5 h-3.5 text-navy-400 shrink-0" />
            <select value={filterDoctor} onChange={(e) => setFilterDoctor(e.target.value)} className="w-[calc(100%+0.5rem)] -ml-1 h-8 px-2 rounded-md border border-navy-200 bg-white text-xs text-navy-900 focus:outline-none focus:ring-2 focus:ring-medical-400">
              <option value="">Tous</option>
              {doctors.map((d) => (<option key={d.id} value={d.id}>{getDoctorName(d.id)}</option>))}
            </select>
          </div>
          <div className="relative w-44"><Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-navy-400" /><input type="text" value={searchPatient} onChange={(e) => setSearchPatient(e.target.value)} placeholder="Patient…" className="w-full h-8 pl-8 pr-2 rounded-md border border-navy-200 bg-white text-xs text-navy-900 focus:outline-none focus:ring-2 focus:ring-medical-400" /></div>
          <Button size="sm" onClick={() => { setModalDefaultDate(selectedDate); setModalDefaultTime('08:00'); setSlotChooser(null); setShowModal(true); }}><Plus className="w-4 h-4 mr-1" /> Nouveau RDV</Button>
          <Button size="sm" variant="turquoise" onClick={() => { setModalDefaultDate(selectedDate); setModalDefaultTime('08:00'); setSlotChooser(null); setWalkInModal(true); }}><UserPlus className="w-4 h-4 mr-1" /> Tout venant</Button>
        </div>
      </div>
      {/* Indicator cards */}
      <div className="flex flex-nowrap gap-3 overflow-x-auto pb-1 [&>*]:min-w-[132px] [&>*]:flex-1 lg:[&>*]:min-w-0">
        <IndicatorCard icon={Calendar} label="RDV du jour" value={indicators.todays} color="bg-medical-600" />
        <IndicatorCard icon={CheckCircle2} label="Confirmés" value={indicators.confirmed} color="bg-medical-500" />
        <IndicatorCard icon={UserCheck} label="Patients arrivés" value={indicators.arrived} color="bg-turquoise-500" />
        <IndicatorCard icon={Clock} label="En attente" value={indicators.waiting} color="bg-amber-500" />
        <IndicatorCard icon={Activity} label="Attente médiane" value="18 min" color="bg-navy-600" />
        <IndicatorCard icon={AlertTriangle} label="Non honorés" value={indicators.noShow} color="bg-red-500" />
        <IndicatorCard icon={Ban} label="Annulations" value={indicators.cancelled} color="bg-red-400" />
        <IndicatorCard icon={TrendingUp} label="Taux d'occupation" value={`${indicators.occupancy}%`} color="bg-navy-700" />
      </div>
      {/* Main content */}
      {view === 'today' && <DayGrid appts={todayAppts} date={TODAY} onApptClick={setSelectedAppt} onEmptyClick={openNewAt} onMoveAppt={handleMoveAppt} doctorOverrides={doctorOverrides} doctorId={filterDoctor || undefined} />}
      {view === 'day' && <DayGrid appts={dayAppts} date={selectedDate} onApptClick={setSelectedAppt} onEmptyClick={openNewAt} onMoveAppt={handleMoveAppt} doctorOverrides={doctorOverrides} doctorId={filterDoctor || undefined} />}
      {view === 'week' && <WeekGrid weekDates={weekDates} appts={filteredAppts} onApptClick={setSelectedAppt} onEmptyClick={(d, t) => openNewAt(t, d)} onMoveAppt={handleMoveAppt} doctorOverrides={doctorOverrides} doctorId={filterDoctor || undefined} />}
      {view === 'list' && (
        <Card>
          <CardHeader title="Liste des rendez-vous" subtitle={`${sortedList.length} rendez-vous`} />
          {sortedList.length === 0 ? <EmptyState icon={Calendar} title="Aucun rendez-vous" subtitle="Aucun rendez-vous ne correspond aux filtres" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-navy-50 text-navy-500 text-xs"><tr>{listColumns.map((c) => (<th key={c.key} className="px-3 py-2 text-left cursor-pointer hover:text-navy-700 focus:outline-none" onClick={() => sortList(c.key)}>{c.label}{sortCol === c.key && <span className="ml-1">{sortAsc ? '↑' : '↓'}</span>}</th>))}</tr></thead>
                <tbody>
                  {sortedList.map((a) => (<tr key={a.id} className="border-b border-navy-50 hover:bg-navy-50/50 cursor-pointer focus:outline-none" onClick={() => setSelectedAppt(a)}>
                    <td className="px-3 py-2 text-navy-700 font-medium whitespace-nowrap">{formatTimeRange(a.time, a.duration)}</td>
                    <td className="px-3 py-2 text-navy-800">{getPatientName(a.patientId)}</td>
                    <td className="px-3 py-2 text-navy-600">{getDoctorName(a.doctorId)}</td>
                    <td className="px-3 py-2 text-navy-500 text-xs">{getDoctorSpecialty(a.doctorId)}</td>
                    <td className="px-3 py-2 text-navy-600 max-w-[160px] truncate" title={a.reason}>{a.reason}</td>
                    <td className="px-3 py-2 text-navy-600 text-xs">{getRoomName(a.roomId)}</td>
                    <td className="px-3 py-2"><TypeIcon type={a.type} /></td>
                    <td className="px-3 py-2"><AppointmentStatusBadge status={a.status} /></td>
                    <td className="px-3 py-2"><Badge color={PRIORITY_META[a.priority].color}>{PRIORITY_META[a.priority].label}</Badge></td>
                  </tr>))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
      {availabilityOpen && <AvailabilityView doctorOverrides={doctorOverrides} onAction={handleDoctorAction} onToast={showToast} />}
      {/* Queue */}
      {!availabilityOpen && <QueueView appts={appts} onAction={handleUpdateAppt} onToast={showToast} />}
      {/* Bar chart */}
      <Card>
        <CardHeader title="Répartition des rendez-vous" action={<div className="flex gap-1"><button onClick={() => setChartMode('status')} className={`px-2 py-1 text-xs rounded ${chartMode === 'status' ? 'bg-medical-600 text-white' : 'bg-navy-100 text-navy-600'}`}>Par statut</button><button onClick={() => setChartMode('specialty')} className={`px-2 py-1 text-xs rounded ${chartMode === 'specialty' ? 'bg-medical-600 text-white' : 'bg-navy-100 text-navy-600'}`}>Par spécialité</button></div>} />
        <div className="p-4"><BarChart data={chartData} /></div>
      </Card>
      {/* Modal */}
      {showModal && <NewAppointmentModal onClose={() => setShowModal(false)} onSave={handleSaveNew} appts={appts} defaultDate={modalDefaultDate} defaultTime={modalDefaultTime} defaultDoctorId={filterDoctor} initialPatientId={modalInitialPatient} />}
      {walkInModal && <NewAppointmentModal walkIn onClose={() => setWalkInModal(false)} onSave={handleSaveNew} appts={appts} defaultDate={modalDefaultDate} defaultTime={modalDefaultTime} defaultDoctorId={filterDoctor} initialPatientId={modalInitialPatient} />}
      {slotChooser && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-navy-900/50 animate-fade-in" onClick={() => setSlotChooser(null)}>
          <Card className="w-full max-w-sm">
            <CardHeader title="Créneau disponible" subtitle={`${formatDate(slotChooser.date)} à ${slotChooser.time}`} action={<button onClick={() => setSlotChooser(null)} className="text-navy-400 hover:text-navy-700 focus:outline-none focus:ring-2 focus:ring-medical-400 rounded"><X className="w-5 h-5" /></button>} />
            <div className="p-4 space-y-2">
              <Button className="w-full" onClick={() => { setModalDefaultDate(slotChooser.date); setModalDefaultTime(slotChooser.time); setShowModal(true); setSlotChooser(null); }}><Calendar className="w-4 h-4 mr-1" /> Rendez-vous</Button>
              <Button variant="turquoise" className="w-full" onClick={() => { setModalDefaultDate(slotChooser.date); setModalDefaultTime(slotChooser.time); setWalkInModal(true); setSlotChooser(null); }}><UserPlus className="w-4 h-4 mr-1" /> Tout venant</Button>
            </div>
          </Card>
        </div>
      )}
      {/* Detail panel */}
      {selectedAppt && <DetailPanel appt={selectedAppt} onClose={() => setSelectedAppt(null)} onUpdate={handleUpdateAppt} onDuplicate={handleDuplicate} onPrint={() => showToast('Impression simulée', 'info')} onToast={showToast} />}
    </div>
  );
}
