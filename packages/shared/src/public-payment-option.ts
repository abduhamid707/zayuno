import {
  type PaymentOption,
  type PublicPaymentOption,
  PublicPaymentOptionSchema
} from '@zayuno/contracts';

function isSandboxPaymentOption(option: Record<string, any>): boolean {
  const metadata = (option?.metadata as Record<string, any>) || {};
  return option?.isSandbox === true ||
    option?.environment === 'SANDBOX' ||
    metadata.sandbox === true ||
    metadata.isDemo === true ||
    metadata.noRealTicket === true ||
    metadata.environment === 'SANDBOX';
}

/**
 * Drops provider-only metadata before a payment option crosses a public API or
 * MCP boundary. The sandbox bit is preserved as a safe, explicit signal for
 * customer presentation.
 */
export function toPublicPaymentOption(option: PaymentOption | Record<string, any>): PublicPaymentOption {
  const raw = option as Record<string, any>;
  return PublicPaymentOptionSchema.parse({
    id: raw?.id,
    name: raw?.name,
    type: raw?.type,
    isOnline: raw?.isOnline,
    checkoutUrl: raw?.checkoutUrl,
    qrCodeUrl: raw?.qrCodeUrl,
    instructions: raw?.instructions,
    supportedCurrencies: raw?.supportedCurrencies,
    isSandbox: isSandboxPaymentOption(raw)
  });
}

export function toPublicPaymentOptions(options: readonly (PaymentOption | Record<string, any>)[]): PublicPaymentOption[] {
  return options.map(toPublicPaymentOption);
}
