import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const QUICK_REPLIES_URI = 'ui://zayuno/quick-replies-v1.html';
export const QUICK_REPLIES_VERSION = '1.0.0';
export const QUICK_REPLIES_ENABLED = process.env.ZAYUNO_QUICK_REPLIES_ENABLED !== 'false';
const MIME = 'text/html;profile=mcp-app';
const TOOLS = new Set(['find_providers', 'list_providers', 'get_provider', 'get_locations',
  'get_catalog', 'search_catalog', 'get_offering', 'request_quote', 'create_action', 'get_action', 'get_payment_options']);

type Choice = { id: string; label: string; prompt: string; disabled?: boolean; expiresAt?: string };
type Group = { label: string; choices: Choice[] };
export type QuickReplies = { title: string; groups: Group[]; summary?: string };
type Data = Record<string, any>;
const list = (value: unknown): Data[] => Array.isArray(value) ? value.filter(item => item && typeof item === 'object') : [];
const text = (value: unknown, limit = 160): string => typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, limit) : '';
const name = (value: Data) => text(value.title || value.name);
const money = (value: unknown, currency: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0
  ? `${new Intl.NumberFormat('uz-UZ').format(value)} ${currency === 'UZS' ? 'so‘m' : text(currency, 8) || 'UZS'}` : '';
const priced = (label: string, value: unknown, currency: unknown) => [label, money(value, currency)].filter(Boolean).join(' · ');

// Suggestions are built only from the current authoritative tool result. No model-
// generated URLs, catalog mutations, order creation or payment calls live in the UI.
export function buildQuickReplies(tool: string, args: Data, result: Data): QuickReplies {
  const groups: Group[] = [];
  const add = (label: string, choices: Choice[]) => {
    const seen = new Set<string>();
    const unique = choices.filter(choice => choice.id && choice.label && choice.prompt && !seen.has(choice.id) && seen.add(choice.id));
    if (unique.length) groups.push({ label, choices: unique });
  };
  const choice = (id: string, label: string, prompt: string, disabled = false): Choice => ({ id, label, prompt, ...(disabled ? { disabled } : {}) });
  const provider = text(result.providerSlug || args.providerSlug);
  const location = text(args.locationId || result.locationId);
  const context = `${provider}${location ? `, filial: ${location}` : ''}`;
  const selectionOnly = 'Bu faqat tanlov, buyurtmani hali yaratma. Kerakli variant va qo‘shimchalarni aniqlashtir.';
  let title = 'Tanlang';
  let summary: string | undefined;

  if (tool === 'find_providers' || tool === 'list_providers') {
    title = 'Qaysi xizmat?';
    add('', list(result.providers).map(item => {
      const slug = text(item.slug);
      return choice(slug, name(item), `${name(item)} (${slug}) ni tanlayman. Mavjud xizmatlarini ko‘rsat. Buyurtma yaratma.`, item.status !== undefined && item.status !== 'ACTIVE');
    }));
  } else if (tool === 'get_provider') {
    const slug = text(result.slug || provider);
    const capabilities = Array.isArray(result.capabilities) ? result.capabilities : [];
    add('', [
      ...(capabilities.includes('CATALOG') ? [choice('catalog', 'Katalogni ochish', `${slug} katalogini och. Buyurtma yaratma.`)] : []),
      ...(capabilities.includes('LOCATIONS') ? [choice('locations', 'Filialni tanlash', `${slug} filiallarini ko‘rsat.`)] : [])
    ]);
  } else if (tool === 'get_locations' && provider) {
    title = 'Filialni tanlang';
    add('', list(result.locations).map(item => choice(text(item.id), name(item), `${provider}: ${name(item)} filialini tanlayman (locationId: ${text(item.id)}). Shu filial katalogini och. Buyurtma yaratma.`, item.isActive === false)));
  } else if ((tool === 'get_catalog' || tool === 'search_catalog') && provider) {
    title = provider;
    add('Kategoriyalar', list(result.categories).map(item => choice(text(item.slug), name(item), `${context}: ${name(item)} kategoriyasini och (category: ${text(item.slug)}). Buyurtma yaratma.`)));
    add('Mahsulotlar', list(result.offerings).map(item => choice(text(item.id), priced(name(item), item.basePrice ?? item.price, item.currency), `${context}: ${name(item)} dan 1 ta tanlayman (offeringId: ${text(item.id)}). ${selectionOnly}`, item.isAvailable === false)));
    if (list(result.offerings).length) add('', [choice('review', 'Savatni ko‘rish', 'Shu suhbatda men tanlagan mahsulotlarni va miqdorini ko‘rsat. Tanlamagan mahsulotni qo‘shma. Hali buyurtma yaratma.')]);
  } else if (tool === 'get_offering' && provider && name(result)) {
    title = name(result);
    const itemContext = `${context}: ${name(result)} (offeringId: ${text(result.id || args.offeringId)})`;
    const unavailable = result.isAvailable === false;
    add('Miqdori', [1, 2, 3].map(quantity => choice(`quantity-${quantity}`, `${quantity} ta`, `${itemContext} miqdorini ${quantity} ta qil. ${selectionOnly}`, unavailable)));
    add('Varianti', list(result.variants).map(item => choice(text(item.id), priced(name(item), item.basePrice, result.currency), `${itemContext}: ${name(item)} variantini tanlayman (variantId: ${text(item.id)}). ${selectionOnly}`, unavailable || item.isAvailable === false)));
    for (const group of list(result.optionGroups)) {
      add(`${name(group)}${group.isRequired || group.minSelections > 0 ? ' · majburiy' : ''}`, list(group.options).map(item => choice(text(item.id), priced(name(item), item.priceDelta, result.currency), `${itemContext}: ${name(group)} uchun ${name(item)} ni tanlayman (groupId: ${text(group.id)}, optionId: ${text(item.id)}). ${selectionOnly}`, unavailable || item.isAvailable === false)));
    }
    add('', [choice('catalog', 'Yana mahsulot tanlash', `${context} katalogini och. Oldingi tanlovlarimni saqla, buyurtma yaratma.`),
      choice('review', 'Savatni ko‘rish', 'Shu suhbatdagi tanlovlarim va miqdorlarini ko‘rsat. Yetkazish manzili yetishmasa so‘ra, keyin yakuniy narxni hisobla. Buyurtma yaratma.')]);
  } else if (tool === 'request_quote') {
    const total = money(result.total, result.currency);
    const quoteId = text(result.quoteId || result.id);
    const expiry = text(result.expiresAt);
    const valid = total && quoteId && Number.isFinite(Date.parse(expiry)) && Date.parse(expiry) > Date.now();
    title = total ? `Jami: ${total}` : 'Hisob-kitob';
    // Price and line items are visible before the confirmation click. Never turn
    // an expired or incomplete result into an actionable purchase confirmation.
    summary = list(result.lines).map(line => `${text(line.offeringTitle) || 'Mahsulot'} × ${Number(line.quantity) || 0}`).join(', ');
    add('', [
      ...(valid && list(result.lines).length ? [{ id: 'confirm', label: `${total} · Tasdiqlayman`, expiresAt: expiry,
        prompt: `${provider || 'Shu provider'}: ${summary}. Yakuniy ${total} hisobni tasdiqlayman (quoteId: ${quoteId}). Faqat shu hisob bo‘yicha davom et. Muddati o‘tgan yoki tarkibi o‘zgargan bo‘lsa qayta hisoblab, yana tasdiq so‘ra. Mijoz ma’lumoti yetishmasa so‘ra.` }] : []),
      choice('edit', 'Tanlovni o‘zgartirish', 'Buyurtma yaratma. Shu suhbatdagi savatni ko‘rsat, tanlovimni o‘zgartirmoqchiman.'),
      choice('requote', 'Narxni yangilash', 'Shu suhbatdagi tanlangan mahsulotlar va manzil uchun narxni qayta hisobla. Buyurtma yaratma.')
    ]);
  } else if (tool === 'create_action' || tool === 'get_action' || tool === 'get_payment_options') {
    const actionId = text(result.actionId || result.publicId || args.actionId || result.id);
    if (actionId) {
      title = 'Keyingi qadam';
      if (tool === 'get_payment_options') add('To‘lov usuli', list(result.paymentOptions).map(item => choice(text(item.method), name(item), `${name(item)} to‘lov usulini tanlayman. Shu buyurtma uchun provider bergan xavfsiz to‘lov havolasini ko‘rsat (actionId: ${actionId}). To‘lovni o‘zing amalga oshirma.`, item.isAvailable === false)));
      add('', [choice('status', 'Holatini tekshirish', `Buyurtmamning hozirgi holatini va to‘lov holatini tekshir (actionId: ${actionId}).`),
        ...(tool !== 'get_payment_options' && result.paymentStatus !== 'PAID' && !['CANCELLED', 'FAILED', 'EXPIRED', 'COMPLETED'].includes(result.status)
          ? [choice('payment', 'To‘lov usullari', `Shu buyurtma uchun mavjud to‘lov usullarini ko‘rsat (actionId: ${actionId}).`)] : [])]);
    }
  }
  return { title, groups, ...(summary ? { summary } : {}) };
}

export function getQuickRepliesToolMeta(name: string) {
  if (!QUICK_REPLIES_ENABLED || !TOOLS.has(name)) return undefined;
  return { ui: { resourceUri: QUICK_REPLIES_URI, visibility: ['model', 'app'] },
    'openai/outputTemplate': QUICK_REPLIES_URI,
    'openai/toolInvocation/invoking': 'Variantlar olinmoqda…', 'openai/toolInvocation/invoked': 'Variantlar tayyor' };
}

export function getQuickRepliesResultMeta(name: string, args: Data, result: any) {
  const meta = getQuickRepliesToolMeta(name);
  return meta ? { ...meta, 'zayuno/quickReplies': buildQuickReplies(name, args, result && typeof result === 'object' ? result : {}) } : undefined;
}

export function getQuickRepliesResource() {
  return { uri: QUICK_REPLIES_URI, name: 'zayuno-quick-replies', title: 'Zayuno tanlov tugmalari', mimeType: MIME };
}

export function getQuickRepliesHtml() {
  const read = (file: string) => readFileSync(fileURLToPath(new URL(`../ui/${file}`, import.meta.url)), 'utf8');
  return read('quick-replies.html').replace('/* QUICK_REPLIES_CSS */', read('quick-replies.css'))
    .replace('/* WIDGET_BRIDGE */', read('bridge.js')).replace('/* QUICK_REPLIES_APP */', read('quick-replies.js'));
}

export function readQuickRepliesResource() {
  return { contents: [{ uri: QUICK_REPLIES_URI, mimeType: MIME, text: getQuickRepliesHtml(), _meta: {
    ui: { prefersBorder: false, csp: { connectDomains: [], resourceDomains: [] } },
    'openai/widgetPrefersBorder': false,
    'openai/widgetCSP': { connect_domains: [], resource_domains: [] },
    'openai/widgetDescription': 'Compact choice buttons, not a storefront. A deliberate click sends a contextual follow-up into this conversation. Keep your reply short, do not duplicate all choices or claim the UI is visible. Selection is not order confirmation; only the explicit, priced quote-confirmation button confirms that quote. IDs in component messages identify the exact selection; do not repeat them to the customer.'
  } }] };
}
