import React, { useEffect, useState } from 'react';
import { ArrowUpRight, BookOpen, FlaskConical, LayoutDashboard, Compass, Activity, ShieldCheck, Sparkles, Search, LogOut, Menu, X, ArrowRight } from 'lucide-react';
import { WORKSPACE_NAV, WorkspaceTab } from './workspace-model';

const icons = { overview: Compass, apps: LayoutDashboard, docs: BookOpen, sandbox: FlaskConical, certification: ShieldCheck, inspector: Activity, onboarding: ArrowRight, auth: ArrowRight };

export function WorkspaceShell({ activeTab, onNavigate, onSearch, onAiKit, signedIn, account, onLogout, children }: {
  activeTab: WorkspaceTab; onNavigate: (tab: WorkspaceTab) => void; onSearch: () => void;
  onAiKit: () => void; signedIn: boolean; account?: string; onLogout: () => void; children: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 700px)').matches);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 700px)');
    const update = () => setIsMobile(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => { setMenuOpen(false); }, [activeTab]);
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); onSearch(); }
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [onSearch]);
  const title = WORKSPACE_NAV.find(item => item.id === activeTab)?.title || (activeTab === 'auth' ? 'Hisobga kirish' : 'Biznesni ulash');
  return <div className="workspace-shell">
    <a className="skip-link" href="#workspace-main">Asosiy kontentga o‘tish</a>
    <aside className={`workspace-sidebar ${menuOpen ? 'is-open' : ''}`} inert={isMobile && !menuOpen} aria-label="Asosiy navigation">
      <a href="/?tab=overview" className="workspace-brand" onClick={event => { event.preventDefault(); onNavigate('overview'); }}>
        <img src="/logo2.webp" alt="" width="40" height="40" />
        <span><strong>ZAYUNO<span className="brand-period">.</span></strong><small>Partner workspace</small></span>
      </a>
      <button type="button" className="sidebar-close icon-button" aria-label="Menuni yopish" onClick={() => setMenuOpen(false)}><X size={20} /></button>
      <div className="workspace-context"><span className="context-symbol">Z</span><span>Provider portal<small>Integratsiya va boshqaruv</small></span><span className="version-tag">v1</span></div>
      <nav>
        {['Workspace', 'Dasturchi uchun'].map(group => <div className="nav-section" key={group}>
          <p className="nav-section-label">{group}</p>
          {WORKSPACE_NAV.filter(item => item.group === group).map(item => {
            const Icon = icons[item.id];
            return <a key={item.id} href={`/?tab=${item.id}`} aria-current={activeTab === item.id ? 'page' : undefined} className={`workspace-nav-item ${activeTab === item.id ? 'active' : ''}`} onClick={event => { if (!event.ctrlKey && !event.metaKey) { event.preventDefault(); onNavigate(item.id); setMenuOpen(false); } }}><Icon size={18} /><span>{item.title}</span>{activeTab === item.id && <span className="active-dot" />}</a>;
          })}
        </div>)}
      </nav>
      <div className="sidebar-bottom">
        <button className="agent-kit-card" onClick={() => { setMenuOpen(false); onAiKit(); }}><Sparkles size={20} /><strong>AI bilan tezroq ulang</strong><span>Codex, Claude yoki boshqa agent uchun tayyor brief.</span><small>AI Kit’ni ochish <ArrowUpRight size={14} /></small></button>
        {signedIn ? <div className="workspace-account"><span className="account-avatar">{(account || 'P').slice(0, 1).toUpperCase()}</span><span title={account}>{account || 'Partner'}<small>Provider hisobi</small></span><button className="icon-button" onClick={onLogout} aria-label="Hisobdan chiqish"><LogOut size={17} /></button></div> : <div className="sidebar-help">Hali hisobingiz yo‘qmi?<button onClick={() => onNavigate('onboarding')}>Biznesingizni ulang <ArrowRight size={14} /></button></div>}
      </div>
    </aside>
    {menuOpen && <button className="sidebar-backdrop" onClick={() => setMenuOpen(false)} aria-label="Menuni yopish" />}
    <div className="workspace-body">
      <header className="workspace-topbar">
        <div className="workspace-breadcrumb"><button className="mobile-menu icon-button" aria-label="Menuni ochish" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><Menu size={20} /></button><span>Workspace</span><span className="breadcrumb-slash">/</span><strong>{title}</strong></div>
        <div className="topbar-actions"><button className="global-search" aria-label="Hujjatlardan izlash" onClick={onSearch}><Search size={16} /><span>Hujjatlardan izlash</span><kbd>Ctrl K</kbd></button>{!signedIn && <button className="quiet-button" onClick={() => onNavigate('auth')}>Kirish <ArrowUpRight size={14} /></button>}</div>
      </header>
      <main id="workspace-main" className={`workspace-main ${activeTab === 'docs' ? 'workspace-docs-main' : ''}`}>{children}</main>
      <footer className="workspace-footer"><span>Zayuno · Provider Contract v1</span><a href="/llms.txt">Agentlar uchun /llms.txt <ArrowUpRight size={12} /></a><a href="/docs/">Docs index <ArrowUpRight size={12} /></a></footer>
    </div>
  </div>;
}
