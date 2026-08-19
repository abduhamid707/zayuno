import { ActionStatus, PaymentStatus } from '@zayuno/database';

const TERMINAL_STATUSES = new Set<ActionStatus>([
  ActionStatus.COMPLETED,
  ActionStatus.CANCELLED,
  ActionStatus.FAILED
]);

const ALLOWED_TRANSITIONS: Record<ActionStatus, ReadonlySet<ActionStatus>> = {
  [ActionStatus.DRAFT]: new Set([ActionStatus.PENDING_CONFIRMATION, ActionStatus.SUBMITTED, ActionStatus.CANCELLED, ActionStatus.FAILED]),
  [ActionStatus.PENDING_CONFIRMATION]: new Set([ActionStatus.SUBMITTED, ActionStatus.CANCELLED, ActionStatus.FAILED]),
  [ActionStatus.AWAITING_PAYMENT]: new Set([ActionStatus.SUBMITTED, ActionStatus.ACCEPTED, ActionStatus.CANCELLED, ActionStatus.FAILED]),
  [ActionStatus.SUBMITTED]: new Set([ActionStatus.AWAITING_PAYMENT, ActionStatus.ACCEPTED, ActionStatus.IN_PROGRESS, ActionStatus.CANCELLED, ActionStatus.FAILED]),
  [ActionStatus.ACCEPTED]: new Set([ActionStatus.IN_PROGRESS, ActionStatus.READY, ActionStatus.FULFILLING, ActionStatus.COMPLETED, ActionStatus.CANCELLED, ActionStatus.FAILED]),
  [ActionStatus.IN_PROGRESS]: new Set([ActionStatus.READY, ActionStatus.FULFILLING, ActionStatus.COMPLETED, ActionStatus.CANCELLED, ActionStatus.FAILED]),
  [ActionStatus.READY]: new Set([ActionStatus.FULFILLING, ActionStatus.COMPLETED, ActionStatus.CANCELLED, ActionStatus.FAILED]),
  [ActionStatus.FULFILLING]: new Set([ActionStatus.COMPLETED, ActionStatus.FAILED]),
  [ActionStatus.COMPLETED]: new Set(),
  [ActionStatus.CANCELLED]: new Set(),
  [ActionStatus.FAILED]: new Set()
};

export function isTerminalActionStatus(status: ActionStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

/** Idempotent repeats are allowed; reopening a terminal action never is. */
export function canTransitionAction(current: ActionStatus, next: ActionStatus): boolean {
  return current === next || ALLOWED_TRANSITIONS[current].has(next);
}

export function canApplyPaymentStatus(currentActionStatus: ActionStatus, currentPaymentStatus: PaymentStatus, nextPaymentStatus: PaymentStatus): boolean {
  if (currentPaymentStatus === nextPaymentStatus) return true;
  if (isTerminalActionStatus(currentActionStatus)) return false;
  if (currentPaymentStatus === PaymentStatus.PAID) return nextPaymentStatus === PaymentStatus.REFUNDED;
  if (currentPaymentStatus === PaymentStatus.REFUNDED) return false;
  return true;
}
