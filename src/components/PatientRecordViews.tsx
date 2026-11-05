import { useMemo, useState } from 'react';
import {
  Search,
  FileText,
  X,
  CheckCircle2,
  Printer,
  ScanLine,
  ClipboardList,
  ChevronRight,
  Stethoscope,
  BedDouble,
  Pill,
  FlaskConical,
  HeartPulse,
  Receipt,
  FolderOpen,
  CalendarDays,
  User,
  Activity,
} from 'lucide-react';
import type {
  Admission,
  Consultation,
  Invoice,
  LabOrder,
  NursingCareRecord,
  Patient,
  Prescription,
} from '@/types';
import { Badge, Button, Card, CardHeader, EmptyState, SectionTitle } from '@/components/ui';
import { PrintPreview } from '@/components/PrintPreview';
import { PatientFormPrint } from '@/components/PatientFormPrint';
import { ImagingReportPrint } from '@/components/ImagingReportPrint';
import { getPatient } from '@/data/patients';
import type {
  FormFieldDef,
  FormTemplate,
  ImagingModel,
  ImagingReport,
  PatientDocument,
  PatientForm,
  PatientTabId,
} from '@/data/patientExtras';
import {
  FORM_STATUS_META,
  IMAGING_STATUS_META,
  demoImagingReports,
  demoPatientForms,
  formTemplates,
  imagingModels,
} from '@/data/patientExtras';
import { formatDate, formatFCFA } from '@/utils/format';

/* ── Champ de saisie partagé ────────────────────────────────────────── */

function FieldInput({ field, value, onChange }: { field: FormFieldDef; value: string; onChange: (v: string) => void }) {
  const base = 'w-full px-3 py-2 rounded-lg border border-navy-200 text-sm text-navy-900 bg-white focus:outline-none focus:ring-2 focus:ring-medical-400 focus:border-transparent';
  return (
    <div className={field.span === 2 ? 'md:col-span-2' : ''}>
      <label className="block text-xs font-medium text-navy-600 mb-1">
        {field.label}
        {field.required && <span className="text-red-500 ml-0.5">*</span>}
        {field.unit && <span className="text-navy-400 font-normal ml-1">({field.unit})</span>}
      </label>
      {field.type === 'textarea' ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} placeholder={field.placeholder} className={`${base} resize-none`} />
      ) : field.type === 'select' ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} className={base}>
          <option value="">— Sélectionner —</option>
          {(field.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : field.type === 'checkbox' ? (
        <label className="flex items-center gap-2 text-sm text-navy-700">
          <input type="checkbox" checked={value === 'oui'} onChange={(e) => onChange(e.target.checked ? 'oui' : 'non')} className="rounded" />
          {value === 'oui' ? 'Oui' : 'Non'}
        </label>
      ) : (
        <input type={field.type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} className={base} />
      )}
    </div>
  );
}

function SectionsForm({ sections, values, onChange }: {
  sections: FormTemplate['sections'];
  values: Record<string, string>;
  onChange: (key: string, v: string) => void;
}) {
  return (
    <div className="space-y-5">
      {sections.map((section) => (
        <div key={section.id}>
          <div className="mb-2">
            <p className="text-sm font-semibold text-navy-900">{section.title}</p>
            {section.subtitle && <p className="text-xs text-navy-500 mt-0.5">{section.subtitle}</p>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {section.fields.map((f) => (
              <FieldInput key={f.key} field={f} value={values[f.key] ?? ''} onChange={(v) => onChange(f.key, v)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Onglet Formulaires ─────────────────────────────────────────────── */

export function FormTemplatesTab({ patientId }: { patientId: string }) {
  const [forms, setForms] = useState<PatientForm[]>(demoPatientForms);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [editing, setEditing] = useState<{ template: FormTemplate; form: PatientForm | null } | null>(null);
  const [printing, setPrinting] = useState<{ template: FormTemplate; values: Record<string, string>; meta: PatientForm } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const categories = [...new Set(formTemplates.map((t) => t.category))];
  const patientForms = forms.filter((f) => f.patientId === patientId);

  const templates = formTemplates.filter((t) => {
    const okCat = category === 'all' || t.category === category;
    const q = query.toLowerCase();
    const okQ = !q || t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
    return okCat && okQ;
  });

  function startForm(template: FormTemplate, existing: PatientForm | null) {
    setEditing({ template, form: existing });
  }

  function saveForm(templateId: string, values: Record<string, string>, status: PatientForm['status'], existingId: string | null) {
    const now = new Date();
    const stamp = `${now.toISOString().split('T')[0]} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    if (existingId) {
      setForms((prev) => prev.map((f) => (f.id === existingId ? { ...f, values, status } : f)));
    } else {
      setForms((prev) => [
        {
          id: `pf-${Date.now()}`,
          templateId,
          patientId,
          date: stamp.split(' ')[0],
          time: stamp.split(' ')[1],
          author: 'Utilisateur fictif — Dr. HOMEA',
          status,
          values,
        },
        ...prev,
      ]);
    }
    setEditing(null);
    setToast('Formulaire enregistré (données fictives)');
    setTimeout(() => setToast(null), 3500);
  }

  return (
    <div className="space-y-5">
      {toast && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm animate-fade-in">
          <CheckCircle2 className="w-4 h-4" /> {toast}
        </div>
      )}

      {/* Formulaires renseignés */}
      <div>
        <SectionTitle>Formulaires renseignés</SectionTitle>
        {patientForms.length === 0 ? (
          <EmptyState icon={ClipboardList} title="Aucun formulaire" subtitle="Sélectionnez un modèle ci-dessous pour commencer" />
        ) : (
          <div className="space-y-2.5">
            {patientForms.map((f) => {
              const template = formTemplates.find((t) => t.id === f.templateId);
              const meta = FORM_STATUS_META[f.status];
              return (
                <div
                  key={f.id}
                  className="w-full flex items-center gap-3 bg-navy-50 rounded-lg p-3 border border-navy-100 hover:bg-navy-100 transition-colors"
                >
                  <button
                    onClick={() => template && startForm(template, f)}
                    className="flex-1 flex items-center gap-3 text-left min-w-0"
                  >
                    <div className="w-9 h-9 rounded-lg bg-medical-100 flex items-center justify-center flex-shrink-0">
                      <ClipboardList className="w-4 h-4 text-medical-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-navy-900">{template?.name ?? 'Formulaire'}</p>
                        <Badge color={meta.color}>{meta.label}</Badge>
                      </div>
                      <p className="text-xs text-navy-500 mt-0.5">
                        {formatDate(f.date)} à {f.time} · {f.author}
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => template && setPrinting({ template, values: f.values, meta: f })}
                      title="Imprimer le formulaire"
                      className="p-2 rounded-lg text-navy-400 hover:text-white hover:bg-medical-600 transition-colors"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-navy-300" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modèles disponibles */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <SectionTitle>Modèles à renseigner</SectionTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-navy-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un formulaire..."
                className="pl-8 pr-3 py-1.5 rounded-lg border border-navy-200 text-xs text-navy-900 bg-white focus:outline-none focus:ring-2 focus:ring-medical-400 w-52"
              />
            </div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-navy-200 text-xs text-navy-900 bg-white focus:outline-none focus:ring-2 focus:ring-medical-400"
            >
              <option value="all">Toutes catégories</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {templates.length === 0 ? (
          <EmptyState icon={Search} title="Aucun modèle" subtitle="Aucun formulaire ne correspond à la recherche" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => startForm(t, null)}
                className="text-left bg-white rounded-xl border border-navy-200 p-4 hover:border-medical-400 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="w-9 h-9 rounded-lg bg-medical-50 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-medical-600" />
                  </div>
                  <Badge color="navy">{t.category}</Badge>
                </div>
                <p className="text-sm font-semibold text-navy-900">{t.name}</p>
                <p className="text-xs text-navy-500 mt-1 leading-relaxed">{t.description}</p>
                <p className="text-[11px] text-navy-400 font-mono mt-2">{t.code}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <FormFillerModal
          template={editing.template}
          initialValues={editing.form?.values ?? {}}
          existingId={editing.form?.id ?? null}
          onClose={() => setEditing(null)}
          onSave={saveForm}
          onPrint={(vals) => setPrinting({
            template: editing.template,
            values: vals,
            meta: {
              id: editing.form?.id ?? 'apercu',
              templateId: editing.template.id,
              patientId,
              date: new Date().toISOString().split('T')[0],
              time: `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`,
              author: editing.form?.author ?? 'Utilisateur fictif — Dr. HOMEA',
              status: editing.form?.status ?? 'brouillon',
              values: vals,
            },
          })}
        />
      )}

      {printing && (
        <PrintPreview
          title={`Impression — ${printing.template.name}`}
          onClose={() => setPrinting(null)}
        >
          <PatientFormPrint
            template={printing.template}
            values={printing.values}
            patient={getPatient(patientId)}
            meta={printing.meta}
          />
        </PrintPreview>
      )}
    </div>
  );
}

function FormFillerModal({ template, initialValues, existingId, onClose, onSave, onPrint }: {
  template: FormTemplate;
  initialValues: Record<string, string>;
  existingId: string | null;
  onClose: () => void;
  onSave: (templateId: string, values: Record<string, string>, status: PatientForm['status'], existingId: string | null) => void;
  onPrint: (values: Record<string, string>) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [error, setError] = useState<string | null>(null);

  const allFields = template.sections.flatMap((s) => s.fields);

  function change(key: string, v: string) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  function submit(status: PatientForm['status']) {
    if (status !== 'brouillon') {
      const missing = allFields.filter((f) => f.required && !(values[f.key] ?? '').trim());
      if (missing.length > 0) {
        setError(`Champs obligatoires manquants : ${missing.map((f) => f.label).join(', ')}`);
        return;
      }
    }
    setError(null);
    const finalStatus: PatientForm['status'] = values.signed === 'oui' && status !== 'brouillon' ? 'signe' : status;
    onSave(template.id, values, finalStatus, existingId);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/40 backdrop-blur-sm">
      <Card className="w-full max-w-4xl mx-4 max-h-[92vh] overflow-y-auto">
        <CardHeader
          title={template.name}
          subtitle="Formulaire fictif — données locales uniquement"
          action={<button onClick={onClose} className="text-navy-400 hover:text-navy-700"><X className="w-5 h-5" /></button>}
        />
        <div className="p-5 space-y-5">
          <SectionsForm sections={template.sections} values={values} onChange={change} />

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">{error}</div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-navy-100">
            <Button variant="secondary" onClick={onClose}>Annuler</Button>
            <Button variant="ghost" onClick={() => onPrint(values)}>
              <Printer className="w-4 h-4 mr-1.5" /> Imprimer
            </Button>
            <Button variant="ghost" onClick={() => submit('brouillon')}>Enregistrer le brouillon</Button>
            <Button variant="primary" onClick={() => submit('complete')}>
              <CheckCircle2 className="w-4 h-4 mr-1.5" /> {values.signed === 'oui' ? 'Signer le formulaire' : 'Valider le formulaire'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ── Onglet Imagerie ────────────────────────────────────────────────── */

export function ImagingTab({ patientId }: { patientId: string }) {
  const [reports, setReports] = useState<ImagingReport[]>(demoImagingReports);
  const [query, setQuery] = useState('');
  const [modality, setModality] = useState('all');
  const [editing, setEditing] = useState<{ model: ImagingModel; report: ImagingReport | null } | null>(null);
  const [printing, setPrinting] = useState<{ model: ImagingModel; values: Record<string, string>; meta: ImagingReport } | null>(null);

  const patientReports = reports.filter((r) => r.patientId === patientId);
  const modalities = [...new Set(imagingModels.map((m) => m.modality))];

  const models = imagingModels.filter((m) => {
    const okMod = modality === 'all' || m.modality === modality;
    const q = query.toLowerCase();
    const okQ = !q || m.name.toLowerCase().includes(q) || m.region.toLowerCase().includes(q) || m.code.toLowerCase().includes(q);
    return okMod && okQ;
  });

  function saveReport(modelId: string, values: Record<string, string>, status: ImagingReport['status'], existingId: string | null) {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    if (existingId) {
      setReports((prev) => prev.map((r) => (r.id === existingId ? { ...r, values, status } : r)));
    } else {
      setReports((prev) => [
        { id: `ir-${Date.now()}`, patientId, modelId, date, time, radiologist: 'Dr. Serges Kouamé (fictif)', status, values },
        ...prev,
      ]);
    }
    setEditing(null);
  }

  return (
    <div className="space-y-5">
      <div>
        <SectionTitle>Comptes rendus d'imagerie du patient</SectionTitle>
        {patientReports.length === 0 ? (
          <EmptyState icon={ScanLine} title="Aucun compte rendu" subtitle="Choisissez un modèle ci-dessous pour rédiger un compte rendu" />
        ) : (
          <div className="space-y-3">
            {patientReports.map((r) => {
              const model = imagingModels.find((m) => m.id === r.modelId);
              const meta = IMAGING_STATUS_META[r.status];
              const conclusion = r.values.conclusion ?? '';
              return (
                <div key={r.id} className="bg-navy-50 rounded-lg p-4 border border-navy-100">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-turquoise-100 flex items-center justify-center flex-shrink-0">
                        <ScanLine className="w-4 h-4 text-turquoise-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-navy-900">{model?.name ?? 'Compte rendu'}</p>
                        <p className="text-xs text-navy-500 mt-0.5">
                          {formatDate(r.date)} à {r.time} · {r.radiologist}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {model && <Badge color="navy">{model.modality}</Badge>}
                      <Badge color={meta.color}>{meta.label}</Badge>
                    </div>
                  </div>
                  {conclusion && (
                    <p className="text-xs text-navy-600 mt-2 pl-12">
                      <span className="font-medium text-navy-500">Conclusion : </span>
                      {conclusion}
                    </p>
                  )}
                  <div className="mt-2 pl-12 flex items-center gap-3">
                    <button
                      onClick={() => model && setEditing({ model, report: r })}
                      className="text-xs font-medium text-medical-600 hover:text-medical-700"
                    >
                      Ouvrir le compte rendu
                    </button>
                    <button
                      onClick={() => model && setPrinting({ model, values: r.values, meta: r })}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-navy-500 hover:text-medical-700"
                    >
                      <Printer className="w-3.5 h-3.5" /> Imprimer
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <SectionTitle>Modèles de compte rendu</SectionTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-navy-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un modèle..."
                className="pl-8 pr-3 py-1.5 rounded-lg border border-navy-200 text-xs text-navy-900 bg-white focus:outline-none focus:ring-2 focus:ring-medical-400 w-52"
              />
            </div>
            <select
              value={modality}
              onChange={(e) => setModality(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-navy-200 text-xs text-navy-900 bg-white focus:outline-none focus:ring-2 focus:ring-medical-400"
            >
              <option value="all">Toutes modalités</option>
              {modalities.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        {models.length === 0 ? (
          <EmptyState icon={Search} title="Aucun modèle" subtitle="Aucun modèle ne correspond à la recherche" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {models.map((m) => (
              <button
                key={m.id}
                onClick={() => setEditing({ model: m, report: null })}
                className="text-left bg-white rounded-xl border border-navy-200 p-4 hover:border-medical-400 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="w-9 h-9 rounded-lg bg-turquoise-50 flex items-center justify-center flex-shrink-0">
                    <ScanLine className="w-4 h-4 text-turquoise-600" />
                  </div>
                  <Badge color="navy">{m.modality}</Badge>
                </div>
                <p className="text-sm font-semibold text-navy-900">{m.name}</p>
                <p className="text-xs text-navy-500 mt-1">Région : {m.region}</p>
                <p className="text-[11px] text-navy-400 font-mono mt-2">{m.code}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <ImagingFillerModal
          model={editing.model}
          initialValues={editing.report?.values ?? {}}
          existingId={editing.report?.id ?? null}
          onClose={() => setEditing(null)}
          onSave={saveReport}
          onPrint={(vals) => {
            const now = new Date();
            setPrinting({
              model: editing.model,
              values: vals,
              meta: editing.report ?? {
                id: 'apercu',
                patientId,
                modelId: editing.model.id,
                date: now.toISOString().split('T')[0],
                time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
                radiologist: 'Dr. Serges Kouamé (fictif)',
                status: 'brouillon',
                values: vals,
              },
            });
          }}
        />
      )}

      {printing && (
        <PrintPreview
          title={`Impression — ${printing.model.name}`}
          onClose={() => setPrinting(null)}
        >
          <ImagingReportPrint
            model={printing.model}
            values={printing.values}
            patient={getPatient(patientId)}
            meta={printing.meta}
          />
        </PrintPreview>
      )}
    </div>
  );
}

function ImagingFillerModal({ model, initialValues, existingId, onClose, onSave, onPrint }: {
  model: ImagingModel;
  initialValues: Record<string, string>;
  existingId: string | null;
  onClose: () => void;
  onSave: (modelId: string, values: Record<string, string>, status: ImagingReport['status'], existingId: string | null) => void;
  onPrint: (values: Record<string, string>) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [error, setError] = useState<string | null>(null);
  const allFields = model.sections.flatMap((s) => s.fields);

  function change(key: string, v: string) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  function submit(status: ImagingReport['status']) {
    if (status === 'valide') {
      const missing = allFields.filter((f) => f.required && !(values[f.key] ?? '').trim());
      if (missing.length > 0) {
        setError(`Champs obligatoires manquants : ${missing.map((f) => f.label).join(', ')}`);
        return;
      }
    }
    setError(null);
    onSave(model.id, values, status, existingId);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/40 backdrop-blur-sm">
      <Card className="w-full max-w-4xl mx-4 max-h-[92vh] overflow-y-auto">
        <CardHeader
          title={model.name}
          subtitle="Compte rendu fictif — aucune validation médicale réelle"
          action={<button onClick={onClose} className="text-navy-400 hover:text-navy-700"><X className="w-5 h-5" /></button>}
        />
        <div className="p-5 space-y-5">
          <div className="flex flex-wrap gap-2">
            <Badge color="turquoise">{model.modality}</Badge>
            <Badge color="navy">{model.region}</Badge>
            <Badge color="navy">{model.code}</Badge>
          </div>

          <SectionsForm sections={model.sections} values={values} onChange={change} />

          {error && <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">{error}</div>}

          <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-navy-100">
            <Button variant="secondary" onClick={onClose}>Annuler</Button>
            <Button variant="ghost" onClick={() => onPrint(values)}>
              <Printer className="w-4 h-4 mr-1.5" /> Imprimer
            </Button>
            <Button variant="ghost" onClick={() => submit('brouillon')}>Enregistrer le brouillon</Button>
            <Button variant="primary" onClick={() => submit('valide')}>
              <CheckCircle2 className="w-4 h-4 mr-1.5" /> Valider le compte rendu
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ── Onglet Résumé ──────────────────────────────────────────────────── */

interface SummaryTabProps {
  patient: Patient;
  consultations: Consultation[];
  admissions: Admission[];
  prescriptions: Prescription[];
  labOrders: LabOrder[];
  nursingCare: NursingCareRecord[];
  invoices: Invoice[];
  imaging: ImagingReport[];
  forms: PatientForm[];
  documents: PatientDocument[];
  onTabChange: (tab: PatientTabId) => void;
}

export function SummaryTab({
  patient,
  consultations,
  admissions,
  prescriptions,
  labOrders,
  nursingCare,
  invoices,
  imaging,
  forms,
  documents,
  onTabChange,
}: SummaryTabProps) {
  const totalInvoiced = invoices.reduce((s, i) => s + i.total, 0);

  const cards: { icon: typeof Stethoscope; label: string; count: number; detail: string; tab: PatientTabId; bg: string; text: string }[] = [
    { icon: Stethoscope, label: 'Consultations', count: consultations.length, detail: consultations[0] ? `Dernière le ${formatDate(consultations[0].date)}` : 'Aucune consultation', tab: 'consultations', bg: 'bg-medical-50', text: 'text-medical-600' },
    { icon: BedDouble, label: 'Hospitalisations', count: admissions.length, detail: admissions[0] ? `${admissions[0].department} · ${formatDate(admissions[0].date)}` : 'Aucune hospitalisation', tab: 'hospitalisations', bg: 'bg-navy-100', text: 'text-navy-600' },
    { icon: Pill, label: 'Prescriptions', count: prescriptions.length, detail: prescriptions[0] ? `${prescriptions[0].medications.length} médicament(s)` : 'Aucune prescription', tab: 'prescriptions', bg: 'bg-turquoise-50', text: 'text-turquoise-600' },
    { icon: ScanLine, label: 'Imagerie', count: imaging.length, detail: imaging[0] ? `Dernier examen le ${formatDate(imaging[0].date)}` : 'Aucun compte rendu', tab: 'imaging', bg: 'bg-turquoise-50', text: 'text-turquoise-600' },
    { icon: FlaskConical, label: 'Résultats', count: labOrders.length, detail: labOrders[0] ? `${labOrders[0].tests.length} analyse(s)` : 'Aucun résultat', tab: 'lab', bg: 'bg-navy-100', text: 'text-navy-600' },
    { icon: HeartPulse, label: 'Soins', count: nursingCare.length, detail: nursingCare[0] ? nursingCare[0].careType : 'Aucun soin', tab: 'nursing', bg: 'bg-amber-50', text: 'text-amber-600' },
    { icon: FolderOpen, label: 'Documents', count: documents.length + invoices.length, detail: 'Pièces et factures rattachées', tab: 'documents', bg: 'bg-green-50', text: 'text-green-600' },
    { icon: ClipboardList, label: 'Formulaires', count: forms.length, detail: forms[0] ? `Dernier le ${formatDate(forms[0].date)}` : 'Aucun formulaire', tab: 'forms', bg: 'bg-medical-50', text: 'text-medical-600' },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-navy-100 bg-navy-50 p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center border border-navy-100">
            <User className="w-5 h-5 text-medical-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-navy-900">
              {patient.firstName} {patient.lastName}
            </p>
            <p className="text-xs text-navy-500 font-mono">{patient.code} · {patient.insurance}</p>
          </div>
        </div>
      </div>

      <div>
        <SectionTitle>Synthèse des éléments enregistrés</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {cards.map((c) => (
            <button
              key={c.label}
              onClick={() => onTabChange(c.tab)}
              className="text-left bg-white rounded-lg p-3.5 border border-navy-200 hover:border-medical-400 hover:shadow-sm transition-all"
            >
              <div className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center mb-2`}>
                <c.icon className={`w-4 h-4 ${c.text}`} />
              </div>
              <p className="text-2xl font-bold text-navy-900 tabular-nums">{c.count}</p>
              <p className="text-xs font-medium text-navy-700 mt-0.5">{c.label}</p>
              <p className="text-[11px] text-navy-400 mt-1 leading-snug">{c.detail}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <SectionTitle>Parcours de soins</SectionTitle>
          {consultations.length === 0 && admissions.length === 0 && nursingCare.length === 0 ? (
            <EmptyState icon={Activity} title="Aucun parcours enregistré" />
          ) : (
            <div className="space-y-2.5">
              {admissions.map((a) => (
                <button
                  key={a.id}
                  onClick={() => onTabChange('hospitalisations')}
                  className="w-full flex items-center gap-3 bg-navy-50 rounded-lg p-3 border border-navy-100 hover:bg-navy-100 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-navy-100 flex items-center justify-center flex-shrink-0">
                    <BedDouble className="w-4 h-4 text-navy-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-navy-900">
                      {a.department}{a.bedNumber ? ` · Lit ${a.bedNumber}` : ''}
                    </p>
                    <p className="text-xs text-navy-500 truncate">{a.reason}</p>
                  </div>
                  <span className="text-xs text-navy-400 flex-shrink-0">{formatDate(a.date)}</span>
                </button>
              ))}
              {consultations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onTabChange('consultations')}
                  className="w-full flex items-center gap-3 bg-navy-50 rounded-lg p-3 border border-navy-100 hover:bg-navy-100 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-medical-100 flex items-center justify-center flex-shrink-0">
                    <Stethoscope className="w-4 h-4 text-medical-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-navy-900">Consultation — {c.doctor}</p>
                    <p className="text-xs text-navy-500 truncate">{c.chiefComplaint}</p>
                  </div>
                  <span className="text-xs text-navy-400 flex-shrink-0">{formatDate(c.date)}</span>
                </button>
              ))}
              {nursingCare.map((n) => (
                <button
                  key={n.id}
                  onClick={() => onTabChange('nursing')}
                  className="w-full flex items-center gap-3 bg-navy-50 rounded-lg p-3 border border-navy-100 hover:bg-navy-100 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <HeartPulse className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-navy-900">{n.careType}</p>
                    <p className="text-xs text-navy-500 truncate">{n.description}</p>
                  </div>
                  <span className="text-xs text-navy-400 flex-shrink-0">{formatDate(n.date)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <SectionTitle>Examens et imagerie</SectionTitle>
          {labOrders.length === 0 && imaging.length === 0 ? (
            <EmptyState icon={FlaskConical} title="Aucun examen enregistré" />
          ) : (
            <div className="space-y-2.5">
              {imaging.map((r) => {
                const model = imagingModels.find((m) => m.id === r.modelId);
                return (
                  <button
                    key={r.id}
                    onClick={() => onTabChange('imaging')}
                    className="w-full flex items-center gap-3 bg-navy-50 rounded-lg p-3 border border-navy-100 hover:bg-navy-100 transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-turquoise-100 flex items-center justify-center flex-shrink-0">
                      <ScanLine className="w-4 h-4 text-turquoise-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-navy-900 truncate">{model?.name ?? 'Compte rendu d\'imagerie'}</p>
                      <p className="text-xs text-navy-500 truncate">{r.values.conclusion ?? 'Conclusion à compléter'}</p>
                    </div>
                    <span className="text-xs text-navy-400 flex-shrink-0">{formatDate(r.date)}</span>
                  </button>
                );
              })}
              {labOrders.map((l) => (
                <button
                  key={l.id}
                  onClick={() => onTabChange('lab')}
                  className="w-full flex items-center gap-3 bg-navy-50 rounded-lg p-3 border border-navy-100 hover:bg-navy-100 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-navy-100 flex items-center justify-center flex-shrink-0">
                    <FlaskConical className="w-4 h-4 text-navy-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-navy-900">Analyse — {l.doctor}</p>
                    <p className="text-xs text-navy-500 truncate">
                      {l.tests.map((t) => t.name).join(', ')}
                    </p>
                  </div>
                  <span className="text-xs text-navy-400 flex-shrink-0">{formatDate(l.date)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div>
        <SectionTitle>Traitements prescrits</SectionTitle>
        {prescriptions.length === 0 ? (
          <EmptyState icon={Pill} title="Aucune prescription enregistrée" />
        ) : (
          <div className="space-y-2.5">
            {prescriptions.map((rx) => (
              <button
                key={rx.id}
                onClick={() => onTabChange('prescriptions')}
                className="w-full text-left bg-navy-50 rounded-lg p-3 border border-navy-100 hover:bg-navy-100 transition-colors"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <p className="text-sm font-medium text-navy-900">{rx.doctor}</p>
                  <span className="text-xs text-navy-400">{formatDate(rx.date)}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {rx.medications.map((m, idx) => (
                    <Badge key={idx} color="navy">{m.name} — {m.dosage}</Badge>
                  ))}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <SectionTitle>Documents et pièces rattachées</SectionTitle>
        {documents.length === 0 && invoices.length === 0 ? (
          <EmptyState icon={FolderOpen} title="Aucun document rattaché" />
        ) : (
          <div className="space-y-2.5">
            {documents.map((d) => (
              <button
                key={d.id}
                onClick={() => onTabChange(d.tab)}
                className="w-full flex items-center gap-3 bg-navy-50 rounded-lg p-3 border border-navy-100 hover:bg-navy-100 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-navy-200 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-navy-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-navy-900">{d.label}</p>
                    <Badge color="navy">{d.kind}</Badge>
                  </div>
                  <p className="text-xs text-navy-500 mt-0.5">
                    {formatDate(d.date)} · {d.format}{d.reference ? ` · ${d.reference}` : ''}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-navy-300 flex-shrink-0" />
              </button>
            ))}
            {invoices.map((i) => (
              <button
                key={i.id}
                onClick={() => onTabChange('documents')}
                className="w-full flex items-center gap-3 bg-navy-50 rounded-lg p-3 border border-navy-100 hover:bg-navy-100 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                  <Receipt className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-navy-900 font-mono">{i.number}</p>
                    <Badge color="green">Facture</Badge>
                  </div>
                  <p className="text-xs text-navy-500 mt-0.5">{formatDate(i.date)} · {formatFCFA(i.total)}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-navy-300 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="flex items-center gap-2 text-xs text-navy-400">
        <CalendarDays className="w-3.5 h-3.5" /> Résumé généré localement à partir des données fictives du prototype.
      </p>
    </div>
  );
}
