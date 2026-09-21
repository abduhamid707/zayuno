export interface ConnectorAuthResult {
  success: boolean;
  message?: string;
  shops?: Array<{ id: string; name: string; legalName?: string; status?: string }>;
  rawError?: any;
}

export interface ConnectorSyncItem {
  externalShopId: string;
  externalProductId: string;
  title: string;
  description?: string | null;
  brand?: string | null;
  categorySlug?: string | null;
  categoryTitle?: string | null;
  imageUrl?: string | null;
  media?: Array<{ url: string; order: number; altText?: string | null }>;
  basePrice: number;
  currency: string;
  productUrl: string;
  variants?: Array<{
    id: string;
    name: string;
    sku?: string | null;
    basePrice: number;
    isAvailable: boolean;
    metadata?: Record<string, any>;
  }>;
  attributes?: Record<string, any>;
  sourceStatus: string;
  isAvailable: boolean;
}

export interface ConnectorSyncOutput {
  success: boolean;
  items: ConnectorSyncItem[];
  totalFetched: number;
  errorMessage?: string;
}

export interface ManagedConnector {
  readonly definitionId: string;
  readonly name: string;
  authenticate(credentials: { apiKey: string; [key: string]: any }): Promise<ConnectorAuthResult>;
  getShops(credentials: { apiKey: string; [key: string]: any }): Promise<Array<{ id: string; name: string; legalName?: string; status?: string }>>;
  fetchCatalog(context: {
    credentials: { apiKey: string; [key: string]: any };
    shopId: string;
    onProgress?: (fetched: number, total: number) => void;
  }): Promise<ConnectorSyncOutput>;
}
