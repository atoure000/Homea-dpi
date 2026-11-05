import {
  CASH_SESSION_STATUS_META,
  MOVEMENT_KIND_META,
  getCashState,
  sessionTotals,
  theoreticalCash,
  type CashMovement,
  type CashSession,
} from '@/data/cashRegisters';
import type { BillingDoc } from '@/data/billingDocs';
import { getPatient } from '@/data/patients';
import { formatFCFA } from '@/utils/format';

type Props = {
  session: CashSession;
  movements: CashMovement[];
  docs: BillingDoc[];
  /** Présent uniquement sur un journal définitif réimprimé (duplicata). */
  reprintNumber?: number;
};

const editStamp = () => new Date().toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export function CashJournalPrint({ session, movements, docs, reprintNumber }: Props) {
  const state = getCashState();
  const totals = sessionTotals(session.id);
  const theoretical = theoreticalCash(session.id);
  const registerName = state.registers.find((r) => r.id === session.registerId)?.name ?? '—';
  const definitive = session.status === 'cloturee';

  const rows = [...movements].reverse();
  const cashRows = rows.filter((m) => !m.creditNoteId);
  const creditNotes = rows.filter((m) => m.creditNoteId);

  const refundsByMode = ['Espèces', 'Mobile Money', 'Carte bancaire', 'Virement', 'Chèque', 'Autre']
    .map((mode) => ({ mode, amount: movements.filter((m) => m.kind === 'remboursement' && m.status === 'actif' && m.mode === mode).reduce((s, m) => s + m.amount, 0) }))
    .filter((x) => x.amount > 0);

  const internalByKind = (['apport-fonds', 'transfert-entrant', 'retrait-securite', 'remise-responsable', 'transfert-sortant', 'sortie-exceptionnelle'] as const)
    .map((kind) => ({ kind, amount: movements.filter((m) => m.kind === kind && m.status === 'actif' && m.cashAmount > 0).reduce((s, m) => s + m.cashAmount, 0) }))
    .filter((x) => x.amount > 0);

  const pendingOps = movements.filter((m) => m.status === 'actif' && m.paymentState === 'en-attente');

  return (
    <div className="bg-white text-navy-900 text-[11px] leading-relaxed">
      {/* En-tête */}
      <div className="flex items-start justify-between border-b-2 border-navy-900 pb-3">
        <div className="flex items-center gap-3">
          <img src="/logo_Homea.png" alt="HOMEA" className="h-14 w-auto object-contain" />
          <div>
            <p className="text-base font-bold tracking-wide">CENTRE MEDICAL HOMEA</p>
            <p className="text-navy-600">Cocody, Abidjan — Côte d'Ivoire</p>
            <p className="text-navy-600">Tél : +225 27 22 00 00 00 · contact@homea.ci</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold uppercase tracking-widest">Journal de caisse</p>
          <p className="font-mono font-bold text-medical-700">{session.number}</p>
          <p className="text-navy-600">Poste : {registerName}</p>
          <p className="text-navy-600">Édité le : {editStamp()}</p>
        </div>
      </div>

      {/* Statut du document */}
      <div className={`mt-2 rounded border px-3 py-2 text-center font-bold uppercase tracking-widest ${definitive ? 'border-navy-300 bg-navy-50 text-navy-800' : 'border-amber-300 bg-amber-50 text-amber-800'}`}>
        {definitive ? 'Journal définitif — session clôturée' : 'Journal provisoire — session non clôturée'}
        {definitive && reprintNumber ? ` — Duplicata n°${reprintNumber}` : ''}
      </div>

      {/* Identité de la session */}
      <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 border border-navy-200 rounded p-3">
        <p>Caissière : <span className="font-semibold">{session.agent}</span></p>
        <p>Date d'activité : <span className="font-semibold">{session.activityDate}</span></p>
        <p>Ouverture : <span className="font-semibold">{session.openedAt}</span></p>
        <p>Clôture : <span className="font-semibold">{session.validatedAt ?? session.submittedAt ?? '—'}</span></p>
        <p>Statut : <span className="font-semibold">{CASH_SESSION_STATUS_META[session.status].label}</span></p>
        <p>Origine du fonds : {session.floatOrigin}</p>
      </div>

      {/* Tableau des opérations */}
      <table className="w-full mt-3 border-collapse">
        <thead>
          <tr className="bg-navy-100 text-navy-700">
            <th className="border border-navy-200 px-1.5 py-1.5 text-left">Date et heure</th>
            <th className="border border-navy-200 px-1.5 py-1.5 text-left">N° opération</th>
            <th className="border border-navy-200 px-1.5 py-1.5 text-left">Patient / payeur</th>
            <th className="border border-navy-200 px-1.5 py-1.5 text-left">Réf. facture</th>
            <th className="border border-navy-200 px-1.5 py-1.5 text-left">Nature</th>
            <th className="border border-navy-200 px-1.5 py-1.5 text-left">Mode</th>
            <th className="border border-navy-200 px-1.5 py-1.5 text-right">Entrant</th>
            <th className="border border-navy-200 px-1.5 py-1.5 text-right">Sortant</th>
            <th className="border border-navy-200 px-1.5 py-1.5 text-left">Agent</th>
          </tr>
        </thead>
        <tbody>
          {cashRows.map((m) => {
            const sign = MOVEMENT_KIND_META[m.kind].sign;
            const active = m.status === 'actif';
            return (
              <tr key={m.id}>
                <td className="border border-navy-200 px-1.5 py-1 whitespace-nowrap">{m.occurredAt}</td>
                <td className="border border-navy-200 px-1.5 py-1 font-mono">{m.number}</td>
                <td className="border border-navy-200 px-1.5 py-1">{payee(m, docs)}</td>
                <td className="border border-navy-200 px-1.5 py-1 font-mono">{m.docId ?? '—'}</td>
                <td className="border border-navy-200 px-1.5 py-1">{natureLabel(m)}{!active ? ' (annulé)' : ''}</td>
                <td className="border border-navy-200 px-1.5 py-1">{m.mode}</td>
                <td className="border border-navy-200 px-1.5 py-1 text-right">{active && sign === 1 && m.cashAmount > 0 ? formatFCFA(m.cashAmount) : '—'}</td>
                <td className="border border-navy-200 px-1.5 py-1 text-right">{active && sign === -1 && m.cashAmount > 0 ? formatFCFA(m.cashAmount) : '—'}</td>
                <td className="border border-navy-200 px-1.5 py-1">{m.createdBy}</td>
              </tr>
            );
          })}
          {cashRows.length === 0 && (
            <tr><td colSpan={9} className="border border-navy-200 px-2 py-3 text-center text-navy-400">Aucune opération sur cette session.</td></tr>
          )}
        </tbody>
      </table>

      {/* Avoirs sans mouvement de trésorerie */}
      {creditNotes.length > 0 && (
        <>
          <p className="mt-3 font-bold uppercase text-[10px] text-navy-500">Avoirs sans mouvement de trésorerie (aucune sortie d'argent)</p>
          <table className="w-full mt-1 border-collapse">
            <thead>
              <tr className="bg-navy-50 text-navy-700">
                <th className="border border-navy-200 px-1.5 py-1 text-left">Date et heure</th>
                <th className="border border-navy-200 px-1.5 py-1 text-left">N° avoir</th>
                <th className="border border-navy-200 px-1.5 py-1 text-left">Réf. facture</th>
                <th className="border border-navy-200 px-1.5 py-1 text-left">Motif</th>
                <th className="border border-navy-200 px-1.5 py-1 text-right">Montant avoir</th>
                <th className="border border-navy-200 px-1.5 py-1 text-left">Agent</th>
              </tr>
            </thead>
            <tbody>
              {creditNotes.map((m) => (
                <tr key={m.id}>
                  <td className="border border-navy-200 px-1.5 py-1">{m.occurredAt}</td>
                  <td className="border border-navy-200 px-1.5 py-1 font-mono">{m.number}</td>
                  <td className="border border-navy-200 px-1.5 py-1 font-mono">{m.docId ?? '—'}</td>
                  <td className="border border-navy-200 px-1.5 py-1">{m.reason ?? m.label}</td>
                  <td className="border border-navy-200 px-1.5 py-1 text-right">{formatFCFA(m.amount)}</td>
                  <td className="border border-navy-200 px-1.5 py-1">{m.createdBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Récapitulatif */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="border border-navy-200 rounded p-3">
          <p className="font-bold uppercase text-[10px] text-navy-500 mb-1">Recettes et mouvements</p>
          <RecapRow label="Fonds initial" value={formatFCFA(session.initialFloat)} />
          {totals.byMode.map((m) => (
            <RecapRow key={m.mode} label={`Encaissements ${m.mode}`} value={formatFCFA(m.confirmed) + (m.pending > 0 ? ` (+${formatFCFA(m.pending)} en attente)` : '')} />
          ))}
          {refundsByMode.map((r) => (
            <RecapRow key={r.mode} label={`Remboursements ${r.mode}`} value={`− ${formatFCFA(r.amount)}`} />
          ))}
          {internalByKind.map((k) => (
            <RecapRow key={k.kind} label={MOVEMENT_KIND_META[k.kind].label} value={`${MOVEMENT_KIND_META[k.kind].sign === 1 ? '+' : '− '}${formatFCFA(k.amount)}`} />
          ))}
          <RecapRow label="Solde théorique en espèces" value={formatFCFA(theoretical)} strong />
          {pendingOps.length > 0 && (
            <p className="mt-1 text-[10px] text-amber-700">{pendingOps.length} opération(s) en attente (non comptée(s) comme encaissée(s)) : {pendingOps.map((m) => m.number).join(', ')}.</p>
          )}
        </div>
        <div className="border border-navy-200 rounded p-3">
          <p className="font-bold uppercase text-[10px] text-navy-500 mb-1">Contrôle de la caisse</p>
          <RecapRow label="Montant compté (caissière)" value={session.submittedTotal != null ? formatFCFA(session.submittedTotal) : 'Non renseigné'} />
          <RecapRow label="Écart (compté − théorique)" value={session.submittedGap != null ? formatFCFA(session.submittedGap) : '—'} />
          {session.submittedGapReason && <p className="text-[10px] text-navy-600 mt-0.5">Justification : {session.submittedGapReason}</p>}
          <RecapRow label="Statut de contrôle" value={CASH_SESSION_STATUS_META[session.status].label} />
          <RecapRow label="Caissière" value={session.agent} />
          <RecapRow label="Responsable ayant validé" value={session.controller ?? '—'} />
          {session.validatedAt && <RecapRow label="Validation" value={session.validatedAt} />}
          {session.controllerNote && <p className="text-[10px] text-navy-600 mt-0.5">Décision du responsable : {session.controllerNote}</p>}
        </div>
      </div>

      <p className="mt-4 text-center text-[10px] font-bold uppercase tracking-widest text-red-600">
        Démonstration — données fictives
      </p>
    </div>
  );
}

function payee(m: CashMovement, docs: BillingDoc[]): string {
  if (m.beneficiary) return m.beneficiary;
  if (m.docId) {
    const doc = docs.find((d) => d.id === m.docId);
    const p = doc ? getPatient(doc.patientId) : undefined;
    if (p) return `${p.firstName} ${p.lastName}`;
    if (doc) return doc.patientId;
  }
  return '—';
}

function natureLabel(m: CashMovement): string {
  if (m.creditNoteId) return 'Avoir';
  if (m.kind === 'encaissement') return m.advanceId ? 'Avance / acompte' : 'Encaissement';
  return MOVEMENT_KIND_META[m.kind].label;
}

function RecapRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-2 ${strong ? 'font-bold border-t border-navy-300 pt-1 mt-1' : 'text-navy-700'}`}>
      <span>{label}</span>
      <span className={strong ? '' : 'font-medium'}>{value}</span>
    </div>
  );
}
