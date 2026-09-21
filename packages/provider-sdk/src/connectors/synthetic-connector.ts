import { ManagedConnector, ConnectorAuthResult, ConnectorSyncItem, ConnectorSyncOutput } from '../managed-connector';

export class SyntheticRetailConnector implements ManagedConnector {
  readonly definitionId = 'synthetic-test';
  readonly name = 'Synthetic Retail Connector';

  async authenticate(credentials: { apiKey: string; [key: string]: any }): Promise<ConnectorAuthResult> {
    if (credentials.apiKey === 'invalid_key') {
      return {
        success: false,
        message: 'Noto‘g‘ri sintetik kalit'
      };
    }
    return {
      success: true,
      shops: [
        { id: 'synth_shop_1', name: 'Test Do‘kon Toshkent', status: 'ACTIVE' },
        { id: 'synth_shop_2', name: 'Test Do‘kon Samarqand', status: 'ACTIVE' }
      ]
    };
  }

  async getShops(credentials: { apiKey: string; [key: string]: any }): Promise<Array<{ id: string; name: string; legalName?: string; status?: string }>> {
    const auth = await this.authenticate(credentials);
    return auth.shops || [];
  }

  async fetchCatalog(context: {
    credentials: { apiKey: string; [key: string]: any };
    shopId: string;
    onProgress?: (fetched: number, total: number) => void;
  }): Promise<ConnectorSyncOutput> {
    const items: ConnectorSyncItem[] = [
      {
        externalShopId: context.shopId,
        externalProductId: 'syn_item_101',
        title: 'Smartfon Z-100 Pro Max',
        description: 'Yuqori quvvatli zamonaviy smartfon, 128GB xotira, qora rang',
        brand: 'TechBrand',
        categorySlug: 'smartfonlar',
        categoryTitle: 'Smartfonlar',
        imageUrl: 'https://images.example.com/phone101.jpg',
        media: [{ url: 'https://images.example.com/phone101.jpg', order: 0 }],
        basePrice: 2500000,
        currency: 'UZS',
        productUrl: 'https://synthetic.retail.example.com/p/syn_item_101',
        variants: [
          { id: 'v101_black', name: 'Qora / 128GB', sku: 'SKU-101-BLK', basePrice: 2500000, isAvailable: true },
          { id: 'v101_white', name: 'Oq / 256GB', sku: 'SKU-101-WHT', basePrice: 2900000, isAvailable: true }
        ],
        attributes: { warrantyMonths: 12, screenInches: 6.7 },
        sourceStatus: 'ACTIVE',
        isAvailable: true
      },
      {
        externalShopId: context.shopId,
        externalProductId: 'syn_item_102',
        title: 'Simsiz Quloqchin AirBeat Plus',
        description: 'Shovqinni bostiruvchi faol tizim (ANC), 30 soat batareya muddati',
        brand: 'AudioSound',
        categorySlug: 'elektronika',
        categoryTitle: 'Elektronika',
        imageUrl: 'https://images.example.com/earphones.jpg',
        media: [{ url: 'https://images.example.com/earphones.jpg', order: 0 }],
        basePrice: 450000,
        currency: 'UZS',
        productUrl: 'https://synthetic.retail.example.com/p/syn_item_102',
        variants: [
          { id: 'v102_white', name: 'Oq rang', sku: 'SKU-102-WHT', basePrice: 450000, isAvailable: true }
        ],
        attributes: { anc: true, batteryHours: 30 },
        sourceStatus: 'ACTIVE',
        isAvailable: true
      }
    ];

    if (context.onProgress) {
      context.onProgress(items.length, items.length);
    }

    return {
      success: true,
      items,
      totalFetched: items.length
    };
  }
}
