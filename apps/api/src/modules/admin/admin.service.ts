import { Injectable, BadRequestException, Optional } from '@nestjs/common';
import { prisma, ProviderStatus, ProviderType, ProviderCapability, ActionStatus, PaymentStatus } from '@zayuno/database';
import { ProviderRegistryService } from '../providers/provider-registry.service';
import { UnmetDemandService } from '../analytics/unmet-demand.service';
import { ProviderCertificationRunner, CertificationReport } from '@zayuno/provider-sdk';
import { MetricsCollector } from '@zayuno/observability';
import { isProviderDiscoveryReady, isProviderPublished, redactForLogs, sanitizeHeaders } from '@zayuno/shared';

@Injectable()
export class AdminService {
  constructor(
    private registry: ProviderRegistryService,
    private unmetDemandService?: UnmetDemandService
  ) {}

  async getDashboardKpis() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalProviders,
      activeProviders,
      totalActions,
      todayActions,
      completedActions,
      failedActions,
      revenueResult
    ] = await Promise.all([
      prisma.provider.count(),
      prisma.provider.count({ where: { status: ProviderStatus.ACTIVE } }),
      prisma.action.count(),
      prisma.action.count({ where: { createdAt: { gte: today } } }),
      prisma.action.count({ where: { status: ActionStatus.COMPLETED } }),
      prisma.action.count({ where: { status: { in: [ActionStatus.CANCELLED, ActionStatus.FAILED] } } }),
      prisma.action.aggregate({
        _sum: { total: true },
        where: { paymentStatus: PaymentStatus.PAID }
      })
    ]);

    const totalGmv = Number(revenueResult._sum.total || 0);
    const avgLatencyMs = MetricsCollector.getAverageLatency();

    return {
      totalProviders,
      activeProviders,
      totalActions,
      todayActions,
      completedActions,
      failedActions,
      totalGmv,
      avgLatencyMs,
      timestamp: new Date().toISOString()
    };
  }

  async getActions(limit = 50) {
    const actions = await prisma.action.findMany({
      include: { provider: true, timeline: { orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 100)
    });
    return actions.map(action => ({
      ...action,
      total: Number(action.total),
      subtotal: Number(action.subtotal),
      fees: Number(action.fees),
      discount: Number(action.discount),
      providerSlug: action.provider.slug,
      providerName: action.provider.name,
      customer: { name: action.customerName, phone: action.customerPhone }
    }));
  }

  async getProviders(filters?: {
    query?: string;
    status?: string;
    reviewStatus?: string;
    type?: string;
    capability?: string;
    category?: string;
    geography?: string;
    certified?: string;
    ownerEmail?: string;
    from?: string;
    to?: string;
    limit?: string;
    offset?: string;
  }) {
    const where: any = {};
    if (filters?.status && filters.status !== 'ALL') {
      where.status = filters.status as any;
    }
    if (filters?.type && filters.type !== 'ALL') {
      where.type = filters.type as any;
    }
    if (filters?.query) {
      where.OR = [
        { name: { contains: filters.query, mode: 'insensitive' } },
        { slug: { contains: filters.query, mode: 'insensitive' } }
      ];
    }

    const providers = await prisma.provider.findMany({
      where,
      include: {
        locations: true,
        _count: {
          select: { actions: true, quotes: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return providers.map(p => {
      const meta = (p.metadata as any) || {};
      const discovery = isProviderDiscoveryReady(p);
      return {
        id: p.id,
        slug: p.slug,
        name: p.name,
        status: p.status,
        type: p.type,
        category: meta.category || 'general',
        geography: meta.geography || ['UZ'],
        capabilities: p.capabilities,
        adapterType: p.adapterType,
        baseUrl: p.baseUrl,
        isCertified: Boolean(meta.isCertified),
        reviewStatus: meta.reviewStatus || 'DRAFT',
        metadata: meta,
        isPublished: isProviderPublished(p),
        discoveryReady: discovery.isReady,
        discoveryUnreadyReasons: discovery.unreadyReasons,
        actionsCount: p._count.actions,
        quotesCount: p._count.quotes,
        locationsCount: p.locations.length,
        activeLocationsCount: p.locations.filter(location => location.isActive).length,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt
      };
    });
  }

  private optionalDate(value: string | undefined, label: string, endOfDay = false): Date | undefined {
    if (!value) return undefined;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new BadRequestException(`Invalid ${label} date.`);
    if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(value)) date.setUTCHours(23, 59, 59, 999);
    return date;
  }

  async getIntegrationLogs(limit = 50, traceId?: string) {
    const safeLimit = Math.min(Math.max(limit, 1), 200);
    const logs = await prisma.integrationLog.findMany({
      where: traceId ? { traceId } : undefined,
      include: { provider: { select: { slug: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: safeLimit
    });

    return logs.map(log => ({
      id: log.id,
      providerSlug: log.provider?.slug,
      providerName: log.provider?.name,
      traceId: log.traceId,
      endpoint: log.endpoint,
      method: log.method,
      statusCode: log.statusCode,
      durationMs: log.durationMs,
      errorMessage: log.errorMessage,
      requestBody: redactForLogs(log.requestBody),
      responseBody: redactForLogs(log.responseBody),
      createdAt: log.createdAt
    }));
  }

  async getWebhookLogs(limit = 50, providerSlug?: string) {
    const safeLimit = Math.min(Math.max(limit, 1), 200);
    const logs = await prisma.webhookLog.findMany({
      where: providerSlug ? { provider: { slug: providerSlug } } : undefined,
      include: { provider: { select: { slug: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: safeLimit
    });

    return logs.map(log => ({
      id: log.id,
      providerSlug: log.provider?.slug,
      providerName: log.provider?.name,
      event: log.event,
      isVerified: log.isVerified,
      isProcessed: log.isProcessed,
      errorMessage: log.errorMessage,
      headers: sanitizeHeaders(log.headers as any),
      payload: redactForLogs(log.payload),
      createdAt: log.createdAt
    }));
  }

  async getLiveInspectorLogs(filters: {
    providerSlug?: string;
    source?: string;
    status?: string;
    traceId?: string;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  }) {
    const limit = Math.min(Math.max(filters.limit || 50, 1), 200);
    const offset = Math.max(filters.offset || 0, 0);
    const from = this.optionalDate(filters.from, 'from');
    const to = this.optionalDate(filters.to, 'to', true);
    const createdAt = from || to ? { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } : undefined;
    const providerWhere = filters.providerSlug ? { provider: { slug: filters.providerSlug } } : undefined;

    const [integrationLogs, webhookLogs, totalIntegration, totalWebhooks] = await Promise.all([
      (!filters.source || filters.source === 'INTEGRATION') ? prisma.integrationLog.findMany({
        where: {
          ...providerWhere,
          ...(filters.traceId ? { traceId: filters.traceId } : {}),
          ...(createdAt ? { createdAt } : {})
        },
        include: { provider: { select: { slug: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      }) : [],
      (!filters.source || filters.source === 'WEBHOOK') ? prisma.webhookLog.findMany({
        where: {
          ...providerWhere,
          ...(createdAt ? { createdAt } : {})
        },
        include: { provider: { select: { slug: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      }) : [],
      prisma.integrationLog.count({
        where: {
          ...providerWhere,
          ...(filters.traceId ? { traceId: filters.traceId } : {}),
          ...(createdAt ? { createdAt } : {})
        }
      }),
      prisma.webhookLog.count({
        where: {
          ...providerWhere,
          ...(createdAt ? { createdAt } : {})
        }
      })
    ]);

    const items = [
      ...integrationLogs.map(log => ({
        id: `integration:${log.id}`,
        source: 'INTEGRATION',
        providerSlug: log.provider?.slug,
        providerName: log.provider?.name,
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
        providerSlug: log.provider?.slug,
        providerName: log.provider?.name,
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
      total: totalIntegration + totalWebhooks,
      limit,
      offset,
      logs: items
    };
  }

  async getUnmetDemandAnalytics(filters?: { from?: string; to?: string; category?: string }) {
    if (!this.unmetDemandService) {
      return {
        totalEvents: 0,
        uniquePatterns: 0,
        topMissingCategories: [],
        topMissingGeographies: [],
        topMissingCapabilities: [],
        reasonsBreakdown: [],
        recentUnmetDemand: []
      };
    }
    return await this.unmetDemandService.getAggregatedDemand(filters);
  }

  async getOperationalEvents(filters: {
    source?: string; provider?: string; actionId?: string; query?: string;
    from?: string; to?: string; limit?: string;
  } = {}) {
    const limit = Math.min(Math.max(Number.parseInt(filters.limit || '100', 10) || 100, 1), 500);
    const from = this.optionalDate(filters.from, 'from');
    const to = this.optionalDate(filters.to, 'to', true);
    if (from && to && from > to) throw new BadRequestException('from cannot be later than to.');
    const createdAt = from || to ? { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } : undefined;
    const providerSlug = filters.provider?.trim();
    const requestedSource = filters.source?.trim().toUpperCase();

    const [integrationLogs, webhookLogs, actionEvents, providers] = await Promise.all([
      !requestedSource || requestedSource === 'INTEGRATION' ? prisma.integrationLog.findMany({
        where: { ...(providerSlug ? { provider: { slug: providerSlug } } : {}), ...(createdAt ? { createdAt } : {}) },
        include: { provider: { select: { slug: true, name: true } } }, orderBy: { createdAt: 'desc' }, take: limit
      }) : [],
      !requestedSource || requestedSource === 'WEBHOOK' ? prisma.webhookLog.findMany({
        where: { ...(providerSlug ? { provider: { slug: providerSlug } } : {}), ...(createdAt ? { createdAt } : {}) },
        include: { provider: { select: { slug: true, name: true } } }, orderBy: { createdAt: 'desc' }, take: limit
      }) : [],
      !requestedSource || requestedSource === 'ACTION' ? prisma.actionEvent.findMany({
        where: {
          ...(filters.actionId ? { action: { OR: [{ publicId: filters.actionId }, { id: filters.actionId }, { externalActionId: filters.actionId }] } } : {}),
          ...(providerSlug ? { action: { provider: { slug: providerSlug }, ...(filters.actionId ? { OR: [{ publicId: filters.actionId }, { id: filters.actionId }, { externalActionId: filters.actionId }] } : {}) } } : {}),
          ...(createdAt ? { createdAt } : {})
        },
        include: { action: { select: { publicId: true, provider: { select: { slug: true, name: true } } } } },
        orderBy: { createdAt: 'desc' }, take: limit
      }) : [],
      !requestedSource || requestedSource === 'MODERATION' ? prisma.provider.findMany({
        where: providerSlug ? { slug: providerSlug } : undefined,
        select: { slug: true, name: true, metadata: true }
      }) : []
    ]);

    const events: any[] = [
      ...integrationLogs.map(log => ({
        id: `integration:${log.id}`, source: 'INTEGRATION', eventType: `${log.method} ${log.endpoint}`,
        severity: log.errorMessage || log.statusCode >= 500 ? 'ERROR' : log.statusCode >= 400 ? 'WARN' : 'INFO',
        providerSlug: log.provider.slug, providerName: log.provider.name, actionId: null, traceId: log.traceId,
        status: String(log.statusCode), durationMs: log.durationMs, message: redactForLogs(log.errorMessage || 'Provider integration request completed'),
        details: redactForLogs({ requestBody: log.requestBody, responseBody: log.responseBody }), createdAt: log.createdAt
      })),
      ...webhookLogs.map(log => ({
        id: `webhook:${log.id}`, source: 'WEBHOOK', eventType: log.event,
        severity: log.errorMessage || !log.isVerified ? 'ERROR' : !log.isProcessed ? 'WARN' : 'INFO',
        providerSlug: log.provider.slug, providerName: log.provider.name,
        actionId: this.extractActionId(log.payload), traceId: null,
        status: log.isVerified ? (log.isProcessed ? 'PROCESSED' : 'UNPROCESSED') : 'INVALID_SIGNATURE', durationMs: null,
        message: redactForLogs(log.errorMessage || (log.isVerified ? 'Verified provider webhook' : 'Webhook signature verification failed')),
        details: redactForLogs(log.payload), createdAt: log.createdAt
      })),
      ...actionEvents.map(event => ({
        id: `action:${event.id}`, source: 'ACTION', eventType: 'ACTION_STATUS_CHANGED', severity: event.status === 'FAILED' ? 'ERROR' : event.status === 'CANCELLED' ? 'WARN' : 'INFO',
        providerSlug: event.action.provider.slug, providerName: event.action.provider.name, actionId: event.action.publicId,
        traceId: null, status: event.status, durationMs: null, message: redactForLogs(event.description),
        details: redactForLogs(event.payload), createdAt: event.createdAt
      })),
      ...providers.flatMap(provider => {
        const metadata = (provider.metadata as Record<string, any>) || {};
        return (Array.isArray(metadata.reviewHistory) ? metadata.reviewHistory : []).map((entry: any, index: number) => ({
          id: `moderation:${provider.slug}:${entry.reviewedAt || index}`, source: 'MODERATION', eventType: `PROVIDER_${entry.decision}`,
          severity: entry.decision === 'REQUEST_CHANGES' ? 'WARN' : 'ERROR', providerSlug: provider.slug, providerName: provider.name,
          actionId: null, traceId: null, status: entry.reasonCode || entry.decision, durationMs: null,
          message: redactForLogs(entry.reason), details: redactForLogs({ requiredChanges: entry.requiredChanges, internalNote: entry.internalNote }),
          createdAt: entry.reviewedAt || new Date(0).toISOString()
        }));
      })
    ];

    const query = filters.query?.trim().toLowerCase();
    const filtered = events.filter(event => {
      const time = new Date(event.createdAt);
      if (from && time < from) return false;
      if (to && time > to) return false;
      if (filters.actionId && event.actionId !== filters.actionId) return false;
      if (!query) return true;
      return [event.eventType, event.providerSlug, event.providerName, event.actionId, event.traceId, event.status, event.message]
        .some(value => String(value || '').toLowerCase().includes(query));
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limit);

    return { data: filtered, total: filtered.length, generatedAt: new Date().toISOString(), redacted: true };
  }

  async exportOperationalEvents(filters: Parameters<AdminService['getOperationalEvents']>[0], format: 'json' | 'csv') {
    const safeFilters = filters || {};
    const report = await this.getOperationalEvents({ ...safeFilters, limit: safeFilters.limit || '500' });
    if (format === 'json') return JSON.stringify(report, null, 2);
    const columns = ['createdAt', 'source', 'severity', 'eventType', 'providerSlug', 'actionId', 'traceId', 'status', 'durationMs', 'message'];
    const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    return [columns.join(','), ...report.data.map((event: any) => columns.map(column => escape(event[column])).join(','))].join('\r\n');
  }

  private extractActionId(payload: unknown): string | null {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
    const value = (payload as Record<string, any>).actionId;
    return typeof value === 'string' ? value : null;
  }

  async certifyProvider(slug: string): Promise<CertificationReport> {
    const adapter = await this.registry.getAdapter(slug);
    const runner = new ProviderCertificationRunner(adapter);
    return runner.runAllTests();
  }
}
