import type { Doctor } from '@/types';

export const doctors: Doctor[] = [
  {
    id: 'doc001',
    firstName: 'Kouadio',
    lastName: "N'Guessan",
    specialty: 'Médecine générale',
    color: '#1d76db',
    consultationDays: [1, 2, 3, 4, 5],
    startTime: '08:00',
    endTime: '17:00',
    slotDuration: 30,
    breaks: [{ start: '12:00', end: '13:00', label: 'Pause déjeuner' }],
    roomId: 'room1',
    absences: [{ start: '2026-09-18', end: '2026-09-18', reason: 'Congé' }],
    unavailabilities: [],
    maxPerHalfDay: 8,
    allowUrgency: true,
  },
  {
    id: 'doc002',
    firstName: 'Adjoua',
    lastName: 'Brou',
    specialty: 'Gynécologie-obstétrique',
    color: '#e8484d',
    consultationDays: [1, 2, 4, 5],
    startTime: '08:30',
    endTime: '16:30',
    slotDuration: 30,
    breaks: [{ start: '12:30', end: '13:30', label: 'Pause déjeuner' }],
    roomId: 'room2',
    absences: [],
    unavailabilities: [{ date: '2026-09-16', reason: 'Bloc opératoire' }],
    maxPerHalfDay: 6,
    allowUrgency: true,
  },
  {
    id: 'doc003',
    firstName: 'Yao',
    lastName: 'Kouassi',
    specialty: 'Pédiatrie',
    color: '#14a8a3',
    consultationDays: [1, 2, 3, 4, 5, 6],
    startTime: '07:00',
    endTime: '14:00',
    slotDuration: 20,
    breaks: [{ start: '11:00', end: '11:30', label: 'Pause café' }],
    roomId: 'room3',
    absences: [],
    unavailabilities: [],
    maxPerHalfDay: 10,
    allowUrgency: true,
  },
  {
    id: 'doc004',
    firstName: 'Mariam',
    lastName: 'Diallo',
    specialty: 'Cardiologie',
    color: '#f59e0b',
    consultationDays: [2, 3, 4],
    startTime: '09:00',
    endTime: '18:00',
    slotDuration: 30,
    breaks: [{ start: '12:00', end: '14:00', label: 'Pause déjeuner + consultations externes' }],
    roomId: 'room1',
    absences: [],
    unavailabilities: [{ date: '2026-09-17', reason: 'Conférence médicale' }],
    maxPerHalfDay: 5,
    allowUrgency: false,
  },
  {
    id: 'doc005',
    firstName: 'Issa',
    lastName: 'Touré',
    specialty: 'Anesthésie',
    color: '#8b5cf6',
    consultationDays: [1, 3, 5],
    startTime: '10:00',
    endTime: '15:00',
    slotDuration: 15,
    breaks: [{ start: '12:00', end: '13:00', label: 'Pause déjeuner' }],
    roomId: 'room2',
    absences: [{ start: '2026-09-20', end: '2026-09-25', reason: 'Mission humanitaire' }],
    unavailabilities: [],
    maxPerHalfDay: 4,
    allowUrgency: false,
  },
];

export function getDoctor(id: string): Doctor | undefined {
  return doctors.find((d) => d.id === id);
}

export function getDoctorName(id: string): string {
  const d = getDoctor(id);
  return d ? `Dr. ${d.firstName} ${d.lastName}` : 'Médecin inconnu';
}

export function getDoctorSpecialty(id: string): string {
  const d = getDoctor(id);
  return d ? d.specialty : '';
}
