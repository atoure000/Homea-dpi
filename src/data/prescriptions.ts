import type { Prescription } from '@/types';

export const prescriptions: Prescription[] = [
  {
    id: 'rx002',
    patientId: 'p004',
    date: '2026-09-14',
    doctor: 'Dr. Kouadio N\'Guessan',
    medications: [
      {
        name: 'Furosémide',
        dosage: '40 mg',
        frequency: '1 fois/jour',
        duration: '7 jours',
        quantity: 7,
        instructions: 'À prendre le matin, surveillance du poids et de la diurèse',
      },
      {
        name: 'Ramipril',
        dosage: '5 mg',
        frequency: '1 fois/jour',
        duration: '30 jours',
        quantity: 30,
        instructions: 'À prendre le soir',
      },
    ],
    status: 'active',
    notes: 'Surveillance ionogramme à 48h',
  },
];
