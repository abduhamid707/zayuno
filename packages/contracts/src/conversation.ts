import type { Offering, SelectedOption } from './catalog';
import type { ProviderManifest } from './provider-manifest';
import type { NormalizedQuote } from './quote';

export type SemanticIntent = 'ACCEPT' | 'REJECT' | 'MODIFY' | 'SELECT' | 'PROVIDE_FIELD' | 'CANCEL' | 'CONTINUE' | 'SEARCH' | 'STATUS';
export interface ConversationField {
  path: string;
  title: string;
  type: string;
  format?: string;
  enum?: unknown[];
  schema?: Record<string, any>;
}
export interface ConversationState {
  version: 1;
  revision: number;
  intent: SemanticIntent;
  environment: 'LIVE' | 'SANDBOX' | 'STAGING';
  providerSlug?: string;
  capability?: string;
  manifest?: ProviderManifest;
  selectedOffering?: Offering;
  selectedVariant?: string;
  selectedOptions: SelectedOption[];
  quantity: number;
  parameters: Record<string, unknown>;
  customer: { name?: string; phone?: string; email?: string };
  locations: Array<{ role: string; address?: { raw: string; coordinates?: { latitude: number; longitude: number } }; locationId?: string }>;
  locationId?: string;
  fulfillment?: string;
  paymentMethod?: string;
  parametersSchema?: any;
  quote?: NormalizedQuote;
  confirmation?: { quoteId: string; revision: number; accepted: boolean };
  action?: { idempotencyKey: string; quoteId: string; status: 'SUBMITTING' | 'CREATED'; actionId?: string };
  payment?: { url?: string; status?: string };
  missingFields: ConversationField[];
  offerings: Offering[];
  query?: string;
  updatedAt: string;
}

export function emptyConversationState(): ConversationState {
  return { version: 1, revision: 0, intent: 'CONTINUE', environment: 'LIVE', quantity: 1,
    selectedOptions: [], parameters: {}, customer: {}, locations: [], missingFields: [], offerings: [], updatedAt: new Date().toISOString() };
}
