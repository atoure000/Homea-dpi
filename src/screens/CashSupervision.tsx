import { useState } from 'react';
import { ClipboardCheck, Landmark, ShieldAlert, AlertTriangle, CheckCircle2, XCircle, HandCoins, BarChart3, Clock, Wallet } from 'lucide-react';
import { Button, Card, CardHeader, Badge, EmptyState, Input, TextArea, Select } from '@/components/ui';
import { formatFCFA } from '@/utils/format';
import type { LoginSession } from '@/screens/Login';
import {
  CASH_SESSION_STATUS_META,
  CASH_PAYMENT_STATE_META,
  countTotal,
  sessionTotals,
  theoreticalCash,
  approveRefund,
  validateClosure,
  forceClosure,
  confirmTransfer,
  getCashState,
  CashRuleError,
  type CashSession,
  type CashPaymentMode,
} from '@/data/cashRegisters';

type Props = { session: LoginSession };

export default function CashSupervision({ session: user }: Props) {
  const [, force] = useState(0);
  const [tab, setTab] = useState<'controle' | 'consolidation'>('controle');
  const state = getCashState();

  return (
    <div className="space-y-5 p-6">
      <div>
        <div className="flex items-center gap-2">
          <Landmark className="w-6 h-6 text-medical-600" />
          <h2 className="text-xl font-bold text-navy-900">Suivi des caisses</h2>
        </div>
        <p className="mt-1 text-sm text-navy-500">Contrôle contradictoire, approbations, consolidation — utilisateur actif : {user.fullName}.</p>
        <div className="mt-3 flex gap-2">
          <Button variant={tab === 'controle' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('controle')}>
            <ClipboardCheck className="w-4 h-4 mr-1.5" /> Contrôle
          </Button>
          <Button variant={tab === 'consolidation' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('consolidation')}>
            <BarChart3 className="w-4 h-4 mr-1.5" /> Consolidation
          </Button>
        </div>
      </div>

      {tab === 'controle' ? (
        <ControlTab user={user} onChanged={() => force((v) => v + 1)} state={state} />
      ) : (
        <ConsolidationTab state={state} />
      )}
    </div>
  );
}

/* ── Onglet Contrôle ───────────────────────────────────────────────── */

function ControlTab({ user, onChanged, state }: { user: LoginSession; onChanged: () => void; state: ReturnType<typeof getCashState> }) {
  const [, force] = useState(0);
  const sessions = state.sessions;
  const toControl = sessions.filter((s) => s.status === 'soumise-au-controle');
  const open = sessions.filter((s) => ['ouverte', 'cloture-en-preparation', 'correction-demandee'].includes(s.status));
  const pendingRefunds = state.movements.filter((m) => m.kind === 'remboursement' && m.paymentState === 'en-attente' && m.status === 'actif');
  const pendingTransfers = state.movements.filter((m) => m.kind === 'transfert-sortant' && m.paymentState === 'en-attente' && m.status === 'actif');
  const gaps = sessions.filter((s) => (s.submittedGap ?? 0) !== 0 && s.status !== 'correction-demandee');

  return (
    <div className="space-y-5">
      {pendingRefunds.length > 0 && (
        <Card>
          <CardHeader title="Remboursements à approuver" subtitle={`Seuil paramétrable : ${formatFCFA(state.settings.refundApprovalThreshold)}`} />
          <div className="divide-y divide-navy-50">
            {pendingRefunds.map((m) => (
              <RefundRow key={m.id} id={m.id} number={m.number} amount={m.amount} author={m.createdBy} reason={m.reason} beneficiary={m.beneficiary} controller={user.fullName} />
            ))}
          </div>
        </Card>
      )}

      {pendingTransfers.length > 0 && (
        <Card>
          <CardHeader title="Transferts à confirmer" subtitle="L'entrée dans la caisse destinataire n'est comptée qu'après confirmation par un autre agent." />
          <div className="divide-y divide-navy-50">
            {pendingTransfers.map((m) => {
              const target = state.sessions.find((s) => s.id === m.transferToSessionId);
              return (
                <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                  <div>
                    <p className="font-medium text-navy-900">{m.number} — {formatFCFA(m.amount)}</p>
                    <p className="text-xs text-navy-500">De : {m.createdBy} → vers : {target ? `${target.number} (${target.agent})` : '—'}</p>
                  </div>
                  <Button size="sm" onClick={() => { try { confirmTransfer(user.fullName, m.id); force((v) => v + 1); onChanged(); } catch (e) { window.alert(e instanceof CashRuleError ? e.message : 'Erreur'); } }}>
                    <CheckCircle2 className="w-4 h-4 mr-1" /> Confirmer la réception
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card>
        <CardHeader title="Clôtures à contrôler" subtitle="Contrôle contradictoire : déclaration de l'agent vs constat du responsable" />
        {toControl.length === 0 ? (
          <EmptyState icon={ClipboardCheck} title="Aucune clôture en attente" subtitle="Les sessions soumises par les caissiers apparaîtront ici." />
        ) : (
          <div className="divide-y divide-navy-50">
            {toControl.map((s) => <ControlRow key={s.id} s={s} controller={user.fullName} />)}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Sessions ouvertes et agents" subtitle="Soldes théoriques en espèces" />
        {open.length === 0 ? (
          <EmptyState icon={Landmark} title="Aucune session ouverte" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-100 text-left text-navy-500">
                  <th className="px-4 py-3 font-medium">N°</th>
                  <th className="px-3 py-3 font-medium">Agent</th>
                  <th className="px-3 py-3 font-medium">Poste</th>
                  <th className="px-3 py-3 font-medium">Ouverture</th>
                  <th className="px-3 py-3 text-right font-medium">Solde théorique</th>
                  <th className="px-3 py-3 font-medium">Statut</th>
                  <th className="px-3 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {open.map((s) => {
                  const meta = CASH_SESSION_STATUS_META[s.status];
                  return (
                    <tr key={s.id} className="border-b border-navy-50">
                      <td className="px-4 py-3 font-mono text-xs text-medical-700">{s.number}</td>
                      <td className="px-3 py-3 text-navy-800">{s.agent}</td>
                      <td className="px-3 py-3 text-navy-600">{state.registers.find((r) => r.id === s.registerId)?.name}</td>
                      <td className="px-3 py-3 text-navy-500 text-xs">{s.openedAt}</td>
                      <td className="px-3 py-3 text-right font-medium">{formatFCFA(theoreticalCash(s.id))}</td>
                      <td className="px-3 py-3"><Badge color={meta.color}>{meta.label}</Badge></td>
                      <td className="px-3 py-3">
                        {s.agent !== user.fullName && (
                          <ExceptionalClosureButton s={s} controller={user.fullName} />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {gaps.length > 0 && (
        <Card>
          <CardHeader title="Écarts constatés" subtitle="Sessions avec écart non nul déclaré ou validé — l'écart reste visible après clôture" />
          <div className="divide-y divide-navy-50">
            {gaps.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span className="font-medium text-navy-900">{s.number}</span>
                  <span className="text-navy-500">{s.agent}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge color={(s.submittedGap ?? 0) < 0 ? 'red' : 'green'}>{formatFCFA(s.submittedGap ?? 0)}</Badge>
                  <span className="text-xs text-navy-500 max-w-sm">{s.submittedGapReason ?? s.controllerNote ?? ''}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

/* ── Ligne remboursement ───────────────────────────────────────────── */

function RefundRow({ id, number, amount, author, reason, beneficiary, controller }: { id: string; number: string; amount: number; author: string; reason?: string; beneficiary?: string; controller: string }) {
  const [, force] = useState(0);
  const [note, setNote] = useState('');
  const disabled = author === controller;
  return (
    <div className="px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-sm">
      <div>
        <p className="font-medium text-navy-900">{number} — {formatFCFA(amount)}</p>
        <p className="text-xs text-navy-500">Demandé par {author} · Bénéficiaire : {beneficiary ?? '—'} · {reason}</p>
      </div>
      <div className="flex items-center gap-2">
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Commentaire" className="px-2 py-1.5 rounded-lg border border-navy-200 text-xs w-40" />
        <Button size="sm" disabled={disabled} onClick={() => { approveRefund(controller, controller, id, true, note); force((v) => v + 1); }}>
          <CheckCircle2 className="w-4 h-4 mr-1" /> Approuver
        </Button>
        <Button size="sm" variant="danger" disabled={disabled} onClick={() => { approveRefund(controller, controller, id, false, note || 'Refusé'); force((v) => v + 1); }}>
          <XCircle className="w-4 h-4 mr-1" /> Refuser
        </Button>
        {disabled && <Badge color="red">L'auteur ne peut pas s'auto-approuver</Badge>}
      </div>
    </div>
  );
}

/* ── Contrôle contradictoire d'une session soumise ─────────────────── */

function ControlRow({ s, controller }: { s: CashSession; controller: string }) {
  const [, force] = useState(0);
  const state = getCashState();
  const totals = sessionTotals(s.id);
  const theoretical = theoreticalCash(s.id);
  const declared = s.submittedTotal ?? 0;
  const [note, setNote] = useState('');
  const [handoverMode, setHandoverMode] = useState<'tout' | 'partiel' | 'aucun'>('aucun');
  const [kept, setKept] = useState(String(state.settings.expectedFloat));
  const [error, setError] = useState<string | null>(null);
  const gap = s.submittedGap ?? 0;

  const remitted = handoverMode === 'tout' ? Math.max(0, declared) : handoverMode === 'partiel' ? Math.max(0, declared - (Number(kept) || 0)) : 0;

  function decide(approve: boolean) {
    setError(null);
    try {
      validateClosure({
        controller,
        sessionId: s.id,
        approve,
        controllerCount: undefined,
        note: note || undefined,
        handover: approve ? { remitted, kept: handoverMode === 'partiel' ? Number(kept) || 0 : 0, receivedBy: controller } : undefined,
      });
      force((v) => v + 1);
    } catch (e) {
      setError(e instanceof CashRuleError ? e.message : 'Erreur');
    }
  }

  return (
    <div className="px-5 py-4 space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
        <div><p className="text-xs text-navy-400">Session</p><p className="font-mono font-semibold text-medical-700">{s.number}</p></div>
        <div><p className="text-xs text-navy-400">Agent</p><p className="font-medium text-navy-900">{s.agent}</p></div>
        <div><p className="text-xs text-navy-400">Théorique</p><p className="font-medium">{formatFCFA(theoretical)}</p></div>
        <div><p className="text-xs text-navy-400">Déclaré par l'agent</p><p className="font-medium">{formatFCFA(declared)}</p></div>
        <div><p className="text-xs text-navy-400">Écart déclaré</p><Badge color={gap === 0 ? 'green' : gap < 0 ? 'red' : 'amber'}>{formatFCFA(gap)}</Badge></div>
      </div>
      {s.submittedGapReason && <p className="text-xs text-navy-600 bg-navy-50 rounded-lg px-3 py-2">Justification de l'agent : {s.submittedGapReason}</p>}
      {Math.abs(gap) > 0 && (
        <p className="text-xs text-amber-700">Seuil de validation renforcée : {formatFCFA(state.settings.gapValidationThreshold)} — un commentaire de décision est exigé au-delà.</p>
      )}
      <TextArea label="Constat du responsable / décision" value={note} onChange={setNote} rows={2} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Select label="Remise des fonds" value={handoverMode} onChange={(v) => setHandoverMode(v as typeof handoverMode)} options={[{ value: 'tout', label: 'Tout remettre au responsable/coffre' }, { value: 'partiel', label: 'Remettre une partie, conserver un fonds' }, { value: 'aucun', label: 'Aucune remise (session à zéro)' }]} />
        {handoverMode === 'partiel' && <Input label="Fonds conservé (à recompter à la prochaine ouverture)" type="number" value={kept} onChange={setKept} />}
        <div className="flex items-end">
          <p className="text-xs text-navy-500">Montant remis : <strong>{formatFCFA(remitted)}</strong></p>
        </div>
      </div>
      <p className="text-xs text-navy-400">Bon de remise : généré à la validation. Espèces par mode non-espèces : {totals.byMode.filter((m) => m.mode !== 'Espèces').map((m) => `${m.mode} ${formatFCFA(m.confirmed)}`).join(', ') || 'aucun'} — rapprochement manuel sur pièces (prototype).</p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" onClick={() => decide(true)}><HandCoins className="w-4 h-4 mr-1" /> Valider la clôture</Button>
        <Button size="sm" variant="danger" onClick={() => decide(false)}><XCircle className="w-4 h-4 mr-1" /> Renvoyer (correction demandée)</Button>
        <Badge color="navy">Validation simulée — pas une signature électronique certifiée</Badge>
      </div>
    </div>
  );
}

/* ── Clôture exceptionnelle ────────────────────────────────────────── */

function ExceptionalClosureButton({ s, controller }: { s: CashSession; controller: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [counted, setCounted] = useState('');
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    try {
      forceClosure({ controller, sessionId: s.id, reason, countedTotal: Number(counted) || 0 });
      setOpen(false);
    } catch (e) {
      setError(e instanceof CashRuleError ? e.message : 'Erreur');
    }
  }

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}><ShieldAlert className="w-4 h-4 mr-1" /> Clôture exceptionnelle</Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-navy-900/50" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-xl clinical-shadow max-w-lg w-full">
            <div className="px-5 py-4 border-b border-navy-100">
              <h3 className="font-semibold text-navy-900">Clôture exceptionnelle — {s.number}</h3>
              <p className="text-xs text-navy-500 mt-0.5">Titulaire : {s.agent} (absent/indisponible). La validation par le titulaire est explicitement absente ; revue ultérieure requise.</p>
            </div>
            <div className="p-5 space-y-4">
              <TextArea label="Motif obligatoire" value={reason} onChange={setReason} rows={2} />
              <Input label="Montant constaté par vos soins (FCFA)" type="number" value={counted} onChange={setCounted} />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setOpen(false)}>Annuler</Button>
                <Button variant="danger" onClick={submit} disabled={!reason.trim()}>Clôturer sans le titulaire</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Onglet Consolidation (ex « Consolidation caisses ») ───────────── */

function ConsolidationTab({ state }: { state: ReturnType<typeof getCashState> }) {
  const openSessions = state.sessions.filter((s) => s.status !== 'cloturee');
  const closed = state.sessions.filter((s) => s.status === 'cloturee');
  const movements = state.movements.filter((m) => m.status === 'actif');

  /* Encaissements nets par agent et par poste : recettes réellement confirmées.
     Le fonds initial, les transferts et remises au coffre ne sont pas des recettes. */
  const byAgent = new Map<string, { encaissements: number; remboursements: number }>();
  const byMode = new Map<CashPaymentMode, number>();
  const byRegister = new Map<string, number>();
  let totalEncaisse = 0;
  let totalRembourse = 0;

  for (const m of movements) {
    if (m.kind === 'encaissement' && m.paymentState === 'confirme' && !m.creditNoteId) {
      const a = byAgent.get(m.createdBy) ?? { encaissements: 0, remboursements: 0 };
      a.encaissements += m.amount;
      byAgent.set(m.createdBy, a);
      byMode.set(m.mode, (byMode.get(m.mode) ?? 0) + m.amount);
      const session = state.sessions.find((s) => s.id === m.sessionId);
      if (session) byRegister.set(session.registerId, (byRegister.get(session.registerId) ?? 0) + m.amount);
      totalEncaisse += m.amount;
    }
    if (m.kind === 'remboursement' && m.paymentState === 'confirme') {
      const a = byAgent.get(m.createdBy) ?? { encaissements: 0, remboursements: 0 };
      a.remboursements += m.amount;
      byAgent.set(m.createdBy, a);
      totalRembourse += m.amount;
    }
  }

  const cashInDrawers = openSessions.reduce((s, sess) => s + Math.max(0, theoreticalCash(sess.id)), 0);
  const advancesPending = state.advances.filter((a) => a.status === 'disponible').reduce((s, a) => s + (a.amount - a.appliedAmount), 0);
  const gapSessions = state.sessions.filter((s) => (s.submittedGap ?? 0) !== 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Kpi label="Encaissements confirmés" value={formatFCFA(totalEncaisse)} tone="text-navy-900" />
        <Kpi label="Remboursements" value={formatFCFA(totalRembourse)} tone="text-red-600" />
        <Kpi label="Encaissements nets" value={formatFCFA(totalEncaisse - totalRembourse)} tone="text-medical-700" />
        <Kpi label="Espèces en tiroirs (sessions en cours)" value={formatFCFA(cashInDrawers)} tone="text-navy-900" />
        <Kpi label="Avances non affectées" value={formatFCFA(advancesPending)} tone="text-amber-600" />
        <Kpi label="Sessions non clôturées" value={String(openSessions.length)} tone={openSessions.length > 0 ? 'text-amber-600' : 'text-green-700'} />
      </div>

      <Card>
        <CardHeader title="Encaissements par agent" subtitle="Auteur = utilisateur actif du prototype" />
        {byAgent.size === 0 ? (
          <EmptyState icon={Wallet} title="Aucun encaissement" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-100 text-left text-navy-500">
                  <th className="px-4 py-3 font-medium">Agent</th>
                  <th className="px-3 py-3 text-right font-medium">Encaissements</th>
                  <th className="px-3 py-3 text-right font-medium">Remboursements</th>
                  <th className="px-3 py-3 text-right font-medium">Net</th>
                </tr>
              </thead>
              <tbody>
                {[...byAgent.entries()].map(([agent, v]) => (
                  <tr key={agent} className="border-b border-navy-50">
                    <td className="px-4 py-3 font-medium text-navy-900">{agent}</td>
                    <td className="px-3 py-3 text-right">{formatFCFA(v.encaissements)}</td>
                    <td className="px-3 py-3 text-right text-red-600">{formatFCFA(v.remboursements)}</td>
                    <td className="px-3 py-3 text-right font-semibold text-medical-700">{formatFCFA(v.encaissements - v.remboursements)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Encaissements par mode" subtitle="Les espèces n'incluent ni fonds initial ni transferts" />
          <div className="p-5 space-y-2 text-sm">
            {byMode.size === 0 ? <p className="text-navy-400">Aucun encaissement.</p> : [...byMode.entries()].map(([mode, v]) => (
              <div key={mode} className="flex justify-between"><span className="text-navy-600">{mode}</span><span className="font-medium">{formatFCFA(v)}</span></div>
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader title="Encaissements par poste de caisse" />
          <div className="p-5 space-y-2 text-sm">
            {byRegister.size === 0 ? <p className="text-navy-400">Aucun encaissement.</p> : [...byRegister.entries()].map(([regId, v]) => (
              <div key={regId} className="flex justify-between"><span className="text-navy-600">{state.registers.find((r) => r.id === regId)?.name ?? regId}</span><span className="font-medium">{formatFCFA(v)}</span></div>
            ))}
          </div>
        </Card>
      </div>

      {gapSessions.length > 0 && (
        <Card>
          <CardHeader title="Écarts de caisse" subtitle="Conservés après clôture — jamais effacés" />
          <div className="divide-y divide-navy-50">
            {gapSessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span className="font-medium">{s.number}</span>
                  <span className="text-navy-500">{s.agent} · {CASH_SESSION_STATUS_META[s.status].label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge color={(s.submittedGap ?? 0) < 0 ? 'red' : 'amber'}>{formatFCFA(s.submittedGap ?? 0)}</Badge>
                  <span className="text-xs text-navy-400">{s.submittedGapReason ?? ''}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {openSessions.length > 0 && (
        <Card>
          <CardHeader title="Sessions non clôturées" subtitle="À suivre : agents encore en activité ou clôture en attente" />
          <div className="divide-y divide-navy-50">
            {openSessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-navy-400" />
                  <span className="font-medium">{s.number}</span>
                  <span className="text-navy-500">{s.agent}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-navy-500">{s.activityDate}</span>
                  <Badge color={CASH_SESSION_STATUS_META[s.status].color}>{CASH_SESSION_STATUS_META[s.status].label}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-4">
        <div className="flex items-start gap-2 text-xs text-navy-500">
          <Landmark className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>Prototype : {closed.length} session(s) clôturée(s), {state.audit.length} événement(s) d'audit tracés. Les montants couvrent l'ensemble des sessions enregistrées localement.</p>
        </div>
      </Card>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-xl border border-navy-100 bg-white p-3">
      <p className="text-xs text-navy-500 font-medium">{label}</p>
      <p className={`mt-1 text-lg font-bold ${tone}`}>{value}</p>
    </div>
  );
}
