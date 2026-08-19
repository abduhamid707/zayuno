import { Injectable, BadRequestException } from '@nestjs/common';
import { ProviderRegistryService } from '../providers/provider-registry.service';
import { prisma } from '@zayuno/database';
import { NotFoundError } from '@zayuno/shared';
import { PaymentOption, ProviderCapability } from '@zayuno/contracts';

@Injectable()
export class PaymentsService {
  constructor(private registry: ProviderRegistryService) {}

  async getPaymentOptions(actionId: string, providerSlug?: string): Promise<PaymentOption[]> {
    const action = await prisma.action.findFirst({
      where: {
        OR: [
          { id: actionId },
          { publicId: actionId },
          { externalActionId: actionId }
        ]
      },
      include: { provider: true }
    });

    const slug = providerSlug || action?.provider?.slug;
    if (!slug) {
      throw new BadRequestException('providerSlug must be supplied or actionId must exist in the database.');
    }

    const cleanSlug = slug.toLowerCase().trim();
    const targetActionId = action?.externalActionId || actionId;

    const adapter = await this.registry.assertAndGetCapability(cleanSlug, ProviderCapability.PAYMENT_OPTIONS);
    if (adapter.getPaymentOptions) {
      return adapter.getPaymentOptions({
        providerSlug: cleanSlug,
        actionId: targetActionId
      });
    }

    return [];
  }
}
