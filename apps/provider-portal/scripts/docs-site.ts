import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Plugin } from 'vite';
import { createProviderOpenApiDocument, createProviderPostmanCollection, PROVIDER_CONTRACT_VERSION } from '../../../packages/contracts/src/provider-protocol';
import { DOCS_MENU, DOCS_ORIGIN, resolveDocLink } from '../src/docs-catalog';
import { createContractReference } from '../src/contract-docs';
import { DocMarkdown } from '../src/DocMarkdown';

type Asset = { body: string; type: string };
const escape = (value: string) => value.replace(/[&<>"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[char]!));

// SPA, plain Markdown, search corpus and crawlable HTML share the same source.
export function createDocsAssets(repoRoot: string): Map<string, Asset> {
  const assets = new Map<string, Asset>();
  const put = (name: string, body: string, type = 'text/plain; charset=utf-8') => assets.set(name, { body, type });
  const page = (title: string, description: string, route: string, body: string, docId?: string) => `<!doctype html>
<html lang="uz"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escape(title)} · Zayuno Docs</title><meta name="description" content="${escape(description)}">
<link rel="canonical" href="${DOCS_ORIGIN}${route}"><link rel="icon" href="/logo2.webp">
<link rel="stylesheet" href="/docs/style.css"><link rel="alternate" type="text/plain" href="/llms.txt" title="AI agent documentation">
${docId ? `<link rel="alternate" type="text/markdown" href="/docs/${docId}.md" title="Markdown source">` : ''}
<meta property="og:title" content="${escape(title)} · Zayuno Docs"><meta property="og:description" content="${escape(description)}"><meta property="og:type" content="article">
<meta property="og:url" content="${DOCS_ORIGIN}${route}">
<script type="application/ld+json">${JSON.stringify({ '@context':'https://schema.org', '@type':'TechArticle', headline:title, description, url:DOCS_ORIGIN + route, inLanguage:'uz', version:PROVIDER_CONTRACT_VERSION, publisher:{ '@type':'Organization', name:'Zayuno' } }).replace(/</g, '\\u003c')}</script>
</head><body class="static-docs-body"><main class="static-docs-shell"><header class="static-docs-header"><a href="/docs/"><strong>ZAYUNO / DOCS</strong></a><a href="${docId ? '/?doc=' + docId : '/?tab=docs'}">Portalda ochish ↗</a><a href="/llms.txt">AI agent index ↗</a></header>${body}</main></body></html>`;
  const documents = DOCS_MENU.map(entry => {
    const source = entry.id === 'contract-reference' ? createContractReference() : fs.readFileSync(path.join(repoRoot, 'docs', entry.file!), 'utf8');
    if (!source.trim()) throw new Error('Empty canonical document: ' + entry.id);
    // Absolute links let agents use individual files or the combined corpus.
    const markdown = source.replace(/\]\(([^)]+)\)/g, (match, href: string) => {
      const doc = resolveDocLink(href);
      if (doc) return '](' + DOCS_ORIGIN + '/docs/' + doc.id + '.md' + doc.hash + ')';
      return href.startsWith('/') && !href.startsWith('//') ? '](' + DOCS_ORIGIN + href + ')' : match;
    });
    put('docs/' + entry.id + '.md', markdown, 'text/markdown; charset=utf-8');
    const body = renderToStaticMarkup(React.createElement(DocMarkdown, { markdown: source, staticMode:true }));
    put('docs/' + entry.id + '/index.html', page(entry.title, entry.summary, '/docs/' + entry.id + '/', body, entry.id), 'text/html; charset=utf-8');
    return { ...entry, url:DOCS_ORIGIN + '/docs/' + entry.id + '/', markdownUrl:DOCS_ORIGIN + '/docs/' + entry.id + '.md', markdown };
  });
  const index = '<div class="doc-prose"><h1>Zayuno developer documentation</h1><p>Provider Contract ' + PROVIDER_CONTRACT_VERSION + '. Dasturchilar va ularning AI agentlari uchun yagona manba.</p><p><a href="/llms-full.txt">Full Markdown</a> · <a href="/openapi.json">OpenAPI</a> · <a href="/postman.json">Postman</a></p></div><nav class="static-docs-index">' + documents.map(doc => '<a href="/docs/' + doc.id + '/"><h2>' + escape(doc.title) + '</h2><p>' + escape(doc.summary) + '</p></a>').join('') + '</nav>';
  put('docs/index.html', page('Provider documentation', 'Quickstart, API contract, authentication, certification and agent integration guides.', '/docs/', index), 'text/html; charset=utf-8');
  put('docs/style.css', fs.readFileSync(path.join(repoRoot, 'apps/provider-portal/src/docs.css'), 'utf8'), 'text/css; charset=utf-8');
  put('docs/search-index.json', JSON.stringify({ contractVersion:PROVIDER_CONTRACT_VERSION, documents }, null, 2), 'application/json; charset=utf-8');
  put('llms.txt', `# Zayuno Provider Integration

> Provider Contract ${PROVIDER_CONTRACT_VERSION}. Build a provider backend for verified discovery, quotes and confirmed actions. Current product focus: food ordering.

## Start here
- [Agent workflow](${DOCS_ORIGIN}/docs/ai-agents.md): scope, source precedence, tests and handoff.
- [Quickstart](${DOCS_ORIGIN}/docs/getting-started.md): roles, credential ownership and integration steps.
- [Provider OpenAPI](${DOCS_ORIGIN}/openapi.json): generated schemas and examples; canonical implementation contract.
- [Complete documentation](${DOCS_ORIGIN}/llms-full.txt): all guides in one plain-text file.
- [Search corpus](${DOCS_ORIGIN}/docs/search-index.json): titles, keywords, URLs and complete content.

## Boundaries
Provider API Base URL belongs to the merchant. Core API is https://api.zayuno.uz/api/v1.
Status webhooks are provider-to-Zayuno at /api/v1/webhooks/{providerSlug}.
Use real prices and availability. Require an unexpired quote and explicit confirmation before creating an action.
Demo sandbox success is not provider certification or approval to publish.
Keep secret values on the server. A generated AI Kit contains placeholders, not usable credentials.

## Guides
${documents.map(doc => '- [' + doc.title + '](' + doc.markdownUrl + '): ' + doc.summary).join('\n')}
`);
  put('llms-full.txt', '# Zayuno Provider Documentation\n\nContract version: ' + PROVIDER_CONTRACT_VERSION + '\nCanonical index: ' + DOCS_ORIGIN + '/llms.txt\n\n' + documents.map(doc => '---\n\nSource: ' + doc.markdownUrl + '\n\n' + doc.markdown).join('\n\n'));
  put('openapi.json', JSON.stringify(createProviderOpenApiDocument(), null, 2), 'application/json; charset=utf-8');
  put('postman.json', JSON.stringify(createProviderPostmanCollection(), null, 2), 'application/json; charset=utf-8');
  put('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + ['/', '/docs/', ...documents.map(doc => '/docs/' + doc.id + '/')].map(route => '<url><loc>' + DOCS_ORIGIN + route + '</loc></url>').join('') + '</urlset>', 'application/xml; charset=utf-8');
  put('robots.txt', 'User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ' + DOCS_ORIGIN + '/sitemap.xml\n');
  return assets;
}

export function docsSitePlugin(repoRoot: string): Plugin {
  return {
    name:'zayuno-canonical-docs',
    configureServer(server) {
      let assets = createDocsAssets(repoRoot);
      server.watcher.add(path.join(repoRoot, 'docs'));
      server.watcher.on('change', file => {
        if (file.replace(/\\/g, '/').includes('/docs/') || file.endsWith('docs.css')) assets = createDocsAssets(repoRoot);
      });
      server.middlewares.use((req, res, next) => {
        const pathname = new URL(req.url || '/', 'http://localhost').pathname;
        let key = pathname.slice(1);
        if (key === 'docs') { res.writeHead(308, { Location:'/docs/' }); res.end(); return; }
        if (key.endsWith('/')) key += 'index.html';
        const asset = assets.get(key);
        if (!asset) return next();
        res.setHeader('Content-Type', asset.type);
        res.end(req.method === 'HEAD' ? undefined : asset.body);
      });
    },
    generateBundle() {
      for (const [fileName, asset] of createDocsAssets(repoRoot)) this.emitFile({ type:'asset', fileName, source:asset.body });
    }
  };
}
