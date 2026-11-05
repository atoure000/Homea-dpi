import type { ReactNode } from 'react';
import type { FormDefinition, RepeatTableDef } from '@/data/consultationForms';
import type { FormValues, FormRows } from '@/types';
import { FieldInput, SectionAccordion, RepeatTable, ProgressBar } from '@/components/consultationForm';

export function ConsultationFormBody({
  definition,
  values,
  onChange,
  tables,
  tableSectionMap,
  rows,
  onRowsChange,
  disabled,
  showErrors,
  renderSectionExtra,
}: {
  definition: FormDefinition;
  values: FormValues;
  onChange: (key: string, value: string) => void;
  tables: RepeatTableDef[];
  tableSectionMap: Record<string, string>;
  rows: Record<string, FormRows>;
  onRowsChange: (key: string, next: FormRows) => void;
  disabled?: boolean;
  showErrors?: boolean;
  renderSectionExtra?: (sectionId: string) => ReactNode;
}) {
  const tablesBySection: Record<string, RepeatTableDef[]> = {};
  tables.forEach((t) => {
    const sectionId = tableSectionMap[t.key] || '';
    if (!tablesBySection[sectionId]) tablesBySection[sectionId] = [];
    tablesBySection[sectionId].push(t);
  });

  return (
    <div className="space-y-4">
      <ProgressBar current={definition.sections.length} total={definition.sections.length} />
      <div className="space-y-3">
        {definition.sections.map((section) => {
          const sectionTables = tablesBySection[section.id] || [];
          return (
            <SectionAccordion
              key={section.id}
              title={section.title}
              subtitle={section.subtitle}
              defaultOpen={definition.sections.indexOf(section) === 0}
            >
              <div className="space-y-4">
                {section.fields.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {section.fields.map((field) => {
                      const visible = !field.conditional || values[field.conditional.key] === field.conditional.value;
                      if (!visible) return null;
                      const missing = showErrors && field.required && !values[field.key]?.trim();
                      return (
                        <div key={field.key} className={field.span === 2 ? 'sm:col-span-2' : ''}>
                          <label className="block text-sm font-medium text-navy-700 mb-1">
                            {field.label} {field.required && <span className="text-red-500">*</span>}
                          </label>
                          <FieldInput
                            field={field}
                            value={values[field.key] || ''}
                            onChange={(v) => onChange(field.key, v)}
                            disabled={disabled}
                          />
                          {missing && (
                            <p className="text-xs text-red-600 mt-1">Champ obligatoire</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {renderSectionExtra?.(section.id)}

                {sectionTables.map((t) => (
                  <RepeatTable
                    key={t.key}
                    def={t}
                    rows={rows[t.key] || []}
                    onChange={(next) => onRowsChange(t.key, next)}
                    disabled={disabled}
                  />
                ))}
              </div>
            </SectionAccordion>
          );
        })}
      </div>
    </div>
  );
}
