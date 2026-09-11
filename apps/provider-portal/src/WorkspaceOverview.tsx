import React, { useState } from 'react';
import { ArrowRight, ArrowUpRight, Check, Code2, Sparkles, BookOpen, Terminal, Braces, ShieldCheck, Copy } from 'lucide-react';
import { PROVIDER_PROTOCOL_ENDPOINTS } from '@zayuno/contracts';
import { getIntegrationState, WorkspaceTab } from './workspace-model';

export function WorkspaceOverview({ signedIn, provider, loading, failed, onRetry, onNavigate, onDoc, onAiKit }: {
  signedIn: boolean; provider?: any; loading: boolean; failed: boolean; onRetry: () => void;
  onNavigate: (tab: WorkspaceTab, step?: number) => void; onDoc: (id: string) => void; onAiKit: () => void;
}) {
  const state = getIntegrationState(signedIn, provider);
  const [exampleTab, setExampleTab] = useState<'request' | 'response'>('request');
  const [copyStatus, setCopyStatus] = useState('');
  const endpoint = PROVIDER_PROTOCOL_ENDPOINTS.find(item => item.capability === 'HEALTH')!;
  const sample = exampleTab === 'request' ? 'curl "https://YOUR_HOST/zayuno/health" \\\n  -H "x-provider-api-key: $PROVIDER_API_KEY"' : JSON.stringify(endpoint.responseExample, null, 2);
  return <div className="overview-page">
    <div className="page-eyebrow"><span className="eyebrow-line" /> BIZNESINGIZ UCHUN YANGI KANAL <span className="contract-pill">CONTRACT v1.0</span></div>
    <section className="overview-hero">
      <div className="hero-copy"><h1>Biznesingiz.<br /><span>AI bilan bog‘langan.</span></h1><p>Mijoz nima kerakligini aytadi. Zayuno sizning API’ingizdan mahsulotni topadi, narxni tekshiradi va tasdiqlangan buyurtmani yuboradi.</p><div className="hero-actions"><button className="primary-button" disabled={loading || failed} onClick={() => onNavigate(state.tab, state.step)}>{loading ? 'Profil yuklanmoqda…' : state.label}<ArrowRight size={17} /></button><button className="text-button" onClick={() => onDoc('getting-started')}>Qanday ishlaydi? <ArrowUpRight size={16} /></button></div><div className="hero-footnote"><ShieldCheck size={15} /> Buyurtma — mijoz tasdig‘idan keyin. Narx — sizning API’ingizdan.</div></div>
      <div className="connection-preview">
        <div className="preview-caption"><span className="status-dot" /> INTEGRATSIYA MODELI <span>01 — 03</span></div>
        <div className="connection-customer"><span className="mini-avatar">M</span><div><small>Mijoz so‘rovi · namuna</small><p>“Ikki kishiga pizza, 150 minggacha.”</p></div></div>
        <div className="connection-line"><span>so‘rovni tushunish</span></div>
        <div className="connection-core"><img src="/logo2.webp" width="38" height="38" alt="" /><div><strong>Zayuno</strong><small>Topish → Quote → Tasdiq → Buyurtma</small></div><span className="core-badge">API</span></div>
        <div className="connection-line"><span>tekshirilgan ma’lumot</span></div>
        <div className="connection-provider"><Code2 size={21} /><div><strong>Sizning backendingiz</strong><small>Katalog · narx · mavjudlik · buyurtma</small></div><ArrowUpRight size={17} /></div>
        <p className="preview-note">Ma’lumot va fulfillment sizda. Suhbatni Zayuno boshqaradi.</p>
      </div>
    </section>
    {failed && <div className="workspace-notice" role="alert">Profil ma’lumotini yuklab bo‘lmadi. Holatingizni hozircha aniqlay olmaymiz.<button onClick={onRetry}>Qayta urinish</button></div>}
    <section className="integration-path">
      <div className="section-heading"><div><span className="section-kicker">BOSQICHMA-BOSQICH</span><h2>Bitta integratsiya. Aniq yo‘l.</h2></div><span className="neutral-badge">{loading ? 'Yuklanmoqda…' : failed ? 'Holat olinmadi' : state.status}</span></div>
      <div className="path-grid">{state.steps.map((step, index) => <div className="path-step" key={step.title}><span className={`path-number ${step.complete && !failed ? 'complete' : ''}`}>{step.complete && !failed ? <Check size={19} /> : `0${index + 1}`}</span><div><h3>{step.title}</h3><p>{step.description}</p><button className="path-link" onClick={() => index === 0 ? onNavigate(signedIn && provider?.slug ? 'apps' : 'onboarding', signedIn ? 3 : 1) : index === 1 ? onDoc('base-url') : onDoc('certification')}>{index === 0 ? 'Biznes profili' : index === 1 ? 'API qo‘llanmasi' : 'Nashr talablari'}<ArrowRight size={14} /></button></div></div>)}</div>
    </section>
    <section className="build-grid">
      <div className="developer-entry"><span className="section-kicker">DASTURCHI VA UNING AGENTI UCHUN</span><h2>Taxmin qilish shart emas.<br />Contractdan boshlang.</h2><p>Endpointlar, haqiqiy JSON misollar va tekshiruv talablari bitta joyda. Qo‘lda yozing yoki agentingizga aniq brief bering.</p><div className="build-actions"><button className="secondary-button" onClick={onAiKit}><Sparkles size={17} /> AI uchun brief tayyorlash</button><button className="text-button" onClick={() => onDoc('base-url')}>Quickstart <ArrowUpRight size={15} /></button></div><a className="plain-resource" href="/llms.txt"><Terminal size={15} /> partners.zayuno.uz/llms.txt <ArrowUpRight size={13} /></a></div>
      <div className="code-preview"><div className="code-preview-header"><div role="tablist" aria-label="API misoli"><button role="tab" aria-selected={exampleTab === 'request'} onClick={() => { setExampleTab('request'); setCopyStatus(''); }}>So‘rov</button><button role="tab" aria-selected={exampleTab === 'response'} onClick={() => { setExampleTab('response'); setCopyStatus(''); }}>Javob</button></div><span>GET /health</span><button className="icon-button" aria-label="Misolni nusxalash" onClick={async () => { try { await navigator.clipboard.writeText(sample); setCopyStatus('Nusxalandi'); } catch { setCopyStatus('Nusxalash amalga oshmadi'); } }}><Copy size={14} /></button></div><pre role="tabpanel"><code>{sample}</code></pre><div className="code-preview-footer"><span>{copyStatus || 'Contractdan olingan namuna. Haqiqiy serverga ulanmagan.'}</span><button onClick={() => onDoc('contract-reference')}>Reference <ArrowUpRight size={13} /></button></div></div>
    </section>
    <section className="resource-grid" aria-label="Integratsiya resurslari">{[
      { icon: BookOpen, title: 'Qo‘llanmalar', description: 'Birinchi requestdan nashrgacha.', id: 'getting-started' },
      { icon: Braces, title: 'API reference', description: 'Schema, endpoint va JSON misollar.', id: 'contract-reference' },
      { icon: ShieldCheck, title: 'Muammoni topish', description: '401, HMAC, quote va timeout yechimlari.', id: 'troubleshooting-faq' }
    ].map(item => <button className="resource-card" key={item.id} onClick={() => onDoc(item.id)}><item.icon size={21} /><div><h3>{item.title}</h3><p>{item.description}</p></div><ArrowUpRight size={17} /></button>)}</section>
  </div>;
}
