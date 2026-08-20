import { isProviderPublished, isProviderDiscoveryReady } from './publishing.js';

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

/**
 * Returns the dynamic service message bucket based on the available service count.
 */
export function getDynamicServiceMessage(count?: number | null, isStale?: boolean): string {
  if (count === null || count === undefined || isStale || isNaN(count) || count <= 0) {
    return 'Bir qancha yo‘nalishlarda yordam bera olaman.';
  }

  if (count <= 9) {
    return 'Bir qancha yo‘nalishlarda yordam bera olaman.';
  }
  if (count <= 99) {
    return 'O‘nlab xizmatlar orasidan sizga mosini topib beraman.';
  }
  if (count <= 299) {
    return '100 dan oshiq xizmat orasidan sizga mosini topib beraman.';
  }
  if (count <= 699) {
    return '300 dan oshiq xizmat orasidan sizga mosini topib beraman.';
  }
  if (count <= 999) {
    return '700 dan oshiq xizmat orasidan sizga mosini topib beraman.';
  }
  if (count <= 4999) {
    return 'Minglab xizmatlar orasidan sizga mosini topib beraman.';
  }
  return 'Minglab xizmat va takliflar orasidan sizga mosini topib beraman.';
}

/**
 * Generates the standardized natural customer welcome message.
 */
export function getWelcomeMessage(serviceCount?: number | null, isStale?: boolean): string {
  const dynamicMessage = getDynamicServiceMessage(serviceCount, isStale);
  return `Zayuno sizga uzoqni yaqin qiladi. Nima qilishni xohlaysiz?\n\nMen ovqat buyurtma qilish, poyez yoki aviachipta topish, turli xizmatlarni qidirish va buyurtmalarni kuzatishda yordam bera olaman. ${dynamicMessage}`;
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

  const isTicket =
    providerInfo?.type === 'TICKETING' ||
    quote.fulfillmentType === 'DIGITAL_TICKET' ||
    Boolean(quote.parameters?.tripId || quote.parameters?.trainNumber || quote.parameters?.origin);

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
      const name = line.title || line.name || line.offeringName || 'Xizmat';
      const qty = line.quantity || 1;
      const lineTotal = formatUzbekCurrency(line.lineTotal || line.total || (line.unitPrice * qty) || 0, quote.currency);
      lines.push(`• ${name} × ${qty} — ${lineTotal}`);
    }
  }

  if (quote.totalFees && quote.totalFees > 0) {
    lines.push(`Yetkazib berish / xizmat haqi: ${formatUzbekCurrency(quote.totalFees, quote.currency)}`);
  }

  const grandTotal = formatUzbekCurrency(quote.total || quote.subtotal || 0, quote.currency);
  lines.push(`Jami: ${grandTotal}`);
  lines.push('');
  lines.push('Buyurtmani tasdiqlaysizmi?');

  return lines.join('\n');
}

/**
 * Formats action confirmation and payment handoff into customer-facing copy.
 */
export function formatCustomerActionConfirmation(action: any, providerInfo?: any): string {
  if (!action) return 'Buyurtma qabul qilindi.';

  const isTicket =
    providerInfo?.type === 'TICKETING' ||
    action.fulfillmentType === 'DIGITAL_TICKET' ||
    Boolean(action.parameters?.tripId || action.parameters?.trainNumber);

  const isDemo = isDemoOrSandboxProvider(providerInfo) || isDemoOrSandboxProvider(action);
  const checkoutUrl = action.nextAction?.url || action.paymentUrl || 'https://zayuno.uz/pay';

  const demoDisclaimer = isDemo ? 'Bu demo buyurtma, haqiqiy to‘lov olinmaydi.\n' : '';

  if (isTicket) {
    return `Chipta band qilindi. Endi to‘lovni yakunlang:\n\n${demoDisclaimer}[To‘lov sahifasini ochish](${checkoutUrl})`;
  }

  return `Buyurtma yaratildi. Endi to‘lovni yakunlang:\n\n${demoDisclaimer}[To‘lov sahifasini ochish](${checkoutUrl})`;
}

/**
 * Formats action status tracking into customer-facing copy.
 */
export function formatCustomerActionStatus(action: any, providerInfo?: any): string {
  if (!action) return 'Buyurtma ma’lumoti topilmadi.';

  const isTicket =
    providerInfo?.type === 'TICKETING' ||
    action.fulfillmentType === 'DIGITAL_TICKET' ||
    Boolean(action.parameters?.tripId || action.parameters?.trainNumber);

  const status = String(action.status || '').toUpperCase();
  const paymentStatus = String(action.paymentStatus || '').toUpperCase();
  const sandboxState = String(action.sandboxState || '').toUpperCase();

  // 1. Cancelled
  if (status === 'CANCELLED' || sandboxState === 'CANCELLED') {
    if (isTicket) {
      return 'Bu buyurtma bekor qilingan. Xohlasangiz, sizga yangi chipta topib beraman.';
    }
    return 'Bu buyurtma bekor qilingan. Xohlasangiz, sizga boshqa taklif topib beraman.';
  }

  // 2. Paid / Confirmed
  if (paymentStatus === 'PAID' || status === 'CONFIRMED' || sandboxState === 'CONFIRMED') {
    if (isTicket) {
      return 'Zo‘r, to‘lov qabul qilindi. Chiptangiz tasdiqlandi.';
    }
    return 'To‘lov qabul qilindi. Buyurtmangiz tasdiqlandi.';
  }

  // 3. Unpaid / Awaiting Payment
  if (status === 'AWAITING_PAYMENT' || paymentStatus === 'PENDING' || sandboxState === 'AWAITING_PAYMENT' || sandboxState === 'AWAITING_PASSENGER_DETAILS') {
    const checkoutUrl = action.nextAction?.url || action.paymentUrl || 'https://zayuno.uz/pay';
    if (isTicket) {
      return `Chipta band qilingan, lekin to‘lov hali qilinmagan.\n\n[To‘lovni yakunlash](${checkoutUrl})`;
    }
    return `Buyurtmangiz qabul qilingan, lekin to‘lov hali qilinmagan.\n\n[To‘lovni yakunlash](${checkoutUrl})`;
  }

  // 4. Failed
  if (status === 'FAILED') {
    return 'Buyurtmani yakunlab bo‘lmadi.';
  }

  // 5. In Progress / Other
  return formatCustomerStatus(status, paymentStatus);
}

/**
 * Formats cancellation result into customer-facing copy.
 */
export function formatCustomerActionCancellation(result: any, providerInfo?: any): string {
  const isTicket = providerInfo?.type === 'TICKETING';
  if (isTicket) {
    return 'Bu buyurtma bekor qilingan. Xohlasangiz, sizga yangi chipta topib beraman.';
  }
  return 'Bu buyurtma bekor qilingan. Xohlasangiz, sizga boshqa taklif topib beraman.';
}

/**
 * Formats general conversational response when user asks about capabilities.
 */
export function formatCustomerGeneralHelp(): string {
  return 'Men ovqat buyurtma qilish, chipta topish, turli xizmatlarni qidirish va buyurtmalarni kuzatishda yordam bera olaman. Nimadan boshlaymiz?';
}
