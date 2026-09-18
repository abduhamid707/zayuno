import { Injectable, BadRequestException } from '@nestjs/common';
import { ProviderRegistryService } from '../providers/provider-registry.service';
import { ProvidersService } from '../providers/providers.service';
import { prisma } from '@zayuno/database';
import { isProviderPublished, NotFoundError } from '@zayuno/shared';
import {
  RequestQuoteInput,
  NormalizedQuote,
  ProviderCapability
} from '@zayuno/contracts';
import { CapabilityNotSupportedError } from '@zayuno/provider-sdk';
import { findForbiddenParameterKey } from '../../common/sensitive-parameters';
import { assertDeclaredDynamicParameters } from '../../common/dynamic-parameter-validation';

@Injectable()
export class QuotesService {
  constructor(
    private registry: ProviderRegistryService,
    private providersService?: ProvidersService
  ) {}

  async requestQuote(
    input: RequestQuoteInput,
    options?: { allowSandboxSimulator?: boolean }
  ): Promise<NormalizedQuote> {
    if (!input.providerSlug) {
      throw new BadRequestException('providerSlug is required.');
    }
    if (!input.items || input.items.length === 0) {
      throw new BadRequestException('At least one item is required to request a quote.');
    }
    const forbiddenKey = findForbiddenParameterKey(input.parameters);
    if (forbiddenKey) {
      throw new BadRequestException(`Sensitive identity or payment field "${forbiddenKey}" is not allowed in quote parameters. Use the provider-owned secure handoff.`);
    }

    const cleanSlug = input.providerSlug.toLowerCase().trim();
    const env = input.environment;
    // 1. Provider exists & published
    let provider: any;
    if (this.providersService) {
      provider = await this.providersService.assertProviderPublished(cleanSlug, env);
    } else {
      provider = await prisma.provider.findUnique({ where: { slug: cleanSlug } });
      if (!provider) {
        throw new NotFoundError('Provider', cleanSlug);
      }
      const isSandbox = provider.environment === 'SANDBOX' || provider.status === 'SANDBOX';
      if (!isProviderPublished(provider) && !isSandbox && !options?.allowSandboxSimulator) {
        throw new NotFoundError('Provider', cleanSlug);
      }
    }

    // 2. Capability supported?
    const adapter = await this.registry.assertAndGetCapability(cleanSlug, ProviderCapability.QUOTE);
    if (this.providersService) {
      await this.providersService.assertProviderCapabilityEligible(cleanSlug, ProviderCapability.QUOTE, env);
    }
    if (!adapter.requestQuote) {
      throw new CapabilityNotSupportedError(cleanSlug, ProviderCapability.QUOTE);
    }

    // 3. Location valid?
    if (input.locationId) {
      if (this.providersService) {
        await this.providersService.assertValidLocation(cleanSlug, input.locationId);
      } else {
        await this.assertValidLocationFallback(cleanSlug, input.locationId, provider.id);
      }
    }

    // 4. Dynamic parameters & adapter execution
    await assertDeclaredDynamicParameters(adapter, cleanSlug, input.parameters, {
      locationId: input.locationId,
      offeringIds: input.items.map(item => item.offeringId)
    });

    const quote = await adapter.requestQuote!(input);

    // Persist Quote in database with expiration
    if (provider) {
      const location = input.locationId
        ? await prisma.location.findFirst({
            where: {
              providerId: provider.id,
              OR: [{ id: input.locationId }, { providerLocationId: input.locationId }]
            },
            select: { id: true }
          })
        : undefined;

      await prisma.quote.create({
        data: {
          id: quote.id,
          providerId: provider.id,
          // `input.locationId` belongs to the provider API. The database
          // relation must instead use Zayuno's internal Location.id.
          locationId: location?.id,
          lines: quote.lines as any,
          subtotal: quote.subtotal,
          fees: quote.totalFees || 0,
          discount: quote.totalDiscount || 0,
          total: quote.total,
          currency: quote.currency || 'UZS',
          fulfillmentType: input.fulfillmentType || 'STANDARD',
          destination: input.destination?.raw,
          parameters: {
            ...((quote.parameters as any) || {}),
            ...(input.locationId ? { providerLocationId: input.locationId } : {})
          },
          expiresAt: new Date(quote.expiresAt)
        }
      });
    }

    return quote;
  }

  private async assertValidLocationFallback(cleanSlug: string, locationId: string, providerId?: string): Promise<void> {
    const loc = await prisma.location.findFirst({
      where: {
        ...(providerId ? { providerId } : { provider: { slug: cleanSlug } }),
        isActive: true,
        OR: [{ id: locationId }, { providerLocationId: locationId }]
      }
    });
    if (loc) return;
    try {
      const adapter = await this.registry.getAdapter(cleanSlug);
      if (adapter && adapter.getLocations) {
        const remote = await adapter.getLocations({ providerSlug: cleanSlug, activeOnly: true });
        if (Array.isArray(remote) && remote.some(l => (l.id === locationId || l.providerLocationId === locationId) && l.isActive !== false)) {
          return;
        }
      }
    } catch {}
    throw new NotFoundError('Location', locationId);
  }
}
