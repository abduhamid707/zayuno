import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  Layers,
  ShoppingBag,
  Store,
  Terminal,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Search,
  ShieldCheck,
  Zap,
  DollarSign,
  ChevronRight,
  TrendingUp,
  MapPin,
  Cpu,
  LogOut,
  Bug,
} from 'lucide-react';

const API_BASE =
  (import.meta as any).env?.VITE_API_URL ||
  (typeof window !== 'undefined' &&
  window.location.hostname.includes('zayuno.uz')
    ? 'https://api.zayuno.uz'
    : 'http://localhost:4000');
const SANDBOX_PROVIDER_BASE =
  (import.meta as any).env?.VITE_SANDBOX_PROVIDER_URL ||
  (typeof window !== 'undefined' &&
  window.location.hostname.includes('zayuno.uz')
    ? 'https://evos-sandbox.shopla.uz'
    : 'http://localhost:4001');

const REVIEW_REASON_OPTIONS = [
  ['API_UNREACHABLE', 'API ishlamayapti yoki tashqaridan ochilmayapti'],
  ['CERTIFICATION_FAILED', 'Certification talablari bajarilmagan'],
  ['CONTRACT_MISMATCH', 'API javobi Provider Contract’ga mos emas'],
  ['OWNERSHIP_UNVERIFIED', 'Biznes yoki brend egaligi tasdiqlanmagan'],
  ['AUTHENTICATION_INVALID', 'Authentication sozlamalari noto‘g‘ri'],
  ['WEBHOOK_INVALID', 'Webhook imzosi yoki eventlari noto‘g‘ri'],
  ['CHECKOUT_UNSAFE', 'Checkout xavfsizlik talablariga mos emas'],
  ['MISLEADING_INFORMATION', 'Ma’lumot noto‘g‘ri yoki chalg‘ituvchi'],
  ['POLICY_VIOLATION', 'Platforma siyosati buzilgan'],
  ['MORE_INFORMATION_REQUIRED', 'Qo‘shimcha ma’lumot kerak'],
  ['OTHER', 'Boshqa sabab'],
] as const;

const DISCOVERY_REASON_LABELS: Record<string, string> = {
  NOT_PUBLISHED: 'Publish gate talablari bajarilmagan',
  NOT_CERTIFIED: 'Provider sertifikatlanmagan',
  CATALOG_EMPTY: 'Katalog bo‘sh',
  NO_AVAILABLE_OFFERINGS: 'Katalogda faol taklif yo‘q',
  PROVIDER_UNHEALTHY_OR_UNAVAILABLE:
    'Provider ishlamayapti yoki vaqtincha yopiq',
  NO_ACTIVE_LOCATIONS: 'Kamida bitta faol filial kerak',
};

const formatDiscoveryReason = (reason: string) => {
  if (reason.startsWith('STATUS_'))
    return `Provider statusi ${reason.slice(7)}`;
  if (reason.startsWith('REVIEW_')) return `Review statusi ${reason.slice(7)}`;
  return DISCOVERY_REASON_LABELS[reason] || reason;
};

export default function App() {
  const [token, setToken] = useState(
    () => localStorage.getItem('zayuno_admin_token') || '',
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'actions' | 'providers' | 'reports' | 'logs'
  >('dashboard');
  const [reportStatus, setReportStatus] = useState('ALL');
  const [selectedAction, setSelectedAction] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showProviderForm, setShowProviderForm] = useState(false);
  const [createdProvider, setCreatedProvider] = useState<any | null>(null);
  const [copiedCredential, setCopiedCredential] = useState<string | null>(null);
  const [providerFilters, setProviderFilters] = useState({
    query: '',
    status: 'ALL',
    reviewStatus: 'ALL',
    type: 'ALL',
    capability: 'ALL',
    category: '',
    geography: '',
    certified: 'ALL',
    ownerEmail: '',
    from: '',
    to: '',
  });
  const [providerScope, setProviderScope] = useState<
    'EXTERNAL' | 'INTERNAL' | 'ALL'
  >('EXTERNAL');
  const [reviewTarget, setReviewTarget] = useState<{
    slug: string;
    name: string;
    decision: 'REQUEST_CHANGES' | 'REJECT' | 'SUSPEND';
  } | null>(null);
  const [reviewForm, setReviewForm] = useState({
    reasonCode: 'MORE_INFORMATION_REQUIRED',
    reason: '',
    requiredChanges: '',
    internalNote: '',
  });
  const [logFilters, setLogFilters] = useState({
    source: 'ALL',
    provider: '',
    actionId: '',
    query: '',
    from: '',
    to: '',
  });
  const [providerForm, setProviderForm] = useState({
    name: '',
    slug: '',
    description: '',
    type: 'SERVICES',
    category: 'general',
    geography: 'UZ',
    baseUrl: '',
    supportContact: '',
    webhookUrl: '',
    ownerName: '',
    ownerEmail: '',
    temporaryPassword: '',
    capabilities: [
      'METADATA',
      'HEALTH',
      'CATALOG',
      'QUOTE',
      'ACTION_CREATE',
      'ACTION_STATUS',
      'WEBHOOK',
    ],
  });
  const queryClient = useQueryClient();
  const logout = () => {
    localStorage.removeItem('zayuno_admin_token');
    setToken('');
    queryClient.clear();
  };

  const apiFetch = async (path: string, init: RequestInit = {}) => {
    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, ...(init.headers || {}) },
    });
    if (response.status === 401) {
      logout();
      throw new Error('Sessiya muddati tugadi. Qaytadan kiring.');
    }
    if (!response.ok)
      throw new Error(
        (await response.json().catch(() => null))?.message || 'Request failed',
      );
    return response;
  };

  const login = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoginError('');
    try {
      const response = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok || !data.accessToken)
        throw new Error(data.message || 'Login failed');
      localStorage.setItem('zayuno_admin_token', data.accessToken);
      setToken(data.accessToken);
    } catch (error: any) {
      setLoginError(error.message || 'Login failed');
    }
  };

  // Queries
  const { data: kpiData, isLoading: kpiLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      const res = await apiFetch('/api/v1/admin/dashboard');
      return res.json();
    },
    enabled: !!token,
  });

  const { data: actionsData, isLoading: actionsLoading } = useQuery({
    queryKey: ['admin-actions'],
    queryFn: async () => {
      const res = await apiFetch('/api/v1/admin/actions?limit=50');
      return res.json();
    },
    enabled: !!token,
  });

  const { data: reportsData, isLoading: reportsLoading } = useQuery({
    queryKey: ['admin-reports', reportStatus],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '50' });
      if (reportStatus !== 'ALL') params.set('status', reportStatus);
      const res = await apiFetch(`/api/v1/admin/reports?${params.toString()}`);
      return res.json();
    },
    enabled: !!token,
  });
  const updateReportMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) =>
      (
        await apiFetch(`/api/v1/admin/reports/${id}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        })
      ).json(),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] }),
  });

  const { data: providersData, isLoading: providersLoading } = useQuery({
    queryKey: ['admin-providers', providerFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(providerFilters).forEach(([key, value]) => {
        if (value && value !== 'ALL') params.set(key, value);
      });
      params.set('limit', '100');
      const res = await apiFetch(
        `/api/v1/admin/providers?${params.toString()}`,
      );
      return res.json();
    },
    enabled: !!token,
  });

  const {
    data: operationalLogs,
    isLoading: logsLoading,
    isFetching: logsFetching,
  } = useQuery({
    queryKey: ['admin-operational-logs', logFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(logFilters).forEach(([key, value]) => {
        if (value && value !== 'ALL') params.set(key, value);
      });
      params.set('limit', '200');
      const res = await apiFetch(
        `/api/v1/admin/logs/events?${params.toString()}`,
      );
      return res.json();
    },
    enabled: !!token,
  });
  const exportLogs = async (format: 'json' | 'csv') => {
    const params = new URLSearchParams({ format });
    Object.entries(logFilters).forEach(([key, value]) => {
      if (value && value !== 'ALL') params.set(key, value);
    });
    params.set('limit', '500');
    const response = await apiFetch(
      `/api/v1/admin/logs/export?${params.toString()}`,
    );
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `zayuno-support-${new Date().toISOString().replace(/[:.]/g, '-')}.${format}`;
    link.click();
    URL.revokeObjectURL(url);
  };
  const copyCredential = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedCredential(label);
    window.setTimeout(() => setCopiedCredential(null), 1800);
  };
  const downloadProviderEnv = () => {
    if (!createdProvider?.credentials) return;
    const content = [
      `PROVIDER_SLUG=${createdProvider.provider?.slug || ''}`,
      `PROVIDER_API_KEY=${createdProvider.credentials.sandboxApiKey || ''}`,
      `ZAYUNO_WEBHOOK_SECRET=${createdProvider.credentials.sandboxWebhookSecret || ''}`,
    ].join('\r\n');
    const url = URL.createObjectURL(
      new Blob([content], { type: 'text/plain;charset=utf-8' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `${createdProvider.provider?.slug || 'provider'}.env`;
    link.click();
    URL.revokeObjectURL(url);
  };
  const downloadReport = (report: any, format: 'json' | 'md') => {
    const content =
      format === 'json'
        ? JSON.stringify(
            {
              id: report.id,
              status: report.status,
              description: report.description,
              transcript: report.transcript,
              metadata: report.metadata,
              createdAt: report.createdAt,
            },
            null,
            2,
          )
        : report.transcriptMarkdown;
    const url = URL.createObjectURL(
      new Blob([content], {
        type:
          format === 'json'
            ? 'application/json;charset=utf-8'
            : 'text/markdown;charset=utf-8',
      }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `zayuno-report-${report.id}.${format}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Run certification mutation
  const certifyMutation = useMutation({
    mutationFn: async (slug: string) => {
      const res = await apiFetch(`/api/v1/admin/providers/${slug}/certify`, {
        method: 'POST',
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-providers'] });
    },
  });
  const publishMutation = useMutation({
    mutationFn: async (slug: string) => {
      const res = await apiFetch(`/api/v1/admin/providers/${slug}/publish`, {
        method: 'POST',
      });
      return res.json();
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['admin-providers'] }),
  });
  const reopenMutation = useMutation({
    mutationFn: async (slug: string) =>
      (
        await apiFetch(`/api/v1/admin/providers/${slug}/reopen`, {
          method: 'POST',
        })
      ).json(),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['admin-providers'] }),
  });
  const reviewMutation = useMutation({
    mutationFn: async (payload: {
      slug: string;
      decision: 'REQUEST_CHANGES' | 'REJECT' | 'SUSPEND';
      reasonCode: string;
      reason: string;
      requiredChanges: string[];
      internalNote?: string;
    }) => {
      const { slug, ...body } = payload;
      const res = await apiFetch(`/api/v1/admin/providers/${slug}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-providers'] });
      setReviewTarget(null);
      setReviewForm({
        reasonCode: 'MORE_INFORMATION_REQUIRED',
        reason: '',
        requiredChanges: '',
        internalNote: '',
      });
    },
  });
  const submitProviderReview = (event: React.FormEvent) => {
    event.preventDefault();
    if (!reviewTarget) return;
    reviewMutation.mutate({
      ...reviewTarget,
      reasonCode: reviewForm.reasonCode,
      reason: reviewForm.reason.trim(),
      requiredChanges: reviewForm.requiredChanges
        .split('\n')
        .map((value) => value.trim())
        .filter(Boolean),
      internalNote: reviewForm.internalNote.trim() || undefined,
    });
  };

  const createProviderMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch('/api/v1/admin/providers/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...providerForm,
          geography: providerForm.geography
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean),
          baseUrl: providerForm.baseUrl.trim() || undefined,
          webhookUrl: providerForm.webhookUrl.trim() || undefined,
          supportContact: providerForm.supportContact.trim() || undefined,
        }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-providers'] });
      setShowProviderForm(false);
      setCreatedProvider(data);
      setProviderForm({
        name: '',
        slug: '',
        description: '',
        type: 'SERVICES',
        category: 'general',
        geography: 'UZ',
        baseUrl: '',
        supportContact: '',
        webhookUrl: '',
        ownerName: '',
        ownerEmail: '',
        temporaryPassword: '',
        capabilities: [
          'METADATA',
          'HEALTH',
          'CATALOG',
          'QUOTE',
          'ACTION_CREATE',
          'ACTION_STATUS',
          'WEBHOOK',
        ],
      });
    },
  });

  const toggleCapability = (capability: string) =>
    setProviderForm((current) => ({
      ...current,
      capabilities: current.capabilities.includes(capability)
        ? current.capabilities.filter((value) => value !== capability)
        : [...current.capabilities, capability],
    }));

  const actions = Array.isArray(actionsData)
    ? actionsData
    : actionsData?.data || [];
  const providers = Array.isArray(providersData)
    ? providersData
    : providersData?.data || [];

  const isInternalSandbox = (p: any) =>
    p?.slug === 'sandbox-provider' || p?.adapterType === 'sandbox';
  const externalProviders = providers.filter((p: any) => !isInternalSandbox(p));
  const internalProviders = providers.filter((p: any) => isInternalSandbox(p));

  const filteredActions = actions.filter((a: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.publicId?.toLowerCase().includes(q) ||
      a.customer?.name?.toLowerCase().includes(q) ||
      a.customer?.phone?.includes(q) ||
      a.providerSlug?.toLowerCase().includes(q)
    );
  });

  if (!token)
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 grid place-items-center p-6">
        <form
          onSubmit={login}
          className="w-full max-w-md space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-7 shadow-2xl"
        >
          <div>
            <h1 className="text-xl font-bold">Zayuno Operations</h1>
            <p className="mt-1 text-sm text-slate-400">
              Admin hisobingiz bilan kiring.
            </p>
          </div>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5"
          />
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Parol"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5"
          />
          {loginError && <p className="text-sm text-rose-400">{loginError}</p>}
          <button className="w-full rounded-lg bg-emerald-600 px-3 py-2.5 font-semibold hover:bg-emerald-500">
            Kirish
          </button>
        </form>
      </main>
    );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-40 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-900/30">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                Zayuno
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                Action Infrastructure
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Neutral Capability-Based Action Execution Platform
            </p>
          </div>
        </div>

        {/* Live Status Indicators */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-300 font-medium">
              Core API & NATS:{' '}
              <strong className="text-emerald-400">Connected</strong>
            </span>
          </div>

          <a
            href={`${API_BASE}/api/docs`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg border border-slate-700 transition"
          >
            <Terminal className="w-3.5 h-3.5 text-indigo-400" />
            <span>Swagger API</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>

          <a
            href={`${SANDBOX_PROVIDER_BASE}/health`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-bold rounded-lg shadow-md shadow-emerald-900/30 transition"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Sandbox Health</span>
          </a>

          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 text-xs font-semibold rounded-lg border border-rose-500/20 transition cursor-pointer"
            title="Tizimdan chiqish"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Chiqish</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto p-6 gap-6">
        {/* Sidebar Nav */}
        <nav className="w-60 flex-shrink-0 space-y-1.5">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
              activeTab === 'dashboard'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('actions')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition ${
              activeTab === 'actions'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-4 h-4" />
              <span>Live Actions</span>
            </div>
            {actions.length > 0 && (
              <span className="px-2 py-0.5 text-xs font-bold bg-slate-800 text-slate-300 rounded-full">
                {actions.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('providers')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
              activeTab === 'providers'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>Providers & Adapters</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
              activeTab === 'logs'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Webhooks & Audit</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition ${
              activeTab === 'reports'
                ? 'bg-violet-500/10 text-violet-300 border border-violet-500/20'
                : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <Bug className="w-4 h-4" />
              <span>Consumer Reports</span>
            </div>
            {reportsData?.length > 0 && (
              <span className="px-2 py-0.5 text-xs font-bold bg-slate-800 text-slate-300 rounded-full">
                {reportsData.length}
              </span>
            )}
          </button>

          <div className="pt-6 border-t border-slate-800/80 mt-6 px-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              Connected MCP Server
            </p>
            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1">
              <div className="font-semibold text-emerald-400">
                Streamable HTTP & SSE
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                Port :4002 (14 Tools)
              </div>
            </div>
          </div>
        </nav>

        {/* Tab Views */}
        <main className="flex-1 min-w-0">
          {/* 1. DASHBOARD TAB */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* KPI Cards Grid */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
                  <div className="text-xs font-semibold text-slate-400 mb-1">
                    Total GMV (Volume)
                  </div>
                  <div className="text-2xl font-black text-white">
                    {(kpiData?.totalGmv || 0).toLocaleString('uz-UZ')}{' '}
                    <span className="text-xs font-bold text-slate-400">
                      UZS
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>External Settlement Volume</span>
                  </div>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
                  <div className="text-xs font-semibold text-slate-400 mb-1">
                    Total Executed Actions
                  </div>
                  <div className="text-2xl font-black text-white">
                    {kpiData?.totalActions || 0}
                  </div>
                  <div className="mt-3 text-xs text-slate-400">
                    Today:{' '}
                    <strong className="text-white">
                      {kpiData?.todayActions || 0} actions
                    </strong>
                  </div>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
                  <div className="text-xs font-semibold text-slate-400 mb-1">
                    Completed vs Failed
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-emerald-400">
                      {kpiData?.completedActions || 0}
                    </span>
                    <span className="text-slate-500 font-bold">/</span>
                    <span className="text-lg font-bold text-rose-400">
                      {kpiData?.failedActions || 0}
                    </span>
                  </div>
                  <div className="mt-3 text-xs text-slate-400">
                    Success Rate: 100%
                  </div>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
                  <div className="text-xs font-semibold text-slate-400 mb-1">
                    Avg Response Latency
                  </div>
                  <div className="text-2xl font-black text-teal-400">
                    {kpiData?.avgLatencyMs || 24}{' '}
                    <span className="text-xs font-bold text-slate-400">ms</span>
                  </div>
                  <div className="mt-3 text-xs text-slate-400">
                    Redis & In-memory optimized
                  </div>
                </div>
              </div>

              {/* Action Layer Flow Showcase */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-900/60 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      Standard Capability Action Lifecycle
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Progression from discovery to quote, confirmation, payment
                      URL, and fulfillment
                    </p>
                  </div>
                  <button
                    onClick={() => queryClient.invalidateQueries()}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs flex items-center gap-1.5 transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Refresh</span>
                  </button>
                </div>

                <div className="grid grid-cols-5 gap-3 text-center text-xs">
                  <div className="p-3.5 bg-slate-800/60 border border-slate-700/60 rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center mx-auto mb-2">
                      1
                    </div>
                    <div className="font-bold text-white">Discovery</div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      get_catalog & search
                    </div>
                  </div>
                  <div className="p-3.5 bg-slate-800/60 border border-slate-700/60 rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center mx-auto mb-2">
                      2
                    </div>
                    <div className="font-bold text-white">Verified Quote</div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      request_quote pricing
                    </div>
                  </div>
                  <div className="p-3.5 bg-slate-800/60 border border-slate-700/60 rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center mx-auto mb-2">
                      3
                    </div>
                    <div className="font-bold text-white">Confirmed Action</div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      create_action (Idempotent)
                    </div>
                  </div>
                  <div className="p-3.5 bg-slate-800/60 border border-slate-700/60 rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 font-bold flex items-center justify-center mx-auto mb-2">
                      4
                    </div>
                    <div className="font-bold text-white">HMAC Webhooks</div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      State synchronization
                    </div>
                  </div>
                  <div className="p-3.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center mx-auto mb-2">
                      5
                    </div>
                    <div className="font-bold text-emerald-300">
                      Fulfillment
                    </div>
                    <div className="text-[11px] text-emerald-400/80 mt-1">
                      IN_PROGRESS → COMPLETED
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Actions Overview */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-white">
                    Recent Actions Feed
                  </h3>
                  <button
                    onClick={() => setActiveTab('actions')}
                    className="text-xs font-semibold text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    View all <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {actions.length === 0 ? (
                  <div className="text-center py-10 text-slate-500 text-xs">
                    No actions recorded yet. Trigger actions via ChatGPT or MCP
                    client.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {actions.slice(0, 5).map((act: any) => (
                      <div
                        key={act.id}
                        onClick={() => setSelectedAction(act)}
                        className="flex items-center justify-between p-3.5 bg-slate-800/40 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl cursor-pointer transition text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-slate-200">
                            {act.publicId}
                          </span>
                          <span className="text-slate-400">
                            ({act.customer?.name})
                          </span>
                          <span className="text-slate-500 font-medium">
                            | {act.lines?.length} items
                          </span>
                        </div>

                        <div className="flex items-center gap-4">
                          <span className="font-bold text-white">
                            {act.total.toLocaleString('uz-UZ')} UZS
                          </span>
                          <StatusBadge status={act.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2. LIVE ACTIONS TAB */}
          {activeTab === 'actions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">
                    All Platform Actions
                  </h2>
                  <p className="text-xs text-slate-400">
                    Actions dispatched through AI agents and developer APIs
                  </p>
                </div>

                <div className="relative w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Action ID, customer name, or phone..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[850px]">
                    <thead className="bg-slate-800/60 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="p-3.5 whitespace-nowrap">Action ID</th>
                        <th className="p-3.5 whitespace-nowrap">Provider</th>
                        <th className="p-3.5 whitespace-nowrap">Customer</th>
                        <th className="p-3.5 whitespace-nowrap">Offerings</th>
                        <th className="p-3.5 whitespace-nowrap">
                          Total Amount
                        </th>
                        <th className="p-3.5 whitespace-nowrap">Status</th>
                        <th className="p-3.5 whitespace-nowrap">Time</th>
                        <th className="p-3.5 text-right whitespace-nowrap">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {filteredActions.map((act: any) => (
                        <tr
                          key={act.id}
                          className="hover:bg-slate-800/40 transition"
                        >
                          <td className="p-3.5 font-mono font-bold text-emerald-400 whitespace-nowrap">
                            {act.publicId}
                          </td>
                          <td className="p-3.5 font-semibold text-slate-200 whitespace-nowrap">
                            {act.providerName || act.providerSlug}
                          </td>
                          <td className="p-3.5 whitespace-nowrap">
                            <div className="font-medium text-slate-200">
                              {act.customer?.name}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {act.customer?.phone}
                            </div>
                          </td>
                          <td className="p-3.5 text-slate-300 max-w-xs truncate">
                            {act.lines
                              ?.map(
                                (it: any) =>
                                  `${it.quantity}× ${it.offeringTitle || it.offeringId}`,
                              )
                              .join(', ')}
                          </td>
                          <td className="p-3.5 font-bold text-white whitespace-nowrap">
                            {act.total.toLocaleString('uz-UZ')} UZS
                            <span className="block text-[10px] text-slate-400 font-normal uppercase">
                              {act.paymentMethod}
                            </span>
                          </td>
                          <td className="p-3.5 whitespace-nowrap">
                            <StatusBadge status={act.status} />
                          </td>
                          <td className="p-3.5 text-slate-400 text-[11px] whitespace-nowrap">
                            {new Date(act.createdAt).toLocaleTimeString()}
                          </td>
                          <td className="p-3.5 text-right whitespace-nowrap">
                            <button
                              onClick={() => setSelectedAction(act)}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition"
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 3. PROVIDERS TAB */}
          {activeTab === 'providers' && (
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-white">
                    Capability Providers
                  </h2>
                  <p className="text-xs text-slate-400">
                    Registered external provider adapters and supported
                    capabilities
                  </p>
                </div>
                <button
                  onClick={() => setShowProviderForm((value) => !value)}
                  className="rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-500"
                >
                  {showProviderForm ? 'Bekor qilish' : '+ Provider qo‘shish'}
                </button>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <div className="mb-3 flex items-center gap-2 text-xs font-bold text-slate-300">
                  <Search className="h-4 w-4" /> Provider filtrlari
                </div>
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
                  <input
                    value={providerFilters.query}
                    onChange={(event) =>
                      setProviderFilters((current) => ({
                        ...current,
                        query: event.target.value,
                      }))
                    }
                    placeholder="Nomi yoki slug..."
                    className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs"
                  />
                  <select
                    value={providerFilters.status}
                    onChange={(event) =>
                      setProviderFilters((current) => ({
                        ...current,
                        status: event.target.value,
                      }))
                    }
                    className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs"
                  >
                    <option value="ALL">Barcha provider statuslari</option>
                    {[
                      'DRAFT',
                      'SANDBOX',
                      'ACTIVE',
                      'SUSPENDED',
                      'DISABLED',
                    ].map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                  <select
                    value={providerFilters.reviewStatus}
                    onChange={(event) =>
                      setProviderFilters((current) => ({
                        ...current,
                        reviewStatus: event.target.value,
                      }))
                    }
                    className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs"
                  >
                    <option value="ALL">Barcha review statuslari</option>
                    {[
                      'DRAFT',
                      'PENDING_APPROVAL',
                      'CHANGES_REQUESTED',
                      'APPROVED',
                      'REJECTED',
                      'SUSPENDED',
                    ].map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                  <select
                    value={providerFilters.type}
                    onChange={(event) =>
                      setProviderFilters((current) => ({
                        ...current,
                        type: event.target.value,
                      }))
                    }
                    className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs"
                  >
                    <option value="ALL">Barcha turlar</option>
                    {[
                      'DELIVERY',
                      'SERVICES',
                      'BOOKINGS',
                      'TICKETING',
                      'RETAIL',
                      'COMMERCE',
                      'DIGITAL',
                      'OTHER',
                    ].map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                  <select
                    value={providerFilters.capability}
                    onChange={(event) =>
                      setProviderFilters((current) => ({
                        ...current,
                        capability: event.target.value,
                      }))
                    }
                    className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs"
                  >
                    <option value="ALL">Barcha capabilitylar</option>
                    {[
                      'METADATA',
                      'HEALTH',
                      'LOCATIONS',
                      'CATALOG',
                      'SEARCH',
                      'QUOTE',
                      'ACTION_CREATE',
                      'ACTION_STATUS',
                      'ACTION_CANCEL',
                      'PAYMENT_OPTIONS',
                      'WEBHOOK',
                    ].map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                  <input
                    value={providerFilters.category}
                    onChange={(event) =>
                      setProviderFilters((current) => ({
                        ...current,
                        category: event.target.value,
                      }))
                    }
                    placeholder="Kategoriya..."
                    className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs"
                  />
                  <input
                    value={providerFilters.geography}
                    onChange={(event) =>
                      setProviderFilters((current) => ({
                        ...current,
                        geography: event.target.value,
                      }))
                    }
                    placeholder="Hudud..."
                    className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs"
                  />
                  <input
                    type="email"
                    value={providerFilters.ownerEmail}
                    onChange={(event) =>
                      setProviderFilters((current) => ({
                        ...current,
                        ownerEmail: event.target.value,
                      }))
                    }
                    placeholder="Owner email..."
                    className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs"
                  />
                  <select
                    value={providerFilters.certified}
                    onChange={(event) =>
                      setProviderFilters((current) => ({
                        ...current,
                        certified: event.target.value,
                      }))
                    }
                    className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs"
                  >
                    <option value="ALL">Certification: barchasi</option>
                    <option value="true">Certified</option>
                    <option value="false">Not certified</option>
                  </select>
                  <button
                    onClick={() =>
                      setProviderFilters({
                        query: '',
                        status: 'ALL',
                        reviewStatus: 'ALL',
                        type: 'ALL',
                        capability: 'ALL',
                        category: '',
                        geography: '',
                        certified: 'ALL',
                        ownerEmail: '',
                        from: '',
                        to: '',
                      })
                    }
                    className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                  >
                    Filtrlarni tozalash
                  </button>
                </div>
                <div className="mt-3 text-right text-[11px] text-slate-500">
                  Topildi: {providersData?.total ?? providers.length} ta
                  provider
                </div>
              </div>

              {showProviderForm && (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    createProviderMutation.mutate();
                  }}
                  className="space-y-4 rounded-2xl border border-emerald-500/30 bg-slate-900 p-5"
                >
                  <div>
                    <h3 className="font-bold text-white">
                      Yangi provider arizasi
                    </h3>
                    <p className="mt-1 text-xs text-slate-400">
                      Provider avval DRAFT bo‘ladi. Certification va admin
                      review’dan keyingina MCP qidiruviga chiqariladi.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="text-xs text-slate-300">
                      Biznes nomi
                      <input
                        required
                        value={providerForm.name}
                        onChange={(e) =>
                          setProviderForm({
                            ...providerForm,
                            name: e.target.value,
                          })
                        }
                        className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                        placeholder="Coffee Time"
                      />
                    </label>
                    <label className="text-xs text-slate-300">
                      Slug
                      <input
                        required
                        pattern="[a-z0-9-]+"
                        value={providerForm.slug}
                        onChange={(e) =>
                          setProviderForm({
                            ...providerForm,
                            slug: e.target.value
                              .toLowerCase()
                              .replace(/[^a-z0-9-]/g, '-'),
                          })
                        }
                        className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                        placeholder="coffee-time"
                      />
                    </label>
                    <label className="text-xs text-slate-300">
                      Kategoriya
                      <input
                        required
                        value={providerForm.category}
                        onChange={(e) =>
                          setProviderForm({
                            ...providerForm,
                            category: e.target.value,
                          })
                        }
                        className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                        placeholder="food_delivery"
                      />
                    </label>
                    <label className="text-xs text-slate-300">
                      Turi
                      <select
                        value={providerForm.type}
                        onChange={(e) =>
                          setProviderForm({
                            ...providerForm,
                            type: e.target.value,
                          })
                        }
                        className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                      >
                        {[
                          'DELIVERY',
                          'SERVICES',
                          'BOOKINGS',
                          'TICKETING',
                          'RETAIL',
                          'COMMERCE',
                          'DIGITAL',
                          'OTHER',
                        ].map((type) => (
                          <option key={type}>{type}</option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs text-slate-300">
                      API base URL{' '}
                      <span className="text-slate-500">
                        (keyin ham qo‘shish mumkin)
                      </span>
                      <input
                        type="url"
                        value={providerForm.baseUrl}
                        onChange={(e) =>
                          setProviderForm({
                            ...providerForm,
                            baseUrl: e.target.value,
                          })
                        }
                        className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                        placeholder="https://api.coffeetime.uz"
                      />
                    </label>
                    <label className="text-xs text-slate-300">
                      Hududlar{' '}
                      <span className="text-slate-500">(vergul bilan)</span>
                      <input
                        value={providerForm.geography}
                        onChange={(e) =>
                          setProviderForm({
                            ...providerForm,
                            geography: e.target.value,
                          })
                        }
                        className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                        placeholder="Tashkent, UZ"
                      />
                    </label>
                    <label className="text-xs text-slate-300">
                      Provider egasi ismi
                      <input
                        required
                        value={providerForm.ownerName}
                        onChange={(e) =>
                          setProviderForm({
                            ...providerForm,
                            ownerName: e.target.value,
                          })
                        }
                        className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                        placeholder="Aziz Karimov"
                      />
                    </label>
                    <label className="text-xs text-slate-300">
                      Provider egasi emaili
                      <input
                        required
                        type="email"
                        value={providerForm.ownerEmail}
                        onChange={(e) =>
                          setProviderForm({
                            ...providerForm,
                            ownerEmail: e.target.value,
                          })
                        }
                        className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                        placeholder="owner@coffeetime.uz"
                      />
                    </label>
                    <label className="text-xs text-slate-300">
                      Vaqtinchalik parol{' '}
                      <span className="text-slate-500">(kamida 12 belgi)</span>
                      <input
                        required
                        minLength={12}
                        type="password"
                        value={providerForm.temporaryPassword}
                        onChange={(e) =>
                          setProviderForm({
                            ...providerForm,
                            temporaryPassword: e.target.value,
                          })
                        }
                        className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                        placeholder="Provider egasiga beriladigan parol"
                      />
                    </label>
                  </div>
                  <label className="block text-xs text-slate-300">
                    Tavsif
                    <textarea
                      value={providerForm.description}
                      onChange={(e) =>
                        setProviderForm({
                          ...providerForm,
                          description: e.target.value,
                        })
                      }
                      className="mt-1.5 min-h-20 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                      placeholder="Biznes va uning xizmatlarini qisqacha yozing."
                    />
                  </label>
                  <div>
                    <p className="text-xs font-semibold text-slate-300">
                      Capabilities
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {[
                        'METADATA',
                        'HEALTH',
                        'LOCATIONS',
                        'CATALOG',
                        'SEARCH',
                        'QUOTE',
                        'ACTION_CREATE',
                        'ACTION_STATUS',
                        'ACTION_CANCEL',
                        'PAYMENT_OPTIONS',
                        'WEBHOOK',
                      ].map((capability) => (
                        <label
                          key={capability}
                          className="flex cursor-pointer items-center gap-1.5 rounded bg-slate-800 px-2 py-1 text-[11px] text-slate-200"
                        >
                          <input
                            type="checkbox"
                            checked={providerForm.capabilities.includes(
                              capability,
                            )}
                            onChange={() => toggleCapability(capability)}
                          />{' '}
                          {capability}
                        </label>
                      ))}
                    </div>
                  </div>
                  {createProviderMutation.isError && (
                    <p className="text-sm text-rose-400">
                      {(createProviderMutation.error as Error).message}
                    </p>
                  )}
                  <div className="flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowProviderForm(false)}
                      className="px-3 py-2 text-xs font-semibold text-slate-300"
                    >
                      Bekor qilish
                    </button>
                    <button
                      disabled={
                        createProviderMutation.isPending ||
                        providerForm.capabilities.length === 0
                      }
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
                    >
                      {createProviderMutation.isPending
                        ? 'Yaratilmoqda...'
                        : 'DRAFT provider yaratish'}
                    </button>
                  </div>
                </form>
              )}

              {createdProvider && (
                <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-5 text-sm text-amber-50">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-bold">
                        Provider arizasi yaratildi:{' '}
                        {createdProvider.provider?.name}
                      </h3>
                      <p className="mt-1 text-xs text-amber-100/80">
                        Provider egasi{' '}
                        <code>{createdProvider.owner?.email}</code> bilan
                        partners.zayuno.uz ga kira oladi. Provider saqlanib
                        bo‘ldi; “Yopish” faqat ushbu credential ko‘rinishini
                        yopadi.
                      </p>
                    </div>
                    <button
                      onClick={() => setCreatedProvider(null)}
                      className="text-xs font-bold text-amber-100"
                    >
                      Yopish
                    </button>
                  </div>
                  <div className="mt-4 grid gap-3 text-xs">
                    <div className="rounded-xl border border-amber-400/20 bg-slate-950/70 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-bold text-amber-200">
                            Provider API key
                          </div>
                          <p className="mt-1 text-[11px] leading-5 text-slate-400">
                            Zayuno provider API’ga so‘rov yuborganda{' '}
                            <code>x-provider-api-key</code> orqali o‘zini
                            tasdiqlaydi. Provider serveridagi{' '}
                            <code>PROVIDER_API_KEY</code> qiymatiga qo‘ying.
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            copyCredential(
                              createdProvider.credentials?.sandboxApiKey,
                              'api',
                            )
                          }
                          className="rounded bg-amber-500 px-2.5 py-1.5 font-bold text-slate-950"
                        >
                          {copiedCredential === 'api' ? 'Nusxalandi' : 'Copy'}
                        </button>
                      </div>
                      <code className="mt-2 block overflow-x-auto rounded bg-black/40 p-2 font-mono">
                        {createdProvider.credentials?.sandboxApiKey}
                      </code>
                    </div>
                    <div className="rounded-xl border border-amber-400/20 bg-slate-950/70 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-bold text-amber-200">
                            Webhook secret
                          </div>
                          <p className="mt-1 text-[11px] leading-5 text-slate-400">
                            Provider Zayunoga webhook yuborganda HMAC imzo
                            yaratadi. Provider serveridagi{' '}
                            <code>ZAYUNO_WEBHOOK_SECRET</code> qiymatiga
                            qo‘ying.
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            copyCredential(
                              createdProvider.credentials?.sandboxWebhookSecret,
                              'webhook',
                            )
                          }
                          className="rounded bg-amber-500 px-2.5 py-1.5 font-bold text-slate-950"
                        >
                          {copiedCredential === 'webhook'
                            ? 'Nusxalandi'
                            : 'Copy'}
                        </button>
                      </div>
                      <code className="mt-2 block overflow-x-auto rounded bg-black/40 p-2 font-mono">
                        {createdProvider.credentials?.sandboxWebhookSecret}
                      </code>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-[11px] text-amber-100/70">
                        Refreshdan keyin to‘liq qiymatlar qayta ko‘rsatilmaydi.
                        Yo‘qolsa key-management orqali replacement chiqariladi.
                      </p>
                      <button
                        onClick={downloadProviderEnv}
                        className="rounded-lg border border-amber-400/40 px-3 py-2 text-xs font-bold text-amber-100 hover:bg-amber-400/10"
                      >
                        .env yuklab olish
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Scope Selector: External vs Internal vs All */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setProviderScope('EXTERNAL')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                      providerScope === 'EXTERNAL'
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>External Providers</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] ${providerScope === 'EXTERNAL' ? 'bg-emerald-700 text-white' : 'bg-slate-800 text-slate-400'}`}
                    >
                      {externalProviders.length}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setProviderScope('INTERNAL')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                      providerScope === 'INTERNAL'
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-950'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Cpu className="w-3.5 h-3.5" />
                    <span>Internal / Demo Providers</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] ${providerScope === 'INTERNAL' ? 'bg-purple-700 text-white' : 'bg-slate-800 text-slate-400'}`}
                    >
                      {internalProviders.length}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setProviderScope('ALL')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                      providerScope === 'ALL'
                        ? 'bg-slate-700 text-white shadow-md shadow-slate-950'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>All Providers</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] ${providerScope === 'ALL' ? 'bg-slate-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                    >
                      {providers.length}
                    </span>
                  </button>
                </div>
              </div>

              {/* 1. EXTERNAL PROVIDERS SECTION */}
              {(providerScope === 'EXTERNAL' || providerScope === 'ALL') && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                        External Providers
                      </h3>
                      <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-slate-800 text-slate-400">
                        {externalProviders.length}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 hidden sm:inline">
                      Haqiqiy bizneslar va tashqi servis integratsiyalari
                    </span>
                  </div>

                  {externalProviders.length === 0 ? (
                    <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-2xl text-xs text-slate-400">
                      Tashqi providerlar topilmadi.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {externalProviders.map((p: any) => (
                        <div
                          key={p.id}
                          className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xl font-black text-emerald-400">
                                ⚡
                              </div>
                              <div>
                                <h3 className="text-base font-bold text-white">
                                  {p.name}
                                </h3>
                                <span className="text-xs font-mono text-slate-400">
                                  slug: {p.slug}
                                </span>
                              </div>
                            </div>
                            <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              {p.status}
                            </span>
                          </div>

                          <div className="text-xs text-slate-300 space-y-1">
                            <div>
                              <span className="text-slate-500">Base URL:</span>{' '}
                              <code className="bg-slate-800 px-2 py-0.5 rounded text-amber-300">
                                {p.baseUrl || 'In-Process'}
                              </code>
                            </div>
                            <div>
                              <span className="text-slate-500">
                                Adapter Type:
                              </span>{' '}
                              <code className="bg-slate-800 px-2 py-0.5 rounded text-emerald-300">
                                {p.adapterType}
                              </code>
                            </div>
                            <div>
                              <span className="text-slate-500">
                                Type / Fulfillment:
                              </span>{' '}
                              {p.type}{' '}
                              {p.fulfillmentMode
                                ? `(${p.fulfillmentMode})`
                                : ''}
                            </div>
                            <div>
                              <span className="text-slate-500">
                                Faol filiallar:
                              </span>{' '}
                              {p.activeLocationsCount ?? 0}
                            </div>
                            {p.metadata?.healthMonitoring && (
                              <div className="flex items-center gap-2 pt-1">
                                <span className="text-slate-500">
                                  Server Health:
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                    p.metadata.healthMonitoring.state ===
                                    'HEALTHY'
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                      : p.metadata.healthMonitoring.state ===
                                          'DEGRADED'
                                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                        : p.metadata.healthMonitoring.state ===
                                            'RECOVERING'
                                          ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                  }`}
                                >
                                  {p.metadata.healthMonitoring.state ||
                                    'UNKNOWN'}
                                </span>
                                {typeof p.metadata.healthMonitoring
                                  .lastLatencyMs === 'number' && (
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    {p.metadata.healthMonitoring.lastLatencyMs}
                                    ms
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <div
                            className={`rounded-xl border p-3 text-xs ${p.discoveryReady ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-200' : 'border-amber-500/30 bg-amber-950/20 text-amber-100'}`}
                          >
                            <div className="font-bold">
                              {p.discoveryReady
                                ? 'AI discovery: KO‘RINADI'
                                : 'AI discovery: YASHIRILGAN'}
                            </div>
                            {!p.discoveryReady && (
                              <p className="mt-1 text-[11px] text-amber-200/80">
                                Sabab:{' '}
                                {(p.discoveryUnreadyReasons || [])
                                  .map(formatDiscoveryReason)
                                  .join(', ') ||
                                  'Discovery readiness talablari bajarilmagan.'}
                              </p>
                            )}
                          </div>

                          <div>
                            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold block mb-1.5">
                              Capabilities ({p.capabilities?.length || 0})
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {p.capabilities?.map((cap: string) => (
                                <span
                                  key={cap}
                                  className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] font-mono"
                                >
                                  {cap}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="pt-3 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2">
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => certifyMutation.mutate(p.slug)}
                                disabled={certifyMutation.isPending}
                                aria-busy={
                                  certifyMutation.isPending &&
                                  certifyMutation.variables === p.slug
                                }
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                              >
                                {certifyMutation.isPending &&
                                certifyMutation.variables === p.slug ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                )}
                                <span>
                                  {certifyMutation.isPending &&
                                  certifyMutation.variables === p.slug
                                    ? 'Tekshirilmoqda...'
                                    : 'Run Capability Certification'}
                                </span>
                              </button>
                              {(p.isCertified || p.metadata?.isCertified) &&
                                (p.reviewStatus === 'PENDING_APPROVAL' ||
                                  p.metadata?.reviewStatus ===
                                    'PENDING_APPROVAL') && (
                                  <button
                                    onClick={() =>
                                      publishMutation.mutate(p.slug)
                                    }
                                    disabled={publishMutation.isPending}
                                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold transition"
                                  >
                                    {publishMutation.isPending
                                      ? 'Tasdiqlanmoqda...'
                                      : 'ACTIVE qilish'}
                                  </button>
                                )}
                              {(p.reviewStatus === 'PENDING_APPROVAL' ||
                                p.metadata?.reviewStatus ===
                                  'PENDING_APPROVAL') && (
                                <button
                                  onClick={() =>
                                    setReviewTarget({
                                      slug: p.slug,
                                      name: p.name,
                                      decision: 'REQUEST_CHANGES',
                                    })
                                  }
                                  className="px-3 py-1.5 border border-amber-500/40 text-amber-300 hover:bg-amber-500/10 rounded-lg text-xs font-bold transition"
                                >
                                  Tuzatish so‘rash
                                </button>
                              )}
                              {p.status !== 'SUSPENDED' &&
                                p.slug !== 'mock-evos' && (
                                  <button
                                    onClick={() =>
                                      setReviewTarget({
                                        slug: p.slug,
                                        name: p.name,
                                        decision:
                                          p.reviewStatus ===
                                            'PENDING_APPROVAL' ||
                                          p.metadata?.reviewStatus ===
                                            'PENDING_APPROVAL'
                                            ? 'REJECT'
                                            : 'SUSPEND',
                                      })
                                    }
                                    disabled={reviewMutation.isPending}
                                    className="px-3 py-1.5 border border-rose-500/40 text-rose-300 hover:bg-rose-500/10 rounded-lg text-xs font-bold transition"
                                  >
                                    {p.reviewStatus === 'PENDING_APPROVAL' ||
                                    p.metadata?.reviewStatus ===
                                      'PENDING_APPROVAL'
                                      ? 'Rad etish'
                                      : 'Suspend'}
                                  </button>
                                )}
                              {p.status === 'SUSPENDED' &&
                                ['REJECTED', 'SUSPENDED'].includes(
                                  p.reviewStatus || p.metadata?.reviewStatus,
                                ) && (
                                  <button
                                    onClick={() =>
                                      reopenMutation.mutate(p.slug)
                                    }
                                    disabled={reopenMutation.isPending}
                                    className="px-3 py-1.5 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/10 rounded-lg text-xs font-bold transition"
                                  >
                                    Qayta ochish
                                  </button>
                                )}
                            </div>

                            {p.baseUrl && (
                              <a
                                href={`${p.baseUrl}/health`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-semibold"
                              >
                                <span>Health</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>

                          {certifyMutation.data &&
                            certifyMutation.data.providerSlug === p.slug && (
                              <div
                                className={`mt-3 p-3 bg-slate-950 border rounded-xl text-xs space-y-1 ${certifyMutation.data.isProductionReady ? 'border-emerald-500/30' : 'border-rose-500/30'}`}
                              >
                                <div
                                  className={`font-bold flex items-center gap-1 ${certifyMutation.data.isProductionReady ? 'text-emerald-400' : 'text-rose-400'}`}
                                >
                                  {certifyMutation.data.isProductionReady ? (
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  ) : (
                                    <AlertCircle className="w-3.5 h-3.5" />
                                  )}
                                  <span>
                                    Certification Result:{' '}
                                    {certifyMutation.data.passedCount}/
                                    {certifyMutation.data.totalTests} tests
                                    passed
                                    {typeof certifyMutation.data.durationMs ===
                                    'number'
                                      ? ` (${certifyMutation.data.durationMs}ms)`
                                      : ''}
                                  </span>
                                </div>
                              </div>
                            )}
                          {certifyMutation.isError &&
                            certifyMutation.variables === p.slug && (
                              <div className="mt-3 p-3 bg-rose-950/30 border border-rose-500/30 rounded-xl text-xs font-semibold text-rose-300">
                                Certification ishga tushmadi:{' '}
                                {(certifyMutation.error as Error)?.message ||
                                  'Noma’lum xatolik'}
                              </div>
                            )}
                          {p.metadata?.reviewReason && (
                            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs">
                              <div className="font-mono text-[10px] text-amber-300">
                                {p.metadata.reviewStatus} ·{' '}
                                {p.metadata.reviewReasonCode || 'OTHER'}
                              </div>
                              <p className="mt-1 text-amber-50">
                                {p.metadata.reviewReason}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 2. INTERNAL / DEMO PROVIDERS SECTION */}
              {(providerScope === 'INTERNAL' || providerScope === 'ALL') && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between border-t border-slate-800/80 pt-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded bg-purple-500/20 text-purple-400">
                        <Cpu className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-bold uppercase tracking-wider text-purple-300">
                        Internal / Demo Providers
                      </h3>
                      <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-purple-500/20 text-purple-300">
                        {internalProviders.length}
                      </span>
                    </div>
                    <span className="text-xs text-purple-400/80 hidden sm:inline">
                      Developer Sandbox va simulyator uchun ichki test
                      xizmatlari
                    </span>
                  </div>

                  {internalProviders.length === 0 ? (
                    <div className="p-8 text-center bg-slate-900/40 border border-purple-500/20 rounded-2xl text-xs text-slate-400">
                      Ichki sandbox providerlar topilmadi.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {internalProviders.map((p: any) => (
                        <div
                          key={p.id}
                          className="bg-slate-900/90 border border-purple-500/40 rounded-2xl p-5 space-y-4 shadow-lg shadow-purple-950/20"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-xl font-black text-purple-400">
                                <Cpu className="w-6 h-6" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="text-base font-bold text-white">
                                    {p.name}
                                  </h3>
                                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/40 uppercase tracking-wide">
                                    DEMO — public emas
                                  </span>
                                </div>
                                <span className="text-xs font-mono text-slate-400">
                                  slug: {p.slug}
                                </span>
                              </div>
                            </div>
                            <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1.5">
                              <Cpu className="w-3.5 h-3.5" /> INTERNAL SANDBOX
                            </span>
                          </div>

                          <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-3 text-xs text-purple-200 flex items-start gap-2.5">
                            <Cpu className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                            <p className="leading-relaxed">
                              Developer Sandbox Simulator uchun ichki test
                              provideri. MCP public discovery’da ko‘rinmaydi.
                            </p>
                          </div>

                          <div className="text-xs text-slate-300 space-y-1">
                            <div>
                              <span className="text-slate-500">Base URL:</span>{' '}
                              <code className="bg-slate-800 px-2 py-0.5 rounded text-amber-300">
                                {p.baseUrl || 'In-Process (Local / Memory)'}
                              </code>
                            </div>
                            <div>
                              <span className="text-slate-500">
                                Adapter Type:
                              </span>{' '}
                              <code className="bg-purple-950/60 text-purple-300 border border-purple-800/60 px-2 py-0.5 rounded">
                                {p.adapterType}
                              </code>
                            </div>
                            <div>
                              <span className="text-slate-500">Type:</span>{' '}
                              {p.type}
                            </div>
                          </div>

                          <div>
                            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold block mb-1.5">
                              Capabilities ({p.capabilities?.length || 0})
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {p.capabilities?.map((cap: string) => (
                                <span
                                  key={cap}
                                  className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] font-mono"
                                >
                                  {cap}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="pt-3 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2">
                            <span
                              title="Internal sandbox provider boshqarilmaydi."
                              className="text-xs text-slate-400 italic bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-1.5 cursor-not-allowed select-none"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                              Internal sandbox provider boshqarilmaydi.
                            </span>

                            {p.baseUrl && (
                              <a
                                href={`${p.baseUrl}/health`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-semibold"
                              >
                                <span>Health</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 4. LOGS TAB */}
          {activeTab === 'reports' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-white">
                    Consumer reports
                  </h2>
                  <p className="text-xs text-slate-400">
                    Screenshot, chat transcript, latency va qurilma konteksti
                  </p>
                </div>
                <select
                  value={reportStatus}
                  onChange={(event) => setReportStatus(event.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs"
                >
                  <option value="ALL">Barcha statuslar</option>
                  <option value="OPEN">Open</option>
                  <option value="INVESTIGATING">Investigating</option>
                  <option value="RESOLVED">Resolved</option>
                </select>
              </div>
              {reportsLoading ? (
                <div className="py-16 text-center text-sm text-slate-500">
                  Reportlar yuklanmoqda…
                </div>
              ) : reportsData?.length ? (
                reportsData.map((report: any) => (
                  <article
                    key={report.id}
                    className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80"
                  >
                    <div className="flex items-start justify-between gap-4 border-b border-slate-800 p-5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-violet-300">
                            {report.id}
                          </span>
                          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                            {report.status}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-100">
                          {report.description || 'Izoh kiritilmagan'}
                        </p>
                        <p className="mt-2 text-[11px] text-slate-500">
                          {report.user?.name ||
                            report.user?.email ||
                            'Noma’lum foydalanuvchi'}{' '}
                          · {new Date(report.createdAt).toLocaleString()}
                        </p>
                      </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => downloadReport(report, 'md')} className="rounded-lg border border-slate-700 px-2.5 py-2 text-xs text-slate-300 hover:bg-slate-800">Markdown</button>
                      <button onClick={() => downloadReport(report, 'json')} className="rounded-lg border border-slate-700 px-2.5 py-2 text-xs text-slate-300 hover:bg-slate-800">JSON</button>
                      <select
                        value={report.status}
                        onChange={(event) =>
                          updateReportMutation.mutate({
                            id: report.id,
                            status: event.target.value,
                          })
                        }
                        className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs"
                      >
                        <option value="OPEN">Open</option>
                        <option value="INVESTIGATING">Investigating</option>
                        <option value="RESOLVED">Resolved</option>
                      </select>
                    </div>
                    </div>
                    <div className="grid gap-5 p-5 lg:grid-cols-[280px_1fr]">
                      <div className="space-y-3">
                        {report.screenshotDataUrl ? (
                          <img
                            src={report.screenshotDataUrl}
                            alt="Consumer report screenshot"
                            className="max-h-[520px] w-full rounded-xl border border-slate-700 object-contain bg-black"
                          />
                        ) : (
                          <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-xs text-slate-500">
                            Screenshot yo‘q
                          </div>
                        )}
                        <pre className="overflow-x-auto rounded-xl bg-slate-950 p-3 text-[10px] leading-5 text-slate-400">
                          {JSON.stringify(report.metadata || {}, null, 2)}
                        </pre>
                      </div>
                      <pre className="max-h-[620px] overflow-auto whitespace-pre-wrap rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs leading-6 text-slate-300">
                        {report.transcriptMarkdown}
                      </pre>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-800 py-16 text-center text-sm text-slate-500">
                  Hozircha report yo‘q.
                </div>
              )}
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">
                    Operational Logs & Action Trace
                  </h2>
                  <p className="text-xs text-slate-400">
                    Integration, webhook, action va moderatsiya eventlari.
                    Exportlar avtomatik redacted qilinadi.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => exportLogs('json')}
                    className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-500"
                  >
                    JSON export
                  </button>
                  <button
                    onClick={() => exportLogs('csv')}
                    className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800"
                  >
                    CSV export
                  </button>
                </div>
              </div>

              <div className="grid gap-2 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 md:grid-cols-2 xl:grid-cols-6">
                <select
                  value={logFilters.source}
                  onChange={(event) =>
                    setLogFilters((current) => ({
                      ...current,
                      source: event.target.value,
                    }))
                  }
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs"
                >
                  <option value="ALL">Barcha manbalar</option>
                  {['INTEGRATION', 'WEBHOOK', 'ACTION', 'MODERATION'].map(
                    (value) => (
                      <option key={value}>{value}</option>
                    ),
                  )}
                </select>
                <input
                  value={logFilters.provider}
                  onChange={(event) =>
                    setLogFilters((current) => ({
                      ...current,
                      provider: event.target.value,
                    }))
                  }
                  placeholder="Provider slug..."
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs"
                />
                <input
                  value={logFilters.actionId}
                  onChange={(event) =>
                    setLogFilters((current) => ({
                      ...current,
                      actionId: event.target.value,
                    }))
                  }
                  placeholder="Action ID..."
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs"
                />
                <input
                  value={logFilters.query}
                  onChange={(event) =>
                    setLogFilters((current) => ({
                      ...current,
                      query: event.target.value,
                    }))
                  }
                  placeholder="Event, trace, xatolik..."
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs"
                />
                <input
                  type="date"
                  value={logFilters.from}
                  onChange={(event) =>
                    setLogFilters((current) => ({
                      ...current,
                      from: event.target.value,
                    }))
                  }
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs"
                />
                <input
                  type="date"
                  value={logFilters.to}
                  onChange={(event) =>
                    setLogFilters((current) => ({
                      ...current,
                      to: event.target.value,
                    }))
                  }
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs"
                />
                <button
                  onClick={() =>
                    setLogFilters({
                      source: 'ALL',
                      provider: '',
                      actionId: '',
                      query: '',
                      from: '',
                      to: '',
                    })
                  }
                  className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Filtrlarni tozalash
                </button>
                <div className="flex items-center text-[11px] text-slate-500">
                  {logsFetching
                    ? 'Yangilanmoqda…'
                    : `${operationalLogs?.total || 0} ta event`}
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-xs min-w-[850px]">
                    <thead className="bg-slate-800/60 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="p-3.5 whitespace-nowrap">
                          Manba / Event
                        </th>
                        <th className="p-3.5 whitespace-nowrap">Provider</th>
                        <th className="p-3.5 whitespace-nowrap">
                          Action / Trace
                        </th>
                        <th className="p-3.5 whitespace-nowrap">Status</th>
                        <th className="p-3.5 whitespace-nowrap">Xabar</th>
                        <th className="p-3.5 text-right whitespace-nowrap">
                          Time
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {logsLoading ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="p-8 text-center text-slate-400"
                          >
                            Loglar yuklanmoqda…
                          </td>
                        </tr>
                      ) : (operationalLogs?.data || []).length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="p-8 text-center text-slate-400"
                          >
                            Tanlangan filtrlar bo‘yicha event topilmadi.
                          </td>
                        </tr>
                      ) : (
                        (operationalLogs?.data || []).map((log: any) => (
                          <tr
                            key={log.id}
                            className="hover:bg-slate-800/40 transition"
                          >
                            <td className="p-3.5 whitespace-nowrap">
                              <div className="font-mono font-bold text-amber-300">
                                {log.eventType}
                              </div>
                              <div className="mt-1 text-[10px] text-slate-500">
                                {log.source}
                                {log.durationMs != null
                                  ? ` · ${log.durationMs}ms`
                                  : ''}
                              </div>
                            </td>
                            <td className="p-3.5 whitespace-nowrap">
                              <div className="font-semibold text-slate-200">
                                {log.providerName || 'Platform'}
                              </div>
                              <div className="font-mono text-[10px] text-slate-500">
                                {log.providerSlug}
                              </div>
                            </td>
                            <td className="p-3.5 font-mono text-[10px] text-indigo-300 whitespace-nowrap">
                              <div>{log.actionId || '—'}</div>
                              <div className="mt-1 text-slate-500">
                                {log.traceId || ''}
                              </div>
                            </td>
                            <td className="p-3.5 whitespace-nowrap">
                              <span
                                className={`rounded border px-2 py-1 text-[10px] font-bold ${log.severity === 'ERROR' ? 'border-rose-500/30 bg-rose-500/10 text-rose-300' : log.severity === 'WARN' ? 'border-amber-500/30 bg-amber-500/10 text-amber-300' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'}`}
                              >
                                {log.status || log.severity}
                              </span>
                            </td>
                            <td className="max-w-md p-3.5 text-slate-300">
                              <div className="line-clamp-2">{log.message}</div>
                            </td>
                            <td className="p-3.5 text-right text-[11px] text-slate-500 whitespace-nowrap">
                              {new Date(log.createdAt).toLocaleString('uz-UZ')}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {reviewTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm">
          <form
            onSubmit={submitProviderReview}
            className="my-8 w-full max-w-2xl space-y-4 rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                  Provider moderatsiyasi
                </div>
                <h3 className="mt-1 text-lg font-bold text-white">
                  {reviewTarget.name}
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Qaror: {reviewTarget.decision}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReviewTarget(null)}
                className="rounded-full bg-slate-800 px-3 py-1.5 text-sm"
              >
                ✕
              </button>
            </div>
            <label className="block text-xs text-slate-300">
              Sabab kategoriyasi
              <select
                required
                value={reviewForm.reasonCode}
                onChange={(event) =>
                  setReviewForm((current) => ({
                    ...current,
                    reasonCode: event.target.value,
                  }))
                }
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm"
              >
                {REVIEW_REASON_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-slate-300">
              Partnerga ko‘rinadigan aniq izoh
              <textarea
                required
                minLength={12}
                rows={4}
                value={reviewForm.reason}
                onChange={(event) =>
                  setReviewForm((current) => ({
                    ...current,
                    reason: event.target.value,
                  }))
                }
                placeholder="Nima noto‘g‘ri va nega bu qaror qabul qilinganini aniq yozing."
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm"
              />
            </label>
            <label className="block text-xs text-slate-300">
              Tuzatilishi kerak bo‘lgan ishlar{' '}
              <span className="text-slate-500">(har birini yangi qatorda)</span>
              <textarea
                rows={4}
                value={reviewForm.requiredChanges}
                onChange={(event) =>
                  setReviewForm((current) => ({
                    ...current,
                    requiredChanges: event.target.value,
                  }))
                }
                placeholder={
                  'GET /catalog javobiga currency qo‘shing\nOffering ID’larni unique qiling'
                }
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm"
              />
            </label>
            <label className="block text-xs text-slate-300">
              Faqat adminlarga ko‘rinadigan ichki izoh{' '}
              <span className="text-slate-500">(ixtiyoriy)</span>
              <textarea
                rows={2}
                value={reviewForm.internalNote}
                onChange={(event) =>
                  setReviewForm((current) => ({
                    ...current,
                    internalNote: event.target.value,
                  }))
                }
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm"
              />
            </label>
            {reviewMutation.isError && (
              <p className="text-xs text-rose-400">
                {(reviewMutation.error as Error).message}
              </p>
            )}
            <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => setReviewTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-300"
              >
                Bekor qilish
              </button>
              <button
                disabled={
                  reviewMutation.isPending ||
                  reviewForm.reason.trim().length < 12
                }
                className={`rounded-lg px-4 py-2 text-xs font-bold text-white disabled:opacity-50 ${reviewTarget.decision === 'REQUEST_CHANGES' ? 'bg-amber-600 hover:bg-amber-500' : 'bg-rose-600 hover:bg-rose-500'}`}
              >
                {reviewMutation.isPending ? 'Saqlanmoqda…' : 'Qarorni saqlash'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Action Detail Modal */}
      {selectedAction && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-bold text-emerald-400 uppercase font-mono">
                  Action Details
                </span>
                <h3 className="text-xl font-extrabold text-white">
                  {selectedAction.publicId}
                </h3>
                <p className="text-xs text-slate-400">
                  {selectedAction.providerName || selectedAction.providerSlug} —{' '}
                  {new Date(selectedAction.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedAction(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Items */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Offerings & Line Breakdown
              </h4>
              <div className="bg-slate-950 rounded-xl p-3.5 space-y-2 border border-slate-800 text-xs">
                {selectedAction.lines?.map((it: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex justify-between py-1 border-b border-slate-900 last:border-0"
                  >
                    <div>
                      <span className="font-bold text-slate-200">
                        {it.quantity} × {it.offeringTitle || it.offeringId}
                      </span>
                      {it.variantTitle && (
                        <span className="text-[11px] text-slate-500 block">
                          Variant: {it.variantTitle}
                        </span>
                      )}
                    </div>
                    <span className="font-semibold text-white">
                      {(it.lineTotal || 0).toLocaleString('uz-UZ')} UZS
                    </span>
                  </div>
                ))}

                <div className="pt-2 border-t border-slate-800 flex justify-between font-extrabold text-emerald-400 text-sm">
                  <span>Grand Total:</span>
                  <span>
                    {(selectedAction.total || 0).toLocaleString('uz-UZ')} UZS
                  </span>
                </div>
              </div>
            </div>

            {/* Destination / Contact */}
            <div className="bg-slate-950 rounded-xl p-3.5 border border-slate-800 text-xs space-y-1.5">
              <div className="flex items-center gap-2 text-slate-300">
                <MapPin className="w-3.5 h-3.5 text-rose-400" />
                <span>
                  <strong>Destination:</strong>{' '}
                  {selectedAction.destination?.raw || 'Specified Location'}
                </span>
              </div>
              <div className="text-slate-400 pl-5">
                Customer:{' '}
                <strong className="text-slate-200">
                  {selectedAction.customer?.name}
                </strong>{' '}
                ({selectedAction.customer?.phone})
              </div>
            </div>

            {/* Payment URL Link if pending */}
            {selectedAction.paymentUrl && (
              <a
                href={selectedAction.paymentUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 transition"
              >
                <span>💳</span> Open Provider Checkout URL
              </a>
            )}

            {/* Timeline */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Action Timeline Events
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {selectedAction.timeline?.map((ev: any, idx: number) => (
                  <div
                    key={idx}
                    className="text-xs p-2.5 bg-slate-950 rounded-lg border border-slate-800/80 flex items-start gap-2"
                  >
                    <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0"></div>
                    <div>
                      <div className="font-semibold text-slate-200">
                        {ev.description}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {ev.source} •{' '}
                        {new Date(ev.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    PENDING_CONFIRMATION: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    AWAITING_PAYMENT: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    SUBMITTED: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    ACCEPTED: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    IN_PROGRESS: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    READY: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
    FULFILLING: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    COMPLETED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    CANCELLED: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    FAILED: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  };

  const currentStyle =
    styles[status] || 'bg-slate-800 text-slate-300 border-slate-700';

  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${currentStyle}`}
    >
      {status}
    </span>
  );
}
