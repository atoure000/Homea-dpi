import type { BillingDoc } from '@/data/billingDocs';
import {
  DOC_TYPE_LABELS,
  docTotals,
  lineAssurance,
  lineNet,
  linePatient,
  numberToWords,
} from '@/data/billingDocs';
import { getPatient } from '@/data/patients';
import { formatFCFA } from '@/utils/format';

export function InvoicePrint({ doc }: { doc: BillingDoc }) {
  const patient = getPatient(doc.patientId);
  const t = docTotals(doc);
  const isCotation = doc.type === 'cotation';
  const isPrefacture = doc.type === 'prefacture';

  return (
    <div className="bg-white text-navy-900 text-[11px] leading-relaxed">
      {/* Header */}
      <div className="flex items-start justify-between border-b-2 border-navy-900 pb-3">
        <div className="flex items-center gap-3">
          <img src="/logo_Homea.png" alt="HOMEA" className="h-14 w-auto object-contain" />
          <div>
            <p className="text-base font-bold tracking-wide">GROUPE MÉDICAL HOMEA</p>
            <p className="text-navy-600">Cocody, Abidjan — Côte d'Ivoire</p>
            <p className="text-navy-600">Tél : +225 27 22 00 00 00 · contact@homea.ci</p>
            <p className="text-navy-600">CC : CI-ABJ-2026-000000-X · Régime : Réel normal</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold uppercase tracking-widest">{DOC_TYPE_LABELS[doc.type]}</p>
          <p className="font-mono font-bold text-medical-700">{doc.number}</p>
          <p className="text-navy-600">Date : {doc.date} · {doc.time}</p>
          {doc.sourceRef && <p className="text-navy-600">Réf. origine : {doc.sourceRef}</p>}
        </div>
      </div>

      {/* Simulation FNE */}
      <div className="mt-2 flex items-center justify-between">
        <p className="font-mono text-[10px] text-navy-500">
          N° FNE : <span className="font-bold">SIMULATION-{doc.number}</span>
        </p>
        <p className="text-[10px] font-bold uppercase tracking-widest text-red-600">PROTOTYPE — NON FISCAL</p>
      </div>

      {/* Patient & tiers payeur */}
      <div className="mt-3 grid grid-cols-2 gap-4 border border-navy-200 rounded p-3">
        <div>
          <p className="font-bold uppercase text-[10px] text-navy-500 mb-1">Patient</p>
          <p className="font-semibold">{patient ? `${patient.firstName} ${patient.lastName}` : doc.patientId}</p>
          <p className="text-navy-600">Dossier : {patient?.code ?? '—'}</p>
          <p className="text-navy-600">Tél : {patient?.phone ?? '—'}</p>
        </div>
        <div>
          <p className="font-bold uppercase text-[10px] text-navy-500 mb-1">Tiers payeur</p>
          <p className="font-semibold">{doc.insurance || 'Non assuré'}</p>
          <p className="text-navy-600">N° assuré : {doc.insuranceNumber || '—'}</p>
          <p className="text-navy-600">Taux de prise en charge : {doc.coverageRate}%</p>
        </div>
        <div className="col-span-2 grid grid-cols-3 gap-2 text-navy-600">
          <p>Épisode / séjour : <span className="text-navy-900">{doc.episode}</span></p>
          <p>Service : <span className="text-navy-900">{doc.service}</span></p>
          <p>Médecin : <span className="text-navy-900">{doc.doctor}</span></p>
          {doc.entryDate && <p>Entrée : {doc.entryDate}</p>}
          {doc.exitDate && <p>Sortie : {doc.exitDate}</p>}
          {doc.validityDays && <p>Validité : {doc.validityDays} jours</p>}
        </div>
      </div>

      {/* Detail lines */}
      <table className="w-full mt-3 border-collapse">
        <thead>
          <tr className="bg-navy-100 text-navy-700">
            <th className="border border-navy-200 px-2 py-1.5 text-left">Code</th>
            <th className="border border-navy-200 px-2 py-1.5 text-left">Désignation</th>
            <th className="border border-navy-200 px-2 py-1.5 text-right">Qté</th>
            <th className="border border-navy-200 px-2 py-1.5 text-right">P.U.</th>
            <th className="border border-navy-200 px-2 py-1.5 text-right">Remise</th>
            <th className="border border-navy-200 px-2 py-1.5 text-right">Montant</th>
            <th className="border border-navy-200 px-2 py-1.5 text-right">Part patient</th>
            <th className="border border-navy-200 px-2 py-1.5 text-right">Part assurance</th>
          </tr>
        </thead>
        <tbody>
          {doc.lines.map((l) => (
            <tr key={l.id}>
              <td className="border border-navy-200 px-2 py-1.5 font-mono">{l.code || '—'}</td>
              <td className="border border-navy-200 px-2 py-1.5">{l.description}</td>
              <td className="border border-navy-200 px-2 py-1.5 text-right">{l.quantity}</td>
              <td className="border border-navy-200 px-2 py-1.5 text-right">{formatFCFA(l.unitPrice)}</td>
              <td className="border border-navy-200 px-2 py-1.5 text-right">{l.discount ? formatFCFA(l.discount) : '—'}</td>
              <td className="border border-navy-200 px-2 py-1.5 text-right font-medium">{formatFCFA(lineNet(l))}</td>
              <td className="border border-navy-200 px-2 py-1.5 text-right">{formatFCFA(linePatient(l))}</td>
              <td className="border border-navy-200 px-2 py-1.5 text-right">{formatFCFA(lineAssurance(l))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="mt-3 flex justify-end">
        <div className="w-72 space-y-1">
          <Row label="Montant brut" value={formatFCFA(t.brut)} />
          <Row label="Remises" value={`-${formatFCFA(t.remises)}`} />
          <Row label="Montant net" value={formatFCFA(t.net)} strong />
          <Row label="Part assurance" value={formatFCFA(t.partAssurance)} />
          <Row label="Part patient" value={formatFCFA(t.partPatient)} />
          <Row label="Montant payé" value={formatFCFA(t.encaisse)} />
          <Row label="Reste à payer" value={formatFCFA(t.restePatient)} strong />
        </div>
      </div>

      <p className="mt-3 italic text-navy-700">
        Arrêté le présent document à la somme de : <span className="font-semibold">{numberToWords(Math.round(t.net))} francs CFA</span>.
      </p>

      {/* Footer */}
      <div className="mt-4 flex items-end justify-between border-t border-navy-200 pt-3">
        <div>
          <p className="text-navy-600">Caissier : {doc.payments[doc.payments.length - 1]?.cashier ?? '—'}</p>
          <p className="text-navy-600">Moyen de paiement : {doc.payments.map((p) => p.mode).join(', ') || '—'}</p>
          <p className="mt-1 text-[10px] text-navy-400">Cachet et signature</p>
        </div>
        <div className="w-24 h-24 border border-dashed border-navy-300 rounded flex items-center justify-center text-center text-[9px] text-navy-400">
          Emplacement QR code fictif
        </div>
      </div>

      {isCotation && (
        <p className="mt-3 rounded border border-amber-200 bg-amber-50 p-2 text-center font-medium text-amber-800">
          Cette cotation est une estimation et ne constitue pas une facture définitive.
        </p>
      )}
      {isPrefacture && (
        <p className="mt-3 rounded border border-amber-200 bg-amber-50 p-2 text-center font-bold text-amber-800">
          PRÉFACTURE — DOCUMENT PROVISOIRE NON VALIDÉ
        </p>
      )}
      <p className="mt-2 text-center text-[10px] font-bold uppercase tracking-widest text-red-600">
        PROTOTYPE — NON FISCAL
      </p>
    </div>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? 'font-bold border-t border-navy-300 pt-1' : 'text-navy-700'}`}>
      <span>{label}</span>
      <span className={strong ? '' : 'font-medium'}>{value}</span>
    </div>
  );
}
