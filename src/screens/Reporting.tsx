import { useMemo } from 'react';
import {
  Users,
  Stethoscope,
  DollarSign,
  BedDouble,
  FlaskConical,
  Clock,
  TrendingUp,
  Activity,
  Award,
} from 'lucide-react';
import { Card, CardHeader, Badge, SectionTitle } from '@/components/ui';
import { formatFCFA } from '@/utils/format';

// Inline mock data for the Direction dashboard
const kpis = [
  { id: 'patients', label: 'Total patients', value: '1 248', icon: Users, color: 'navy' as const },
  { id: 'consultations', label: 'Consultations', value: '3 567', icon: Stethoscope, color: 'medical' as const },
  { id: 'revenue', label: 'Revenus (mois)', value: formatFCFA(24_500_000), icon: DollarSign, color: 'green' as const, isMoney: true },
  { id: 'occupancy', label: "Taux d'occupation", value: '78%', icon: BedDouble, color: 'turquoise' as const },
  { id: 'labTests', label: 'Examens labo.', value: '892', icon: FlaskConical, color: 'navy' as const },
  { id: 'waitTime', label: 'Temps d\'attente moy.', value: '24 min', icon: Clock, color: 'amber' as const },
];

const revenueByService: { service: string; revenue: number }[] = [
  { service: 'Cardiologie', revenue: 5_200_000 },
  { service: 'Pneumologie', revenue: 3_100_000 },
  { service: 'Médecine interne', revenue: 4_800_000 },
  { service: 'Chirurgie', revenue: 6_900_000 },
  { service: 'Urgences', revenue: 2_400_000 },
  { service: 'Laboratoire', revenue: 1_800_000 },
  { service: 'Pharmacie', revenue: 1_300_000 },
];

const occupancyByService: { service: string; rate: number; total: number; occupied: number }[] = [
  { service: 'Cardiologie', rate: 50, total: 4, occupied: 2 },
  { service: 'Pneumologie', rate: 33, total: 3, occupied: 1 },
  { service: 'Médecine interne', rate: 33, total: 3, occupied: 1 },
  { service: 'Chirurgie', rate: 0, total: 2, occupied: 0 },
];

const topPathologies: { name: string; count: number; trend: 'up' | 'down' | 'stable' }[] = [
  { name: 'Paludisme', count: 342, trend: 'up' },
  { name: 'Hypertension artérielle', count: 287, trend: 'up' },
  { name: 'Diabète type 2', count: 198, trend: 'stable' },
  { name: 'Infections respiratoires', count: 156, trend: 'down' },
  { name: 'Gastro-entérites', count: 124, trend: 'down' },
];

const monthlyActivity: { month: string; consultations: number; admissions: number }[] = [
  { month: 'Jan', consultations: 280, admissions: 45 },
  { month: 'Fév', consultations: 310, admissions: 52 },
  { month: 'Mar', consultations: 295, admissions: 48 },
  { month: 'Avr', consultations: 340, admissions: 61 },
  { month: 'Mai', consultations: 365, admissions: 58 },
  { month: 'Juin', consultations: 320, admissions: 50 },
  { month: 'Juil', consultations: 385, admissions: 67 },
  { month: 'Août', consultations: 410, admissions: 72 },
  { month: 'Sep', consultations: 398, admissions: 65 },
];

const trendIcons = {
  up: { icon: TrendingUp, color: 'text-red-500', label: '↑' },
  down: { icon: TrendingUp, color: 'text-green-500', label: '↓' },
  stable: { icon: Activity, color: 'text-navy-400', label: '→' },
};

const kpiColorMap: Record<string, { bg: string; text: string }> = {
  navy: { bg: 'bg-navy-50', text: 'text-navy-700' },
  medical: { bg: 'bg-medical-50', text: 'text-medical-700' },
  green: { bg: 'bg-green-50', text: 'text-green-700' },
  turquoise: { bg: 'bg-turquoise-50', text: 'text-turquoise-700' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700' },
};

export default function Reporting() {
  const maxRevenue = useMemo(() => Math.max(...revenueByService.map((r) => r.revenue)), []);
  const maxActivity = useMemo(
    () => Math.max(...monthlyActivity.map((m) => Math.max(m.consultations, m.admissions))),
    [],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-navy-900">Rapports & Indicateurs</h2>
        <p className="text-sm text-navy-500 mt-0.5">Tableau de bord de la Direction — synthèse de l'activité hospitalière</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          const colors = kpiColorMap[kpi.color];
          return (
            <Card key={kpi.id} className="p-4">
              <div className={`w-9 h-9 rounded-lg ${colors.bg} flex items-center justify-center mb-2`}>
                <Icon className={`w-5 h-5 ${colors.text}`} />
              </div>
              <p className="text-xs text-navy-500 font-medium mb-0.5">{kpi.label}</p>
              <p className="text-lg font-bold text-navy-900 leading-tight">{kpi.value}</p>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by service bar chart */}
        <Card>
          <CardHeader title="Revenus par service" subtitle="Chiffre d'affaires du mois en cours" />
          <div className="p-5 space-y-3">
            {revenueByService.map((item) => {
              const pct = Math.round((item.revenue / maxRevenue) * 100);
              return (
                <div key={item.service}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-navy-700 font-medium">{item.service}</span>
                    <span className="text-sm text-navy-900 font-semibold whitespace-nowrap ml-2">{formatFCFA(item.revenue)}</span>
                  </div>
                  <div className="w-full bg-navy-50 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-medical-500 to-turquoise-400 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Occupancy by service */}
        <Card>
          <CardHeader title="Taux d'occupation par service" subtitle="Lits occupés / total lits" />
          <div className="p-5 space-y-4">
            {occupancyByService.map((item) => (
              <div key={item.service}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-navy-700 font-medium">{item.service}</span>
                  <Badge color={item.rate >= 75 ? 'red' : item.rate >= 50 ? 'amber' : 'green'}>
                    {item.occupied}/{item.total} lits · {item.rate}%
                  </Badge>
                </div>
                <div className="w-full bg-navy-50 rounded-full h-3 overflow-hidden relative">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      item.rate >= 75
                        ? 'bg-red-400'
                        : item.rate >= 50
                          ? 'bg-amber-400'
                          : 'bg-green-400'
                    }`}
                    style={{ width: `${item.rate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 pathologies */}
        <Card>
          <CardHeader title="Top 5 pathologies" subtitle="Diagnostics les plus fréquents (année)" />
          <div className="p-5">
            <div className="space-y-3">
              {topPathologies.map((p, i) => {
                const trend = trendIcons[p.trend];
                const TrendIcon = trend.icon;
                const maxCount = topPathologies[0].count;
                const pct = Math.round((p.count / maxCount) * 100);
                return (
                  <div key={p.name} className="flex items-center gap-3">
                    <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-navy-100 text-navy-600'
                    }`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-navy-800 truncate">{p.name}</span>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          <span className="text-sm font-bold text-navy-900">{p.count}</span>
                          <TrendIcon className={`w-3.5 h-3.5 ${trend.color}`} />
                        </div>
                      </div>
                      <div className="w-full bg-navy-50 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-medical-400 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Monthly activity */}
        <Card>
          <CardHeader title="Activité mensuelle" subtitle="Consultations et admissions (9 derniers mois)" />
          <div className="p-5">
            {/* Legend */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-medical-500" />
                <span className="text-xs text-navy-600">Consultations</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-turquoise-400" />
                <span className="text-xs text-navy-600">Admissions</span>
              </div>
            </div>
            {/* Bar chart */}
            <div className="flex items-end justify-between gap-1.5 h-44">
              {monthlyActivity.map((m) => (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex items-end justify-center gap-1 h-full">
                    <div
                      className="flex-1 rounded-t bg-medical-500 hover:bg-medical-600 transition-colors relative group"
                      style={{ height: `${(m.consultations / maxActivity) * 100}%` }}
                    >
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-navy-700 font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {m.consultations}
                      </span>
                    </div>
                    <div
                      className="flex-1 rounded-t bg-turquoise-400 hover:bg-turquoise-500 transition-colors relative group"
                      style={{ height: `${(m.admissions / maxActivity) * 100}%` }}
                    >
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-navy-700 font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {m.admissions}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-navy-500 font-medium">{m.month}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Summary footer card */}
      <Card className="p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-medical-50 flex items-center justify-center flex-shrink-0">
            <Award className="w-5 h-5 text-medical-600" />
          </div>
          <div>
            <SectionTitle>Synthèse de la période</SectionTitle>
            <p className="text-sm text-navy-600 leading-relaxed">
              L'activité hospitalière reste soutenue avec une augmentation de{' '}
              <span className="font-semibold text-medical-700">+12%</span> des consultations par rapport au mois précédent.
              Le taux d'occupation moyen des lits atteint <span className="font-semibold text-turquoise-700">78%</span>,
              avec une forte demande en Chirurgie et Cardiologie. Le paludisme reste la pathologie la plus fréquente,
              suivi de l'hypertension artérielle. Les revenus du mois s'élèvent à{' '}
              <span className="font-semibold text-green-700">{formatFCFA(24_500_000)}</span>.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
