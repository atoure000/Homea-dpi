import type { Appointment } from '@/types';

const weekDate = '2026-09-15';

function ts(action: string, detail?: string) {
  return { timestamp: `${weekDate} 08:00`, action, detail };
}

export const appointments: Appointment[] = [
  // Monday 2026-09-15 — 10 appointments
  {
    id: 'apt001', patientId: 'p001', doctorId: 'doc001', date: '2026-09-15', time: '08:00', duration: 30,
    type: 'follow-up', reason: 'Suivi hypertension', roomId: 'room1', status: 'confirmed',
    coverage: 'insurance', priority: 'normal', confirmationChannel: 'sms',
    history: [ts('Créé', 'Rendez-vous planifié par l\'accueil')],
  },
  {
    id: 'apt002', patientId: 'p008', doctorId: 'doc004', date: '2026-09-15', time: '09:00', duration: 30,
    type: 'first', reason: 'Palpitations et essoufflement', roomId: 'room1', status: 'arrived',
    coverage: 'insurance', priority: 'normal', confirmationChannel: 'phone', arrivalTime: '08:45',
    history: [ts('Créé'), ts('Confirmé'), ts('Arrivée patient', '08:45')],
  },
  {
    id: 'apt003', patientId: 'p014', doctorId: 'doc003', date: '2026-09-15', time: '07:00', duration: 20,
    type: 'first', reason: 'Fièvre persistante', roomId: 'room3', status: 'in-consultation',
    coverage: 'insurance', priority: 'normal', confirmationChannel: 'sms', arrivalTime: '06:50',
    history: [ts('Créé'), ts('Confirmé'), ts('Arrivée patient'), ts('Consultation démarrée')],
  },
  {
    id: 'apt004', patientId: 'p007', doctorId: 'doc002', date: '2026-09-15', time: '08:30', duration: 30,
    type: 'follow-up', reason: 'Suivi grossesse — 2e trimestre', roomId: 'room2', status: 'confirmed',
    coverage: 'insurance', priority: 'normal', confirmationChannel: 'phone',
    history: [ts('Créé'), ts('Confirmé')],
  },
  {
    id: 'apt005', patientId: 'p010', doctorId: 'doc001', date: '2026-09-15', time: '09:00', duration: 30,
    type: 'follow-up', reason: 'Contrôle diabète et tension', roomId: 'room1', status: 'waiting',
    coverage: 'insurance', priority: 'normal', confirmationChannel: 'sms', arrivalTime: '08:55',
    history: [ts('Créé'), ts('Confirmé'), ts('Arrivée patient')],
  },
  {
    id: 'apt006', patientId: 'p015', doctorId: 'doc001', date: '2026-09-15', time: '09:30', duration: 30,
    type: 'follow-up', reason: 'Suivi diabète', roomId: 'room1', status: 'planned',
    coverage: 'particular', priority: 'normal', confirmationChannel: 'phone',
    history: [ts('Créé')],
  },
  {
    id: 'apt007', patientId: 'p016', doctorId: 'doc003', date: '2026-09-15', time: '07:20', duration: 20,
    type: 'first', reason: 'Toux et fièvre', roomId: 'room3', status: 'completed',
    coverage: 'insurance', priority: 'normal', confirmationChannel: 'sms', arrivalTime: '07:10',
    history: [ts('Créé'), ts('Confirmé'), ts('Arrivée patient'), ts('Consultation démarrée'), ts('Consultation terminée')],
  },
  {
    id: 'apt008', patientId: 'p019', doctorId: 'doc003', date: '2026-09-15', time: '07:40', duration: 20,
    type: 'first', reason: 'Vaccination de rappel', roomId: 'room3', status: 'no-show',
    coverage: 'insurance', priority: 'normal', confirmationChannel: 'sms',
    history: [ts('Créé'), ts('Confirmé'), ts('Non honoré', 'Patient ne s\'est pas présenté')],
  },
  {
    id: 'apt009', patientId: 'p009', doctorId: 'doc002', date: '2026-09-15', time: '09:00', duration: 30,
    type: 'first', reason: 'Consultation prénatale', roomId: 'room2', status: 'to-confirm',
    coverage: 'particular', priority: 'normal', confirmationChannel: 'phone',
    history: [ts('Créé', 'En attente de confirmation par le patient')],
  },
  {
    id: 'apt010', patientId: 'p013', doctorId: 'doc001', date: '2026-09-15', time: '10:00', duration: 30,
    type: 'urgent', reason: 'Crise d\'asthme — urgence respiratoire', roomId: 'room1', status: 'arrived',
    coverage: 'insurance', priority: 'medical', confirmationChannel: 'phone', arrivalTime: '09:50',
    comment: 'Insertion d\'urgence — peut modifier l\'ordre de passage',
    history: [ts('Créé', 'Urgence médicale insérée'), ts('Arrivée patient')],
  },
  // Tuesday 2026-09-16 — 6 appointments
  {
    id: 'apt011', patientId: 'p002', doctorId: 'doc001', date: '2026-09-16', time: '08:00', duration: 30,
    type: 'follow-up', reason: 'Contrôle glycémie', roomId: 'room1', status: 'confirmed',
    coverage: 'insurance', priority: 'normal', confirmationChannel: 'sms',
    history: [ts('Créé'), ts('Confirmé')],
  },
  {
    id: 'apt012', patientId: 'p011', doctorId: 'doc002', date: '2026-09-16', time: '08:30', duration: 30,
    type: 'first', reason: 'Consultation gynécologique', roomId: 'room2', status: 'planned',
    coverage: 'particular', priority: 'normal',
    history: [ts('Créé')],
  },
  {
    id: 'apt013', patientId: 'p018', doctorId: 'doc004', date: '2026-09-16', time: '09:00', duration: 30,
    type: 'follow-up', reason: 'Suivi insuffisance cardiaque', roomId: 'room1', status: 'confirmed',
    coverage: 'insurance', priority: 'normal', confirmationChannel: 'phone',
    history: [ts('Créé'), ts('Confirmé')],
  },
  {
    id: 'apt014', patientId: 'p004', doctorId: 'doc001', date: '2026-09-16', time: '10:00', duration: 30,
    type: 'follow-up', reason: 'Suivi insuffisance rénale', roomId: 'room1', status: 'cancelled',
    coverage: 'insurance', priority: 'normal',
    history: [ts('Créé'), ts('Annulé', 'Patient a annulé — conflit d\'horaire')],
  },
  {
    id: 'apt015', patientId: 'p020', doctorId: 'doc003', date: '2026-09-16', time: '07:00', duration: 20,
    type: 'first', reason: 'Malaise à l\'école', roomId: 'room3', status: 'confirmed',
    coverage: 'insurance', priority: 'normal', confirmationChannel: 'sms',
    history: [ts('Créé'), ts('Confirmé')],
  },
  {
    id: 'apt016', patientId: 'p005', doctorId: 'doc003', date: '2026-09-16', time: '07:20', duration: 20,
    type: 'follow-up', reason: 'Suivi asthme pédiatrique', roomId: 'room3', status: 'rescheduled',
    coverage: 'insurance', priority: 'normal',
    history: [ts('Créé'), ts('Reporté', 'Reporté au 18/09 — indisponibilité patient')],
  },
  // Wednesday 2026-09-17 — 5 appointments
  {
    id: 'apt017', patientId: 'p003', doctorId: 'doc001', date: '2026-09-17', time: '08:00', duration: 30,
    type: 'first', reason: 'Douleurs abdominales', roomId: 'room1', status: 'confirmed',
    coverage: 'particular', priority: 'normal', confirmationChannel: 'phone',
    history: [ts('Créé'), ts('Confirmé')],
  },
  {
    id: 'apt018', patientId: 'p012', doctorId: 'doc001', date: '2026-09-17', time: '08:30', duration: 30,
    type: 'follow-up', reason: 'Suivi arthrose', roomId: 'room1', status: 'planned',
    coverage: 'insurance', priority: 'normal',
    history: [ts('Créé')],
  },
  {
    id: 'apt019', patientId: 'p017', doctorId: 'doc002', date: '2026-09-17', time: '09:00', duration: 30,
    type: 'first', reason: 'Première consultation gynécologique', roomId: 'room2', status: 'to-confirm',
    coverage: 'particular', priority: 'normal',
    history: [ts('Créé', 'En attente de confirmation')],
  },
  {
    id: 'apt020', patientId: 'p006', doctorId: 'doc003', date: '2026-09-17', time: '07:00', duration: 20,
    type: 'first', reason: 'Consultation de routine', roomId: 'room3', status: 'planned',
    coverage: 'particular', priority: 'normal',
    history: [ts('Créé')],
  },
  {
    id: 'apt021', patientId: 'p008', doctorId: 'doc005', date: '2026-09-17', time: '10:00', duration: 15,
    type: 'first', reason: 'Évaluation pré-anesthésique', roomId: 'room2', status: 'confirmed',
    coverage: 'insurance', priority: 'normal', confirmationChannel: 'phone',
    history: [ts('Créé'), ts('Confirmé')],
  },
  // Thursday 2026-09-18 — 5 appointments
  {
    id: 'apt022', patientId: 'p001', doctorId: 'doc004', date: '2026-09-18', time: '09:00', duration: 30,
    type: 'first', reason: 'Douleurs thoraciques', roomId: 'room1', status: 'confirmed',
    coverage: 'insurance', priority: 'normal', confirmationChannel: 'sms',
    history: [ts('Créé'), ts('Confirmé')],
  },
  {
    id: 'apt023', patientId: 'p009', doctorId: 'doc001', date: '2026-09-18', time: '08:00', duration: 30,
    type: 'follow-up', reason: 'Suivi thyroïde', roomId: 'room1', status: 'planned',
    coverage: 'insurance', priority: 'normal',
    history: [ts('Créé')],
  },
  {
    id: 'apt024', patientId: 'p014', doctorId: 'doc003', date: '2026-09-18', time: '07:00', duration: 20,
    type: 'follow-up', reason: 'Contrôle post-fièvre', roomId: 'room3', status: 'confirmed',
    coverage: 'insurance', priority: 'normal', confirmationChannel: 'sms',
    history: [ts('Créé'), ts('Confirmé')],
  },
  {
    id: 'apt025', patientId: 'p010', doctorId: 'doc004', date: '2026-09-18', time: '09:30', duration: 30,
    type: 'follow-up', reason: 'Bilan cardiologique', roomId: 'room1', status: 'planned',
    coverage: 'insurance', priority: 'normal',
    history: [ts('Créé')],
  },
  {
    id: 'apt026', patientId: 'p018', doctorId: 'doc002', date: '2026-09-18', time: '08:30', duration: 30,
    type: 'first', reason: 'Consultation pré-opératoire', roomId: 'room2', status: 'no-show',
    coverage: 'insurance', priority: 'normal',
    history: [ts('Créé'), ts('Confirmé'), ts('Non honoré', 'Patient absent sans préavis')],
  },
  // Friday 2026-09-19 — 4 appointments
  {
    id: 'apt027', patientId: 'p007', doctorId: 'doc001', date: '2026-09-19', time: '08:00', duration: 30,
    type: 'follow-up', reason: 'Suivi migraines', roomId: 'room1', status: 'confirmed',
    coverage: 'insurance', priority: 'normal', confirmationChannel: 'sms',
    history: [ts('Créé'), ts('Confirmé')],
  },
  {
    id: 'apt028', patientId: 'p019', doctorId: 'doc003', date: '2026-09-19', time: '07:00', duration: 20,
    type: 'follow-up', reason: 'Contrôle vaccination', roomId: 'room3', status: 'planned',
    coverage: 'insurance', priority: 'normal',
    history: [ts('Créé')],
  },
  {
    id: 'apt029', patientId: 'p016', doctorId: 'doc001', date: '2026-09-19', time: '08:30', duration: 30,
    type: 'follow-up', reason: 'Contrôle tension', roomId: 'room1', status: 'confirmed',
    coverage: 'insurance', priority: 'normal', confirmationChannel: 'phone',
    history: [ts('Créé'), ts('Confirmé')],
  },
  {
    id: 'apt030', patientId: 'p020', doctorId: 'doc002', date: '2026-09-19', time: '09:00', duration: 30,
    type: 'first', reason: 'Consultation gynécologique', roomId: 'room2', status: 'cancelled',
    coverage: 'particular', priority: 'normal',
    history: [ts('Créé'), ts('Annulé', 'Annulation à la demande du patient')],
  },
];
