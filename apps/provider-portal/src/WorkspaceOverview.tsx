import React, { useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Braces,
  Check,
  Code2,
  Copy,
  ShieldCheck,
  Sparkles,
  Terminal,
} from 'lucide-react';
import { PROVIDER_PROTOCOL_ENDPOINTS } from '@zayuno/contracts';
import { getIntegrationState, WorkspaceTab } from './workspace-model';

type WorkspaceOverviewProps = {
  signedIn: boolean;
  provider?: any;
  loading: boolean;
  failed: boolean;
  onRetry: () => void;
  onNavigate: (tab: WorkspaceTab, step?: number) => void;
  onDoc: (id: string) => void;
  onAiKit: () => void;
};

const PATH_ACTIONS = ['Biznes profilini ochish', 'API qo‘llanmasini ochish', 'Nashr talablarini ko‘rish'];

export function WorkspaceOverview({
  signedIn,
  provider,
  loading,
  failed,
  onRetry,
  onNavigate,
  onDoc,
  onAiKit,
}: WorkspaceOverviewProps) {
  const state = getIntegrationState(signedIn, provider);
  const [exampleTab, setExampleTab] = useState<'request' | 'response'>('request');
  const [copyStatus, setCopyStatus] = useState('');
  const endpoint = PROVIDER_PROTOCOL_ENDPOINTS.find(item => item.capability === 'HEALTH')!;
  const sample = exampleTab === 'request'
    ? 'curl "https://YOUR_HOST/zayuno/health" \\\n  -H "x-provider-api-key: $PROVIDER_API_KEY"'
    : JSON.stringify(endpoint.responseExample, null, 2);
  const completedSteps = failed ? 0 : state.steps.filter(step => step.complete).length;
  const activeStepIndex = completedSteps < state.steps.length ? completedSteps : -1;
  const progress = `${Math.round((completedSteps / state.steps.length) * 100)}%`;

  const openPathStep = (index: number) => {
    if (index === 0) {
      onNavigate(signedIn && provider?.slug ? 'apps' : 'onboarding', signedIn ? 3 : 1);
      return;
    }
    onDoc(index === 1 ? 'base-url' : 'certification');
  };

  return (
    <div className="overview-page">
      <div className="page-eyebrow">
        <span className="eyebrow-line" />
        BIZNESINGIZ UCHUN YANGI SAVDO KANALI
        <span className="contract-pill">API CONTRACT v1</span>
      </div>

      <section className="overview-hero">
        <div className="hero-copy">
          <h1>
            AI mijozlardan
            <br />
            <span>real buyurtma oling.</span>
          </h1>
          <p>
            Zayuno mijoz niyatini tushunadi, katalogingizdan mos mahsulotni topadi,
            jonli narxni tekshiradi va tasdiqlangan buyurtmani API’ingizga yuboradi.
          </p>
          <div className="hero-actions">
            <button
              className="primary-button"
              disabled={loading || failed}
              onClick={() => onNavigate(state.tab, state.step)}
            >
              {loading ? 'Profil yuklanmoqda…' : state.label}
              <ArrowRight size={17} />
            </button>
            <button className="text-button" onClick={() => onDoc('getting-started')}>
              Jarayonni ko‘rish <ArrowUpRight size={16} />
            </button>
          </div>
          <div className="hero-trust" aria-label="Integratsiya kafolatlari">
            <span><Check size={13} /> Jonli narx va mavjudlik</span>
            <span><Check size={13} /> Mijoz tasdig‘idan keyin action</span>
            <span><Check size={13} /> Har bir so‘rov kuzatiladi</span>
          </div>
        </div>

        <div className="connection-preview">
          <div className="preview-caption">
            <span className="status-dot" /> JONLI BUYURTMA OQIMI
            <span>4 QADAM</span>
          </div>
          <div className="connection-customer">
            <span className="mini-avatar">M</span>
            <div>
              <small>Mijoz so‘rovi</small>
              <p>“Ikki kishiga pizza, 150 minggacha.”</p>
            </div>
          </div>
          <div className="connection-line"><span>Niyatni tushunadi</span></div>
          <div className="connection-core">
            <img src="/logo2.webp" width="38" height="38" alt="" />
            <div>
              <strong>Zayuno</strong>
              <small>Topish → Narx → Tasdiq</small>
            </div>
            <span className="core-badge">API</span>
          </div>
          <div className="connection-line"><span>Tekshirilgan action yuboradi</span></div>
          <div className="connection-provider">
            <Code2 size={21} />
            <div>
              <strong>Sizning backendingiz</strong>
              <small>Buyurtmani qabul qiladi va status qaytaradi</small>
            </div>
            <ArrowUpRight size={17} />
          </div>
          <p className="preview-note">Katalog, narx va fulfillment sizning nazoratingizda qoladi.</p>
        </div>
      </section>

      {failed && (
        <div className="workspace-notice" role="alert">
          Profil ma’lumotini yuklab bo‘lmadi. Holatingizni hozircha aniqlay olmaymiz.
          <button onClick={onRetry}>Qayta urinish</button>
        </div>
      )}

      <section className="integration-path">
        <div className="section-heading">
          <div>
            <span className="section-kicker">SIZNING INTEGRATSIYA YO‘LINGIZ</span>
            <h2>Keyingi qadam doim aniq.</h2>
          </div>
          <div className="integration-status">
            <span className="integration-count"><strong>{completedSteps}/{state.steps.length}</strong> bajarildi</span>
            <span className="neutral-badge">{loading ? 'Yuklanmoqda…' : failed ? 'Holat olinmadi' : state.status}</span>
          </div>
        </div>
        <div
          className="integration-progress"
          role="progressbar"
          aria-label="Integratsiya jarayoni"
          aria-valuemin={0}
          aria-valuemax={state.steps.length}
          aria-valuenow={completedSteps}
        >
          <span style={{ width: progress }} />
        </div>
        <div className="path-grid">
          {state.steps.map((step, index) => {
            const status = step.complete && !failed ? 'complete' : index === activeStepIndex ? 'active' : 'upcoming';
            return (
              <div className={`path-step ${status}`} key={step.title}>
                <span className={`path-number ${status}`}>
                  {status === 'complete' ? <Check size={19} /> : `0${index + 1}`}
                </span>
                <div>
                  <span className="path-status-label">
                    {status === 'complete' ? 'Bajarildi' : status === 'active' ? 'Hozirgi qadam' : 'Keyingi qadam'}
                  </span>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                  <button className="path-link" onClick={() => openPathStep(index)}>
                    {PATH_ACTIONS[index]} <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="build-grid">
        <div className="developer-entry">
          <span className="section-kicker">DASTURCHI VA AI AGENT UCHUN</span>
          <h2>API contractdan boshlang.</h2>
          <p>
            O‘zingiz ulang yoki AI agentingizga tayyor brief bering. Endpoint, schema,
            JSON misollar va tekshiruv talablari bitta joyda.
          </p>
          <div className="build-actions">
            <button className="secondary-button" onClick={onAiKit}>
              <Sparkles size={17} /> AI uchun brief tayyorlash
            </button>
            <button className="text-button" onClick={() => onDoc('base-url')}>
              Quickstart <ArrowUpRight size={15} />
            </button>
          </div>
          <a className="plain-resource" href="/llms.txt">
            <Terminal size={15} /> partners.zayuno.uz/llms.txt <ArrowUpRight size={13} />
          </a>
        </div>

        <div className="code-preview">
          <div className="code-preview-header">
            <div role="tablist" aria-label="API misoli">
              <button
                role="tab"
                aria-selected={exampleTab === 'request'}
                onClick={() => { setExampleTab('request'); setCopyStatus(''); }}
              >
                So‘rov
              </button>
              <button
                role="tab"
                aria-selected={exampleTab === 'response'}
                onClick={() => { setExampleTab('response'); setCopyStatus(''); }}
              >
                Javob
              </button>
            </div>
            <span>GET /health</span>
            <button
              className="icon-button"
              aria-label="Misolni nusxalash"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(sample);
                  setCopyStatus('Nusxalandi');
                } catch {
                  setCopyStatus('Nusxalash amalga oshmadi');
                }
              }}
            >
              <Copy size={14} />
            </button>
          </div>
          <pre role="tabpanel"><code>{sample}</code></pre>
          <div className="code-preview-footer">
            <span>{copyStatus || 'Contractdan olingan namuna. Haqiqiy serverga ulanmagan.'}</span>
            <button onClick={() => onDoc('contract-reference')}>
              Reference <ArrowUpRight size={13} />
            </button>
          </div>
        </div>
      </section>

      <section className="resource-grid" aria-label="Integratsiya resurslari">
        {[
          { icon: BookOpen, title: 'Boshlash qo‘llanmasi', description: 'Birinchi requestdan nashrgacha.', id: 'getting-started' },
          { icon: Braces, title: 'API reference', description: 'Schema, endpoint va JSON misollar.', id: 'contract-reference' },
          { icon: ShieldCheck, title: 'Muammoni topish', description: '401, HMAC, quote va timeout yechimlari.', id: 'troubleshooting-faq' },
        ].map(item => (
          <button className="resource-card" key={item.id} onClick={() => onDoc(item.id)}>
            <span className="resource-icon"><item.icon size={18} /></span>
            <div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </div>
            <ArrowUpRight size={16} />
          </button>
        ))}
      </section>
    </div>
  );
}
