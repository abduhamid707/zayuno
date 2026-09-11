import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { SystemHealthService } from './system-health.service';
import { ProvidersModule } from '../providers/providers.module';

@Module({
  imports: [ProvidersModule],
  controllers: [AdminController],
  providers: [AdminService, SystemHealthService],
  exports: [AdminService, SystemHealthService],
})
export class AdminModule {}
