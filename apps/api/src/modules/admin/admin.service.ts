import { Injectable } from '@nestjs/common';
import { prisma, ProviderStatus, ProviderType, ProviderCapability, ActionStatus, PaymentStatus } from '@zayuno/database';
import { BadRequestException } from '@nestjs/common';
import { ProviderRegistryService } from '../providers/provider-registry.service';
import { ProviderCertificationRunner, CertificationReport } from '@zayuno/provider-sdk';
import { MetricsCollector } from '@zayuno/observability';

@Injectable()
export class AdminService {
  constructor(private registry: ProviderRegistryService) {}

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

  async getProviders(filters: {
    query?: string; status?: string; reviewStatus?: string; type?: string; capability?: string;
    category?: string; geography?: string; certified?: string; ownerEmail?: string;
    from?: string; to?: string; limit?: string; offset?: string;
  } = {}) {
    const status = this.optionalEnum(filters.status, ProviderStatus, 'provider status');
    const type = this.optionalEnum(filters.type, ProviderType, 'provider type');
    const capability = this.optionalEnum(filters.capability, ProviderCapability, 'provider capability');
    const from = this.optionalDate(filters.from, 'from');
    const to = this.optionalDate(filters.to, 'to', true);
    if (from && to && from > to) throw new BadRequestException('from cannot be later than to.');
    const query = filters.query?.trim();
    const ownerEmail = filters.ownerEmail?.trim();
    const dbProviders = await prisma.provider.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(type ? { type } : {}),
        ...(capability ? { capabilities: { has: capability } } : {}),
        ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
        ...(query ? { OR: [{ name: { contains: query, mode: 'insensitive' } }, { slug: { contains: query, mode: 'insensitive' } }] } : {}),
        ...(ownerEmail ? { users: { some: { email: { contains: ownerEmail, mode: 'insensitive' } } } } : {})
      },
      include: {
        users: { select: { id: true, name: true, email: true, role: true, isActive: true } },
        _count: { select: { actions: true, integrationLogs: true, webhookLogs: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    const reviewStatus = filters.reviewStatus?.trim().toUpperCase();
    const category = filters.category?.trim().toLowerCase();
    const geography = filters.geography?.trim().toLowerCase();
    const certified = filters.certified === 'true' ? true : filters.certified === 'false' ? false : undefined;
    const filtered = dbProviders.filter(provider => {
      const metadata = (provider.metadata as Record<string, any>) || {};
      if (reviewStatus && reviewStatus !== 'ALL' && String(metadata.reviewStatus || 'DRAFT').toUpperCase() !== reviewStatus) return false;
      if (category && !String(metadata.category || '').toLowerCase().includes(category)) return false;
      if (geography && !((metadata.geography || []) as string[]).some(value => value.toLowerCase().includes(geography))) return false;
      if (certified !== undefined && Boolean(metadata.isCertified) !== certified) return false;
      return true;
    });
    const limit = Math.min(Math.max(Number.parseInt(filters.limit || '50', 10) || 50, 1), 100);
    const offset = Math.max(Number.parseInt(filters.offset || '0', 10) || 0, 0);
    return {
      data: filtered.slice(offset, offset + limit),
      total: filtered.length,
      pagination: { limit, offset, hasMore: offset + limit < filtered.length }
    };
  }

  private optionalEnum<T extends Record<string, string>>(value: string | undefined, enumType: T, label: string): T[keyof T] | undefined {
    if (!value || value === 'ALL') return undefined;
    const normalized = value.trim().toUpperCase();
    if (!Object.values(enumType).includes(normalized as T[keyof T])) throw new BadRequestException(`Invalid ${label}: ${value}.`);
    return normalized as T[keyof T];
  }

  private optionalDate(value: string | undefined, label: string, endOfDay = false): Date | undefined {
    if (!value) return undefined;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new BadRequestException(`Invalid ${label} date.`);
    if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(value)) date.setUTCHours(23, 59, 59, 999);
    return date;
  }

  async getIntegrationLogs(limit = 50, traceId?: string) {
    return prisma.integrationLog.findMany({
      where: traceId ? { traceId } : undefined,
      include: { provider: true },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  async getWebhookLogs(limit = 50, providerSlug?: string) {
    return prisma.webhookLog.findMany({
      where: providerSlug ? { provider: { slug: providerSlug } } : undefined,
      include: { provider: true },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
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
        status: String(log.statusCode), durationMs: log.durationMs, message: this.redactForLogs(log.errorMessage || 'Provider integration request completed'),
        details: this.redactForLogs({ requestBody: log.requestBody, responseBody: log.responseBody }), createdAt: log.createdAt
      })),
      ...webhookLogs.map(log => ({
        id: `webhook:${log.id}`, source: 'WEBHOOK', eventType: log.event,
        severity: log.errorMessage || !log.isVerified ? 'ERROR' : !log.isProcessed ? 'WARN' : 'INFO',
        providerSlug: log.provider.slug, providerName: log.provider.name,
        actionId: this.extractActionId(log.payload), traceId: null,
        status: log.isVerified ? (log.isProcessed ? 'PROCESSED' : 'UNPROCESSED') : 'INVALID_SIGNATURE', durationMs: null,
        message: this.redactForLogs(log.errorMessage || (log.isVerified ? 'Verified provider webhook' : 'Webhook signature verification failed')),
        details: this.redactForLogs(log.payload), createdAt: log.createdAt
      })),
      ...actionEvents.map(event => ({
        id: `action:${event.id}`, source: 'ACTION', eventType: 'ACTION_STATUS_CHANGED', severity: event.status === 'FAILED' ? 'ERROR' : event.status === 'CANCELLED' ? 'WARN' : 'INFO',
        providerSlug: event.action.provider.slug, providerName: event.action.provider.name, actionId: event.action.publicId,
        traceId: null, status: event.status, durationMs: null, message: this.redactForLogs(event.description),
        details: this.redactForLogs(event.payload), createdAt: event.createdAt
      })),
      ...providers.flatMap(provider => {
        const metadata = (provider.metadata as Record<string, any>) || {};
        return (Array.isArray(metadata.reviewHistory) ? metadata.reviewHistory : []).map((entry: any, index: number) => ({
          id: `moderation:${provider.slug}:${entry.reviewedAt || index}`, source: 'MODERATION', eventType: `PROVIDER_${entry.decision}`,
          severity: entry.decision === 'REQUEST_CHANGES' ? 'WARN' : 'ERROR', providerSlug: provider.slug, providerName: provider.name,
          actionId: null, traceId: null, status: entry.reasonCode || entry.decision, durationMs: null,
          message: this.redactForLogs(entry.reason), details: this.redactForLogs({ requiredChanges: entry.requiredChanges, internalNote: entry.internalNote }),
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

  private redactForLogs(value: unknown): unknown {
    const sensitive = /password|secret|token|authorization|cookie|api.?key|card|cvv|otp|passport|document|pin|phone|email|customer|address|destination|latitude|longitude/i;
    const scrubString = (text: string) => text
      .replace(/Bearer\s+[A-Za-z0-9._~+\/-]+/gi, 'Bearer [REDACTED]')
      .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[REDACTED_EMAIL]')
      .replace(/\+?\d[\d\s()-]{7,}\d/g, '[REDACTED_PHONE]')
      .replace(/\bzy_(?:live|test|sb)_[A-Za-z0-9_-]+\b/gi, '[REDACTED_CREDENTIAL]');
    const walk = (current: unknown, depth: number): unknown => {
      if (depth > 6) return '[TRUNCATED]';
      if (Array.isArray(current)) return current.slice(0, 50).map(item => walk(item, depth + 1));
      if (current && typeof current === 'object') return Object.fromEntries(Object.entries(current as Record<string, unknown>).map(([key, child]) => [key, sensitive.test(key) ? '[REDACTED]' : walk(child, depth + 1)]));
      if (typeof current === 'string') {
        const scrubbed = scrubString(current);
        return scrubbed.length > 2000 ? `${scrubbed.slice(0, 2000)}…[TRUNCATED]` : scrubbed;
      }
      return current;
    };
    return walk(value, 0);
  }

  async certifyProvider(slug: string): Promise<CertificationReport> {
    const adapter = await this.registry.getAdapter(slug);
    const runner = new ProviderCertificationRunner(adapter);
    return runner.runAllTests();
  }
}
