import { useState, useCallback } from 'react';
import { Settings, ShieldCheck } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';
import Dashboard from '@/screens/Dashboard';
import Reception from '@/screens/Reception';
import PatientRecord from '@/screens/PatientRecord';
import { AdmittedPatientsScreen } from '@/screens/PatientRecord';
import PatientAdministrative from '@/screens/PatientAdministrative';
import Consultation from '@/screens/Consultation';
import Prescription from '@/screens/Prescription';
import LabOrders from '@/screens/LabOrders';
import LabResults from '@/screens/LabResults';
import NursingCare from '@/screens/NursingCare';
import BedManagement from '@/screens/BedManagement';
import PharmacyDispensing from '@/screens/PharmacyDispensing';
import PharmacyStock from '@/screens/PharmacyStock';
import LabStock from '@/screens/LabStock';
import Billing from '@/screens/Billing';
import InsuranceReceivables from '@/screens/InsuranceReceivables';
import InsuranceDossiers from '@/screens/InsuranceDossiers';
import Reporting from '@/screens/Reporting';
import AppointmentScheduling from '@/screens/AppointmentScheduling';
import MyCashRegister from '@/screens/MyCashRegister';
import CashSupervision from '@/screens/CashSupervision';
import Administration from '@/screens/Administration';
import { Login } from '@/screens/Login';
import type { LoginSession } from '@/screens/Login';
import type { ScreenId, ProfileId, DemoStep, Patient } from '@/types';
import type { BillingDoc } from '@/data/billingDocs';
import { demoDocs } from '@/data/billingDocs';
import { scenarioPrefacture, demoDossiers, findDossierByDocId, createDossierForDoc, type DossierAssurance } from '@/data/insuranceDossiers';
import { formatDateShort } from '@/utils/format';

function App() {
  const [currentProfile, setCurrentProfile] = useState<ProfileId>('direction');
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('dashboard');
  const [demoStepIndex, setDemoStepIndex] = useState<number>(-1);
  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [pendingAppt, setPendingAppt] = useState<{ patientId: string; walkIn: boolean } | null>(null);
  const [pendingPatientId, setPendingPatientId] = useState<string | null>(null);
  const [billingDocs, setBillingDocs] = useState<BillingDoc[]>([...demoDocs, scenarioPrefacture]);
  const [session, setSession] = useState<LoginSession | null>(null);
  const [pendingDossierId, setPendingDossierId] = useState<string | null>(null);
  const [pendingBillingDocId, setPendingBillingDocId] = useState<string | null>(null);
  const [dossiers, setDossiers] = useState<DossierAssurance[]>(() => JSON.parse(JSON.stringify(demoDossiers)) as DossierAssurance[]);

  const handleOpenDossier = useCallback((dossierId: string) => {
    setPendingDossierId(dossierId);
    setCurrentScreen('insurance-dossiers');
  }, []);

  const handleOpenDossierFromDoc = useCallback((docId: string) => {
    const doc = billingDocs.find((d) => d.id === docId);
    if (!doc) return;
    const existing = findDossierByDocId(billingDocs, dossiers, docId);
    const dossier = existing ?? createDossierForDoc(doc);
    if (!existing) setDossiers((prev) => [dossier, ...prev]);
    setPendingDossierId(dossier.id);
    setCurrentScreen('insurance-dossiers');
  }, [billingDocs, dossiers]);

  const handleOpenInvoiceFromBilling = useCallback((docId: string) => {
    setPendingBillingDocId(docId);
    setCurrentScreen('billing');
  }, []);

  const handleLogout = useCallback(() => {
    setSession(null);
    setPendingBillingDocId(null);
    setCurrentProfile('direction');
    setCurrentScreen('dashboard');
    setDemoStepIndex(-1);
    setSelectedPatient(null);
  }, []);

  const handleNavigate = useCallback((screen: ScreenId) => {
    setPendingDossierId(null);
    setPendingBillingDocId(null);
    setPendingPatientId(null);
    setCurrentScreen(screen);
  }, []);

  const handleScheduleAppointment = useCallback((patientId: string, walkIn: boolean) => {
    setPendingAppt({ patientId, walkIn });
    setCurrentScreen('appointment-scheduling');
  }, []);

  const handleViewPatient = useCallback((patientId: string) => {
    setPendingPatientId(patientId);
    setCurrentScreen('patient-record');
  }, []);

  const handleViewAdministrativeFile = useCallback((patientId: string) => {
    setPendingPatientId(patientId);
    setCurrentScreen('patient-administrative');
  }, []);

  const handleProfileChange = useCallback((profile: ProfileId) => {
    setCurrentProfile(profile);
    if (profile !== 'direction' && currentScreen === 'reporting') {
      setCurrentScreen('dashboard');
    }
  }, [currentScreen]);

  const handleReset = useCallback(() => {
    setCurrentProfile('direction');
    setCurrentScreen('dashboard');
    setDemoStepIndex(-1);
  }, []);

  const handleDemoStep = useCallback((step: DemoStep) => {
    setCurrentProfile(step.profile);
    setCurrentScreen(step.screen);
    setDemoStepIndex(step.id - 1);
  }, []);

  const renderScreen = () => {
    if (!session) return null;
    switch (currentScreen) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} />;
      case 'reception':
        return <Reception onNavigate={handleNavigate} onScheduleAppointment={handleScheduleAppointment} onViewPatient={handleViewPatient} onOpenAdministrativeFile={handleViewAdministrativeFile} />;
      case 'patient-record':
        return <PatientRecord onSelectedPatientChange={setSelectedPatient} onOpenAdministrativeFile={handleViewAdministrativeFile} initialPatientId={pendingPatientId || undefined} />;
      case 'patients-admitted':
        return <AdmittedPatientsScreen onSelectPatient={handleViewPatient} />;
      case 'patient-administrative':
        return <PatientAdministrative patientId={pendingPatientId || selectedPatient?.id} onBack={() => setCurrentScreen('patient-record')} />;
      case 'consultation':
        return <Consultation session={session} />;
      case 'prescription':
        return <Prescription />;
      case 'lab-orders':
        return <LabOrders />;
      case 'lab-results':
        return <LabResults />;
      case 'nursing-care':
        return <NursingCare />;
      case 'bed-management':
        return <BedManagement />;
      case 'pharmacy-dispensing':
        return <PharmacyDispensing />;
      case 'pharmacy-stock':
        return <PharmacyStock />;
      case 'lab-stock':
        return <LabStock />;
      case 'billing':
        return <Billing docs={billingDocs} setDocs={setBillingDocs} onOpenDossier={handleOpenDossierFromDoc} initialSelectedDocId={pendingBillingDocId} onConsumedDocId={() => setPendingBillingDocId(null)} />;
      case 'insurance-receivables':
        return <InsuranceReceivables docs={billingDocs} setDocs={setBillingDocs} onOpenDossier={handleOpenDossier} onOpenBilling={handleOpenInvoiceFromBilling} />;
      case 'insurance-dossiers':
        return <InsuranceDossiers docs={billingDocs} setDocs={setBillingDocs} dossiers={dossiers} setDossiers={setDossiers} initialDossierId={pendingDossierId} onOpenReceivables={() => setCurrentScreen('insurance-receivables')} onOpenBilling={() => setCurrentScreen('billing')} />;
      case 'reporting':
        return <Reporting />;
      case 'my-cash':
        return <MyCashRegister session={session} docs={billingDocs} onOpenDoc={handleOpenInvoiceFromBilling} />;
      case 'cash-supervision':
        return <CashSupervision session={session} />;
      case 'administration':
        return <Administration session={session} />;
      case 'appointment-scheduling':
        return <AppointmentScheduling availabilityOpen={availabilityOpen} onAvailabilityOpen={setAvailabilityOpen} pendingAppt={pendingAppt} onPendingApptConsumed={() => setPendingAppt(null)} />;
      default:
        return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  if (!session) {
    return <Login onLogin={setSession} />;
  }

  return (
    <div className="h-screen flex flex-col bg-navy-50">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          currentScreen={currentScreen}
          currentProfile={currentProfile}
          onNavigate={handleNavigate}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar
            currentProfile={currentProfile}
            currentScreen={currentScreen}
            onProfileChange={handleProfileChange}
            onReset={handleReset}
            onDemoStep={handleDemoStep}
            demoStepIndex={demoStepIndex}
            onLogout={handleLogout}
            titleInfo={currentScreen === 'patient-record' && selectedPatient && (
              <span className="flex items-center gap-2 text-sm text-navy-600 font-normal">
                <span className="text-navy-300">/</span>
                <span className="font-medium text-navy-800">{selectedPatient.firstName} {selectedPatient.lastName}</span>
                <span className="text-navy-300">·</span>
                <span className="font-mono text-xs text-navy-500">{selectedPatient.code}</span>
                <span className="text-navy-300">·</span>
                <span className="text-xs text-navy-500">Né(e) le {formatDateShort(selectedPatient.birthDate)}</span>
                <span className="text-navy-300">·</span>
                <span className="text-xs text-navy-500">{selectedPatient.gender === 'M' ? 'Homme' : 'Femme'}</span>
              </span>
            )}
            titleAction={currentScreen === 'appointment-scheduling' && (
              <button
                onClick={() => setAvailabilityOpen((v) => !v)}
                className={`flex items-center gap-1.5 ml-2 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${availabilityOpen ? 'bg-medical-600 text-white' : 'bg-navy-100 text-navy-600 hover:bg-navy-200'}`}
              >
                <Settings className="w-3.5 h-3.5" />
                Disponibilités
              </button>
            )}
          />
          <main className="flex-1 overflow-y-auto">
            {renderScreen()}
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;
