import React, { Children, isValidElement, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { createHeadingSlugger, resolveDocLink } from './docs-catalog';

function plainText(value: React.ReactNode): string {
  return Children.toArray(value).map(child => typeof child === 'string' || typeof child === 'number' ? String(child) : isValidElement<{ children?: React.ReactNode }>(child) ? plainText(child.props.children) : '').join('');
}
function CodeBlock({ children, staticMode }: { children: React.ReactNode; staticMode?: boolean }) {
  const [status, setStatus] = useState('');
  return <div className="doc-code"><div className="doc-code-toolbar"><span>Misol / example</span>{!staticMode && <button onClick={async () => { try { await navigator.clipboard.writeText(plainText(children)); setStatus('Nusxalandi'); } catch { setStatus('Nusxalab bo‘lmadi'); } }}>{status || 'Nusxalash'}</button>}</div><pre>{children}</pre></div>;
}
// Assign on the document tree, not while React renders a heading component:
// StrictMode can render components twice and must not change public anchor IDs.
function headingIds() {
  return (tree: any) => {
    const slug = createHeadingSlugger();
    const text = (node: any): string => node.type === 'text' ? node.value : (node.children || []).map(text).join('');
    const visit = (node: any) => {
      if (node.type === 'element' && /^h[1-6]$/.test(node.tagName)) node.properties = { ...node.properties, id:slug(text(node)) };
      for (const child of node.children || []) visit(child);
    };
    visit(tree);
  };
}
export function DocMarkdown({ markdown, staticMode = false, onNavigate }: { markdown: string; staticMode?: boolean; onNavigate?: (id: string, hash?: string) => void }) {
  const heading = (level: number) => ({ children, id }: { children?: React.ReactNode; id?: string }) => {
    const text = plainText(children);
    return React.createElement('h' + level, { id }, <a className="heading-anchor" href={'#' + id}>{text.replace(/\s+\{#[\w-]+\}$/, '')}<span aria-hidden="true">#</span></a>);
  };
  return <div className="doc-prose"><Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[headingIds]} components={{
    h1: heading(1), h2: heading(2), h3: heading(3), h4: heading(4), h5: heading(5), h6: heading(6),
    pre: ({ children }) => <CodeBlock staticMode={staticMode}>{children}</CodeBlock>,
    table: ({ children }) => <div className="doc-table-wrap"><table>{children}</table></div>,
    a: ({ href = '', children }) => {
      const doc = resolveDocLink(href);
      const target = doc ? (staticMode ? '/docs/' + doc.id + '/' : '/?doc=' + doc.id) + doc.hash : href;
      return <a href={target} onClick={doc && onNavigate ? event => { if (!event.ctrlKey && !event.metaKey) { event.preventDefault(); onNavigate(doc.id, doc.hash); } } : undefined}>{children}</a>;
    }
  }}>{markdown}</Markdown></div>;
}
