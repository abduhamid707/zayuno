import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';

@ApiTags('Payments')
@Controller('api/v1/orders')
@UseGuards(ApiKeyGuard)
@ApiSecurity('api-key')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Get(':id/payment-options')
  @ApiOperation({
    summary: 'Get payment options and checkout URLs from provider',
    description: 'Returns Cash, Payme, Click, or Card payment URLs. Zayuno does not process card data directly.'
  })
  async getPaymentOptions(
    @Param('id') id: string,
    @Query('provider') providerSlug?: string
  ) {
    return this.paymentsService.getPaymentOptions(id, providerSlug);
  }
}
