import { Injectable, OnModuleInit } from '@nestjs/common';
import { ProviderAdapter, ProviderCapability } from '@zayuno/contracts';
import { ProviderAdapterConfig, CapabilityNotSupportedError, RemoteHttpProviderAdapter } from '@zayuno/provider-sdk';
import { prisma } from '@zayuno/database';
import { decryptSecret, NotFoundError, Logger } from '@zayuno/shared';
import { SandboxProviderAdapter } from '@zayuno/sandbox-provider';

export type AdapterFactory = (config: ProviderAdapterConfig) => ProviderAdapter;

@Injectable()
export class ProviderRegistryService implements OnModuleInit {
  private adapterCache = new Map<string, ProviderAdapter>();
  private factories = new Map<string, AdapterFactory>();
  private logger = new Logger('ProviderRegistryService');

  onModuleInit() {
    // Register standard sandbox adapter factory
    this.registerFactory('sandbox', (config) => new SandboxProviderAdapter(config));
    // Register generic remote HTTP adapter factory for external providers
    this.registerFactory('remote-http', (config) => new RemoteHttpProviderAdapter(config));
    this.logger.info('Registered default "sandbox" and "remote-http" adapter factories.');
  }

  registerFactory(adapterType: string, factory: AdapterFactory): void {
    const typeKey = adapterType.toLowerCase().trim();
    this.factories.set(typeKey, factory);
    this.logger.info(`Registered adapter factory for type "${typeKey}"`);
  }

  private getEncryptionKey(): string {
    if (!process.env.ENCRYPTION_KEY) throw new Error('ENCRYPTION_KEY is required.');
    return process.env.ENCRYPTION_KEY;
  }

  async getAdapter(providerSlug: string): Promise<ProviderAdapter> {
    if (!providerSlug || typeof providerSlug !== 'string') {
      throw new NotFoundError('Provider', 'undefined');
    }

    const slug = providerSlug.toLowerCase().trim();

    if (this.adapterCache.has(slug)) {
      return this.adapterCache.get(slug)!;
    }

    const provider = await prisma.provider.findUnique({
      where: { slug }
    });

    if (!provider) {
      if (slug === 'sandbox-provider') {
        const sandboxFactory = this.factories.get('sandbox') || ((cfg: any) => new SandboxProviderAdapter(cfg));
        const sandboxAdapter = sandboxFactory({
          slug: 'sandbox-provider',
          secret: 'dev_sandbox_secret',
          webhookSecret: 'dev_sandbox_webhook_secret',
          config: {},
          metadata: {
            capabilities: [
              ProviderCapability.METADATA,
              ProviderCapability.HEALTH,
              ProviderCapability.LOCATIONS,
              ProviderCapability.CATALOG,
              ProviderCapability.SEARCH,
              ProviderCapability.QUOTE,
              ProviderCapability.ACTION_CREATE,
              ProviderCapability.ACTION_STATUS,
              ProviderCapability.ACTION_CANCEL,
              ProviderCapability.PAYMENT_OPTIONS,
              ProviderCapability.WEBHOOK
            ]
          }
        });
        this.adapterCache.set('sandbox-provider', sandboxAdapter);
        return sandboxAdapter;
      }
      throw new NotFoundError('Provider', slug);
    }

    let secret = '';
    try {
      secret = decryptSecret(provider.encryptedSecret, this.getEncryptionKey());
    } catch {
      secret = provider.encryptedSecret;
    }

    // Safely resolve server-side test credential for recognized sandbox hosts
    // if no specific provider secret has been configured.
    if (!secret || secret.startsWith('zy_sb_sec_')) {
      const sandboxCredential = this.resolveSandboxTestCredential(provider.baseUrl, provider.slug);
      if (sandboxCredential) {
        secret = sandboxCredential;
      }
    }

    const adapterType = (provider.adapterType || 'sandbox').toLowerCase().trim();
    const factory = this.factories.get(adapterType);

    if (!factory) {
      throw new Error(`No adapter factory registered for provider "${slug}" with adapterType "${adapterType}".`);
    }

    const adapter = factory({
      slug: provider.slug,
      baseUrl: provider.baseUrl || undefined,
      secret,
      webhookSecret: provider.webhookSecret,
      config: (provider.config as Record<string, any>) || {},
      metadata: {
        ...((provider.metadata as Record<string, any>) || {}),
        // Remote adapters must expose the exact capability set registered in
        // Zayuno rather than silently falling back to a smaller default list.
        capabilities: provider.capabilities
      }
    });

    this.adapterCache.set(slug, adapter);
    this.logger.info(`Initialized adapter for provider "${slug}" (Type: ${adapterType})`);
    return adapter;
  }

  private resolveSandboxTestCredential(baseUrl?: string | null, slug?: string): string | null {
    if (!baseUrl && !slug) return null;
    let hostname = '';
    try {
      if (baseUrl) {
        const parsed = new URL(baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`);
        hostname = parsed.hostname.toLowerCase();
      }
    } catch {}

    const cleanSlug = (slug || '').toLowerCase();

    // 1. Mock Coffee Time Sandbox
    if (hostname.includes('coffee-time') || cleanSlug.includes('coffee-time')) {
      return process.env.MOCK_COFFEE_TIME_API_KEY || process.env.PROVIDER_API_KEY || 'zy_test_sandbox_coffee_key';
    }

    // 2. Mock EVOS Sandbox
    if (hostname.includes('evos') || cleanSlug.includes('evos')) {
      return process.env.MOCK_EVOS_API_KEY || process.env.PROVIDER_API_KEY || 'zy_test_sandbox_evos_key';
    }

    // 3. Mock Poyez Tickets Sandbox
    if (hostname.includes('poyez') || cleanSlug.includes('poyez')) {
      return process.env.MOCK_POYEZ_API_KEY || process.env.PROVIDER_API_KEY || 'zy_test_sandbox_poyez_key';
    }

    // 4. Generic shopla.uz / test sandbox domains
    if (hostname.endsWith('.shopla.uz') || hostname.includes('sandbox')) {
      return process.env.SANDBOX_TEST_API_KEY || process.env.PROVIDER_API_KEY || null;
    }

    return null;
  }

  async assertAndGetCapability(providerSlug: string, capability: ProviderCapability): Promise<ProviderAdapter> {
    const adapter = await this.getAdapter(providerSlug);
    if (!adapter.hasCapability(capability)) {
      throw new CapabilityNotSupportedError(providerSlug, capability);
    }
    return adapter;
  }

  invalidateAdapterCache(providerSlug: string): void {
    this.adapterCache.delete(providerSlug.toLowerCase().trim());
    this.logger.info(`Invalidated adapter cache for provider "${providerSlug}"`);
  }
}
