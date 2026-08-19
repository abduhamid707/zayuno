import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException
} from '@nestjs/common';
import { prisma } from '@zayuno/database';
import { hashApiKey } from '@zayuno/shared';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const authHeader = request.headers['authorization'];
    const apiKeyHeader = request.headers['x-api-key'] || request.headers['x-zayuno-api-key'];

    let apiKey = apiKeyHeader;
    if (!apiKey && authHeader && authHeader.startsWith('Bearer zy_')) {
      apiKey = authHeader.replace('Bearer ', '').trim();
    }

    // Local development is the only place where an explicit opt-in bypass is
    // permitted. A missing production setting must fail closed, not open the
    // provider and action APIs to the internet.
    if (!apiKey) {
      if (process.env.NODE_ENV !== 'production' && process.env.ALLOW_INSECURE_DEV_AUTH === 'true') {
        request.user = {
          id: 'dev_user_auto',
          role: 'API_CONSUMER',
          name: 'Developer Agent'
        };
        return true;
      }
      throw new UnauthorizedException('API key is required. Provide via x-api-key header or Bearer token.');
    }

    const keyHash = hashApiKey(apiKey);
    const foundKey = await prisma.apiKey.findUnique({
      where: { keyHash },
      include: { user: true, provider: true }
    });

    if (!foundKey || !foundKey.isActive) {
      throw new UnauthorizedException('Invalid or inactive API key.');
    }

    if (foundKey.expiresAt && foundKey.expiresAt < new Date()) {
      throw new UnauthorizedException('API key has expired.');
    }

    // Update lastUsedAt asynchronously
    prisma.apiKey.update({
      where: { id: foundKey.id },
      data: { lastUsedAt: new Date() }
    }).catch(() => {});

    request.user = {
      id: foundKey.userId || foundKey.id,
      role: foundKey.role,
      providerId: foundKey.providerId,
      providerSlug: foundKey.provider?.slug,
      apiKeyId: foundKey.id
    };

    return true;
  }
}
