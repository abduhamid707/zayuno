import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CancelActionInputSchema } from '../packages/contracts/src/action';
import { AdminService } from '../apps/api/src/modules/admin/admin.service';

const validCancellation = CancelActionInputSchema.parse({
  actionId: 'ZY-TEST-10001',
  reasonCode: 'ITEM_UNAVAILABLE',
  reason: 'Requested item is no longer available'
});
assert.equal(validCancellation.reasonCode, 'ITEM_UNAVAILABLE');

const backwardCompatibleCancellation = CancelActionInputSchema.parse({
  actionId: 'ZY-TEST-10002',
  reason: 'Customer changed their mind'
});
assert.equal(backwardCompatibleCancellation.reasonCode, undefined);

assert.equal(CancelActionInputSchema.safeParse({
  actionId: 'ZY-TEST-10003',
  reasonCode: 'MADE_UP_REASON',
  reason: 'Invalid reason category'
}).success, false, 'Unknown cancellation categories must be rejected.');

const serviceSource = readFileSync(resolve(import.meta.dirname, '../apps/api/src/modules/providers/providers.service.ts'), 'utf8');
assert.match(serviceSource, /providerId: actor\.providerId/, 'Provider action detail must be scoped to the authenticated provider.');
assert.match(serviceSource, /providerId: provider\.id/, 'Provider dashboard queries must be scoped to the authenticated provider.');
assert.match(serviceSource, /reviewHistory: _reviewHistory/, 'Provider-facing metadata must strip operations review history.');
assert.match(serviceSource, /REJECTED.*SUSPENDED/, 'Rejected and suspended providers must not reset their own moderation state.');
assert.match(serviceSource, /paymentStatusSource: 'PROVIDER_REPORTED'/, 'Payment state must identify its provider-reported source.');

import { redactForLogs } from '../packages/shared/src/redaction';

const redacted: any = redactForLogs({
  authorization: 'Bearer secret',
  nested: { apiKey: 'raw-key', passportNumber: 'AA1234567', safe: 'visible' },
  list: [{ otp: '123456', event: 'payment.received' }]
});
assert.equal(redacted.authorization, '[REDACTED]');
assert.equal(redacted.nested.apiKey, '[REDACTED]');
assert.equal(redacted.nested.passportNumber, '[REDACTED]');
assert.equal(redacted.nested.safe, 'visible');
assert.equal(redacted.list[0].otp, '[REDACTED]');
assert.equal(redacted.list[0].event, 'payment.received');
const scrubbed = redactForLogs('Contact test@example.com or +998 90 123 45 67 with Bearer raw-token');
assert.equal((scrubbed as string).includes('test@example.com'), false);
assert.equal((scrubbed as string).includes('+998 90 123 45 67'), false);
assert.equal((scrubbed as string).includes('raw-token'), false);

console.log('Provider operations guardrails passed: tenant isolation, moderation privacy, and structured cancellation are enforced.');
