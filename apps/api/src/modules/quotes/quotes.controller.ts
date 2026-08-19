import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity } from '@nestjs/swagger';
import { QuotesService } from './quotes.service';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { RequestQuoteInput } from '@zayuno/contracts';

@ApiTags('Quotes & Pricing')
@Controller('api/v1/quotes')
@UseGuards(ApiKeyGuard)
@ApiSecurity('api-key')
export class QuotesController {
  constructor(private quotesService: QuotesService) {}

  @Post()
  @ApiOperation({ summary: 'Calculate verified pricing, fees, and line-item breakdown for a provider offering' })
  async requestQuote(@Body() body: RequestQuoteInput) {
    return this.quotesService.requestQuote(body);
  }
}
