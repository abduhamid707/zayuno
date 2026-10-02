import { Module } from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { ProviderRegistryService } from './provider-registry.service';
import { ProviderHealthMonitorService } from './provider-health-monitor.service';
import { ProvidersController } from './providers.controller';
import { IikoConnectionsController } from './iiko-connections.controller';
import { IikoConnectionsService } from './iiko-connections.service';

@Module({
  controllers: [ProvidersController, IikoConnectionsController],
  providers: [ProvidersService, ProviderRegistryService, ProviderHealthMonitorService, IikoConnectionsService],
  exports: [ProvidersService, ProviderRegistryService, ProviderHealthMonitorService],
})
export class ProvidersModule {}
