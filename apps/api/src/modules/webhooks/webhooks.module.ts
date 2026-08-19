import { Module } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { WebhooksController } from './webhooks.controller';
import { ProvidersModule } from '../providers/providers.module';
import { NatsService } from '../../common/services/nats.service';

@Module({
  imports: [ProvidersModule],
  controllers: [WebhooksController],
  providers: [WebhooksService, NatsService],
  exports: [WebhooksService],
})
export class WebhooksModule {}
