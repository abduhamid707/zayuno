import React, { useState } from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  FlaskConical,
  Play,
  RefreshCw,
  Sparkles,
  Terminal,
  Zap,
} from 'lucide-react';

interface SandboxSimulatorProps {
  step: number;
  loading: boolean;
  error: string | null;
  quote: any;
  action: any;
  onRunDiscovery: () => void;
  onRunQuote: () => void;
  onRunCreateAction: () => void;
  onRunWebhook: () => void;
  onReset: () => void;
  providerSlug?: string;
}

const STEPPER_ITEMS = [
  { s: 1, label: '1. Provider topish', kicker: 'Discovery' },
  { s: 2, label: '2. Narx olish', kicker: 'Quote' },
  { s: 3, label: '3. Buyurtma', kicker: 'Action' },
  { s: 4, label: '4. To‘lov', kicker: 'Payment' },
  { s: 5, label: '5. Yakunlandi', kicker: 'Completed' },
];

export const SandboxSimulator: React.FC<SandboxSimulatorProps> = ({
  step,
  loading,
  error,
  quote,
  action,
  onRunDiscovery,
  onRunQuote,
  onRunCreateAction,
  onRunWebhook,
  onReset,
  providerSlug,
}) => {
  const [activeCodeTab, setActiveCodeTab] = useState<'request' | 'response'>('request');
  const [copyStatus, setCopyStatus] = useState('');

  // Sample or live request/response payloads for each step
  const getStepPayloads = () => {
    switch (step) {
      case 1:
        return {
          endpoint: 'GET /api/v1/providers/find?category=food',
          request: 'curl -X GET "https://api.zayuno.uz/api/v1/providers/find?category=food" \\\n  -H "x-simulator-session: live_sim_session"',
          response: JSON.stringify(
            {
              providers: [
                {
                  slug: providerSlug || 'demo-provider',
                  name: 'Demo Restoran / Provider',
                  category: 'food',
                  capabilities: ['HEALTH', 'CATALOG', 'QUOTE', 'ACTIONS', 'WEBHOOK'],
                  status: 'ACTIVE',
                  rating: 4.9,
                },
              ],
              count: 1,
            },
            null,
            2
          ),
        };
      case 2:
        return {
          endpoint: 'POST /api/v1/quote',
          request: JSON.stringify(
            {
              providerSlug: providerSlug || 'demo-provider',
              items: [{ offeringId: 'offering_standard_pkg', quantity: 2 }],
              deliveryAddress: 'Amir Temur ko‘chasi, 107',
            },
            null,
            2
          ),
          response: quote
            ? JSON.stringify(quote, null, 2)
            : JSON.stringify(
                {
                  quoteId: 'quote_sim_892348',
                  providerSlug: providerSlug || 'demo-provider',
                  currency: 'UZS',
                  subtotal: 120000,
                  deliveryFee: 15000,
                  total: 135000,
                  expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
                },
                null,
                2
              ),
        };
      case 3:
        return {
          endpoint: 'POST /api/v1/actions',
          request: JSON.stringify(
            {
              idempotencyKey: `idemp_${Date.now()}`,
              providerSlug: providerSlug || 'demo-provider',
              quoteId: quote?.quoteId || quote?.id || 'quote_sim_892348',
              customer: { name: 'Mijoz', phone: '+998901234567' },
              items: [{ offeringId: 'offering_standard_pkg', quantity: 2 }],
              userConfirmed: true,
            },
            null,
            2
          ),
          response: action
            ? JSON.stringify(action, null, 2)
            : JSON.stringify(
                {
                  actionId: 'act_sim_589123',
                  status: 'AWAITING_PAYMENT',
                  total: 135000,
                  currency: 'UZS',
                  nextAction: {
                    type: 'PAYMENT_REDIRECT',
                    url: 'https://sandbox.zayuno.uz/checkout/act_sim_589123',
                  },
                },
                null,
                2
              ),
        };
      case 4:
        return {
          endpoint: 'POST /webhook (Payme / Click Callback)',
          request: JSON.stringify(
            {
              event: 'action.payment.success',
              actionId: action?.actionId || action?.publicId || 'act_sim_589123',
              amount: 135000,
              paymentMethod: 'PAYME',
              paidAt: new Date().toISOString(),
            },
            null,
            2
          ),
          response: JSON.stringify(
            {
              received: true,
              actionStatus: 'PAID',
              fulfillmentStatus: 'PROCESSING',
            },
            null,
            2
          ),
        };
      case 5:
      default:
        return {
          endpoint: 'GET /api/v1/actions/{id}',
          request: `curl -X GET "https://api.zayuno.uz/api/v1/actions/${action?.actionId || 'act_sim_589123'}"`,
          response: JSON.stringify(
            {
              actionId: action?.actionId || action?.publicId || 'act_sim_589123',
              status: 'COMPLETED',
              paymentStatus: 'PAID',
              lifecycle: ['DISCOVERED', 'QUOTED', 'CREATED', 'PAID', 'COMPLETED'],
            },
            null,
            2
          ),
        };
    }
  };

  const payloadInfo = getStepPayloads();
  const currentCode = activeCodeTab === 'request' ? payloadInfo.request : payloadInfo.response;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(currentCode);
      setCopyStatus('Nusxalandi!');
      setTimeout(() => setCopyStatus(''), 2000);
    } catch {
      setCopyStatus('Nusxalash imkoni bo‘lmadi');
    }
  };

  return (
    <div className="sandbox-page space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <FlaskConical size={18} />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Buyurtma oqimini sinab ko‘ring
            </h1>
            <span className="bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
              SANDBOX SIMULATOR
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Ishlab turgan ishlab chiqarish tizimlariga ta’sir qilmasdan butun buyurtma oqimini simulyatsiya qiling.
          </p>
        </div>

        {step > 1 && (
          <button
            type="button"
            onClick={onReset}
            className="px-3.5 py-1.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium transition self-start sm:self-auto flex items-center gap-1.5"
          >
            <RefreshCw size={13} />
            Qayta boshlash
          </button>
        )}
      </div>

      {/* Stepper Header (5 Steps in Uzbek) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs font-mono">
        {STEPPER_ITEMS.map(item => {
          const isCurrent = step === item.s;
          const isPassed = step > item.s;
          return (
            <div
              key={item.s}
              className={`p-3 rounded-xl border transition-all ${
                isCurrent
                  ? 'bg-indigo-600/90 text-white border-indigo-400 shadow-lg shadow-indigo-600/20 ring-1 ring-indigo-400/30'
                  : isPassed
                  ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30'
                  : 'bg-slate-900/50 text-slate-500 border-slate-800/80'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider mb-1">
                <span className={isCurrent ? 'text-indigo-200' : isPassed ? 'text-emerald-400' : 'text-slate-500'}>
                  {item.kicker}
                </span>
                {isPassed && <Check size={12} className="text-emerald-400" />}
              </div>
              <div className="font-semibold truncate text-[11px] sm:text-xs">{item.label}</div>
            </div>
          );
        })}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-300 flex items-start gap-2.5">
          <span className="font-bold shrink-0">Xatolik:</span>
          <span>{error}</span>
        </div>
      )}

      {/* Two-Column Simulator Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Step Controller */}
        <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5">
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono text-indigo-400 uppercase font-semibold">1-qadam</span>
                <h3 className="text-base font-bold text-white">AI Provider topish (Discovery)</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Mijoz so‘rovi kelganda Zayuno AI agenti kategoriya va lokatsiya bo‘yicha mos providerlarni qidiradi va tanlaydi.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between text-slate-400">
                  <span>Kategoriya:</span>
                  <code className="text-indigo-300">food / xizmatlar</code>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Simulyatsiya:</span>
                  <span className="text-emerald-400 font-medium">Sandbox Session</span>
                </div>
              </div>
              <button
                type="button"
                onClick={onRunDiscovery}
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw size={15} className="animate-spin" /> : <Play size={15} />}
                <span>Sinovni boshlash (Provider topish)</span>
                <ArrowRight size={15} />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono text-indigo-400 uppercase font-semibold">2-qadam</span>
                <h3 className="text-base font-bold text-white">Jonli narx olish (Quote)</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Tanlangan mahsulot yoki xizmatlar uchun provider API’sidan haqiqiy narx, yetkazib berish narxi va qoldiq so‘raladi.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between text-slate-400">
                  <span>Mahsulot:</span>
                  <span className="text-white font-medium">Standard Package × 2 dona</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Tekshiruv:</span>
                  <span className="text-indigo-300 font-mono">POST /quote</span>
                </div>
              </div>
              <button
                type="button"
                onClick={onRunQuote}
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw size={15} className="animate-spin" /> : <Zap size={15} />}
                <span>Narxni hisoblash (Quote olish)</span>
                <ArrowRight size={15} />
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono text-indigo-400 uppercase font-semibold">3-qadam</span>
                <h3 className="text-base font-bold text-white">Mijoz tasdig‘i va Buyurtma yaratish</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Mijoz hisoblangan summani tasdiqlaydi. Zayuno takrorlanmas <code className="text-indigo-300">idempotencyKey</code> bilan providerga buyurtma (Action) yaratadi.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Quote ID:</span>
                  <span className="font-mono text-indigo-300 font-medium">
                    {quote?.quoteId || quote?.id || 'quote_sim_892348'}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-800/60 pt-1.5">
                  <span className="text-slate-400">Jami hisob:</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {(quote?.totalAmount || quote?.total || 135000).toLocaleString('uz-UZ')} {quote?.currency || 'UZS'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={onRunCreateAction}
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw size={15} className="animate-spin" /> : <Check size={15} />}
                <span>Buyurtmani tasdiqlash va Yaratish</span>
                <ArrowRight size={15} />
              </button>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono text-indigo-400 uppercase font-semibold">4-qadam</span>
                <h3 className="text-base font-bold text-white">To‘lov va Webhook Handoff</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Buyurtma yaratilgach, mijoz to‘lov tizimiga yo‘naltiriladi. To‘lov muvaffaqiyatli yakunlangach, webhook orqali status <code className="text-emerald-300">PAID</code> holatiga o‘tadi.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Action ID:</span>
                  <span className="font-mono text-indigo-300 font-medium">
                    {action?.actionId || action?.publicId || 'act_sim_589123'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">To‘lov manzili:</span>
                  <span className="text-sky-400 text-[11px] truncate max-w-[170px] flex items-center gap-1">
                    Checkout URL <ExternalLink size={11} />
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={onRunWebhook}
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw size={15} className="animate-spin" /> : <Sparkles size={15} />}
                <span>To‘lovni simulyatsiya qilish (Webhook)</span>
                <ArrowRight size={15} />
              </button>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 space-y-2">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                  <div>
                    <h4 className="font-bold text-white text-sm">Simulyatsiya to‘liq yakunlandi!</h4>
                    <p className="text-xs text-emerald-300">
                      Topish → Kotirovka → Buyurtma yaratish → To‘lov → Yakunlash oqimi muvaffaqiyatli sinovdan o‘tdi.
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Ushbu oqim backend integratsiyangizda qanday ishlashini bilmoqchimisiz? API tekshiruvini ishga tushiring yoki API qo‘llanmasini o‘rganing.
              </p>
              <button
                type="button"
                onClick={onReset}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition flex items-center justify-center gap-2"
              >
                <RefreshCw size={14} />
                Qayta sinovdan o‘tkazish
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Code & Payload Inspection Card (Overview Style) */}
        <div className="lg:col-span-7 code-preview shadow-2xl">
          <div className="code-preview-header">
            <div role="tablist" aria-label="API ma’lumotlari">
              <button
                type="button"
                role="tab"
                aria-selected={activeCodeTab === 'request'}
                onClick={() => setActiveCodeTab('request')}
              >
                So‘rov (Request)
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeCodeTab === 'response'}
                onClick={() => setActiveCodeTab('response')}
              >
                Javob (Response)
              </button>
            </div>

            <span className="font-mono text-[11px] text-slate-400 truncate max-w-[220px]">
              {payloadInfo.endpoint}
            </span>

            <button
              type="button"
              className="icon-button"
              aria-label="Kodni nusxalash"
              onClick={handleCopyCode}
            >
              <Copy size={14} />
            </button>
          </div>

          <pre role="tabpanel" className="max-h-[380px] overflow-y-auto">
            <code>{currentCode}</code>
          </pre>

          <div className="code-preview-footer">
            <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Terminal size={13} className="text-indigo-400" />
              {copyStatus || 'Haqiqiy Zayuno sandbox simulyatoridan olingan jonli payload.'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
