import { ActionStatus, PaymentStatus, Currency } from '@zayuno/contracts';

export enum ZayunoEventTopic {
  ACTION_CREATED = 'action.created',
  ACTION_ACCEPTED = 'action.accepted',
  ACTION_UPDATED = 'action.updated',
  ACTION_CANCELLED = 'action.cancelled',
  ACTION_COMPLETED = 'action.completed',
  PAYMENT_PENDING = 'payment.pending',
  PAYMENT_COMPLETED = 'payment.completed',
  PAYMENT_FAILED = 'payment.failed',
  PROVIDER_CONNECTED = 'provider.connected',
  PROVIDER_ERROR = 'provider.error',
  WEBHOOK_RECEIVED = 'webhook.received'
}

export interface BaseEventPayload {
  eventId: string;
  timestamp: string;
  traceId?: string;
}

export interface ActionCreatedEventPayload extends BaseEventPayload {
  actionId: string;
  publicId: string;
  providerSlug: string;
  providerId: string;
  locationId?: string;
  userId?: string;
  status: ActionStatus;
  subtotal: number;
  fees: number;
  discount: number;
  total: number;
  currency: Currency;
  fulfillmentType?: string;
  customerPhone: string;
  itemsCount: number;
}

export interface ActionStatusChangedEventPayload extends BaseEventPayload {
  actionId: string;
  publicId: string;
  providerSlug: string;
  previousStatus: ActionStatus;
  newStatus: ActionStatus;
  source: string;
  externalActionId?: string;
  reason?: string;
}

export interface PaymentStatusChangedEventPayload extends BaseEventPayload {
  actionId: string;
  publicId: string;
  providerSlug: string;
  previousStatus: PaymentStatus;
  newStatus: PaymentStatus;
  paymentMethod?: string;
  amount: number;
  currency: Currency;
  paymentUrl?: string;
}

export interface WebhookReceivedEventPayload extends BaseEventPayload {
  webhookLogId: string;
  providerSlug: string;
  event: string;
  isVerified: boolean;
}

export interface ProviderErrorEventPayload extends BaseEventPayload {
  providerSlug: string;
  endpoint: string;
  statusCode?: number;
  errorMessage: string;
  durationMs: number;
}
