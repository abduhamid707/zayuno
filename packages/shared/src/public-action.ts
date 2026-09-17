import {
  type NormalizedAction,
  type PublicAction,
  PublicActionSchema
} from '@zayuno/contracts';

/**
 * Projects an internal normalized action onto the stable public action
 * allowlist. Keep this at the shared boundary so API/MCP presenters cannot
 * accidentally spread a database/protocol object into a customer response.
 */
export function toPublicAction(action: NormalizedAction | Record<string, any>): PublicAction {
  const raw = action as Record<string, any>;
  const nextAction = raw?.nextAction || undefined;
  const checkoutUrl = nextAction?.url || raw?.paymentUrl || raw?.checkoutUrl || undefined;

  return PublicActionSchema.parse({
    actionId: raw?.publicId || raw?.actionId,
    providerSlug: raw?.providerSlug,
    providerName: raw?.providerName,
    status: raw?.status,
    paymentStatus: raw?.paymentStatus,
    total: raw?.total,
    currency: raw?.currency,
    fulfillmentType: raw?.fulfillmentType,
    nextAction,
    checkoutUrl,
    supportContact: raw?.supportContact,
    createdAt: raw?.createdAt,
    updatedAt: raw?.updatedAt
  });
}
