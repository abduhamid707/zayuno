import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthModule } from './modules/auth/auth.module';
import { ProvidersModule } from './modules/providers/providers.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { QuotesModule } from './modules/quotes/quotes.module';
import { ActionsModule } from './modules/actions/actions.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { AdminModule } from './modules/admin/admin.module';
import { PublicPagesModule } from './modules/public-pages/public-pages.module';
import { RedisService } from './common/services/redis.service';
import { NatsService } from './common/services/nats.service';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

import { CommonModule } from './common/common.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    CommonModule,
    AuthModule,
    ProvidersModule,
    CatalogModule,
    QuotesModule,
    ActionsModule,
    PaymentsModule,
    WebhooksModule,
    AdminModule,
    PublicPagesModule,
  ],
  providers: [
    RedisService,
    NatsService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
  exports: [RedisService, NatsService],
})
export class AppModule {}
