import { Module } from '@nestjs/common';
import { DeveloperSandboxController } from './developer-sandbox.controller';
import { DeveloperSandboxService } from './developer-sandbox.service';
import { QuotesModule } from '../quotes/quotes.module';
import { ActionsModule } from '../actions/actions.module';

@Module({
  imports: [QuotesModule, ActionsModule],
  controllers: [DeveloperSandboxController],
  providers: [DeveloperSandboxService],
  exports: [DeveloperSandboxService]
})
export class DeveloperSandboxModule {}
