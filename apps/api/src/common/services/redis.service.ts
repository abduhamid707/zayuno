import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { Logger } from '@zayuno/shared';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client!: Redis;
  private logger = new Logger('RedisService');

  onModuleInit() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.client = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        return Math.min(times * 100, 3000);
      }
    });

    this.client.on('connect', () => {
      this.logger.info('Connected to Redis');
    });

    this.client.on('error', (err) => {
      this.logger.warn(`Redis connection warning: ${err.message}`);
    });
  }

  onModuleDestroy() {
    if (this.client) {
      this.client.disconnect();
    }
  }

  getClient(): Redis {
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      if (ttlSeconds) {
        await this.client.set(key, value, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, value);
      }
    } catch (err: any) {
      this.logger.warn(`Redis set error: ${err.message}`);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (err: any) {
      this.logger.warn(`Redis del error: ${err.message}`);
    }
  }

  /**
   * Acquire a distributed lock. Returns true if acquired.
   */
  async acquireLock(lockKey: string, ttlSeconds = 10): Promise<boolean> {
    try {
      const res = await this.client.set(`lock:${lockKey}`, '1', 'EX', ttlSeconds, 'NX');
      return res === 'OK';
    } catch {
      return true; // Fallback gracefully if Redis is momentarily unavailable
    }
  }

  async releaseLock(lockKey: string): Promise<void> {
    try {
      await this.client.del(`lock:${lockKey}`);
    } catch {}
  }
}
