import { Module } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { WebhooksController } from './webhooks.controller';
import { ProvidersModule } from '../providers/providers.module';
import { NatsService } from '../../common/services/nats.service';
import { CatalogModule } from '../catalog/catalog.module';

@Module({
  imports: [ProvidersModule, CatalogModule],
  controllers: [WebhooksController],
  providers: [WebhooksService, NatsService],
  exports: [WebhooksService]
})
export class WebhooksModule {}
