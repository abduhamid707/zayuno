import { isProviderPublished, isProviderDiscoveryReady } from './publishing.js';
import { getAgentErrorPresentation } from './errors.js';

/** Presentation is provider-declared; shared code does not infer a business domain. */
function presentationDetails(value: any, provider?: any): string[] {
  const hints = value?.presentationHints || provider?.manifest?.presentationHints || provider?.metadata?.manifest?.presentationHints;
  return (hints?.fields || []).flatMap((field: any) => {
    const parts = String(field.path).split('.');
    if (parts.some((part: string) => ['__proto__', 'constructor', 'prototype'].includes(part))) return [];
    const content = parts.reduce((node: any, key: string) => node && Object.prototype.hasOwnProperty.call(node, key) ? node[key] : undefined, value);
    return typeof content === 'string' || typeof content === 'number' ? [`${field.label}: ${content}`] : [];
  });
}

export interface ProviderMetricCounts {
  discoverableProviderCount?: number;
  readOnlyProviderCount?: number;
  transactionalProviderCount?: number;
}

/**
 * Returns the dynamic service message bucket based on the available service count and provider availability.
 */
export function getDynamicServiceMessage(
  count?: number | null,
  isStale?: boolean,
  providerMetrics?: ProviderMetricCounts
): string {
  // If structured provider metrics are available and no offerings count exists (or count <= 0)
  if ((count === undefined || count === null || count <= 0) && providerMetrics && (providerMetrics.discoverableProviderCount || 0) > 0) {
    const discoverable = providerMetrics.discoverableProviderCount || 0;
    const transactional = providerMetrics.transactionalProviderCount || 0;
    if (transactional > 0) {
      return `${discoverable} ta tasdiqlangan hamkorlar xizmatidan sizga mosini topib beraman.`;
    }
    return `${discoverable} ta tasdiqlangan hamkor xizmati va ma’lumotlar bazasidan sizga mos variantni topib beraman.`;
  }

  if (count && !isNaN(count) && count > 0 && !isStale) {
    if (count <= 24) return 'O‘nlab mahsulot va xizmatlar orasidan sizga mosini topib beraman.';
    if (count <= 199) return '100 dan ortiq mahsulot va xizmat orasidan tanlashingiz mumkin.';
    return 'Yuzlab mahsulot va xizmatlar orasidan sizga mosini topib beraman.';
  }

  if (providerMetrics && (providerMetrics.discoverableProviderCount || 0) > 0) {
    const discoverable = providerMetrics.discoverableProviderCount || 0;
    const transactional = providerMetrics.transactionalProviderCount || 0;
    if (transactional > 0) {
      return `${discoverable} ta tasdiqlangan hamkorlar xizmatidan sizga mosini topib beraman.`;
    }
    return `${discoverable} ta tasdiqlangan hamkor xizmati va ma’lumotlar bazasidan sizga mos variantni topib beraman.`;
  }

  return 'Faol hamkorlar katalogidan sizga mos variantni topib beraman.';
}

/**
 * Generates the standardized natural customer welcome message.
 */
export function getWelcomeMessage(
  serviceCount?: number | null,
  isStale?: boolean,
  providerMetrics?: ProviderMetricCounts
): string {
  const dynamicMessage = getDynamicServiceMessage(serviceCount, isStale, providerMetrics);
  return `Assalomu alaykum! Zayuno orqali tasdiqlangan hamkorlar xizmatlaridan foydalanish oson.\n\n${dynamicMessage} Katalog, narx, provider talablari va buyurtma holatini bitta chatda boshqaramiz. Nima kerakligini yozing.`;
}

/**
 * Checks whether a provider is a sandbox/demo provider based on metadata and configuration.
 * Does NOT guess based on provider name.
 */
export function isDemoOrSandboxProvider(provider: any): boolean {
  if (!provider) return false;
  const metadata = (provider.metadata as Record<string, any>) || {};
  const config = (provider.config as Record<string, any>) || {};

  return (
    provider.environment === 'SANDBOX' ||
    provider.environment === 'STAGING' ||
    provider.status === 'SANDBOX' ||
    provider.adapterType === 'sandbox' ||
    metadata.sandbox === true ||
    metadata.isDemo === true ||
    metadata.environment === 'SANDBOX' ||
    metadata.tier === 'SANDBOX' ||
    config.sandbox === true ||
    config.isDemo === true
  );
}


/**
 * A checkout link can prove that a response is a test handoff even when a
 * provider record was accidentally published as production. Reserved test
 * domains and temporary tunnel hosts must never be presented as real payment.
 */
export function isSandboxCheckoutUrl(value: unknown): boolean {
  try {
    const host = new URL(String(value || '')).hostname.toLowerCase().replace(/\.$/, '');
    return (
      host === 'localhost' ||
      host.endsWith('.localhost') ||
      host === 'example' ||
      host.endsWith('.example') ||
      host.endsWith('.test') ||
      host.includes('sandbox') ||
      host.endsWith('.trycloudflare.com') ||
      host.endsWith('.ngrok-free.app') ||
      host.endsWith('.lhr.life')
    );
  } catch {
    return false;
  }
}

export function isDemoOrSandboxAction(action: any, providerInfo?: any): boolean {
  const actionMetadata = (action?.metadata as Record<string, any>) || {};
  const checkoutUrls = [
    action?.nextAction?.url,
    action?.paymentUrl,
    action?.checkoutUrl,
    providerInfo?.baseUrl,
  ];
  return (
    isDemoOrSandboxProvider(providerInfo) ||
    isDemoOrSandboxProvider(action) ||
    action?.isSandbox === true ||
    action?.environment === 'SANDBOX' ||
    actionMetadata.sandbox === true ||
    actionMetadata.isDemo === true ||
    actionMetadata.environment === 'SANDBOX' ||
    checkoutUrls.some(isSandboxCheckoutUrl)
  );
}

/**
 * A provider saying PAID is not enough. The payment integration must be
 * explicitly approved for status reporting; this prevents a mock /actions
 * endpoint from turning a customer message into a false payment receipt.
 */
export function hasVerifiedPaymentStatus(action: any, providerInfo?: any): boolean {
  if (isDemoOrSandboxAction(action, providerInfo)) return false;
  const actionMetadata = (action?.metadata as Record<string, any>) || {};
  const providerMetadata = (providerInfo?.metadata as Record<string, any>) || {};
  return actionMetadata.paymentStatusVerified === true || providerMetadata.paymentStatusVerified === true;
}

/**
 * Computes available service count from cached provider readiness snapshots and catalog summaries.
 * Only published, discovery-ready, active production offerings are counted.
 * Sandbox/demo providers are strictly excluded.
 */
export function computeAvailableServiceCount(providers: any[]): number {
  if (!Array.isArray(providers)) return 0;

  let totalCount = 0;

  for (const provider of providers) {
    if (!provider) continue;

    // 1. Must be published & discovery ready
    if (!isProviderPublished(provider)) continue;
    const readiness = isProviderDiscoveryReady(provider);
    if (!readiness.isReady) continue;

    // 2. Sandbox/demo providers must never be counted in customer production metrics
    if (isDemoOrSandboxProvider(provider)) continue;

    // 3. Count offerings from cached summaries or offering arrays
    const metadata = (provider.metadata as Record<string, any>) || {};
    const catalogSummary = metadata.catalogSummary;
    const readinessSnapshot = metadata.readinessSnapshot;

    if (typeof catalogSummary?.availableCount === 'number') {
      totalCount += Math.max(0, catalogSummary.availableCount);
    } else if (typeof readinessSnapshot?.availableOfferingsCount === 'number') {
      totalCount += Math.max(0, readinessSnapshot.availableOfferingsCount);
    } else if (Array.isArray(provider.offerings)) {
      const available = provider.offerings.filter((o: any) => o.isAvailable !== false).length;
      totalCount += available;
    } else if (typeof catalogSummary?.totalCount === 'number') {
      totalCount += Math.max(0, catalogSummary.totalCount);
    }
  }

  return totalCount;
}

/**
 * Maps raw backend status to user-friendly Uzbek status text.
 */
export function formatCustomerStatus(status: string, paymentStatus?: string): string {
  const normStatus = String(status || '').toUpperCase();
  const normPayment = String(paymentStatus || '').toUpperCase();

  if (normStatus === 'CANCELLED') {
    return 'Buyurtma bekor qilindi';
  }
  if (normStatus === 'FAILED') {
    return 'Buyurtmani yakunlab bo‘lmadi';
  }
  if (normPayment === 'PAID') {
    return 'To‘lov qabul qilindi';
  }
  if (normStatus === 'CONFIRMED') {
    return 'Buyurtmangiz tasdiqlandi';
  }
  if (normStatus === 'AWAITING_PAYMENT' || normStatus === 'PENDING_CONFIRMATION' || normPayment === 'PENDING') {
    return 'To‘lov hali qilinmagan';
  }
  if (normStatus === 'ACCEPTED' || normStatus === 'IN_PROGRESS' || normStatus === 'READY' || normStatus === 'FULFILLING') {
    return 'Buyurtmangiz tayyorlanmoqda';
  }
  if (normStatus === 'COMPLETED') {
    return 'Buyurtma muvaffaqiyatli yakunlandi';
  }

  return 'To‘lov hali qilinmagan';
}

/**
 * Formats a currency amount with Uzbek spacing format (e.g. "118 000 so‘m").
 */
export function formatUzbekCurrency(amount: number, currency = 'UZS'): string {
  const rounded = Math.round(amount || 0);
  const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const unit = currency.toUpperCase() === 'UZS' ? 'so‘m' : currency;
  return `${formatted} ${unit}`;
}

/**
 * Formats quote result into customer-facing copy.
 */
export function formatCustomerQuote(quote: any, providerInfo?: any): string {
  if (!quote) return 'Kotirovka hisoblandi.';

  const lines: string[] = [];
  lines.push('So‘rov hisob-kitobi:');
  lines.push(...presentationDetails(quote, providerInfo));
  lines.push('');

  if (Array.isArray(quote.lines) && quote.lines.length > 0) {
    for (const line of quote.lines) {
      const baseName = line.offeringTitle || line.title || line.name || line.offeringName || 'Xizmat';
      const variant = line.variantTitle || line.variantName ? `${line.variantTitle || line.variantName} ` : '';
      const name = `${variant}${baseName}`.trim();
      const qty = line.quantity || 1;
      const lineTotal = formatUzbekCurrency(line.lineTotal || line.total || (line.unitPrice * qty) || 0, quote.currency);
      lines.push(`• ${name} × ${qty} — ${lineTotal}`);
    }
  }

  if (Array.isArray(quote.fees) && quote.fees.length) {
    for (const fee of quote.fees) lines.push(`${fee.name}: ${formatUzbekCurrency(fee.amount, quote.currency)}`);
  } else if (quote.totalFees > 0) lines.push(`Xizmat haqi: ${formatUzbekCurrency(quote.totalFees, quote.currency)}`);
  if (quote.totalDiscount > 0) lines.push(`Chegirma: ${formatUzbekCurrency(quote.totalDiscount, quote.currency)}`);

  const grandTotal = formatUzbekCurrency(quote.total ?? quote.subtotal ?? 0, quote.currency);
  lines.push(`Jami: ${grandTotal}`);

  if (quote.estimatedDurationMinutes) {
    lines.push(`Taxminiy bajarilish vaqti: ${quote.estimatedDurationMinutes} daqiqa`);
  }

  lines.push('');
  lines.push('Buyurtmani tasdiqlaysizmi?');

  return lines.join('\n');
}

/**
 * Formats action confirmation and payment handoff into customer-facing copy.
 */
export function formatCustomerActionConfirmation(action: any, providerInfo?: any): string {
  if (!action) return 'So‘rov ma’lumoti topilmadi.';
  const url = action.nextAction?.url || action.paymentUrl;
  const sandbox = isDemoOrSandboxAction(action, providerInfo);
  const label = sandbox ? 'Sinov sahifasini ochish' : action.nextAction?.label || 'Davom etish';
  const link = url ? `\n\n[${label}](${url})` : '';
  return sandbox ? `Sinov so‘rovi yaratildi. Bu haqiqiy to‘lov tasdig‘i emas.${link}`
    : `${formatCustomerActionStatus(action, providerInfo)}${link}`;
}

export function formatCustomerActionStatus(action: any, providerInfo?: any): string {
  if (!action) return 'So‘rov ma’lumoti topilmadi.';
  if (action.status === 'CANCELLED') return 'So‘rov bekor qilingan.';
  if (isDemoOrSandboxAction(action, providerInfo)) return 'Bu sinov so‘rovi. Provider qaytargan to‘lov holati haqiqiy to‘lov tasdig‘i emas.';
  if (action.paymentStatus === 'PAID' && !hasVerifiedPaymentStatus(action, providerInfo)) {
    return 'Provider to‘lov holatini qaytardi, lekin Zayuno hali uni ishonchli tasdiqlamagan.';
  }
  return [formatCustomerStatus(action.status, action.paymentStatus), ...presentationDetails(action, providerInfo)].join('\n');
}

export function formatCustomerActionCancellation(result: any, providerInfo?: any): string {
  return result?.success === false ? 'So‘rovni bekor qilish tasdiqlanmadi.' : 'So‘rov bekor qilingan.';
}

/**
 * Formats availability result into natural customer-facing copy.
 */
export function formatCustomerAvailability(result: any, providerInfo?: any): string {
  if (!result) return 'Mavjudlik tekshirildi.';
  const availabilityStatus = result.availabilityStatus || (
    result.isAvailable === true ? 'AVAILABLE' : result.isAvailable === false ? 'UNAVAILABLE' : 'UNKNOWN'
  );
  if (availabilityStatus === 'NOT_SUPPORTED') {
    return 'Jonli mavjudlikni oldindan tekshirish imkoni yo‘q. Yakuniy mavjudlik narx hisoblanganda tasdiqlanadi.';
  }
  if (availabilityStatus === 'UNKNOWN' || availabilityStatus === 'STALE' || availabilityStatus === 'ERROR') {
    return 'Jonli mavjudlikni hozir ishonchli tekshirib bo‘lmadi. Yakuniy mavjudlik narx hisoblanganda tasdiqlanadi.';
  }
  if (result.isAvailable) {
    return ['Tanlangan takliflar mavjud.', ...presentationDetails(result, providerInfo)].join('\n');
  }

  if (Array.isArray(result.unavailableItems) && result.unavailableItems.length > 0) {
    return 'Kechirasiz, tanlangan ayrim mahsulotlar hozirda mavjud emas.';
  }

  return 'Kechirasiz, tanlangan mahsulotlar hozirda mavjud emas.';
}

/**
 * Formats provider discovery list into natural customer-facing copy.
 */
export function formatCustomerProviders(providers: any[]): string {
  if (!Array.isArray(providers) || providers.length === 0) {
    return 'Hozircha mos faol hamkor topilmadi.';
  }
  const names = providers.map(p => p.name || p.slug).filter(Boolean);
  if (names.length === 1) {
    return `"${names[0]}" topildi. Katalogini ko‘rishni xohlaysizmi?`;
  }
  return `Mavjud hamkorlar: ${names.slice(0, 5).join(', ')}. Qaysi birining katalogini ochamiz?`;
}

/**
 * Formats single provider metadata for customer.
 */
export function formatCustomerProvider(provider: any): string {
  if (!provider) return 'Hamkor ma’lumoti topilmadi.';
  const name = provider.name || provider.slug || 'Hamkor';
  const desc = provider.description ? ` (${provider.description})` : '';
  return `"${name}"${desc}. Katalogini ko‘rishni xohlaysizmi?`;
}

/**
 * Formats provider capability summary for customer.
 */
export function formatCustomerCapabilities(capabilities: string[], providerName?: string): string {
  const name = providerName ? `"${providerName}"` : 'Ushbu hamkor';
  const normalized = new Set((capabilities || []).map(capability => String(capability).toUpperCase()));
  const actions = ['Katalogni ko‘rish'];
  if (normalized.has('SEARCH')) actions.push('qidirish');
  if (normalized.has('QUOTE')) actions.push('narxni hisoblash');
  if (normalized.has('ACTION_CREATE')) actions.push('amalni bajarish');
  return `${name} orqali ${actions.join(', ')} mumkin.`;
}

/**
 * Formats locations list for customer.
 */
export function formatCustomerLocations(locations: any[]): string {
  if (!Array.isArray(locations) || locations.length === 0) {
    return 'Hozircha faol filiallar mavjud emas.';
  }
  const branchList = locations.map(l => l.name || l.address).filter(Boolean);
  return `Mavjud filiallar: ${branchList.join(', ')}.`;
}

/**
 * Formats catalog or search results for customer.
 */
export function formatCustomerOfferings(offerings: any[], providerName?: string): string {
  if (!Array.isArray(offerings) || offerings.length === 0) {
    return 'Kechirasiz, hech qanday taklif yoki mahsulot topilmadi.';
  }
  const items = offerings.slice(0, 8).map(o => {
    const title = o.title || o.name || 'Mahsulot';
    const price = o.basePrice ? ` — ${formatUzbekCurrency(o.basePrice, o.currency || 'UZS')}` : '';
    return `• ${title}${price}`;
  });
  return `Mavjud takliflar:\n${items.join('\n')}\n\nQaysi birini tanlaysiz?`;
}

/**
 * Formats single offering details for customer.
 */
export function formatCustomerOffering(offering: any): string {
  if (!offering) return 'Mahsulot ma’lumoti topilmadi.';
  const title = offering.title || offering.name || 'Mahsulot';
  const desc = offering.description ? `\n${offering.description}` : '';
  const price = offering.basePrice ? `\nNarxi: ${formatUzbekCurrency(offering.basePrice, offering.currency || 'UZS')}` : '';
  return `${title}${desc}${price}\n\nBuyurtma kotirovkasini hisoblaymi?`;
}

/**
 * Formats payment options for customer.
 */
export function formatCustomerPaymentOptions(options: any[], action?: any, providerInfo?: any): string {
  const url = action?.paymentUrl || action?.nextAction?.url || options?.[0]?.checkoutUrl;
  const isDemo = isDemoOrSandboxAction(action, providerInfo) || (Array.isArray(options) && options.some(option => isDemoOrSandboxAction(option, providerInfo) || isSandboxCheckoutUrl(option?.checkoutUrl)));
  if (url) {
    return isDemo
      ? `Bu sinov checkout sahifasi. Haqiqiy to‘lov amalga oshirilmaydi.\n\n[Sinov sahifasini ochish](${url})`
      : `To‘lov sahifasi tayyor:\n\n[To‘lov sahifasini ochish](${url})`;
  }
  return isDemo
    ? 'Bu sinov buyurtmasi. Haqiqiy to‘lov usuli yo‘q.'
    : 'To‘lov usullari checkout sahifasida taqdim etiladi.';
}

/**
 * Formats a friendly customer-facing error message, strictly without technical jargon.
 */
export function formatCustomerError(error?: unknown): string {
  // Keep customer language free of raw provider/API errors while allowing the
  // platform error taxonomy to choose an accurate recovery message.
  // `require` is deliberately avoided so this remains a normal shared export.
  return getAgentErrorPresentation(error).customerMessage;
}

/**
 * Formats general conversational response when user asks about capabilities.
 */
export function formatCustomerGeneralHelp(): string {
  return 'Faol hamkorlar katalogidan mos variant topaman, aniq narxini tekshiraman va provider ruxsat bergan bo‘lsa keyingi amalni bajarishga yordam beraman. Nima kerakligini yozing.';
}
