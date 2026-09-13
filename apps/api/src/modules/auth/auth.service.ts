import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomUUID } from 'crypto';
import { prisma, UserRole } from '@zayuno/database';
import { generateApiKey, hashApiKey } from '@zayuno/shared';
import { EmailVerificationService } from './email-verification.service';
import { RedisService } from '../../common/services/redis.service';

const PROVIDER_ACCESS_TTL_SECONDS = 15 * 60;
const PROVIDER_REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60;

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private emailVerificationService: EmailVerificationService,
    private redis: RedisService
  ) {}

  private async issueProviderSession(user: { id: string; email: string; name: string; role: UserRole; providerId: string | null }, familyId: string = randomUUID()) {
    const sessionId = randomUUID();
    const base = { sub: user.id, email: user.email, role: user.role, providerId: user.providerId };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync({ ...base, type: 'access' }, { expiresIn: PROVIDER_ACCESS_TTL_SECONDS }),
      this.jwtService.signAsync({ ...base, type: 'refresh', jti: sessionId, familyId }, { expiresIn: PROVIDER_REFRESH_TTL_SECONDS, secret: this.getRefreshSecret() })
    ]);
    await prisma.consumerSession.create({ data: { id: sessionId, familyId, userId: user.id, expiresAt: new Date(Date.now() + PROVIDER_REFRESH_TTL_SECONDS * 1000) } });
    await this.redis.set(`provider:refresh:${sessionId}`, user.id, PROVIDER_REFRESH_TTL_SECONDS);
    return { accessToken, refreshToken, expiresIn: PROVIDER_ACCESS_TTL_SECONDS, user: this.publicUser(user) };
  }

  private publicUser(user: { id: string; email: string; name: string; role: UserRole; providerId: string | null; provider?: { slug: string; name: string } | null }) {
    return { id: user.id, email: user.email, name: user.name, role: user.role, providerId: user.providerId, providerSlug: user.provider?.slug, providerName: user.provider?.name };
  }

  private getRefreshSecret() {
    const secret = process.env.CONSUMER_REFRESH_TOKEN_SECRET?.trim() || process.env.JWT_SECRET?.trim();
    if (!secret || secret.length < 32) throw new UnauthorizedException('Sessiya xizmati sozlanmagan.');
    return secret;
  }

  async googleAuthorizationUrl(returnTo = '/?tab=apps') {
    const clientId = process.env.GOOGLE_PROVIDER_CLIENT_ID?.trim() || process.env.GOOGLE_WEB_CLIENT_ID?.trim() || process.env.GOOGLE_CLIENT_ID?.trim();
    const redirectUri = process.env.GOOGLE_PROVIDER_REDIRECT_URI?.trim();
    if (!clientId || !redirectUri) throw new BadRequestException('Google OAuth hali sozlanmagan.');
    const state = randomUUID();
    await this.redis.set(`provider:oauth:state:${state}`, JSON.stringify({ returnTo: /^\/\?tab=(apps|onboarding|overview)$/.test(returnTo) ? returnTo : '/?tab=apps' }), 600);
    const params = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, response_type: 'code', scope: 'openid email profile', access_type: 'offline', prompt: 'select_account', state });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async googleCallback(code: string, state: string) {
    if (!code || !state) throw new UnauthorizedException('Google OAuth so‘rovi yaroqsiz.');
    const stateKey = `provider:oauth:state:${state}`;
    const stateRecord = await this.redis.get(stateKey);
    await this.redis.del(stateKey);
    if (!stateRecord) throw new UnauthorizedException('Google OAuth sessiyasi muddati tugagan.');
    const clientId = process.env.GOOGLE_PROVIDER_CLIENT_ID?.trim() || process.env.GOOGLE_WEB_CLIENT_ID?.trim() || process.env.GOOGLE_CLIENT_ID?.trim();
    const clientSecret = process.env.GOOGLE_PROVIDER_CLIENT_SECRET?.trim() || process.env.GOOGLE_CLIENT_SECRET?.trim();
    const redirectUri = process.env.GOOGLE_PROVIDER_REDIRECT_URI?.trim();
    if (!clientId || !clientSecret || !redirectUri) throw new BadRequestException('Google OAuth hali sozlanmagan.');
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, signal: AbortSignal.timeout(10_000), body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }) });
    const tokens: any = await tokenResponse.json().catch(() => null);
    if (!tokenResponse.ok || !tokens?.access_token) throw new UnauthorizedException('Google bilan kirish amalga oshmadi.');
    const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${tokens.access_token}` }, signal: AbortSignal.timeout(8_000) });
    const profile: any = await profileResponse.json().catch(() => null);
    if (!profileResponse.ok || profile?.email_verified !== true || !profile?.email || !profile?.sub) throw new UnauthorizedException('Google hisobingiz tasdiqlanmadi.');
    const email = String(profile.email).trim().toLowerCase();
    const user = await prisma.user.upsert({ where: { email }, update: { name: String(profile.name || profile.given_name || email), isActive: true }, create: { email, name: String(profile.name || profile.given_name || email), passwordHash: 'OAUTH_GOOGLE_MANAGED', role: UserRole.PROVIDER_OWNER, isActive: true }, include: { provider: true } });
    return { ...(await this.issueProviderSession(user)), returnTo: JSON.parse(stateRecord).returnTo };
  }

  async registerProviderOwner(input: { email: string; password: string; name: string }) {
    const cleanEmail = (input.email || '').trim().toLowerCase();
    const cleanName = (input.name || '').trim();
    const password = input.password || '';

    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      throw new BadRequestException('To‘g‘ri email manzilini kiriting.');
    }
    if (!cleanName || cleanName.length < 2) {
      throw new BadRequestException('Ism yoki tashkilot nomini kiriting.');
    }
    if (!password || password.length < 12) {
      throw new BadRequestException('Parol kamida 12 belgidan iborat bo‘lishi kerak.');
    }

    const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existing) {
      if (existing.isActive) {
        // Enumeration-safe response
        return {
          success: true,
          message: 'Agar ushbu email ro‘yxatdan o‘tgan bo‘lsa, tasdiqlash xati yuborildi.'
        };
      }
      // If user exists but is not active / unverified, re-send verification
      await this.emailVerificationService.generateAndSendVerificationToken(cleanEmail);
      return {
        success: true,
        message: 'Tasdiqlash xati yuborildi. Iltimos, emailingizni tekshiring.'
      };
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.create({
      data: {
        email: cleanEmail,
        name: cleanName,
        passwordHash,
        role: UserRole.PROVIDER_OWNER,
        isActive: false // Activated upon email verification
      }
    });

    await this.emailVerificationService.generateAndSendVerificationToken(cleanEmail);

    return {
      success: true,
      message: 'Hisob yaratildi. Iltimos, hisobingizni faollashtirish uchun emailingizga yuborilgan havolani tasdiqlang.'
    };
  }

  async verifyEmail(token: string) {
    const { email } = await this.emailVerificationService.verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { email },
      include: { provider: true }
    });
    if (!user) {
      throw new BadRequestException('Foydalanuvchi topilmadi.');
    }

    if (!user.isActive) {
      await prisma.user.update({
        where: { id: user.id },
        data: { isActive: true }
      });
    }

    // Auto-login: issue JWT so the user is authenticated immediately after verification
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      providerId: user.providerId,
      providerSlug: (user as any).provider?.slug
    };

    const session = await this.issueProviderSession(user);

    return {
      success: true,
      message: 'Email muvaffaqiyatli tasdiqlandi.',
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      expiresIn: session.expiresIn,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        providerId: user.providerId,
        providerSlug: (user as any).provider?.slug,
        providerName: (user as any).provider?.name
      }
    };
  }

  async resendVerification(email: string) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (user && !user.isActive) {
      return this.emailVerificationService.generateAndSendVerificationToken(cleanEmail);
    }
    // Enumeration-safe response
    return {
      success: true,
      message: 'Agar ushbu email tasdiqlanmagan bo‘lsa, tasdiqlash xati qayta yuborildi.'
    };
  }

  getEmailVerificationService(): EmailVerificationService {
    return this.emailVerificationService;
  }

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { provider: true }
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Noto‘g‘ri login yoki parol.');
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedException('Noto‘g‘ri login yoki parol.');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      providerId: user.providerId,
      providerSlug: user.provider?.slug
    };

    const session = await this.issueProviderSession(user);

    return {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      expiresIn: session.expiresIn,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        providerId: user.providerId,
        providerSlug: user.provider?.slug,
        providerName: user.provider?.name
      }
    };
  }

  async refreshProviderSession(refreshToken: string) {
    if (!refreshToken) throw new UnauthorizedException('Refresh token required.');
    let payload: any;
    try { payload = await this.jwtService.verifyAsync(refreshToken, { secret: this.getRefreshSecret() }); } catch { throw new UnauthorizedException('Refresh token yaroqsiz yoki muddati tugagan.'); }
    if (payload.type !== 'refresh' || !payload.jti || !payload.sub) throw new UnauthorizedException('Refresh token yaroqsiz.');
    const session = await prisma.consumerSession.findUnique({ where: { id: payload.jti } });
    if (!session || session.userId !== payload.sub || session.revokedAt || session.expiresAt <= new Date()) throw new UnauthorizedException('Sessiya faol emas.');
    const user = await prisma.user.findUnique({ where: { id: payload.sub }, include: { provider: true } });
    if (!user || !user.isActive) throw new UnauthorizedException('Hisob faol emas.');
    const now = new Date();
    const revoked = await prisma.consumerSession.updateMany({ where: { id: session.id, userId: user.id, revokedAt: null }, data: { revokedAt: now, lastUsedAt: now } });
    if (revoked.count !== 1) throw new UnauthorizedException('Sessiya allaqachon yangilangan.');
    await this.redis.del(`provider:refresh:${session.id}`);
    return this.issueProviderSession(user, session.familyId);
  }

  async revokeProviderSession(refreshToken?: string) {
    if (!refreshToken) return;
    try {
      const payload: any = await this.jwtService.verifyAsync(refreshToken, { secret: this.getRefreshSecret(), ignoreExpiration: true });
      if (payload.jti && payload.sub) await prisma.consumerSession.updateMany({ where: { id: payload.jti, userId: payload.sub, revokedAt: null }, data: { revokedAt: new Date() } });
      if (payload.jti) await this.redis.del(`provider:refresh:${payload.jti}`);
    } catch { /* logout is intentionally idempotent */ }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    if (!currentPassword || !newPassword || newPassword.length < 12) {
      throw new BadRequestException('Yangi parol kamida 12 belgidan iborat bo‘lishi kerak.');
    }
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('Joriy parol noto‘g‘ri.');
    }
    await prisma.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(newPassword, 12) } });
    return { success: true };
  }

  async createApiKey(params: { name: string; userId?: string; providerId?: string; role?: UserRole; isLive?: boolean }) {
    const { rawKey, keyHash, keyPrefix } = generateApiKey(params.isLive ?? true);

    const record = await prisma.apiKey.create({
      data: {
        name: params.name,
        keyHash,
        keyPrefix,
        role: params.role || UserRole.API_CONSUMER,
        userId: params.userId,
        providerId: params.providerId,
        isActive: true
      }
    });

    return {
      id: record.id,
      name: record.name,
      apiKey: rawKey, // Shown only ONCE upon creation
      keyPrefix: record.keyPrefix,
      role: record.role,
      createdAt: record.createdAt
    };
  }

  async listApiKeys(userId?: string, providerId?: string) {
    return prisma.apiKey.findMany({
      where: {
        ...(userId ? { userId } : {}),
        ...(providerId ? { providerId } : {})
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        role: true,
        isActive: true,
        lastUsedAt: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async revokeApiKey(id: string) {
    return prisma.apiKey.update({
      where: { id },
      data: { isActive: false }
    });
  }
}
