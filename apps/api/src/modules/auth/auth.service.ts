import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { prisma, UserRole } from '@zayuno/database';
import { generateApiKey, hashApiKey } from '@zayuno/shared';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

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
