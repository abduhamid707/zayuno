import { createHash } from 'crypto';

export interface IdempotencyRecord<T = any> {
  key: string;
  status: 'PENDING' | 'RESOLVED' | 'REJECTED';
  payloadHash?: string;
  response?: T;
  statusCode?: number;
  createdAt: number;
}

export function buildIdempotencyRedisKey(prefix: string, key: string): string {
  return `idempotency:${prefix}:${key}`;
}

/**
 * Produces a deterministic, non-reversible fingerprint for an idempotent
 * request. Object key order is ignored while array order is preserved because
 * a provider may attach meaning to the order of requested line items.
 */
export function createIdempotencyPayloadHash(payload: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(canonicalizeIdempotencyPayload(payload)) || 'null')
    .digest('hex');
}

function canonicalizeIdempotencyPayload(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => canonicalizeIdempotencyPayload(item));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalizeIdempotencyPayload(item)])
    );
  }
  return value;
}
