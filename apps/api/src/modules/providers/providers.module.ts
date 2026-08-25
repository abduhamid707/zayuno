import { Module } from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { ProviderRegistryService } from './provider-registry.service';
import { ProviderHealthMonitorService } from './provider-health-monitor.service';
import { ProvidersController } from './providers.controller';

@Module({
  controllers: [ProvidersController],
  providers: [ProvidersService, ProviderRegistryService, ProviderHealthMonitorService],
  exports: [ProvidersService, ProviderRegistryService, ProviderHealthMonitorService],
})
export class ProvidersModule {}
