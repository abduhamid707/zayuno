import { z } from 'zod';
import { ActionStatus, PaymentStatus } from './action';
import { IsoDateTimeSchema } from './common';

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
  actionId: z.string().optional(),
  externalActionId: z.string().optional(),
  newStatus: z.nativeEnum(ActionStatus).optional(),
  newPaymentStatus: z.nativeEnum(PaymentStatus).optional(),
  timestamp: IsoDateTimeSchema,
  description: z.string().optional(),
  payload: z.record(z.any()).default({})
});
export type NormalizedWebhookEvent = z.infer<typeof NormalizedWebhookEventSchema>;

export const WebhookProcessingResultSchema = z.object({
  success: z.boolean(),
  eventId: z.string(),
  isVerified: z.boolean(),
  isDuplicate: z.boolean().default(false),
  actionUpdated: z.boolean().default(false),
  message: z.string().optional()
});
export type WebhookProcessingResult = z.infer<typeof WebhookProcessingResultSchema>;
