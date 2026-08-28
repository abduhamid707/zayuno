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
    let webhookSecret: string | undefined = provider.webhookSecret;
    if (this.isOfficialSandboxUrl(provider.baseUrl) || provider.slug === 'coffee-time' || provider.slug === 'evos' || provider.slug === 'poyez' || provider.slug === 'hh-uz' || provider.slug === 'hh-recruitment') {
      const sandboxCredential = this.resolveSandboxTestCredential(provider.baseUrl, provider.slug);
      if (sandboxCredential) {
        secret = sandboxCredential;
      }
      if (!webhookSecret || webhookSecret === '') {
        webhookSecret = secret || undefined;
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
      webhookSecret,
      authMethod: (provider.config as any)?.authMethod || (provider as any).authMethod || 'API_KEY',
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

  isOfficialSandboxUrl(baseUrl?: string | null): boolean {
    if (!baseUrl) return false;
    try {
      const parsed = new URL(baseUrl);
      // Userinfo (e.g. user:pass@...) must be strictly rejected
      if (parsed.username || parsed.password) return false;

      // In production, protocol must strictly be https:
      if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:') {
        return false;
      }
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        return false;
      }

      const hostname = parsed.hostname.toLowerCase();
      // Strict exact hostname matching - no subdomains, no suffix tricks, no IP trickery
      return (
        hostname === 'coffee-time-sandbox.shopla.uz' ||
        hostname === 'evos-sandbox.shopla.uz' ||
        hostname === 'poyez-sandbox.shopla.uz'
      );
    } catch {
      return false;
    }
  }

  resolveSandboxTestCredential(baseUrl?: string | null, slug?: string): string | null {
    if (!baseUrl && !slug) return null;

    let hostname = '';
    if (baseUrl) {
      try {
        const parsed = new URL(baseUrl);
        if (parsed.username || parsed.password) return null;
        hostname = parsed.hostname.toLowerCase();
      } catch {
        // Ignore invalid URL
      }
    }

    const cleanSlug = (slug || '').toLowerCase().trim();

    // 1. Mock Coffee Time Sandbox -> COFFEE_TIME_SHARED_SECRET (Strict, zero fallbacks)
    if (hostname === 'coffee-time-sandbox.shopla.uz' || (!baseUrl && (cleanSlug === 'coffee-time' || cleanSlug === 'mock-coffee-time'))) {
      const secret = process.env.COFFEE_TIME_SHARED_SECRET?.trim();
      return secret || null;
    }

    // 2. Mock EVOS Sandbox -> MOCK_EVOS_SHARED_SECRET (Strict, zero fallbacks)
    if (hostname === 'evos-sandbox.shopla.uz' || (!baseUrl && (cleanSlug === 'evos' || cleanSlug === 'mock-evos'))) {
      const secret = process.env.MOCK_EVOS_SHARED_SECRET?.trim();
      return secret || null;
    }

    // 3. Mock Poyez Tickets Sandbox -> POYEZ_SANDBOX_SHARED_SECRET (Strict, zero fallbacks)
    if (hostname === 'poyez-sandbox.shopla.uz' || (!baseUrl && (cleanSlug === 'poyez' || cleanSlug === 'poyez-sandbox' || cleanSlug === 'mock-poyez'))) {
      const secret = process.env.POYEZ_SANDBOX_SHARED_SECRET?.trim();
      return secret || null;
    }

    // 4. HeadHunter Uzbekistan Live Recruitment Provider
    if (hostname === 'hh-recruitment' || cleanSlug === 'hh-uz' || cleanSlug === 'hh-recruitment') {
      const secret = process.env.HH_PROVIDER_API_KEY?.trim();
      return secret || null;
    }

    // Strict fail-closed: No server-side test credentials for any other URL/domain
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
