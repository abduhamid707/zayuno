import { connect, NatsConnection, JSONCodec } from 'nats';
import { Logger } from '@zayuno/shared';

export class ZayunoBackgroundWorker {
  private nc?: NatsConnection;
  private jc = JSONCodec();
  private logger = new Logger('BackgroundWorker');

  async start() {
    const natsUrl = process.env.NATS_URL || 'nats://localhost:4222';
    try {
      this.nc = await connect({ servers: [natsUrl], maxReconnectAttempts: -1 });
      this.logger.info(`Worker connected to NATS at ${natsUrl}`);

      this.subscribeToTopic('action.*', (topic, data) => {
        this.logger.info(`[WORKER] Processed action event [${topic}] for action: ${data.publicId || data.actionId}`);
      });

      this.subscribeToTopic('payment.*', (topic, data) => {
        this.logger.info(`[WORKER] Processed payment event [${topic}] for action: ${data.publicId || data.actionId}`);
      });

      this.subscribeToTopic('webhook.*', (topic, data) => {
        this.logger.info(`[WORKER] Processed webhook audit for provider: ${data.providerSlug}`);
      });
    } catch (err: any) {
      this.logger.warn(`NATS not available for worker (${err.message}). Worker will idle gracefully in local mode.`);
    }
  }

  private subscribeToTopic(subject: string, handler: (topic: string, data: any) => void) {
    if (!this.nc) return;
    const sub = this.nc.subscribe(subject);
    (async () => {
      for await (const msg of sub) {
        try {
          const data = this.jc.decode(msg.data);
          handler(msg.subject, data);
        } catch (err: any) {
          this.logger.error(`Error processing message on ${msg.subject}: ${err.message}`);
        }
      }
    })();
  }
}
