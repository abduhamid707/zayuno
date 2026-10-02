import assert from 'node:assert/strict';
import { ActionsService } from '../apps/api/src/modules/actions/actions.service.ts';
import { ActionStatus } from '../packages/contracts/src/action.ts';
import { ProviderCapability } from '../packages/contracts/src/provider.ts';
import { ZayunoEventTopic } from '../packages/event-schemas/src/events.ts';
import { prisma } from '../packages/database/src/client.ts';

const DbActionStatus = {
  IN_PROGRESS: 'IN_PROGRESS',
  CANCELLED: 'CANCELLED'
} as const;

async function main() {
  console.log('Testing ActionsService.cancelAction guardrails...');

  // Track database and event calls
  let updateCalls: any[] = [];
  let eventCalls: any[] = [];
  let natsPublishCalls: any[] = [];

  // Mock prisma
  const originalFindFirst = prisma.action.findFirst.bind(prisma);
  const originalUpdate = prisma.action.update.bind(prisma);
  const originalEventCreate = prisma.actionEvent.create.bind(prisma);

  const mockAction = {
    id: 'act_test_123',
    publicId: 'act_pub_123',
    externalActionId: 'ext_order_123',
    status: DbActionStatus.IN_PROGRESS,
    provider: {
      id: 'prov_123',
      slug: 'iiko-test-provider',
      environment: 'LIVE'
    }
  };

  (prisma.action as any).findFirst = async () => mockAction;
  (prisma.action as any).update = async (args: any) => {
    updateCalls.push(args);
    return { ...mockAction, ...args.data };
  };
  (prisma.actionEvent as any).create = async (args: any) => {
    eventCalls.push(args);
    return { id: 'evt_123', ...args.data };
  };

  const mockNatsService = {
    publish: async (topic: string, payload: any) => {
      natsPublishCalls.push({ topic, payload });
    }
  };

  // Mock adapter
  let adapterCancelResult: any = null;
  const mockAdapter = {
    cancelAction: async () => adapterCancelResult
  };

  const mockRegistry = {
    assertAndGetCapability: async () => mockAdapter,
    getAdapter: async () => mockAdapter
  };

  const service = new ActionsService(
    mockRegistry as any,
    mockNatsService as any,
    undefined,
    undefined
  );

  try {
    // -------------------------------------------------------------
    // Test 1: Adapter returns InProgress (success: false)
    // -------------------------------------------------------------
    adapterCancelResult = {
      success: false,
      actionId: 'ext_order_123',
      externalActionId: 'ext_order_123',
      previousStatus: ActionStatus.PROCESSING,
      newStatus: ActionStatus.PROCESSING,
      message: 'iiko cancellation command is InProgress; order cancellation not yet confirmed',
      refundInitiated: false
    };

    updateCalls = [];
    natsPublishCalls = [];
    eventCalls = [];

    const inProgressResult = await service.cancelAction({
      actionId: 'act_pub_123',
      reason: 'Customer changed mind'
    });

    assert.equal(inProgressResult.success, false, 'Result must have success: false');
    assert.equal(inProgressResult.newStatus, ActionStatus.PROCESSING, 'Result must retain PROCESSING status');
    assert.equal(updateCalls.length, 0, 'Database action MUST NOT be updated to CANCELLED');
    assert.equal(
      natsPublishCalls.filter((c) => c.topic === ZayunoEventTopic.ACTION_CANCELLED).length,
      0,
      'ACTION_CANCELLED event MUST NOT be published to NATS'
    );
    assert.equal(eventCalls.length, 1, 'AuditEvent must be recorded');
    assert.ok(
      eventCalls[0].data.description.includes('Action cancellation requested'),
      'AuditEvent description must indicate cancellation requested'
    );
    assert.equal(eventCalls[0].data.status, DbActionStatus.IN_PROGRESS, 'AuditEvent must preserve action status');

    console.log('  ✓ InProgress cancellation does not modify DB status or emit ACTION_CANCELLED');

    // -------------------------------------------------------------
    // Test 2: Adapter returns orderFetchError / status not verified
    // -------------------------------------------------------------
    adapterCancelResult = {
      success: false,
      actionId: 'ext_order_123',
      externalActionId: 'ext_order_123',
      previousStatus: ActionStatus.PROCESSING,
      newStatus: ActionStatus.PROCESSING,
      message: 'Cancellation command dispatched, but order status could not be verified: network error',
      refundInitiated: false
    };

    updateCalls = [];
    natsPublishCalls = [];

    const fetchErrorResult = await service.cancelAction({
      actionId: 'act_pub_123',
      reason: 'Customer changed mind'
    });

    assert.equal(fetchErrorResult.success, false);
    assert.equal(fetchErrorResult.newStatus, ActionStatus.PROCESSING);
    assert.equal(updateCalls.length, 0, 'Database MUST NOT be updated on unverified status');
    assert.equal(natsPublishCalls.length, 0, 'NATS event MUST NOT be published on unverified status');

    console.log('  ✓ Unverified status does not modify DB status or emit ACTION_CANCELLED');

    // -------------------------------------------------------------
    // Test 3: Adapter confirms cancellation (success: true, CANCELLED)
    // -------------------------------------------------------------
    adapterCancelResult = {
      success: true,
      actionId: 'ext_order_123',
      externalActionId: 'ext_order_123',
      previousStatus: ActionStatus.PROCESSING,
      newStatus: ActionStatus.CANCELLED,
      message: 'Delivery order cancelled successfully in iiko',
      refundInitiated: false
    };

    updateCalls = [];
    natsPublishCalls = [];

    const confirmedResult = await service.cancelAction({
      actionId: 'act_pub_123',
      reason: 'Customer changed mind'
    });

    assert.equal(confirmedResult.success, true);
    assert.equal(confirmedResult.newStatus, ActionStatus.CANCELLED);
    assert.equal(updateCalls.length, 1, 'Database MUST be updated when cancellation is confirmed');
    assert.equal(updateCalls[0].data.status, DbActionStatus.CANCELLED);
    assert.equal(natsPublishCalls.length, 1, 'ACTION_CANCELLED event MUST be published when confirmed');
    assert.equal(natsPublishCalls[0].topic, ZayunoEventTopic.ACTION_CANCELLED);

    console.log('  ✓ Confirmed cancellation properly updates DB and emits ACTION_CANCELLED');

    console.log('\nAll ActionsService.cancelAction guardrail tests passed successfully!\n');
  } finally {
    // Restore mocks
    (prisma.action as any).findFirst = originalFindFirst;
    (prisma.action as any).update = originalUpdate;
    (prisma.actionEvent as any).create = originalEventCreate;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
