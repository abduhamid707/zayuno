import { Global, Module } from '@nestjs/common';
import { RedisService } from './services/redis.service';
import { NatsService } from './services/nats.service';

@Global()
@Module({
  providers: [RedisService, NatsService],
  exports: [RedisService, NatsService]
})
export class CommonModule {}
