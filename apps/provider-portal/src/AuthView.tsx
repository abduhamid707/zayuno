import React, { useState } from 'react';
import {
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  Zap,
  Bot,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  CreditCard,
  KeyRound,
  FileCheck2,
  ExternalLink,
  BookOpen
} from 'lucide-react';

interface AuthViewProps {
  apiBase: string;
  onLoginSuccess: (token: string, user: any) => void;
  onStartOnboarding: () => void;
  onOpenDocs: () => void;
  initialEmail?: string;
  initialMode?: 'login' | 'verify';
}

export const AuthView: React.FC<AuthViewProps> = ({
  apiBase,
  onLoginSuccess,
  onStartOnboarding,
  onOpenDocs,
  initialEmail = '',
  initialMode = 'login'
}) => {
  const [mode, setMode] = useState<'login' | 'verify'>(initialMode);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [verifyToken, setVerifyToken] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setError('Iltimos, email va parolni kiriting.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password })
      });
      const data = await res.json();
      if (!res.ok) {
        if (data?.message?.includes('isActive') || data?.message?.includes('tasdiqlanmagan')) {
          setError('Hisobingiz faollashtirilmagan. Iltimos, emailingizni tasdiqlang.');
          setMode('verify');
          return;
        }
        throw new Error(data?.message || 'Noto‘g‘ri login yoki parol.');
      }

      if (!data.accessToken) {
        throw new Error('Autentifikatsiya tokeni olinmadi.');
      }

      localStorage.setItem('zayuno_provider_token', data.accessToken);
      localStorage.setItem('zayuno_provider_user', JSON.stringify(data.user));
      onLoginSuccess(data.accessToken, data.user);
    } catch (err: any) {
      setError(err.message || 'Kirishda xatolik yuz berdi.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Verify Email
  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanToken = verifyToken.trim();
    if (!cleanToken) {
      setError('Iltimos, tasdiqlash kodini kiriting.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/v1/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: cleanToken })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || 'Tasdiqlash kodi noto‘g‘ri yoki muddati o‘tgan.');
      }

      // Auto-login if verify-email returns accessToken
      if (data.accessToken && data.user) {
        setSuccessMsg('Email tasdiqlandi! Tizimga avtomatik kirildi.');
        onLoginSuccess(data.accessToken, data.user);
      } else {
        setSuccessMsg('Email muvaffaqiyatli tasdiqlandi! Endi parolingiz bilan tizimga kiring.');
        setMode('login');
      }
    } catch (err: any) {
      setError(err.message || 'Tasdiqlashda xatolik yuz berdi.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Resend Verification
  const handleResend = async () => {
    if (resendCooldown > 0 || !email) return;
    setError(null);
    try {
      const res = await fetch(`${apiBase}/api/v1/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });
      const data = await res.json();
      setSuccessMsg(data?.message || 'Tasdiqlash xati qayta yuborildi.');
      setResendCooldown(60);
    } catch {
      setError('Xatni qayta yuborishda xatolik yuz berdi.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto my-6 sm:my-10 px-4 animate-fadeIn">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left Column: Value Proposition & How it Works (7 cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-indigo-950/40 border border-slate-800 shadow-2xl backdrop-blur-xl space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-mono">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>AI-First Provider Onboarding</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Xizmatingizni <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-sky-300 to-emerald-400">
                ChatGPT va AI Agentlarga
              </span>{' '}
              ulang
            </h1>

            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              Zayuno orqali o‘z biznesingiz va servislaringizni AI agentlariga oching. Mijozlar tabiiy tilda so‘rov yuborganda, agentlar sizning xizmatingizni topadi, narxni hisoblaydi va buyurtmani to‘g‘ridan-to‘g‘ri tizimingizga yetkazadi.
            </p>
          </div>

          {/* 4-Step How it Works Cards */}
          <div className="space-y-3">
            <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400 font-semibold block">
              Qanday ishlaydi?
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1.5 hover:border-slate-700 transition-colors">
                <div className="flex items-center gap-2 font-bold text-white">
                  <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-xs">1</span>
                  <span>Xizmatingizni ulang</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  API va katalogingizni Zayuno universal protokoli orqali ulaysiz.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1.5 hover:border-slate-700 transition-colors">
                <div className="flex items-center gap-2 font-bold text-white">
                  <span className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-300 flex items-center justify-center text-xs">2</span>
                  <span>AI agentlar sizni topadi</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  ChatGPT, Claude va AI yordamchilar mijoz talabiga ko‘ra taklifingizni tanlaydi.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1.5 hover:border-slate-700 transition-colors">
                <div className="flex items-center gap-2 font-bold text-white">
                  <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center text-xs">3</span>
                  <span>Mijoz narxni tasdiqlaydi</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Kotirovka va yetkazish shartlari shaffof shakllanadi va tasdiqlanadi.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1.5 hover:border-slate-700 transition-colors">
                <div className="flex items-center gap-2 font-bold text-white">
                  <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-xs">4</span>
                  <span>Buyurtma tizimingizga keladi</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Tranzaksiya xavfsiz webhook orqali bevosita CRM yoki backendizga tushadi.
                </p>
              </div>
            </div>
          </div>

          {/* Trust Guarantees */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-2 text-xs">
            <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-semibold block">
              Xavfsizlik va Kafolatlar
            </span>
            <div className="space-y-1.5 text-slate-300 text-[11px]">
              <div className="flex items-center gap-2">
                <CreditCard className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Bank kartalari va maxfiy to‘lov ma’lumotlari Zayuno’da saqlanmaydi.</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>Buyurtma va to‘lov faqat mijozning bevosita tasdig‘i bilan yaratiladi.</span>
              </div>
              <div className="flex items-center gap-2">
                <KeyRound className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>API credentiallaringiz bir marta ko‘rsatiladi va shifrlangan holda saqlanadi.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Auth Card (5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between p-8 sm:p-10 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6">
          <div className="space-y-4">
            {/* Action Switcher Header */}
            <div className="flex rounded-2xl bg-slate-950 p-1.5 border border-slate-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => { setMode('login'); setError(null); setSuccessMsg(null); }}
                className={`flex-1 py-2 rounded-xl transition-all ${
                  mode === 'login' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'text-slate-400 hover:text-white'
                }`}
              >
                Kirish
              </button>
              <button
                type="button"
                onClick={onStartOnboarding}
                className="flex-1 py-2 rounded-xl text-slate-400 hover:text-white transition-all flex items-center justify-center gap-1"
              >
                Provider bo‘lish <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Title & Subtitle */}
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-white">
                {mode === 'login' ? 'Mavjud hisobga kirish' : 'Emailni tasdiqlash'}
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                {mode === 'login'
                  ? 'Provider dashboard va API kalitlarini boshqarish uchun kiring.'
                  : 'Emailingizga yuborilgan tasdiqlash kodini kiriting.'}
              </p>
            </div>

            {/* Error & Success Alerts */}
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-start gap-2 animate-fadeIn">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="flex-1">{error}</span>
              </div>
            )}
            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-start gap-2 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="flex-1">{successMsg}</span>
              </div>
            )}

            {/* Login Form */}
            {mode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Email</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="owner@yourbusiness.uz"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Parol</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-10 py-2.5 text-white font-mono focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !email || !password}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 mt-2"
                >
                  {loading ? 'Kirilmoqda…' : 'Tizimga kirish'} <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* Verification Form */}
            {mode === 'verify' && (
              <form onSubmit={handleVerifyEmail} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Tasdiqlash kodi *</label>
                  <input
                    type="text"
                    required
                    value={verifyToken}
                    onChange={e => setVerifyToken(e.target.value)}
                    placeholder="32 belgili token"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono text-center tracking-wider focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !verifyToken.trim()}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? 'Tasdiqlanmoqda…' : 'Tasdiqlash'}
                </button>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="text-slate-400 hover:text-white"
                  >
                    ← Kirishga qaytish
                  </button>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendCooldown > 0}
                    className="text-indigo-400 hover:text-indigo-300 disabled:text-slate-600"
                  >
                    {resendCooldown > 0 ? `Qayta yuborish (${resendCooldown}s)` : 'Qayta yuborish'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Bottom Callout: Become a Provider */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 text-xs flex items-center justify-between">
              <div>
                <span className="font-semibold text-white block">Yangi providermisiz?</span>
                <span className="text-[11px] text-slate-400">5 daqiqada ariza topshiring.</span>
              </div>
              <button
                type="button"
                onClick={onStartOnboarding}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg shadow-md shadow-indigo-600/30 transition-all flex items-center gap-1"
              >
                Boshlash <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={onOpenDocs}
                className="text-[11px] text-slate-400 hover:text-indigo-300 transition-colors inline-flex items-center gap-1"
              >
                <BookOpen className="w-3 h-3" /> Hujjatlar va API qo‘llanma →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
