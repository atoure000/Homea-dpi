import type { Episode, EpisodeType, AdministrativeStatus, CareStatus, EpisodeEvent } from '@/types';

// ── Seed episodes: derived from existing admissions ────────────────
// p004 already has an active hospitalisation (cardiologie, bed C-12)
// p005 already has an active hospitalisation (pneumologie, bed P-05)
// p001 has an active consultation episode (médecine interne)
const seedEpisodes: Episode[] = [
  {
    id: 'ep001',
    patientId: 'p004',
    episodeNumber: 'VEN-2026-0001',
    type: 'hospitalisation',
    serviceId: 'Cardiologie',
    practitionerId: 'doc004',
    admittedAt: '2026-09-14T07:30',
    status: 'actif',
    administrativeStatus: 'prise-en-charge-en-cours',
    careStatus: 'en-cours',
    admissionReason: 'Dyspnée et œdèmes des membres inférieurs',
    createdBy: 'Accueil',
    bedId: 'b003',
    events: [
      { timestamp: '2026-09-14 07:30', action: 'Admission enregistrée', detail: 'Hospitalisation — Cardiologie', author: 'Accueil' },
    ],
  },
  {
    id: 'ep002',
    patientId: 'p005',
    episodeNumber: 'VEN-2026-0002',
    type: 'hospitalisation',
    serviceId: 'Pneumologie',
    practitionerId: 'doc002',
    admittedAt: '2026-09-14T09:30',
    status: 'actif',
    administrativeStatus: 'prise-en-charge-en-cours',
    careStatus: 'en-cours',
    admissionReason: "Crise d'asthme",
    createdBy: 'Accueil',
    bedId: 'b006',
    events: [
      { timestamp: '2026-09-14 09:30', action: 'Admission enregistrée', detail: 'Hospitalisation — Pneumologie', author: 'Accueil' },
    ],
  },
  {
    id: 'ep003',
    patientId: 'p001',
    episodeNumber: 'VEN-2026-0003',
    type: 'consultation',
    serviceId: 'Médecine interne',
    practitionerId: 'doc001',
    admittedAt: '2026-09-14T08:15',
    status: 'actif',
    administrativeStatus: 'pret-consultation',
    careStatus: 'en-cours',
    admissionReason: 'Maux de tête persistants et vertiges',
    createdBy: 'Accueil',
    consultationType: 'premiere',
    events: [
      { timestamp: '2026-09-14 08:15', action: 'Admission enregistrée', detail: 'Consultation — Médecine interne', author: 'Accueil' },
    ],
  },
  // Closed historical episode for p001
  {
    id: 'ep004',
    patientId: 'p001',
    episodeNumber: 'VEN-2026-0004',
    type: 'consultation',
    serviceId: 'Médecine générale',
    practitionerId: 'doc001',
    admittedAt: '2026-08-20T10:00',
    closedAt: '2026-08-20T11:30',
    status: 'clos',
    administrativeStatus: 'prise-en-charge-en-cours',
    careStatus: 'termine',
    admissionReason: 'Contrôle tension',
    createdBy: 'Accueil',
    consultationType: 'suivi',
    events: [
      { timestamp: '2026-08-20 10:00', action: 'Admission enregistrée', detail: 'Consultation — Médecine générale', author: 'Accueil' },
      { timestamp: '2026-08-20 11:30', action: 'Venue clôturée', detail: 'Fin de consultation', author: 'Médecin' },
    ],
  },
];

// ── In-memory store (demo persistence) ──────────────────────────────
let episodes: Episode[] = [...seedEpisodes];
let nextEpisodeSeq = 5;

export function getAllEpisodes(): Episode[] {
  return episodes;
}

export function getPatientEpisodes(patientId: string): Episode[] {
  return episodes.filter((e) => e.patientId === patientId);
}

export function getActiveEpisodesForPatient(patientId: string): Episode[] {
  return episodes.filter((e) => e.patientId === patientId && e.status === 'actif');
}

export function isPatientAdmitted(patientId: string): boolean {
  return getActiveEpisodesForPatient(patientId).length > 0;
}

export function getEpisode(id: string): Episode | undefined {
  return episodes.find((e) => e.id === id);
}

export interface NewEpisodeInput {
  patientId: string;
  type: EpisodeType;
  serviceId: string;
  practitionerId?: string;
  appointmentId?: string;
  admissionReason: string;
  createdBy: string;
  bedId?: string;
  bedPending?: boolean;
  examCategories?: ('laboratoire' | 'imagerie')[];
  examPrescriptionOrigin?: 'interne' | 'externe';
  examPrescriber?: string;
  consultationType?: 'premiere' | 'suivi';
}

export function createEpisode(input: NewEpisodeInput): Episode {
  const now = new Date();
  const admittedAt = now.toISOString().slice(0, 16);
  const episodeNumber = `VEN-2026-${String(nextEpisodeSeq).padStart(4, '0')}`;
  nextEpisodeSeq += 1;
  const id = `ep${Date.now()}`;

  const event: EpisodeEvent = {
    timestamp: now.toISOString().slice(0, 16).replace('T', ' '),
    action: 'Admission enregistrée',
    detail: `${input.type} — ${input.serviceId}`,
    author: input.createdBy,
  };

  const adminStatus: AdministrativeStatus = 'formalites-en-cours';
  const careStatus: CareStatus = 'en-attente';

  const episode: Episode = {
    id,
    patientId: input.patientId,
    episodeNumber,
    type: input.type,
    serviceId: input.serviceId,
    practitionerId: input.practitionerId,
    appointmentId: input.appointmentId,
    admittedAt,
    status: 'actif',
    administrativeStatus: adminStatus,
    careStatus,
    admissionReason: input.admissionReason,
    createdBy: input.createdBy,
    bedId: input.bedId,
    bedPending: input.bedPending,
    examCategories: input.examCategories,
    examPrescriptionOrigin: input.examPrescriptionOrigin,
    examPrescriber: input.examPrescriber,
    consultationType: input.consultationType,
    events: [event],
  };

  episodes = [episode, ...episodes];
  return episode;
}

export function closeEpisode(id: string, author: string, reason?: string): Episode | undefined {
  const ep = episodes.find((e) => e.id === id);
  if (!ep) return undefined;
  const now = new Date();
  const closedAt = now.toISOString().slice(0, 16);
  const event: EpisodeEvent = {
    timestamp: now.toISOString().slice(0, 16).replace('T', ' '),
    action: 'Venue clôturée',
    detail: reason,
    author,
  };
  const updated: Episode = {
    ...ep,
    status: 'clos',
    closedAt,
    careStatus: 'termine',
    events: [...ep.events, event],
  };
  episodes = episodes.map((e) => (e.id === id ? updated : e));
  return updated;
}

export function cancelEpisode(id: string, author: string, cancellationReason: string): Episode | undefined {
  const ep = episodes.find((e) => e.id === id);
  if (!ep) return undefined;
  const now = new Date();
  const event: EpisodeEvent = {
    timestamp: now.toISOString().slice(0, 16).replace('T', ' '),
    action: 'Admission annulée',
    detail: cancellationReason,
    author,
  };
  const updated: Episode = {
    ...ep,
    status: 'annule',
    closedAt: now.toISOString().slice(0, 16),
    cancellationReason,
    events: [...ep.events, event],
  };
  episodes = episodes.map((e) => (e.id === id ? updated : e));
  return updated;
}
