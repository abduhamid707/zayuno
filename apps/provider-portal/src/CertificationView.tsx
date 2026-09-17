import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Play,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Terminal,
  XCircle,
} from 'lucide-react';

interface CertificationViewProps {
  provider: any;
  certReport: any;
  isPending: boolean;
  onRunCertify: () => void;
  onOpenDocs: (docId: string) => void;
  onOpenAiKit: () => void;
}

const CAPABILITY_AREAS = [
  {
    title: 'Salomatlik & Protokol',
    desc: 'GET /health, metadata va aktiv filiallar tekshiruvi.',
    caps: 'HEALTH · METADATA · LOCATIONS',
  },
  {
    title: 'Katalog & Semantik Qidiruv',
    desc: 'GET /catalog va GET /search mahsulotlar to‘liqligi.',
    caps: 'CATALOG · OFFERING · SEARCH',
  },
  {
    title: 'Dinamik Narx Hisoblash',
    desc: 'POST /quote manzil, yetkazish va narx kotirovkasi.',
    caps: 'QUOTE · DYNAMIC_PRICE',
  },
  {
    title: 'Buyurtma & Idempotency',
    desc: 'POST /actions takrorlanmas kalit va xavfsiz saqlash.',
    caps: 'ACTION_CREATE · IDEMPOTENCY',
  },
  {
    title: 'To‘lov Handofflari',
    desc: 'NextAction URL va Payme / Click / Uzum ulanishi.',
    caps: 'PAYMENT_OPTIONS · NEXT_ACTION',
  },
  {
    title: 'Webhook & HMAC Imzosi',
    desc: 'Hodisalar yuborilishi va x-zayuno-signature tekshiruvi.',
    caps: 'WEBHOOK · HMAC_SHA256',
  },
];

export const CertificationView: React.FC<CertificationViewProps> = ({
  provider,
  certReport,
  isPending,
  onRunCertify,
  onOpenDocs,
  onOpenAiKit,
}) => {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const toggleRow = (idx: number) => {
    setExpandedRow(current => (current === idx ? null : idx));
  };

  return (
    <div className="certification-view space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <ShieldCheck size={18} />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Integratsiya tekshiruvi va sertifikatlash
            </h1>
            <span className="bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
              PROTOCOL v1
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Provider API integratsiyangizni Zayuno universal protokoli, idempotency, to‘lov handofflari va webhook xavfsizligiga mosligini to‘liq avtomat tekshiradi.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onRunCertify}
            disabled={isPending || !provider?.slug}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition flex items-center gap-2"
          >
            {isPending ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Tekshirilmoqda…</span>
              </>
            ) : (
              <>
                <Play size={14} />
                <span>To‘liq tekshiruvni ishga tushirish</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* When Report Exists */}
      {certReport ? (
        <div className="space-y-6">
          {/* Result Banner */}
          <div
            className={`p-6 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all shadow-xl ${
              certReport.isCertified
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
            }`}
          >
            <div className="flex items-start gap-3.5">
              {certReport.isCertified ? (
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={24} />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
                  <XCircle size={24} />
                </div>
              )}
              <div>
                <h3 className="text-base font-bold text-white">
                  {certReport.isCertified
                    ? 'Integratsiya to‘liq sertifikatlandi!'
                    : 'Sertifikatlash testlarida kamchiliklar aniqlandi'}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                  {certReport.passedCount} ta test muvaffaqiyatli, {certReport.failedCount} ta xato,{' '}
                  {certReport.skippedCount || 0} ta bloklangan. Ishga tushirishga tayyorlik:{' '}
                  <strong className={certReport.isProductionReady ? 'text-emerald-400' : 'text-amber-300'}>
                    {certReport.isProductionReady ? 'TAYYOR (READY)' : 'TUGALLANMAGAN'}
                  </strong>
                  .
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-mono font-bold px-3 py-1 rounded-full border ${
                  certReport.isCertified
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                }`}
              >
                {certReport.isCertified ? 'SERTIFIKATLANDI' : 'XATOLIKLAR BOR'}
              </span>
            </div>
          </div>

          {/* Test Results Table */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                Tekshirilgan Capability Modullari ({certReport.tests.length} ta)
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                {certReport.passedCount} / {certReport.tests.length} PASS
              </span>
            </div>

            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                <tr>
                  <th className="p-3.5">Imkoniyat va Test nomi</th>
                  <th className="p-3.5">Turi</th>
                  <th className="p-3.5">Kechikish</th>
                  <th className="p-3.5 text-right">Natija</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {certReport.tests.map((t: any, idx: number) => {
                  const isPassed = t.status === 'PASS' || t.passed;
                  const isSkipped = t.status === 'SKIPPED';
                  const hasDetails = !!t.error || !!t.issue;
                  const isExpanded = expandedRow === idx;

                  return (
                    <React.Fragment key={idx}>
                      <tr
                        onClick={() => hasDetails && toggleRow(idx)}
                        className={`transition ${hasDetails ? 'cursor-pointer hover:bg-slate-800/60' : 'hover:bg-slate-800/30'}`}
                      >
                        <td className="p-3.5">
                          <div className="flex items-center gap-2">
                            {hasDetails && (
                              <span className="text-slate-500">
                                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </span>
                            )}
                            <div>
                              <span className="font-semibold text-white">{t.name}</span>
                              <span className="ml-2 font-mono text-[10px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                                {t.capability}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5">
                          {t.isMandatory ? (
                            <span className="bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold">
                              MAJBURIY
                            </span>
                          ) : (
                            <span className="bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded-full text-[10px] font-mono">
                              IXTIYORIY
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 font-mono text-slate-400">
                          {t.durationMs != null ? `${t.durationMs}ms` : '—'}
                        </td>
                        <td className="p-3.5 text-right">
                          {isPassed ? (
                            <span className="text-emerald-400 font-semibold inline-flex items-center justify-end gap-1">
                              <Check size={14} /> PASS
                            </span>
                          ) : isSkipped ? (
                            <span className="text-amber-400 font-semibold inline-flex items-center justify-end gap-1">
                              <AlertTriangle size={14} /> BLOCKED
                            </span>
                          ) : (
                            <span className="text-rose-400 font-semibold inline-flex items-center justify-end gap-1">
                              <XCircle size={14} /> FAIL
                            </span>
                          )}
                        </td>
                      </tr>

                      {/* Expandable Issue Details */}
                      {hasDetails && isExpanded && (
                        <tr className="bg-slate-950/80">
                          <td colSpan={4} className="p-4 border-t border-slate-800/80 space-y-2">
                            {t.error && (
                              <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-xs text-rose-300 font-mono">
                                <strong>Xatolik:</strong> {t.error}
                              </div>
                            )}
                            {t.issue && (
                              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1 text-xs text-slate-300 font-mono">
                                <div><b className="text-slate-400">Asosiy sabab:</b> {t.issue.rootCause}</div>
                                {t.endpoint && <div><b className="text-slate-400">Endpoint:</b> <code>{t.endpoint}</code></div>}
                                {t.issue.path && <div><b className="text-slate-400">Path:</b> <code>{t.issue.path}</code></div>}
                                {t.issue.expected && <div><b className="text-slate-400">Kutilgan:</b> {t.issue.expected}</div>}
                                {t.issue.received && <div><b className="text-slate-400">Qabul qilingan:</b> {t.issue.received}</div>}
                              </div>
                            )}
                            {t.blockedBy?.length > 0 && (
                              <div className="text-[11px] text-amber-300 font-mono">
                                To‘siq bo‘lgan tekshiruvlar: {t.blockedBy.join(', ')}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Pre-Test Overview Cards */
        <div className="space-y-6">
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                <ShieldCheck size={26} />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Tekshiruvga tayyormisiz?
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
                  Zayuno serveri <code className="text-indigo-300 font-mono">{provider?.baseUrl || 'https://YOUR_API'}</code> manzilingizga quyidagi 6 yo‘nalish bo‘yicha avtomatik test so‘rovlarini yuboradi.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {CAPABILITY_AREAS.map(area => (
                <div
                  key={area.title}
                  className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-1.5"
                >
                  <div className="text-[10px] font-mono text-indigo-400 font-semibold uppercase tracking-wider">
                    {area.caps}
                  </div>
                  <h4 className="text-sm font-bold text-white">{area.title}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">{area.desc}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800/80">
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <button
                  type="button"
                  onClick={() => onOpenDocs('certification')}
                  className="hover:text-indigo-300 transition flex items-center gap-1.5"
                >
                  <BookOpen size={14} className="text-indigo-400" />
                  Sertifikatlash talablari
                </button>
                <button
                  type="button"
                  onClick={onOpenAiKit}
                  className="hover:text-amber-300 transition flex items-center gap-1.5"
                >
                  <Sparkles size={14} className="text-amber-400" />
                  AI Kit yordami
                </button>
              </div>

              <button
                type="button"
                onClick={onRunCertify}
                disabled={isPending || !provider?.slug}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition flex items-center gap-2"
              >
                {isPending ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
                <span>Tekshiruvni boshlash</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
