import { readFileSync } from 'node:fs';

export const CHOICES_URI = 'ui://zayuno/text-choices-v1.html';
export const choicesEnabled = () => process.env.ZAYUNO_TEXT_CHOICES_ENABLED !== 'false';
const choiceTools = new Set(['find_providers', 'list_providers', 'get_catalog', 'search_catalog']);
export function choiceToolMeta(name: string) {
  return choicesEnabled() && choiceTools.has(name)
    ? { ui: { resourceUri: CHOICES_URI }, 'openai/outputTemplate': CHOICES_URI }
    : undefined;
}
export const choiceResource = { uri: CHOICES_URI, name: 'zayuno-text-choices', title: 'Zayuno tanlovlari', mimeType: 'text/html;profile=mcp-app' };
export function readChoiceResource() {
  return { contents: [{ ...choiceResource,
    text: readFileSync(new URL('../dist/ui/text-choices.html', import.meta.url), 'utf8'),
    _meta: {
      ui: { prefersBorder: false, csp: { connectDomains: [], resourceDomains: [] } },
      'openai/widgetPrefersBorder': false,
      'openai/widgetDescription': 'Compact restaurant and food text choices. Each choice sends a follow-up message. Selection is not order confirmation. Avoid repeating the displayed list.',
    },
  }] };
}

// Only verified tool results become choices; never invent restaurants or prices.
export function choiceResultMeta(name: string, args: any, result: any) {
  if (!choiceToolMeta(name) || !result || result.isError) return undefined;
  const providers = Array.isArray(result.providers) ? result.providers : null;
  const offerings = Array.isArray(result.offerings) ? result.offerings : [];
  const provider = result.providerSlug || args.providerSlug;
  const items = providers
    ? providers.filter((p: any) => p.slug && p.name).map((p: any) => ({
      id: p.slug, label: p.name,
      prompt: `${p.name} katalogini ko‘rsat (servis: ${p.slug}).`,
    }))
    : offerings.filter((p: any) => p.id && (p.title || p.name)).map((p: any) => ({
      id: p.id, label: p.title || p.name,
      price: typeof p.price === 'number' ? p.price : p.basePrice,
      currency: p.currency || 'UZS', category: p.categoryTitle || p.categorySlug || '',
      disabled: p.isAvailable === false,
      prompt: `${provider} menyusidan ${p.title || p.name} tanlayman (mahsulot: ${p.id}${args.locationId ? `, filial: ${args.locationId}` : ''}). Variantlari va kerakli qo‘shimchalarini ko‘rsat.`,
    }));
  return { zayunoChoices: { kind: providers ? 'providers' : 'products',
    title: providers ? 'Qaysi servisdan buyurtma qilamiz?' : 'Nima tanlaymiz?',
    subtitle: providers ? 'Sevimli taomingiz shu yerdan boshlanadi.' : `${provider || 'Menyu'} · Taomni tanlang`,
    items,
  } };
}
