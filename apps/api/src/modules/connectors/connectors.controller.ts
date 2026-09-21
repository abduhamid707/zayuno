import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
  BadRequestException
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ConnectorsService } from './connectors.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@zayuno/database';
import {
  ConnectorAuthTestInput,
  CreateConnectorInstanceInput,
  RotateConnectorCredentialInput
} from '@zayuno/contracts';

@ApiTags('Managed Connectors (Uzum, 1-Click Platform Integrations)')
@Controller('api/v1/connectors')
export class ConnectorsController {
  constructor(private connectorsService: ConnectorsService) {}

  @Get('definitions')
  @ApiOperation({ summary: 'List all available managed platform connectors (e.g. Uzum Market)' })
  async getDefinitions() {
    return this.connectorsService.getDefinitions();
  }

  @Post('test-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROVIDER_OWNER, UserRole.PROVIDER_DEVELOPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Test external platform API key without persisting credentials' })
  async testAuth(@Body() body: ConnectorAuthTestInput) {
    return this.connectorsService.testAuth(body.connectorDefinitionId, body.apiKey);
  }

  @Post('shops')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROVIDER_OWNER, UserRole.PROVIDER_DEVELOPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Fetch merchant stores associated with external platform API key' })
  async getShops(@Body() body: ConnectorAuthTestInput) {
    return this.connectorsService.getShops(body.connectorDefinitionId, body.apiKey);
  }

  @Post('instances')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROVIDER_OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Connect an external platform store to provider via managed connector' })
  async createInstance(@Body() body: CreateConnectorInstanceInput, @Req() req: any) {
    return this.connectorsService.createInstance(req.user, body);
  }

  @Get('instances')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROVIDER_OWNER, UserRole.PROVIDER_DEVELOPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List connected platform instances for provider' })
  async listInstances(@Query('providerSlug') providerSlug: string, @Req() req: any) {
    return this.connectorsService.listInstances(req.user, providerSlug);
  }

  @Get('instances/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROVIDER_OWNER, UserRole.PROVIDER_DEVELOPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get connector instance details, sync metrics, and health' })
  async getInstance(@Param('id') id: string, @Req() req: any) {
    return this.connectorsService.getInstance(req.user, id);
  }

  @Post('instances/:id/sync')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROVIDER_OWNER, UserRole.PROVIDER_DEVELOPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Trigger an immediate on-demand catalog synchronization' })
  async syncInstance(@Param('id') id: string, @Req() req: any) {
    // Verify instance ownership first
    await this.connectorsService.getInstance(req.user, id);
    const result = await this.connectorsService.syncInstance(id, 'MANUAL');
    if (!result.success) {
      throw new BadRequestException(result.message || 'Sinxronlash muvaffaqiyatsiz bo‘ldi.');
    }
    return result;
  }

  @Put('instances/:id/credential')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROVIDER_OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rotate or update external platform API key' })
  async rotateCredential(
    @Param('id') id: string,
    @Body() body: RotateConnectorCredentialInput,
    @Req() req: any
  ) {
    return this.connectorsService.rotateCredential(req.user, id, body.apiKey);
  }

  @Delete('instances/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROVIDER_OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disconnect store and hide synced offerings from search' })
  async disconnectInstance(@Param('id') id: string, @Req() req: any) {
    return this.connectorsService.disconnectInstance(req.user, id);
  }

  @Get('instances/:id/preview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROVIDER_OWNER, UserRole.PROVIDER_DEVELOPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Preview synced catalog offerings for instance' })
  async previewCatalog(
    @Param('id') id: string,
    @Query('limit') limit: string,
    @Req() req: any
  ) {
    return this.connectorsService.previewCatalog(req.user, id, limit ? parseInt(limit, 10) : 50);
  }
}
