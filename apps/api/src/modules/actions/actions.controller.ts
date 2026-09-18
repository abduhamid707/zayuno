import { Controller, Get, Post, Param, Query, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity } from '@nestjs/swagger';
import { ActionsService } from './actions.service';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { CreateActionInput, ActionStatus } from '@zayuno/contracts';
import { projectPublicAction, projectPublicActions } from './public-action-response';

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
    const actions = await this.actionsService.listActions({
      providerSlug,
      status: status as any,
      limit: limit ? parseInt(limit, 10) : 50,
      access: request.user
    });
    return projectPublicActions(actions);
  }

  @Post()
  @ApiOperation({ summary: 'Execute an explicitly confirmed action with idempotency' })
  async createAction(@Body() body: CreateActionInput, @Req() request: any) {
    const headerKey = request.headers['idempotency-key'] as string | undefined;
    const effectiveEnv = body.environment || request.headers['x-zayuno-environment'] || request.headers['x-execution-context'];
    const action = await this.actionsService.createAction({
      ...body,
      environment: effectiveEnv,
      idempotencyKey: body.idempotencyKey || headerKey
    }, request.user?.id);
    return projectPublicAction(action);
  }

  @Get(':actionId')
  @ApiOperation({ summary: 'Get live status and timeline of an action' })
  async getAction(
    @Param('actionId') actionId: string,
    @Query('environment') environment: string,
    @Req() request: any
  ) {
    const effectiveEnv = environment || request.headers['x-zayuno-environment'] || request.headers['x-execution-context'];
    return projectPublicAction(await this.actionsService.getAction({ actionId, environment: effectiveEnv }, request.user));
  }

  @Post(':actionId/cancel')
  @ApiOperation({ summary: 'Cancel an eligible active action' })
  async cancelAction(
    @Param('actionId') actionId: string,
    @Body() body: { reasonCode?: any; reason?: string; environment?: string },
    @Req() request?: any
  ) {
    const effectiveEnv = body?.environment || request?.headers['x-zayuno-environment'] || request?.headers['x-execution-context'];
    return this.actionsService.cancelAction({
      actionId,
      reasonCode: body?.reasonCode || 'CUSTOMER_CANCELLED',
      reason: body?.reason,
      environment: effectiveEnv
    }, request?.user);
  }

  @Get(':actionId/payment-options')
  @ApiOperation({ summary: 'Retrieve provider-supplied checkout URLs and payment options' })
  async getPaymentOptions(
    @Param('actionId') actionId: string,
    @Query('environment') environment: string,
    @Req() request: any
  ) {
    const effectiveEnv = environment || request.headers['x-zayuno-environment'] || request.headers['x-execution-context'];
    return this.actionsService.getPaymentOptions(actionId, request.user, effectiveEnv);
  }
}
