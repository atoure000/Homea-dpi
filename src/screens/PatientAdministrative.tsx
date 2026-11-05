import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { ArrowLeft, CalendarDays, CreditCard, FileText, IdCard, Printer, UserRound } from 'lucide-react';
import type { Invoice, Patient } from '@/types';
import { Badge, Button, Card } from '@/components/ui';
import { appointments } from '@/data/appointments';
import { patients } from '@/data/patients';
import { invoices } from '@/data/billing';
import { getPatientEpisodes } from '@/data/episodes';
import { getDoctorName } from '@/data/doctors';
import { calculateAge, formatDate, formatDateShort, formatFCFA, getInitials } from '@/utils/format';

interface PatientAdministrativeProps {
  patientId?: string;
  onBack: () => void;
}

const appointmentStatus: Record<string, { label: string; color: 'green' | 'blue' | 'navy' | 'amber' | 'red' }> = {
  confirmed: { label: 'Confirmé', color: 'blue' },
  planned: { label: 'Planifié', color: 'navy' },
  completed: { label: 'Terminé', color: 'green' },
  cancelled: { label: 'Annulé', color: 'red' },
};

export default function PatientAdministrative({ patientId, onBack }: PatientAdministrativeProps) {
  const patient = useMemo(() => {
    return patients.find((item) => item.id === patientId) ?? patients[0];
  }, [patientId]);

  const patientAppointments = appointments.filter((item) => item.patientId === patient.id).slice(0, 5);
  const patientInvoices = invoices.filter((item) => item.patientId === patient.id);
  const episodes = getPatientEpisodes(patient.id);
  const upcomingAppointments = patientAppointments.filter((item) => item.date >= '2026-09-15' && item.status !== 'cancelled');
  const totals = patientInvoices.reduce((acc, invoice) => {
    const summary = invoiceAmounts(invoice);
    return { due: acc.due + summary.restePatient, insurance: acc.insurance + summary.resteAssurance };
  }, { due: 0, insurance: 0 });

  return (
    <div className="min-h-full bg-[#f3f6fa] px-4 py-5 md:px-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <button onClick={onBack} className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 hover:text-sky-900">
              <ArrowLeft className="h-3.5 w-3.5" /> Retour au dossier patient
            </button>
            <p className="text-xs text-slate-500">Accueil / Patient / Fiche administrative</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => window.print()}>
            <Printer className="mr-1.5 h-3.5 w-3.5" /> Imprimer la fiche
          </Button>
        </div>

        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 bg-white px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-800">{getInitials(patient.firstName, patient.lastName)}</div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">{patient.lastName.toUpperCase()} {patient.firstName}</h1>
                <p className="text-xs text-slate-500">IUP <span className="font-mono font-semibold text-slate-700">{patient.code}</span> · {calculateAge(patient.birthDate)} ans · {patient.gender === 'M' ? 'Masculin' : 'Féminin'} · {patient.phone}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge color="green"><IdCard className="h-3 w-3" /> Dossier vérifié</Badge>
                  {patient.insurance !== 'Non assurée' && <Badge color="blue">Assuré : {patient.insurance}</Badge>}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm"><UserRound className="mr-1.5 h-3.5 w-3.5" /> Modifier</Button>
              <Button variant="primary" size="sm"><FileText className="mr-1.5 h-3.5 w-3.5" /> Ouvrir une venue</Button>
            </div>
          </div>
        </Card>

        <div className="grid gap-4 lg:grid-cols-5">
          <Card className="lg:col-span-3">
            <SectionTitle icon={CreditCard} title="Couvertures" count={patient.insurance === 'Non assurée' ? 0 : 1} />
            <div className="overflow-x-auto px-4 pb-4">
              <table className="w-full min-w-[620px] text-xs">
                <thead><tr className="border-b border-slate-100 text-left text-slate-500"><th className="px-2 py-2">Type</th><th className="px-2 py-2">Organisme</th><th className="px-2 py-2">N° adhérent</th><th className="px-2 py-2">Validité</th><th className="px-2 py-2">Taux</th><th className="px-2 py-2">État</th></tr></thead>
                <tbody><tr className="border-b border-slate-100 text-slate-700"><td className="px-2 py-2">Assurance</td><td className="px-2 py-2 font-medium">{patient.insurance}</td><td className="px-2 py-2 font-mono">{patient.insuranceNumber || '—'}</td><td className="px-2 py-2">En cours</td><td className="px-2 py-2">{patient.coverageRate ? `${patient.coverageRate}%` : patient.insurance === 'Non assurée' ? '0%' : '80%'}</td><td className="px-2 py-2"><Badge color={patient.insurance === 'Non assurée' ? 'navy' : 'green'}>{patient.insurance === 'Non assurée' ? 'Inactive' : 'Active'}</Badge></td></tr></tbody>
              </table>
            </div>
          </Card>
          <Card className="lg:col-span-2">
            <SectionTitle title="En résumé" />
            <div className="grid grid-cols-2 gap-3 p-4">
              <Summary label="Solde dû par le patient" value={formatFCFA(totals.due)} tone="red" />
              <Summary label="Prochain rendez-vous" value={upcomingAppointments[0] ? formatDateShort(upcomingAppointments[0].date) : 'Aucun'} />
              <Summary label="Venues enregistrées" value={String(episodes.length)} />
              <Summary label="Part assurance en attente" value={formatFCFA(totals.insurance)} tone={totals.insurance > 0 ? 'red' : 'normal'} />
            </div>
          </Card>
        </div>

        <Card>
          <SectionTitle icon={FileText} title="Historique des venues" count={episodes.length} />
          <DataTable headers={['Date', 'N° venue', 'Type', 'Médecin', 'Statut']}>
            {episodes.slice(0, 5).map((episode) => <tr key={episode.id} className="border-b border-slate-100 text-slate-700"><td>{formatDateShort(episode.admittedAt.slice(0, 10))}</td><td className="font-mono">{episode.episodeNumber}</td><td>{episode.type}</td><td>{episode.practitionerId ? getDoctorName(episode.practitionerId) : '—'}</td><td><Badge color={episode.status === 'actif' ? 'green' : episode.status === 'annule' ? 'red' : 'navy'}>{episode.status === 'actif' ? 'Active' : episode.status === 'annule' ? 'Annulée' : 'Clôturée'}</Badge></td></tr>)}
          </DataTable>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card><SectionTitle icon={CalendarDays} title="Rendez-vous à venir" count={upcomingAppointments.length} /><DataTable headers={['Date', 'Heure', 'Médecin', 'Motif', 'Statut']}>
            {upcomingAppointments.slice(0, 3).map((item) => { const status = appointmentStatus[item.status] ?? appointmentStatus.planned; return <tr key={item.id} className="border-b border-slate-100 text-slate-700"><td>{formatDateShort(item.date)}</td><td>{item.time}</td><td>{getDoctorName(item.doctorId)}</td><td>{item.reason}</td><td><Badge color={status.color}>{status.label}</Badge></td></tr>; })}
          </DataTable></Card>
          <Card><SectionTitle icon={CreditCard} title="Factures et soldes dus" count={patientInvoices.length} /><DataTable headers={['Facture', 'Date', 'Part patient due', 'Part assureur due']}>
            {patientInvoices.slice(0, 4).map((invoice) => { const summary = invoiceAmounts(invoice); return <tr key={invoice.id} className="border-b border-slate-100 text-slate-700"><td className="font-mono">{invoice.number}</td><td>{formatDateShort(invoice.date)}</td><td className={summary.restePatient > 0 ? 'font-bold text-red-600' : ''}>{formatFCFA(summary.restePatient)}</td><td>{formatFCFA(summary.resteAssurance)}</td></tr>; })}
          </DataTable></Card>
        </div>

        <Card><SectionTitle icon={FileText} title="Informations administratives" /><div className="grid gap-4 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4"><Info label="Nom de naissance" value={patient.birthName || patient.lastName} /><Info label="Date de naissance" value={formatDate(patient.birthDate)} /><Info label="Adresse" value={patient.address || '—'} /><Info label="Contact d'urgence" value={`${patient.emergencyContact || '—'} · ${patient.emergencyPhone || '—'}`} /></div></Card>
      </div>
    </div>
  );
}

function invoiceAmounts(invoice: Invoice) {
  return {
    restePatient: Math.max(0, invoice.total - invoice.insuranceCover - invoice.amountPaid),
    resteAssurance: Math.max(0, invoice.insuranceCover),
  };
}

function SectionTitle({ icon: Icon, title, count }: { icon?: typeof FileText; title: string; count?: number }) { return <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">{Icon && <Icon className="h-4 w-4 text-sky-700" />}<h2 className="text-sm font-bold text-slate-800">{title}</h2>{typeof count === 'number' && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">{count}</span>}</div>; }
function Summary({ label, value, tone = 'normal' }: { label: string; value: string; tone?: 'normal' | 'red' }) { return <div className="rounded-lg border border-slate-100 bg-slate-50 p-3"><p className="text-[11px] text-slate-500">{label}</p><p className={`mt-1 text-base font-bold ${tone === 'red' ? 'text-red-600' : 'text-slate-800'}`}>{value}</p></div>; }
function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-xs font-medium text-slate-400">{label}</p><p className="mt-1 text-slate-800">{value}</p></div>; }
function DataTable({ headers, children }: { headers: string[]; children: ReactNode }) { return <div className="overflow-x-auto px-4 pb-4"><table className="w-full min-w-[640px] text-xs"><thead><tr className="border-b border-slate-100 text-left text-slate-500">{headers.map((header) => <th key={header} className="px-2 py-2 font-semibold">{header}</th>)}</tr></thead><tbody>{children}</tbody></table></div>; }
