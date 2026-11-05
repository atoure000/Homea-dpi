import {
  LayoutDashboard,
  UserPlus,
  UserCheck,
  FileText,
  Stethoscope,
  Pill,
  FlaskConical,
  HeartPulse,
  BedDouble,
  Receipt,
  FileCheck2,
  Landmark,
  Banknote,
  ClipboardCheck,
  BarChart3,
  TestTube,
  ClipboardList,
  CalendarDays,
  Boxes,
  Microscope,
  ShieldCheck,
} from 'lucide-react';
import type { ScreenId, ProfileId } from '@/types';

interface NavItem {
  id: ScreenId;
  label: string;
  icon: typeof LayoutDashboard;
  profiles: ProfileId[];
  children?: { id: ScreenId; label: string; icon: typeof LayoutDashboard; profiles: ProfileId[] }[];
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard, profiles: ['direction', 'medecin', 'accueil', 'soins', 'laboratoire', 'pharmacie', 'facturation'] },
  { id: 'appointment-scheduling', label: 'Agenda & Rendez-vous', icon: CalendarDays, profiles: ['accueil', 'medecin', 'direction'] },
  { id: 'reception', label: 'Accueil / Admission', icon: UserPlus, profiles: ['accueil', 'direction'] },
  { id: 'my-cash', label: 'Ma caisse', icon: Banknote, profiles: ['facturation', 'direction'] },
  { id: 'cash-supervision', label: 'Suivi des caisses', icon: ClipboardCheck, profiles: ['facturation', 'direction'] },
  { id: 'billing', label: 'Facturation', icon: Receipt, profiles: ['facturation', 'direction'] },
  { id: 'insurance-dossiers', label: 'Dossiers assurance', icon: FileCheck2, profiles: ['facturation', 'direction'] },
  { id: 'insurance-receivables', label: '  Créances assurances', icon: Landmark, profiles: ['facturation', 'direction'] },
  { id: 'patient-record', label: 'Dossier patient', icon: FileText, profiles: ['direction', 'medecin', 'accueil', 'soins', 'laboratoire', 'pharmacie', 'facturation'], children: [
    { id: 'patients-admitted', label: 'Patients admis', icon: UserCheck, profiles: ['direction', 'medecin', 'accueil', 'soins'] },
  ] },
  { id: 'consultation', label: 'Consultation', icon: Stethoscope, profiles: ['medecin', 'direction'] },
  { id: 'prescription', label: 'Prescription', icon: Pill, profiles: ['medecin', 'pharmacie', 'direction'] },
  { id: 'lab-orders', label: 'Demandes d\'analyses', icon: TestTube, profiles: ['medecin', 'laboratoire', 'direction'] },
  { id: 'lab-results', label: 'Résultats laboratoire', icon: FlaskConical, profiles: ['laboratoire', 'medecin', 'direction'] },
  { id: 'nursing-care', label: 'Soins infirmiers', icon: HeartPulse, profiles: ['soins', 'direction'] },
  { id: 'bed-management', label: 'Gestion des lits', icon: BedDouble, profiles: ['soins', 'direction'] },
  { id: 'pharmacy-dispensing', label: 'Dispensation', icon: ClipboardList, profiles: ['pharmacie', 'direction'] },
  { id: 'pharmacy-stock', label: 'Stock Pharmacie', icon: Boxes, profiles: ['pharmacie', 'direction'] },
  { id: 'lab-stock', label: 'Stock Laboratoire', icon: Microscope, profiles: ['laboratoire', 'direction'] },
  { id: 'reporting', label: 'Rapports & Indicateurs', icon: BarChart3, profiles: ['direction'] },
  { id: 'administration', label: 'Administration', icon: ShieldCheck, profiles: ['direction'] },
];

interface SidebarProps {
  currentScreen: ScreenId;
  currentProfile: ProfileId;
  onNavigate: (screen: ScreenId) => void;
}

export function Sidebar({ currentScreen, currentProfile, onNavigate }: SidebarProps) {
  const visibleItems = navItems.filter((item) => item.profiles.includes(currentProfile));

  return (
    <aside className="w-60 bg-navy-900 text-navy-100 flex flex-col flex-shrink-0 h-full">
      <div className="px-4 py-5 border-b border-navy-700/50 bg-[#0874b5]">
        <div className="flex min-h-24 items-center justify-center rounded-xl bg-white/95 px-4 py-3">
          <img
            src="/logo_Homea.png"
            alt="HOMEA — Groupe Médical"
            className="h-24 w-full object-contain"
          />
        </div>
        <p className="mt-3 text-center text-[10px] font-medium tracking-wide text-[#eaf6fb]">
          Dossier Patient Informatisé
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto py-3">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentScreen === item.id
            || (item.children?.some((c) => c.id === currentScreen) ?? false);
          const visibleChildren = (item.children ?? []).filter((c) => c.profiles.includes(currentProfile));
          return (
            <div key={item.id}>
              <button
                onClick={() => onNavigate(item.id)}
                className={`${item.id === 'consultation' ? 'hidden ' : ''}w-full flex items-center gap-3 px-5 py-2.5 text-sm transition-colors duration-150 ${
                  isActive
                    ? 'bg-medical-600 text-white border-l-4 border-turquoise-400'
                    : 'text-navy-200 hover:bg-navy-800 hover:text-white border-l-4 border-transparent'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
              {visibleChildren.map((child) => {
                const ChildIcon = child.icon;
                const childActive = currentScreen === child.id;
                return (
                  <button
                    key={child.id}
                    onClick={() => onNavigate(child.id)}
                    className={`w-full flex items-center gap-3 pl-10 pr-5 py-2 text-xs transition-colors duration-150 ${
                      childActive
                        ? 'bg-medical-600/80 text-white border-l-4 border-turquoise-400'
                        : 'text-navy-300 hover:bg-navy-800 hover:text-white border-l-4 border-transparent'
                    }`}
                  >
                    <ChildIcon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{child.label}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="px-5 py-3 border-t border-navy-700/50 text-[10px] bg-[#0874b5]">
        <p className="text-[#eaf6fb]">DPI v1.0 — Nov. 2026<div>By CONVERGENCE TIC SARL</div></p>
      </div>
    </aside>
  );
}
