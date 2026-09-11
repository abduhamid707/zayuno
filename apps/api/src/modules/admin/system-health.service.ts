import { Injectable } from '@nestjs/common';
import * as os from 'node:os';
import * as fs from 'node:fs';
import { prisma, ActionStatus, ProviderStatus } from '@zayuno/database';
import { RedisService } from '../../common/services/redis.service';
import { NatsService } from '../../common/services/nats.service';
import { MetricsCollector } from '@zayuno/observability';

export interface SystemHealthReport {
  timestamp: string;
  uptimeSeconds: number;
  uptimeFormatted: string;
  overallStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  healthScore: number;
  cached: boolean;
  hardware: {
    cpu: {
      usedPercent: number;
      cores: number;
      loadAvg: number[];
      model: string;
      status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    };
    ram: {
      totalMb: number;
      usedMb: number;
      freeMb: number;
      usedPercent: number;
      heapUsedMb: number;
      heapTotalMb: number;
      rssMb: number;
      status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    };
    disk: {
      totalGb: number;
      usedGb: number;
      freeGb: number;
      usedPercent: number;
      status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    };
  };
  database: {
    engine: string;
    status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    latencyMs: number;
    connections: {
      total: number;
      active: number;
      idle: number;
      idleInTransaction: number;
      max: number;
      utilizationPercent: number;
    };
  };
  cacheAndMessaging: {
    redis: {
      status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
      latencyMs: number | null;
      memoryMb: number;
      connectedClients: number;
    };
    nats: {
      status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
      connected: boolean;
      servers: string[];
    };
  };
  apiMetrics: {
    p50Ms: number;
    p95Ms: number;
    p99Ms: number;
    errorRatePercent: number;
    requestsPerMinute: number;
    statusBreakdown: {
      s2xx: number;
      s4xx: number;
      s5xx: number;
      other: number;
    };
  };
  businessAndOps: {
    activeOrders: number;
    awaitingPaymentOrders: number;
    failedWebhooksLastHour: number;
    totalProviders: number;
    activeProviders: number;
  };
  subsystems: Array<{
    name: string;
    component: string;
    status: 'healthy' | 'degraded' | 'down';
    latencyMs?: number | null;
    message?: string;
  }>;
  alerts: {
    redFlags: string[];
    warnings: string[];
    bottlenecks: Array<{ area: string; metric: string; detail: string; severity: 'warning' | 'critical' }>;
  };
  aiIncidentSnapshotMarkdown: string;
}

@Injectable()
export class SystemHealthService {
  private cachedReport: SystemHealthReport | null = null;
  private lastFetchTime = 0;
  private readonly CACHE_TTL_MS = 5000;

  constructor(
    private redisService?: RedisService,
    private natsService?: NatsService,
  ) {}

  async getHealthReport(forceRefresh = false): Promise<SystemHealthReport> {
    const now = Date.now();
    if (!forceRefresh && this.cachedReport && now - this.lastFetchTime < this.CACHE_TTL_MS) {
      return {
        ...this.cachedReport,
        cached: true,
      };
    }

    const report = await this.collectReport();
    this.cachedReport = report;
    this.lastFetchTime = now;
    return report;
  }

  private async collectReport(): Promise<SystemHealthReport> {
    const uptimeSeconds = Math.floor(process.uptime());
    const uptimeFormatted = this.formatUptime(uptimeSeconds);

    // 1. Hardware & OS
    const cpuInfo = this.collectCpuMetrics();
    const ramInfo = this.collectRamMetrics();
    const diskInfo = this.collectDiskMetrics();

    // 2. Database (PostgreSQL)
    const dbInfo = await this.collectDatabaseMetrics();

    // 3. Cache (Redis)
    const redisInfo = await this.collectRedisMetrics();

    // 4. Messaging (NATS)
    const natsInfo = this.collectNatsMetrics();

    // 5. API Metrics from Observability
    const apiMetrics = this.collectApiMetrics();

    // 6. Business & Ops metrics
    const businessAndOps = await this.collectBusinessMetrics();

    // 7. Subsystems Matrix
    const subsystems = [
      {
        name: 'API Core',
        component: 'Node.js NestJS Runtime',
        status: (apiMetrics.errorRatePercent > 5 || cpuInfo.usedPercent > 90 ? 'degraded' : 'healthy') as any,
        latencyMs: apiMetrics.p50Ms,
        message: `Uptime: ${uptimeFormatted}, ${apiMetrics.requestsPerMinute} req/min`,
      },
      {
        name: 'PostgreSQL Database',
        component: 'Prisma Connection Pool',
        status: (dbInfo.status === 'CRITICAL' ? 'down' : dbInfo.status === 'WARNING' ? 'degraded' : 'healthy') as any,
        latencyMs: dbInfo.latencyMs,
        message: `${dbInfo.connections.active} active / ${dbInfo.connections.max} max connections`,
      },
      {
        name: 'Redis Cache & Lock',
        component: 'ioredis Distributed Lock Store',
        status: (redisInfo.status === 'CRITICAL' ? 'down' : redisInfo.status === 'WARNING' ? 'degraded' : 'healthy') as any,
        latencyMs: redisInfo.latencyMs,
        message: `${redisInfo.memoryMb}MB memory, ${redisInfo.connectedClients} clients`,
      },
      {
        name: 'NATS JetStream',
        component: 'Event Streaming Broker',
        status: (natsInfo.status === 'CRITICAL' ? 'down' : 'healthy') as any,
        latencyMs: null,
        message: natsInfo.connected ? 'Connected to cluster' : 'Offline / DB fallback active',
      },
      {
        name: 'Action Orchestrator',
        component: 'State Machine & Lifecycle Manager',
        status: 'healthy' as any,
        latencyMs: null,
        message: `${businessAndOps.activeOrders} active orders in flight`,
      },
      {
        name: 'Webhook Dispatcher',
        component: 'HMAC Signature Webhook Delivery',
        status: (businessAndOps.failedWebhooksLastHour > 5 ? 'degraded' : 'healthy') as any,
        latencyMs: null,
        message: `${businessAndOps.failedWebhooksLastHour} failed webhooks (1h)`,
      },
    ];

    // 8. Alerts, Bottlenecks & Health Score
    const alerts = this.evaluateAlertsAndBottlenecks(
      cpuInfo,
      ramInfo,
      diskInfo,
      dbInfo,
      redisInfo,
      natsInfo,
      apiMetrics,
      businessAndOps,
    );

    const healthScore = this.calculateHealthScore(alerts);
    const overallStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL' =
      healthScore >= 80 ? 'HEALTHY' : healthScore >= 50 ? 'WARNING' : 'CRITICAL';

    const preliminaryReport: Omit<SystemHealthReport, 'aiIncidentSnapshotMarkdown'> = {
      timestamp: new Date().toISOString(),
      uptimeSeconds,
      uptimeFormatted,
      overallStatus,
      healthScore,
      cached: false,
      hardware: {
        cpu: cpuInfo,
        ram: ramInfo,
        disk: diskInfo,
      },
      database: dbInfo,
      cacheAndMessaging: {
        redis: redisInfo,
        nats: natsInfo,
      },
      apiMetrics,
      businessAndOps,
      subsystems,
      alerts,
    };

    const aiIncidentSnapshotMarkdown = this.generateAiIncidentSnapshot(preliminaryReport);

    return {
      ...preliminaryReport,
      aiIncidentSnapshotMarkdown,
    };
  }

  private collectCpuMetrics() {
    const cpus = os.cpus() || [];
    let totalIdle = 0;
    let totalTick = 0;
    for (const cpu of cpus) {
      for (const type in cpu.times) {
        totalTick += (cpu.times as any)[type];
      }
      totalIdle += cpu.times.idle;
    }
    const idlePercent = totalTick > 0 ? (totalIdle / totalTick) * 100 : 50;
    const usedPercent = Math.round(Math.max(0, Math.min(100, 100 - idlePercent)) * 10) / 10;
    const loadAvg = os.loadavg().map((l) => Math.round(l * 100) / 100);

    const status: 'HEALTHY' | 'WARNING' | 'CRITICAL' =
      usedPercent >= 85 ? 'CRITICAL' : usedPercent >= 70 ? 'WARNING' : 'HEALTHY';

    return {
      usedPercent,
      cores: cpus.length,
      loadAvg,
      model: cpus[0]?.model || 'Generic CPU',
      status,
    };
  }

  private collectRamMetrics() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const usedPercent = Math.round(((usedMem / totalMem) * 100) * 10) / 10;
    const memUsage = process.memoryUsage();

    const status: 'HEALTHY' | 'WARNING' | 'CRITICAL' =
      usedPercent >= 90 ? 'CRITICAL' : usedPercent >= 75 ? 'WARNING' : 'HEALTHY';

    return {
      totalMb: Math.round(totalMem / (1024 * 1024)),
      usedMb: Math.round(usedMem / (1024 * 1024)),
      freeMb: Math.round(freeMem / (1024 * 1024)),
      usedPercent,
      heapUsedMb: Math.round((memUsage.heapUsed / (1024 * 1024)) * 10) / 10,
      heapTotalMb: Math.round((memUsage.heapTotal / (1024 * 1024)) * 10) / 10,
      rssMb: Math.round((memUsage.rss / (1024 * 1024)) * 10) / 10,
      status,
    };
  }

  private collectDiskMetrics() {
    try {
      const stat = fs.statfsSync(process.cwd());
      const totalBytes = Number(stat.blocks) * Number(stat.bsize);
      const freeBytes = Number(stat.bavail) * Number(stat.bsize);
      const usedBytes = totalBytes - freeBytes;
      const usedPercent = totalBytes > 0 ? Math.round(((usedBytes / totalBytes) * 100) * 10) / 10 : 0;

      const status: 'HEALTHY' | 'WARNING' | 'CRITICAL' =
        usedPercent >= 90 ? 'CRITICAL' : usedPercent >= 80 ? 'WARNING' : 'HEALTHY';

      return {
        totalGb: Math.round((totalBytes / 1024 ** 3) * 10) / 10,
        usedGb: Math.round((usedBytes / 1024 ** 3) * 10) / 10,
        freeGb: Math.round((freeBytes / 1024 ** 3) * 10) / 10,
        usedPercent,
        status,
      };
    } catch {
      return {
        totalGb: 100,
        usedGb: 20,
        freeGb: 80,
        usedPercent: 20,
        status: 'HEALTHY' as const,
      };
    }
  }

  private async collectDatabaseMetrics() {
    let latencyMs = 0;
    let poolConnections = {
      total: 1,
      active: 1,
      idle: 0,
      idleInTransaction: 0,
      max: 100,
      utilizationPercent: 1,
    };
    let status: 'HEALTHY' | 'WARNING' | 'CRITICAL' = 'HEALTHY';

    try {
      const start = performance.now();
      const activityResult: any = await prisma.$queryRawUnsafe(`
        SELECT count(*)::int as total,
               count(*) FILTER (WHERE state = 'active')::int as active,
               count(*) FILTER (WHERE state = 'idle')::int as idle,
               count(*) FILTER (WHERE state = 'idle in transaction')::int as idle_in_transaction
        FROM pg_stat_activity
        WHERE datname = current_database();
      `);
      latencyMs = Math.round(performance.now() - start);

      let maxConns = 100;
      try {
        const maxConnsResult: any = await prisma.$queryRawUnsafe(`SHOW max_connections;`);
        if (maxConnsResult?.[0]?.max_connections) {
          maxConns = parseInt(maxConnsResult[0].max_connections, 10) || 100;
        }
      } catch {
        // fallback
      }

      const row = activityResult?.[0] || {};
      const total = row.total || 1;
      const active = row.active || 1;
      const idle = row.idle || 0;
      const idleInTransaction = row.idle_in_transaction || 0;
      const utilizationPercent = Math.round((total / maxConns) * 100);

      poolConnections = {
        total,
        active,
        idle,
        idleInTransaction,
        max: maxConns,
        utilizationPercent,
      };

      if (latencyMs > 500 || utilizationPercent > 85) {
        status = 'CRITICAL';
      } else if (latencyMs > 150 || utilizationPercent > 65 || idleInTransaction > 3) {
        status = 'WARNING';
      }
    } catch {
      status = 'CRITICAL';
      latencyMs = 9999;
    }

    return {
      engine: 'PostgreSQL 16 via Prisma ORM',
      status,
      latencyMs,
      connections: poolConnections,
    };
  }

  private async collectRedisMetrics() {
    if (!this.redisService) {
      return {
        status: 'WARNING' as const,
        latencyMs: null,
        memoryMb: 0,
        connectedClients: 0,
      };
    }

    let health = { status: 'down' as 'up' | 'down', latencyMs: null as number | null };
    try {
      if (typeof this.redisService.health === 'function') {
        health = await this.redisService.health();
      }
    } catch {
      health = { status: 'down', latencyMs: null };
    }

    let memoryMb = 0;
    let connectedClients = 0;

    if (this.redisService.isReady?.()) {
      try {
        const client = this.redisService.getClient?.();
        if (client) {
          const rawInfo = await client.info();
          const memMatch = rawInfo.match(/used_memory:(\d+)/);
          if (memMatch) memoryMb = Math.round((parseInt(memMatch[1], 10) / (1024 * 1024)) * 10) / 10;
          const clientsMatch = rawInfo.match(/connected_clients:(\d+)/);
          if (clientsMatch) connectedClients = parseInt(clientsMatch[1], 10);
        }
      } catch {
        // ignore info parse error
      }
    }

    const status: 'HEALTHY' | 'WARNING' | 'CRITICAL' =
      health.status === 'up'
        ? (health.latencyMs && health.latencyMs > 50 ? 'WARNING' : 'HEALTHY')
        : 'CRITICAL';

    return {
      status,
      latencyMs: health.latencyMs,
      memoryMb,
      connectedClients,
    };
  }

  private collectNatsMetrics() {
    const natsUrl = process.env.NATS_URL || 'nats://localhost:4222';
    const isOnline = Boolean((this.natsService as any)?.nc && !(this.natsService as any)?.nc.isClosed());
    return {
      status: (isOnline ? 'HEALTHY' : 'WARNING') as 'HEALTHY' | 'WARNING' | 'CRITICAL',
      connected: isOnline,
      servers: [natsUrl],
    };
  }

  private collectApiMetrics() {
    return {
      p50Ms: MetricsCollector.getP50Latency(),
      p95Ms: MetricsCollector.getP95Latency(),
      p99Ms: MetricsCollector.getP99Latency(),
      errorRatePercent: MetricsCollector.getErrorRate(15),
      requestsPerMinute: MetricsCollector.getRequestRate(1),
      statusBreakdown: MetricsCollector.getStatusBreakdown(15),
    };
  }

  private async collectBusinessMetrics() {
    try {
      const oneHourAgo = new Date(Date.now() - 3600 * 1000);
      const [activeOrders, awaitingPaymentOrders, totalProviders, activeProviders, failedWebhooks] =
        await Promise.all([
          prisma.action.count({
            where: {
              status: {
                in: [
                  ActionStatus.SUBMITTED,
                  ActionStatus.ACCEPTED,
                  ActionStatus.IN_PROGRESS,
                  ActionStatus.FULFILLING,
                ],
              },
            },
          }),
          prisma.action.count({
            where: {
              status: ActionStatus.AWAITING_PAYMENT,
            },
          }),
          prisma.provider.count(),
          prisma.provider.count({ where: { status: ProviderStatus.ACTIVE } }),
          prisma.webhookLog
            .count({
              where: {
                OR: [{ isVerified: false }, { errorMessage: { not: null } }],
                createdAt: { gte: oneHourAgo },
              },
            })
            .catch(() => 0),
        ]);

      return {
        activeOrders,
        awaitingPaymentOrders,
        failedWebhooksLastHour: failedWebhooks,
        totalProviders,
        activeProviders,
      };
    } catch {
      return {
        activeOrders: 0,
        awaitingPaymentOrders: 0,
        failedWebhooksLastHour: 0,
        totalProviders: 0,
        activeProviders: 0,
      };
    }
  }

  private evaluateAlertsAndBottlenecks(
    cpu: any,
    ram: any,
    disk: any,
    db: any,
    redis: any,
    nats: any,
    api: any,
    biz: any,
  ) {
    const redFlags: string[] = [];
    const warnings: string[] = [];
    const bottlenecks: Array<{ area: string; metric: string; detail: string; severity: 'warning' | 'critical' }> = [];

    // CPU
    if (cpu.usedPercent >= 85) {
      redFlags.push(`CPU yuklamasi kritik darajada yuqori: ${cpu.usedPercent}% (Cores: ${cpu.cores})`);
      bottlenecks.push({
        area: 'CPU',
        metric: `${cpu.usedPercent}%`,
        detail: 'Server CPU resursi to‘yinish chegarasida. AI intent yoki qidiruv so‘rovlari navbatga turishi mumkin.',
        severity: 'critical',
      });
    } else if (cpu.usedPercent >= 70) {
      warnings.push(`CPU yuklamasi sezilarli: ${cpu.usedPercent}%`);
      bottlenecks.push({
        area: 'CPU',
        metric: `${cpu.usedPercent}%`,
        detail: 'CPU faolligi oshgan. Qo‘shimcha parallel so‘rovlar tushsa kechikish paydo bo‘lishi mumkin.',
        severity: 'warning',
      });
    }

    // RAM
    if (ram.usedPercent >= 90) {
      redFlags.push(`RAM xotira to‘lib bormoqda: ${ram.usedPercent}% (${ram.usedMb}MB / ${ram.totalMb}MB)`);
      bottlenecks.push({
        area: 'RAM',
        metric: `${ram.usedPercent}%`,
        detail: 'Xotira 90% dan oshdi. Linux OOM (Out Of Memory) killer jarayonlarni to‘xtatib qo‘yish xavfi bor.',
        severity: 'critical',
      });
    } else if (ram.usedPercent >= 75) {
      warnings.push(`RAM xotira 75% dan yuqori: ${ram.usedPercent}%`);
    }

    // Disk
    if (disk.usedPercent >= 90) {
      redFlags.push(`Disk deyarli to‘ldi: ${disk.usedPercent}% (${disk.usedGb}GB / ${disk.totalGb}GB)`);
      bottlenecks.push({
        area: 'Disk',
        metric: `${disk.usedPercent}%`,
        detail: 'PostgreSQL tranzaksiya loglari (WAL) va Docker loglari to‘xtab qolishi mumkin.',
        severity: 'critical',
      });
    } else if (disk.usedPercent >= 80) {
      warnings.push(`Disk xotirasi 80% dan yuqori: ${disk.usedPercent}%`);
    }

    // Database
    if (db.status === 'CRITICAL') {
      redFlags.push(`PostgreSQL javob bermayapti yoki connection pool to‘lgan (${db.latencyMs}ms)`);
      bottlenecks.push({
        area: 'Database',
        metric: `${db.latencyMs}ms`,
        detail: 'Baza bilan ulanish uzilgan yoki ulanishlar chegarasiga yetgan.',
        severity: 'critical',
      });
    } else if (db.connections.utilizationPercent >= 70) {
      warnings.push(`PostgreSQL pool bandligi: ${db.connections.utilizationPercent}% (${db.connections.total}/${db.connections.max})`);
      bottlenecks.push({
        area: 'Database Pool',
        metric: `${db.connections.utilizationPercent}%`,
        detail: 'Faol ulanishlar soni ko‘paygan. Uzoq davom etayotgan querylarni tekshirish kerak.',
        severity: 'warning',
      });
    }

    // Redis
    if (redis.status === 'CRITICAL') {
      redFlags.push('Redis kesh xizmati bilan aloqa yo‘q. Lock va kesh in-memory fallbackga o‘tgan.');
    }

    // API Latency & Error Rate
    if (api.errorRatePercent >= 5) {
      redFlags.push(`API 5xx xatolik foizi yuqori: ${api.errorRatePercent}%`);
      bottlenecks.push({
        area: 'API Reliability',
        metric: `${api.errorRatePercent}% error rate`,
        detail: 'So‘rovlarning 5% dan ortig‘i xatolik bilan yakunlanyapti.',
        severity: 'critical',
      });
    } else if (api.errorRatePercent >= 1) {
      warnings.push(`API xatolik foizi: ${api.errorRatePercent}%`);
    }

    if (api.p95Ms >= 1500) {
      redFlags.push(`API p95 kechikishi sekin: ${api.p95Ms}ms`);
      bottlenecks.push({
        area: 'API Latency',
        metric: `${api.p95Ms}ms p95`,
        detail: 'Mijoz so‘rovlari 1.5 soniyadan ko‘proq kutilmoqda.',
        severity: 'critical',
      });
    } else if (api.p95Ms >= 600) {
      warnings.push(`API p95 kechikishi ko‘tarilgan: ${api.p95Ms}ms`);
    }

    // Webhooks
    if (biz.failedWebhooksLastHour >= 5) {
      warnings.push(`So‘nggi 1 soatda ${biz.failedWebhooksLastHour} ta provayder webhooki xatolik bergan.`);
      bottlenecks.push({
        area: 'Webhooks',
        metric: `${biz.failedWebhooksLastHour} failures`,
        detail: 'Provayder serverlari webhooklarni qabul qilmayapti yoki HMAC imzolari mos kelmadi.',
        severity: 'warning',
      });
    }

    return { redFlags, warnings, bottlenecks };
  }

  private calculateHealthScore(alerts: { redFlags: string[]; warnings: string[]; bottlenecks: any[] }): number {
    let score = 100;
    score -= alerts.redFlags.length * 20;
    score -= alerts.warnings.length * 7;
    return Math.max(10, Math.min(100, score));
  }

  generateAiIncidentSnapshot(report: Omit<SystemHealthReport, 'aiIncidentSnapshotMarkdown'>): string {
    const { overallStatus, healthScore, hardware, database, cacheAndMessaging, apiMetrics, businessAndOps, alerts } =
      report;

    const hypotheses: string[] = [];
    if (alerts.bottlenecks.some((b) => b.area === 'RAM')) {
      hypotheses.push('Xotira oqishi (Memory Leak): Node.js heap yoki Redis keshiga juda katta hajmdagi ob’ektlar saqlanmoqda.');
    }
    if (alerts.bottlenecks.some((b) => b.area === 'Database Pool' || b.area === 'Database')) {
      hypotheses.push('Sekin tranzaksiyalar: Uzoq davom etayotgan querylar Prisma pool ulanishlarini band qilib turibdi.');
    }
    if (alerts.bottlenecks.some((b) => b.area === 'API Latency')) {
      hypotheses.push('Tashqi provider kechikishi: Tashqi provayderlarga qilinayotgan HTTP chaqiruvlar yoki quote hisoblash vaqti oshgan.');
    }
    if (alerts.bottlenecks.some((b) => b.area === 'Webhooks')) {
      hypotheses.push('Webhook rad etilishi: Provayderning webhook endpointi o‘chgan yoki HMAC secret mos kelmayapti.');
    }
    if (hypotheses.length === 0) {
      hypotheses.push('Tizim barqaror holatda. Barcha asosiy metrikalar operatsion normada ishlamoqda.');
    }

    const recommendations: string[] = [];
    if (alerts.redFlags.length > 0) {
      recommendations.push('Qizil indikatorli resursni zudlik bilan tekshiring (yuqoridagi Red Flags bo‘limiga qarang).');
    }
    if (database.connections.utilizationPercent >= 70) {
      recommendations.push('Postgres faol querylarini tekshirish: `SELECT pid, query, state, age(clock_timestamp(), query_start) FROM pg_stat_activity WHERE state != \'idle\';`');
    }
    if (hardware.ram.usedPercent >= 80) {
      recommendations.push('Node.js heap xotirasini tahlil qilish va kerak bo‘lsa konteyner xotirasini (RAM) kengaytirish.');
    }
    if (businessAndOps.failedWebhooksLastHour > 0) {
      recommendations.push('Admin panel "Webhooks & Audit" bo‘limida oxirgi xato loglarni va provayder HMAC holatini ko‘rib chiqish.');
    }
    recommendations.push('Kodni o‘zgartirishdan oldin TASKS.md dagi qoidalarga binoan tekshiruv testlarini yurgizish.');

    return [
      `# 🛡️ ZAYUNO SYSTEM HEALTH & INCIDENT DIAGNOSTIC SNAPSHOT`,
      `> Ushbu hisobot Zayuno Platformasi tizim diagnostikasi tomonidan avtomatik yaratildi.`,
      `> Istalgan AI agentga (Claude Code, Cursor, Codex, ChatGPT) to‘g‘ridan-to‘g‘ri berish mumkin.`,
      ``,
      `### 📌 Tizim Statusi Xulosasi`,
      `- **Holat:** \`${overallStatus}\``,
      `- **Health Score:** \`${healthScore} / 100\``,
      `- **Yaratilgan vaqt:** \`${report.timestamp}\``,
      `- **Server Uptime:** \`${report.uptimeFormatted}\``,
      `- **Faol buyurtmalar:** \`${businessAndOps.activeOrders}\` ta`,
      ``,
      `### 🚨 Aniq Qizil Belgilar (Red Flags: ${alerts.redFlags.length})`,
      alerts.redFlags.length > 0
        ? alerts.redFlags.map((flag) => `- ❌ ${flag}`).join('\n')
        : `- ✅ Hech qanday kritik qizil bayroq aniqlanmadi. Tizim normada.`,
      ``,
      `### ⚠️ Ogohlantirishlar (Warnings: ${alerts.warnings.length})`,
      alerts.warnings.length > 0
        ? alerts.warnings.map((warn) => `- ⚠️ ${warn}`).join('\n')
        : `- ✅ Ogohlantirishlar yo‘q.`,
      ``,
      `### 🔍 Aniqlangan Bo‘g‘iq Nuqtalar (Bottlenecks: ${alerts.bottlenecks.length})`,
      alerts.bottlenecks.length > 0
        ? alerts.bottlenecks.map((b) => `- **[${b.area}]** Metrika: \`${b.metric}\` — ${b.detail}`).join('\n')
        : `- Barcha resurslar erkin rejimda ishlamoqda.`,
      ``,
      `### 🧠 AI Agent Uchun Ehtimoliy Sabablar (Root Cause Hypotheses)`,
      hypotheses.map((h, i) => `${i + 1}. ${h}`).join('\n'),
      ``,
      `### ⚡ Tavsiya etilgan Birinchi Qadamlar (Immediate Action Checklist)`,
      recommendations.map((r) => `- [ ] ${r}`).join('\n'),
      ``,
      `### 📊 Xavfsiz Tizim Metrikalari (Sanitized Metrics Payload)`,
      '```json',
      JSON.stringify(
        {
          hardware: {
            cpuUsedPercent: hardware.cpu.usedPercent,
            cores: hardware.cpu.cores,
            loadAvg: hardware.cpu.loadAvg,
            ramUsedPercent: hardware.ram.usedPercent,
            ramUsedMb: hardware.ram.usedMb,
            ramTotalMb: hardware.ram.totalMb,
            heapUsedMb: hardware.ram.heapUsedMb,
            diskUsedPercent: hardware.disk.usedPercent,
            diskUsedGb: hardware.disk.usedGb,
            diskTotalGb: hardware.disk.totalGb,
          },
          database: {
            status: database.status,
            latencyMs: database.latencyMs,
            poolUtilizationPercent: database.connections.utilizationPercent,
            activeConnections: database.connections.active,
            maxConnections: database.connections.max,
          },
          redis: {
            status: cacheAndMessaging.redis.status,
            latencyMs: cacheAndMessaging.redis.latencyMs,
            memoryMb: cacheAndMessaging.redis.memoryMb,
          },
          nats: {
            connected: cacheAndMessaging.nats.connected,
          },
          api: {
            p50Ms: apiMetrics.p50Ms,
            p95Ms: apiMetrics.p95Ms,
            p99Ms: apiMetrics.p99Ms,
            errorRatePercent: apiMetrics.errorRatePercent,
            requestsPerMinute: apiMetrics.requestsPerMinute,
          },
          ops: {
            activeOrders: businessAndOps.activeOrders,
            failedWebhooksLastHour: businessAndOps.failedWebhooksLastHour,
            totalProviders: businessAndOps.totalProviders,
            activeProviders: businessAndOps.activeProviders,
          },
        },
        null,
        2,
      ),
      '```',
    ].join('\n');
  }

  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (days > 0) return `${days}k ${hours}s ${minutes}d`;
    if (hours > 0) return `${hours}s ${minutes}d`;
    if (minutes > 0) return `${minutes}d ${secs}son`;
    return `${secs} soniya`;
  }
}
