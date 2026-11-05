import { useEffect, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { AlertTriangle, CheckCircle2, Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import type { ProfileId } from '@/types';

export interface LoginSession {
  identifiant: string;
  profile: ProfileId;
  fullName: string;
}

const DEMO_ACCOUNTS: Record<string, { profile: ProfileId; fullName: string }> = {
  direction: { profile: 'direction', fullName: 'Direction' },
  'a.kone': { profile: 'accueil', fullName: 'A. Koné' },
  'm.diallo': { profile: 'medecin', fullName: 'M. Diallo' },
  'n.coulibaly': { profile: 'soins', fullName: 'N. Coulibaly' },
  's.fofana': { profile: 'laboratoire', fullName: 'S. Fofana' },
  'i.sangare': { profile: 'pharmacie', fullName: 'I. Sangaré' },
  'b.traore': { profile: 'facturation', fullName: 'B. Traoré' },
};

interface LoginProps {
  onLogin: (session: LoginSession) => void;
}

export function Login({ onLogin }: LoginProps) {
  const [identifiant, setIdentifiant] = useState('a.kone');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const timeLabel = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const trackCapsLock = (event: KeyboardEvent<HTMLInputElement>) => {
    setCapsLockOn(event.getModifierState ? event.getModifierState('CapsLock') : false);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const key = identifiant.trim().toLowerCase();
    const account = DEMO_ACCOUNTS[key];
    const displayName = account?.fullName ?? key.charAt(0).toUpperCase() + key.slice(1);
    onLogin({ identifiant: key || 'invite', profile: account?.profile ?? 'accueil', fullName: displayName || 'Invité' });
  };

  return (
    <main className="flex min-h-screen w-full bg-[#f6f8fa] text-navy-900">
      <section className="relative hidden min-h-screen overflow-hidden bg-[#0874b5] px-14 py-12 text-white lg:flex lg:w-[55%] lg:flex-col">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#45a5ca]/45" />
        <div className="pointer-events-none absolute -bottom-28 -left-28 h-72 w-72 rounded-full bg-[#61b1ce]/35" />
        <div className="pointer-events-none absolute right-24 top-1/2 h-40 w-40 rounded-full border border-white/10" />

        <div className="relative z-10 flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-white p-2 shadow-lg shadow-[#075787]/25">
            <img src="/logo_Homea.png" alt="HOMEA" className="h-full w-full object-contain" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/75">CLINIQUe médicalE</p>
            <p className="mt-1 text-xl font-bold tracking-tight">HOMEA</p>
          </div>
        </div>

        <div className="relative z-10 mt-auto max-w-xl pb-12">
          <p className="mb-5 text-sm font-semibold uppercase tracking-[0.18em] text-[#bfeafb]">Dossier patient informatisé</p>
          <h1 className="max-w-xl text-4xl font-bold leading-[1.12] tracking-tight xl:text-5xl">
            Une prise en charge plus simple, plus sûre.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-white/80">
            Retrouvez les dossiers, les soins et les activités de votre établissement dans un espace professionnel sécurisé.
          </p>
          <div className="mt-8 space-y-4 text-sm text-white/90">
            <p className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-[#ffd166]" /> Suivi complet des parcours patients</p>
            <p className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-[#ffd166]" /> Accès contrôlé selon votre rôle</p>
            <p className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-[#ffd166]" /> Données centralisées pour vos équipes</p>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-white/60">
          <span>© 2026 Convergence TIC - Support: +225 01-60-60-77-77 ou 07-48-48-77-77&nbsp;</span>
          <span>{timeLabel}</span>
        </div>
      </section>

      <section className="flex min-h-screen flex-1 items-center justify-center px-5 py-10 sm:px-10 lg:w-[45%] lg:px-16">
        <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl border border-[#dce5eb] bg-white p-7 shadow-[0_18px_45px_-24px_rgba(25,55,75,0.35)] sm:p-9">
          <div className="mb-8 lg:hidden">
            <img src="/logo_Homea.png" alt="HOMEA" className="h-16 w-auto object-contain" />
          </div>
          <div className="mb-7">
            <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-medical-600">
              <Lock className="h-3.5 w-3.5" /> Accès sécurisé
            </div>
            <h2 className="text-3xl font-bold leading-tight tracking-tight text-[#17354b]">Connexion à votre espace</h2>
            <p className="mt-3 text-sm leading-6 text-[#708392]">Utilisez vos identifiants professionnels HOMEA.</p>
          </div>

          <div className="space-y-5">
            <div>
              <label htmlFor="login-identifiant" className="block text-xs font-semibold text-[#355168]">Identifiant professionnel</label>
              <input
                id="login-identifiant"
                type="text"
                value={identifiant}
                onChange={(event) => setIdentifiant(event.target.value)}
                autoComplete="username"
                className="mt-2 w-full rounded-lg border border-[#cbd9e2] bg-white px-3.5 py-3 text-sm text-[#17354b] outline-none transition focus:border-medical-500 focus:ring-4 focus:ring-medical-100"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-xs font-semibold text-[#355168]">Mot de passe</label>
              <div className="relative mt-2">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  onKeyDown={trackCapsLock}
                  onKeyUp={trackCapsLock}
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-[#cbd9e2] bg-white px-3.5 py-3 pr-12 text-sm tracking-widest text-[#17354b] outline-none transition focus:border-medical-500 focus:ring-4 focus:ring-medical-100"
                />
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-[#6f8798] transition hover:bg-medical-50 hover:text-medical-700" aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {capsLockOn && <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-amber-600"><AlertTriangle className="h-3.5 w-3.5" /> Majuscules activées</p>}
            </div>

            <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0874b5] py-3 text-sm font-bold text-white shadow-md shadow-[#0874b5]/20 transition hover:bg-[#075f94] hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-medical-100">
              Se connecter <span aria-hidden="true">→</span>
            </button>
          </div>

          <div className="mt-7 border-t border-[#edf1f4] pt-5 text-center">
            <p className="text-xs leading-5 text-[#8798a4]">En cas de difficulté, contactez l’administrateur du DPI.</p>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-[#a0adb6]"><Lock className="h-3 w-3" /> Chaque connexion est enregistrée.</p>
          </div>
        </form>
      </section>
    </main>
  );
}
