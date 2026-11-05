import { useEffect, useState } from 'react';
import {
  Banknote,
  Lock,
  Landmark,
  Printer,
  FileText,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  RefreshCw,
  ClipboardList,
  ShieldAlert,
} from 'lucide-react';
import { Button, Card, CardHeader, Badge, EmptyState, Input, Select, TextArea } from '@/components/ui';
import { PrintPreview } from '@/components/PrintPreview';
import { CashJournalPrint } from '@/components/CashJournalPrint';
import { formatFCFA } from '@/utils/format';
import type { LoginSession } from '@/screens/Login';
import type { BillingDoc } from '@/data/billingDocs';
import { docTotals } from '@/data/billingDocs';
import { patients } from '@/data/patients';
import {
  CASH_SESSION_STATUS_META,
  CASH_PAYMENT_MODES,
  CASH_PAYMENT_STATE_META,
  DENOMINATIONS,
  countTotal,
  openSession,
  addPayment,
  addAdvance,
  requestRefund,
  addFundsMovement,
  prepareClosure,
  resumeOperations,
  submitClosure,
  sessionTotals,
  theoreticalCash,
  getMyOpenSession,
  getAgentCurrentSession,
  journalReprints,
  countJournalReprint,
  getCashState,
  CashRuleError,
  type CashSession,
  type CashDenomination,
  type CashMovement,
  type PaymentSplitLine,
} from '@/data/cashRegisters';

type Props = {
  session: LoginSession;
  docs: BillingDoc[];
  onOpenDoc: (docId: string) => void;
};

const activityDateToday = () => new Date().toISOString().split('T')[0];
const stampShort = () => new Date().toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function MyCashRegister({ session: user, docs, onOpenDoc }: Props) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 400);
    return () => clearInterval(t);
  }, []);

  const state = getCashState();
  const currentSession = getAgentCurrentSession(user.fullName);
  const openSessionForUser = getMyOpenSession(user.fullName);
  const mySessions = state.sessions.filter((s) => s.agent === user.fullName).slice(0, 8);
  const [printSessionId, setPrintSessionId] = useState<string | null>(null);
  const [printReprintNumber, setPrintReprintNumber] = useState(0);
  const reprints = journalReprints();

  const printSession = state.sessions.find((s) => s.id === printSessionId) ?? null;

  function handlePrint(sessionId: string) {
    const priorCount = reprints[sessionId] ?? 0;
    countJournalReprint(user.fullName, sessionId);
    setPrintReprintNumber(priorCount);
    setPrintSessionId(sessionId);
    if (priorCount > 0) window.alert('Réimpression tracée — ce journal est identifié comme duplicata.');
  }

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Landmark className="w-6 h-6 text-medical-600" />
            <h2 className="text-xl font-bold text-navy-900">Ma caisse</h2>
          </div>
          <p className="mt-1 text-sm text-navy-500">Session de {user.fullName} — protosimulé, auteur = utilisateur actif.</p>
        </div>
        {currentSession && (
          <Badge color={currentSession.status === 'ouverte' ? 'green' : 'turquoise'}>
            Session {currentSession.number} — {CASH_SESSION_STATUS_META[currentSession.status].label}
          </Badge>
        )}
      </div>

      {/* Barre d'actions principale — toujours visible */}
      <ActionBar
        user={user}
        currentSession={currentSession}
        openSessionForUser={openSessionForUser}
        onPrintJournal={handlePrint}
      />

      {printSession && (
        <PrintPreview title={`Journal de caisse — ${printSession.number}`} onClose={() => setPrintSessionId(null)}>
          <CashJournalPrint
            session={printSession}
            movements={state.movements.filter((m) => m.sessionId === printSession.id)}
            docs={docs}
            reprintNumber={printSession.status === 'cloturee' && printReprintNumber > 0 ? printReprintNumber : undefined}
          />
        </PrintPreview>
      )}

      {renderBody()}
    </div>
  );

  function renderBody() {
    if (!currentSession) {
      return (
        <div className="space-y-5">
          <OldSessionsCard sessions={mySessions} onPrint={(id) => handlePrint(id)} />
        </div>
      );
    }
    return (
      <SessionView
        user={user}
        session={currentSession}
        docs={docs}
        onOpenDoc={onOpenDoc}
        onPrintJournal={handlePrint}
      />
    );
  }
}

/* ── Barre d'actions (ouverture / clôture / impression) ────────────── */

function ActionBar({
  user,
  currentSession,
  openSessionForUser,
  onPrintJournal,
}: {
  user: LoginSession;
  currentSession: CashSession | null;
  openSessionForUser: CashSession | null;
  onPrintJournal: (sessionId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const closureFormOpen = currentSession && ['cloture-en-preparation', 'correction-demandee'].includes(currentSession.status);

  const reasons: Record<string, string> = {
    ouverte: 'Session déjà ouverte — clôturez-la avant d’en ouvrir une nouvelle.',
    'cloture-en-preparation': 'Clôture en préparation — terminez ou abandonnez-la d’abord.',
    'soumise-au-controle': 'Clôture soumise — en attente de validation du responsable.',
    'correction-demandee': 'Clôture renvoyée pour correction — complétez le formulaire de clôture.',
  };

  return (
    <>
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => setOpen(true)}
            disabled={!!currentSession}
            title={currentSession ? 'Clôturez la session en cours avant d’en ouvrir une nouvelle.' : 'Ouvrir une nouvelle session de caisse.'}
          >
            <Banknote className="w-4 h-4 mr-1.5" /> Ouvrir ma caisse
          </Button>

          <Button
            variant="secondary"
            onClick={() => {
              if (currentSession && closureFormOpen) return;
              if (currentSession && currentSession.status === 'ouverte') {
                try {
                  prepareClosure(user.fullName, currentSession.id);
                } catch (e) {
                  window.alert(e instanceof CashRuleError ? e.message : 'Erreur inattendue');
                }
              }
            }}
            disabled={!currentSession || currentSession.status === 'soumise-au-controle'}
            title={
              !currentSession
                ? 'Aucune session ouverte à clôturer.'
                : currentSession.status === 'soumise-au-controle'
                  ? 'Clôture déjà soumise — en attente de validation.'
                  : 'Comptage et soumission au responsable.'
            }
          >
            <Lock className="w-4 h-4 mr-1.5" /> Clôturer ma caisse
          </Button>

          <Button
            variant="secondary"
            disabled={!currentSession}
            onClick={() => currentSession && onPrintJournal(currentSession.id)}
            title={!currentSession ? 'Aucune session à imprimer — consultez vos anciennes sessions ci-dessous.' : 'Aperçu du journal de la session en cours.'}
          >
            <Printer className="w-4 h-4 mr-1.5" /> Imprimer le journal
          </Button>

          {currentSession && (
            <span className="text-sm text-navy-600">
              {reasons[currentSession.status] ?? ''}
            </span>
          )}
          {!currentSession && (
            <span className="text-sm text-navy-500">Aucune session active — vous pouvez ouvrir votre caisse ou consulter vos anciennes sessions.</span>
          )}
        </div>
        {!currentSession && openSessionForUser === null && (
          <p className="mt-2 text-xs text-navy-400">Règle : une seule session ouverte par caissière et par poste ; une session par jour (paramétrable).</p>
        )}
      </Card>

      {open && <OpenForm user={user} onClose={() => setOpen(false)} />}
    </>
 );
}

/* ── Anciennes sessions (sans session active) ──────────────────────── */

function OldSessionsCard({ sessions, onPrint }: { sessions: CashSession[]; onPrint: (id: string) => void }) {
  return (
    <Card>
      <CardHeader title="Mes sessions précédentes" subtitle="Consultation et impression des journaux — lecture seule" />
      {sessions.length === 0 ? (
        <EmptyState icon={Banknote} title="Aucune session" subtitle="Ouvrez votre première session de caisse." />
      ) : (
        <SessionTable sessions={sessions} onPrint={onPrint} />
      )}
    </Card>
  );
}

function SessionTable({ sessions, onPrint }: { sessions: CashSession[]; onPrint: (id: string) => void }) {
  const state = getCashState();
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-navy-100 text-left text-navy-500">
            <th className="px-4 py-3 font-medium">N° session</th>
            <th className="px-3 py-3 font-medium">Poste</th>
            <th className="px-3 py-3 font-medium">Date d'activité</th>
            <th className="px-3 py-3 font-medium">Ouverture</th>
            <th className="px-3 py-3 text-right font-medium">Fonds initial</th>
            <th className="px-3 py-3 font-medium">Statut</th>
            <th className="px-3 py-3 font-medium">Contrôleur</th>
            <th className="px-3 py-3 font-medium" />
          </tr>
        </thead>
        <tbody>
          {sessions.map((s) => {
            const reg = state.registers.find((r) => r.id === s.registerId);
            const meta = CASH_SESSION_STATUS_META[s.status];
            return (
              <tr key={s.id} className="border-b border-navy-50">
                <td className="px-4 py-3 font-mono text-xs font-semibold text-medical-700">{s.number}</td>
                <td className="px-3 py-3 text-navy-700">{reg?.name}</td>
                <td className="px-3 py-3 text-navy-600">{s.activityDate}</td>
                <td className="px-3 py-3 text-navy-600">{s.openedAt}</td>
                <td className="px-3 py-3 text-right text-navy-900 font-medium">{formatFCFA(s.initialFloat)}</td>
                <td className="px-3 py-3"><Badge color={meta.color}>{meta.label}</Badge></td>
                <td className="px-3 py-3 text-navy-600">{s.controller ?? '—'}</td>
                <td className="px-3 py-3 text-right">
                  <Button size="sm" variant="secondary" onClick={() => onPrint(s.id)}>
                    <Printer className="w-4 h-4 mr-1" /> Journal
                  </Button>
                  <span className="ml-2 text-xs text-navy-400">{s.status === 'cloturee' ? 'réimpression = duplicata' : 'provisoire'}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ── Formulaire d'ouverture ────────────────────────────────────────── */

function OpenForm({ user, onClose }: { user: LoginSession; onClose: () => void }) {
  const state = getCashState();
  const [registerId, setRegisterId] = useState(state.registers.find((r) => r.active)?.id ?? '');
  const [activityDate, setActivityDate] = useState(activityDateToday());
  const [float, setFloat] = useState('0');
  const [origin, setOrigin] = useState('Coffre — remise par le responsable');
  const [note, setNote] = useState('');
  const [count, setCount] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const counted = DENOMINATIONS.reduce((s, d) => s + d * (Number(count[d]) || 0), 0);
  const expected = Number(float) || 0;
  const gap = expected - counted;

  function submit() {
    setBusy(true);
    setError(null);
    try {
      openSession({
        agent: user.fullName,
        registerId,
        activityDate,
        initialFloat: expected,
        floatOrigin: origin,
        note: note || undefined,
        count: DENOMINATIONS.filter((d) => Number(count[d]) > 0).map((d) => ({ coupure: d, quantity: Number(count[d]) })),
        expectedFloat: expected,
      });
      onClose();
    } catch (e) {
      setError(e instanceof CashRuleError ? e.message : 'Erreur inattendue');
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Ouverture de caisse" subtitle={`Agent : ${user.fullName} (utilisateur actif — non modifiable)`} />
      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select label="Poste de caisse" value={registerId} onChange={setRegisterId} options={state.registers.filter((r) => r.active).map((r) => ({ value: r.id, label: `${r.name} — ${r.location}` }))} />
        <Input label="Date d'activité" value={activityDate} onChange={setActivityDate} type="date" />
        <Input label="Fonds initial attendu (FCFA)" value={float} onChange={setFloat} type="number" />
        <Input label="Origine du fonds" value={origin} onChange={setOrigin} />
        <div className="md:col-span-2">
          <p className="text-sm font-medium text-navy-700 mb-2">Détail du comptage par coupure et pièce</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            {DENOMINATIONS.map((d) => (
              <div key={d}>
                <label className="block text-xs text-navy-500">{d.toLocaleString('fr-FR')}</label>
                <input
                  type="number"
                  min={0}
                  value={count[d] ?? ''}
                  onChange={(e) => setCount((prev) => ({ ...prev, [d]: e.target.value }))}
                  placeholder="0"
                  className="w-full px-2 py-1.5 rounded-lg border border-navy-200 text-sm focus:outline-none focus:ring-2 focus:ring-medical-400"
                />
              </div>
            ))}
          </div>
        </div>
        <div className="md:col-span-2 rounded-lg bg-navy-50 p-3 text-sm">
          <p>Compté : <strong>{formatFCFA(counted)}</strong> · Attendu : <strong>{formatFCFA(expected)}</strong></p>
          {gap !== 0 && <p className={gap > 0 ? 'text-green-700' : 'text-red-600'}>Écart : {formatFCFA(Math.abs(gap))} {gap > 0 ? 'en excédent' : 'en manquant'}</p>}
        </div>
        <div className="md:col-span-2">
          <TextArea label="Observation (obligatoire en cas d'écart)" value={note} onChange={setNote} rows={2} />
        </div>
        {error && <p className="md:col-span-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        <div className="md:col-span-2 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Annuler</Button>
          <Button onClick={submit} disabled={busy}>
            <Banknote className="w-4 h-4 mr-1.5" /> {busy ? 'Enregistrement…' : 'Enregistrer l’ouverture'}
          </Button>
        </div>
      </div>
    </Card>
  );
}

/* ── Avec session active ───────────────────────────────────────────── */

function SessionView({ user, session, docs, onOpenDoc, onPrintJournal }: { user: LoginSession; session: CashSession; docs: BillingDoc[]; onOpenDoc: (id: string) => void; onPrintJournal: (id: string) => void }) {
  const state = getCashState();
  const totals = sessionTotals(session.id);
  const movements = state.movements.filter((m) => m.sessionId === session.id);
  const locked = session.status !== 'ouverte';
  const [tab, setTab] = useState<'journal' | 'cloture'>('journal');

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Info label="N° session" value={session.number} mono />
          <Info label="Poste" value={state.registers.find((r) => r.id === session.registerId)?.name ?? '—'} />
          <Info label="Titulaire" value={session.agent} />
          <Info label="Ouverture" value={session.openedAt} />
          <Info label="Fonds initial" value={formatFCFA(session.initialFloat)} />
          <Info label="Solde théorique espèces" value={formatFCFA(totals.theoreticalCash)} strong />
        </div>
        {session.status === 'soumise-au-controle' && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-turquoise-50 border border-turquoise-200 px-3 py-2 text-sm text-turquoise-800">
            <Lock className="w-4 h-4" /> En attente de validation du responsable — nouvelles transactions bloquées. Consultation et impression restent disponibles.
          </div>
        )}
        {session.status === 'cloturee' && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-navy-50 border border-navy-200 px-3 py-2 text-sm text-navy-700">
            <Lock className="w-4 h-4" /> Caisse clôturée — journal conservé en lecture seule. Une nouvelle ouverture est possible selon les règles en vigueur.
          </div>
        )}
        {session.status === 'correction-demandee' && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            <p className="font-medium">Correction demandée par {session.controller}</p>
            <p>{session.returnedReason}</p>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-xs text-navy-500 font-medium">Encaissements par mode</p>
          {totals.byMode.length === 0 ? (
            <p className="text-sm text-navy-400 mt-2">Aucun encaissement.</p>
          ) : (
            totals.byMode.map((m) => (
              <div key={m.mode} className="flex justify-between text-sm mt-2">
                <span className="text-navy-600">{m.mode}</span>
                <span className="font-medium text-navy-900">{formatFCFA(m.confirmed)}</span>
                {m.pending > 0 && <Badge color="amber">{formatFCFA(m.pending)} en attente</Badge>}
              </div>
            ))
          )}
        </Card>
        <Card className="p-4">
          <p className="text-xs text-navy-500 font-medium">Mouvements d'espèces</p>
          <div className="flex justify-between text-sm mt-2"><span className="text-green-700 flex items-center gap-1"><ArrowDownCircle className="w-4 h-4" /> Entrées</span><span className="font-medium">{formatFCFA(totals.cashIn)}</span></div>
          <div className="flex justify-between text-sm mt-1"><span className="text-red-600 flex items-center gap-1"><ArrowUpCircle className="w-4 h-4" /> Sorties</span><span className="font-medium">{formatFCFA(totals.cashOut)}</span></div>
          <div className="flex justify-between text-sm mt-1"><span className="text-navy-600">Solde théorique</span><span className="font-bold text-medical-700">{formatFCFA(totals.theoreticalCash)}</span></div>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-navy-500 font-medium">Avances non affectées</p>
          <p className="text-xl font-bold text-navy-900 mt-2">{formatFCFA(totals.advancesAvailable)}</p>
          <p className="text-xs text-navy-400 mt-1">{totals.pendingCount} opération(s) en attente</p>
        </Card>
      </div>

      {!locked && <ActionBars user={user} session={session} docs={docs} onOpenDoc={onOpenDoc} />}
      {locked && (
        <Card className="p-4 text-sm text-navy-600">
          <p className="font-medium text-navy-800">Transactions de la session figées</p>
          <p className="text-xs mt-1">Aucun nouvel encaissement, remboursement ou mouvement de fonds n'est possible tant que la session n'est pas validée ou renvoyée pour correction.</p>
        </Card>
      )}

      <div className="flex gap-2">
        <Button variant={tab === 'journal' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('journal')}>Journal de session</Button>
        <Button variant={tab === 'cloture' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('cloture')}>Clôture</Button>
      </div>

      {tab === 'journal' ? (
        <JournalView session={session} movements={movements} onPrint={() => onPrintJournal(session.id)} />
      ) : (
        <ClosureView user={user} session={session} />
      )}
    </div>
  );
}

function Info({ label, value, mono, strong }: { label: string; value: string; mono?: boolean; strong?: boolean }) {
  return (
    <div>
      <p className="text-xs text-navy-400 font-medium">{label}</p>
      <p className={`text-sm ${mono ? 'font-mono' : ''} ${strong ? 'font-bold text-medical-700' : 'font-medium text-navy-900'}`}>{value}</p>
    </div>
  );
}

/* ── Barres d'actions (encaisser, avance, remb., mouvement) ────────── */

function ActionBars({ user, session, docs, onOpenDoc }: { user: LoginSession; session: CashSession; docs: BillingDoc[]; onOpenDoc: (docId: string) => void }) {
  const [modal, setModal] = useState<null | 'paiement' | 'avance' | 'remboursement' | 'mouvement'>(null);
  const openDocs = docs.filter((d) => ['valide', 'partiellement-paye', 'en-attente'].includes(d.status));

  return (
    <Card className="p-4">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => setModal('paiement')}><Wallet className="w-4 h-4 mr-1" /> Encaisser</Button>
        <Button size="sm" variant="secondary" onClick={() => setModal('avance')}><Banknote className="w-4 h-4 mr-1" /> Avance / acompte</Button>
        <Button size="sm" variant="secondary" onClick={() => setModal('remboursement')}><RefreshCw className="w-4 h-4 mr-1" /> Remboursement</Button>
        <Button size="sm" variant="secondary" onClick={() => setModal('mouvement')}><ArrowUpCircle className="w-4 h-4 mr-1" /> Mouvement de fonds</Button>
        {openDocs[0] && (
          <Button size="sm" variant="ghost" onClick={() => onOpenDoc(openDocs[0].id)}><FileText className="w-4 h-4 mr-1" /> Consulter une facture</Button>
        )}
      </div>
      {modal === 'paiement' && <PaymentModal user={user} session={session} docs={openDocs} onClose={() => setModal(null)} />}
      {modal === 'avance' && <AdvanceModal user={user} session={session} onClose={() => setModal(null)} />}
      {modal === 'remboursement' && <RefundModal user={user} session={session} onClose={() => setModal(null)} />}
      {modal === 'mouvement' && <FundsModal user={user} session={session} onClose={() => setModal(null)} />}
    </Card>
  );
}

/* ── Modale encaissement (multi-modes + espèces remise/monnaie) ────── */

function PaymentModal({ user, session, docs, onClose }: { user: LoginSession; session: CashSession; docs: BillingDoc[]; onClose: () => void }) {
  const [docId, setDocId] = useState(docs[0]?.id ?? '');
  const doc = docs.find((d) => d.id === docId);
  const totals = doc ? docTotals(doc) : null;
  const [lines, setLines] = useState<PaymentSplitLine[]>([{ mode: 'Espèces', amount: 0, reference: '', cashGiven: 0, cashChange: 0, state: 'confirme' }]);
  const [error, setError] = useState<string | null>(null);

  const totalSplit = lines.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const due = totals?.restePatient ?? 0;

  function addLine() {
    setLines((prev) => [...prev, { mode: 'Espèces', amount: 0, reference: '', cashGiven: 0, cashChange: 0, state: 'confirme' }]);
  }

  function updateLine(i: number, patch: Partial<PaymentSplitLine>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  function submit() {
    setError(null);
    if (totalSplit <= 0) return setError('Le montant doit être supérieur à zéro.');
    if (totalSplit > due) return setError(`Montant supérieur au solde dû (${formatFCFA(due)}).`);
    try {
      const created = addPayment({
        sessionId: session.id,
        agent: user.fullName,
        docId,
        lines: lines.map((l) => ({ ...l, amount: Number(l.amount) })),
      });
      window.alert(`Reçu ${created[0]?.number ?? ''} émis au nom de ${user.fullName} — ${formatFCFA(totalSplit)}\nVentilation : ${created.map((c) => `${c.mode} ${formatFCFA(c.amount)}`).join(' / ')}`);
      onClose();
    } catch (e) {
      setError(e instanceof CashRuleError ? e.message : 'Erreur inattendue');
    }
  }

  return (
    <ModalShell title="Encaisser sur une facture" onClose={onClose}>
      <Select label="Facture" value={docId} onChange={setDocId} options={docs.map((d) => ({ value: d.id, label: `${d.number} — ${patients.find((p) => p.id === d.patientId)?.firstName} ${patients.find((p) => p.id === d.patientId)?.lastName} — solde ${formatFCFA(docTotals(d).restePatient)}` }))} />
      {totals && (
        <div className="rounded-lg bg-navy-50 p-3 text-sm grid grid-cols-3 gap-2">
          <p>Part patient : <strong>{formatFCFA(totals.partPatient)}</strong></p>
          <p>Déjà encaissé : <strong>{formatFCFA(totals.encaisse)}</strong></p>
          <p>Solde dû : <strong className="text-medical-700">{formatFCFA(totals.restePatient)}</strong></p>
        </div>
      )}
      {lines.map((l, i) => (
        <div key={i} className="grid grid-cols-1 sm:grid-cols-3 gap-2 rounded-lg border border-navy-100 p-3">
          <Select label="Mode" value={l.mode} onChange={(v) => updateLine(i, { mode: v as PaymentSplitLine['mode'] })} options={CASH_PAYMENT_MODES.map((m) => ({ value: m, label: m }))} />
          <Input label="Montant appliqué (FCFA)" type="number" value={String(l.amount)} onChange={(v) => updateLine(i, { amount: Number(v) })} />
          {l.mode === 'Espèces' ? (
            <>
              <Input label="Somme remise" type="number" value={String(l.cashGiven ?? '')} onChange={(v) => updateLine(i, { cashGiven: Number(v) })} />
              <Input label="Monnaie rendue" type="number" value={String(l.cashChange ?? '')} onChange={(v) => updateLine(i, { cashChange: Number(v) })} />
              <p className="text-xs text-navy-500 sm:col-span-3">Entrée réelle d'espèces : {formatFCFA(Math.max(0, (l.cashGiven ?? 0) - (l.cashChange ?? 0)))}</p>
            </>
          ) : (
            <>
              <Input label="Référence (transaction, chèque…)" value={l.reference ?? ''} onChange={(v) => updateLine(i, { reference: v })} />
              <Select label="État" value={l.state ?? 'en-attente'} onChange={(v) => updateLine(i, { state: v as PaymentSplitLine['state'] })} options={Object.entries(CASH_PAYMENT_STATE_META).map(([k, m]) => ({ value: k, label: m.label }))} />
            </>
          )}
        </div>
      ))}
      <Button variant="ghost" size="sm" onClick={addLine}>+ Ajouter un mode (paiement réparti)</Button>
      <p className="text-sm">Total réparti : <strong>{formatFCFA(totalSplit)}</strong> / solde dû {formatFCFA(due)}</p>
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Annuler</Button>
        <Button onClick={submit} disabled={!doc}>Encaisser et émettre le reçu</Button>
      </div>
    </ModalShell>
  );
}

/* ── Modale avance ─────────────────────────────────────────────────── */

function AdvanceModal({ user, session, onClose }: { user: LoginSession; session: CashSession; onClose: () => void }) {
  const [beneficiary, setBeneficiary] = useState('');
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('Espèces');
  const [reason, setReason] = useState('');
  const [cashGiven, setCashGiven] = useState('');
  const [cashChange, setCashChange] = useState('');
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    try {
      const adv = addAdvance({
        sessionId: session.id,
        agent: user.fullName,
        beneficiary,
        amount: Number(amount),
        mode: mode as PaymentSplitLine['mode'],
        reason,
        cashGiven: Number(cashGiven) || undefined,
        cashChange: Number(cashChange) || undefined,
      });
      window.alert(`Avance ${adv.number} enregistrée — l'argent est reçu mais non affecté à une facture.`);
      onClose();
    } catch (e) {
      setError(e instanceof CashRuleError ? e.message : 'Erreur inattendue');
    }
  }

  return (
    <ModalShell title="Avance / acompte" onClose={onClose}>
      <Input label="Bénéficiaire" value={beneficiary} onChange={setBeneficiary} required />
      <Input label="Montant (FCFA)" type="number" value={amount} onChange={setAmount} required />
      <Select label="Mode" value={mode} onChange={setMode} options={CASH_PAYMENT_MODES.map((m) => ({ value: m, label: m }))} />
      {mode === 'Espèces' && (
        <div className="grid grid-cols-2 gap-2">
          <Input label="Somme remise" type="number" value={cashGiven} onChange={setCashGiven} />
          <Input label="Monnaie rendue" type="number" value={cashChange} onChange={setCashChange} />
        </div>
      )}
      <TextArea label="Motif" value={reason} onChange={setReason} rows={2} required />
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Annuler</Button>
        <Button onClick={submit}>Enregistrer l'avance</Button>
      </div>
    </ModalShell>
  );
}

/* ── Modale remboursement ──────────────────────────────────────────── */

function RefundModal({ user, session, onClose }: { user: LoginSession; session: CashSession; onClose: () => void }) {
  const state = getCashState();
  const payIns = state.movements.filter((m) => m.kind === 'encaissement' && m.status === 'actif' && !m.advanceId && m.paymentState === 'confirme');
  const [paymentId, setPaymentId] = useState('');
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('Espèces');
  const [reason, setReason] = useState('');
  const [beneficiary, setBeneficiary] = useState('');
  const [error, setError] = useState<string | null>(null);

  const src = payIns.find((p) => p.id === paymentId);

  function submit() {
    setError(null);
    try {
      const mv = requestRefund({
        sessionId: session.id,
        agent: user.fullName,
        refundOfPaymentId: paymentId || undefined,
        amount: Number(amount),
        mode: mode as PaymentSplitLine['mode'],
        reason,
        beneficiary,
        settings: state.settings,
      });
      window.alert(`${mv.paymentState === 'en-attente' ? 'Demande soumise à approbation' : 'Remboursement enregistré'} — ${mv.number}`);
      onClose();
    } catch (e) {
      setError(e instanceof CashRuleError ? e.message : 'Erreur inattendue');
    }
  }

  return (
    <ModalShell title="Remboursement (sortie réelle d'argent)" onClose={onClose}>
      <Select
        label="Paiement d'origine (optionnel — limite le montant disponible)"
        value={paymentId}
        onChange={setPaymentId}
        options={[{ value: '', label: '— Sans paiement lié —' }, ...payIns.slice(0, 30).map((p) => ({ value: p.id, label: `${p.number} — ${formatFCFA(p.amount)} — ${p.mode} — ${p.label}` }))]}
      />
      {src && <p className="text-xs text-navy-500">Montant payé : {formatFCFA(src.amount)} — remboursé/en cours : {formatFCFA(state.movements.filter((m) => m.refundOfPaymentId === src.id && m.status === 'actif' && m.kind === 'remboursement').reduce((s, m) => s + m.amount, 0))}</p>}
      <Input label="Montant (FCFA)" type="number" value={amount} onChange={setAmount} required />
      <Select label="Mode de remboursement" value={mode} onChange={setMode} options={CASH_PAYMENT_MODES.map((m) => ({ value: m, label: m }))} />
      <Input label="Bénéficiaire" value={beneficiary} onChange={setBeneficiary} required />
      <TextArea label="Motif" value={reason} onChange={setReason} rows={2} required />
      {mode === 'Espèces' && Number(amount) >= state.settings.refundApprovalThreshold && (
        <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">Au-delà de {formatFCFA(state.settings.refundApprovalThreshold)}, l'approbation du responsable est requise (elle ne peut pas être donnée par l'auteur).</p>
      )}
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Annuler</Button>
        <Button onClick={submit}>Enregistrer</Button>
      </div>
    </ModalShell>
  );
}

/* ── Modale mouvement de fonds ─────────────────────────────────────── */

function FundsModal({ user, session, onClose }: { user: LoginSession; session: CashSession; onClose: () => void }) {
  const state = getCashState();
  const otherSessions = state.sessions.filter((s) => s.id !== session.id && s.status === 'ouverte');
  const [kind, setKind] = useState('apport-fonds');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [counterpart, setCounterpart] = useState('');
  const [targetSession, setTargetSession] = useState('');
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    try {
      addFundsMovement({
        sessionId: session.id,
        agent: user.fullName,
        kind: kind as Parameters<typeof addFundsMovement>[0]['kind'],
        amount: Number(amount),
        reason,
        counterpart,
        transferToSessionId: kind === 'transfert-sortant' ? targetSession : undefined,
      });
      onClose();
    } catch (e) {
      setError(e instanceof CashRuleError ? e.message : 'Erreur inattendue');
    }
  }

  return (
    <ModalShell title="Mouvement de fonds (aucune recette clinique)" onClose={onClose}>
      <Select
        label="Type"
        value={kind}
        onChange={setKind}
        options={[
          { value: 'apport-fonds', label: 'Apport de fonds' },
          { value: 'retrait-securite', label: 'Retrait de sécurité' },
          { value: 'remise-responsable', label: 'Remise au responsable / coffre' },
          { value: 'transfert-sortant', label: 'Transfert vers une autre caisse' },
          { value: 'sortie-exceptionnelle', label: 'Sortie exceptionnelle (approbation requise)' },
        ]}
      />
      <Input label="Montant (FCFA)" type="number" value={amount} onChange={setAmount} required />
      {kind === 'transfert-sortant' && otherSessions.length > 0 && (
        <Select label="Caisse destinataire" value={targetSession} onChange={setTargetSession} options={[{ value: '', label: '— Choisir —' }, ...otherSessions.map((s) => ({ value: s.id, label: `${s.number} — ${s.agent}` }))]} />
      )}
      <Input label={kind === 'transfert-sortant' ? 'Destinataire' : 'Origine / destinataire'} value={counterpart} onChange={setCounterpart} />
      <TextArea label="Motif" value={reason} onChange={setReason} rows={2} required />
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Annuler</Button>
        <Button onClick={submit}>Enregistrer le mouvement</Button>
      </div>
    </ModalShell>
  );
}

/* ── Journal (consultation à l'écran + impression) ─────────────────── */

function JournalView({ session, movements, onPrint }: { session: CashSession; movements: CashMovement[]; onPrint: () => void }) {
  let running = session.initialFloat;
  const rows = [...movements].reverse().map((m) => {
    const sign = m.cashAmount > 0 ? (m.kind === 'encaissement' || m.kind === 'apport-fonds' || m.kind === 'transfert-entrant' ? 1 : -1) : 0;
    running += sign * m.cashAmount;
    return { m, sign, running };
  });
  const readOnly = session.status === 'cloturee' || session.status === 'soumise-au-controle';

  return (
    <Card>
      <CardHeader
        title="Journal de caisse"
        subtitle={readOnly ? 'Lecture seule (session soumise ou clôturée)' : 'Toutes les opérations de la session'}
        action={
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={onPrint}><Printer className="w-4 h-4 mr-1" /> Imprimer</Button>
          </div>
        }
      />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-navy-100 text-left text-navy-500">
              <th className="px-3 py-2 font-medium">Heure</th>
              <th className="px-3 py-2 font-medium">N°</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium">Libellé</th>
              <th className="px-3 py-2 font-medium">Mode</th>
              <th className="px-3 py-2 text-right font-medium">Entrée</th>
              <th className="px-3 py-2 text-right font-medium">Sortie</th>
              <th className="px-3 py-2 text-right font-medium">Solde espèces</th>
              <th className="px-3 py-2 font-medium">État</th>
              <th className="px-3 py-2 font-medium">Auteur</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ m, sign, running: bal }) => {
              const stMeta = CASH_PAYMENT_STATE_META[m.paymentState];
              return (
                <tr key={m.id} className="border-b border-navy-50">
                  <td className="px-3 py-2 text-navy-500 text-xs whitespace-nowrap">{m.occurredAt.split(' ').pop()}</td>
                  <td className="px-3 py-2 font-mono text-xs text-medical-700">{m.number}</td>
                  <td className="px-3 py-2 text-navy-700">{m.kind === 'encaissement' ? (m.advanceId ? 'Avance' : 'Encaissement') : m.kind === 'remboursement' ? 'Remboursement' : m.kind === 'retrait-securite' ? 'Retrait sécu.' : 'Mouvement'}</td>
                  <td className="px-3 py-2 text-navy-700">{m.label}{m.status === 'annule' ? ' (annulé)' : ''}</td>
                  <td className="px-3 py-2 text-navy-600">{m.mode}</td>
                  <td className="px-3 py-2 text-right text-green-700">{sign > 0 ? formatFCFA(m.cashAmount) : '—'}</td>
                  <td className="px-3 py-2 text-right text-red-600">{sign < 0 ? formatFCFA(m.cashAmount) : '—'}</td>
                  <td className="px-3 py-2 text-right font-medium text-navy-900">{formatFCFA(bal)}</td>
                  <td className="px-3 py-2"><Badge color={stMeta.color}>{stMeta.label}</Badge></td>
                  <td className="px-3 py-2 text-xs text-navy-500">{m.createdBy}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && <EmptyState icon={FileText} title="Aucune opération" subtitle="Les mouvements de la session apparaîtront ici." />}
    </Card>
  );
}

/* ── Clôture : formulaire complet ──────────────────────────────────── */

function ClosureView({ user, session }: { user: LoginSession; session: CashSession }) {
  const state = getCashState();
  const totals = sessionTotals(session.id);
  const theoretical = theoreticalCash(session.id);
  const submitted = session.status === 'soumise-au-controle';
  const preparing = session.status === 'cloture-en-preparation' || session.status === 'correction-demandee';

  const [count, setCount] = useState<Record<number, string>>({});
  const [countedInput, setCountedInput] = useState('');
  const [gapReason, setGapReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const detailedCount = countTotal(DENOMINATIONS.filter((d) => Number(count[d]) > 0).map((d) => ({ coupure: d, quantity: Number(count[d]) })));
  const counted = countedInput !== '' ? Number(countedInput) || 0 : detailedCount;
  const gap = counted - theoretical;

  function printProvisional() {
    try {
      resumeOperations(user.fullName, session.id);
      window.alert('Comptage abandonné — la session est rouverte. Le journal provisoire peut être imprimé depuis la barre d’actions.');
    } catch {
      window.alert('Le journal provisoire est disponible depuis la barre d’actions « Imprimer le journal ».');
    }
  }

  function submit() {
    setError(null);
    try {
      const r = submitClosure({
        agent: user.fullName,
        sessionId: session.id,
        count: DENOMINATIONS.filter((d) => Number(count[d]) > 0).map((d) => ({ coupure: d, quantity: Number(count[d]) })),
        countedTotal: countedInput !== '' ? Number(countedInput) || 0 : undefined,
        gapReason: gap !== 0 ? gapReason.trim() || undefined : undefined,
      });
      window.alert(`Clôture soumise au contrôle. Écart : ${formatFCFA(r.gap)}. Une tâche de validation a été créée pour le responsable du suivi des caisses.`);
    } catch (e) {
      setError(e instanceof CashRuleError ? e.message : 'Erreur');
    }
  }

  if (submitted) {
    return (
      <Card>
        <CardHeader title="Clôture soumise" subtitle="En attente de validation du responsable du suivi des caisses" />
        <div className="p-5 space-y-3 text-sm">
          <div className="rounded-lg bg-turquoise-50 border border-turquoise-200 p-3 text-turquoise-800">
            <p className="font-medium">En attente de validation du responsable</p>
            <p>Compté : {formatFCFA(session.submittedTotal ?? 0)} · Théorique : {formatFCFA(theoretical)} · Écart déclaré : {formatFCFA(session.submittedGap ?? 0)}</p>
            {session.submittedGapReason && <p className="text-xs mt-1">Justification : {session.submittedGapReason}</p>}
            <p className="text-xs mt-1">La session est figée. Consultation et impression du journal restent disponibles.</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader title="Clôture de caisse" subtitle="Formule : fonds initial + encaissements espèces + apports/transferts entrants − remboursements − retraits/remises/transferts sortants" />
      <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Récapitulatif de session */}
        <div className="space-y-1 text-sm">
          <p className="font-medium text-navy-800">Session {session.number} — {session.agent}</p>
          <p className="text-xs text-navy-500">Ouverture : {session.openedAt} · Fonds initial : {formatFCFA(session.initialFloat)}</p>
          <div className="pt-2 space-y-1">
            <Line label="Fonds initial" value={session.initialFloat} />
            {totals.byMode.map((m) => (
              <div key={m.mode} className="flex justify-between">
                <span className="text-navy-600">Encaissements {m.mode}</span>
                <span>{formatFCFA(m.confirmed)}{m.pending > 0 ? ` (+${formatFCFA(m.pending)} en attente)` : ''}</span>
              </div>
            ))}
            <Line label="Remboursements espèces" value={-Math.max(0, totals.cashOut - internalOut(state, session.id))} />
            <Line label="Apports / transferts entrants" value={totals.cashIn - cashInFromPayments(session.id)} />
            <Line label="Retraits / remises / transferts sortants" value={-internalOut(state, session.id)} />
            <Line label="Solde théorique en espèces" value={theoretical} strong />
            {totals.pendingCount > 0 && (
              <p className="text-xs text-amber-700 mt-1">{totals.pendingCount} opération(s) en attente — non comptée(s) comme encaissée(s).</p>
            )}
            {totals.byMode.filter((m) => m.mode !== 'Espèces').length > 0 && (
              <div className="pt-2 border-t border-navy-100">
                <p className="text-xs font-medium text-navy-500 mb-1">Modes non espèces (séparés des espèces)</p>
                {totals.byMode.filter((m) => m.mode !== 'Espèces').map((m) => (
                  <div key={m.mode} className="flex justify-between text-xs">
                    <span className="text-navy-600">{m.mode}</span>
                    <span>{formatFCFA(m.confirmed)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Comptage */}
        <div className="space-y-3">
          {preparing ? (
            <>
              <Input label="Montant réellement compté (FCFA)" type="number" value={countedInput} onChange={setCountedInput} placeholder={String(detailedCount)} />
              <p className="text-sm font-medium text-navy-700">Détail facultatif par coupure et pièce</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {DENOMINATIONS.map((d) => (
                  <div key={d}>
                    <label className="block text-xs text-navy-500">{d.toLocaleString('fr-FR')}</label>
                    <input type="number" min={0} value={count[d] ?? ''} onChange={(e) => setCount((p) => ({ ...p, [d]: e.target.value }))} placeholder="0" className="w-full px-2 py-1.5 rounded-lg border border-navy-200 text-sm focus:outline-none focus:ring-2 focus:ring-medical-400" />
                  </div>
                ))}
              </div>
              <div className={`rounded-lg p-3 text-sm ${gap === 0 ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>
                Compté : <strong>{formatFCFA(counted)}</strong> · Théorique : <strong>{formatFCFA(theoretical)}</strong> · Écart : <strong>{formatFCFA(gap)}</strong>
              </div>
              {gap !== 0 && <TextArea label="Justification de l'écart (obligatoire)" value={gapReason} onChange={setGapReason} rows={2} />}
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={printProvisional}><Printer className="w-4 h-4 mr-1.5" /> Imprimer le journal provisoire</Button>
                <Button onClick={submit} disabled={(counted === 0 && theoretical !== 0) || (gap !== 0 && !gapReason.trim())}>
                  <ShieldAlert className="w-4 h-4 mr-1.5" /> Soumettre la clôture au responsable
                </Button>
              </div>
              <p className="text-xs text-navy-400">Après soumission, la session est figée et passe en « En attente de validation ». La clôture ne crée aucune remise d'espèces : seule une remise explicitement enregistrée au coffre est prise en compte.</p>
            </>
          ) : (
            <>
              <p className="text-sm text-navy-500">Préparez votre clôture : les nouveaux mouvements seront suspendus pendant le comptage.</p>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button onClick={() => prepareClosure(user.fullName, session.id)}><Lock className="w-4 h-4 mr-1.5" /> Préparer ma clôture (suspendre les mouvements)</Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

/* Aides pour la ventilation du récapitulatif de clôture */
function cashInFromPayments(sessionId: string): number {
  const s = getCashState();
  return s.movements
    .filter((m) => m.sessionId === sessionId && m.status === 'actif' && m.kind === 'encaissement' && m.cashAmount > 0 && MOVEMENT_IN_KINDS.includes(m.kind))
    .reduce((sum, m) => sum + m.cashAmount, 0);
}

function internalOut(state: ReturnType<typeof getCashState>, sessionId: string): number {
  return state.movements
    .filter((m) => m.sessionId === sessionId && m.status === 'actif' && INTERNAL_OUT_KINDS.includes(m.kind) && m.cashAmount > 0)
    .reduce((sum, m) => sum + m.cashAmount, 0);
}

const MOVEMENT_IN_KINDS = ['encaissement', 'apport-fonds', 'transfert-entrant'];
const INTERNAL_OUT_KINDS = ['retrait-securite', 'remise-responsable', 'transfert-sortant', 'sortie-exceptionnelle'];

function Line({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-navy-600">{label}</span>
      <span className={strong ? 'font-bold text-medical-700' : 'font-medium text-navy-900'}>{formatFCFA(value)}</span>
    </div>
  );
}

/* ── Shell de modale ───────────────────────────────────────────────── */

function ModalShell({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-navy-900/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl clinical-shadow max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-navy-100 sticky top-0 bg-white z-10">
          <h3 className="font-semibold text-navy-900">{title}</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>Fermer</Button>
        </div>
        <div className="p-5 space-y-4">{children}</div>
      </div>
    </div>
  );
}
