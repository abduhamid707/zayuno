import assert from 'node:assert/strict';
import { PaymentStatus } from '../packages/contracts/src/action.ts';
import { canApplyPaymentStatus, canTransitionAction, isTerminalActionStatus } from '../apps/api/src/common/action-state-machine.ts';

assert.equal(isTerminalActionStatus('CANCELLED' as any), true);
assert.equal(canTransitionAction('AWAITING_PAYMENT' as any, 'ACCEPTED' as any), true);
assert.equal(canTransitionAction('CANCELLED' as any, 'ACCEPTED' as any), false);
assert.equal(canTransitionAction('COMPLETED' as any, 'CANCELLED' as any), false);
assert.equal(canApplyPaymentStatus('AWAITING_PAYMENT' as any, PaymentStatus.PENDING as any, PaymentStatus.PAID as any), true);
assert.equal(canApplyPaymentStatus('CANCELLED' as any, PaymentStatus.PENDING as any, PaymentStatus.PAID as any), false);
console.log('Action state machine passed: terminal actions cannot be reopened or paid.');
