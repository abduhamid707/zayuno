import { Controller, Post, Param, Headers, Body, BadRequestException, Req } from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';

@ApiTags('Webhooks')
@Controller('api/v1/webhooks')
export class WebhooksController {
  constructor(private webhooksService: WebhooksService) {}

  @Post()
  @ApiOperation({
    summary: 'Universal Inbound Webhook receiver',
    description: 'Receives signed HMAC events where providerSlug is supplied via x-provider header or payload.'
  })
  async handleUniversalWebhook(
    @Headers() headers: Record<string, string>,
    @Body() body: any,
    @Req() request: Request & { rawBody?: Buffer }
  ) {
    const providerSlug = headers['x-provider'] || body?.providerSlug;
    if (!providerSlug) {
      throw new BadRequestException('providerSlug must be provided in x-provider header or request body.');
    }
    return this.webhooksService.handleProviderWebhook(providerSlug, headers, body, request.rawBody?.toString('utf8'));
  }

  @Post(':providerSlug')
  @ApiOperation({
    summary: 'Inbound Webhook receiver from external capability providers',
    description: 'Receives signed HMAC events for action status updates and payment confirmations.'
  })
  async handleProviderWebhook(
    @Param('providerSlug') providerSlug: string,
    @Headers() headers: Record<string, string>,
    @Body() body: any,
    @Req() request: Request & { rawBody?: Buffer }
  ) {
    return this.webhooksService.handleProviderWebhook(providerSlug, headers, body, request.rawBody?.toString('utf8'));
  }

  @Post('providers/:providerSlug')
  @ApiOperation({
    summary: 'Inbound Webhook receiver alias',
    description: 'Receives signed HMAC events for action status updates and payment confirmations.'
  })
  async handleProviderWebhookAlias(
    @Param('providerSlug') providerSlug: string,
    @Headers() headers: Record<string, string>,
    @Body() body: any,
    @Req() request: Request & { rawBody?: Buffer }
  ) {
    return this.webhooksService.handleProviderWebhook(providerSlug, headers, body, request.rawBody?.toString('utf8'));
  }
}
