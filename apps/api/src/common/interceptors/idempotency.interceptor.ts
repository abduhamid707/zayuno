import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RedisService } from '../services/redis.service';
import {
  buildIdempotencyRedisKey,
  createIdempotencyPayloadHash,
  IdempotencyError,
  IdempotencyPayloadConflictError
} from '@zayuno/shared';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly redisService: RedisService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();

    if (req.method !== 'POST' && req.method !== 'PUT') {
      return next.handle();
    }

    const idempotencyKey =
      (req.headers['idempotency-key'] as string) ||
      (req.headers['x-idempotency-key'] as string) ||
      req.body?.idempotencyKey;

    if (!idempotencyKey) {
      return next.handle();
    }

    const redisKey = buildIdempotencyRedisKey(req.path, idempotencyKey);
    const payloadHash = createIdempotencyPayloadHash({
      body: req.body || {},
      query: req.query || {}
    });
    const cachedRecordStr = await this.redisService.get(redisKey);

    if (cachedRecordStr) {
      try {
        const cached = JSON.parse(cachedRecordStr);
        if (cached.payloadHash !== payloadHash) {
          throw new IdempotencyPayloadConflictError();
        }
        if (cached.status === 'PENDING') {
          throw new IdempotencyError();
        }

        if (cached.status === 'RESOLVED') {
          res.setHeader('x-idempotent-replay', 'true');
          res.status(cached.statusCode || 200);
          return of(cached.response);
        }
      } catch (err: any) {
        if (err instanceof IdempotencyError || err instanceof IdempotencyPayloadConflictError) throw err;
      }
    }

    // Set status as PENDING in Redis for 30s
    await this.redisService.set(
      redisKey,
      JSON.stringify({
        status: 'PENDING',
        payloadHash,
        createdAt: Date.now()
      }),
      30
    );

    return next.handle().pipe(
      tap({
        next: async (responseBody) => {
          await this.redisService.set(
            redisKey,
            JSON.stringify({
              status: 'RESOLVED',
              payloadHash,
              statusCode: res.statusCode || 200,
              response: responseBody,
              createdAt: Date.now()
            }),
            86400 // Cache for 24 hours
          );
        },
        error: async () => {
          // If execution failed with error, remove pending lock so user can retry
          await this.redisService.del(redisKey);
        }
      })
    );
  }
}
