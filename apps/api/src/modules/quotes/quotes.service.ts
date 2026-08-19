import { Injectable, BadRequestException } from '@nestjs/common';
import { ProviderRegistryService } from '../providers/provider-registry.service';
import { prisma, ProviderStatus } from '@zayuno/database';
import {
  RequestQuoteInput,
  NormalizedQuote,
  ProviderCapability
} from '@zayuno/contracts';
import { findForbiddenParameterKey } from '../../common/sensitive-parameters';

@Injectable()
export class QuotesService {
  constructor(private registry: ProviderRegistryService) {}

  async requestQuote(input: RequestQuoteInput): Promise<NormalizedQuote> {
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
    const provider = await prisma.provider.findUnique({ where: { slug: cleanSlug } });
    const reviewStatus = (provider?.metadata as any)?.reviewStatus;
    if (!provider || provider.status !== ProviderStatus.ACTIVE || reviewStatus === 'REJECTED' || reviewStatus === 'SUSPENDED') {
      throw new BadRequestException('Provider is not published for public quotes.');
    }
    const adapter = await this.registry.assertAndGetCapability(cleanSlug, ProviderCapability.QUOTE);
    if (!adapter.requestQuote) {
      throw new BadRequestException(`Provider "${cleanSlug}" does not implement requestQuote.`);
    }

    const quote = await adapter.requestQuote(input);

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
}
