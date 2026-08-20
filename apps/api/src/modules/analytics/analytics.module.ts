import { Global, Module } from '@nestjs/common';
import { UnmetDemandService } from './unmet-demand.service';

@Global()
@Module({
  providers: [UnmetDemandService],
  exports: [UnmetDemandService],
})
export class AnalyticsModule {}
