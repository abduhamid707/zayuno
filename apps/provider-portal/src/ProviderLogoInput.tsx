import React, { useState } from 'react';

export function ProviderLogoInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState('');
  const upload = async (file?: File) => {
    if (!file) return;
    setError('');
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError('PNG, JPG yoki WebP tanlang. Maksimal hajm: 5 MB.'); return;
    }
    setBusy(true);
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      const canvas = document.createElement('canvas');
      const ratio = Math.min(1, 384 / Math.max(image.width, image.height));
      canvas.width = Math.max(1, Math.round(image.width * ratio));
      canvas.height = Math.max(1, Math.round(image.height * ratio));
      const context = canvas.getContext('2d');
      if (!context) throw new Error();
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const encoded = canvas.toDataURL('image/webp', 0.8);
      if (encoded.length > 96_000) { setError('Rasm juda murakkab. Soddaroq yoki kichikroq logo tanlang.'); return; }
      onChange(encoded);
    } catch { setError('Rasmni ochib bo‘lmadi. Boshqa faylni tanlang.'); }
    finally { URL.revokeObjectURL(url); setBusy(false); }
  };
  return <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4 flex flex-wrap items-center gap-4">
    <div className="w-20 h-20 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
      {value && failed !== value ? <img alt="Provider logosi" src={value} className="w-full h-full object-contain p-2" onError={() => setFailed(value)} /> : <span className="text-indigo-300 text-2xl">◇</span>}
    </div>
    <div className="flex-1 min-w-56 space-y-2">
      <label className="block font-semibold text-white" htmlFor="provider-logo-file">Biznes logosi</label>
      <p className="text-xs text-slate-400">PNG, JPG, WebP · 5 MB gacha. Katalog uchun avtomatik ixchamlashtiriladi.</p>
      <input id="provider-logo-file" type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={e => { void upload(e.target.files?.[0]); e.target.value = ''; }} className="text-xs text-slate-300 max-w-full" />
      {busy && <p role="status">Logo tayyorlanmoqda…</p>}
      {!value.startsWith('data:') && <input aria-label="Logo HTTPS manzili" type="url" placeholder="Yoki https://… logo manzili" value={value} onChange={e => onChange(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm" />}
      {value && <button type="button" onClick={() => onChange('')} className="text-xs text-slate-400 underline">Logoni olib tashlash</button>}
      {(error || (value && failed === value)) && <p role="alert" className="text-sm text-rose-300">{error || 'Logo ochilmadi. Fayl yuklang yoki boshqa manzil kiriting.'}</p>}
    </div>
  </div>;
}
