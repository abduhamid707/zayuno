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
  const activeItem = WORKSPACE_NAV.find(item => item.id === activeTab);
  const title = activeItem?.title || (activeTab === 'auth' ? 'Hisobga kirish' : 'Biznesni ulash');
  const detail = activeItem?.detail || (activeTab === 'auth' ? 'Provider hisobingizga kiring' : 'Yangi provider integratsiyasini boshlang');
  const ActiveIcon = icons[activeTab] || Compass;
  return <div className="workspace-shell">
    <a className="skip-link" href="#workspace-main">Asosiy kontentga o‘tish</a>
    <aside className={`workspace-sidebar ${menuOpen ? 'is-open' : ''}`} inert={isMobile && !menuOpen} aria-label="Asosiy navigation">
      <div className="sidebar-header">
        <a href="/?tab=overview" className="workspace-brand" onClick={event => { event.preventDefault(); onNavigate('overview'); }}>
          <img src="/logo2.webp" alt="" width="36" height="36" />
          <span><strong>ZAYUNO<span className="brand-period">.</span></strong><small>Provider workspace</small></span>
        </a>
      </div>
      <button type="button" className="sidebar-close icon-button" aria-label="Menuni yopish" onClick={() => setMenuOpen(false)}><X size={20} /></button>
      <div className="workspace-context" aria-label="Joriy workspace">
        <span className="context-symbol">Z</span>
        <span className="context-copy"><strong>Provider portal</strong><small>Integratsiya markazi</small></span>
        <span className="version-tag">v1</span>
      </div>
      <button type="button" className="sidebar-search" onClick={onSearch}>
        <Search size={16} /><span>Qidirish</span><kbd>Ctrl K</kbd>
      </button>
      <nav className="sidebar-navigation" aria-label="Workspace bo‘limlari">
        {['Workspace', 'Dasturchi uchun'].map(group => {
          const visibleItems = WORKSPACE_NAV.filter(item => item.group === group && (signedIn || item.id === 'overview' || item.id === 'docs'));
          if (!visibleItems.length) return null;
          return <div className="nav-section" key={group}>
            <p className="nav-section-label">{group === 'Workspace' ? 'Boshqaruv' : 'Integratsiya'}</p>
            {visibleItems.map(item => {
              const Icon = icons[item.id];
              return <a key={item.id} href={`/?tab=${item.id}`} aria-current={activeTab === item.id ? 'page' : undefined} className={`workspace-nav-item ${activeTab === item.id ? 'active' : ''}`} onClick={event => { if (!event.ctrlKey && !event.metaKey) { event.preventDefault(); onNavigate(item.id); setMenuOpen(false); } }}><span className="nav-item-icon"><Icon size={17} /></span><span>{item.title}</span>{activeTab === item.id && <span className="active-indicator" />}</a>;
            })}
          </div>;
        })}
      </nav>
      <div className="sidebar-bottom">
        <button className="sidebar-ai-action" onClick={() => { setMenuOpen(false); onAiKit(); }}>
          <span className="sidebar-ai-icon"><Sparkles size={17} /></span>
          <span><strong>AI Kit</strong><small>Agent bilan integratsiya qiling</small></span>
          <ArrowUpRight size={15} aria-hidden="true" />
        </button>
        {signedIn ? <div className="workspace-account"><span className="account-avatar">{(account || 'P').slice(0, 1).toUpperCase()}</span><span title={account}>{account || 'Partner'}<small>Provider hisobi</small></span><button className="icon-button" onClick={onLogout} aria-label="Hisobdan chiqish"><LogOut size={17} /></button></div> : <div className="sidebar-help">Hali hisobingiz yo‘qmi?<button onClick={() => onNavigate('onboarding')}>Biznesingizni ulang <ArrowRight size={14} /></button></div>}
      </div>
    </aside>
    {menuOpen && <button className="sidebar-backdrop" onClick={() => setMenuOpen(false)} aria-label="Menuni yopish" />}
    <div className="workspace-body">
      <header className="workspace-topbar">
        <div className="topbar-leading">
          <button className="mobile-menu icon-button" aria-label="Menuni ochish" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><Menu size={19} /></button>
          <span className="topbar-page-icon" aria-hidden="true"><ActiveIcon size={16} /></span>
          <span className="topbar-page-copy"><strong>{title}</strong><small>{detail}</small></span>
        </div>
        <div className="topbar-actions">
          {activeTab !== 'docs' && <button className="topbar-docs-button" onClick={() => onNavigate('docs')}><BookOpen size={15} /><span>Hujjatlar</span></button>}
          <button className="global-search" aria-label="Hujjatlar va sahifalardan qidirish" onClick={onSearch}><Search size={16} /><span>Qidirish</span><kbd>Ctrl K</kbd></button>
          {!signedIn && <button className="quiet-button" onClick={() => onNavigate('auth')}>Kirish <ArrowUpRight size={14} /></button>}
        </div>
      </header>
      <main id="workspace-main" className={`workspace-main ${activeTab === 'docs' ? 'workspace-docs-main' : ''}`}>{children}</main>
      <footer className="workspace-footer"><span>Zayuno · Provider Contract v1</span><a href="/llms.txt">Agentlar uchun /llms.txt <ArrowUpRight size={12} /></a><a href="/docs/">Docs index <ArrowUpRight size={12} /></a></footer>
    </div>
  </div>;
}
