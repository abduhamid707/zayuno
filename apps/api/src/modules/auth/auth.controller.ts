import { Controller, Post, Get, Body, UseGuards, Param, Delete, Query, ForbiddenException, Res, Req } from '@nestjs/common';
import { Request } from 'express';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiExcludeEndpoint } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Authentication & API Keys')
@Controller('api/v1/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  private setAccessCookie(response: Response, accessToken: string) {
    response.cookie('zayuno_provider_access', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'lax',
      path: '/',
      maxAge: 15 * 60 * 1000,
    });
  }

  private setRefreshCookie(response: Response, refreshToken: string) {
    response.cookie('zayuno_provider_refresh', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/v1/auth',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  }

  private readCookie(request: Request, name: string) {
    const item = String(request.headers.cookie || '').split(';').map(value => value.trim()).find(value => value.startsWith(`${name}=`));
    return item ? decodeURIComponent(item.slice(name.length + 1)) : undefined;
  }

  @Get('google/start')
  @ApiOperation({ summary: 'Start Google OAuth for provider portal' })
  async googleStart(@Query('returnTo') returnTo?: string, @Res() response?: Response) {
    const url = await this.authService.googleAuthorizationUrl(returnTo || '/?tab=apps');
    return response!.redirect(url);
  }

  @Get('google/callback')
  @ApiOperation({ summary: 'Complete Google OAuth for provider portal' })
  async googleCallback(@Query('code') code: string, @Query('state') state: string, @Res() response: Response) {
    const result = await this.authService.googleCallback(code, state);
    this.setAccessCookie(response, result.accessToken);
    this.setRefreshCookie(response, result.refreshToken);
    const portal = process.env.PROVIDER_PORTAL_URL || process.env.PROVIDER_PORTAL_BASE_URL || 'http://localhost:3001';
    const destination = this.authService.normalizeProviderReturnTo(result.returnTo);
    return response.redirect(`${portal}${destination}`);
  }

  @Post('register-owner')
  @ApiOperation({ summary: 'Self-service registration for Provider Owners' })
  async registerOwner(@Body() body: { email: string; password: string; name: string }, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.registerProviderOwner(body);
    this.setAccessCookie(response, result.accessToken);
    this.setRefreshCookie(response, result.refreshToken);
    return result;
  }

  @Post('verify-email')
  @ApiOperation({ summary: 'Verify email address using one-time token' })
  async verifyEmail(@Body() body: { token: string }, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.verifyEmail(body.token);
    if (result.accessToken) this.setAccessCookie(response, result.accessToken);
    if (result.refreshToken) this.setRefreshCookie(response, result.refreshToken);
    return result;
  }

  @Post('resend-verification')
  @ApiOperation({ summary: 'Resend email verification link' })
  async resendVerification(@Body() body: { email: string }) {
    return this.authService.resendVerification(body.email);
  }

  @Get('dev/last-verification-token')
  @ApiExcludeEndpoint()
  async getLastDevVerificationToken(@Query('email') email: string) {
    if (process.env.NODE_ENV === 'production' || process.env.ENABLE_DEV_TOKEN_HELPER !== 'true') {
      throw new ForbiddenException('Endpoint available in dev/test only with ENABLE_DEV_TOKEN_HELPER=true.');
    }
    const token = this.authService.getEmailVerificationService().getLastDevToken(email || '');
    return { token: token || null };
  }

  @Post('login')
  @ApiOperation({ summary: 'Login for Admin and Provider Users' })
  async login(@Body() body: { email: string; password: string }, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.login(body.email, body.password);
    this.setAccessCookie(response, result.accessToken);
    this.setRefreshCookie(response, result.refreshToken);
    return result;
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Rotate provider portal refresh session' })
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.refreshProviderSession(this.readCookie(request, 'zayuno_provider_refresh') || '');
    this.setAccessCookie(response, result.accessToken);
    this.setRefreshCookie(response, result.refreshToken);
    return result;
  }

  @Get('session')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Restore the current provider portal session' })
  async session(@Req() request: Request, @CurrentUser() user: any) {
    return { authenticated: true, accessToken: this.readCookie(request, 'zayuno_provider_access') || null, user };
  }

  @Post('logout')
  @ApiOperation({ summary: 'Clear the provider portal session cookie' })
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.authService.revokeProviderSession(this.readCookie(request, 'zayuno_provider_refresh'));
    response.clearCookie('zayuno_provider_access', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' });
    response.clearCookie('zayuno_provider_refresh', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/api/v1/auth' });
    return { success: true };
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
