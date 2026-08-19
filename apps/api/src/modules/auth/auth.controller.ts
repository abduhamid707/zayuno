import { Controller, Post, Get, Body, UseGuards, Param, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Authentication & API Keys')
@Controller('api/v1/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login for Admin and Provider Users' })
  async login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change the password for the signed-in account' })
  async changePassword(@CurrentUser() user: any, @Body() body: { currentPassword: string; newPassword: string }) {
    return this.authService.changePassword(user.id, body.currentPassword, body.newPassword);
  }

  @Post('keys')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate new API key' })
  async createApiKey(
    @CurrentUser() user: any,
    @Body() body: { name: string; isLive?: boolean }
  ) {
    return this.authService.createApiKey({
      name: body.name,
      userId: user.id,
      providerId: user.providerId,
      isLive: body.isLive
    });
  }

  @Get('keys')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List API keys for current account' })
  async listApiKeys(@CurrentUser() user: any) {
    return this.authService.listApiKeys(user.id, user.providerId);
  }

  @Delete('keys/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke an API key' })
  async revokeApiKey(@Param('id') id: string) {
    return this.authService.revokeApiKey(id);
  }
}
