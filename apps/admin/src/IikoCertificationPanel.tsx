import React, { useState } from 'react';

export function IikoCertificationPanel({ provider, apiFetch, onUpdated }: {
  provider: any; apiFetch: (url: string, init?: RequestInit) => Promise<Response>; onUpdated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState<any>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [fields, setFields] = useState({ customerName: '', phone: '', city: '', address: '', currency: provider.config?.currency || 'RUB', maxTotal: '' });
  const valid = confirmed && fields.customerName.trim() && /^\+[1-9]\d{7,14}$/.test(fields.phone) && fields.city.trim() && fields.address.trim() && Number(fields.maxTotal) > 0;
  const run = async (event: React.FormEvent) => {
    event.preventDefault(); if (!valid || busy) return;
    setBusy(true); setError(''); setReport(null);
    try {
      const response = await apiFetch(`/api/v1/admin/providers/${encodeURIComponent(provider.slug)}/certify`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...fields, maxTotal: Number(fields.maxTotal), confirmTestOrder: true })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.customerMessage || data.message || 'Tekshiruv bajarilmadi.');
      setReport(data); onUpdated();
      if (data.isProductionReady) { setOpen(false); setConfirmed(false); }
    } catch (error) { setError(error instanceof Error ? error.message : 'Tekshiruv bajarilmadi.'); }
    finally { setBusy(false); }
  };
  const stored = report || provider.metadata?.lastCertificationReport;
  return <div className="w-full space-y-3">
    <div className="rounded-lg border border-slate-700 p-3 text-xs text-slate-300 space-y-1">
      <p>1. Sinov buyurtmasini tekshiring → 2. Natijani ko‘rib chiqing → 3. ACTIVE qiling.</p>
      <p>iiko holati API orqali tekshiriladi. Muvaffaqiyatli sinovdan keyin ariza tasdiqlashga tayyor bo‘ladi.</p>
    </div>
    <button type="button" disabled={busy} onClick={() => setOpen(!open)} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-60">
      {busy ? 'Tekshirilmoqda…' : 'iiko sinov buyurtmasini tekshirish'}
    </button>
    {open && <form onSubmit={run} className="space-y-3 rounded-lg border border-amber-500/40 p-3">
      <p className="text-xs text-amber-200">Bu sinov restoranning kassasiga 1 ta haqiqiy buyurtma yuboradi va avtomatik bekor qiladi. Restoran bilan kelishilgan sinov telefon va manzilini kiriting. Pul yechilmaydi.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {(['customerName', 'phone', 'city', 'address', 'maxTotal'] as const).map(key => <label key={key} className="text-xs text-slate-300">
          {{ customerName: 'Sinov mijozining ismi', phone: 'Telefon (+998…)', city: 'Shahar', address: 'Yetkazish manzili', maxTotal: 'Sinov uchun maksimal summa' }[key]}
          <input required type={key === 'maxTotal' ? 'number' : 'text'} min={key === 'maxTotal' ? '0.01' : undefined} step={key === 'maxTotal' ? '0.01' : undefined}
            value={fields[key]} onChange={event => setFields({ ...fields, [key]: event.target.value })}
            className="mt-1 w-full rounded border border-slate-600 bg-slate-950 p-2 text-white" />
        </label>)}
        <label className="text-xs text-slate-300">Valyuta<select value={fields.currency} onChange={event => setFields({ ...fields, currency: event.target.value })} className="mt-1 w-full rounded border border-slate-600 bg-slate-950 p-2 text-white">
          {['UZS', 'RUB', 'USD', 'EUR'].map(currency => <option key={currency}>{currency}</option>)}
        </select></label>
      </div>
      <label className="flex gap-2 text-xs text-slate-300"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />Restoran bilan kelishilgan. Bitta sinov buyurtmasini yaratish va bekor qilishga ruxsat beraman.</label>
      <button disabled={!valid || busy} className="rounded bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-40">{busy ? 'Buyurtma tekshirilmoqda…' : 'Sinovni boshlash'}</button>
    </form>}
    {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}
    {stored?.mode === 'NATIVE_IIKO' && <div className={`rounded-lg border p-3 text-xs ${stored.isProductionReady ? 'border-emerald-500/40 text-emerald-300' : 'border-rose-500/40 text-rose-300'}`}>
      <p>{stored.isProductionReady ? 'Sinov o‘tdi. Endi ACTIVE tugmasi bilan tasdiqlashingiz mumkin.' : 'Sinov o‘tmadi. ACTIVE yopiq; xatoni tuzating.'}</p>
      <p>{stored.passedCount}/{stored.totalTests} tekshiruv o‘tdi.</p>
      {stored.tests?.filter((test: any) => !test.passed).map((test: any) => <p key={test.testId}>{test.error}</p>)}
      {stored.nativeEvidence?.orderId && <p className="break-all">Sinov buyurtmasi: {stored.nativeEvidence.orderId}</p>}
      {stored.tests?.some((test: any) => test.testId === 'action_cancel' && !test.passed) && <p>Bekor qilish tasdiqlanmadi. Shu buyurtmani kassada tekshiring va bekor qiling.</p>}
    </div>}
  </div>;
}
