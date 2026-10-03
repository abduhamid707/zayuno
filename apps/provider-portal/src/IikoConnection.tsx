import React, { useEffect, useState } from 'react';
import { ArrowRight, Check, ChevronLeft, KeyRound, ShieldCheck, UtensilsCrossed, X } from 'lucide-react';

type Discovery = {
  organizations: Array<{ id: string; name: string; currency?: string | null; address?: string | null }>;
  terminalGroups: Array<{ id: string; organizationId: string; name: string }>;
  externalMenus: Array<{ id: string; name: string }>;
};
type Status = { connected: boolean; slug?: string; name?: string; status?: string; isPublished?: boolean;
  organizationName?: string; menuName?: string; productCount?: number };

export function IikoConnection({ token, apiBaseUrl, providerSlug, onConnected }: {
  token?: string; apiBaseUrl: string; providerSlug?: string; onConnected?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
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
  const [checkResult, setCheckResult] = useState<{ connected: boolean; terminalOnline?: boolean; productCount?: number } | null>(null);
  const endpoint = `${apiBaseUrl}/api/v1/iiko-connections`;

  useEffect(() => {
    if (!token) return;
    let active = true;
    fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } })
      .then(async response => response.ok ? response.json() : null)
      .then(data => { if (active) setStatus(data); })
      .catch(() => { if (active) setStatus(null); });
    return () => { active = false; };
  }, [token, endpoint, providerSlug]);

  useEffect(() => {
    if (providerSlug) setSlug(providerSlug);
  }, [providerSlug]);

  const request = async (path: string, body: unknown) => {
    const response = await fetch(endpoint + path, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const message = data?.message;
      throw new Error(Array.isArray(message) ? message.join('; ') : typeof message === 'string' ? message : 'iiko ulanishini tekshirib bo‘lmadi.');
    }
    return data;
  };

  const credentialPayload = () => Object.fromEntries(
    Object.entries(credentials).filter(([, value]) => value.trim()).map(([key, value]) => [key, value.trim()])
  );

  const discover = async () => {
    if (!token) return;
    setBusy(true); setError(''); setNotice(''); setDiscovery(null);
    try {
      const data = await request('/discover', credentialPayload()) as Discovery;
      setDiscovery(data);
      setName(data.organizations[0]?.name || '');
      setOrganizationId(data.organizations[0]?.id || '');
      setExternalMenuId(data.externalMenus[0]?.id || '');
      setTerminalGroupId(data.terminalGroups.find(group => group.organizationId === data.organizations[0]?.id)?.id || '');
      if (!data.externalMenus.length) setError('Tashqi menyu topilmadi. iikoWeb’da tashqi menyu yarating va Cloud API integratsiyasiga biriktiring.');
      if (!data.terminalGroups.length) setError('POS guruhi topilmadi. iikoFront va iikoWeb sozlamalarini tekshiring.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Tekshiruv muvaffaqiyatsiz.'); }
    finally { setBusy(false); }
  };

  const connect = async () => {
    if (!token || !discovery) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const data = await request('', { credentials: credentialPayload(), name: name.trim(), slug: slug.trim(),
        organizationId, terminalGroupId, externalMenuId, countryCode });
      setStatus({ connected: true, slug: data.slug, name: name.trim(), status: data.status,
        organizationName: data.organization, menuName: data.menu, productCount: data.productCount });
      setNotice(data.message || 'iiko ulandi. Admin tasdig‘ini kuting.');
      setCredentials({ apiLogin: '', apiKey: '', appId: '', clientSecret: '' });
      setDiscovery(null);
      setExpanded(false);
      onConnected?.();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Ulash muvaffaqiyatsiz.'); }
    finally { setBusy(false); }
  };

  const check = async () => {
    setBusy(true); setError(''); setCheckResult(null);
    try { setCheckResult(await request('/check', {})); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Tekshiruv bajarilmadi.'); }
    finally { setBusy(false); }
  };

  const field = (label: string, key: keyof typeof credentials, hint?: string) => (
    <label className="ig-field">
      <span>{label}</span><input type="password" autoComplete="off" value={credentials[key]} disabled={busy}
        onChange={event => { setCredentials(previous => ({ ...previous, [key]: event.target.value })); setDiscovery(null); }} />
      {hint && <small>{hint}</small>}
    </label>
  );

  return <section className={`ig-iiko-card ${expanded ? 'ig-iiko-expanded' : ''}`}>
    <div className="ig-platform-top">
      <div className="ig-platform-logo ig-iiko-logo"><UtensilsCrossed size={24} /></div>
      <span className={`ig-badge ${status?.connected ? 'ig-badge-connected' : ''}`}>
        {status?.connected ? 'ULANGAN' : 'ULASH MUMKIN'}
      </span>
    </div>
    <div className="ig-platform-copy">
      <h3>iiko Cloud</h3>
      <p>Restoran menyusi, narxlar va buyurtmalarni bitta ulanish orqali boshqaring.</p>
      <div className="ig-platform-tags"><span>Restoranlar</span><span>Menyu va buyurtmalar</span></div>
    </div>
    {status?.connected && <div className="ig-iiko-summary">
      <strong>{status.name || status.slug}</strong>
      <span>{status.status === 'ACTIVE' && status.isPublished ? 'Faol' : 'Tasdiqlash kutilmoqda'}</span>
      <small>{status.organizationName} · {status.menuName} · {status.productCount ?? 0} ta mahsulot</small>
      <button className="ig-button ig-button-secondary" type="button" onClick={check} disabled={busy}>
        {busy ? 'Tekshirilmoqda…' : 'Ulanishni tekshirish'}
      </button>
      {checkResult && <p role="status">{checkResult.connected
        ? `${checkResult.productCount ?? 0} ta mahsulot · Kassa ${checkResult.terminalOnline ? 'online' : 'offline'}`
        : 'Restoran, kassa guruhi yoki menyu topilmadi.'}</p>}
    </div>}
    {!expanded && (!status?.connected || status.status === 'DRAFT' || status.status === 'DISABLED') &&
      <button className="ig-button" type="button" onClick={() => setExpanded(true)} disabled={!token}>
        {status?.connected ? 'Ulanish sozlamalari' : 'Restoranni ulash'}<ArrowRight size={17} />
      </button>}
    {!token && <small className="ig-form-note">Ulash uchun hisobingizga kiring.</small>}
    {expanded && <div className="ig-iiko-setup">
      <div className="ig-setup-heading"><h4>Restoranni ulash</h4>
        <button className="ig-close" type="button" aria-label="Ulash formasini yopish" disabled={busy} onClick={() => setExpanded(false)}><X size={20} /></button>
      </div>
      <ol className="ig-steps" aria-label="Ulash bosqichlari">
        <li className={!discovery ? 'ig-step-current' : 'ig-step-done'}><span>{discovery ? <Check size={14} /> : '1'}</span> API kalit</li>
        <li className={discovery ? 'ig-step-current' : ''}><span>2</span> Restoran va menyu</li>
        <li><span>3</span> Tasdiqlash</li>
      </ol>
      {!discovery ? <>
        <div className="ig-form-description"><KeyRound size={20} /><div><strong>iiko hisobingizni bog‘lang</strong>
          <p>iikoWeb → Live API Settings bo‘limidagi integratsiya API kalitini kiriting.</p></div></div>
        {field('API kalit (apiLogin)', 'apiLogin')}
        <details className="ig-advanced"><summary>App ID va Client Secret bilan ulash (v2)</summary>
          <p>Ilovangiz v2 avtorizatsiyasidan foydalansa, shu ma’lumotlarni ham kiriting.</p>
          <div className="ig-form-grid">{field('App ID', 'appId')}{field('Client Secret', 'clientSecret')}
            {field('Alohida API key (ixtiyoriy)', 'apiKey', 'apiLogin’dan boshqa kalit berilgan bo‘lsa kiriting.')}</div>
        </details>
        <div className="ig-form-footer"><small><ShieldCheck size={16} /> Kalitlaringiz shifrlanib saqlanadi.</small>
          <button className="ig-button" type="button" disabled={busy || (!credentials.apiLogin.trim() && !credentials.apiKey.trim())} onClick={discover}>
            {busy ? 'Tekshirilmoqda…' : 'Davom etish'}<ArrowRight size={17} /></button></div>
      </> : <>
        <div className="ig-form-description"><Check size={20} /><div><strong>Hisob topildi</strong><p>Restoran, kassa guruhi va Zayuno’da ko‘rinadigan menyuni tanlang.</p></div></div>
        <div className="ig-form-grid">
          <label className="ig-field"><span>Restoran</span>
            <select disabled={busy} value={organizationId} onChange={event => { const id = event.target.value; setOrganizationId(id);
              setName(discovery.organizations.find(item => item.id === id)?.name || '');
              setTerminalGroupId(discovery.terminalGroups.find(group => group.organizationId === id)?.id || ''); }}>
              {discovery.organizations.map(item => <option key={item.id} value={item.id}>{item.name} · {item.currency || '?'}</option>)}</select></label>
          <label className="ig-field"><span>Kassa guruhi</span><select disabled={busy} value={terminalGroupId} onChange={event => setTerminalGroupId(event.target.value)}>
            <option value="" disabled>Kassa guruhini tanlang</option>
            {discovery.terminalGroups.filter(item => item.organizationId === organizationId).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="ig-field"><span>Tashqi menyu</span><select disabled={busy} value={externalMenuId} onChange={event => setExternalMenuId(event.target.value)}>
            <option value="" disabled>Menyuni tanlang</option>
            {discovery.externalMenus.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="ig-field"><span>Restoran nomi</span><input disabled={busy} value={name} onChange={event => setName(event.target.value)} maxLength={100} /></label>
          <label className="ig-field"><span>Zayuno manzili</span><input value={slug} onChange={event => setSlug(event.target.value.toLowerCase())}
            maxLength={63} disabled={busy || !!providerSlug} placeholder="mening-restoranim" /><small>Faqat lotin harflari, raqamlar va tire.</small></label>
          <label className="ig-field"><span>Xizmat ko‘rsatish mamlakati</span><input disabled={busy} value={countryCode}
            onChange={event => setCountryCode(event.target.value.toUpperCase())} maxLength={2} placeholder="UZ" /><small>O‘zbekiston uchun UZ.</small></label>
        </div>
        <p className="ig-form-note">Restoran tekshiruvga yuboriladi. Tasdiqlangach xaridorlarga ko‘rinadi.</p>
        <div className="ig-form-footer"><button className="ig-button ig-button-secondary" type="button" disabled={busy} onClick={() => setDiscovery(null)}><ChevronLeft size={17} />Orqaga</button>
          <button className="ig-button" type="button" disabled={busy || !organizationId || !terminalGroupId || !externalMenuId || !name.trim() || !slug.trim() || countryCode.length !== 2}
            onClick={connect}>{busy ? 'Ulanmoqda…' : 'Ulash va tekshiruvga yuborish'}<ArrowRight size={17} /></button></div>
      </>}
    </div>}
    {error && <p className="ig-feedback ig-feedback-error" role="alert">{error}</p>}
    {notice && <p className="ig-feedback ig-feedback-success" role="status">{notice}</p>}
  </section>;
}
