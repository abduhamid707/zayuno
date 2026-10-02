import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@zayuno/database';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { IikoConnectionsService } from './iiko-connections.service';

@ApiTags('iiko provider connection')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/iiko-connections')
export class IikoConnectionsController {
  constructor(private readonly connections: IikoConnectionsService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROVIDER_OWNER, UserRole.PROVIDER_DEVELOPER)
  @ApiOperation({ summary: 'Read redacted iiko connection status for the signed-in provider' })
  status(@Req() req: any) { return this.connections.status(req.user); }

  @Post('discover')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROVIDER_OWNER)
  @ApiOperation({ summary: 'Validate iiko credentials and list restaurants, POS groups and external menus without saving secrets' })
  discover(@Body() body: unknown) { return this.connections.discover(body); }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROVIDER_OWNER)
  @ApiOperation({ summary: 'Connect a restaurant as a draft iiko provider after read-only validation' })
  connect(@Req() req: any, @Body() body: unknown) { return this.connections.connect(req.user, body); }

  @Post('check')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROVIDER_OWNER, UserRole.PROVIDER_DEVELOPER)
  @ApiOperation({ summary: 'Read-only check of the signed-in restaurant connection and menu' })
  check(@Req() req: any) { return this.connections.checkSaved(req.user); }

  @Post(':slug/check')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Read-only administrator check of an iiko provider connection' })
  checkAdmin(@Req() req: any, @Param('slug') slug: string) { return this.connections.checkSaved(req.user, slug); }
}
