import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { SystemHealthService } from '../apps/api/src/modules/admin/system-health.service.ts';
import { MetricsCollector } from '../packages/observability/src/metrics.ts';

async function main() {
  console.log('🧪 Testing Pro System Health, Infrastructure Telemetry & AI Incident Snapshot...\n');

  // =========================================================================
  // 1. TEST METRICS COLLECTOR OBSERVABILITY EXTENSIONS
  // =========================================================================
  console.log('  1. Testing @zayuno/observability latency percentiles & rate calculations...');

  MetricsCollector.clear();

  // Initially empty collector
  assert.equal(MetricsCollector.getP50Latency(), 0);
  assert.equal(MetricsCollector.getP95Latency(), 0);
  assert.equal(MetricsCollector.getP99Latency(), 0);
  assert.equal(MetricsCollector.getErrorRate(), 0);
  assert.equal(MetricsCollector.getRequestRate(), 0);

  // Record a sequence of requests
  const now = new Date().toISOString();
  MetricsCollector.recordLatency({ service: 'api', operation: 'auth.login', durationMs: 50, statusCode: 200, success: true, timestamp: now });
  MetricsCollector.recordLatency({ service: 'api', operation: 'catalog.search', durationMs: 100, statusCode: 200, success: true, timestamp: now });
  MetricsCollector.recordLatency({ service: 'api', operation: 'cart.add', durationMs: 150, statusCode: 200, success: true, timestamp: now });
  MetricsCollector.recordLatency({ service: 'api', operation: 'order.quote', durationMs: 250, statusCode: 200, success: true, timestamp: now });
  MetricsCollector.recordLatency({ service: 'api', operation: 'order.confirm', durationMs: 500, statusCode: 400, success: true, timestamp: now }); // 4xx client error
  MetricsCollector.recordLatency({ service: 'api', operation: 'webhook.dispatch', durationMs: 900, statusCode: 500, success: false, timestamp: now }); // 5xx server error

  const p50 = MetricsCollector.getP50Latency();
  const p95 = MetricsCollector.getP95Latency();
  const p99 = MetricsCollector.getP99Latency();

  assert.ok(p50 > 0, `p50 must be > 0, got ${p50}`);
  assert.ok(p95 >= p50, `p95 (${p95}) must be >= p50 (${p50})`);
  assert.ok(p99 >= p95, `p99 (${p99}) must be >= p95 (${p95})`);

  // Error rate: 1 out of 6 requests is 5xx -> ~16.67%
  const errorRate = MetricsCollector.getErrorRate(15);
  assert.ok(errorRate > 10 && errorRate < 25, `Error rate should be ~16.67%, got ${errorRate}%`);

  // Request rate: 6 requests within 1 minute
  const reqRate = MetricsCollector.getRequestRate(1);
  assert.equal(reqRate, 6);

  // Status breakdown
  const breakdown = MetricsCollector.getStatusBreakdown(15);
  assert.equal(breakdown.s2xx, 4);
  assert.equal(breakdown.s4xx, 1);
  assert.equal(breakdown.s5xx, 1);
  assert.equal(breakdown.other, 0);

  console.log('     ✅ MetricsCollector percentiles (p50/p95/p99) and rates verified successfully.');

  // =========================================================================
  // 2. TEST SYSTEM HEALTH SERVICE DATA GATHERING & MODEL COMPLIANCE
  // =========================================================================
  console.log('\n  2. Testing SystemHealthService metrics aggregation and structure...');

  const mockRedisService: any = {
    isReady: () => true,
    health: async () => ({ status: 'up', latencyMs: 2.5 }),
    getClient: () => ({
      ping: async () => 'PONG',
      info: async () => 'used_memory:16777216\r\nused_memory_human:16.00M\r\nconnected_clients:5',
    }),
  };

  const mockNatsService: any = {
    nc: {
      isClosed: () => false,
    },
  };

  const service = new SystemHealthService(mockRedisService, mockNatsService);
  const report = await service.getHealthReport(true);

  // Basic properties
  assert.ok(report.timestamp, 'Report timestamp must be present');
  assert.ok(typeof report.uptimeSeconds === 'number' && report.uptimeSeconds >= 0);
  assert.ok(typeof report.uptimeFormatted === 'string' && report.uptimeFormatted.length > 0);
  assert.ok(['HEALTHY', 'WARNING', 'CRITICAL'].includes(report.overallStatus));
  assert.ok(typeof report.healthScore === 'number' && report.healthScore >= 0 && report.healthScore <= 100);
  assert.equal(report.cached, false);

  // Hardware: CPU
  assert.ok(typeof report.hardware.cpu.usedPercent === 'number');
  assert.ok(report.hardware.cpu.cores > 0);
  assert.equal(report.hardware.cpu.loadAvg.length, 3);
  assert.ok(report.hardware.cpu.model.length > 0);
  assert.ok(['HEALTHY', 'WARNING', 'CRITICAL'].includes(report.hardware.cpu.status));

  // Hardware: RAM
  assert.ok(report.hardware.ram.totalMb > 0);
  assert.ok(report.hardware.ram.usedMb >= 0);
  assert.ok(report.hardware.ram.freeMb >= 0);
  assert.ok(report.hardware.ram.usedPercent >= 0 && report.hardware.ram.usedPercent <= 100);
  assert.ok(report.hardware.ram.heapUsedMb > 0);
  assert.ok(report.hardware.ram.heapTotalMb > 0);
  assert.ok(report.hardware.ram.rssMb > 0);
  assert.ok(['HEALTHY', 'WARNING', 'CRITICAL'].includes(report.hardware.ram.status));

  // Hardware: Disk
  assert.ok(report.hardware.disk.totalGb >= 0);
  assert.ok(report.hardware.disk.usedGb >= 0);
  assert.ok(report.hardware.disk.freeGb >= 0);
  assert.ok(report.hardware.disk.usedPercent >= 0 && report.hardware.disk.usedPercent <= 100);
  assert.ok(['HEALTHY', 'WARNING', 'CRITICAL'].includes(report.hardware.disk.status));

  // Database: Postgres
  assert.ok(report.database.engine.includes('PostgreSQL'), 'Database engine must identify PostgreSQL');
  assert.ok(typeof report.database.latencyMs === 'number' && report.database.latencyMs >= 0);
  assert.ok(typeof report.database.connections.total === 'number');
  assert.ok(typeof report.database.connections.active === 'number');
  assert.ok(typeof report.database.connections.idle === 'number');
  assert.ok(typeof report.database.connections.idleInTransaction === 'number');
  assert.ok(report.database.connections.max >= 10);
  assert.ok(report.database.connections.utilizationPercent >= 0);

  // Cache & Messaging: Redis
  assert.equal(report.cacheAndMessaging.redis.status, 'HEALTHY');
  assert.ok(typeof report.cacheAndMessaging.redis.latencyMs === 'number');
  assert.equal(report.cacheAndMessaging.redis.memoryMb, 16);
  assert.equal(report.cacheAndMessaging.redis.connectedClients, 5);

  // Cache & Messaging: NATS
  assert.equal(report.cacheAndMessaging.nats.status, 'HEALTHY');
  assert.equal(report.cacheAndMessaging.nats.connected, true);
  assert.ok(report.cacheAndMessaging.nats.servers.includes('nats://localhost:4222'));

  // Subsystems Matrix
  assert.ok(report.subsystems.length >= 6, `Expected >= 6 subsystems, got ${report.subsystems.length}`);
  const subsystemNames = report.subsystems.map(s => s.name);
  assert.ok(subsystemNames.includes('API Core'));
  assert.ok(subsystemNames.includes('PostgreSQL Database'));
  assert.ok(subsystemNames.includes('Redis Cache & Lock'));
  assert.ok(subsystemNames.includes('NATS JetStream'));
  assert.ok(subsystemNames.includes('Action Orchestrator'));
  assert.ok(subsystemNames.includes('Webhook Dispatcher'));

  for (const sub of report.subsystems) {
    assert.ok(['healthy', 'degraded', 'down'].includes(sub.status), `Invalid status ${sub.status} for ${sub.name}`);
    assert.ok(typeof sub.message === 'string' && sub.message.length > 0);
  }

  console.log('     ✅ SystemHealthReport model and subsystem contracts fully verified.');

  // =========================================================================
  // 3. TEST 5-SECOND SERVER-SIDE CACHING
  // =========================================================================
  console.log('\n  3. Testing 5-second server-side memory caching...');

  const cachedCall = await service.getHealthReport(false);
  assert.equal(cachedCall.cached, true, 'Immediate subsequent call must return cached: true');

  const forcedCall = await service.getHealthReport(true);
  assert.equal(forcedCall.cached, false, 'forceRefresh: true must bypass cache');

  console.log('     ✅ Cache behavior (TTL 5s & force-refresh bypass) verified.');

  // =========================================================================
  // 4. TEST AI INCIDENT SNAPSHOT MARKDOWN & ZERO-SECRET GUARANTEE
  // =========================================================================
  console.log('\n  4. Testing AI Incident Snapshot generation & Zero-Secret guarantee...');

  const snapshot = report.aiIncidentSnapshotMarkdown;
  assert.ok(snapshot && snapshot.length > 100, 'AI Incident Snapshot must be non-empty Markdown');

  // Verify key diagnostic sections are present
  assert.ok(snapshot.includes('# 🛡️ ZAYUNO SYSTEM HEALTH & INCIDENT DIAGNOSTIC SNAPSHOT'), 'Missing title header');
  assert.ok(snapshot.includes('### 📌 Tizim Statusi Xulosasi'), 'Missing Section 1');
  assert.ok(snapshot.includes('### 🚨 Aniq Qizil Belgilar'), 'Missing Section 2');
  assert.ok(snapshot.includes('### ⚠️ Ogohlantirishlar'), 'Missing Section 3');
  assert.ok(snapshot.includes('### 🔍 Aniqlangan Bo‘g‘iq Nuqtalar'), 'Missing Section 4');
  assert.ok(snapshot.includes('### 🧠 AI Agent Uchun Ehtimoliy Sabablar'), 'Missing Section 5');
  assert.ok(snapshot.includes('### ⚡ Tavsiya etilgan Birinchi Qadamlar'), 'Missing Section 6');
  assert.ok(snapshot.includes('### 📊 Xavfsiz Tizim Metrikalari'), 'Missing Section 7');
  assert.ok(snapshot.includes('Claude Code, Cursor, Codex, ChatGPT'), 'Missing AI guidance instructions');

  // Zero-secret guarantee assertions:
  // Ensure no passwords, connection URIs with credentials, HMAC keys or raw JWTs appear
  assert.ok(!snapshot.includes('password='), 'Raw password parameter leaked into AI snapshot!');
  assert.ok(!snapshot.includes('postgres://postgres:'), 'Raw postgres URI leaked into AI snapshot!');
  assert.ok(!snapshot.includes('redis://default:'), 'Raw redis URI leaked into AI snapshot!');
  assert.ok(!snapshot.includes('eyJhbGciOi'), 'JWT token leaked into AI snapshot!');
  assert.ok(!snapshot.includes('zy_sec_'), 'API secret leaked into AI snapshot!');

  console.log('     ✅ AI Incident Snapshot verified: structured Markdown with 0 raw secret leaks.');

  // =========================================================================
  // 5. TEST ADMIN CONTROLLER & MODULE BINDINGS
  // =========================================================================
  console.log('\n  5. Testing AdminController & AdminModule contract bindings...');

  const controllerContent = fs.readFileSync(
    path.resolve('apps/api/src/modules/admin/admin.controller.ts'),
    'utf-8',
  );
  const moduleContent = fs.readFileSync(
    path.resolve('apps/api/src/modules/admin/admin.module.ts'),
    'utf-8',
  );

  // Assert AdminController has GET system/health with auth guards
  assert.ok(controllerContent.includes('@UseGuards(JwtAuthGuard, RolesGuard)'), 'AdminController missing auth guards');
  assert.ok(controllerContent.includes('Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)'), 'AdminController missing admin roles');
  assert.ok(controllerContent.includes("@Get('system/health')"), 'AdminController missing GET system/health route');
  assert.ok(controllerContent.includes('getSystemHealth'), 'AdminController missing getSystemHealth method');
  assert.ok(controllerContent.includes('this.systemHealthService.getHealthReport'), 'AdminController must delegate to SystemHealthService');

  // Assert AdminModule provides and exports SystemHealthService
  assert.ok(moduleContent.includes('SystemHealthService'), 'AdminModule missing SystemHealthService import');
  assert.ok(moduleContent.includes('providers: [AdminService, SystemHealthService]'), 'AdminModule must provide SystemHealthService');
  assert.ok(moduleContent.includes('exports: [AdminService, SystemHealthService]'), 'AdminModule must export SystemHealthService');

  // Assert Admin UI includes the system tab and 1-click snapshot button
  const adminUiContent = fs.readFileSync(
    path.resolve('apps/admin/src/App.tsx'),
    'utf-8',
  );
  assert.ok(adminUiContent.includes("activeTab === 'system'"), 'App.tsx missing activeTab === system');
  assert.ok(adminUiContent.includes('System Health & Infrastructure'), 'App.tsx missing System Health title');
  assert.ok(adminUiContent.includes('AI Agent uchun nusxalash'), 'App.tsx missing 1-click AI snapshot copy button');
  assert.ok(adminUiContent.includes('aiIncidentSnapshotMarkdown'), 'App.tsx missing aiIncidentSnapshotMarkdown copy logic');

  console.log('     ✅ Controller, Module & Admin UI bindings verified.');

  console.log('\n🎉 ALL PRO SYSTEM HEALTH & AI INCIDENT SNAPSHOT TESTS PASSED!\n');
}

main().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
