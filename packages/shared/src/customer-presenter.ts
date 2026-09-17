import { isProviderPublished, isProviderDiscoveryReady } from './publishing.js';
import { getAgentErrorPresentation } from './errors.js';

export interface CustomerQuoteFormatOptions {
  origin?: string;
  destination?: string;
  departureDate?: string;
  departureTime?: string;
  carTitle?: string;
  carNumber?: string | number;
  seatNumber?: string | number;
  seatLevelText?: string;
  isTicket?: boolean;
}

function isTicketPresentation(value: any, providerInfo?: any): boolean {
  const providerIdentity = [
    providerInfo?.type,
    providerInfo?.category,
    providerInfo?.name,
    providerInfo?.slug,
    value?.providerSlug,
    value?.providerName,
    providerInfo?.metadata?.category,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    providerInfo?.type === 'TICKETING' ||
    /ticket|chipta|event|concert/i.test(providerIdentity) ||
    value?.fulfillmentType === 'DIGITAL_TICKET' ||
    Boolean(value?.parameters?.tripId || value?.parameters?.trainNumber || value?.parameters?.origin)
  );
}

/**
 * Returns the dynamic service message bucket based on the available service count.
 */
export function getDynamicServiceMessage(count?: number | null, isStale?: boolean): string {
  if (count === null || count === undefined || isStale || isNaN(count) || count <= 0) {
    return 'Faol hamkorlar katalogidan sizga mos variantni topib beraman.';
  }

  if (count <= 24) return 'O‘nlab mahsulot va xizmatlar orasidan sizga mosini topib beraman.';
  if (count <= 199) return '100 dan ortiq mahsulot va xizmat orasidan tanlashingiz mumkin.';
  return 'Yuzlab mahsulot va xizmatlar orasidan sizga mosini topib beraman.';
}

/**
 * Generates the standardized natural customer welcome message.
 */
export function getWelcomeMessage(serviceCount?: number | null, isStale?: boolean): string {
  const dynamicMessage = getDynamicServiceMessage(serviceCount, isStale);
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
  const slug = (provider.slug || provider.providerSlug || '').toLowerCase();

  return (
    slug === 'coffee-time' ||
    slug === 'sandbox-provider' ||
    provider.status === 'SANDBOX' ||
    provider.adapterType === 'sandbox' ||
    metadata.sandbox === true ||
    metadata.isDemo === true ||
    metadata.noRealTicket === true ||
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

  const isTicket = isTicketPresentation(quote, providerInfo);

  if (isTicket) {
    const origin = quote.parameters?.origin || quote.parameters?.from || quote.metadata?.origin || quote.parameters?.departureStation;
    const destination = quote.parameters?.destination || quote.parameters?.to || quote.metadata?.destination || quote.parameters?.arrivalStation;
    const dateText = quote.parameters?.date || quote.parameters?.departureDate || quote.metadata?.date;
    const timeText = quote.parameters?.departureTime || quote.parameters?.time || quote.metadata?.departureTime;

    const carClass = quote.parameters?.carClass || quote.parameters?.preferences?.carClass || quote.metadata?.carClass;
    const carNumber = quote.parameters?.carNumber || quote.metadata?.carNumber;
    const seatNumber = quote.parameters?.selectedSeatNumbers?.[0] || quote.parameters?.seatNumber || quote.metadata?.seatNumber;
    const seatLevelRaw = quote.parameters?.seatLevel || quote.metadata?.seatLevel;
    const seatLevel = seatLevelRaw === 'UPPER' ? 'yuqori' : seatLevelRaw === 'LOWER' ? 'pastki' : seatLevelRaw;

    const parts: string[] = [];
    parts.push('Chipta topildi:');
    parts.push('');

    // Route
    if (origin && destination) {
      parts.push(`${origin} → ${destination}`);
    } else if (origin) {
      parts.push(`Jo‘nash: ${origin}`);
    } else if (destination) {
      parts.push(`Manzil: ${destination}`);
    }

    // Date & Time
    if (dateText && timeText) {
      const when = dateText === 'Bugun' || dateText.toLowerCase().includes('today') ? `Bugun, ${timeText}` : `${dateText}, ${timeText}`;
      parts.push(when);
    } else if (dateText) {
      parts.push(dateText);
    } else if (timeText) {
      parts.push(timeText);
    }

    // Car & Seat details
    const seatParts: string[] = [];
    if (carClass) seatParts.push(carClass);
    if (carNumber) seatParts.push(`${carNumber}-vagon`);
    if (seatNumber) {
      if (seatLevel) {
        seatParts.push(`${seatLevel} ${seatNumber}-joy`);
      } else {
        seatParts.push(`${seatNumber}-joy`);
      }
    } else if (seatLevel) {
      seatParts.push(`${seatLevel} joy`);
    }

    if (seatParts.length > 0) {
      parts.push(seatParts.join(', '));
    }

    // If no route, date, time, or seat was provided at all:
    if (!origin && !destination && !dateText && !timeText && seatParts.length === 0) {
      parts.push('Tafsilotlar checkout sahifasida tasdiqlanadi.');
    }

    if (Array.isArray(quote.lines) && quote.lines.length > 0) {
      for (const line of quote.lines) {
        const title = line.variantTitle || line.variantName
          ? `${line.offeringTitle || line.title || 'Chipta'} — ${line.variantTitle || line.variantName}`
          : line.offeringTitle || line.title || 'Chipta';
        const amount = line.lineTotal || line.total || (line.unitPrice * (line.quantity || 1)) || 0;
        parts.push(`${title} × ${line.quantity || 1} — ${formatUzbekCurrency(amount, quote.currency)}`);
      }
    }
    if (quote.totalFees && quote.totalFees > 0) {
      parts.push(`Servis / bronlash to‘lovi: ${formatUzbekCurrency(quote.totalFees, quote.currency)}`);
    }
    const totalText = formatUzbekCurrency(quote.total || quote.subtotal || 0, quote.currency);
    parts.push(`Jami: ${totalText}`);
    parts.push('');
    parts.push('Shu chiptani band qilaymi?');

    return parts.join('\n');
  }

  // General service / food delivery quote
  const lines: string[] = [];
  lines.push('Buyurtma hisob-kitobi:');
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

  if (quote.totalFees && quote.totalFees > 0) {
    const delivery = String(providerInfo?.fulfillmentMode || quote.fulfillmentType || '').toUpperCase() === 'DELIVERY';
    lines.push(`${delivery ? 'Yetkazib berish haqi' : 'Xizmat haqi'}: ${formatUzbekCurrency(quote.totalFees, quote.currency)}`);
  }

  const grandTotal = formatUzbekCurrency(quote.total || quote.subtotal || 0, quote.currency);
  lines.push(`Jami: ${grandTotal}`);

  if (quote.estimatedDurationMinutes) {
    const delivery = String(providerInfo?.fulfillmentMode || quote.fulfillmentType || '').toUpperCase() === 'DELIVERY';
    lines.push(`${delivery ? 'Yetkazish' : 'Taxminiy bajarilish vaqti'}: taxminan ${quote.estimatedDurationMinutes} daqiqa`);
  }

  lines.push('');
  lines.push('Buyurtmani tasdiqlaysizmi?');

  return lines.join('\n');
}

/**
 * Formats action confirmation and payment handoff into customer-facing copy.
 */
export function formatCustomerActionConfirmation(action: any, providerInfo?: any): string {
  if (!action) return 'Buyurtmangiz yaratildi. To‘lov kutilmoqda.';

  const isTicket = isTicketPresentation(action, providerInfo);
  const checkoutUrl = action.nextAction?.url || action.paymentUrl;
  const isDemo = isDemoOrSandboxAction(action, providerInfo);

  if (isDemo) {
    const subject = isTicket ? 'Sinov chipta so‘rovi' : 'Sinov buyurtmasi';
    const link = checkoutUrl ? `\n\n[Sinov sahifasini ochish](${checkoutUrl})` : '';
    return `${subject} yaratildi. Haqiqiy providerga yuborilmaydi va bu sahifada haqiqiy to‘lov amalga oshmaydi.${link}`;
  }

  const paymentUrl = checkoutUrl || 'https://zayuno.uz/pay';

  if (isTicket) {
    return `Chipta band qilindi. Endi to‘lovni yakunlang:

[To‘lov sahifasini ochish](${paymentUrl})`;
  }

  return `Buyurtmangiz yaratildi. To‘lov kutilmoqda.

[To‘lov sahifasini ochish](${paymentUrl})`;
}

/**
 * Formats action status tracking into customer-facing copy.
 */
export function formatCustomerActionStatus(action: any, providerInfo?: any): string {
  if (!action) return 'Buyurtma ma’lumoti topilmadi.';

  const isTicket = isTicketPresentation(action, providerInfo);
  const isDemo = isDemoOrSandboxAction(action, providerInfo);
  const status = String(action.status || '').toUpperCase();
  const paymentStatus = String(action.paymentStatus || '').toUpperCase();
  const sandboxState = String(action.sandboxState || '').toUpperCase();

  if (status === 'CANCELLED' || sandboxState === 'CANCELLED') {
    if (isTicket) return 'Bu buyurtma bekor qilingan. Xohlasangiz, sizga yangi chipta topib beraman.';
    return 'Bu buyurtma bekor qilingan. Xohlasangiz, sizga boshqa taklif topib beraman.';
  }

  if (paymentStatus === 'PAID') {
    if (isDemo) {
      return `Bu ${isTicket ? 'sinov chipta so‘rovi' : 'sinov buyurtmasi'}. Provider qaytargan to‘lov holati haqiqiy to‘lov tasdig‘i emas.`;
    }
    if (!hasVerifiedPaymentStatus(action, providerInfo)) {
      return 'Provider to‘lov holatini qaytardi, lekin Zayuno hali uni ishonchli tasdiqlamagan. To‘lovni qayta tekshiring.';
    }
    return isTicket
      ? 'Zo‘r, to‘lov qabul qilindi. Chiptangiz tasdiqlandi.'
      : 'To‘lov qabul qilindi. Buyurtmangiz tasdiqlandi.';
  }

  if (status === 'AWAITING_PAYMENT' || paymentStatus === 'PENDING' || sandboxState === 'AWAITING_PAYMENT' || sandboxState === 'AWAITING_PASSENGER_DETAILS') {
    const checkoutUrl = action.nextAction?.url || action.paymentUrl;
    if (isDemo) {
      const link = checkoutUrl ? `\n\n[Sinov sahifasini ochish](${checkoutUrl})` : '';
      return `Bu ${isTicket ? 'sinov chipta so‘rovi' : 'sinov buyurtmasi'}. Haqiqiy to‘lov olinmaydi.${link}`;
    }
    const paymentUrl = checkoutUrl || 'https://zayuno.uz/pay';
    if (isTicket) return `Chipta band qilingan, lekin to‘lov hali qilinmagan.

[To‘lovni yakunlash](${paymentUrl})`;
    return `Buyurtmangiz qabul qilingan, lekin to‘lov hali qilinmagan.

[To‘lovni yakunlash](${paymentUrl})`;
  }

  if (status === 'FAILED') return 'Buyurtmani yakunlab bo‘lmadi.';
  return formatCustomerStatus(status, paymentStatus);
}

/**
 * Formats cancellation result into customer-facing copy.
 */
export function formatCustomerActionCancellation(result: any, providerInfo?: any): string {
  const isTicket = isTicketPresentation(result, providerInfo);
  if (isTicket) {
    return 'Bu buyurtma bekor qilingan. Xohlasangiz, sizga yangi chipta topib beraman.';
  }
  return 'Bu buyurtma bekor qilingan. Xohlasangiz, sizga boshqa taklif topib beraman.';
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
    if (Array.isArray(result.availableItems) && result.availableItems.length > 0) {
      const isTicket = isTicketPresentation(result, providerInfo);
      if (isTicket && result.availableItems[0]?.metadata?.recommendedSeats?.length) {
        const seats = result.availableItems[0].metadata.recommendedSeats.map((s: any) => `${s.number}-joy`).join(', ');
        return `Joylar mavjud (${seats}). Kotirovka hisoblashga tayyormisiz?`;
      }
      return 'Tanlangan mahsulotlar mavjud va buyurtma qilish uchun tayyor.';
    }
    return 'Tanlangan mahsulotlar mavjud va buyurtma qilish uchun tayyor.';
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
