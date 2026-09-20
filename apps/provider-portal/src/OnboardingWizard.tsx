import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Mail,
  Lock,
  Building2,
  Globe,
  Key,
  ShieldCheck,
  Zap,
  Sparkles,
  Phone,
  MessageCircle,
  Copy,
  Check,
  Eye,
  EyeOff,
  AlertCircle,
  Clock,
  ExternalLink,
  Bot,
  HelpCircle,
  Info,
  FileCode,
  RefreshCw,
  X,
  Play,
  XCircle,
  AlertTriangle,
  Webhook
} from 'lucide-react';
import { ProviderLogoInput } from './ProviderLogoInput';
import { businessErrors, integrationErrors, reachableOnboardingStep } from './onboarding-validation';
import { DocsViewer } from './DocsViewer';
import {
  createProviderOpenApiDocument,
  getProviderProtocolEndpoints,
  PROVIDER_CONTRACT_VERSION,
  ZAYUNO_WEBHOOK_INGESTION_PATH
} from '@zayuno/contracts';

const DRAFT_STORAGE_KEY = 'zayuno_onboarding_draft';

type CredentialHandoff = {
  providerSlug: string;
  sandboxApiKey?: string;
  sandboxWebhookSecret?: string;
};

type AssignedProviderConflict = {
  name: string;
  slug: string;
  status?: string;
};

function downloadJsonArtifact(filename: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(href);
}

export const SANDBOX_ALLOWLIST_HOSTS = [
  'coffee-time-sandbox.shopla.uz',
  'evos-sandbox.shopla.uz',
  'poyez-sandbox.shopla.uz'
] as const;

export function isOfficialSandboxUrl(url?: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    if (parsed.username || parsed.password) return false;
    const host = parsed.hostname.toLowerCase();
    return (
      host === 'coffee-time-sandbox.shopla.uz' ||
      host === 'evos-sandbox.shopla.uz' ||
      host === 'poyez-sandbox.shopla.uz'
    );
  } catch {
    return false;
  }
}

const HEALTH_RESPONSE_EXAMPLE = `{
  "status": "HEALTHY",
  "latencyMs": 18,
  "timestamp": "2026-09-17T10:00:00.000Z"
}`;

type HealthGuidance = {
  title: string;
  cause: string;
  expected: string;
  steps: string[];
};

function getHealthGuidance(status: string, checkedUrl: string): HealthGuidance {
  switch (status) {
    case 'HEALTHY':
      return {
        title: 'Health endpoint tayyor',
        cause: `${checkedUrl} public serverdan JSON bilan javob berdi.`,
        expected: 'Keyingi bosqichda catalog va tanlangan contract endpointlari tekshiriladi.',
        steps: ['API sozlamalarini saqlang.', 'Contract tekshiruvini ishga tushiring.'],
      };
    case 'NOT_FOUND':
      return {
        title: '/health topilmadi',
        cause: 'Base URL noto‘g‘ri yo‘lga qaragan yoki serverda GET /health route yaratilmagan.',
        expected: `Zayuno aynan GET ${checkedUrl} so‘roviga 200 JSON kutadi.`,
        steps: ['Base URLdan /health qismini olib tashlang.', 'Backendda GET /health route yarating.', 'Deploy qiling va “Qayta tekshirish”ni bosing.'],
      };
    case 'AUTH_REQUIRED':
      return {
        title: 'Server kalit kutyapti',
        cause: 'Serverga yetib borildi, lekin /health 401 yoki 403 bilan qaytdi.',
        expected: 'Portalda tanlangan auth usuliga mos server-side credential kiritilgan bo‘lishi kerak.',
        steps: ['Auth usulini server bilan bir xil qiling.', 'Kalitni portalga kiriting yoki yangilang.', 'Kalitni frontend, Git yoki AI chatiga yubormang.'],
      };
    case 'SCHEMA_MISMATCH':
      return {
        title: 'Server topildi, lekin javob formati noto‘g‘ri',
        cause: 'Ko‘pincha server HTML sahifa/proxy xatosi qaytargan yoki JSON ichida majburiy health maydonlari yo‘q.',
        expected: `200 OK va aynan mana shunga o‘xshash JSON:\n${HEALTH_RESPONSE_EXAMPLE}`,
        steps: ['Response Content-Type va JSON body’ni tekshiring.', 'status, latencyMs va ISO timestamp maydonlarini qaytaring.', 'AI fix briefini nusxalab dasturchiga yoki AI agentga yuboring.'],
      };
    case 'FORBIDDEN_ADDRESS':
      return {
        title: 'Public manzil kerak',
        cause: 'Private IP, loopback yoki ichki tarmoq manziliga tashqaridan xavfsiz ulanib bo‘lmaydi.',
        expected: 'Internetdan ochiq public HTTPS domen.',
        steps: ['Public domain yoki tunnel/deploy manzilidan foydalaning.', 'DNS va TLS sertifikatini tekshiring.', 'Keyin qayta tekshiring.'],
      };
    case 'INVALID_URL':
      return {
        title: 'Base URL noto‘g‘ri',
        cause: 'URL formati yoki yo‘li Zayuno ulanish qoidalariga mos emas.',
        expected: 'Masalan: https://api.biznesingiz.uz/zayuno — /health qismini kiritmang.',
        steps: ['HTTPS bilan boshlanadigan API root manzilini kiriting.', 'URL ichidan username, password va /health qismini olib tashlang.'],
      };
    default:
      return {
        title: 'Serverga ulanib bo‘lmadi',
        cause: 'DNS, TLS, firewall, deploy yoki serverning javob vaqti muammosi bo‘lishi mumkin.',
        expected: `GET ${checkedUrl} 5 soniya ichida 200 JSON qaytarishi kerak.`,
        steps: ['Server loglarini tekshiring.', 'Domen va TLS sertifikatini tekshiring.', 'Health endpointni brauzer/curl bilan tekshirib, qayta urinib ko‘ring.'],
      };
  }
}

interface OnboardingWizardProps {
  apiBase: string;
  publicApiBase?: string;
  token: string;
  onAuthSuccess: (token: string, user: any) => void;
  onProviderCreated: (provider: any) => void;
  onNavigateTab: (tab: 'overview' | 'docs' | 'apps' | 'sandbox' | 'certification' | 'inspector') => void;
  onOpenDoc?: (docId: string) => void;
  onOpenAiKit: () => void;
  initialStep?: number;
  initialEmail?: string;
  initialVerifyToken?: string;
  initialProvider?: any;
}

const InfoTooltip: React.FC<{
  text: string;
  docId?: string;
  onOpenDoc?: (doc: string) => void;
}> = ({ text, docId, onOpenDoc }) => {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="relative inline-flex items-center ml-1.5 align-middle"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(!open); }}
        className="text-slate-400 hover:text-indigo-400 p-0.5 rounded-full transition-colors focus:outline-none"
        aria-label="Qo‘shimcha ma’lumot"
        aria-expanded={open}
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>
      {open && (
        <span className="absolute bottom-full left-1/2 z-50 w-64 -translate-x-1/2 pb-2 animate-fadeIn pointer-events-auto block">
          <span role="tooltip" className="block rounded-xl border border-slate-700 bg-slate-950 p-3 text-left text-[11px] font-normal leading-relaxed text-slate-300 shadow-2xl normal-case">
            <span>{text}</span>
            {docId && onOpenDoc && (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); onOpenDoc(docId); }}
                className="mt-2 text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 text-[10px]"
              >
                Batafsil qo‘llanma →
              </button>
            )}
          </span>
        </span>
      )}
    </span>
  );
};

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  apiBase,
  publicApiBase = apiBase,
  token,
  onAuthSuccess,
  onProviderCreated,
  onNavigateTab,
  onOpenDoc,
  onOpenAiKit,
  initialStep = 1,
  initialEmail = '',
  initialVerifyToken = '',
  initialProvider
}) => {
  // Read deep-link parameters from URL. `flow=provider-v2` identifies the four-step flow.
  const getInitialParams = () => {
    if (typeof window === 'undefined') return { step: null, provider: null };
    try {
      const url = new URL(window.location.href);
      const stepStr = url.searchParams.get('step');
      const stepVal = stepStr ? parseInt(stepStr, 10) : null;
      const prov = url.searchParams.get('provider');
      const isCurrentFlow = url.searchParams.get('flow') === 'provider-v2';
      const normalizedStep = stepVal
        ? (isCurrentFlow ? stepVal : Math.max(1, stepVal - 2))
        : null;
      return {
        step: normalizedStep && normalizedStep >= 1 && normalizedStep <= 4 ? normalizedStep : null,
        provider: prov ? prov.trim().toLowerCase() : null
      };
    } catch {
      return { step: null, provider: null };
    }
  };
  const urlParams = getInitialParams();

  // Scope local form drafts to the current account, without persisting its token.
  const draftOwnerId = (() => { try { return token ? JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).sub || 'signed-in' : 'guest'; } catch { return 'guest'; } })();
  // Read saved draft from localStorage
  const loadSavedDraft = () => {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      const draft = raw ? JSON.parse(raw) : null;
      return draft?.ownerId === draftOwnerId ? draft : null;
    } catch {
      return null;
    }
  };
  const savedDraft = loadSavedDraft();

  // Current Step determination
  const [currentStep, setCurrentStep] = useState<number>(() => {
    if (urlParams.step) return urlParams.step;
    if (initialProvider?.slug) {
      if (initialProvider.metadata?.isCertified || initialProvider.metadata?.lastCertificationReport?.isProductionReady) return 4;
      return initialProvider.baseUrl ? 3 : 2;
    }
    if (savedDraft?.currentStep && savedDraft.currentStep >= 1 && savedDraft.currentStep <= 6) {
      return savedDraft.flowVersion === 2
        ? Math.min(savedDraft.currentStep, 4)
        : Math.max(1, savedDraft.currentStep - 2);
    }
    return initialStep > 2 ? initialStep - 2 : 1;
  });

  // Auth runs before this wizard. These legacy fields remain only for restoring old drafts.
  const [fullName, setFullName] = useState(savedDraft?.fullName || '');
  const [email, setEmail] = useState(initialEmail || savedDraft?.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Legacy verification fields are retained until old drafts naturally expire.
  const [verifyToken, setVerifyToken] = useState(initialVerifyToken);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Step 1: Business Profile
  const [logoUrl, setLogoUrl] = useState(initialProvider?.logoUrl || savedDraft?.logoUrl || '');
  const [businessName, setBusinessName] = useState(initialProvider?.name || savedDraft?.businessName || '');
  // Public self-service is intentionally online-only in v1. Type, category and
  // fulfilment are canonical backend defaults, not questions businesses must answer.
  const category = 'online_services';
  const providerType = 'SERVICES';
  const [description, setDescription] = useState(initialProvider?.description || initialProvider?.metadata?.description || savedDraft?.description || '');
  const [supportPhone, setSupportPhone] = useState(initialProvider?.supportContact?.phone || savedDraft?.supportPhone || '');
  const [supportTelegram, setSupportTelegram] = useState(initialProvider?.supportContact?.telegram || savedDraft?.supportTelegram || '');
  const [supportEmail, setSupportEmail] = useState(initialProvider?.supportContact?.email || savedDraft?.supportEmail || '');
  const [supportUrl, setSupportUrl] = useState(initialProvider?.supportContact?.supportUrl || savedDraft?.supportUrl || '');
  const [supportNote, setSupportNote] = useState(initialProvider?.supportContact?.supportNote || savedDraft?.supportNote || '');

  // Step 2: Integration Details
  const [slug, setSlug] = useState(urlParams.provider || initialProvider?.slug || savedDraft?.slug || '');
  const [baseUrl, setBaseUrl] = useState(initialProvider?.baseUrl || savedDraft?.baseUrl || '');
  const [credentialMode, setCredentialMode] = useState<'auto' | 'byo'>('auto');
  const [apiSecret, setApiSecret] = useState('');
  const [generatedSecret, setGeneratedSecret] = useState('');
  const [hasConfirmedSavedSecret, setHasConfirmedSavedSecret] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [hasSavedSecret, setHasSavedSecret] = useState(Boolean(initialProvider?.id && initialProvider?.baseUrl));
  const [showSecretInput, setShowSecretInput] = useState(false);
  const [authMethod, setAuthMethod] = useState<'API_KEY' | 'BEARER_TOKEN' | 'HMAC_SIGNATURE'>(
    initialProvider?.authMethod || initialProvider?.config?.authMethod || savedDraft?.authMethod || 'API_KEY'
  );
  const [capabilityProfile, setCapabilityProfile] = useState<'transactional' | 'readonly'>(() => {
    if (initialProvider?.capabilities) {
      const isTrans = initialProvider.capabilities.some((c: string) => c === 'QUOTE' || c === 'ACTION_CREATE');
      return isTrans ? 'transactional' : 'readonly';
    }
    return savedDraft?.capabilityProfile || 'transactional';
  });

  // Step 4: URL Testing & Brief Copy States
  const [testingUrl, setTestingUrl] = useState(false);
  const [urlCheckResult, setUrlCheckResult] = useState<{
    status: 'idle' | 'success' | 'warning' | 'https_required' | 'not_found' | 'error';
    message: string;
    code?: string;
    checkedUrl?: string;
    statusCode?: number;
    latencyMs?: number;
    guidance?: HealthGuidance;
  }>({ status: 'idle', message: '' });
  const [copiedBrief, setCopiedBrief] = useState(false);
  const [copiedHealthFix, setCopiedHealthFix] = useState(false);
  const [showHealthReport, setShowHealthReport] = useState(false);

  // In-Wizard Docs Modal/Drawer State (Prevents losing wizard context)
  const [activeDocsDrawer, setActiveDocsDrawer] = useState<string | null>(null);

  useEffect(() => {
    if (!showHealthReport && !activeDocsDrawer) return;

    const originalOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (showHealthReport) setShowHealthReport(false);
      else setActiveDocsDrawer(null);
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [showHealthReport, activeDocsDrawer]);

  // Step 3: In-Wizard Certification Runner State
  const [certLoading, setCertLoading] = useState(false);
  const [certReport, setCertReport] = useState<any | null>(() => {
    return initialProvider?.metadata?.lastCertificationReport || null;
  });
  const [certError, setCertError] = useState<string | null>(null);
  const [showCertificationSettings, setShowCertificationSettings] = useState(false);
  const [savingCertificationSettings, setSavingCertificationSettings] = useState(false);
  const [copiedCertificationFix, setCopiedCertificationFix] = useState<number | null>(null);

  // Step 4: Review & Credentials
  // Raw credentials exist only in the register / rotate response. Never rebuild
  // this state from provider data: the backend intentionally cannot reveal old secrets.
  const [createdCredentials, setCreatedCredentials] = useState<CredentialHandoff | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [submittingReview, setSubmittingReview] = useState(false);
  const registeredProviderSlug = (createdCredentials?.providerSlug || slug || initialProvider?.slug || '').trim().toLowerCase();
  const requiresWebhookSigning = capabilityProfile === 'transactional';

  // Status & Errors
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [assignedProviderConflict, setAssignedProviderConflict] = useState<AssignedProviderConflict | null>(null);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const businessValidation = businessErrors({ businessName, supportPhone, supportTelegram, supportEmail, supportUrl, supportNote });
  const integrationValidation = integrationErrors({ slug, baseUrl, apiSecret, hasSavedSecret, sandbox: isOfficialSandboxUrl(baseUrl), generatedSecret, confirmed: hasConfirmedSavedSecret });
  if (logoUrl && !/^https:\/\//i.test(logoUrl) && !/^data:image\/(png|jpeg|webp);base64,/i.test(logoUrl)) businessValidation.logoUrl = 'Logo uchun HTTPS manzil yoki rasm faylidan foydalaning.';
  const businessValid = Object.keys(businessValidation).length === 0;
  const integrationValid = Object.keys(integrationValidation).length === 0;
  const fingerprint = JSON.stringify([businessName.trim(), description.trim(), supportPhone.trim(), supportTelegram.trim(), supportEmail.trim(), supportUrl.trim(), supportNote.trim(), logoUrl, slug.trim(), baseUrl.trim(), authMethod, capabilityProfile]);
  const [savedFingerprint, setSavedFingerprint] = useState(initialProvider?.id ? fingerprint : '');
  const integrationSaved = Boolean(savedFingerprint && savedFingerprint === fingerprint && !apiSecret && businessValid && integrationValid);
  const maxStep = reachableOnboardingStep(businessValid, integrationSaved, Boolean(certReport?.isProductionReady));
  useEffect(() => { setCurrentStep(step => step === 3 && showCertificationSettings && businessValid ? step : Math.min(step, maxStep)); }, [maxStep, showCertificationSettings, businessValid]);
  useEffect(() => { setSuccessMsg(null); setFieldErrors({}); setError(null); setAssignedProviderConflict(null); }, [fingerprint, currentStep]);
  useEffect(() => { setUrlCheckResult({ status: 'idle', message: '' }); }, [baseUrl, authMethod, apiSecret]);
  const showValidation = (errors: Record<string, string>) => {
    setFieldErrors(errors);
    setError('Belgilangan maydonlarni to‘g‘rilang.');
    requestAnimationFrame(() => document.getElementById(Object.keys(errors)[0])?.focus());
  };
  const fieldError = (key: string) => fieldErrors[key] ? <p id={key + '-error'} role="alert" className="text-sm text-rose-300 mt-1">{fieldErrors[key]}</p> : null;

  // Sync deep-link parameters to browser URL: ?tab=onboarding&step=N&provider=slug
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('tab', 'onboarding');
    url.searchParams.set('step', String(currentStep));
    url.searchParams.set('flow', 'provider-v2');
    if (slug.trim()) {
      url.searchParams.set('provider', slug.trim());
    } else {
      url.searchParams.delete('provider');
    }
    window.history.replaceState({}, '', url.toString());
  }, [currentStep, slug]);

  // Sync draft to localStorage on changes (NEVER store raw apiSecret)
  useEffect(() => {
    try {
      const draft = {
        ownerId: draftOwnerId,
        logoUrl,
        fullName,
        email,
        businessName,
        description,
        supportPhone,
        supportTelegram,
        supportEmail,
        supportUrl,
        supportNote,
        slug,
        baseUrl,
        authMethod,
        capabilityProfile,
        currentStep,
        flowVersion: 2,
        // Credentials and workflow completion are never restored from local drafts.
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch {}
  }, [
    logoUrl,
    draftOwnerId,
    fullName,
    email,
    businessName,
    description,
    supportPhone,
    supportTelegram,
    supportEmail,
    supportUrl,
    supportNote,
    slug,
    baseUrl,
    authMethod,
    capabilityProfile,
    currentStep,
    hasSavedSecret,
    createdCredentials
  ]);

  // Sync initial parameters
  useEffect(() => {
    if (initialEmail) setEmail(initialEmail);
    if (initialVerifyToken) setVerifyToken(initialVerifyToken);
  }, [initialEmail, initialVerifyToken]);

  // Handle Resend Cooldown Timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Auto-slugify business name
  const handleBusinessNameChange = (val: string) => {
    setBusinessName(val);
    const autoSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    // A non-Latin name still needs a stable ID, but changing the visible name
    // must never generate a new ID on every keypress.
    setSlug((current: string) => autoSlug || current || `business-${Math.random().toString(36).slice(2, 8)}`);
  };

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2500);
    } catch {}
  };

  const handleCopyCredentialSetup = async () => {
    if (!createdCredentials?.sandboxApiKey && !createdCredentials?.sandboxWebhookSecret) return;
    const webhookEndpoint = `${publicApiBase.replace(/\/$/, '')}/api/v1/webhooks/${registeredProviderSlug}`;
    const lines = [
      '# Zayuno server sozlamalari',
      createdCredentials.sandboxApiKey ? `ZAYUNO_API_KEY=${createdCredentials.sandboxApiKey}` : '',
      createdCredentials.sandboxWebhookSecret ? `ZAYUNO_WEBHOOK_SECRET=${createdCredentials.sandboxWebhookSecret}` : '',
      '',
      `# Webhook endpoint: ${webhookEndpoint}`
    ].filter(Boolean).join('\n');
    await copyToClipboard(lines, 'setup');
  };

  // --------------------------------------------------------------------------
  // STEP 1: Account Creation (register-owner)
  // --------------------------------------------------------------------------
  const handleRegisterAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (password.length < 12) {
      setError('Parol xavfsizlik talabiga ko‘ra kamida 12 ta belgidan iborat bo‘lishi shart.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/v1/auth/register-owner`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password, name: fullName.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || 'Ro‘yxatdan o‘tishda xatolik yuz berdi.');
      }

      setSuccessMsg(data.message || 'Hisob yaratildi! Emailingizga tasdiqlash kodi yuborildi.');
      setResendCooldown(60);
      setCurrentStep(2);
    } catch (err: any) {
      setError(err.message || 'Tarmoq xatosi yuz berdi. Qayta urinib ko‘ring.');
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // STEP 2: Email Verification & Auto-Login
  // --------------------------------------------------------------------------
  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanToken = verifyToken.trim();
    if (!cleanToken) {
      setError('Iltimos, emailingizga yuborilgan tasdiqlash kodini kiriting.');
      return;
    }

    setLoading(true);
    try {
      const verifyRes = await fetch(`${apiBase}/api/v1/auth/verify-email`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: cleanToken })
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        throw new Error(verifyData?.message || 'Tasdiqlash kodi noto‘g‘ri yoki muddati o‘tgan.');
      }

      setSuccessMsg('Email muvaffaqiyatli tasdiqlandi!');

      // Use accessToken from verify-email response (auto-login)
      if (verifyData.accessToken && verifyData.user) {
        onAuthSuccess(verifyData.accessToken, verifyData.user);
      } else if (password) {
        // Fallback: attempt login with password if verify didn't return token
        const loginRes = await fetch(`${apiBase}/api/v1/auth/login`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim().toLowerCase(), password })
        });
        const loginData = await loginRes.json();
        if (loginRes.ok && loginData.accessToken) {
          onAuthSuccess(loginData.accessToken, loginData.user);
        }
      }

      setCurrentStep(3);
    } catch (err: any) {
      setError(err.message || 'Tasdiqlashda xatolik yuz berdi.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (resendCooldown > 0 || !email) return;
    setError(null);
    setSuccessMsg(null);
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
      setError('Qayta yuborishda xatolik yuz berdi.');
    }
  };

  // --------------------------------------------------------------------------
  // STEP 1: Business Details
  // --------------------------------------------------------------------------
  const handleBusinessStepNext = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!businessValid) { showValidation(businessValidation); return; }
    setCurrentStep(2);
  };

  // --------------------------------------------------------------------------
  // STEP 2 Helpers: Base URL health testing, Secret Generation, and AI Brief copy
  // --------------------------------------------------------------------------
  const handleGenerateSecret = async () => {
    try {
      setLoading(true);
      const authToken = token;
      const res = await fetch(`${apiBase}/api/v1/providers/integration/generate-secret`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.secret) {
          setGeneratedSecret(data.secret);
          setApiSecret(data.secret);
          setHasConfirmedSavedSecret(false);
          setShowSecretInput(true);
          return;
        }
      }
      // Fallback
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      const hex = Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
      setGeneratedSecret(hex);
      setApiSecret(hex);
      setHasConfirmedSavedSecret(false);
      setShowSecretInput(true);
    } catch {
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      const hex = Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
      setGeneratedSecret(hex);
      setApiSecret(hex);
      setHasConfirmedSavedSecret(false);
      setShowSecretInput(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCredentialsJson = () => {
    const secretValue = generatedSecret || apiSecret;
    if (!secretValue) return;
    const currentSlug = slug.toLowerCase().trim();
    downloadJsonArtifact(`zayuno-provider-credentials-${currentSlug || 'secret'}.json`, {
      providerName: businessName.trim(),
      providerSlug: currentSlug,
      authMethod,
      secret: secretValue,
      generatedAt: new Date().toISOString(),
      direction: 'Zayuno -> Provider Server (Zayuno provayderingiz serveriga so‘rov yuborayotganda ushbu maxfiy kalitdan foydalanadi)',
      headerUsed: authMethod === 'BEARER_TOKEN' ? 'Authorization: Bearer <secret>' : authMethod === 'HMAC_SIGNATURE' ? 'x-zayuno-signature' : 'x-provider-api-key',
      instructions: 'Ushbu maxfiy kalitni backend .env faylingizga joylashtiring va xavfsiz saqlang.'
    });
  };

  const handleTestBaseUrl = async () => {
    const raw = baseUrl.trim();
    if (!raw) {
      setUrlCheckResult({
        status: 'error',
        message: 'Iltimos, avval API Base URL manzilini kiriting.'
      });
      return;
    }

    try {
      const u = new URL(raw);

      // SSRF & Protocol Guards
      if (u.protocol !== 'https:' && !u.hostname.includes('localhost') && u.hostname !== '127.0.0.1') {
        setUrlCheckResult({
          status: 'https_required',
          message: '⚠️ HTTPS talab etiladi (xavfsizlik uchun URL https:// bilan boshlanishi kerak).'
        });
        return;
      }

      // Check for private / cloud metadata / internal hostnames
      const host = u.hostname.toLowerCase();
      const isPrivateHost =
        /^10\./.test(host) ||
        /^192\.168\./.test(host) ||
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host) ||
        /^169\.254\./.test(host) || // Cloud metadata
        /^0\.0\.0\.0$/.test(host) ||
        host === '::1' ||
        host.endsWith('.internal') ||
        host.endsWith('.local') ||
        host.endsWith('.lan');

      const isDevEnv = typeof window !== 'undefined' && (window.location.hostname.includes('localhost') || window.location.hostname === '127.0.0.1');

      if (isPrivateHost && !isDevEnv) {
        setUrlCheckResult({
          status: 'error',
          code: 'FORBIDDEN_ADDRESS',
          checkedUrl: `${raw.replace(/\/+$/, '')}/health`,
          message: '⚠️ Xavfsizlik: Private IP yoki ichki tarmoq manzillarini tekshirib bo‘lmaydi. Haqiqiy public HTTPS domen kiriting.',
          guidance: getHealthGuidance('FORBIDDEN_ADDRESS', `${raw.replace(/\/+$/, '')}/health`)
        });
        return;
      }
      if (/\/health\/?$/i.test(u.pathname)) {
        const checkedUrl = raw.replace(/\/+$/, '');
        setUrlCheckResult({
          status: 'warning',
          code: 'INVALID_URL',
          checkedUrl,
          message: 'Base URL ichida /health bor. Zayuno /health’ni avtomatik qo‘shadi — bu qiymatdan /health qismini olib tashlang.',
          guidance: getHealthGuidance('INVALID_URL', checkedUrl)
        });
        return;
      }
    } catch {
      setUrlCheckResult({
        status: 'error',
        code: 'INVALID_URL',
        checkedUrl: raw,
        message: 'Noto‘g‘ri URL formati kiritildi.',
        guidance: getHealthGuidance('INVALID_URL', raw)
      });
      return;
    }

    setTestingUrl(true);
    setUrlCheckResult({ status: 'idle', message: '' });

    try {
      const cleanUrl = raw.replace(/\/+$/, '');
      const checkedUrl = `${cleanUrl}/health`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${apiBase}/api/v1/providers/integration/check-url`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          baseUrl: cleanUrl,
          authMethod,
          apiSecret: apiSecret.trim() || undefined
        })
      });

      const data = await res.json().catch(() => ({}));
      const code = typeof data.status === 'string' ? data.status : 'UNREACHABLE';
      const status = code === 'HEALTHY'
        ? 'success'
        : code === 'NOT_FOUND'
          ? 'not_found'
          : code === 'AUTH_REQUIRED' || code === 'SCHEMA_MISMATCH' || code === 'INVALID_URL'
            ? 'warning'
            : 'error';
      setUrlCheckResult({
        status,
        code,
        checkedUrl,
        statusCode: typeof data.statusCode === 'number' ? data.statusCode : undefined,
        latencyMs: typeof data.latencyMs === 'number' ? data.latencyMs : undefined,
        message: data.message || 'Server javob bermadi yoki /health ga ulanish bloklandi.',
        guidance: getHealthGuidance(code, checkedUrl)
      });
    } catch (err: any) {
      const checkedUrl = `${raw.replace(/\/+$/, '')}/health`;
      setUrlCheckResult({
        status: 'error',
        code: 'UNREACHABLE',
        checkedUrl,
        message: 'Server javob bermadi yoki tekshirish xizmati bilan ulanishda xatolik yuz berdi.',
        guidance: getHealthGuidance('UNREACHABLE', checkedUrl)
      });
    } finally {
      setTestingUrl(false);
    }
  };

  const handleCopyIntegrationBrief = () => {
    const isTrans = capabilityProfile === 'transactional';
    const profile = isTrans ? 'TRANSACTIONAL' : 'DISCOVERY_READONLY';
    const endpoints = getProviderProtocolEndpoints(profile)
      .filter(endpoint => endpoint.required)
      .map((endpoint, index) => {
        const reqFields = endpoint.requiredFields && endpoint.requiredFields.length
          ? `\n    Majburiy maydonlar: ${endpoint.requiredFields.join(', ')}`
          : '';
        const request = endpoint.requestExample === undefined
          ? ''
          : `\n    Request (${endpoint.requestSchemaName || 'Body'}): ${JSON.stringify(endpoint.requestExample, null, 2).replace(/\n/g, '\n    ')}`;
        const response = `\n    Response (${endpoint.responseSchemaName}): ${JSON.stringify(endpoint.responseExample, null, 2).replace(/\n/g, '\n    ')}`;
        return `[${index + 1}] ${endpoint.method} ${endpoint.path}\n    ${endpoint.summary}${reqFields}${request}${response}`;
      })
      .join('\n\n--------------------------------------------------------------------------------\n\n');
    const brief = `# ZAYUNO PROVIDER INTEGRATSIYA BRIEFI (TEXNIK TOPSHIRIQ)

Provider Contract: v${PROVIDER_CONTRACT_VERSION}

Biznes nomi: ${businessName.trim() || 'Mening Biznesim'}
Provider Slug: ${slug.trim() || 'my-provider-slug'}
Provider type (CANONICAL API ENUM): SERVICES
Canonical enum eslatmasi: LOGISTICS canonical enum emas; transport yoki yetkazib berish provideri uchun contractdagi DELIVERY turidan foydalaning. O‘zingizcha type nomi uydirmang.
Tanlangan imkoniyat: ${isTrans ? 'Topish, aniq narx olish va buyurtma yaratish (TRANSACTIONAL)' : 'Faqat topish va ko‘rsatish (DISCOVERY)'}
Autentifikatsiya formati: ${authMethod} (${authMethod === 'API_KEY' ? 'X-API-KEY header: x-provider-api-key' : authMethod === 'BEARER_TOKEN' ? 'Authorization: Bearer token' : 'HMAC-SHA256 imzosi: x-zayuno-signature'})

--------------------------------------------------------------------------------
1. AVVAL HUJJATLARNI O‘QING
--------------------------------------------------------------------------------
- Boshlash: https://partners.zayuno.uz/?tab=docs&doc=getting-started
- To‘liq Provider Contract: https://partners.zayuno.uz/?tab=docs&doc=contract-reference
- Auth va kalitlar: https://partners.zayuno.uz/?tab=docs&doc=auth
- Quote, action va idempotency: https://partners.zayuno.uz/?tab=docs&doc=actions
- Xatolar va retry qoidalari: https://partners.zayuno.uz/?tab=docs&doc=errors
- Machine-readable OpenAPI 3.1: https://partners.zayuno.uz/openapi.json

Ushbu linklarni avval fetch qilib, contractdagi schema va misollarga mos ishlang. Aniqlik yetishmasa taxmin qilmang.

--------------------------------------------------------------------------------
2. INTEGRATSIYA MAQSADI
--------------------------------------------------------------------------------
Zayuno AI agentlari foydalanuvchi xohlagan narsani sizning haqiqiy katalogingizdan topadi.
${isTrans ? 'Narxni provider hisoblaydi; foydalanuvchi tasdiqlagach buyurtma yaratiladi va to‘lov providerning o‘z checkoutiga beriladi.' : 'Agent katalogingizni topib, aniq va yangilanadigan ma’lumotni ko‘rsatadi; buyurtma yaratmaydi.'}

Bu v1 faqat public online API integratsiyasidir. Filial, xarita, delivery radiusi yoki offline flow yozmang.

--------------------------------------------------------------------------------
3. TALAB ETILADIGAN CANONICAL API ENDPOINTLAR (HTTPS)
--------------------------------------------------------------------------------
${endpoints}

MUHIM:
- Katalog offeringlarida "providerId", "offeringCode", "title", "basePrice", "currency" va "isAvailable" maydonlari majburiydir.
- GET /offerings/:id bitta mahsulot tafsilotini aynan OfferingSchema formatida qaytarishi shart.
- Quote javobi "id" va itemized "lines" qaytaradi (formula: total == subtotal + totalFees - totalDiscount).
- Payment options capability ixtiyoriy; yoqilsa javob top-level JSON array bo‘ladi.
- Provider webhook endpoint ochmaydi. Status eventlarini Zayuno'ga POST ${ZAYUNO_WEBHOOK_INGESTION_PATH} orqali yuboradi.

--------------------------------------------------------------------------------
4. CREDENTIAL VA MAXFIYLIK QOIDALARI
--------------------------------------------------------------------------------
- Provider API key: Dasturchi o'zi yaratadi va o'z serverining environment variable'iga (.env) qo'yadi hamda Zayuno portalga bir marta kiritadi.
- Webhook secret: Zayuno handoff orqali taqdim etadi va serverning .env fayliga saqlanadi.
- Maxfiylik talabi: Ikkala secret ham faqat server-side muhitda (.env) saqlanadi. Git, frontend JS bundle, brauzer, chat yoki public loglarga HECH QACHON yozilmaydi.
- To'lov chegarasi: Zayuno hech qachon to'lov kartalari ma'lumotlarini qabul qilmaydi. To'lov providerning o'z checkout havolasi (NextAction) orqali amalga oshiriladi.

--------------------------------------------------------------------------------
5. TUGALLANGAN ISH MEZONI
--------------------------------------------------------------------------------
- GET /health public HTTPS’da contractga mos javob beradi.
- Yuqoridagi majburiy endpointlar haqiqiy provider ma’lumoti bilan ishlaydi.
- ${isTrans ? 'Quote, action, idempotency, provider checkout handoff va webhook holatlari ishlaydi.' : 'Katalog va offering tafsiloti yangilanadigan ma’lumot bilan ishlaydi.'}
- Portal ichidagi Moslik tekshiruvining barcha majburiy testlari PASS bo‘ladi.
- Secretlar chat, Git yoki browser bundle’ga tushmagan bo‘ladi.
`;

    navigator.clipboard.writeText(brief);
    setCopiedBrief(true);
    setTimeout(() => setCopiedBrief(false), 3000);
  };

  const handleCopyHealthFixBrief = async () => {
    const result = urlCheckResult;
    const guidance = result.guidance;
    if (!guidance || !result.checkedUrl) return;
    const brief = `# ZAYUNO HEALTH CHECK — TUZATISH BRIEFI

Maqsad: Zayuno provider API uchun GET /health endpointini contractga mos holatga keltirish.

## Tekshiruv natijasi
- Tekshirilgan URL: ${result.checkedUrl}
- Kod: ${result.code || 'UNREACHABLE'}
- HTTP status: ${result.statusCode ?? 'olinmadi'}
- Javob vaqti: ${result.latencyMs !== undefined ? `${result.latencyMs} ms` : 'olinmadi'}
- Portal xabari: ${result.message}

## Nima xato
${guidance.cause}

## Kutilayotgan holat
${guidance.expected}

## Tuzatish rejasi
${guidance.steps.map((step, index) => `${index + 1}. ${step}`).join('\n')}

## Canonical /health javobi
HTTP 200
Content-Type: application/json
${HEALTH_RESPONSE_EXAMPLE}

## Muhim qoidalar
- Base URL API root bo‘lsin; URL oxiriga /health yozilmasin, Zayuno uni o‘zi qo‘shadi.
- Secret, API key, bearer token yoki real mijoz ma’lumotini bu chatga yubormang.
- Avval rasmiy schema va misollarni o‘qing:
  - https://partners.zayuno.uz/?tab=docs&doc=base-url
  - https://partners.zayuno.uz/?tab=docs&doc=contract-reference
  - https://partners.zayuno.uz/openapi.json

Tuzatgandan keyin shu endpointni qayta tekshiring. Taxmin qilmang: faqat canonical contractga mos kod yozing.`;
    try {
      await navigator.clipboard.writeText(brief);
      setCopiedHealthFix(true);
      setTimeout(() => setCopiedHealthFix(false), 3000);
    } catch {
      setError('Fix briefni nusxalab bo‘lmadi. Brauzer clipboard ruxsatini tekshiring.');
    }
  };

  const handleDownloadOpenApi = () => {
    downloadJsonArtifact('zayuno-provider-contract-v1.openapi.json', createProviderOpenApiDocument());
  };

  const buildCertificationFixArtifact = (test: any) => {
    const profile = capabilityProfile === 'transactional' ? 'TRANSACTIONAL' : 'DISCOVERY_READONLY';
    const canonicalType = providerType;
    const endpoint = getProviderProtocolEndpoints(profile).find(item =>
      item.capability === test.capability ||
      (test.endpoint && item.path === test.endpoint)
    );
    const canonicalResponse = endpoint?.responseExample && typeof endpoint.responseExample === 'object'
      ? JSON.parse(JSON.stringify(endpoint.responseExample))
      : endpoint?.responseExample;

    if (canonicalResponse && !Array.isArray(canonicalResponse) && test.issue?.path === 'response.type') {
      canonicalResponse.type = canonicalType;
    }

    return {
      contractVersion: PROVIDER_CONTRACT_VERSION,
      test: test.name,
      capability: test.capability,
      endpoint: endpoint ? `${endpoint.method} ${endpoint.path}` : test.endpoint,
      issue: test.issue || { message: test.error },
      fixGuidance: test.issue?.fixExample || undefined,
      frameworkSerializationTips: {
        fastapi: 'response_model_exclude_none=True yoki model_dump(exclude_none=True)',
        go: 'json:"field,omitempty"',
        dotnet: 'JsonIgnoreCondition.WhenWritingNull',
        laravel: 'array_filter($data, fn($v) => !is_null($v))',
        nodejs: 'Omit undefined properties from output object'
      },
      canonicalProviderType: canonicalType,
      canonicalResponseExample: canonicalResponse,
      instruction: 'Provider javobini canonicalResponseExample va Expected talabiga moslang. Secret yoki real mijoz ma’lumotini AI chatiga yubormang.'
    };
  };

  const handleCopyCertificationFix = async (test: any, index: number) => {
    await navigator.clipboard.writeText(JSON.stringify(buildCertificationFixArtifact(test), null, 2));
    setCopiedCertificationFix(index);
    setTimeout(() => setCopiedCertificationFix(null), 2500);
  };

  const handleSaveCertificationSettings = async () => {
    const cleanSlug = slug.trim().toLowerCase();
    const authToken = token;
    if (!businessValid || !integrationValid) { setCertError(Object.values({ ...businessValidation, ...integrationValidation }).join(' ')); return; }
    if (!authToken || !cleanSlug || !baseUrl.trim()) {
      setCertError('Provider slug, API Base URL va faol hisob talab qilinadi.');
      return;
    }
    if (!isOfficialSandboxUrl(baseUrl) && !hasSavedSecret && !apiSecret.trim()) {
      setCertError('Tanlangan autentifikatsiya usuli uchun provider credential kiriting.');
      return;
    }

    setSavingCertificationSettings(true);
    setCertError(null);
    try {
      const isSandbox = isOfficialSandboxUrl(baseUrl);
      const capabilities = capabilityProfile === 'transactional'
        ? ['METADATA', 'HEALTH', 'CATALOG', 'QUOTE', 'ACTION_CREATE', 'ACTION_STATUS', 'WEBHOOK']
        : ['METADATA', 'HEALTH', 'CATALOG'];
      const res = await fetch(`${apiBase}/api/v1/providers/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          name: businessName.trim(),
          logoUrl: logoUrl || null,
          slug: cleanSlug,
          description: description.trim() || undefined,
          type: providerType,
          category,
          geography: ['UZ'],
          baseUrl: baseUrl.trim(),
          apiSecret: (!isSandbox && apiSecret.trim()) ? apiSecret.trim() : undefined,
          authMethod,
          capabilities,
          supportContact: {
            phone: supportPhone.trim() || undefined,
            telegram: supportTelegram.trim() || undefined,
            email: supportEmail.trim() || email.trim() || undefined,
            supportUrl: supportUrl.trim() || undefined,
            supportNote: supportNote.trim() || undefined
          }
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'API sozlamalarini saqlab bo‘lmadi.');
      onProviderCreated(data.provider || data);
      setSavedFingerprint(fingerprint);
      if (apiSecret.trim()) setHasSavedSecret(true);
      setApiSecret('');
      setShowSecretInput(false);
      setCertReport(null);
      setShowCertificationSettings(false);
      setSuccessMsg('API sozlamalari saqlandi. Oldingi sertifikat bekor qilindi — testlarni qayta ishga tushiring.');
    } catch (err: any) {
      setCertError(err.message || 'API sozlamalarini saqlashda xatolik yuz berdi.');
    } finally {
      setSavingCertificationSettings(false);
    }
  };

  // --------------------------------------------------------------------------
  // STEP 2: Integration Submission (Register Provider)
  // --------------------------------------------------------------------------
  const handleRegisterProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!businessValid) { setCurrentStep(1); showValidation(businessValidation); return; }
    if (!integrationValid) { showValidation(integrationValidation); return; }
    const cleanSlug = slug.trim().toLowerCase();
    if (!cleanSlug || !/^[a-z0-9-]+$/.test(cleanSlug)) {
      setError('Provider slug faqat kichik lotin harflari, raqamlar va defisdan iborat bo‘lishi kerak (masalan: my-shop).');
      return;
    }

    const capabilities =
      capabilityProfile === 'transactional'
        ? ['METADATA', 'HEALTH', 'CATALOG', 'QUOTE', 'ACTION_CREATE', 'ACTION_STATUS', 'WEBHOOK']
        : ['METADATA', 'HEALTH', 'CATALOG'];

    setLoading(true);
    try {
      const authToken = token;
      if (!authToken) {
        throw new Error('Iltimos, avval hisobingizga kiring.');
      }

      const isSandbox = isOfficialSandboxUrl(baseUrl);

      const res = await fetch(`${apiBase}/api/v1/providers/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          name: businessName.trim(),
          logoUrl: logoUrl || null,
          slug: cleanSlug,
          description: description.trim() || undefined,
          type: providerType,
          category: category,
          geography: ['UZ'],
          baseUrl: baseUrl.trim() || undefined,
          apiSecret: (!isSandbox && apiSecret.trim()) ? apiSecret.trim() : undefined,
          authMethod: authMethod,
          capabilities: capabilities,
          supportContact: {
            phone: supportPhone.trim() || undefined,
            telegram: supportTelegram.trim() || undefined,
            email: supportEmail.trim() || email.trim() || undefined,
            supportUrl: supportUrl.trim() || undefined,
            supportNote: supportNote.trim() || undefined
          }
        })
      });

      const data = await res.json();
      if (!res.ok) {
        if (data?.code === 'PROVIDER_ACCOUNT_ASSIGNED') {
          const assigned = data?.details?.assignedProvider;
          setAssignedProviderConflict({
            name: assigned?.name || 'mavjud biznesingiz',
            slug: assigned?.slug || '',
            status: assigned?.status
          });
          return;
        }
        throw new Error(data?.message || 'Provider arizasini yaratishda xatolik yuz berdi.');
      }

      if (data.credentials) {
        setCreatedCredentials(data.credentials);
      } else {
        // Existing credentials are deliberately not recoverable. Showing a
        // prefix or an empty secret here would look usable while being neither.
        setCreatedCredentials(null);
      }

      onProviderCreated(data.provider || data);
      setSavedFingerprint(fingerprint);
      setHasSavedSecret(true);
      setGeneratedSecret('');
      setApiSecret('');
      setShowSecretInput(false);
      setSuccessMsg('Provider DRAFT arizasi saqlandi! Endi 3-qadamda sertifikatlash testlarini bajaring.');
      setCurrentStep(3);
    } catch (err: any) {
      setError(err.message || 'Arizani yaratishda xatolik yuz berdi.');
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // STEP 3: In-Wizard Certification Runner
  // --------------------------------------------------------------------------
  const handleRunCertification = async () => {
    if (!integrationSaved) { setCertError('O‘zgargan API sozlamalarini avval saqlang.'); return; }
    const targetSlug = slug.trim() || createdCredentials?.providerSlug;
    if (!targetSlug) {
      setCertError('Provider topilmadi. Iltimos, 2-qadamda arizani saqlang.');
      return;
    }

    setCertLoading(true);
    setCertError(null);
    setSuccessMsg(null);
    try {
      const authToken = token;
      const res = await fetch(`${apiBase}/api/v1/providers/${encodeURIComponent(targetSlug)}/certify`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || 'Sertifikatlash jarayonida server xatosi yuz berdi.');
      }
      setCertReport(data);
      if (data.isProductionReady) {
        setSuccessMsg('Barcha mandatory sertifikatlash testlari muvaffaqiyatli o‘tdi!');
      }
    } catch (err: any) {
      setCertError(err.message || 'Certificationni ishga tushirishda xatolik yuz berdi.');
    } finally {
      setCertLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // STEP 4: Submit for Review
  // --------------------------------------------------------------------------
  const handleSubmitReview = async () => {
    if (!integrationSaved || !certReport?.isProductionReady) { setError('Avval sozlamalarni saqlang va sertifikatlashni yakunlang.'); return; }
    const targetSlug = slug.trim() || createdCredentials?.providerSlug;
    if (!targetSlug) return;
    setSubmittingReview(true);
    setError(null);
    try {
      const authToken = token;
      const res = await fetch(`${apiBase}/api/v1/providers/${encodeURIComponent(targetSlug)}/submit-review`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || 'Arizani reviewga topshirishda xatolik yuz berdi.');
      }
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      onNavigateTab('apps');
    } catch (err: any) {
      setError(err.message || 'Arizani topshirishda xatolik.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const isStepAccessible = (stepNum: number): boolean => stepNum <= maxStep;
  const handleStepClick = (stepNum: number) => {
    if (loading || certLoading || savingCertificationSettings) return;
    if (isStepAccessible(stepNum)) { setCurrentStep(stepNum); setSuccessMsg(null); }
  };

  const openDocModal = (docId: string) => {
    setActiveDocsDrawer(docId);
  };

  const stepsList = [
    { num: 1, title: 'Biznes', subtitle: 'Profil va yordam' },
    { num: 2, title: 'API ulash', subtitle: 'Online API' },
    { num: 3, title: 'Moslik', subtitle: 'Contract testi' },
    { num: 4, title: 'Ko‘rib chiqish', subtitle: 'Review' }
  ];

  return (
    <div className="max-w-6xl mx-auto my-8 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl animate-fadeIn space-y-8 relative">
      {/* Stepper Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <img
              src="/logo2.webp"
              alt="Zayuno"
              className="w-11 h-11 rounded-xl object-contain shadow-md flex-shrink-0 border border-slate-800"
            />
            <div>
              <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest font-semibold">
                Self-Service Onboarding
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Zayuno Provider Bo‘lish
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-emerald-400/90 flex items-center gap-1 bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-1 rounded-full font-mono">
              <Check className="w-3 h-3" /> Qoralama saqlanmoqda
            </span>
            <span className="hidden sm:inline text-xs font-mono text-slate-400">
              Qadam {currentStep} / {stepsList.length}
            </span>
          </div>
        </div>

        {/* Progress Bar & Steps Tabs */}
        <div className="grid grid-cols-4 gap-2">
          {stepsList.map(s => {
            const isCompleted = (s.num === 1 && businessValid) || (s.num === 2 && integrationSaved) || (s.num === 3 && integrationSaved && Boolean(certReport?.isProductionReady));
            const isCurrent = currentStep === s.num;
            const accessible = isStepAccessible(s.num);
            return (
              <button
                key={s.num}
                type="button"
                onClick={() => handleStepClick(s.num)}
                title={!accessible ? 'Avval oldingi qadamni to‘ldiring' : ''}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  isCurrent
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30 font-semibold'
                    : isCompleted
                    ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40 font-medium hover:border-emerald-400/60'
                    : accessible
                    ? 'bg-slate-950/40 text-slate-400 border-slate-800 hover:text-white'
                    : 'bg-slate-950/20 text-slate-600 border-slate-800/40 cursor-not-allowed opacity-60'
                }`}
              >
                <div className="flex items-center justify-center gap-1 text-[11px] font-mono">
                  {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <span>{s.num}.</span>}
                  <span className="truncate">{s.title}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Global Error / Success Messages */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-start gap-2.5 animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">{error}</div>
        </div>
      )}
      {assignedProviderConflict && (
        <section role="alert" className="rounded-2xl border border-amber-400/35 bg-amber-950/25 p-5 text-sm text-amber-50 shadow-lg shadow-amber-950/10 animate-fadeIn">
          <div className="flex items-start gap-3">
            <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
            <div className="min-w-0 flex-1">
              <p className="font-bold text-amber-100">Bu hisob boshqa biznesga ulangan</p>
              <p className="mt-1.5 leading-6 text-amber-50/90"><strong>{assignedProviderConflict.name}</strong>{assignedProviderConflict.slug ? ` (${assignedProviderConflict.slug})` : ''} hozir shu account bilan boshqariladi. Shu sabab <strong>{slug.trim() || 'yangi provider'}</strong> arizasi yaratilmagan.</p>
              <p className="mt-2 leading-6 text-amber-100/80">Bir provider account bitta biznes uchun ishlaydi. Yangi biznesni ulash uchun unga alohida owner account bering yoki admin orqali accountni ko‘chiring.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => onNavigateTab('apps')} className="inline-flex items-center gap-1.5 rounded-xl bg-amber-300 px-3.5 py-2 text-xs font-bold text-slate-950 transition hover:bg-amber-200"><Building2 className="h-3.5 w-3.5" /> Mening biznesimni ochish</button>
                <button type="button" onClick={() => setAssignedProviderConflict(null)} className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200/30 px-3.5 py-2 text-xs font-semibold text-amber-100 transition hover:bg-amber-100/10">Boshqa account bilan davom etish</button>
              </div>
            </div>
          </div>
        </section>
      )}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-start gap-2.5 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">{successMsg}</div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* STEP 1: Account Creation                                              */}
      {/* --------------------------------------------------------------------- */}
      {false && (
        Boolean(token) ? (
          <div className="space-y-6 animate-fadeIn">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">1. Provider hisobi faol</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Siz platformaga muvaffaqiyatli kirgansiz.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-emerald-300">Hisob yaratilgan va tizimga kirilgan</h4>
                <p className="text-xs text-emerald-400/80 mt-1">
                  1-bosqich (Hisob) va 2-bosqich (Email tasdiqlash) muvaffaqiyatli yakunlangan. To‘g‘ridan-to‘g‘ri biznes ma’lumotlarini kiritishga o‘tishingiz mumkin.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-6 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
              >
                Davom etish (3. Biznes ma’lumotlari) <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleRegisterAccount} className="space-y-6 animate-fadeIn">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">1. Provider hisobini yaratish</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Platformaga arizangizni topshirish va xavfsiz API kalitlarini boshqarish uchun shaxsiy hisob oching.
              </p>
            </div>

            <ProviderLogoInput value={logoUrl} onChange={setLogoUrl} />
          {fieldError('logoUrl')}
          <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Ismingiz yoki Tashkilot nomi *</label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Masalan: Alisher Usmonov yoki Express Logistics MCHJ"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Rasmiy Email manzil *</label>
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
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Ushbu manzilga 1 martalik faollashtirish kodi yuboriladi.
                </span>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Xavfsiz parol *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Kamida 12 belgili xavfsiz parol"
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

                {/* Password strength meter */}
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className={`h-1 flex-1 rounded-full ${password.length >= 12 ? 'bg-emerald-500' : password.length >= 8 ? 'bg-amber-500' : 'bg-slate-800'}`} />
                    <div className={`h-1 flex-1 rounded-full ${password.length >= 12 && /[0-9!@#$%^&*]/.test(password) ? 'bg-emerald-500' : 'bg-slate-800'}`} />
                    <div className={`h-1 flex-1 rounded-full ${password.length >= 14 && /[A-Z]/.test(password) ? 'bg-emerald-500' : 'bg-slate-800'}`} />
                  </div>
                  <span className={`text-[11px] ${password.length >= 12 ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {password.length >= 12 ? '✓ Parol xavfsizlik talabiga javob beradi (12+ belgi)' : 'Parol kamida 12 belgidan iborat bo‘lishi lozim'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => onNavigateTab('overview')}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Bosh sahifaga qaytish
              </button>
              <button
                type="submit"
                disabled={loading || password.length < 12 || !email || !fullName}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold px-6 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
              >
                {loading ? 'Yaratilmoqda…' : 'Davom etish (Email tasdiqlash)'} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )
      )}

      {/* --------------------------------------------------------------------- */}
      {/* STEP 2: Email Verification                                            */}
      {/* --------------------------------------------------------------------- */}
      {false && (
        Boolean(token) ? (
          <div className="space-y-6 animate-fadeIn">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">2. Email manzilini tasdiqlash</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Email manzilingiz muvaffaqiyatli tasdiqlangan va hisobingiz to‘liq faollashtirilgan.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-emerald-300">Email muvaffaqiyatli tasdiqlangan va tizimga kirilgan</h4>
                <p className="text-xs text-emerald-400/80 mt-1">
                  Profilingiz faol holatda. Endi keyingi bosqichda kompaniya yoki xizmat ma’lumotlarini kiriting.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Ortga
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-6 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
              >
                Keyingi bosqichga o‘tish (Biznes profil) <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleVerifyEmail} className="space-y-6 animate-fadeIn">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">2. Email manzilini tasdiqlash</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                <span className="text-indigo-400 font-mono">{email}</span> manziliga tasdiqlash kodi yuborildi. Iltimos, kodni kiriting.
              </p>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Tasdiqlash kodi (Verification Token) *</label>
                <input
                  type="text"
                  required
                  value={verifyToken}
                  onChange={e => setVerifyToken(e.target.value)}
                  placeholder="Emailingizga kelgan 32 belgili tasdiqlash kodi"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-mono text-center text-sm tracking-wider focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
              </div>

              <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400">Xat kelmadimi?</span>
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resendCooldown > 0}
                  className="text-indigo-400 hover:text-indigo-300 disabled:text-slate-600 font-medium transition-colors"
                >
                  {resendCooldown > 0 ? `Qayta yuborish (${resendCooldown}s)` : 'Qayta yuborish'}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Ortga (Emailni o‘zgartirish)
              </button>
              <button
                type="submit"
                disabled={loading || !verifyToken.trim()}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2"
              >
                {loading ? 'Tasdiqlanmoqda…' : 'Emailni tasdiqlash va o‘tish'} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )
      )}

      {/* --------------------------------------------------------------------- */}
      {/* STEP 3: Business Details                                              */}
      {/* --------------------------------------------------------------------- */}
      {currentStep === 1 && (
        <form noValidate onSubmit={handleBusinessStepNext} className="space-y-6 animate-fadeIn">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">1. Biznes va mijoz yordam ma’lumotlari</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Mijoz buyurtma bergach kimga va qayerga murojaat qilishini aniq ko‘rsatamiz. Filial, manzil va offline jarayonlar bu integratsiyada so‘ralmaydi.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Kompaniya yoki Xizmat nomi *</label>
                <input
                  type="text"
                  required
                  id="businessName" aria-label="businessName" aria-invalid={Boolean(fieldErrors.businessName)} aria-describedby="businessName-error"
                    value={businessName}
                  onChange={e => handleBusinessNameChange(e.target.value)}
                  placeholder="Masalan: Express Logistics, Coffee Time, Tez Taxi"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                />
                  {fieldError('businessName')}
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Rasmiy veb-sayt yoki yordam sahifasi</label>
                <input
                  type="url"
                  id="supportUrl" aria-label="supportUrl" aria-invalid={Boolean(fieldErrors.supportUrl)} aria-describedby="supportUrl-error"
                  value={supportUrl}
                  onChange={e => setSupportUrl(e.target.value)}
                  placeholder="https://business.uz/yordam"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                />
                <p className="mt-1 text-[11px] text-slate-500">Mijozlar buyurtma bo‘yicha yordam yoki rasmiy ma’lumot uchun shu havolani ochadi.</p>
                {fieldError('supportUrl')}
              </div>
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-medium">Biznes haqida qisqacha izoh <span className="text-slate-500">(ixtiyoriy)</span></label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
                placeholder="Masalan: onlayn katalog va buyurtma qabul qiluvchi biznes. Aniq xizmatlar API katalogidan olinadi."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3">
              <h4 className="font-semibold text-white flex items-center gap-2">
                <Phone className="w-4 h-4 text-indigo-400" /> Mijozlar uchun yordam <span className="text-rose-400">*</span>
              </h4>
              <p className="text-[11px] text-slate-400">Buyurtmadan keyin mijoz aynan shu kanallarni ko‘radi. Kamida bittasini kiriting: telefon, Telegram yoki support email. Qolganlarini xohlaganingizcha qo‘shing.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Telefon raqam</label>
                  <input
                    type="text"
                    id="supportPhone" aria-label="supportPhone" aria-invalid={Boolean(fieldErrors.supportPhone)} aria-describedby="supportPhone-error"
                    value={supportPhone}
                    onChange={e => setSupportPhone(e.target.value)}
                    placeholder="+998712000000"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                  {fieldError('supportPhone')}
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Telegram Support</label>
                  <input
                    type="text"
                    id="supportTelegram" aria-label="supportTelegram" aria-invalid={Boolean(fieldErrors.supportTelegram)} aria-describedby="supportTelegram-error"
                    value={supportTelegram}
                    onChange={e => setSupportTelegram(e.target.value)}
                    placeholder="@business_support"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                  {fieldError('supportTelegram')}
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Yordam emaili</label>
                  <input
                    type="email"
                    id="supportEmail" aria-label="supportEmail" aria-invalid={Boolean(fieldErrors.supportEmail)} aria-describedby="supportEmail-error"
                    value={supportEmail}
                    onChange={e => setSupportEmail(e.target.value)}
                    placeholder="support@business.uz"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                  {fieldError('supportEmail')}
                </div>
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Mijozga ko‘rinadigan qisqa izoh <span className="text-slate-500">(ixtiyoriy)</span></label>
                <textarea
                  id="supportNote" aria-label="supportNote" aria-invalid={Boolean(fieldErrors.supportNote)} aria-describedby="supportNote-error"
                  value={supportNote}
                  onChange={e => setSupportNote(e.target.value)}
                  rows={2}
                  maxLength={500}
                  placeholder="Masalan: Buyurtma raqamingizni yuboring, jamoamiz yordam beradi."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
                <div className="mt-1 flex justify-between text-[10px] text-slate-500"><span>Bu izoh buyurtma kartasida chiqadi.</span><span>{supportNote.length}/500</span></div>
                {fieldError('supportNote')}
              </div>
              <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/20 p-3 text-[11px] text-slate-300">
                <span className="font-semibold text-white">Mijoz ko‘rinishi:</span> “Buyurtmangiz bo‘yicha yordam kerakmi?” — telefon, Telegram, email va rasmiy sayt tugmalari faqat kiritilgan qiymatlar bilan chiqadi.
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => onNavigateTab('overview')}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Ortga
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold px-6 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
            >
              Keyingi qadam (API sozlamalari) <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* STEP 2: Online API connection                                         */}
      {/* --------------------------------------------------------------------- */}
      {currentStep === 2 && (
        <form noValidate onSubmit={handleRegisterProvider} className="space-y-6 animate-fadeIn">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">2. API’ni ulang va tekshiring</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Zayuno faqat public HTTPS API bilan ulanadi. Manzilni kiriting, keyin tizim serveringiz haqiqatan javob berayotganini tekshiradi.
            </p>
          </div>

          <div className="space-y-5 text-xs">
            {/* Auto identity & Base URL */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-3">
                <div className="flex items-center gap-2 text-slate-300 font-medium">
                  <Building2 className="h-4 w-4 text-indigo-400" /> Zayuno biznes ID
                </div>
                <code className="mt-2 block text-sm text-indigo-300 font-mono">{slug || 'business-id-yaratilmoqda'}</code>
                <p className="mt-1 text-[11px] text-slate-500">Biznes nomidan avtomatik yaratiladi. Keyin sozlamalarda o‘zgartirish mumkin.</p>
                {fieldError('slug')}
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium items-center">
                  <span>API Base URL (HTTPS) *</span>
                  <InfoTooltip
                    text="Zayuno so‘rov yuboradigan sizning server manzilingiz. Bu oddiy sayt manzili emas, backend API endpoint bo‘lishi kerak."
                    docId="base-url"
                    onOpenDoc={openDocModal}
                  />
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    id="baseUrl" aria-label="baseUrl" aria-invalid={Boolean(fieldErrors.baseUrl)} aria-describedby="baseUrl-error"
                    value={baseUrl}
                    onChange={e => {
                      setBaseUrl(e.target.value);
                      if (urlCheckResult.status !== 'idle') {
                        setUrlCheckResult({ status: 'idle', message: '' });
                        setShowHealthReport(false);
                      }
                    }}
                    placeholder="https://api.sizningbiznesingiz.uz/zayuno"
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                  />
                  {fieldError('baseUrl')}
                  <button
                    type="button"
                    onClick={handleTestBaseUrl}
                    disabled={testingUrl || !baseUrl.trim()}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold shrink-0 transition flex items-center gap-1.5"
                  >
                    {testingUrl ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />}
                    <span>{testingUrl ? 'Tekshirilmoqda...' : 'URLni tekshirish'}</span>
                  </button>
                </div>
                <div className="flex items-center justify-between text-[11px] mt-1 flex-wrap gap-1">
                  <span className="text-slate-500 font-mono">Masalan: https://api.sizningbiznesingiz.uz/zayuno</span>
                  <button
                    type="button"
                    onClick={() => openDocModal('base-url')}
                    className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-0.5"
                  >
                    API Base URL qanday tayyorlanadi? →
                  </button>
                </div>
              </div>
            </div>

            {/* Sandbox Notice Banner */}
            {isOfficialSandboxUrl(baseUrl) && (
              <div className="p-3.5 rounded-2xl bg-sky-950/30 border border-sky-500/40 flex items-start gap-2.5 text-xs text-sky-200 animate-fadeIn">
                <Sparkles className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block text-white">Sandbox test provideri tanlandi</span>
                  <p className="text-[11px] text-sky-300 mt-0.5 leading-relaxed">
                    Sandbox test provideri tanlandi. Test credentiallari Zayuno serveri tomonidan xavfsiz qo‘llanadi; siz hech qanday kalit kiritmaysiz.
                  </p>
                </div>
              </div>
            )}

            {/* URL Health Check Alert */}
            {urlCheckResult.status !== 'idle' && (
              <div
                className={`rounded-2xl border overflow-hidden text-xs animate-fadeIn ${
                  urlCheckResult.status === 'success'
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-100'
                    : urlCheckResult.status === 'https_required' || urlCheckResult.status === 'warning'
                    ? 'bg-amber-950/35 border-amber-500/40 text-amber-100'
                    : 'bg-rose-950/35 border-rose-500/40 text-rose-100'
                }`}
              >
                <div className="p-4 flex items-start gap-3">
                  {urlCheckResult.status === 'success' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-bold text-sm text-white">{urlCheckResult.guidance?.title || 'Ulanish holati'}</p>
                        <p className="mt-0.5 text-slate-300 leading-relaxed">{urlCheckResult.message}</p>
                      </div>
                      {urlCheckResult.code && <span className="rounded-full border border-white/10 bg-slate-950/45 px-2 py-1 font-mono text-[10px] text-slate-300">{urlCheckResult.code}</span>}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="rounded-xl bg-slate-950/45 border border-white/5 px-2.5 py-2"><span className="block text-[10px] uppercase tracking-wider text-slate-500">Tekshirilgan manzil</span><code className="mt-1 block break-all text-[11px] text-sky-200">{urlCheckResult.checkedUrl || '—'}</code></div>
                      <div className="rounded-xl bg-slate-950/45 border border-white/5 px-2.5 py-2"><span className="block text-[10px] uppercase tracking-wider text-slate-500">HTTP javob</span><strong className="mt-1 block text-sm text-white">{urlCheckResult.statusCode ?? '—'}</strong></div>
                      <div className="rounded-xl bg-slate-950/45 border border-white/5 px-2.5 py-2"><span className="block text-[10px] uppercase tracking-wider text-slate-500">Javob vaqti</span><strong className="mt-1 block text-sm text-white">{urlCheckResult.latencyMs !== undefined ? `${urlCheckResult.latencyMs} ms` : '—'}</strong></div>
                    </div>

                    {urlCheckResult.guidance && (
                      <div className="rounded-xl bg-slate-950/35 border border-white/5 p-3 space-y-2">
                        <p><span className="font-semibold text-white">Nima bo‘ldi: </span>{urlCheckResult.guidance.cause}</p>
                        <p><span className="font-semibold text-white">Kutilgan holat: </span>{urlCheckResult.guidance.expected}</p>
                        <ol className="space-y-1 list-decimal list-inside text-slate-200">
                          {urlCheckResult.guidance.steps.map(step => <li key={step}>{step}</li>)}
                        </ol>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-0.5">
                      {urlCheckResult.status !== 'success' && urlCheckResult.guidance && (
                        <button type="button" onClick={handleCopyHealthFixBrief} className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold shadow-md shadow-indigo-600/25 transition flex items-center gap-1.5">
                          {copiedHealthFix ? <Check className="w-3.5 h-3.5 text-emerald-200" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedHealthFix ? 'Fix brief nusxalandi!' : 'AI uchun fix brief nusxalash'}
                        </button>
                      )}
                      <button type="button" onClick={() => setShowHealthReport(true)} className="px-3 py-2 rounded-xl border border-slate-600 bg-slate-900/75 hover:bg-slate-800 text-slate-200 text-[11px] font-semibold transition">
                        Batafsil diagnostika
                      </button>
                      {urlCheckResult.status !== 'success' && (
                        <button type="button" onClick={handleTestBaseUrl} disabled={testingUrl} className="px-3 py-2 rounded-xl border border-slate-600 bg-slate-900/75 hover:bg-slate-800 disabled:opacity-50 text-slate-200 text-[11px] font-semibold transition flex items-center gap-1.5">
                          <RefreshCw className={`w-3.5 h-3.5 ${testingUrl ? 'animate-spin' : ''}`} /> Qayta tekshirish
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-[11px]">
              <div className="rounded-xl bg-slate-900/80 p-2.5">
                <span className="text-slate-500 block">1. Public manzil</span>
                <span className={baseUrl.trim() ? 'mt-1 block font-semibold text-emerald-300' : 'mt-1 block font-semibold text-slate-400'}>{baseUrl.trim() ? 'Kiritildi' : 'Kutilmoqda'}</span>
              </div>
              <div className="rounded-xl bg-slate-900/80 p-2.5">
                <span className="text-slate-500 block">2. Server health</span>
                <span className={urlCheckResult.status === 'success' ? 'mt-1 block font-semibold text-emerald-300' : urlCheckResult.status === 'idle' ? 'mt-1 block font-semibold text-slate-400' : 'mt-1 block font-semibold text-amber-300'}>{urlCheckResult.status === 'success' ? 'Tasdiqlandi' : urlCheckResult.status === 'idle' ? 'Tekshirilmagan' : 'E’tibor kerak'}</span>
              </div>
              <div className="rounded-xl bg-slate-900/80 p-2.5">
                <span className="text-slate-500 block">3. To‘liq contract</span>
                <span className={certReport?.isProductionReady ? 'mt-1 block font-semibold text-emerald-300' : 'mt-1 block font-semibold text-slate-400'}>{certReport?.isProductionReady ? 'Mos' : 'Keyingi qadamda'}</span>
              </div>
            </div>

            {/* Developer and AI handoff */}
            <div className="p-3.5 rounded-2xl bg-indigo-950/25 border border-indigo-500/30 flex items-center justify-between flex-wrap gap-3">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Bot className="w-4 h-4 text-amber-300" /> Dasturchi yoki AI agent uchun bitta aniq brief
                </span>
                <p className="text-[11px] text-slate-300">
                  Brief rasmiy docs, OpenAPI, endpointlar, xavfsizlik va tugallangan ish mezonini bitta nusxada beradi.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadOpenApi}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold transition flex items-center gap-1.5"
                >
                  <FileCode className="w-3.5 h-3.5 text-sky-400" /> OpenAPI 3.1
                </button>
                <button
                  type="button"
                  onClick={() => openDocModal('getting-started')}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold transition flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-emerald-400" /> Express · FastAPI · Go
                </button>
                <button
                  type="button"
                  onClick={handleCopyIntegrationBrief}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition shadow-md shadow-indigo-600/30 flex items-center gap-1.5 shrink-0"
                >
                  {copiedBrief ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedBrief ? 'Brief nusxalandi!' : 'AI uchun brief nusxalash'}</span>
                </button>
              </div>
            </div>

            {/* Question: Mijoz Zayuno orqali nima qila olsin? */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="block text-white font-bold text-sm">
                  Mijoz Zayuno orqali nima qila olsin? *
                </label>
                <button
                  type="button"
                  onClick={() => openDocModal('getting-started')}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                >
                  Qo‘llanma va kontraktlar →
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* Variant A: Faqat topish va ko'rish */}
                <section
                  role="radio"
                  aria-checked={capabilityProfile === 'readonly'}
                  tabIndex={0}
                  onClick={() => setCapabilityProfile('readonly')}
                  onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setCapabilityProfile('readonly'); } }}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all space-y-2.5 ${
                    capabilityProfile === 'readonly'
                      ? 'bg-indigo-950/50 border-indigo-500 shadow-lg shadow-indigo-950/50 ring-1 ring-indigo-500/50'
                      : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white flex items-center gap-1.5 text-xs">
                      <Globe className="w-4 h-4 text-sky-400" /> Variant A — Faqat topish va ko‘rish
                    </span>
                    <input
                      type="radio"
                      checked={capabilityProfile === 'readonly'}
                      onChange={() => setCapabilityProfile('readonly')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    AI xizmatlaringiz, katalogingiz yoki e’lonlaringizni topib ko‘rsatadi. Buyurtma yaratilmaydi.
                  </p>
                  <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
                    <span className="text-slate-500 font-semibold block mb-0.5">Mos misollar:</span>
                    vakansiyalar, nomzodlar, katalog, konsultatsiya, ma’lumotnoma xizmati.
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] font-mono text-sky-300">Endpointlar: /health, /catalog, /search</span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); openDocModal('catalog'); }}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold"
                    >
                      Batafsil ko‘rish →
                    </button>
                  </div>
                </section>

                {/* Variant B: Topish va buyurtma berish */}
                <section
                  role="radio"
                  aria-checked={capabilityProfile === 'transactional'}
                  tabIndex={0}
                  onClick={() => setCapabilityProfile('transactional')}
                  onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setCapabilityProfile('transactional'); } }}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all space-y-2.5 ${
                    capabilityProfile === 'transactional'
                      ? 'bg-indigo-950/50 border-indigo-500 shadow-lg shadow-indigo-950/50 ring-1 ring-indigo-500/50'
                      : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white flex items-center gap-1.5 text-xs">
                      <Zap className="w-4 h-4 text-amber-400" /> Variant B — Topish va buyurtma berish
                    </span>
                    <input
                      type="radio"
                      checked={capabilityProfile === 'transactional'}
                      onChange={() => setCapabilityProfile('transactional')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    AI mahsulot/xizmatni topadi, aniq narx oladi, foydalanuvchi tasdiqlagach buyurtma yaratadi.
                  </p>
                  <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
                    <span className="text-slate-500 font-semibold block mb-0.5">Mos misollar:</span>
                    restoran va delivery, chipta, booking, do‘kon, pullik xizmatlar.
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] font-mono text-amber-300">Provider endpointlari: /provider-info, /health, /catalog, /quote, /actions</span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); openDocModal('actions'); }}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold"
                    >
                      Batafsil ko‘rish →
                    </button>
                  </div>
                </section>
              </div>

              {/* Dynamic Endpoint Checklist */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                    Tanlangan rejim uchun talab etiladigan endpointlar ro‘yxati:
                  </span>
                  <span className="text-[10px] font-mono text-indigo-400 font-semibold">
                    {capabilityProfile === 'transactional' ? 'Variant B (To‘liq)' : 'Variant A (Katalog)'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                    <span className="font-mono text-slate-200">GET /provider-info</span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold text-[10px]">Majburiy</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                    <span className="font-mono text-slate-200">GET /health</span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold text-[10px]">Majburiy</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                    <span className="font-mono text-slate-200">GET /catalog</span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold text-[10px]">Majburiy</span>
                  </div>
                  {capabilityProfile === 'transactional' ? (
                    <>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                        <span className="font-mono text-slate-200">POST /quote</span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold text-[10px]">Majburiy</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                        <span className="font-mono text-slate-200">POST /actions</span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold text-[10px]">Majburiy</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                        <span className="font-mono text-slate-200">GET /actions/:id</span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold text-[10px]">Majburiy</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                        <span className="font-mono text-slate-200">Event → Zayuno webhook URL</span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold text-[10px]">Majburiy (HMAC)</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                        <span className="font-mono text-slate-200">GET /search</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-semibold text-[10px]">Ixtiyoriy</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Auth Method */}
            <div className="space-y-4">
              <div>
                <label className="block text-slate-300 mb-1 font-medium items-center">
                  <span>Autentifikatsiya formati</span>
                  <InfoTooltip
                    text="Zayuno sizning API serveringizga so‘rov yuborganda o‘zini qanday tasdiqlashini belgilaydi."
                    docId="auth"
                    onOpenDoc={openDocModal}
                  />
                </label>
                <select
                  value={authMethod}
                  onChange={e => setAuthMethod(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="API_KEY">X-API-KEY Header (Tavsiya etiladi — har bir so‘rovda maxfiy API kalit tekshiriladi)</option>
                  <option value="BEARER_TOKEN">Authorization: Bearer Token (Standart Bearer token formati)</option>
                  <option value="HMAC_SIGNATURE">HMAC-SHA256 Payload Signature (Kriptografik imzo orqali eng yuqori xavfsizlik)</option>
                </select>
              </div>

              {/* Direction Clarity Banner */}
              <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-white font-semibold">
                  <Lock className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>Credentiallar yo‘nalishi va xavfsizlik</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 text-[11px]">
                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                    <span className="font-semibold text-sky-400 block">1. Zayuno → Sizning serveringiz (Hozir sozlanadi)</span>
                    <p className="text-slate-300 leading-relaxed">
                      Zayuno sizning API serveringizga so‘rov yuborayotganda o‘zini tasdiqlash uchun ushbu secret/tokendan foydalanadi.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                    <span className="font-semibold text-emerald-400 block">2. Siz → Zayuno API (4-bosqichda beriladi)</span>
                    <p className="text-slate-300 leading-relaxed">
                      Sizning tizimingiz Zayuno platformasiga murojaat qilishi uchun 4-bosqichda alohida <code className="text-emerald-300 font-mono">zy_test_...</code> kaliti taqdim etiladi.
                    </p>
                  </div>
                </div>
              </div>

              {/* Credential Inputs for Real External APIs */}
              {!isOfficialSandboxUrl(baseUrl) && (
                <div className="space-y-3 pt-1 animate-fadeIn">
                  {/* Mode Selector Tabs */}
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 border border-slate-800 rounded-xl text-xs">
                    <button
                      type="button"
                      onClick={() => setCredentialMode('auto')}
                      className={`py-2 px-3 rounded-lg font-medium transition flex items-center justify-center gap-1.5 ${
                        credentialMode === 'auto'
                          ? 'bg-indigo-600 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>Zayuno yaratsin (Tavsiya)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCredentialMode('byo')}
                      className={`py-2 px-3 rounded-lg font-medium transition flex items-center justify-center gap-1.5 ${
                        credentialMode === 'byo'
                          ? 'bg-indigo-600 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Key className="w-3.5 h-3.5 text-sky-300" />
                      <span>Mavjud kalitimni kiritaman</span>
                    </button>
                  </div>

                  {hasSavedSecret && !showSecretInput && !apiSecret && !generatedSecret ? (
                    <div className="p-4 rounded-2xl bg-slate-950/80 border border-emerald-500/30 flex items-center justify-between animate-fadeIn">
                      <div className="flex items-center gap-2 text-xs text-emerald-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div>
                          <span className="font-semibold block">Credential saqlangan (Serverda xavfsiz shifrlangan)</span>
                          <span className="text-[11px] text-slate-400">Yangi kalit kiritilmasa, mavjud kalit saqlab qolinadi.</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowSecretInput(true);
                          setHasConfirmedSavedSecret(false);
                        }}
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-medium px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 transition"
                      >
                        Yangi kalit kiritish / yaratish
                      </button>
                    </div>
                  ) : credentialMode === 'auto' ? (
                    <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <label className="block text-slate-200 font-semibold text-xs flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          <span>Zayuno tomonidan xavfsiz yaratiladigan secret</span>
                        </label>
                        {!generatedSecret && (
                          <button
                            type="button"
                            onClick={handleGenerateSecret}
                            disabled={loading}
                            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition flex items-center gap-1.5"
                          >
                            <Key className="w-3.5 h-3.5" />
                            <span>Xavfsiz kalit yaratish</span>
                          </button>
                        )}
                      </div>

                      {generatedSecret ? (
                        <div className="space-y-2.5 p-3 rounded-xl bg-slate-900 border border-indigo-500/40 animate-fadeIn">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-300 font-medium">Yaratilgan maxfiy kalit (Faqat bir marta ko‘rsatiladi):</span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(generatedSecret);
                                  setCopiedSecret(true);
                                  setTimeout(() => setCopiedSecret(false), 2500);
                                }}
                                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] flex items-center gap-1 transition"
                              >
                                {copiedSecret ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                <span>{copiedSecret ? 'Nusxalandi!' : 'Nusxa olish'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={handleDownloadCredentialsJson}
                                className="px-2 py-1 rounded bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/30 text-indigo-200 text-[11px] flex items-center gap-1 transition"
                              >
                                <span>JSON yuklab olish</span>
                              </button>
                            </div>
                          </div>
                          <div className="p-2.5 rounded-lg bg-black/60 font-mono text-xs text-amber-300 break-all select-all border border-slate-800">
                            {generatedSecret}
                          </div>
                          <label className="flex items-start gap-2 pt-1 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={hasConfirmedSavedSecret}
                              onChange={e => setHasConfirmedSavedSecret(e.target.checked)}
                              className="mt-0.5 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-[11px] text-slate-300 leading-snug">
                              Men ushbu maxfiy kalitdan nusxa oldim va backend sozlamalarimga (<code className="text-amber-300 font-mono">.env</code>) joylashtirdim.
                            </span>
                          </label>
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          "Xavfsiz kalit yaratish" tugmasini bosing. Zayuno backendda 256-bitli kriptografik kalit yaratadi. Ushbu kalitni o‘z serveringiz .env fayliga kiritasiz.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5 animate-fadeIn">
                      {/* API_KEY */}
                      {authMethod === 'API_KEY' && (
                        <>
                          <div className="flex items-center justify-between">
                            <label className="block text-slate-200 font-medium text-xs flex items-center gap-1.5">
                              <Key className="w-3.5 h-3.5 text-sky-400" />
                              <span>Provider API key *</span>
                              <InfoTooltip
                                text="Bu sizning serveringizni Zayuno so‘rovlaridan himoya qiladigan kalit. Uni sizning dasturchingiz backend sozlamalarida yaratadi va Zayuno portalga bir marta kiritadi."
                                docId="auth"
                                onOpenDoc={openDocModal}
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => openDocModal('auth')}
                              className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-0.5"
                            >
                              ? Qayerdan olaman? →
                            </button>
                          </div>
                          <div className="relative">
                            <input
                              type={showSecret ? "text" : "password"}
                              id="apiSecret" aria-label="apiSecret" aria-invalid={Boolean(fieldErrors.apiSecret)} aria-describedby="apiSecret-error"
                    value={apiSecret}
                              onChange={e => {
                                setApiSecret(e.target.value);
                                setHasConfirmedSavedSecret(true);
                              }}
                              placeholder="Dasturchingiz yaratgan API key’ni kiriting"
                              autoComplete="new-password"
                              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 pr-10 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                            />
                  {fieldError('apiSecret')}
                            <button
                              type="button"
                              onClick={() => setShowSecret(!showSecret)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                              aria-label="Kalitni ko‘rsatish/yashirish"
                            >
                              {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed">
                            Dasturchingiz provider serverida yaratgan maxfiy kalit. Zayuno har so‘rovda shu kalitni <code className="text-sky-300 font-mono bg-sky-950/50 px-1 py-0.5 rounded border border-sky-500/30">x-provider-api-key</code> headerida yuboradi.
                          </p>
                        </>
                      )}

                      {/* BEARER_TOKEN */}
                      {authMethod === 'BEARER_TOKEN' && (
                        <>
                          <div className="flex items-center justify-between">
                            <label className="block text-slate-200 font-medium text-xs flex items-center gap-1.5">
                              <Key className="w-3.5 h-3.5 text-amber-400" />
                              <span>Bearer token *</span>
                              <InfoTooltip
                                text="Provider serveringiz kutadigan access token. Zayuno uni Authorization: Bearer ... shaklida yuboradi."
                                docId="auth"
                                onOpenDoc={openDocModal}
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => openDocModal('auth')}
                              className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-0.5"
                            >
                              ? Qayerdan olaman? →
                            </button>
                          </div>
                          <div className="relative">
                            <input
                              type={showSecret ? "text" : "password"}
                              id="apiSecret" aria-label="apiSecret" aria-invalid={Boolean(fieldErrors.apiSecret)} aria-describedby="apiSecret-error"
                    value={apiSecret}
                              onChange={e => {
                                setApiSecret(e.target.value);
                                setHasConfirmedSavedSecret(true);
                              }}
                              placeholder="Bearer tokenni kiriting"
                              autoComplete="new-password"
                              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 pr-10 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                            />
                  {fieldError('apiSecret')}
                            <button
                              type="button"
                              onClick={() => setShowSecret(!showSecret)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                              aria-label="Tokenni ko‘rsatish/yashirish"
                            >
                              {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed">
                            Provider serveringiz kutadigan access token. Zayuno uni <code className="text-amber-300 font-mono bg-amber-950/50 px-1 py-0.5 rounded border border-amber-500/30">Authorization: Bearer ...</code> shaklida yuboradi.
                          </p>
                        </>
                      )}

                      {/* HMAC_SIGNATURE */}
                      {authMethod === 'HMAC_SIGNATURE' && (
                        <>
                          <div className="flex items-center justify-between">
                            <label className="block text-slate-200 font-medium text-xs flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5 text-violet-400" />
                              <span>Request signing secret *</span>
                              <InfoTooltip
                                text="Zayuno har request body’ni shu secret bilan HMAC-SHA256 imzolaydi. Provider serveringiz imzoni tekshiradi."
                                docId="auth"
                                onOpenDoc={openDocModal}
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => openDocModal('auth')}
                              className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-0.5"
                            >
                              ? Qayerdan olaman? →
                            </button>
                          </div>
                          <div className="relative">
                            <input
                              type={showSecret ? "text" : "password"}
                              id="apiSecret" aria-label="apiSecret" aria-invalid={Boolean(fieldErrors.apiSecret)} aria-describedby="apiSecret-error"
                    value={apiSecret}
                              onChange={e => {
                                setApiSecret(e.target.value);
                                setHasConfirmedSavedSecret(true);
                              }}
                              placeholder="HMAC request signing secretni kiriting"
                              autoComplete="new-password"
                              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 pr-10 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                            />
                  {fieldError('apiSecret')}
                            <button
                              type="button"
                              onClick={() => setShowSecret(!showSecret)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                              aria-label="Secretni ko‘rsatish/yashirish"
                            >
                              {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed">
                            Zayuno har request body’ni shu secret bilan HMAC-SHA256 imzolaydi va <code className="text-violet-300 font-mono bg-violet-950/50 px-1 py-0.5 rounded border border-violet-500/30">x-zayuno-signature</code> headerida yuboradi. Provider serveringiz imzoni tekshiradi.
                          </p>
                        </>
                      )}

                      {hasSavedSecret && showSecretInput && (
                        <p className="text-[10px] text-amber-400 flex items-center gap-1 mt-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Yangi kalit saqlanganda avvalgi certification bekor qilinadi va qayta test talab etiladi.</span>
                        </p>
                      )}
                    </div>
                  )}

                  <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-start gap-2.5 text-xs text-slate-300">
                    <Webhook className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white flex items-center gap-1">
                          Webhook HMAC Secret
                          <InfoTooltip
                            text="Bu kalit Zayuno’ga yuboriladigan order/status webhooklar haqiqatan sizning serveringizdan kelganini tasdiqlaydi."
                            docId="auth"
                            onOpenDoc={openDocModal}
                          />
                        </span>
                        <button
                          type="button"
                          onClick={() => openDocModal('auth')}
                          className="text-[10px] text-indigo-400 hover:text-indigo-300"
                        >
                          Qo‘llanma →
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Yangi arizada bu secretni o‘ylab topish yoki kiritish shart emas. Zayuno uni avtomatik generatsiya qiladi va 4-bosqichda (Xulosa va Handoff) sizga faqat bir marta xavfsiz taqdim etadi.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Ortga
            </button>
            <div className="flex items-center gap-3">
              {generatedSecret && !hasConfirmedSavedSecret && (
                <span className="text-[11px] text-amber-400">
                  ⚠️ Davom etish uchun yuqoridagi tasdiq katakchasini belgilang.
                </span>
              )}
              <button
                type="submit"
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold px-6 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
              >
                {loading ? 'Saqlanmoqda…' : 'Davom etish'} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </form>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* STEP 5: In-Wizard Interactive Certification Runner                    */}
      {/* --------------------------------------------------------------------- */}
      {currentStep === 3 && (
        <div className="space-y-6 animate-fadeIn">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">3. Sinov va Avtomatlashtirilgan Sertifikatlash</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Zayuno compliance runner barcha talab etiladigan endpointlarni avtomatik tarzda tekshiradi.
            </p>
          </div>

          {/* Provider Details Card */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <span className="text-slate-400">Tekshirilayotgan provider:</span>
              <div className="flex items-center gap-2 font-mono text-white">
                <span className="text-indigo-400 font-bold">{slug || createdCredentials?.providerSlug || 'provider-slug'}</span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-300 text-[11px]">{baseUrl || 'Sandbox Simulator'}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[11px] font-medium">
                {capabilityProfile === 'transactional' ? 'Variant B (Transactional)' : 'Variant A (Discovery)'}
              </span>
              <button
                type="button"
                onClick={() => setShowCertificationSettings(value => !value)}
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-[11px] font-semibold transition"
              >
                {showCertificationSettings ? 'Sozlamalarni yopish' : 'API sozlamalarini tahrirlash'}
              </button>
            </div>
          </div>

          {showCertificationSettings && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-indigo-500/30 space-y-4 animate-fadeIn">
              <div>
                <h4 className="text-sm font-bold text-white">Certification uchun API sozlamalari</h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Tunnel yoki backend manzili o‘zgarsa shu yerning o‘zida yangilang. Saqlash oldingi certification natijasini bekor qiladi.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="text-[11px] text-slate-300 space-y-1.5">
                  <span className="font-semibold">API Base URL (HTTPS)</span>
                  <input
                    id="baseUrl" aria-label="baseUrl" aria-invalid={Boolean(fieldErrors.baseUrl)} aria-describedby="baseUrl-error"
                    value={baseUrl}
                    onChange={event => setBaseUrl(event.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
                    placeholder="https://api.business.uz/zayuno"
                  />
                  {fieldError('baseUrl')}
                </label>
                <label className="text-[11px] text-slate-300 space-y-1.5">
                  <span className="font-semibold">Autentifikatsiya formati</span>
                  <select
                    value={authMethod}
                    onChange={event => setAuthMethod(event.target.value as typeof authMethod)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
                  >
                    <option value="API_KEY">X-API-KEY</option>
                    <option value="BEARER_TOKEN">Bearer token</option>
                    <option value="HMAC_SIGNATURE">HMAC-SHA256</option>
                  </select>
                </label>
              </div>
              {!isOfficialSandboxUrl(baseUrl) && (
                <label className="text-[11px] text-slate-300 space-y-1.5 block">
                  <span className="font-semibold">
                    {authMethod === 'API_KEY' ? 'Provider API key' : authMethod === 'BEARER_TOKEN' ? 'Bearer token' : 'Request signing secret'}
                    {hasSavedSecret ? ' (faqat almashtirmoqchi bo‘lsangiz kiriting)' : ' *'}
                  </span>
                  <div className="relative">
                    <input
                      type={showSecret ? 'text' : 'password'}
                      id="apiSecret" aria-label="apiSecret" aria-invalid={Boolean(fieldErrors.apiSecret)} aria-describedby="apiSecret-error"
                    value={apiSecret}
                      onChange={event => setApiSecret(event.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 pr-10 text-xs text-white outline-none focus:border-indigo-500"
                      placeholder={hasSavedSecret ? 'Serverda saqlangan credentialni o‘zgartirmaslik uchun bo‘sh qoldiring' : 'Provider serveringiz kutadigan secret'}
                      autoComplete="new-password"
                    />
                  {fieldError('apiSecret')}
                    <button type="button" onClick={() => setShowSecret(value => !value)} className="absolute right-3 top-2.5 text-slate-400 hover:text-white">
                      {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </label>
              )}
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={handleTestBaseUrl} disabled={testingUrl} className="px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs text-slate-200 font-semibold disabled:opacity-50">
                  {testingUrl ? 'Tekshirilmoqda…' : 'URLni tekshirish'}
                </button>
                <button type="button" onClick={handleSaveCertificationSettings} disabled={savingCertificationSettings} className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-semibold disabled:opacity-50">
                  {savingCertificationSettings ? 'Saqlanmoqda…' : 'Saqlash va certificationni yangilash'}
                </button>
              </div>
              {urlCheckResult.status !== 'idle' && <p className="text-[11px] text-slate-300">{urlCheckResult.message}</p>}
            </div>
          )}

          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-white">Contract va starter vositalari</span>
              <p className="text-[11px] text-slate-400 mt-0.5">AI yoki code generator uchun canonical contractdan foydalaning.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={handleDownloadOpenApi} className="px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-[11px] text-slate-200 font-semibold flex items-center gap-1.5"><FileCode className="w-3.5 h-3.5 text-sky-400" /> OpenAPI 3.1</button>
              <button type="button" onClick={() => openDocModal('base-url')} className="px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-[11px] text-slate-200 font-semibold">Express · FastAPI · Go</button>
              <button type="button" onClick={handleCopyIntegrationBrief} className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-[11px] text-white font-semibold flex items-center gap-1.5"><Copy className="w-3.5 h-3.5" /> AI brief</button>
            </div>
          </div>

          {/* Sandbox Notice Banner */}
          {(baseUrl.toLowerCase().includes('sandbox') || baseUrl.toLowerCase().includes('shopla.uz')) && (
            <div className="p-3.5 rounded-2xl bg-sky-950/30 border border-sky-500/40 flex items-start gap-2.5 text-xs text-sky-200 animate-fadeIn">
              <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block text-white">Sandbox test provideri</span>
                <p className="text-[11px] text-sky-300 mt-0.5 leading-relaxed">
                  Sandbox test provideri tanlandi. Certification uchun test credential kerak bo‘lishi mumkin. Agar serverda xavfsiz test credential mavjud bo‘lsa, u avtomatik ishlatiladi.
                </p>
              </div>
            </div>
          )}

          {/* Certification Error Alert */}
          {certError && (
            <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/40 flex items-start gap-2.5 text-xs text-rose-300 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">
                <span className="font-semibold block text-white">Xatolik yuz berdi</span>
                <p className="text-[11px] text-rose-200 mt-0.5">{certError}</p>
              </div>
            </div>
          )}

          {/* Certification Report Results */}
          {certReport && (
            <div className="space-y-4 animate-fadeIn">
              {/* Summary Card */}
              <div
                className={`p-4 rounded-2xl border flex items-center justify-between flex-wrap gap-3 ${
                  certReport.isProductionReady
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  {certReport.isProductionReady ? (
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <h4 className="font-bold text-white text-sm">
                      {certReport.isProductionReady
                        ? 'Sertifikatlash muvaffaqiyatli yakunlandi!'
                        : 'Sertifikatlashda muammolar aniqlandi'}
                    </h4>
                    <p className="text-[11px] mt-0.5 opacity-90">
                      {certReport.isProductionReady
                        ? 'Barcha talab etiladigan endpointlar tekshiruvdan o‘tdi. Arizani ko‘rib chiqishga yuborishingiz mumkin.'
                        : 'Ayrim endpointlar yoki kalitlar talablarga javob bermadi. Quyidagi hisobotni tekshiring.'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold block text-white">
                    {certReport.tests ? `${certReport.tests.filter((t: any) => t.status === 'PASS' || t.passed).length} o‘tdi · ${certReport.tests.filter((t: any) => t.status === 'FAIL').length} xato · ${certReport.tests.filter((t: any) => t.status === 'SKIPPED').length} bloklandi` : ''}
                  </span>
                  <span className="text-[10px] opacity-75">
                    {certReport.totalDurationMs ? `${certReport.totalDurationMs} ms` : ''}
                  </span>
                </div>
              </div>

              {/* Detailed Test Items */}
              {certReport.tests && certReport.tests.length > 0 && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                  <h4 className="text-xs font-semibold text-slate-300 mb-2">Test natijalari tafsilotlari:</h4>
                  <div className="space-y-2">
                    {certReport.tests.map((t: any, idx: number) => (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
                          (t.status === 'PASS' || t.passed)
                            ? 'bg-slate-900/80 border-emerald-500/20 text-slate-200'
                            : t.status === 'SKIPPED' ? 'bg-amber-950/20 border-amber-500/30 text-amber-200' : 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {(t.status === 'PASS' || t.passed) ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : t.status === 'SKIPPED' ? (
                            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                          )}
                          <div>
                            <span className="font-medium text-white block">{t.name}</span>
                            {t.error && (
                              <span className="text-[11px] text-rose-300 block mt-0.5">
                                Xatolik: {t.error}
                              </span>
                            )}
                            {t.issue && (
                              <div className="text-[10px] mt-1 space-y-0.5 text-slate-300">
                                <div><b>Root cause:</b> {t.issue.rootCause}</div>
                                {t.issue.path && <div><b>Path:</b> <code>{t.issue.path}</code></div>}
                                {t.issue.expected && <div><b>Expected:</b> {t.issue.expected}</div>}
                                {t.issue.received && <div><b>Received:</b> {t.issue.received}</div>}
                                {t.issue.fixExample && <div className="text-amber-300"><b>Maslahat:</b> {t.issue.fixExample}</div>}
                                {t.issue.docsUrl && <button type="button" onClick={() => openDocModal('spec-v1')} className="text-indigo-400 hover:text-indigo-300">Kontraktni ochish →</button>}
                              </div>
                            )}
                            {t.blockedBy?.length > 0 && <span className="text-[10px] text-amber-300 block mt-1">Avval tuzating: {t.blockedBy.join(', ')}</span>}
                            {!(t.status === 'PASS' || t.passed) && t.status !== 'SKIPPED' && (
                              <button
                                type="button"
                                onClick={() => handleCopyCertificationFix(t, idx)}
                                className="mt-2 px-2.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[10px] font-semibold flex items-center gap-1.5"
                              >
                                {copiedCertificationFix === idx ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                {copiedCertificationFix === idx ? 'Tuzatish nusxalandi' : 'AI uchun canonical tuzatish nusxalash'}
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 sm:self-center">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[10px]">
                            {t.capability}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              (t.status === 'PASS' || t.passed)
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : t.status === 'SKIPPED' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {t.status || (t.passed ? 'PASS' : 'FAIL')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Trigger Card if not yet run or needs rerun */}
          <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 flex items-center justify-between flex-wrap gap-3">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Avtomatlashtirilgan test tekshiruvi
              </span>
              <p className="text-[11px] text-slate-300">
                Tugmani bosish orqali barcha endpointlar muvofiqligini tekshiring.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRunCertification}
                disabled={certLoading}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/30 flex items-center gap-1.5"
              >
                {certLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                <span>{certLoading ? 'Tekshirilmoqda…' : certReport ? 'Testlarni qayta ishga tushirish' : 'Sertifikatlash testlarini ishga tushirish'}</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Ortga (API sozlamalari)
            </button>
            <button
              type="button"
              onClick={() => {
                if (!registeredProviderSlug) {
                  setError('Iltimos, avval 2-qadamda API sozlamalarini saqlang.');
                  setCurrentStep(2);
                  return;
                }
                setCurrentStep(4);
              }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-6 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
            >
              Davom etish (Xulosa va Ko‘rib chiqish) <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* STEP 4: Review, Handoff & Dashboard Navigation                        */}
      {/* --------------------------------------------------------------------- */}
      {currentStep === 4 && (
        <div className="space-y-6 animate-fadeIn">
          {!registeredProviderSlug ? (
            <div className="p-8 rounded-3xl bg-amber-950/20 border border-amber-500/30 text-center space-y-4 max-w-lg mx-auto animate-fadeIn">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">Arizangiz hali topshirilmagan</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Ko‘rib chiqish bosqichiga o‘tish uchun avval 2-qadamda Provider Slug va API Base URL sozlamalarini saqlang.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition flex items-center gap-2 mx-auto"
              >
                2-qadamga o‘tish (API sozlamalari) <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <div className="text-center space-y-2 max-w-lg mx-auto">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30 shadow-lg shadow-emerald-950/50">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-white">{createdCredentials ? 'Kalitlaringiz tayyor' : 'Arizangiz saqlandi'}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {createdCredentials
                    ? 'Quyidagi maxfiy qiymatlarni hozir saqlang. Sahifani yopgandan keyin ularni qayta ochib bo‘lmaydi.'
                    : 'Integratsiyangiz saqlangan. Maxfiy kalitlar xavfsizlik uchun qayta ko‘rsatilmaydi.'}
                </p>
              </div>

              {/* Credential handoff: raw values are rendered only from a fresh issue/rotation response. */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-amber-400" /> Dasturchi uchun Zayuno kalitlari
                  </span>
                  {createdCredentials && <span className="text-[10px] font-mono bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded border border-amber-500/20">Faqat bir marta</span>}
                </div>

                <div className="space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-400">Provider Slug:</span>
                    <span className="text-indigo-300 font-bold">{registeredProviderSlug}</span>
                  </div>

                  {createdCredentials?.sandboxApiKey && (
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                      <div className="truncate pr-2">
                        <span className="text-slate-400 block text-[10px]">Zayuno Developer API Key:</span>
                        <span className="text-white text-xs select-all">{createdCredentials.sandboxApiKey}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(createdCredentials.sandboxApiKey!, 'key')}
                        className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                        aria-label="Zayuno API key nusxalash"
                      >
                        {copiedField === 'key' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  )}

                  {requiresWebhookSigning && createdCredentials?.sandboxWebhookSecret && (
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                      <div className="truncate pr-2">
                        <span className="text-slate-400 block text-[10px]">Webhook imzo kaliti:</span>
                        <span className="text-white text-xs select-all">{createdCredentials.sandboxWebhookSecret}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(createdCredentials.sandboxWebhookSecret!, 'sec')}
                        className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                        aria-label="Webhook imzo kalitini nusxalash"
                      >
                        {copiedField === 'sec' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  )}
                </div>

                {createdCredentials ? (
                  <button
                    type="button"
                    onClick={handleCopyCredentialSetup}
                    className="w-full mt-1 px-3 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition"
                  >
                    {copiedField === 'setup' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copiedField === 'setup' ? 'Sozlama nusxalandi' : 'Dasturchi uchun .env sozlamasini nusxalash'}
                  </button>
                ) : (
                  <div className="mt-1 rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-[11px] leading-5 text-slate-400">
                    Oldingi raw qiymatlar xavfsizlik uchun qayta ochilmaydi. Yangi developer API key yoki webhook imzo kalitini <strong className="text-slate-200">Biznesim → API sozlamalari va credentiallar</strong> bo‘limidan yarating. U yerda kalitning vazifasi va serverga qo‘yish qadami ham ko‘rsatiladi.
                  </div>
                )}
              </div>

              {/* Clear credential direction: the provider's own API secret and Zayuno credentials do different jobs. */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs space-y-2">
                <h4 className="font-semibold text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> Dasturchi buni qanday ishlatadi?
                </h4>
                <div className="space-y-2 text-[11px] text-slate-300 leading-relaxed">
                  <p><strong>1. Zayuno → sizning API’ingiz:</strong> 2-qadamda kiritilgan <code className="text-sky-300 font-mono">Provider API key</code> serveringizning <code className="text-sky-300 font-mono">.env</code> faylida turadi. <code className="text-sky-300 font-mono">/health</code>, <code className="text-sky-300 font-mono">/catalog</code> va buyurtma endpointlari kelgan <code className="text-sky-300 font-mono">x-provider-api-key</code> headerini shu qiymat bilan tekshiradi.</p>
                  <p><strong>2. Sizning serveringiz → Zayuno:</strong> yuqoridagi <code className="text-indigo-300 font-mono">ZAYUNO_API_KEY</code> faqat Zayuno REST API chaqiruvlari uchun ishlatiladi. Uni o‘z endpointlaringizni himoyalash uchun ishlatmang.</p>
                  {requiresWebhookSigning && <p><strong>3. Buyurtma statusi:</strong> event JSON’ining raw body’sini <code className="text-indigo-300 font-mono">ZAYUNO_WEBHOOK_SECRET</code> bilan HMAC-SHA256 imzolang, keyin <code className="break-all text-indigo-300 font-mono">POST {publicApiBase.replace(/\/$/, '')}/api/v1/webhooks/{registeredProviderSlug}</code> ga <code className="text-indigo-300 font-mono">x-zayuno-signature</code> headeri bilan yuboring.</p>}
                  <p className="text-amber-400"><strong>Xavfsizlik:</strong> bu qiymatlarni faqat backend <code className="font-mono">.env</code> fayliga saqlang. Frontend, Git, URL yoki AI chatga yubormang.</p>
                </div>
              </div>

              {/* Timeline & Next Steps */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs space-y-2">
                <h4 className="font-semibold text-white flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-sky-400" /> Keyingi qadamlar va Ko‘rib chiqish muddati
                </h4>
                <ul className="space-y-1.5 text-slate-400 list-disc list-inside">
                  <li>API adapteringizni Zayuno kontraktiga moslab yozing yoki AI Kit yordamida generatsiya qiling.</li>
                  <li>Sertifikatlash testlaridan muvaffaqiyatli o‘ting.</li>
                  <li>Arizani ko‘rib chiqishga (Review) topshiring (1-2 ish kuni ichida tasdiqlanadi).</li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSubmitReview}
                  disabled={submittingReview}
                  className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs px-6 py-3 rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
                >
                  {submittingReview ? 'Yuborilmoqda...' : 'Review’ga yuborish va Dashboardga o‘tish'} <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateTab('sandbox')}
                  className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-slate-200 font-medium text-xs px-5 py-3 rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-2"
                >
                  Sandbox Simulatorda sinash
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {showHealthReport && urlCheckResult.status !== 'idle' && createPortal(
        <div
          className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-slate-950/85 p-3 backdrop-blur-md animate-fadeIn sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="health-report-title"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setShowHealthReport(false);
          }}
        >
          <div className="my-auto flex w-full max-w-3xl max-h-[88vh] flex-col overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl animate-scaleUp">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/90 px-5 py-4 backdrop-blur">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-indigo-300">Live connection report</p>
                <h3 id="health-report-title" className="mt-1 text-base font-bold text-white">{urlCheckResult.guidance?.title || 'API diagnostikasi'}</h3>
              </div>
              <button type="button" onClick={() => setShowHealthReport(false)} className="rounded-xl bg-slate-800 p-2 text-slate-400 hover:bg-slate-700 hover:text-white transition" aria-label="Diagnostikani yopish"><X className="w-4 h-4" /></button>
            </div>
            <div className="min-h-0 overflow-y-auto space-y-4 p-5 text-xs text-slate-300">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3"><span className="text-[10px] uppercase tracking-wider text-slate-500">Natija kodi</span><strong className="mt-1 block font-mono text-sm text-white">{urlCheckResult.code || '—'}</strong></div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3"><span className="text-[10px] uppercase tracking-wider text-slate-500">HTTP</span><strong className="mt-1 block font-mono text-sm text-white">{urlCheckResult.statusCode ?? '—'}</strong></div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3"><span className="text-[10px] uppercase tracking-wider text-slate-500">Latency</span><strong className="mt-1 block font-mono text-sm text-white">{urlCheckResult.latencyMs !== undefined ? `${urlCheckResult.latencyMs} ms` : '—'}</strong></div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3"><span className="text-[10px] uppercase tracking-wider text-slate-500">Zayuno tekshirgan manzil</span><code className="mt-1.5 block break-all text-sky-200">{urlCheckResult.checkedUrl || '—'}</code></div>
              <div className="rounded-xl border border-amber-500/25 bg-amber-950/15 p-4 space-y-2"><h4 className="font-semibold text-amber-100">Sabab va tuzatish</h4><p>{urlCheckResult.guidance?.cause || urlCheckResult.message}</p><ol className="space-y-1 list-decimal list-inside text-slate-200">{urlCheckResult.guidance?.steps.map(step => <li key={step}>{step}</li>)}</ol></div>
              <div className="rounded-xl border border-indigo-500/25 bg-indigo-950/20 p-4"><h4 className="font-semibold text-indigo-100">Contract kutayotgan javob</h4><p className="mt-1.5 text-slate-300">{urlCheckResult.guidance?.expected}</p><pre className="mt-3 overflow-x-auto rounded-lg border border-slate-700 bg-slate-950 p-3 font-mono text-[11px] leading-relaxed text-sky-200">HTTP 200\nContent-Type: application/json\n{HEALTH_RESPONSE_EXAMPLE}</pre></div>
              <div className="flex flex-wrap justify-end gap-2 pt-1">
                <button type="button" onClick={() => { setShowHealthReport(false); openDocModal('base-url'); }} className="rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition">Health qo‘llanmasi</button>
                {urlCheckResult.status !== 'success' && <button type="button" onClick={handleCopyHealthFixBrief} className="rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-500 transition">{copiedHealthFix ? 'Brief nusxalandi!' : 'AI fix brief nusxalash'}</button>}
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* --------------------------------------------------------------------- */}
      {/* IN-WIZARD DOCS DRAWER / MODAL (Never lose form context)               */}
      {/* --------------------------------------------------------------------- */}
      {activeDocsDrawer && createPortal(
        <div
          className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-slate-950/80 p-3 backdrop-blur-md animate-fadeIn sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="docs-drawer-title"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setActiveDocsDrawer(null);
          }}
        >
          <div className="my-auto flex w-full max-w-4xl max-h-[88vh] flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl animate-scaleUp">
            {/* Drawer Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
              <div className="flex items-center gap-2.5">
                <Globe className="w-5 h-5 text-indigo-400" />
                <h3 id="docs-drawer-title" className="font-bold text-white text-sm sm:text-base">Zayuno Documentation & Kontraktlar</h3>
              </div>
              <div className="flex items-center gap-2">
                {onOpenDoc && (
                  <button
                    type="button"
                    onClick={() => {
                      const target = activeDocsDrawer;
                      setActiveDocsDrawer(null);
                      onOpenDoc(target);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> To‘liq sahifada ochish
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveDocsDrawer(null)}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                  aria-label="Yopish"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 text-xs text-slate-300">
              <DocsViewer
                selectedDoc={activeDocsDrawer}
                onSelectDoc={(id) => setActiveDocsDrawer(id)}
                onOpenAiKit={() => {
                  setActiveDocsDrawer(null);
                  onOpenAiKit();
                }}
              />
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
};
