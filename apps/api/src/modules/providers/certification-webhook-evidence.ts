import { ActionStatus } from '@zayuno/contracts';

/** Read only server-normalized evidence from a verified and processed webhook in this run. */
export function certificationWebhookEvidence(logs: any[], providerId: string, actionIds: string[], since: Date) {
  for (const log of logs) {
    const evidence = log.payload?.certificationEvidence;
    if (
      log.providerId !== providerId ||
      log.isVerified !== true ||
      log.isProcessed !== true ||
      !log.signature ||
      new Date(log.createdAt) < since ||
      log.event !== 'action.status_updated' ||
      !evidence?.eventId ||
      !Object.values(ActionStatus).includes(evidence.newStatus)
    ) {
      continue;
    }
    const actionId = [evidence.actionId, evidence.externalActionId].find(id => id && actionIds.includes(id));
    if (actionId) return { eventId: evidence.eventId, actionId, status: evidence.newStatus };
  }
  return null;
}
