import { Module } from '@nestjs/common';
import { ActionsController } from './actions.controller';
import { ActionsService } from './actions.service';
import { ProvidersModule } from '../providers/providers.module';

@Module({
  imports: [ProvidersModule],
  controllers: [ActionsController],
  providers: [ActionsService],
  exports: [ActionsService]
})
export class ActionsModule {}
