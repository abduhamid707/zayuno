import { Controller, Get, Post, Put, Param, Query, Body, UseGuards, BadRequestException, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { ProvidersService } from '../providers/providers.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@zayuno/database';

@ApiTags('Admin Console')
@Controller('api/v1/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
@ApiBearerAuth()
export class AdminController {
  constructor(
    private adminService: AdminService,
    private providersService: ProvidersService
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get live KPI metrics (GMV, orders, latency)' })
  async getDashboard() {
    return this.adminService.getDashboardKpis();
  }

  @Get('actions')
  @ApiOperation({ summary: 'List platform actions for the operations console' })
  async getActions(@Query('limit') limit?: string) {
    return this.adminService.getActions(limit ? parseInt(limit, 10) : 50);
  }

  @Get('providers')
  @ApiOperation({ summary: 'List providers for the operations console, including applications under review' })
  async getProviders(
    @Query('query') query?: string,
    @Query('status') status?: string,
    @Query('reviewStatus') reviewStatus?: string,
    @Query('type') type?: string,
    @Query('capability') capability?: string,
    @Query('category') category?: string,
    @Query('geography') geography?: string,
    @Query('certified') certified?: string,
    @Query('ownerEmail') ownerEmail?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    return this.adminService.getProviders({ query, status, reviewStatus, type, capability, category, geography, certified, ownerEmail, from, to, limit, offset });
  }

  @Get('logs/integration')
  @ApiOperation({ summary: 'Get integration call logs with duration and status' })
  async getIntegrationLogs(
    @Query('limit') limit?: string,
    @Query('traceId') traceId?: string
  ) {
    return this.adminService.getIntegrationLogs(limit ? parseInt(limit, 10) : 50, traceId);
  }

  @Get('logs/webhooks')
  @ApiOperation({ summary: 'Get inbound webhook audit logs' })
  async getWebhookLogs(
    @Query('limit') limit?: string,
    @Query('provider') providerSlug?: string
  ) {
    return this.adminService.getWebhookLogs(limit ? parseInt(limit, 10) : 50, providerSlug);
  }

  @Get('logs/events')
  @ApiOperation({ summary: 'Get redacted integration, webhook, action, and moderation events' })
  async getOperationalEvents(
    @Query('source') source?: string,
    @Query('provider') provider?: string,
    @Query('actionId') actionId?: string,
    @Query('query') query?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string
  ) {
    return this.adminService.getOperationalEvents({ source, provider, actionId, query, from, to, limit });
  }

  @Get('logs/export')
  @ApiOperation({ summary: 'Export a redacted operational support bundle as JSON or CSV' })
  async exportOperationalEvents(
    @Res({ passthrough: true }) response: Response,
    @Query('format') rawFormat?: string,
    @Query('source') source?: string,
    @Query('provider') provider?: string,
    @Query('actionId') actionId?: string,
    @Query('query') query?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string
  ) {
    const format = rawFormat === 'csv' ? 'csv' : 'json';
    const content = await this.adminService.exportOperationalEvents({ source, provider, actionId, query, from, to, limit }, format);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    response.setHeader('Content-Type', format === 'csv' ? 'text/csv; charset=utf-8' : 'application/json; charset=utf-8');
    response.setHeader('Content-Disposition', `attachment; filename="zayuno-support-${timestamp}.${format}"`);
    response.setHeader('Cache-Control', 'no-store');
    return content;
  }

  @Post('providers/:slug/certify')
  @ApiOperation({ summary: 'Run automated provider certification test suite' })
  async certifyProvider(@Param('slug') slug: string) {
    return this.providersService.runCertification(slug, { role: UserRole.SUPER_ADMIN });
  }

  @Post('providers/:slug/publish')
  @ApiOperation({ summary: 'Approve a certified provider application and publish it to discovery' })
  async publishProvider(@Param('slug') slug: string) {
    return this.providersService.publishProvider(slug);
  }

  @Post('providers/:slug/review')
  @ApiOperation({ summary: 'Request changes, reject, or suspend a provider with a structured and auditable reason' })
  async reviewProvider(@Param('slug') slug: string, @Body() body: {
    decision: 'REQUEST_CHANGES' | 'REJECT' | 'SUSPEND';
    reasonCode: string;
    reason: string;
    requiredChanges?: string[];
    internalNote?: string;
  }) {
    if (!['REQUEST_CHANGES', 'REJECT', 'SUSPEND'].includes(body.decision)) throw new BadRequestException('Invalid review decision.');
    return this.providersService.reviewProvider(slug, body);
  }

  @Post('providers/:slug/reopen')
  @ApiOperation({ summary: 'Reopen a rejected or suspended provider application for corrections' })
  async reopenProvider(@Param('slug') slug: string) {
    return this.providersService.reopenProvider(slug);
  }

  @Post('providers')
  @ApiOperation({ summary: 'Create new provider with encrypted credentials' })
  async createProvider(@Body() body: any) {
    return this.providersService.createProvider(body);
  }

  @Post('providers/onboard')
  @ApiOperation({ summary: 'Create a DRAFT provider application and its provider-owner login' })
  async onboardProvider(@Body() body: any) {
    return this.providersService.adminOnboardProvider(body);
  }

  @Put('providers/:slug')
  @ApiOperation({ summary: 'Update provider status, credentials, and settings' })
  async updateProvider(@Param('slug') slug: string, @Body() body: any) {
    return this.providersService.updateProvider(slug, body);
  }
}
