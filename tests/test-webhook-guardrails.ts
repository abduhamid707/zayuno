import assert from 'node:assert/strict';
import { prisma } from '../packages/database/src/client.ts';
import { WebhooksService } from '../apps/api/src/modules/webhooks/webhooks.service.ts';

async function main() {
  const original = {
    providerFindUnique: prisma.provider.findUnique,
    webhookLogCreate: prisma.webhookLog.create,
    actionFindFirst: prisma.action.findFirst,
    actionUpdate: prisma.action.update,
    actionEventCreate: prisma.actionEvent.create
  };
  const provider = { id: 'provider-a', slug: 'mock-evos', webhookSecret: 'test-secret' };
  const actionQueries: any[] = [];
  let webhookLogCount = 0;
  let timelineCount = 0;
  let verifiedRawBody = '';
  let lockAvailable = true;

  try {
    (prisma.provider as any).findUnique = async () => provider;
    (prisma.webhookLog as any).create = async () => ({ id: `log-${++webhookLogCount}` });
    (prisma.action as any).findFirst = async ({ where }: any) => {
      actionQueries.push(where);
      return { id: 'action-a', publicId: 'ZY-MOCK-1', status: 'AWAITING_PAYMENT' };
    };
    (prisma.action as any).update = async () => ({});
    (prisma.actionEvent as any).create = async () => { timelineCount++; return {}; };

    const adapter = {
      verifyWebhook: async (_headers: any, raw: string) => { verifiedRawBody = raw; return true; },
      parseWebhookEvent: async () => ({
        eventId: 'evt-once', eventType: 'action.status_updated', providerSlug: 'mock-evos',
        externalActionId: 'external-a', newStatus: 'CONFIRMED', newPaymentStatus: 'PAID',
        timestamp: new Date().toISOString(), description: 'paid', payload: { sandbox: true }
      })
    };
    const service = new WebhooksService(
      { assertAndGetCapability: async () => adapter } as any,
      { publish: async () => undefined } as any,
      {
        acquireLock: async () => {
          const result = lockAvailable;
          lockAvailable = false;
          return result;
        },
        releaseLock: async () => undefined
      } as any
    );

    const body = { eventId: 'evt-once', providerSlug: 'mock-evos', status: 'PAID' };
    const exactRawBody = '{\n  "eventId": "evt-once",\n  "providerSlug": "mock-evos",\n  "status": "PAID"\n}';
    const first = await service.handleProviderWebhook('mock-evos', { 'x-provider-signature': 'valid' }, body, exactRawBody);
    assert.equal(first.processed, true);
    assert.equal(verifiedRawBody, exactRawBody, 'HMAC verification must use original request bytes.');
    assert.equal(actionQueries[0].providerId, provider.id, 'Webhook action lookup must be scoped to its provider.');
    assert.equal(timelineCount, 1);

    const duplicate = await service.handleProviderWebhook('mock-evos', { 'x-provider-signature': 'valid' }, body, exactRawBody);
    assert.equal(duplicate.duplicate, true);
    assert.equal(webhookLogCount, 1, 'Duplicate delivery must not create another audit log.');
    assert.equal(timelineCount, 1, 'Duplicate delivery must not add another timeline event.');
    console.log('Webhook guardrails passed: raw HMAC, provider scoping, and retry deduplication.');
  } finally {
    (prisma.provider as any).findUnique = original.providerFindUnique;
    (prisma.webhookLog as any).create = original.webhookLogCreate;
    (prisma.action as any).findFirst = original.actionFindFirst;
    (prisma.action as any).update = original.actionUpdate;
    (prisma.actionEvent as any).create = original.actionEventCreate;
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
