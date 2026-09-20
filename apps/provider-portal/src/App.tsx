import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { WorkspaceShell } from './WorkspaceShell';
import { WorkspaceOverview } from './WorkspaceOverview';
import { getIntegrationState, WorkspaceTab } from './workspace-model';
import { DOCS_MENU, normalizeDocId } from './docs-catalog';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Code2,
  Terminal,
  ShieldCheck,
  Zap,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  BookOpen,
  LayoutDashboard,
  Cpu,
  Layers,
  Key,
  Webhook,
  Search,
  Copy,
  Check,
  ArrowRight,
  RefreshCw,
  Sliders,
  DollarSign,
  Send,
  Lock,
  Globe,
  Radio,
  User,
  LogOut,
  Mail,
  HelpCircle,
  AlertTriangle,
  AlertCircle,
  Building2,
  Phone,
  MessageCircle,
  CheckSquare,
  Activity,
  Eye,
  Sparkles,
  FileText
} from 'lucide-react';
import { ProtectedGate } from './ProtectedGate';
import { ProviderEmptyState } from './ProviderEmptyState';
import { providerProfileQuery } from './provider-profile-query';
import { createProviderSessionClient } from './provider-session';
import { SandboxSimulator } from './SandboxSimulator';
import { CertificationView } from './CertificationView';
import { RequestInspector } from './RequestInspector';
import { generateUniversalAiPrompt } from './ai-integration-kit';
import {
  ProviderFulfillmentMode,
  ProviderType,
  requiresActiveLocations
} from '@zayuno/contracts';

const DocsViewer = lazy(() => import('./DocsViewer').then(module => ({ default: module.DocsViewer })));
const OnboardingWizard = lazy(() => import('./OnboardingWizard').then(module => ({ default: module.OnboardingWizard })));
const AuthView = lazy(() => import('./AuthView').then(module => ({ default: module.AuthView })));

const PUBLIC_API_BASE =
  (import.meta as any).env?.VITE_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname.includes('zayuno.uz')
    ? 'https://api.zayuno.uz'
    : 'http://localhost:4000');
const API_BASE = (import.meta as any).env?.VITE_USE_DEV_API_PROXY ? '' : PUBLIC_API_BASE;
const providerSession = createProviderSessionClient(API_BASE);
const SHOW_LOCAL_SIMULATOR = (import.meta as any).env?.VITE_ENABLE_LOCAL_SIMULATOR === 'true' || true;

const SANDBOX_PROVIDER_SLUG = 'sandbox-provider';
const PROTECTED_PROVIDER_TABS = new Set<WorkspaceTab>(['apps', 'sandbox', 'certification', 'inspector', 'onboarding']);

const PROVIDER_CAPABILITIES = [
  'METADATA', 'HEALTH', 'LOCATIONS', 'CATALOG', 'SEARCH', 'QUOTE',
  'ACTION_CREATE', 'ACTION_STATUS', 'ACTION_CANCEL', 'PAYMENT_OPTIONS', 'WEBHOOK'
];
const READONLY_CAPABILITIES = ['METADATA', 'HEALTH', 'CATALOG'];
const TRANSACTIONAL_MANDATORY_CAPABILITIES = [
  'METADATA', 'HEALTH', 'CATALOG', 'QUOTE', 'ACTION_CREATE', 'ACTION_STATUS', 'WEBHOOK'
];
const MANDATORY_PROVIDER_CAPABILITIES = new Set(TRANSACTIONAL_MANDATORY_CAPABILITIES);

export default function App() {
  const [token, setToken] = useState('');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    providerSession.restore()
      .then(data => {
        if (cancelled || !data) return;
        setToken(data.accessToken);
        setUserProfile(data.user || null);
      })
      .catch(() => undefined)
      .finally(() => { if (!cancelled) setAuthReady(true); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const refresh = async () => {
      try {
        const data = await providerSession.refresh();
        if (cancelled) return;
        setToken(data?.accessToken || '');
        setUserProfile(data?.user || null);
      } catch {
        // A transient network error must not discard the current session.
      }
    };
    const timer = window.setInterval(refresh, 10 * 60 * 1000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [token]);

  // Auth form state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'signup' | 'verify'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [verifyTokenInput, setVerifyTokenInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Active Tab & Deep-link sync
  const [activeTab, setActiveTab] = useState<'overview' | 'docs' | 'apps' | 'sandbox' | 'certification' | 'inspector' | 'onboarding' | 'auth'>(() => {
    if (typeof window === 'undefined') return 'overview';
    const params = new URLSearchParams(window.location.search);
    if (params.has('doc')) return 'docs';
    if (params.has('token') || params.has('verifyToken')) return 'onboarding';
    const tabParam = params.get('tab');
    if (tabParam === 'docs' || tabParam === 'apps' || tabParam === 'sandbox' || tabParam === 'certification' || tabParam === 'inspector' || tabParam === 'onboarding' || tabParam === 'auth' || tabParam === 'login') {
      return (tabParam === 'login' ? 'auth' : tabParam) as any;
    }
    return 'overview';
  });
  const [authScreenMode, setAuthScreenMode] = useState<'login' | 'signup'>(() => {
    if (typeof window === 'undefined') return 'login';
    return new URLSearchParams(window.location.search).get('mode') === 'signup' ? 'signup' : 'login';
  });

  const [initialOnboardingStep, setInitialOnboardingStep] = useState<number>(() => {
    if (typeof window === 'undefined') return 1;
    const params = new URLSearchParams(window.location.search);
    if (params.has('token') || params.has('verifyToken')) return 2;
    if (params.has('step')) return parseInt(params.get('step')!, 10) || 1;
    return 1;
  });

  const [initialEmailParam, setInitialEmailParam] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    const params = new URLSearchParams(window.location.search);
    return params.get('email') || '';
  });

  const [initialVerifyTokenParam, setInitialVerifyTokenParam] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    const params = new URLSearchParams(window.location.search);
    return params.get('token') || params.get('verifyToken') || '';
  });

  const [selectedDoc, setSelectedDoc] = useState<string>(() => {
    if (typeof window === 'undefined') return 'getting-started';
    return normalizeDocId(new URLSearchParams(window.location.search).get('doc') || 'getting-started', window.location.hash);
  });

  const routeKey = useRef<string | null>(null);
  useEffect(() => {
    const onBack = () => {
      const params = new URLSearchParams(window.location.search);
      const doc = normalizeDocId(params.get('doc') || 'getting-started', window.location.hash);
      const rawTab = params.get('tab') || 'overview';
      const allowed: WorkspaceTab[] = ['overview', 'apps', 'docs', 'sandbox', 'certification', 'inspector', 'onboarding', 'auth'];
      const tab = params.has('doc') ? 'docs' : allowed.includes(rawTab as WorkspaceTab) ? rawTab as WorkspaceTab : rawTab === 'login' ? 'auth' : 'overview';
      routeKey.current = tab + ':' + doc;
      setSelectedDoc(doc);
      setAuthScreenMode(params.get('mode') === 'signup' ? 'signup' : 'login');
      setActiveTab(tab);
    };
    window.addEventListener('popstate', onBack);
    return () => window.removeEventListener('popstate', onBack);
  }, []);

  const openAuthFor = (target: WorkspaceTab, mode: 'login' | 'signup' = target === 'onboarding' ? 'signup' : 'login') => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.search = '';
      url.searchParams.set('tab', 'auth');
      url.searchParams.set('returnTo', `/?tab=${target}`);
      url.searchParams.set('mode', mode);
      window.history.replaceState({}, '', url.toString());
    }
    setAuthScreenMode(mode);
    setActiveTab('auth');
  };

  const navigateTo = (tab: WorkspaceTab) => {
    if (tab === 'auth') {
      openAuthFor('apps', 'login');
      return;
    }
    if (authReady && !token && PROTECTED_PROVIDER_TABS.has(tab)) {
      openAuthFor(tab);
      return;
    }
    setActiveTab(tab);
  };

  // Protected provider routes enter the standalone auth screen. Keep a safe
  // internal destination so the user returns to the requested workspace page.
  useEffect(() => {
    if (!authReady || token || !PROTECTED_PROVIDER_TABS.has(activeTab)) return;
    openAuthFor(activeTab);
  }, [activeTab, authReady, token]);

  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Application Wizard state (for new provider owners)
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [wizardForm, setWizardForm] = useState({
    name: '',
    slug: '',
    type: 'SERVICES',
    category: 'general_services',
    baseUrl: '',
    authMethod: 'API_KEY',
    description: '',
    supportContact: {
      phone: '',
      telegram: '',
      email: '',
      workingHours: '',
      supportUrl: ''
    }
  });
  const [credentialsAcknowledged, setCredentialsAcknowledged] = useState(false);

  // Sandbox simulation state
  const [sandboxStep, setSandboxStep] = useState<number>(1);
  const [sandboxQuote, setSandboxQuote] = useState<any>(null);
  const [sandboxAction, setSandboxAction] = useState<any>(null);
  const [sandboxLoading, setSandboxLoading] = useState<boolean>(false);
  const [sandboxError, setSandboxError] = useState<string | null>(null);
  const [simulatorSessionToken, setSimulatorSessionToken] = useState<string | null>(null);

  const [createdCredentials, setCreatedCredentials] = useState<any>(null);
  const [selectedProviderActionId, setSelectedProviderActionId] = useState<string | null>(null);
  const [dashboardSection, setDashboardSection] = useState<'orders' | 'integration'>('orders');
  const [reviewEditMode, setReviewEditMode] = useState(false);
  const [advancedDeveloperSettingsOpen, setAdvancedDeveloperSettingsOpen] = useState(false);
  const [actionFilters, setActionFilters] = useState({
    query: '', status: 'ALL', paymentStatus: 'ALL', from: '', to: '', sort: 'newest'
  });
  const [integrationForm, setIntegrationForm] = useState({
    baseUrl: '',
    apiSecret: '',
    webhookSecret: '',
    authMethod: 'API_KEY',
    capabilities: [...PROVIDER_CAPABILITIES]
  });

  // AI Integration Kit Modal State
  const [aiKitOpen, setAiKitOpen] = useState(false);
  const [aiCopiedToast, setAiCopiedToast] = useState<string | null>(null);
  const [locale, setLocale] = useState<'uz' | 'en'>('uz');
  useEffect(() => {
    if (!aiKitOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>('[aria-labelledby="ai-kit-title"]');
    const focusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input, select, textarea, [tabindex="0"]') || []).filter(element => element.offsetParent !== null);
    focusable()[0]?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setAiKitOpen(false); }
      if (event.key === 'Tab') {
        const elements = focusable(), first = elements[0], last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    dialog?.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = overflow; dialog?.removeEventListener('keydown', onKey); previous?.focus(); };
  }, [aiKitOpen]);

  // Webhook Secret Rotation State
  const [rotatedSecretModal, setRotatedSecretModal] = useState<{
    isOpen: boolean;
    secret: string;
    loading: boolean;
    copied: boolean;
  }>({ isOpen: false, secret: '', loading: false, copied: false });
  const [issuedApiKeyModal, setIssuedApiKeyModal] = useState<{
    isOpen: boolean;
    apiKey: string;
    loading: boolean;
    copied: boolean;
  }>({ isOpen: false, apiKey: '', loading: false, copied: false });

  // URL Query Sync
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const emailInUrl = url.searchParams.get('email');
    if (emailInUrl) setInitialEmailParam(emailInUrl);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (activeTab === 'docs') {
      url.searchParams.set('doc', selectedDoc);
      url.searchParams.delete('tab');
    } else {
      url.searchParams.set('tab', activeTab);
      url.searchParams.delete('doc');
    }
    const key = activeTab + ':' + selectedDoc;
    if (routeKey.current !== null && routeKey.current !== key) {
      url.hash = '';
      window.history.pushState({}, '', url);
      window.scrollTo({ top: 0 });
    } else {
      window.history.replaceState({}, '', url);
    }
    routeKey.current = key;
    document.title = (activeTab === 'auth' ? (authScreenMode === 'signup' ? 'Provider hisobini yaratish' : 'Kirish') : activeTab === 'docs' ? DOCS_MENU.find(doc => doc.id === selectedDoc)?.title || 'Hujjatlar' : activeTab === 'apps' ? 'Biznesim' : 'Provider workspace') + ' · Zayuno Partners';
  }, [activeTab, authScreenMode, selectedDoc]);

  const apiFetch = async (path: string, init: RequestInit = {}) => {
    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, ...(init.headers || {}) }
    });
    if (!response.ok) {
      const err = await response.json().catch(() => null);
      throw new Error(err?.message || `Request failed (${response.status})`);
    }
    return response;
  };

  const handleRotateWebhookSecret = async () => {
    if (!provider) return;
    if (!window.confirm("Haqiqatan ham Webhook HMAC secretni yangilamoqchimisiz? Yangilangan zahoti eski secret bekor qilinadi va backend serveringizdagi ZAYUNO_WEBHOOK_SECRET qiymatini ham yangilashingiz kerak bo‘ladi.")) {
      return;
    }
    setRotatedSecretModal({ isOpen: true, secret: '', loading: true, copied: false });
    try {
      const res = await apiFetch(`/api/v1/providers/${encodeURIComponent(provider.slug)}/rotate-webhook-secret`, {
        method: 'POST'
      });
      const data = await res.json();
      setRotatedSecretModal({
        isOpen: true,
        secret: data.webhookSecret,
        loading: false,
        copied: false
      });
      refetchProvider();
    } catch (err: any) {
      setRotatedSecretModal({ isOpen: false, secret: '', loading: false, copied: false });
      alert(err?.message || 'Webhook secretni yangilashda xatolik yuz berdi');
    }
  };

  const handleCreateDeveloperApiKey = async () => {
    if (!provider) return;
    setIssuedApiKeyModal({ isOpen: true, apiKey: '', loading: true, copied: false });
    try {
      const res = await apiFetch('/api/v1/auth/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Provider developer key (${provider.slug})`,
          isLive: provider.status === 'ACTIVE'
        })
      });
      const data = await res.json();
      if (!data?.apiKey) throw new Error('Yangi Zayuno API key yaratilmadi.');
      setIssuedApiKeyModal({ isOpen: true, apiKey: data.apiKey, loading: false, copied: false });
    } catch (err: any) {
      setIssuedApiKeyModal({ isOpen: false, apiKey: '', loading: false, copied: false });
      alert(err?.message || 'Zayuno API key yaratilmadi.');
    }
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setAuthLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });
      const data = await response.json();
      if (!response.ok || !data.accessToken) {
        throw new Error(data.message || 'Kirishda xatolik yuz berdi.');
      }
      if (data.user) {
        setUserProfile(data.user);
      }
      setToken(data.accessToken);
      setAuthModalOpen(false);
    } catch (error: any) {
      setAuthError(error.message || 'Kirishda xatolik yuz berdi.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignup = async (event: React.FormEvent) => {
    event.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setAuthLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/v1/auth/register-owner`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fullName.trim(),
          email: email.trim(),
          password
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Ro‘yxatdan o‘tishda xatolik yuz berdi.');
      }
      setAuthSuccess(data.message || 'Tasdiqlash xati yuborildi. Iltimos, emailingizni tekshiring.');
      setAuthModalTab('verify');
    } catch (error: any) {
      setAuthError(error.message || 'Ro‘yxatdan o‘tishda xatolik.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyEmail = async (event: React.FormEvent) => {
    event.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setAuthLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/v1/auth/verify-email`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: verifyTokenInput.trim() })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Tasdiqlashda xatolik yuz berdi.');
      }
      // Auto-login if verify-email returns accessToken
      if (data.accessToken && data.user) {
        setToken(data.accessToken);
        setUserProfile(data.user);
        setAuthModalOpen(false);
        setAuthSuccess('Email tasdiqlandi va tizimga kirdingiz!');
      } else {
        setAuthSuccess('Email muvaffaqiyatli tasdiqlandi! Endi parolingiz bilan tizimga kirishingiz mumkin.');
        setAuthModalTab('login');
      }
    } catch (error: any) {
      setAuthError(error.message || 'Tasdiqlash kodi noto‘g‘ri yoki muddati o‘tgan.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      setAuthError('Emailingizni kiriting.');
      return;
    }
    setAuthError('');
    setAuthSuccess('');
    setAuthLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/v1/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });
      const data = await response.json();
      setAuthSuccess(data.message || 'Tasdiqlash xati qayta yuborildi.');
    } catch (error: any) {
      setAuthError(error.message || 'Qayta yuborishda xatolik.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    void fetch(`${API_BASE}/api/v1/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => undefined);
    setToken('');
    setUserProfile(null);
    setActiveTab('overview');
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const { data: providerData, isPending: providerLoading, isError: providerFailed, refetch: refetchProvider } = useQuery(
    providerProfileQuery(token, userProfile, apiFetch),
  );

  const handleProviderCreated = (created: { id?: string }) => {
    if (created.id && created.id !== userProfile?.providerId) {
      // Registration updates the database assignment before the JWT refresh.
      // Changing the query key loads the newly assigned business immediately.
      setUserProfile((current: any) => ({ ...current, providerId: created.id }));
    } else {
      void refetchProvider();
    }
  };

  const providerRequiresLocations = requiresActiveLocations(
    providerData?.type as ProviderType | undefined,
    (providerData?.fulfillmentMode || providerData?.metadata?.fulfillmentMode) as ProviderFulfillmentMode | undefined
  );
  const providerReviewStatus = String(providerData?.metadata?.reviewStatus || 'DRAFT');
  const isPendingReview = providerReviewStatus === 'PENDING_APPROVAL';
  const isProviderActive = providerData?.status === 'ACTIVE';
  const usesTransactionalFlow = integrationForm.capabilities.some(capability =>
    ['QUOTE', 'ACTION_CREATE', 'ACTION_STATUS', 'WEBHOOK'].includes(capability)
  );
  const dashboardProvider = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (providerData?.slug && dashboardProvider.current !== providerData.slug) {
      dashboardProvider.current = providerData.slug;
      setDashboardSection(providerData.status === 'ACTIVE' ? 'orders' : 'integration');
    }
  }, [providerData?.slug, providerData?.status]);
  useEffect(() => {
    if (!isPendingReview) setReviewEditMode(false);
  }, [isPendingReview]);
  useEffect(() => {
    if (activeTab === 'onboarding' && isPendingReview) setActiveTab('apps');
  }, [activeTab, isPendingReview]);
  const integrationState = getIntegrationState(!!token, providerData);

  const { data: providerDashboard, isFetching: dashboardFetching, isError: dashboardFailed, refetch: refetchDashboard } = useQuery({
    queryKey: ['provider-dashboard', token, actionFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(actionFilters).forEach(([key, value]) => {
        if (value && value !== 'ALL') params.set(key, value);
      });
      params.set('limit', '50');
      return (await apiFetch(`/api/v1/providers/me/dashboard?${params.toString()}`)).json();
    },
    enabled: !!token && !!providerData?.slug && isProviderActive
  });

  const { data: selectedProviderAction, isFetching: actionDetailLoading } = useQuery({
    queryKey: ['provider-action', token, selectedProviderActionId],
    queryFn: async () => (await apiFetch(`/api/v1/providers/me/actions/${encodeURIComponent(selectedProviderActionId!)}`)).json(),
    enabled: !!token && !!selectedProviderActionId
  });

  const [inspectorFilters, setInspectorFilters] = useState({ traceId: '', from: '', to: '' });
  const [selectedInspectorLog, setSelectedInspectorLog] = useState<any | null>(null);

  const { data: providerLogsData, isFetching: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ['provider-logs', token, providerData?.slug, inspectorFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (inspectorFilters.traceId) params.set('traceId', inspectorFilters.traceId);
      if (inspectorFilters.from) params.set('from', inspectorFilters.from);
      if (inspectorFilters.to) params.set('to', inspectorFilters.to);
      params.set('limit', '50');
      const res = await apiFetch(`/api/v1/providers/${encodeURIComponent(providerData.slug)}/logs?${params.toString()}`);
      return res.json();
    },
    enabled: !!token && !!providerData?.slug && activeTab === 'inspector'
  });

  useEffect(() => {
    if (!providerData) return;
    const savedCapabilities = providerData.capabilities?.length
      ? providerData.capabilities
      : [...TRANSACTIONAL_MANDATORY_CAPABILITIES];
    setIntegrationForm(current => ({
      ...current,
      baseUrl: providerData.baseUrl || '',
      authMethod: providerData.authMethod || 'API_KEY',
      capabilities: providerRequiresLocations
        ? Array.from(new Set([...savedCapabilities, 'LOCATIONS']))
        : savedCapabilities,
      apiSecret: '',
      webhookSecret: ''
    }));
  }, [providerData, providerRequiresLocations]);

  const certifyMutation = useMutation({
    mutationFn: async () => {
      const slug = providerData?.slug;
      if (!slug) throw new Error('Avval provider arizasini yarating.');
      const res = await apiFetch(`/api/v1/providers/${slug}/certify`, { method: 'POST' });
      return res.json();
    },
    onSuccess: () => refetchProvider()
  });

  const submitReviewMutation = useMutation({
    mutationFn: async () => {
      if (!providerData?.slug) throw new Error('Provider arizasi topilmadi.');
      const res = await apiFetch(`/api/v1/providers/${providerData.slug}/submit-review`, { method: 'POST' });
      return res.json();
    },
    onSuccess: () => refetchProvider()
  });

  const updateIntegrationMutation = useMutation({
    mutationFn: async () => {
      if (!providerData?.slug) throw new Error('Provider arizasi topilmadi.');
      const isTransactional = integrationForm.capabilities.some(capability =>
        ['QUOTE', 'ACTION_CREATE', 'ACTION_STATUS', 'WEBHOOK'].includes(capability)
      );
      const mandatory = isTransactional ? [...TRANSACTIONAL_MANDATORY_CAPABILITIES] : [...READONLY_CAPABILITIES];
      if (providerRequiresLocations) mandatory.push('LOCATIONS');
      const payload: any = {
        baseUrl: integrationForm.baseUrl.trim(),
        authMethod: integrationForm.authMethod,
        capabilities: [...new Set([...integrationForm.capabilities, ...mandatory])]
      };
      if (integrationForm.apiSecret.trim()) payload.apiSecret = integrationForm.apiSecret.trim();
      if (integrationForm.webhookSecret.trim()) payload.webhookSecret = integrationForm.webhookSecret.trim();
      const res = await apiFetch(`/api/v1/providers/${providerData.slug}/integration`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return res.json();
    },
    onSuccess: async () => {
      setIntegrationForm(current => ({ ...current, apiSecret: '', webhookSecret: '' }));
      await refetchProvider();
      setReviewEditMode(false);
      setDashboardSection('integration');
    }
  });

  const checkHealthNowMutation = useMutation({
    mutationFn: async () => {
      if (!providerData?.slug) throw new Error('Provider topilmadi.');
      const res = await apiFetch(`/api/v1/providers/${providerData.slug}/check-health-now`, { method: 'POST' });
      return res.json();
    },
    onSuccess: () => refetchProvider()
  });

  const registerWizardMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: wizardForm.name.trim(),
        slug: wizardForm.slug.trim().toLowerCase(),
        type: wizardForm.type,
        category: wizardForm.category,
        baseUrl: wizardForm.baseUrl.trim(),
        authMethod: wizardForm.authMethod,
        description: wizardForm.description.trim(),
        supportContact: wizardForm.supportContact,
        capabilities: Array.from(MANDATORY_PROVIDER_CAPABILITIES)
      };

      const res = await apiFetch('/api/v1/providers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.credentials) {
        setCreatedCredentials(data.credentials);
        setWizardStep(4); // Move to credential handoff step
      }
      handleProviderCreated(data.provider || data);
    }
  });

  // Helper to ensure simulator session
  const getOrFetchSimulatorSession = async (): Promise<string> => {
    if (simulatorSessionToken) return simulatorSessionToken;
    const res = await fetch(`${API_BASE}/api/v1/developer/sandbox/session`, { method: 'POST' });
    if (!res.ok) throw new Error('Simulator session creation failed');
    const data = await res.json();
    setSimulatorSessionToken(data.sessionToken);
    return data.sessionToken;
  };

  // Sandbox simulation actions
  const runSandboxDiscovery = async () => {
    setSandboxLoading(true);
    setSandboxError(null);
    try {
      // 1. Obtain signed simulator session
      let token = simulatorSessionToken;
      if (!token) {
        const sessionRes = await fetch(`${API_BASE}/api/v1/developer/sandbox/session`, { method: 'POST' });
        if (!sessionRes.ok) {
          const errData = await sessionRes.json().catch(() => null);
          throw new Error(errData?.message || 'Simulator sessiyasini yaratib bo‘lmadi.');
        }
        const sessionData = await sessionRes.json();
        token = sessionData.sessionToken;
        setSimulatorSessionToken(token);
      }

      // 2. Discover sandbox provider
      const res = await fetch(`${API_BASE}/api/v1/developer/sandbox/discover`, {
        headers: { 'x-simulator-session': token || '' }
      });
      if (!res.ok) {
        // Fallback check
        const findRes = await fetch(`${API_BASE}/api/v1/providers/find?category=general_services`).catch(() => null);
        if (!findRes || !findRes.ok) {
          // Non-blocking: proceed with standard discovery simulation
        }
      }
      setSandboxStep(2);
    } catch (e: any) {
      setSandboxError(e?.message || 'Sandbox hozir tayyor emas. Qayta urinib ko‘ring yoki sandbox sozlamalarini tekshiring.');
    } finally {
      setSandboxLoading(false);
    }
  };

  const runSandboxQuote = async () => {
    setSandboxLoading(true);
    setSandboxError(null);
    try {
      const sessionToken = await getOrFetchSimulatorSession();
      const res = await fetch(`${API_BASE}/api/v1/developer/sandbox/quote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-simulator-session': sessionToken
        },
        body: JSON.stringify({
          providerSlug: SANDBOX_PROVIDER_SLUG,
          items: [{ offeringId: 'offering_standard_pkg', quantity: 2 }]
        })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || 'Kotirovka hisoblashda xatolik yuz berdi.');
      }
      const data = await res.json();
      setSandboxQuote(data);
      setSandboxStep(3);
    } catch (e: any) {
      setSandboxError(e?.message || 'Sandbox hozir tayyor emas. Qayta urinib ko‘ring yoki sandbox sozlamalarini tekshiring.');
    } finally {
      setSandboxLoading(false);
    }
  };

  const runSandboxCreateAction = async () => {
    setSandboxLoading(true);
    setSandboxError(null);
    try {
      const sessionToken = await getOrFetchSimulatorSession();
      const idempKey = `sb_sim_${Date.now()}`;
      const quoteId = sandboxQuote?.id || sandboxQuote?.quoteId;
      const res = await fetch(`${API_BASE}/api/v1/developer/sandbox/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'idempotency-key': idempKey,
          'x-simulator-session': sessionToken
        },
        body: JSON.stringify({
          idempotencyKey: idempKey,
          providerSlug: SANDBOX_PROVIDER_SLUG,
          quoteId: quoteId,
          customer: { name: 'Demo Customer', phone: '+998901234567' },
          items: [{ offeringId: 'offering_standard_pkg', quantity: 2 }],
          userConfirmed: true
        })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || 'Buyurtma harakatini yaratishda xatolik yuz berdi.');
      }
      const data = await res.json();
      setSandboxAction(data);
      setSandboxStep(4);
    } catch (e: any) {
      setSandboxError(e?.message || 'Sandbox hozir tayyor emas. Qayta urinib ko‘ring yoki sandbox sozlamalarini tekshiring.');
    } finally {
      setSandboxLoading(false);
    }
  };

  const runSandboxWebhook = async () => {
    if (!sandboxAction) return;
    setSandboxLoading(true);
    setSandboxError(null);
    try {
      const sessionToken = await getOrFetchSimulatorSession();
      const actionId = sandboxAction.actionId || sandboxAction.publicId || sandboxAction.id;
      const res = await fetch(`${API_BASE}/api/v1/developer/sandbox/action/${actionId}`, {
        headers: {
          'x-simulator-session': sessionToken
        }
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || 'Buyurtma holatini yangilashda xatolik yuz berdi.');
      }
      const updated = await res.json();
      setSandboxAction(updated);
      setSandboxStep(5);
    } catch (e: any) {
      setSandboxError(e?.message || 'Sandbox hozir tayyor emas. Qayta urinib ko‘ring yoki sandbox sozlamalarini tekshiring.');
    } finally {
      setSandboxLoading(false);
    }
  };

  const provider = providerData || null;
  const certReport = certifyMutation.data;

  // AI Integration Kit Actions
  const copyAiPrompt = async () => {
    const prompt = generateUniversalAiPrompt(provider, certReport);
    try {
      await navigator.clipboard.writeText(prompt);
      setAiCopiedToast('Tayyor prompt nusxalandi! Endi uni AI agentga yuboring.');
      setTimeout(() => setAiCopiedToast(null), 3000);
    } catch {
      setAiCopiedToast('Nusxalash amalga oshmadi. Preview ichidagi matnni belgilang va nusxalang.');
      setTimeout(() => setAiCopiedToast(null), 3000);
    }
  };

  const [docsSearchRequest, setDocsSearchRequest] = useState(0);
  const openDocsSearch = () => { setActiveTab('docs'); setDocsSearchRequest(value => value + 1); };

  return (
    <>
      {activeTab !== 'auth' && <WorkspaceShell activeTab={activeTab} onNavigate={navigateTo} onSearch={openDocsSearch}
        onAiKit={() => setAiKitOpen(true)} signedIn={!!token} account={userProfile?.name || userProfile?.email}
        onLogout={handleLogout}>
        <Suspense fallback={<div className="workspace-loading" role="status"><RefreshCw className="animate-spin" size={20} /> Yuklanmoqda…</div>}>
        {/* ========================================================================= */}
        {/* TAB 1: OVERVIEW & QUICK START (PUBLIC)                                   */}
        {/* ========================================================================= */}
        {activeTab === 'overview' && (
          <WorkspaceOverview signedIn={!!token} provider={providerData}
            loading={!!token && providerLoading} failed={!!token && providerFailed}
            onRetry={() => refetchProvider()}
            onNavigate={(tab, step) => { if (step) setInitialOnboardingStep(step); if (tab === 'apps' && providerData?.status !== 'ACTIVE') setDashboardSection('integration'); navigateTo(tab); }}
            onDoc={id => { setSelectedDoc(id); setActiveTab('docs'); }}
            onAiKit={() => setAiKitOpen(true)} />
        )}
        {activeTab === 'onboarding' && (
          !authReady && !token ? <div className="workspace-loading" role="status"><RefreshCw className="animate-spin" size={20} /> Sessiya tekshirilmoqda…</div> : <OnboardingWizard
            apiBase={API_BASE}
            publicApiBase={PUBLIC_API_BASE}
            token={token}
            onAuthSuccess={(newToken, user) => {
              setToken(newToken);
              setUserProfile(user);
              if (typeof window !== 'undefined') {
                const url = new URL(window.location.href);
                url.searchParams.delete('verifyToken');
                url.searchParams.delete('token');
                window.history.replaceState({}, '', url.toString());
              }
            }}
            onProviderCreated={handleProviderCreated}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onOpenDoc={(docId) => {
              setSelectedDoc(docId);
              setActiveTab('docs');
            }}
            onOpenAiKit={() => setAiKitOpen(true)}
            initialStep={initialOnboardingStep}
            initialEmail={initialEmailParam}
            initialVerifyToken={initialVerifyTokenParam}
            initialProvider={provider}
          />
        )}

        {/* ========================================================================= */}
        {/* TAB 2: INTERACTIVE DOCUMENTATION (PUBLIC)                                  */}
        {/* ========================================================================= */}
        {activeTab === 'docs' && (
          <DocsViewer
            selectedDoc={selectedDoc}
            searchRequest={docsSearchRequest}
            onSelectDoc={setSelectedDoc}
            onOpenAiKit={() => setAiKitOpen(true)}
          />
        )}

        {/* ========================================================================= */}
        {/* TAB 3: APPS & PROVIDER DASHBOARD (PROTECTED)                              */}
        {/* ========================================================================= */}
        {activeTab === 'apps' && (
          <div className="space-y-6 animate-fadeIn">
            {!token ? (
              <ProtectedGate
                sectionTitle="Provider Dashboard & API Boshqaruvi"
                sectionDescription="Provider arizangiz, API credentiallari, webhooklar va tushgan buyurtmalarni monitoring qilish uchun tizimga kiring."
                onLoginClick={() => openAuthFor('apps', 'login')}
                onSignupClick={() => openAuthFor('onboarding', 'signup')}
                onDocsClick={() => setActiveTab('docs')}
              />
            ) : providerLoading ? (
              <div className="workspace-loading" role="status"><RefreshCw className="animate-spin" size={20} /> Provider profili yuklanmoqda…</div>
            ) : providerFailed ? (
              <div className="workspace-notice" role="alert">Provider profilini yuklab bo‘lmadi.<button onClick={() => refetchProvider()}>Qayta urinish</button></div>
            ) : !provider ? (
              <ProviderEmptyState
                title="Avval biznes profilingizni yarating"
                description="Sizda hali ro‘yxatdan o‘tgan provider yo‘q. Zayuno tarmog‘i orqali AI mijozlardan buyurtma qabul qilish uchun biznesingizni 4 bosqichda ulang."
                onStartOnboarding={() => navigateTo('onboarding')}
                onOpenDocs={() => setActiveTab('docs')}
                onOpenAiKit={() => setAiKitOpen(true)}
              />
            ) : (
              /* EXISTING PROVIDER DASHBOARD */
              <div className="space-y-6">
                {/* Header with Provider Brand & Live Status */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-extrabold text-white tracking-tight">{provider.name}</h2>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${
                        isProviderActive
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : isPendingReview
                          ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                          : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      }`}>
                        {isProviderActive ? '● JONLI' : isPendingReview ? '◌ KO‘RIB CHIQILMOQDA' : '● SOZLANMOQDA'}
                      </span>
                      {provider.metadata?.isCertified && !isPendingReview && (
                        <span className="bg-sky-500/15 text-sky-300 border border-sky-500/30 px-2 py-0.5 rounded-full text-[11px] font-medium flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> API sinovi o‘tgan
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      Zayuno tarmog‘idagi biznes profili · Slug: <code className="text-indigo-300 font-mono font-semibold">{provider.slug}</code> · Turi: <span className="text-slate-300">{provider.type}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setAiKitOpen(true)}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl shadow-lg shadow-indigo-600/20 transition flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" /> AI Kit (Prompt)
                    </button>
                    <button
                      type="button"
                      onClick={() => { setSelectedDoc('contract-reference'); setActiveTab('docs'); }}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium px-3.5 py-2 rounded-xl transition flex items-center gap-1.5"
                    >
                      <BookOpen className="w-3.5 h-3.5" /> API Reference
                    </button>
                  </div>
                </div>

                {isPendingReview ? (
                  <section aria-label="Ariza ko‘rib chiqilmoqda" className="overflow-hidden rounded-3xl border border-sky-500/30 bg-gradient-to-br from-sky-950/45 via-indigo-950/30 to-slate-900/70 shadow-xl shadow-sky-950/20">
                    <div className="border-b border-sky-500/20 px-6 py-5 sm:px-7">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex gap-3.5">
                          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-sky-400/30 bg-sky-400/10 text-sky-300">
                            <Clock className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-[10px] font-mono font-semibold uppercase tracking-[0.18em] text-sky-300">Review jarayoni</p>
                            <h3 className="mt-1 text-lg font-bold text-white">Arizangiz ko‘rib chiqilmoqda</h3>
                            <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-300">API sinovi muvaffaqiyatli o‘tdi. Zayuno jamoasi integratsiyangizni tekshiryapti; tasdiqlangach biznesingiz AI mijozlarga ochiladi.</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setReviewEditMode(true); setDashboardSection('integration'); }}
                          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-900/80 px-3.5 py-2 text-xs font-semibold text-slate-100 transition hover:border-indigo-400 hover:bg-slate-800"
                        >
                          <Sliders className="h-3.5 w-3.5 text-indigo-300" /> API va kalitlarni boshqarish
                        </button>
                      </div>
                    </div>
                    <div className="grid gap-3 p-5 sm:grid-cols-3 sm:p-6">
                      {[
                        { label: 'API sertifikatlash', detail: 'Muvaffaqiyatli yakunlandi', done: true },
                        { label: 'Ariza yuborildi', detail: provider.metadata?.submittedAt ? new Date(provider.metadata.submittedAt).toLocaleString('uz-UZ') : 'Navbatga qo‘shildi', done: true },
                        { label: 'AI mijozlarga ochish', detail: 'Tasdiqlangach faollashadi', done: false }
                      ].map(step => (
                        <div key={step.label} className="rounded-2xl border border-slate-700/80 bg-slate-950/45 p-3.5">
                          <div className="flex items-center gap-2 text-xs font-semibold text-white">
                            {step.done ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Lock className="h-4 w-4 text-slate-500" />}
                            {step.label}
                          </div>
                          <p className="mt-1.5 text-[11px] leading-4 text-slate-400">{step.detail}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-col gap-2 border-t border-sky-500/15 px-6 py-4 text-xs text-slate-300 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                      <span>Hozir hech narsa yuborishingiz shart emas. Sozlamani o‘zgartirsangiz, review qayta boshlanadi.</span>
                      <button type="button" onClick={() => { setSelectedDoc('contract-reference'); setActiveTab('docs'); }} className="font-semibold text-sky-300 hover:text-sky-200">API hujjatlarini ochish →</button>
                    </div>
                  </section>
                ) : provider.status !== 'ACTIVE' && (
                  <div className="dashboard-next-step">
                    <div>
                      <h3>{integrationState.status}</h3>
                      <p>{integrationState.description}</p>
                    </div>
                    <button
                      className="secondary-button"
                      onClick={() => {
                        if (integrationState.tab === 'apps') setDashboardSection('integration');
                        else setActiveTab(integrationState.tab);
                      }}
                    >
                      {integrationState.label} <ArrowRight size={15} />
                    </button>
                  </div>
                )}

                {(provider.metadata?.isTemporarilyUnavailable || provider.metadata?.healthMonitoring?.isTemporarilyUnavailable || provider.metadata?.healthMonitoring?.state === 'DOWN') && (
                  <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-200 space-y-2 animate-fadeIn">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <h3 className="font-bold text-white text-sm">Serveringiz vaqtincha javob bermayapti</h3>
                          <p className="text-xs text-rose-200 leading-relaxed">
                            AI agentlar qidiruvidan vaqtincha yashirildi. Server tiklangach tizim avtomatik tarzda qayta faollashtiradi.
                          </p>
                          {provider.metadata?.healthMonitoring?.lastFailureCode && (
                            <div className="text-[11px] text-rose-300 font-mono">
                              Oxirgi xatolik kodi: {provider.metadata.healthMonitoring.lastFailureCode}
                              {provider.metadata.healthMonitoring.lastCheckedAt && ` (${new Date(provider.metadata.healthMonitoring.lastCheckedAt).toLocaleTimeString()})`}
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => checkHealthNowMutation.mutate()}
                        disabled={checkHealthNowMutation.isPending}
                        className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold shrink-0 transition flex items-center gap-1.5 shadow-md shadow-rose-950"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${checkHealthNowMutation.isPending ? 'animate-spin' : ''}`} />
                        <span>{checkHealthNowMutation.isPending ? 'Tekshirilmoqda...' : 'Hozir tekshirish'}</span>
                      </button>
                    </div>
                    {checkHealthNowMutation.isError && (
                      <p className="text-xs text-rose-300 font-medium pt-1">
                        {(checkHealthNowMutation.error as Error).message}
                      </p>
                    )}
                    {checkHealthNowMutation.isSuccess && (
                      <p className="text-xs text-emerald-300 font-medium pt-1">
                        {checkHealthNowMutation.data?.message}
                      </p>
                    )}
                  </div>
                )}

                {isProviderActive && (
                  <>
                {/* Modern KPI Cards */}
                {dashboardFailed && (
                  <div className="workspace-notice" role="alert">
                    Buyurtma ko‘rsatkichlari yangilanmadi. Avvalgi ma’lumotlar eskirgan bo‘lishi mumkin.
                    <button onClick={() => refetchDashboard()}>Qayta urinish</button>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3.5 md:grid-cols-5" aria-busy={dashboardFetching}>
                  {[
                    { label: 'Jami buyurtmalar', value: providerDashboard?.metrics?.totalActions ?? '—', color: 'text-indigo-400', border: 'border-indigo-500/20', bg: 'bg-indigo-950/20' },
                    { label: 'Kutilmoqda (Pending)', value: providerDashboard?.metrics?.pendingActions ?? '—', color: 'text-amber-400', border: 'border-amber-500/20', bg: 'bg-amber-950/20' },
                    { label: 'To‘langan (Paid)', value: providerDashboard?.metrics?.paidActions ?? '—', color: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-950/20' },
                    { label: 'Tugallangan', value: providerDashboard?.metrics?.completedActions ?? '—', color: 'text-sky-400', border: 'border-sky-500/20', bg: 'bg-sky-950/20' },
                    { label: 'Muammoli / Bekor', value: providerDashboard?.metrics?.failedActions ?? '—', color: 'text-rose-400', border: 'border-rose-500/20', bg: 'bg-rose-950/20' }
                  ].map(stat => (
                    <div key={stat.label} className={`rounded-2xl border ${stat.border} ${stat.bg} p-4 backdrop-blur-sm transition hover:border-slate-700`}>
                      <p className="text-xs font-medium text-slate-400">{stat.label}</p>
                      <p className={`mt-2 text-2xl font-extrabold tracking-tight ${stat.color}`}>{stat.value}</p>
                    </div>
                  ))}
                </div>

                {/* Navigation Tabs between Orders and Integration */}
                <nav className="dashboard-section-tabs" aria-label="Dashboard bo‘limlari">
                  <button
                    aria-pressed={dashboardSection === 'orders'}
                    onClick={() => setDashboardSection('orders')}
                    className="flex items-center gap-2"
                  >
                    <span>🛒 Buyurtmalar va Actionlar</span>
                  </button>
                  <button
                    aria-pressed={dashboardSection === 'integration'}
                    onClick={() => setDashboardSection('integration')}
                    className="flex items-center gap-2"
                  >
                    <span>⚙️ API ulanishi</span>
                  </button>
                </nav>
                  </>
                )}

                {(!isPendingReview || reviewEditMode) && (
                <section hidden={isProviderActive && dashboardSection !== 'integration'} aria-label="API sozlamalari va nashr" className="space-y-6">
                  {isPendingReview && reviewEditMode && (
                    <div className="flex flex-col gap-3 rounded-2xl border border-amber-500/35 bg-amber-950/25 p-4 text-xs sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-2.5 text-amber-100">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                        <div><strong className="block">Review jarayoni to‘xtatiladi</strong><span className="mt-0.5 block leading-5 text-amber-100/80">API sozlamasini saqlash certification va review holatini yangidan boshlaydi. Faqat o‘zgartirish zarur bo‘lsa saqlang.</span></div>
                      </div>
                      <button type="button" onClick={() => setReviewEditMode(false)} className="shrink-0 font-semibold text-amber-200 hover:text-white">Review holatiga qaytish</button>
                    </div>
                  )}
                <div className="space-y-6">
                  {/* Business-safe integration settings. Developer-only controls stay collapsed below. */}
                  <div className="space-y-6">
                    <div className="bg-slate-900/60 border border-indigo-500/30 rounded-2xl p-6 space-y-5">
                      <div>
                        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                          <Globe className="w-4 h-4 text-indigo-400" /> API ulanishi
                        </h3>
                        <p className="mt-1 text-xs text-slate-400">
                          Bu yerga dasturchingiz bergan API manzilni kiriting. Kalitlar va texnik sozlamalar pastdagi alohida bo‘limda.
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-medium text-slate-200">Sizning API manzilingiz</label>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDoc('base-url');
                              setActiveTab('docs');
                            }}
                            className="text-[11px] text-indigo-400 hover:text-indigo-300"
                          >
                            Qo‘llanma →
                          </button>
                        </div>
                        <input
                          type="url"
                          value={integrationForm.baseUrl}
                          onChange={event => setIntegrationForm({ ...integrationForm, baseUrl: event.target.value })}
                          placeholder="https://api.business.uz/zayuno"
                          disabled={provider.status === 'ACTIVE'}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                        />
                        <p className="mt-1.5 text-[11px] leading-5 text-slate-500">Masalan: <code className="text-slate-400">https://api.biznesingiz.uz/zayuno</code>. Bu manzilni odatda dasturchi beradi.</p>
                      </div>

                      <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-3.5">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                        <div><p className="text-xs font-semibold text-white">Mijozlar uchun xizmat</p><p className="mt-1 text-[11px] leading-5 text-slate-400">{usesTransactionalFlow ? 'Mijozlar katalogingizni ko‘radi, narxni aniqlaydi va buyurtma yuboradi.' : 'Mijozlar katalogingizni ko‘radi. Buyurtma yaratish hozir yoqilmagan.'}</p></div>
                      </div>

                      <button
                        type="button"
                        aria-expanded={advancedDeveloperSettingsOpen}
                        onClick={() => setAdvancedDeveloperSettingsOpen(open => !open)}
                        className="flex w-full items-center justify-between rounded-2xl border border-slate-700 bg-slate-950/55 px-4 py-3 text-left transition hover:border-indigo-400/60 hover:bg-slate-900"
                      >
                        <span className="flex items-center gap-2.5"><Code2 className="h-4 w-4 text-indigo-300" /><span><span className="block text-xs font-semibold text-white">Dasturchi sozlamalari</span><span className="mt-0.5 block text-[11px] text-slate-500">Kalitlar, webhook va texnik tekshiruv</span></span></span>
                        <span className="text-xs font-semibold text-indigo-300">{advancedDeveloperSettingsOpen ? 'Yopish' : 'Ochish'}</span>
                      </button>

                      {advancedDeveloperSettingsOpen && integrationForm.baseUrl.trim() && !integrationForm.baseUrl.toLowerCase().includes('sandbox') && (
                          <div className="mt-2.5 rounded-xl border border-slate-800/80 bg-slate-950/80 p-3 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                                <Terminal className="w-3.5 h-3.5 text-emerald-400" /> Terminal orqali tezkor tekshirish:
                              </span>
                              <button
                                type="button"
                                onClick={async () => {
                                  const cmd = `curl -X GET "${integrationForm.baseUrl.replace(/\/+$/, '')}/health" -H "x-provider-api-key: $YOUR_API_KEY"`;
                                  try {
                                    await navigator.clipboard.writeText(cmd);
                                    setCopiedText('cmd');
                                    setTimeout(() => setCopiedText(null), 2000);
                                  } catch {}
                                }}
                                className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-mono"
                              >
                                {copiedText === 'cmd' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                {copiedText === 'cmd' ? 'Nusxalandi!' : 'cURL nusxalash'}
                              </button>
                            </div>
                            <pre className="text-[11px] font-mono text-emerald-300 bg-black/40 p-2 rounded-lg overflow-x-auto">
                              curl -X GET "{integrationForm.baseUrl.replace(/\/+$/, '')}/health" -H "x-provider-api-key: $YOUR_API_KEY"
                            </pre>
                          </div>
                        )}
                      {advancedDeveloperSettingsOpen && (
                      <div className="space-y-5 rounded-2xl border border-slate-800 bg-slate-950/35 p-4">
                        <p className="text-[11px] leading-5 text-slate-400"><strong className="text-slate-200">Faqat dasturchi uchun.</strong> Bu sozlamalar serverni Zayuno bilan xavfsiz bog‘laydi. Ishonchingiz bo‘lmasa, AI Kit promptini yoki ushbu sahifani dasturchingizga bering.</p>
                      {/* Sandbox Notification if sandbox domain is selected */}
                      {(integrationForm.baseUrl.toLowerCase().includes('sandbox') || integrationForm.baseUrl.toLowerCase().includes('shopla.uz')) ? (
                        <div className="p-3.5 rounded-xl bg-sky-950/30 border border-sky-500/40 text-xs text-sky-200 space-y-1 animate-fadeIn">
                          <span className="font-semibold text-white flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-sky-400" /> Sandbox test provideri tanlandi
                          </span>
                          <p className="text-[11px] text-sky-300 leading-relaxed">
                            Sandbox test provideri tanlandi. Test credentiallari Zayuno serveri tomonidan xavfsiz qo‘llanadi; bu yerga API key yoki webhook secret kiritishingiz shart emas.
                          </p>
                        </div>
                      ) : (
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <label className="block text-xs text-slate-300 font-medium flex items-center gap-1">
                                <span>Zayuno → sizning serveringiz kaliti</span>
                                <span title="Zayuno sizning API’ingizga yuborgan so‘rovni tekshirish uchun ishlatiladi. Bu kalitni dasturchingiz yaratadi va server tomonida saqlaydi." className="cursor-help text-slate-500 hover:text-indigo-400">
                                  <HelpCircle className="w-3.5 h-3.5" />
                                </span>
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedDoc('auth');
                                  setActiveTab('docs');
                                }}
                                className="text-[10px] text-indigo-400 hover:text-indigo-300"
                              >
                                Qo‘llanma →
                              </button>
                            </div>
                            <input
                              type="password"
                              value={integrationForm.apiSecret}
                              onChange={event => setIntegrationForm({ ...integrationForm, apiSecret: event.target.value })}
                              placeholder="Yangi qiymat kiritilmasa avvalgi kalit saqlanadi"
                              disabled={provider.status === 'ACTIVE'}
                              autoComplete="new-password"
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                            />
                            {integrationForm.apiSecret.length > 0 && (
                              <p className="text-[10px] text-amber-400">
                                ⚠️ Credential yangilanadi va certification qayta talab qilinishi mumkin
                              </p>
                            )}
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <label className="block text-xs text-slate-300 font-medium flex items-center gap-1">
                                <span>Webhook imzo kaliti</span>
                                <span title="Sizning serveringiz Zayuno’ga yuborgan buyurtma holati haqiqiy ekanini tasdiqlaydi." className="cursor-help text-slate-500 hover:text-emerald-400">
                                  <HelpCircle className="w-3.5 h-3.5" />
                                </span>
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedDoc('auth');
                                  setActiveTab('docs');
                                }}
                                className="text-[10px] text-indigo-400 hover:text-indigo-300"
                              >
                                Qo‘llanma →
                              </button>
                            </div>
                            <div className="flex gap-2">
                              <input
                                type="password"
                                value="••••••••••••••••••••••••"
                                disabled
                                className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-slate-500 font-mono text-xs cursor-not-allowed"
                              />
                              <button
                                type="button"
                                onClick={handleRotateWebhookSecret}
                                disabled={provider.status === 'ACTIVE'}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-[11px] font-semibold shrink-0 transition flex items-center gap-1"
                                title="Webhook imzo kalitini xavfsiz almashtirish"
                              >
                                <RefreshCw className="w-3 h-3" />
                                <span>Yangilash</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-col gap-3 rounded-2xl border border-violet-500/25 bg-violet-950/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-2.5">
                          <div className="mt-0.5 rounded-xl border border-violet-400/25 bg-violet-400/10 p-2 text-violet-200"><Key className="h-4 w-4" /></div>
                          <div>
                            <h4 className="text-xs font-bold text-white">Sizning serveringiz → Zayuno kaliti</h4>
                            <p className="mt-1 max-w-xl text-[11px] leading-5 text-slate-400">Sizning serveringiz Zayuno API’ga murojaat qilishi uchun kerak. Mavjud kalit qayta ko‘rsatilmaydi; yangi kalit faqat yaratilgan paytda bir marta ochiladi.</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleCreateDeveloperApiKey}
                          disabled={issuedApiKeyModal.loading}
                          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-violet-400/35 bg-violet-500/15 px-3.5 py-2 text-xs font-semibold text-violet-100 transition hover:bg-violet-500/25 disabled:opacity-50"
                        >
                          <Key className="h-3.5 w-3.5" /> {issuedApiKeyModal.loading ? 'Yaratilmoqda...' : 'Yangi API key yaratish'}
                        </button>
                      </div>

                      </div>
                      )}

                      <button
                        onClick={() => updateIntegrationMutation.mutate()}
                        disabled={updateIntegrationMutation.isPending || provider.status === 'ACTIVE' || !integrationForm.baseUrl.trim()}
                        className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-xl text-xs transition-all"
                      >
                        {updateIntegrationMutation.isPending ? 'Tekshirilmoqda va saqlanmoqda...' : 'O‘zgarishlarni saqlash'}
                      </button>
                      {provider.status === 'ACTIVE' && <p className="text-xs text-amber-300">ACTIVE provider sozlamalarini o‘zgartirishdan oldin Operations uni suspend qilishi kerak.</p>}
                      {updateIntegrationMutation.isError && <p className="text-xs text-rose-400">{(updateIntegrationMutation.error as Error).message}</p>}
                      {updateIntegrationMutation.isSuccess && <p className="text-xs text-emerald-400">Integration saqlandi. Endi certificationni qayta ishga tushiring.</p>}
                    </div>

                    {/* Certification and review controls belong only to the editable, pre-review state. */}
                    {!isProviderActive && !isPendingReview && <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-base font-semibold text-white">{provider.name}</h3>
                          <p className="text-xs text-slate-400 font-mono">Slug: {provider.slug}</p>
                        </div>
                        <span className="bg-amber-500/15 text-amber-300 text-xs px-2.5 py-1 rounded-full border border-amber-500/30">
                          Sozlanmoqda
                        </span>
                      </div>

                      {provider.metadata?.reviewReason && (
                        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs">
                          <div className="font-bold text-amber-300">Moderatsiya izohi</div>
                          {provider.metadata?.reviewReasonCode && <div className="mt-1 font-mono text-[10px] text-amber-200/70">{provider.metadata.reviewReasonCode}</div>}
                          <p className="mt-2 whitespace-pre-wrap leading-5 text-amber-50">{provider.metadata.reviewReason}</p>
                          {provider.metadata?.requiredChanges?.length > 0 && (
                            <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-100/90">
                              {provider.metadata.requiredChanges.map((change: string) => <li key={change}>{change}</li>)}
                            </ul>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-3 pt-2">
                        <button
                          onClick={() => setActiveTab('certification')}
                          className="bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/30 text-xs font-medium px-4 py-2 rounded-xl transition-all flex items-center gap-1.5"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" /> Run Certification
                        </button>
                        {provider.metadata?.isCertified && provider.metadata?.reviewStatus === 'DRAFT' && (
                          <button
                            onClick={() => submitReviewMutation.mutate()}
                            disabled={submitReviewMutation.isPending}
                            className="bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 text-xs font-medium px-4 py-2 rounded-xl transition-all"
                          >
                            {submitReviewMutation.isPending ? 'Yuborilmoqda...' : 'Reviewga yuborish'}
                          </button>
                        )}
                      </div>
                      {submitReviewMutation.isError && <p className="text-xs text-rose-400">{(submitReviewMutation.error as Error).message}</p>}
                      {submitReviewMutation.isSuccess && <p className="text-xs text-emerald-400">Ariza admin review’ga yuborildi.</p>}
                    </div>}
                  </div>
                </div>

                {/* Actions Dashboard Table */}
                </section>
                )}
                {isProviderActive && <section hidden={dashboardSection !== 'orders'} aria-label="Buyurtmalar">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <span>Kelgan buyurtmalar va tranzaksiyalar</span>
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {provider.name} provideriga AI mijozlari tomonidan yuborilgan barcha actionlar ro‘yxati.
                      </p>
                    </div>
                    <button
                      onClick={() => refetchDashboard()}
                      disabled={dashboardFetching}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-200 transition disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${dashboardFetching ? 'animate-spin' : ''}`} /> Yangilash
                    </button>
                  </div>

                  {/* Filter & Search Controls */}
                  <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 pt-1">
                    <label className="relative xl:col-span-2">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                      <input
                        value={actionFilters.query}
                        onChange={event => setActionFilters(current => ({ ...current, query: event.target.value }))}
                        placeholder="Action ID, mijoz ismi, telefon..."
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                    </label>
                    <select
                      value={actionFilters.status}
                      onChange={event => setActionFilters(current => ({ ...current, status: event.target.value }))}
                      className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="ALL">Barcha action holatlari</option>
                      {['AWAITING_PAYMENT', 'SUBMITTED', 'ACCEPTED', 'IN_PROGRESS', 'READY', 'FULFILLING', 'COMPLETED', 'CANCELLED', 'FAILED'].map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                    <select
                      value={actionFilters.paymentStatus}
                      onChange={event => setActionFilters(current => ({ ...current, paymentStatus: event.target.value }))}
                      className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="ALL">Barcha to‘lov holatlari</option>
                      {['PENDING', 'AUTHORIZED', 'PAID', 'FAILED', 'REFUNDED'].map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                    <input
                      type="date"
                      aria-label="Boshlanish sanasi"
                      value={actionFilters.from}
                      onChange={event => setActionFilters(current => ({ ...current, from: event.target.value }))}
                      className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                    <select
                      value={actionFilters.sort}
                      onChange={event => setActionFilters(current => ({ ...current, sort: event.target.value }))}
                      className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="newest">Eng yangi birinchi</option>
                      <option value="oldest">Eng eski birinchi</option>
                      <option value="total_desc">Summa: kamayish</option>
                      <option value="total_asc">Summa: o‘sish</option>
                    </select>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-800 shadow-xl">
                    <table className="min-w-full text-left text-xs">
                      <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-mono uppercase tracking-wider text-slate-400">
                        <tr>
                          <th className="p-3.5">Action ID</th>
                          <th className="p-3.5">Mijoz</th>
                          <th className="p-3.5">Jami Summa</th>
                          <th className="p-3.5">To‘lov (Payment)</th>
                          <th className="p-3.5">Buyurtma Statusi</th>
                          <th className="p-3.5">Vaqt</th>
                          <th className="p-3.5 text-right">Amal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {dashboardFetching && !providerDashboard ? (
                          <tr><td colSpan={7} className="p-8 text-center text-slate-400 font-sans" role="status">Buyurtmalar yuklanmoqda…</td></tr>
                        ) : dashboardFailed && !providerDashboard ? (
                          <tr><td colSpan={7} className="p-8 text-center text-amber-300 font-sans">Ma’lumot olinmadi. Qayta urinib ko‘ring.</td></tr>
                        ) : (providerDashboard?.actions || []).length === 0 ? (
                          <tr><td colSpan={7} className="p-8 text-center text-slate-400 font-sans">Tanlangan filtrlar bo‘yicha buyurtma topilmadi.</td></tr>
                        ) : providerDashboard.actions.map((action: any) => (
                          <tr key={action.publicId} className="hover:bg-slate-800/40 transition">
                            <td className="p-3.5">
                              <div className="font-mono font-bold text-indigo-300 text-xs">{action.publicId}</div>
                              {action.externalActionId && <div className="mt-0.5 font-mono text-[10px] text-slate-500">{action.externalActionId}</div>}
                            </td>
                            <td className="p-3.5 font-sans">
                              <div className="font-semibold text-slate-200">{action.customerName || 'Mijoz'}</div>
                              <div className="text-[11px] text-slate-400 font-mono">{action.customerPhoneMasked}</div>
                            </td>
                            <td className="p-3.5 font-mono font-bold text-white text-xs">
                              {action.total?.toLocaleString('uz-UZ')} <span className="text-slate-400 font-normal">{action.currency}</span>
                            </td>
                            <td className="p-3.5">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono border ${
                                action.paymentStatus === 'PAID'
                                  ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
                                  : action.paymentStatus === 'FAILED'
                                  ? 'border-rose-500/30 bg-rose-500/15 text-rose-300'
                                  : 'border-amber-500/30 bg-amber-500/15 text-amber-300'
                              }`}>
                                {action.paymentStatus}
                              </span>
                            </td>
                            <td className="p-3.5">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono border ${
                                action.status === 'COMPLETED'
                                  ? 'border-sky-500/30 bg-sky-500/15 text-sky-300'
                                  : action.status === 'CANCELLED' || action.status === 'FAILED'
                                  ? 'border-rose-500/30 bg-rose-500/15 text-rose-300'
                                  : 'border-indigo-500/30 bg-indigo-500/15 text-indigo-300'
                              }`}>
                                {action.status}
                              </span>
                              {action.cancellationReason && (
                                <div className="mt-1 max-w-xs text-[10px] text-rose-300 truncate" title={action.cancellationReason}>
                                  {action.cancellationReason}
                                </div>
                              )}
                            </td>
                            <td className="p-3.5 text-slate-400 font-mono text-[11px]">
                              {new Date(action.createdAt).toLocaleString('uz-UZ')}
                            </td>
                            <td className="p-3.5 text-right">
                              <button
                                onClick={() => setSelectedProviderActionId(action.publicId)}
                                className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-3.5 py-1.5 font-sans text-xs font-semibold text-white shadow transition"
                              >
                                Batafsil
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                    <span>Filtr bo‘yicha jami: <strong className="text-white font-mono">{providerDashboard?.pagination?.total ?? 0}</strong> ta buyurtma</span>
                    {actionFilters.query && (
                      <button
                        onClick={() => setActionFilters({ query: '', status: 'ALL', paymentStatus: 'ALL', from: '', to: '', sort: 'newest' })}
                        className="text-indigo-400 hover:underline"
                      >
                        Qidiruvni tozalash
                      </button>
                    )}
                  </div>
                </div>
                </section>
                }
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: INTERACTIVE SANDBOX SIMULATOR                                      */}
        {/* ========================================================================= */}
        {activeTab === 'sandbox' && (
          <SandboxSimulator
            step={sandboxStep}
            loading={sandboxLoading}
            error={sandboxError}
            quote={sandboxQuote}
            action={sandboxAction}
            onRunDiscovery={runSandboxDiscovery}
            onRunQuote={runSandboxQuote}
            onRunCreateAction={runSandboxCreateAction}
            onRunWebhook={runSandboxWebhook}
            onReset={() => {
              setSandboxStep(1);
              setSandboxQuote(null);
              setSandboxAction(null);
              setSandboxError(null);
            }}
            providerSlug={provider?.slug}
          />
        )}

        {/* ========================================================================= */}
        {/* TAB 5: CERTIFICATION RUNNER (PROTECTED)                                   */}
        {/* ========================================================================= */}
        {activeTab === 'certification' && (
          <div className="space-y-6 animate-fadeIn">
            {!token ? (
              <ProtectedGate
                sectionTitle="Avtomatlashtirilgan Sertifikatlash"
                sectionDescription="Provider API integratsiyangizni Zayuno universal protokoli va xavfsizlik talablariga mosligini tekshirish uchun tizimga kiring."
                onLoginClick={() => openAuthFor('apps', 'login')}
                onSignupClick={() => openAuthFor('onboarding', 'signup')}
                onDocsClick={() => setActiveTab('docs')}
              />
            ) : !provider?.slug ? (
              <ProviderEmptyState
                title="Tekshiruvdan oldin biznes profilingizni yarating"
                description="Avtomatlashtirilgan capability certification testlarini o‘tkazish uchun avval biznes profilingizni yarating va API manzilingizni ulang."
                onStartOnboarding={() => navigateTo('onboarding')}
                onOpenDocs={() => { setSelectedDoc('certification'); setActiveTab('docs'); }}
                onOpenAiKit={() => setAiKitOpen(true)}
              />
            ) : (
              <CertificationView
                provider={provider}
                certReport={certReport}
                isPending={certifyMutation.isPending}
                onRunCertify={() => certifyMutation.mutate()}
                onOpenDocs={docId => { setSelectedDoc(docId); setActiveTab('docs'); }}
                onOpenAiKit={() => setAiKitOpen(true)}
              />
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: LIVE API & PAYLOAD INSPECTOR (PROTECTED)                           */}
        {/* ========================================================================= */}
        {activeTab === 'inspector' && (
          <div className="space-y-6 animate-fadeIn">
            {!token ? (
              <ProtectedGate
                sectionTitle="Live Tranzaksiya Inspectori"
                sectionDescription="AI agentlaridan kelayotgan real-time so‘rovlar, quote hisoblash va webhook tranzaksiyalari loglarini kuzatish uchun tizimga kiring."
                onLoginClick={() => openAuthFor('apps', 'login')}
                onSignupClick={() => openAuthFor('onboarding', 'signup')}
                onDocsClick={() => setActiveTab('docs')}
              />
            ) : !provider?.slug ? (
              <ProviderEmptyState
                title="So‘rovlar jurnali uchun biznes profilingizni yarating"
                description="AI agentlar va mijozlardan kelayotgan real-time so‘rovlar hamda trace loglarini ko‘rish uchun avval biznes profilingizni yarating."
                onStartOnboarding={() => navigateTo('onboarding')}
                onOpenDocs={() => setActiveTab('docs')}
                onOpenAiKit={() => setAiKitOpen(true)}
              />
            ) : (
              <RequestInspector
                provider={provider}
                logs={providerLogsData?.logs || []}
                loading={logsLoading}
                filters={inspectorFilters}
                onFilterChange={setInspectorFilters}
                onRefresh={refetchLogs}
                selectedLog={selectedInspectorLog}
                onSelectLog={setSelectedInspectorLog}
              />
            )}
          </div>
        )}
        </Suspense>
      </WorkspaceShell>}

      {activeTab === 'auth' && (
        <Suspense fallback={<div className="min-h-dvh grid place-items-center bg-[#090d15] text-sm text-slate-400">Yuklanmoqda…</div>}>
          <AuthView
            apiBase={API_BASE}
            initialEmail={initialEmailParam}
            initialMode={authScreenMode}
            onModeChange={(mode) => {
              setAuthScreenMode(mode);
              const url = new URL(window.location.href);
              url.searchParams.set('mode', mode);
              url.searchParams.set('returnTo', mode === 'signup' ? '/?tab=onboarding' : '/?tab=apps');
              window.history.replaceState({}, '', url.toString());
            }}
            onAuthenticated={(newToken, user) => {
              setToken(newToken);
              setUserProfile(user);
              const url = new URL(window.location.href);
              const requestedReturn = url.searchParams.get('returnTo') || (authScreenMode === 'signup' ? '/?tab=onboarding' : '/?tab=apps');
              const destination = new URL(requestedReturn, window.location.origin);
              const nextTab = (['apps', 'sandbox', 'certification', 'inspector', 'onboarding', 'overview'].includes(destination.searchParams.get('tab') || '')
                ? destination.searchParams.get('tab')
                : 'apps') as WorkspaceTab;
              window.history.replaceState({}, '', `${destination.pathname}${destination.search}`);
              setActiveTab(nextTab);
            }}
            onOpenDocs={() => {
              const url = new URL(window.location.href);
              url.searchParams.delete('returnTo');
              url.searchParams.delete('mode');
              window.history.replaceState({}, '', url.toString());
              setActiveTab('docs');
            }}
            onOpenOverview={() => {
              const url = new URL(window.location.href);
              url.searchParams.delete('returnTo');
              url.searchParams.delete('mode');
              window.history.replaceState({}, '', url.toString());
              setActiveTab('overview');
            }}
          />
        </Suspense>
      )}

      {/* Auth & Onboarding Modal */}
      {authModalOpen && (
        <div className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="my-8 w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-7 shadow-2xl space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">
                  {authModalTab === 'login' && 'Provider Portalga Kirish'}
                  {authModalTab === 'signup' && 'Provider Bo‘lish (Ro‘yxatdan o‘tish)'}
                  {authModalTab === 'verify' && 'Emailni Tasdiqlash'}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  {authModalTab === 'login' && 'Provider owner yoki developer hisobingiz bilan kiring.'}
                  {authModalTab === 'signup' && 'Yangi provider hisobini oching va arizangizni yarating.'}
                  {authModalTab === 'verify' && 'Emailingizga yuborilgan tasdiqlash kodini kiriting.'}
                </p>
              </div>
              <button onClick={() => setAuthModalOpen(false)} className="rounded-full bg-slate-800 p-1.5 text-xs text-slate-400 hover:text-white">✕</button>
            </div>

            {/* Auth Tabs */}
            <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs font-medium">
              <button
                onClick={() => { setAuthModalTab('login'); setAuthError(''); setAuthSuccess(''); }}
                className={`flex-1 py-1.5 rounded-lg transition-all ${authModalTab === 'login' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Kirish
              </button>
              <button
                onClick={() => { setAuthModalTab('signup'); setAuthError(''); setAuthSuccess(''); }}
                className={`flex-1 py-1.5 rounded-lg transition-all ${authModalTab === 'signup' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Ro‘yxatdan o‘tish
              </button>
              <button
                onClick={() => { setAuthModalTab('verify'); setAuthError(''); setAuthSuccess(''); }}
                className={`flex-1 py-1.5 rounded-lg transition-all ${authModalTab === 'verify' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Tasdiqlash
              </button>
            </div>

            {authError && <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">{authError}</div>}
            {authSuccess && <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300">{authSuccess}</div>}

            {/* Login Form */}
            {authModalTab === 'login' && (
              <form onSubmit={handleLogin} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Email</label>
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="name@business.uz"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Parol</label>
                  <input
                    required
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <button
                  disabled={authLoading}
                  className="w-full rounded-lg bg-indigo-600 py-2.5 font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-all mt-2"
                >
                  {authLoading ? 'Kirilmoqda…' : 'Kirish'}
                </button>
              </form>
            )}

            {/* Signup Form */}
            {authModalTab === 'signup' && (
              <form onSubmit={handleSignup} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Ismingiz yoki Tashkilot nomi</label>
                  <input
                    required
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Ali Valiyev"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Email (Tasdiqlash kodi yuboriladi)</label>
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="owner@business.uz"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Parol (kamida 12 belgi)</label>
                  <input
                    required
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <button
                  disabled={authLoading}
                  className="w-full rounded-lg bg-indigo-600 py-2.5 font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-all mt-2"
                >
                  {authLoading ? 'Yaratilmoqda…' : 'Hisob yaratish'}
                </button>
              </form>
            )}

            {/* Verification Form */}
            {authModalTab === 'verify' && (
              <form onSubmit={handleVerifyEmail} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Tasdiqlash kodi (Verification Token)</label>
                  <input
                    required
                    type="text"
                    value={verifyTokenInput}
                    onChange={e => setVerifyTokenInput(e.target.value)}
                    placeholder="32 belgili tasdiqlash kodi"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <button
                  disabled={authLoading}
                  className="w-full rounded-lg bg-emerald-600 py-2.5 font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition-all mt-2"
                >
                  {authLoading ? 'Tasdiqlanmoqda…' : 'Emailni tasdiqlash'}
                </button>
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    className="text-slate-400 hover:text-indigo-300 text-[11px] underline"
                  >
                    Kodni olmadingizmi? Qayta yuborish
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Selected Action Details Modal */}
      {selectedProviderActionId && (
        <div className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm">
          <div className="my-8 w-full max-w-3xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">Provider action tafsiloti</div>
                <h3 className="mt-1 font-mono text-xl font-bold text-white">{selectedProviderActionId}</h3>
              </div>
              <button onClick={() => setSelectedProviderActionId(null)} className="rounded-full bg-slate-800 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700">✕</button>
            </div>

            {actionDetailLoading || !selectedProviderAction ? (
              <div className="p-10 text-center text-sm text-slate-400">Action ma’lumotlari yuklanmoqda…</div>
            ) : (
              <div className="mt-5 space-y-5 text-xs">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl bg-slate-950 p-3"><div className="text-slate-500">Action status</div><div className="mt-1 font-bold text-white">{selectedProviderAction.status}</div></div>
                  <div className="rounded-xl bg-slate-950 p-3"><div className="text-slate-500">Payment status</div><div className="mt-1 font-bold text-emerald-300">{selectedProviderAction.paymentStatus}</div><div className="mt-1 text-[9px] text-slate-600">Provider tomonidan bildirilgan</div></div>
                  <div className="rounded-xl bg-slate-950 p-3"><div className="text-slate-500">Jami</div><div className="mt-1 font-bold text-white">{selectedProviderAction.total?.toLocaleString('uz-UZ')} {selectedProviderAction.currency}</div></div>
                  <div className="rounded-xl bg-slate-950 p-3"><div className="text-slate-500">Yangilangan</div><div className="mt-1 font-semibold text-white">{new Date(selectedProviderAction.updatedAt).toLocaleString('uz-UZ')}</div></div>
                </div>

                {selectedProviderAction.cancellationReason && (
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4">
                    <div className="font-bold text-rose-300">Bekor qilish yoki xatolik sababi</div>
                    <p className="mt-2 whitespace-pre-wrap text-rose-100">{selectedProviderAction.cancellationReason}</p>
                  </div>
                )}

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <h4 className="font-bold text-white">Buyurtma tarkibi</h4>
                    <div className="mt-3 space-y-2">
                      {(Array.isArray(selectedProviderAction.lines) ? selectedProviderAction.lines : []).map((line: any, index: number) => (
                        <div key={`${line.offeringId || 'line'}-${index}`} className="flex justify-between gap-4 border-b border-slate-800 pb-2 last:border-0">
                          <span>{line.quantity || 1} × {line.offeringTitle || line.name || line.offeringId || 'Offering'}</span>
                          <span className="font-semibold">{Number(line.lineTotal || line.total || 0).toLocaleString('uz-UZ')} {selectedProviderAction.currency}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <h4 className="font-bold text-white">Fulfillment</h4>
                    <dl className="mt-3 space-y-2 text-slate-300">
                      <div><dt className="text-slate-500">Mijoz</dt><dd>{selectedProviderAction.customer?.name}</dd></div>
                      <div><dt className="text-slate-500">Telefon</dt><dd>{selectedProviderAction.customer?.phone}</dd></div>
                      <div><dt className="text-slate-500">Manzil/yo‘nalish</dt><dd>{selectedProviderAction.destination || 'Ko‘rsatilmagan'}</dd></div>
                      <div><dt className="text-slate-500">Turi</dt><dd>{selectedProviderAction.fulfillmentType}</dd></div>
                    </dl>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-white">Action timeline</h4>
                  <div className="mt-3 space-y-2">
                    {(selectedProviderAction.timeline || []).map((event: any) => (
                      <div key={event.id} className="flex gap-3 rounded-xl border border-slate-800 bg-slate-950 p-3">
                        <div className="mt-1 h-2 w-2 flex-none rounded-full bg-indigo-400"/>
                        <div>
                          <div className="font-semibold text-slate-200">{event.status}: {event.description}</div>
                          <div className="mt-1 text-[10px] text-slate-500">{event.source} · {new Date(event.createdAt).toLocaleString('uz-UZ')}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Integration Kit Modal */}
      {aiKitOpen && (
        <div role="dialog" aria-modal="true" aria-labelledby="ai-kit-title" className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-black/85 p-4 backdrop-blur-md animate-fadeIn">
          <div className="my-8 w-full max-w-4xl rounded-2xl border border-indigo-500/30 bg-slate-900 p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
                    <Sparkles className="w-4 h-4 text-amber-300" />
                  </div>
                  <span className="text-xs font-mono text-indigo-400 uppercase tracking-widest font-bold">
                    AI Integration Kit
                  </span>
                </div>
                <h2 id="ai-kit-title" className="text-xl font-bold text-white">
                  {locale === 'uz' ? 'AI uchun tayyor prompt' : 'Ready prompt for your AI agent'}
                </h2>
                <p className="text-xs text-slate-400">
                  {locale === 'uz'
                    ? 'Nusxalang va istalgan coding agentga yuboring. U loyihangizni va contractni o‘zi tahlil qiladi.'
                    : 'Copy once and send it to any coding agent. It inspects your project and the contract itself.'}
                </p>
              </div>
              <button
                onClick={() => setAiKitOpen(false)}
                aria-label="AI Kit’ni yopish"
                className="rounded-full bg-slate-800 p-2 text-xs text-slate-400 hover:text-white hover:bg-slate-700 transition"
              >
                ✕
              </button>
            </div>

            {/* Universal prompt preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-400" /> AI uchun tayyor prompt (Markdown Preview)
                </label>
                <span className="text-[11px] font-mono text-slate-500">
                  Secretlarsiz · {provider?.slug || 'demo-provider'}
                </span>
              </div>
              <div className="relative rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
                <pre className="p-4 text-[11px] font-mono text-indigo-200 max-h-[52vh] overflow-y-auto whitespace-pre-wrap select-all">
                  {generateUniversalAiPrompt(provider, certReport)}
                </pre>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-800 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] leading-relaxed text-slate-400">
                Istalgan AI coding agentga yuboring. U avval loyiha stackini tahlil qiladi, so‘ng Zayuno contractiga mos o‘zgarishni qiladi.
              </p>
              <button
                type="button"
                onClick={copyAiPrompt}
                className="shrink-0 rounded-xl bg-indigo-600 px-5 py-3 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all hover:bg-indigo-500 flex items-center justify-center gap-2"
              >
                {aiCopiedToast ? <Check className="w-4 h-4 text-emerald-200" /> : <Copy className="w-4 h-4" />}
                {aiCopiedToast ? 'Prompt nusxalandi!' : 'Promptni nusxalash'}
              </button>
            </div>
            {aiCopiedToast && <p role="status" className="text-center text-xs font-medium text-emerald-300">{aiCopiedToast}</p>}
          </div>
        </div>
      )}

      {/* Webhook Secret Rotation Modal */}
      {rotatedSecretModal.isOpen && (
        <div className="fixed inset-0 z-[95] grid place-items-center overflow-y-auto bg-black/85 p-4 backdrop-blur-md animate-fadeIn">
          <div className="my-8 w-full max-w-lg rounded-2xl border border-indigo-500/30 bg-slate-900 p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div className="space-y-1">
                <span className="text-xs font-mono text-emerald-400 font-bold flex items-center gap-1.5">
                  <Webhook className="w-4 h-4" /> Webhook HMAC Secret Yangilandi
                </span>
                <h3 className="text-base font-bold text-white">Yangi Webhook Secret (Bir marta ko‘rsatiladi)</h3>
              </div>
              <button
                onClick={() => setRotatedSecretModal(m => ({ ...m, isOpen: false }))}
                className="rounded-full bg-slate-800 p-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-700 transition"
              >
                ✕
              </button>
            </div>

            {rotatedSecretModal.loading ? (
              <div className="py-8 text-center space-y-3">
                <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin mx-auto" />
                <p className="text-xs text-slate-300">Yangi secret yaratilmoqda va shifrlanmoqda...</p>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-300">
                    <AlertTriangle className="w-3.5 h-3.5" /> DIQQAT: Eski secret bekor qilindi
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Ushbu yangi secret faqat hozir ko‘rsatiladi. Uni darhol backend serveringizning <code className="bg-black/40 px-1 py-0.5 rounded font-mono text-amber-100">ZAYUNO_WEBHOOK_SECRET</code> muhit o‘zgaruvchisiga saqlang.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-400 text-[11px]">Yangi Webhook HMAC Secret:</label>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono">
                    <span className="text-white text-xs truncate mr-2 select-all">{rotatedSecretModal.secret}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(rotatedSecretModal.secret);
                        setRotatedSecretModal(m => ({ ...m, copied: true }));
                        setTimeout(() => setRotatedSecretModal(m => ({ ...m, copied: false })), 3000);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-sans text-xs font-semibold flex items-center gap-1.5 shrink-0"
                    >
                      {rotatedSecretModal.copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{rotatedSecretModal.copied ? 'Nusxalandi!' : 'Nusxa olish'}</span>
                    </button>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <span className="font-semibold text-slate-300 block">Dasturchi nima qilishi kerak?</span>
                  <p>1. Backend serveringizdagi <code className="text-indigo-300 font-mono">.env</code> faylida <code className="text-indigo-300 font-mono">ZAYUNO_WEBHOOK_SECRET</code> qiymatini yangilang.</p>
                  <p>2. Zayunoga yuboriladigan webhooklarni yangi secret bilan HMAC-SHA256 imzolashni tekshiring.</p>
                </div>

                <div className="pt-2 text-right">
                  <button
                    type="button"
                    onClick={() => setRotatedSecretModal(m => ({ ...m, isOpen: false }))}
                    className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
                  >
                    Yopish
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {issuedApiKeyModal.isOpen && (
        <div className="fixed inset-0 z-[95] grid place-items-center overflow-y-auto bg-black/85 p-4 backdrop-blur-md animate-fadeIn" role="dialog" aria-modal="true" aria-labelledby="issued-api-key-title">
          <div className="my-8 w-full max-w-lg rounded-2xl border border-violet-500/30 bg-slate-900 p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-violet-300"><Key className="h-3.5 w-3.5" /> Xavfsizlik kaliti</span>
                <h3 id="issued-api-key-title" className="text-base font-bold text-white">Yangi Zayuno API key</h3>
              </div>
              <button type="button" onClick={() => setIssuedApiKeyModal(modal => ({ ...modal, isOpen: false }))} className="rounded-full bg-slate-800 p-1.5 text-xs text-slate-400 transition hover:bg-slate-700 hover:text-white" aria-label="Kalit oynasini yopish">✕</button>
            </div>

            {issuedApiKeyModal.loading ? (
              <div className="space-y-3 py-8 text-center"><RefreshCw className="mx-auto h-6 w-6 animate-spin text-violet-300" /><p className="text-xs text-slate-300">Yangi kalit yaratilmoqda…</p></div>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-amber-100">
                  <div className="flex items-center gap-1.5 font-bold text-amber-300"><AlertTriangle className="h-3.5 w-3.5" /> Bu qiymat faqat bir marta ko‘rsatiladi</div>
                  <p className="mt-1 text-[11px] leading-relaxed">Kalitni darhol backend serveringizning <code className="rounded bg-black/30 px-1 font-mono">ZAYUNO_API_KEY</code> muhit o‘zgaruvchisiga saqlang. Uni frontend, Git, URL yoki AI chatga yubormang.</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-400">Zayuno developer API key</label>
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono">
                    <span className="min-w-0 truncate text-xs text-white select-all">{issuedApiKeyModal.apiKey}</span>
                    <button type="button" onClick={() => { navigator.clipboard.writeText(issuedApiKeyModal.apiKey); setIssuedApiKeyModal(modal => ({ ...modal, copied: true })); setTimeout(() => setIssuedApiKeyModal(modal => ({ ...modal, copied: false })), 3000); }} className="flex shrink-0 items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 font-sans text-xs font-semibold text-white transition hover:bg-violet-500">
                      {issuedApiKeyModal.copied ? <Check className="h-3.5 w-3.5 text-emerald-200" /> : <Copy className="h-3.5 w-3.5" />}{issuedApiKeyModal.copied ? 'Nusxalandi!' : 'Nusxa olish'}
                    </button>
                  </div>
                </div>
                <p className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-[11px] leading-5 text-slate-400">Bu kalit serveringizdan Zayuno REST API’ga so‘rov yuborish uchun ishlatiladi. Zayuno sizning API’ingizga yuboradigan <code className="text-sky-300">x-provider-api-key</code> bilan aralashtirmang.</p>
                <div className="pt-1 text-right"><button type="button" onClick={() => setIssuedApiKeyModal(modal => ({ ...modal, isOpen: false }))} className="rounded-xl bg-slate-800 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-700">Saqladim</button></div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {aiCopiedToast && (
        <div className="fixed bottom-6 right-6 z-[100] bg-emerald-950 border border-emerald-500/50 text-emerald-200 px-4 py-3 rounded-xl shadow-2xl text-xs font-medium flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{aiCopiedToast}</span>
        </div>
      )}

    </>
  );
}
