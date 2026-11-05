import type { ConsultationRoom } from '@/types';

export const rooms: ConsultationRoom[] = [
  {
    id: 'room1',
    name: 'Salle A — Consultation 1',
    floor: 'Rez-de-chaussée',
    equipment: ['Tensiomètre', 'Stéthoscope', 'Lit d\'examen', 'Oxymètre'],
  },
  {
    id: 'room2',
    name: 'Salle B — Consultation 2',
    floor: '1er étage',
    equipment: ['Tensiomètre', 'Échographe portable', 'Table gynécologique'],
  },
  {
    id: 'room3',
    name: 'Salle C — Pédiatrie',
    floor: 'Rez-de-chaussée',
    equipment: ['Balance pédiatrique', 'Nébuliseur', 'Tensiomètre enfant', 'Jouets'],
  },
];

export function getRoom(id: string): ConsultationRoom | undefined {
  return rooms.find((r) => r.id === id);
}

export function getRoomName(id: string): string {
  const r = getRoom(id);
  return r ? r.name : 'Salle inconnue';
}
