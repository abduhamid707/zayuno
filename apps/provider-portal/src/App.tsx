import React, { useEffect, useState } from 'react';
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
  Download,
  Building2,
  Phone,
  MessageCircle,
  CheckSquare,
  Activity,
  Eye
} from 'lucide-react';
import { DocsViewer } from './DocsViewer';

const API_BASE =
  (import.meta as any).env?.VITE_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname.includes('zayuno.uz')
    ? 'https://api.zayuno.uz'
    : 'http://localhost:4000');
const SHOW_LOCAL_SIMULATOR = (import.meta as any).env?.VITE_ENABLE_LOCAL_SIMULATOR === 'true' || true;

const SANDBOX_DEMO_API_KEY = 'zy_live_agent_secret_key_12345';
const SANDBOX_PROVIDER_SLUG = 'sandbox-provider';

const PROVIDER_CAPABILITIES = [
  'METADATA', 'HEALTH', 'LOCATIONS', 'CATALOG', 'SEARCH', 'QUOTE',
  'ACTION_CREATE', 'ACTION_STATUS', 'ACTION_CANCEL', 'PAYMENT_OPTIONS', 'WEBHOOK'
];
const MANDATORY_PROVIDER_CAPABILITIES = new Set([
  'METADATA', 'HEALTH', 'CATALOG', 'QUOTE', 'ACTION_CREATE', 'ACTION_STATUS', 'WEBHOOK'
]);

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

  // Active Tab & Docs sync
  const [activeTab, setActiveTab] = useState<'overview' | 'docs' | 'apps' | 'sandbox' | 'certification' | 'inspector'>(() => {
    if (typeof window === 'undefined') return 'overview';
    const params = new URLSearchParams(window.location.search);
    if (params.has('doc')) return 'docs';
    const tabParam = params.get('tab');
    if (tabParam === 'docs' || tabParam === 'apps' || tabParam === 'sandbox' || tabParam === 'certification' || tabParam === 'inspector') {
      return tabParam as any;
    }
    return 'overview';
  });

  const [selectedDoc, setSelectedDoc] = useState<string>(() => {
    if (typeof window === 'undefined') return 'getting-started';
    return new URLSearchParams(window.location.search).get('doc') || 'getting-started';
  });

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

  const [createdCredentials, setCreatedCredentials] = useState<any>(null);
  const [selectedProviderActionId, setSelectedProviderActionId] = useState<string | null>(null);
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

  // URL Query Sync
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const tokenInUrl = url.searchParams.get('verifyToken');
    const emailInUrl = url.searchParams.get('email');

    if (tokenInUrl) {
      setVerifyTokenInput(tokenInUrl);
      if (emailInUrl) setEmail(emailInUrl);
      setAuthModalTab('verify');
      setAuthModalOpen(true);
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
    window.history.replaceState({}, '', url);
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
      setAuthSuccess('Email muvaffaqiyatli tasdiqlandi! Endi parolingiz bilan tizimga kirishingiz mumkin.');
      setAuthModalTab('login');
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

  const { data: providerData, refetch: refetchProvider } = useQuery({
    queryKey: ['provider-details', token],
    queryFn: async () => {
      const res = await apiFetch('/api/v1/providers/me');
      return res.json();
    },
    enabled: !!token
  });

  const { data: providerDashboard, isFetching: dashboardFetching, refetch: refetchDashboard } = useQuery({
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
    setIntegrationForm(current => ({
      ...current,
      baseUrl: providerData.baseUrl || '',
      authMethod: providerData.authMethod || 'API_KEY',
      capabilities: providerData.capabilities?.length ? providerData.capabilities : [...PROVIDER_CAPABILITIES],
      apiSecret: '',
      webhookSecret: ''
    }));
  }, [providerData]);

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
      const payload: any = {
        baseUrl: integrationForm.baseUrl.trim(),
        authMethod: integrationForm.authMethod,
        capabilities: [...new Set([...integrationForm.capabilities, ...MANDATORY_PROVIDER_CAPABILITIES])]
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

  // Sandbox simulation actions
  const runSandboxDiscovery = async () => {
    setSandboxLoading(true);
    setSandboxError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/providers/find?category=general_services`, {
        headers: {
          'x-api-key': SANDBOX_DEMO_API_KEY
        }
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `Discovery failed with status ${res.status}`);
      }
      await res.json();
      setSandboxStep(2);
    } catch (e: any) {
      setSandboxError(e.message || 'Discovery xatosi');
    } finally {
      setSandboxLoading(false);
    }
  };

  const runSandboxQuote = async () => {
    setSandboxLoading(true);
    setSandboxError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/quotes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': SANDBOX_DEMO_API_KEY
        },
        body: JSON.stringify({
          providerSlug: SANDBOX_PROVIDER_SLUG,
          items: [{ offeringId: 'offering_standard_pkg', quantity: 2 }]
        })
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `Quote calculation failed with status ${res.status}`);
      }
      const data = await res.json();
      setSandboxQuote(data);
      setSandboxStep(3);
    } catch (e: any) {
      setSandboxError(e.message || 'Kotirovka hisoblashda xatolik');
    } finally {
      setSandboxLoading(false);
    }
  };

  const runSandboxCreateAction = async () => {
    setSandboxLoading(true);
    setSandboxError(null);
    try {
      const idempKey = `sb_sim_${Date.now()}`;
      const quoteId = sandboxQuote?.id || sandboxQuote?.quoteId;
      const res = await fetch(`${API_BASE}/api/v1/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'idempotency-key': idempKey,
          'x-api-key': SANDBOX_DEMO_API_KEY
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
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `Action dispatch failed with status ${res.status}`);
      }
      const data = await res.json();
      setSandboxAction(data);
      setSandboxStep(4);
    } catch (e: any) {
      setSandboxError(e.message || 'Action yaratishda xatolik');
    } finally {
      setSandboxLoading(false);
    }
  };

  const runSandboxWebhook = async () => {
    if (!sandboxAction) return;
    setSandboxLoading(true);
    setSandboxError(null);
    try {
      const actionId = sandboxAction.actionId || sandboxAction.publicId || sandboxAction.id;
      const res = await fetch(`${API_BASE}/api/v1/actions/${actionId}`, {
        headers: {
          'x-api-key': SANDBOX_DEMO_API_KEY
        }
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `Status check failed with status ${res.status}`);
      }
      const updated = await res.json();
      setSandboxAction(updated);
      setSandboxStep(5);
    } catch (e: any) {
      setSandboxError(e.message || 'Webhook simulyatsiyasida xatolik');
    } finally {
      setSandboxLoading(false);
    }
  };

  const provider = providerData || null;
  const certReport = certifyMutation.data;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-xl px-6 py-3.5 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-700 flex items-center justify-center text-xl font-bold shadow-lg shadow-indigo-950/50">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-white">ZAYUNO</span>
              <span className="text-xs bg-indigo-500/20 text-indigo-300 font-mono px-2 py-0.5 rounded-full border border-indigo-500/30">
                DEVELOPERS
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Public Action Infrastructure for AI Agents</p>
          </div>
        </div>

        {/* Center Tabs */}
        <nav className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'overview' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" /> Overview
          </button>
          <button
            onClick={() => setActiveTab('docs')}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'docs' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" /> Documentation
          </button>
          <button
            onClick={() => {
              if (!token) {
                setAuthModalTab('login');
                setAuthModalOpen(true);
              } else {
                setActiveTab('apps');
              }
            }}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'apps' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" /> Apps & Dashboard {!token && <Lock className="w-3 h-3 text-slate-500" />}
          </button>
          {SHOW_LOCAL_SIMULATOR && (
            <button
              onClick={() => setActiveTab('sandbox')}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'sandbox' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" /> Sandbox Simulator
            </button>
          )}
          <button
            onClick={() => {
              if (!token) {
                setAuthModalTab('login');
                setAuthModalOpen(true);
              } else {
                setActiveTab('certification');
              }
            }}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'certification' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Certification {!token && <Lock className="w-3 h-3 text-slate-500" />}
          </button>
          <button
            onClick={() => {
              if (!token) {
                setAuthModalTab('login');
                setAuthModalOpen(true);
              } else {
                setActiveTab('inspector');
              }
            }}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'inspector' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" /> Live Inspector {!token && <Lock className="w-3 h-3 text-slate-500" />}
          </button>
        </nav>

        {/* Right Status & Account */}
        <div className="flex items-center gap-3 text-xs">
          {token ? (
            <div className="flex items-center gap-2">
              <div className="bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-indigo-400" />
                <span className="font-medium text-slate-200">{userProfile?.name || userProfile?.email || 'Partner'}</span>
              </div>
              <button
                onClick={handleLogout}
                title="Chiqish"
                className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-rose-400 hover:border-rose-500/30 transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setAuthModalTab('login'); setAuthModalOpen(true); }}
                className="text-slate-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              >
                Kirish
              </button>
              <button
                onClick={() => { setAuthModalTab('signup'); setAuthModalOpen(true); }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all flex items-center gap-1"
              >
                Provider bo‘lish <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {/* ========================================================================= */}
        {/* TAB 1: OVERVIEW & QUICK START (PUBLIC)                                   */}
        {/* ========================================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-fadeIn">
            {/* Hero Banner */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-950/80 via-slate-900 to-slate-900 border border-indigo-500/20 p-8 shadow-2xl">
              <div className="max-w-3xl space-y-4">
                <span className="text-xs font-mono bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full border border-indigo-500/30">
                  Provider Integration Contract v1
                </span>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                  Connect Your Business to <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-sky-300 to-emerald-400">
                    Conversational AI Agents
                  </span>
                </h1>
                <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                  Zayuno is a neutral action infrastructure platform. External providers (commerce, logistics, retail, bookings, and services) integrate against our open protocol so AI agents can discover services, calculate quotes, and trigger actions.
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    onClick={() => {
                      if (!token) {
                        setAuthModalTab('signup');
                        setAuthModalOpen(true);
                      } else {
                        setActiveTab('apps');
                      }
                    }}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
                  >
                    Provider bo‘lish <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setActiveTab('docs')}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-5 py-2.5 rounded-xl border border-slate-700 transition-all flex items-center gap-2"
                  >
                    <BookOpen className="w-3.5 h-3.5" /> Hujjatlarni o‘qish
                  </button>
                </div>
              </div>
            </div>

            {/* How Integration Works Guide */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest font-semibold">Integratsiya oqimi</span>
                <h2 className="text-xl font-bold text-white mt-1">Qanday ishlaydi? (How Integration Works)</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Ommaviy self-service orqali Zayuno platformasiga ulanish va AI agentlariga xizmat ko‘rsatish jarayoni.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs leading-relaxed">
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 space-y-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold border border-indigo-500/20">
                    1
                  </div>
                  <h3 className="font-semibold text-white text-sm">Kimlar ro‘yxatdan o‘ta oladi?</h3>
                  <p className="text-slate-400">
                    O‘zbekistonda xizmat ko‘rsatuvchi yuridik shaxslar, xususiy tadbirkorlar va raqamli servislar (yetkazib berish, do‘kon, transport, xizmatlar, band qilish).
                  </p>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 space-y-3">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold border border-sky-500/20">
                    2
                  </div>
                  <h3 className="font-semibold text-white text-sm">Kerakli API va xavfsizlik</h3>
                  <p className="text-slate-400">
                    Backend HTTP endpointlaringiz (7 ta majburiy capability), HTTPS/SSL sertifikati, HMAC-SHA256 imzosi va kotirovka aniqligi talab qilinadi.
                  </p>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 space-y-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold border border-emerald-500/20">
                    3
                  </div>
                  <h3 className="font-semibold text-white text-sm">Certification va Ko‘rib chiqish</h3>
                  <p className="text-slate-400">
                    Avtomatlashtirilgan test sinovlaridan o‘tgach, ariza Zayuno Operations tomonidan 1–2 ish kunida ko‘rib chiqiladi va AI qidiruviga chiqariladi.
                  </p>
                </div>
              </div>

              {/* Reserved Brands Warning Box */}
              <div className="rounded-xl bg-indigo-950/20 border border-indigo-500/30 p-4 text-xs text-indigo-200 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Himoyalangan brendlar (Reserved Brands):</strong> EVOS, Uzum, Yandex, Payme, Click, Korzinka va boshqa korporativ brendlar nomidan soxta ro‘yxatdan o‘tish avtomatik bloklanadi. Rasmiy enterprise onboarding uchun <code>operations@zayuno.uz</code> bilan bog‘laning.
                </div>
              </div>
            </div>

            {/* Payment Boundary Guarantee Card */}
            <div className="rounded-xl bg-slate-900/60 border border-amber-500/30 p-6 flex items-start gap-4 shadow-lg">
              <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                <Lock className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-amber-300 flex items-center gap-2">
                  Strict Payment Boundary Guarantee
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  <strong>Zayuno NEVER processes payments or collects card details.</strong> Providers own their checkout flow (Payme, Click, Stripe, POS, invoicing). When an action requires payment, your backend returns an <code className="text-amber-300 font-mono text-[11px] bg-amber-950/60 px-1 py-0.5 rounded">AWAITING_PAYMENT</code> status with a secure <code className="text-amber-300 font-mono text-[11px] bg-amber-950/60 px-1 py-0.5 rounded">nextAction</code> URL.
                </p>
              </div>
            </div>

            {/* Capabilities Matrix Section */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" /> Mandatory vs Optional Capabilities
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-2">
                  <span className="text-[11px] font-mono font-bold text-emerald-400 tracking-wider">MANDATORY (7 OF 7 REQUIRED)</span>
                  <div className="space-y-1.5">
                    {['METADATA (GET /provider-info)', 'HEALTH (GET /health)', 'CATALOG (GET /catalog, GET /offerings/:id)', 'QUOTE (POST /quote)', 'ACTION_CREATE (POST /actions with NextAction)', 'ACTION_STATUS (GET /actions/:id)', 'WEBHOOK (HMAC-SHA256 event push)'].map((c, i) => (
                      <div key={i} className="flex items-center gap-2 bg-slate-950/60 border border-slate-800 px-3 py-2 rounded-lg">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        <span className="font-mono text-slate-300">{c}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <span className="text-[11px] font-mono font-bold text-slate-400 tracking-wider">OPTIONAL (AS APPLICABLE)</span>
                  <div className="space-y-1.5">
                    {['LOCATIONS (GET /locations)', 'SEARCH (GET /search)', 'LIVE_AVAILABILITY (POST /availability extension)', 'ACTION_CANCEL (POST /actions/:id/cancel)', 'PAYMENT_OPTIONS (GET /actions/:id/payment-options)'].map((c, i) => (
                      <div key={i} className="flex items-center gap-2 bg-slate-950/60 border border-slate-800 px-3 py-2 rounded-lg">
                        <span className="w-3.5 h-3.5 rounded-full border border-slate-600 flex items-center justify-center text-[9px] text-slate-400">○</span>
                        <span className="font-mono text-slate-400">{c}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: INTERACTIVE DOCUMENTATION (PUBLIC)                                  */}
        {/* ========================================================================= */}
        {activeTab === 'docs' && (
          <DocsViewer selectedDoc={selectedDoc} onSelectDoc={setSelectedDoc} />
        )}

        {/* ========================================================================= */}
        {/* TAB 3: APPS & PROVIDER DASHBOARD (PROTECTED)                              */}
        {/* ========================================================================= */}
        {activeTab === 'apps' && (
          <div className="space-y-6 animate-fadeIn">
            {!provider ? (
              /* APPLICATION WIZARD FOR NEW PROVIDERS */
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 max-w-4xl mx-auto">
                <div className="border-b border-slate-800 pb-4">
                  <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest font-semibold">Onboarding Wizard</span>
                  <h2 className="text-xl font-bold text-white mt-1">Yangi Provider Arizasini Yaratish</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Quyidagi ma’lumotlarni to‘ldirib, sandbox credentiallarini oling va API integratsiyangizni boshlang.
                  </p>
                </div>

                {/* Wizard Stepper */}
                <div className="grid grid-cols-4 gap-2 text-xs font-mono">
                  {[
                    { s: 1, label: '1. Profil & Support' },
                    { s: 2, label: '2. Brand & Slug' },
                    { s: 3, label: '3. API & Auth' },
                    { s: 4, label: '4. Kalitlar (Handoff)' }
                  ].map(step => (
                    <div
                      key={step.s}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        wizardStep === step.s
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow'
                          : wizardStep > step.s
                          ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30'
                          : 'bg-slate-900/40 text-slate-500 border-slate-800'
                      }`}
                    >
                      {step.label}
                    </div>
                  ))}
                </div>

                {/* Step 1: Business Profile & Support Contact */}
                {wizardStep === 1 && (
                  <div className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-400 mb-1">Kompaniya yoki Servis Nomi *</label>
                        <input
                          type="text"
                          required
                          value={wizardForm.name}
                          onChange={e => setWizardForm({ ...wizardForm, name: e.target.value })}
                          placeholder="Masalan: Express Logistics"
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">Xizmat Toifasi (Category) *</label>
                        <select
                          value={wizardForm.category}
                          onChange={e => setWizardForm({ ...wizardForm, category: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                        >
                          <option value="general_services">General Services</option>
                          <option value="logistics">Logistics & Delivery</option>
                          <option value="retail">Commerce & Retail</option>
                          <option value="food_delivery">Food & Dining</option>
                          <option value="railway_tickets">Railway Tickets</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">Xizmat haqida qisqacha tavsif</label>
                      <textarea
                        value={wizardForm.description}
                        onChange={e => setWizardForm({ ...wizardForm, description: e.target.value })}
                        placeholder="AI agentlar xizmatlaringizni to‘g‘ri tushunishi uchun qisqa izoh"
                        rows={2}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="border-t border-slate-800/80 pt-4 space-y-3">
                      <h4 className="font-semibold text-white">Mijozlarni qo‘llab-quvvatlash (Support Contacts)</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-400 mb-1">Telefon raqam</label>
                          <input
                            type="text"
                            value={wizardForm.supportContact.phone}
                            onChange={e => setWizardForm({ ...wizardForm, supportContact: { ...wizardForm.supportContact, phone: e.target.value } })}
                            placeholder="+998712000000"
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1">Telegram username / bot</label>
                          <input
                            type="text"
                            value={wizardForm.supportContact.telegram}
                            onChange={e => setWizardForm({ ...wizardForm, supportContact: { ...wizardForm.supportContact, telegram: e.target.value } })}
                            placeholder="@express_support"
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1">Support Email</label>
                          <input
                            type="email"
                            value={wizardForm.supportContact.email}
                            onChange={e => setWizardForm({ ...wizardForm, supportContact: { ...wizardForm.supportContact, email: e.target.value } })}
                            placeholder="support@express.uz"
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1">Ish vaqti</label>
                          <input
                            type="text"
                            value={wizardForm.supportContact.workingHours}
                            onChange={e => setWizardForm({ ...wizardForm, supportContact: { ...wizardForm.supportContact, workingHours: e.target.value } })}
                            placeholder="09:00 - 22:00 (Har kuni)"
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-4">
                      <button
                        onClick={() => {
                          if (!wizardForm.name.trim()) return alert('Kompaniya nomini kiriting');
                          if (!wizardForm.slug) {
                            setWizardForm({
                              ...wizardForm,
                              slug: wizardForm.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
                            });
                          }
                          setWizardStep(2);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5 py-2.5 rounded-xl transition-all flex items-center gap-2"
                      >
                        Davom etish <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 2: Slug & Brand Check */}
                {wizardStep === 2 && (
                  <div className="space-y-4 text-xs">
                    <div>
                      <label className="block text-slate-400 mb-1">Noyob identifikator (Slug) *</label>
                      <input
                        type="text"
                        required
                        value={wizardForm.slug}
                        onChange={e => setWizardForm({ ...wizardForm, slug: e.target.value.toLowerCase().trim() })}
                        placeholder="masalan: express-logistics"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                      />
                      <p className="mt-1.5 text-[11px] text-slate-500">
                        Kichik harflar, sonlar va chiziqcha (<code className="text-indigo-300">-</code>) ishlatiladi. API so‘rovlarida provideringiz aynan shu slug bilan chaqiriladi.
                      </p>
                    </div>

                    <div className="flex justify-between pt-4">
                      <button
                        onClick={() => setWizardStep(1)}
                        className="text-slate-400 hover:text-white px-4 py-2"
                      >
                        Ortga
                      </button>
                      <button
                        onClick={() => {
                          if (!wizardForm.slug.trim()) return alert('Slug kiritilmadi');
                          setWizardStep(3);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5 py-2.5 rounded-xl transition-all flex items-center gap-2"
                      >
                        Davom etish <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3: API & Auth */}
                {wizardStep === 3 && (
                  <div className="space-y-4 text-xs">
                    <div>
                      <label className="block text-slate-400 mb-1">Backend Base URL (HTTPS) *</label>
                      <input
                        type="url"
                        value={wizardForm.baseUrl}
                        onChange={e => setWizardForm({ ...wizardForm, baseUrl: e.target.value })}
                        placeholder="https://api.express.uz"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                      />
                      <p className="mt-1 text-[11px] text-slate-500">
                        Hozircha serveringiz tayyor bo‘lmasa bo‘sh qoldirishingiz mumkin; keyinchalik sozlamalardan kiritiladi.
                      </p>
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">Autentifikatsiya usuli</label>
                      <select
                        value={wizardForm.authMethod}
                        onChange={e => setWizardForm({ ...wizardForm, authMethod: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="API_KEY">API Key (x-api-key header)</option>
                        <option value="BEARER">Bearer Token (Authorization: Bearer)</option>
                        <option value="NONE">None (Public/Sandbox)</option>
                      </select>
                    </div>

                    {registerWizardMutation.isError && (
                      <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300">
                        {(registerWizardMutation.error as Error).message}
                      </div>
                    )}

                    <div className="flex justify-between pt-4">
                      <button
                        onClick={() => setWizardStep(2)}
                        className="text-slate-400 hover:text-white px-4 py-2"
                      >
                        Ortga
                      </button>
                      <button
                        onClick={() => registerWizardMutation.mutate()}
                        disabled={registerWizardMutation.isPending}
                        className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-xl transition-all flex items-center gap-2"
                      >
                        {registerWizardMutation.isPending ? 'Ro‘yxatdan o‘tkazilmoqda...' : 'Arizani yaratish va Kalitlarni olish'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 4: Credential Handoff (Single-use display) */}
                {wizardStep === 4 && createdCredentials && (
                  <div className="space-y-6 text-xs animate-fadeIn">
                    <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl space-y-2">
                      <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                        <CheckCircle2 className="w-5 h-5" />
                        Provider muvaffaqiyatli yaratildi!
                      </div>
                      <p className="text-slate-300">
                        Quyidagi maxfiy kalitlar <strong>faqat bir marta</strong> ko‘rsatiladi. Iltimos, ularni xavfsiz joyga nusxalab yoki yuklab oling.
                      </p>
                    </div>

                    <div className="space-y-3 font-mono">
                      <div>
                        <span className="text-slate-400 text-[11px]">Sandbox API Key (Zayuno API ga so‘rov yuborish uchun):</span>
                        <div className="bg-slate-950 p-3 rounded-xl text-emerald-400 border border-slate-800 mt-1 flex justify-between items-center">
                          <span className="truncate mr-2">{createdCredentials.sandboxApiKey}</span>
                          <button
                            onClick={() => copyToClipboard(createdCredentials.sandboxApiKey, 'key')}
                            className="p-1 hover:text-white"
                          >
                            {copiedText === 'key' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-400 text-[11px]">Webhook HMAC Secret (Kelgan voqealarni tekshirish uchun):</span>
                        <div className="bg-slate-950 p-3 rounded-xl text-emerald-400 border border-slate-800 mt-1 flex justify-between items-center">
                          <span className="truncate mr-2">{createdCredentials.sandboxWebhookSecret}</span>
                          <button
                            onClick={() => copyToClipboard(createdCredentials.sandboxWebhookSecret, 'secret')}
                            className="p-1 hover:text-white"
                          >
                            {copiedText === 'secret' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          const json = JSON.stringify(createdCredentials, null, 2);
                          const blob = new Blob([json], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `zayuno-credentials-${createdCredentials.providerSlug}.json`;
                          a.click();
                        }}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl border border-slate-700 flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" /> JSON formatida yuklab olish
                      </button>
                    </div>

                    <label className="flex items-center gap-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={credentialsAcknowledged}
                        onChange={e => setCredentialsAcknowledged(e.target.checked)}
                        className="rounded border-slate-700"
                      />
                      <span className="text-slate-300">
                        Men ushbu maxfiy kalitlarni xavfsiz saqlab oldim va keyin ularni qayta ko‘rib bo‘lmasligini tushunaman.
                      </span>
                    </label>

                    <div className="flex justify-end pt-2">
                      <button
                        disabled={!credentialsAcknowledged}
                        onClick={() => {
                          setCreatedCredentials(null);
                          refetchProvider();
                        }}
                        className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium px-6 py-2.5 rounded-xl transition-all"
                      >
                        Boshqaruv paneliga o‘tish
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* EXISTING PROVIDER DASHBOARD */
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white">Provider Applications & Credentials</h2>
                    <p className="text-xs text-slate-400">Manage your registered provider endpoints, authentication secrets, and review status.</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                  {[
                    ['Jami actionlar', providerDashboard?.metrics?.totalActions || 0],
                    ['Jarayonda', providerDashboard?.metrics?.pendingActions || 0],
                    ['To‘langan', providerDashboard?.metrics?.paidActions || 0],
                    ['Tugallangan', providerDashboard?.metrics?.completedActions || 0],
                    ['Muammoli', providerDashboard?.metrics?.failedActions || 0]
                  ].map(([label, value]) => (
                    <div key={String(label)} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                      <p className="text-xs text-slate-400">{label}</p>
                      <p className="mt-1 text-xl font-bold text-white">{value}</p>
                    </div>
                  ))}
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
                        <label className="block text-xs text-slate-400 mb-1">Provider API Base URL</label>
                        <input
                          type="url"
                          value={integrationForm.baseUrl}
                          onChange={event => setIntegrationForm({ ...integrationForm, baseUrl: event.target.value })}
                          placeholder="https://api.business.uz"
                          disabled={provider.status === 'ACTIVE'}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                        />
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Provider API key / token</label>
                          <input
                            type="password"
                            value={integrationForm.apiSecret}
                            onChange={event => setIntegrationForm({ ...integrationForm, apiSecret: event.target.value })}
                            placeholder="Bo‘sh qoldirilsa o‘zgarmaydi"
                            disabled={provider.status === 'ACTIVE'}
                            autoComplete="new-password"
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Webhook HMAC secret</label>
                          <input
                            type="password"
                            value={integrationForm.webhookSecret}
                            onChange={event => setIntegrationForm({ ...integrationForm, webhookSecret: event.target.value })}
                            placeholder="Bo‘sh qoldirilsa o‘zgarmaydi"
                            disabled={provider.status === 'ACTIVE'}
                            autoComplete="new-password"
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                          />
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-slate-400 mb-2">Capabilities</p>
                        <div className="flex flex-wrap gap-2">
                          {PROVIDER_CAPABILITIES.map(capability => {
                            const mandatory = MANDATORY_PROVIDER_CAPABILITIES.has(capability);
                            const checked = mandatory || integrationForm.capabilities.includes(capability);
                            return (
                              <label key={capability} className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] ${mandatory ? 'border-indigo-500/30 bg-indigo-950/30 text-indigo-200' : 'border-slate-700 bg-slate-950 text-slate-300'}`}>
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={mandatory || provider.status === 'ACTIVE'}
                                  onChange={event => setIntegrationForm(current => ({
                                    ...current,
                                    capabilities: event.target.checked
                                      ? [...new Set([...current.capabilities, capability])]
                                      : current.capabilities.filter(value => value !== capability)
                                  }))}
                                />
                                {capability}{mandatory ? ' *' : ''}
                              </label>
                            );
                          })}
                        </div>
                        <p className="mt-2 text-[11px] text-slate-500">* Majburiy capability. Optional capability faqat API’ingiz haqiqatan qo‘llasa tanlanadi.</p>
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
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-white">Kelgan actionlar</h3>
                      <p className="mt-1 text-[11px] text-slate-500">Faqat {provider.name} provideriga tegishli actionlar ko‘rsatiladi.</p>
                    </div>
                    <button onClick={() => refetchDashboard()} disabled={dashboardFetching} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-50">
                      <RefreshCw className={`h-3.5 w-3.5 ${dashboardFetching ? 'animate-spin' : ''}`} /> Yangilash
                    </button>
                  </div>

                  <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-6">
                    <label className="relative xl:col-span-2">
                      <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                      <input value={actionFilters.query} onChange={event => setActionFilters(current => ({ ...current, query: event.target.value }))} placeholder="Action ID, mijoz, telefon..." className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2 pl-9 pr-3 text-xs" />
                    </label>
                    <select value={actionFilters.status} onChange={event => setActionFilters(current => ({ ...current, status: event.target.value }))} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs">
                      <option value="ALL">Barcha action statuslari</option>
                      {['AWAITING_PAYMENT', 'SUBMITTED', 'ACCEPTED', 'IN_PROGRESS', 'READY', 'FULFILLING', 'COMPLETED', 'CANCELLED', 'FAILED'].map(status => <option key={status}>{status}</option>)}
                    </select>
                    <select value={actionFilters.paymentStatus} onChange={event => setActionFilters(current => ({ ...current, paymentStatus: event.target.value }))} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs">
                      <option value="ALL">Barcha payment statuslari</option>
                      {['PENDING', 'AUTHORIZED', 'PAID', 'FAILED', 'REFUNDED'].map(status => <option key={status}>{status}</option>)}
                    </select>
                    <input type="date" aria-label="Boshlanish sanasi" value={actionFilters.from} onChange={event => setActionFilters(current => ({ ...current, from: event.target.value }))} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs" />
                    <input type="date" aria-label="Tugash sanasi" value={actionFilters.to} onChange={event => setActionFilters(current => ({ ...current, to: event.target.value }))} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs" />
                    <select value={actionFilters.sort} onChange={event => setActionFilters(current => ({ ...current, sort: event.target.value }))} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs">
                      <option value="newest">Eng yangi</option><option value="oldest">Eng eski</option><option value="total_desc">Summa: katta</option><option value="total_asc">Summa: kichik</option>
                    </select>
                    <button onClick={() => setActionFilters({ query: '', status: 'ALL', paymentStatus: 'ALL', from: '', to: '', sort: 'newest' })} className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800">Filtrlarni tozalash</button>
                  </div>

                  <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800">
                    <table className="min-w-full text-left text-xs">
                      <thead className="bg-slate-950 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="p-3">Action</th><th className="p-3">Mijoz</th><th className="p-3">Summa</th><th className="p-3">Payment</th><th className="p-3">Action status</th><th className="p-3">Sana</th><th className="p-3"></th></tr></thead>
                      <tbody className="divide-y divide-slate-800">
                        {(providerDashboard?.actions || []).length === 0 ? <tr><td colSpan={7} className="p-6 text-center text-slate-400">Tanlangan filtrlar bo‘yicha action topilmadi.</td></tr> : providerDashboard.actions.map((action: any) => (
                          <tr key={action.publicId} className="bg-slate-900/30 hover:bg-slate-800/50">
                            <td className="p-3"><div className="font-mono font-semibold text-indigo-300">{action.publicId}</div>{action.externalActionId && <div className="mt-1 font-mono text-[10px] text-slate-500">{action.externalActionId}</div>}</td>
                            <td className="p-3"><div>{action.customerName}</div><div className="text-[10px] text-slate-500">{action.customerPhoneMasked}</div></td>
                            <td className="p-3 font-semibold">{action.total?.toLocaleString('uz-UZ')} {action.currency}</td>
                            <td className="p-3"><span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${action.paymentStatus === 'PAID' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : action.paymentStatus === 'FAILED' ? 'border-rose-500/30 bg-rose-500/10 text-rose-300' : 'border-amber-500/30 bg-amber-500/10 text-amber-300'}`}>{action.paymentStatus}</span><div className="mt-1 text-[9px] text-slate-600">provider reported</div></td>
                            <td className="p-3"><span className="font-semibold text-slate-200">{action.status}</span>{action.cancellationReason && <div className="mt-1 max-w-xs text-[10px] text-rose-300">{action.cancellationReason}</div>}</td>
                            <td className="p-3 text-slate-400">{new Date(action.createdAt).toLocaleString('uz-UZ')}</td>
                            <td className="p-3 text-right"><button onClick={() => setSelectedProviderActionId(action.publicId)} className="rounded-lg bg-indigo-600 px-3 py-1.5 font-semibold text-white hover:bg-indigo-500">Batafsil</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3 text-right text-[11px] text-slate-500">Natija: {providerDashboard?.pagination?.total || 0} ta</div>
                </div>
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
                        {certReport.passedCount} of {certReport.totalTests} tests passed. Production ready: {certReport.isProductionReady ? 'YES' : 'NO'}.
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs font-mono font-bold px-3 py-1 rounded-full border ${
                    certReport.isCertified
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  }`}>
                    {certReport.isCertified ? 'PASS' : 'FAIL'}
                  </span>
                </div>

                {/* Test Results Table */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-mono">
                      <tr>
                        <th className="p-3.5">Test Case</th>
                        <th className="p-3.5">Capability</th>
                        <th className="p-3.5">Type</th>
                        <th className="p-3.5">Duration</th>
                        <th className="p-3.5 text-right">Result</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {certReport.tests.map((t: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-800/30">
                          <td className="p-3.5 font-medium text-white">{t.name}</td>
                          <td className="p-3.5 font-mono text-indigo-300">{t.capability}</td>
                          <td className="p-3.5">
                            {t.isMandatory ? (
                              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded border border-emerald-500/30">
                                MANDATORY
                              </span>
                            ) : (
                              <span className="text-[10px] bg-slate-800 text-slate-400 font-mono px-2 py-0.5 rounded">
                                OPTIONAL
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 font-mono text-slate-400">{t.durationMs}ms</td>
                          <td className="p-3.5 text-right">
                            {t.passed ? (
                              <span className="text-emerald-400 font-semibold flex items-center justify-end gap-1">
                                <Check className="w-3.5 h-3.5" /> PASS
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

        {/* ========================================================================= */}
        {/* TAB 6: LIVE API & PAYLOAD INSPECTOR (PROTECTED)                           */}
        {/* ========================================================================= */}
        {activeTab === 'inspector' && (
          <div className="space-y-6 animate-fadeIn">
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
                        <td className="p-3.5 text-slate-400 font-sans text-[11px]">
                          {new Date(log.createdAt).toLocaleTimeString('uz-UZ')}
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
      </main>

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

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 px-6 py-4 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
        <div>
          © 2026 Zayuno Action Infrastructure. All rights reserved.
        </div>
        <div className="flex items-center gap-4">
          <a href="https://developers.zayuno.uz/docs" className="hover:text-slate-300">Docs</a>
          <a href="https://status.zayuno.uz" className="hover:text-slate-300">System Status</a>
          <a href="https://mcp.zayuno.uz" className="hover:text-slate-300">MCP Protocol</a>
          <a href="https://zayuno.uz/privacy" className="hover:text-slate-300">Privacy</a>
        </div>
      </footer>
    </div>
  );
}
