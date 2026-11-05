import {
  Stethoscope,
  Clock,
  BedDouble,
  FlaskConical,
  Copy,
  PackageX,
  Receipt,
  ShieldX,
  Activity,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  ArrowRight,
} from 'lucide-react';
import type { ScreenId } from '@/types';
import { Card, CardHeader, Badge, Button } from '@/components/ui';
import { consultations } from '@/data/consultations';
import { beds } from '@/data/beds';
import { labOrders } from '@/data/lab';
import { medicationStock } from '@/data/pharmacy';
import { invoices } from '@/data/billing';
import { patients, getPatientName } from '@/data/patients';
import { formatDate } from '@/utils/format';

interface DashboardProps {
  onNavigate: (screen: ScreenId) => void;
}

const today = '2026-09-14';

// --- Fictitious KPI values ---
const TOTAL_BEDS = 16;
const occupiedBeds = beds.filter((b) => b.status === 'occupied');
const bedOccupancyRate = Math.round((occupiedBeds.length / TOTAL_BEDS) * 100);
const todayConsultations = consultations.filter((c) => c.date === today);
const medianWaitMin = 23;
const labResultsToValidate = labOrders.filter(
  (l) => l.tests.some((t) => t.status === 'completed') && l.status !== 'completed'
).length;
const stockouts = medicationStock.filter((m) => m.stock < m.minStock);
const actsToReconcile = invoices.filter((i) => i.status === 'pending' || i.status === 'partial').length;
const insuranceRejections = 1;

// --- KPI card config ---
interface KPICardData {
  icon: typeof Stethoscope;
  label: string;
  value: number | string;
  unit?: string;
  trend?: { direction: 'up' | 'down'; value: string };
  color: 'medical' | 'turquoise' | 'navy' | 'amber' | 'red' | 'green';
  onClick?: () => void;
}

const colorMap: Record<KPICardData['color'], { bg: string; text: string; ring: string; bar: string }> = {
  medical: { bg: 'bg-medical-50', text: 'text-medical-600', ring: 'ring-medical-100', bar: 'bg-medical-500' },
  turquoise: { bg: 'bg-turquoise-50', text: 'text-turquoise-600', ring: 'ring-turquoise-100', bar: 'bg-turquoise-500' },
  navy: { bg: 'bg-navy-100', text: 'text-navy-600', ring: 'ring-navy-200', bar: 'bg-navy-500' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600', ring: 'ring-amber-100', bar: 'bg-amber-500' },
  red: { bg: 'bg-red-50', text: 'text-red-600', ring: 'ring-red-100', bar: 'bg-red-500' },
  green: { bg: 'bg-green-50', text: 'text-green-600', ring: 'ring-green-100', bar: 'bg-green-500' },
};

function KPICard({ icon: Icon, label, value, unit, trend, color, onClick }: KPICardData) {
  const c = colorMap[color];
  return (
    <button
      onClick={onClick}
      className="text-left bg-white rounded-xl clinical-shadow border border-navy-100 p-4 hover:border-medical-300 transition-colors duration-150 group flex flex-col min-w-0"
    >
      <div className="flex items-center gap-2.5 mb-3">
        <div className={`w-9 h-9 rounded-lg ${c.bg} flex items-center justify-center ring-1 ${c.ring} flex-shrink-0`}>
          <Icon className={`w-4.5 h-4.5 ${c.text}`} />
        </div>
        <p className="text-xs text-navy-500 font-medium leading-tight">{label}</p>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-bold text-navy-900 tabular-nums">{value}</span>
        {unit && <span className="text-xs text-navy-400 font-medium">{unit}</span>}
      </div>
      {trend && (
        <div className="flex items-center gap-1 mt-1.5">
          {trend.direction === 'up' ? (
            <TrendingUp className="w-3 h-3 text-green-500" />
          ) : (
            <TrendingDown className="w-3 h-3 text-red-500" />
          )}
          <span className={`text-[11px] font-medium ${trend.direction === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            {trend.value}
          </span>
        </div>
      )}
      <div className="mt-2 flex items-center gap-1 text-[11px] text-navy-400 group-hover:text-medical-600 transition-colors">
        <span>Voir détails</span>
        <ChevronRight className="w-3 h-3" />
      </div>
    </button>
  );
}

// --- Bar chart data (consultations per hour) ---
const consultsPerHour = [
  { hour: '07h', count: 1 },
  { hour: '08h', count: 1 },
  { hour: '09h', count: 1 },
  { hour: '10h', count: 2 },
  { hour: '11h', count: 1 },
  { hour: '12h', count: 0 },
  { hour: '13h', count: 0 },
  { hour: '14h', count: 2 },
  { hour: '15h', count: 1 },
];
const maxConsults = Math.max(...consultsPerHour.map((d) => d.count), 1);

// --- Donut chart data (bed occupancy breakdown) ---
const bedBreakdown = [
  { label: 'Occupés', count: occupiedBeds.length, color: '#ef4444' },
  { label: 'Disponibles', count: beds.filter((b) => b.status === 'available').length + (TOTAL_BEDS - beds.length), color: '#22c55e' },
  { label: 'Nettoyage', count: beds.filter((b) => b.status === 'cleaning').length, color: '#f59e0b' },
  { label: 'Réservés', count: beds.filter((b) => b.status === 'reserved').length, color: '#1d76db' },
];
const donutTotal = bedBreakdown.reduce((s, d) => s + d.count, 0);

function DonutSegment({ percentage, color, offset }: { percentage: number; color: string; offset: number }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const dash = (percentage / 100) * circumference;
  return (
    <circle
      cx="64" cy="64" r={radius}
      fill="none" stroke={color} strokeWidth="14"
      strokeDasharray={`${dash} ${circumference - dash}`}
      strokeDashoffset={-offset}
      transform="rotate(-90 64 64)"
    />
  );
}

// --- Priority actions ---
interface PriorityAction {
  icon: typeof AlertTriangle;
  label: string;
  detail: string;
  severity: 'red' | 'amber' | 'navy';
  screen: ScreenId;
}

const priorityActions: PriorityAction[] = [
  { icon: FlaskConical, label: 'Résultats de laboratoire à valider', detail: `${labResultsToValidate} commande(s) avec résultats en attente de validation biologiste`, severity: 'red', screen: 'lab-results' },
  { icon: PackageX, label: 'Ruptures de stock pharmacie', detail: `${stockouts.length} médicament(s) sous le seuil minimum`, severity: 'red', screen: 'pharmacy-dispensing' },
  { icon: Receipt, label: 'Actes à rapprocher', detail: `${actsToReconcile} facture(s) non soldée(s) à rapprocher des actes`, severity: 'amber', screen: 'billing' },
  { icon: ShieldX, label: 'Rejets assurance', detail: `${insuranceRejections} demande de prise en charge rejetée par l'organisme`, severity: 'red', screen: 'billing' },
];

const severityMap: Record<PriorityAction['severity'], { bg: string; text: string; border: string }> = {
  red: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
  navy: { bg: 'bg-navy-100', text: 'text-navy-600', border: 'border-navy-200' },
};

export default function Dashboard({ onNavigate }: DashboardProps) {
  const kpiCards: KPICardData[] = [
    { icon: Stethoscope, label: 'Consultations du jour', value: todayConsultations.length, color: 'medical', trend: { direction: 'up', value: '+2 vs hier' }, onClick: () => onNavigate('consultation') },
    { icon: Clock, label: 'Attente médiane', value: medianWaitMin, unit: 'min', color: 'turquoise', trend: { direction: 'down', value: '-5 min vs hier' }, onClick: () => onNavigate('reception') },
    { icon: BedDouble, label: 'Occupation des lits', value: `${occupiedBeds.length}/${TOTAL_BEDS}`, color: 'amber', onClick: () => onNavigate('bed-management') },
    { icon: FlaskConical, label: 'Résultats à valider', value: labResultsToValidate, color: 'red', onClick: () => onNavigate('lab-results') },
    { icon: PackageX, label: 'Ruptures de stock', value: stockouts.length, color: 'red', onClick: () => onNavigate('pharmacy-dispensing') },
    { icon: ShieldX, label: 'Rejets assurance', value: insuranceRejections, color: 'red', onClick: () => onNavigate('billing') },
  ];

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-navy-900">Tableau de bord — Direction</h2>
          <p className="text-sm text-navy-500 mt-0.5">
            Vue d'ensemble de l'établissement — {formatDate(today)}
          </p>
        </div>
        <Badge color="turquoise">
          <Activity className="w-3 h-3" />
          Temps réel
        </Badge>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpiCards.map((card) => (
          <KPICard key={card.label} {...card} />
        ))}
      </div>

      {/* Two charts side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Bar chart — consultations per hour */}
        <Card className="lg:col-span-3">
          <CardHeader
            title="Consultations par heure"
            subtitle="Répartition des consultations de la journée"
            action={
              <div className="flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-medical-400" />
                <span className="text-sm font-semibold text-navy-900">{todayConsultations.length}</span>
                <span className="text-xs text-navy-400">consultations</span>
              </div>
            }
          />
          <div className="p-5">
            <div className="flex items-end justify-between gap-2 h-48">
              {consultsPerHour.map((d) => (
                <div key={d.hour} className="flex flex-col items-center gap-2 flex-1">
                  <span className="text-[11px] font-semibold text-navy-600 tabular-nums">
                    {d.count > 0 ? d.count : ''}
                  </span>
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className={`w-full rounded-t-md transition-all duration-500 ${
                        d.count === 0
                          ? 'bg-navy-100'
                          : d.count >= maxConsults
                          ? 'bg-medical-500'
                          : 'bg-medical-300'
                      }`}
                      style={{ height: `${Math.max((d.count / maxConsults) * 100, 4)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-navy-400 font-medium">{d.hour}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-navy-100 flex items-center justify-between text-xs text-navy-400">
              <span>Pic d'activité: 10h et 14h</span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-medical-500" />
                Consultations
              </span>
            </div>
          </div>
        </Card>

        {/* Donut chart — bed occupancy */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Occupation des lits"
            subtitle={`${occupiedBeds.length} occupés sur ${TOTAL_BEDS} lits`}
            action={
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-navy-400" />
                <span className="text-2xl font-bold text-navy-900">{bedOccupancyRate}%</span>
              </div>
            }
          />
          <div className="p-5 flex flex-col items-center">
            <div className="relative">
              <svg width="128" height="128" viewBox="0 0 128 128">
                {(() => {
                  let cumulative = 0;
                  return bedBreakdown.map((seg) => {
                    const pct = donutTotal > 0 ? (seg.count / donutTotal) * 100 : 0;
                    const offset = (cumulative / donutTotal) * 100;
                    cumulative += seg.count;
                    return <DonutSegment key={seg.label} percentage={pct} color={seg.color} offset={offset} />;
                  });
                })()}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-navy-900">{bedOccupancyRate}%</span>
                <span className="text-[10px] text-navy-400">occupation</span>
              </div>
            </div>
            <div className="mt-4 w-full space-y-2">
              {bedBreakdown.map((seg) => (
                <div key={seg.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
                    <span className="text-xs text-navy-600 font-medium">{seg.label}</span>
                  </div>
                  <span className="text-xs text-navy-500 tabular-nums font-semibold">{seg.count}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Priority actions */}
      <Card>
        <CardHeader
          title="Actions prioritaires"
          subtitle="Éléments nécessitant une attention immédiate"
          action={
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-semibold text-navy-900">{priorityActions.length}</span>
              <span className="text-xs text-navy-400">actions</span>
            </div>
          }
        />
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {priorityActions.map((action) => {
              const s = severityMap[action.severity];
              return (
                <button
                  key={action.label}
                  onClick={() => onNavigate(action.screen)}
                  className={`flex items-start gap-3 rounded-lg p-3.5 border ${s.border} ${s.bg} hover:shadow-md transition-all duration-150 text-left group`}
                >
                  <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0 ring-1 ring-white`}>
                    <action.icon className={`w-4.5 h-4.5 ${s.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-navy-900">{action.label}</p>
                    <p className="text-xs text-navy-500 mt-0.5 leading-relaxed">{action.detail}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-navy-300 group-hover:text-navy-600 group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1" />
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Today's consultations detail */}
      <Card>
        <CardHeader
          title="Consultations du jour"
          subtitle={`${todayConsultations.length} consultation(s) — détails par médecin`}
          action={
            <Button variant="ghost" size="sm" onClick={() => onNavigate('consultation')}>
              Tout voir
            </Button>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-navy-50 text-left">
                <th className="px-5 py-3 text-xs font-semibold text-navy-500 uppercase tracking-wider">Heure</th>
                <th className="px-5 py-3 text-xs font-semibold text-navy-500 uppercase tracking-wider">Patient</th>
                <th className="px-5 py-3 text-xs font-semibold text-navy-500 uppercase tracking-wider">Médecin</th>
                <th className="px-5 py-3 text-xs font-semibold text-navy-500 uppercase tracking-wider">Motif</th>
                <th className="px-5 py-3 text-xs font-semibold text-navy-500 uppercase tracking-wider">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100">
              {todayConsultations.map((c) => (
                <tr key={c.id} className="hover:bg-navy-50 transition-colors">
                  <td className="px-5 py-3">
                    <span className="text-sm text-navy-600 tabular-nums">{c.time}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-sm font-medium text-navy-900">{getPatientName(c.patientId)}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-sm text-navy-600">{c.doctor}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-sm text-navy-600 max-w-xs truncate block">{c.chiefComplaint}</span>
                  </td>
                  <td className="px-5 py-3">
                    <Badge color={c.status === 'completed' ? 'green' : c.status === 'in-progress' ? 'blue' : 'amber'}>
                      {c.status === 'completed' ? 'Terminé' : c.status === 'in-progress' ? 'En cours' : 'En attente'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Stockout detail */}
      {stockouts.length > 0 && (
        <Card>
          <CardHeader
            title="Médicaments en rupture de stock"
            subtitle={`${stockouts.length} médicament(s) sous le seuil minimum`}
            action={
              <Button variant="ghost" size="sm" onClick={() => onNavigate('pharmacy-dispensing')}>
                Gérer le stock
              </Button>
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-navy-50 text-left">
                  <th className="px-5 py-3 text-xs font-semibold text-navy-500 uppercase tracking-wider">Médicament</th>
                  <th className="px-5 py-3 text-xs font-semibold text-navy-500 uppercase tracking-wider">Catégorie</th>
                  <th className="px-5 py-3 text-xs font-semibold text-navy-500 uppercase tracking-wider">Stock actuel</th>
                  <th className="px-5 py-3 text-xs font-semibold text-navy-500 uppercase tracking-wider">Seuil mini</th>
                  <th className="px-5 py-3 text-xs font-semibold text-navy-500 uppercase tracking-wider">État</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {stockouts.map((med) => (
                  <tr key={med.id} className="hover:bg-navy-50 transition-colors">
                    <td className="px-5 py-3">
                      <span className="text-sm font-medium text-navy-900">{med.name}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-sm text-navy-600">{med.category}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-sm font-semibold text-red-600 tabular-nums">{med.stock} {med.unit}s</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-sm text-navy-500 tabular-nums">{med.minStock} {med.unit}s</span>
                    </td>
                    <td className="px-5 py-3">
                      <Badge color="red">
                        <PackageX className="w-3 h-3" />
                        Rupture
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
