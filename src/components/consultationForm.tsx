import { useState } from 'react';
import { ChevronDown, Plus, Pencil, Trash2, X } from 'lucide-react';
import type { FormFieldDef, RepeatTableDef } from '@/data/consultationForms';
import type { FormRows } from '@/types';
import { Button, Badge } from '@/components/ui';

export function FieldInput({
  field,
  value,
  onChange,
  disabled,
}: {
  field: FormFieldDef;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const baseClass =
    'w-full px-3 py-2 rounded-lg border text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-medical-400 focus:border-transparent';
  const disabledClass = disabled
    ? 'bg-navy-50 border-navy-200 cursor-not-allowed text-navy-600'
    : 'border-navy-200';

  if (field.type === 'textarea') {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        rows={3}
        disabled={disabled}
        className={`${baseClass} ${disabledClass} resize-none`}
      />
    );
  }

  if (field.type === 'select') {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`${baseClass} ${disabledClass} bg-white`}
      >
        <option value="">— Sélectionner —</option>
        {field.options?.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    );
  }

  if (field.type === 'radio') {
    return (
      <div className="flex flex-wrap gap-3 py-1">
        {field.options?.map((opt) => (
          <label key={opt.value} className="flex items-center gap-1.5 text-sm text-navy-700 cursor-pointer">
            <input
              type="radio"
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              disabled={disabled}
              className="accent-medical-600"
            />
            {opt.label}
          </label>
        ))}
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        disabled={disabled}
        className={`${baseClass} ${disabledClass} ${field.unit ? 'pr-12' : ''}`}
      />
      {field.unit && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-navy-400">{field.unit}</span>
      )}
    </div>
  );
}

export function SectionAccordion({
  title,
  subtitle,
  badge,
  children,
  defaultOpen = false,
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-navy-100 rounded-xl bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-navy-50 transition-colors"
      >
        <span className="flex items-center gap-2 min-w-0">
          <ChevronDown className={`w-4 h-4 text-navy-400 transition-transform ${open ? 'rotate-180' : ''}`} />
          <span className="min-w-0 text-left">
            <span className="block text-sm font-semibold text-navy-900">{title}</span>
            {subtitle && <span className="block text-xs text-navy-500 mt-0.5">{subtitle}</span>}
          </span>
        </span>
        {badge && <Badge color="blue">{badge}</Badge>}
      </button>
      {open && <div className="px-4 pb-4 pt-1 border-t border-navy-50">{children}</div>}
    </div>
  );
}

export function RepeatTable({
  def,
  rows,
  onChange,
  disabled,
}: {
  def: RepeatTableDef;
  rows: FormRows;
  onChange: (rows: FormRows) => void;
  disabled?: boolean;
}) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});

  function startAdd() {
    setDraft({});
    setEditingIndex(-1);
  }

  function startEdit(index: number) {
    setDraft({ ...rows[index] });
    setEditingIndex(index);
  }

  function save() {
    const next = [...rows];
    if (editingIndex === -1) {
      next.push({ ...draft });
    } else if (editingIndex !== null) {
      next[editingIndex] = { ...draft };
    }
    onChange(next);
    setEditingIndex(null);
    setDraft({});
  }

  function remove(index: number) {
    onChange(rows.filter((_, i) => i !== index));
  }

  const isEditing = editingIndex !== null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-navy-900">{def.title}</p>
        {!disabled && (
          <Button variant="secondary" size="sm" onClick={startAdd}>
            <Plus className="w-4 h-4 mr-1" /> Ajouter
          </Button>
        )}
      </div>

      {rows.length > 0 && (
        <div className="overflow-x-auto border border-navy-100 rounded-lg">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-navy-500 bg-navy-50">
                {def.columns.map((c) => (
                  <th key={c.key} className="py-2 px-2 font-medium whitespace-nowrap">{c.label}</th>
                ))}
                {!disabled && <th className="py-2 px-2 w-20"></th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-t border-navy-50 hover:bg-navy-50">
                  {def.columns.map((c) => (
                    <td key={c.key} className="py-2 px-2 text-navy-700 whitespace-nowrap max-w-[180px] truncate">
                      {row[c.key] || '—'}
                    </td>
                  ))}
                  {!disabled && (
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-1">
                        <button onClick={() => startEdit(i)} className="text-navy-400 hover:text-medical-600" title="Modifier">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => remove(i)} className="text-navy-400 hover:text-red-600" title="Supprimer">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isEditing && (
        <div className="border border-medical-200 bg-medical-50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-navy-900">
              {editingIndex === -1 ? 'Nouvel élément' : 'Modifier l’élément'}
            </p>
            <button onClick={() => setEditingIndex(null)} className="text-navy-400 hover:text-navy-700">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {def.columns.map((c) => (
              <div key={c.key}>
                <label className="block text-xs font-medium text-navy-700 mb-1">{c.label}</label>
                <input
                  value={draft[c.key] || ''}
                  onChange={(e) => setDraft((d) => ({ ...d, [c.key]: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-navy-200 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-medical-400"
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <Button variant="secondary" size="sm" onClick={() => setEditingIndex(null)}>Annuler</Button>
            <Button size="sm" onClick={save}>Enregistrer</Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((current / total) * 100);
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-navy-500">Progression du formulaire</span>
        <span className="text-xs font-semibold text-navy-700">{current}/{total} sections</span>
      </div>
      <div className="w-full bg-navy-100 rounded-full h-2 overflow-hidden">
        <div
          className="bg-gradient-to-r from-medical-500 to-medical-600 h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
