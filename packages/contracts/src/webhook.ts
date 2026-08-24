import { z } from 'zod';
import { ActionStatus, PaymentStatus } from './action';
import { IsoDateTimeSchema, optionalNullable } from './common';

export const WebhookEventTypeSchema = z.enum([
  'action.created',
  'action.status_updated',
  'action.completed',
  'action.cancelled',
  'action.failed',
  'payment.received',
  'payment.failed',
  'catalog.updated',
  'location.status_changed'
]);
export type WebhookEventType = z.infer<typeof WebhookEventTypeSchema>;

export const NormalizedWebhookEventSchema = z.object({
  eventId: z.string(),
  eventType: WebhookEventTypeSchema,
  providerSlug: z.string(),
  actionId: optionalNullable(z.string()),
  externalActionId: optionalNullable(z.string()),
  newStatus: optionalNullable(z.nativeEnum(ActionStatus)),
  newPaymentStatus: optionalNullable(z.nativeEnum(PaymentStatus)),
  timestamp: IsoDateTimeSchema,
  description: optionalNullable(z.string()),
  payload: optionalNullable(z.record(z.any()), {})
});
export type NormalizedWebhookEvent = z.infer<typeof NormalizedWebhookEventSchema>;

export const WebhookProcessingResultSchema = z.object({
  success: z.boolean(),
  eventId: z.string(),
  isVerified: z.boolean(),
  isDuplicate: z.boolean().default(false),
  actionUpdated: z.boolean().default(false),
  message: optionalNullable(z.string())
});
export type WebhookProcessingResult = z.infer<typeof WebhookProcessingResultSchema>;
