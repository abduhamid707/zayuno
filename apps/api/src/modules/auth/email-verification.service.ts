import { Injectable, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { prisma } from '@zayuno/database';

export interface EmailTransport {
  sendVerificationEmail(email: string, token: string, verificationUrl: string): Promise<void>;
}

export class DevEmailTransport implements EmailTransport {
  private logger = new Logger('DevEmailTransport');

  async sendVerificationEmail(email: string, _token: string, _verificationUrl: string): Promise<void> {
    const correlationId = createHash('sha256').update(`${email}:${Date.now()}`).digest('hex').slice(0, 12);
    const [local, domain] = email.split('@');
    const masked = local && local.length > 2 ? `${local[0]}***${local.slice(-1)}@${domain || 'masked'}` : `***@${domain || 'masked'}`;
    this.logger.log(`[DEV EMAIL] Verification email dispatched. Correlation: ${correlationId}, Recipient: ${masked}, ExpiresIn: 24h`);
  }
}

@Injectable()
export class EmailVerificationService {
  private logger = new Logger('EmailVerificationService');
  private lastDevTokens = new Map<string, string>(); // In-memory dev/test only
  private transport: EmailTransport;

  constructor() {
    if (process.env.NODE_ENV === 'production') {
      // In production, real transport must be configured. Otherwise fail-closed.
      this.transport = {
        async sendVerificationEmail() {
          throw new InternalServerErrorException('Configured mail transport is not available. Verification emails cannot be dispatched.');
        }
      };
    } else {
      this.transport = new DevEmailTransport();
    }
  }

  setTransport(customTransport: EmailTransport) {
    this.transport = customTransport;
  }

  private hashToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  async generateAndSendVerificationToken(email: string): Promise<{ success: boolean; message: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const now = new Date();
    const nowMs = now.getTime();

    // Check existing persistent token record
    const existing = await prisma.emailVerificationToken.findUnique({
      where: { email: cleanEmail }
    });

    if (existing) {
      const lastSentMs = existing.lastSentAt.getTime();
      const windowStartMs = existing.windowStart.getTime();

      // 60-second cooldown
      if (nowMs - lastSentMs < 60_000) {
        throw new BadRequestException('Iltimos, qayta so‘rov yuborishdan oldin 1 daqiqa kuting.');
      }

      // 10-minute rate limit window: max 3 requests
      if (nowMs - windowStartMs < 10 * 60_000) {
        if (existing.resendCount >= 3) {
          throw new BadRequestException('Tasdiqlash xatlari soni limitga yetdi. Iltimos, 10 daqiqadan so‘ng qayta urinib ko‘ring.');
        }
      }
    }

    // Generate secure 32-byte hex token (never persisted raw)
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(nowMs + 24 * 60 * 60 * 1000); // 24 hours

    if (existing) {
      const windowStartMs = existing.windowStart.getTime();
      const isWithinWindow = nowMs - windowStartMs < 10 * 60_000;

      await prisma.emailVerificationToken.update({
        where: { email: cleanEmail },
        data: {
          tokenHash,
          expiresAt,
          used: false,
          resendCount: isWithinWindow ? { increment: 1 } : 1,
          windowStart: isWithinWindow ? undefined : now,
          lastSentAt: now
        }
      });
    } else {
      await prisma.emailVerificationToken.create({
        data: {
          email: cleanEmail,
          tokenHash,
          expiresAt,
          used: false,
          resendCount: 1,
          windowStart: now,
          lastSentAt: now
        }
      });
    }

    // Save dev token only in dev/test environment
    if (process.env.NODE_ENV !== 'production') {
      this.lastDevTokens.set(cleanEmail, rawToken);
    }

    const portalBase = process.env.PROVIDER_PORTAL_URL || 'http://localhost:3000';
    const verificationUrl = `${portalBase}?verifyToken=${encodeURIComponent(rawToken)}&email=${encodeURIComponent(cleanEmail)}`;

    try {
      await this.transport.sendVerificationEmail(cleanEmail, rawToken, verificationUrl);
    } catch (err: any) {
      this.logger.error(`Failed to send verification email: ${err.message}`);
      if (process.env.NODE_ENV === 'production') {
        throw err;
      }
    }

    return {
      success: true,
      message: 'Agar ushbu email ro‘yxatdan o‘tgan bo‘lsa, tasdiqlash xati yuborildi.'
    };
  }

  async verifyToken(rawToken: string): Promise<{ email: string }> {
    if (!rawToken || typeof rawToken !== 'string') {
      throw new BadRequestException('Tasdiqlash kodi kiritilmadi.');
    }

    const tokenHash = this.hashToken(rawToken.trim());
    const record = await prisma.emailVerificationToken.findUnique({
      where: { tokenHash }
    });

    if (!record || record.used) {
      throw new BadRequestException('Tasdiqlash kodi noto‘g‘ri yoki allaqachon ishlatilgan.');
    }

    if (Date.now() > record.expiresAt.getTime()) {
      throw new BadRequestException('Tasdiqlash kodining amal qilish muddati tugagan.');
    }

    // Mark single-use
    await prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { used: true }
    });

    return { email: record.email };
  }

  getLastDevToken(email: string): string | undefined {
    if (process.env.NODE_ENV === 'production' || process.env.ENABLE_DEV_TOKEN_HELPER !== 'true') {
      return undefined;
    }
    return this.lastDevTokens.get(email.trim().toLowerCase());
  }

  clearDevState() {
    this.lastDevTokens.clear();
  }
}
