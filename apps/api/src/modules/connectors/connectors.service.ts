import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException
} from '@nestjs/common';
import { prisma, ProviderCapability } from '@zayuno/database';
import { encryptSecret, decryptSecret } from '@zayuno/shared';
import {
  ManagedConnector,
  UzumMarketConnector,
  SyntheticRetailConnector,
  ConnectorAuthResult,
  ConnectorSyncOutput
} from '@zayuno/provider-sdk';
import {
  CreateConnectorInstanceInput,
  ConnectorDefinition,
  ConnectorShop
} from '@zayuno/contracts';
import { RedisService } from '../../common/services/redis.service';
import { ProviderRegistryService } from '../providers/provider-registry.service';
import { randomUUID } from 'crypto';

const TRANSACTIONAL_CAPABILITIES = new Set<ProviderCapability>([
  ProviderCapability.ACTION_CREATE,
  ProviderCapability.ACTION_STATUS,
  ProviderCapability.ACTION_CANCEL,
  ProviderCapability.QUOTE,
  ProviderCapability.PAYMENT_OPTIONS,
  ProviderCapability.WEBHOOK
]);

@Injectable()
export class ConnectorsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ConnectorsService.name);
  private connectors = new Map<string, ManagedConnector>();
  private syncTimer: NodeJS.Timeout | null = null;
  private isRunningScheduledCycle = false;

  constructor(
    private redisService: RedisService,
    private registryService: ProviderRegistryService
  ) {}

  async onModuleInit() {
    // 1. Register supported connector runtimes
    this.registerConnector(new UzumMarketConnector());
    this.registerConnector(new SyntheticRetailConnector());

    // 2. Ensure default connector definitions exist in database
    await this.ensureConnectorDefinitions();

    // 3. Recover any stuck instances from previous crashed/restarted processes
    await this.recoverStuckSyncInstances();

    // 4. Start background sync scheduler worker
    if (process.env.DISABLE_CONNECTOR_SYNC_WORKER !== 'true' && process.env.NODE_ENV !== 'test') {
      this.startSyncScheduler();
    }
  }

  async recoverStuckSyncInstances(): Promise<number> {
    const now = new Date();
    const stuck = await prisma.connectorInstance.updateMany({
      where: {
        status: 'SYNCING',
        OR: [
          { syncLockUntil: null },
          { syncLockUntil: { lt: now } }
        ]
      },
      data: {
        status: 'CONNECTED',
        syncLockUntil: null,
        lastSyncError: 'Oldingi sinxronizatsiya jarayoni server qayta ishga tushishi sababli to‘xtatildi. Qayta urinib ko‘riladi.',
        nextSyncAt: now
      }
    });
    if (stuck.count > 0) {
      this.logger.warn(`Recovered ${stuck.count} stuck SYNCING instances back to CONNECTED.`);
    }
    return stuck.count;
  }

  onModuleDestroy() {
    this.stopSyncScheduler();
  }

  startSyncScheduler(intervalMs = 60_000) {
    if (this.syncTimer) return;
    this.logger.log(`Starting Managed Connector Sync Scheduler (interval: ${intervalMs}ms)`);
    this.syncTimer = setInterval(() => {
      this.runScheduledSyncCycle().catch(err => {
        this.logger.error(`Error in scheduled connector sync cycle: ${err.message}`);
      });
    }, intervalMs);
  }

  stopSyncScheduler() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  async runScheduledSyncCycle(): Promise<{ processed: number; successful: number; failed: number }> {
    if (this.isRunningScheduledCycle) return { processed: 0, successful: 0, failed: 0 };
    this.isRunningScheduledCycle = true;
    let processed = 0;
    let successful = 0;
    let failed = 0;

    try {
      // 1. Recover any instances whose lock expired or were left in SYNCING from crashes/restarts
      await this.recoverStuckSyncInstances();

      const now = new Date();
      const dueInstances = await prisma.connectorInstance.findMany({
        where: {
          status: { in: ['CONNECTED', 'ERROR'] },
          autoSyncEnabled: true,
          OR: [
            { nextSyncAt: null },
            { nextSyncAt: { lte: now } }
          ],
          AND: [
            {
              OR: [
                { syncLockUntil: null },
                { syncLockUntil: { lt: now } }
              ]
            }
          ]
        },
        take: 10
      });

      for (const inst of dueInstances) {
        processed++;
        try {
          const res = await this.syncInstance(inst.id, 'SCHEDULED');
          if (res.success) successful++;
          else failed++;
        } catch (syncErr: any) {
          failed++;
          this.logger.error(`Scheduled sync failed for instance ${inst.id}: ${syncErr.message}`);
        }
      }

      return { processed, successful, failed };
    } finally {
      this.isRunningScheduledCycle = false;
    }
  }

  registerConnector(connector: ManagedConnector) {
    this.connectors.set(connector.definitionId, connector);
    this.logger.log(`Registered Managed Connector runtime for "${connector.definitionId}" (${connector.name})`);
  }

  private getConnector(definitionId: string): ManagedConnector {
    const connector = this.connectors.get(definitionId);
    if (!connector) {
      throw new BadRequestException(`Noma’lum connector definition: "${definitionId}".`);
    }
    return connector;
  }

  private getEncryptionKey(): string {
    const key = process.env.ENCRYPTION_KEY;
    if (!key || key.length !== 64) {
      throw new Error('ENCRYPTION_KEY must be a 32-byte hex string (64 characters).');
    }
    return key;
  }

  private maskApiKey(apiKey: string): string {
    const trimmed = apiKey.trim();
    if (trimmed.length <= 8) {
      return '••••••••';
    }
    return `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}`;
  }

  async ensureConnectorDefinitions(): Promise<void> {
    const definitions = [
      {
        id: 'uzum',
        name: 'Uzum Market',
        version: '1.0.0',
        description: 'Uzum Market sotuvchilar hisobi (Seller API) orqali tovarlar va do‘konni ulash',
        logoUrl: 'https://seller.uzum.uz/favicon.ico',
        authType: 'API_KEY',
        capabilities: [ProviderCapability.METADATA, ProviderCapability.CATALOG, ProviderCapability.SEARCH],
        configSchema: {
          fields: [
            { key: 'apiKey', label: 'Uzum Maxfiy Kalit', type: 'password', required: true, helpUrl: 'https://seller.uzum.uz/seller/api-keys' }
          ]
        }
      },
      {
        id: 'synthetic-test',
        name: 'Synthetic Retail Test Connector',
        version: '1.0.0',
        description: 'Ko‘p platformali universal runtime tekshiruvchi test connectori',
        logoUrl: null,
        authType: 'API_KEY',
        capabilities: [ProviderCapability.METADATA, ProviderCapability.CATALOG, ProviderCapability.SEARCH],
        configSchema: {
          fields: [
            { key: 'apiKey', label: 'Test API Kalit', type: 'password', required: true }
          ]
        }
      }
    ];

    for (const def of definitions) {
      await prisma.connectorDefinition.upsert({
        where: { id: def.id },
        create: def,
        update: {
          name: def.name,
          version: def.version,
          description: def.description,
          capabilities: def.capabilities,
          configSchema: def.configSchema
        }
      });
    }
  }

  async getDefinitions(): Promise<ConnectorDefinition[]> {
    const records = await prisma.connectorDefinition.findMany({
      orderBy: { name: 'asc' }
    });

    return records.map(r => ({
      id: r.id,
      name: r.name,
      version: r.version,
      description: r.description,
      logoUrl: r.logoUrl,
      status: 'ACTIVE',
      authType: r.authType as any,
      capabilities: r.capabilities as any,
      configSchema: (r.configSchema as Record<string, any>) || {},
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString()
    }));
  }

  async testAuth(connectorDefinitionId: string, apiKey: string): Promise<ConnectorAuthResult> {
    const connector = this.getConnector(connectorDefinitionId);
    return connector.authenticate({ apiKey });
  }

  async getShops(connectorDefinitionId: string, apiKey: string): Promise<ConnectorShop[]> {
    const connector = this.getConnector(connectorDefinitionId);
    return connector.getShops({ apiKey });
  }

  async createInstance(actor: any, input: CreateConnectorInstanceInput) {
    const provider = await this.resolveAndAuthorizeProvider(actor, input.providerSlug);
    const connector = this.getConnector(input.connectorDefinitionId);

    // Guard: strictly protect transactional providers from having their order capabilities stripped
    const hasTransactional = provider.adapterType !== 'managed-connector' &&
      provider.capabilities.some((c: ProviderCapability) => TRANSACTIONAL_CAPABILITIES.has(c));

    if (hasTransactional) {
      throw new BadRequestException(
        `Ushbu provayderda (${provider.slug}) faol tranzaksion buyurtma integratsiyasi mavjud (adapter: ${provider.adapterType}, imkoniyatlar: ${provider.capabilities.join(', ')}). ` +
        `Katalog ulagichini (Managed Connector) ulash mavjud buyurtma qabul qilish jarayonini to‘xtatib qo‘ymasligi uchun uni alohida provayder hisobi orqali ulashingiz lozim.`
      );
    }

    // 1. Preflight test credential
    const authResult = await connector.authenticate({ apiKey: input.apiKey });
    if (!authResult.success) {
      throw new BadRequestException(authResult.message || 'API kalit tekshiruvdan o‘tmadi.');
    }

    // 2. Encrypt credential at rest
    const encryptedSecret = encryptSecret(input.apiKey.trim(), this.getEncryptionKey());
    const maskedSecret = this.maskApiKey(input.apiKey);

    // 3. Create credential record
    const credential = await prisma.connectorCredential.create({
      data: {
        providerId: provider.id,
        connectorDefinitionId: input.connectorDefinitionId,
        name: `${connector.name} Credential (${input.shopName || input.shopId})`,
        encryptedSecret,
        maskedSecret,
        metadata: {
          shopId: input.shopId,
          shopName: input.shopName
        }
      }
    });

    // 4. Create instance record
    const syncIntervalHours = input.syncIntervalHours || 8;
    const nextSyncAt = new Date(Date.now() + syncIntervalHours * 3600 * 1000);

    const instance = await prisma.connectorInstance.create({
      data: {
        providerId: provider.id,
        connectorDefinitionId: input.connectorDefinitionId,
        credentialId: credential.id,
        name: input.name || `${connector.name} - ${input.shopName || input.shopId}`,
        status: 'CONNECTED',
        selectedShopId: input.shopId,
        selectedShopName: input.shopName,
        autoSyncEnabled: input.autoSyncEnabled !== false,
        syncIntervalHours,
        nextSyncAt,
        config: {
          platform: input.connectorDefinitionId
        }
      }
    });

    // 5. Update provider adapterType and capabilities WITHOUT preserving incompatible transactional capabilities
    const currentMeta = (provider.metadata as Record<string, any>) || {};
    const connectorDef = await prisma.connectorDefinition.findUnique({
      where: { id: input.connectorDefinitionId }
    });
    const connectorCapabilities = (connectorDef?.capabilities as ProviderCapability[]) || [
      ProviderCapability.METADATA,
      ProviderCapability.HEALTH,
      ProviderCapability.CATALOG,
      ProviderCapability.SEARCH
    ];

    // Save previous provider adapter & capabilities in metadata so they are not permanently lost
    const backupAdapterConfig = provider.adapterType !== 'managed-connector' ? {
      previousAdapterType: provider.adapterType,
      previousCapabilities: provider.capabilities,
      previousConfig: provider.config
    } : {};

    // Filter out transactional capabilities: only keep connector-supported capabilities
    const newCapabilities = Array.from(new Set(
      connectorCapabilities.filter(c => !TRANSACTIONAL_CAPABILITIES.has(c))
    ));

    await prisma.provider.update({
      where: { id: provider.id },
      data: {
        adapterType: 'managed-connector',
        capabilities: newCapabilities,
        metadata: {
          ...currentMeta,
          ...backupAdapterConfig,
          managedConnector: {
            definitionId: input.connectorDefinitionId,
            instanceId: instance.id,
            connectedAt: new Date().toISOString()
          }
        }
      }
    });

    this.registryService.invalidateAdapterCache(provider.slug);

    // 6. Trigger initial sync asynchronously
    this.syncInstance(instance.id, 'MANUAL').catch(err => {
      this.logger.error(`Initial sync failed for instance ${instance.id}: ${err.message}`);
    });

    return this.mapInstanceDto(instance, maskedSecret);
  }

  async syncInstance(instanceId: string, trigger: 'MANUAL' | 'SCHEDULED' = 'MANUAL'): Promise<{ success: boolean; importedCount: number; message?: string }> {
    const instance = await prisma.connectorInstance.findUnique({
      where: { id: instanceId },
      include: { credential: true, provider: true }
    });

    if (!instance) {
      throw new NotFoundException(`Connector instance topilmadi: ${instanceId}`);
    }

    if (instance.status === 'DISCONNECTED') {
      throw new BadRequestException('Ushbu ulanish to‘xtatilgan (DISCONNECTED). Sinxronlashdan oldin qayta faollashtiring.');
    }

    // Atomic concurrency lock with ownership runToken: check if already running or disconnected
    const runToken = randomUUID();
    const now = new Date();
    const lockExpiry = new Date(Date.now() + 5 * 60 * 1000);

    const acquired = await prisma.connectorInstance.updateMany({
      where: {
        id: instanceId,
        status: { not: 'DISCONNECTED' },
        OR: [
          { syncLockUntil: null },
          { syncLockUntil: { lt: now } }
        ]
      },
      data: {
        syncLockUntil: lockExpiry,
        syncRunId: runToken,
        status: 'SYNCING'
      }
    });

    if (acquired.count === 0) {
      const fresh = await prisma.connectorInstance.findUnique({ where: { id: instanceId } });
      if (fresh?.status === 'DISCONNECTED') {
        throw new BadRequestException('Ushbu ulanish to‘xtatilgan (DISCONNECTED). Sinxronlashdan oldin qayta faollashtiring.');
      }
      throw new ConflictException('Sinxronizatsiya allaqachon bajarilmoqda. Iltimos, kuting.');
    }

    // Decrypt credential
    let apiKey = '';
    try {
      apiKey = decryptSecret(instance.credential.encryptedSecret, this.getEncryptionKey());
    } catch (e: any) {
      await prisma.connectorInstance.updateMany({
        where: { id: instanceId, syncRunId: runToken, status: { not: 'DISCONNECTED' } },
        data: {
          status: 'ERROR',
          lastSyncStatus: 'FAILED',
          lastSyncError: 'API kalitini deshifrlashda xatolik yuz berdi.',
          syncLockUntil: null
        }
      });
      throw new BadRequestException('API kalitini deshifrlashda xatolik yuz berdi.');
    }

    const syncRun = await prisma.connectorSyncRun.create({
      data: {
        id: runToken,
        instanceId: instance.id,
        providerId: instance.providerId,
        status: 'RUNNING',
        trigger
      }
    });

    const connector = this.getConnector(instance.connectorDefinitionId);

    let output: ConnectorSyncOutput;
    try {
      output = await connector.fetchCatalog({
        credentials: { apiKey },
        shopId: instance.selectedShopId || ''
      });
    } catch (fetchErr: any) {
      output = {
        success: false,
        items: [],
        totalFetched: 0,
        errorMessage: fetchErr.message || 'Katalog ma’lumotlarini olishda kutilmagan xatolik'
      };
    }

    // Check if instance was disconnected or lock was usurped during sync
    const freshInstance = await prisma.connectorInstance.findUnique({ where: { id: instanceId } });
    if (freshInstance?.status === 'DISCONNECTED') {
      await prisma.connectorSyncRun.updateMany({
        where: { id: syncRun.id },
        data: {
          status: 'CANCELLED',
          finishedAt: new Date(),
          errorMessage: 'Ulanish to‘xtatilgani sababli sinxronizatsiya bekor qilindi.'
        }
      });
      return { success: false, importedCount: 0, message: 'Sync cancelled because instance was disconnected.' };
    }

    if (freshInstance?.syncRunId !== runToken) {
      await prisma.connectorSyncRun.updateMany({
        where: { id: syncRun.id },
        data: {
          status: 'CANCELLED',
          finishedAt: new Date(),
          errorMessage: 'Sinxronizatsiya qulfi boshqa jarayon tomonidan egallandi yoki muddati tugadi.'
        }
      });
      return { success: false, importedCount: 0, message: 'Sync cancelled because lock was acquired by another run.' };
    }

    if (!output.success) {
      // Failure: preserve previous snapshot products (do not hide or delete old items!)
      await prisma.connectorSyncRun.updateMany({
        where: { id: syncRun.id },
        data: {
          status: 'FAILED',
          finishedAt: new Date(),
          errorMessage: output.errorMessage
        }
      });

      await prisma.connectorInstance.updateMany({
        where: { id: instanceId, syncRunId: runToken, status: { not: 'DISCONNECTED' } },
        data: {
          status: 'ERROR',
          lastSyncStatus: 'FAILED',
          lastSyncError: output.errorMessage,
          syncLockUntil: null,
          nextSyncAt: new Date(Date.now() + 15 * 60 * 1000)
        }
      });

      return {
        success: false,
        importedCount: 0,
        message: output.errorMessage
      };
    }

    // Success: transactional snapshot upsert and diff in database
    const fetchedItems = output.items;
    const nextSyncAt = new Date(Date.now() + instance.syncIntervalHours * 3600 * 1000);

    try {
      await prisma.$transaction(async (tx) => {
        for (const item of fetchedItems) {
          await tx.syncedProduct.upsert({
            where: {
              instanceId_externalShopId_externalProductId: {
                instanceId: instance.id,
                externalShopId: item.externalShopId,
                externalProductId: item.externalProductId
              }
            },
            create: {
              providerId: instance.providerId,
              instanceId: instance.id,
              externalShopId: item.externalShopId,
              externalProductId: item.externalProductId,
              title: item.title,
              description: item.description || null,
              brand: item.brand || null,
              categorySlug: item.categorySlug || null,
              categoryTitle: item.categoryTitle || null,
              imageUrl: item.imageUrl || null,
              media: item.media || [],
              basePrice: item.basePrice,
              currency: item.currency || 'UZS',
              productUrl: item.productUrl,
              variants: item.variants || [],
              attributes: item.attributes || {},
              sourceStatus: item.sourceStatus,
              isAvailable: item.isAvailable,
              isVisible: true,
              lastSeenRunId: syncRun.id,
              lastSyncedAt: new Date()
            },
            update: {
              title: item.title,
              description: item.description || null,
              brand: item.brand || null,
              categorySlug: item.categorySlug || null,
              categoryTitle: item.categoryTitle || null,
              imageUrl: item.imageUrl || null,
              media: item.media || [],
              basePrice: item.basePrice,
              currency: item.currency || 'UZS',
              productUrl: item.productUrl,
              variants: item.variants || [],
              attributes: item.attributes || {},
              sourceStatus: item.sourceStatus,
              isAvailable: item.isAvailable,
              isVisible: true,
              lastSeenRunId: syncRun.id,
              lastSyncedAt: new Date()
            }
          });
        }

        // Hide products belonging to this shop that were NOT seen in this successful snapshot
        const hiddenResult = await tx.syncedProduct.updateMany({
          where: {
            instanceId: instance.id,
            externalShopId: instance.selectedShopId || undefined,
            OR: [
              { lastSeenRunId: null },
              { lastSeenRunId: { not: syncRun.id } }
            ]
          },
          data: {
            isVisible: false
          }
        });

        const activeCount = fetchedItems.filter(i => i.isAvailable).length;

        await tx.connectorSyncRun.update({
          where: { id: syncRun.id },
          data: {
            status: 'SUCCESS',
            finishedAt: new Date(),
            importedCount: fetchedItems.length,
            activeCount,
            hiddenCount: hiddenResult.count
          }
        });

        const nowInTx = new Date();
        const updateInstanceResult = await tx.connectorInstance.updateMany({
          where: {
            id: instanceId,
            status: { not: 'DISCONNECTED' },
            syncRunId: runToken,
            syncLockUntil: { gte: nowInTx }
          },
          data: {
            status: 'CONNECTED',
            lastSyncStatus: 'SUCCESS',
            lastSyncAt: nowInTx,
            lastSyncError: null,
            nextSyncAt,
            syncLockUntil: null,
            syncRunId: runToken,
            totalProducts: fetchedItems.length,
            activeProducts: activeCount
          }
        });

        if (updateInstanceResult.count === 0) {
          throw new Error('Sync bekor qilindi: ulanish o‘chirilgan, qulf muddati tugagan yoki boshqa jarayon qulfni egallagan.');
        }
      }, { timeout: 30000 });
    } catch (txError: any) {
      this.logger.error(`Snapshot transaction failed for instance ${instanceId}: ${txError.message}`);
      await prisma.connectorSyncRun.updateMany({
        where: { id: syncRun.id },
        data: {
          status: 'FAILED',
          finishedAt: new Date(),
          errorMessage: `Bazada saqlashda xatolik: ${txError.message}`
        }
      });
      await prisma.connectorInstance.updateMany({
        where: { id: instanceId, syncRunId: runToken, status: { not: 'DISCONNECTED' } },
        data: {
          status: 'ERROR',
          lastSyncStatus: 'FAILED',
          lastSyncError: txError.message,
          syncLockUntil: null,
          nextSyncAt: new Date(Date.now() + 15 * 60 * 1000)
        }
      });
      return {
        success: false,
        importedCount: 0,
        message: txError.message
      };
    }

    // Invalidate Redis cache
    await this.invalidateProviderCache(instance.provider.slug);

    return {
      success: true,
      importedCount: fetchedItems.length
    };
  }

  async listInstances(actor: any, providerSlug?: string) {
    const provider = await this.resolveAndAuthorizeProvider(actor, providerSlug);

    const instances = await prisma.connectorInstance.findMany({
      where: { providerId: provider.id },
      include: { credential: true, definition: true },
      orderBy: { createdAt: 'desc' }
    });

    return instances.map(inst => this.mapInstanceDto(inst, inst.credential?.maskedSecret));
  }

  async getInstance(actor: any, instanceId: string) {
    const instance = await prisma.connectorInstance.findUnique({
      where: { id: instanceId },
      include: { credential: true, definition: true, provider: true }
    });

    if (!instance) {
      throw new NotFoundException(`Instance topilmadi: ${instanceId}`);
    }

    await this.resolveAndAuthorizeProvider(actor, instance.provider.slug);

    return this.mapInstanceDto(instance, instance.credential?.maskedSecret);
  }

  async rotateCredential(actor: any, instanceId: string, apiKey: string) {
    const instance = await prisma.connectorInstance.findUnique({
      where: { id: instanceId },
      include: { provider: true, definition: true }
    });

    if (!instance) {
      throw new NotFoundException(`Instance topilmadi: ${instanceId}`);
    }

    await this.resolveAndAuthorizeProvider(actor, instance.provider.slug);

    const connector = this.getConnector(instance.connectorDefinitionId);
    const testResult = await connector.authenticate({ apiKey });
    if (!testResult.success) {
      throw new BadRequestException(testResult.message || 'Yangi API kalit tekshiruvdan o‘tmadi.');
    }

    const encryptedSecret = encryptSecret(apiKey.trim(), this.getEncryptionKey());
    const maskedSecret = this.maskApiKey(apiKey);

    await prisma.connectorCredential.update({
      where: { id: instance.credentialId },
      data: {
        encryptedSecret,
        maskedSecret
      }
    });

    const updatedInstance = await prisma.connectorInstance.update({
      where: { id: instanceId },
      data: {
        status: 'CONNECTED',
        lastSyncError: null
      }
    });

    // Trigger fresh sync
    this.syncInstance(instanceId, 'MANUAL').catch(err => {
      this.logger.error(`Sync after credential rotation failed: ${err.message}`);
    });

    return this.mapInstanceDto(updatedInstance, maskedSecret);
  }

  async disconnectInstance(actor: any, instanceId: string) {
    const instance = await prisma.connectorInstance.findUnique({
      where: { id: instanceId },
      include: { provider: true }
    });

    if (!instance) {
      throw new NotFoundException(`Instance topilmadi: ${instanceId}`);
    }

    await this.resolveAndAuthorizeProvider(actor, instance.provider.slug);

    // 1. Mark instance as DISCONNECTED and clear locks
    const updated = await prisma.connectorInstance.update({
      where: { id: instanceId },
      data: {
        status: 'DISCONNECTED',
        syncLockUntil: null,
        syncRunId: null
      }
    });

    // 2. Hide all products from search and catalog
    await prisma.syncedProduct.updateMany({
      where: { instanceId },
      data: { isVisible: false }
    });

    // 3. Invalidate caches
    await this.invalidateProviderCache(instance.provider.slug);

    return {
      success: true,
      instanceId,
      status: updated.status
    };
  }

  async previewCatalog(actor: any, instanceId: string, limit = 50) {
    const instance = await prisma.connectorInstance.findUnique({
      where: { id: instanceId },
      include: { provider: true }
    });

    if (!instance) {
      throw new NotFoundException(`Instance topilmadi: ${instanceId}`);
    }

    await this.resolveAndAuthorizeProvider(actor, instance.provider.slug);

    const products = await prisma.syncedProduct.findMany({
      where: { instanceId, isVisible: true },
      take: limit,
      orderBy: { createdAt: 'desc' }
    });

    return {
      instanceId,
      providerSlug: instance.provider.slug,
      shopName: instance.selectedShopName,
      totalCount: await prisma.syncedProduct.count({ where: { instanceId, isVisible: true } }),
      products: products.map(p => ({
        id: p.id,
        externalProductId: p.externalProductId,
        title: p.title,
        basePrice: Number(p.basePrice),
        currency: p.currency,
        imageUrl: p.imageUrl,
        categoryTitle: p.categoryTitle,
        productUrl: p.productUrl,
        isAvailable: p.isAvailable,
        lastSyncedAt: p.lastSyncedAt.toISOString()
      }))
    };
  }

  private async invalidateProviderCache(providerSlug: string): Promise<void> {
    const cleanSlug = providerSlug.toLowerCase().trim();
    this.registryService.invalidateAdapterCache(cleanSlug);
    try {
      await this.redisService.delByPattern(`provider-data:v1:${cleanSlug}:*`);
    } catch (err: any) {
      this.logger.warn(`Redis pattern deletion error for ${cleanSlug}: ${err.message}`);
    }
  }

  private async resolveAndAuthorizeProvider(actor: any, providerSlug?: string) {
    if (!actor) {
      throw new ForbiddenException('Autentifikatsiya talab qilinadi.');
    }

    let provider: any = null;
    if (providerSlug) {
      provider = await prisma.provider.findUnique({ where: { slug: providerSlug.toLowerCase().trim() } });
    } else if (actor.providerId) {
      provider = await prisma.provider.findUnique({ where: { id: actor.providerId } });
    }

    if (!provider) {
      throw new NotFoundException(`Provider topilmadi: ${providerSlug || actor.providerId}`);
    }

    // Role check: SUPER_ADMIN or ADMIN can access any provider; PROVIDER_OWNER/DEVELOPER can only access their own
    const isGlobalAdmin = actor.role === 'SUPER_ADMIN' || actor.role === 'ADMIN';
    if (!isGlobalAdmin && actor.providerId !== provider.id) {
      throw new ForbiddenException('Siz ushbu provider ma’lumotlarini boshqarish huquqiga ega emassiz.');
    }

    return provider;
  }

  private mapInstanceDto(instance: any, maskedSecret?: string) {
    return {
      id: instance.id,
      providerId: instance.providerId,
      connectorDefinitionId: instance.connectorDefinitionId,
      credentialId: instance.credentialId,
      name: instance.name,
      status: instance.status,
      selectedShopId: instance.selectedShopId,
      selectedShopName: instance.selectedShopName,
      autoSyncEnabled: instance.autoSyncEnabled,
      syncIntervalHours: instance.syncIntervalHours,
      lastSyncAt: instance.lastSyncAt ? instance.lastSyncAt.toISOString() : null,
      lastSyncStatus: instance.lastSyncStatus,
      lastSyncError: instance.lastSyncError,
      nextSyncAt: instance.nextSyncAt ? instance.nextSyncAt.toISOString() : null,
      totalProducts: instance.totalProducts,
      activeProducts: instance.activeProducts,
      maskedSecret: maskedSecret || undefined,
      config: instance.config || {},
      metadata: instance.metadata || {},
      createdAt: instance.createdAt.toISOString(),
      updatedAt: instance.updatedAt.toISOString()
    };
  }
}
