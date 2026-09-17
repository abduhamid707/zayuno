import { z } from 'zod';
import { CurrencySchema, optionalNullable } from './common';

export enum PaymentMethodType {
  PAYME = 'PAYME',
  CLICK = 'CLICK',
  UZUM = 'UZUM',
  CARD_ONLINE = 'CARD_ONLINE',
  CASH_ON_DELIVERY = 'CASH_ON_DELIVERY',
  INVOICE = 'INVOICE',
  EXTERNAL_PROVIDER = 'EXTERNAL_PROVIDER'
}

export const PaymentOptionSchema = z.object({
  id: z.string(),
  name: z.string().describe('e.g. "Payme", "Click", "Bank Card", "Cash / Offline"'),
  type: z.nativeEnum(PaymentMethodType),
  isOnline: z.boolean().default(true),
  checkoutUrl: optionalNullable(z.string().url()).describe('Provider-supplied external secure payment URL'),
  qrCodeUrl: optionalNullable(z.string().url()),
  instructions: optionalNullable(z.string()),
  supportedCurrencies: optionalNullable(z.array(CurrencySchema), ['UZS']),
  metadata: optionalNullable(z.record(z.any()), {})
});
export type PaymentOption = z.infer<typeof PaymentOptionSchema>;

/**
 * Customer/API-facing payment option. Provider protocol options may retain
 * adapter metadata for reconciliation, but that data must never be forwarded
 * to an API-key or MCP caller.
 */
export const PublicPaymentOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.nativeEnum(PaymentMethodType),
  isOnline: z.boolean().default(true),
  checkoutUrl: optionalNullable(z.string().url()),
  qrCodeUrl: optionalNullable(z.string().url()),
  instructions: optionalNullable(z.string()),
  supportedCurrencies: optionalNullable(z.array(CurrencySchema), ['UZS']),
  // This is deliberately a boolean rather than provider metadata so customer
  // presenters can retain the no-real-payment warning without exposing config.
  isSandbox: z.boolean().default(false)
});
export type PublicPaymentOption = z.infer<typeof PublicPaymentOptionSchema>;

export const GetPaymentOptionsInputSchema = z.object({
  providerSlug: z.string().min(1),
  actionId: z.string().min(1)
});
export type GetPaymentOptionsInput = z.infer<typeof GetPaymentOptionsInputSchema>;
