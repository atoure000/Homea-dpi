import type { Bed, BedMovement } from '@/types';

export const beds: Bed[] = [
  // Cardiologie
  { id: 'b001', number: 'C-10', room: 'Salle 1', department: 'Cardiologie', status: 'available' },
  { id: 'b002', number: 'C-11', room: 'Salle 1', department: 'Cardiologie', status: 'cleaning' },
  { id: 'b003', number: 'C-12', room: 'Salle 2', department: 'Cardiologie', status: 'occupied', patientId: 'p004', admissionDate: '2026-09-14', expectedDischarge: '2026-09-18' },
  { id: 'b004', number: 'C-13', room: 'Salle 2', department: 'Cardiologie', status: 'available' },
  // Pneumologie
  { id: 'b005', number: 'P-04', room: 'Salle 3', department: 'Pneumologie', status: 'available' },
  { id: 'b006', number: 'P-05', room: 'Salle 3', department: 'Pneumologie', status: 'occupied', patientId: 'p005', admissionDate: '2026-09-14', expectedDischarge: '2026-09-15' },
  { id: 'b007', number: 'P-06', room: 'Salle 4', department: 'Pneumologie', status: 'reserved' },
  // Médecine interne
  { id: 'b008', number: 'M-01', room: 'Salle 5', department: 'Médecine interne', status: 'available' },
  { id: 'b009', number: 'M-02', room: 'Salle 5', department: 'Médecine interne', status: 'occupied', patientId: 'p001', admissionDate: '2026-09-14', expectedDischarge: '2026-09-14' },
  { id: 'b010', number: 'M-03', room: 'Salle 6', department: 'Médecine interne', status: 'available' },
  // Chirurgie
  { id: 'b011', number: 'CH-07', room: 'Salle 7', department: 'Chirurgie', status: 'available' },
  { id: 'b012', number: 'CH-08', room: 'Salle 7', department: 'Chirurgie', status: 'cleaning' },
];

export const bedMovements: BedMovement[] = [
  {
    id: 'm001',
    patientId: 'p004',
    patientName: 'Ibrahim Koné',
    toBed: 'C-12',
    date: '2026-09-14',
    time: '07:45',
    reason: 'Admission en cardiologie pour surcharge hydrosodée',
    type: 'admission',
  },
  {
    id: 'm002',
    patientId: 'p005',
    patientName: 'Adjoua Kouassi',
    toBed: 'P-05',
    date: '2026-09-14',
    time: '09:30',
    reason: 'Admission en pneumologie pour crise d\'asthme',
    type: 'admission',
  },
  {
    id: 'm003',
    patientId: 'p001',
    patientName: 'Awa Traoré',
    toBed: 'M-02',
    date: '2026-09-14',
    time: '08:30',
    reason: 'Observation après consultation',
    type: 'admission',
  },
];
