import { Injectable, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ProviderRegistryService } from '../providers/provider-registry.service';
import { NatsService } from '../../common/services/nats.service';
import { prisma, ActionStatus as DbActionStatus, PaymentStatus as DbPaymentStatus, UserRole } from '@zayuno/database';
import {
  generatePublicActionId,
  NotFoundError,
  IdempotencyError,
  Logger,
  isProviderPublished,
  normalizeSupportContact,
  sanitizePublicSupportContact
} from '@zayuno/shared';
import { ZayunoEventTopic } from '@zayuno/event-schemas';
import {
  CreateActionInput,
  NormalizedAction,
  GetActionInput,
  CancelActionInput,
  CancelActionInputSchema,
  CancelActionResult,
  ActionStatus,
  PaymentStatus,
  ProviderCapability
} from '@zayuno/contracts';
import { QuoteExpiredError, ActionCancellationError } from '@zayuno/provider-sdk';
import { RedisService } from '../../common/services/redis.service';
import { findForbiddenParameterKey } from '../../common/sensitive-parameters';

type AccessScope = {
  id?: string;
  role?: UserRole;
  providerId?: string;
};

@Injectable()
export class ActionsService {
  private logger = new Logger('ActionsService');

  constructor(
    private registry: ProviderRegistryService,
    private natsService: NatsService,
    private redisService: RedisService
  ) {}

  async createAction(
    input: CreateActionInput,
    userId?: string,
    options?: { allowSandboxSimulator?: boolean }
  ): Promise<NormalizedAction> {
    if (!input.providerSlug) {
      throw new BadRequestException('providerSlug is required.');
    }
    const cleanSlug = input.providerSlug.toLowerCase().trim();

    // Idempotency key: use client-provided key or generate a unique random UUID
    const idempotencyKey = input.idempotencyKey || randomUUID();
    input.idempotencyKey = idempotencyKey;

    // Explicit confirmation guardrail check
    if (input.userConfirmed !== true) {
      throw new BadRequestException('Explicit user confirmation is required before creating an action.');
    }
    if (!input.quoteId) {
      throw new BadRequestException('A verified quoteId is required before creating an action.');
    }
    const forbiddenKey = findForbiddenParameterKey(input.parameters);
    if (forbiddenKey) {
      throw new BadRequestException(`Sensitive identity or payment field "${forbiddenKey}" is not allowed in action parameters. Use the provider-owned secure handoff.`);
    }

    // A client-supplied idempotency key is only meaningful inside that
    // client's account. Without this namespace, another API consumer who
    // guessed/reused a key could receive the first consumer's action.
    const scopedIdempotencyKey = `${userId || 'anonymous'}:${input.idempotencyKey}`;
    const idempotencyLockKey = `action:${scopedIdempotencyKey}`;
    const lockAcquired = await this.redisService.acquireLock(idempotencyLockKey, 30);
    if (!lockAcquired) {
      const concurrentAction = await prisma.action.findUnique({
        where: { idempotencyKey: scopedIdempotencyKey },
        include: { provider: true, location: true, timeline: { orderBy: { createdAt: 'asc' } } }
      });
      if (concurrentAction) return this.mapDbActionToNormalized(concurrentAction);
      throw new IdempotencyError();
    }

    try {

    // 1. Idempotency Check in Database
    const existingAction = await prisma.action.findUnique({
      where: { idempotencyKey: scopedIdempotencyKey },
      include: { provider: true, location: true, timeline: { orderBy: { createdAt: 'asc' } } }
    });

    if (existingAction) {
      this.logger.info(`Idempotent hit: returning existing action ${existingAction.publicId} for key ${input.idempotencyKey}`);
      return this.mapDbActionToNormalized(existingAction);
    }

    if (input.quoteId) {
      const existingQuoteAction = await prisma.action.findFirst({
        where: { quoteId: input.quoteId, provider: { slug: cleanSlug } },
        include: { provider: true, location: true, timeline: { orderBy: { createdAt: 'asc' } } }
      });
      if (existingQuoteAction) {
        if (userId) {
          if (existingQuoteAction.userId === userId) {
            this.logger.info(`Quote action hit: returning existing action ${existingQuoteAction.publicId} for user ${userId} on quote ${input.quoteId}`);
            return this.mapDbActionToNormalized(existingQuoteAction);
          } else {
            this.logger.warn(`Security violation: user ${userId} attempted to access quote ${input.quoteId} owned by ${existingQuoteAction.userId || 'anonymous'}`);
            throw new ForbiddenException('This quote has already been utilized by another account. Request a fresh quote.');
          }
        } else {
          // Anonymous caller
          if (existingQuoteAction.userId) {
            this.logger.warn(`Security violation: anonymous caller attempted to access quote ${input.quoteId} owned by user ${existingQuoteAction.userId}`);
            throw new ForbiddenException('This quote has already been utilized by an account. Request a fresh quote.');
          }

          // Customer phone/name must NEVER be trusted for authentication.
          // Anonymous callers must supply the original secret idempotencyKey / continuation credential.
          const hasValidCredential = Boolean(
            input.idempotencyKey &&
            existingQuoteAction.idempotencyKey === scopedIdempotencyKey
          );

          if (hasValidCredential) {
            this.logger.info(`Quote action hit: returning existing action ${existingQuoteAction.publicId} for verified anonymous idempotencyKey on quote ${input.quoteId}`);
            return this.mapDbActionToNormalized(existingQuoteAction);
          } else {
            this.logger.warn(`Security violation: anonymous caller without matching idempotency key attempted to reuse quote ${input.quoteId}`);
            throw new ConflictException('This quote has already been utilized. To retry an existing action, provide the original idempotency key, or request a fresh quote.');
          }
        }
      }
    }

    const provider = await prisma.provider.findUnique({ where: { slug: cleanSlug } });
    if (!provider) {
      throw new NotFoundError('Provider', cleanSlug);
    }
    const isSandboxSimulator = Boolean(
      options?.allowSandboxSimulator && cleanSlug === 'sandbox-provider'
    );
    if (!isProviderPublished(provider) && !isSandboxSimulator) {
      throw new BadRequestException('Provider is not published for public actions.');
    }

    // 2. A persisted quote is mandatory. It must belong to this provider and
    // remain valid; Core must not delegate this safety check to an adapter.
    const dbQuote = await prisma.quote.findUnique({ where: { id: input.quoteId } });
    if (!dbQuote) {
      throw new BadRequestException('The quoteId is unknown. Request a fresh verified quote before creating an action.');
    }
    if (dbQuote.providerId !== provider.id) {
      throw new BadRequestException('The quoteId does not belong to the requested provider.');
    }
    if (new Date() > dbQuote.expiresAt) {
      throw new QuoteExpiredError(input.quoteId);
    }

    // 3. Obtain Adapter and Check Capability
    const adapter = await this.registry.assertAndGetCapability(cleanSlug, ProviderCapability.ACTION_CREATE);
    if (!adapter.createAction) {
      throw new BadRequestException(`Provider "${cleanSlug}" does not implement createAction.`);
    }

    // 4. Call Provider Adapter
    const providerAction = await adapter.createAction({ ...input, idempotencyKey: scopedIdempotencyKey });
    // The checkout URL must originate from the provider. Core only normalizes the
    // preferred nextAction shape and its legacy paymentUrl alias for persistence.
    const providerPaymentUrl = providerAction.nextAction?.url || providerAction.paymentUrl;
    this.assertExternalProviderCheckoutUrl(providerPaymentUrl);

    const publicId = generatePublicActionId(cleanSlug);

    // 5. Persist Action in Database
    const dbAction = await prisma.action.create({
      data: {
        publicId,
        userId,
        providerId: provider.id,
        // Prefer the quote's resolved internal location. Older quotes or
        // provider-only locations intentionally remain null rather than
        // writing an external provider ID into this foreign-key column.
        locationId: dbQuote.locationId || undefined,
        quoteId: input.quoteId,
        status: this.mapContractStatusToDb(providerAction.status),
        lines: providerAction.lines as any,
        subtotal: providerAction.subtotal,
        fees: providerAction.fees || 0,
        discount: providerAction.discount || 0,
        total: providerAction.total,
        currency: providerAction.currency || 'UZS',
        customerName: input.customer?.name || 'Customer',
        customerPhone: input.customer?.phone || '+998900000000',
        destination: input.destination?.raw,
        latitude: input.destination?.coordinates?.latitude,
        longitude: input.destination?.coordinates?.longitude,
        fulfillmentType: input.fulfillmentType || 'STANDARD',
        externalActionId: providerAction.externalActionId,
        paymentMethod: input.paymentMethod || 'PAYME',
        paymentStatus: (providerAction.paymentStatus || PaymentStatus.PENDING) as DbPaymentStatus,
        paymentUrl: providerPaymentUrl,
        idempotencyKey: scopedIdempotencyKey,
        parameters: (input.parameters as any) || {},
        metadata: input.locationId ? { providerLocationId: input.locationId } : {}
      },
      include: { provider: true, location: true, timeline: true }
    });

    // 6. Record Initial Timeline Event
    await prisma.actionEvent.create({
      data: {
        actionId: dbAction.id,
        status: dbAction.status,
        description: `Action created (${publicId}). Awaiting payment or processing.`,
        source: 'AI_AGENT',
        payload: { idempotencyKey: input.idempotencyKey }
      }
    });

    // 7. Publish Event to Message Bus
    await this.natsService.publish(ZayunoEventTopic.ACTION_CREATED, {
      eventId: `evt_${Date.now()}`,
      timestamp: new Date().toISOString(),
      actionId: dbAction.id,
      publicId: dbAction.publicId,
      providerSlug: cleanSlug,
      providerId: provider.id,
      locationId: dbAction.locationId || undefined,
      userId: dbAction.userId || undefined,
      status: this.mapDbStatusToContract(dbAction.status),
      subtotal: Number(dbAction.subtotal),
      fees: Number(dbAction.fees),
      discount: Number(dbAction.discount),
      total: Number(dbAction.total),
      currency: dbAction.currency as any,
      fulfillmentType: dbAction.fulfillmentType,
      customerPhone: dbAction.customerPhone,
      itemsCount: Array.isArray(dbAction.lines) ? dbAction.lines.length : 1
    });

    return this.mapDbActionToNormalized(dbAction);
    } finally {
      await this.redisService.releaseLock(idempotencyLockKey);
    }
  }

  async getAction(input: GetActionInput, access?: AccessScope): Promise<NormalizedAction> {
    const action = await this.findActionByIdOrPublicId(input.actionId);
    if (!action) {
      throw new NotFoundError('Action', input.actionId);
    }
    this.assertActionAccess(action, access);
    return this.mapDbActionToNormalized(action);
  }

  async cancelAction(input: CancelActionInput, access?: AccessScope): Promise<CancelActionResult> {
    const parsed = CancelActionInputSchema.safeParse(input);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; '));
    input = parsed.data;
    const action = await this.findActionByIdOrPublicId(input.actionId);
    if (!action) {
      throw new NotFoundError('Action', input.actionId);
    }

    this.assertActionAccess(action, access);

    if (action.status === DbActionStatus.CANCELLED) {
      return {
        success: true,
        actionId: action.publicId,
        previousStatus: ActionStatus.CANCELLED,
        newStatus: ActionStatus.CANCELLED,
        message: 'Action is already cancelled.',
        refundInitiated: false
      };
    }

    if (([DbActionStatus.COMPLETED, DbActionStatus.FULFILLING] as DbActionStatus[]).includes(action.status)) {
      throw new ActionCancellationError(action.publicId, `Action cannot be cancelled in state ${action.status}.`);
    }

    const adapter = await this.registry.assertAndGetCapability(action.provider.slug, ProviderCapability.ACTION_CANCEL);
    if (!adapter.cancelAction) {
      throw new BadRequestException(`Provider "${action.provider.slug}" does not implement cancelAction.`);
    }

    const cancelResult = await adapter.cancelAction({
      providerSlug: action.provider.slug,
      actionId: action.externalActionId || action.id,
      reasonCode: input.reasonCode,
      reason: input.reason
    });

    await prisma.action.update({
      where: { id: action.id },
      data: { status: DbActionStatus.CANCELLED }
    });

    await prisma.actionEvent.create({
      data: {
        actionId: action.id,
        status: DbActionStatus.CANCELLED,
        description: `Action cancelled (${input.reasonCode || 'CUSTOMER_CANCELLED'}): ${input.reason || 'Customer requested cancellation'}`,
        source: 'AI_AGENT',
        payload: { reasonCode: input.reasonCode || 'CUSTOMER_CANCELLED', reason: input.reason }
      }
    });

    await this.natsService.publish(ZayunoEventTopic.ACTION_CANCELLED, {
      eventId: `evt_${Date.now()}`,
      timestamp: new Date().toISOString(),
      actionId: action.id,
      publicId: action.publicId,
      providerSlug: action.provider.slug,
      previousStatus: this.mapDbStatusToContract(action.status),
      newStatus: ActionStatus.CANCELLED,
      source: 'AI_AGENT',
      reason: input.reason
    });

    return cancelResult;
  }

  async getPaymentOptions(actionId: string, access?: AccessScope) {
    const action = await this.findActionByIdOrPublicId(actionId);
    if (!action) {
      throw new NotFoundError('Action', actionId);
    }

    this.assertActionAccess(action, access);
    const adapter = await this.registry.assertAndGetCapability(action.provider.slug, ProviderCapability.PAYMENT_OPTIONS);
    if (adapter.getPaymentOptions) {
      return adapter.getPaymentOptions({
        providerSlug: action.provider.slug,
        actionId: action.externalActionId || action.id
      });
    }

    return [];
  }

  async listActions(query: { providerSlug?: string; status?: DbActionStatus; limit?: number; access?: AccessScope }) {
    const where: any = {};
    const access = query.access;
    const isAdmin = access?.role === UserRole.SUPER_ADMIN || access?.role === UserRole.ADMIN;
    const isProviderUser = access?.role === UserRole.PROVIDER_OWNER || access?.role === UserRole.PROVIDER_DEVELOPER || access?.role === UserRole.PROVIDER_ANALYST;
    if (isProviderUser) {
      if (!access?.providerId) throw new ForbiddenException('Provider account is not linked to a provider.');
      where.providerId = access.providerId;
    } else if (!isAdmin && access?.id) {
      where.userId = access.id;
    }
    if (query.providerSlug) {
      where.provider = { slug: query.providerSlug.toLowerCase() };
    }
    if (query.status) where.status = query.status;

    const actions = await prisma.action.findMany({
      where,
      take: query.limit || 50,
      orderBy: { createdAt: 'desc' },
      include: { provider: true, location: true, timeline: { orderBy: { createdAt: 'asc' } } }
    });

    return actions.map(a => this.mapDbActionToNormalized(a));
  }

  private async findActionByIdOrPublicId(idOrPublicId: string) {
    return prisma.action.findFirst({
      where: {
        OR: [
          { id: idOrPublicId },
          { publicId: idOrPublicId }
        ]
      },
      include: { provider: true, location: true, timeline: { orderBy: { createdAt: 'asc' } } }
    });
  }

  private assertActionAccess(action: any, access?: AccessScope): void {
    // Internal service calls without a request context retain their historical
    // behaviour; every HTTP route supplies an access context.
    if (!access) return;
    if (access.role === UserRole.SUPER_ADMIN || access.role === UserRole.ADMIN) return;
    const isProviderUser = access.role === UserRole.PROVIDER_OWNER || access.role === UserRole.PROVIDER_DEVELOPER || access.role === UserRole.PROVIDER_ANALYST;
    if (isProviderUser && access.providerId === action.providerId) return;
    if (!isProviderUser && access.id && access.id === action.userId) return;
    throw new ForbiddenException('You do not have access to this action.');
  }

  private mapDbActionToNormalized(dbAction: any): NormalizedAction {
    const metadata = (dbAction.metadata as any) || {};
    const rawSupport = dbAction.provider?.config?.supportContact || (dbAction.provider?.metadata as any)?.supportContact;
    const supportContact = sanitizePublicSupportContact(normalizeSupportContact(rawSupport));

    return {
      id: dbAction.id,
      publicId: dbAction.publicId,
      providerSlug: dbAction.provider?.slug || '',
      providerName: dbAction.provider?.name || '',
      externalActionId: dbAction.externalActionId || undefined,
      quoteId: dbAction.quoteId || undefined,
      // Database relations use Zayuno's internal ID, while API consumers and
      // providers use the provider's location identifier.
      locationId: metadata.providerLocationId || dbAction.location?.providerLocationId || dbAction.locationId || undefined,
      status: this.mapDbStatusToContract(dbAction.status),
      nextAction: dbAction.paymentUrl ? {
        type: 'OPEN_URL',
        url: dbAction.paymentUrl,
        label: 'Pay now'
      } : undefined,
      lines: (dbAction.lines as any) || [],
      subtotal: Number(dbAction.subtotal),
      fees: Number(dbAction.fees),
      discount: Number(dbAction.discount),
      total: Number(dbAction.total),
      currency: dbAction.currency as any,
      customer: {
        name: dbAction.customerName,
        phone: dbAction.customerPhone
      },
      destination: dbAction.destination ? { raw: dbAction.destination } : undefined,
      fulfillmentType: dbAction.fulfillmentType,
      paymentMethod: dbAction.paymentMethod || undefined,
      paymentStatus: dbAction.paymentStatus as PaymentStatus,
      paymentUrl: dbAction.paymentUrl || undefined,
      idempotencyKey: dbAction.idempotencyKey || undefined,
      supportContact,
      parameters: (dbAction.parameters as any) || {},
      metadata,
      timeline: (dbAction.timeline || []).map((e: any) => ({
        id: e.id,
        status: this.mapDbStatusToContract(e.status),
        description: e.description,
        source: e.source as any,
        payload: (e.payload as any) || undefined,
        createdAt: e.createdAt.toISOString()
      })),
      createdAt: dbAction.createdAt.toISOString(),
      updatedAt: dbAction.updatedAt.toISOString()
    };
  }

  private assertExternalProviderCheckoutUrl(paymentUrl?: string): void {
    if (!paymentUrl) return;

    let url: URL;
    try {
      url = new URL(paymentUrl);
    } catch {
      throw new BadRequestException('Provider returned an invalid checkout URL.');
    }

    const hostname = url.hostname.toLowerCase();
    if (url.protocol !== 'https:' && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      throw new BadRequestException('Provider checkout URL must use HTTPS.');
    }

    if (hostname === 'zayuno.uz' || hostname.endsWith('.zayuno.uz')) {
      throw new BadRequestException('Provider checkout URL must not be hosted on a Zayuno-owned domain.');
    }
  }

  private mapContractStatusToDb(status: ActionStatus): DbActionStatus {
    const statusMap: Record<ActionStatus, DbActionStatus> = {
      [ActionStatus.CREATED]: DbActionStatus.SUBMITTED,
      [ActionStatus.AWAITING_PAYMENT]: DbActionStatus.AWAITING_PAYMENT,
      [ActionStatus.CONFIRMED]: DbActionStatus.ACCEPTED,
      [ActionStatus.PROCESSING]: DbActionStatus.IN_PROGRESS,
      [ActionStatus.COMPLETED]: DbActionStatus.COMPLETED,
      [ActionStatus.CANCELLED]: DbActionStatus.CANCELLED,
      [ActionStatus.FAILED]: DbActionStatus.FAILED
    };
    return statusMap[status] || DbActionStatus.SUBMITTED;
  }

  private mapDbStatusToContract(status: DbActionStatus): ActionStatus {
    const statusMap: Record<DbActionStatus, ActionStatus> = {
      [DbActionStatus.DRAFT]: ActionStatus.CREATED,
      [DbActionStatus.PENDING_CONFIRMATION]: ActionStatus.CREATED,
      [DbActionStatus.AWAITING_PAYMENT]: ActionStatus.AWAITING_PAYMENT,
      [DbActionStatus.SUBMITTED]: ActionStatus.CREATED,
      [DbActionStatus.ACCEPTED]: ActionStatus.CONFIRMED,
      [DbActionStatus.IN_PROGRESS]: ActionStatus.PROCESSING,
      [DbActionStatus.READY]: ActionStatus.PROCESSING,
      [DbActionStatus.FULFILLING]: ActionStatus.PROCESSING,
      [DbActionStatus.COMPLETED]: ActionStatus.COMPLETED,
      [DbActionStatus.CANCELLED]: ActionStatus.CANCELLED,
      [DbActionStatus.FAILED]: ActionStatus.FAILED
    };
    return statusMap[status] || ActionStatus.CREATED;
  }
}
