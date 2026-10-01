import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@zayuno/database';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ConsumerDemandService } from './consumer-demand.service';

@Controller('api/v1/admin/analytics/consumer-demand')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class ConsumerDemandController {
  constructor(private readonly demand: ConsumerDemandService) {}
  @Get()
  report(@Query('from') from?: string, @Query('to') to?: string, @Query('category') category?: string,
    @Query('brand') brand?: string, @Query('city') city?: string, @Query('outcome') outcome?: string) {
    return this.demand.report({ from, to, category, brand, city, outcome });
  }
}
