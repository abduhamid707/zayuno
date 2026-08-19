import { Module } from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { ProviderRegistryService } from './provider-registry.service';
import { ProvidersController } from './providers.controller';

@Module({
  controllers: [ProvidersController],
  providers: [ProvidersService, ProviderRegistryService],
  exports: [ProvidersService, ProviderRegistryService],
})
export class ProvidersModule {}
