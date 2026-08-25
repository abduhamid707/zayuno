import { Injectable, Logger, OnModuleInit, OnModuleDestroy, BadRequestException, ForbiddenException } from '@nestjs/common';
import { prisma, ProviderStatus, UserRole } from '@zayuno/database';
import {
  ProviderCapability,
  HealthCheckResultSchema,
  ProviderHealthState,
  ProviderHealthMonitoringData
} from '@zayuno/contracts';
import {
  evaluateHealthStateTransition,
  DEFAULT_HEALTH_MONITOR_CONFIG,
  HealthMonitorConfig,
  HealthProbeResult
} from '@zayuno/shared';
import { decryptSecret } from '@zayuno/shared';
import { executeSsrfSafeGet } from './ssrf-checker';
import { ProviderRegistryService } from './provider-registry.service';

@Injectable()
export class ProviderHealthMonitorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ProviderHealthMonitorService.name);
  private timer: NodeJS.Timeout | null = null;
  private isRunningCycle = false;

  constructor(private readonly registry: ProviderRegistryService) {}

  getConfig(): HealthMonitorConfig {
    return {
      failureThreshold: parseInt(process.env.PROVIDER_HEALTH_FAILURE_THRESHOLD || String(DEFAULT_HEALTH_MONITOR_CONFIG.failureThreshold), 10),
      recoveryThreshold: parseInt(process.env.PROVIDER_HEALTH_RECOVERY_THRESHOLD || String(DEFAULT_HEALTH_MONITOR_CONFIG.recoveryThreshold), 10),
      intervalMs: parseInt(process.env.PROVIDER_HEALTH_INTERVAL_MS || String(DEFAULT_HEALTH_MONITOR_CONFIG.intervalMs), 10),
      timeoutMs: parseInt(process.env.PROVIDER_HEALTH_TIMEOUT_MS || String(DEFAULT_HEALTH_MONITOR_CONFIG.timeoutMs), 10),
      maxConcurrency: parseInt(process.env.PROVIDER_HEALTH_MAX_CONCURRENCY || String(DEFAULT_HEALTH_MONITOR_CONFIG.maxConcurrency), 10)
    };
  }

  private getEncryptionKey(): string {
    const key = process.env.PROVIDER_SECRET_ENCRYPTION_KEY || process.env.JWT_SECRET;
    if (!key) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('PROVIDER_SECRET_ENCRYPTION_KEY is required in production.');
      }
      return 'dev-master-encryption-key-32-chars-ok!';
    }
    return key;
  }

  onModuleInit() {
    const config = this.getConfig();
    if (process.env.DISABLE_HEALTH_MONITOR !== 'true' && process.env.NODE_ENV !== 'test') {
      this.logger.log(`Starting Provider Health Monitor (interval: ${config.intervalMs}ms, timeout: ${config.timeoutMs}ms)`);
      this.start();
    }
  }

  onModuleDestroy() {
    this.stop();
  }

  start() {
    if (this.timer) return;
    const config = this.getConfig();
    this.timer = setInterval(() => {
      this.runHealthCheckCycle().catch(err => {
        this.logger.error(`Error in health check cycle: ${err.message}`);
      });
    }, config.intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Runs a single background health check cycle across eligible external providers.
   * Uses distributed lease lock to ensure multiple instances don't probe the same provider concurrently.
   */
  async runHealthCheckCycle(): Promise<{ checked: number; healthy: number; down: number; degraded: number; recovering: number }> {
    if (this.isRunningCycle) return { checked: 0, healthy: 0, down: 0, degraded: 0, recovering: 0 };
    this.isRunningCycle = true;

    try {
      const config = this.getConfig();
      const candidates = await prisma.provider.findMany({
        where: {
          status: ProviderStatus.ACTIVE,
          adapterType: 'remote-http',
          baseUrl: { not: null }
        }
      });

      const eligible = candidates.filter(p => {
        const meta = (p.metadata as Record<string, any>) || {};
        return (
          p.capabilities.includes(ProviderCapability.HEALTH) &&
          meta.reviewStatus === 'APPROVED' &&
          meta.isPublished === true &&
          meta.isCertified === true &&
          p.baseUrl &&
          !this.registry.isOfficialSandboxUrl(p.baseUrl)
        );
      });

      let healthy = 0;
      let down = 0;
      let degraded = 0;
      let recovering = 0;
      let checked = 0;

      // Concurrency bounded pool
      const queue = [...eligible];
      const running: Promise<void>[] = [];

      while (queue.length > 0 || running.length > 0) {
        while (queue.length > 0 && running.length < config.maxConcurrency) {
          const provider = queue.shift()!;
          const task = (async () => {
            const now = Date.now();
            let leaseAcquired = false;

            try {
              // Atomic PostgreSQL conditional acquisition under row-level lock
              const result = await prisma.$executeRawUnsafe(
                `UPDATE "Provider" 
                 SET metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{healthLeaseUntil}', to_jsonb($1::text))
                 WHERE id = $2 AND (
                   metadata->>'healthLeaseUntil' IS NULL 
                   OR (metadata->>'healthLeaseUntil')::timestamptz <= NOW()
                 )`,
                new Date(now + 45000).toISOString(),
                provider.id
              );
              leaseAcquired = Number(result) > 0;
            } catch {
              // Portable fallback for non-Postgres environments
              const current = await prisma.provider.findUnique({ where: { id: provider.id } });
              const currentMeta = (current?.metadata as Record<string, any>) || {};
              const leaseUntil = currentMeta.healthLeaseUntil ? new Date(currentMeta.healthLeaseUntil).getTime() : 0;
              if (leaseUntil <= now) {
                await prisma.provider.update({
                  where: { id: provider.id },
                  data: {
                    metadata: {
                      ...currentMeta,
                      healthLeaseUntil: new Date(now + 45000).toISOString()
                    }
                  }
                });
                leaseAcquired = true;
              }
            }

            if (!leaseAcquired) {
              return;
            }

            // Fetch fresh provider metadata before probe
            const fresh = await prisma.provider.findUnique({ where: { id: provider.id } });
            const meta = (fresh?.metadata as Record<string, any>) || {};

            // Small jitter (0-250ms) to prevent synchronized traffic spikes
            await new Promise(r => setTimeout(r, Math.floor(Math.random() * 250)));

            const probe = await this.probeProvider(provider, config.timeoutMs);
            const currentHealth = (meta.healthMonitoring as ProviderHealthMonitoringData) || {
              state: (meta.healthStatus as ProviderHealthState) || ProviderHealthState.UNKNOWN,
              isTemporarilyUnavailable: Boolean(meta.isTemporarilyUnavailable)
            };

            const nextHealth = evaluateHealthStateTransition(currentHealth, probe, config);

            // Persist updated durable health state in database
            await prisma.provider.update({
              where: { id: provider.id },
              data: {
                metadata: {
                  ...meta,
                  healthMonitoring: nextHealth,
                  healthStatus: nextHealth.state,
                  isTemporarilyUnavailable: nextHealth.isTemporarilyUnavailable,
                  lastCheckedAt: nextHealth.lastCheckedAt,
                  healthLeaseUntil: null
                }
              }
            });

            checked++;
            if (nextHealth.state === ProviderHealthState.HEALTHY) healthy++;
            else if (nextHealth.state === ProviderHealthState.DOWN) down++;
            else if (nextHealth.state === ProviderHealthState.DEGRADED) degraded++;
            else if (nextHealth.state === ProviderHealthState.RECOVERING) recovering++;
          })();

          running.push(task);
          task.finally(() => {
            const idx = running.indexOf(task);
            if (idx !== -1) running.splice(idx, 1);
          });
        }

        if (running.length > 0) {
          await Promise.race(running);
        }
      }

      return { checked, healthy, down, degraded, recovering };
    } finally {
      this.isRunningCycle = false;
    }
  }

  /**
   * Executes an SSRF-safe, zero-secret-leakage health check probe against a provider's /health endpoint.
   */
  async probeProvider(provider: any, timeoutMs = 5000): Promise<HealthProbeResult> {
    const start = Date.now();
    const cleanUrl = (provider.baseUrl || '').replace(/\/+$/, '');
    const healthUrl = `${cleanUrl}/health`;

    try {
      let rawSecret = '';
      if (provider.encryptedSecret) {
        try {
          rawSecret = decryptSecret(provider.encryptedSecret, this.getEncryptionKey());
        } catch {
          rawSecret = '';
        }
      }

      const authMethod = provider.config?.authMethod || 'API_KEY';
      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'User-Agent': 'Zayuno-HealthMonitor/1.0'
      };

      if (rawSecret) {
        if (authMethod === 'BEARER_TOKEN') {
          headers['Authorization'] = `Bearer ${rawSecret}`;
        } else if (authMethod === 'API_KEY') {
          headers['x-provider-api-key'] = rawSecret;
        }
      }

      const res = await executeSsrfSafeGet(healthUrl, headers, {
        timeoutMs,
        maxBytes: 65536,
        allowLocalDev: process.env.NODE_ENV !== 'production'
      });

      const latencyMs = Date.now() - start;

      if (res.statusCode !== 200) {
        return {
          success: false,
          latencyMs,
          failureCode: `HTTP_${res.statusCode}`,
          message: `Server returned HTTP ${res.statusCode}`
        };
      }

      let parsedJson: any;
      try {
        parsedJson = JSON.parse(res.body);
      } catch {
        return {
          success: false,
          latencyMs,
          failureCode: 'INVALID_JSON',
          message: 'Server returned invalid JSON.'
        };
      }

      const schemaValidation = HealthCheckResultSchema.safeParse(parsedJson);
      if (!schemaValidation.success) {
        return {
          success: false,
          latencyMs,
          failureCode: 'SCHEMA_MISMATCH',
          message: 'Health payload did not match canonical HealthCheckResultSchema.'
        };
      }

      if (schemaValidation.data.status === 'DOWN') {
        return {
          success: false,
          latencyMs,
          failureCode: 'PROVIDER_REPORTED_DOWN',
          message: 'Provider self-reported status as DOWN.'
        };
      }

      return {
        success: true,
        latencyMs,
        message: 'Healthy'
      };
    } catch (err: any) {
      const latencyMs = Date.now() - start;
      const code = (err?.code || 'CONNECTION_FAILED').toUpperCase();
      return {
        success: false,
        latencyMs,
        failureCode: code,
        message: 'Server unreachable or request timed out.'
      };
    }
  }

  /**
   * Manual "Check now" triggered by provider owner or administrator.
   * Enforces tenant isolation, rate limits, and updates durable state immediately.
   */
  async checkProviderHealthNow(
    slug: string,
    actor?: { id?: string; role?: UserRole; providerId?: string }
  ): Promise<{ health: ProviderHealthMonitoringData; isTemporarilyUnavailable: boolean; message: string }> {
    const cleanSlug = slug.toLowerCase().trim();
    const provider = await prisma.provider.findUnique({ where: { slug: cleanSlug } });
    if (!provider) {
      throw new BadRequestException(`Provider '${cleanSlug}' topilmadi.`);
    }

    // Tenant isolation check
    if (actor && actor.role !== UserRole.SUPER_ADMIN && actor.role !== UserRole.ADMIN) {
      if (actor.providerId && actor.providerId !== provider.id) {
        throw new ForbiddenException('Siz faqat o‘zingizning provayderingiz salomatligini tekshira olasiz.');
      }
    }

    const meta = (provider.metadata as Record<string, any>) || {};
    const now = Date.now();
    const lastManual = meta.lastManualCheckAt ? new Date(meta.lastManualCheckAt).getTime() : 0;

    // 10s cooldown on manual check to prevent abuse
    if (now - lastManual < 10000) {
      throw new BadRequestException('Salomatlik tekshiruvi juda tez chaqirildi. Iltimos, 10 soniyadan so‘ng qayta urinib ko‘ring.');
    }

    const config = this.getConfig();
    const probe = await this.probeProvider(provider, config.timeoutMs);
    const currentHealth = (meta.healthMonitoring as ProviderHealthMonitoringData) || {
      state: (meta.healthStatus as ProviderHealthState) || ProviderHealthState.UNKNOWN,
      isTemporarilyUnavailable: Boolean(meta.isTemporarilyUnavailable)
    };

    const nextHealth = evaluateHealthStateTransition(currentHealth, probe, config);

    await prisma.provider.update({
      where: { id: provider.id },
      data: {
        metadata: {
          ...meta,
          healthMonitoring: nextHealth,
          healthStatus: nextHealth.state,
          isTemporarilyUnavailable: nextHealth.isTemporarilyUnavailable,
          lastCheckedAt: nextHealth.lastCheckedAt,
          lastManualCheckAt: new Date(now).toISOString()
        }
      }
    });

    const statusMsg = nextHealth.state === ProviderHealthState.HEALTHY
      ? 'Server sog‘lom va faol.'
      : nextHealth.state === ProviderHealthState.RECOVERING
      ? 'Server tiklanmoqda (tasdiqlash uchun yana 1 ta sog‘lom javob kutilmoqda).'
      : nextHealth.state === ProviderHealthState.DEGRADED
      ? 'Server javobida xatolik kuzatildi, ammo hali o‘chirilmagan.'
      : 'Server javob bermayapti va AI agentlar qidiruvidan vaqtincha yashirildi.';

    return {
      health: nextHealth,
      isTemporarilyUnavailable: nextHealth.isTemporarilyUnavailable,
      message: statusMsg
    };
  }

  /**
   * Retrieves current health monitoring info for display in UI.
   */
  async getProviderHealthStatus(
    slug: string,
    actor?: { id?: string; role?: UserRole; providerId?: string }
  ): Promise<{ health: ProviderHealthMonitoringData; isTemporarilyUnavailable: boolean; isExternal: boolean }> {
    const cleanSlug = slug.toLowerCase().trim();
    const provider = await prisma.provider.findUnique({ where: { slug: cleanSlug } });
    if (!provider) {
      throw new BadRequestException(`Provider '${cleanSlug}' topilmadi.`);
    }

    if (actor && actor.role !== UserRole.SUPER_ADMIN && actor.role !== UserRole.ADMIN) {
      if (actor.providerId && actor.providerId !== provider.id) {
        throw new ForbiddenException('Siz faqat o‘zingizning provayderingiz ma’lumotlarini ko‘ra olasiz.');
      }
    }

    const meta = (provider.metadata as Record<string, any>) || {};
    const isExternal = provider.adapterType === 'remote-http' && !this.registry.isOfficialSandboxUrl(provider.baseUrl || '');
    const health = (meta.healthMonitoring as ProviderHealthMonitoringData) || {
      state: (meta.healthStatus as ProviderHealthState) || ProviderHealthState.UNKNOWN,
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      isTemporarilyUnavailable: Boolean(meta.isTemporarilyUnavailable)
    };

    return {
      health,
      isTemporarilyUnavailable: health.isTemporarilyUnavailable,
      isExternal
    };
  }
}
