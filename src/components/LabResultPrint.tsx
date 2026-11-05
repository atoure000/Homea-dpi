import type { LabOrder, Patient } from '@/types';
import { getPatient } from '@/data/patients';

const FLAG_LABELS: Record<string, { label: string; className: string }> = {
  normal: { label: 'Normal', className: 'text-navy-700' },
  low: { label: 'Bas', className: 'text-medical-700 font-semibold' },
  high: { label: 'Élevé', className: 'text-amber-700 font-semibold' },
  critical: { label: 'Critique', className: 'text-red-700 font-bold' },
};

const STATUS_LABELS: Record<string, string> = {
  ordered: 'Commandé',
  'in-progress': 'En cours',
  completed: 'Terminé',
};

export function LabResultPrint({ order, patient: patientProp }: { order: LabOrder; patient?: Patient }) {
  const patient = patientProp ?? getPatient(order.patientId);
  const completedTests = order.tests.filter((t) => t.result);
  const patientName = patient ? `${patient.firstName} ${patient.lastName}` : order.patientId;
  const printedAt = new Date();
  const printedDate = printedAt.toISOString().split('T')[0];
  const printedTime = `${String(printedAt.getHours()).padStart(2, '0')}:${String(printedAt.getMinutes()).padStart(2, '0')}`;

  return (
    <div className="bg-white text-navy-900 text-[11px] leading-relaxed">
      {/* En-tête établissement */}
      <div className="flex items-start justify-between gap-4 border-b-2 border-navy-900 pb-3">
        <div className="flex items-center gap-3">
          <img src="/logo_Homea.png" alt="HOMEA" className="h-16 w-auto object-contain" />
          <div>
            <p className="text-base font-bold tracking-wide">GROUPE MÉDICAL HOMEA</p>
            <p className="text-navy-600">Laboratoire d'analyses médicales</p>
            <p className="text-navy-600">Cocody, Abidjan — Côte d'Ivoire</p>
            <p className="text-navy-600">Tél : +225 27 22 00 00 00 · laboratoire@homea.ci</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold uppercase tracking-widest">Résultat d'analyses</p>
          <p className="font-mono font-bold text-medical-700">{order.id.toUpperCase()}</p>
          <p className="text-navy-600">Prélèvement : {order.date}</p>
          <p className="text-navy-600">Édité le {printedDate} à {printedTime}</p>
        </div>
      </div>

      {/* Identification patient et demande */}
      <div className="mt-3 grid grid-cols-3 gap-3 border border-navy-200 rounded p-3">
        <div>
          <p className="font-bold uppercase text-[10px] text-navy-500 mb-0.5">Patient</p>
          <p className="font-semibold">{patientName}</p>
          <p className="text-navy-600">Dossier : {patient?.code ?? '—'}</p>
        </div>
        <div>
          <p className="font-bold uppercase text-[10px] text-navy-500 mb-0.5">Naissance / Sexe</p>
          <p className="text-navy-800">{patient?.birthDate ?? '—'}</p>
          <p className="text-navy-600">{patient ? (patient.gender === 'M' ? 'Masculin' : 'Féminin') : '—'}</p>
        </div>
        <div>
          <p className="font-bold uppercase text-[10px] text-navy-500 mb-0.5">Prescripteur</p>
          <p className="font-semibold">{order.doctor}</p>
          <p className="text-navy-600">Priorité : {order.priority === 'urgent' ? 'Urgente' : 'Normale'}</p>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <p className="text-navy-600">
          Statut du dossier : <span className="font-semibold text-navy-900">{STATUS_LABELS[order.status] ?? order.status}</span>
          {' · '}
          {completedTests.length} / {order.tests.length} résultat(s) disponible(s)
        </p>
        <p className="text-[10px] font-bold uppercase tracking-widest text-red-600">PROTOTYPE — NON MÉDICAL</p>
      </div>

      {/* Résultats */}
      <table className="w-full mt-3 border-collapse">
        <thead>
          <tr className="bg-navy-100 text-navy-700">
            <th className="border border-navy-200 px-2 py-1.5 text-left">Code</th>
            <th className="border border-navy-200 px-2 py-1.5 text-left">Analyse</th>
            <th className="border border-navy-200 px-2 py-1.5 text-left">Catégorie</th>
            <th className="border border-navy-200 px-2 py-1.5 text-right">Résultat</th>
            <th className="border border-navy-200 px-2 py-1.5 text-left">Valeurs normales</th>
            <th className="border border-navy-200 px-2 py-1.5 text-left">Interprétation</th>
          </tr>
        </thead>
        <tbody>
          {order.tests.map((test) => {
            const flag = test.flag ? FLAG_LABELS[test.flag] : undefined;
            const interpretation = !test.result
              ? STATUS_LABELS[test.status] ?? test.status
              : flag && test.flag !== 'normal'
                ? flag.label
                : 'Conforme';
            return (
              <tr key={test.code}>
                <td className="border border-navy-200 px-2 py-1.5 font-mono">{test.code}</td>
                <td className="border border-navy-200 px-2 py-1.5">{test.name}</td>
                <td className="border border-navy-200 px-2 py-1.5 text-navy-600">{test.category}</td>
                <td className="border border-navy-200 px-2 py-1.5 text-right font-medium whitespace-nowrap">
                  {test.result ? `${test.result}${test.unit ? ` ${test.unit}` : ''}` : '—'}
                </td>
                <td className="border border-navy-200 px-2 py-1.5 text-navy-600">{test.normalRange ?? '—'}</td>
                <td className={`border border-navy-200 px-2 py-1.5 ${test.result && flag ? flag.className : 'text-navy-500'}`}>
                  {interpretation}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Signature */}
      <div className="mt-6 flex justify-between gap-6">
        <div className="flex-1">
          <p className="text-navy-600">Biologiste responsable : Dr. Mariam Bamba (fictif)</p>
          <div className="mt-8 border-t border-navy-300 pt-1 text-[9px] text-navy-400">Signature et cachet du biologiste</div>
        </div>
        <div className="flex-1">
          <p className="text-navy-600">Validé techniquement le : {printedDate} à {printedTime}</p>
          <div className="mt-8 border-t border-navy-300 pt-1 text-[9px] text-navy-400">Visa du technicien</div>
        </div>
      </div>

      <p className="mt-4 text-center text-[10px] font-bold uppercase tracking-widest text-red-600">
        PROTOTYPE — DOCUMENT FICTIF, SANS VALEUR MÉDICALE
      </p>
    </div>
  );
}
