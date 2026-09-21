import { isSafePublicHttpsUrl } from '@zayuno/contracts';
import { ManagedConnector, ConnectorAuthResult, ConnectorSyncItem, ConnectorSyncOutput } from '../managed-connector';

export interface UzumProductCard {
  productId: number;
  title: string;
  category?: string | {
    id?: number;
    title?: string;
    name?: string;
  };
  categoryTitle?: string;
  brand?: string | {
    id?: number;
    title?: string;
    name?: string;
  };
  brandTitle?: string;
  rating?: number;
  status?: string | {
    value?: string;
    name?: string;
    code?: string;
    status?: string;
    description?: string;
  };
  moderationStatus?: string | { value?: string };
  image?: string;
  previewImg?: string;
  quantityActive?: number;
  quantityFbs?: number;
  characteristics?: Array<{
    title?: string;
    value?: string | number;
  }>;
  skuList?: Array<{
    skuId: number;
    skuTitle?: string;
    skuFullTitle?: string;
    characteristics?: string;
    price?: number;
    quantityActive?: number;
    quantityFbs?: number;
    archived?: boolean;
    blocked?: boolean;
    status?: string | { value?: string; name?: string; code?: string; status?: string };
    previewImage?: string;
  }>;
}

export interface UzumAllProductsResponse {
  productList?: UzumProductCard[];
  totalProductsAmount?: number;
}

export interface UzumShopDto {
  id: number | string;
  name?: string;
  title?: string;
  legalName?: string;
  status?: string | { value?: string; name?: string; code?: string; status?: string };
  shops?: UzumShopDto[];
}

function extractUzumStatus(raw: any): string {
  if (!raw) return 'UNKNOWN';
  if (typeof raw === 'string') return raw.trim().toUpperCase();
  if (typeof raw === 'object') {
    // Official Uzum Seller API returns { value: "ACTIVE" | "BLOCKED" | "ARCHIVED" }
    const val = raw.value || raw.name || raw.code || raw.status || raw.title;
    if (typeof val === 'string' && val.trim().length > 0) {
      return val.trim().toUpperCase();
    }
  }
  return 'UNKNOWN';
}

export class UzumMarketConnector implements ManagedConnector {
  readonly definitionId = 'uzum';
  readonly name = 'Uzum Market';
  private readonly baseUrl: string;
  private readonly testCatalogShopIds: ReadonlySet<string>;

  constructor(customBaseUrl?: string, options: { testCatalogShopIds?: readonly string[] } = {}) {
    this.baseUrl = (customBaseUrl || process.env.UZUM_BASE_URL || 'https://api-seller.uzum.uz/api/seller-openapi').replace(/\/+$/, '');
    const envShopIds = (typeof process !== 'undefined' && process.env?.UZUM_TEST_CATALOG_SHOP_IDS !== undefined)
      ? process.env.UZUM_TEST_CATALOG_SHOP_IDS.split(',').map(s => s.trim()).filter(Boolean)
      : ['128831'];
    const mergedIds = options.testCatalogShopIds !== undefined
      ? options.testCatalogShopIds
      : envShopIds;
    this.testCatalogShopIds = new Set(mergedIds.map(id => id.trim()).filter(Boolean));
  }

  private getHeaders(apiKey: string): Record<string, string> {
    return {
      'Authorization': apiKey.trim(),
      'Accept': 'application/json',
      'User-Agent': 'Zayuno-ManagedConnector/1.0 (+https://zayuno.uz)'
    };
  }

  async authenticate(credentials: { apiKey: string; [key: string]: any }): Promise<ConnectorAuthResult> {
    const apiKey = credentials.apiKey;
    if (!apiKey) {
      return { success: false, message: 'API kalit kiritilmagan.' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/v1/shops`, {
        method: 'GET',
        headers: this.getHeaders(apiKey)
      });

      if (response.status === 401 || response.status === 403) {
        let errDetails = '';
        try {
          const body = (await response.json()) as any;
          if (body && Array.isArray(body.errors) && body.errors[0]?.message) {
            errDetails = ` (${body.errors[0].message})`;
          }
        } catch {
          // ignore json parse error
        }
        return {
          success: false,
          message: `Uzum Market API kaliti rad etildi (HTTP ${response.status})${errDetails}. Iltimos, Uzum Seller kabinetingizdan yangi kalit yaratib, qayta urinib ko‘ring.`
        };
      }

      if (!response.ok) {
        return {
          success: false,
          message: `Uzum serveri xatolik qaytardi (HTTP ${response.status}). Keyinroq qayta urinib ko‘ring.`
        };
      }

      const rawData = (await response.json()) as any;
      const shops: Array<{ id: string; name: string; legalName?: string; status?: string }> = [];

      const parseStatus = (st: any): string | undefined => {
        const extracted = extractUzumStatus(st);
        return extracted !== 'UNKNOWN' ? extracted : undefined;
      };

      if (Array.isArray(rawData)) {
        for (const item of rawData) {
          if (!item) continue;
          if (Array.isArray(item.shops)) {
            // Nested organization wrapper containing shops
            for (const shop of item.shops) {
              if (!shop) continue;
              const shopId = shop.id !== undefined ? shop.id : (shop as any).shopId;
              if (shopId !== undefined) {
                shops.push({
                  id: String(shopId),
                  name: shop.name || shop.title || item.name || `Do‘kon #${shopId}`,
                  legalName: shop.legalName || item.legalName,
                  status: parseStatus(shop.status) || parseStatus(item.status)
                });
              }
            }
          } else {
            // Direct shop item: [{ id: 1234, name: "Shop Name" }]
            const shopId = item.id !== undefined ? item.id : item.shopId;
            if (shopId !== undefined) {
              shops.push({
                id: String(shopId),
                name: item.name || item.title || `Do‘kon #${shopId}`,
                legalName: item.legalName,
                status: parseStatus(item.status)
              });
            }
          }
        }
      }

      return {
        success: true,
        shops
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Uzum API serveri bilan bog‘lanishda tarmoq xatosi: ${err.message || 'Network error'}`
      };
    }
  }

  async getShops(credentials: { apiKey: string; [key: string]: any }): Promise<Array<{ id: string; name: string; legalName?: string; status?: string }>> {
    const authResult = await this.authenticate(credentials);
    if (!authResult.success) {
      throw new Error(authResult.message || 'Uzum autentifikatsiyasi muvaffaqiyatsiz bo‘ldi.');
    }
    return authResult.shops || [];
  }

  async fetchCatalog(context: {
    credentials: { apiKey: string; [key: string]: any };
    shopId: string;
    onProgress?: (fetched: number, total: number) => void;
  }): Promise<ConnectorSyncOutput> {
    const apiKey = context.credentials.apiKey;
    const shopId = context.shopId;
    // Only server configuration can enable this exception. Verify upstream access
    // on every test sync; never trust a shop name or a client-supplied flag.
    const testCatalog = this.testCatalogShopIds.has(shopId);
    if (testCatalog) {
      const auth = await this.authenticate(context.credentials);
      if (!auth.success || !auth.shops?.some(shop => shop.id === shopId)) {
        return {
          success: false, items: [], totalFetched: 0,
          errorMessage: 'Test katalogi uchun API kalit ushbu do‘konga tegishli bo‘lishi kerak.'
        };
      }
    }
    const filter = testCatalog ? 'ALL' : 'ACTIVE';
    const items: ConnectorSyncItem[] = [];
    let fetchedCount = 0;
    let page = 0;
    const pageSize = 50;
    let totalExpected = 0;
    let hasMore = true;

    while (hasMore) {
      const url = `${this.baseUrl}/v1/product/shop/${encodeURIComponent(shopId)}?filter=${filter}&page=${page}&size=${pageSize}`;
      let attempt = 0;
      let response: Response | null = null;

      while (attempt < 3) {
        attempt++;
        try {
          response = await fetch(url, {
            method: 'GET',
            headers: this.getHeaders(apiKey)
          });

          if (response.status === 429) {
            // Rate limited: backoff and retry
            const waitMs = attempt * 1000;
            await new Promise(r => setTimeout(r, waitMs));
            continue;
          }

          if (response.status === 401 || response.status === 403) {
            return {
              success: false,
              items: [],
              totalFetched: items.length,
              errorMessage: `API kaliti noto‘g‘ri yoki muddati o‘tgan (HTTP ${response.status}).`
            };
          }

          if (!response.ok) {
            return {
              success: false,
              items: [],
              totalFetched: items.length,
              errorMessage: `Uzum katalogini olishda xatolik (HTTP ${response.status} sahifa ${page}).`
            };
          }

          break;
        } catch (netErr: any) {
          if (attempt >= 3) {
            return {
              success: false,
              items: [],
              totalFetched: items.length,
              errorMessage: `Uzum serveriga ulanish uzildi: ${netErr.message}`
            };
          }
          await new Promise(r => setTimeout(r, 1000));
        }
      }

      if (!response || !response.ok) {
        return {
          success: false,
          items: [],
          totalFetched: items.length,
          errorMessage: 'Uzum javob bermadi.'
        };
      }

      const data = (await response.json()) as UzumAllProductsResponse;
      if (!data || typeof data !== 'object' || !Array.isArray(data.productList)) {
        return {
          success: false,
          items: [],
          totalFetched: fetchedCount,
          errorMessage: 'Uzum katalog javobi kutilgan formatga mos emas (productList topilmadi). Eski katalog saqlanadi.'
        };
      }
      const products = data.productList;
      fetchedCount += products.length;
      if (data.totalProductsAmount !== undefined) {
        totalExpected = data.totalProductsAmount;
      }

      for (const p of products) {
        const canonicalItem = this.mapProductToCanonical(p, shopId, testCatalog);
        if (canonicalItem) {
          items.push(canonicalItem);
        }
      }

      if (context.onProgress) {
        context.onProgress(fetchedCount, totalExpected || fetchedCount);
      }

      if (products.length < pageSize || (totalExpected > 0 && fetchedCount >= totalExpected)) {
        hasMore = false;
      } else {
        page++;
      }
    }

    return {
      success: true,
      items,
      totalFetched: fetchedCount
    };
  }

  private mapProductToCanonical(product: UzumProductCard, shopId: string, testCatalog = false): ConnectorSyncItem | null {
    if (!product || !product.productId) return null;

    const productIdStr = String(product.productId);
    const rawImage = product.image || product.previewImg || null;
    const safeImage = rawImage && isSafePublicHttpsUrl(rawImage) ? rawImage : null;

    let categoryTitle: string | null = null;
    if (typeof product.category === 'string') {
      categoryTitle = product.category.trim();
    } else if (product.category && typeof product.category === 'object') {
      categoryTitle = (product.category as any).title || (product.category as any).name || null;
    } else if (typeof product.categoryTitle === 'string') {
      categoryTitle = product.categoryTitle.trim();
    }

    const categorySlug = categoryTitle
      ? categoryTitle
          .toLowerCase()
          .replace(/[^a-z0-9а-яё]+/gi, '-')
          .replace(/(^-|-$)/g, '')
      : null;

    let brand: string | null = null;
    if (typeof product.brand === 'string') {
      brand = product.brand.trim();
    } else if (product.brand && typeof product.brand === 'object') {
      brand = (product.brand as any).name || (product.brand as any).title || null;
    } else if (typeof product.brandTitle === 'string') {
      brand = product.brandTitle.trim();
    }

    const sourceStatus = extractUzumStatus(product.status);
    const moderationStatus = extractUzumStatus(product.moderationStatus);
    const isBlockedOrArchived = ['BLOCKED', 'ARCHIVED', 'DELETED', 'REJECTED', 'DISABLED'].includes(sourceStatus);
    const isModerationBlocked = ['PERM_BANNED', 'NOT_MODERATED', 'ON_PREMODERATION', 'ON_MODERATION', 'BANNED'].includes(moderationStatus);
    const isStatusActive = !isBlockedOrArchived && !isModerationBlocked && ['ACTIVE', 'IN_STOCK', 'READY_TO_SEND', 'SENT', 'APPROVED', 'PUBLISHED'].includes(sourceStatus);
    if (!testCatalog && !isStatusActive) return null;

    const skuList = product.skuList || [];
    const variants: Array<{
      id: string;
      name: string;
      sku: string | null;
      basePrice: number;
      isAvailable: boolean;
      metadata: Record<string, any>;
    }> = [];

    let minPrice = 0;

    for (const sku of skuList) {
      const stock = (sku.quantityActive || 0) + (sku.quantityFbs || 0);
      const skuStatus = extractUzumStatus(sku.status);
      const isSkuBlocked = Boolean(sku.blocked || sku.archived || skuStatus === 'BLOCKED' || skuStatus === 'ARCHIVED');
      const isAvailable = isStatusActive && !isSkuBlocked && stock > 0;
      const skuPrice = Number(sku.price || 0);

      if (skuPrice > 0 && (minPrice === 0 || skuPrice < minPrice)) {
        minPrice = skuPrice;
      }

      variants.push({
        id: String(sku.skuId),
        name: sku.skuTitle || sku.characteristics || 'Standard',
        sku: String(sku.skuId),
        basePrice: skuPrice,
        isAvailable,
        metadata: {
          stock,
          previewImage: sku.previewImage && isSafePublicHttpsUrl(sku.previewImage) ? sku.previewImage : null
        }
      });
    }

    // Official canonical Uzum product URL
    const productUrl = `https://uzum.uz/uz/product/${product.productId}`;

    const media = safeImage ? [{ url: safeImage, order: 0 }] : [];

    const attributes: Record<string, any> = {
      rating: product.rating || null,
      quantityActive: product.quantityActive || 0,
      quantityFbs: product.quantityFbs || 0,
      source: 'uzum',
      sourceStatus,
      ...(testCatalog ? { testCatalog: true, testNotice: 'Test katalogi: bloklangan yoki faol bo‘lmagan mahsulotlar ham kiritilgan. Xarid uchun mavjudlik kafolatlanmaydi.' } : {})
    };

    if (categoryTitle) {
      attributes['Kategoriya'] = categoryTitle;
    }
    if (brand) {
      attributes['Brend'] = brand;
    }
    if (Array.isArray(product.characteristics)) {
      for (const char of product.characteristics) {
        if (char && char.title && char.value !== undefined) {
          attributes[char.title] = String(char.value);
        }
      }
    }

    const isAvailable = isStatusActive && (variants.length > 0 ? variants.some(v => v.isAvailable) : (product.quantityActive || 0) > 0);

    return {
      externalShopId: String(shopId),
      externalProductId: productIdStr,
      title: product.title || `Uzum Mahsulot #${productIdStr}`,
      description: null, // Uzum table view does not return long descriptions
      brand,
      categorySlug,
      categoryTitle,
      imageUrl: safeImage,
      media,
      basePrice: minPrice,
      currency: 'UZS',
      productUrl,
      variants,
      attributes,
      sourceStatus,
      isAvailable
    };
  }
}
