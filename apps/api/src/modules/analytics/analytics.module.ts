import { Global, Module } from '@nestjs/common';
import { UnmetDemandService } from './unmet-demand.service';
import { ProductAnalyticsService } from './product-analytics.service';

@Global()
@Module({
  providers: [UnmetDemandService, ProductAnalyticsService],
  exports: [UnmetDemandService, ProductAnalyticsService],
})
export class AnalyticsModule {}
