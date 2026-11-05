// Données de démonstration pour le module de prescription hospitalière (DPI)
// Un seul ensemble d'exemples réutilisé dans tout le module.

export interface ProtocolPrescriptionLine {
  id: string;
  category: 'pharmacie' | 'infirmier' | 'laboratoire' | 'imagerie' | 'medical';
  drug: string;
  dosage: string;
  route: string;
  frequency: string;
  duration: string;
  hours: string[];
  start: string;
  type: 'systematique' | 'besoin';
  nurseNote: string;
  maxPerDay?: string;
  maxTotal?: string;
  quantityLabel: string;
  unitPrice: number;
  lineTotal: number;
  status: 'brouillon' | 'signee';
  pennySituations?: string;
}

export const protocolLines: ProtocolPrescriptionLine[] = [
  {
    id: 'line-1',
    category: 'pharmacie',
    drug: 'Paracétamol 1 g IV',
    dosage: '1 g',
    route: 'IV',
    frequency: 'toutes les 6 h',
    duration: '3 j',
    hours: ['06:00', '12:00', '18:00', '00:00'],
    start: '17/10/2026 12:00',
    type: 'systematique',
    nurseNote: 'Ne pas dépasser 4 g / 24 h. Réévaluer la douleur (EVA) avant chaque prise.',
    maxPerDay: '4 g (max. 4 g*)',
    maxTotal: '12 flacons',
    quantityLabel: '12 flacons · consigne : max 4 g / 24 h',
    unitPrice: 500,
    lineTotal: 6000,
    status: 'brouillon',
    pennySituations: '12 flacons · consigne : max 4 g / 24 h',
  },
  {
    id: 'line-2',
    category: 'pharmacie',
    drug: 'Céfazoline 2 g IV',
    dosage: '2 g',
    route: 'IV',
    frequency: 'toutes les 8 h',
    duration: '48 h',
    hours: ['06:00', '14:00', '22:00'],
    start: '17/10/2026 06:00',
    type: 'systematique',
    nurseNote: 'Antibioprophylaxie — alternative validée en cas d\'allergie à la pénicilline.',
    quantityLabel: '6 flacons · antibioprophylaxie',
    unitPrice: 1250,
    lineTotal: 7500,
    status: 'signee',
  },
  {
    id: 'line-3',
    category: 'pharmacie',
    drug: 'Enoxaparine 4 000 UI SC',
    dosage: '4 000 UI',
    route: 'SC',
    frequency: '1 / jour',
    duration: '10 j',
    hours: ['08:00'],
    start: '17/10/2026 08:00',
    type: 'systematique',
    nurseNote: '',
    quantityLabel: '10 seringues préremplies',
    unitPrice: 2100,
    lineTotal: 21000,
    status: 'signee',
  },
  {
    id: 'line-4',
    category: 'pharmacie',
    drug: 'Spasfon 40 mg IV',
    dosage: '40 mg',
    route: 'IV',
    frequency: 'si douleur, max 3 / jour',
    duration: '3 j',
    hours: [],
    start: '17/10/2026',
    type: 'besoin',
    nurseNote: '',
    quantityLabel: '6 ampoules',
    unitPrice: 450,
    lineTotal: 2700,
    status: 'signee',
  },
  {
    id: 'line-5',
    category: 'infirmier',
    drug: 'Constantes (TA, pouls, T°, durée)',
    dosage: '',
    route: '',
    frequency: 'toutes les 4 h',
    duration: '',
    hours: ['06:00', '10:00', '14:00', '18:00', '22:00'],
    start: '17/10/2026 06:00',
    type: 'systematique',
    nurseNote: '',
    quantityLabel: 'Plan de soins',
    unitPrice: 0,
    lineTotal: 0,
    status: 'signee',
  },
  {
    id: 'line-6',
    category: 'infirmier',
    drug: 'Pansement de cicatrice',
    dosage: '',
    route: '',
    frequency: '2 j puis tous les 2 j',
    duration: '',
    hours: [],
    start: '17/10/2026',
    type: 'systematique',
    nurseNote: '',
    quantityLabel: 'Plan de soins',
    unitPrice: 0,
    lineTotal: 0,
    status: 'signee',
  },
  {
    id: 'line-7',
    category: 'infirmier',
    drug: 'Retrait sonde urinaire',
    dosage: '',
    route: '',
    frequency: '',
    duration: '',
    hours: [],
    start: '17/10 à 08:00',
    type: 'systematique',
    nurseNote: '',
    quantityLabel: 'Acte unique',
    unitPrice: 0,
    lineTotal: 0,
    status: 'signee',
  },
  {
    id: 'line-8',
    category: 'laboratoire',
    drug: 'NFS + plaquettes',
    dosage: '',
    route: '',
    frequency: '',
    duration: '',
    hours: [],
    start: '17/10 07:00',
    type: 'systematique',
    nurseNote: '',
    quantityLabel: 'Prélèvement sanguin',
    unitPrice: 8500,
    lineTotal: 8500,
    status: 'signee',
  },
  {
    id: 'line-9',
    category: 'laboratoire',
    drug: 'CRP',
    dosage: '',
    route: '',
    frequency: '',
    duration: '',
    hours: [],
    start: '18/10 07:00',
    type: 'systematique',
    nurseNote: '',
    quantityLabel: 'Prélèvement sanguin',
    unitPrice: 5000,
    lineTotal: 5000,
    status: 'brouillon',
  },
  {
    id: 'line-10',
    category: 'laboratoire',
    drug: 'Groupe sanguin + RAI',
    dosage: '',
    route: '',
    frequency: '',
    duration: '',
    hours: [],
    start: '17/10',
    type: 'systematique',
    nurseNote: '',
    quantityLabel: 'Prélèvement sanguin',
    unitPrice: 6500,
    lineTotal: 6500,
    status: 'signee',
  },
  {
    id: 'line-11',
    category: 'imagerie',
    drug: 'Échographie pelvienne',
    dosage: '',
    route: '',
    frequency: '',
    duration: '',
    hours: [],
    start: '19/10',
    type: 'systematique',
    nurseNote: 'avant sortie · résidus',
    quantityLabel: 'Examen programmé',
    unitPrice: 25000,
    lineTotal: 25000,
    status: 'signee',
  },
  {
    id: 'line-12',
    category: 'medical',
    drug: 'Visite post-opératoire',
    dosage: '',
    route: '',
    frequency: '',
    duration: '',
    hours: [],
    start: '18/10',
    type: 'systematique',
    nurseNote: 'gynécologue',
    quantityLabel: 'Acte médical',
    unitPrice: 10000,
    lineTotal: 10000,
    status: 'signee',
  },
];

export const CATEGORY_META: Record<
  ProtocolPrescriptionLine['category'],
  { label: string; emoji: string }
> = {
  pharmacie: { label: 'Pharmacie', emoji: '💊' },
  infirmier: { label: 'Actes infirmiers', emoji: '🧑‍⚕️' },
  laboratoire: { label: 'Laboratoire', emoji: '🧪' },
  imagerie: { label: 'Imagerie', emoji: '🩻' },
  medical: { label: 'Actes médicaux', emoji: '🩺' },
};

export const CATEGORY_ORDER: ProtocolPrescriptionLine['category'][] = [
  'pharmacie',
  'infirmier',
  'laboratoire',
  'imagerie',
  'medical',
];

export const drugFavorites = [
  'Spasfon 40 mg IV',
  'Ocytocine 10 UI',
  'Fer injectable',
  'Enoxaparine 4 000 UI',
];

export interface DrugSuggestion {
  id: string;
  label: string;
  form: string;
  stockLevel: 'in-stock' | 'low' | 'out';
  stockLabel: string;
}

export const drugSuggestions: DrugSuggestion[] = [
  {
    id: 'drug-1',
    label: 'Paracétamol 1 g · solution injectable IV · flacon 100 mL',
    form: 'Paracétamol',
    stockLevel: 'in-stock',
    stockLabel: 'Stock 142',
  },
  {
    id: 'drug-2',
    label: 'Paracétamol 500 mg · comprimé',
    form: 'Paracétamol',
    stockLevel: 'in-stock',
    stockLabel: 'Stock 860',
  },
  {
    id: 'drug-3',
    label: 'Paracétamol + codéine 500/30 mg · comprimé',
    form: 'Paracétamol',
    stockLevel: 'out',
    stockLabel: 'Rupture',
  },
];
