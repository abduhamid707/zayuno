import { Controller, Get, Post, Param, Query, Body, UseGuards, BadRequestException, Req } from '@nestjs/common';
import { CheckAvailabilityInput, SearchCatalogInput } from '@zayuno/contracts';
import { ApiTags, ApiOperation, ApiSecurity } from '@nestjs/swagger';
import { CatalogService } from './catalog.service';
import { CatalogProjectionSchema } from '@zayuno/contracts';
import { projectCatalog, projectOffering } from '@zayuno/shared';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';

@ApiTags('Catalog & Offerings')
@Controller('api/v1')
@UseGuards(ApiKeyGuard)
@ApiSecurity('api-key')
export class CatalogController {
  constructor(private catalogService: CatalogService) {}

  @Get('providers/:slug/catalog')
  @ApiOperation({ summary: 'Get full normalized catalog and offerings for a provider' })
  async getCatalog(
    @Param('slug') slug: string,
    @Query('locationId') locationId?: string,
    @Query('category') categorySlug?: string,
    @Query('context') context?: string,
    @Query('environment') environment?: string,
    @Req() req?: any
  ) {
    const effectiveEnv = environment || (req?.headers ? req.headers['x-zayuno-environment'] || req.headers['x-execution-context'] : undefined);
    const projection = this.projection(req?.query);
    return projectCatalog(await this.catalogService.getCatalog(slug, locationId, categorySlug, this.parseContext(context), effectiveEnv), projection);
  }

  @Get('providers/:slug/offerings/:offeringId')
  @ApiOperation({ summary: 'Get specific offering details, variants, and options' })
  async getOffering(
    @Param('slug') slug: string,
    @Param('offeringId') offeringId: string,
    @Query('locationId') locationId?: string,
    @Query('context') context?: string,
    @Query('environment') environment?: string,
    @Req() req?: any
  ) {
    const effectiveEnv = environment || (req?.headers ? req.headers['x-zayuno-environment'] || req.headers['x-execution-context'] : undefined);
    const projection = this.projection(req?.query);
    return projectOffering(await this.catalogService.getOffering(slug, offeringId, locationId, this.parseContext(context), effectiveEnv), projection);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search offerings across a provider catalog' })
  async searchOfferings(
    @Query('provider') providerSlug: string,
    @Query('q') query: string,
    @Query('category') categorySlug?: string,
    @Query('locationId') locationId?: string,
    @Query('limit') limit?: string,
    @Query('context') context?: string,
    @Query('environment') environment?: string,
    @Req() req?: any
  ) {
    if (!providerSlug) {
      throw new BadRequestException('Query parameter "provider" is required for search. Example: /api/v1/search?provider=sandbox-provider&q=standard');
    }
    const effectiveEnv = environment || (req?.headers ? req.headers['x-zayuno-environment'] || req.headers['x-execution-context'] : undefined);
    const projection = this.projection(req?.query);
    return projectCatalog(await this.catalogService.searchOfferings(
      providerSlug,
      query,
      categorySlug,
      locationId,
      limit ? parseInt(limit, 10) : 20,
      this.parseContext(context),
      effectiveEnv
    ), projection);
  }

  @Post('search')
  @ApiOperation({ summary: 'Structured dynamic offering search with provider-specific context' })
  async searchOfferingsStructured(@Body() body: SearchCatalogInput, @Req() req?: any) {
    if (!body?.providerSlug) throw new BadRequestException('providerSlug is required.');
    const effectiveEnv = (body as any)?.environment || (req?.headers ? req.headers['x-zayuno-environment'] || req.headers['x-execution-context'] : undefined);
    const projection = this.projection(body);
    return projectCatalog(await this.catalogService.searchOfferings(
      body.providerSlug,
      body.query || '',
      body.categorySlug,
      body.locationId,
      body.limit || 20,
      body.parameters,
      effectiveEnv
    ), projection);
  }

  @Post('availability')
  @ApiOperation({ summary: 'Check availability for items before quotation' })
  async checkAvailability(@Body() body: CheckAvailabilityInput, @Req() req?: any) {
    const effectiveEnv = (body as any)?.environment || (req?.headers ? req.headers['x-zayuno-environment'] || req.headers['x-execution-context'] : undefined);
    return this.catalogService.checkAvailability(body, effectiveEnv);
  }


  private projection(input: any) {
    const parsed = CatalogProjectionSchema.safeParse({ responseProfile: input?.responseProfile,
      select: typeof input?.select === 'string' ? input.select.split(',') : input?.select });
    if (!parsed.success) throw new BadRequestException('Invalid responseProfile or select.');
    return parsed.data;
  }

  private parseContext(value?: string): Record<string, any> | undefined {
    if (!value) return undefined;
    if (value.length > 16_384) throw new BadRequestException('Search context is too large.');
    try {
      const parsed = JSON.parse(value);
      if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
        throw new Error('Context must be an object.');
      }
      return parsed;
    } catch {
      throw new BadRequestException('context must be a valid JSON object.');
    }
  }
}
