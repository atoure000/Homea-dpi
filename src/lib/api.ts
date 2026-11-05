// Couche d'accès aux données — VERSION PROVISOIRE
//
// Ce module centralise tous les appels à l'API backend. L'application
// continue d'utiliser les données simulées (src/data/*) tant que l'API
// n'est pas disponible. Chaque fonction tente d'abord l'API, puis
// retombe sur les données simulées avec un avertissement en console.
//
// Aucun identifiant PostgreSQL n'apparaît ici : le navigateur ne parle qu'à
// l'API REST, qui est la seule à se connecter à PostgreSQL.
//
// Points à valider avec le développeur backend :
//   - URL de base de l'API (VITE_API_BASE_URL)
//   - Contrats d'endpoints (chemins, verbes, payloads)
//   - Schéma PostgreSQL définitif
//   - Mécanisme d'authentification (JWT / session)

import { patients, getPatient } from '@/data/patients';
import { admissions } from '@/data/admissions';
import { consultations } from '@/data/consultations';
import { prescriptions } from '@/data/prescriptions';
import { labOrders } from '@/data/lab';
import { nursingCareRecords } from '@/data/nursing';
import { invoices } from '@/data/billing';
import { beds } from '@/data/beds';
import { appointments } from '@/data/appointments';
import { doctors } from '@/data/doctors';
import type {
  Patient,
  Admission,
  Consultation,
  Prescription,
  LabOrder,
  NursingCareRecord,
  Invoice,
  Bed,
  Appointment,
  Doctor,
} from '@/types';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';
const API_AVAILABLE = Boolean(API_BASE);

async function apiGet<T>(path: string, fallback: T): Promise<T> {
  if (!API_AVAILABLE) return fallback;
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } catch (cause) {
    console.warn(`[api] ${path} indisponible, utilisation des données simulées`, cause);
    return fallback;
  }
}

async function apiPut(path: string, body: unknown): Promise<boolean> {
  if (!API_AVAILABLE) return false;
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return true;
  } catch (cause) {
    console.warn(`[api] ${path} indisponible, modification conservée localement`, cause);
    return false;
  }
}

export async function fetchPatients(): Promise<Patient[]> {
  return apiGet<Patient[]>('/patients', patients);
}

export async function fetchPatient(id: string): Promise<Patient | undefined> {
  if (!API_AVAILABLE) return getPatient(id);
  return apiGet<Patient | undefined>(`/patients/${id}`, getPatient(id));
}

export async function fetchAdmissions(): Promise<Admission[]> {
  return apiGet<Admission[]>('/admissions', admissions);
}

export async function fetchConsultations(): Promise<Consultation[]> {
  return apiGet<Consultation[]>('/consultations', consultations);
}

export async function fetchPrescriptions(): Promise<Prescription[]> {
  return apiGet<Prescription[]>('/prescriptions', prescriptions);
}

export async function fetchLabOrders(): Promise<LabOrder[]> {
  return apiGet<LabOrder[]>('/lab-orders', labOrders);
}

export async function fetchNursingCare(): Promise<NursingCareRecord[]> {
  return apiGet<NursingCareRecord[]>('/nursing-care', nursingCareRecords);
}

export async function fetchInvoices(): Promise<Invoice[]> {
  return apiGet<Invoice[]>('/invoices', invoices);
}

export async function fetchBeds(): Promise<Bed[]> {
  return apiGet<Bed[]>('/beds', beds);
}

export async function fetchAppointments(): Promise<Appointment[]> {
  return apiGet<Appointment[]>('/appointments', appointments);
}

export async function fetchDoctors(): Promise<Doctor[]> {
  return apiGet<Doctor[]>('/doctors', doctors);
}

export async function fetchDoctorScheduleSettings(): Promise<Record<string, Partial<Doctor>>> {
  return apiGet<Record<string, Partial<Doctor>>>('/doctor-schedule-settings', {});
}

export async function saveDoctorScheduleSettings(doctorId: string, settings: Partial<Doctor>): Promise<boolean> {
  return apiPut(`/doctor-schedule-settings/${encodeURIComponent(doctorId)}`, { settings });
}

export const isApiConfigured = API_AVAILABLE;
