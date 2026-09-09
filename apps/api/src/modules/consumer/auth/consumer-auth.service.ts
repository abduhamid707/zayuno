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
  exp?: number;
  familyId?: string;
};

const REFRESH_TTL_SECONDS = 365 * 24 * 60 * 60;

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
    let session = await prisma.consumerSession.findUnique({
      where: { id: payload.jti },
    });

    // Migrate sessions issued before durable DB-backed sessions were introduced.
    if (!session) {
      const legacyUserId = await this.redis.get(
        `consumer:refresh:${payload.jti}`,
      );
      if (legacyUserId === payload.sub) {
        session = await prisma.consumerSession.create({
          data: {
            id: payload.jti,
            familyId: payload.familyId || payload.jti,
            userId: payload.sub,
            expiresAt: new Date((payload.exp || 0) * 1000),
          },
        });
      }
    }

    if (
      !session ||
      session.userId !== payload.sub ||
      session.revokedAt ||
      session.expiresAt <= new Date()
    ) {
      if (
        session?.revokedAt &&
        Date.now() - session.revokedAt.getTime() > 10_000
      ) {
        await prisma.consumerSession.updateMany({
          where: { familyId: session.familyId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      throw new UnauthorizedException("Refresh session is no longer active.");
    }
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive || user.role !== UserRole.API_CONSUMER)
      throw new UnauthorizedException("Consumer account is unavailable.");
    return this.rotateSession(user, session.id, session.familyId);
  }

  async revokeSession(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync<ConsumerJwt>(
        refreshToken,
        { ignoreExpiration: true, secret: this.getRefreshSecret() },
      );
      if (payload.type === "refresh" && payload.jti)
        await Promise.all([
          this.redis.del(`consumer:refresh:${payload.jti}`),
          prisma.consumerSession.updateMany({
            where: { id: payload.jti, revokedAt: null },
            data: { revokedAt: new Date() },
          }),
        ]);
    } catch {
      // Revocation is intentionally idempotent and does not disclose token validity.
    }
  }

  async revokeAllSessions(userId: string) {
    await prisma.consumerSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
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

  private async issueSession(
    user: {
      id: string;
      email: string;
      name: string | null;
      role: UserRole;
    },
    familyId = randomUUID(),
  ) {
    const jti = randomUUID();
    const base = { sub: user.id, email: user.email, role: user.role };
    const accessToken = await this.jwtService.signAsync(
      { ...base, type: "access" },
      { expiresIn: "15m" },
    );
    const refreshToken = await this.jwtService.signAsync(
      { ...base, type: "refresh", jti, familyId },
      { expiresIn: "365d", secret: this.getRefreshSecret() },
    );
    await prisma.consumerSession.create({
      data: {
        id: jti,
        familyId,
        userId: user.id,
        expiresAt: new Date(Date.now() + REFRESH_TTL_SECONDS * 1000),
      },
    });
    await this.redis.set(
      `consumer:refresh:${jti}`,
      user.id,
      REFRESH_TTL_SECONDS,
    );
    return {
      accessToken,
      refreshToken,
      token: accessToken,
      expiresIn: 900,
      user: { id: user.id, email: user.email, name: user.name || undefined },
    };
  }

  private async rotateSession(
    user: { id: string; email: string; name: string | null; role: UserRole },
    previousId: string,
    familyId: string,
  ) {
    const nextId = randomUUID();
    const base = { sub: user.id, email: user.email, role: user.role };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { ...base, type: "access" },
        { expiresIn: "15m" },
      ),
      this.jwtService.signAsync(
        { ...base, type: "refresh", jti: nextId, familyId },
        { expiresIn: "365d", secret: this.getRefreshSecret() },
      ),
    ]);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + REFRESH_TTL_SECONDS * 1000);
    await prisma.$transaction(async (tx) => {
      const revoked = await tx.consumerSession.updateMany({
        where: { id: previousId, userId: user.id, revokedAt: null },
        data: { revokedAt: now, replacedBy: nextId, lastUsedAt: now },
      });
      if (revoked.count !== 1)
        throw new UnauthorizedException("Refresh session was already rotated.");
      await tx.consumerSession.create({
        data: { id: nextId, familyId, userId: user.id, expiresAt },
      });
    });
    await Promise.all([
      this.redis.del(`consumer:refresh:${previousId}`),
      this.redis.set(
        `consumer:refresh:${nextId}`,
        user.id,
        REFRESH_TTL_SECONDS,
      ),
    ]);
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
