import { Global, Module } from '@nestjs/common';
import { UnmetDemandService } from './unmet-demand.service';
import { ProductAnalyticsService } from './product-analytics.service';
import { ConsumerDemandService } from './consumer-demand.service';
import { ConsumerDemandController } from './consumer-demand.controller';

@Global()
@Module({
  controllers: [ConsumerDemandController],
  providers: [UnmetDemandService, ProductAnalyticsService, ConsumerDemandService],
  exports: [UnmetDemandService, ProductAnalyticsService, ConsumerDemandService],
})
export class AnalyticsModule {}
