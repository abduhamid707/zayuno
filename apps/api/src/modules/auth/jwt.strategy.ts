import 'dotenv/config';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { prisma } from '@zayuno/database';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET || 'super-secret-jwt-key-for-zayuno-auth-change-in-production';
  return secret;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: (request: any) => {
        const headerToken = ExtractJwt.fromAuthHeaderAsBearerToken()(request);
        if (headerToken) return headerToken;
        const cookieHeader = String(request?.headers?.cookie || '');
        const cookie = cookieHeader.split(';').map((part: string) => part.trim()).find((part: string) => part.startsWith('zayuno_provider_access='));
        return cookie ? decodeURIComponent(cookie.slice('zayuno_provider_access='.length)) : null;
      },
      ignoreExpiration: false,
      secretOrKeyProvider: (_req: any, _token: any, done: (err: any, secret?: string) => void) => {
        done(null, getJwtSecret());
      },
    });
  }

  async validate(payload: { sub: string; email: string; role: string; providerId?: string }) {
    const user = await prisma.user.findUnique({
      where: { id: payload.sub }
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User account not found or disabled.');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      providerId: user.providerId
    };
  }
}
