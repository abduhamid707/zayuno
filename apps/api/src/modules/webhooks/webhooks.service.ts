import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ProviderRegistryService } from '../providers/provider-registry.service';
import { NatsService } from '../../common/services/nats.service';
import { prisma, ActionStatus, PaymentStatus } from '@zayuno/database';
import { Logger, NotFoundError } from '@zayuno/shared';
import { ZayunoEventTopic } from '@zayuno/event-schemas';
import { ActionStatus as ContractActionStatus, ProviderCapability } from '@zayuno/contracts';
import { RedisService } from '../../common/services/redis.service';
import { canApplyPaymentStatus, canTransitionAction } from '../../common/action-state-machine';

@Injectable()
export class WebhooksService {
  private logger = new Logger('WebhooksService');

  constructor(
    private registry: ProviderRegistryService,
    private natsService: NatsService,
    private redisService: RedisService
  ) {}

  async handleProviderWebhook(
    providerSlug: string,
    headers: Record<string, string | string[] | undefined>,
    body: any,
    rawBody?: string
  ) {
    const cleanSlug = providerSlug.toLowerCase().trim();
    const provider = await prisma.provider.findUnique({ where: { slug: cleanSlug } });

    if (!provider) {
      throw new NotFoundError('Provider', cleanSlug);
    }

    const adapter = await this.registry.assertAndGetCapability(cleanSlug, ProviderCapability.WEBHOOK);

    // 1. Verify HMAC Signature
    const rawBodyString = rawBody ?? JSON.stringify(body);
    const signature = (headers['x-zayuno-signature'] || headers['x-provider-signature'] || '') as string;

    const isVerified = adapter.verifyWebhook
      ? await adapter.verifyWebhook(headers, rawBodyString, provider.webhookSecret)
      : true;

    const isStrict = process.env.NODE_ENV === 'production' || process.env.STRICT_WEBHOOKS === 'true';
    if (!isVerified && isStrict) {
      this.logger.warn(`Webhook signature verification failed for provider: ${cleanSlug}`);
      await prisma.webhookLog.create({
        data: {
          providerId: provider.id,
          event: body?.eventType || body?.event || 'UNKNOWN',
          headers: headers as any,
          payload: (typeof body === 'object' ? body : {}) as any,
          signature,
          isVerified: false,
          isProcessed: false,
          errorMessage: 'Invalid HMAC signature'
        }
      });
      throw new UnauthorizedException('Invalid webhook signature.');
    }

    // 2. Parse Webhook Event via Adapter
    if (!adapter.parseWebhookEvent) {
      throw new Error(`Provider "${cleanSlug}" does not implement parseWebhookEvent.`);
    }

    const parsedEvent = await adapter.parseWebhookEvent(headers, body);

    // Providers retry deliveries. Keep the event key after successful
    // processing so a retry cannot create duplicate timeline/NATS events.
    const dedupeKey = `webhook:${provider.id}:${parsedEvent.eventId}`;
    const lockAcquired = await this.redisService.acquireLock(dedupeKey, 86_400);
    if (!lockAcquired) {
      this.logger.info(`Ignoring duplicate webhook event ${parsedEvent.eventId} for provider ${cleanSlug}`);
      return { success: true, processed: false, duplicate: true, eventId: parsedEvent.eventId };
    }

    try {

    // 3. Save Raw Webhook Log for Audit
    const webhookLog = await prisma.webhookLog.create({
      data: {
        providerId: provider.id,
        event: parsedEvent.eventType,
        headers: headers as any,
        payload: parsedEvent.payload as any,
        signature,
        isVerified: true,
        isProcessed: true
      }
    });

    this.logger.info(`Processing verified webhook [${parsedEvent.eventType}] for action ${parsedEvent.externalActionId || parsedEvent.actionId}`);

    // 4. Update Action State
    const action = await prisma.action.findFirst({
      where: {
        providerId: provider.id,
        OR: [
          ...(parsedEvent.externalActionId ? [{ externalActionId: parsedEvent.externalActionId }] : []),
          ...(parsedEvent.actionId ? [{ id: parsedEvent.actionId }, { publicId: parsedEvent.actionId }] : [])
        ]
      }
    });

    if (action) {
      const updateData: any = {};
      const newStatus = parsedEvent.newStatus;
      const newPaymentStatus = parsedEvent.newPaymentStatus;

      if (newStatus) {
        const mappedStatus = this.mapContractStatusToDb(newStatus);
        if (!canTransitionAction(action.status, mappedStatus)) {
          this.logger.warn(`Rejected invalid webhook state transition for ${action.publicId}: ${action.status} -> ${mappedStatus}`);
          return {
            success: true,
            processed: false,
            ignored: true,
            reason: `Invalid action state transition: ${action.status} -> ${mappedStatus}`,
            eventId: parsedEvent.eventId,
            webhookLogId: webhookLog.id
          };
        }
        updateData.status = mappedStatus;
      }
      if (newPaymentStatus) {
        if (!canApplyPaymentStatus(action.status, action.paymentStatus, newPaymentStatus as PaymentStatus)) {
          this.logger.warn(`Rejected invalid payment transition for ${action.publicId}: ${action.paymentStatus} -> ${newPaymentStatus}`);
          return {
            success: true,
            processed: false,
            ignored: true,
            reason: `Invalid payment transition for action state ${action.status}`,
            eventId: parsedEvent.eventId,
            webhookLogId: webhookLog.id
          };
        }
        updateData.paymentStatus = newPaymentStatus as PaymentStatus;
      }

      await prisma.action.update({
        where: { id: action.id },
        data: updateData
      });

      // Add Timeline Event
      await prisma.actionEvent.create({
        data: {
          actionId: action.id,
          status: newStatus ? this.mapContractStatusToDb(newStatus) : action.status,
          description: parsedEvent.description || `Action status updated to ${newStatus || action.status}`,
          source: 'PROVIDER_WEBHOOK',
          payload: parsedEvent.payload as any
        }
      });

      // 5. Emit Event
      await this.natsService.publish(ZayunoEventTopic.ACTION_UPDATED, {
        eventId: parsedEvent.eventId,
        timestamp: parsedEvent.timestamp,
        actionId: action.id,
        publicId: action.publicId,
        providerSlug: provider.slug,
        previousStatus: this.mapDbStatusToContract(action.status),
        newStatus: newStatus || this.mapDbStatusToContract(action.status),
        source: 'PROVIDER_WEBHOOK',
        externalActionId: parsedEvent.externalActionId
      });
    } else {
      this.logger.warn(`No action found in database for external ID: ${parsedEvent.externalActionId || parsedEvent.actionId}`);
    }

    return {
      success: true,
      processed: true,
      eventId: parsedEvent.eventId,
      webhookLogId: webhookLog.id
    };
    } catch (error) {
      // Let a provider retry a delivery that failed before it was committed.
      await this.redisService.releaseLock(dedupeKey);
      throw error;
    }
  }

  private mapContractStatusToDb(status: ContractActionStatus): ActionStatus {
    const statusMap: Record<ContractActionStatus, ActionStatus> = {
      [ContractActionStatus.CREATED]: ActionStatus.SUBMITTED,
      [ContractActionStatus.AWAITING_PAYMENT]: ActionStatus.AWAITING_PAYMENT,
      [ContractActionStatus.CONFIRMED]: ActionStatus.ACCEPTED,
      [ContractActionStatus.PROCESSING]: ActionStatus.IN_PROGRESS,
      [ContractActionStatus.COMPLETED]: ActionStatus.COMPLETED,
      [ContractActionStatus.CANCELLED]: ActionStatus.CANCELLED,
      [ContractActionStatus.FAILED]: ActionStatus.FAILED
    };
    return statusMap[status] || ActionStatus.SUBMITTED;
  }

  private mapDbStatusToContract(status: ActionStatus): ContractActionStatus {
    const statusMap: Record<ActionStatus, ContractActionStatus> = {
      [ActionStatus.DRAFT]: ContractActionStatus.CREATED,
      [ActionStatus.PENDING_CONFIRMATION]: ContractActionStatus.CREATED,
      [ActionStatus.AWAITING_PAYMENT]: ContractActionStatus.AWAITING_PAYMENT,
      [ActionStatus.SUBMITTED]: ContractActionStatus.CREATED,
      [ActionStatus.ACCEPTED]: ContractActionStatus.CONFIRMED,
      [ActionStatus.IN_PROGRESS]: ContractActionStatus.PROCESSING,
      [ActionStatus.READY]: ContractActionStatus.PROCESSING,
      [ActionStatus.FULFILLING]: ContractActionStatus.PROCESSING,
      [ActionStatus.COMPLETED]: ContractActionStatus.COMPLETED,
      [ActionStatus.CANCELLED]: ContractActionStatus.CANCELLED,
      [ActionStatus.FAILED]: ContractActionStatus.FAILED
    };
    return statusMap[status] || ContractActionStatus.CREATED;
  }
}
