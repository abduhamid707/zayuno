import React from 'react';
import { Lock, ArrowRight, ShieldCheck, Zap, Sparkles, BookOpen, Layers } from 'lucide-react';

interface ProtectedGateProps {
  sectionTitle: string;
  sectionDescription: string;
  onLoginClick: () => void;
  onSignupClick: () => void;
  onDocsClick: () => void;
}

export const ProtectedGate: React.FC<ProtectedGateProps> = ({
  sectionTitle,
  sectionDescription,
  onLoginClick,
  onSignupClick,
  onDocsClick
}) => {
  return (
    <div className="max-w-2xl mx-auto my-12 p-8 sm:p-10 rounded-3xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800 shadow-2xl backdrop-blur-xl animate-fadeIn text-center space-y-6">
      {/* Icon with Glowing Halo */}
      <div className="relative inline-block">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600/30 via-violet-500/20 to-sky-500/20 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/30 shadow-lg shadow-indigo-950/50">
          <Lock className="w-8 h-8 text-indigo-300" />
        </div>
        <div className="absolute -inset-1 rounded-2xl bg-indigo-500/20 blur-lg -z-10 animate-pulse" />
      </div>

      {/* Header & Context */}
      <div className="space-y-2 max-w-lg mx-auto">
        <span className="text-[11px] font-mono uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
          Himoyalangan bo‘lim
        </span>
        <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
          {sectionTitle}
        </h3>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          {sectionDescription}
        </p>
      </div>

      {/* Trust Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left py-2 border-y border-slate-800/80">
        <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
          <Zap className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-[11px] text-slate-300 font-medium">5 daqiqada ulanish</span>
        </div>
        <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-[11px] text-slate-300 font-medium">Xavfsiz API kalitlari</span>
        </div>
        <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
          <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
          <span className="text-[11px] text-slate-300 font-medium">AI agentlar qidiruvi</span>
        </div>
      </div>

      {/* Call to Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <button
          onClick={onSignupClick}
          className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs px-6 py-3 rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
        >
          Provider bo‘lish (5 daqiqada ariza) <ArrowRight className="w-4 h-4" />
        </button>
        <button
          onClick={onLoginClick}
          className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-slate-200 font-medium text-xs px-5 py-3 rounded-xl border border-slate-700 hover:border-slate-600 transition-all flex items-center justify-center gap-2"
        >
          Mavjud hisobga kirish
        </button>
      </div>

      <div className="pt-1">
        <button
          onClick={onDocsClick}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-300 transition-colors"
        >
          <BookOpen className="w-3.5 h-3.5" /> Integratsiya hujjatlarini o‘qish →
        </button>
      </div>
    </div>
  );
};
