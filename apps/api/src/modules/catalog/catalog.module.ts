import { Module } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { CatalogController } from './catalog.controller';
import { ProvidersModule } from '../providers/providers.module';
import { RedisService } from '../../common/services/redis.service';

@Module({
  imports: [ProvidersModule],
  controllers: [CatalogController],
  providers: [CatalogService, RedisService],
  exports: [CatalogService],
})
export class CatalogModule {}
