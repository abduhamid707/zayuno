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

  async sendEmailOtp(email: string) {
    const cleanEmail = email?.toLowerCase().trim();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      throw new UnauthorizedException("Yaroqli email kiritish shart.");
    }
    
    const lastSent = await this.redis.get(`consumer:otp:sent:${cleanEmail}`);
    if (lastSent) {
      throw new UnauthorizedException("Iltimos, qayta yuborishdan oldin 1 daqiqa kuting.");
    }

    const otp = Math.floor(10000 + Math.random() * 90000).toString();
    await this.redis.set(`consumer:otp:code:${cleanEmail}`, otp, 300);
    await this.redis.set(`consumer:otp:sent:${cleanEmail}`, "1", 60);

    if (process.env.NODE_ENV !== "production") {
      this.logger.log(`[DEV OTP] Email: ${cleanEmail}, Code: ${otp}`);
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      const { Resend } = require("resend");
      const resend = new Resend(apiKey);
      try {
        await resend.emails.send({
          from: process.env.EMAIL_FROM || "onboarding@resend.dev",
          to: cleanEmail,
          subject: "Zayuno — kirish kodi",
          html: `
<div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #0f172a;">Zayuno ilovasiga kirish</h2>
  <p style="color: #334155; font-size: 16px;">Sizning tasdiqlash kodingiz:</p>
  <h1 style="font-size: 36px; letter-spacing: 6px; color: #2563EB; margin: 16px 0;">${otp}</h1>
  <p style="color: #64748b; font-size: 14px;">Ushbu kod 5 daqiqa davomida amal qiladi. Kodni hech kimga bermang!</p>
</div>
          `.trim()
        });
      } catch (err: any) {
        this.logger.error(`Resend xatosi: ${err.message}`);
      }
    }
    
    return { success: true, message: "Kod yuborildi." };
  }

  async verifyEmailOtp(email: string, code: string) {
    const cleanEmail = email?.toLowerCase().trim();
    if (!cleanEmail || !code) throw new UnauthorizedException("Email va kod kiritilishi shart.");
    
    const validOtp = await this.redis.get(`consumer:otp:code:${cleanEmail}`);
    if (!validOtp || validOtp !== code.trim()) {
      throw new UnauthorizedException("Kod noto'g'ri yoki yaroqlilik muddati tugagan.");
    }

    await this.redis.del(`consumer:otp:code:${cleanEmail}`);
    await this.redis.del(`consumer:otp:sent:${cleanEmail}`);

    const user = await prisma.user.upsert({
      where: { email: cleanEmail },
      update: { isActive: true },
      create: {
        email: cleanEmail,
        name: "Zayuno foydalanuvchisi",
        passwordHash: "EMAIL_OTP_MANAGED",
        role: UserRole.API_CONSUMER,
        isActive: true,
      },
    });

    return this.issueSession(user);
  }

  async refreshSession(refreshToken: string) {
    if (!refreshToken)
      throw new UnauthorizedException("Refresh token is required.");
    // A configuration outage is a 503, not evidence that the user's token is bad.
    const refreshSecret = this.getRefreshSecret();
    let payload: ConsumerJwt;
    try {
      payload = await this.jwtService.verifyAsync<ConsumerJwt>(refreshToken, {
        secret: refreshSecret,
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

    // A response may be lost after the DB transaction committed (network loss,
    // process kill). Recover only the immediate, still-active successor. Never
    // rotate twice or revoke a healthy family just because the client retried.
    if (
      session?.revokedAt &&
      session.replacedBy &&
      session.userId === payload.sub &&
      session.expiresAt > new Date()
    ) {
      const successor = await prisma.consumerSession.findUnique({
        where: { id: session.replacedBy },
      });
      if (
        successor &&
        successor.familyId === session.familyId &&
        successor.userId === payload.sub &&
        !successor.revokedAt &&
        successor.expiresAt > new Date()
      ) {
        const user = await prisma.user.findUnique({
          where: { id: payload.sub },
        });
        if (!user || !user.isActive)
          throw new UnauthorizedException("Consumer account is unavailable.");
        return this.recoverSession(user, successor);
      }
    }
    if (
      !session ||
      session.userId !== payload.sub ||
      session.revokedAt ||
      session.expiresAt <= new Date()
    ) {
      throw new UnauthorizedException("Refresh session is no longer active.");
    }
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    // Google login reuses existing users, including portal owners and admins.
    // The verified consumer-session record establishes mobile access; database
    // role still governs portal permissions and must not cause a forced logout.
    if (!user || !user.isActive)
      throw new UnauthorizedException("Consumer account is unavailable.");
    return this.rotateSession(user, session.id, session.familyId);
  }

  async revokeSession(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync<ConsumerJwt>(
        refreshToken,
        { ignoreExpiration: true, secret: this.getRefreshSecret() },
      );
      if (payload.type === "refresh" && payload.jti) {
        const session = await prisma.consumerSession.findUnique({
          where: { id: payload.jti },
        });
        if (!session || session.userId !== payload.sub) return;
        await Promise.all([
          this.redis.del(`consumer:refresh:${payload.jti}`),
          prisma.consumerSession.updateMany({
            where: {
              familyId: session.familyId,
              userId: payload.sub,
              revokedAt: null,
            },
            data: { revokedAt: new Date() },
          }),
        ]);
      }
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
        isActive: true,
        createdAt: true,
      },
    });
    if (!user || !user.isActive)
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
    try {
      await prisma.$transaction(async (tx) => {
        const revoked = await tx.consumerSession.updateMany({
          where: { id: previousId, userId: user.id, revokedAt: null },
          data: { revokedAt: now, replacedBy: nextId, lastUsedAt: now },
        });
        if (revoked.count !== 1)
          throw new UnauthorizedException(
            "Refresh session was already rotated.",
          );
        await tx.consumerSession.create({
          data: { id: nextId, familyId, userId: user.id, expiresAt },
        });
      });
    } catch (error) {
      if (!(error instanceof UnauthorizedException)) throw error;
      const previous = await prisma.consumerSession.findUnique({
        where: { id: previousId },
      });
      const successor = previous?.replacedBy
        ? await prisma.consumerSession.findUnique({
            where: { id: previous.replacedBy },
          })
        : null;
      if (
        !successor ||
        successor.userId !== user.id ||
        successor.familyId !== familyId ||
        successor.revokedAt ||
        successor.expiresAt <= new Date()
      )
        throw error;
      return this.recoverSession(user, successor);
    }
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

  private async recoverSession(
    user: { id: string; email: string; name: string | null; role: UserRole },
    session: { id: string; familyId: string; expiresAt: Date },
  ) {
    const base = { sub: user.id, email: user.email, role: user.role };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { ...base, type: "access" },
        { expiresIn: "15m" },
      ),
      this.jwtService.signAsync(
        {
          ...base,
          type: "refresh",
          jti: session.id,
          familyId: session.familyId,
          exp: Math.floor(session.expiresAt.getTime() / 1000),
        },
        { secret: this.getRefreshSecret() },
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
