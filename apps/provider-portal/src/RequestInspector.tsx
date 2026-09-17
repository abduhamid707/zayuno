import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  Check,
  Clock,
  Copy,
  Eye,
  Filter,
  RefreshCw,
  Search,
  Terminal,
  X,
} from 'lucide-react';

interface RequestInspectorProps {
  provider: any;
  logs: any[];
  loading: boolean;
  filters: { traceId: string; from: string; to: string };
  onFilterChange: (filters: { traceId: string; from: string; to: string }) => void;
  onRefresh: () => void;
  selectedLog: any | null;
  onSelectLog: (log: any | null) => void;
}

type EventCategory = 'ALL' | 'discovery' | 'quote' | 'action.create' | 'webhook' | 'error';

export const RequestInspector: React.FC<RequestInspectorProps> = ({
  provider,
  logs,
  loading,
  filters,
  onFilterChange,
  onRefresh,
  selectedLog,
  onSelectLog,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<EventCategory>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  };

  // Filter logs by event category pill
  const filteredLogs = useMemo(() => {
    if (!logs || !logs.length) return [];
    return logs.filter(log => {
      if (selectedCategory === 'ALL') return true;
      if (selectedCategory === 'error') {
        return (log.statusCode && log.statusCode >= 400) || !!log.errorMessage;
      }
      if (selectedCategory === 'discovery') {
        const ep = (log.endpoint || log.event || '').toLowerCase();
        return ep.includes('find') || ep.includes('discover') || ep.includes('search');
      }
      if (selectedCategory === 'quote') {
        const ep = (log.endpoint || log.event || '').toLowerCase();
        return ep.includes('quote');
      }
      if (selectedCategory === 'action.create') {
        const ep = (log.endpoint || log.event || '').toLowerCase();
        return ep.includes('action');
      }
      if (selectedCategory === 'webhook') {
        const ep = (log.endpoint || log.event || '').toLowerCase();
        return ep.includes('webhook') || log.source === 'webhook';
      }
      return true;
    });
  }, [logs, selectedCategory]);

  return (
    <div className="inspector-view space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Activity size={18} />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              So‘rovlar jurnali
            </h1>
            <span className="bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
              AUDIT & TRACE LOGS
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            AI agentlar va mijozlardan kelayotgan real-time so‘rovlar, quote hisoblashlar, webhooklar va xatoliklar auditi.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition flex items-center gap-1.5"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Yangilash</span>
          </button>
        </div>
      </div>

      {/* Quick Event Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-400 font-medium flex items-center gap-1 mr-1">
          <Filter size={13} className="text-indigo-400" />
          Filtr:
        </span>
        {[
          { key: 'ALL', label: 'Barchasi' },
          { key: 'discovery', label: 'discovery' },
          { key: 'quote', label: 'quote' },
          { key: 'action.create', label: 'action.create' },
          { key: 'webhook', label: 'webhook' },
          { key: 'error', label: 'error / 4xx / 5xx' },
        ].map(cat => {
          const isSelected = selectedCategory === cat.key;
          const isErrorPill = cat.key === 'error';
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => setSelectedCategory(cat.key as EventCategory)}
              className={`px-3 py-1 rounded-full text-xs font-mono font-medium transition border ${
                isSelected
                  ? isErrorPill
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 ring-1 ring-rose-500/30'
                    : 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/20'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Secondary Search & Date Filter Bar */}
      <div className="grid gap-2.5 rounded-2xl border border-slate-800 bg-slate-900/60 p-3.5 sm:grid-cols-3 md:grid-cols-4">
        <div className="relative sm:col-span-2 md:col-span-1">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Trace ID bo‘yicha izlash..."
            value={filters.traceId}
            onChange={e => onFilterChange({ ...filters, traceId: e.target.value })}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 pl-8 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <input
            type="date"
            aria-label="Dan"
            value={filters.from}
            onChange={e => onFilterChange({ ...filters, from: e.target.value })}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <input
            type="date"
            aria-label="Gacha"
            value={filters.to}
            onChange={e => onFilterChange({ ...filters, to: e.target.value })}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <button
          type="button"
          onClick={() => onFilterChange({ traceId: '', from: '', to: '' })}
          className="rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-3 py-2 text-xs text-slate-400 hover:text-slate-200 transition"
        >
          Filtrlarni tozalash
        </button>
      </div>

      {/* Logs Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-mono text-[11px]">
            <tr>
              <th className="p-3.5">Method & Endpoint</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5">Kechikish</th>
              <th className="p-3.5">Trace ID</th>
              <th className="p-3.5">Vaqt</th>
              <th className="p-3.5 text-right">Amal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {loading ? (
              <tr>
                <td colSpan={6} className="p-10 text-center text-slate-400 font-sans" role="status">
                  <RefreshCw size={20} className="animate-spin inline mr-2 text-indigo-400" />
                  So‘rovlar jurnali yuklanmoqda…
                </td>
              </tr>
            ) : !filteredLogs || filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-10 text-center text-slate-400 font-sans">
                  Hozircha tanlangan filtr bo‘yicha hech qanday chaqiruv yoki tranzaksiya qayd etilmagan.
                </td>
              </tr>
            ) : (
              filteredLogs.map((log: any) => {
                const status = log.statusCode || 200;
                const is2xx = status >= 200 && status < 300;
                const is4xx = status >= 400 && status < 500;
                const is5xx = status >= 500;
                const duration = log.durationMs;

                return (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.method === 'POST'
                              ? 'bg-indigo-500/20 text-indigo-300'
                              : log.method === 'GET'
                              ? 'bg-sky-500/20 text-sky-300'
                              : 'bg-purple-500/20 text-purple-300'
                          }`}
                        >
                          {log.method || 'EVENT'}
                        </span>
                        <span className="font-semibold text-slate-200">{log.endpoint || log.event}</span>
                      </div>
                      {log.source && (
                        <span className="text-[10px] text-slate-500 font-sans block mt-0.5">
                          Manba: {log.source}
                        </span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          is2xx
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : is4xx
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                        }`}
                      >
                        {status}
                      </span>
                    </td>
                    <td className="p-3.5">
                      {duration != null ? (
                        <span
                          className={`text-xs ${
                            duration < 200
                              ? 'text-emerald-400'
                              : duration < 800
                              ? 'text-sky-400'
                              : 'text-amber-400'
                          }`}
                        >
                          {duration}ms
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="p-3.5 text-indigo-300 text-[11px]">
                      {log.traceId ? (
                        <div className="flex items-center gap-1.5">
                          <span className="truncate max-w-[120px]">{log.traceId}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(log.traceId, log.id)}
                            title="Trace ID nusxalash"
                            className="text-slate-500 hover:text-slate-300 transition"
                          >
                            {copiedId === log.id ? (
                              <Check size={12} className="text-emerald-400" />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="p-3.5 text-slate-400 text-[11px]">
                      {log.createdAt
                        ? new Date(log.createdAt).toLocaleTimeString('uz-UZ', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })
                        : '—'}
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => onSelectLog(log)}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-lg text-xs font-sans font-medium transition inline-flex items-center gap-1 ml-auto"
                      >
                        <Eye size={13} /> Ko‘rish
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Selected Log Inspection Drawer / Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="my-8 w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                      selectedLog.method === 'POST'
                        ? 'bg-indigo-500/20 text-indigo-300'
                        : 'bg-sky-500/20 text-sky-300'
                    }`}
                  >
                    {selectedLog.method || 'EVENT'}
                  </span>
                  <h2 className="text-base font-bold text-white font-mono">
                    {selectedLog.endpoint || selectedLog.event}
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-2 font-mono">
                  <span>Trace: <code className="text-indigo-300">{selectedLog.traceId || 'N/A'}</code></span>
                  <span>•</span>
                  <span>
                    Status:{' '}
                    <strong
                      className={
                        selectedLog.statusCode < 300
                          ? 'text-emerald-400'
                          : selectedLog.statusCode < 500
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }
                    >
                      {selectedLog.statusCode || 'ERR'}
                    </strong>
                  </span>
                  {selectedLog.durationMs != null && (
                    <>
                      <span>•</span>
                      <span>Kechikish: {selectedLog.durationMs}ms</span>
                    </>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onSelectLog(null)}
                className="rounded-full bg-slate-800 hover:bg-slate-700 p-1.5 text-xs text-slate-400 hover:text-white transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Error Message Alert */}
            {selectedLog.errorMessage && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />
                <div>
                  <strong>Xatolik:</strong> {selectedLog.errorMessage}
                </div>
              </div>
            )}

            {/* Request Payload */}
            {selectedLog.requestBody && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold text-white">So‘rov tanasi (Request Body):</span>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(JSON.stringify(selectedLog.requestBody, null, 2), 'req-body')
                    }
                    className="hover:text-indigo-300 flex items-center gap-1 text-[11px] font-mono"
                  >
                    {copiedId === 'req-body' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    {copiedId === 'req-body' ? 'Nusxalandi!' : 'JSON nusxalash'}
                  </button>
                </div>
                <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-300 overflow-x-auto max-h-52">
                  {JSON.stringify(selectedLog.requestBody, null, 2)}
                </pre>
              </div>
            )}

            {/* Response Payload */}
            {selectedLog.responseBody && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold text-white">Server javobi (Response Body):</span>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(JSON.stringify(selectedLog.responseBody, null, 2), 'res-body')
                    }
                    className="hover:text-indigo-300 flex items-center gap-1 text-[11px] font-mono"
                  >
                    {copiedId === 'res-body' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    {copiedId === 'res-body' ? 'Nusxalandi!' : 'JSON nusxalash'}
                  </button>
                </div>
                <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-sky-300 overflow-x-auto max-h-52">
                  {JSON.stringify(selectedLog.responseBody, null, 2)}
                </pre>
              </div>
            )}

            {/* Webhook Payload */}
            {selectedLog.payload && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold text-white">Webhook Payload:</span>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(JSON.stringify(selectedLog.payload, null, 2), 'webhook-payload')
                    }
                    className="hover:text-indigo-300 flex items-center gap-1 text-[11px] font-mono"
                  >
                    {copiedId === 'webhook-payload' ? (
                      <Check size={12} className="text-emerald-400" />
                    ) : (
                      <Copy size={12} />
                    )}
                    {copiedId === 'webhook-payload' ? 'Nusxalandi!' : 'JSON nusxalash'}
                  </button>
                </div>
                <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-purple-300 overflow-x-auto max-h-52">
                  {JSON.stringify(selectedLog.payload, null, 2)}
                </pre>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => onSelectLog(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
