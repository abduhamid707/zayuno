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
  Radio
} from 'lucide-react';

const API_BASE =
  (import.meta as any).env?.VITE_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname.includes('zayuno.uz')
    ? 'https://api.zayuno.uz'
    : 'http://localhost:4000');
const DEFAULT_PROVIDER_SLUG = 'sandbox-provider';
const SHOW_LOCAL_SIMULATOR = (import.meta as any).env?.DEV === true;
const PROVIDER_CAPABILITIES = [
  'METADATA', 'HEALTH', 'LOCATIONS', 'CATALOG', 'SEARCH', 'QUOTE',
  'ACTION_CREATE', 'ACTION_STATUS', 'ACTION_CANCEL', 'PAYMENT_OPTIONS', 'WEBHOOK'
];
const MANDATORY_PROVIDER_CAPABILITIES = new Set([
  'METADATA', 'HEALTH', 'CATALOG', 'QUOTE', 'ACTION_CREATE', 'ACTION_STATUS', 'WEBHOOK'
]);

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('zayuno_provider_token') || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'docs' | 'apps' | 'sandbox' | 'certification'>(() =>
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('doc') ? 'docs' : 'overview'
  );
  const [selectedDoc, setSelectedDoc] = useState<string>(() => {
    if (typeof window === 'undefined') return 'getting-started';
    return new URLSearchParams(window.location.search).get('doc') || 'getting-started';
  });
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Sandbox simulation state
  const [sandboxStep, setSandboxStep] = useState<number>(1);
  const [sandboxQuote, setSandboxQuote] = useState<any>(null);
  const [sandboxAction, setSandboxAction] = useState<any>(null);
  const [sandboxLoading, setSandboxLoading] = useState<boolean>(false);

  // Registration state
  const [regForm, setRegForm] = useState({
    name: 'Acme Services',
    slug: 'acme-services',
    type: 'SERVICES',
    category: 'general_services',
    baseUrl: 'https://api.acme.example',
    authMethod: 'API_KEY'
  });
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

  const apiFetch = async (path: string, init: RequestInit = {}) => {
    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, ...(init.headers || {}) }
    });
    if (!response.ok) throw new Error((await response.json().catch(() => null))?.message || 'Request failed');
    return response;
  };

  const login = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (!response.ok || !data.accessToken) throw new Error(data.message || 'Login failed');
      localStorage.setItem('zayuno_provider_token', data.accessToken);
      setToken(data.accessToken);
    } catch (error: any) { setLoginError(error.message || 'Login failed'); }
    finally { setLoginLoading(false); }
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
    enabled: !!token
  });
  const { data: selectedProviderAction, isFetching: actionDetailLoading } = useQuery({
    queryKey: ['provider-action', token, selectedProviderActionId],
    queryFn: async () => (await apiFetch(`/api/v1/providers/me/actions/${encodeURIComponent(selectedProviderActionId!)}`)).json(),
    enabled: !!token && !!selectedProviderActionId
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

  useEffect(() => {
    if (typeof window === 'undefined' || activeTab !== 'docs') return;
    const url = new URL(window.location.href);
    url.searchParams.set('doc', selectedDoc);
    window.history.replaceState({}, '', url);
  }, [activeTab, selectedDoc]);

  const certifyMutation = useMutation({
    mutationFn: async () => {
      const slug = providerData?.slug;
      if (!slug) throw new Error('Create or select a provider application first.');
      const res = await apiFetch(`/api/v1/providers/${slug}/certify`, { method: 'POST' });
      return res.json();
    },
    onSuccess: () => refetchProvider()
  });

  const submitReviewMutation = useMutation({
    mutationFn: async () => {
      if (!providerData?.slug) throw new Error('Provider application topilmadi.');
      const res = await apiFetch(`/api/v1/providers/${providerData.slug}/submit-review`, { method: 'POST' });
      return res.json();
    },
    onSuccess: () => refetchProvider()
  });

  const updateIntegrationMutation = useMutation({
    mutationFn: async () => {
      if (!providerData?.slug) throw new Error('Provider application topilmadi.');
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

  const registerMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiFetch('/api/v1/providers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          capabilities: ['METADATA', 'HEALTH', 'CATALOG', 'QUOTE', 'ACTION_CREATE', 'ACTION_STATUS', 'WEBHOOK']
        })
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.credentials) {
        setCreatedCredentials(data.credentials);
      }
    }
  });

  // Simulated sandbox actions
  const runSandboxDiscovery = async () => {
    setSandboxLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/providers/find?category=general_services`);
      const data = await res.json();
      setSandboxStep(2);
    } catch (e) {
      console.error(e);
    } finally {
      setSandboxLoading(false);
    }
  };

  const runSandboxQuote = async () => {
    setSandboxLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/quotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerSlug: DEFAULT_PROVIDER_SLUG,
          items: [{ offeringId: 'offering_standard_pkg', quantity: 2 }]
        })
      });
      const data = await res.json();
      setSandboxQuote(data);
      setSandboxStep(3);
    } catch (e) {
      console.error(e);
    } finally {
      setSandboxLoading(false);
    }
  };

  const runSandboxCreateAction = async () => {
    setSandboxLoading(true);
    try {
      const idempKey = `sb_sim_${Date.now()}`;
      const res = await fetch(`${API_BASE}/api/v1/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'idempotency-key': idempKey
        },
        body: JSON.stringify({
          idempotencyKey: idempKey,
          providerSlug: DEFAULT_PROVIDER_SLUG,
          quoteId: sandboxQuote?.id,
          customer: { name: 'Demo Customer', phone: '+998901234567' },
          items: [{ offeringId: 'offering_standard_pkg', quantity: 2 }],
          userConfirmed: true
        })
      });
      const data = await res.json();
      setSandboxAction(data);
      setSandboxStep(4);
    } catch (e) {
      console.error(e);
    } finally {
      setSandboxLoading(false);
    }
  };

  const runSandboxWebhook = async () => {
    if (!sandboxAction) return;
    setSandboxLoading(true);
    try {
      await fetch(`${API_BASE}/api/v1/webhooks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-provider': DEFAULT_PROVIDER_SLUG,
          'x-signature': 'mock_valid_signature_123'
        },
        body: JSON.stringify({
          eventId: `evt_${Date.now()}`,
          eventType: 'action.status_updated',
          providerSlug: DEFAULT_PROVIDER_SLUG,
          actionId: sandboxAction.id || sandboxAction.publicId,
          newStatus: 'COMPLETED',
          description: 'Payment verified via provider checkout. Action marked COMPLETED.'
        })
      });
      // Refetch action
      const res = await fetch(`${API_BASE}/api/v1/actions/${sandboxAction.publicId || sandboxAction.id}`);
      const updated = await res.json();
      setSandboxAction(updated);
      setSandboxStep(5);
    } catch (e) {
      console.error(e);
    } finally {
      setSandboxLoading(false);
    }
  };

  const provider = providerData || { name: 'Provider application yaratilmadi', slug: 'not-created', status: 'DRAFT', capabilities: [] };
  const certReport = certifyMutation.data;

  if (!token) return (
    <main className="min-h-screen bg-slate-950 text-slate-100 grid place-items-center p-6">
      <form onSubmit={login} className="w-full max-w-md space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-7 shadow-2xl">
        <div><h1 className="text-xl font-bold">Zayuno Provider Portal</h1><p className="mt-1 text-sm text-slate-400">Provider owner yoki developer hisobingiz bilan kiring.</p></div>
        <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5" />
        <input required type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Parol" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5" />
        {loginError && <p className="text-sm text-rose-400">{loginError}</p>}
        <button disabled={loginLoading} className="w-full rounded-lg bg-indigo-600 px-3 py-2.5 font-semibold hover:bg-indigo-500 disabled:cursor-wait disabled:opacity-70">{loginLoading ? 'Kirilmoqda…' : 'Kirish'}</button>
      </form>
    </main>
  );

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
            onClick={() => setActiveTab('apps')}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'apps' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" /> Apps & Dashboard
          </button>
          {SHOW_LOCAL_SIMULATOR && <button
            onClick={() => setActiveTab('sandbox')}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'sandbox' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" /> Sandbox Simulator
          </button>}
          <button
            onClick={() => setActiveTab('certification')}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'certification' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Certification
          </button>
        </nav>

        {/* Right Status */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Gateway Online</span>
          </div>
          <a
            href="https://mcp.zayuno.uz"
            target="_blank"
            rel="noreferrer"
            className="text-slate-400 hover:text-slate-200 flex items-center gap-1"
          >
            MCP Server <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {/* ========================================================================= */}
        {/* TAB 1: OVERVIEW & QUICK START                                             */}
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
                  Zayuno is a neutral action infrastructure platform. External providers (commerce, logistics, retail, bookings, and services) integrate against our public protocol so AI agents can discover services, calculate quotes, and trigger actions.
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    onClick={() => setActiveTab('apps')}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
                  >
                    Create Provider App <ArrowRight className="w-4 h-4" />
                  </button>
                  {SHOW_LOCAL_SIMULATOR && <button
                    onClick={() => setActiveTab('sandbox')}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-5 py-2.5 rounded-xl border border-slate-700 transition-all flex items-center gap-2"
                  >
                    <Play className="w-3.5 h-3.5" /> Test in Sandbox
                  </button>}
                  <button
                    onClick={() => setActiveTab('docs')}
                    className="text-slate-400 hover:text-slate-200 text-xs px-3 py-2 transition-colors flex items-center gap-1"
                  >
                    Read Docs <ExternalLink className="w-3.5 h-3.5" />
                  </button>
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

            {/* Quick Start 3-Step Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-sm border border-indigo-500/20">
                  1
                </div>
                <h3 className="font-semibold text-white text-sm">Register Provider</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Register your company profile, specify your category (e.g. logistics, commerce, food), and receive sandbox API keys and HMAC webhook secrets.
                </p>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-3">
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold text-sm border border-sky-500/20">
                  2
                </div>
                <h3 className="font-semibold text-white text-sm">Implement Contract</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Expose the 7 mandatory capability endpoints on your HTTPS backend (Health, Metadata, Catalog, Quote, Action, Status, Webhooks).
                </p>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-sm border border-emerald-500/20">
                  3
                </div>
                <h3 className="font-semibold text-white text-sm">Certify & Go Live</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Run the automated certification test suite. Once certified, submit your app for platform approval and publish to live AI agent discovery.
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
        {/* TAB 2: INTERACTIVE DOCUMENTATION                                          */}
        {/* ========================================================================= */}
        {activeTab === 'docs' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-fadeIn">
            {/* Sidebar List */}
            <div className="space-y-1 bg-slate-900/60 border border-slate-800 rounded-2xl p-3 h-fit text-xs">
              <span className="text-[10px] font-mono text-slate-500 uppercase px-3 py-1 font-bold">Guides & Spec</span>
              {[
                { id: 'getting-started', title: '1. Getting Started' },
                { id: 'spec-v1', title: '2. Provider Integration v1' },
                { id: 'capabilities', title: '3. Capabilities Matrix' },
                { id: 'auth', title: '4. Authentication & Security' },
                { id: 'catalog', title: '5. Catalog & Offerings' },
                { id: 'quotes', title: '6. Quotes & Pricing' },
                { id: 'actions', title: '7. Actions & Lifecycle' },
                { id: 'payment-handoff', title: '8. Payment Handoff (NextAction)' },
                { id: 'webhooks', title: '9. Webhooks & Events' },
                { id: 'errors', title: '10. Errors & Idempotency' },
                { id: 'certification', title: '11. Automated Certification' },
                { id: 'api-reference', title: '12. Core API Reference' },
                { id: 'provider-operations', title: '13. Dashboard & Moderation' }
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => setSelectedDoc(item.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg font-medium transition-all ${
                    selectedDoc === item.id ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  {item.title}
                </button>
              ))}
            </div>

            {/* Main Doc Viewer */}
            <div className="md:col-span-3 bg-slate-900/60 border border-slate-800 rounded-2xl p-8 space-y-6 text-slate-300 text-xs sm:text-sm leading-relaxed">
              {selectedDoc === 'getting-started' && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-white">Getting Started with Zayuno Provider Integration</h2>
                  <p>Welcome to the Zayuno Developer Platform. Zayuno connects conversational AI agents (ChatGPT, Claude, autonomous workers) to real-world services.</p>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-indigo-300">
                    GET https://developers.zayuno.uz/docs/getting-started
                  </div>
                  <h3 className="text-base font-semibold text-white pt-2">How Integration Works</h3>
                  <p>Zayuno is provider-agnostic. Your backend exposes standard HTTPS endpoints conforming to Provider Contract v1. When an AI user places a request, Zayuno quotes pricing, creates an action with an idempotency key, and forwards a provider-managed checkout URL.</p>
                </div>
              )}

              {selectedDoc === 'provider-operations' && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-white">Provider Dashboard & Moderation</h2>
                  <p>Provider hisoblari faqat o‘ziga tegishli actionlarni ko‘radi. Dashboard action va payment statusini alohida ko‘rsatadi, buyurtma tarkibi, cancellation sababi va timeline’ni ochadi.</p>
                  <pre className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-indigo-300">{`GET /api/v1/providers/me/dashboard
  ?status=IN_PROGRESS
  &paymentStatus=PAID
  &from=2026-08-01
  &sort=newest

GET /api/v1/providers/me/actions/:actionId`}</pre>
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200"><strong>Payment aniqligi:</strong> PAID qiymati provider integratsiyasi tomonidan bildirilgan holat. Provider alohida settlement ma’lumotini bermasa, bu bank settlementining isboti emas.</div>
                  <h3 className="pt-2 text-base font-semibold text-white">Moderatsiya</h3>
                  <p>Admin tasdiqlashdan tashqari <code>REQUEST_CHANGES</code>, <code>REJECT</code> yoki <code>SUSPEND</code> qarorini beradi. Har bir qarorda sabab kategoriyasi, partnerga ko‘rinadigan aniq izoh va kerak bo‘lsa tuzatishlar ro‘yxati bo‘lishi shart. Rejected yoki suspended provider faqat admin qayta ochgandan keyin integratsiyasini o‘zgartira oladi.</p>
                  <p className="text-slate-400">Bu sahifa public va to‘g‘ridan-to‘g‘ri ulashish mumkin: <a className="text-indigo-300 hover:underline" href="https://developers.zayuno.uz/?doc=provider-operations" target="_blank" rel="noreferrer">Provider Operations documentation</a>.</p>
                </div>
              )}

              {selectedDoc === 'payment-handoff' && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-white">Payment Handoff & NextAction Architecture</h2>
                  <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl text-amber-300 text-xs">
                    <strong>Rule:</strong> Zayuno NEVER stores card data, processes payments, or integrates directly with acquiring networks. Providers own their payment links.
                  </div>
                  <h3 className="text-base font-semibold text-white pt-2">Normalized NextAction Payload</h3>
                  <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs overflow-x-auto text-emerald-400">
{`{
  "actionId": "ZY-ACT-12345",
  "status": "AWAITING_PAYMENT",
  "nextAction": {
    "type": "OPEN_URL",
    "url": "https://acme.example/checkout/9910",
    "label": "Pay now with Payme",
    "expiresAt": "2026-08-17T16:15:00Z"
  }
}`}
                  </pre>
                </div>
              )}

              {selectedDoc !== 'getting-started' && selectedDoc !== 'payment-handoff' && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-white">Specification Section: {selectedDoc}</h2>
                  <p>Detailed technical documentation for this section is available in the <code className="font-mono text-indigo-300">docs/</code> directory of the platform repository.</p>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-400">
                    File reference: docs/{selectedDoc}.md
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: APPS & PROVIDER DASHBOARD                                          */}
        {/* ========================================================================= */}
        {activeTab === 'apps' && (
          <div className="space-y-6 animate-fadeIn">
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
                <div key={String(label)} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"><p className="text-xs text-slate-400">{label}</p><p className="mt-1 text-xl font-bold text-white">{value}</p></div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* A provider owner is provisioned by operations; they must not accidentally create a second application. */}
              <div className="lg:col-span-1 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-indigo-400" /> Provider account</h3>
                <p className="text-xs leading-5 text-slate-400">Bu account <strong className="text-slate-200">{provider.name}</strong> provideriga biriktirilgan. Yangi provider yaratish yoki ownership transfer uchun Zayuno Operations bilan bog‘laning.</p>
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs"><span className="text-slate-500">Status:</span> <strong className="ml-1 text-indigo-300">{provider.status}</strong><br /><span className="text-slate-500">Review:</span> <strong className="ml-1 text-indigo-300">{provider.metadata?.reviewStatus || 'DRAFT'}</strong></div>
              </div>
              {false && <div className="lg:col-span-1 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-400" /> Register New Provider App
                </h3>
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">Provider Name</label>
                    <input
                      type="text"
                      value={regForm.name}
                      onChange={e => setRegForm({ ...regForm, name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Unique Slug</label>
                    <input
                      type="text"
                      value={regForm.slug}
                      onChange={e => setRegForm({ ...regForm, slug: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Category</label>
                    <select
                      value={regForm.category}
                      onChange={e => setRegForm({ ...regForm, category: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="general_services">General Services</option>
                      <option value="logistics">Logistics & Delivery</option>
                      <option value="retail">Commerce & Retail</option>
                      <option value="food_delivery">Food & Dining</option>
                      <option value="railway_tickets">Railway Tickets</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Backend Base URL</label>
                    <input
                      type="url"
                      value={regForm.baseUrl}
                      onChange={e => setRegForm({ ...regForm, baseUrl: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <button
                    onClick={() => registerMutation.mutate(regForm)}
                    disabled={registerMutation.isPending}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 rounded-lg transition-all shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 text-xs"
                  >
                    {registerMutation.isPending ? 'Registering...' : 'Create Provider Application'}
                  </button>
                </div>
              </div>}

              {/* Active Credentials & Status */}
              <div className="lg:col-span-2 space-y-6">
                {createdCredentials && (
                  <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-6 space-y-3 animate-fadeIn">
                    <h3 className="text-sm font-semibold text-emerald-300 flex items-center gap-2">
                      <Key className="w-4 h-4" /> Newly Generated Sandbox Credentials
                    </h3>
                    <div className="space-y-2 text-xs font-mono">
                      <div>
                        <span className="text-slate-400">Sandbox API Key:</span>
                        <div className="bg-slate-950 p-2.5 rounded-lg text-emerald-400 border border-slate-800 mt-1 flex justify-between items-center">
                          <span>{createdCredentials.sandboxApiKey}</span>
                          <button onClick={() => copyToClipboard(createdCredentials.sandboxApiKey, 'key')}>
                            {copiedText === 'key' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400">Webhook Secret:</span>
                        <div className="bg-slate-950 p-2.5 rounded-lg text-emerald-400 border border-slate-800 mt-1 flex justify-between items-center">
                          <span>{createdCredentials.sandboxWebhookSecret}</span>
                          <button onClick={() => copyToClipboard(createdCredentials.sandboxWebhookSecret, 'secret')}>
                            {copiedText === 'secret' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {providerData && (
                  <div className="bg-slate-900/60 border border-indigo-500/30 rounded-2xl p-6 space-y-5">
                    <div>
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        <Globe className="w-4 h-4 text-indigo-400" /> Integration settings
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
                )}

                {/* Default Sandbox Provider Card */}
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

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                      <span className="text-slate-500 block">Capabilities Implemented</span>
                      <span className="font-semibold text-white text-sm">{provider.capabilities?.length ?? 0} configured</span>
                    </div>
                    <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                      <span className="text-slate-500 block">Review Status</span>
                      <span className="font-semibold text-emerald-400 text-sm">{provider.metadata?.reviewStatus || 'DRAFT'}</span>
                    </div>
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
                    {SHOW_LOCAL_SIMULATOR && <button
                      onClick={() => setActiveTab('sandbox')}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-4 py-2 rounded-xl border border-slate-700 transition-all flex items-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5" /> Launch Sandbox Simulator
                    </button>}
                    {provider.metadata?.isCertified && provider.metadata?.reviewStatus === 'DRAFT' && (
                      <button onClick={() => submitReviewMutation.mutate()} disabled={submitReviewMutation.isPending} className="bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 text-xs font-medium px-4 py-2 rounded-xl transition-all">
                        {submitReviewMutation.isPending ? 'Yuborilmoqda...' : 'Reviewga yuborish'}
                      </button>
                    )}
                  </div>
                  {submitReviewMutation.isError && <p className="text-xs text-rose-400">{(submitReviewMutation.error as Error).message}</p>}
                  {submitReviewMutation.isSuccess && <p className="text-xs text-emerald-400">Ariza admin review’ga yuborildi.</p>}
                </div>
              </div>
            </div>
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
                    <div>Quote ID: <span className="text-indigo-400">{sandboxQuote.id}</span></div>
                    <div>Total Price: <span className="text-emerald-400">{sandboxQuote.total} {sandboxQuote.currency}</span></div>
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
                    <div>Action Reference: <span className="text-indigo-400">{sandboxAction.publicId}</span></div>
                    <div>Status: <span className="text-amber-400">{sandboxAction.status}</span></div>
                    <div>
                      NextAction Checkout URL: <br />
                      <a
                        href={sandboxAction.nextAction?.url || sandboxAction.paymentUrl}
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
        {/* TAB 5: CERTIFICATION RUNNER                                               */}
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
                disabled={certifyMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-4 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/30 flex items-center gap-2"
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
                  Click the button above to run the automated test suite against <code className="text-indigo-400 font-mono">{provider.slug}</code>.
                </p>
              </div>
            )}
          </div>
        )}
      </main>

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

            {actionDetailLoading || !selectedProviderAction ? <div className="p-10 text-center text-sm text-slate-400">Action ma’lumotlari yuklanmoqda…</div> : (
              <div className="mt-5 space-y-5 text-xs">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl bg-slate-950 p-3"><div className="text-slate-500">Action status</div><div className="mt-1 font-bold text-white">{selectedProviderAction.status}</div></div>
                  <div className="rounded-xl bg-slate-950 p-3"><div className="text-slate-500">Payment status</div><div className="mt-1 font-bold text-emerald-300">{selectedProviderAction.paymentStatus}</div><div className="mt-1 text-[9px] text-slate-600">Provider tomonidan bildirilgan</div></div>
                  <div className="rounded-xl bg-slate-950 p-3"><div className="text-slate-500">Jami</div><div className="mt-1 font-bold text-white">{selectedProviderAction.total?.toLocaleString('uz-UZ')} {selectedProviderAction.currency}</div></div>
                  <div className="rounded-xl bg-slate-950 p-3"><div className="text-slate-500">Yangilangan</div><div className="mt-1 font-semibold text-white">{new Date(selectedProviderAction.updatedAt).toLocaleString('uz-UZ')}</div></div>
                </div>

                {selectedProviderAction.cancellationReason && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4"><div className="font-bold text-rose-300">Bekor qilish yoki xatolik sababi</div><p className="mt-2 whitespace-pre-wrap text-rose-100">{selectedProviderAction.cancellationReason}</p></div>}

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
                    <dl className="mt-3 space-y-2 text-slate-300"><div><dt className="text-slate-500">Mijoz</dt><dd>{selectedProviderAction.customer?.name}</dd></div><div><dt className="text-slate-500">Telefon</dt><dd>{selectedProviderAction.customer?.phone}</dd></div><div><dt className="text-slate-500">Manzil/yo‘nalish</dt><dd>{selectedProviderAction.destination || 'Ko‘rsatilmagan'}</dd></div><div><dt className="text-slate-500">Turi</dt><dd>{selectedProviderAction.fulfillmentType}</dd></div></dl>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-white">Action timeline</h4>
                  <div className="mt-3 space-y-2">
                    {(selectedProviderAction.timeline || []).map((event: any) => <div key={event.id} className="flex gap-3 rounded-xl border border-slate-800 bg-slate-950 p-3"><div className="mt-1 h-2 w-2 flex-none rounded-full bg-indigo-400"/><div><div className="font-semibold text-slate-200">{event.status}: {event.description}</div><div className="mt-1 text-[10px] text-slate-500">{event.source} · {new Date(event.createdAt).toLocaleString('uz-UZ')}</div></div></div>)}
                  </div>
                </div>
              </div>
            )}
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
