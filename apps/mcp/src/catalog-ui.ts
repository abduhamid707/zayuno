import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// The URI is a host cache key. Bump it when the UI contract changes so ChatGPT
// cannot keep serving an older resource or output-shape combination.
export const ZAYUNO_CATALOG_WIDGET_URI = 'ui://zayuno/catalog-v3.html';
export const ZAYUNO_CATALOG_WIDGET_MIME = 'text/html;profile=mcp-app';
export const ZAYUNO_UI_VERSION = '3.0.0';

function imageOrigins(): string[] {
  return [...new Set(['https://mcp.zayuno.uz', 'https://api.zayuno.uz', ...(process.env.MCP_WIDGET_IMAGE_ORIGINS || '').split(',')]
    .map(value => value.trim()).filter(Boolean).map(value => {
      const url = new URL(value);
      if (url.protocol !== 'https:' || url.username || url.password || url.origin !== value) {
        throw new Error('MCP_WIDGET_IMAGE_ORIGINS must contain exact HTTPS origins');
      }
      return url.origin;
    }))];
}

export function getCatalogResourceMeta() {
  const resourceDomains = imageOrigins();
  return {
    ui: { prefersBorder: true, csp: { connectDomains: [], resourceDomains } },
    'openai/widgetDescription': 'Browse the provider catalog, configure items and quantities, review a verified quote, explicitly confirm an order, and check payment status. Missing photos use placeholders; do not duplicate the full catalog in text.',
    'openai/widgetPrefersBorder': true,
    'openai/widgetCSP': { connect_domains: [], resource_domains: resourceDomains }
  };
}

export function getCatalogWidgetHtml() {
  const read = (name: string) => readFileSync(fileURLToPath(new URL(`../ui/${name}`, import.meta.url)), 'utf8');
  const logoSvg = read('zayuno-logo.svg');
  return read('catalog-widget.html')
    .replace('/* WIDGET_CSS */', read('catalog.css'))
    .replace('/* WIDGET_BRIDGE */', read('bridge.js'))
    .replace('/* WIDGET_APP */', read('catalog.js'))
    .replace('/* WIDGET_CONFIG */', `window.ZAYUNO_UI_CONFIG = ${JSON.stringify({ imageOrigins: imageOrigins(), logoSvg, version: ZAYUNO_UI_VERSION }).replace(/</g, '\\u003c')};`);
}

export function getCatalogResource() {
  return { uri: ZAYUNO_CATALOG_WIDGET_URI, name: 'Zayuno Catalog & Checkout UI', title: 'Zayuno interactive catalog', mimeType: ZAYUNO_CATALOG_WIDGET_MIME,
    description: 'Interactive catalog and checkout', _meta: getCatalogResourceMeta() };
}

export function readCatalogResource() {
  return { contents: [{ uri: ZAYUNO_CATALOG_WIDGET_URI, mimeType: ZAYUNO_CATALOG_WIDGET_MIME,
    text: getCatalogWidgetHtml(), _meta: getCatalogResourceMeta() }] };
}

const APP_TOOLS = new Set(['get_catalog', 'get_offering', 'search_catalog', 'request_quote', 'create_action', 'get_action', 'get_payment_options', 'check_availability']);
export function getToolUiMeta(name: string) {
  if (!APP_TOOLS.has(name)) return undefined;
  // Only opening a catalog mounts the UI. Quote/status calls update that instance.
  const renders = name === 'get_catalog';
  return {
    ui: { visibility: ['model', 'app'], ...(renders ? { resourceUri: ZAYUNO_CATALOG_WIDGET_URI } : {}) },
    'openai/widgetAccessible': true,
    ...(renders ? { 'openai/outputTemplate': ZAYUNO_CATALOG_WIDGET_URI,
      'openai/toolInvocation/invoking': 'Katalog ochilmoqda…', 'openai/toolInvocation/invoked': 'Katalog tayyor' } : {})
  };
}
