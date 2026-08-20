import React, { useState } from 'react';
import {
  BookOpen,
  Code2,
  Terminal,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  Zap,
  AlertTriangle,
  Layers,
  Key,
  Webhook,
  Send,
  Lock,
  RefreshCw,
  Sliders,
  DollarSign,
  Activity,
  FileText,
  Database,
  ArrowRight,
  Clock,
  Sparkles
} from 'lucide-react';

interface DocsViewerProps {
  selectedDoc: string;
  onSelectDoc: (id: string) => void;
  onOpenAiKit?: () => void;
}

export const DOCS_MENU = [
  { id: 'getting-started', title: '1. Getting Started', icon: Sparkles },
  { id: 'spec-v1', title: '2. Provider Integration v1', icon: Layers },
  { id: 'capabilities', title: '3. Capabilities Matrix', icon: Sliders },
  { id: 'auth', title: '4. Authentication & Security', icon: ShieldCheck },
  { id: 'catalog', title: '5. Catalog & Offerings', icon: Database },
  { id: 'quotes', title: '6. Quotes & Pricing', icon: DollarSign },
  { id: 'actions', title: '7. Actions & Lifecycle', icon: Zap },
  { id: 'payment-handoff', title: '8. Payment Handoff (NextAction)', icon: ArrowRight },
  { id: 'webhooks', title: '9. Webhooks & Events', icon: Webhook },
  { id: 'errors', title: '10. Errors & Idempotency', icon: AlertTriangle },
  { id: 'certification', title: '11. Automated Certification', icon: CheckCircle2 },
  { id: 'api-reference', title: '12. Core API Reference', icon: Terminal },
  { id: 'provider-operations', title: '13. Dashboard & Moderation', icon: Activity },
  { id: 'troubleshooting-faq', title: '14. Troubleshooting & FAQ', icon: AlertTriangle }
];

export function DocsViewer({ selectedDoc, onSelectDoc, onOpenAiKit }: DocsViewerProps) {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-fadeIn">
      {/* Sidebar List */}
      <div className="space-y-1 bg-slate-900/60 border border-slate-800 rounded-2xl p-3 h-fit text-xs sticky top-24">
        <span className="text-[10px] font-mono text-slate-500 uppercase px-3 py-1 font-bold tracking-wider">
          Guides & Specifications
        </span>
        {DOCS_MENU.map(item => {
          const Icon = item.icon;
          const isActive = selectedDoc === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectDoc(item.id)}
              className={`w-full flex items-center gap-2.5 text-left px-3 py-2.5 rounded-xl font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
              <span className="truncate">{item.title}</span>
            </button>
          );
        })}
      </div>

      {/* Main Doc Viewer */}
      <div className="md:col-span-3 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-8 text-slate-300 text-xs sm:text-sm leading-relaxed">
        {/* ========================================================================= */}
        {/* 1. GETTING STARTED                                                       */}
        {/* ========================================================================= */}
        {selectedDoc === 'getting-started' && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest font-semibold">Guide 01</span>
                <h2 className="text-2xl font-bold text-white mt-1">Getting Started with Zayuno Provider Integration</h2>
                <p className="text-slate-400 mt-1">
                  Zayuno is the open, capability-based action infrastructure connecting AI agents (ChatGPT, Claude, autonomous workers) to real-world services.
                </p>
              </div>
              {onOpenAiKit && (
                <button
                  onClick={onOpenAiKit}
                  className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 shrink-0 transition-all"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" /> AI bilan integratsiya qilish
                </button>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" /> What is Zayuno?
              </h3>
              <p>
                Zayuno acts as a neutral communication and orchestration layer between AI agents and service providers. When an AI user says:
              </p>
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-indigo-200 italic font-mono text-xs">
                &ldquo;Demo Cafe menusini ko&lsquo;rsat, Chilonzorga 2 ta kofe buyurtma qil&rdquo;
              </div>
              <p className="text-[11px] text-slate-500 italic">
                * Eslatma: &quot;Demo Cafe&quot; va boshqa barcha misollar Zayuno sandbox simulyatsiyasi uchun keltirilgan.
              </p>
              <p>The AI agent interacts with Zayuno&apos;s Model Context Protocol (MCP) gateway to:</p>
              <ol className="list-decimal list-inside space-y-2 pl-2 text-slate-300">
                <li><strong className="text-white">Discover</strong> registered providers matching category and location.</li>
                <li><strong className="text-white">Explore</strong> real-time menus, offerings, variants, and pricing.</li>
                <li><strong className="text-white">Calculate verified quotes</strong> with itemized fees, taxes, and discounts.</li>
                <li><strong className="text-white">Obtain explicit user confirmation</strong> before taking any action.</li>
                <li><strong className="text-white">Execute actions</strong> with strict idempotency protection.</li>
                <li><strong className="text-white">Handoff payment</strong> using provider-owned checkout links (<code className="text-indigo-300 font-mono">NextAction</code>).</li>
                <li><strong className="text-white">Track fulfillment</strong> in real time via HMAC-signed webhooks.</li>
              </ol>
            </div>

            <div className="space-y-3 pt-2">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-indigo-400" /> 5-Minute Quick Start Steps
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { step: '1', title: 'Register Provider App', desc: 'Visit the Apps & Dashboard tab to obtain your unique provider slug and sandbox keys.' },
                  { step: '2', title: 'Implement Profile Endpoints', desc: 'Implement endpoints for your profile: Discovery (3 endpoints) or Transactional (7 endpoints).' },
                  { step: '3', title: 'Run Automated Certification', desc: 'Execute the automated compliance runner in the Certification tab to verify payload structure.' },
                  { step: '4', title: 'Submit for Live Discovery', desc: 'Once 100% passed, submit for platform operations review to be published across AI agents.' }
                ].map(s => (
                  <div key={s.step} className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="w-6 h-6 rounded-lg bg-indigo-600/20 text-indigo-400 font-mono font-bold flex items-center justify-center shrink-0 text-xs">
                      {s.step}
                    </span>
                    <div>
                      <h4 className="text-white font-medium">{s.title}</h4>
                      <p className="text-slate-400 text-xs mt-0.5">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. SPECIFICATION V1                                                      */}
        {/* ========================================================================= */}
        {selectedDoc === 'spec-v1' && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest font-semibold">Spec 02</span>
              <h2 className="text-2xl font-bold text-white mt-1">Zayuno Provider Integration Specification v1</h2>
              <p className="text-slate-400 mt-1">
                Architectural boundaries, payment isolation rules, and integration lifecycle models.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-400" /> Core Architectural Principles
              </h3>

              <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-300">
                  <AlertTriangle className="w-4 h-4" /> STRICT PAYMENT BOUNDARY
                </div>
                <p className="text-xs leading-relaxed">
                  <strong>Zayuno NEVER processes payments or stores credit card details.</strong> Providers own their checkout pages, invoicing, and acquiring systems (Payme, Click, Uzum, Stripe). If an action requires settlement, the provider returns status <code className="font-mono bg-black/40 px-1 py-0.5 rounded text-amber-100">AWAITING_PAYMENT</code> containing a normalized <code className="font-mono bg-black/40 px-1 py-0.5 rounded text-amber-100">nextAction</code> of type <code className="font-mono bg-black/40 px-1 py-0.5 rounded text-amber-100">OPEN_URL</code>.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <h4 className="font-semibold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-400" /> Protocol Neutrality
                  </h4>
                  <p className="text-xs text-slate-400">
                    Zayuno Core is decoupled from specific domains (food, taxi, hotels, retail). All operations use standard normalized contracts from <code className="text-indigo-300 font-mono">@zayuno/contracts</code>.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <h4 className="font-semibold text-white flex items-center gap-2">
                    <Lock className="w-4 h-4 text-indigo-400" /> Guaranteed Idempotency
                  </h4>
                  <p className="text-xs text-slate-400">
                    Every mutating request requires a unique <code className="text-indigo-300 font-mono">idempotencyKey</code>. Providers must guarantee that duplicate submissions return the original action without double charges.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <h3 className="text-base font-semibold text-white">Provider Lifecycle States</h3>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 space-y-2">
                <div className="flex items-center gap-2 text-indigo-300 font-bold">
                  <span>DRAFT</span> &rarr; <span>SANDBOX</span> &rarr; <span>CERTIFIED</span> &rarr; <span>REVIEW</span> &rarr; <span className="text-emerald-400">ACTIVE</span>
                </div>
                <div className="text-[11px] text-slate-400 space-y-1 pt-2">
                  <p><strong className="text-slate-200">DRAFT / SANDBOX:</strong> Initial setup and testing in developer environment.</p>
                  <p><strong className="text-slate-200">CERTIFIED:</strong> 100% passed automated compliance test suite.</p>
                  <p><strong className="text-slate-200">REVIEW:</strong> Submitted for platform operations review and verified credentials.</p>
                  <p><strong className="text-slate-200">ACTIVE:</strong> Live and published for conversational AI agent discovery.</p>
                  <p><strong className="text-slate-200">SUSPENDED / DISABLED:</strong> Temporarily paused or decommissioned.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. CAPABILITIES MATRIX                                                   */}
        {/* ========================================================================= */}
        {selectedDoc === 'capabilities' && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest font-semibold">Spec 03</span>
              <h2 className="text-2xl font-bold text-white mt-1">Capabilities Specification & Categorization</h2>
              <p className="text-slate-400 mt-1">
                Zayuno uses a composable capability matrix to determine which operations can be executed against a provider.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-200 text-xs space-y-2">
              <p className="font-semibold text-white">Universal Capability Profiles (Har bir provider o‘z profiliga ko‘ra integratsiya qiladi):</p>
              <ul className="list-disc list-inside space-y-1 text-slate-300">
                <li><strong className="text-white">A) Discovery / Read-only:</strong> Faqat axborot beruvchi xizmatlar (masalan Telegram recruitment, mahsulot katalogi, vakansiyalar qidiruvi). Majburiy: <code className="text-indigo-300 font-mono">METADATA</code>, <code className="text-indigo-300 font-mono">HEALTH</code>, <code className="text-indigo-300 font-mono">CATALOG</code> (<code className="text-indigo-300 font-mono">SEARCH</code> tavsiya etiladi). Tranzaksion endpointlar talab qilinmaydi.</li>
                <li><strong className="text-white">B) Transactional:</strong> Buyurtma va to‘lov oqimiga ega providerlar. Majburiy: <code className="text-indigo-300 font-mono">METADATA</code>, <code className="text-indigo-300 font-mono">HEALTH</code>, <code className="text-indigo-300 font-mono">CATALOG</code>, <code className="text-indigo-300 font-mono">QUOTE</code>, <code className="text-indigo-300 font-mono">ACTION_CREATE</code>, <code className="text-indigo-300 font-mono">ACTION_STATUS</code>, <code className="text-indigo-300 font-mono">WEBHOOK</code> (<code className="text-indigo-300 font-mono">PAYMENT_OPTIONS</code> faqat to‘lov bo‘lsa, <code className="text-indigo-300 font-mono">ACTION_CANCEL</code> faqat bekor qilish qo‘llansa).</li>
                <li><strong className="text-white">C) Physical vs D) Digital / Remote:</strong> Jismoniy manzilga bog‘liq xizmatlarda (yetkazib berish, do‘kon, filial) <code className="text-indigo-300 font-mono">LOCATIONS</code> talab qilinadi. Raqamli va masofaviy xizmatlarda <code className="text-indigo-300 font-mono">LOCATIONS</code> talab qilinmaydi.</li>
              </ul>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-mono">
                    <th className="p-3">Capability Flag</th>
                    <th className="p-3">Profile Requirement</th>
                    <th className="p-3">Endpoint / Method</th>
                    <th className="p-3">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono text-[11px]">
                  {[
                    { flag: 'METADATA', req: 'ALL PROFILES', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', endpoint: 'GET /provider-info', desc: 'Provider identity, category, coverage, support contact.' },
                    { flag: 'HEALTH', req: 'ALL PROFILES', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', endpoint: 'GET /health', desc: 'Real-time operational health check and latency probe.' },
                    { flag: 'CATALOG', req: 'ALL PROFILES', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', endpoint: 'GET /catalog, GET /offerings/:id', desc: 'Structured catalog, categories, option groups, and prices.' },
                    { flag: 'QUOTE', req: 'TRANSACTIONAL', badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30', endpoint: 'POST /quote', desc: 'Verified itemized pricing computation with expiration.' },
                    { flag: 'ACTION_CREATE', req: 'TRANSACTIONAL', badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30', endpoint: 'POST /actions', desc: 'Action creation with idempotency and nextAction handoff.' },
                    { flag: 'ACTION_STATUS', req: 'TRANSACTIONAL', badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30', endpoint: 'GET /actions/:id', desc: 'Status lookup, fulfillment stages, and tracking timeline.' },
                    { flag: 'WEBHOOK', req: 'TRANSACTIONAL', badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30', endpoint: 'POST /webhooks', desc: 'Asynchronous event push with HMAC-SHA256 signatures.' },
                    { flag: 'LOCATIONS', req: 'PHYSICAL ONLY', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30', endpoint: 'GET /locations', desc: 'Physical store branches, coordinates, service radius (digital xizmatlarda shart emas).' },
                    { flag: 'SEARCH', req: 'OPTIONAL', badge: 'bg-slate-800 text-slate-400 border-slate-700', endpoint: 'GET /search', desc: 'Keyword and semantic search indexing across offerings.' },
                    { flag: 'ACTION_CANCEL', req: 'OPTIONAL', badge: 'bg-slate-800 text-slate-400 border-slate-700', endpoint: 'POST /actions/:id/cancel', desc: 'Customer-initiated cancellation before fulfillment lock.' },
                    { flag: 'PAYMENT_OPTIONS', req: 'OPTIONAL', badge: 'bg-slate-800 text-slate-400 border-slate-700', endpoint: 'GET /actions/:id/payment-options', desc: 'Discovery of provider-supported checkout options.' }
                  ].map(row => (
                    <tr key={row.flag} className="hover:bg-slate-900/40 transition-colors">
                      <td className="p-3 font-bold text-white flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                        {row.flag}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${row.badge}`}>
                          {row.req}
                        </span>
                      </td>
                      <td className="p-3 text-indigo-300">{row.endpoint}</td>
                      <td className="p-3 font-sans text-slate-400 text-xs">{row.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. AUTHENTICATION & SECURITY                                             */}
        {/* ========================================================================= */}
        {selectedDoc === 'auth' && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest font-semibold">Spec 04</span>
              <h2 className="text-2xl font-bold text-white mt-1">Authentication & Security Protocol</h2>
              <p className="text-slate-400 mt-1">
                Mutual authentication, AES-256-GCM encryption at rest, and HMAC-SHA256 signature verification.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-indigo-400" /> Outbound Authentication Methods
              </h3>
              <p className="text-xs text-slate-400">
                When Zayuno calls your provider backend, it authenticates using your chosen method:
              </p>

              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-white text-xs">Method A: Header API Key (Standard)</h4>
                    <span className="text-[10px] font-mono bg-indigo-900/40 text-indigo-300 px-2 py-0.5 rounded border border-indigo-700/50">Header: x-provider-api-key</span>
                  </div>
                  <pre className="font-mono text-[11px] text-indigo-300 bg-slate-900/90 p-3 rounded-lg overflow-x-auto">
{`POST /api/actions HTTP/1.1
Host: api.provider.example
x-provider-api-key: your_assigned_provider_secret_here
Content-Type: application/json`}
                  </pre>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-white text-xs">Method B: Webhook HMAC-SHA256 Signature (Inbound)</h4>
                    <span className="text-[10px] font-mono bg-emerald-900/40 text-emerald-300 px-2 py-0.5 rounded border border-emerald-700/50">Header: x-signature</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    When pushing events to Zayuno (<code className="text-indigo-300 font-mono">POST /api/v1/webhooks</code>), sign the raw request body with your assigned secret:
                  </p>
                  <pre className="font-mono text-[11px] text-emerald-300 bg-slate-900/90 p-3 rounded-lg overflow-x-auto">
{`import crypto from 'crypto';

const payloadString = JSON.stringify(webhookPayload);
const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(payloadString)
  .digest('hex');

// Outbound HTTP Request Headers:
// x-provider: <providerSlug>
// x-signature: <signature>`}
                  </pre>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-indigo-400" /> Encryption at Rest
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                All provider secrets, webhook tokens, and client credentials stored in Zayuno are encrypted with <strong>AES-256-GCM</strong> authenticated encryption. Master keys reside strictly in production environment variables and are never logged or exposed.
              </p>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. CATALOG & OFFERINGS                                                   */}
        {/* ========================================================================= */}
        {selectedDoc === 'catalog' && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest font-semibold">Spec 05</span>
              <h2 className="text-2xl font-bold text-white mt-1">Catalog & Offerings Specification</h2>
              <p className="text-slate-400 mt-1">
                Structured schema for categories, offerings, variant modifier groups, and real-time inventory flags.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-indigo-400" /> Normalized Catalog Response Schema
                </h3>
                <button
                  onClick={() => copyToClipboard(`GET /catalog -> Normalized JSON`, 'catalog-schema')}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  {copiedSection === 'catalog-schema' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  Copy JSON
                </button>
              </div>

              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-indigo-300 overflow-x-auto">
{`{
  "providerSlug": "demo-cafe",
  "locationId": "loc_tashkent_chilonzor",
  "categories": [
    {
      "id": "cat_lavash",
      "slug": "lavash",
      "name": "Lavash & Wraps",
      "description": "Fresh meat and vegetable wraps",
      "sortOrder": 1
    }
  ],
  "offerings": [
    {
      "id": "offering_lavash_beef",
      "providerSlug": "demo-cafe",
      "categorySlug": "lavash",
      "offeringCode": "LAVASH_BEEF_STANDARD",
      "title": "Classic Beef Lavash",
      "description": "Standard size with premium beef and garlic sauce",
      "basePrice": 38000,
      "currency": "UZS",
      "isAvailable": true,
      "optionGroups": [
        {
          "id": "grp_cheese",
          "name": "Cheese Add-on",
          "minSelections": 0,
          "maxSelections": 1,
          "options": [
            {
              "id": "opt_mozzarella",
              "name": "Mozzarella Cheese",
              "priceDelta": 6000,
              "isDefault": false
            }
          ]
        }
      ]
    }
  ],
  "version": "2026.1",
  "updatedAt": "2026-08-17T15:00:00Z"
}`}
              </pre>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-white font-mono font-bold text-xs">minSelections</span>
                <p className="text-slate-400 text-xs mt-1">Minimum choices required (e.g. <code className="text-indigo-300">1</code> for mandatory size, <code className="text-indigo-300">0</code> for optional).</p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-white font-mono font-bold text-xs">maxSelections</span>
                <p className="text-slate-400 text-xs mt-1">Max choices permitted (e.g. <code className="text-indigo-300">1</code> for radio group, <code className="text-indigo-300">5</code> for multi-topping).</p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-white font-mono font-bold text-xs">priceDelta</span>
                <p className="text-slate-400 text-xs mt-1">Additional price in UZS added to base price when the option is selected.</p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 6. QUOTES & PRICING                                                      */}
        {/* ========================================================================= */}
        {selectedDoc === 'quotes' && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest font-semibold">Spec 06</span>
              <h2 className="text-2xl font-bold text-white mt-1">Quotes & Pricing Engine</h2>
              <p className="text-slate-400 mt-1">
                Real-time price verification before action execution. AI agents never place orders on stale prices.
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-emerald-400 font-bold">POST /api/v1/quotes &rarr; Request Payload</span>
                </div>
                <pre className="font-mono text-[11px] text-slate-300 overflow-x-auto">
{`{
  "providerSlug": "demo-cafe",
  "locationId": "loc_tashkent_chilonzor",
  "fulfillmentType": "DELIVERY",
  "destination": {
    "raw": "Chilonzor 9-mavze, 12-uy, Toshkent"
  },
  "items": [
    {
      "offeringId": "offering_lavash_beef",
      "quantity": 2,
      "selectedOptions": [
        { "groupId": "grp_cheese", "optionId": "opt_mozzarella", "quantity": 1 }
      ]
    }
  ]
}`}
                </pre>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-indigo-300 font-bold">Normalized Quote Response Payload</span>
                </div>
                <pre className="font-mono text-[11px] text-indigo-300 overflow-x-auto">
{`{
  "id": "quote_894103859",
  "providerSlug": "demo-cafe",
  "lines": [
    {
      "offeringId": "offering_lavash_beef",
      "offeringTitle": "Classic Beef Lavash (with Mozzarella)",
      "unitPrice": 44000,
      "quantity": 2,
      "lineTotal": 88000
    }
  ],
  "subtotal": 88000,
  "fees": [
    { "name": "Courier Delivery Fee", "amount": 15000 }
  ],
  "totalFees": 15000,
  "totalDiscount": 0,
  "total": 103000,
  "currency": "UZS",
  "expiresAt": "2026-08-17T16:15:00.000Z",
  "estimatedDurationMinutes": 35
}`}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 7. ACTIONS & LIFECYCLE                                                   */}
        {/* ========================================================================= */}
        {selectedDoc === 'actions' && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest font-semibold">Spec 07</span>
              <h2 className="text-2xl font-bold text-white mt-1">Actions & Execution Lifecycle</h2>
              <p className="text-slate-400 mt-1">
                Standardized state machine, explicit user confirmation, and order creation contracts.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-base font-semibold text-white">Action State Machine</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs">
                {[
                  { status: 'CREATED', color: 'text-slate-300 bg-slate-950 border-slate-800', desc: 'Action recorded' },
                  { status: 'AWAITING_PAYMENT', color: 'text-amber-300 bg-amber-950/40 border-amber-800/50', desc: 'Pending checkout' },
                  { status: 'CONFIRMED', color: 'text-indigo-300 bg-indigo-950/40 border-indigo-800/50', desc: 'Payment verified' },
                  { status: 'PROCESSING', color: 'text-sky-300 bg-sky-950/40 border-sky-800/50', desc: 'Fulfilling / Cooking' },
                  { status: 'COMPLETED', color: 'text-emerald-300 bg-emerald-950/40 border-emerald-800/50', desc: 'Delivered / Done' },
                  { status: 'CANCELLED', color: 'text-rose-300 bg-rose-950/40 border-rose-800/50', desc: 'Cancelled' },
                  { status: 'FAILED', color: 'text-red-400 bg-red-950/40 border-red-800/50', desc: 'Error / Rejected' }
                ].map(s => (
                  <div key={s.status} className={`p-2.5 rounded-xl border ${s.color}`}>
                    <div className="font-bold text-[11px]">{s.status}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{s.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <h3 className="text-base font-semibold text-white">Action Creation Payload</h3>
              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-indigo-300 overflow-x-auto">
{`POST /api/v1/actions
{
  "idempotencyKey": "d8e379b2-6c9a-4e9b-83bb-92736152a1b9",
  "providerSlug": "demo-cafe",
  "quoteId": "quote_894103859",
  "userConfirmed": true,
  "customer": {
    "name": "Abduhamid",
    "phone": "+998901234567"
  },
  "destination": {
    "raw": "Chilonzor 9-mavze, 12-uy, Toshkent"
  }
}`}
              </pre>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 8. PAYMENT HANDOFF (NEXTACTION)                                          */}
        {/* ========================================================================= */}
        {selectedDoc === 'payment-handoff' && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest font-semibold">Spec 08</span>
              <h2 className="text-2xl font-bold text-white mt-1">Payment Handoff & NextAction Architecture</h2>
              <p className="text-slate-400 mt-1">
                How AI agents present provider-owned checkout links to customers safely and transparently.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs space-y-1">
              <strong>Architectural Rule:</strong> Zayuno NEVER stores card numbers, CVVs, or processes bank acquiring directly. Providers generate their own payment URL and notify Zayuno via signed webhooks upon completion.
            </div>

            <div className="space-y-3">
              <h3 className="text-base font-semibold text-white">Normalized NextAction Response</h3>
              <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs overflow-x-auto text-emerald-400">
{`{
  "actionId": "ZY-SANDBOX-98421",
  "status": "AWAITING_PAYMENT",
  "total": 103000,
  "currency": "UZS",
  "nextAction": {
    "type": "OPEN_URL",
    "url": "https://demo-cafe-sandbox.example.uz/pay/ZY-SANDBOX-98421",
    "label": "Pay with Payme / Card",
    "expiresAt": "2026-08-17T16:15:00Z"
  }
}`}
              </pre>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-2">
              <h4 className="text-white font-semibold">User Experience Flow in ChatGPT / Claude:</h4>
              <p>
                1. AI shows the confirmed total and checkout button: <span className="text-indigo-300 font-mono">[Pay 103,000 UZS via Payme]</span>.
              </p>
              <p>
                2. User clicks the link, enters card details on provider gateway, and receives receipt.
              </p>
              <p>
                3. Provider sends HMAC webhook to Zayuno &rarr; status updates to <code className="text-emerald-400 font-mono">CONFIRMED</code> in real time.
              </p>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 9. WEBHOOKS & EVENTS                                                     */}
        {/* ========================================================================= */}
        {selectedDoc === 'webhooks' && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest font-semibold">Spec 09</span>
              <h2 className="text-2xl font-bold text-white mt-1">Webhooks & Asynchronous Event Notification</h2>
              <p className="text-slate-400 mt-1">
                Real-time status updates and order progression push notifications.
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-xs font-mono text-indigo-400 font-bold">Webhook Ingestion Endpoint</span>
                <div className="font-mono text-xs text-emerald-300 bg-slate-900 p-2.5 rounded-lg">
                  POST https://api.zayuno.uz/api/v1/webhooks
                </div>
                <div className="text-xs text-slate-400 pt-1 space-y-1">
                  <p><strong>Required Header:</strong> <code className="text-indigo-300 font-mono">x-provider: &lt;providerSlug&gt;</code></p>
                  <p><strong>Required Header:</strong> <code className="text-indigo-300 font-mono">x-signature: HMAC_SHA256(rawBody, webhookSecret)</code></p>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-white">Event Payload Schema</h3>
                <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-indigo-300 overflow-x-auto">
{`{
  "eventId": "evt_9841029481",
  "eventType": "action.status_updated",
  "providerSlug": "demo-cafe",
  "actionId": "ZY-SANDBOX-98421",
  "externalActionId": "demo_cafe_order_8819",
  "newStatus": "CONFIRMED",
  "newPaymentStatus": "PAID",
  "timestamp": "2026-08-17T15:35:00.000Z",
  "description": "Payment confirmed via Payme acquiring. Sent to kitchen.",
  "payload": {
    "paymentReference": "payme_txn_998104"
  }
}`}
                </pre>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                <table className="w-full text-left text-xs border-collapse font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400">
                      <th className="p-3">Event Type</th>
                      <th className="p-3">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-[11px]">
                    <tr>
                      <td className="p-3 text-indigo-300">action.status_updated</td>
                      <td className="p-3 text-slate-400 font-sans">Status changed (CONFIRMED, PROCESSING, COMPLETED, CANCELLED, FAILED).</td>
                    </tr>
                    <tr>
                      <td className="p-3 text-indigo-300">action.completed</td>
                      <td className="p-3 text-slate-400 font-sans">Action successfully fulfilled and delivered.</td>
                    </tr>
                    <tr>
                      <td className="p-3 text-indigo-300">catalog.updated</td>
                      <td className="p-3 text-slate-400 font-sans">Signals Zayuno to invalidate cached catalog.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 10. ERRORS & IDEMPOTENCY                                                 */}
        {/* ========================================================================= */}
        {selectedDoc === 'errors' && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest font-semibold">Spec 10</span>
              <h2 className="text-2xl font-bold text-white mt-1">Errors & Idempotency Guidelines</h2>
              <p className="text-slate-400 mt-1">
                RFC 7807 Problem Details and safe replay guarantees for mobile and conversational agent networks.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-white">Standard RFC 7807 Error Response</h3>
                <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-rose-300 overflow-x-auto">
{`{
  "statusCode": 410,
  "error": "QUOTE_EXPIRED",
  "message": "Quote quote_894103859 has expired. Please calculate a new quote before submitting action.",
  "timestamp": "2026-08-17T15:40:00Z"
}`}
                </pre>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
                {[
                  { code: '400 BAD_REQUEST', desc: 'Missing required fields or invalid parameters' },
                  { code: '401 UNAUTHORIZED', desc: 'Missing/invalid API key or HMAC signature' },
                  { code: '404 NOT_FOUND', desc: 'Offering, location, quote, or action not found' },
                  { code: '409 CONFLICT', desc: 'State mismatch or concurrency collision' },
                  { code: '410 GONE', desc: 'Quote expired (QuoteExpiredError)' },
                  { code: '422 UNPROCESSABLE', desc: 'Item out of stock or branch closed' },
                  { code: '502 BAD_GATEWAY', desc: 'Provider backend timeout or error' }
                ].map(e => (
                  <div key={e.code} className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-rose-400 font-bold text-[11px]">{e.code}</div>
                    <div className="text-slate-400 font-sans text-[11px] mt-0.5">{e.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 11. AUTOMATED CERTIFICATION                                              */}
        {/* ========================================================================= */}
        {selectedDoc === 'certification' && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest font-semibold">Spec 11</span>
              <h2 className="text-2xl font-bold text-white mt-1">Automated Certification Engine</h2>
              <p className="text-slate-400 mt-1">
                Automated 11-step compliance runner verifying Provider Contract v1 compatibility.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> 11-Step Verification Suite
              </h3>
              <div className="space-y-2">
                {[
                  { num: '01', name: 'Provider Metadata Check', desc: 'Validates non-empty slug, name, category, and declared capability flags.' },
                  { num: '02', name: 'Health Endpoint Probe', desc: 'Asserts health returns HEALTHY and measures round-trip network latency.' },
                  { num: '03', name: 'Locations & Facilities Query', desc: 'Verifies branch listings, operating hours, coordinates, and delivery radius.' },
                  { num: '04', name: 'Catalog Structure & Offerings', desc: 'Asserts categories, offering items, base pricing, and modifier groups.' },
                  { num: '05', name: 'Search Indexing Validation', desc: 'Tests search queries and payload formatting across offerings.' },
                  { num: '06', name: 'Verified Quote Calculation', desc: 'Calculates multi-item quote with itemized subtotal, fees, and expiration.' },
                  { num: '07', name: 'Action Creation & Payment Handoff', desc: 'Asserts AWAITING_PAYMENT status and valid NextAction OPEN_URL structure.' },
                  { num: '08', name: 'Idempotency Protection Test', desc: 'Sends duplicate idempotencyKey and asserts exact same action record is returned.' },
                  { num: '09', name: 'Action Status & Timeline Query', desc: 'Queries action status and verifies audit timeline history.' },
                  { num: '10', name: 'Cancellation Lifecycle Test', desc: 'Verifies safe state transition upon user cancellation.' },
                  { num: '11', name: 'HMAC Webhook Ingestion & Anti-Forgery', desc: 'Tests valid HMAC-SHA256 signature ingestion and verifies forged signature rejection.' }
                ].map(step => (
                  <div key={step.num} className="flex items-start gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                    <span className="font-mono text-indigo-400 font-bold text-[11px] bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/40">
                      {step.num}
                    </span>
                    <div>
                      <span className="font-semibold text-white">{step.name}</span>
                      <p className="text-slate-400 text-[11px] mt-0.5">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 12. CORE API REFERENCE                                                   */}
        {/* ========================================================================= */}
        {selectedDoc === 'api-reference' && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest font-semibold">Spec 12</span>
              <h2 className="text-2xl font-bold text-white mt-1">Zayuno Core API Reference</h2>
              <p className="text-slate-400 mt-1">
                Base URL: <code className="text-indigo-300 font-mono">https://api.zayuno.uz/api/v1</code>
              </p>
            </div>

            <div className="space-y-4">
              {[
                { method: 'GET', path: '/providers/find', desc: 'Discover and filter registered capability providers by category, capability, or geography.' },
                { method: 'POST', path: '/providers/register', desc: 'Self-serve provider application registration.' },
                { method: 'POST', path: '/providers/:slug/certify', desc: 'Execute automated capability certification suite against provider.' },
                { method: 'POST', path: '/providers/:slug/submit-review', desc: 'Submit certified integration for platform review.' },
                { method: 'GET', path: '/providers/me/dashboard', desc: 'Provider-scoped metrics and action summaries.' },
                { method: 'GET', path: '/providers/me/actions/:actionId', desc: 'Detailed view of an action including item lines, timeline, and payment.' },
                { method: 'POST', path: '/quotes', desc: 'Calculate verified real-time quotation with expiration.' },
                { method: 'POST', path: '/actions', desc: 'Create a binding action with idempotencyKey and userConfirmed: true.' },
                { method: 'GET', path: '/actions/:id', desc: 'Retrieve live action status and fulfillment timeline.' },
                { method: 'POST', path: '/actions/:id/cancel', desc: 'Cancel an active action with reason code.' },
                { method: 'POST', path: '/webhooks', desc: 'Ingest provider status transition events with HMAC-SHA256 signature.' }
              ].map(api => (
                <div key={api.path} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                      api.method === 'GET' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {api.method}
                    </span>
                    <span className="text-white font-semibold">{api.path}</span>
                  </div>
                  <p className="text-xs text-slate-400">{api.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 13. PROVIDER OPERATIONS & DASHBOARD                                      */}
        {/* ========================================================================= */}
        {selectedDoc === 'provider-operations' && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest font-semibold">Spec 13</span>
              <h2 className="text-2xl font-bold text-white mt-1">Provider Dashboard & Moderation</h2>
              <p className="text-slate-400 mt-1">
                Scoped operational visibility, action timeline tracking, and platform moderation rules.
              </p>
            </div>

            <div className="space-y-4">
              <p>
                Provider accounts only see actions belonging to their own organization. The dashboard displays action and payment statuses separately, detailing item lines, cancellation reasons, and full event timelines.
              </p>

              <pre className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-indigo-300">
{`GET /api/v1/providers/me/dashboard
  ?status=IN_PROGRESS
  &paymentStatus=PAID
  &from=2026-08-01
  &sort=newest

GET /api/v1/providers/me/actions/:actionId`}
              </pre>

              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200">
                <strong>Payment Accuracy Notice:</strong> <code className="font-mono bg-black/40 px-1 py-0.5 rounded text-amber-100">PAID</code> indicates the status reported by the provider integration via webhook. Unless the provider exposes bank settlement proofs, it represents provider-reported confirmation.
              </div>

              <div className="space-y-2 pt-2">
                <h3 className="text-base font-semibold text-white">Platform Moderation Decisions</h3>
                <p className="text-xs text-slate-400">
                  Operations administrators can issue <code className="text-indigo-300 font-mono">REQUEST_CHANGES</code>, <code className="text-rose-400 font-mono">REJECT</code>, or <code className="text-amber-400 font-mono">SUSPEND</code> decisions. Each decision includes a categorized reasonCode, partner-visible explanations, and required correction steps.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 14. TROUBLESHOOTING & DEVELOPER FAQ                                      */}
        {/* ========================================================================= */}
        {selectedDoc === 'troubleshooting-faq' && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest font-semibold">Guide 14</span>
              <h2 className="text-2xl font-bold text-white mt-1">Troubleshooting & Developer FAQ</h2>
              <p className="text-slate-400 mt-1">
                Practical solutions for CORS preflight, rawBody HMAC verification, quote math, latency SLAs, and common HTTP error codes.
              </p>
            </div>

            <div className="space-y-6">
              {/* 1. CORS */}
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-white">1. CORS & Preflight (OPTIONS)</h3>
                <p className="text-xs text-slate-300">
                  When testing from Developer Portal or web environments, browser requests issue an <code className="font-mono text-indigo-300">OPTIONS</code> preflight check before POST/GET requests.
                </p>
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                  <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono">
                    <span>Express CORS Middleware</span>
                    <button onClick={() => copyToClipboard(`app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-signature', 'x-provider', 'idempotency-key'] }));`, 'cors')} className="hover:text-white flex items-center gap-1">
                      {copiedSection === 'cors' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  <pre className="overflow-x-auto font-mono text-xs text-indigo-300">
{`app.use(cors({
  origin: ['https://developers.zayuno.uz', 'https://zayuno.uz'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-signature', 'x-provider', 'idempotency-key']
}));`}
                  </pre>
                </div>
              </div>

              {/* 2. HMAC rawBody */}
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-white">2. Webhook HMAC Verification using rawBody</h3>
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
                  <strong>Critical:</strong> Never verify HMAC on <code className="font-mono bg-black/40 px-1 py-0.5 rounded">JSON.stringify(req.body)</code>. JSON serialization alters whitespace and key order. Always verify against the raw incoming request bytes!
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                  <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono">
                    <span>Node.js HMAC rawBody Verification</span>
                    <button onClick={() => copyToClipboard(`const expected = crypto.createHmac('sha256', secret).update(req.rawBody).digest('hex');`, 'hmac')} className="hover:text-white flex items-center gap-1">
                      {copiedSection === 'hmac' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  <pre className="overflow-x-auto font-mono text-xs text-indigo-300">
{`const expectedSignature = crypto
  .createHmac('sha256', process.env.ZAYUNO_WEBHOOK_SECRET)
  .update(req.rawBody)
  .digest('hex');

const isValid = crypto.timingSafeEqual(
  Buffer.from(req.headers['x-signature'] || '', 'hex'),
  Buffer.from(expectedSignature, 'hex')
);`}
                  </pre>
                </div>
              </div>

              {/* 3. Latency & Timeouts */}
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-white">3. Latency & Timeout SLAs</h3>
                <p className="text-xs text-slate-300">
                  AI conversational agents have a 15–30s roundtrip timeout. External provider endpoints must comply with these SLAs:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                    <span className="text-slate-400 font-mono text-[10px]">HEALTH</span>
                    <div className="text-white font-bold text-base">&lt; 500 ms</div>
                    <span className="text-slate-500 text-[11px]">GET /health</span>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                    <span className="text-slate-400 font-mono text-[10px]">QUOTE & SEARCH</span>
                    <div className="text-white font-bold text-base">&lt; 1500 ms</div>
                    <span className="text-slate-500 text-[11px]">POST /quote</span>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                    <span className="text-slate-400 font-mono text-[10px]">ACTION CREATE</span>
                    <div className="text-white font-bold text-base">&lt; 2000 ms</div>
                    <span className="text-slate-500 text-[11px]">POST /action</span>
                  </div>
                </div>
              </div>

              {/* 4. Quote Math */}
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-white">4. Quote Math Validation</h3>
                <p className="text-xs text-slate-300">
                  All price calculations must strictly satisfy: <code className="text-indigo-300 font-mono font-bold">total = subtotal + fees - discount</code>.
                </p>
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-400 space-y-1">
                  <div>• Numbers must be non-negative (<code className="font-mono text-indigo-300">subtotal &gt;= 0</code>, <code className="font-mono text-indigo-300">fees &gt;= 0</code>, <code className="font-mono text-indigo-300">discount &gt;= 0</code>).</div>
                  <div>• Sum of line item totals must equal <code className="font-mono text-indigo-300">subtotal</code>.</div>
                  <div>• <code className="font-mono text-indigo-300">expiresAt</code> must be an ISO UTC timestamp in the future.</div>
                </div>
              </div>

              {/* 5. Error Code Reference */}
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-white">5. Common Error Codes</h3>
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-mono text-[11px]">
                      <tr>
                        <th className="p-3">Status</th>
                        <th className="p-3">Error Code</th>
                        <th className="p-3">Remedy</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 bg-slate-900/30">
                      <tr>
                        <td className="p-3 font-mono text-amber-400">400</td>
                        <td className="p-3 font-mono text-indigo-300">RESERVED_BRAND_PROTECTED</td>
                        <td className="p-3 text-slate-300">Brand is reserved for enterprise onboarding. Contact operations@zayuno.uz.</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono text-rose-400">401</td>
                        <td className="p-3 font-mono text-indigo-300">UNAUTHORIZED</td>
                        <td className="p-3 text-slate-300">Check Bearer token, API key, or verify your email address.</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono text-amber-400">410</td>
                        <td className="p-3 font-mono text-indigo-300">QUOTE_EXPIRED</td>
                        <td className="p-3 text-slate-300">The quote has expired. Request a new quote before creating an action.</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono text-rose-400">502</td>
                        <td className="p-3 font-mono text-indigo-300">UPSTREAM_UNREACHABLE</td>
                        <td className="p-3 text-slate-300">Zayuno could not connect to your baseUrl. Check firewall, DNS, and SSL certificate.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
