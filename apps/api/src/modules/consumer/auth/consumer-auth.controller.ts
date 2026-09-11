import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { ConsumerAuthService } from "./consumer-auth.service";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";

@ApiTags("Consumer App - Auth")
@Controller("api/v1/consumer/auth")
export class ConsumerAuthController {
  constructor(private authService: ConsumerAuthService) {}

  @Post("google")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Exchange Google ID Token for Consumer Session" })
  async loginWithGoogle(@Body() body: { idToken: string }) {
    return this.authService.verifyGoogleToken(body.idToken);
  }

  @Post("email/send-code")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Send a 5-digit OTP to consumer email" })
  async sendEmailOtp(@Body() body: { email: string }) {
    return this.authService.sendEmailOtp(body.email);
  }

  @Post("email/verify-code")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Verify 5-digit OTP and issue session" })
  async verifyEmailOtp(@Body() body: { email: string; code: string }) {
    return this.authService.verifyEmailOtp(body.email, body.code);
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Rotate consumer refresh token and issue a new session",
  })
  async refresh(@Body() body: { refreshToken: string }) {
    return this.authService.refreshSession(body.refreshToken);
  }

  @Post("revoke")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Revoke a consumer refresh session" })
  async revoke(@Body() body: { refreshToken: string }) {
    await this.authService.revokeSession(body.refreshToken);
  }

  @Post("revoke-all")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Revoke all consumer sessions for this account" })
  async revokeAll(@Req() req: any) {
    await this.authService.revokeAllSessions(req.user.id);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get current consumer user profile" })
  async getProfile(@Req() req: any) {
    return this.authService.getProfile(req.user.id);
  }
}
