export type ProfileId = 'direction' | 'medecin' | 'accueil' | 'soins' | 'laboratoire' | 'pharmacie' | 'facturation';

export interface Profile {
  id: ProfileId;
  label: string;
  description: string;
  icon: string;
}

export type ScreenId =
  | 'dashboard'
  | 'reception'
  | 'patient-record'
  | 'patients-admitted'
  | 'patient-administrative'
  | 'consultation'
  | 'prescription'
  | 'lab-orders'
  | 'lab-results'
  | 'nursing-care'
  | 'bed-management'
  | 'pharmacy-dispensing'
  | 'pharmacy-stock'
  | 'lab-orders'
  | 'lab-results'
  | 'lab-stock'
  | 'billing'
  | 'insurance-receivables'
  | 'insurance-dossiers'
  | 'insurance-dossiers'
  | 'my-cash'
  | 'cash-supervision'
  | 'reporting'
  | 'administration'
  | 'appointment-scheduling';

export interface Patient {
  id: string;
  code: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: 'M' | 'F';
  phone: string;
  address: string;
  chronicConditions: string[];
  emergencyContact: string;
  emergencyPhone: string;
  insurance: string;
  insuranceNumber: string;
  birthName?: string;
  cmuNumber?: string;
  coverageRate?: string;
  idType?: IdType;
  idNumber?: string;
  photo?: string;
}

export type IdType =
  | 'carte-assurance'
  | 'cni'
  | 'passport'
  | 'carte-consulaire'
  | 'carte-cmu'
  | 'permis'
  | 'carte-pro'
  | 'autre';

export const ID_TYPE_OPTIONS: { value: IdType; label: string }[] = [
  { value: 'carte-assurance', label: 'Carte d\u2019assurance' },
  { value: 'cni', label: 'CNI' },
  { value: 'passport', label: 'Num\u00e9ro de passport' },
  { value: 'carte-consulaire', label: 'Carte consulaire' },
  { value: 'carte-cmu', label: 'Carte CMU' },
  { value: 'permis', label: 'Permis de conduire' },
  { value: 'carte-pro', label: 'Carte professionnelle' },
  { value: 'autre', label: 'Autre' },
];

export const INSURANCE_OPTIONS: { value: string; label: string }[] = [
  { value: 'Non assurée', label: 'Non assurée' },
  { value: 'CNAM', label: 'CNAM' },
  { value: 'NSIA', label: 'NSIA' },
  { value: 'ASKIA', label: 'ASKIA' },
];

export const COVERAGE_RATE_OPTIONS: { value: string; label: string }[] = [
  { value: '0', label: '0%' },
  { value: '50', label: '50%' },
  { value: '70', label: '70%' },
  { value: '80', label: '80%' },
];

export const PERMANENT_ID_TYPES: IdType[] = ['carte-assurance', 'cni', 'carte-cmu'];

export function idTypeLabel(value?: IdType): string {
  return ID_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? 'Non renseign\u00e9';
}

export function isPermanentId(value?: IdType): boolean {
  return value ? PERMANENT_ID_TYPES.includes(value) : false;
}

// ── Labels épisodes ────────────────────────────────────────────────
export const EPISODE_TYPE_LABELS: Record<EpisodeType, string> = {
  consultation: 'Consultation',
  examens: 'Examens',
  hospitalisation: 'Hospitalisation',
};

export const EPISODE_STATUS_LABELS: Record<EpisodeStatus, string> = {
  actif: 'Actif',
  clos: 'Clos',
  annule: 'Annulé',
};

export const ADMIN_STATUS_LABELS: Record<AdministrativeStatus, string> = {
  'formalites-en-cours': 'Formalités en cours',
  'attente-reglement': 'En attente de règlement',
  'pret-consultation': 'Prêt pour consultation',
  'prise-en-charge-en-cours': 'Prise en charge en cours',
};

export const CARE_STATUS_LABELS: Record<CareStatus, string> = {
  'en-attente': 'En attente',
  'en-cours': 'En cours',
  termine: 'Terminé',
};

export type AdmissionStatus = 'waiting' | 'admitted' | 'in-consultation' | 'discharged';

export interface Admission {
  id: string;
  patientId: string;
  date: string;
  time: string;
  reason: string;
  status: AdmissionStatus;
  department: string;
  bedNumber?: string;
  assignedDoctor?: string;
  priority: 'normal' | 'urgent' | 'critical';
}

// ── Épisodes / Venues & séjours ───────────────────────────────────
export type EpisodeType = 'consultation' | 'examens' | 'hospitalisation';
export type EpisodeStatus = 'actif' | 'clos' | 'annule';
export type AdministrativeStatus =
  | 'formalites-en-cours'
  | 'attente-reglement'
  | 'pret-consultation'
  | 'prise-en-charge-en-cours';
export type CareStatus = 'en-attente' | 'en-cours' | 'termine';

export interface EpisodeEvent {
  timestamp: string;
  action: string;
  detail?: string;
  author?: string;
}

export interface Episode {
  id: string;
  patientId: string;
  episodeNumber: string;
  type: EpisodeType;
  serviceId: string;
  practitionerId?: string;
  appointmentId?: string;
  admittedAt: string;
  closedAt?: string;
  status: EpisodeStatus;
  administrativeStatus: AdministrativeStatus;
  careStatus: CareStatus;
  admissionReason: string;
  createdBy: string;
  cancellationReason?: string;
  bedId?: string;
  bedPending?: boolean;
  examCategories?: ('laboratoire' | 'imagerie')[];
  examPrescriptionOrigin?: 'interne' | 'externe';
  examPrescriber?: string;
  consultationType?: 'premiere' | 'suivi';
  events: EpisodeEvent[];
}

export interface Consultation {
  id: string;
  patientId: string;
  date: string;
  time: string;
  doctor: string;
  chiefComplaint: string;
  history: string;
  examination: string;
  diagnosis: string;
  notes: string;
  status: 'pending' | 'in-progress' | 'completed';
  vitals?: Vitals;
  signature?: boolean;
}

export interface Vitals {
  temperature: number;
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  heartRate: number;
  respiratoryRate: number;
  oxygenSaturation: number;
  weight: number;
  height: number;
  painScore: number;
}

export type ConsultationFormType = 'general' | 'gynecological' | 'obstetrical';
export type ConsultationFormStatus = 'draft' | 'validated' | 'signed';

export type FormValues = Record<string, string>;
export type FormRows = Record<string, string>[];
export type FormTables = Record<string, FormRows>;

export interface Prescription {
  id: string;
  patientId: string;
  date: string;
  doctor: string;
  medications: PrescriptionMedication[];
  status: 'active' | 'dispensed' | 'cancelled';
  notes?: string;
}

export interface PrescriptionMedication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  instructions: string;
}

export interface LabOrder {
  id: string;
  patientId: string;
  date: string;
  doctor: string;
  tests: LabTest[];
  status: 'ordered' | 'in-progress' | 'completed';
  priority: 'normal' | 'urgent';
}

export interface LabTest {
  code: string;
  name: string;
  category: string;
  status: 'ordered' | 'in-progress' | 'completed';
  result?: string;
  unit?: string;
  normalRange?: string;
  flag?: 'normal' | 'low' | 'high' | 'critical';
  completedAt?: string;
}

export interface NursingCareRecord {
  id: string;
  patientId: string;
  date: string;
  time: string;
  nurse: string;
  careType: string;
  description: string;
  vitals?: Vitals;
  signature: boolean;
}

export interface Bed {
  id: string;
  number: string;
  room: string;
  department: string;
  status: 'available' | 'occupied' | 'cleaning' | 'reserved';
  patientId?: string;
  admissionDate?: string;
  expectedDischarge?: string;
}

export interface BedMovement {
  id: string;
  patientId: string;
  patientName: string;
  fromBed?: string;
  toBed: string;
  date: string;
  time: string;
  reason: string;
  type: 'admission' | 'transfer' | 'discharge';
}

export interface MedicationStock {
  id: string;
  name: string;
  category: string;
  unit: string;
  stock: number;
  minStock: number;
  pricePerUnit: number;
  expiryDate: string;
  batchNumber: string;
}

export interface DispensingRecord {
  id: string;
  patientId: string;
  patientName: string;
  date: string;
  time: string;
  pharmacist: string;
  medications: { name: string; quantity: number; dosage: string }[];
  totalCost: number;
  prescriptionId?: string;
  status: 'pending' | 'dispensed';
}

export interface Invoice {
  id: string;
  number: string;
  patientId: string;
  patientName: string;
  date: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  insuranceCover: number;
  total: number;
  status: 'draft' | 'pending' | 'paid' | 'partial';
  amountPaid: number;
}

export interface InvoiceItem {
  description: string;
  category: 'consultation' | 'laboratory' | 'pharmacy' | 'hospitalization' | 'imaging' | 'other';
  quantity: number;
  unitPrice: number;
  total: number;
}

export type AppointmentStatus =
  | 'planned'
  | 'to-confirm'
  | 'confirmed'
  | 'arrived'
  | 'waiting'
  | 'in-consultation'
  | 'completed'
  | 'cancelled'
  | 'no-show'
  | 'rescheduled'
  | 'walk-in';

export type AppointmentType = 'first' | 'follow-up' | 'urgent' | 'teleconsult' | 'walk-in';
export type CoverageMode = 'particular' | 'insurance' | 'mutual';
export type ConfirmationChannel = 'phone' | 'sms' | 'email';
export type PriorityLevel = 'normal' | 'medical';

export interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
  specialty: string;
  color: string;
  consultationDays: number[];
  consultationStartDate?: string;
  consultationEndDate?: string;
  startTime: string;
  endTime: string;
  slotDuration: number;
  breaks: { start: string; end: string; label: string }[];
  roomId: string;
  absences: { start: string; end: string; reason: string }[];
  unavailabilities: { date: string; reason: string }[];
  maxPerHalfDay: number;
  allowUrgency: boolean;
}

export interface ConsultationRoom {
  id: string;
  name: string;
  floor: string;
  equipment: string[];
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  date: string;
  time: string;
  duration: number;
  type: AppointmentType;
  reason: string;
  roomId: string;
  status: AppointmentStatus;
  coverage: CoverageMode;
  priority: PriorityLevel;
  comment?: string;
  confirmationChannel?: ConfirmationChannel;
  arrivalTime?: string;
  isLate?: boolean;
  lateReason?: string;
  history: { timestamp: string; action: string; detail?: string }[];
}

export interface QueueEntry {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  appointmentTime: string;
  arrivalTime: string;
  priority: PriorityLevel;
  status: AppointmentStatus;
  roomId: string;
  doctorDelay: boolean;
  priorityReason?: string;
}

export type StockDomain = 'pharmacy' | 'lab';

export type PharmacyCategory =
  | 'medicaments'
  | 'dispositifs-medicaux'
  | 'consommables-soins'
  | 'produits-sensibles'
  | 'produits-thermosensibles';

export type LabCategory =
  | 'reactifs'
  | 'calibrateurs'
  | 'controles'
  | 'consommables'
  | 'tubes-prelevement'
  | 'entretien-automates';

export type StockStatus = 'active' | 'inactive';

export interface StockItem {
  id: string;
  domain: StockDomain;
  code: string;
  name: string;
  category: string;
  unitManagement: string;
  unitDispensing: string;
  conversionFactor: number;
  location: string;
  supplierId: string;
  availableStock: number;
  reservedStock: number;
  quarantineStock: number;
  orderedQty: number;
  minStock: number;
  maxStock: number;
  reorderPoint: number;
  avgConsumption: number;
  lastPrice: number;
  active: boolean;
  // Lab-specific
  automateCompatible?: string;
  method?: string;
  theoreticalTests?: number;
  storageConditions?: string;
  thermoSensitive?: boolean;
}

export interface StockLot {
  id: string;
  itemId: string;
  domain: StockDomain;
  lotNumber: string;
  expiryDate: string;
  manufactureDate?: string;
  availableQty: number;
  reservedQty: number;
  quarantineQty: number;
  blocked: boolean;
  blockedReason?: string;
  receptionId?: string;
}

export type MovementType =
  | 'reception-conforme'
  | 'retour-service'
  | 'retour-patient'
  | 'regularisation-positive'
  | 'transfert-entrant'
  | 'reintegration-quarantaine'
  | 'sortie-nominative'
  | 'dotation-service'
  | 'sortie-diverse'
  | 'consommation-automate'
  | 'consommation-manuelle'
  | 'regularisation-negative'
  | 'transfert-sortant'
  | 'destruction'
  | 'retour-fournisseur';

export interface StockMovement {
  id: string;
  domain: StockDomain;
  date: string;
  time: string;
  type: MovementType;
  itemId: string;
  itemName: string;
  lotId?: string;
  lotNumber?: string;
  quantity: number;
  unit: string;
  origin?: string;
  destination?: string;
  author: string;
  reference?: string;
  stockBefore: number;
  stockAfter: number;
  reason?: string;
}

export type NeedExpressionStatus =
  | 'brouillon'
  | 'soumise'
  | 'en-validation'
  | 'validee'
  | 'validee-partiellement'
  | 'rejetee'
  | 'transformee-consultation'
  | 'cloturee';

export interface NeedExpressionItem {
  itemId: string;
  itemName: string;
  availableQty: number;
  minStock: number;
  avgConsumption: number;
  orderedQty: number;
  requestedQty: number;
  validatedQty?: number;
  unit: string;
  supplierId: string;
  proposedQty?: number;
  comment?: string;
}

export interface NeedExpression {
  id: string;
  domain: StockDomain;
  number: string;
  date: string;
  service: string;
  period: string;
  justification: string;
  urgency: 'normal' | 'urgent' | 'critique';
  requester: string;
  validator?: string;
  status: NeedExpressionStatus;
  items: NeedExpressionItem[];
  rejectionReason?: string;
  history: { timestamp: string; action: string; detail?: string }[];
}

export type QuotationStatus =
  | 'recue'
  | 'en-comparaison'
  | 'retenue'
  | 'en-validation'
  | 'validee'
  | 'rejetee'
  | 'expiree';

export interface QuotationItem {
  itemId: string;
  itemName: string;
  unitPrice: number;
  proposedQty: number;
  discount: number;
  tax: number;
  totalCost: number;
  deliveryDelay: number;
  available: boolean;
  paymentConditions: string;
  technicalConformity: boolean;
  observations?: string;
  // Pharmacy
  dosage?: string;
  form?: string;
  packaging?: string;
  manufacturer?: string;
  registerConformity?: boolean;
  remainingValidity?: number;
  // Lab
  automateCompatible?: string;
  methodConcerned?: string;
  theoreticalTests?: number;
  storageConditions?: string;
  calibrationRequired?: boolean;
}

export interface Quotation {
  id: string;
  domain: StockDomain;
  number: string;
  needExpressionId: string;
  supplierId: string;
  supplierName: string;
  date: string;
  validityDays: number;
  expiryDate: string;
  status: QuotationStatus;
  items: QuotationItem[];
  selectionReason?: string;
  validator?: string;
  history: { timestamp: string; action: string; detail?: string }[];
}

export type ReceptionDecision =
  | 'conforme'
  | 'partiellement-conforme'
  | 'non-conforme'
  | 'quarantaine'
  | 'retourne-fournisseur';

export interface ReceptionItem {
  itemId: string;
  itemName: string;
  orderedQty: number;
  receivedQty: number;
  acceptedQty: number;
  refusedQty: number;
  quarantineQty: number;
  lotNumber: string;
  manufactureDate?: string;
  expiryDate: string;
  storageCondition: string;
  temperature?: number;
  packagingOk: boolean;
  designationOk: boolean;
  dosageOk: boolean;
  packagingConformityOk: boolean;
  quantityOk: boolean;
  comment?: string;
}

export interface Reception {
  id: string;
  domain: StockDomain;
  number: string;
  needExpressionId: string;
  quotationId: string;
  supplierName: string;
  date: string;
  time: string;
  receiver: string;
  deliveryNoteNumber: string;
  decision: ReceptionDecision;
  items: ReceptionItem[];
  history: { timestamp: string; action: string; detail?: string }[];
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  address: string;
  domains: StockDomain[];
  active: boolean;
  deliveryDelay: number;
}

export type AlertLevel = 'info' | 'surveiller' | 'important' | 'critique';
export type AlertStatus = 'nouvelle' | 'prise-en-charge' | 'en-cours' | 'resolue' | 'justifiee' | 'cloturee';

export interface StockAlert {
  id: string;
  domain: StockDomain;
  type: string;
  level: AlertLevel;
  itemId?: string;
  itemName: string;
  lotNumber?: string;
  availableQty?: number;
  threshold?: number;
  date: string;
  cause: string;
  responsible: string;
  proposedAction: string;
  status: AlertStatus;
  history: { timestamp: string; action: string; detail?: string }[];
}

export type DispensingStatus =
  | 'a-preparer'
  | 'preparee'
  | 'delivree'
  | 'partiellement-delivree'
  | 'non-delivree'
  | 'retournee';

export interface NominalDispensing {
  id: string;
  patientId: string;
  patientName: string;
  encounterId: string;
  prescriptionId: string;
  service: string;
  prescriber: string;
  itemId: string;
  itemName: string;
  lotId: string;
  lotNumber: string;
  prescribedQty: number;
  deliveredQty: number;
  date: string;
  pharmacist: string;
  status: DispensingStatus;
}

export type DotationStatus =
  | 'demandee'
  | 'validee'
  | 'preparee'
  | 'delivree'
  | 'recue-service'
  | 'partiellement-servie'
  | 'rejetee';

export interface ServiceDotation {
  id: string;
  service: string;
  requester: string;
  itemId: string;
  itemName: string;
  lotId: string;
  lotNumber: string;
  requestedQty: number;
  validatedQty: number;
  deliveredQty: number;
  date: string;
  responsible: string;
  status: DotationStatus;
  receiptAcknowledged: boolean;
}

export type ReturnDecision =
  | 'remis-stock'
  | 'quarantaine'
  | 'non-reutilisable'
  | 'a-detruire'
  | 'retourne-fournisseur';

export interface ProductReturn {
  id: string;
  origin: string;
  itemId: string;
  itemName: string;
  lotId: string;
  lotNumber: string;
  quantity: number;
  reason: string;
  packagingIntact: boolean;
  storageRespected: boolean;
  expiryDate: string;
  controlledBy: string;
  decision: ReturnDecision;
  date: string;
}

export interface LabAutomate {
  id: string;
  name: string;
  category: string;
  active: boolean;
}

export interface AutomateConsumption {
  id: string;
  automateId: string;
  automateName: string;
  reagentId: string;
  reagentName: string;
  lotId: string;
  lotNumber: string;
  openDate: string;
  installDate: string;
  installedQty: number;
  theoreticalTests: number;
  testsPerformed: number;
  controlsPerformed: number;
  calibrationsPerformed: number;
  repeatedTests: number;
  cancelledTests: number;
  technicalLosses: number;
  theoreticalRemaining: number;
  observedRemaining: number;
  removalDate?: string;
  operator: string;
}

export type ReconciliationClass =
  | 'conforme'
  | 'ecart-faible'
  | 'ecart-significatif'
  | 'a-investiguer'
  | 'justifie'
  | 'cloture';

export interface LabReconciliation {
  id: string;
  automateId: string;
  automateName: string;
  reagentId: string;
  reagentName: string;
  lotNumber: string;
  theoreticalTests: number;
  prescribedTests: number;
  performedTests: number;
  controlsQty: number;
  calibrationsQty: number;
  repeatedTests: number;
  cancelledTests: number;
  theoreticalConsumption: number;
  declaredConsumption: number;
  realEstimatedConsumption: number;
  gap: number;
  gapPercentage: number;
  classification: ReconciliationClass;
  justification?: string;
  causes?: string[];
  date: string;
}

export interface InventoryEntry {
  id: string;
  itemId: string;
  itemName: string;
  lotId?: string;
  lotNumber?: string;
  theoreticalStock: number;
  countedQty: number;
  gap: number;
  gapValue: number;
  reason?: string;
  decision?: string;
  validator?: string;
  stockBefore?: number;
  stockAfter?: number;
}

export interface Inventory {
  id: string;
  domain: StockDomain;
  number: string;
  type: 'complet' | 'tournant' | 'cible-categorie' | 'cible-emplacement' | 'cible-article' | 'comptage-lot';
  date: string;
  entries: InventoryEntry[];
  validator?: string;
  status: 'en-cours' | 'valide' | 'cloture';
}

export interface DemoStep {
  id: number;
  title: string;
  description: string;
  screen: ScreenId;
  profile: ProfileId;
}
