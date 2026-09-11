export const DOCS_ORIGIN = 'https://partners.zayuno.uz';
export interface DocEntry { id: string; title: string; file?: string; group: string; summary: string; keywords: string; }
export const DOCS_MENU: DocEntry[] = [
  { id:'getting-started', title:'Boshlash · Quickstart', file:'getting-started.md', group:'Boshlash', summary:'Biznes profili, birinchi API so‘rovi va nashrgacha bo‘lgan yo‘l.', keywords:'start onboarding register integration ulash' },
  { id:'base-url', title:'API Base URL & Endpoints', file:'base-url.md', group:'Boshlash', summary:'Qaysi serverni qurish kerak? Express va FastAPI misollari.', keywords:'https endpoint node python express fastapi server url' },
  { id:'ai-agents', title:'AI agent bilan integratsiya', file:'ai-agents.md', group:'Boshlash', summary:'Codex, Claude va boshqa agentlar uchun ish tartibi va resurslar.', keywords:'llms.txt claude codex cursor agent ai kit prompt' },
  { id:'spec-v1', title:'Arxitektura va chegaralar', file:'provider-integration-v1.md', group:'Contract v1', summary:'Provider va Zayuno vazifalari, lifecycle va to‘lov chegarasi.', keywords:'architecture lifecycle states payment boundary' },
  { id:'capabilities', title:'Capability profillari', file:'capabilities.md', group:'Contract v1', summary:'Read-only, transactional va joylashuv talablari.', keywords:'readonly transactional locations fulfillment mandatory' },
  { id:'auth', title:'Authentication & HMAC', file:'authentication.md', group:'Contract v1', summary:'API key kimniki? Webhook secret va raw body imzosi.', keywords:'401 unauthorized hmac rawbody secret key bearer signature authentication' },
  { id:'catalog', title:'Katalog va mahsulotlar', file:'catalog.md', group:'Contract v1', summary:'Offering, variant, option, narx va mavjudlik.', keywords:'menu product offerings variants modifiers stock narx' },
  { id:'quotes', title:'Quote va hisob-kitob', file:'quotes.md', group:'Contract v1', summary:'Narxni hisoblash, expiry, subtotal va fees.', keywords:'price pricing math total quote expiry expired 409 subtotal' },
  { id:'actions', title:'Buyurtma lifecycle', file:'actions.md', group:'Contract v1', summary:'Tasdiqdan keyingi action, idempotency va holatlar.', keywords:'order action create cancel status confirmation idempotency' },
  { id:'payment-handoff', title:'To‘lovga yo‘naltirish', file:'payment-handoff.md', group:'Contract v1', summary:'Provider checkout, nextAction va to‘lov holati.', keywords:'payment checkout nextaction open_url paid' },
  { id:'webhooks', title:'Webhook va eventlar', file:'webhooks.md', group:'Contract v1', summary:'Providerdan Zayunoga imzolangan status xabarlari.', keywords:'hmac callback webhook delivery signature event rawbody' },
  { id:'errors', title:'Xatolar va idempotency', file:'errors-and-idempotency.md', group:'Contract v1', summary:'Retry, duplicate, conflict va xato formatlari.', keywords:'error retry idempotency duplicate 409 500 timeout' },
  { id:'contract-reference', title:'Provider API reference', group:'Reference', summary:'Koddagi contractdan yaratilgan endpoint va JSON misollar.', keywords:'schema openapi json postman contract endpoint request response' },
  { id:'api-reference', title:'Zayuno Core API', file:'api-reference.md', group:'Reference', summary:'Portal, provider boshqaruvi va Core endpointlar.', keywords:'core api bearer jwt dashboard management endpoint' },
  { id:'certification', title:'Tekshirish va nashr', file:'certification.md', group:'Ishga tushirish', summary:'Sandbox, haqiqiy API certification va review.', keywords:'certify certified sandbox review publish active production test' },
  { id:'provider-operations', title:'Dashboard va operatsiyalar', file:'provider-operations.md', group:'Ishga tushirish', summary:'Buyurtmalar monitoringi, review va provider account.', keywords:'operations orders dashboard metrics changes_requested moderation' },
  { id:'troubleshooting-faq', title:'Muammoni topish · FAQ', file:'troubleshooting-faq.md', group:'Ishga tushirish', summary:'CORS, 401, HMAC, quote math va timeout yechimlari.', keywords:'troubleshooting error cors 401 403 500 hmac timeout rawbody fail' }
];
export function normalizeDocId(id: string, hash = '') {
  if ((id === 'spec-v1' || id === 'provider-integration') && hash.startsWith('#contract-')) return 'contract-reference';
  return id === 'provider-integration' ? 'spec-v1' : id === 'openapi' ? 'contract-reference' : id;
}
export function resolveDocLink(href: string): { id: string; hash: string } | undefined {
  if (href.startsWith('#')) return undefined;
  let url: URL;
  try { url = new URL(href, DOCS_ORIGIN + '/docs/'); } catch { return undefined; }
  if (![DOCS_ORIGIN, 'https://developers.zayuno.uz'].includes(url.origin)) return undefined;
  const tail = url.pathname.replace(/\/$/, '').split('/').pop() || '';
  const requested = normalizeDocId(url.searchParams.get('doc') || tail.replace(/\.md$/, ''), url.hash);
  const doc = DOCS_MENU.find(item => item.id === requested || item.file === tail);
  if (!doc) return undefined;
  return { id: url.hash.startsWith('#contract-') && doc.id === 'spec-v1' ? 'contract-reference' : doc.id, hash: url.hash };
}
export function createHeadingSlugger() {
  const seen = new Map<string, number>();
  return (value: string) => {
    const explicit = value.match(/\s+\{#([\w-]+)\}$/);
    const base = explicit?.[1] || value.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^\p{L}\p{N}\s_-]/gu, '').trim().replace(/\s+/g, '-') || 'section';
    const count = seen.get(base) || 0;
    seen.set(base, count + 1);
    return count ? `${base}-${count}` : base;
  };
}
export function getDocHeadings(markdown: string) {
  const slug = createHeadingSlugger();
  let fence = false;
  return markdown.split('\n').flatMap(line => {
    if (/^\s*```|^\s*~~~/.test(line)) { fence = !fence; return []; }
    const match = !fence && line.match(/^(#{1,6})\s+(.+)$/);
    if (!match) return [];
    const text = match[2].replace(/[*`]/g, '');
    const id = slug(text);
    return match[1].length === 2 ? [{ id, text: text.replace(/\s+\{#[\w-]+\}$/, '') }] : [];
  });
}
export function searchDocs(query: string, documents: { entry: DocEntry; markdown: string }[]) {
  const normalize = (s: string) => s.toLocaleLowerCase().normalize('NFKD').replace(/[‘’'`]/g, '');
  const terms = normalize(query.trim()).split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return documents.map(doc => {
    const title = normalize(doc.entry.title), keys = normalize(doc.entry.keywords), body = normalize(doc.markdown);
    const score = terms.every(term => title.includes(term) || keys.includes(term) || body.includes(term))
      ? terms.reduce((sum, term) => sum + (title.includes(term) ? 12 : 0) + (keys.includes(term) ? 6 : 0) + (body.includes(term) ? 1 : 0), 0) : 0;
    const clean = doc.markdown.replace(/[#*`|]/g, '').replace(/\s+/g, ' ');
    const first = normalize(clean).indexOf(terms[0]);
    const from = Math.max(0, first - 55);
    return { ...doc.entry, score, snippet: (from ? '…' : '') + clean.slice(from, from + 180) + '…' };
  }).filter(doc => doc.score > 0).sort((a, b) => b.score - a.score);
}
