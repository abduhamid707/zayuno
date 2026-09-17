import assert from 'node:assert/strict';
import { prisma } from '../packages/database/src/client.ts';
import { toPublicPaymentOption } from '../packages/shared/src/public-payment-option.ts';
import { ActionsService } from '../apps/api/src/modules/actions/actions.service.ts';
import { ZAYUNO_MCP_TOOLS } from '../apps/mcp/src/tools.ts';

const paymentKeys = [
  'checkoutUrl', 'id', 'instructions', 'isOnline', 'isSandbox', 'name',
  'qrCodeUrl', 'supportedCurrencies', 'type'
].sort();

const cancelKeys = [
  'actionId', 'externalActionId', 'message', 'newStatus', 'previousStatus',
  'refundInitiated', 'success'
].sort();

function dirtyPaymentOption() {
  return {
    id: 'payme-sandbox',
    name: 'Payme test checkout',
    type: 'PAYME',
    isOnline: true,
    checkoutUrl: 'https://checkout.sandbox.example/pay/abc',
    qrCodeUrl: 'https://checkout.sandbox.example/qr/abc',
    instructions: 'Complete payment on the secure checkout page.',
    supportedCurrencies: ['UZS'],
    metadata: { apiKey: 'provider-secret', sandbox: true, reconciliationId: 'internal-reconciliation' },
    adapterDebug: 'private-adapter-debug',
    providerToken: 'provider-token'
  };
}

function assertPublicPaymentOption(option: any) {
  assert.deepEqual(Object.keys(option).sort(), paymentKeys);
  assert.equal(option.isSandbox, true, 'Sandbox warning must survive public projection.');
  assert.doesNotMatch(JSON.stringify(option), /provider-secret|internal-reconciliation|private-adapter-debug|provider-token/);
}

async function main() {
  assertPublicPaymentOption(toPublicPaymentOption(dirtyPaymentOption()));

  const original = {
    actionFindFirst: prisma.action.findFirst,
    actionUpdate: prisma.action.update,
    actionEventCreate: prisma.actionEvent.create
  };

  try {
    let storedAction: any = {
      id: 'db-action-private-id',
      publicId: 'ZY-ACT-PUBLIC-002',
      externalActionId: 'provider-action-private-id',
      status: 'AWAITING_PAYMENT',
      provider: { slug: 'dirty-adapter' }
    };
    (prisma.action as any).findFirst = async () => storedAction;
    (prisma.action as any).update = async () => {
      storedAction.status = 'CANCELLED';
      return storedAction;
    };
    (prisma.actionEvent as any).create = async () => ({});

    const service = new ActionsService(
      {
        assertAndGetCapability: async () => ({
          cancelAction: async () => ({
            success: true,
            actionId: 'provider-rewritten-id',
            externalActionId: 'provider-action-private-id',
            previousStatus: 'AWAITING_PAYMENT',
            newStatus: 'CANCELLED',
            message: 'Cancelled',
            refundInitiated: false,
            metadata: { apiKey: 'cancel-provider-secret' },
            adapterDebug: 'cancel-private-debug'
          }),
          getPaymentOptions: async () => [dirtyPaymentOption()]
        })
      } as any,
      { publish: async () => undefined } as any,
      {} as any
    );

    const cancelled = await service.cancelAction({ actionId: storedAction.publicId });
    assert.deepEqual(Object.keys(cancelled).sort(), cancelKeys);
    assert.equal(cancelled.actionId, 'ZY-ACT-PUBLIC-002');
    assert.equal(cancelled.externalActionId, 'provider-action-private-id');
    assert.doesNotMatch(JSON.stringify(cancelled), /cancel-provider-secret|cancel-private-debug|provider-rewritten-id/);

    storedAction = {
      id: 'db-payment-private-id',
      publicId: 'ZY-ACT-PUBLIC-003',
      externalActionId: 'provider-payment-private-id',
      status: 'AWAITING_PAYMENT',
      provider: { slug: 'dirty-adapter' }
    };
    const apiOptions = await service.getPaymentOptions(storedAction.publicId);
    assert.equal(apiOptions.length, 1);
    assertPublicPaymentOption(apiOptions[0]);

    const paymentTool = ZAYUNO_MCP_TOOLS.find((tool) => tool.name === 'get_payment_options');
    assert.ok(paymentTool, 'MCP payment option tool must be registered.');
    const mcpResult = await paymentTool.handler(
      { actionId: 'ZY-ACT-PUBLIC-003' },
      { getPaymentOptions: async () => ({ paymentOptions: [dirtyPaymentOption()], debug: 'mcp-private-debug' }) } as any
    );
    assert.deepEqual(Object.keys(mcpResult).sort(), ['customerMessage', 'paymentOptions']);
    assert.equal(mcpResult.paymentOptions.length, 1);
    assertPublicPaymentOption(mcpResult.paymentOptions[0]);
    assert.doesNotMatch(JSON.stringify(mcpResult), /mcp-private-debug|provider-secret|internal-reconciliation/);
    assert.match(mcpResult.customerMessage, /sinov checkout/i, 'Sandbox checkout must still be labeled as a test payment.');
  } finally {
    (prisma.action as any).findFirst = original.actionFindFirst;
    (prisma.action as any).update = original.actionUpdate;
    (prisma.actionEvent as any).create = original.actionEventCreate;
  }

  console.log('Public cancel and payment option DTO boundaries passed.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
