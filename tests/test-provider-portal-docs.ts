import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createDocsAssets } from '../apps/provider-portal/scripts/docs-site';
import { DOCS_MENU, getDocHeadings, searchDocs, resolveDocLink, normalizeDocId } from '../apps/provider-portal/src/docs-catalog';
import { createContractReference } from '../apps/provider-portal/src/contract-docs';
import { getIntegrationState } from '../apps/provider-portal/src/workspace-model';
import { generateAiPrompt, generateContractJson } from '../apps/provider-portal/src/ai-integration-kit';
import { PROVIDER_PROTOCOL_ENDPOINTS } from '../packages/contracts/src/provider-protocol.ts';
import { ProviderCapability } from '../packages/contracts/src/provider.ts';

const root = process.cwd();
const assets = createDocsAssets(root);
const documents = DOCS_MENU.map(entry => ({ entry, markdown: entry.file ? fs.readFileSync(path.join(root, 'docs', entry.file), 'utf8') : createContractReference() }));
assert.equal(new Set(DOCS_MENU.map(doc => doc.id)).size, DOCS_MENU.length);
for (const { entry, markdown } of documents) {
  const html = assets.get('docs/' + entry.id + '/index.html')!;
  const raw = assets.get('docs/' + entry.id + '.md')!;
  assert.ok(html?.type.startsWith('text/html'), entry.id + ': static HTML missing');
  assert.ok(raw?.type.startsWith('text/markdown'), entry.id + ': Markdown missing');
  assert.ok(html.body.includes('rel="canonical"'), entry.id + ': canonical URL missing');
  assert.ok(html.body.includes('application/ld+json'), entry.id + ': structured data missing');
  assert.ok(html.body.includes('/?doc=' + entry.id), entry.id + ': interactive portal link missing');
  assert.ok(raw.body.length > 100);
  for (const heading of getDocHeadings(markdown)) {
    assert.ok(html.body.includes('id="' + heading.id + '"'), entry.id + ': TOC anchor missing: ' + heading.id);
  }
  for (const match of markdown.matchAll(/\]\(([^)]+)\)/g)) {
    const href = match[1], resolved = resolveDocLink(href);
    if (resolved) {
      assert.ok(DOCS_MENU.some(doc => doc.id === resolved.id), 'Broken docs link: ' + href);
      if (resolved.hash) {
        const target = assets.get('docs/' + resolved.id + '/index.html')!.body;
        assert.ok(target.includes('id="' + resolved.hash.slice(1) + '"'), 'Broken cross-guide anchor: ' + href);
      }
    } else if (/\.md(?:#|$)/.test(href) && !/^https?:/.test(href)) {
      assert.fail('Unresolved relative Markdown guide: ' + href);
    }
  }
}
for (const resource of ['llms.txt', 'llms-full.txt', 'openapi.json', 'postman.json', 'sitemap.xml', 'robots.txt', 'docs/search-index.json', 'docs/index.html']) assert.ok(assets.has(resource), resource);
const corpus = JSON.parse(assets.get('docs/search-index.json')!.body);
assert.equal(corpus.documents.length, DOCS_MENU.length);
const openapi = JSON.parse(assets.get('openapi.json')!.body);
for (const endpoint of PROVIDER_PROTOCOL_ENDPOINTS) {
  const route = endpoint.path.replace(/:([\w]+)/g, '{$1}');
  if (endpoint.direction === 'PROVIDER_TO_ZAYUNO') {
    assert.deepEqual(openapi.webhooks.providerStatusEvent.post.requestBody.content['application/json'].example, endpoint.requestExample, 'Webhook example must match the canonical event');
  } else {
    assert.ok(openapi.paths[route]?.[endpoint.method.toLowerCase()], 'Missing OpenAPI endpoint: ' + route);
  }
  assert.ok(assets.get('docs/contract-reference/index.html')!.body.includes('id="' + endpoint.docsAnchor + '"'));
}
assert.equal(searchDocs('HMAC', documents)[0].id, 'auth');
assert.ok(searchDocs('401', documents).some(doc => doc.id === 'auth'));
assert.ok(searchDocs('rawBody', documents).some(doc => doc.id === 'troubleshooting-faq'));
assert.ok(searchDocs('quote expiry', documents).some(doc => doc.id === 'quotes'));
assert.equal(searchDocs('nonexistentwordxyz', documents).length, 0);
assert.equal(searchDocs('  ', documents).length, 0);
assert.equal(normalizeDocId('provider-integration', '#contract-quote'), 'contract-reference');
assert.equal(resolveDocLink('authentication.md')?.id, 'auth');
assert.equal(resolveDocLink('https://developers.zayuno.uz/?doc=provider-integration#contract-health')?.id, 'contract-reference');
assert.equal(resolveDocLink('https://example.com/?doc=auth'), undefined);
assert.equal(resolveDocLink('http://['), undefined);

assert.equal(getIntegrationState(false).tab, 'onboarding');
assert.equal(getIntegrationState(true).step, 3);
assert.equal(getIntegrationState(true, { slug:'test' }).steps[1].complete, false);
assert.equal(getIntegrationState(true, { slug:'test', baseUrl:'https://example.com' }).tab, 'certification');
assert.equal(getIntegrationState(true, { slug:'test', baseUrl:'https://example.com', metadata:{ isCertified:true } }).steps[2].complete, false);
assert.equal(getIntegrationState(true, { slug:'test', status:'SUSPENDED' }).status, 'SUSPENDED');
assert.equal(getIntegrationState(true, { slug:'test', baseUrl:'https://example.com', status:'ACTIVE', metadata:{ isCertified:true } }).steps.every(step => step.complete), true);

const provider = { type:'SERVICES', fulfillmentMode:'DELIVERY', capabilities:[ProviderCapability.METADATA, ProviderCapability.HEALTH, ProviderCapability.CATALOG] };
const brief = generateAiPrompt({ goal:'create-new', framework:'nodejs-express', provider });
assert.ok(brief.includes('LOCATIONS'), 'Physical fulfillment requirement must survive absent LOCATIONS declaration');
assert.ok(brief.includes('https://partners.zayuno.uz/llms.txt'));
assert.ok(!brief.includes('https://developers.zayuno.uz'));
const exported = JSON.parse(generateContractJson(provider));
assert.equal(exported.endpoints.locations.required, true);
assert.equal(exported.endpoints.locations.direction, 'ZAYUNO_TO_PROVIDER');
const transactional = JSON.parse(generateContractJson());
assert.equal(transactional.endpoints.webhook.direction, 'PROVIDER_TO_ZAYUNO');
console.log('Provider portal docs: export, schema, link/anchor, search, progress and agent handoff checks passed.');
