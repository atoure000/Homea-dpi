import { useMemo, useState } from 'react';
import {
  X,
  Search,
  Plus,
  Pencil,
  Copy,
  Ban,
  Trash2,
  FileText,
  CheckCircle2,
  Eye,
  Layers,
  AlertTriangle,
  ArrowLeft,
  FilePlus2,
  Receipt,
} from 'lucide-react';
import { Card, CardHeader, Badge, Button, EmptyState, SectionTitle } from '@/components/ui';
import type { BillingTemplate, TemplateDocType, TemplateLine } from '@/data/billingTemplates';
import {
  TEMPLATE_SERVICES,
  TEMPLATE_DOC_TYPES,
  generateTemplateCode,
  templateEstimatedAmount,
} from '@/data/billingTemplates';
import type { BillingDocType, BillingLine, CoverageLineStatus } from '@/data/billingDocs';
import { CATEGORIES, COVERAGE_LABELS, catalogue, today } from '@/data/billingDocs';
import { formatFCFA, formatDate } from '@/utils/format';

/* ════════════════════════════════════════════════════════════════════
   BillingTemplatesModal — full-screen modal with list + form + preview
   ════════════════════════════════════════════════════════════════════ */

interface BillingTemplatesModalProps {
  onClose: () => void;
  templates: BillingTemplate[];
  setTemplates: (updater: (prev: BillingTemplate[]) => BillingTemplate[]) => void;
  onUseTemplate?: (tpl: BillingTemplate) => void;
}

export function BillingTemplatesModal({ onClose, templates, setTemplates, onUseTemplate }: BillingTemplatesModalProps) {
  const [view, setView] = useState<'list' | 'form' | 'preview'>('list');
  const [editingTpl, setEditingTpl] = useState<BillingTemplate | null>(null);
  const [previewTpl, setPreviewTpl] = useState<BillingTemplate | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | TemplateDocType>('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [deleteTarget, setDeleteTarget] = useState<BillingTemplate | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function notify(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  const categories = [...new Set(templates.map((t) => t.category))].sort();

  const filtered = useMemo(() => {
    let list = templates;
    if (filterType !== 'all') list = list.filter((t) => t.docType === filterType || t.docType === 'all');
    if (filterCategory !== 'all') list = list.filter((t) => t.category === filterCategory);
    if (filterStatus !== 'all') list = list.filter((t) => (filterStatus === 'active' ? t.active : !t.active));
    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.code.toLowerCase().includes(q) ||
          t.service.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          t.lines.some((l) => l.description.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [templates, search, filterType, filterCategory, filterStatus]);

  function toggleActive(id: string) {
    setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, active: !t.active, updatedAt: today } : t)));
    notify('Statut du modèle mis à jour');
  }

  function duplicate(id: string) {
    const src = templates.find((t) => t.id === id);
    if (!src) return;
    const copy: BillingTemplate = {
      ...src,
      id: `tpl${Date.now()}`,
      code: `${src.code}-B`,
      name: `${src.name} (copie)`,
      createdAt: today,
      updatedAt: today,
    };
    setTemplates((prev) => [...prev, copy]);
    notify('Modèle dupliqué');
  }

  function deleteTpl(id: string) {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    setDeleteTarget(null);
    notify('Modèle supprimé (données de session)');
  }

  function saveTemplate(tpl: BillingTemplate) {
    setTemplates((prev) => {
      const exists = prev.some((x) => x.id === tpl.id);
      const updated = { ...tpl, updatedAt: today, estimatedAmount: templateEstimatedAmount(tpl.lines) };
      return exists ? prev.map((x) => (x.id === tpl.id ? updated : x)) : [...prev, updated];
    });
    setView('list');
    setEditingTpl(null);
    notify('Le modèle a été enregistré pour cette démonstration.');
  }

  /* ── Preview view ── */
  if (view === 'preview' && previewTpl) {
    return (
      <TemplatePreview
        tpl={previewTpl}
        onBack={() => { setView('list'); setPreviewTpl(null); }}
        onEdit={() => { setEditingTpl(previewTpl); setView('form'); }}
        onUse={onUseTemplate ? () => onUseTemplate(previewTpl) : undefined}
        onClose={onClose}
      />
    );
  }

  /* ── Form view ── */
  if (view === 'form') {
    return (
      <TemplateForm
        initial={editingTpl}
        onClose={() => { setView('list'); setEditingTpl(null); }}
        onSave={saveTemplate}
        onSaveAndUse={onUseTemplate ? (tpl) => { saveTemplate(tpl); onUseTemplate(tpl); } : undefined}
      />
    );
  }

  /* ── List view ── */
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/40 backdrop-blur-sm animate-fade-in">
      <Card className="w-full max-w-6xl mx-4 max-h-[92vh] overflow-y-auto">
        <CardHeader
          title="Modèles de documents de facturation"
          subtitle={`${templates.length} modèle(s) — données de démonstration`}
          action={
            <div className="flex items-center gap-2">
              <Button variant="primary" size="sm" onClick={() => { setEditingTpl(null); setView('form'); }}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Nouveau modèle
              </Button>
              <button onClick={onClose} className="text-navy-400 hover:text-navy-700"><X className="w-5 h-5" /></button>
            </div>
          }
        />
        <div className="p-5 space-y-4">
          {toast && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm">
              <CheckCircle2 className="w-4 h-4" /> {toast}
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-navy-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par nom, code, service, catégorie, prestation…"
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-navy-200 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-medical-400"
              />
            </div>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value as 'all' | TemplateDocType)} className="px-3 py-2 rounded-lg border border-navy-200 text-sm text-navy-900 bg-white focus:outline-none focus:ring-2 focus:ring-medical-400">
              <option value="all">Tous les types</option>
              {TEMPLATE_DOC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="px-3 py-2 rounded-lg border border-navy-200 text-sm text-navy-900 bg-white focus:outline-none focus:ring-2 focus:ring-medical-400">
              <option value="all">Toutes catégories</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')} className="px-3 py-2 rounded-lg border border-navy-200 text-sm text-navy-900 bg-white focus:outline-none focus:ring-2 focus:ring-medical-400">
              <option value="all">Tous statuts</option>
              <option value="active">Actifs</option>
              <option value="inactive">Inactifs</option>
            </select>
          </div>

          {/* Table */}
          {filtered.length === 0 ? (
            <EmptyState icon={Layers} title="Aucun modèle" subtitle="Aucun modèle ne correspond aux critères" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-navy-100 text-left text-navy-500">
                    <th className="px-3 py-2 font-medium">Nom du modèle</th>
                    <th className="px-3 py-2 font-medium">Code</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Catégorie</th>
                    <th className="px-3 py-2 font-medium text-right">Prestations</th>
                    <th className="px-3 py-2 font-medium text-right">Montant estimatif</th>
                    <th className="px-3 py-2 font-medium">Créé le</th>
                    <th className="px-3 py-2 font-medium">Modifié le</th>
                    <th className="px-3 py-2 font-medium">Statut</th>
                    <th className="px-3 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => (
                    <tr key={t.id} className="border-b border-navy-50 hover:bg-navy-50/50">
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-navy-900">{t.name}</p>
                        <p className="text-xs text-navy-400">{t.description}</p>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs text-medical-700">{t.code}</td>
                      <td className="px-3 py-2.5">
                        <Badge color={t.docType === 'cotation' ? 'blue' : t.docType === 'prefacture' ? 'amber' : t.docType === 'facture' ? 'green' : 'navy'}>
                          {TEMPLATE_DOC_TYPES.find((d) => d.value === t.docType)?.label ?? t.docType}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-navy-500">{t.category}</td>
                      <td className="px-3 py-2.5 text-right text-navy-600">{t.lines.length}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-navy-900 whitespace-nowrap">{formatFCFA(t.estimatedAmount)}</td>
                      <td className="px-3 py-2.5 text-navy-500 whitespace-nowrap">{formatDate(t.createdAt)}</td>
                      <td className="px-3 py-2.5 text-navy-500 whitespace-nowrap">{formatDate(t.updatedAt)}</td>
                      <td className="px-3 py-2.5"><Badge color={t.active ? 'green' : 'navy'}>{t.active ? 'Actif' : 'Inactif'}</Badge></td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-1">
                          {onUseTemplate && t.active && (
                            <button onClick={() => onUseTemplate(t)} title="Utiliser" className="p-1 text-medical-600 hover:bg-medical-50 rounded"><CheckCircle2 className="w-3.5 h-3.5" /></button>
                          )}
                          <button onClick={() => { setPreviewTpl(t); setView('preview'); }} title="Consulter" className="p-1 text-navy-400 hover:text-medical-600 rounded"><Eye className="w-3.5 h-3.5" /></button>
                          <button onClick={() => { setEditingTpl(t); setView('form'); }} title="Modifier" className="p-1 text-navy-400 hover:text-medical-600 rounded"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => duplicate(t.id)} title="Dupliquer" className="p-1 text-navy-400 hover:text-medical-600 rounded"><Copy className="w-3.5 h-3.5" /></button>
                          <button onClick={() => toggleActive(t.id)} title={t.active ? 'Désactiver' : 'Activer'} className="p-1 text-navy-400 hover:text-amber-600 rounded"><Ban className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setDeleteTarget(t)} title="Supprimer" className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-navy-950/50">
          <Card className="w-full max-w-sm mx-4">
            <CardHeader title="Supprimer le modèle" />
            <div className="p-5 space-y-3">
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
                <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                <p className="text-sm text-red-700">Confirmer la suppression du modèle « {deleteTarget.name} » ? Cette action ne supprime pas les documents déjà créés à partir de ce modèle.</p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Annuler</Button>
                <Button variant="danger" onClick={() => deleteTpl(deleteTarget.id)}>Supprimer</Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   TemplateForm — create / edit a template
   ════════════════════════════════════════════════════════════════════ */

interface TemplateFormProps {
  initial: BillingTemplate | null;
  onClose: () => void;
  onSave: (tpl: BillingTemplate) => void;
  onSaveAndUse?: (tpl: BillingTemplate) => void;
}

function TemplateForm({ initial, onClose, onSave, onSaveAndUse }: TemplateFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [code, setCode] = useState(initial?.code ?? generateTemplateCode());
  const [description, setDescription] = useState(initial?.description ?? '');
  const [docType, setDocType] = useState<TemplateDocType>(initial?.docType ?? 'all');
  const [service, setService] = useState(initial?.service ?? 'Consultation');
  const [category, setCategory] = useState(initial?.category ?? 'Consultation');
  const [validityDays, setValidityDays] = useState(String(initial?.validityDays ?? 30));
  const [active, setActive] = useState(initial?.active ?? true);
  const [lines, setLines] = useState<TemplateLine[]>(initial?.lines ?? []);
  const [applyDiscount, setApplyDiscount] = useState(initial?.applyDiscount ?? false);
  const [coverageType, setCoverageType] = useState(initial?.coverageType ?? 'Patient assuré');
  const [proposedCoverageRate, setProposedCoverageRate] = useState(String(initial?.proposedCoverageRate ?? 80));
  const [usuallyCovered, setUsuallyCovered] = useState(initial?.usuallyCovered ?? '');
  const [usuallyNotCovered, setUsuallyNotCovered] = useState(initial?.usuallyNotCovered ?? '');
  const [paymentConditions, setPaymentConditions] = useState(initial?.paymentConditions ?? '');
  const [patientObservations, setPatientObservations] = useState(initial?.patientObservations ?? '');
  const [internalNotes, setInternalNotes] = useState(initial?.internalNotes ?? '');
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addLine() {
    setLines((prev) => [...prev, { category: 'Consultation', code: '', description: '', quantity: 1, unitPrice: 0, discount: 0, coverage: 'couverte', coverageRate: 80 }]);
  }

  function updateLine(idx: number, patch: Partial<TemplateLine>) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  function removeLine(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }

  const estimated = templateEstimatedAmount(lines);

  function buildTemplate(): BillingTemplate {
    return {
      id: initial?.id ?? `tpl${Date.now()}`,
      name: name || 'Nouveau modèle',
      code: code || generateTemplateCode(),
      description,
      docType,
      service,
      category,
      validityDays: Number(validityDays) || 30,
      active,
      lines: lines.filter((l) => l.description.trim()),
      applyDiscount,
      coverageType,
      proposedCoverageRate: Number(proposedCoverageRate) || 0,
      usuallyCovered,
      usuallyNotCovered,
      paymentConditions,
      patientObservations,
      internalNotes,
      createdAt: initial?.createdAt ?? today,
      updatedAt: today,
      estimatedAmount: templateEstimatedAmount(lines.filter((l) => l.description.trim())),
    };
  }

  function validate(): string | null {
    if (!name.trim()) return 'Le nom du modèle est obligatoire.';
    if (lines.length === 0) return 'Ajoutez au moins une prestation au modèle.';
    for (const l of lines) {
      if (!l.description.trim()) return 'Toutes les prestations doivent avoir une description.';
      if (l.quantity <= 0) return `Quantité invalide pour « ${l.description} ».`;
    }
    return null;
  }

  function handleSave() {
    const v = validate();
    if (v) { setError(v); return; }
    setError(null);
    onSave(buildTemplate());
  }

  function handleSaveAndUse() {
    const v = validate();
    if (v) { setError(v); return; }
    setError(null);
    onSaveAndUse?.(buildTemplate());
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/40 backdrop-blur-sm animate-fade-in">
      <Card className="w-full max-w-5xl mx-4 max-h-[92vh] overflow-y-auto">
        <CardHeader
          title={initial ? 'Modifier le modèle' : 'Créer un modèle de document de facturation'}
          subtitle="Les modèles ne contiennent aucune donnée nominative de patient"
          action={<button onClick={onClose} className="text-navy-400 hover:text-navy-700"><X className="w-5 h-5" /></button>}
        />
        <div className="p-5 space-y-5">
          {/* General info */}
          <SectionTitle>Informations générales</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <FField label="Nom du modèle" value={name} onChange={setName} placeholder="Ex : Bilan prénatal" />
            <FField label="Code du modèle" value={code} onChange={setCode} placeholder="Généré automatiquement" />
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">Type de document compatible</label>
              <select value={docType} onChange={(e) => setDocType(e.target.value as TemplateDocType)} className="w-full px-3 py-2 rounded-lg border border-navy-200 text-sm text-navy-900 bg-white focus:outline-none focus:ring-2 focus:ring-medical-400">
                {TEMPLATE_DOC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <FField label="Description" value={description} onChange={setDescription} placeholder="Description du modèle" />
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">Service concerné</label>
              <select value={service} onChange={(e) => setService(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-navy-200 text-sm text-navy-900 bg-white focus:outline-none focus:ring-2 focus:ring-medical-400">
                {TEMPLATE_SERVICES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">Catégorie principale</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-navy-200 text-sm text-navy-900 bg-white focus:outline-none focus:ring-2 focus:ring-medical-400">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <FField label="Durée de validité proposée (jours)" value={validityDays} onChange={setValidityDays} type="number" />
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-navy-700">
                <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="rounded" /> Modèle actif
              </label>
            </div>
          </div>

          {/* Lines */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <SectionTitle>Prestations du modèle</SectionTitle>
              <Button variant="ghost" size="sm" onClick={addLine}><Plus className="w-3.5 h-3.5 mr-1" /> Ajouter une prestation</Button>
            </div>
            {lines.length === 0 ? (
              <div className="text-center py-6 text-navy-400 text-sm border border-dashed border-navy-200 rounded-lg">
                Aucune prestation. Cliquez sur « Ajouter une prestation ».
              </div>
            ) : (
              <div className="space-y-2">
                {lines.map((l, idx) => (
                  <TemplateLineRow
                    key={idx}
                    line={l}
                    onChange={(patch) => updateLine(idx, patch)}
                    onRemove={() => removeLine(idx)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Financial params */}
          <SectionTitle>Paramètres financiers proposés</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="flex items-center gap-2 text-sm text-navy-700">
              <input type="checkbox" checked={applyDiscount} onChange={(e) => setApplyDiscount(e.target.checked)} className="rounded" /> Application d'une remise
            </label>
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">Type de couverture habituel</label>
              <select value={coverageType} onChange={(e) => setCoverageType(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-navy-200 text-sm text-navy-900 bg-white focus:outline-none focus:ring-2 focus:ring-medical-400">
                <option value="Patient non assuré">Patient non assuré</option>
                <option value="Patient assuré">Patient assuré</option>
                <option value="Convention entreprise">Convention entreprise</option>
                <option value="Prise en charge particulière">Prise en charge particulière</option>
                <option value="Paiement intégral par le patient">Paiement intégral par le patient</option>
              </select>
            </div>
            <FField label="Taux d'assurance proposé (%)" value={proposedCoverageRate} onChange={setProposedCoverageRate} type="number" />
            <FField label="Prestations habituellement couvertes" value={usuallyCovered} onChange={setUsuallyCovered} placeholder="Ex : Consultations, laboratoire" />
            <FField label="Prestations habituellement non couvertes" value={usuallyNotCovered} onChange={setUsuallyNotCovered} placeholder="Ex : Chambre individuelle" />
            <FField label="Conditions de paiement" value={paymentConditions} onChange={setPaymentConditions} placeholder="Ex : Paiement à 30 jours" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">Observations destinées au patient</label>
              <textarea value={patientObservations} onChange={(e) => setPatientObservations(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg border border-navy-200 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-medical-400 resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">Notes internes (non imprimées)</label>
              <textarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg border border-navy-200 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-medical-400 resize-none" />
            </div>
          </div>

          {/* Estimated total */}
          <div className="flex justify-end">
            <div className="w-full md:w-72 space-y-1 text-sm border-t border-navy-100 pt-3">
              <div className="flex justify-between py-1 text-navy-600"><span>Nombre de prestations</span><span className="font-medium">{lines.filter((l) => l.description.trim()).length}</span></div>
              <div className="flex justify-between py-1 font-bold text-navy-900 border-t border-navy-100 pt-2"><span>Montant estimatif</span><span>{formatFCFA(estimated)}</span></div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-navy-100">
            <Button variant="secondary" onClick={() => setShowPreview(true)}><Eye className="w-4 h-4 mr-1.5" /> Prévisualiser</Button>
            <Button variant="secondary" onClick={onClose}>Annuler</Button>
            <Button variant="primary" onClick={handleSave}><CheckCircle2 className="w-4 h-4 mr-1.5" /> Enregistrer le modèle</Button>
            {onSaveAndUse && <Button variant="turquoise" onClick={handleSaveAndUse}><CheckCircle2 className="w-4 h-4 mr-1.5" /> Enregistrer et utiliser</Button>}
          </div>
        </div>
      </Card>

      {/* Preview */}
      {showPreview && (
        <TemplatePreview tpl={buildTemplate()} onBack={() => setShowPreview(false)} onClose={() => setShowPreview(false)} />
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   TemplateLineRow — one line in the template form
   ════════════════════════════════════════════════════════════════════ */

function TemplateLineRow({ line, onChange, onRemove }: {
  line: TemplateLine;
  onChange: (patch: Partial<TemplateLine>) => void;
  onRemove: () => void;
}) {
  const [search, setSearch] = useState('');
  const suggestions = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return catalogue.filter((c) => c.category === line.category && (c.label.toLowerCase().includes(q) || c.code.toLowerCase().includes(q))).slice(0, 6);
  }, [search, line.category]);

  function pickCatalogue(id: string) {
    const c = catalogue.find((x) => x.id === id);
    if (!c) return;
    onChange({ code: c.code, description: c.label, unitPrice: c.standardPrice });
    setSearch('');
  }

  const amount = Math.max(0, line.quantity * line.unitPrice - line.discount);
  const partAssurance = line.coverage === 'non-couverte' ? 0 : Math.round((amount * line.coverageRate) / 100);
  const partPatient = amount - partAssurance;

  return (
    <div className="rounded-lg border border-navy-100 p-3 bg-navy-50/40">
      <div className="grid grid-cols-12 gap-2 items-start">
        <div className="col-span-12 sm:col-span-2">
          <label className="block text-[11px] text-navy-500 mb-0.5">Catégorie</label>
          <select value={line.category} onChange={(e) => onChange({ category: e.target.value })} className="w-full px-2 py-1.5 rounded-md border border-navy-200 text-xs text-navy-900 bg-white focus:outline-none focus:ring-1 focus:ring-medical-400">
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="col-span-12 sm:col-span-3">
          <label className="block text-[11px] text-navy-500 mb-0.5">Recherche prestation</label>
          <div className="relative">
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Saisir pour autocompléter…" className="w-full px-2 py-1.5 rounded-md border border-navy-200 text-xs text-navy-900 focus:outline-none focus:ring-1 focus:ring-medical-400" />
            {suggestions.length > 0 && (
              <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border border-navy-200 rounded-md shadow-lg max-h-44 overflow-y-auto">
                {suggestions.map((c) => (
                  <button key={c.id} onClick={() => pickCatalogue(c.id)} className="w-full text-left px-2 py-1.5 hover:bg-navy-50 border-b border-navy-50 last:border-0">
                    <p className="text-xs font-medium text-navy-900">{c.label}</p>
                    <p className="text-[10px] text-navy-400">{c.code} · {formatFCFA(c.standardPrice)}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="col-span-6 sm:col-span-1">
          <label className="block text-[11px] text-navy-500 mb-0.5">Code</label>
          <input type="text" value={line.code} onChange={(e) => onChange({ code: e.target.value })} className="w-full px-2 py-1.5 rounded-md border border-navy-200 text-xs text-navy-900 focus:outline-none focus:ring-1 focus:ring-medical-400" />
        </div>
        <div className="col-span-6 sm:col-span-2">
          <label className="block text-[11px] text-navy-500 mb-0.5">Description</label>
          <input type="text" value={line.description} onChange={(e) => onChange({ description: e.target.value })} placeholder="Désignation" className="w-full px-2 py-1.5 rounded-md border border-navy-200 text-xs text-navy-900 focus:outline-none focus:ring-1 focus:ring-medical-400" />
        </div>
        <div className="col-span-4 sm:col-span-1">
          <label className="block text-[11px] text-navy-500 mb-0.5">Qté</label>
          <input type="number" min={1} value={line.quantity} onChange={(e) => onChange({ quantity: Number(e.target.value) || 0 })} className="w-full px-2 py-1.5 rounded-md border border-navy-200 text-xs text-navy-900 focus:outline-none focus:ring-1 focus:ring-medical-400" />
        </div>
        <div className="col-span-4 sm:col-span-1">
          <label className="block text-[11px] text-navy-500 mb-0.5">P.U.</label>
          <input type="number" min={0} value={line.unitPrice} onChange={(e) => onChange({ unitPrice: Number(e.target.value) || 0 })} className="w-full px-2 py-1.5 rounded-md border border-navy-200 text-xs text-navy-900 focus:outline-none focus:ring-1 focus:ring-medical-400" />
        </div>
        <div className="col-span-4 sm:col-span-1">
          <label className="block text-[11px] text-navy-500 mb-0.5">Remise</label>
          <input type="number" min={0} value={line.discount} onChange={(e) => onChange({ discount: Number(e.target.value) || 0 })} className="w-full px-2 py-1.5 rounded-md border border-navy-200 text-xs text-navy-900 focus:outline-none focus:ring-1 focus:ring-medical-400" />
        </div>
      </div>
      <div className="grid grid-cols-12 gap-2 items-center mt-2">
        <div className="col-span-6 sm:col-span-2">
          <label className="block text-[11px] text-navy-500 mb-0.5">Couverture</label>
          <select value={line.coverage} onChange={(e) => { const cov = e.target.value as CoverageLineStatus; onChange({ coverage: cov, coverageRate: cov === 'couverte' ? (line.coverageRate || 80) : cov === 'non-couverte' ? 0 : line.coverageRate }); }} className="w-full px-2 py-1.5 rounded-md border border-navy-200 text-xs text-navy-900 bg-white focus:outline-none focus:ring-1 focus:ring-medical-400">
            {(Object.keys(COVERAGE_LABELS) as CoverageLineStatus[]).map((c) => <option key={c} value={c}>{COVERAGE_LABELS[c]}</option>)}
          </select>
        </div>
        <div className="col-span-6 sm:col-span-1">
          <label className="block text-[11px] text-navy-500 mb-0.5">Taux %</label>
          <input type="number" min={0} max={100} value={line.coverageRate} disabled={line.coverage === 'non-couverte'} onChange={(e) => onChange({ coverageRate: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })} className="w-full px-2 py-1.5 rounded-md border border-navy-200 text-xs text-navy-900 focus:outline-none focus:ring-1 focus:ring-medical-400 disabled:bg-navy-100 disabled:text-navy-400" />
        </div>
        <div className="col-span-12 sm:col-span-3">
          <input type="text" value={line.observation ?? ''} onChange={(e) => onChange({ observation: e.target.value || undefined })} placeholder="Observation (optionnel)" className="w-full px-2 py-1.5 rounded-md border border-navy-200 text-xs text-navy-900 focus:outline-none focus:ring-1 focus:ring-medical-400" />
        </div>
        <div className="col-span-12 sm:col-span-5 flex items-center justify-end gap-3 text-[11px]">
          <span className="font-semibold text-navy-900">{formatFCFA(amount)}</span>
          <span className="text-turquoise-600">Ass: {formatFCFA(partAssurance)}</span>
          <span className="text-navy-600">Pat: {formatFCFA(partPatient)}</span>
          <button onClick={onRemove} title="Supprimer" className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   TemplatePreview — read-only view
   ════════════════════════════════════════════════════════════════════ */

function TemplatePreview({ tpl, onBack, onEdit, onUse, onClose }: {
  tpl: BillingTemplate;
  onBack: () => void;
  onEdit?: () => void;
  onUse?: () => void;
  onClose: () => void;
}) {
  const estimated = templateEstimatedAmount(tpl.lines);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/40 backdrop-blur-sm animate-fade-in">
      <Card className="w-full max-w-3xl mx-4 max-h-[92vh] overflow-y-auto">
        <CardHeader
          title={tpl.name}
          subtitle={`${tpl.code} · ${TEMPLATE_DOC_TYPES.find((d) => d.value === tpl.docType)?.label ?? tpl.docType} · ${tpl.service}`}
          action={
            <div className="flex items-center gap-2">
              {onEdit && <Button variant="secondary" size="sm" onClick={onEdit}><Pencil className="w-3.5 h-3.5 mr-1" /> Modifier</Button>}
              {onUse && <Button variant="primary" size="sm" onClick={onUse}><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Utiliser</Button>}
              <button onClick={onClose ?? onBack} className="text-navy-400 hover:text-navy-700"><X className="w-5 h-5" /></button>
            </div>
          }
        />
        <div className="p-5 space-y-4">
          {onBack && (
            <button onClick={onBack} className="flex items-center gap-2 text-sm text-navy-600 hover:text-navy-900"><ArrowLeft className="w-4 h-4" /> Retour à la liste</button>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm rounded-lg bg-navy-50 p-4">
            <div><p className="text-xs text-navy-400">Catégorie</p><p className="font-medium text-navy-800">{tpl.category}</p></div>
            <div><p className="text-xs text-navy-400">Validité</p><p className="font-medium text-navy-800">{tpl.validityDays} jours</p></div>
            <div><p className="text-xs text-navy-400">Statut</p><Badge color={tpl.active ? 'green' : 'navy'}>{tpl.active ? 'Actif' : 'Inactif'}</Badge></div>
            <div><p className="text-xs text-navy-400">Montant estimatif</p><p className="font-bold text-navy-900">{formatFCFA(estimated)}</p></div>
          </div>
          {tpl.description && <p className="text-sm text-navy-600">{tpl.description}</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-100 text-left text-navy-500">
                  <th className="py-2 pr-3 font-medium">Code</th>
                  <th className="py-2 px-3 font-medium">Désignation</th>
                  <th className="py-2 px-3 font-medium text-right">Qté</th>
                  <th className="py-2 px-3 font-medium text-right">P.U.</th>
                  <th className="py-2 px-3 font-medium text-right">Montant</th>
                  <th className="py-2 px-3 font-medium">Couverture</th>
                </tr>
              </thead>
              <tbody>
                {tpl.lines.map((l, i) => (
                  <tr key={i} className="border-b border-navy-50">
                    <td className="py-2 pr-3 font-mono text-xs text-navy-500">{l.code || '—'}</td>
                    <td className="py-2 px-3 text-navy-900">{l.description}{l.observation && <p className="text-xs text-navy-400 mt-0.5">{l.observation}</p>}</td>
                    <td className="py-2 px-3 text-right text-navy-600">{l.quantity}</td>
                    <td className="py-2 px-3 text-right text-navy-600 whitespace-nowrap">{formatFCFA(l.unitPrice)}</td>
                    <td className="py-2 px-3 text-right font-medium text-navy-900 whitespace-nowrap">{formatFCFA(Math.max(0, l.quantity * l.unitPrice - l.discount))}</td>
                    <td className="py-2 px-3"><Badge color={l.coverage === 'non-couverte' ? 'navy' : l.coverage === 'couverte' ? 'green' : 'amber'}>{l.coverage === 'couverte' ? 'Couverte' : l.coverage === 'non-couverte' ? 'Non couverte' : `Partielle ${l.coverageRate}%`}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(tpl.patientObservations || tpl.paymentConditions || tpl.internalNotes) && (
            <div className="space-y-2 text-sm">
              {tpl.patientObservations && <div><p className="text-xs text-navy-400">Observations patient</p><p className="text-navy-700">{tpl.patientObservations}</p></div>}
              {tpl.paymentConditions && <div><p className="text-xs text-navy-400">Conditions de paiement</p><p className="text-navy-700">{tpl.paymentConditions}</p></div>}
              {tpl.internalNotes && <div><p className="text-xs text-navy-400">Notes internes</p><p className="text-navy-500">{tpl.internalNotes}</p></div>}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   TemplateSelectionModal — choose a template before creating a doc
   ════════════════════════════════════════════════════════════════════ */

interface TemplateSelectionModalProps {
  docType: BillingDocType;
  templates: BillingTemplate[];
  onClose: () => void;
  onUse: (tpl: BillingTemplate) => void;
  onContinueWithout: () => void;
  onCreateNew: () => void;
}

export function TemplateSelectionModal({ docType, templates, onClose, onUse, onContinueWithout, onCreateNew }: TemplateSelectionModalProps) {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const compatible = useMemo(() => {
    return templates.filter((t) => t.active && (t.docType === docType || t.docType === 'all'));
  }, [templates, docType]);

  const filtered = useMemo(() => {
    if (!search.trim()) return compatible;
    const q = search.toLowerCase();
    return compatible.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.code.toLowerCase().includes(q) ||
        t.service.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.lines.some((l) => l.description.toLowerCase().includes(q)),
    );
  }, [compatible, search]);

  const selected = filtered.find((t) => t.id === selectedId) ?? null;

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-navy-950/40 backdrop-blur-sm animate-fade-in">
      <Card className="w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader
          title="Sélectionner un modèle"
          subtitle={`Type de document : ${docType === 'cotation' ? 'Cotation' : docType === 'prefacture' ? 'Préfacture' : 'Facture'}`}
          action={<button onClick={onClose} className="text-navy-400 hover:text-navy-700"><X className="w-5 h-5" /></button>}
        />
        <div className="p-5 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-navy-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom, code, service, catégorie, prestation…"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-navy-200 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-medical-400"
              autoFocus
            />
          </div>

          {/* Results */}
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-navy-400 text-sm border border-dashed border-navy-200 rounded-lg">
              Aucun modèle ne correspond à la recherche.
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filtered.map((t) => {
                const isSel = t.id === selectedId;
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedId(t.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      isSel ? 'border-medical-500 bg-medical-50 ring-2 ring-medical-400' : 'border-navy-200 hover:border-medical-300 hover:bg-navy-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-navy-900">{t.name}</p>
                      <Badge color={t.docType === 'all' ? 'navy' : t.docType === 'cotation' ? 'blue' : t.docType === 'prefacture' ? 'amber' : 'green'}>
                        {TEMPLATE_DOC_TYPES.find((d) => d.value === t.docType)?.label ?? t.docType}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-navy-500">
                      <span className="font-mono text-medical-700">{t.code}</span>
                      <span>{t.service}</span>
                      <span>{t.lines.length} prestation(s)</span>
                      <span className="font-semibold text-navy-700">{formatFCFA(t.estimatedAmount)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Preview of selected */}
          {selected && (
            <div className="rounded-lg border border-navy-100 bg-navy-50/50 p-4 space-y-2">
              <p className="text-sm font-semibold text-navy-900">{selected.name}</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-navy-100 text-left text-navy-500">
                      <th className="py-1.5 pr-2 font-medium">Code</th>
                      <th className="py-1.5 px-2 font-medium">Désignation</th>
                      <th className="py-1.5 px-2 font-medium text-right">Qté</th>
                      <th className="py-1.5 px-2 font-medium text-right">P.U.</th>
                      <th className="py-1.5 px-2 font-medium text-right">Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.lines.map((l, i) => (
                      <tr key={i} className="border-b border-navy-50">
                        <td className="py-1.5 pr-2 font-mono text-navy-500">{l.code || '—'}</td>
                        <td className="py-1.5 px-2 text-navy-900">{l.description}</td>
                        <td className="py-1.5 px-2 text-right text-navy-600">{l.quantity}</td>
                        <td className="py-1.5 px-2 text-right text-navy-600 whitespace-nowrap">{formatFCFA(l.unitPrice)}</td>
                        <td className="py-1.5 px-2 text-right font-medium text-navy-900 whitespace-nowrap">{formatFCFA(Math.max(0, l.quantity * l.unitPrice - l.discount))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end text-sm font-bold text-navy-900">Total : {formatFCFA(selected.estimatedAmount)}</div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-navy-100">
            <Button variant="ghost" onClick={onClose}>Annuler</Button>
            <Button variant="secondary" onClick={onCreateNew}><Plus className="w-4 h-4 mr-1.5" /> Créer un nouveau modèle</Button>
            <Button variant="secondary" onClick={onContinueWithout}>Continuer sans modèle</Button>
            <Button variant="primary" disabled={!selected} onClick={() => selected && onUse(selected)}>
              <CheckCircle2 className="w-4 h-4 mr-1.5" /> Utiliser ce modèle
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   SaveAsTemplateModal — save a document as a template
   ════════════════════════════════════════════════════════════════════ */

interface SaveAsTemplateProps {
  lines: BillingLine[];
  docType: BillingDocType;
  onClose: () => void;
  onSave: (tpl: BillingTemplate) => void;
}

export function SaveAsTemplateModal({ lines, docType, onClose, onSave }: SaveAsTemplateProps) {
  const [name, setName] = useState('');
  const [code, setCode] = useState(generateTemplateCode());
  const [description, setDescription] = useState('');
  const [tplDocType, setTplDocType] = useState<TemplateDocType>(docType);
  const [service, setService] = useState('Consultation');
  const [category, setCategory] = useState(lines[0]?.category ?? 'Consultation');
  const [includeQty, setIncludeQty] = useState(true);
  const [includePrices, setIncludePrices] = useState(true);
  const [includeInsurance, setIncludeInsurance] = useState(true);
  const [active, setActive] = useState(true);
  const [selectedLineIds, setSelectedLineIds] = useState<Set<string>>(new Set(lines.map((l) => l.id)));
  const [error, setError] = useState<string | null>(null);

  function toggleLine(id: string) {
    setSelectedLineIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function save() {
    if (!name.trim()) { setError('Le nom du modèle est obligatoire.'); return; }
    const kept = lines.filter((l) => selectedLineIds.has(l.id));
    if (kept.length === 0) { setError('Sélectionnez au moins une prestation.'); return; }
    const tplLines: TemplateLine[] = kept.map((l) => ({
      category: l.category,
      code: l.code,
      description: l.description,
      quantity: includeQty ? l.quantity : 1,
      unitPrice: includePrices ? l.unitPrice : 0,
      discount: includePrices ? l.discount : 0,
      coverage: includeInsurance ? l.coverage : 'couverte',
      coverageRate: includeInsurance ? l.coverageRate : 80,
      observation: l.observation,
    }));
    const tpl: BillingTemplate = {
      id: `tpl${Date.now()}`,
      name,
      code,
      description,
      docType: tplDocType,
      service,
      category,
      validityDays: 30,
      active,
      lines: tplLines,
      applyDiscount: false,
      coverageType: 'Patient assuré',
      proposedCoverageRate: 80,
      usuallyCovered: '',
      usuallyNotCovered: '',
      paymentConditions: '',
      patientObservations: '',
      internalNotes: '',
      createdAt: today,
      updatedAt: today,
      estimatedAmount: templateEstimatedAmount(tplLines),
    };
    onSave(tpl);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-navy-950/50">
      <Card className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader title="Enregistrer comme modèle" subtitle="Aucune donnée nominative du patient ne sera enregistrée" action={<button onClick={onClose} className="text-navy-400 hover:text-navy-700"><X className="w-5 h-5" /></button>} />
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FField label="Nom du modèle" value={name} onChange={setName} placeholder="Ex : Bilan pré-opératoire" />
            <FField label="Code" value={code} onChange={setCode} />
            <FField label="Description" value={description} onChange={setDescription} />
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">Type compatible</label>
              <select value={tplDocType} onChange={(e) => setTplDocType(e.target.value as TemplateDocType)} className="w-full px-3 py-2 rounded-lg border border-navy-200 text-sm text-navy-900 bg-white focus:outline-none focus:ring-2 focus:ring-medical-400">
                {TEMPLATE_DOC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">Service</label>
              <select value={service} onChange={(e) => setService(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-navy-200 text-sm text-navy-900 bg-white focus:outline-none focus:ring-2 focus:ring-medical-400">
                {TEMPLATE_SERVICES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">Catégorie principale</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-navy-200 text-sm text-navy-900 bg-white focus:outline-none focus:ring-2 focus:ring-medical-400">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Inclusion toggles */}
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-navy-700"><input type="checkbox" checked={includeQty} onChange={(e) => setIncludeQty(e.target.checked)} className="rounded" /> Inclure les quantités</label>
            <label className="flex items-center gap-2 text-sm text-navy-700"><input type="checkbox" checked={includePrices} onChange={(e) => setIncludePrices(e.target.checked)} className="rounded" /> Inclure les tarifs</label>
            <label className="flex items-center gap-2 text-sm text-navy-700"><input type="checkbox" checked={includeInsurance} onChange={(e) => setIncludeInsurance(e.target.checked)} className="rounded" /> Inclure les paramètres d'assurance</label>
            <label className="flex items-center gap-2 text-sm text-navy-700"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="rounded" /> Modèle actif</label>
          </div>

          {/* Line selection */}
          <div>
            <p className="text-sm font-medium text-navy-700 mb-2">Prestations à conserver dans le modèle</p>
            <div className="space-y-1 max-h-48 overflow-y-auto border border-navy-100 rounded-lg">
              {lines.map((l) => (
                <label key={l.id} className="flex items-center gap-2 px-3 py-2 hover:bg-navy-50 border-b border-navy-50 last:border-0 cursor-pointer">
                  <input type="checkbox" checked={selectedLineIds.has(l.id)} onChange={() => toggleLine(l.id)} className="rounded" />
                  <span className="font-mono text-xs text-navy-500">{l.code || '—'}</span>
                  <span className="text-sm text-navy-900 flex-1">{l.description}</span>
                  <span className="text-xs text-navy-400">{l.quantity} × {formatFCFA(l.unitPrice)}</span>
                </label>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-navy-100">
            <Button variant="secondary" onClick={onClose}>Annuler</Button>
            <Button variant="primary" onClick={save}><CheckCircle2 className="w-4 h-4 mr-1.5" /> Enregistrer le modèle</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   ChangeTemplateConfirm — when changing template with existing lines
   ════════════════════════════════════════════════════════════════════ */

export type ChangeTemplateChoice = 'replace' | 'add' | 'cancel';

export function ChangeTemplateConfirm({ onChoose, hasDuplicates }: {
  onChoose: (choice: ChangeTemplateChoice) => void;
  hasDuplicates: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-navy-950/50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader title="Changer de modèle" />
        <div className="p-5 space-y-3">
          <p className="text-sm text-navy-600">Le chargement d'un autre modèle peut remplacer les prestations actuellement renseignées. Que souhaitez-vous faire ?</p>
          {hasDuplicates && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-700">Des prestations identiques ont été détectées. Vous pourrez fusionner les quantités, conserver les deux lignes ou ignorer le doublon.</p>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Button variant="danger" onClick={() => onChoose('replace')}>Remplacer les lignes actuelles</Button>
            <Button variant="primary" onClick={() => onChoose('add')}>Ajouter les prestations du nouveau modèle</Button>
            <Button variant="secondary" onClick={() => onChoose('cancel')}>Annuler</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   Shared field component
   ════════════════════════════════════════════════════════════════════ */

function FField({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-navy-700 mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full px-3 py-2 rounded-lg border border-navy-200 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-medical-400" />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   DocTypeChooser — step 1: choose Cotation / Préfacture / Facture
   ════════════════════════════════════════════════════════════════════ */

export function DocTypeChooser({ onClose, onChoose }: { onClose: () => void; onChoose: (t: BillingDocType) => void }) {
  const cards: { type: BillingDocType; icon: typeof FileText; title: string; desc: string }[] = [
    { type: 'cotation', icon: FileText, title: 'Cotation', desc: 'Estimation financière remise au patient avant réalisation des prestations.' },
    { type: 'prefacture', icon: FilePlus2, title: 'Préfacture', desc: 'Document provisoire et modifiable en attente de la finalisation des soins.' },
    { type: 'facture', icon: Receipt, title: 'Facture', desc: 'Facture définitive prête à être encaissée.' },
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/40 backdrop-blur-sm animate-fade-in">
      <Card className="w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader
          title="Nouveau document de facturation"
          subtitle="Choisissez le type de document à créer"
          action={<button onClick={onClose} className="text-navy-400 hover:text-navy-700"><X className="w-5 h-5" /></button>}
        />
        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <button
                key={c.type}
                onClick={() => onChoose(c.type)}
                className="text-left p-5 rounded-xl border border-navy-200 hover:border-medical-400 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-medical-400 bg-white"
              >
                <div className="w-10 h-10 rounded-lg bg-medical-50 flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-medical-600" />
                </div>
                <p className="font-semibold text-navy-900 mb-1">{c.title}</p>
                <p className="text-xs text-navy-500 leading-relaxed">{c.desc}</p>
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
