import {
  Injectable,
  UnauthorizedException,
  ServiceUnavailableException,
  Logger,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { randomUUID } from "crypto";
import { prisma, UserRole } from "@zayuno/database";
import { RedisService } from "../../../common/services/redis.service";

type ConsumerJwt = {
  sub: string;
  email: string;
  role: UserRole;
  type: "access" | "refresh";
  jti?: string;
};

@Injectable()
export class ConsumerAuthService {
  private readonly logger = new Logger(ConsumerAuthService.name);
  constructor(
    private jwtService: JwtService,
    private redis: RedisService,
  ) {}

  async verifyGoogleToken(idToken: string) {
    if (!idToken)
      throw new UnauthorizedException("Google ID token is required.");
    const allowedAudiences = [
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_ANDROID_CLIENT_ID,
      process.env.GOOGLE_IOS_CLIENT_ID,
      process.env.GOOGLE_WEB_CLIENT_ID,
    ]
      .filter((value): value is string => Boolean(value?.trim()))
      .map((value) => value.trim());

    if (!allowedAudiences.length) {
      throw new ServiceUnavailableException(
        "Google authentication is not configured.",
      );
    }

    try {
      const response = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
        { signal: AbortSignal.timeout(8_000) },
      );
      if (!response.ok)
        throw new UnauthorizedException("Google token is invalid or expired.");
      const payload: any = await response.json();
      if (!allowedAudiences.includes(payload.aud))
        throw new UnauthorizedException(
          "Google token audience is not allowed.",
        );
      if (
        !["accounts.google.com", "https://accounts.google.com"].includes(
          payload.iss,
        )
      )
        throw new UnauthorizedException("Google token issuer is invalid.");
      if (payload.email_verified !== "true" && payload.email_verified !== true)
        throw new UnauthorizedException("Google email is not verified.");

      const email = payload.email?.toLowerCase().trim();
      if (!email)
        throw new UnauthorizedException("Google account email is missing.");
      const name =
        payload.name || payload.given_name || "Zayuno foydalanuvchisi";
      const user = await prisma.user.upsert({
        where: { email },
        update: { name, isActive: true },
        create: {
          email,
          name,
          passwordHash: "OAUTH_GOOGLE_MANAGED",
          role: UserRole.API_CONSUMER,
          isActive: true,
        },
      });
      return this.issueSession(user);
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof ServiceUnavailableException
      )
        throw error;
      this.logger.warn("Google token verification failed.");
      throw new UnauthorizedException("Google authentication failed.");
    }
  }

  async loginDemoUser() {
    const email = "habibillojaboruf@gmail.com";
    const name = "Habibillo Jabborov";
    const user = await prisma.user.upsert({
      where: { email },
      update: { name, isActive: true },
      create: {
        email,
        name,
        passwordHash: "DEMO_OAUTH_MANAGED",
        role: UserRole.API_CONSUMER,
        isActive: true,
      },
    });
    return this.issueSession(user);
  }

  async refreshSession(refreshToken: string) {
    if (!refreshToken)
      throw new UnauthorizedException("Refresh token is required.");
    let payload: ConsumerJwt;
    try {
      payload = await this.jwtService.verifyAsync<ConsumerJwt>(refreshToken, {
        secret: this.getRefreshSecret(),
      });
    } catch {
      throw new UnauthorizedException("Refresh token is invalid or expired.");
    }
    if (payload.type !== "refresh" || !payload.jti)
      throw new UnauthorizedException("Refresh token is invalid.");
    const sessionKey = `consumer:refresh:${payload.jti}`;
    const storedUserId = await this.redis.get(sessionKey);
    if (storedUserId !== payload.sub)
      throw new UnauthorizedException("Refresh session is no longer active.");
    await this.redis.del(sessionKey);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive || user.role !== UserRole.API_CONSUMER)
      throw new UnauthorizedException("Consumer account is unavailable.");
    return this.issueSession(user);
  }

  async revokeSession(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync<ConsumerJwt>(
        refreshToken,
        { ignoreExpiration: true, secret: this.getRefreshSecret() },
      );
      if (payload.type === "refresh" && payload.jti)
        await this.redis.del(`consumer:refresh:${payload.jti}`);
    } catch {
      // Revocation is intentionally idempotent and does not disclose token validity.
    }
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });
    if (!user || user.role !== UserRole.API_CONSUMER)
      throw new UnauthorizedException("Consumer account not found.");
    return user;
  }

  private async issueSession(user: {
    id: string;
    email: string;
    name: string | null;
    role: UserRole;
  }) {
    const jti = randomUUID();
    const base = { sub: user.id, email: user.email, role: user.role };
    const accessToken = await this.jwtService.signAsync(
      { ...base, type: "access" },
      { expiresIn: "15m" },
    );
    const refreshToken = await this.jwtService.signAsync(
      { ...base, type: "refresh", jti },
      { expiresIn: "30d", secret: this.getRefreshSecret() },
    );
    await this.redis.set(`consumer:refresh:${jti}`, user.id, 30 * 24 * 60 * 60);
    return {
      accessToken,
      refreshToken,
      token: accessToken,
      expiresIn: 900,
      user: { id: user.id, email: user.email, name: user.name || undefined },
    };
  }

  private getRefreshSecret(): string {
    const secret = process.env.CONSUMER_REFRESH_TOKEN_SECRET?.trim();
    if (!secret || secret.length < 32)
      throw new ServiceUnavailableException(
        "Consumer refresh sessions are not configured.",
      );
    return secret;
  }
}
