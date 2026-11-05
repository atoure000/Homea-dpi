import type { Profile, DemoStep } from '@/types';

export const profiles: Profile[] = [
  { id: 'direction', label: 'Direction', description: 'Vue globale et pilotage', icon: 'Building2' },
  { id: 'medecin', label: 'Médecin', description: 'Consultations et prescriptions', icon: 'Stethoscope' },
  { id: 'accueil', label: 'Accueil', description: 'Admission et enregistrement', icon: 'UserPlus' },
  { id: 'soins', label: 'Soins', description: 'Soins infirmiers et surveillance', icon: 'HeartPulse' },
  { id: 'laboratoire', label: 'Laboratoire', description: 'Analyses et résultats', icon: 'FlaskConical' },
  { id: 'pharmacie', label: 'Pharmacie', description: 'Dispensation et stocks', icon: 'Pill' },
  { id: 'facturation', label: 'Facturation', description: 'Factures et encaissement', icon: 'Receipt' },
];

export const demoSteps: DemoStep[] = [
  {
    id: 1,
    title: 'Accueil du patient',
    description: 'Enregistrement d\'un nouveau patient à l\'accueil',
    screen: 'reception',
    profile: 'accueil',
  },
  {
    id: 2,
    title: 'Consultation médicale',
    description: 'Examen clinique et saisie du diagnostic par le médecin',
    screen: 'consultation',
    profile: 'medecin',
  },
  {
    id: 3,
    title: 'Prescription',
    description: 'Émission d\'une ordonnance électronique',
    screen: 'prescription',
    profile: 'medecin',
  },
  {
    id: 4,
    title: 'Demande d\'analyses',
    description: 'Commande d\'examens de laboratoire',
    screen: 'lab-orders',
    profile: 'medecin',
  },
  {
    id: 5,
    title: 'Résultats de laboratoire',
    description: 'Saisie et validation des résultats d\'analyses',
    screen: 'lab-results',
    profile: 'laboratoire',
  },
  {
    id: 6,
    title: 'Soins infirmiers',
    description: 'Administration de soins et prise de constantes',
    screen: 'nursing-care',
    profile: 'soins',
  },
  {
    id: 7,
    title: 'Gestion des lits',
    description: 'Mouvements de patients et transferts',
    screen: 'bed-management',
    profile: 'soins',
  },
  {
    id: 8,
    title: 'Dispensation et facturation',
    description: 'Délivrance de médicaments et facturation',
    screen: 'billing',
    profile: 'facturation',
  },
  {
    id: 9,
    title: 'Agenda & Rendez-vous',
    description: 'Gestion des agendas médicaux, prise de rendez-vous et file d\'attente',
    screen: 'appointment-scheduling',
    profile: 'accueil',
  },
];
