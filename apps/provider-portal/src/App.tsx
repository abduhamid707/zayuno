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
  Download,
  Building2,
  Phone,
  MessageCircle,
  CheckSquare,
  Activity,
  Eye,
  Sparkles,
  Bot,
  FileText
} from 'lucide-react';
import { ProtectedGate } from './ProtectedGate';
import {
  generateAiPrompt,
  generateContractJson,
  GOAL_OPTIONS,
  FRAMEWORK_OPTIONS,
  AiIntegrationGoal,
  AiFramework
} from './ai-integration-kit';
import {
  ProviderFulfillmentMode,
  ProviderType,
  requiresActiveLocations
} from '@zayuno/contracts';

const DocsViewer = lazy(() => import('./DocsViewer').then(module => ({ default: module.DocsViewer })));
const OnboardingWizard = lazy(() => import('./OnboardingWizard').then(module => ({ default: module.OnboardingWizard })));
const AuthView = lazy(() => import('./AuthView').then(module => ({ default: module.AuthView })));

const API_BASE =
  (import.meta as any).env?.VITE_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname.includes('zayuno.uz')
    ? 'https://api.zayuno.uz'
    : 'http://localhost:4000');
const SHOW_LOCAL_SIMULATOR = (import.meta as any).env?.VITE_ENABLE_LOCAL_SIMULATOR === 'true' || true;

const SANDBOX_PROVIDER_SLUG = 'sandbox-provider';

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
  const [token, setToken] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('zayuno_provider_token') || '' : ''));
  const [userProfile, setUserProfile] = useState<any>(() => {
    try {
      const raw = localStorage.getItem('zayuno_provider_user');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });

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
      setActiveTab(tab);
    };
    window.addEventListener('popstate', onBack);
    return () => window.removeEventListener('popstate', onBack);
  }, []);

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
  const [aiGoal, setAiGoal] = useState<AiIntegrationGoal>('create-new');
  const [aiFramework, setAiFramework] = useState<AiFramework>('nodejs-express');
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

  // URL Query Sync
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const tokenInUrl = url.searchParams.get('verifyToken') || url.searchParams.get('token');
    const emailInUrl = url.searchParams.get('email');

    if (tokenInUrl) {
      setVerifyTokenInput(tokenInUrl);
      if (emailInUrl) setEmail(emailInUrl);
      // If user is not on onboarding or auth tab, open auth modal
      const tabParam = url.searchParams.get('tab');
      if (tabParam !== 'onboarding' && tabParam !== 'auth') {
        setAuthModalTab('verify');
        setAuthModalOpen(true);
      }
    }
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
    document.title = (activeTab === 'docs' ? DOCS_MENU.find(doc => doc.id === selectedDoc)?.title || 'Hujjatlar' : activeTab === 'apps' ? 'Mening biznesim' : 'Provider workspace') + ' · Zayuno Partners';
  }, [activeTab, selectedDoc]);

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

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setAuthLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });
      const data = await response.json();
      if (!response.ok || !data.accessToken) {
        throw new Error(data.message || 'Kirishda xatolik yuz berdi.');
      }
      localStorage.setItem('zayuno_provider_token', data.accessToken);
      if (data.user) {
        localStorage.setItem('zayuno_provider_user', JSON.stringify(data.user));
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: verifyTokenInput.trim() })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Tasdiqlashda xatolik yuz berdi.');
      }
      // Auto-login if verify-email returns accessToken
      if (data.accessToken && data.user) {
        localStorage.setItem('zayuno_provider_token', data.accessToken);
        localStorage.setItem('zayuno_provider_user', JSON.stringify(data.user));
        setToken(data.accessToken);
        setUserProfile(data.user);
        setAuthModalOpen(false);
        setAuthSuccess('Email tasdiqlandi va tizimga kirdingiz!');
        refetchProvider();
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
    localStorage.removeItem('zayuno_provider_token');
    localStorage.removeItem('zayuno_provider_user');
    setToken('');
    setUserProfile(null);
    setActiveTab('overview');
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const { data: providerData, isPending: providerLoading, isError: providerFailed, refetch: refetchProvider } = useQuery({
    queryKey: ['provider-details', token],
    queryFn: async () => {
      try {
        const res = await apiFetch('/api/v1/providers/me');
        return res.json();
      } catch (error) {
        // A verified new account has no application yet; show its first business step.
        if (error instanceof Error && error.message === 'Your account is not assigned to a provider application yet.') return null;
        throw error;
      }
    },
    enabled: !!token
  });

  const providerRequiresLocations = requiresActiveLocations(
    providerData?.type as ProviderType | undefined,
    (providerData?.fulfillmentMode || providerData?.metadata?.fulfillmentMode) as ProviderFulfillmentMode | undefined
  );
  const dashboardProvider = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (providerData?.slug && dashboardProvider.current !== providerData.slug) {
      dashboardProvider.current = providerData.slug;
      setDashboardSection(providerData.status === 'ACTIVE' ? 'orders' : 'integration');
    }
  }, [providerData?.slug, providerData?.status]);
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
    enabled: !!token && !!providerData?.slug
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
      refetchProvider();
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
  const copyAiPrompt = async (target: 'chatgpt' | 'claude' | 'cursor' | 'codex') => {
    const prompt = generateAiPrompt({
      goal: aiGoal,
      framework: aiFramework,
      provider: provider,
      certReport: certReport,
      isAiTarget: target
    });
    try {
      await navigator.clipboard.writeText(prompt);
      const targetName = target === 'chatgpt' || target === 'codex' ? 'ChatGPT / Codex' : 'Claude / Cursor';
      setAiCopiedToast(`${targetName} uchun prompt nusxalandi!`);
      setTimeout(() => setAiCopiedToast(null), 3000);
    } catch {
      setAiCopiedToast('Nusxalash amalga oshmadi. Markdown faylini yuklab oling.');
      setTimeout(() => setAiCopiedToast(null), 3000);
    }
  };

  const downloadMarkdown = () => {
    const prompt = generateAiPrompt({
      goal: aiGoal,
      framework: aiFramework,
      provider: provider,
      certReport: certReport
    });
    const blob = new Blob([prompt], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zayuno-${provider?.slug || 'provider'}-integration.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadContractJson = () => {
    const jsonStr = generateContractJson(provider);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zayuno-${provider?.slug || 'provider'}-contract.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const [docsSearchRequest, setDocsSearchRequest] = useState(0);
  const openDocsSearch = () => { setActiveTab('docs'); setDocsSearchRequest(value => value + 1); };

  return (
    <>
      <WorkspaceShell activeTab={activeTab} onNavigate={setActiveTab} onSearch={openDocsSearch}
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
            onNavigate={(tab, step) => { if (step) setInitialOnboardingStep(step); if (tab === 'apps' && providerData?.status !== 'ACTIVE') setDashboardSection('integration'); setActiveTab(tab); }}
            onDoc={id => { setSelectedDoc(id); setActiveTab('docs'); }}
            onAiKit={() => setAiKitOpen(true)} />
        )}
        {activeTab === 'onboarding' && (
          <OnboardingWizard
            apiBase={API_BASE}
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
              refetchProvider();
            }}
            onProviderCreated={() => {
              refetchProvider();
            }}
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
        {/* AUTH / LOGIN VIEW                                                         */}
        {/* ========================================================================= */}
        {activeTab === 'auth' && (
          <AuthView
            apiBase={API_BASE}
            onLoginSuccess={(newToken, user) => {
              setToken(newToken);
              setUserProfile(user);
              if (typeof window !== 'undefined') {
                const url = new URL(window.location.href);
                url.searchParams.delete('verifyToken');
                url.searchParams.delete('token');
                window.history.replaceState({}, '', url.toString());
              }
              refetchProvider();
              setActiveTab('apps');
            }}
            onStartOnboarding={() => setActiveTab('onboarding')}
            onOpenDocs={() => setActiveTab('docs')}
            initialEmail={initialEmailParam}
            initialMode={initialVerifyTokenParam ? 'verify' : 'login'}
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
                onLoginClick={() => setActiveTab('auth')}
                onSignupClick={() => setActiveTab('onboarding')}
                onDocsClick={() => setActiveTab('docs')}
              />
            ) : providerLoading ? (
              <div className="workspace-loading" role="status"><RefreshCw className="animate-spin" size={20} /> Provider profili yuklanmoqda…</div>
            ) : providerFailed ? (
              <div className="workspace-notice" role="alert">Provider profilini yuklab bo‘lmadi.<button onClick={() => refetchProvider()}>Qayta urinish</button></div>
            ) : !provider ? (
              <div className="p-8 rounded-3xl bg-slate-950 border border-slate-800 text-center space-y-4 max-w-lg mx-auto animate-fadeIn">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/20">
                  <Building2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white">Sizda hali ro‘yxatdan o‘tgan provider yo‘q</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Zayuno tarmog‘iga xizmat yoki biznesingizni ulash uchun bir necha daqiqalik onboarding wizardini yakunlang.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('onboarding')}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition flex items-center gap-2 mx-auto"
                >
                  Onboardingni boshlash / davom ettirish <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              /* EXISTING PROVIDER DASHBOARD */
              <div className="space-y-6">
                {/* Header with Provider Brand & Live Status */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-extrabold text-white tracking-tight">{provider.name}</h2>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${
                        provider.status === 'ACTIVE'
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : provider.status === 'DRAFT'
                          ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                      }`}>
                        {provider.status === 'ACTIVE' ? '● JONLI / ACTIVE' : `● ${provider.status}`}
                      </span>
                      {provider.metadata?.isCertified && (
                        <span className="bg-sky-500/15 text-sky-300 border border-sky-500/30 px-2 py-0.5 rounded-full text-[11px] font-medium flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> Sertifikatlangan
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

                {/* Health / Temporary Unavailability Banner */}
                {provider.status !== 'ACTIVE' && (
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
                    <span>⚙️ API Sozlamalari & Credentiallar</span>
                  </button>
                </nav>

                <section hidden={dashboardSection !== 'integration'} aria-label="API sozlamalari va nashr" className="space-y-6">
                  {/* AI Quick Handoff Banner */}
                  <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-slate-900/60 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                        <Sparkles className="w-5 h-5 text-amber-300" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <span>AI Agent bilan 5 daqiqada integratsiya</span>
                          <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-mono px-2 py-0.5 rounded-full border border-indigo-500/30">Claude · Cursor · Codex</span>
                        </h4>
                        <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                          AI agentingiz bormi? Zayuno AI Kit orqali tayyor brief va OpenAPI schema oling. Agentingiz backend kodingizga to‘liq mos keluvchi Zayuno adapterini mustaqil yozib beradi.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setAiKitOpen(true)}
                        className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 transition flex items-center gap-2"
                      >
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        AI Kit’ni ochish
                      </button>
                      <a
                        href="/llms.txt"
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-2.5 text-xs font-medium text-slate-200 transition flex items-center gap-1.5"
                      >
                        <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                        /llms.txt
                      </a>
                    </div>
                  </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Provider Info Card */}
                  <div className="lg:col-span-1 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-indigo-400" /> Provider account
                    </h3>
                    <p className="text-xs leading-5 text-slate-400">
                      Bu account <strong className="text-slate-200">{provider.name}</strong> provideriga biriktirilgan.
                    </p>
                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs space-y-1">
                      <div><span className="text-slate-500">Status:</span> <strong className="ml-1 text-indigo-300">{provider.status}</strong></div>
                      <div><span className="text-slate-500">Review:</span> <strong className="ml-1 text-indigo-300">{provider.metadata?.reviewStatus || 'DRAFT'}</strong></div>
                      <div><span className="text-slate-500">Sertifikatlangan:</span> <strong className="ml-1 text-emerald-400">{provider.metadata?.isCertified ? 'HA' : 'YO‘Q'}</strong></div>
                    </div>
                  </div>

                  {/* Integration Settings Form */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="bg-slate-900/60 border border-indigo-500/30 rounded-2xl p-6 space-y-5">
                      <div>
                        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                          <Globe className="w-4 h-4 text-indigo-400" /> Integration sozlamalari
                        </h3>
                        <p className="mt-1 text-xs text-slate-400">
                          Provider backend manzili va uning credentiallarini shu yerda ulang. Saqlanganda oldingi certification bekor qilinadi.
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs text-slate-400">Provider API Base URL (HTTPS)</label>
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
                        {integrationForm.baseUrl.trim() && !integrationForm.baseUrl.toLowerCase().includes('sandbox') && (
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
                      </div>

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
                                <span>Provider API key / token</span>
                                <span title="Bu sizning serveringizni Zayuno so‘rovlaridan himoya qiladigan kalit. Uni sizning dasturchingiz backend sozlamalarida yaratadi va Zayuno portalga bir marta kiritadi." className="cursor-help text-slate-500 hover:text-indigo-400">
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
                                Qayerdan olaman? →
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
                                <span>Webhook HMAC secret</span>
                                <span title="Bu kalit Zayuno’ga yuboriladigan order/status webhooklar haqiqatan sizning serveringizdan kelganini tasdiqlaydi." className="cursor-help text-slate-500 hover:text-emerald-400">
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
                                title="Webhook HMAC secretni xavfsiz almashtirish"
                              >
                                <RefreshCw className="w-3 h-3" />
                                <span>Yangilash</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-white">Capabilities & Profile</p>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setIntegrationForm(current => ({
                                ...current,
                                capabilities: Array.from(new Set([
                                  ...READONLY_CAPABILITIES,
                                  ...(providerRequiresLocations ? ['LOCATIONS'] : [])
                                ]))
                              }))}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-mono border border-sky-500/30 bg-sky-950/30 text-sky-300 hover:bg-sky-900/40 transition"
                            >
                              Discovery / Read-only
                            </button>
                            <button
                              type="button"
                              onClick={() => setIntegrationForm(current => ({
                                ...current,
                                capabilities: Array.from(new Set([
                                  ...TRANSACTIONAL_MANDATORY_CAPABILITIES,
                                  ...(providerRequiresLocations ? ['LOCATIONS'] : [])
                                ]))
                              }))}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-mono border border-emerald-500/30 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-900/40 transition"
                            >
                              Transactional
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {PROVIDER_CAPABILITIES.map(capability => {
                            const isReadOnlyMandatory = READONLY_CAPABILITIES.includes(capability);
                            const isLocationMandatory = capability === 'LOCATIONS' && providerRequiresLocations;
                            const isTransactionalMandatory = TRANSACTIONAL_MANDATORY_CAPABILITIES.includes(capability) || isLocationMandatory;
                            const checked = integrationForm.capabilities.includes(capability);
                            return (
                              <label key={capability} className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] cursor-pointer transition ${checked ? (isTransactionalMandatory ? 'border-indigo-500/40 bg-indigo-950/40 text-indigo-200' : 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300') : 'border-slate-800 bg-slate-950 text-slate-400'}`}>
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={provider.status === 'ACTIVE' || isLocationMandatory}
                                  onChange={event => setIntegrationForm(current => ({
                                    ...current,
                                    capabilities: event.target.checked
                                      ? [...new Set([...current.capabilities, capability])]
                                      : current.capabilities.filter(value => value !== capability)
                                  }))}
                                />
                                {capability}
                                {isReadOnlyMandatory && <span className="text-[9px] text-sky-400 font-mono">RO</span>}
                                {isLocationMandatory && <span className="text-[9px] text-amber-300 font-mono">REQUIRED</span>}
                              </label>
                            );
                          })}
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">
                          Discovery profili uchun [METADATA, HEALTH, CATALOG] yetarli. Tranzaksion xizmatlar uchun barcha 7 ta capability talab qilinadi.
                          {providerRequiresLocations && ' Bu jismoniy xizmat bo‘lgani uchun LOCATIONS ham majburiy va avtomatik saqlanadi.'}
                        </p>
                      </div>

                      <button
                        onClick={() => updateIntegrationMutation.mutate()}
                        disabled={updateIntegrationMutation.isPending || provider.status === 'ACTIVE' || !integrationForm.baseUrl.trim()}
                        className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-xl text-xs transition-all"
                      >
                        {updateIntegrationMutation.isPending ? 'Tekshirilmoqda va saqlanmoqda...' : 'Integrationni saqlash'}
                      </button>
                      {provider.status === 'ACTIVE' && <p className="text-xs text-amber-300">ACTIVE provider sozlamalarini o‘zgartirishdan oldin Operations uni suspend qilishi kerak.</p>}
                      {updateIntegrationMutation.isError && <p className="text-xs text-rose-400">{(updateIntegrationMutation.error as Error).message}</p>}
                      {updateIntegrationMutation.isSuccess && <p className="text-xs text-emerald-400">Integration saqlandi. Endi certificationni qayta ishga tushiring.</p>}
                    </div>

                    {/* Default Provider Review Card */}
                    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-base font-semibold text-white">{provider.name}</h3>
                          <p className="text-xs text-slate-400 font-mono">Slug: {provider.slug}</p>
                        </div>
                        <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2.5 py-1 rounded-full border border-emerald-500/30">
                          {provider.status}
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
                    </div>
                  </div>
                </div>

                {/* Actions Dashboard Table */}
                </section>
                <section hidden={dashboardSection !== 'orders'} aria-label="Buyurtmalar">
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
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: INTERACTIVE SANDBOX SIMULATOR                                      */}
        {/* ========================================================================= */}
        {activeTab === 'sandbox' && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-xl font-bold text-white">Interactive Sandbox Action Simulator</h2>
              <p className="text-xs text-slate-400">Step through the complete end-to-end lifecycle without touching production systems.</p>
            </div>

            {/* Stepper Header */}
            <div className="grid grid-cols-5 gap-2 text-xs font-mono">
              {[
                { s: 1, label: '1. Discovery' },
                { s: 2, label: '2. Quote' },
                { s: 3, label: '3. Create Action' },
                { s: 4, label: '4. Pay Handoff' },
                { s: 5, label: '5. Completed' }
              ].map(step => (
                <div
                  key={step.s}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    sandboxStep === step.s
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow'
                      : sandboxStep > step.s
                      ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30'
                      : 'bg-slate-900/40 text-slate-500 border-slate-800'
                  }`}
                >
                  {step.label}
                </div>
              ))}
            </div>

            {sandboxError && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
                {sandboxError}
              </div>
            )}

            {/* Simulator Box */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-6">
              {sandboxStep === 1 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-white">Step 1: AI Provider Discovery</h3>
                  <p className="text-xs text-slate-400">The AI agent calls <code className="text-indigo-300 font-mono">find_providers(category: "general_services")</code> to discover eligible providers.</p>
                  <button
                    onClick={runSandboxDiscovery}
                    disabled={sandboxLoading}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-4 py-2 rounded-xl transition-all flex items-center gap-2"
                  >
                    {sandboxLoading ? 'Discovering...' : 'Simulate Provider Discovery'}
                  </button>
                </div>
              )}

              {sandboxStep === 2 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-white">Step 2: Request Verified Pricing Quote</h3>
                  <p className="text-xs text-slate-400">The AI agent calculates an exact quote for 2 units of the Standard Package.</p>
                  <button
                    onClick={runSandboxQuote}
                    disabled={sandboxLoading}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-4 py-2 rounded-xl transition-all flex items-center gap-2"
                  >
                    {sandboxLoading ? 'Calculating Quote...' : 'Simulate Request Quote'}
                  </button>
                </div>
              )}

              {sandboxStep === 3 && sandboxQuote && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-white">Step 3: User Confirms Quote & Creates Action</h3>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 space-y-1">
                    <div>Quote ID: <span className="text-indigo-400">{sandboxQuote.quoteId || sandboxQuote.id}</span></div>
                    <div>Total Price: <span className="text-emerald-400">{sandboxQuote.totalAmount || sandboxQuote.total} {sandboxQuote.currency}</span></div>
                  </div>
                  <button
                    onClick={runSandboxCreateAction}
                    disabled={sandboxLoading}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium px-4 py-2 rounded-xl transition-all flex items-center gap-2"
                  >
                    {sandboxLoading ? 'Creating Action...' : 'Simulate User Confirmation & Action Dispatch'}
                  </button>
                </div>
              )}

              {sandboxStep === 4 && sandboxAction && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-white">Step 4: Payment Handoff via NextAction</h3>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 space-y-1.5">
                    <div>Action Reference: <span className="text-indigo-400">{sandboxAction.actionId || sandboxAction.publicId || sandboxAction.id}</span></div>
                    <div>Status: <span className="text-amber-400">{sandboxAction.status}</span></div>
                    <div>
                      NextAction Checkout URL: <br />
                      <a
                        href={sandboxAction.nextAction?.url || sandboxAction.paymentUrl || 'https://sandbox.zayuno.uz/checkout'}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sky-400 underline"
                      >
                        {sandboxAction.nextAction?.url || sandboxAction.paymentUrl}
                      </a>
                    </div>
                  </div>
                  <button
                    onClick={runSandboxWebhook}
                    disabled={sandboxLoading}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-4 py-2 rounded-xl transition-all flex items-center gap-2"
                  >
                    {sandboxLoading ? 'Processing Settlement...' : 'Simulate Customer Payment & Dispatch Webhook'}
                  </button>
                </div>
              )}

              {sandboxStep === 5 && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-xl flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-semibold text-emerald-300">End-to-End Sandbox Simulation Completed!</h4>
                      <p className="text-xs text-slate-300">Action state successfully progressed from Creation → Awaiting Payment → Webhook Settlement → Completed.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setSandboxStep(1); setSandboxQuote(null); setSandboxAction(null); }}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-4 py-2 rounded-xl border border-slate-700"
                  >
                    Reset Simulation
                  </button>
                </div>
              )}
            </div>
          </div>
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
                onLoginClick={() => setActiveTab('auth')}
                onSignupClick={() => setActiveTab('onboarding')}
                onDocsClick={() => setActiveTab('docs')}
              />
            ) : !provider?.slug ? (
              <div className="p-12 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-4 max-w-md mx-auto my-12">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/20">
                  <Building2 className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-white">Avval provider app yarating</h3>
                <p className="text-xs text-slate-400">Certification testlarini o‘tkazish uchun avval Apps bo‘limida provider arizangizni yarating.</p>
                <button
                  onClick={() => setActiveTab('apps')}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition-all inline-flex items-center gap-2"
                >
                  Yangi App yaratish <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white">Automated Capability Certification</h2>
                    <p className="text-xs text-slate-400">Verifies provider compliance against mandatory contracts, idempotency, payment handoffs, and webhook signatures.</p>
                  </div>
                  <button
                    onClick={() => certifyMutation.mutate()}
                    disabled={certifyMutation.isPending || !provider?.slug}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium px-4 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/30 flex items-center gap-2"
                  >
                    {certifyMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    Run Full Certification
                  </button>
                </div>

                {certReport ? (
                  <div className="space-y-6">
                    {/* Result Banner */}
                    <div className={`p-6 rounded-2xl border flex items-center justify-between ${
                      certReport.isCertified
                        ? 'bg-emerald-950/40 border-emerald-500/40'
                        : 'bg-rose-950/40 border-rose-500/40'
                    }`}>
                      <div className="flex items-center gap-3">
                        {certReport.isCertified ? (
                          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                        ) : (
                          <XCircle className="w-8 h-8 text-rose-400" />
                        )}
                        <div>
                          <h3 className="text-base font-bold text-white">
                            {certReport.isCertified ? 'Provider Integration Certified' : 'Certification Tests Failed'}
                          </h3>
                          <p className="text-xs text-slate-300">
                            {certReport.passedCount} passed, {certReport.failedCount} failed, {certReport.skippedCount || 0} blocked. Production ready: {certReport.isProductionReady ? 'YES' : 'NO'}.
                          </p>
                        </div>
                      </div>
                      <span className={`text-xs font-mono font-bold px-3 py-1 rounded-full border ${
                        certReport.isCertified
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                      }`}>
                        {certReport.isCertified ? 'CERTIFIED' : 'FAILED'}
                      </span>
                    </div>

                    {/* Test Results Table */}
                    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                          <tr>
                            <th className="p-3.5">Capability & Test</th>
                            <th className="p-3.5">Category</th>
                            <th className="p-3.5">Duration</th>
                            <th className="p-3.5 text-right">Result</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {certReport.tests.map((t: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-800/40 transition">
                              <td className="p-3.5">
                                <div className="font-semibold text-white">{t.name}</div>
                                <div className="text-[11px] text-slate-400 font-mono">{t.capability}</div>
                                {t.error && (
                                  <div className="mt-1 text-[11px] text-rose-300 bg-rose-950/30 border border-rose-500/20 p-1.5 rounded-lg">
                                    {t.error}
                                  </div>
                                )}
                                {t.issue && (
                                  <div className="mt-1 text-[10px] text-slate-300 space-y-0.5">
                                    <div><b>Root cause:</b> {t.issue.rootCause}</div>
                                    {t.endpoint && <div><b>Endpoint:</b> <code>{t.endpoint}</code></div>}
                                    {t.issue.path && <div><b>Path:</b> <code>{t.issue.path}</code></div>}
                                    {t.issue.expected && <div><b>Expected:</b> {t.issue.expected}</div>}
                                    {t.issue.received && <div><b>Received:</b> {t.issue.received}</div>}
                                  </div>
                                )}
                                {t.blockedBy?.length > 0 && <div className="mt-1 text-[10px] text-amber-300">Blocked by: {t.blockedBy.join(', ')}</div>}
                              </td>
                              <td className="p-3.5">
                                {t.isMandatory ? (
                                  <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full text-[10px] font-mono">
                                    MANDATORY
                                  </span>
                                ) : (
                                  <span className="bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded-full text-[10px] font-mono">
                                    OPTIONAL
                                  </span>
                                )}
                              </td>
                              <td className="p-3.5 font-mono text-slate-400">{t.durationMs}ms</td>
                              <td className="p-3.5 text-right">
                                {(t.status === 'PASS' || t.passed) ? (
                                  <span className="text-emerald-400 font-semibold flex items-center justify-end gap-1">
                                    <Check className="w-3.5 h-3.5" /> PASS
                                  </span>
                                ) : t.status === 'SKIPPED' ? (
                                  <span className="text-amber-400 font-semibold flex items-center justify-end gap-1">
                                    <AlertTriangle className="w-3.5 h-3.5" /> BLOCKED
                                  </span>
                                ) : (
                                  <span className="text-rose-400 font-semibold flex items-center justify-end gap-1">
                                    <XCircle className="w-3.5 h-3.5" /> FAIL
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-900/40 border border-slate-800 border-dashed rounded-2xl p-12 text-center space-y-3">
                    <ShieldCheck className="w-12 h-12 text-slate-600 mx-auto" />
                    <h3 className="text-sm font-semibold text-slate-300">Ready to execute compliance tests</h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Click the button above to run the automated test suite against <code className="text-indigo-400 font-mono">{provider?.slug || 'your provider'}</code>.
                    </p>
                  </div>
                )}
              </div>
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
                onLoginClick={() => setActiveTab('auth')}
                onSignupClick={() => setActiveTab('onboarding')}
                onDocsClick={() => setActiveTab('docs')}
              />
            ) : !provider?.slug ? (
              <div className="p-12 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-4 max-w-md mx-auto my-12">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/20">
                  <Building2 className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-white">Avval provider app yarating</h3>
                <p className="text-xs text-slate-400">Live inspectorni ishlatish uchun avval Apps bo‘limida provider arizangizni yarating.</p>
                <button
                  onClick={() => setActiveTab('apps')}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition-all inline-flex items-center gap-2"
                >
                  Yangi App yaratish <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <Activity className="w-5 h-5 text-indigo-400" /> Live Provider API & Payload Inspector
                    </h2>
                    <p className="text-xs text-slate-400">
                      Real-time request/response audit logs, latencies, trace IDs, and sanitized payloads for {provider?.name || 'your provider'}.
                    </p>
                  </div>
                  <button
                    onClick={() => refetchLogs()}
                    disabled={logsLoading}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${logsLoading ? 'animate-spin' : ''}`} />
                    Yangilash
                  </button>
                </div>

                {/* Filter Bar */}
                <div className="grid gap-2 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:grid-cols-3 md:grid-cols-4">
                  <input
                    type="text"
                    placeholder="Trace ID bo‘yicha qidirish..."
                    value={inspectorFilters.traceId}
                    onChange={e => setInspectorFilters(cur => ({ ...cur, traceId: e.target.value }))}
                    className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <input
                    type="date"
                    value={inspectorFilters.from}
                    onChange={e => setInspectorFilters(cur => ({ ...cur, from: e.target.value }))}
                    className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                  <input
                    type="date"
                    value={inspectorFilters.to}
                    onChange={e => setInspectorFilters(cur => ({ ...cur, to: e.target.value }))}
                    className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={() => setInspectorFilters({ traceId: '', from: '', to: '' })}
                    className="rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-2 text-xs text-slate-300 transition"
                  >
                    Filtrni tozalash
                  </button>
                </div>

                {/* Logs Table */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                      <tr>
                        <th className="p-3.5">Method & Endpoint</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5">Latency</th>
                        <th className="p-3.5">Trace ID</th>
                        <th className="p-3.5">Vaqt</th>
                        <th className="p-3.5 text-right">Amal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {logsLoading ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-400 font-sans">
                            Loglar yuklanmoqda...
                          </td>
                        </tr>
                      ) : !providerLogsData?.logs || providerLogsData.logs.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-400 font-sans">
                            Hozircha hech qanday integration yoki webhook chaqiruvlari qayd etilmagan.
                          </td>
                        </tr>
                      ) : (
                        providerLogsData.logs.map((log: any) => (
                          <tr key={log.id} className="hover:bg-slate-800/40 transition">
                            <td className="p-3.5">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  log.method === 'POST' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-sky-500/20 text-sky-300'
                                }`}>
                                  {log.method || 'EVENT'}
                                </span>
                                <span className="font-semibold text-slate-200">{log.endpoint || log.event}</span>
                              </div>
                              <span className="text-[10px] text-slate-500 font-sans block mt-0.5">{log.source}</span>
                            </td>
                            <td className="p-3.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                log.statusCode >= 200 && log.statusCode < 300
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                  : log.statusCode >= 400 && log.statusCode < 500
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                  : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                              }`}>
                                {log.statusCode || 'ERR'}
                              </span>
                            </td>
                            <td className="p-3.5 text-slate-400">
                              {log.durationMs != null ? `${log.durationMs}ms` : '—'}
                            </td>
                            <td className="p-3.5 text-indigo-300 text-[11px]">
                              {log.traceId ? (
                                <div className="flex items-center gap-1">
                                  <span className="truncate max-w-[120px]">{log.traceId}</span>
                                  <button
                                    onClick={() => copyToClipboard(log.traceId, log.id)}
                                    title="Nusxalash"
                                    className="text-slate-500 hover:text-slate-300"
                                  >
                                    {copiedText === log.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                </div>
                              ) : '—'}
                            </td>
                            <td className="p-3.5 text-right">
                              <button
                                onClick={() => setSelectedInspectorLog(log)}
                                className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-lg text-xs font-sans font-medium transition flex items-center gap-1 ml-auto"
                              >
                                <Eye className="w-3.5 h-3.5" /> Ko‘rish
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
        </Suspense>
      </WorkspaceShell>

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

      {/* Selected Inspector Log Modal */}
      {selectedInspectorLog && (
        <div className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="my-8 w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">Payload Inspector</span>
                <h3 className="text-lg font-bold text-white font-mono flex items-center gap-2 mt-0.5">
                  <span className="text-indigo-400">{selectedInspectorLog.method || 'POST'}</span> {selectedInspectorLog.endpoint || selectedInspectorLog.event}
                </h3>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  Trace ID: {selectedInspectorLog.traceId || 'N/A'} · Status: {selectedInspectorLog.statusCode} · {selectedInspectorLog.durationMs}ms
                </p>
              </div>
              <button
                onClick={() => setSelectedInspectorLog(null)}
                className="rounded-full bg-slate-800 p-1.5 text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {selectedInspectorLog.errorMessage && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-sans">
                <strong>Error:</strong> {selectedInspectorLog.errorMessage}
              </div>
            )}

            <div className="space-y-4 text-xs font-mono">
              {selectedInspectorLog.requestBody && (
                <div>
                  <div className="flex justify-between items-center text-slate-400 mb-1 font-sans">
                    <span>Request Body (Sanitized & Redacted):</span>
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(selectedInspectorLog.requestBody, null, 2), 'req-body')}
                      className="text-[11px] text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      {copiedText === 'req-body' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />} Nusxalash
                    </button>
                  </div>
                  <pre className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-slate-300 max-h-48 overflow-y-auto whitespace-pre-wrap break-all">
                    {JSON.stringify(selectedInspectorLog.requestBody, null, 2)}
                  </pre>
                </div>
              )}

              {selectedInspectorLog.responseBody && (
                <div>
                  <div className="flex justify-between items-center text-slate-400 mb-1 font-sans">
                    <span>Response Body (Sanitized & Redacted):</span>
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(selectedInspectorLog.responseBody, null, 2), 'res-body')}
                      className="text-[11px] text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      {copiedText === 'res-body' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />} Nusxalash
                    </button>
                  </div>
                  <pre className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-emerald-300 max-h-48 overflow-y-auto whitespace-pre-wrap break-all">
                    {JSON.stringify(selectedInspectorLog.responseBody, null, 2)}
                  </pre>
                </div>
              )}

              {selectedInspectorLog.payload && (
                <div>
                  <div className="flex justify-between items-center text-slate-400 mb-1 font-sans">
                    <span>Webhook Event Payload (Sanitized & Redacted):</span>
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(selectedInspectorLog.payload, null, 2), 'webhook-payload')}
                      className="text-[11px] text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      {copiedText === 'webhook-payload' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />} Nusxalash
                    </button>
                  </div>
                  <pre className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-cyan-300 max-h-48 overflow-y-auto whitespace-pre-wrap break-all">
                    {JSON.stringify(selectedInspectorLog.payload, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedInspectorLog(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl text-xs font-sans font-medium"
              >
                Yopish
              </button>
            </div>
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
                  {locale === 'uz' ? 'AI bilan integratsiya qilish (Copy for AI)' : 'AI Integration Assistant'}
                </h2>
                <p className="text-xs text-slate-400">
                  {locale === 'uz'
                    ? 'ChatGPT, Claude, Cursor yoki Codex uchun tayyor kontekst, kontrakt va vazifa promptini oling.'
                    : 'Generate complete prompt, contracts, and code templates for ChatGPT, Claude, Cursor, or Codex.'}
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

            {/* Zero Secrets Guarantee Alert */}
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3.5 flex items-center justify-between text-xs text-emerald-300">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong>Agentga tayyor kontekst:</strong> Credential maydonlari chiqarib tashlanadi. Yuborishdan oldin previewni ko‘rib chiqing; haqiqiy kalitlarni o‘zingiz qo‘shmang.
                </span>
              </div>
              <span className="text-[10px] font-mono bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
                BRIEF
              </span>
            </div>

            {/* Step 1: Goal Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-white">
                1. Integratsiya maqsadi (Goal):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {GOAL_OPTIONS.map(g => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setAiGoal(g.id)}
                    className={`p-3 rounded-xl border text-left text-xs transition-all flex flex-col justify-between gap-1.5 ${
                      aiGoal === g.id
                        ? 'border-indigo-500 bg-indigo-950/40 text-white shadow-lg shadow-indigo-500/10'
                        : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-semibold text-slate-200 flex items-center justify-between">
                      <span>{locale === 'uz' ? g.labelUz : g.labelEn}</span>
                      {aiGoal === g.id && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2">
                      {locale === 'uz' ? g.descriptionUz : g.descriptionEn}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Framework Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-white">
                2. Texnologik stek / Framework:
              </label>
              <div className="flex flex-wrap gap-2">
                {FRAMEWORK_OPTIONS.map(fw => (
                  <button
                    key={fw.id}
                    type="button"
                    onClick={() => setAiFramework(fw.id)}
                    className={`px-3 py-2 rounded-xl border text-xs font-medium transition-all flex items-center gap-2 ${
                      aiFramework === fw.id
                        ? 'border-sky-500 bg-sky-950/40 text-white shadow-md shadow-sky-500/10'
                        : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <span>{fw.name}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      aiFramework === fw.id ? 'bg-sky-500/20 text-sky-300' : 'bg-slate-900 text-slate-500'
                    }`}>
                      {fw.tag}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3: Generated Prompt Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-400" /> AI uchun tayyor prompt (Markdown Preview):
                </label>
                <span className="text-[11px] font-mono text-slate-500">
                  Provider: {provider?.slug || 'demo-provider'}
                </span>
              </div>
              <div className="relative rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
                <pre className="p-4 text-[11px] font-mono text-indigo-200 max-h-64 overflow-y-auto whitespace-pre-wrap select-all">
                  {generateAiPrompt({
                    goal: aiGoal,
                    framework: aiFramework,
                    provider: provider,
                    certReport: certReport
                  })}
                </pre>
              </div>
            </div>

            {/* Step 4: Action Buttons Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => copyAiPrompt('chatgpt')}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/30 flex items-center gap-2"
                >
                  <Bot className="w-4 h-4 text-emerald-300" /> ChatGPT / Codex uchun nusxalash
                </button>
                <button
                  type="button"
                  onClick={() => copyAiPrompt('claude')}
                  className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-purple-600/30 flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" /> Claude / Cursor uchun nusxalash
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={downloadMarkdown}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-700 transition-all flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Markdown (.md)
                </button>
                <button
                  type="button"
                  onClick={downloadContractJson}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-700 transition-all flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Contract (.json)
                </button>
              </div>
            </div>
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
