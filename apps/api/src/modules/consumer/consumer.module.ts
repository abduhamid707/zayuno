import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ProvidersModule } from "../providers/providers.module";
import { CatalogModule } from "../catalog/catalog.module";
import { QuotesModule } from "../quotes/quotes.module";
import { ActionsModule } from "../actions/actions.module";
import { ConsumerAuthController } from "./auth/consumer-auth.controller";
import { ConsumerAuthService } from "./auth/consumer-auth.service";
import { ConsumerChatController } from "./chat/consumer-chat.controller";
import { ConsumerChatService } from "./chat/consumer-chat.service";
import { ConsumerReportsController } from "./reports/consumer-reports.controller";
import { ConsumerReportsService } from "./reports/consumer-reports.service";
import { ConsumerHistoryController } from "./history/consumer-history.controller";
import { ConsumerHistoryService } from "./history/consumer-history.service";
import { ConsumerMemoryController } from "./memory/consumer-memory.controller";
import { ConsumerMemoryService } from "./memory/consumer-memory.service";

@Module({
  imports: [
    ProvidersModule,
    CatalogModule,
    QuotesModule,
    ActionsModule,
    AuthModule,
  ],
  controllers: [
    ConsumerAuthController,
    ConsumerChatController,
    ConsumerReportsController,
    ConsumerHistoryController,
    ConsumerMemoryController,
  ],
  providers: [
    ConsumerAuthService,
    ConsumerChatService,
    ConsumerReportsService,
    ConsumerHistoryService,
    ConsumerMemoryService,
  ],
  exports: [ConsumerAuthService, ConsumerChatService, ConsumerMemoryService],
})
export class ConsumerModule {}
