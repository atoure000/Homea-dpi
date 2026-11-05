import { useState, useMemo } from 'react';
import {
  UserPlus,
  Search,
  X,
  CheckCircle2,
  FolderOpen,
  Eraser,
  Eye,
  Receipt,
  Calendar,
  Pencil,
  Save,
  AlertTriangle,
  LogIn,
  FilePenLine,
  FileText,
} from 'lucide-react';
import type { ScreenId, Patient, IdType, Episode } from '@/types';
import { ID_TYPE_OPTIONS, idTypeLabel, isPermanentId, EPISODE_TYPE_LABELS, INSURANCE_OPTIONS, COVERAGE_RATE_OPTIONS } from '@/types';
import { getPatient } from '@/data/patients';
import { Button, Input, Select } from '@/components/ui';
import { NewBillingDocModal } from '@/components/NewBillingDocModal';
import { DocTypeChooser, TemplateSelectionModal } from '@/components/BillingTemplates';
import { AdmitPatientModal } from '@/components/AdmitPatientModal';
import { demoTemplates } from '@/data/billingTemplates';
import type { BillingTemplate } from '@/data/billingTemplates';
import { patients as allPatients } from '@/data/patients';
import { admissions } from '@/data/admissions';
import { demoDocs, DOC_TYPE_LABELS, type BillingDoc, type BillingDocType } from '@/data/billingDocs';
import { formatDateShort } from '@/utils/format';
import { getActiveEpisodesForPatient } from '@/data/episodes';

function sexeLabel(g: string): string {
  return g === 'M' ? 'M' : 'F';
}

// Ignore la casse et les accents : « Traore » retrouve « Traoré »
function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

const emptyCriteria = {
  nom: '',
  nomNaissance: '',
  prenom: '',
  dateNaissance: '',
  sexe: 'indifferent',
  telephone: '',
  numeroPiece: '',
};

export default function Reception({ onNavigate, onScheduleAppointment, onViewPatient, onOpenAdministrativeFile }: { onNavigate: (screen: ScreenId) => void; onScheduleAppointment?: (patientId: string, walkIn: boolean) => void; onViewPatient?: (patientId: string) => void; onOpenAdministrativeFile?: (patientId: string) => void }) {
  const [tab, setTab] = useState<'criteria' | 'dossier' | 'cmu' | 'venue'>('criteria');
  const [criteria, setCriteria] = useState(emptyCriteria);
  const [dossier, setDossier] = useState('');
  const [cmu, setCmu] = useState('');
  const [venue, setVenue] = useState('');
  const [searched, setSearched] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [showNewPatientModal, setShowNewPatientModal] = useState(false);
  const [billingPatient, setBillingPatient] = useState<Patient | null>(null);
  const [billingDocType, setBillingDocType] = useState<BillingDocType | null>(null);
  const [billingTemplate, setBillingTemplate] = useState<BillingTemplate | null>(null);
  const [showBillingForm, setShowBillingForm] = useState(false);
  const [showApptChoice, setShowApptChoice] = useState(false);
  const [billingDocs, setBillingDocs] = useState<BillingDoc[]>(demoDocs);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [patientEdits, setPatientEdits] = useState<Record<string, Partial<Patient>>>({});
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [showAdmitModal, setShowAdmitModal] = useState(false);
  const [admitTick, setAdmitTick] = useState(0);
  const [phoneError, setPhoneError] = useState(false);
  const [form, setForm] = useState({
    prenom: '',
    nom: '',
    nomNaissance: '',
    dateNaissance: '',
    sexe: '',
    phone: '',
    address: '',
    emergencyContact: '',
    emergencyPhone: '',
    insurance: '',
    insuranceNumber: '',
    coverageRate: '',
    cmuNumber: '',
    idType: '' as IdType | '',
    idNumber: '',
  });

  const homonymMatches = useMemo(() => {
    const n = normalize(form.nom);
    const p = normalize(form.prenom);
    if (!n || !p) return [];
    return allPatients.filter((patient) => {
      const lastName = normalize(patient.lastName);
      const firstName = normalize(patient.firstName);
      const birthName = patient.birthName ? normalize(patient.birthName) : '';
      const nameMatch = lastName === n || birthName === n;
      const firstNameMatch = firstName === p;
      return nameMatch && firstNameMatch;
    });
  }, [form.nom, form.prenom]);

  const results = useMemo(() => {
    if (!searched) return [];
    if (tab === 'criteria') {
      const q = normalize(criteria.nom);
      const nNaiss = normalize(criteria.nomNaissance);
      const pre = normalize(criteria.prenom);
      const dat = criteria.dateNaissance;
      const sx = criteria.sexe;
      const tel = normalize(criteria.telephone);
      const piece = normalize(criteria.numeroPiece);
      if (!q && !nNaiss && !pre && !dat && sx === 'indifferent' && !tel && !piece) return [];
      return allPatients.filter((p) => {
        const lastName = normalize(p.lastName);
        const firstName = normalize(p.firstName);
        const fullName = `${firstName} ${lastName}`;
        if (q && !lastName.includes(q) && !fullName.includes(q)) return false;
        if (nNaiss && !lastName.includes(nNaiss) && !fullName.includes(nNaiss)) return false;
        if (pre && !firstName.includes(pre) && !fullName.includes(pre)) return false;
        if (dat && p.birthDate !== dat) return false;
        if (sx !== 'indifferent' && p.gender !== sx) return false;
        if (tel && !normalize(p.phone).includes(tel)) return false;
        if (piece && !normalize(p.idNumber ?? '').includes(piece)) return false;
        return true;
      });
    }
    if (tab === 'dossier') {
      const d = normalize(dossier);
      if (!d) return [];
      return allPatients.filter((p) => normalize(p.code).includes(d));
    }
    if (tab === 'cmu') {
      const v = normalize(cmu);
      if (!v) return [];
      return allPatients.filter((p) => normalize(p.cmuNumber ?? '').includes(v));
    }
    const v = normalize(venue);
    if (!v) return [];
    const matchedIds = new Set(
      admissions
        .filter((a) => normalize(a.id).includes(v) || normalize(a.patientId).includes(v))
        .map((a) => a.patientId),
    );
    return allPatients.filter((p) => matchedIds.has(p.id));
  }, [searched, tab, criteria, dossier, cmu, venue]);

  const hasCriteria = useMemo(() => {
    if (tab === 'criteria') {
      return Boolean(
        criteria.nom.trim() ||
          criteria.nomNaissance.trim() ||
          criteria.prenom.trim() ||
          criteria.dateNaissance ||
          criteria.sexe !== 'indifferent' ||
          criteria.telephone.trim() ||
          criteria.numeroPiece.trim(),
      );
    }
    if (tab === 'dossier') return Boolean(dossier.trim());
    if (tab === 'cmu') return Boolean(cmu.trim());
    return Boolean(venue.trim());
  }, [tab, criteria, dossier, cmu, venue]);

  function runSearch() {
    if (!hasCriteria) {
      setSearched(false);
      setSelectedPatientId(null);
      return;
    }
    setSearched(true);
    setSelectedPatientId(null);
    requestAnimationFrame(() => {
      document.getElementById('reception-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function onSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') runSearch();
  }

  function clearAll() {
    setCriteria(emptyCriteria);
    setDossier('');
    setCmu('');
    setVenue('');
    setSearched(false);
    setSelectedPatientId(null);
  }

  const selectedRow = selectedPatientId
    ? (allPatients.find((patient) => patient.id === selectedPatientId) ?? null)
    : null;
  const selectedPatient = selectedRow
    ? { ...selectedRow, ...(patientEdits[selectedRow.id] ?? {}) }
    : null;

  function openPatientEditor() {
    if (!selectedPatient) return;
    setEditingPatient({ ...selectedPatient, chronicConditions: [...selectedPatient.chronicConditions] });
  }

  function savePatientEdits() {
    if (!editingPatient) return;
    setPatientEdits((current) => ({ ...current, [editingPatient.id]: editingPatient }));
    setEditingPatient(null);
    setSuccessMessage('La fiche patient a été mise à jour.');
    setTimeout(() => setSuccessMessage(null), 5000);
  }

  return (
    <div className="p-6 space-y-4 overflow-y-auto h-full">
      {/* Message de confirmation */}
      {successMessage && (
        <div className="fixed top-20 right-6 z-50 animate-slide-in">
          <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 clinical-shadow-lg">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-green-600" />
            <p className="text-sm font-medium text-green-800">{successMessage}</p>
            <button onClick={() => setSuccessMessage(null)} className="text-green-600 hover:text-green-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Bandeau titre */}
      <div className="rounded-t-md bg-sky-900 py-2.5 text-center">
        <h2 className="text-lg font-bold tracking-wide text-white">Recherche de patient</h2>
        <p className="text-[11px] text-sky-200">Accueil / Admission — identifiez le dossier avant toute admission</p>
      </div>

      {/* Onglets */}
      <div className="flex items-end gap-1 px-1">
        {([
          { id: 'criteria', label: 'par critères' },
          { id: 'dossier', label: 'IUP-N° de dossier' },
          { id: 'cmu', label: 'par numéro CMU' },
          { id: 'venue', label: 'par n° de venue' },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setSearched(false); setSelectedPatientId(null); }}
            className={`rounded-t-md px-4 py-1.5 text-xs font-semibold text-white transition-colors ${
              tab === t.id ? 'bg-sky-700' : 'bg-sky-500 hover:bg-sky-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Panneau critères */}
      <div className="rounded-b-md rounded-tr-md border border-sky-300 bg-sky-50 p-4 clinical-shadow">
        {tab === 'criteria' && (
          <>
            <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-red-700">Nom (*)</label>
                <input
                  type="text"
                  value={criteria.nom}
                  onChange={(e) => setCriteria((p) => ({ ...p, nom: e.target.value }))}
                  onKeyDown={onSearchKeyDown}
                  placeholder="Ex: BIDOCHON"
                  className="mt-1 w-full rounded-sm border border-gray-400 bg-white px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-800">Nom de naissance</label>
                <input
                  type="text"
                  value={criteria.nomNaissance}
                  onChange={(e) => setCriteria((p) => ({ ...p, nomNaissance: e.target.value }))}
                  className="mt-1 w-full rounded-sm border border-gray-400 bg-white px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-red-700">Prénom</label>
                <input
                  type="text"
                  value={criteria.prenom}
                  onChange={(e) => setCriteria((p) => ({ ...p, prenom: e.target.value }))}
                  onKeyDown={onSearchKeyDown}
                  placeholder="Ex: Raymonde"
                  className="mt-1 w-full rounded-sm border border-gray-400 bg-white px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-800">Date de naissance</label>
                <input
                  type="date"
                  value={criteria.dateNaissance}
                  onChange={(e) => setCriteria((p) => ({ ...p, dateNaissance: e.target.value }))}
                  className="mt-1 w-full max-w-[11rem] rounded-sm border border-gray-400 bg-white px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div className="md:col-start-2">
                <label className="block text-xs font-bold text-gray-800">Sexe</label>
                <select
                  value={criteria.sexe}
                  onChange={(e) => setCriteria((p) => ({ ...p, sexe: e.target.value }))}
                  className="mt-1 w-full max-w-[11rem] rounded-sm border border-gray-400 bg-white px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="indifferent">Indifférent</option>
                  <option value="M">Masculin</option>
                  <option value="F">Féminin</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-800">Téléphone</label>
                <input
                  type="tel"
                  value={criteria.telephone}
                  onChange={(e) => setCriteria((p) => ({ ...p, telephone: e.target.value }))}
                  onKeyDown={onSearchKeyDown}
                  placeholder="Ex: 07 07 07 07 07"
                  className="mt-1 w-full rounded-sm border border-gray-400 bg-white px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-800">Numéro de pièce</label>
                <input
                  type="text"
                  value={criteria.numeroPiece}
                  onChange={(e) => setCriteria((p) => ({ ...p, numeroPiece: e.target.value }))}
                  onKeyDown={onSearchKeyDown}
                  placeholder="Ex: PIECE-0001"
                  className="mt-1 w-full rounded-sm border border-gray-400 bg-white px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Button variant="secondary" onClick={clearAll}>
                  <Eraser className="w-3.5 h-3.5 mr-1" /> Effacer
                </Button>
                <span className="text-xs font-semibold text-sky-700">Au moins un de ces critères</span>
              </div>
              <Button variant="primary" onClick={runSearch} disabled={!hasCriteria}>
                <Search className="w-3.5 h-3.5 mr-1" /> Rechercher
              </Button>
            </div>
          </>
        )}

        {tab === 'dossier' && (
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-72">
              <label className="block text-xs font-bold text-red-700">N° de dossier (*)</label>
              <input
                type="text"
                value={dossier}
                onChange={(e) => setDossier(e.target.value)}
                onKeyDown={onSearchKeyDown}
                placeholder="Ex: HOMEA-2026-0001"
                className="mt-1 w-full rounded-sm border border-gray-400 bg-white px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <Button variant="primary" onClick={runSearch}>
              <Search className="w-3.5 h-3.5 mr-1" /> Rechercher
            </Button>
            <Button variant="secondary" onClick={clearAll}>
              <Eraser className="w-3.5 h-3.5 mr-1" /> Effacer
            </Button>
          </div>
        )}

        {tab === 'cmu' && (
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-48">
              <label className="block text-xs font-bold text-red-700">N° CMU (*)</label>
              <input
                type="text"
                value={cmu}
                onChange={(e) => setCmu(e.target.value)}
                onKeyDown={onSearchKeyDown}
                placeholder="Ex: CMU-4471"
                className="mt-1 w-full rounded-sm border border-gray-400 bg-white px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <Button variant="primary" onClick={runSearch}>
              <Search className="w-3.5 h-3.5 mr-1" /> Rechercher
            </Button>
            <Button variant="secondary" onClick={clearAll}>
              <Eraser className="w-3.5 h-3.5 mr-1" /> Effacer
            </Button>
          </div>
        )}

        {tab === 'venue' && (
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-56">
              <label className="block text-xs font-bold text-red-700">N° de venue (*)</label>
              <input
                type="text"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                onKeyDown={onSearchKeyDown}
                placeholder="Ex: adm-001"
                className="mt-1 w-full rounded-sm border border-gray-400 bg-white px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <Button variant="primary" onClick={runSearch}>
              <Search className="w-3.5 h-3.5 mr-1" /> Rechercher
            </Button>
            <Button variant="secondary" onClick={clearAll}>
              <Eraser className="w-3.5 h-3.5 mr-1" /> Effacer
            </Button>
          </div>
        )}
      </div>

      {/* Résultats */}
      <div id="reception-results" className="scroll-mt-4">
        <div className="rounded-t-md bg-sky-700 py-1.5 text-center text-sm font-semibold text-white">
          Résultat de la recherche : {searched ? results.length : 0} patient(s) trouvé(s)
        </div>
        <div className="overflow-x-auto border border-t-0 border-sky-300 bg-white">
          <table className="w-full">
            <thead>
              <tr className="bg-sky-600 text-left text-white">
                <th className="w-[19%] px-4 py-2 text-xs font-bold text-white">IUP-N° de dossier</th>
                <th className="w-[18%] px-4 py-2 text-xs font-bold text-white">Nom</th>
                <th className="w-[16%] px-4 py-2 text-xs font-bold text-white">Prénom</th>
                <th className="w-[15%] px-4 py-2 text-xs font-bold text-white">né(e) le</th>
                <th className="w-[12%] px-4 py-2 text-xs font-bold text-white">Sexe</th>
                <th className="w-[20%] px-4 py-2 text-xs font-bold text-white">Admission</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => {
                const rowKey = r.id;
                const isSelected = rowKey === selectedPatientId;
                const activeEps = getActiveEpisodesForPatient(r.id);
                const admitted = activeEps.length > 0;
                return (
                  <tr
                    key={rowKey}
                    onClick={() => setSelectedPatientId(isSelected ? null : rowKey)}
                    className={`cursor-pointer transition-colors ${isSelected ? 'bg-sky-200' : 'hover:bg-sky-50'}`}
                  >
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{r.code}</td>
                    <td className="px-4 py-2.5 text-sm font-semibold text-gray-900">{r.lastName.toUpperCase()}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-900">{r.firstName}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-900">{formatDateShort(r.birthDate)}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-900">{sexeLabel(r.gender)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${admitted ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {admitted ? `Patient Admis (${activeEps.length})` : 'Patient Non Admis'}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {(!searched || results.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-400">
                    {searched
                      ? 'Aucun dossier patient ne correspond aux critères saisis'
                      : 'Saisissez au moins un critère puis lancez la recherche'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
            <Button
              variant="secondary"
              disabled={!selectedRow}
              onClick={() => selectedRow && (onViewPatient ? onViewPatient(selectedRow.id) : onNavigate('patient-record'))}
            >
              <Eye className="w-3.5 h-3.5 mr-1" /> Dossier médical
            </Button>
            <Button
              variant="secondary"
              disabled={!selectedRow}
              onClick={openPatientEditor}
            >
              <FilePenLine className="w-3.5 h-3.5 mr-1" /> Modifier fiche patient
            </Button>
            <Button
              variant="primary"
              disabled={!selectedRow}
              onClick={() => selectedRow && setShowAdmitModal(true)}
            >
              <LogIn className="w-3.5 h-3.5 mr-1" /> Admettre patient
            </Button>
            <Button variant="ghost" disabled={!selectedRow} onClick={() => setSelectedPatientId(null)}>
              <X className="w-3.5 h-3.5 mr-1" /> Annuler la sélection
            </Button>
        </div>
      </div>

      {/* Aperçu du dossier sélectionné */}
      {selectedPatient && (
        <div
          className="rounded-md border border-sky-300 bg-white p-4 clinical-shadow animate-fade-in cursor-pointer"
          onDoubleClick={openPatientEditor}
          title="Double-cliquer pour modifier la fiche patient"
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50">
                <FolderOpen className="w-4 h-4 text-sky-700" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {selectedPatient.lastName.toUpperCase()} {selectedPatient.firstName}
                  <span className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 align-middle text-[11px] font-semibold ${selectedPatient.idType && isPermanentId(selectedPatient.idType) ? 'bg-green-100 text-green-800 ring-1 ring-green-300' : 'bg-red-100 text-red-800 ring-1 ring-red-300'}`}>
                    {selectedPatient.idType && isPermanentId(selectedPatient.idType) ? 'Identification permanente' : 'Identification provisoire'}
                  </span>
                </p>
                <p className="text-xs text-gray-500">Dossier sélectionné pour admission</p>
              </div>
            </div>
            <button onClick={() => setSelectedPatientId(null)} className="p-1 rounded text-gray-400 hover:bg-gray-50 hover:text-gray-700">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-6">
            <div>
              <p className="text-[11px] text-gray-400">IUP</p>
              <p className="font-mono text-gray-900">{selectedPatient.code}</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400">Naissance</p>
              <p className="text-gray-900">{formatDateShort(selectedPatient.birthDate)}</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400">Sexe</p>
              <p className="text-gray-900">{selectedPatient.gender === 'M' ? 'Masculin' : 'Féminin'}</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400">CMU</p>
              <p className="text-gray-900">{selectedPatient.cmuNumber ?? '—'}</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400">Assurance</p>
              <p className="text-gray-900">{selectedPatient.insurance}</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400">État d'admission</p>
              {(() => {
                const activeEps = getActiveEpisodesForPatient(selectedPatient.id);
                const admitted = activeEps.length > 0;
                return (
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${admitted ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {admitted ? `Patient Admis (${activeEps.length})` : 'Patient Non Admis'}
                  </span>
                );
              })()}
            </div>
          </div>
          {(() => {
            const activeEps = getActiveEpisodesForPatient(selectedPatient.id);
            if (activeEps.length === 0) return null;
            return (
              <div className="mt-3 border-t border-gray-100 pt-3">
                <p className="text-xs font-semibold text-gray-700 mb-1.5">Épisode(s) actif(s) :</p>
                <div className="flex flex-wrap gap-2">
                  {activeEps.map((ep) => (
                    <div key={ep.id} className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs">
                      <span className="font-mono font-semibold text-gray-900">{ep.episodeNumber}</span>
                      <span className="text-gray-600">{EPISODE_TYPE_LABELS[ep.type]}</span>
                      <span className="text-gray-400">· {ep.serviceId}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Barre d'actions */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          variant="secondary"
          disabled={!selectedRow}
          onClick={() => selectedRow && (onOpenAdministrativeFile ? onOpenAdministrativeFile(selectedRow.id) : onNavigate('patient-administrative'))}
        >
          <FileText className="w-3.5 h-3.5 mr-1" /> Fiche administrative patient
        </Button>
        <Button
          variant="secondary"
          disabled={!selectedRow}
          onClick={() => selectedRow && setBillingPatient(selectedRow)}
        >
          <Receipt className="w-3.5 h-3.5 mr-1" /> Facturer
        </Button>
        <Button variant="secondary" disabled={!selectedRow} onClick={() => selectedRow && setShowApptChoice(true)}>
          <FolderOpen className="w-3.5 h-3.5 mr-1" /> Programmer un rendez-vous
        </Button>
        <Button variant="primary" disabled={!searched} onClick={() => setShowNewPatientModal(true)}>
          <UserPlus className="w-3.5 h-3.5 mr-1" /> Nouveau patient
        </Button>
      </div>

      {/* Choix type de rendez-vous */}
      {showApptChoice && selectedRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-900/50 animate-fade-in" onClick={() => setShowApptChoice(false)}>
          <div className="bg-white rounded-xl clinical-shadow-lg border border-navy-100 w-full max-w-md p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-medical-50">
                  <Calendar className="w-5 h-5 text-medical-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-navy-900">Programmer un rendez-vous</h3>
                  <p className="text-xs text-navy-500">Pour {selectedRow.firstName} {selectedRow.lastName}</p>
                </div>
              </div>
              <button onClick={() => setShowApptChoice(false)} className="text-navy-400 hover:text-navy-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <button onClick={() => { setShowApptChoice(false); if (onScheduleAppointment) onScheduleAppointment(selectedRow.id, false); else onNavigate('appointment-scheduling'); }} className="flex items-center gap-3 p-4 rounded-lg border border-navy-200 hover:border-medical-400 hover:bg-medical-50 text-left transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-medical-100"><Calendar className="w-5 h-5 text-medical-600" /></div>
                <div>
                  <p className="text-sm font-semibold text-navy-900">Nouveau RDV</p>
                  <p className="text-xs text-navy-500">Planifier un rendez-vous médical</p>
                </div>
              </button>
              <button onClick={() => { setShowApptChoice(false); if (onScheduleAppointment) onScheduleAppointment(selectedRow.id, true); else onNavigate('appointment-scheduling'); }} className="flex items-center gap-3 p-4 rounded-lg border border-navy-200 hover:border-turquoise-400 hover:bg-turquoise-50 text-left transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-turquoise-100"><UserPlus className="w-5 h-5 text-turquoise-600" /></div>
                <div>
                  <p className="text-sm font-semibold text-navy-900">Tout venant</p>
                  <p className="text-xs text-navy-500">Patient sans rendez-vous</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 1: choose document type */}
      {billingPatient && !billingDocType && (
        <DocTypeChooser
          onClose={() => { setBillingPatient(null); setBillingDocType(null); setBillingTemplate(null); }}
          onChoose={(t) => setBillingDocType(t)}
        />
      )}

      {/* Step 2: choose template */}
      {billingPatient && billingDocType && !showBillingForm && (
        <TemplateSelectionModal
          docType={billingDocType}
          templates={demoTemplates}
          onClose={() => { setBillingPatient(null); setBillingDocType(null); setBillingTemplate(null); }}
          onUse={(tpl) => {
            setBillingTemplate(tpl);
            setShowBillingForm(true);
          }}
          onContinueWithout={() => {
            setBillingTemplate(null);
            setShowBillingForm(true);
          }}
          onCreateNew={() => {
            setBillingPatient(null);
            setBillingDocType(null);
            onNavigate('billing');
          }}
        />
      )}

      {/* Step 3: billing form with patient + template pre-filled */}
      {billingPatient && billingDocType && showBillingForm && (
        <NewBillingDocModal
          onClose={() => { setBillingPatient(null); setBillingDocType(null); setBillingTemplate(null); setShowBillingForm(false); }}
          onSave={(doc) => {
            setBillingDocs((prev) => [doc, ...prev]);
            setBillingPatient(null);
            setBillingDocType(null);
            setBillingTemplate(null);
            setShowBillingForm(false);
            setSuccessMessage(`${DOC_TYPE_LABELS[doc.type as BillingDocType]} ${doc.number} créée pour ${billingPatient.firstName} ${billingPatient.lastName}.`);
            setTimeout(() => setSuccessMessage(null), 5000);
          }}
          nextNumbers={{
            cotation: billingDocs.filter((d) => d.type === 'cotation').length + 1,
            prefacture: billingDocs.filter((d) => d.type === 'prefacture').length + 1,
            facture: billingDocs.filter((d) => d.type === 'facture').length + 1,
          }}
          initialPatientId={billingPatient.id}
          initialTemplate={billingTemplate}
          initialDocType={billingDocType}
        />
      )}

      {/* Modal nouveau patient */}
      {showNewPatientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={() => setShowNewPatientModal(false)} />
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-gray-200 bg-white clinical-shadow-lg animate-fade-in">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50">
                  <UserPlus className="w-5 h-5 text-sky-700" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Nouveau patient</h3>
                  <p className="text-xs text-gray-500">Enregistrement d'un nouveau dossier patient</p>
                </div>
              </div>
              <button
                onClick={() => setShowNewPatientModal(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-50 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5 p-6">
              <div>
                <h4 className="mb-3 text-sm font-semibold text-gray-900">Identité</h4>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Prénom" value={form.prenom} onChange={(v) => setForm((p) => ({ ...p, prenom: v }))} placeholder="Ex: Raymonde" required />
                  <Input label="Nom" value={form.nom} onChange={(v) => setForm((p) => ({ ...p, nom: v }))} placeholder="Ex: BIDOCHON" required />
                  <Input label="Nom de naissance" value={form.nomNaissance} onChange={(v) => setForm((p) => ({ ...p, nomNaissance: v }))} />
                  <Input label="Date de naissance" type="date" value={form.dateNaissance} onChange={(v) => setForm((p) => ({ ...p, dateNaissance: v }))} required />
                  <Select label="Sexe" value={form.sexe} onChange={(v) => setForm((p) => ({ ...p, sexe: v }))} options={[{ value: '', label: 'Sélectionner…' }, { value: 'M', label: 'Masculin' }, { value: 'F', label: 'Féminin' }]} required />
                  <Input label="Numéro CMU" value={form.cmuNumber} onChange={(v) => setForm((p) => ({ ...p, cmuNumber: v }))} />
                  <div>
                    <label className="block text-xs font-bold text-gray-800">Type de pièce utilisée</label>
                    <select
                      value={form.idType}
                      onChange={(e) => setForm((p) => ({ ...p, idType: e.target.value as IdType | '' }))}
                      className={`mt-1 w-full rounded-sm border bg-white px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 ${form.idType ? (isPermanentId(form.idType as IdType) ? 'border-green-500 focus:ring-green-500' : 'border-red-400 focus:ring-red-500') : 'border-gray-400 focus:ring-teal-500'}`}
                    >
                      <option value="">Sélectionner...</option>
                      {ID_TYPE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    {form.idType && (
                      <span className={`mt-1.5 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${isPermanentId(form.idType as IdType) ? 'bg-green-100 text-green-800 ring-1 ring-green-300' : 'bg-red-100 text-red-800 ring-1 ring-red-300'}`}>
                        {isPermanentId(form.idType as IdType) ? 'Identification permanente' : 'Identification provisoire'}
                      </span>
                    )}
                  </div>
                  <Input label="Numéro de pièce" value={form.idNumber} onChange={(v) => setForm((p) => ({ ...p, idNumber: v }))} placeholder="Ex: CI-123456789" />
                </div>
              </div>

              {homonymMatches.length > 0 && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-amber-800">
                        {homonymMatches.length === 1
                          ? 'Un patient homonyme existe déjà'
                          : `${homonymMatches.length} patients homonymes existent déjà`}
                      </p>
                      <p className="mt-0.5 text-xs text-amber-700">
                        Vérifiez ci-dessous avant de créer un nouveau dossier. Un doublon peut être une erreur.
                      </p>
                      <div className="mt-3 space-y-2">
                        {homonymMatches.map((match) => (
                          <div key={match.id} className="flex items-center justify-between rounded-md border border-amber-200 bg-white px-3 py-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-900">
                                {match.lastName.toUpperCase()} {match.firstName}
                              </p>
                              <p className="text-xs text-gray-500">
                                Dossier : {match.code} · Né(e) le {formatDateShort(match.birthDate)} · {match.gender === 'M' ? 'Masculin' : 'Féminin'}
                              </p>
                            </div>
                            <div className="flex flex-shrink-0 items-center gap-2">
                              <button
                                onClick={() => {
                                  setShowNewPatientModal(false);
                                  onViewPatient ? onViewPatient(match.id) : onNavigate('patient-record');
                                }}
                                className="rounded-md bg-sky-50 px-2.5 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-100"
                              >
                                <Eye className="mr-1 inline h-3 w-3" />Voir le dossier
                              </button>
                              <button
                                onClick={() => {
                                  setShowNewPatientModal(false);
                                  setSelectedPatientId(match.id);
                                  requestAnimationFrame(() => {
                                    document.getElementById('reception-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                  });
                                }}
                                className="rounded-md bg-gray-50 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
                              >
                                Sélectionner
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <h4 className="mb-3 text-sm font-semibold text-gray-900">Coordonnées</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Input label="Téléphone" value={form.phone} onChange={(v) => { setForm((p) => ({ ...p, phone: v })); if (v.trim()) setPhoneError(false); }} placeholder="+225 ..." required />
                    {phoneError && <p className="mt-1 text-xs font-medium text-red-600">Le téléphone est obligatoire.</p>}
                  </div>
                  <Input label="Adresse" value={form.address} onChange={(v) => setForm((p) => ({ ...p, address: v }))} placeholder="Quartier, ville" />
                </div>
              </div>

              <div>
                <h4 className="mb-3 text-sm font-semibold text-gray-900">Contact d'urgence</h4>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Nom du contact" value={form.emergencyContact} onChange={(v) => setForm((p) => ({ ...p, emergencyContact: v }))} />
                  <Input label="Téléphone d'urgence" value={form.emergencyPhone} onChange={(v) => setForm((p) => ({ ...p, emergencyPhone: v }))} placeholder="+225 ..." />
                </div>
              </div>

              <div>
                <h4 className="mb-3 text-sm font-semibold text-gray-900">Assurance</h4>
                <div className="grid grid-cols-2 gap-3">
                  <Select label="Organisme d'assurance" value={form.insurance} onChange={(v) => setForm((p) => ({ ...p, insurance: v }))} options={[{ value: '', label: 'Sélectionner…' }, ...INSURANCE_OPTIONS]} />
                  <Input label="Numéro d'assurance" value={form.insuranceNumber} onChange={(v) => setForm((p) => ({ ...p, insuranceNumber: v }))} />
                  <Select label="Taux de prise en charge" value={form.coverageRate} onChange={(v) => setForm((p) => ({ ...p, coverageRate: v }))} options={[{ value: '', label: 'Sélectionner…' }, ...COVERAGE_RATE_OPTIONS]} />
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-gray-200 bg-white px-6 py-4">
              <Button variant="secondary" onClick={() => setShowNewPatientModal(false)}>Annuler</Button>
              <Button
                variant="primary"
                onClick={() => {
                  if (!form.phone.trim()) {
                    setPhoneError(true);
                    return;
                  }
                  setShowNewPatientModal(false);
                  setSuccessMessage('Patient enregistré avec succès. Un dossier a été créé.');
                  setTimeout(() => setSuccessMessage(null), 5000);
                }}
              >
                <CheckCircle2 className="w-4 h-4 mr-1" /> Enregistrer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal édition fiche patient */}
      {editingPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-navy-900/50 backdrop-blur-sm" onClick={() => setEditingPatient(null)} />
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-navy-100 bg-white clinical-shadow-lg animate-fade-in">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-navy-100 bg-white px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50">
                  <Pencil className="w-5 h-5 text-sky-700" />
                </div>
                <div>
                  <h3 className="font-semibold text-navy-900">Modifier la fiche patient</h3>
                  <p className="text-xs text-navy-500">{editingPatient.lastName.toUpperCase()} {editingPatient.firstName} — {editingPatient.code}</p>
                </div>
              </div>
              <button onClick={() => setEditingPatient(null)} className="rounded-lg p-1 text-navy-400 hover:bg-navy-50 hover:text-navy-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5 p-6">
              <div>
                <h4 className="mb-3 text-sm font-semibold text-navy-900">Identité</h4>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Prénom" value={editingPatient.firstName} onChange={(v) => setEditingPatient((p) => p ? { ...p, firstName: v } : p)} required />
                  <Input label="Nom" value={editingPatient.lastName} onChange={(v) => setEditingPatient((p) => p ? { ...p, lastName: v } : p)} required />
                  <Input label="Nom de naissance" value={editingPatient.birthName ?? ''} onChange={(v) => setEditingPatient((p) => p ? { ...p, birthName: v } : p)} />
                  <Input label="Date de naissance" type="date" value={editingPatient.birthDate} onChange={(v) => setEditingPatient((p) => p ? { ...p, birthDate: v } : p)} required />
                  <Select label="Sexe" value={editingPatient.gender} onChange={(v) => setEditingPatient((p) => p ? { ...p, gender: v as 'M' | 'F' } : p)} options={[{ value: 'M', label: 'Masculin' }, { value: 'F', label: 'Féminin' }]} required />
                  <Input label="Numéro CMU" value={editingPatient.cmuNumber ?? ''} onChange={(v) => setEditingPatient((p) => p ? { ...p, cmuNumber: v } : p)} />
                  <div>
                    <label className="block text-xs font-bold text-navy-700">Type de pièce utilisée</label>
                    <select
                      value={editingPatient.idType ?? ''}
                      onChange={(e) => setEditingPatient((p) => p ? { ...p, idType: (e.target.value || undefined) as IdType | undefined } : p)}
                      className={`mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm text-navy-900 focus:outline-none focus:ring-2 ${editingPatient.idType ? (isPermanentId(editingPatient.idType) ? 'border-green-500 focus:ring-green-500' : 'border-red-400 focus:ring-red-500') : 'border-navy-200 focus:ring-medical-400'}`}
                    >
                      <option value="">Sélectionner...</option>
                      {ID_TYPE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    {editingPatient.idType && (
                      <span className={`mt-1.5 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${isPermanentId(editingPatient.idType) ? 'bg-green-100 text-green-800 ring-1 ring-green-300' : 'bg-red-100 text-red-800 ring-1 ring-red-300'}`}>
                        {isPermanentId(editingPatient.idType) ? 'Identification permanente' : 'Identification provisoire'}
                      </span>
                    )}
                  </div>
                  <Input label="Numéro de pièce" value={editingPatient.idNumber ?? ''} onChange={(v) => setEditingPatient((p) => p ? { ...p, idNumber: v } : p)} placeholder="Ex: CI-123456789" />
                </div>
              </div>

              <div>
                <h4 className="mb-3 text-sm font-semibold text-navy-900">Coordonnées</h4>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Téléphone" value={editingPatient.phone} onChange={(v) => setEditingPatient((p) => p ? { ...p, phone: v } : p)} placeholder="+225 ..." />
                  <Input label="Adresse" value={editingPatient.address} onChange={(v) => setEditingPatient((p) => p ? { ...p, address: v } : p)} placeholder="Quartier, ville" />
                </div>
              </div>

              <div>
                <h4 className="mb-3 text-sm font-semibold text-navy-900">Contact d'urgence</h4>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Nom du contact" value={editingPatient.emergencyContact} onChange={(v) => setEditingPatient((p) => p ? { ...p, emergencyContact: v } : p)} />
                  <Input label="Téléphone d'urgence" value={editingPatient.emergencyPhone} onChange={(v) => setEditingPatient((p) => p ? { ...p, emergencyPhone: v } : p)} placeholder="+225 ..." />
                </div>
              </div>

              <div>
                <h4 className="mb-3 text-sm font-semibold text-navy-900">Assurance</h4>
                <div className="grid grid-cols-2 gap-3">
                  <Select label="Organisme d'assurance" value={editingPatient.insurance} onChange={(v) => setEditingPatient((p) => p ? { ...p, insurance: v } : p)} options={[{ value: '', label: 'Sélectionner…' }, ...INSURANCE_OPTIONS]} />
                  <Input label="Numéro d'assurance" value={editingPatient.insuranceNumber} onChange={(v) => setEditingPatient((p) => p ? { ...p, insuranceNumber: v } : p)} />
                  <Select label="Taux de prise en charge" value={editingPatient.coverageRate != null ? String(editingPatient.coverageRate) : ''} onChange={(v) => setEditingPatient((p) => p ? { ...p, coverageRate: v === '' ? undefined : v } : p)} options={[{ value: '', label: 'Sélectionner…' }, ...COVERAGE_RATE_OPTIONS]} />
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-navy-100 bg-white px-6 py-4">
              <Button variant="secondary" onClick={() => setEditingPatient(null)}>Annuler</Button>
              <Button variant="primary" onClick={savePatientEdits}>
                <Save className="w-4 h-4 mr-1" /> Enregistrer les modifications
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'admission */}
      {showAdmitModal && selectedRow && (
        <AdmitPatientModal
          patient={selectedRow}
          onClose={() => setShowAdmitModal(false)}
          onAdmitted={() => setAdmitTick((t) => t + 1)}
          onOpenEpisode={(ep: Episode) => {
            setShowAdmitModal(false);
            onViewPatient ? onViewPatient(ep.patientId) : onNavigate('patient-record');
          }}
          onGoToBilling={(pid: string) => {
            setShowAdmitModal(false);
            setBillingPatient(allPatients.find((p) => p.id === pid) ?? null);
          }}
        />
      )}
    </div>
  );
}
