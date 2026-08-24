import { z } from 'zod';
import { CurrencySchema, AddressSchema, IsoDateTimeSchema, optionalNullable } from './common';
import { SelectedOptionSchema } from './catalog';

export const QuoteItemInputSchema = z.object({
  offeringId: z.string().min(1).describe('Target offering or item identifier'),
  variantId: optionalNullable(z.string()).describe('Optional variant identifier'),
  quantity: z.number().int().positive().default(1).describe('Quantity of units'),
  selectedOptions: optionalNullable(z.array(SelectedOptionSchema), []).describe('Selected customizations or options')
});
export type QuoteItemInput = z.infer<typeof QuoteItemInputSchema>;

export const RequestQuoteInputSchema = z.object({
  providerSlug: z.string().min(1).describe('Unique provider slug'),
  locationId: optionalNullable(z.string()).describe('Optional provider location identifier'),
  items: z.array(QuoteItemInputSchema).min(1).describe('Array of items requested'),
  fulfillmentType: optionalNullable(z.string()).describe('Fulfillment mode (e.g. STANDARD, EXPRESS, PICKUP, DIGITAL)'),
  destination: optionalNullable(AddressSchema).describe('Optional physical delivery address or service destination'),
  promoCode: optionalNullable(z.string().trim().min(1).max(64)).describe('Optional provider-issued promotion or discount code. The provider validates and prices it; Zayuno never invents discounts.'),
  parameters: optionalNullable(z.record(z.any())).describe('Optional domain or provider-specific parameters')
});
export type RequestQuoteInput = z.infer<typeof RequestQuoteInputSchema>;

export const QuoteLineSchema = z.object({
  offeringId: z.string(),
  offeringTitle: z.string(),
  variantId: optionalNullable(z.string()),
  variantTitle: optionalNullable(z.string()),
  unitPrice: z.number().nonnegative(),
  quantity: z.number().int().positive(),
  optionsTotal: z.number().default(0),
  lineTotal: z.number().nonnegative(),
  selectedOptions: optionalNullable(z.array(SelectedOptionSchema), [])
});
export type QuoteLine = z.infer<typeof QuoteLineSchema>;

export const QuoteFeeSchema = z.object({
  name: z.string().describe('e.g. "Fulfillment Fee", "Processing Fee", "Service Fee"'),
  amount: z.number().nonnegative()
});
export type QuoteFee = z.infer<typeof QuoteFeeSchema>;

export const QuoteDiscountSchema = z.object({
  code: optionalNullable(z.string()),
  description: optionalNullable(z.string()),
  amount: z.number().nonnegative()
});
export type QuoteDiscount = z.infer<typeof QuoteDiscountSchema>;

export const NormalizedQuoteSchema = z.object({
  id: z.string().describe('Unique platform quote ID'),
  providerSlug: z.string(),
  locationId: optionalNullable(z.string()),
  lines: z.array(QuoteLineSchema),
  subtotal: z.number().nonnegative().describe('Base item subtotal'),
  fees: optionalNullable(z.array(QuoteFeeSchema), []),
  totalFees: z.number().nonnegative().default(0),
  discounts: optionalNullable(z.array(QuoteDiscountSchema), []),
  totalDiscount: z.number().nonnegative().default(0),
  total: z.number().nonnegative().describe('Final payable amount in quote currency'),
  currency: CurrencySchema.default('UZS'),
  expiresAt: IsoDateTimeSchema.describe('RFC 3339 timestamp when quote prices expire; Z and numeric offsets are accepted'),
  estimatedDurationMinutes: optionalNullable(z.number().int().positive()),
  parameters: optionalNullable(z.record(z.any()), {})
});
export type NormalizedQuote = z.infer<typeof NormalizedQuoteSchema>;
