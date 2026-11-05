import { Calendar, Plus, FileText, FlaskConical, ClipboardList, ScanLine, Pill, Stethoscope, Receipt } from 'lucide-react';
import type { Admission, Consultation, LabOrder, Prescription, Invoice, Patient } from '@/types';
import type { ImagingReport, PatientDocument, PatientTabId } from '@/data/patientExtras';
import { formatDate, formatDateShort, formatFCFA } from '@/utils/format';

interface Props {
  patient: Patient;
  consultations: Consultation[];
  admissions: Admission[];
  prescriptions: Prescription[];
  labOrders: LabOrder[];
  invoices: Invoice[];
  documents: PatientDocument[];
  imaging: ImagingReport[];
  onTabChange: (tab: PatientTabId) => void;
}

const linkClass =
  'text-sky-700 underline decoration-sky-400 decoration-dotted underline-offset-2 hover:text-sky-900 hover:decoration-solid transition-colors';

function PanelHeader({
  title,
  onAdd,
  addLabel = 'Ajouter',
}: {
  title: string;
  onAdd?: () => void;
  addLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-sky-200 bg-sky-50 px-3 py-2">
      <h3 className="text-xs font-bold uppercase tracking-wide text-sky-900">{title}</h3>
      {onAdd && (
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-1 rounded border border-sky-300 bg-white px-2 py-1 text-[11px] font-semibold text-sky-800 transition-colors hover:bg-sky-100"
        >
          <Plus className="w-3 h-3" /> {addLabel}
        </button>
      )}
    </div>
  );
}

function EmptyPanel({ label }: { label: string }) {
  return <p className="px-3 py-4 text-xs italic text-gray-400">{label}</p>;
}

export function PatientOverviewMedidoc({
  patient,
  consultations,
  admissions,
  prescriptions,
  labOrders,
  invoices,
  documents,
  imaging,
  onTabChange,
}: Props) {
  const latestAdmission = admissions[0];
  const isPatientHospitalized = admissions.some((a) => a.status === 'admitted');

  const actes = [
    ...consultations.map((c) => ({
      id: c.id,
      date: c.date,
      label: c.chiefComplaint,
      author: c.doctor,
      detail: c.diagnosis,
    })),
    ...imaging.map((r) => ({
      id: r.id,
      date: r.date,
      label: `Imagerie — ${r.values.conclusion ?? 'Compte rendu'}`,
      author: r.radiologist,
      detail: '',
    })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  const diagnostics = [
    ...new Set([
      ...consultations.map((c) => c.diagnosis).filter(Boolean),
      ...patient.chronicConditions,
    ]),
  ].slice(0, 6);

  const documents_list = [
    ...documents.map((d) => ({ id: d.id, kind: d.kind, label: d.label, author: '—', date: d.date })),
    ...invoices.map((i) => ({ id: i.id, kind: 'Facture', label: i.number, author: `${i.items.length} ligne(s)`, date: i.date })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  const pendingActions: { id: string; label: string; tab: PatientTabId; icon: typeof FileText }[] = [
    ...(labOrders.some((l) => l.status !== 'completed')
      ? [{ id: 'pending-lab', label: `Analyses en cours — ${labOrders.filter((l) => l.status !== 'completed').length} demande(s)`, tab: 'lab' as PatientTabId, icon: FlaskConical }]
      : []),
    ...(patient.chronicConditions.length > 0
      ? [{ id: 'pending-follow', label: `Suivi des pathologies chroniques — ${patient.chronicConditions.join(', ')}`, tab: 'consultations' as PatientTabId, icon: Stethoscope }]
      : []),
    ...(isPatientHospitalized
      ? [{ id: 'pending-stay', label: 'Surveillance et réévaluation du séjour hospitalier', tab: 'hospitalisations' as PatientTabId, icon: ClipboardList }]
      : []),
    ...(prescriptions.some((p) => p.status === 'active')
      ? [{ id: 'pending-rx', label: 'Renouvellement des prescriptions en cours', tab: 'prescriptions' as PatientTabId, icon: Pill }]
      : []),
  ];

  return (
    <div className="space-y-4">
      {/* Bandeau identité */}
      <div className="rounded-t-md bg-sky-900 py-2 text-center">
        <h3 className="text-sm font-bold tracking-wide text-white">Vue générale du dossier patient</h3>
        <p className="text-[11px] text-sky-200">
          {patient.lastName.toUpperCase()} {patient.firstName} — {patient.code}
        </p>
      </div>

      {/* Tableau des venues */}
      <div className="overflow-x-auto border border-sky-200 bg-white">
        <table className="w-full">
          <thead>
            <tr className="bg-sky-100 text-left">
              <th className="px-3 py-2 text-xs font-bold text-sky-900">Date</th>
              <th className="px-3 py-2 text-xs font-bold text-sky-900">Unité / Service</th>
              <th className="px-3 py-2 text-xs font-bold text-sky-900">Lit</th>
              <th className="px-3 py-2 text-xs font-bold text-sky-900">Médecin</th>
              <th className="px-3 py-2 text-xs font-bold text-sky-900">Diagnostics / Motif</th>
            </tr>
          </thead>
          <tbody>
            {admissions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-5 text-center text-xs italic text-gray-400">
                  Aucune venue enregistrée pour ce patient
                </td>
              </tr>
            )}
            {admissions.map((a) => {
              const highlighted = latestAdmission?.id === a.id;
              return (
                <tr
                  key={a.id}
                  className={`border-t border-sky-100 transition-colors ${highlighted ? 'bg-amber-100' : 'hover:bg-sky-50'}`}
                >
                  <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-sky-600" />
                      {formatDateShort(a.date)} {a.time}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900">{a.department}</td>
                  <td className="px-3 py-2 text-sm text-gray-700">{a.bedNumber ?? '—'}</td>
                  <td className="px-3 py-2 text-sm text-gray-700">{a.assignedDoctor ?? '—'}</td>
                  <td className="px-3 py-2 text-sm">
                    <button className={`text-left ${linkClass}`} onClick={() => onTabChange('hospitalisations')}>
                      {a.reason}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Transfert / sortie */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {[
          { label: 'Transferer le séjour', detail: latestAdmission ? `Dernière venue : ${formatDateShort(latestAdmission.date)}` : 'Aucune venue active' },
          { label: 'Cloturer le séjour', detail: isPatientHospitalized ? 'Patient actuellement hospitalisé' : 'Aucun séjour en cours' },
          { label: 'Reprogrammer la venue', detail: 'Prochaine étape du parcours de soins' },
        ].map((item) => (
          <div key={item.label} className="rounded border border-sky-200 bg-sky-50 px-3 py-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-sky-800">{item.label}</p>
            <p className="mt-0.5 text-xs text-gray-600">{item.detail}</p>
          </div>
        ))}
      </div>

      {/* Actions à programmer */}
      <div className="rounded-md border border-sky-200">
        <PanelHeader title="Tâches et actions à programmer" addLabel="Ajouter" onAdd={() => onTabChange('forms')} />
        {pendingActions.length === 0 ? (
          <EmptyPanel label="Aucune tâche en attente pour ce patient" />
        ) : (
          <ul className="divide-y divide-sky-100">
            {pendingActions.map((action) => (
              <li key={action.id}>
                <button
                  onClick={() => onTabChange(action.tab)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-sky-50"
                >
                  <action.icon className="w-3.5 h-3.5 flex-shrink-0 text-sky-700" />
                  <span className={`text-sm ${linkClass}`}>{action.label}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Documents */}
      <div className="rounded-md border border-sky-200">
        <PanelHeader title="Documents du patient" addLabel="Ajouter" onAdd={() => onTabChange('documents')} />
        {documents_list.length === 0 ? (
          <EmptyPanel label="Aucun document rattaché au dossier" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-sky-100 text-left">
                  <th className="px-3 py-2 text-xs font-bold text-sky-900">Date</th>
                  <th className="px-3 py-2 text-xs font-bold text-sky-900">Type</th>
                  <th className="px-3 py-2 text-xs font-bold text-sky-900">Document</th>
                  <th className="px-3 py-2 text-xs font-bold text-sky-900">Détail</th>
                </tr>
              </thead>
              <tbody>
                {documents_list.map((doc) => (
                  <tr key={doc.id} className="border-t border-sky-100 hover:bg-sky-50">
                    <td className="px-3 py-2 text-sm text-gray-700 whitespace-nowrap">{formatDateShort(doc.date)}</td>
                    <td className="px-3 py-2 text-sm text-gray-900">{doc.kind}</td>
                    <td className="px-3 py-2 text-sm">
                      <button className={linkClass} onClick={() => onTabChange('documents')}>
                        {doc.label}
                      </button>
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-600">{doc.author}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Diagnostics et actes */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-sky-200">
          <PanelHeader title="Diagnostics du patient" addLabel="Ajouter" onAdd={() => onTabChange('consultations')} />
          {diagnostics.length === 0 ? (
            <EmptyPanel label="Aucun diagnostic enregistré" />
          ) : (
            <ul className="divide-y divide-sky-100">
              {diagnostics.map((d) => (
                <li key={d} className="px-3 py-2">
                  <button className={`text-sm ${linkClass}`} onClick={() => onTabChange('consultations')}>
                    {d}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-md border border-sky-200">
          <PanelHeader title="Actes et thérapies" addLabel="Ajouter" onAdd={() => onTabChange('prescriptions')} />
          {actes.length === 0 ? (
            <EmptyPanel label="Aucun acte ni thérapie enregistré" />
          ) : (
            <ul className="divide-y divide-sky-100">
              {actes.map((a) => (
                <li key={a.id} className="px-3 py-2">
                  <div className="flex items-start justify-between gap-3">
                    <button
                      className={`text-left text-sm ${linkClass}`}
                      onClick={() => onTabChange(a.id.startsWith('c') ? 'consultations' : 'imaging')}
                    >
                      {a.label}
                    </button>
                    <span className="flex-shrink-0 text-xs text-gray-400">{formatDateShort(a.date)}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">{a.author}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Résultats */}
      <div className="rounded-md border border-sky-200">
        <PanelHeader title="Résultats de biologie et imagerie" addLabel="Ajouter" onAdd={() => onTabChange('lab')} />
        {labOrders.length === 0 && imaging.length === 0 ? (
          <EmptyPanel label="Aucun résultat disponible" />
        ) : (
          <div className="grid grid-cols-1 gap-3 p-3 md:grid-cols-2">
            {labOrders.slice(0, 3).map((order) => (
              <div key={order.id} className="rounded border border-sky-100 bg-sky-50 p-2.5">
                <div className="flex items-center gap-2">
                  <FlaskConical className="w-3.5 h-3.5 text-sky-700" />
                  <span className="text-xs font-semibold text-gray-900">Biologie — {formatDateShort(order.date)}</span>
                </div>
                <button className={`mt-1 text-sm ${linkClass}`} onClick={() => onTabChange('lab')}>
                  {order.tests.length} analyse(s) demandée(s)
                </button>
                <p className="mt-0.5 text-xs text-gray-500">{order.doctor}</p>
              </div>
            ))}
            {imaging.slice(0, 3).map((report) => (
              <div key={report.id} className="rounded border border-sky-100 bg-sky-50 p-2.5">
                <div className="flex items-center gap-2">
                  <ScanLine className="w-3.5 h-3.5 text-sky-700" />
                  <span className="text-xs font-semibold text-gray-900">Imagerie — {formatDateShort(report.date)}</span>
                </div>
                <button className={`mt-1 text-left text-sm ${linkClass}`} onClick={() => onTabChange('imaging')}>
                  {report.values.conclusion ?? 'Compte rendu d\'imagerie'}
                </button>
                <p className="mt-0.5 text-xs text-gray-500">{report.radiologist}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Facturation */}
      <div className="rounded-md border border-sky-200">
        <PanelHeader title="Facturation" addLabel="Ajouter" onAdd={() => onTabChange('documents')} />
        {invoices.length === 0 ? (
          <EmptyPanel label="Aucune facture rattachée au dossier" />
        ) : (
          <ul className="divide-y divide-sky-100">
            {invoices.slice(0, 4).map((inv) => (
              <li key={inv.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="inline-flex items-center gap-2">
                  <Receipt className="w-3.5 h-3.5 text-sky-700" />
                  <button className={`text-sm ${linkClass}`} onClick={() => onTabChange('documents')}>
                    {inv.number}
                  </button>
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">{formatDate(inv.date)}</span>
                  <span className="text-sm font-semibold tabular-nums text-gray-900">{formatFCFA(inv.total)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Formulaires */}
      <div className="rounded-md border border-sky-200">
        <PanelHeader title="Formulaires et comptes rendus" addLabel="Ajouter" onAdd={() => onTabChange('forms')} />
        <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
          <button
            className="inline-flex items-center gap-1.5 rounded border border-sky-300 bg-sky-50 px-2.5 py-1.5 text-xs font-semibold text-sky-800 transition-colors hover:bg-sky-100"
            onClick={() => onTabChange('forms')}
          >
            <FileText className="w-3.5 h-3.5" /> Consulter les formulaires
          </button>
          <span className="text-xs text-gray-500">
            Avis d'hospitalisation, consentements, courriers et attestations de prise en charge
          </span>
        </div>
      </div>
    </div>
  );
}
