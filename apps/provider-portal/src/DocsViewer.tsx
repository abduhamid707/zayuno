import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, Sparkles, ArrowRight, ArrowLeft, ArrowUpRight, Copy, Download, BookOpen } from 'lucide-react';
import { DOCS_MENU, getDocHeadings, searchDocs } from './docs-catalog';
import { DOCS_CONTENT } from './docs-data';
import { DocMarkdown } from './DocMarkdown';
export { DOCS_MENU } from './docs-catalog';

interface DocsViewerProps {
  selectedDoc: string;
  onSelectDoc: (id: string) => void;
  onOpenAiKit?: () => void;
  searchRequest?: number;
}
export function DocsViewer({ selectedDoc, onSelectDoc, onOpenAiKit, searchRequest = 0 }: DocsViewerProps) {
  const [query, setQuery] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingHash = useRef<string | null>(null);
  const doc = DOCS_MENU.find(item => item.id === selectedDoc);
  const markdown = doc ? DOCS_CONTENT[doc.id] : '';
  const headings = useMemo(() => getDocHeadings(markdown), [markdown]);
  const results = useMemo(() => searchDocs(query, DOCS_MENU.map(entry => ({ entry, markdown: DOCS_CONTENT[entry.id] }))), [query]);
  useEffect(() => { if (searchRequest) inputRef.current?.focus(); }, [searchRequest]);
  useEffect(() => {
    setCopyStatus('');
    const frame = requestAnimationFrame(() => {
      const hash = pendingHash.current ?? window.location.hash;
      pendingHash.current = null;
      if (hash) {
        window.history.replaceState({}, '', window.location.pathname + window.location.search + hash);
        try { document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView(); } catch { /* malformed external hash */ }
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [selectedDoc]);
  const selectDoc = (id: string, hash = '') => {
    setQuery('');
    if (id === selectedDoc) {
      if (hash) { window.location.hash = hash; } else window.scrollTo({ top: 0 });
      return;
    }
    pendingHash.current = hash;
    onSelectDoc(id);
    window.scrollTo({ top: 0 });
  };
  const menu = <>{['Boshlash', 'Contract v1', 'Reference', 'Ishga tushirish'].map(group => <div className="docs-nav-group" key={group}><p>{group}</p>{DOCS_MENU.filter(item => item.group === group).map(item => <a href={'/?doc=' + item.id} key={item.id} className={selectedDoc === item.id ? 'selected' : ''} aria-current={selectedDoc === item.id ? 'page' : undefined} onClick={event => { if (!event.ctrlKey && !event.metaKey) { event.preventDefault(); selectDoc(item.id); } }}>{item.title}</a>)}</div>)}</>;
  const toc = <nav aria-label="Sahifadagi bo‘limlar">{headings.map(heading => <a key={heading.id} href={'#' + heading.id}>{heading.text}</a>)}</nav>;
  const index = DOCS_MENU.findIndex(item => item.id === selectedDoc);
  return <div className="docs-workspace">
    <div className="docs-heading"><div><span className="section-kicker">DEVELOPER DOCUMENTATION</span><h1>Quring. Ulang. Ishga tushiring.</h1><p>Dasturchi uchun aniq yo‘l. AI agent uchun aniq contract.</p></div><button className="secondary-button" onClick={onOpenAiKit}><Sparkles size={16} /> AI Kit</button></div>
    <div className="docs-search-row"><label className="docs-search"><Search size={18} /><input ref={inputRef} aria-label="Hujjatlardan qidirish" placeholder="Izlang: HMAC, quote, API key, 401…" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Escape') setQuery(''); }} />{query && <button aria-label="Qidiruvni tozalash" onClick={() => { setQuery(''); inputRef.current?.focus(); }}><X size={16} /></button>}</label><a href="/llms.txt" className="docs-agent-link">/llms.txt <ArrowUpRight size={14} /></a></div>
    <div className="docs-quick-chips">
      <span className="chips-label">Tezkor mavzular:</span>
      {[
        { label: 'GET /health', q: 'health' },
        { label: 'POST /quote', q: 'quote' },
        { label: 'Webhook HMAC', q: 'HMAC' },
        { label: '401 xatosi', q: '401' },
        { label: 'AI Agent Prompt', q: 'agent' },
        { label: 'Idempotency', q: 'idempotency' }
      ].map(chip => (
        <button
          key={chip.label}
          type="button"
          className="docs-chip"
          onClick={() => {
            setQuery(chip.q);
            inputRef.current?.focus();
          }}
        >
          {chip.label}
        </button>
      ))}
    </div>
    {query.trim() ? <section className="docs-results" aria-label="Qidiruv natijalari"><div className="docs-results-heading"><p role="status">{results.length} ta hujjat topildi</p><button onClick={() => setQuery('')}>Qo‘llanmaga qaytish <X size={14} /></button></div>{results.length ? results.map(result => <a key={result.id} href={'/?doc=' + result.id} onClick={event => { if (!event.ctrlKey && !event.metaKey) { event.preventDefault(); selectDoc(result.id); } }}><small>{result.group}</small><h2>{result.title}<ArrowUpRight size={17} /></h2><p>{result.snippet}</p></a>) : <div className="docs-empty"><Search size={26} /><h2>Bu so‘z bilan natija yo‘q</h2><p>Endpoint nomi yoki xato kodini yozing. Masalan: “401”, “quote”, “rawBody”.</p><button className="secondary-button" onClick={() => selectDoc('troubleshooting-faq')}>Troubleshooting’ni ochish <ArrowRight size={14} /></button></div>}</section> :
    <div className="docs-layout">
      <aside className="docs-nav"><div className="docs-nav-desktop">{menu}</div><details className="docs-nav-mobile"><summary><BookOpen size={16} /> Hujjatlar bo‘limlari</summary>{menu}</details><div className="docs-exports"><span>AGENT RESURSLARI</span><a href="/llms-full.txt">To‘liq Markdown <ArrowUpRight size={12} /></a><a href="/openapi.json" download>OpenAPI JSON <Download size={12} /></a><a href="/postman.json" download>Postman collection <Download size={12} /></a><a href="/docs/">Static docs index <ArrowUpRight size={12} /></a></div></aside>
      {doc ? <article className="docs-article"><div className="doc-meta"><span>{doc.group} <span>/</span> Contract v1</span><a href={'/docs/' + doc.id + '/'}>Ochiq havola <ArrowUpRight size={12} /></a></div><div className="doc-actions"><button onClick={async () => { try { await navigator.clipboard.writeText(markdown); setCopyStatus('Sahifa nusxalandi'); } catch { setCopyStatus('Nusxalash amalga oshmadi — Markdown faylini yuklab oling.'); } }}><Copy size={13} /> Sahifani nusxalash</button><a href={'/docs/' + doc.id + '.md'} download><Download size={13} /> Markdown</a><span role="status">{copyStatus}</span></div><details className="doc-toc-inline"><summary>Shu sahifada</summary>{toc}</details><DocMarkdown markdown={markdown} onNavigate={selectDoc} /><div className="doc-pagination">{index > 0 && <button onClick={() => selectDoc(DOCS_MENU[index - 1].id)}><ArrowLeft size={16} /><span><small>Oldingi</small>{DOCS_MENU[index - 1].title}</span></button>}{index < DOCS_MENU.length - 1 && <button onClick={() => selectDoc(DOCS_MENU[index + 1].id)}><span><small>Keyingi</small>{DOCS_MENU[index + 1].title}</span><ArrowRight size={16} /></button>}</div></article> : <div className="docs-empty"><h2>Hujjat topilmadi</h2><p>Havola eskirgan bo‘lishi mumkin. Kerakli mavzuni qidiruvdan toping.</p><button className="primary-button" onClick={() => selectDoc('getting-started')}>Quickstart’ga o‘tish</button></div>}
      <aside className="doc-toc"><span>SHU SAHIFADA</span>{toc}<div className="doc-toc-note">Kod va misollar<br /><strong>bitta contractdan.</strong><a href="/openapi.json">Schema’ni ochish <ArrowUpRight size={12} /></a></div></aside>
    </div>}
  </div>;
}
