import { Controller, Get, Post, Param, Query, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity } from '@nestjs/swagger';
import { ActionsService } from './actions.service';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { CreateActionInput, ActionStatus } from '@zayuno/contracts';

@ApiTags('Actions & Fulfillment')
@Controller('api/v1/actions')
@UseGuards(ApiKeyGuard)
@ApiSecurity('api-key')
export class ActionsController {
  constructor(private actionsService: ActionsService) {}

  @Get()
  @ApiOperation({ summary: 'List recent actions across providers' })
  async listActions(
    @Req() request: any,
    @Query('provider') providerSlug?: string,
    @Query('status') status?: ActionStatus,
    @Query('limit') limit?: string
  ) {
    return this.actionsService.listActions({
      providerSlug,
      status: status as any,
      limit: limit ? parseInt(limit, 10) : 50,
      access: request.user
    });
  }

  @Post()
  @ApiOperation({ summary: 'Execute an explicitly confirmed action with idempotency' })
  async createAction(@Body() body: CreateActionInput, @Req() request: any) {
    const headerKey = request.headers['idempotency-key'] as string | undefined;
    return this.actionsService.createAction({
      ...body,
      idempotencyKey: body.idempotencyKey || headerKey
    }, request.user?.id);
  }

  @Get(':actionId')
  @ApiOperation({ summary: 'Get live status and timeline of an action' })
  async getAction(@Param('actionId') actionId: string, @Req() request: any) {
    return this.actionsService.getAction({ actionId }, request.user);
  }

  @Post(':actionId/cancel')
  @ApiOperation({ summary: 'Cancel an eligible active action' })
  async cancelAction(@Param('actionId') actionId: string, @Body() body: { reasonCode?: any; reason?: string }, @Req() request?: any) {
    return this.actionsService.cancelAction({ actionId, reasonCode: body?.reasonCode || 'CUSTOMER_CANCELLED', reason: body?.reason }, request?.user);
  }

  @Get(':actionId/payment-options')
  @ApiOperation({ summary: 'Retrieve provider-supplied checkout URLs and payment options' })
  async getPaymentOptions(@Param('actionId') actionId: string, @Req() request: any) {
    return this.actionsService.getPaymentOptions(actionId, request.user);
  }
}
