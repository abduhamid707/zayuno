import { z } from 'zod';
import { CurrencySchema, AddressSchema, CustomerContactSchema, IsoDateTimeSchema, optionalNullable } from './common';
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
  expiresAt: optionalNullable(IsoDateTimeSchema)
});
export type NextAction = z.infer<typeof NextActionSchema>;

export const ActionItemInputSchema = z.object({
  offeringId: z.string().min(1),
  variantId: optionalNullable(z.string()),
  quantity: z.number().int().positive().default(1),
  selectedOptions: optionalNullable(
    z.array(
      z.object({
        groupId: z.string(),
        optionId: z.string(),
        quantity: z.number().int().positive().default(1)
      })
    ),
    []
  )
});
export type ActionItemInput = z.infer<typeof ActionItemInputSchema>;

export const CreateActionInputSchema = z.object({
  idempotencyKey: optionalNullable(z.string().min(1)).describe(
    'Unique client-generated idempotency key (UUID or cryptographically random string). Server auto-generates if omitted.'
  ),
  providerSlug: z.string().min(1).describe('Target provider slug'),
  quoteId: z.string().min(1).describe('Verified quote ID reviewed and confirmed by the user before submission'),
  locationId: optionalNullable(z.string()),
  items: z.array(ActionItemInputSchema).min(1).describe('Items or services requested in action'),
  customer: optionalNullable(CustomerContactSchema).describe('Customer contact info when required by the provider or fulfillment flow'),
  destination: optionalNullable(AddressSchema).describe('Optional destination address or fulfillment location'),
  fulfillmentType: optionalNullable(z.string()).describe('e.g. STANDARD, EXPRESS, PICKUP, DIGITAL'),
  paymentMethod: optionalNullable(z.string()).describe('e.g. "payme", "card", "cash", "invoice"'),
  parameters: optionalNullable(z.record(z.any())).describe('Custom parameters passed to provider adapter'),
  userConfirmed: z.literal(true).describe('Must be true after the user explicitly confirms the reviewed quote')
});
export type CreateActionInput = z.infer<typeof CreateActionInputSchema>;

export const ActionEventSchema = z.object({
  id: z.string(),
  status: z.nativeEnum(ActionStatus),
  description: z.string(),
  source: z.enum(['AI_AGENT', 'PROVIDER_WEBHOOK', 'SYSTEM_WORKER', 'USER', 'ADMIN']),
  payload: optionalNullable(z.record(z.any())),
  createdAt: IsoDateTimeSchema
});
export type ActionEvent = z.infer<typeof ActionEventSchema>;

export const NormalizedActionSchema = z.object({
  id: z.string().describe('Internal UUID'),
  publicId: z.string().describe('Public-facing reference ID (e.g. "ZY-ACT-12345")'),
  providerSlug: z.string(),
  providerName: optionalNullable(z.string()),
  externalActionId: optionalNullable(z.string()).describe('External ID assigned by the provider system'),
  quoteId: optionalNullable(z.string()),
  locationId: optionalNullable(z.string()),
  status: z.nativeEnum(ActionStatus),
  nextAction: optionalNullable(NextActionSchema).describe('Provider-owned checkout or handoff instructions'),
  lines: z.array(QuoteLineSchema),
  subtotal: z.number().nonnegative(),
  fees: z.number().nonnegative().default(0),
  discount: z.number().nonnegative().default(0),
  total: z.number().nonnegative(),
  currency: CurrencySchema.default('UZS'),
  customer: optionalNullable(CustomerContactSchema),
  destination: optionalNullable(AddressSchema),
  fulfillmentType: z.string().default('STANDARD'),
  paymentMethod: optionalNullable(z.string()),
  paymentStatus: z.nativeEnum(PaymentStatus).default(PaymentStatus.PENDING),
  paymentUrl: optionalNullable(z.string().url()).describe('Legacy checkout URL alias (prefer nextAction.url)'),
  idempotencyKey: optionalNullable(z.string()),
  supportContact: optionalNullable(StructuredSupportContactSchema).describe('Official support and escalation channels for the provider'),
  parameters: optionalNullable(z.record(z.any()), {}),
  metadata: optionalNullable(z.record(z.any()), {}),
  timeline: optionalNullable(z.array(ActionEventSchema), []),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema
});
export type NormalizedAction = z.infer<typeof NormalizedActionSchema>;

export const GetActionInputSchema = z.object({
  providerSlug: optionalNullable(z.string()),
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
  providerSlug: optionalNullable(z.string()),
  actionId: z.string().min(1).describe('Public action ID or UUID'),
  reasonCode: optionalNullable(CancellationReasonCodeSchema).describe('Stable cancellation category; defaults to CUSTOMER_CANCELLED'),
  reason: optionalNullable(z.string().trim().min(3).max(500)).describe('Clear human-readable reason for cancellation')
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
