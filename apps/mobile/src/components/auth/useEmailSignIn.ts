import { useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { apiFetch, ApiError } from '../../lib/api';
import { EMAIL_CODE_LENGTH, EMAIL_RESEND_SECONDS, normalizeEmailCode, normalizeLoginEmail, resendSecondsRemaining, validLoginEmail } from '../../lib/email-auth';
import { useAuthStore } from '../../store/authStore';

type Session = { accessToken?: string; token?: string; refreshToken?: string; expiresIn?: number; user: { id: string; name?: string; email?: string; avatarUrl?: string } };

export function useEmailSignIn() {
  const setSession = useAuthStore(state => state.setSession);
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmailValue] = useState('');
  const [sentEmail, setSentEmail] = useState('');
  const [code, setCodeValue] = useState('');
  const [busy, setBusy] = useState<'send' | 'verify' | null>(null);
  const [error, setError] = useState('');
  const [deadline, setDeadline] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const request = useRef<AbortController | null>(null);
  const lastAttempt = useRef('');
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; request.current?.abort(); }; }, []);
  useEffect(() => {
    const tick = () => setRemaining(resendSecondsRemaining(deadline));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [deadline]);

  const run = async (operation: 'send' | 'verify', work: (signal: AbortSignal) => Promise<void>) => {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(operation); setError('');
    const timer = setTimeout(() => controller.abort(), 20_000);
    try { await work(controller.signal); }
    catch (err) {
      if (!mounted.current || request.current !== controller) return;
      if (err instanceof ApiError && err.status === 429) setDeadline(Date.now() + EMAIL_RESEND_SECONDS * 1000);
      setError(controller.signal.aborted ? 'Ulanish sekinlashdi. Qayta urinib ko‘ring.' : err instanceof Error ? err.message : 'Qayta urinib ko‘ring.');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
    } finally {
      clearTimeout(timer);
      if (request.current === controller) {
        request.current = null;
        if (mounted.current) setBusy(null);
      }
    }
  };
  const sendCode = () => {
    const target = step === 'code' ? sentEmail : normalizeLoginEmail(email);
    if (!validLoginEmail(target)) { setError('Email manzilini tekshiring.'); return; }
    if (resendSecondsRemaining(deadline) > 0 && target === sentEmail) return;
    void run('send', async signal => {
      const response = await apiFetch<{ success: boolean; retryAfterSeconds?: number }>('/api/v1/consumer/auth/email/send-code', { method: 'POST', body: JSON.stringify({ email: target }), signal }, false);
      if (signal.aborted || !mounted.current) return;
      if (!response.success) throw new Error('Kod yuborilmadi. Qayta urinib ko‘ring.');
      setEmailValue(target); setSentEmail(target); setCodeValue(''); lastAttempt.current = '';
      setDeadline(Date.now() + (response.retryAfterSeconds || EMAIL_RESEND_SECONDS) * 1000);
      setStep('code');
    });
  };
  const verifyCode = (value = code) => {
    if (value.length !== EMAIL_CODE_LENGTH || !sentEmail) return;
    if (request.current) return;
    lastAttempt.current = value;
    void run('verify', async signal => {
      const session = await apiFetch<Session>('/api/v1/consumer/auth/email/verify-code', { method: 'POST', body: JSON.stringify({ email: sentEmail, code: value }), signal }, false);
      if (signal.aborted || !mounted.current) return;
      const accessToken = session.accessToken || session.token;
      if (!accessToken) throw new Error('Sessiya ochilmadi. Qayta urinib ko‘ring.');
      await setSession({ accessToken, refreshToken: session.refreshToken, user: session.user, expiresIn: session.expiresIn });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    });
  };
  const changeCode = (text: string) => {
    const value = normalizeEmailCode(text);
    setCodeValue(value); setError('');
    if (value.length < EMAIL_CODE_LENGTH) lastAttempt.current = '';
    if (value.length === EMAIL_CODE_LENGTH && value !== lastAttempt.current) verifyCode(value);
  };
  const changeEmail = () => {
    // Invalidate pending responses before changing screens, so old requests cannot navigate back.
    request.current?.abort(); request.current = null;
    setBusy(null); setStep('email'); setCodeValue(''); setError(''); lastAttempt.current = '';
  };
  return { step, email, sentEmail, code, busy, error, remaining, sendCode, verifyCode, changeCode, changeEmail,
    setEmail: (value: string) => { setEmailValue(value); setError(''); },
  };
}
