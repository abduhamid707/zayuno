import React, { useEffect, useState } from 'react';

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
    <label style={{ display: 'grid', gap: 5, fontSize: 13, color: 'var(--ws-text-secondary)' }}>
      {label}<input type="password" autoComplete="off" value={credentials[key]}
        onChange={event => setCredentials(previous => ({ ...previous, [key]: event.target.value }))}
        style={{ padding: 10, borderRadius: 7, border: '1px solid var(--ws-border)', background: 'var(--ws-surface)', color: 'var(--ws-text-primary)' }} />
      {hint && <small>{hint}</small>}
    </label>
  );

  return <section style={{ border: '1px solid var(--ws-border)', borderRadius: 12, padding: 20, marginBottom: 24,
    background: 'var(--ws-surface-elevated)', display: 'grid', gap: 14 }}>
    <div>
      <h3 style={{ margin: '0 0 4px', color: 'var(--ws-text-primary)' }}>iiko Cloud · restoran ulanishi</h3>
      <p style={{ margin: 0, color: 'var(--ws-text-secondary)', fontSize: 13 }}>
        Restoran menyusi va buyurtmalarini Zayuno’ga ulang. Kalitlar faqat serverda shifrlangan holda saqlanadi.
      </p>
    </div>
    {!token ? <p>iiko ulash uchun hisobingizga kiring.</p> : <>
      {status?.connected && <div style={{ border: '1px solid var(--ws-border)', padding: 12, borderRadius: 8,
        color: 'var(--ws-text-primary)', fontSize: 13 }}>
        <strong>{status.name || status.slug}</strong> · {status.status === 'ACTIVE' && status.isPublished ? 'Faol' : 'Admin tasdig‘ini kutmoqda'}
        <div>{status.organizationName} · {status.menuName} · {status.productCount ?? 0} mahsulot</div>
        <button type="button" onClick={check} disabled={busy} style={{ marginTop: 8, padding: '6px 10px' }}>
          {busy ? 'Tekshirilmoqda…' : 'Menyu va POS holatini tekshirish'}
        </button>
        {checkResult && <p role="status">{checkResult.connected
          ? `${checkResult.productCount ?? 0} mahsulot · POS ${checkResult.terminalOnline ? 'online' : 'offline'}`
          : 'Restoran, POS guruhi yoki menyu topilmadi.'}</p>}
      </div>}
      {(!status?.connected || status.status === 'DRAFT' || status.status === 'DISABLED') && <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
          {field('iikoWeb apiLogin / API kalit', 'apiLogin', 'v2 App ID va Client Secret bilan ham shu kalitni ishlatishingiz mumkin.')}
          {field('Alohida API key (v2, ixtiyoriy)', 'apiKey', 'apiLogin’dan boshqa kalit berilgan bo‘lsa kiriting.')}
          {field('App ID (v2)', 'appId')}
          {field('Client Secret (v2)', 'clientSecret')}
        </div>
        <button type="button" disabled={busy || (!credentials.apiLogin && !credentials.apiKey)} onClick={discover}
          style={{ justifySelf: 'start', padding: '9px 16px', borderRadius: 7, border: 0,
            background: 'var(--ws-brand)', color: '#fff', cursor: 'pointer' }}>
          {busy ? 'Tekshirilmoqda…' : 'Restoranlarni tekshirish'}
        </button>
        {discovery && <div style={{ display: 'grid', gap: 10 }}>
          <label>Restoran
            <select value={organizationId} onChange={event => { const id = event.target.value; setOrganizationId(id);
              setTerminalGroupId(discovery.terminalGroups.find(group => group.organizationId === id)?.id || ''); }}>
              {discovery.organizations.map(item => <option key={item.id} value={item.id}>{item.name} · {item.currency || '?'}</option>)}
            </select>
          </label>
          <label>POS guruhi
            <select value={terminalGroupId} onChange={event => setTerminalGroupId(event.target.value)}>
              {discovery.terminalGroups.filter(item => item.organizationId === organizationId).map(item =>
                <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          </label>
          <label>Tashqi menyu
            <select value={externalMenuId} onChange={event => setExternalMenuId(event.target.value)}>
              {discovery.externalMenus.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          </label>
          <label>Restoran nomi <input value={name} onChange={event => setName(event.target.value)} maxLength={100} /></label>
          <label>Zayuno manzili <input value={slug} onChange={event => setSlug(event.target.value.toLowerCase())}
            maxLength={63} disabled={!!providerSlug} placeholder="mening-restoranim" /></label>
          <label>Xizmat ko‘rsatish mamlakati (2 harfli kod) <input value={countryCode}
            onChange={event => setCountryCode(event.target.value.toUpperCase())} maxLength={2} placeholder="UZ" /></label>
          <small style={{ color: 'var(--ws-text-muted)' }}>Ulashdan keyin restoran admin tekshiruviga yuboriladi. Xaridorlarga darhol chiqmaydi.</small>
          <button type="button" disabled={busy || !organizationId || !terminalGroupId || !externalMenuId || !name.trim() || !slug.trim()}
            onClick={connect} style={{ justifySelf: 'start', padding: '9px 16px', borderRadius: 7, border: 0,
              background: 'var(--ws-brand)', color: '#fff', cursor: 'pointer' }}>iiko restoranini ulash</button>
        </div>}
      </>}
      {error && <p role="alert" style={{ color: 'var(--ws-danger)' }}>{error}</p>}
      {notice && <p role="status" style={{ color: 'var(--ws-success)' }}>{notice}</p>}
    </>}
  </section>;
}
