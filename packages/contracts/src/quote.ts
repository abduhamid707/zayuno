import { z } from 'zod';
import { CurrencySchema, AddressSchema, IsoDateTimeSchema } from './common';
import { SelectedOptionSchema } from './catalog';

export const QuoteItemInputSchema = z.object({
  offeringId: z.string().min(1).describe('Target offering or item identifier'),
  variantId: z.string().optional().describe('Optional variant identifier'),
  quantity: z.number().int().positive().default(1).describe('Quantity of units'),
  selectedOptions: z.array(SelectedOptionSchema).optional().default([]).describe('Selected customizations or options')
});
export type QuoteItemInput = z.infer<typeof QuoteItemInputSchema>;

export const RequestQuoteInputSchema = z.object({
  providerSlug: z.string().min(1).describe('Unique provider slug'),
  locationId: z.string().optional().describe('Optional provider location identifier'),
  items: z.array(QuoteItemInputSchema).min(1).describe('Array of items requested'),
  fulfillmentType: z.string().optional().describe('Fulfillment mode (e.g. STANDARD, EXPRESS, PICKUP, DIGITAL)'),
  destination: AddressSchema.optional().describe('Optional physical delivery address or service destination'),
  promoCode: z.string().trim().min(1).max(64).optional().describe('Optional provider-issued promotion or discount code. The provider validates and prices it; Zayuno never invents discounts.'),
  parameters: z.record(z.any()).optional().describe('Optional domain or provider-specific parameters')
});
export type RequestQuoteInput = z.infer<typeof RequestQuoteInputSchema>;

export const QuoteLineSchema = z.object({
  offeringId: z.string(),
  offeringTitle: z.string(),
  variantId: z.string().optional(),
  variantTitle: z.string().optional(),
  unitPrice: z.number().nonnegative(),
  quantity: z.number().int().positive(),
  optionsTotal: z.number().default(0),
  lineTotal: z.number().nonnegative(),
  selectedOptions: z.array(SelectedOptionSchema).optional().default([])
});
export type QuoteLine = z.infer<typeof QuoteLineSchema>;

export const QuoteFeeSchema = z.object({
  name: z.string().describe('e.g. "Fulfillment Fee", "Processing Fee", "Service Fee"'),
  amount: z.number().nonnegative()
});
export type QuoteFee = z.infer<typeof QuoteFeeSchema>;

export const QuoteDiscountSchema = z.object({
  code: z.string().optional(),
  description: z.string().optional(),
  amount: z.number().nonnegative()
});
export type QuoteDiscount = z.infer<typeof QuoteDiscountSchema>;

export const NormalizedQuoteSchema = z.object({
  id: z.string().describe('Unique platform quote ID'),
  providerSlug: z.string(),
  locationId: z.string().optional(),
  lines: z.array(QuoteLineSchema),
  subtotal: z.number().nonnegative().describe('Base item subtotal'),
  fees: z.array(QuoteFeeSchema).default([]),
  totalFees: z.number().nonnegative().default(0),
  discounts: z.array(QuoteDiscountSchema).default([]),
  totalDiscount: z.number().nonnegative().default(0),
  total: z.number().nonnegative().describe('Final payable amount in quote currency'),
  currency: CurrencySchema.default('UZS'),
  expiresAt: IsoDateTimeSchema.describe('RFC 3339 timestamp when quote prices expire; Z and numeric offsets are accepted'),
  estimatedDurationMinutes: z.number().int().positive().optional(),
  parameters: z.record(z.any()).optional().default({})
});
export type NormalizedQuote = z.infer<typeof NormalizedQuoteSchema>;
