import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { prisma } from '@zayuno/database';

function getJwtSecret(): string {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required.');
  return process.env.JWT_SECRET;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(),
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
