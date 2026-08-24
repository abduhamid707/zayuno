import React, { useState, useEffect } from 'react';
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
import { DocsViewer } from './DocsViewer';
import {
  getProviderProtocolEndpoints,
  PROVIDER_CONTRACT_VERSION,
  ZAYUNO_WEBHOOK_INGESTION_PATH
} from '@zayuno/contracts';

const DRAFT_STORAGE_KEY = 'zayuno_onboarding_draft';

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

interface OnboardingWizardProps {
  apiBase: string;
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
    <span className="relative inline-flex items-center ml-1.5 align-middle">
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(!open); }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="text-slate-400 hover:text-indigo-400 p-0.5 rounded-full transition-colors focus:outline-none"
        aria-label="Qo‘shimcha ma’lumot"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>
      {open && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-950 border border-slate-700 text-[11px] text-slate-300 rounded-xl shadow-2xl z-50 animate-fadeIn pointer-events-auto leading-relaxed text-left normal-case font-normal block">
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
      )}
    </span>
  );
};

const CATEGORIES = [
  { id: 'general_services', label: 'Umumiy xizmatlar (General Services)', desc: 'Konsultatsiya, maishiy va professional xizmatlar' },
  { id: 'food_delivery', label: 'Taom yetkazib berish (Food Delivery)', desc: 'Restoranlar, kafelar va tayyor ovqatlar' },
  { id: 'logistics', label: 'Kuryer va logistika (Logistics)', desc: 'Yuk tashish, shahar ichida yetkazish va posilka' },
  { id: 'retail', label: 'Savdo va do‘konlar (Commerce & Retail)', desc: 'Mahsulotlar, kiyim-kechak, elektronika va buyumlar' },
  { id: 'bookings', label: 'Xizmatlarni bron qilish (Bookings)', desc: 'Salonlar, tibbiyot, sport va band qilish xizmatlari' },
  { id: 'railway_tickets', label: 'Chiptalar va transport (Ticketing)', desc: 'Poyezd, avtobus va tadbirlar chiptalari' },
  { id: 'digital', label: 'Raqamli xizmatlar (Digital Services)', desc: 'Obunalar, dasturiy ta’minot va raqamli tovarlar' }
];

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  apiBase,
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
  // Read deep-link parameters from URL if present (?tab=onboarding&step=5&provider=my-slug)
  const getInitialParams = () => {
    if (typeof window === 'undefined') return { step: null, provider: null };
    try {
      const url = new URL(window.location.href);
      const stepStr = url.searchParams.get('step');
      const stepVal = stepStr ? parseInt(stepStr, 10) : null;
      const prov = url.searchParams.get('provider');
      return {
        step: stepVal && stepVal >= 1 && stepVal <= 6 ? stepVal : null,
        provider: prov ? prov.trim().toLowerCase() : null
      };
    } catch {
      return { step: null, provider: null };
    }
  };
  const urlParams = getInitialParams();

  // Read saved draft from localStorage
  const loadSavedDraft = () => {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };
  const savedDraft = loadSavedDraft();

  // Current Step determination
  const [currentStep, setCurrentStep] = useState<number>(() => {
    if (urlParams.step) {
      if (token && urlParams.step < 3) return 3;
      return urlParams.step;
    }
    if (initialProvider?.slug) {
      return 5;
    }
    if (savedDraft?.currentStep && savedDraft.currentStep >= 1 && savedDraft.currentStep <= 6) {
      if (token && savedDraft.currentStep < 3) return 3;
      return savedDraft.currentStep;
    }
    if (token) return Math.max(3, initialStep);
    return initialStep;
  });

  // Step 1: Account Creation
  const [fullName, setFullName] = useState(savedDraft?.fullName || '');
  const [email, setEmail] = useState(initialEmail || savedDraft?.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Step 2: Email Verification
  const [verifyToken, setVerifyToken] = useState(initialVerifyToken);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Step 3: Business Profile
  const [businessName, setBusinessName] = useState(initialProvider?.name || savedDraft?.businessName || '');
  const [category, setCategory] = useState(initialProvider?.metadata?.category || savedDraft?.category || 'general_services');
  const [description, setDescription] = useState(initialProvider?.metadata?.description || savedDraft?.description || '');
  const [supportPhone, setSupportPhone] = useState(initialProvider?.config?.supportContact?.phone || savedDraft?.supportPhone || '');
  const [supportTelegram, setSupportTelegram] = useState(initialProvider?.config?.supportContact?.telegram || savedDraft?.supportTelegram || '');
  const [supportEmail, setSupportEmail] = useState(initialProvider?.config?.supportContact?.email || savedDraft?.supportEmail || '');

  // Step 4: Integration Details
  const [slug, setSlug] = useState(urlParams.provider || initialProvider?.slug || savedDraft?.slug || '');
  const [baseUrl, setBaseUrl] = useState(initialProvider?.baseUrl || savedDraft?.baseUrl || '');
  const [apiSecret, setApiSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [hasSavedSecret, setHasSavedSecret] = useState(Boolean(savedDraft?.hasSavedSecret || initialProvider?.id));
  const [showSecretInput, setShowSecretInput] = useState(false);
  const [authMethod, setAuthMethod] = useState<'API_KEY' | 'BEARER_TOKEN' | 'HMAC_SIGNATURE'>(
    initialProvider?.config?.authMethod || savedDraft?.authMethod || 'API_KEY'
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
    status: 'idle' | 'success' | 'https_required' | 'not_found' | 'error';
    message: string;
  }>({ status: 'idle', message: '' });
  const [copiedBrief, setCopiedBrief] = useState(false);

  // In-Wizard Docs Modal/Drawer State (Prevents losing wizard context)
  const [activeDocsDrawer, setActiveDocsDrawer] = useState<string | null>(null);

  // Step 5: In-Wizard Certification Runner State
  const [certLoading, setCertLoading] = useState(false);
  const [certReport, setCertReport] = useState<any | null>(() => {
    return initialProvider?.metadata?.lastCertificationReport || null;
  });
  const [certError, setCertError] = useState<string | null>(null);

  // Step 6: Review & Credentials
  const [createdCredentials, setCreatedCredentials] = useState<{
    providerSlug: string;
    sandboxApiKey: string;
    sandboxWebhookSecret: string;
  } | null>(() => {
    if (initialProvider?.slug) {
      return {
        providerSlug: initialProvider.slug,
        sandboxApiKey: 'zy_test_sandbox_key',
        sandboxWebhookSecret: initialProvider.webhookSecret || ''
      };
    }
    return savedDraft?.createdCredentials || null;
  });
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [submittingReview, setSubmittingReview] = useState(false);

  // Status & Errors
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync deep-link parameters to browser URL: ?tab=onboarding&step=N&provider=slug
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('tab', 'onboarding');
    url.searchParams.set('step', String(currentStep));
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
        fullName,
        email,
        businessName,
        category,
        description,
        supportPhone,
        supportTelegram,
        supportEmail,
        slug,
        baseUrl,
        authMethod,
        capabilityProfile,
        currentStep,
        hasSavedSecret: hasSavedSecret || Boolean(apiSecret.trim()),
        createdCredentials
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch {}
  }, [
    fullName,
    email,
    businessName,
    category,
    description,
    supportPhone,
    supportTelegram,
    supportEmail,
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

  // If user is authenticated, skip Step 1 and Step 2 and navigate directly to Step 3 (Business Profile)
  useEffect(() => {
    if (token) {
      setCurrentStep(prev => (prev < 3 ? 3 : prev));
    }
  }, [token]);

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
    setSlug(autoSlug);
  };

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2500);
    } catch {}
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
        localStorage.setItem('zayuno_provider_token', verifyData.accessToken);
        localStorage.setItem('zayuno_provider_user', JSON.stringify(verifyData.user));
        onAuthSuccess(verifyData.accessToken, verifyData.user);
      } else if (password) {
        // Fallback: attempt login with password if verify didn't return token
        const loginRes = await fetch(`${apiBase}/api/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim().toLowerCase(), password })
        });
        const loginData = await loginRes.json();
        if (loginRes.ok && loginData.accessToken) {
          localStorage.setItem('zayuno_provider_token', loginData.accessToken);
          localStorage.setItem('zayuno_provider_user', JSON.stringify(loginData.user));
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
  // STEP 3: Business Details
  // --------------------------------------------------------------------------
  const handleBusinessStepNext = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!businessName.trim() || businessName.trim().length < 2) {
      setError('Iltimos, biznesingiz yoki xizmatingiz nomini kiriting.');
      return;
    }
    setCurrentStep(4);
  };

  // --------------------------------------------------------------------------
  // STEP 4 Helpers: Base URL health testing and AI Brief copy
  // --------------------------------------------------------------------------
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
          message: '⚠️ Xavfsizlik: Private IP yoki ichki tarmoq manzillarini tekshirib bo‘lmaydi. Haqiqiy public HTTPS domen kiriting.'
        });
        return;
      }
    } catch {
      setUrlCheckResult({
        status: 'error',
        message: 'Noto‘g‘ri URL formati kiritildi.'
      });
      return;
    }

    setTestingUrl(true);
    setUrlCheckResult({ status: 'idle', message: '' });

    try {
      const cleanUrl = raw.replace(/\/+$/, '');
      const token = localStorage.getItem('zayuno_provider_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE}/api/v1/providers/integration/check-url`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          baseUrl: cleanUrl,
          authMethod,
          apiSecret: rawSecret || undefined
        })
      });

      const data = await res.json();
      if (data.status === 'HEALTHY') {
        setUrlCheckResult({
          status: 'success',
          message: data.message || '✅ Ulanish muvaffaqiyatli! Server /health endpointida 200 OK qaytardi va HealthSchema talablariga to‘liq javob berdi.'
        });
      } else if (data.status === 'NOT_FOUND') {
        setUrlCheckResult({
          status: 'not_found',
          message: data.message || '❌ /health endpointi topilmadi (404 Not Found). Backend yo‘nalishini tekshiring.'
        });
      } else if (data.status === 'AUTH_REQUIRED') {
        setUrlCheckResult({
          status: 'warning',
          message: data.message || '⚠️ Serverga ulanish muvaffaqiyatli, ammo /health endpointi autentifikatsiya talab qilmoqda.'
        });
      } else if (data.status === 'SCHEMA_MISMATCH') {
        setUrlCheckResult({
          status: 'warning',
          message: data.message || '⚠️ Server /health da 200 OK qaytardi, ammo javob formati Zayuno HealthCheckResultSchema talablariga mos kelmadi.'
        });
      } else {
        setUrlCheckResult({
          status: 'error',
          message: data.message || '❌ Server javob bermadi yoki /health ga ulanish bloklandi.'
        });
      }
    } catch (err: any) {
      setUrlCheckResult({
        status: 'error',
        message: '❌ Server javob bermadi yoki tekshirish xizmati bilan ulanishda xatolik yuz berdi.'
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
Toifa: ${CATEGORIES.find(c => c.id === category)?.label || category}
Tanlangan rejim: ${isTrans ? 'Variant B — Topish va buyurtma berish (TRANSACTIONAL)' : 'Variant A — Faqat topish va ko‘rish (DISCOVERY)'}
Autentifikatsiya formati: ${authMethod} (${authMethod === 'API_KEY' ? 'X-API-KEY header: x-provider-api-key' : authMethod === 'BEARER_TOKEN' ? 'Authorization: Bearer token' : 'HMAC-SHA256 imzosi: x-zayuno-signature'})

--------------------------------------------------------------------------------
1. INTEGRATSIYA MAQSADI
--------------------------------------------------------------------------------
Zayuno AI agentlar (ChatGPT, Claude, autonomous workerlar) uchun neytral harakat platformasidir.
AI agentlar foydalanuvchi talabiga asosan sizning xizmatlaringizni topadi, kotirovka oladi va buyurtma yaratadi.

--------------------------------------------------------------------------------
2. TALAB ETILADIGAN CANONICAL API ENDPOINTLAR (HTTPS)
--------------------------------------------------------------------------------
${endpoints}

MUHIM:
- Katalog offeringlarida "providerId", "offeringCode", "title", "basePrice", "currency" va "isAvailable" maydonlari majburiydir.
- GET /offerings/:id bitta mahsulot tafsilotini aynan OfferingSchema formatida qaytarishi shart.
- Quote javobi "id" va itemized "lines" qaytaradi (formula: total == subtotal + totalFees - totalDiscount).
- Payment options capability ixtiyoriy; yoqilsa javob top-level JSON array bo‘ladi.
- Provider webhook endpoint ochmaydi. Status eventlarini Zayuno'ga POST ${ZAYUNO_WEBHOOK_INGESTION_PATH} orqali yuboradi.

--------------------------------------------------------------------------------
3. CREDENTIAL VA MAXFIYLIK QOIDALARI
--------------------------------------------------------------------------------
- Provider API key: Dasturchi o'zi yaratadi va o'z serverining environment variable'iga (.env) qo'yadi hamda Zayuno portalga bir marta kiritadi.
- Webhook secret: Zayuno handoff orqali taqdim etadi va serverning .env fayliga saqlanadi.
- Maxfiylik talabi: Ikkala secret ham faqat server-side muhitda (.env) saqlanadi. Git, frontend JS bundle, brauzer, chat yoki public loglarga HECH QACHON yozilmaydi.
- To'lov chegarasi: Zayuno hech qachon to'lov kartalari ma'lumotlarini qabul qilmaydi. To'lov providerning o'z checkout havolasi (NextAction) orqali amalga oshiriladi.

--------------------------------------------------------------------------------
4. QO'LLANMALAR VA AVTOMATIK TEST
--------------------------------------------------------------------------------
- Base URL va Endpointlar qo'llanmasi: https://developers.zayuno.uz/?tab=docs&doc=base-url
- Autentifikatsiya va Kalitlar qo'llanmasi: https://developers.zayuno.uz/?tab=docs&doc=auth
- Avtomatlashtirilgan sertifikatlash testi: https://developers.zayuno.uz/?tab=certification
- OpenAPI 3.1 va Postman Collection: https://developers.zayuno.uz/?tab=docs&doc=openapi
`;

    navigator.clipboard.writeText(brief);
    setCopiedBrief(true);
    setTimeout(() => setCopiedBrief(false), 3000);
  };

  // --------------------------------------------------------------------------
  // STEP 4: Integration Submission (Register Provider)
  // --------------------------------------------------------------------------
  const handleRegisterProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

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
      const authToken = token || localStorage.getItem('zayuno_provider_token');
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
          slug: cleanSlug,
          description: description.trim() || undefined,
          type: 'SERVICES',
          category: category,
          geography: ['UZ'],
          baseUrl: baseUrl.trim() || undefined,
          apiSecret: (!isSandbox && apiSecret.trim()) ? apiSecret.trim() : undefined,
          authMethod: authMethod,
          capabilities: capabilities,
          supportContact: {
            phone: supportPhone.trim() || undefined,
            telegram: supportTelegram.trim() || undefined,
            email: supportEmail.trim() || email.trim() || undefined
          }
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || 'Provider arizasini yaratishda xatolik yuz berdi.');
      }

      if (data.credentials) {
        setCreatedCredentials(data.credentials);
      } else {
        // Fetch newly created sandbox credentials
        try {
          const credsRes = await fetch(`${apiBase}/api/v1/providers/${cleanSlug}/credentials`, {
            headers: { Authorization: `Bearer ${authToken}` }
          });
          if (credsRes.ok) {
            const credsData = await credsRes.json();
            setCreatedCredentials(credsData);
          }
        } catch {}
      }

      onProviderCreated(data);
      setHasSavedSecret(true);
      setApiSecret('');
      setShowSecretInput(false);
      setSuccessMsg('Provider DRAFT arizasi saqlandi! Endi 5-qadamda sertifikatlash testlarini bajaring.');
      setCurrentStep(5);
    } catch (err: any) {
      setError(err.message || 'Arizani yaratishda xatolik yuz berdi.');
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // STEP 5: In-Wizard Certification Runner
  // --------------------------------------------------------------------------
  const handleRunCertification = async () => {
    const targetSlug = slug.trim() || createdCredentials?.providerSlug;
    if (!targetSlug) {
      setCertError('Provider topilmadi. Iltimos, 4-qadamda arizani saqlang.');
      return;
    }

    setCertLoading(true);
    setCertError(null);
    setSuccessMsg(null);
    try {
      const authToken = token || localStorage.getItem('zayuno_provider_token');
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
      if (data.isCertified || data.isProductionReady) {
        setSuccessMsg('Barcha mandatory sertifikatlash testlari muvaffaqiyatli o‘tdi!');
      }
    } catch (err: any) {
      setCertError(err.message || 'Certificationni ishga tushirishda xatolik yuz berdi.');
    } finally {
      setCertLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // STEP 6: Submit for Review
  // --------------------------------------------------------------------------
  const handleSubmitReview = async () => {
    const targetSlug = slug.trim() || createdCredentials?.providerSlug;
    if (!targetSlug) return;
    setSubmittingReview(true);
    setError(null);
    try {
      const authToken = token || localStorage.getItem('zayuno_provider_token');
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

  const isStepAccessible = (stepNum: number): boolean => {
    if (stepNum <= currentStep) return true;
    if (stepNum === 1 || stepNum === 2) return true;
    if (stepNum === 3) return Boolean(token);
    if (stepNum === 4) return Boolean(token) && businessName.trim().length >= 2;
    if (stepNum === 5 || stepNum === 6) {
      return Boolean(token) && businessName.trim().length >= 2 && Boolean(createdCredentials);
    }
    return false;
  };

  const handleStepClick = (stepNum: number) => {
    setError(null);
    if (stepNum === currentStep) return;

    if (stepNum < currentStep) {
      setCurrentStep(stepNum);
      return;
    }

    if (stepNum >= 3 && !token) {
      setError('Iltimos, avval hisobingizga kiring yoki emailni tasdiqlang.');
      return;
    }

    if (stepNum >= 4 && (!businessName.trim() || businessName.trim().length < 2)) {
      setError('Iltimos, avval 3-qadamda biznes yoki xizmatingiz nomini kiriting.');
      setCurrentStep(3);
      return;
    }

    if (stepNum >= 5 && !createdCredentials) {
      setError('Iltimos, avval 4-qadamda API sozlamalarini to‘ldirib, arizani saqlang.');
      setCurrentStep(4);
      return;
    }

    if (isStepAccessible(stepNum)) {
      setCurrentStep(stepNum);
    }
  };

  const openDocModal = (docId: string) => {
    setActiveDocsDrawer(docId);
  };

  const stepsList = [
    { num: 1, title: 'Hisob', subtitle: 'Account' },
    { num: 2, title: 'Tasdiqlash', subtitle: 'Email' },
    { num: 3, title: 'Biznes', subtitle: 'Profile' },
    { num: 4, title: 'Integratsiya', subtitle: 'API & Slug' },
    { num: 5, title: 'Sertifikat', subtitle: 'Sandbox' },
    { num: 6, title: 'Ko‘rib chiqish', subtitle: 'Review' }
  ];

  return (
    <div className="max-w-4xl mx-auto my-8 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl animate-fadeIn space-y-8 relative">
      {/* Stepper Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-700 flex items-center justify-center text-xl font-bold text-white shadow-lg shadow-indigo-950/50">
              ⚡
            </div>
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
        <div className="grid grid-cols-6 gap-2">
          {stepsList.map(s => {
            const isCompleted = currentStep > s.num || (Boolean(token) && s.num <= 2) || (s.num === 3 && businessName.trim().length >= 2) || (s.num === 4 && Boolean(createdCredentials));
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
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-start gap-2.5 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">{successMsg}</div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* STEP 1: Account Creation                                              */}
      {/* --------------------------------------------------------------------- */}
      {currentStep === 1 && (
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
      {currentStep === 2 && (
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
      {currentStep === 3 && (
        <form onSubmit={handleBusinessStepNext} className="space-y-6 animate-fadeIn">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">3. Biznes va Xizmat Ma’lumotlari</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              AI agentlar foydalanuvchiga xizmatingizni to‘g‘ri tavsiya qilishi uchun asosiy ma’lumotlarni kiriting.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Kompaniya yoki Xizmat nomi *</label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={e => handleBusinessNameChange(e.target.value)}
                  placeholder="Masalan: Express Logistics, Coffee Time, Tez Taxi"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Xizmat Toifasi (Category) *</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                >
                  {CATEGORIES.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-medium">Xizmat haqida qisqacha tavsif (Description)</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
                placeholder="AI agentlar xizmatingiz qamrovi va imkoniyatlarini tushunishi uchun qisqa izoh (masalan: Toshkent shahrida 45 daqiqada taom yetkazib berish)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3">
              <h4 className="font-semibold text-white flex items-center gap-2">
                <Phone className="w-4 h-4 text-indigo-400" /> Mijozlarni qo‘llab-quvvatlash kontaktlari
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Telefon raqam</label>
                  <input
                    type="text"
                    value={supportPhone}
                    onChange={e => setSupportPhone(e.target.value)}
                    placeholder="+998712000000"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Telegram Support</label>
                  <input
                    type="text"
                    value={supportTelegram}
                    onChange={e => setSupportTelegram(e.target.value)}
                    placeholder="@business_support"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Support Email</label>
                  <input
                    type="email"
                    value={supportEmail}
                    onChange={e => setSupportEmail(e.target.value)}
                    placeholder="support@business.uz"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Ortga
            </button>
            <button
              type="submit"
              disabled={!businessName.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold px-6 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
            >
              Keyingi qadam (API sozlamalari) <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* STEP 4: Integration Details (Slug, API URL & Auth)                    */}
      {/* --------------------------------------------------------------------- */}
      {currentStep === 4 && (
        <form onSubmit={handleRegisterProvider} className="space-y-6 animate-fadeIn">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">4. API Integratsiya va Identifikator</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Zayuno protokoli orqali so‘rovlarni qabul qilish uchun API endpoint va autentifikatsiya usulini sozlang.
            </p>
          </div>

          <div className="space-y-5 text-xs">
            {/* Slug & Base URL Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 mb-1 font-medium items-center">
                  <span>Provider Slug (Noyob ID) *</span>
                  <InfoTooltip
                    text="AI agentlar va API so‘rovlarida biznesingizni topish uchun ishlatiladigan lotincha qisqa nom (masalan: my-coffee-shop)."
                    docId="getting-started"
                    onOpenDoc={openDocModal}
                  />
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="my-company-slug"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  AI so‘rovlarida identifikator: <span className="font-mono text-indigo-400">{slug || 'provider-slug'}</span>
                </span>
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
                    value={baseUrl}
                    onChange={e => {
                      setBaseUrl(e.target.value);
                      if (urlCheckResult.status !== 'idle') setUrlCheckResult({ status: 'idle', message: '' });
                    }}
                    placeholder="https://api.sizningbiznesingiz.uz/zayuno"
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                  />
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
                className={`p-3 rounded-xl text-xs flex items-start gap-2.5 animate-fadeIn ${
                  urlCheckResult.status === 'success'
                    ? 'bg-emerald-950/50 border border-emerald-500/40 text-emerald-300'
                    : urlCheckResult.status === 'https_required'
                    ? 'bg-amber-950/50 border border-amber-500/40 text-amber-300'
                    : 'bg-rose-950/50 border border-rose-500/40 text-rose-300'
                }`}
              >
                {urlCheckResult.status === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 leading-relaxed">{urlCheckResult.message}</div>
              </div>
            )}

            {/* Integration Brief Helper for Users without an API */}
            <div className="p-3.5 rounded-2xl bg-indigo-950/25 border border-indigo-500/30 flex items-center justify-between flex-wrap gap-3">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Bot className="w-4 h-4 text-amber-300" /> Hali API’ingiz yo‘qmi?
                </span>
                <p className="text-[11px] text-slate-300">
                  Dasturchingizga yoki AI vositalariga (Cursor, ChatGPT) tayyor texnik topshiriq yuboring.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopyIntegrationBrief}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition shadow-md shadow-indigo-600/30 flex items-center gap-1.5 shrink-0"
              >
                {copiedBrief ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedBrief ? 'Brief nusxalandi!' : 'AI uchun integration brief nusxalash'}</span>
              </button>
            </div>

            {/* Question: Mijoz Zayuno orqali nima qila olsin? */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="block text-white font-bold text-sm">
                  Mijoz Zayuno orqali nima qila olsin? *
                </label>
                <button
                  type="button"
                  onClick={() => openDocModal('base-url')}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                >
                  Qo‘llanma va kontraktlar →
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* Variant A: Faqat topish va ko'rish */}
                <div
                  onClick={() => setCapabilityProfile('readonly')}
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
                      onClick={(e) => { e.stopPropagation(); openDocModal('base-url'); }}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold"
                    >
                      Batafsil ko‘rish →
                    </button>
                  </div>
                </div>

                {/* Variant B: Topish va buyurtma berish */}
                <div
                  onClick={() => setCapabilityProfile('transactional')}
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
                      onClick={(e) => { e.stopPropagation(); openDocModal('base-url'); }}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold"
                    >
                      Batafsil ko‘rish →
                    </button>
                  </div>
                </div>
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
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                        <span className="font-mono text-slate-200">GET /locations</span>
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

              {/* Credential Inputs for Real External APIs */}
              {!isOfficialSandboxUrl(baseUrl) && (
                <div className="space-y-3 pt-1 animate-fadeIn">
                  {hasSavedSecret && !showSecretInput && !apiSecret ? (
                    <div className="p-4 rounded-2xl bg-slate-950/80 border border-emerald-500/30 flex items-center justify-between animate-fadeIn">
                      <div className="flex items-center gap-2 text-xs text-emerald-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Credential saqlangan (Serverda xavfsiz shifrlangan)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowSecretInput(true)}
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-medium px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 transition"
                      >
                        Yangi kalit kiritish
                      </button>
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
                              value={apiSecret}
                              onChange={e => setApiSecret(e.target.value)}
                              placeholder="Dasturchingiz yaratgan API key’ni kiriting"
                              autoComplete="new-password"
                              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 pr-10 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                            />
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
                              value={apiSecret}
                              onChange={e => setApiSecret(e.target.value)}
                              placeholder="Bearer tokenni kiriting"
                              autoComplete="new-password"
                              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 pr-10 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                            />
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
                              value={apiSecret}
                              onChange={e => setApiSecret(e.target.value)}
                              placeholder="HMAC request signing secretni kiriting"
                              autoComplete="new-password"
                              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 pr-10 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                            />
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
                        Yangi arizada bu secretni o‘ylab topish yoki kiritish shart emas. Zayuno uni avtomatik generatsiya qiladi va 6-bosqichda (Xulosa va Handoff) sizga faqat bir marta xavfsiz taqdim etadi.
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
              onClick={() => setCurrentStep(3)}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Ortga
            </button>
            <button
              type="submit"
              disabled={loading || !slug.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold px-6 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
            >
              {loading ? 'Saqlanmoqda…' : 'Davom etish'} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* STEP 5: In-Wizard Interactive Certification Runner                    */}
      {/* --------------------------------------------------------------------- */}
      {currentStep === 5 && (
        <div className="space-y-6 animate-fadeIn">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">5. Sinov va Avtomatlashtirilgan Sertifikatlash</h3>
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
                  certReport.isCertified || certReport.isProductionReady
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  {certReport.isCertified || certReport.isProductionReady ? (
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
                      {certReport.isCertified || certReport.isProductionReady
                        ? 'Sertifikatlash muvaffaqiyatli yakunlandi!'
                        : 'Sertifikatlashda muammolar aniqlandi'}
                    </h4>
                    <p className="text-[11px] mt-0.5 opacity-90">
                      {certReport.isCertified || certReport.isProductionReady
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
                                {t.issue.docsUrl && <button type="button" onClick={() => openDocModal('spec-v1')} className="text-indigo-400 hover:text-indigo-300">Kontraktni ochish →</button>}
                              </div>
                            )}
                            {t.blockedBy?.length > 0 && <span className="text-[10px] text-amber-300 block mt-1">Avval tuzating: {t.blockedBy.join(', ')}</span>}
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
              onClick={() => setCurrentStep(4)}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Ortga (API sozlamalari)
            </button>
            <button
              type="button"
              onClick={() => {
                if (!createdCredentials) {
                  setError('Iltimos, avval 4-qadamda API sozlamalarini saqlang.');
                  setCurrentStep(4);
                  return;
                }
                setCurrentStep(6);
              }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-6 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
            >
              Davom etish (Xulosa va Ko‘rib chiqish) <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* STEP 6: Review, Handoff & Dashboard Navigation                        */}
      {/* --------------------------------------------------------------------- */}
      {currentStep === 6 && (
        <div className="space-y-6 animate-fadeIn">
          {!createdCredentials ? (
            <div className="p-8 rounded-3xl bg-amber-950/20 border border-amber-500/30 text-center space-y-4 max-w-lg mx-auto animate-fadeIn">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">Arizangiz hali topshirilmagan</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Ko‘rib chiqish bosqichiga o‘tish uchun avval 4-qadamda Provider Slug va API Base URL sozlamalarini saqlang.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition flex items-center gap-2 mx-auto"
              >
                4-qadamga o‘tish (API sozlamalari) <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <div className="text-center space-y-2 max-w-lg mx-auto">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30 shadow-lg shadow-emerald-950/50">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-white">Arizangiz tayyor va saqlandi!</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Provider arizangiz yaratildi. Quyida sizning sandbox integratsiya kalitlaringiz berilgan.
                </p>
              </div>

              {/* Credentials Box */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-amber-400" /> Sandbox Credentiallari
                  </span>
                  <span className="text-[10px] font-mono bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded border border-amber-500/20">
                    Bir marta ko‘rsatiladi
                  </span>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-400">Provider Slug:</span>
                    <span className="text-indigo-300 font-bold">{createdCredentials.providerSlug}</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="truncate pr-2">
                      <span className="text-slate-400 block text-[10px]">Sandbox API Key:</span>
                      <span className="text-white text-xs">{createdCredentials.sandboxApiKey}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(createdCredentials.sandboxApiKey, 'key')}
                      className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                    >
                      {copiedField === 'key' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="truncate pr-2">
                      <span className="text-slate-400 block text-[10px]">Sandbox Webhook Secret:</span>
                      <span className="text-white text-xs">{createdCredentials.sandboxWebhookSecret}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(createdCredentials.sandboxWebhookSecret, 'sec')}
                      className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                    >
                      {copiedField === 'sec' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Credential Usage Guidance */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs space-y-2">
                <h4 className="font-semibold text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> Credentiallardan foydalanish va xavfsizlik:
                </h4>
                <div className="space-y-1.5 text-[11px] text-slate-300">
                  <p><strong>1. Provider API key:</strong> Dasturchi serveringizning <code className="text-sky-300 font-mono">.env</code> muhitiga joylaydi va Zayunodan kelgan <code className="text-sky-300 font-mono">x-provider-api-key</code> headerini tekshiradi.</p>
                  <p><strong>2. Webhook HMAC secret:</strong> Serveringiz Zayunoga buyurtma holati yangilanishini yuborganda payloadni HMAC-SHA256 bilan imzolash uchun ishlatiladi.</p>
                  <p className="text-amber-400"><strong>3. Xavfsizlik:</strong> Hech qachon ushbu kalitlarni chat, frontend JS bundle, URL parametri yoki Git repozitoriyaga joylamang.</p>
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

      {/* --------------------------------------------------------------------- */}
      {/* IN-WIZARD DOCS DRAWER / MODAL (Never lose form context)               */}
      {/* --------------------------------------------------------------------- */}
      {activeDocsDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-scaleUp">
            {/* Drawer Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
              <div className="flex items-center gap-2.5">
                <Globe className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-white text-sm sm:text-base">Zayuno Documentation & Kontraktlar</h3>
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
                onOpenAiKit={onOpenAiKit}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
