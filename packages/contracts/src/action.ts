import { z } from 'zod';
import { CurrencySchema, AddressSchema, CustomerContactSchema, IsoDateTimeSchema, optionalNullable, ActionLocationSchema } from './common';
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
  items: z.array(ActionItemInputSchema).default([]).describe('Offering inputs, or empty for declared parameter-based actions'),
  locations: z.array(ActionLocationSchema).optional(),
  promoCode: z.string().trim().min(1).max(64).optional(),
  customer: optionalNullable(CustomerContactSchema).describe('Customer contact info when required by the provider or fulfillment flow'),
  destination: optionalNullable(AddressSchema).describe('Optional destination address or fulfillment location'),
  fulfillmentType: optionalNullable(z.string()).describe('e.g. STANDARD, EXPRESS, PICKUP, DIGITAL'),
  paymentMethod: optionalNullable(z.string()).describe('e.g. "payme", "card", "cash", "invoice"'),
  parameters: optionalNullable(z.record(z.any())).describe('Custom parameters passed to provider adapter'),
  environment: optionalNullable(z.string()).describe('Target execution environment context (e.g. LIVE, SANDBOX). Defaults to LIVE.'),
  quote: optionalNullable(
    z.object({
      id: z.string().optional(),
      subtotal: z.number().nonnegative(),
      fees: z.number().nonnegative().default(0),
      discount: z.number().nonnegative().default(0),
      total: z.number().nonnegative(),
      currency: CurrencySchema.default('UZS'),
      lines: z.array(QuoteLineSchema).default([])
    })
  ).describe('Canonical verified quote snapshot passed down to provider adapter'),
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
  locations: z.array(ActionLocationSchema).optional(),
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

/**
 * Stable allowlist for agent and customer-facing action responses. The
 * normalized action remains the internal/provider protocol object: it contains
 * persistence IDs, idempotency material, raw provider context and timeline
 * payloads that must not cross a public MCP boundary.
 */
export const PublicActionSchema = z.object({
  actionId: z.string().describe('Stable Zayuno public action reference, e.g. ZY-ACT-12345'),
  providerSlug: z.string(),
  providerName: optionalNullable(z.string()),
  status: z.nativeEnum(ActionStatus),
  paymentStatus: z.nativeEnum(PaymentStatus),
  total: z.number().nonnegative(),
  currency: CurrencySchema.default('UZS'),
  fulfillmentType: z.string().default('STANDARD'),
  nextAction: optionalNullable(NextActionSchema).describe('Provider-owned customer handoff when one is required'),
  checkoutUrl: optionalNullable(z.string().url()).describe('Convenience alias for nextAction.url'),
  supportContact: optionalNullable(StructuredSupportContactSchema),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema
});
export type PublicAction = z.infer<typeof PublicActionSchema>;

export const GetActionInputSchema = z.object({
  providerSlug: optionalNullable(z.string()),
  actionId: z.string().min(1).describe('Public ID (e.g. "ZY-ACT-12345") or UUID'),
  environment: optionalNullable(z.string()).describe('Target execution environment context (defaults to LIVE)')
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
  reason: optionalNullable(z.string().trim().min(3).max(500)).describe('Clear human-readable reason for cancellation'),
  environment: optionalNullable(z.string()).describe('Target execution environment context (defaults to LIVE)')
});
export type CancelActionInput = z.infer<typeof CancelActionInputSchema>;

export const CancelActionResultSchema = z.object({
  success: z.boolean(),
  actionId: z.string().describe('Stable Zayuno public action reference'),
  externalActionId: optionalNullable(z.string()).describe('Provider action identifier, when the caller is authorized to use it'),
  previousStatus: z.nativeEnum(ActionStatus),
  newStatus: z.nativeEnum(ActionStatus),
  message: z.string(),
  refundInitiated: z.boolean().default(false)
});
export type CancelActionResult = z.infer<typeof CancelActionResultSchema>;
