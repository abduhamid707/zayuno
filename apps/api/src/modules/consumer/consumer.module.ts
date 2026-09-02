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

@Module({
  imports: [
    ProvidersModule,
    CatalogModule,
    QuotesModule,
    ActionsModule,
    AuthModule,
  ],
  controllers: [ConsumerAuthController, ConsumerChatController],
  providers: [ConsumerAuthService, ConsumerChatService],
  exports: [ConsumerAuthService, ConsumerChatService],
})
export class ConsumerModule {}
