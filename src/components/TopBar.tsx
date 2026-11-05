import { useState, useRef, useEffect } from 'react';
import type { ReactNode } from 'react';
import { ChevronDown, User, LogOut } from 'lucide-react';
import type { Profile, ProfileId, DemoStep } from '@/types';
import { profiles } from '@/data/profiles';

interface TopBarProps {
  currentProfile: ProfileId;
  currentScreen: string;
  onProfileChange: (profile: ProfileId) => void;
  onReset: () => void;
  onDemoStep: (step: DemoStep) => void;
  demoStepIndex: number;
  titleAction?: ReactNode;
  titleInfo?: ReactNode;
  onLogout: () => void;
}

export function TopBar({ currentProfile, currentScreen, onProfileChange, onReset, onDemoStep, demoStepIndex, titleAction, titleInfo, onLogout }: TopBarProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const activeProfile = profiles.find((p) => p.id === currentProfile)!;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const screenLabels: Record<string, string> = {
    dashboard: 'Tableau de bord',
    reception: 'Accueil / Admission',
    'appointment-scheduling': 'Agenda & Rendez-vous',
    'patient-record': 'Dossier patient',
    consultation: 'Consultation',
    prescription: 'Prescription',
    'lab-orders': 'Demandes d\'analyses',
    'lab-results': 'Résultats laboratoire',
    'nursing-care': 'Soins infirmiers',
    'bed-management': 'Gestion des lits',
    'pharmacy-dispensing': 'Dispensation pharmacie',
    'pharmacy-stock': 'Stock Pharmacie',
    'lab-stock': 'Stock Laboratoire',
    billing: 'Facturation',
    reporting: 'Rapports & Indicateurs',
    administration: 'Administration',
  };

  return (
    <header className="h-14 bg-white border-b border-navy-100 flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex items-center gap-3">
        <h2 className="text-navy-900 font-semibold text-base">{screenLabels[currentScreen] || 'Tableau de bord'}</h2>
        {titleInfo}
        {titleAction}
      </div>

      <div className="flex items-center gap-3">
        {/* Profile Selector */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-navy-50 hover:bg-navy-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-navy-700 flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-navy-900 leading-tight">{activeProfile.label}</p>
              <p className="text-[10px] text-navy-500 leading-tight">{activeProfile.description}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-navy-400" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl clinical-shadow-lg border border-navy-100 z-50 animate-fade-in">
              <div className="px-4 py-3 border-b border-navy-100">
                <h3 className="font-semibold text-navy-900 text-sm">Changer de profil</h3>
              </div>
              {profiles.map((p: Profile) => (
                <button
                  key={p.id}
                  onClick={() => {
                    onProfileChange(p.id);
                    setProfileOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-navy-50 transition-colors border-b border-navy-50 last:border-b-0 ${
                    p.id === currentProfile ? 'bg-medical-50' : ''
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    p.id === currentProfile ? 'bg-medical-500' : 'bg-navy-100'
                  }`}>
                    <User className={`w-4 h-4 ${p.id === currentProfile ? 'text-white' : 'text-navy-500'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-navy-900">{p.label}</p>
                    <p className="text-xs text-navy-500">{p.description}</p>
                  </div>
                </button>
              ))}
              <div className="border-t border-navy-100">
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-red-600 hover:bg-red-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                    <LogOut className="w-4 h-4" />
                  </div>
                  <p className="text-sm font-medium">Se déconnecter</p>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
