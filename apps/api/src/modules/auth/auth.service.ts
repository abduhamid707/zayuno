import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { prisma, UserRole } from '@zayuno/database';
import { generateApiKey, hashApiKey } from '@zayuno/shared';
import { EmailVerificationService } from './email-verification.service';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private emailVerificationService: EmailVerificationService
  ) {}

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
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new BadRequestException('Foydalanuvchi topilmadi.');
    }

    if (!user.isActive) {
      await prisma.user.update({
        where: { id: user.id },
        data: { isActive: true }
      });
    }

    return {
      success: true,
      message: 'Email muvaffaqiyatli tasdiqlandi. Endi tizimga kirishingiz mumkin.'
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

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
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
