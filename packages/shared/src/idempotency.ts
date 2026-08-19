export interface IdempotencyRecord<T = any> {
  key: string;
  status: 'PENDING' | 'RESOLVED' | 'REJECTED';
  response?: T;
  statusCode?: number;
  createdAt: number;
}

export function buildIdempotencyRedisKey(prefix: string, key: string): string {
  return `idempotency:${prefix}:${key}`;
}
