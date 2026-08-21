import { Injectable, BadRequestException, ForbiddenException, Optional } from '@nestjs/common';
import {
  prisma,
  ProviderStatus as DbProviderStatus,
  ProviderType as DbProviderType,
  ActionStatus as DbActionStatus,
  PaymentStatus as DbPaymentStatus,
  UserRole
} from '@zayuno/database';
import { ProviderRegistryService } from './provider-registry.service';
import { UnmetDemandService } from '../analytics/unmet-demand.service';
import {
  encryptSecret,
  decryptSecret,
  generateApiKey,
  NotFoundError,
  checkReservedBrand,
  normalizeSupportContact,
  sanitizePublicSupportContact,
  isProviderPublished,
  isProviderDiscoveryReady,
  computeAvailableServiceCount,
  getDynamicServiceMessage,
  getWelcomeMessage,
  redactForLogs,
  sanitizeHeaders
} from '@zayuno/shared';
import {
  ProviderInfo,
  ProviderStatus,
  ProviderType,
  ProviderCapability,
  HealthCheckResult,
  Location,
  GetLocationsInput,
  FindProvidersInput,
  FindProvidersResult,
  RegisterProviderInput,
  RegisterProviderInputSchema,
  UpdateProviderIntegrationInput,
  UpdateProviderIntegrationInputSchema,
  ProviderCredentials,
  MANDATORY_CAPABILITIES,
  getMandatoryCapabilitiesForProfile,
  determineProviderCapabilityProfile,
  WelcomeInfo
} from '@zayuno/contracts';
import { ProviderCertificationRunner, CertificationReport } from '@zayuno/provider-sdk';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { lookup } from 'dns/promises';
import { isIP } from 'net';

const REVIEW_REASON_CODES = new Set([
  'API_UNREACHABLE', 'CERTIFICATION_FAILED', 'CONTRACT_MISMATCH', 'OWNERSHIP_UNVERIFIED',
  'AUTHENTICATION_INVALID', 'WEBHOOK_INVALID', 'CHECKOUT_UNSAFE', 'MISLEADING_INFORMATION',
  'POLICY_VIOLATION', 'POLICY_OR_OPERATIONAL_RISK', 'MORE_INFORMATION_REQUIRED', 'OTHER'
]);

@Injectable()
export class ProvidersService {
  constructor(
    private registry: ProviderRegistryService,
    private unmetDemandService?: UnmetDemandService
  ) {}

  private getEncryptionKey(): string {
    if (!process.env.ENCRYPTION_KEY) throw new Error('ENCRYPTION_KEY is required.');
    return process.env.ENCRYPTION_KEY;
  }

  private serviceCountCache: {
    count: number;
    dynamicMessage: string;
    welcomeMessage: string;
    timestamp: number;
  } | null = null;
  private readonly SERVICE_COUNT_TTL_MS = 60_000;

  async getWelcomeInfo(): Promise<WelcomeInfo> {
    const now = Date.now();
    if (this.serviceCountCache && now - this.serviceCountCache.timestamp < this.SERVICE_COUNT_TTL_MS) {
      return {
        customerMessage: this.serviceCountCache.welcomeMessage,
        welcomeMessage: this.serviceCountCache.welcomeMessage,
        availableServiceCount: this.serviceCountCache.count,
        dynamicServiceMessage: this.serviceCountCache.dynamicMessage
      };
    }

    try {
      const providers = await prisma.provider.findMany({
        where: { status: DbProviderStatus.ACTIVE },
        include: { locations: true }
      });

      const count = computeAvailableServiceCount(providers);
      const dynamicServiceMessage = getDynamicServiceMessage(count);
      const welcomeMessage = getWelcomeMessage(count);

      this.serviceCountCache = {
        count,
        dynamicMessage: dynamicServiceMessage,
        welcomeMessage,
        timestamp: now
      };

      return {
        customerMessage: welcomeMessage,
        welcomeMessage,
        availableServiceCount: count,
        dynamicServiceMessage
      };
    } catch {
      const fallback = getWelcomeMessage(null);
      return {
        customerMessage: fallback,
        welcomeMessage: fallback,
        availableServiceCount: null,
        dynamicServiceMessage: getDynamicServiceMessage(null)
      };
    }
  }

  async listProviders(status?: ProviderStatus): Promise<ProviderInfo[]> {
    const providers = await prisma.provider.findMany({
      where: status ? { status } : { status: ProviderStatus.ACTIVE },
      include: { locations: true },
      orderBy: { name: 'asc' }
    });

    return providers.filter(p => this.isDiscoveryReady(p)).map(p => this.mapToProviderInfo(p));
  }

  async findProviders(filter: FindProvidersInput): Promise<FindProvidersResult> {
    const where: any = { status: ProviderStatus.ACTIVE };

    if (filter.query) {
      where.OR = [
        { name: { contains: filter.query, mode: 'insensitive' } },
        { slug: { contains: filter.query, mode: 'insensitive' } }
      ];
    }

    if (filter.capability) {
      where.capabilities = { has: filter.capability };
    }

    const providers = await prisma.provider.findMany({
      where,
      include: { locations: true },
      orderBy: { name: 'asc' }
    });

    let results = providers.filter(p => this.isDiscoveryReady(p)).map(p => this.mapToProviderInfo(p));

    if (filter.category && filter.category !== 'all') {
      results = results.filter(p => p.category?.toLowerCase() === filter.category?.toLowerCase() || p.type?.toLowerCase() === filter.category?.toLowerCase());
    }

    if (filter.geography) {
      results = results.filter(p => p.geography?.some(g => g.toLowerCase().includes(filter.geography!.toLowerCase())));
    }

    const total = results.length;
    const offset = filter.offset || 0;

    if (total === 0 && this.unmetDemandService) {
      let reasonCode: 'NO_PROVIDER_IN_CATEGORY' | 'NO_PROVIDER_IN_GEOGRAPHY' | 'CAPABILITY_UNSUPPORTED' | 'OUT_OF_COVERAGE' | 'NO_MATCHING_PROVIDERS' = 'NO_MATCHING_PROVIDERS';
      if (filter.category && filter.category !== 'all') {
        reasonCode = 'NO_PROVIDER_IN_CATEGORY';
      } else if (filter.geography) {
        reasonCode = 'NO_PROVIDER_IN_GEOGRAPHY';
      } else if (filter.capability) {
        reasonCode = 'CAPABILITY_UNSUPPORTED';
      }

      await this.unmetDemandService.recordUnmetDemand({
        category: filter.category !== 'all' ? filter.category : undefined,
        geography: filter.geography,
        capability: filter.capability,
        queryIntent: filter.query,
        reasonCode,
        source: 'FIND_PROVIDERS'
      });
    }

    return { total, providers: results.slice(offset, offset + (filter.limit || 20)) };
  }

  async getProviderBySlug(slug: string): Promise<ProviderInfo> {
    const cleanSlug = slug.toLowerCase().trim();
    const provider = await prisma.provider.findUnique({
      where: { slug: cleanSlug },
      include: { locations: true }
    });

    if (!provider) {
      throw new NotFoundError('Provider', cleanSlug);
    }

    if (!this.isPublished(provider)) throw new NotFoundError('Provider', cleanSlug);
    return this.mapToProviderInfo(provider);
  }

  async assertProviderPublished(slug: string): Promise<void> {
    await this.getProviderBySlug(slug);
  }

  async getProviderForActor(actor?: { providerId?: string; role?: UserRole }): Promise<ProviderInfo> {
    if (!actor?.providerId) throw new BadRequestException('Your account is not assigned to a provider application yet.');
    const provider = await prisma.provider.findUnique({ where: { id: actor.providerId }, include: { locations: true } });
    if (!provider) throw new NotFoundError('Provider', actor.providerId);
    return this.mapToProviderInfo(provider);
  }

  async getProviderDashboard(
    actor?: { providerId?: string; role?: UserRole },
    filters: {
      query?: string;
      status?: string;
      paymentStatus?: string;
      from?: string;
      to?: string;
      minTotal?: string;
      maxTotal?: string;
      sort?: string;
      limit?: string;
      offset?: string;
    } = {}
  ) {
    if (!actor?.providerId) throw new BadRequestException('Your account is not assigned to a provider application yet.');
    const provider = await prisma.provider.findUnique({ where: { id: actor.providerId } });
    if (!provider) throw new NotFoundError('Provider', actor.providerId);

    const status = filters.status && filters.status !== 'ALL'
      ? this.parseEnumValue(filters.status, DbActionStatus, 'action status')
      : undefined;
    const paymentStatus = filters.paymentStatus && filters.paymentStatus !== 'ALL'
      ? this.parseEnumValue(filters.paymentStatus, DbPaymentStatus, 'payment status')
      : undefined;
    const from = this.parseOptionalDate(filters.from, 'from');
    const to = this.parseOptionalDate(filters.to, 'to', true);
    const minTotal = this.parseOptionalMoney(filters.minTotal, 'minTotal');
    const maxTotal = this.parseOptionalMoney(filters.maxTotal, 'maxTotal');
    if (minTotal !== undefined && maxTotal !== undefined && minTotal > maxTotal) {
      throw new BadRequestException('minTotal cannot be greater than maxTotal.');
    }
    if (from && to && from > to) throw new BadRequestException('from cannot be later than to.');

    const limit = Math.min(Math.max(Number.parseInt(filters.limit || '20', 10) || 20, 1), 100);
    const offset = Math.max(Number.parseInt(filters.offset || '0', 10) || 0, 0);
    const query = filters.query?.trim();
    const actionWhere: any = {
      providerId: provider.id,
      ...(status ? { status } : {}),
      ...(paymentStatus ? { paymentStatus } : {}),
      ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
      ...(minTotal !== undefined || maxTotal !== undefined
        ? { total: { ...(minTotal !== undefined ? { gte: minTotal } : {}), ...(maxTotal !== undefined ? { lte: maxTotal } : {}) } }
        : {}),
      ...(query ? {
        OR: [
          { publicId: { contains: query, mode: 'insensitive' } },
          { externalActionId: { contains: query, mode: 'insensitive' } },
          { customerName: { contains: query, mode: 'insensitive' } },
          { customerPhone: { contains: query } }
        ]
      } : {})
    };
    const orderBy = filters.sort === 'oldest'
      ? { createdAt: 'asc' as const }
      : filters.sort === 'total_asc'
        ? { total: 'asc' as const }
        : filters.sort === 'total_desc'
          ? { total: 'desc' as const }
          : { createdAt: 'desc' as const };

    const [totalActions, pendingActions, completedActions, paidActions, failedActions, filteredTotal, actions] = await Promise.all([
      prisma.action.count({ where: { providerId: provider.id } }),
      prisma.action.count({ where: { providerId: provider.id, status: { in: ['AWAITING_PAYMENT', 'SUBMITTED', 'ACCEPTED', 'IN_PROGRESS', 'READY', 'FULFILLING'] } } }),
      prisma.action.count({ where: { providerId: provider.id, status: 'COMPLETED' } }),
      prisma.action.count({ where: { providerId: provider.id, paymentStatus: 'PAID' } }),
      prisma.action.count({ where: { providerId: provider.id, status: { in: ['CANCELLED', 'FAILED'] } } }),
      prisma.action.count({ where: actionWhere }),
      prisma.action.findMany({
        where: actionWhere,
        orderBy,
        skip: offset,
        take: limit,
        select: {
          publicId: true,
          externalActionId: true,
          status: true,
          paymentStatus: true,
          paymentMethod: true,
          total: true,
          currency: true,
          customerName: true,
          customerPhone: true,
          fulfillmentType: true,
          lines: true,
          createdAt: true,
          updatedAt: true,
          timeline: { orderBy: { createdAt: 'desc' }, take: 1 }
        }
      })
    ]);
    const mappedActions = actions.map(action => this.mapProviderActionSummary(action));
    return {
      provider: this.mapToProviderInfo(provider),
      metrics: { totalActions, pendingActions, completedActions, paidActions, failedActions },
      actions: mappedActions,
      recentActions: mappedActions,
      pagination: { total: filteredTotal, limit, offset, hasMore: offset + mappedActions.length < filteredTotal },
      filters: { query: query || null, status: status || null, paymentStatus: paymentStatus || null, from: from?.toISOString() || null, to: to?.toISOString() || null }
    };
  }

  async getProviderAction(actionId: string, actor?: { providerId?: string; role?: UserRole }) {
    if (!actor?.providerId) throw new BadRequestException('Your account is not assigned to a provider application yet.');
    const cleanActionId = actionId.trim();
    const action = await prisma.action.findFirst({
      where: {
        providerId: actor.providerId,
        OR: [{ publicId: cleanActionId }, { id: cleanActionId }, { externalActionId: cleanActionId }]
      },
      include: {
        provider: { select: { slug: true, name: true } },
        location: { select: { providerLocationId: true, name: true, address: true } },
        timeline: { orderBy: { createdAt: 'asc' } }
      }
    });
    if (!action) throw new NotFoundError('Action', cleanActionId);
    const terminalEvent = [...action.timeline].reverse().find(event => ['CANCELLED', 'FAILED'].includes(event.status));
    return {
      id: action.id,
      publicId: action.publicId,
      externalActionId: action.externalActionId,
      provider: action.provider,
      location: action.location,
      status: action.status,
      paymentStatus: action.paymentStatus,
      paymentStatusSource: 'PROVIDER_REPORTED',
      paymentMethod: action.paymentMethod,
      lines: action.lines,
      subtotal: Number(action.subtotal),
      fees: Number(action.fees),
      discount: Number(action.discount),
      total: Number(action.total),
      currency: action.currency,
      customer: { name: action.customerName, phone: action.customerPhone },
      destination: action.destination,
      fulfillmentType: action.fulfillmentType,
      cancellationReasonCode: terminalEvent && typeof terminalEvent.payload === 'object' && terminalEvent.payload
        ? (terminalEvent.payload as Record<string, any>).reasonCode || null
        : null,
      cancellationReason: terminalEvent?.description || null,
      createdAt: action.createdAt,
      updatedAt: action.updatedAt,
      timeline: action.timeline
    };
  }

  private mapProviderActionSummary(action: any) {
    const latestEvent = action.timeline?.[0];
    return {
      publicId: action.publicId,
      externalActionId: action.externalActionId,
      status: action.status,
      paymentStatus: action.paymentStatus,
      paymentStatusSource: 'PROVIDER_REPORTED',
      paymentMethod: action.paymentMethod,
      total: Number(action.total),
      currency: action.currency,
      customerName: action.customerName,
      customerPhoneMasked: this.maskPhone(action.customerPhone),
      fulfillmentType: action.fulfillmentType,
      lines: action.lines,
      latestEvent: latestEvent ? { status: latestEvent.status, description: latestEvent.description, createdAt: latestEvent.createdAt } : null,
      cancellationReason: latestEvent && ['CANCELLED', 'FAILED'].includes(latestEvent.status) ? latestEvent.description : null,
      cancellationReasonCode: latestEvent && ['CANCELLED', 'FAILED'].includes(latestEvent.status) && typeof latestEvent.payload === 'object' && latestEvent.payload
        ? (latestEvent.payload as Record<string, any>).reasonCode || null
        : null,
      createdAt: action.createdAt,
      updatedAt: action.updatedAt
    };
  }

  private maskPhone(phone: string): string {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 7) return '***';
    return `${phone.startsWith('+') ? '+' : ''}${digits.slice(0, 5)}***${digits.slice(-3)}`;
  }

  private parseEnumValue<T extends Record<string, string>>(value: string, enumType: T, label: string): T[keyof T] {
    const normalized = value.trim().toUpperCase();
    if (!Object.values(enumType).includes(normalized as T[keyof T])) {
      throw new BadRequestException(`Invalid ${label}: ${value}.`);
    }
    return normalized as T[keyof T];
  }

  private parseOptionalDate(value: string | undefined, label: string, endOfDay = false): Date | undefined {
    if (!value) return undefined;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new BadRequestException(`Invalid ${label} date.`);
    if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(value)) date.setUTCHours(23, 59, 59, 999);
    return date;
  }

  private parseOptionalMoney(value: string | undefined, label: string): number | undefined {
    if (value === undefined || value === '') return undefined;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) throw new BadRequestException(`${label} must be a non-negative number.`);
    return parsed;
  }

  async getCapabilities(providerSlug: string): Promise<ProviderCapability[]> {
    const info = await this.getProviderBySlug(providerSlug);
    return info.capabilities;
  }

  async checkHealth(providerSlug: string): Promise<HealthCheckResult> {
    await this.assertProviderPublished(providerSlug);
    const adapter = await this.registry.getAdapter(providerSlug);
    if (adapter.checkHealth) {
      return adapter.checkHealth();
    }
    return {
      status: 'HEALTHY',
      latencyMs: 0,
      message: 'Provider is registered.',
      timestamp: new Date().toISOString()
    };
  }

  async getLocations(providerSlug: string, input?: GetLocationsInput): Promise<Location[]> {
    await this.assertProviderPublished(providerSlug);
    const adapter = await this.registry.assertAndGetCapability(providerSlug, ProviderCapability.LOCATIONS);
    if (adapter.getLocations) {
      return adapter.getLocations(input);
    }
    // Fallback to database locations if adapter does not implement dynamic locations
    const provider = await prisma.provider.findUnique({
      where: { slug: providerSlug.toLowerCase().trim() },
      include: { locations: true }
    });
    if (!provider) throw new NotFoundError('Provider', providerSlug);

    return provider.locations.map(l => ({
      id: l.id,
      providerId: l.providerId,
      providerLocationId: l.providerLocationId,
      name: l.name,
      address: l.address,
      latitude: l.latitude || undefined,
      longitude: l.longitude || undefined,
      operatingHours: (l.operatingHours as any) || undefined,
      serviceRadiusKm: l.serviceRadiusKm,
      isActive: l.isActive,
      metadata: (l.metadata as any) || {}
    }));
  }

  async registerProvider(input: RegisterProviderInput, owner?: { id?: string; role?: UserRole }): Promise<{ provider: ProviderInfo; credentials: ProviderCredentials }> {
    const registration = RegisterProviderInputSchema.safeParse(input);
    if (!registration.success) throw new BadRequestException(registration.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; '));
    input = registration.data;
    if (!owner?.id) throw new BadRequestException('An authenticated provider owner is required to register a provider.');
    let existingOwnerDraft: any = null;
    if (owner.role === UserRole.PROVIDER_OWNER) {
      const account = await prisma.user.findUnique({ where: { id: owner.id }, select: { providerId: true } });
      if (account?.providerId) {
        const assigned = await prisma.provider.findUnique({ where: { id: account.providerId } });
        if (assigned) {
          if (assigned.status === ProviderStatus.DRAFT) {
            existingOwnerDraft = assigned;
          } else {
            throw new BadRequestException('This provider-owner account is already assigned to an active provider. Ask an administrator to create or transfer another provider account.');
          }
        }
      }
    }
    const cleanSlug = input.slug.toLowerCase().trim();
    const isOpsAdmin = owner?.role === UserRole.SUPER_ADMIN || owner?.role === UserRole.ADMIN;

    if (!isOpsAdmin) {
      const nameCheck = checkReservedBrand(input.name);
      const slugCheck = checkReservedBrand(cleanSlug);
      const brandMatch = nameCheck.isReserved ? nameCheck : slugCheck.isReserved ? slugCheck : null;

      if (brandMatch) {
        // Audit log the attempt without sensitive data
        console.warn(`[AUDIT] Public self-service registration blocked for reserved brand "${brandMatch.canonicalBrand}". Match reason: ${brandMatch.reason}. User: ${owner?.id}`);
        throw new BadRequestException({
          code: 'RESERVED_BRAND_PROTECTED',
          message: `The brand or slug "${input.name}" / "${cleanSlug}" is reserved for verified enterprise onboarding. Public self-service registration is not permitted. Please contact platform operations at operations@zayuno.uz.`
        });
      }
    }

    const existing = await prisma.provider.findUnique({ where: { slug: cleanSlug } });
    if (existing) {
      if (existing.status === ProviderStatus.DRAFT && (existing.id === existingOwnerDraft?.id || (existing.metadata as any)?.ownerUserId === owner.id)) {
        existingOwnerDraft = existing;
      } else {
        throw new BadRequestException(`Provider with slug "${cleanSlug}" already exists.`);
      }
    }

    const normalizedSupport = normalizeSupportContact(input.supportContact);

    // If updating an existing draft for this owner, persist updates idempotently
    if (existingOwnerDraft) {
      const updated = await prisma.provider.update({
        where: { id: existingOwnerDraft.id },
        data: {
          slug: cleanSlug,
          name: input.name,
          type: (input.type as any) || ProviderType.SERVICES,
          adapterType: input.baseUrl ? 'remote-http' : 'sandbox',
          capabilities: input.capabilities,
          baseUrl: input.baseUrl,
          config: {
            authMethod: input.authMethod,
            authConfig: input.authConfig || {},
            webhookUrl: input.webhookUrl,
            supportContact: normalizedSupport
          },
          metadata: {
            ...((existingOwnerDraft.metadata as Record<string, any>) || {}),
            category: input.category || 'general',
            geography: input.geography || ['UZ'],
            description: input.description,
            supportContact: normalizedSupport,
            isCertified: false,
            isPublished: false,
            reviewStatus: 'DRAFT',
            ownerUserId: owner.id,
            updatedAt: new Date().toISOString()
          }
        }
      });
      this.registry.invalidateAdapterCache(cleanSlug);
      if (cleanSlug !== existingOwnerDraft.slug) {
        this.registry.invalidateAdapterCache(existingOwnerDraft.slug);
      }

      if (owner.role === UserRole.PROVIDER_OWNER) {
        await prisma.user.update({ where: { id: owner.id }, data: { providerId: updated.id } });
      }

      const existingKey = await prisma.apiKey.findFirst({
        where: { providerId: updated.id, isActive: true }
      });
      const sandboxSecret = updated.webhookSecret || `zy_sb_sec_${Math.random().toString(36).substring(2, 12)}`;

      return {
        provider: this.mapToProviderInfo(updated),
        credentials: {
          providerSlug: cleanSlug,
          sandboxApiKey: existingKey?.keyPrefix ? `${existingKey.keyPrefix}...` : 'zy_test_sandbox_key',
          sandboxWebhookSecret: sandboxSecret
        }
      };
    }

    const sandboxKey = generateApiKey(false);
    const sandboxSecret = `zy_sb_sec_${Math.random().toString(36).substring(2, 12)}`;
    const encryptedSecret = encryptSecret(sandboxSecret, this.getEncryptionKey());

    const created = await prisma.provider.create({
      data: {
        slug: cleanSlug,
        name: input.name,
        type: (input.type as any) || ProviderType.SERVICES,
        status: ProviderStatus.DRAFT,
        adapterType: input.baseUrl ? 'remote-http' : 'sandbox',
        capabilities: input.capabilities,
        baseUrl: input.baseUrl,
        encryptedSecret,
        webhookSecret: sandboxSecret,
        config: {
          authMethod: input.authMethod,
          authConfig: input.authConfig || {},
          webhookUrl: input.webhookUrl,
          supportContact: normalizedSupport
        },
        metadata: {
          category: input.category || 'general',
          geography: input.geography || ['UZ'],
          description: input.description,
          supportContact: normalizedSupport,
          isCertified: false,
          isPublished: false,
          reviewStatus: 'DRAFT',
          ownerUserId: owner.id,
          registeredAt: new Date().toISOString()
        }
      }
    });

    const credentials: ProviderCredentials = {
      providerSlug: cleanSlug,
      sandboxApiKey: sandboxKey.rawKey,
      sandboxWebhookSecret: sandboxSecret
    };

    if (owner.role === UserRole.PROVIDER_OWNER) {
      await prisma.user.update({ where: { id: owner.id }, data: { providerId: created.id } });
    }
    // Raw API keys are shown once only. Persist the hash now so the issued
    // credential is actually accepted by the API, rather than being a demo
    // string that cannot authenticate any request.
    await prisma.apiKey.create({
      data: {
        name: `Provider sandbox key (${cleanSlug})`,
        keyHash: sandboxKey.keyHash,
        keyPrefix: sandboxKey.keyPrefix,
        role: UserRole.PROVIDER_DEVELOPER,
        userId: owner.id,
        providerId: created.id,
        isActive: true
      }
    });

    return {
      provider: this.mapToProviderInfo(created),
      credentials
    };
  }

  /** Operations-only onboarding: creates a separate provider-owner login and a DRAFT application. */
  async adminOnboardProvider(input: RegisterProviderInput & { ownerName: string; ownerEmail: string; temporaryPassword: string }): Promise<{ provider: ProviderInfo; credentials: ProviderCredentials; owner: { email: string; name: string } }> {
    const registration = RegisterProviderInputSchema.safeParse(input);
    if (!registration.success) throw new BadRequestException(registration.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; '));
    input = { ...input, ...registration.data };
    const slug = input.slug.toLowerCase().trim();
    if (!input.ownerName?.trim() || !input.ownerEmail?.trim() || input.temporaryPassword.length < 12) {
      throw new BadRequestException('Owner name, email, and a temporary password of at least 12 characters are required.');
    }
    const [existingProvider, existingOwner] = await Promise.all([
      prisma.provider.findUnique({ where: { slug } }),
      prisma.user.findUnique({ where: { email: input.ownerEmail.trim().toLowerCase() } })
    ]);
    if (existingProvider) throw new BadRequestException(`Provider with slug "${slug}" already exists.`);
    if (existingOwner) throw new BadRequestException('This owner email already has an account. Use a different email or transfer the account through support.');

    const nameCheck = checkReservedBrand(input.name);
    const slugCheck = checkReservedBrand(slug);
    const brandMatch = nameCheck.isReserved ? nameCheck : slugCheck.isReserved ? slugCheck : null;
    if (brandMatch) {
      console.log(`[AUDIT] Operations onboarded provider for reserved brand "${brandMatch.canonicalBrand}". Slug: "${slug}". Admin user.`);
    }

    const normalizedSupport = normalizeSupportContact(input.supportContact);
    const sandboxKey = generateApiKey(false);
    const webhookSecret = `zy_sb_sec_${Math.random().toString(36).slice(2, 14)}`;
    const encryptedSecret = encryptSecret(webhookSecret, this.getEncryptionKey());
    const passwordHash = await bcrypt.hash(input.temporaryPassword, 12);
    const result = await prisma.$transaction(async tx => {
      const provider = await tx.provider.create({ data: {
        slug, name: input.name.trim(), type: (input.type as any) || ProviderType.SERVICES,
        status: ProviderStatus.DRAFT, adapterType: input.baseUrl ? 'remote-http' : 'sandbox',
        capabilities: input.capabilities, baseUrl: input.baseUrl, encryptedSecret, webhookSecret,
        config: { authMethod: input.authMethod, authConfig: input.authConfig || {}, webhookUrl: input.webhookUrl, supportContact: normalizedSupport },
        metadata: { category: input.category || 'general', geography: input.geography || ['UZ'], description: input.description, supportContact: normalizedSupport, isCertified: false, isPublished: false, reviewStatus: 'DRAFT', registeredAt: new Date().toISOString() }
      }});
      const owner = await tx.user.create({ data: { id: randomUUID(), email: input.ownerEmail.trim().toLowerCase(), name: input.ownerName.trim(), passwordHash, role: UserRole.PROVIDER_OWNER, providerId: provider.id, isActive: true } });
      await tx.apiKey.create({ data: { name: `Provider sandbox key (${slug})`, keyHash: sandboxKey.keyHash, keyPrefix: sandboxKey.keyPrefix, role: UserRole.PROVIDER_DEVELOPER, userId: owner.id, providerId: provider.id, isActive: true } });
      return { provider, owner };
    });
    return { provider: this.mapToProviderInfo(result.provider), credentials: { providerSlug: slug, sandboxApiKey: sandboxKey.rawKey, sandboxWebhookSecret: webhookSecret }, owner: { email: result.owner.email, name: result.owner.name } };
  }

  async getProviderCredentials(slug: string, actor?: { id?: string; role?: UserRole; providerId?: string }): Promise<ProviderCredentials> {
    const cleanSlug = slug.toLowerCase().trim();
    const provider = await prisma.provider.findUnique({ where: { slug: cleanSlug } });
    if (!provider) throw new NotFoundError('Provider', cleanSlug);
    this.assertProviderManager(provider, actor);

    // Keys are intentionally one-time secrets. Returning a fabricated value
    // here used to make integrations look configured while authentication
    // silently failed. A replacement key must be issued through the key
    // management flow instead.
    throw new BadRequestException('The sandbox API key is shown only when the provider application is created. Create a replacement API key if it was not saved.');
  }

  async updateIntegrationSettings(
    slug: string,
    input: UpdateProviderIntegrationInput,
    actor?: { id?: string; role?: UserRole; providerId?: string }
  ): Promise<ProviderInfo> {
    const integration = UpdateProviderIntegrationInputSchema.safeParse(input);
    if (!integration.success) throw new BadRequestException(integration.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; '));
    input = integration.data;
    const cleanSlug = slug.toLowerCase().trim();
    const provider = await prisma.provider.findUnique({ where: { slug: cleanSlug } });
    if (!provider) throw new NotFoundError('Provider', cleanSlug);
    this.assertProviderManager(provider, actor);

    if (provider.status === DbProviderStatus.ACTIVE) {
      throw new BadRequestException('An ACTIVE provider cannot change integration settings. Ask Operations to suspend it first.');
    }
    const currentMetadata = (provider.metadata as Record<string, any>) || {};
    if (['REJECTED', 'SUSPENDED'].includes(String(currentMetadata.reviewStatus || ''))) {
      throw new BadRequestException('This provider is rejected or suspended. Operations must reopen the application before integration settings can be changed.');
    }

    const capabilities = [...new Set(input.capabilities || [])] as ProviderCapability[];
    const invalidCapabilities = capabilities.filter(capability => !Object.values(ProviderCapability).includes(capability));
    if (invalidCapabilities.length > 0) {
      throw new BadRequestException(`Unknown capabilities: ${invalidCapabilities.join(', ')}`);
    }
    const mandatoryForProfile = getMandatoryCapabilitiesForProfile(capabilities, { type: provider.type as any });
    const missingMandatory = mandatoryForProfile.filter(capability => !capabilities.includes(capability));
    if (missingMandatory.length > 0) {
      const profile = determineProviderCapabilityProfile(capabilities);
      throw new BadRequestException(`Missing mandatory capabilities for ${profile} profile: ${missingMandatory.join(', ')}`);
    }

    const baseUrl = await this.validateRemoteBaseUrl(input.baseUrl);
    const metadata = currentMetadata;
    const updateData: any = {
      baseUrl,
      adapterType: 'remote-http',
      status: DbProviderStatus.DRAFT,
      capabilities,
      config: {
        ...((provider.config as Record<string, any>) || {}),
        authMethod: input.authMethod || 'API_KEY'
      },
      metadata: {
        ...metadata,
        isCertified: false,
        isPublished: false,
        reviewStatus: 'DRAFT',
        reviewReasonCode: null,
        reviewReason: null,
        requiredChanges: [],
        lastCertificationReport: null,
        lastCertifiedAt: null,
        integrationUpdatedAt: new Date().toISOString(),
        integrationUpdatedBy: actor?.id || 'operations'
      }
    };

    if (input.apiSecret) updateData.encryptedSecret = encryptSecret(input.apiSecret, this.getEncryptionKey());
    if (input.webhookSecret) updateData.webhookSecret = input.webhookSecret;

    const updated = await prisma.provider.update({ where: { slug: cleanSlug }, data: updateData });
    this.registry.invalidateAdapterCache(cleanSlug);
    return this.mapToProviderInfo(updated);
  }

  async runCertification(slug: string, actor?: { id?: string; role?: UserRole; providerId?: string }): Promise<CertificationReport> {
    const cleanSlug = slug.toLowerCase().trim();
    const provider = await prisma.provider.findUnique({ where: { slug: cleanSlug } });
    if (!provider) throw new NotFoundError('Provider', cleanSlug);
    this.assertProviderManager(provider, actor);
    const adapter = await this.registry.getAdapter(cleanSlug);
    const runner = new ProviderCertificationRunner(adapter);
    const report = await runner.runAllTests();

    // Persist certification outcome in provider record
    await prisma.provider.update({
      where: { slug: cleanSlug },
      data: {
        metadata: {
          ...(await this.getMetadata(cleanSlug)),
          isCertified: report.isProductionReady,
          lastCertificationReport: report as any,
          lastCertifiedAt: new Date().toISOString()
        } as any
      }
    });

    return report;
  }

  async submitForReview(slug: string, actor?: { id?: string; role?: UserRole; providerId?: string }): Promise<{ success: boolean; message: string }> {
    const cleanSlug = slug.toLowerCase().trim();
    const provider = await prisma.provider.findUnique({ where: { slug: cleanSlug } });
    if (!provider) throw new NotFoundError('Provider', cleanSlug);
    this.assertProviderManager(provider, actor);

    const meta = (provider.metadata as any) || {};
    if (!meta.isCertified || meta.lastCertificationReport?.isProductionReady !== true) {
      throw new BadRequestException('Provider must pass every test and all mandatory capabilities before submitting for review.');
    }

    await prisma.provider.update({
      where: { slug: cleanSlug },
      data: {
        metadata: {
          ...meta,
          reviewStatus: 'PENDING_APPROVAL',
          reviewReasonCode: null,
          reviewReason: null,
          requiredChanges: [],
          submittedAt: new Date().toISOString()
        }
      }
    });

    return {
      success: true,
      message: 'Integration submitted successfully. Platform operations team will review within 24-48 hours.'
    };
  }

  async publishProvider(slug: string): Promise<ProviderInfo> {
    const cleanSlug = slug.toLowerCase().trim();
    const provider = await prisma.provider.findUnique({ where: { slug: cleanSlug } });
    if (!provider) throw new NotFoundError('Provider', cleanSlug);
    const metadata = (provider.metadata as Record<string, any>) || {};
    if (!metadata.isCertified || metadata.reviewStatus !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Only a certified provider submitted for approval can be published.');
    }

    // Never publish from a stale report. The provider may have rotated a key,
    // changed DNS, or broken its contract after submitting for review.
    this.registry.invalidateAdapterCache(cleanSlug);
    const liveAdapter = await this.registry.getAdapter(cleanSlug);
    const liveReport = await new ProviderCertificationRunner(liveAdapter).runAllTests();
    await prisma.provider.update({
      where: { slug: cleanSlug },
      data: {
        metadata: {
          ...metadata,
          isCertified: liveReport.isProductionReady,
          lastCertificationReport: liveReport as any,
          lastCertifiedAt: new Date().toISOString()
        }
      }
    });
    if (!liveReport.isProductionReady) {
      throw new BadRequestException('Live pre-publish certification failed. Fix the integration and run certification again.');
    }

    const updated = await prisma.provider.update({
      where: { slug: cleanSlug },
      data: {
        status: ProviderStatus.ACTIVE,
        metadata: {
          ...(await this.getMetadata(cleanSlug)),
          isPublished: true,
          reviewStatus: 'APPROVED',
          reviewReasonCode: null,
          reviewReason: null,
          requiredChanges: [],
          publishedAt: new Date().toISOString()
        }
      }
    });

    this.registry.invalidateAdapterCache(cleanSlug);
    return this.mapToProviderInfo(updated);
  }

  async rejectOrSuspendProvider(slug: string, decision: 'REJECT' | 'SUSPEND', reason: string): Promise<ProviderInfo> {
    return this.reviewProvider(slug, { decision, reasonCode: decision === 'REJECT' ? 'OTHER' : 'POLICY_OR_OPERATIONAL_RISK', reason });
  }

  async reviewProvider(slug: string, input: {
    decision: 'REQUEST_CHANGES' | 'REJECT' | 'SUSPEND';
    reasonCode: string;
    reason: string;
    requiredChanges?: string[];
    internalNote?: string;
  }): Promise<ProviderInfo> {
    const cleanSlug = slug.toLowerCase().trim();
    const provider = await prisma.provider.findUnique({ where: { slug: cleanSlug } });
    if (!provider) throw new NotFoundError('Provider', cleanSlug);
    if (!input.reasonCode?.trim()) throw new BadRequestException('A review reason code is required.');
    const reasonCode = input.reasonCode.trim().toUpperCase();
    if (!REVIEW_REASON_CODES.has(reasonCode)) throw new BadRequestException(`Unsupported review reason code: ${input.reasonCode}.`);
    if (!input.reason?.trim()) throw new BadRequestException('A partner-visible review explanation is required.');
    if (input.reason.trim().length < 12) throw new BadRequestException('The partner-visible explanation must contain at least 12 characters.');
    const metadata = (provider.metadata as Record<string, any>) || {};
    const reviewedAt = new Date().toISOString();
    const reviewStatus = input.decision === 'REQUEST_CHANGES' ? 'CHANGES_REQUESTED' : input.decision === 'REJECT' ? 'REJECTED' : 'SUSPENDED';
    const requiredChanges = (input.requiredChanges || []).map(value => value.trim()).filter(Boolean).map(value => value.slice(0, 500)).slice(0, 20);
    const history = Array.isArray(metadata.reviewHistory) ? metadata.reviewHistory : [];
    const reviewEntry = {
      decision: input.decision,
      reasonCode,
      reason: input.reason.trim(),
      requiredChanges,
      internalNote: input.internalNote?.trim().slice(0, 2000) || undefined,
      reviewedAt
    };
    const updated = await prisma.provider.update({
      where: { slug: cleanSlug },
      data: {
        status: input.decision === 'REQUEST_CHANGES' && provider.status !== DbProviderStatus.ACTIVE ? DbProviderStatus.DRAFT : DbProviderStatus.SUSPENDED,
        metadata: {
          ...metadata,
          isPublished: false,
          reviewStatus,
          reviewReasonCode: reviewEntry.reasonCode,
          reviewReason: reviewEntry.reason,
          requiredChanges,
          reviewedAt,
          reviewHistory: [...history.slice(-49), reviewEntry]
        }
      }
    });
    this.registry.invalidateAdapterCache(cleanSlug);
    return this.mapToProviderInfo(updated);
  }

  async reopenProvider(slug: string): Promise<ProviderInfo> {
    const cleanSlug = slug.toLowerCase().trim();
    const provider = await prisma.provider.findUnique({ where: { slug: cleanSlug } });
    if (!provider) throw new NotFoundError('Provider', cleanSlug);
    const metadata = (provider.metadata as Record<string, any>) || {};
    if (!['REJECTED', 'SUSPENDED'].includes(String(metadata.reviewStatus || ''))) {
      throw new BadRequestException('Only a rejected or suspended provider can be reopened.');
    }
    const updated = await prisma.provider.update({
      where: { slug: cleanSlug },
      data: {
        status: DbProviderStatus.DRAFT,
        metadata: {
          ...metadata,
          isPublished: false,
          isCertified: false,
          reviewStatus: 'DRAFT',
          reopenedAt: new Date().toISOString()
        }
      }
    });
    this.registry.invalidateAdapterCache(cleanSlug);
    return this.mapToProviderInfo(updated);
  }

  async createProvider(data: {
    slug: string;
    name: string;
    logoUrl?: string;
    type?: ProviderType;
    status?: ProviderStatus;
    adapterType?: string;
    capabilities: ProviderCapability[];
    baseUrl?: string;
    secret: string;
    webhookSecret: string;
    config?: any;
    metadata?: any;
  }) {
    const encryptedSecret = encryptSecret(data.secret, this.getEncryptionKey());

    const provider = await prisma.provider.create({
      data: {
        slug: data.slug.toLowerCase().trim(),
        name: data.name,
        logoUrl: data.logoUrl,
        type: data.type || ProviderType.SERVICES,
        status: data.status || ProviderStatus.SANDBOX,
        adapterType: data.adapterType || 'sandbox',
        capabilities: data.capabilities,
        baseUrl: data.baseUrl,
        encryptedSecret,
        webhookSecret: data.webhookSecret,
        config: data.config || {},
        metadata: data.metadata || {}
      }
    });

    return provider;
  }

  async updateProvider(slug: string, data: Partial<{
    name: string;
    logoUrl: string;
    status: ProviderStatus;
    type: ProviderType;
    adapterType: string;
    baseUrl: string;
    secret: string;
    webhookSecret: string;
    capabilities: ProviderCapability[];
    config: any;
    metadata: any;
  }>) {
    const cleanSlug = slug.toLowerCase().trim();
    const updateData: any = { ...data };
    if (data.secret) {
      updateData.encryptedSecret = encryptSecret(data.secret, this.getEncryptionKey());
      delete updateData.secret;
    }

    const updated = await prisma.provider.update({
      where: { slug: cleanSlug },
      data: updateData
    });

    this.registry.invalidateAdapterCache(cleanSlug);
    return this.mapToProviderInfo(updated);
  }

  private async validateRemoteBaseUrl(rawBaseUrl: string): Promise<string> {
    let url: URL;
    try {
      url = new URL(rawBaseUrl);
    } catch {
      throw new BadRequestException('Integration Base URL must be a valid absolute URL.');
    }

    const isProduction = process.env.NODE_ENV === 'production';
    if ((isProduction && url.protocol !== 'https:') || (!isProduction && !['http:', 'https:'].includes(url.protocol))) {
      throw new BadRequestException(isProduction ? 'Production integration Base URL must use HTTPS.' : 'Integration Base URL must use HTTP or HTTPS.');
    }
    if (url.username || url.password) throw new BadRequestException('Credentials must not be embedded in the Base URL.');

    const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
    if (!hostname || hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local')) {
      throw new BadRequestException('Local or private integration hosts are not allowed.');
    }

    let addresses: Array<{ address: string }>;
    try {
      addresses = isIP(hostname) ? [{ address: hostname }] : await lookup(hostname, { all: true, verbatim: true });
    } catch {
      throw new BadRequestException('Integration hostname could not be resolved.');
    }
    if (addresses.length === 0 || addresses.some(result => this.isPrivateOrReservedAddress(result.address))) {
      throw new BadRequestException('Integration Base URL must resolve only to public IP addresses.');
    }

    url.hash = '';
    url.search = '';
    return url.toString().replace(/\/$/, '');
  }

  private isPrivateOrReservedAddress(rawAddress: string): boolean {
    const address = rawAddress.toLowerCase();
    const mappedIpv4 = address.startsWith('::ffff:') ? address.slice(7) : address;
    if (isIP(mappedIpv4) === 4) {
      const [a, b] = mappedIpv4.split('.').map(Number);
      return a === 0 || a === 10 || a === 127 || a >= 224 ||
        (a === 100 && b >= 64 && b <= 127) ||
        (a === 169 && b === 254) ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168) ||
        (a === 198 && (b === 18 || b === 19));
    }
    if (isIP(address) === 6) {
      return address === '::' || address === '::1' || address.startsWith('fc') || address.startsWith('fd') || /^fe[89ab]/.test(address);
    }
    return true;
  }

  private mapToProviderInfo(p: any): ProviderInfo {
    const meta = (p.metadata as any) || {};
    // Review history may contain operations-only notes. Public/provider-facing
    // payloads expose the current partner-visible reason, never internal notes.
    const { reviewHistory: _reviewHistory, ...safeMeta } = meta;
    const isPublished = isProviderPublished(p);
    const rawSupport = p.config?.supportContact || meta.supportContact;
    const supportContact = sanitizePublicSupportContact(normalizeSupportContact(rawSupport));

    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      description: meta.description || undefined,
      logoUrl: p.logoUrl || undefined,
      status: p.status as any,
      type: p.type as any,
      category: meta.category || 'general',
      geography: meta.geography || ['UZ'],
      adapterType: p.adapterType,
      authMethod: p.config?.authMethod || 'API_KEY',
      capabilities: p.capabilities as any,
      baseUrl: p.baseUrl || undefined,
      supportContact,
      isCertified: meta.isCertified || false,
      isPublished,
      // Prevent stale registration metadata from contradicting the canonical
      // publication state on the provider record.
      metadata: { ...safeMeta, isPublished }
    };
  }

  isPublished(provider: any): boolean {
    return isProviderPublished(provider);
  }

  isDiscoveryReady(provider: any): boolean {
    return isProviderDiscoveryReady(provider).isReady;
  }

  private assertProviderManager(provider: { id: string }, actor?: { role?: UserRole; providerId?: string }): void {
    if (actor?.role === UserRole.SUPER_ADMIN || actor?.role === UserRole.ADMIN) return;
    if (!actor?.providerId || actor.providerId !== provider.id) {
      throw new ForbiddenException('You can only manage the provider assigned to your account.');
    }
  }

  private async getMetadata(slug: string): Promise<Record<string, any>> {
    const p = await prisma.provider.findUnique({ where: { slug } });
    return (p?.metadata as any) || {};
  }

  async getProviderLogsBySlug(
    slug: string,
    currentUser: { id?: string; role?: UserRole; providerId?: string },
    filters: {
      traceId?: string;
      from?: string;
      to?: string;
      limit?: number;
      offset?: number;
    }
  ) {
    const cleanSlug = slug.toLowerCase().trim();
    const provider = await prisma.provider.findUnique({
      where: { slug: cleanSlug },
      include: { users: true }
    });

    if (!provider) {
      throw new NotFoundError('Provider', cleanSlug);
    }

    // Strict Tenant Isolation: only admin or assigned provider owner/developer
    if (currentUser.role !== UserRole.SUPER_ADMIN && currentUser.role !== UserRole.ADMIN) {
      const meta = (provider.metadata as any) || {};
      const isOwner = meta.ownerId && meta.ownerId === currentUser.id;
      const isAssigned = currentUser.providerId && currentUser.providerId === provider.id;
      const isUser = provider.users?.some(u => u.id === currentUser.id);
      if (!isOwner && !isAssigned && !isUser) {
        throw new ForbiddenException('You do not have permission to view logs for this provider.');
      }
    }

    const limit = Math.min(Math.max(filters.limit || 50, 1), 200);
    const offset = Math.max(filters.offset || 0, 0);

    const fromDate = filters.from ? new Date(filters.from) : undefined;
    const toDate = filters.to ? new Date(filters.to) : undefined;
    const createdAt = fromDate || toDate ? {
      ...(fromDate ? { gte: fromDate } : {}),
      ...(toDate ? { lte: toDate } : {})
    } : undefined;

    const [integrationLogs, webhookLogs, totalIntegration, totalWebhooks] = await Promise.all([
      prisma.integrationLog.findMany({
        where: {
          providerId: provider.id,
          ...(filters.traceId ? { traceId: filters.traceId } : {}),
          ...(createdAt ? { createdAt } : {})
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.webhookLog.findMany({
        where: {
          providerId: provider.id,
          ...(createdAt ? { createdAt } : {})
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.integrationLog.count({
        where: {
          providerId: provider.id,
          ...(filters.traceId ? { traceId: filters.traceId } : {}),
          ...(createdAt ? { createdAt } : {})
        }
      }),
      prisma.webhookLog.count({
        where: {
          providerId: provider.id,
          ...(createdAt ? { createdAt } : {})
        }
      })
    ]);

    const items = [
      ...integrationLogs.map(log => ({
        id: `integration:${log.id}`,
        source: 'INTEGRATION',
        method: log.method,
        endpoint: log.endpoint,
        statusCode: log.statusCode,
        durationMs: log.durationMs,
        traceId: log.traceId,
        isRetryable: log.statusCode >= 500 || log.statusCode === 429,
        errorMessage: log.errorMessage,
        requestBody: redactForLogs(log.requestBody),
        responseBody: redactForLogs(log.responseBody),
        createdAt: log.createdAt
      })),
      ...webhookLogs.map(log => ({
        id: `webhook:${log.id}`,
        source: 'WEBHOOK',
        method: 'POST',
        endpoint: '/api/v1/webhooks',
        statusCode: log.isVerified ? (log.isProcessed ? 200 : 202) : 401,
        durationMs: 0,
        traceId: null,
        isRetryable: !log.isProcessed && log.isVerified,
        errorMessage: log.errorMessage,
        event: log.event,
        isVerified: log.isVerified,
        isProcessed: log.isProcessed,
        headers: sanitizeHeaders(log.headers as any),
        payload: redactForLogs(log.payload),
        createdAt: log.createdAt
      }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return {
      providerSlug: provider.slug,
      providerName: provider.name,
      total: totalIntegration + totalWebhooks,
      limit,
      offset,
      logs: items
    };
  }
}
