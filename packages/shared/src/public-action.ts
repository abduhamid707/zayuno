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
  // Explicit scalar allowlist: retain customer delivery/payment meaning while
  // keeping provider metadata, credentials and timeline payloads private.
  const fulfillmentStatus = PublicActionSchema.shape.fulfillmentStatus.safeParse(raw?.fulfillmentStatus || raw?.metadata?.fulfillmentStatus);
  const delivery = fulfillmentStatus.success && !!fulfillmentStatus.data;
  const arrival = raw?.estimatedArrivalAt || raw?.metadata?.estimatedArrivalAt;
  const instructions = raw?.paymentInstructions || raw?.metadata?.paymentInstructions;
  const verified = raw?.paymentStatusVerified ?? raw?.metadata?.paymentStatusVerified;

  return PublicActionSchema.parse({
    actionId: raw?.publicId || raw?.actionId,
    providerSlug: raw?.providerSlug,
    providerName: raw?.providerName,
    status: raw?.status,
    paymentStatus: raw?.paymentStatus,
    ...(delivery && raw?.paymentMethod ? { paymentMethod: raw.paymentMethod } : {}),
    ...(delivery && typeof instructions === 'string' && instructions.length <= 500 ? { paymentInstructions: instructions } : {}),
    ...(delivery && typeof verified === 'boolean' ? { paymentStatusVerified: verified } : {}),
    ...(fulfillmentStatus.success && fulfillmentStatus.data ? { fulfillmentStatus: fulfillmentStatus.data } : {}),
    ...(delivery && typeof arrival === 'string' && /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/.test(arrival) ? { estimatedArrivalAt: arrival } : {}),
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
