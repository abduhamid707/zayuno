import {
  Injectable,
  BadRequestException,
  HttpException,
  UnauthorizedException,
  ServiceUnavailableException,
  Logger,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { randomUUID, randomInt, createHash } from "crypto";
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


  private normalizeOtpEmail(email: unknown): string {
    const normalized = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (normalized.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      throw new BadRequestException('Yaroqli email manzilini kiriting.');
    }
    return normalized;
  }

  private otpDigest(email: string, code: string) {
    return createHash('sha256').update(email + ':' + code).digest('hex');
  }

  private async withEmailOtpLock<T>(email: string, action: (client: ReturnType<RedisService['getClient']>) => Promise<T>): Promise<T> {
    const client = this.redis.getClient();
    if (!client) throw new ServiceUnavailableException('Kirish xizmati vaqtincha ishlamayapti. Qayta urinib ko‘ring.');
    const lockKey = 'consumer:otp:operation:' + email;
    const lease = randomUUID();
    let acquired = false;
    try {
      acquired = await client.set(lockKey, lease, 'EX', 30, 'NX') === 'OK';
      if (!acquired) throw new HttpException('So‘rov bajarilmoqda. Bir ozdan keyin qayta urinib ko‘ring.', 429);
      return await action(client);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.warn('Email sign-in operation failed.');
      throw new ServiceUnavailableException('Kirish xizmati bilan ulanib bo‘lmadi. Qayta urinib ko‘ring.');
    } finally {
      if (acquired) await client.eval("if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) end return 0", 1, lockKey, lease).catch(() => undefined);
    }
  }

  private async deliverEmailOtp(email: string, code: string): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    if (!apiKey) throw new ServiceUnavailableException('Email orqali kirish vaqtincha ishlamayapti.');
    // Resend's REST response must be accepted before we announce success.
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10_000),
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
        to: email,
        subject: `${code} — Zayuno kirish kodi`,
        text: `Zayuno kirish kodi: ${code}. Kod 5 daqiqa amal qiladi. Kodni hech kimga bermang.`,
        html: `<div style="font-family:Arial,sans-serif;max-width:440px;margin:auto;padding:32px;color:#202020"><h2>Zayuno</h2><p>Kirish kodingiz</p><p style="font-size:36px;letter-spacing:8px;font-weight:bold">${code}</p><p style="color:#777">Kod 5 daqiqa amal qiladi. Kodni hech kimga bermang.</p></div>`,
      }),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.id) throw new ServiceUnavailableException('Emailga kod yuborilmadi. Manzilni tekshirib, qayta urinib ko‘ring.');
  }

  async sendEmailOtp(email: string) {
    const cleanEmail = this.normalizeOtpEmail(email);
    return this.withEmailOtpLock(cleanEmail, async client => {
      const retryAfterSeconds = await client.ttl(`consumer:otp:sent:${cleanEmail}`);
      if (retryAfterSeconds > 0) throw new HttpException({ message: 'Qayta yuborishdan oldin bir daqiqa kuting.', retryAfterSeconds }, 429);
      const code = randomInt(10000, 100000).toString();
      await this.deliverEmailOtp(cleanEmail, code);
      // Strict Redis operations: do not report success if the challenge cannot be stored.
      const saved = await client.multi()
        .set(`consumer:otp:code:${cleanEmail}`, this.otpDigest(cleanEmail, code), 'EX', 300)
        .set(`consumer:otp:sent:${cleanEmail}`, '1', 'EX', 60)
        .del(`consumer:otp:attempts:${cleanEmail}`)
        .exec();
      if (!saved || saved.some(([error]) => error)) throw new Error('OTP persistence failed');
      return { success: true, message: 'Kod yuborildi.', codeLength: 5, expiresIn: 300, retryAfterSeconds: 60 };
    });
  }

  async verifyEmailOtp(email: string, code: string) {
    const cleanEmail = this.normalizeOtpEmail(email);
    if (typeof code !== 'string' || !/^\d{5}$/.test(code.trim())) throw new BadRequestException('5 xonali kodni kiriting.');
    return this.withEmailOtpLock(cleanEmail, async client => {
      const codeKey = `consumer:otp:code:${cleanEmail}`;
      const attemptsKey = `consumer:otp:attempts:${cleanEmail}`;
      const savedCode = await client.get(codeKey);
      if (!savedCode) throw new UnauthorizedException('Kod muddati tugagan. Yangi kod so‘rang.');
      const attempts = await client.incr(attemptsKey);
      if (attempts === 1) await client.expire(attemptsKey, 300);
      // Legacy five-digit challenges remain valid for their original five-minute TTL.
      if (attempts > 5 || (savedCode !== this.otpDigest(cleanEmail, code.trim()) && savedCode !== code.trim())) {
        if (attempts >= 5) await client.del(codeKey);
        throw new UnauthorizedException(attempts >= 5 ? 'Urinishlar tugadi. Yangi kod so‘rang.' : 'Kod noto‘g‘ri. Tekshirib, qayta kiriting.');
      }
      const user = await prisma.user.upsert({
        where: { email: cleanEmail },
        update: { isActive: true },
        create: { email: cleanEmail, name: 'Zayuno foydalanuvchisi', passwordHash: 'EMAIL_OTP_MANAGED', role: UserRole.API_CONSUMER, isActive: true },
      });
      // A transient session-storage failure must not consume the user's valid code.
      const session = await this.issueSession(user);
      await client.del(codeKey, attemptsKey);
      return session;
    });
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
