import { useState } from 'react';
import { Stethoscope, HeartPulse, Baby, X, Info } from 'lucide-react';
import type { FormValues, FormRows } from '@/types';
import { formDefinitions, repeatTables } from '@/data/consultationForms';
import { ConsultationFormBody } from '@/components/ConsultationFormBody';
import { Badge, Button } from '@/components/ui';

interface FormProps {
  values: FormValues;
  onChange: (key: string, value: string) => void;
  rows: Record<string, FormRows>;
  onRowsChange: (key: string, next: FormRows) => void;
  disabled?: boolean;
  showErrors?: boolean;
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-navy-100 sticky top-0 bg-white">
          <h3 className="font-semibold text-navy-900">{title}</h3>
          <button onClick={onClose} className="text-navy-400 hover:text-navy-700"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function computeBMI(weight: string, height: string): string {
  const w = parseFloat(weight);
  const h = parseFloat(height);
  if (!w || !h || h <= 0) return '';
  const bmi = w / ((h / 100) * (h / 100));
  return bmi.toFixed(1);
}

export function GeneralConsultationForm(props: FormProps) {
  const { values } = props;
  const bmi = computeBMI(values.weight, values.height);
  return (
    <ConsultationFormBody
      definition={formDefinitions.general}
      values={values}
      onChange={props.onChange}
      tables={[]}
      tableSectionMap={{}}
      rows={props.rows}
      onRowsChange={props.onRowsChange}
      disabled={props.disabled}
      showErrors={props.showErrors}
      renderSectionExtra={(sectionId) => {
        if (sectionId === 'general-vitals' && bmi) {
          return (
            <div className="flex items-center gap-2 bg-navy-50 border border-navy-100 rounded-lg px-3 py-2 text-sm">
              <Info className="w-4 h-4 text-medical-600" />
              <span className="text-navy-600">Indice de masse corporelle (informatif) :</span>
              <span className="font-semibold text-navy-900">{bmi} kg/m²</span>
            </div>
          );
        }
        return null;
      }}
    />
  );
}

export function GynecologicalConsultationForm(props: FormProps) {
  return (
    <ConsultationFormBody
      definition={formDefinitions.gynecological}
      values={props.values}
      onChange={props.onChange}
      tables={[]}
      tableSectionMap={{}}
      rows={props.rows}
      onRowsChange={props.onRowsChange}
      disabled={props.disabled}
      showErrors={props.showErrors}
    />
  );
}

const biologyStatusLegend = [
  { label: 'À faire', color: 'navy' as const },
  { label: 'Programmé', color: 'amber' as const },
  { label: 'Réalisé', color: 'blue' as const },
  { label: 'Résultat disponible', color: 'green' as const },
];

export function ObstetricalConsultationForm(props: FormProps) {
  const { values, rows } = props;
  const [detailIndex, setDetailIndex] = useState<number | null>(null);
  const prenatal = rows.prenatalConsultations || [];
  const prenatalDef = repeatTables.obstetrical.find((t) => t.key === 'prenatalConsultations');
  const detail = detailIndex !== null ? prenatal[detailIndex] : null;

  return (
    <>
      <ConsultationFormBody
        definition={formDefinitions.obstetrical}
        values={values}
        onChange={props.onChange}
        tables={repeatTables.obstetrical}
        tableSectionMap={{
          previousPregnancies: 'obs-obstetrical-history',
          prenatalConsultations: 'obs-prenatal',
          imagingExams: 'obs-imaging',
          hospitalizations: 'obs-hospitalizations',
          newborns: 'obs-delivery-newborn',
        }}
        rows={props.rows}
        onRowsChange={props.onRowsChange}
        disabled={props.disabled}
        showErrors={props.showErrors}
        renderSectionExtra={(sectionId) => {
          if (sectionId === 'obs-prenatal' && prenatal.length > 0) {
            return (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-navy-500 uppercase tracking-wide">Chronologie</p>
                <div className="space-y-2">
                  {prenatal.map((c, i) => (
                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg border border-navy-100 bg-navy-50">
                      <div className="w-8 h-8 rounded-full bg-medical-100 text-medical-700 flex items-center justify-center text-xs font-bold">
                        {c.number || i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-navy-900">
                          Consultation {c.number || i + 1} — {c.date || 'date inconnue'}
                        </p>
                        <p className="text-xs text-navy-500 truncate">
                          {c.practitioner || 'Praticien'} · {c.gestationalAge || 'AG inconnu'} · Poids {c.weight || '—'} kg · TA {c.bloodPressure || '—'}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setDetailIndex(i)}>
                        Voir le détail
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            );
          }
          if (sectionId === 'obs-biology') {
            return (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-navy-500">Statuts démonstratifs :</span>
                {biologyStatusLegend.map((s) => (
                  <Badge key={s.label} color={s.color}>{s.label}</Badge>
                ))}
              </div>
            );
          }
          return null;
        }}
      />

      {detail && prenatalDef && (
        <Modal title={`Consultation prénatale n°${detail.number || ''}`} onClose={() => setDetailIndex(null)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {prenatalDef.columns.map((c) => (
              <div key={c.key} className="border-b border-navy-50 pb-2">
                <p className="text-xs text-navy-400 font-medium">{c.label}</p>
                <p className="text-sm text-navy-900">{detail[c.key] || '—'}</p>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </>
  );
}

export function ConsultationFormIcon({ type }: { type: 'general' | 'gynecological' | 'obstetrical' }) {
  if (type === 'gynecological') return <HeartPulse className="w-5 h-5" />;
  if (type === 'obstetrical') return <Baby className="w-5 h-5" />;
  return <Stethoscope className="w-5 h-5" />;
}
