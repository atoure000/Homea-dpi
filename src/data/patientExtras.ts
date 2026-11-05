/* ── Onglets du dossier patient (partagé écran ↔ données) ─────────── */

export type PatientTabId =
  | 'overview'
  | 'venues'
  | 'consultations'
  | 'hospitalisations'
  | 'prescriptions'
  | 'imaging'
  | 'lab'
  | 'documents'
  | 'forms'
  | 'history'
  | 'medical-file'
  | 'resume'
  | 'nursing';

/* ── Formulaires paramétrables ─────────────────────────────────────── */

export type FieldType = 'text' | 'textarea' | 'number' | 'date' | 'select' | 'checkbox';

export interface FormFieldDef {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  placeholder?: string;
  required?: boolean;
  span?: 1 | 2;
  unit?: string;
}

export interface FormSectionDef {
  id: string;
  title: string;
  subtitle?: string;
  fields: FormFieldDef[];
}

export interface FormTemplate {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  sections: FormSectionDef[];
}

const yesNo = ['Oui', 'Non'];

export const formTemplates: FormTemplate[] = [
  {
    id: 'tpl-hosp',
    code: 'FRM-HOSP',
    name: "Avis d'hospitalisation",
    description: "Demande et avis motivé d'admission pour mise en observation ou hospitalisation.",
    category: 'Hospitalisation',
    sections: [
      {
        id: 'hosp-demand',
        title: 'Demande',
        subtitle: 'Origine de la demande et motif',
        fields: [
          { key: 'doctor', label: 'Médecin demandeur', type: 'text', required: true },
          { key: 'service', label: 'Service demandeur', type: 'text' },
          { key: 'requestDate', label: 'Date de la demande', type: 'date', required: true },
          { key: 'reason', label: "Motif d'hospitalisation", type: 'textarea', required: true, span: 2 },
          { key: 'priority', label: 'Degré d\'urgence', type: 'select', options: ['Programmé', 'Urgent', 'Très urgent'] },
          { key: 'plannedUnit', label: 'Unité d\'accueil souhaitée', type: 'text' },
        ],
      },
      {
        id: 'hosp-clinical',
        title: 'Éléments cliniques',
        subtitle: 'Synthèse ayant conduit à la décision',
        fields: [
          { key: 'context', label: 'Contexte et antécédents (fictifs)', type: 'textarea', span: 2 },
          { key: 'examination', label: 'Examen clinique', type: 'textarea', span: 2 },
          { key: 'vitals', label: 'Constantes relevées', type: 'text' },
          { key: 'exams', label: 'Examens complémentaires disponibles', type: 'textarea', span: 2 },
        ],
      },
      {
        id: 'hosp-decision',
        title: 'Décision',
        subtitle: 'Conduite retenue',
        fields: [
          { key: 'decision', label: 'Décision', type: 'select', options: ['Hospitalisation acceptée', 'Mise en observation', 'Refusée', 'En attente'] },
          { key: 'unit', label: 'Unité retenue', type: 'text' },
          { key: 'treatment', label: 'Traitement d\'attente (fictif)', type: 'textarea', span: 2 },
          { key: 'observations', label: 'Observations', type: 'textarea', span: 2 },
          { key: 'signed', label: 'Signature du médecin', type: 'checkbox' },
        ],
      },
    ],
  },
  {
    id: 'tpl-refus',
    code: 'FRM-REFUS',
    name: 'Refus de soins',
    description: 'Constat du refus d\'un acte ou d\'une prise en charge proposée, remis au patient.',
    category: 'Éthique et droit',
    sections: [
      {
        id: 'refus-context',
        title: 'Contexte',
        fields: [
          { key: 'doctor', label: 'Praticien', type: 'text', required: true },
          { key: 'date', label: 'Date du constat', type: 'date', required: true },
          { key: 'time', label: 'Heure', type: 'text' },
          { key: 'proposedCare', label: 'Acte ou soin proposé', type: 'textarea', required: true, span: 2 },
          { key: 'indication', label: 'Indication médicale', type: 'textarea', span: 2 },
        ],
      },
      {
        id: 'refus-info',
        title: 'Information délivrée',
        subtitle: 'Informations transmises au patient avant sa décision',
        fields: [
          { key: 'risksExplained', label: 'Risques et conséquences expliqués', type: 'select', options: yesNo },
          { key: 'alternatives', label: 'Alternatives proposées', type: 'textarea', span: 2 },
          { key: 'comprehension', label: 'Compréhension vérifiée', type: 'select', options: yesNo },
          { key: 'questions', label: 'Questions posées par le patient', type: 'textarea', span: 2 },
        ],
      },
      {
        id: 'refus-conclusion',
        title: 'Déclaration',
        fields: [
          { key: 'reason', label: 'Motif invoqué par le patient', type: 'textarea', span: 2 },
          { key: 'followUp', label: 'Suivi proposé', type: 'textarea', span: 2 },
          { key: 'witness', label: 'Témoin éventuel (fictif)', type: 'text' },
          { key: 'signed', label: 'Signature du patient recueillie', type: 'checkbox' },
        ],
      },
    ],
  },
  {
    id: 'tpl-consent',
    code: 'FRM-CONS',
    name: 'Consentement éclairé — acte chirurgical',
    description: 'Recueil du consentement avant un acte chirurgical ou invasif.',
    category: 'Bloc opératoire',
    sections: [
      {
        id: 'consent-act',
        title: 'Acte concerné',
        fields: [
          { key: 'surgeon', label: 'Chirurgien', type: 'text', required: true },
          { key: 'date', label: 'Date', type: 'date', required: true },
          { key: 'actLabel', label: 'Libellé de l\'intervention', type: 'textarea', required: true, span: 2 },
          { key: 'anesthesia', label: 'Type d\'anesthésie prévue', type: 'select', options: ['Générale', 'Rachianesthésie', 'Locale', 'À préciser'] },
          { key: 'scheduledDate', label: 'Date prévue de l\'intervention', type: 'date' },
        ],
      },
      {
        id: 'consent-info',
        title: 'Information préalable',
        fields: [
          { key: 'benefits', label: 'Bénéfices attendus', type: 'textarea', span: 2 },
          { key: 'risks', label: 'Risques connus', type: 'textarea', span: 2 },
          { key: 'alternatives', label: 'Alternatives', type: 'textarea', span: 2 },
          { key: 'questions', label: 'Questions du patient', type: 'textarea', span: 2 },
        ],
      },
      {
        id: 'consent-sign',
        title: 'Signature',
        fields: [
          { key: 'consentGiven', label: 'Consentement recueilli', type: 'select', options: ['Oui', 'Non', 'Reporté'] },
          { key: 'representative', label: 'Représentant légal (si applicable)', type: 'text' },
          { key: 'observations', label: 'Observations', type: 'textarea', span: 2 },
          { key: 'signed', label: 'Document signé', type: 'checkbox' },
        ],
      },
    ],
  },
  {
    id: 'tpl-sortie',
    code: 'FRM-SORTIE',
    name: 'Sortie contre avis médical',
    description: 'Décharge signée lorsque le patient quitte l\'établissement contre l\'avis de l\'équipe.',
    category: 'Hospitalisation',
    sections: [
      {
        id: 'sortie-context',
        title: 'Contexte de sortie',
        fields: [
          { key: 'doctor', label: 'Médecin référent', type: 'text', required: true },
          { key: 'date', label: 'Date et heure de sortie', type: 'text', required: true },
          { key: 'unit', label: 'Unité d\'hospitalisation', type: 'text' },
          { key: 'medicalAdvice', label: 'Avis médical donné', type: 'textarea', required: true, span: 2 },
          { key: 'stateAtExit', label: 'État clinique au moment de la sortie', type: 'textarea', span: 2 },
        ],
      },
      {
        id: 'sortie-info',
        title: 'Informations et risques',
        fields: [
          { key: 'risks', label: 'Risques encourus expliqués', type: 'textarea', span: 2 },
          { key: 'recommendations', label: 'Recommandations remises', type: 'textarea', span: 2 },
          { key: 'returnConditions', label: 'Conditions de retour', type: 'textarea', span: 2 },
          { key: 'contact', label: 'Contact en cas d\'aggravation', type: 'text' },
          { key: 'signed', label: 'Décharge signée', type: 'checkbox' },
        ],
      },
    ],
  },
  {
    id: 'tpl-liaison',
    code: 'FRM-LIAISON',
    name: 'Fiche de liaison inter-services',
    description: 'Transmission d\'un patient entre deux services ou unités de soins.',
    category: 'Coordination',
    sections: [
      {
        id: 'liaison-routing',
        title: 'Acheminement',
        fields: [
          { key: 'fromService', label: 'Service d\'origine', type: 'text', required: true },
          { key: 'toService', label: 'Service destinataire', type: 'text', required: true },
          { key: 'date', label: 'Date de transmission', type: 'date', required: true },
          { key: 'transport', label: 'Moyen de transport', type: 'select', options: ['À pied', 'Fauteuil', 'Brancard', 'Ambulance'] },
          { key: 'accompaniment', label: 'Accompagnement', type: 'text' },
        ],
      },
      {
        id: 'liaison-content',
        title: 'Synthèse transmise',
        fields: [
          { key: 'reason', label: 'Motif de la transmission', type: 'textarea', required: true, span: 2 },
          { key: 'history', label: 'Antécédents et histoire (fictifs)', type: 'textarea', span: 2 },
          { key: 'currentState', label: 'État actuel', type: 'textarea', span: 2 },
          { key: 'vitals', label: 'Constantes', type: 'text' },
          { key: 'treatments', label: 'Traitements en cours (fictifs)', type: 'textarea', span: 2 },
          { key: 'watchPoints', label: 'Points de vigilance', type: 'textarea', span: 2 },
          { key: 'examsPending', label: 'Examens en attente', type: 'textarea', span: 2 },
        ],
      },
    ],
  },
  {
    id: 'tpl-examen',
    code: 'FRM-EXAM',
    name: "Demande d'examen complémentaire",
    description: 'Bon de demande transmis au laboratoire ou au service d\'imagerie.',
    category: 'Examens',
    sections: [
      {
        id: 'exam-request',
        title: 'Demande',
        fields: [
          { key: 'doctor', label: 'Médecin prescripteur', type: 'text', required: true },
          { key: 'date', label: 'Date de la demande', type: 'date', required: true },
          { key: 'destination', label: 'Service destinataire', type: 'select', options: ['Laboratoire', 'Imagerie', 'Explorations fonctionnelles'] },
          { key: 'exams', label: 'Examens demandés', type: 'textarea', required: true, span: 2 },
          { key: 'indication', label: 'Renseignements cliniques', type: 'textarea', span: 2 },
          { key: 'urgency', label: 'Urgence', type: 'select', options: ['Normale', 'Urgente'] },
          { key: 'priorResults', label: 'Résultats antérieurs utiles (fictifs)', type: 'textarea', span: 2 },
        ],
      },
    ],
  },
  {
    id: 'tpl-pec',
    code: 'FRM-PEC',
    name: 'Attestation de prise en charge (fictive)',
    description: 'Attestation d\'ouverture de prise en charge remise à l\'assurance.',
    category: 'Administratif',
    sections: [
      {
        id: 'pec-cover',
        title: 'Prise en charge',
        fields: [
          { key: 'insurer', label: 'Organisme assureur (fictif)', type: 'text', required: true },
          { key: 'insuredNumber', label: 'Numéro d\'assuré (fictif)', type: 'text' },
          { key: 'date', label: 'Date d\'établissement', type: 'date', required: true },
          { key: 'episode', label: 'Épisode de soins', type: 'text' },
          { key: 'coveredCare', label: 'Prestations couvertes', type: 'textarea', required: true, span: 2 },
          { key: 'rate', label: 'Taux de prise en charge (%)', type: 'number' },
          { key: 'validUntil', label: 'Fin de validité (fictive)', type: 'date' },
          { key: 'observations', label: 'Observations', type: 'textarea', span: 2 },
        ],
      },
    ],
  },
];

export type PatientFormStatus = 'brouillon' | 'complete' | 'signe';

export interface PatientForm {
  id: string;
  templateId: string;
  patientId: string;
  date: string;
  time: string;
  author: string;
  status: PatientFormStatus;
  values: Record<string, string>;
}

export const FORM_STATUS_META: Record<PatientFormStatus, { label: string; color: 'navy' | 'green' | 'amber' }> = {
  brouillon: { label: 'Brouillon', color: 'amber' },
  complete: { label: 'Complété', color: 'navy' },
  signe: { label: 'Signé', color: 'green' },
};

/* ── Modèles de comptes rendus d'imagerie ──────────────────────────── */

export interface ImagingModel {
  id: string;
  code: string;
  name: string;
  modality: string;
  region: string;
  sections: FormSectionDef[];
}

export const imagingModels: ImagingModel[] = [
  {
    id: 'mod-echo-obs',
    code: 'IMG-ECHO-OBS',
    name: 'Compte rendu — échographie obstétricale',
    modality: 'Échographie',
    region: 'Obstétrique',
    sections: [
      {
        id: 'obs-indication',
        title: 'Indication et technique',
        fields: [
          { key: 'indication', label: 'Indication', type: 'textarea', required: true, span: 2 },
          { key: 'gestationalAge', label: 'Âge gestationnel', type: 'text', placeholder: 'Ex : 28 SA + 3 j' },
          { key: 'probe', label: 'Voie d\'exploration', type: 'select', options: ['Abdominale', 'Endovaginale', 'Mixte'] },
          { key: 'technique', label: 'Conditions de réalisation', type: 'text' },
        ],
      },
      {
        id: 'obs-biometry',
        title: 'Biométrie fœtale',
        fields: [
          { key: 'bip', label: 'BIP', type: 'number', unit: 'mm' },
          { key: 'pc', label: 'Périmètre crânien', type: 'number', unit: 'mm' },
          { key: 'pa', label: 'Périmètre abdominal', type: 'number', unit: 'mm' },
          { key: 'lf', label: 'Longueur fémorale', type: 'number', unit: 'mm' },
          { key: 'estWeight', label: 'Poids fœtal estimé', type: 'number', unit: 'g' },
          { key: 'presentation', label: 'Présentation', type: 'select', options: ['Céphalique', 'Siège', 'Transverse'] },
          { key: 'fetalHeart', label: 'Activité cardiaque fœtale', type: 'number', unit: 'bpm' },
          { key: 'movements', label: 'Mouvements actifs', type: 'select', options: ['Perçus', 'Non perçus'] },
        ],
      },
      {
        id: 'obs-annexes',
        title: 'Annexes',
        fields: [
          { key: 'placenta', label: 'Placenta', type: 'text' },
          { key: 'amnioticFluid', label: 'Liquide amniotique', type: 'select', options: ['Normal', 'Diminué', 'Augmenté'] },
          { key: 'cord', label: 'Cordon', type: 'text' },
          { key: 'cervix', label: 'Col utérin', type: 'text' },
        ],
      },
      {
        id: 'obs-conclusion',
        title: 'Conclusion',
        fields: [
          { key: 'findings', label: 'Résultats', type: 'textarea', span: 2 },
          { key: 'conclusion', label: 'Conclusion', type: 'textarea', required: true, span: 2 },
          { key: 'recommendation', label: 'Conduite à tenir / prochain contrôle', type: 'textarea', span: 2 },
        ],
      },
    ],
  },
  {
    id: 'mod-rad-thorax',
    code: 'IMG-RAD-THX',
    name: 'Compte rendu — radiographie thoracique',
    modality: 'Radiographie',
    region: 'Thorax',
    sections: [
      {
        id: 'thx-technique',
        title: 'Indication et technique',
        fields: [
          { key: 'indication', label: 'Indication', type: 'textarea', required: true, span: 2 },
          { key: 'incidence', label: 'Incidence', type: 'select', options: ['Face seule', 'Face et profil', 'Décubitus'] },
          { key: 'quality', label: 'Qualité du cliché', type: 'select', options: ['Bonne', 'Acceptable', 'Limite'] },
        ],
      },
      {
        id: 'thx-results',
        title: 'Résultats',
        fields: [
          { key: 'lungs', label: 'Champs pulmonaires', type: 'textarea', span: 2 },
          { key: 'pleura', label: 'Plèvres', type: 'textarea', span: 2 },
          { key: 'mediastinum', label: 'Médiastin et silhouette cardiaque', type: 'textarea', span: 2 },
          { key: 'bones', label: 'Structure osseuse et parties molles', type: 'textarea', span: 2 },
        ],
      },
      {
        id: 'thx-conclusion',
        title: 'Conclusion',
        fields: [
          { key: 'conclusion', label: 'Conclusion', type: 'textarea', required: true, span: 2 },
          { key: 'recommendation', label: 'Conduite à tenir', type: 'textarea', span: 2 },
        ],
      },
    ],
  },
  {
    id: 'mod-scanner-cerebral',
    code: 'IMG-CT-CRAN',
    name: 'Compte rendu — scanner cérébral',
    modality: 'Scanner',
    region: 'Crâne et encéphale',
    sections: [
      {
        id: 'cr-technique',
        title: 'Indication et technique',
        fields: [
          { key: 'indication', label: 'Indication', type: 'textarea', required: true, span: 2 },
          { key: 'protocol', label: 'Protocole', type: 'select', options: ['Sans injection', 'Avec injection', 'Angio-TDM'] },
          { key: 'slice', label: 'Épaisseur de coupe', type: 'number', unit: 'mm' },
        ],
      },
      {
        id: 'cr-results',
        title: 'Résultats',
        fields: [
          { key: 'parenchyma', label: 'Parenchyme cérébral', type: 'textarea', span: 2 },
          { key: 'ventricles', label: 'Système ventriculaire', type: 'textarea', span: 2 },
          { key: 'midline', label: 'Ligne médiane', type: 'text' },
          { key: 'spaces', label: 'Espaces sous-arachnoïdiens', type: 'text' },
          { key: 'bones', label: 'Voute et base du crâne', type: 'textarea', span: 2 },
          { key: 'sinuses', label: 'Sinus et fosses nasales', type: 'text' },
        ],
      },
      {
        id: 'cr-conclusion',
        title: 'Conclusion',
        fields: [
          { key: 'conclusion', label: 'Conclusion', type: 'textarea', required: true, span: 2 },
          { key: 'recommendation', label: 'Conduite à tenir', type: 'textarea', span: 2 },
        ],
      },
    ],
  },
  {
    id: 'mod-echo-abdo',
    code: 'IMG-ECHO-ABD',
    name: 'Compte rendu — échographie abdominale',
    modality: 'Échographie',
    region: 'Abdomen',
    sections: [
      {
        id: 'abd-indication',
        title: 'Indication et technique',
        fields: [
          { key: 'indication', label: 'Indication', type: 'textarea', required: true, span: 2 },
          { key: 'preparation', label: 'Préparation', type: 'select', options: ['À jeun', 'Sans préparation'] },
        ],
      },
      {
        id: 'abd-organs',
        title: 'Organes explorés',
        fields: [
          { key: 'liver', label: 'Foie', type: 'textarea', span: 2 },
          { key: 'biliary', label: 'Voies biliaires et vésicule', type: 'textarea', span: 2 },
          { key: 'pancreas', label: 'Pancréas', type: 'textarea', span: 2 },
          { key: 'kidneys', label: 'Reins', type: 'textarea', span: 2 },
          { key: 'spleen', label: 'Rate', type: 'textarea', span: 2 },
          { key: 'aorta', label: 'Aorte et vaisseaux', type: 'text' },
          { key: 'effusion', label: 'Épanchement', type: 'select', options: ['Absent', 'Faible', 'Modéré', 'Important'] },
        ],
      },
      {
        id: 'abd-conclusion',
        title: 'Conclusion',
        fields: [
          { key: 'conclusion', label: 'Conclusion', type: 'textarea', required: true, span: 2 },
          { key: 'recommendation', label: 'Conduite à tenir', type: 'textarea', span: 2 },
        ],
      },
    ],
  },
  {
    id: 'mod-echo-pelvis',
    code: 'IMG-ECHO-PELV',
    name: 'Compte rendu — échographie pelvienne',
    modality: 'Échographie',
    region: 'Pelvis',
    sections: [
      {
        id: 'pel-indication',
        title: 'Indication et technique',
        fields: [
          { key: 'indication', label: 'Indication', type: 'textarea', required: true, span: 2 },
          { key: 'route', label: 'Voie d\'exploration', type: 'select', options: ['Abdominale', 'Endovaginale', 'Mixte'] },
          { key: 'bladder', label: 'Répétion vésicale', type: 'text' },
        ],
      },
      {
        id: 'pel-results',
        title: 'Résultats',
        fields: [
          { key: 'uterus', label: 'Utérus', type: 'textarea', span: 2 },
          { key: 'endometrium', label: 'Endomètre', type: 'text' },
          { key: 'ovaries', label: 'Ovaires', type: 'textarea', span: 2 },
          { key: 'culDeSac', label: 'Cul-de-sac de Douglas', type: 'text' },
          { key: 'vascularization', label: 'Vascularisation au Doppler', type: 'text' },
        ],
      },
      {
        id: 'pel-conclusion',
        title: 'Conclusion',
        fields: [
          { key: 'conclusion', label: 'Conclusion', type: 'textarea', required: true, span: 2 },
          { key: 'recommendation', label: 'Conduite à tenir', type: 'textarea', span: 2 },
        ],
      },
    ],
  },
  {
    id: 'mod-rad-rachis',
    code: 'IMG-RAD-LOMB',
    name: 'Compte rendu — radiographie du rachis lombaire',
    modality: 'Radiographie',
    region: 'Rachis',
    sections: [
      {
        id: 'lomb-indication',
        title: 'Indication et technique',
        fields: [
          { key: 'indication', label: 'Indication', type: 'textarea', required: true, span: 2 },
          { key: 'incidences', label: 'Incidences réalisées', type: 'text', placeholder: 'Face, profil, obliques' },
        ],
      },
      {
        id: 'lomb-results',
        title: 'Résultats',
        fields: [
          { key: 'alignment', label: 'Statique rachidienne', type: 'textarea', span: 2 },
          { key: 'discs', label: 'Espaces discaux', type: 'textarea', span: 2 },
          { key: 'vertebrae', label: 'Corps vertébraux', type: 'textarea', span: 2 },
          { key: 'joints', label: 'Articulations postérieures', type: 'text' },
          { key: 'softTissues', label: 'Parties molles', type: 'text' },
        ],
      },
      {
        id: 'lomb-conclusion',
        title: 'Conclusion',
        fields: [
          { key: 'conclusion', label: 'Conclusion', type: 'textarea', required: true, span: 2 },
          { key: 'recommendation', label: 'Conduite à tenir', type: 'textarea', span: 2 },
        ],
      },
    ],
  },
];

export type ImagingReportStatus = 'brouillon' | 'complete' | 'valide';

export interface ImagingReport {
  id: string;
  patientId: string;
  modelId: string;
  date: string;
  time: string;
  radiologist: string;
  status: ImagingReportStatus;
  values: Record<string, string>;
}

export const IMAGING_STATUS_META: Record<ImagingReportStatus, { label: string; color: 'navy' | 'green' | 'amber' }> = {
  brouillon: { label: 'Brouillon', color: 'amber' },
  complete: { label: 'Complété', color: 'navy' },
  valide: { label: 'Validé', color: 'green' },
};

/* ── Documents rattachés au patient ────────────────────────────────── */

export interface PatientDocument {
  id: string;
  patientId: string;
  kind: string;
  label: string;
  date: string;
  format: string;
  reference?: string;
  tab: PatientTabId;
}

export const staticPatientDocuments: PatientDocument[] = [
  { id: 'doc-cmu-p001', patientId: 'p001', kind: 'Carte CMU', label: 'Copie carte CMU', date: '2026-09-14', format: 'JPG · 450 Ko', reference: 'CMU-4471', tab: 'documents' },
  { id: 'doc-id-p001', patientId: 'p001', kind: "Pièce d'identité", label: 'CNI — recto/verso', date: '2026-09-14', format: 'PDF · 1 page', tab: 'documents' },
  { id: 'doc-consent-p001', patientId: 'p001', kind: 'Consentement', label: 'Consentement éclairé — hospitalisation', date: '2026-09-14', format: 'PDF · 2 pages', tab: 'forms' },
  { id: 'doc-cmu-p002', patientId: 'p002', kind: 'Carte CMU', label: 'Copie carte CMU', date: '2026-09-12', format: 'JPG · 410 Ko', reference: 'CMU-5120', tab: 'documents' },
  { id: 'doc-id-p002', patientId: 'p002', kind: "Pièce d'identité", label: 'Passeport — page principale', date: '2026-09-12', format: 'PDF · 1 page', tab: 'documents' },
  { id: 'doc-cmu-p004', patientId: 'p004', kind: 'Carte CMU', label: 'Copie carte CMU', date: '2026-09-11', format: 'JPG · 480 Ko', reference: 'CMU-2260', tab: 'documents' },
  { id: 'doc-consent-p004', patientId: 'p004', kind: 'Consentement', label: "Consentement — exploration cardiaque", date: '2026-09-11', format: 'PDF · 2 pages', tab: 'forms' },
  { id: 'doc-courrier-p004', patientId: 'p004', kind: 'Courrier', label: "Courrier d'adressage cardiologie", date: '2026-09-10', format: 'PDF · 1 page', tab: 'documents' },
  { id: 'doc-id-p005', patientId: 'p005', kind: "Pièce d'identité", label: 'CNI — recto/verso', date: '2026-09-10', format: 'PDF · 1 page', tab: 'documents' },
  { id: 'doc-pec-p005', patientId: 'p005', kind: 'Prise en charge', label: 'Attestation de prise en charge (fictive)', date: '2026-09-10', format: 'PDF · 1 page', reference: 'PEC-2026-118', tab: 'forms' },
  { id: 'doc-cmu-p009', patientId: 'p009', kind: 'Carte CMU', label: 'Copie carte CMU', date: '2026-09-13', format: 'JPG · 430 Ko', reference: 'CMU-7781', tab: 'documents' },
  { id: 'doc-consent-p009', patientId: 'p009', kind: 'Consentement', label: "Consentement — exploration gynécologique", date: '2026-09-13', format: 'PDF · 2 pages', tab: 'forms' },
];

/* ── Formulaires et comptes rendus de démonstration ───────────────── */

export const demoPatientForms: PatientForm[] = [
  {
    id: 'pf-001',
    templateId: 'tpl-hosp',
    patientId: 'p001',
    date: '2026-09-14',
    time: '08:40',
    author: 'Dr. Kouadio N\'Guessan',
    status: 'complete',
    values: {
      doctor: 'Dr. Kouadio N\'Guessan',
      service: 'Médecine interne',
      requestDate: '2026-09-14',
      reason: 'Céphalées persistantes avec vertiges et tension artérielle élevée malgré le traitement',
      priority: 'Urgent',
      plannedUnit: 'Unité d\'hospitalisation — Médecine interne',
      context: 'Hypertension artérielle connue, traitement irrégulier (fictif)',
      examination: 'Patiente consciente, orientée, pas de déficit neurologique',
      vitals: 'TA 145/90 mmHg, FC 78 bpm, T° 36,8 °C, SpO₂ 98 %',
      exams: 'NFS et glycémie à jeun en cours',
      decision: 'Mise en observation',
      unit: 'Médecine interne',
      treatment: 'Surveillance tensionnelle rapprochée (fictif)',
      observations: 'Bilan étiologique en cours',
    },
  },
  {
    id: 'pf-002',
    templateId: 'tpl-refus',
    patientId: 'p001',
    date: '2026-09-15',
    time: '11:20',
    author: 'Dr. Kouadio N\'Guessan',
    status: 'brouillon',
    values: {
      doctor: 'Dr. Kouadio N\'Guessan',
      date: '2026-09-15',
      time: '11:20',
      proposedCare: 'Hospitalisation pour bilan complémentaire et mise au repos',
      indication: 'Céphalées persistantes nécessitant une surveillance',
      risksExplained: 'Oui',
      alternatives: 'Hospitalisation de jour, surveillance ambulatoire (fictive)',
      comprehension: 'Oui',
    },
  },
  {
    id: 'pf-003',
    templateId: 'tpl-consent',
    patientId: 'p004',
    date: '2026-09-11',
    time: '09:05',
    author: 'Dr. Kouadio N\'Guessan',
    status: 'signe',
    values: {
      surgeon: 'Dr. Kouadio N\'Guessan',
      date: '2026-09-11',
      actLabel: 'Coronarographie diagnostique (fictive)',
      anesthesia: 'Locale',
      scheduledDate: '2026-09-18',
      benefits: 'Préciser l\'état des artères coronaires et orienter la prise en charge',
      risks: 'Hématome au point de ponction, réaction au produit de contraste (fictif)',
      alternatives: 'Poursuite du traitement médical seul',
      questions: 'Durée de l\'examen et reprise des activités',
      consentGiven: 'Oui',
      observations: 'Patient informé en présence de son épouse',
      signed: 'oui',
    },
  },
  {
    id: 'pf-004',
    templateId: 'tpl-liaison',
    patientId: 'p005',
    date: '2026-09-12',
    time: '10:35',
    author: 'Dr. Adjoua Brou',
    status: 'complete',
    values: {
      fromService: 'Urgences',
      toService: 'Pneumologie',
      date: '2026-09-12',
      transport: 'Fauteuil',
      accompaniment: 'Infirmier de service',
      reason: 'Crise d\'asthme aiguë nécessitant une surveillance en pneumologie',
      history: 'Asthme depuis l\'enfance, hospitalisation en 2024 (fictif)',
      currentState: 'Dyspnée en amélioration après bronchodilatateurs',
      vitals: 'FR 20/min, SpO₂ 96 % sous air, FC 92 bpm',
      treatments: 'Bronchodilatateurs en nébulisation, corticothérapie courte (fictif)',
      watchPoints: 'Surveillance de la saturation et de la fréquence respiratoire',
      examsPending: 'Radiographie thoracique et spirométrie à programmer',
    },
  },
  {
    id: 'pf-005',
    templateId: 'tpl-pec',
    patientId: 'p005',
    date: '2026-09-10',
    time: '08:55',
    author: 'Mme Traoré (Facturation)',
    status: 'signe',
    values: {
      insurer: 'NSIA (fictif)',
      insuredNumber: 'NSIA-2026-5678',
      date: '2026-09-10',
      episode: 'SEJ-2026-0012',
      coveredCare: 'Journées d\'hospitalisation, examens de laboratoire et imagerie autorisés',
      rate: '80',
      validUntil: '2026-09-30',
      observations: 'Prise en charge fictive — aucune vérification réelle effectuée',
    },
  },
];

export const demoImagingReports: ImagingReport[] = [
  {
    id: 'ir-001',
    patientId: 'p001',
    modelId: 'mod-echo-abdo',
    date: '2026-09-14',
    time: '15:10',
    radiologist: 'Dr. Serges Kouamé',
    status: 'valide',
    values: {
      indication: 'Douleurs abdominales diffuses et bilan d\'hypertension artérielle',
      preparation: 'À jeun',
      liver: 'Foie de taille normale, échostructure homogène, pas de lésion focale',
      biliary: 'Vésicule alithiasique à parois fines, voies biliaires non dilatées',
      pancreas: 'Pancréas partiellement visible, d\'aspect habituel',
      kidneys: 'Reins de taille normale, pas de dilatation pyélo-calicielle',
      spleen: 'Rate de taille normale',
      aorta: 'Aorte abdominale de calibre normal',
      effusion: 'Absent',
      conclusion: 'Examen échographique abdominal sans anomalie notable',
      recommendation: 'Aucun contrôle échographique nécessaire en l\'absence de nouvelle symptomatologie',
    },
  },
  {
    id: 'ir-002',
    patientId: 'p005',
    modelId: 'mod-rad-thorax',
    date: '2026-09-11',
    time: '11:25',
    radiologist: 'Dr. Serges Kouamé',
    status: 'valide',
    values: {
      indication: 'Crise d\'asthme, recherche de foyer infectieux',
      incidence: 'Face et profil',
      quality: 'Bonne',
      lungs: 'Distension thoracique modérée, pas de foyer parenchymateux individualisé',
      pleura: 'Pas d\'épanchement pleural, pas de pneumothorax',
      mediastinum: 'Silhouette cardiaque de taille normale, médiastin libre',
      bones: 'Pas de lésion osseuse visible',
      conclusion: 'Distension thoracique sur bronchopathie obstructive, sans foyer infectieux',
      recommendation: 'Traitement bronchodilatateur et réévaluation clinique',
    },
  },
  {
    id: 'ir-003',
    patientId: 'p004',
    modelId: 'mod-scanner-cerebral',
    date: '2026-09-12',
    time: '16:40',
    radiologist: 'Dr. Serges Kouamé',
    status: 'complete',
    values: {
      indication: 'Céphalées inhabituelles avec facteurs de risque cardiovasculaires',
      protocol: 'Sans injection',
      slice: '5',
      parenchyma: 'Parenchyme cérébral sans hypodensité focale récente',
      ventricles: 'Système ventriculaire de taille normale, symétrique',
      midline: 'Non déviée',
      spaces: 'Espaces sous-arachnoïdiens normaux',
      bones: 'Voute et base du crâne sans lésion',
      sinuses: 'Sinus de la face libres',
      conclusion: 'TDM cérébrale sans anomalie significative (fictive)',
      recommendation: 'Poursuite de la prise en charge clinique',
    },
  },
  {
    id: 'ir-004',
    patientId: 'p009',
    modelId: 'mod-echo-obs',
    date: '2026-09-13',
    time: '10:15',
    radiologist: 'Dr. Mariam Bamba',
    status: 'valide',
    values: {
      indication: 'Suivi de grossesse — contrôle de croissance fœtale',
      gestationalAge: '32 SA + 1 j',
      probe: 'Abdominale',
      technique: 'Examen réalisé en décubitus dorsal, bonne transmission',
      bip: '81',
      pc: '295',
      pa: '268',
      lf: '60',
      estWeight: '1850',
      presentation: 'Céphalique',
      fetalHeart: '142',
      movements: 'Perçus',
      placenta: 'Postérieur, d\'aspect normal',
      amnioticFluid: 'Normal',
      cord: 'Insertion normale, trois vaisseaux',
      cervix: 'Long, fermé',
      findings: 'Activité cardiaque fœtale présente, mouvements actifs, biométrie concordante',
      conclusion: 'Grossesse évolutive avec biométrie concordante au terme estimé',
      recommendation: 'Poursuite du suivi obstétrical habituel',
    },
  },
];
