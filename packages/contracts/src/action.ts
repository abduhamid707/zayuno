import { z } from 'zod';
import { CurrencySchema, AddressSchema, CustomerContactSchema, IsoDateTimeSchema } from './common';
import { QuoteLineSchema } from './quote';
import { StructuredSupportContactSchema } from './provider';

export enum ActionStatus {
  CREATED = 'CREATED',
  AWAITING_PAYMENT = 'AWAITING_PAYMENT',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED'
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  AUTHORIZED = 'AUTHORIZED',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED'
}

/**
 * Normalized NextAction object.
 * Used when an action requires external user interaction (e.g. provider checkout URL).
 * Zayuno never processes payments directly; the provider owns checkout.
 */
export const NextActionSchema = z.object({
  type: z.enum(['OPEN_URL', 'REDIRECT', 'CONFIRMATION_REQUIRED', 'NONE']).default('OPEN_URL'),
  url: z.string().url().describe('Provider-owned checkout or verification URL'),
  label: z.string().default('Pay now'),
  expiresAt: IsoDateTimeSchema.optional()
});
export type NextAction = z.infer<typeof NextActionSchema>;

export const ActionItemInputSchema = z.object({
  offeringId: z.string().min(1),
  variantId: z.string().optional(),
  quantity: z.number().int().positive().default(1),
  selectedOptions: z.array(z.object({
    groupId: z.string(),
    optionId: z.string(),
    quantity: z.number().int().positive().default(1)
  })).optional().default([])
});
export type ActionItemInput = z.infer<typeof ActionItemInputSchema>;

export const CreateActionInputSchema = z.object({
  idempotencyKey: z.string().min(1).optional().describe('Unique client-generated idempotency key (UUID or cryptographically random string). Server auto-generates if omitted.'),
  providerSlug: z.string().min(1).describe('Target provider slug'),
  quoteId: z.string().min(1).describe('Verified quote ID reviewed and confirmed by the user before submission'),
  locationId: z.string().optional(),
  items: z.array(ActionItemInputSchema).min(1).describe('Items or services requested in action'),
  customer: CustomerContactSchema.describe('Customer contact info'),
  destination: AddressSchema.optional().describe('Optional destination address or fulfillment location'),
  fulfillmentType: z.string().optional().describe('e.g. STANDARD, EXPRESS, PICKUP, DIGITAL'),
  paymentMethod: z.string().optional().describe('e.g. "payme", "card", "cash", "invoice"'),
  parameters: z.record(z.any()).optional().describe('Custom parameters passed to provider adapter'),
  userConfirmed: z.literal(true).describe('Must be true after the user explicitly confirms the reviewed quote')
});
export type CreateActionInput = z.infer<typeof CreateActionInputSchema>;

export const ActionEventSchema = z.object({
  id: z.string(),
  status: z.nativeEnum(ActionStatus),
  description: z.string(),
  source: z.enum(['AI_AGENT', 'PROVIDER_WEBHOOK', 'SYSTEM_WORKER', 'USER', 'ADMIN']),
  payload: z.record(z.any()).optional(),
  createdAt: IsoDateTimeSchema
});
export type ActionEvent = z.infer<typeof ActionEventSchema>;

export const NormalizedActionSchema = z.object({
  id: z.string().describe('Internal UUID'),
  publicId: z.string().describe('Public-facing reference ID (e.g. "ZY-ACT-12345")'),
  providerSlug: z.string(),
  providerName: z.string().optional(),
  externalActionId: z.string().optional().describe('External ID assigned by the provider system'),
  quoteId: z.string().optional(),
  locationId: z.string().optional(),
  status: z.nativeEnum(ActionStatus),
  nextAction: NextActionSchema.optional().describe('Provider-owned checkout or handoff instructions'),
  lines: z.array(QuoteLineSchema),
  subtotal: z.number().nonnegative(),
  fees: z.number().nonnegative().default(0),
  discount: z.number().nonnegative().default(0),
  total: z.number().nonnegative(),
  currency: CurrencySchema.default('UZS'),
  customer: CustomerContactSchema,
  destination: AddressSchema.optional(),
  fulfillmentType: z.string().default('STANDARD'),
  paymentMethod: z.string().optional(),
  paymentStatus: z.nativeEnum(PaymentStatus).default(PaymentStatus.PENDING),
  paymentUrl: z.string().url().optional().describe('Legacy checkout URL alias (prefer nextAction.url)'),
  idempotencyKey: z.string().optional(),
  supportContact: StructuredSupportContactSchema.optional().describe('Official support and escalation channels for the provider'),
  parameters: z.record(z.any()).optional().default({}),
  metadata: z.record(z.any()).optional().default({}),
  timeline: z.array(ActionEventSchema).optional().default([]),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema
});
export type NormalizedAction = z.infer<typeof NormalizedActionSchema>;

export const GetActionInputSchema = z.object({
  providerSlug: z.string().optional(),
  actionId: z.string().min(1).describe('Public ID (e.g. "ZY-ACT-12345") or UUID')
});
export type GetActionInput = z.infer<typeof GetActionInputSchema>;

export const CancellationReasonCodeSchema = z.enum([
  'CUSTOMER_CANCELLED',
  'PROVIDER_REJECTED',
  'ITEM_UNAVAILABLE',
  'PAYMENT_TIMEOUT',
  'PAYMENT_FAILED',
  'DUPLICATE_ACTION',
  'INVALID_CUSTOMER_INFORMATION',
  'PROVIDER_TIMEOUT',
  'SYSTEM_ERROR',
  'OTHER'
]);
export type CancellationReasonCode = z.infer<typeof CancellationReasonCodeSchema>;

export const CancelActionInputSchema = z.object({
  providerSlug: z.string().optional(),
  actionId: z.string().min(1).describe('Public action ID or UUID'),
  reasonCode: CancellationReasonCodeSchema.optional().describe('Stable cancellation category; defaults to CUSTOMER_CANCELLED'),
  reason: z.string().trim().min(3).max(500).optional().describe('Clear human-readable reason for cancellation')
});
export type CancelActionInput = z.infer<typeof CancelActionInputSchema>;

export const CancelActionResultSchema = z.object({
  success: z.boolean(),
  actionId: z.string(),
  previousStatus: z.nativeEnum(ActionStatus),
  newStatus: z.nativeEnum(ActionStatus),
  message: z.string(),
  refundInitiated: z.boolean().default(false)
});
export type CancelActionResult = z.infer<typeof CancelActionResultSchema>;
