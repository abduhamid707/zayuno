import 'dotenv/config';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { EmailVerificationService } from './email-verification.service';

function getJwtSecret(): string {
  return process.env.JWT_SECRET || 'super-secret-jwt-key-for-zayuno-auth-change-in-production';
}

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: getJwtSecret(),
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, EmailVerificationService],
  exports: [AuthService, JwtModule, PassportModule, EmailVerificationService],
})
export class AuthModule {}

