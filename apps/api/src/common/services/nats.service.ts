import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { connect, NatsConnection, JSONCodec, JetStreamClient } from 'nats';
import { Logger } from '@zayuno/shared';
import { ZayunoEventTopic } from '@zayuno/event-schemas';

@Injectable()
export class NatsService implements OnModuleInit, OnModuleDestroy {
  private nc?: NatsConnection;
  private js?: JetStreamClient;
  private jc = JSONCodec();
  private logger = new Logger('NatsService');

  async onModuleInit() {
    const natsUrl = process.env.NATS_URL || 'nats://localhost:4222';
    try {
      this.nc = await connect({ servers: [natsUrl], maxReconnectAttempts: 10 });
      this.js = this.nc.jetstream();
      this.logger.info(`Connected to NATS JetStream at ${natsUrl}`);
    } catch (err: any) {
      this.logger.warn(`NATS not available at startup (${err.message}). Events will be recorded in database.`);
    }
  }

  async onModuleDestroy() {
    if (this.nc) {
      await this.nc.drain();
    }
  }

  async publishEvent(topic: ZayunoEventTopic | string, payload: any): Promise<void> {
    try {
      if (this.js) {
        await this.js.publish(topic, this.jc.encode(payload));
      } else if (this.nc) {
        this.nc.publish(topic, this.jc.encode(payload));
      } else {
        this.logger.debug(`[Event Emitted (Local fallback)]: ${topic}`);
      }
    } catch (err: any) {
      this.logger.warn(`Failed to publish event ${topic}: ${err.message}`);
    }
  }

  async publish(topic: ZayunoEventTopic | string, payload: any): Promise<void> {
    return this.publishEvent(topic, payload);
  }
}
