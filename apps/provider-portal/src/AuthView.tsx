import React, { useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, BookOpen, CheckCircle2, Eye, EyeOff, Lock, Mail, UserRound } from 'lucide-react';

export type AuthMode = 'login' | 'signup';

interface AuthViewProps {
  apiBase: string;
  onAuthenticated: (token: string, user: any) => void;
  onModeChange: (mode: AuthMode) => void;
  onOpenDocs: () => void;
  onOpenOverview: () => void;
  initialEmail?: string;
  initialMode?: AuthMode;
}

const inputClassName = 'w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-sm text-white placeholder:text-slate-500 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/15';

export const AuthView: React.FC<AuthViewProps> = ({
  apiBase,
  onAuthenticated,
  onModeChange,
  onOpenDocs,
  onOpenOverview,
  initialEmail = '',
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState(initialEmail);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => { setMode(initialMode); }, [initialMode]);
  useEffect(() => { if (initialEmail) setEmail(initialEmail); }, [initialEmail]);

  const changeMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError(null);
    setSuccess(null);
    onModeChange(nextMode);
  };

  const returnTo = () => {
    const requested = new URLSearchParams(window.location.search).get('returnTo');
    if (requested && /^\/\?tab=(apps|sandbox|certification|inspector|onboarding|overview)$/.test(requested)) return requested;
    return mode === 'signup' ? '/?tab=onboarding' : '/?tab=apps';
  };

  const handleGoogle = () => {
    window.location.assign(`${apiBase}/api/v1/auth/google/start?returnTo=${encodeURIComponent(returnTo())}`);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setError('Email va parolni kiriting.');
      return;
    }
    if (mode === 'signup' && name.trim().length < 2) {
      setError('Ismingiz yoki tashkilot nomini kiriting.');
      return;
    }
    if (mode === 'signup' && password.length < 12) {
      setError('Parol kamida 12 belgidan iborat bo‘lishi kerak.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/api/v1/auth/${mode === 'signup' ? 'register-owner' : 'login'}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mode === 'signup'
          ? { name: name.trim(), email: cleanEmail, password }
          : { email: cleanEmail, password }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.accessToken || !data?.user) {
        throw new Error(data?.message || (mode === 'signup' ? 'Hisob yaratilmadi.' : 'Email yoki parol noto‘g‘ri.'));
      }
      setSuccess(mode === 'signup' ? 'Hisob yaratildi. Onboarding ochilmoqda…' : 'Muvaffaqiyatli kirildi.');
      onAuthenticated(data.accessToken, data.user);
    } catch (caught: any) {
      setError(caught?.message || 'So‘rovni bajarib bo‘lmadi. Qayta urinib ko‘ring.');
    } finally {
      setLoading(false);
    }
  };

  const isSignup = mode === 'signup';
  return (
    <div className="min-h-dvh bg-[#090d15] px-5 py-6 text-slate-100 sm:px-8 sm:py-8">
      <header className="mx-auto flex max-w-6xl items-center justify-between">
        <button type="button" onClick={onOpenOverview} className="flex items-center gap-2.5 rounded-xl text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
          <img src="/logo2.webp" alt="Zayuno" className="h-9 w-9 rounded-lg" />
          <span className="text-base font-extrabold tracking-tight text-white">ZAYUNO<span className="text-indigo-400">.</span></span>
        </button>
        <button type="button" onClick={onOpenDocs} className="inline-flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-400 transition hover:bg-slate-900 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
          <BookOpen size={15} /> Hujjatlar
        </button>
      </header>

      <main className="mx-auto flex min-h-[calc(100dvh-108px)] max-w-md items-center py-10">
        <section className="w-full animate-fadeIn" aria-labelledby="auth-title">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-2xl border border-indigo-400/25 bg-indigo-500/10 text-lg font-bold text-indigo-200">Z</div>
            <h1 id="auth-title" className="text-3xl font-semibold tracking-tight text-white">
              {isSignup ? 'Provider hisobini yarating' : 'Zayuno’ga kiring'}
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              {isSignup ? 'Hisob yarating, keyin biznesingiz API’sini ulaysiz.' : 'Provider workspace va API sozlamalaringizga kiring.'}
            </p>
          </div>

          <button type="button" onClick={handleGoogle} disabled={loading} className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#090d15]">
            <span aria-hidden="true" className="text-base font-bold">G</span>
            {isSignup ? 'Google bilan boshlash' : 'Google bilan davom etish'}
          </button>

          <div className="my-6 flex items-center gap-3 text-[11px] text-slate-500"><span className="h-px flex-1 bg-slate-800" />yoki email bilan<span className="h-px flex-1 bg-slate-800" /></div>

          {error && <div role="alert" className="mb-5 flex gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 p-3 text-xs leading-5 text-rose-200"><AlertCircle size={16} className="mt-0.5 shrink-0" />{error}</div>}
          {success && <div role="status" className="mb-5 flex gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-xs leading-5 text-emerald-200"><CheckCircle2 size={16} className="mt-0.5 shrink-0" />{success}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-300">Ism yoki tashkilot nomi</span><span className="relative block"><UserRound size={16} className="pointer-events-none absolute left-3 top-3.5 text-slate-500" /><input className={`${inputClassName} pl-10`} value={name} onChange={event => setName(event.target.value)} autoComplete="name" placeholder="Masalan, Sahiy Global" required /></span></label>}
            <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-300">Email</span><span className="relative block"><Mail size={16} className="pointer-events-none absolute left-3 top-3.5 text-slate-500" /><input className={`${inputClassName} pl-10`} type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" placeholder="you@business.uz" required /></span></label>
            <label className="block"><span className="mb-1.5 flex justify-between text-xs font-medium text-slate-300">Parol {isSignup && <span className="font-normal text-slate-500">kamida 12 belgi</span>}</span><span className="relative block"><Lock size={16} className="pointer-events-none absolute left-3 top-3.5 text-slate-500" /><input className={`${inputClassName} px-10`} type={showPassword ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} autoComplete={isSignup ? 'new-password' : 'current-password'} placeholder="••••••••••••" required minLength={isSignup ? 12 : undefined} /><button type="button" onClick={() => setShowPassword(value => !value)} className="absolute right-3 top-3 text-slate-500 transition hover:text-white" aria-label={showPassword ? 'Parolni yashirish' : 'Parolni ko‘rsatish'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>
            <button type="submit" disabled={loading} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-950/40 transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300">
              {loading ? 'Kutilmoqda…' : isSignup ? 'Hisob yaratish' : 'Kirish'} {!loading && <ArrowRight size={17} />}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-slate-400">
            {isSignup ? 'Hisobingiz bormi?' : 'Zayuno’da yangi misiz?'}{' '}
            <button type="button" onClick={() => changeMode(isSignup ? 'login' : 'signup')} className="font-semibold text-indigo-300 transition hover:text-indigo-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
              {isSignup ? 'Kirish' : 'Provider bo‘lish'}
            </button>
          </p>
        </section>
      </main>
    </div>
  );
};
