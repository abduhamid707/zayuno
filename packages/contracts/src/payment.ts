import { z } from 'zod';
import { CurrencySchema } from './common';

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
  checkoutUrl: z.string().url().optional().describe('Provider-supplied external secure payment URL'),
  qrCodeUrl: z.string().url().optional(),
  instructions: z.string().optional(),
  supportedCurrencies: z.array(CurrencySchema).default(['UZS']),
  metadata: z.record(z.any()).optional().default({})
});
export type PaymentOption = z.infer<typeof PaymentOptionSchema>;

export const GetPaymentOptionsInputSchema = z.object({
  providerSlug: z.string().min(1),
  actionId: z.string().min(1)
});
export type GetPaymentOptionsInput = z.infer<typeof GetPaymentOptionsInputSchema>;
