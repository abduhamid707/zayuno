import React from 'react';
import { ArrowRight, BookOpen, Building2, Terminal, ArrowUpRight, Sparkles } from 'lucide-react';

interface ProviderEmptyStateProps {
  title?: string;
  description?: string;
  onStartOnboarding: () => void;
  onOpenDocs: () => void;
  onOpenAiKit?: () => void;
}

const ONBOARDING_STEPS = [
  {
    num: '01',
    title: 'Biznes profili',
    detail: 'Nomi, sohasi, xizmat hududi va aloqa ma’lumotlari.',
  },
  {
    num: '02',
    title: 'API integratsiyasi',
    detail: 'HTTPS endpoint, API kaliti va webhook sozlamasi.',
  },
  {
    num: '03',
    title: 'Integratsiya testi',
    detail: 'Avtomatlashtirilgan contract certification va sandbox sinovi.',
  },
  {
    num: '04',
    title: 'Jonli buyurtmalar',
    detail: 'AI agentlar tarmog‘ida faollashish va real buyurtmalar oqimi.',
  },
];

export const ProviderEmptyState: React.FC<ProviderEmptyStateProps> = ({
  title = 'Avval biznes profilingizni yarating',
  description = 'Zayuno tarmog‘i orqali AI mijozlardan buyurtma qabul qilish uchun biznesingizni 4 bosqichda ulang.',
  onStartOnboarding,
  onOpenDocs,
  onOpenAiKit,
}) => {
  return (
    <div className="provider-empty-state max-w-4xl mx-auto my-6 p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-slate-900/90 to-slate-950/95 border border-slate-800 shadow-2xl backdrop-blur-xl animate-fadeIn space-y-7">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20 shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                Bosqichma-bosqich yo‘l
              </span>
              <span className="text-xs text-slate-500">4 qadam</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mt-1">
              {title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onStartOnboarding}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition flex items-center gap-2"
          >
            Biznesni ulash <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4-Step Progress Trail */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {ONBOARDING_STEPS.map((step, idx) => (
          <div
            key={step.num}
            className={`p-4 rounded-2xl border transition-all ${
              idx === 0
                ? 'bg-indigo-950/25 border-indigo-500/30 ring-1 ring-indigo-500/20'
                : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                idx === 0 ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-800 text-slate-400'
              }`}>
                {step.num}
              </span>
              {idx === 0 && (
                <span className="text-[10px] font-mono text-indigo-400 font-semibold">
                  Hozirgi qadam
                </span>
              )}
            </div>
            <h3 className="text-sm font-bold text-white mb-1">{step.title}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">{step.detail}</p>
          </div>
        ))}
      </div>

      {/* Footer Resources */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800/80 text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onOpenDocs}
            className="hover:text-indigo-300 transition flex items-center gap-1.5"
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
            Integratsiya qo‘llanmasi
          </button>
          {onOpenAiKit && (
            <button
              type="button"
              onClick={onOpenAiKit}
              className="hover:text-amber-300 transition flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              AI Kit (Prompt)
            </button>
          )}
        </div>
        <a
          href="/llms.txt"
          target="_blank"
          rel="noreferrer"
          className="hover:text-slate-200 transition flex items-center gap-1 font-mono text-[11px]"
        >
          <Terminal className="w-3 h-3 text-slate-400" />
          llms.txt contract <ArrowUpRight className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};
