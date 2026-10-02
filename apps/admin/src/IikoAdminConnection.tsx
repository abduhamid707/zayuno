import React, { useState } from 'react';

type Discovery = {
  organizations: Array<{ id: string; name: string; currency?: string }>;
  terminalGroups: Array<{ id: string; organizationId: string; name: string }>;
  externalMenus: Array<{ id: string; name: string }>;
};

export function IikoAdminConnection({ apiBase, token, onConnected }: {
  apiBase: string; token: string; onConnected: () => void;
}) {
  const [credentials, setCredentials] = useState({ apiLogin: '', apiKey: '', appId: '', clientSecret: '' });
  const [discovery, setDiscovery] = useState<Discovery | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [organizationId, setOrganizationId] = useState('');
  const [terminalGroupId, setTerminalGroupId] = useState('');
  const [externalMenuId, setExternalMenuId] = useState('');
  const [countryCode, setCountryCode] = useState('UZ');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const request = async (path: string, payload: unknown) => {
    const response = await fetch(`${apiBase}/api/v1/iiko-connections${path}`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(Array.isArray(data?.message) ? data.message.join('; ') : data?.message || 'iiko ulanishi bajarilmadi.');
    return data;
  };
  const keys = () => Object.fromEntries(Object.entries(credentials).filter(([, value]) => value.trim()).map(([key, value]) => [key, value.trim()]));
  const discover = async () => {
    setBusy(true); setError(''); setNotice(''); setDiscovery(null);
    try {
      const result = await request('/discover', keys()) as Discovery;
      setDiscovery(result);
      setOrganizationId(result.organizations[0]?.id || '');
      setTerminalGroupId(result.terminalGroups.find(group => group.organizationId === result.organizations[0]?.id)?.id || '');
      setExternalMenuId(result.externalMenus[0]?.id || '');
      if (!result.externalMenus.length) setError('Tashqi menyu topilmadi. iikoWeb’da menyuni Cloud API integratsiyasiga biriktiring.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Tekshiruv muvaffaqiyatsiz.'); }
    finally { setBusy(false); }
  };
  const connect = async () => {
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await request('', { credentials: keys(), name: name.trim(), slug: slug.trim(), organizationId,
        terminalGroupId, externalMenuId, countryCode });
      setNotice(`${result.organization}: ${result.productCount} mahsulot ulandi. Holat: ${result.status}.`);
      setCredentials({ apiLogin: '', apiKey: '', appId: '', clientSecret: '' });
      setDiscovery(null);
      onConnected();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Ulash muvaffaqiyatsiz.'); }
    finally { setBusy(false); }
  };
  const inputClass = 'mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white';
  const credential = (label: string, key: keyof typeof credentials) => <label className="text-xs text-slate-300">{label}
    <input type="password" autoComplete="off" className={inputClass} value={credentials[key]}
      onChange={event => setCredentials(previous => ({ ...previous, [key]: event.target.value }))} />
  </label>;

  return <section className="space-y-3 rounded-2xl border border-amber-500/30 bg-slate-900 p-5">
    <div><h3 className="font-bold text-white">iiko Cloud restoranini ulash</h3>
      <p className="mt-1 text-xs text-slate-400">Kalitlar faqat serverda shifrlanadi. Tekshirish buyurtma yaratmaydi; provider DRAFT holatda qoladi.</p></div>
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {credential('apiLogin / API kalit', 'apiLogin')}{credential('Alohida API key (v2)', 'apiKey')}
      {credential('App ID (v2)', 'appId')}{credential('Client Secret (v2)', 'clientSecret')}
    </div>
    <button type="button" disabled={busy || (!credentials.apiLogin && !credentials.apiKey)} onClick={discover}
      className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-slate-950 disabled:opacity-50">
      {busy ? 'Tekshirilmoqda…' : 'Restoranlarni tekshirish'}
    </button>
    {discovery && <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <label className="text-xs text-slate-300">Restoran<select className={inputClass} value={organizationId}
        onChange={event => { const id = event.target.value; setOrganizationId(id);
          setTerminalGroupId(discovery.terminalGroups.find(group => group.organizationId === id)?.id || ''); }}>
        {discovery.organizations.map(org => <option key={org.id} value={org.id}>{org.name} · {org.currency || '?'}</option>)}
      </select></label>
      <label className="text-xs text-slate-300">POS guruhi<select className={inputClass} value={terminalGroupId}
        onChange={event => setTerminalGroupId(event.target.value)}>
        {discovery.terminalGroups.filter(group => group.organizationId === organizationId).map(group =>
          <option key={group.id} value={group.id}>{group.name}</option>)}
      </select></label>
      <label className="text-xs text-slate-300">Tashqi menyu<select className={inputClass} value={externalMenuId}
        onChange={event => setExternalMenuId(event.target.value)}>
        {discovery.externalMenus.map(menu => <option key={menu.id} value={menu.id}>{menu.name}</option>)}
      </select></label>
      <label className="text-xs text-slate-300">Provider nomi<input className={inputClass} value={name}
        onChange={event => setName(event.target.value)} maxLength={100} /></label>
      <label className="text-xs text-slate-300">Zayuno slug<input className={inputClass} value={slug}
        onChange={event => setSlug(event.target.value.toLowerCase())} maxLength={63} placeholder="restoran-nomi" /></label>
      <label className="text-xs text-slate-300">Mamlakat kodi<input className={inputClass} value={countryCode}
        onChange={event => setCountryCode(event.target.value.toUpperCase())} maxLength={2} /></label>
      <button type="button" disabled={busy || !organizationId || !terminalGroupId || !externalMenuId || !name.trim() || !slug.trim()}
        onClick={connect} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
        iiko restoranini DRAFT sifatida ulash
      </button>
    </div>}
    {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}
    {notice && <p role="status" className="text-xs text-emerald-300">{notice}</p>}
  </section>;
}
