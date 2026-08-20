import { Controller, Get, Post, Put, Param, Query, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity, ApiBearerAuth } from '@nestjs/swagger';
import { ProvidersService } from './providers.service';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@zayuno/database';
import {
  ProviderStatus,
  ProviderCapability,
  FindProvidersInput,
  RegisterProviderInput,
  UpdateProviderIntegrationInput
} from '@zayuno/contracts';

@ApiTags('Providers & Developer Onboarding')
@Controller('api/v1/providers')
export class ProvidersController {
  constructor(private providersService: ProvidersService) {}

  @Get()
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('api-key')
  @ApiOperation({ summary: 'List all active registered capability providers' })
  async listProviders(@Query('status') status?: ProviderStatus) {
    return this.providersService.listProviders(status);
  }

  @Get('welcome')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('api-key')
  @ApiOperation({ summary: 'Get customer welcome message with dynamic available service count' })
  async getWelcome() {
    return this.providersService.getWelcomeInfo();
  }

  @Get('find')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('api-key')
  @ApiOperation({ summary: 'Discover and filter capability providers (by category, capability, geography, query)' })
  async findProviders(
    @Query('category') category?: string,
    @Query('capability') capability?: ProviderCapability,
    @Query('geography') geography?: string,
    @Query('query') query?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    return this.providersService.findProviders({
      category,
      capability,
      geography,
      query,
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0
    });
  }

  @Post('find')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('api-key')
  @ApiOperation({ summary: 'Discover capability providers via POST payload' })
  async findProvidersPost(@Body() body: FindProvidersInput) {
    return this.providersService.findProviders(body);
  }

  @Post('register')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROVIDER_OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Self-serve developer onboarding: register a new provider application' })
  async registerProvider(@Body() body: RegisterProviderInput, @Req() request: any) {
    return this.providersService.registerProvider(body, request.user);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROVIDER_OWNER, UserRole.PROVIDER_DEVELOPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the provider application assigned to the authenticated dashboard user' })
  async getMyProvider(@Req() request: any) {
    return this.providersService.getProviderForActor(request.user);
  }

  @Get('me/dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROVIDER_OWNER, UserRole.PROVIDER_DEVELOPER, UserRole.PROVIDER_ANALYST)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Provider-scoped incoming actions and operational metrics' })
  async getMyProviderDashboard(
    @Req() request: any,
    @Query('query') query?: string,
    @Query('status') status?: string,
    @Query('paymentStatus') paymentStatus?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('minTotal') minTotal?: string,
    @Query('maxTotal') maxTotal?: string,
    @Query('sort') sort?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    return this.providersService.getProviderDashboard(request.user, {
      query,
      status,
      paymentStatus,
      from,
      to,
      minTotal,
      maxTotal,
      sort,
      limit,
      offset
    });
  }

  @Get('me/actions/:actionId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROVIDER_OWNER, UserRole.PROVIDER_DEVELOPER, UserRole.PROVIDER_ANALYST)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a provider-scoped action, payment state, cancellation reason, and timeline' })
  async getMyProviderAction(@Param('actionId') actionId: string, @Req() request: any) {
    return this.providersService.getProviderAction(actionId, request.user);
  }

  @Get(':slug')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('api-key')
  @ApiOperation({ summary: 'Get details and metadata for a specific provider' })
  async getProvider(@Param('slug') slug: string) {
    return this.providersService.getProviderBySlug(slug);
  }

  @Get(':slug/credentials')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROVIDER_OWNER, UserRole.PROVIDER_DEVELOPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retrieve sandbox API credentials and webhook secrets' })
  async getCredentials(@Param('slug') slug: string, @Req() request: any) {
    return this.providersService.getProviderCredentials(slug, request.user);
  }

  @Get(':slug/logs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROVIDER_OWNER, UserRole.PROVIDER_DEVELOPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get scoped, redacted integration and webhook logs for the provider' })
  async getProviderLogs(
    @Param('slug') slug: string,
    @Req() request: any,
    @Query('traceId') traceId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    return this.providersService.getProviderLogsBySlug(slug, request.user, {
      traceId,
      from,
      to,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0
    });
  }

  @Get(':slug/capabilities')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('api-key')
  @ApiOperation({ summary: 'Get list of supported capabilities for a provider' })
  async getCapabilities(@Param('slug') slug: string) {
    return this.providersService.getCapabilities(slug);
  }

  @Get(':slug/health')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('api-key')
  @ApiOperation({ summary: 'Run a live health check against a provider integration' })
  async checkHealth(@Param('slug') slug: string) {
    return this.providersService.checkHealth(slug);
  }

  @Get(':slug/locations')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('api-key')
  @ApiOperation({ summary: 'Get operational locations or branches for a provider' })
  async getLocations(
    @Param('slug') slug: string,
    @Query('activeOnly') activeOnly?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string
  ) {
    return this.providersService.getLocations(slug, {
      providerSlug: slug,
      activeOnly: activeOnly !== 'false',
      coordinates: lat && lng ? { latitude: parseFloat(lat), longitude: parseFloat(lng) } : undefined
    });
  }

  @Post(':slug/certify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROVIDER_OWNER, UserRole.PROVIDER_DEVELOPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Run automated capability compliance certification' })
  async certifyProvider(@Param('slug') slug: string, @Req() request: any) {
    return this.providersService.runCertification(slug, request.user);
  }

  @Post(':slug/submit-review')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROVIDER_OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit certified provider integration for platform review' })
  async submitForReview(@Param('slug') slug: string, @Req() request: any) {
    return this.providersService.submitForReview(slug, request.user);
  }

  @Put(':slug/integration')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROVIDER_OWNER, UserRole.PROVIDER_DEVELOPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Configure the authenticated provider integration and invalidate prior certification' })
  async updateIntegration(
    @Param('slug') slug: string,
    @Body() body: UpdateProviderIntegrationInput,
    @Req() request: any
  ) {
    return this.providersService.updateIntegrationSettings(slug, body, request.user);
  }

  @Post(':slug/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish approved provider to live AI agent discovery' })
  async publishProvider(@Param('slug') slug: string) {
    return this.providersService.publishProvider(slug);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a provider (admin/internal)' })
  async createProvider(@Body() body: any) {
    return this.providersService.createProvider(body);
  }

  @Put(':slug')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update provider configuration or metadata' })
  async updateProvider(@Param('slug') slug: string, @Body() body: any) {
    return this.providersService.updateProvider(slug, body);
  }
}
