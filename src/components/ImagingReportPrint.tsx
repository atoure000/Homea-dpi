import type { Patient } from '@/types';
import type { ImagingModel, ImagingReport } from '@/data/patientExtras';
import { IMAGING_STATUS_META } from '@/data/patientExtras';

export function ImagingReportPrint({ model, values, patient, meta }: {
  model: ImagingModel;
  values: Record<string, string>;
  patient?: Patient;
  meta?: Pick<ImagingReport, 'date' | 'time' | 'radiologist' | 'status'>;
}) {
  const statusLabel = meta ? IMAGING_STATUS_META[meta.status].label : 'Brouillon';

  return (
    <div className="bg-white text-navy-900 text-[11px] leading-relaxed">
      {/* En-tête établissement */}
      <div className="flex items-start justify-between gap-4 border-b-2 border-navy-900 pb-3">
        <div className="flex items-center gap-3">
          <img src="/logo_Homea.png" alt="HOMEA" className="h-16 w-auto object-contain" />
          <div>
            <p className="text-base font-bold tracking-wide">GROUPE MÉDICAL HOMEA</p>
            <p className="text-navy-600">Service d'imagerie médicale</p>
            <p className="text-navy-600">Cocody, Abidjan — Côte d'Ivoire</p>
            <p className="text-navy-600">Tél : +225 27 22 00 00 00 · imagerie@homea.ci</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold uppercase tracking-widest">Compte rendu d'imagerie</p>
          <p className="font-mono font-bold text-medical-700">{model.code}</p>
          <p className="text-navy-600">{model.modality} — {model.region}</p>
          {meta && <p className="text-navy-600">Examen du {meta.date} à {meta.time}</p>}
        </div>
      </div>

      {/* Identification patient et examen */}
      <div className="mt-3 grid grid-cols-3 gap-3 border border-navy-200 rounded p-3">
        <div>
          <p className="font-bold uppercase text-[10px] text-navy-500 mb-0.5">Patient</p>
          <p className="font-semibold">{patient ? `${patient.firstName} ${patient.lastName}` : '—'}</p>
          <p className="text-navy-600">Dossier : {patient?.code ?? '—'}</p>
        </div>
        <div>
          <p className="font-bold uppercase text-[10px] text-navy-500 mb-0.5">Naissance / Sexe</p>
          <p className="text-navy-800">{patient?.birthDate ?? '—'}</p>
          <p className="text-navy-600">{patient ? (patient.gender === 'M' ? 'Masculin' : 'Féminin') : '—'}</p>
        </div>
        <div>
          <p className="font-bold uppercase text-[10px] text-navy-500 mb-0.5">Examen</p>
          <p className="font-semibold">{model.name}</p>
          <p className="text-navy-600">Radiologue : {meta?.radiologist ?? '—'}</p>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <p className="text-navy-600">Statut du compte rendu : <span className="font-semibold text-navy-900">{statusLabel}</span></p>
        <p className="text-[10px] font-bold uppercase tracking-widest text-red-600">PROTOTYPE — NON MÉDICAL</p>
      </div>

      {/* Sections */}
      <div className="mt-4 space-y-4">
        {model.sections.map((section, sIdx) => (
          <div key={section.id} className="break-inside-avoid">
            <p className="bg-navy-100 px-2 py-1 font-bold uppercase text-[10px] tracking-wide text-navy-700">
              {sIdx + 1}. {section.title}
            </p>
            {section.subtitle && <p className="text-navy-500 mt-1">{section.subtitle}</p>}
            <table className="w-full mt-1.5 border-collapse">
              <tbody>
                {section.fields.map((f) => {
                  const raw = values[f.key] ?? '';
                  const display = f.type === 'checkbox'
                    ? (raw === 'oui' ? 'Oui' : 'Non')
                    : raw
                      ? `${raw}${f.unit ? ` ${f.unit}` : ''}`
                      : '—';
                  return (
                    <tr key={f.key} className="align-top">
                      <td className="border border-navy-200 px-2 py-1.5 w-[38%] font-medium text-navy-700">
                        {f.label}{f.unit ? ` (${f.unit})` : ''}
                      </td>
                      <td className="border border-navy-200 px-2 py-1.5 whitespace-pre-wrap">{display}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* Signature */}
      <div className="mt-6 flex justify-between gap-6">
        <div className="flex-1">
          <p className="text-navy-600">Radiologue : {meta?.radiologist ?? '—'}</p>
          <div className="mt-8 border-t border-navy-300 pt-1 text-[9px] text-navy-400">Signature et cachet du radiologue</div>
        </div>
        <div className="w-24 h-24 border border-dashed border-navy-300 rounded flex items-center justify-center text-center text-[9px] text-navy-400">
          Emplacement QR code fictif
        </div>
      </div>

      <p className="mt-4 text-center text-[10px] font-bold uppercase tracking-widest text-red-600">
        PROTOTYPE — DOCUMENT FICTIF, SANS VALEUR MÉDICALE
      </p>
    </div>
  );
}
