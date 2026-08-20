import { Controller, Post, Get, Body, Param, Headers, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { DeveloperSandboxService } from './developer-sandbox.service';
import { extractClientIp } from './client-ip.util';
import { RequestQuoteInput, CreateActionInput } from '@zayuno/contracts';

@ApiTags('Developer Sandbox Simulator')
@Controller('api/v1/developer/sandbox')
export class DeveloperSandboxController {
  constructor(private sandboxService: DeveloperSandboxService) {}

  @Post('session')
  @ApiOperation({ summary: 'Create a temporary signed developer simulator session for sandbox-provider' })
  async createSession(@Req() req: any) {
    const clientIp = extractClientIp(req);
    return this.sandboxService.createSession(clientIp);
  }

  @Post('quote')
  @ApiOperation({ summary: 'Calculate quote inside the developer sandbox simulator' })
  @ApiHeader({ name: 'x-simulator-session', required: true, description: 'Signed simulator session token' })
  async requestQuote(
    @Body() body: RequestQuoteInput,
    @Headers('x-simulator-session') sessionToken?: string
  ) {
    return this.sandboxService.requestQuote(body, sessionToken);
  }

  @Post('action')
  @ApiOperation({ summary: 'Create action inside the developer sandbox simulator' })
  @ApiHeader({ name: 'x-simulator-session', required: true, description: 'Signed simulator session token' })
  async createAction(
    @Body() body: CreateActionInput,
    @Headers('x-simulator-session') sessionToken?: string
  ) {
    return this.sandboxService.createAction(body, sessionToken);
  }

  @Get('action/:actionId')
  @ApiOperation({ summary: 'Get action status inside the developer sandbox simulator' })
  @ApiHeader({ name: 'x-simulator-session', required: true, description: 'Signed simulator session token' })
  async getAction(
    @Param('actionId') actionId: string,
    @Headers('x-simulator-session') sessionToken?: string
  ) {
    return this.sandboxService.getAction(actionId, sessionToken);
  }
}
