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
      throw new NotFoundError('Provider', slug);
    }

    let secret = '';
    try {
      secret = decryptSecret(provider.encryptedSecret, this.getEncryptionKey());
    } catch {
      secret = provider.encryptedSecret;
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
