import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma, ProviderCapability, ProviderCategory, ProviderEnvironment, ProviderStatus, ProviderType, UserRole } from '@zayuno/database';
import { IikoClient, IikoCredentials } from '@zayuno/provider-sdk';
import { checkReservedBrand, decryptSecret, encryptSecret } from '@zayuno/shared';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { ProviderRegistryService } from './provider-registry.service';

const credentialsSchema = z.object({
  apiLogin: z.string().trim().max(512).optional(),
  apiKey: z.string().trim().max(512).optional(),
  appId: z.string().uuid().optional(),
  clientSecret: z.string().trim().max(512).optional()
}).strict().superRefine((value, ctx) => {
  if (!value.apiLogin && !value.apiKey) ctx.addIssue({ code: 'custom', message: 'iiko API kaliti kiritilishi kerak.' });
  if (Boolean(value.appId) !== Boolean(value.clientSecret)) ctx.addIssue({ code: 'custom', message: 'App ID va Client Secret birga kiritilishi kerak.' });
  if (value.appId && !value.apiKey && !value.apiLogin) ctx.addIssue({ code: 'custom', message: 'v2 uchun API key yoki apiLogin kerak.' });
  if (!value.appId && !value.apiLogin) ctx.addIssue({ code: 'custom', message: 'v1 uchun apiLogin kerak; v2 uchun App ID va Client Secretni kiriting.' });
});
const connectSchema = z.object({
  credentials: credentialsSchema,
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9-]{2,62}$/),
  organizationId: z.string().uuid(),
  terminalGroupId: z.string().uuid(),
  externalMenuId: z.string().trim().min(1).max(80),
  countryCode: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/)
}).strict();
type Actor = { id?: string; providerId?: string; role?: UserRole };

@Injectable()
export class IikoConnectionsService {
  constructor(private readonly registry: ProviderRegistryService) {}

  private parse<T>(schema: z.ZodType<T>, input: unknown): T {
    const result = schema.safeParse(input);
    if (!result.success) throw new BadRequestException(result.error.issues.map(issue => issue.message).join('; '));
    return result.data;
  }

  private client(credentials: IikoCredentials) {
    return new IikoClient({ baseUrl: 'https://api-ru.iiko.services', providerSlug: 'iiko-connect-preflight',
      credentials: this.normalizedCredentials(credentials), timeoutMs: 15000 });
  }

  private normalizedCredentials(credentials: IikoCredentials): IikoCredentials {
    return { ...credentials, apiKey: credentials.apiKey || (credentials.appId ? credentials.apiLogin : undefined) };
  }

  private async ownedProvider(actor: Actor) {
    if (!actor.id) throw new ForbiddenException('Kirish talab qilinadi.');
    const user = await prisma.user.findUnique({ where: { id: actor.id }, select: { providerId: true, role: true } });
    if (!user) throw new ForbiddenException('Hisob topilmadi.');
    return user.providerId ? prisma.provider.findUnique({ where: { id: user.providerId } }) : null;
  }

  async discover(input: unknown) {
    const credentials = this.parse(credentialsSchema, input);
    const client = this.client(credentials);
    const organizations = await client.getOrganizations();
    if (!organizations.length) throw new BadRequestException('Bu kalit uchun faol iiko restorani topilmadi.');
    const ids = organizations.map(org => org.id);
    const [terminalGroups, externalMenus] = await Promise.all([
      client.getTerminalGroups(ids), client.getExternalMenus()
    ]);
    return {
      organizations: organizations.map(({ id, name, currencyIsoName, restaurantAddress }) => ({ id, name, currency: currencyIsoName, address: restaurantAddress })),
      terminalGroups: terminalGroups.map(({ id, organizationId, name }) => ({ id, organizationId, name })),
      externalMenus
    };
  }

  async connect(actor: Actor, input: unknown) {
    if (actor.role !== UserRole.PROVIDER_OWNER && actor.role !== UserRole.SUPER_ADMIN && actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Faqat provider egasi iiko ulanishini saqlay oladi.');
    }
    const data = this.parse(connectSchema, input);
    const isAdmin = actor.role === UserRole.SUPER_ADMIN || actor.role === UserRole.ADMIN;
    const existing = isAdmin
      ? await prisma.provider.findUnique({ where: { slug: data.slug } })
      : await this.ownedProvider(actor);
    if (!isAdmin && existing && existing.slug !== data.slug) throw new ConflictException('Hisobingiz allaqachon boshqa providerga biriktirilgan.');
    if (existing && existing.status !== ProviderStatus.DRAFT && existing.status !== ProviderStatus.DISABLED) {
      throw new ConflictException('Faol provider konfiguratsiyasini o‘zgartirish uchun avval admin review talab qilinadi.');
    }
    if (existing && !['iiko', 'sandbox', 'remote-http'].includes(existing.adapterType)) {
      throw new ConflictException('Mavjud provider boshqa integratsiya turidan foydalanmoqda.');
    }
    const reserved = checkReservedBrand(data.name).isReserved || checkReservedBrand(data.slug).isReserved;
    if (reserved && actor.role !== UserRole.SUPER_ADMIN && actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Bu brend uchun admin tasdig‘i kerak.');
    }
    const claimed = await prisma.provider.findUnique({ where: { slug: data.slug }, select: { id: true } });
    if (claimed && claimed.id !== existing?.id) throw new ConflictException('Bu provider manzili band.');

    const client = this.client(data.credentials);
    const [organizations, terminalGroups, menus] = await Promise.all([
      client.getOrganizations(), client.getTerminalGroups([data.organizationId]), client.getExternalMenus()
    ]);
    const org = organizations.find(item => item.id === data.organizationId);
    if (!org) throw new BadRequestException('Tanlangan restoran API kalitiga tegishli emas.');
    if (!terminalGroups.some(item => item.id === data.terminalGroupId && item.organizationId === org.id)) {
      throw new BadRequestException('Tanlangan POS guruhi restoranga tegishli emas.');
    }
    if (!menus.some(item => item.id === data.externalMenuId)) {
      throw new BadRequestException('Tashqi menyu API kalitida ko‘rinmadi. iikoWeb integratsiyasiga menyuni biriktiring.');
    }
    const catalog = await client.getExternalMenuNomenclature(org.id, data.externalMenuId);
    if (!catalog.products?.length) throw new BadRequestException('Tanlangan tashqi menyuda mahsulot yo‘q.');
    const currency = (org.currencyIsoName || '').toUpperCase();
    if (!['UZS', 'USD', 'EUR', 'RUB'].includes(currency)) {
      throw new BadRequestException('Restoran valyutasi qo‘llab-quvvatlanmaydi.');
    }
    const encryptedSecret = encryptSecret(JSON.stringify(this.normalizedCredentials(data.credentials)), this.encryptionKey());
    const config = { organizationId: org.id, terminalGroupId: data.terminalGroupId, externalMenuId: data.externalMenuId, currency };
    const metadata = {
      ...((existing?.metadata as Record<string, unknown>) || {}),
      description: `${org.name} restorani menyusi`, geography: [data.countryCode],
      ownerUserId: (existing?.metadata as Record<string, unknown> | null)?.ownerUserId || (isAdmin ? undefined : actor.id),
      iiko: { organizationName: org.name, menuName: menus.find(item => item.id === data.externalMenuId)?.name, productCount: catalog.products.length },
      isCertified: false, isPublished: false, reviewStatus: 'DRAFT', fulfillmentMode: 'DELIVERY'
    };
    const capabilities = [ProviderCapability.METADATA, ProviderCapability.HEALTH, ProviderCapability.LOCATIONS,
      ProviderCapability.CATALOG, ProviderCapability.SEARCH, ProviderCapability.QUOTE,
      ProviderCapability.ACTION_CREATE, ProviderCapability.ACTION_STATUS, ProviderCapability.ACTION_CANCEL];
    const provider = await prisma.$transaction(async tx => {
      const saved = existing
        ? await tx.provider.update({ where: { id: existing.id }, data: { name: data.name, status: ProviderStatus.DRAFT, adapterType: 'iiko',
            type: ProviderType.DELIVERY, category: ProviderCategory.FOOD_AND_DRINK, capabilities, baseUrl: 'https://api-ru.iiko.services',
            encryptedSecret, config, metadata } })
        : await tx.provider.create({ data: { slug: data.slug, name: data.name, status: ProviderStatus.DRAFT,
            environment: ProviderEnvironment.LIVE, adapterType: 'iiko', type: ProviderType.DELIVERY,
            category: ProviderCategory.FOOD_AND_DRINK, capabilities, baseUrl: 'https://api-ru.iiko.services',
            encryptedSecret, webhookSecret: randomBytes(32).toString('hex'), config, metadata } });
      if (!existing && !isAdmin) {
        const claimedOwner = await tx.user.updateMany({ where: { id: actor.id!, providerId: null }, data: { providerId: saved.id } });
        if (claimedOwner.count !== 1) throw new ConflictException('Hisobingizga boshqa provider biriktirilgan.');
      }
      await tx.location.upsert({ where: { providerId_providerLocationId: { providerId: saved.id, providerLocationId: org.id } },
        create: { providerId: saved.id, providerLocationId: org.id, name: org.name,
          address: org.restaurantAddress || org.name, latitude: org.latitude, longitude: org.longitude,
          isActive: true, metadata: { terminalGroupId: data.terminalGroupId } },
        update: { name: org.name, address: org.restaurantAddress || org.name,
          latitude: org.latitude, longitude: org.longitude, isActive: true, metadata: { terminalGroupId: data.terminalGroupId } } });
      return saved;
    });
    this.registry.invalidateAdapterCache(provider.slug);
    return { slug: provider.slug, status: provider.status, adapterType: provider.adapterType,
      organization: org.name, menu: metadata.iiko.menuName, productCount: catalog.products.length,
      message: 'iiko ulandi. Xaridorlarga chiqarish uchun admin review va publication kerak.' };
  }

  async status(actor: Actor) {
    const provider = await this.ownedProvider(actor);
    if (!provider || provider.adapterType !== 'iiko') return { connected: false };
    const config = provider.config as Record<string, string>;
    const metadata = provider.metadata as Record<string, any>;
    return { connected: true, slug: provider.slug, name: provider.name, status: provider.status,
      isPublished: metadata.isPublished === true, organizationId: config.organizationId,
      terminalGroupId: config.terminalGroupId, externalMenuId: config.externalMenuId,
      currency: config.currency, organizationName: metadata.iiko?.organizationName,
      menuName: metadata.iiko?.menuName, productCount: metadata.iiko?.productCount };
  }

  async checkSaved(actor: Actor, slug?: string) {
    const isAdmin = actor.role === UserRole.SUPER_ADMIN || actor.role === UserRole.ADMIN;
    if (slug && !isAdmin) throw new ForbiddenException('Bu tekshiruv faqat adminga ruxsat etilgan.');
    const provider = slug ? await prisma.provider.findUnique({ where: { slug } }) : await this.ownedProvider(actor);
    if (!provider || provider.adapterType !== 'iiko') throw new NotFoundException('iiko provider topilmadi.');
    const config = provider.config as Record<string, string>;
    const credentials = JSON.parse(decryptSecret(provider.encryptedSecret, this.encryptionKey())) as IikoCredentials;
    const client = this.client(credentials);
    const [organizations, groups, menus] = await Promise.all([
      client.getOrganizations(), client.getTerminalGroups([config.organizationId]), client.getExternalMenus()
    ]);
    const org = organizations.find(item => item.id === config.organizationId);
    const group = groups.find(item => item.id === config.terminalGroupId && item.organizationId === config.organizationId);
    const menu = menus.find(item => item.id === config.externalMenuId);
    if (!org || !group || !menu) return { connected: false, organizationFound: !!org,
      terminalGroupFound: !!group, externalMenuFound: !!menu };
    const [alive, catalog] = await Promise.all([
      client.checkTerminalGroupsAlive([group.id], [org.id]),
      client.getExternalMenuNomenclature(org.id, menu.id)
    ]);
    return { connected: true, organizationName: org.name, terminalGroupName: group.name, menuName: menu.name,
      terminalOnline: alive.some(item => item.terminalGroupId === group.id && item.isAlive),
      productCount: catalog.products.length };
  }

  private encryptionKey() {
    const key = process.env.ENCRYPTION_KEY;
    if (!key || !/^[0-9a-f]{64}$/i.test(key)) throw new Error('ENCRYPTION_KEY must be a 32-byte hex string.');
    return key;
  }
}
