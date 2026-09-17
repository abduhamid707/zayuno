import { z, ZodTypeAny } from 'zod';
import { randomUUID } from 'crypto';
import { ZayunoApiClient } from './client.js';
import {
  formatCustomerQuote,
  formatCustomerActionConfirmation,
  formatCustomerActionStatus,
  formatCustomerActionCancellation,
  formatCustomerAvailability,
  formatCustomerProviders,
  formatCustomerProvider,
  formatCustomerCapabilities,
  formatCustomerLocations,
  formatCustomerOfferings,
  formatUzbekCurrency,
  formatCustomerOffering,
  formatCustomerPaymentOptions,
  buildAgentErrorEnvelope,
  getWelcomeMessage,
  getDynamicServiceMessage,
  stripSensitiveSecrets,
  toPublicAction,
  toPublicPaymentOptions
} from '@zayuno/shared';

// Discovery should return enough to select a provider, never its embedded catalog/config.
function providerSummary(provider: any) {
  const keys = ['slug', 'name', 'description', 'logoUrl', 'status', 'type', 'environment', 'category', 'subcategory', 'geography', 'capabilities', 'fulfillmentMode', 'supportContact'];
  return Object.fromEntries(keys.filter(key => provider[key] !== undefined).map(key => [key, provider[key]]));
}

function catalogOffering(offering: any) {
  return { ...offering, name: offering.name ?? offering.title, price: offering.price ?? offering.basePrice };
}

function formatNativeCatalog(offerings: any[], providerName?: string): string {
  if (!Array.isArray(offerings) || offerings.length === 0) return 'Kechirasiz, hech qanday mahsulot topilmadi.';
  const items = offerings.slice(0, 8).map((offering, index) => {
    const title = offering.title || offering.name || 'Mahsulot';
    const price = offering.basePrice ?? offering.price;
    const priceText = typeof price === 'number' && Number.isFinite(price)
      ? formatUzbekCurrency(price, offering.currency || 'UZS') : 'Narxi aniqlashtiriladi';
    return `${index + 1}. **${title}** — ${priceText}${offering.isAvailable === false ? ' (hozir mavjud emas)' : ''}`;
  });
  const more = offerings.length > 8 ? ` Yana ${offerings.length - 8} ta mahsulot bor.` : '';
  return `**${providerName || 'Katalog'}**\n\n${items.join('\n')}\n\nQaysi birini tanlaysiz?${more}`;
}

const catalogMediaItemOutputProperties = {
  url: { type: 'string' },
  altText: { type: ['string', 'null'] },
  order: { type: 'number' },
  thumbnailUrl: { type: ['string', 'null'] },
  aspectRatio: { type: ['string', 'null'] }
};

// Preserve catalog data for agents even though customer replies are text-only.
const catalogOfferingOutputProperties = {
  id: { type: 'string' },
  providerId: { type: 'string' },
  offeringCode: { type: 'string' },
  title: { type: 'string' },
  name: { type: 'string' },
  description: { type: ['string', 'null'] },
  categorySlug: { type: ['string', 'null'] },
  categoryTitle: { type: ['string', 'null'] },
  imageUrl: { type: ['string', 'null'] },
  media: { type: ['array', 'null'], items: { type: 'object', properties: catalogMediaItemOutputProperties } },
  basePrice: { type: 'number' },
  price: { type: 'number' },
  currency: { type: 'string' },
  isAvailable: { type: 'boolean' },
  variants: { type: 'array', items: { type: 'object' } },
  optionGroups: { type: 'array', items: { type: 'object' } },
  tags: { type: 'array', items: { type: 'string' } },
  parametersSchema: { type: ['object', 'null'] },
  metadata: { type: 'object' }
};

const catalogOfferingOutputSchema = {
  type: 'object',
  properties: catalogOfferingOutputProperties,
  required: ['id', 'name', 'price']
};

export interface McpToolDefinition {
  name: string;
  description: string;
  annotations?: {
    readOnlyHint?: boolean;
    openWorldHint?: boolean;
    destructiveHint?: boolean;
  };
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  outputSchema?: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  handler: (args: any, client: ZayunoApiClient) => Promise<any>;
}

const quoteIdToIdempotencyKey = new Map<string, string>();
function getOrCreateActionIdempotencyKey(quoteId?: string): string {
  if (!quoteId) return randomUUID();
  if (!quoteIdToIdempotencyKey.has(quoteId)) {
    quoteIdToIdempotencyKey.set(quoteId, randomUUID());
  }
  return quoteIdToIdempotencyKey.get(quoteId)!;
}

export const ZAYUNO_MCP_TOOLS: McpToolDefinition[] = [
  // 0. get_welcome_message
  {
    name: 'get_welcome_message',
    description: 'Get the natural conversational welcome greeting (customerMessage) and dynamic capability metrics for customers. The AI assistant must use customerMessage directly when starting a conversation.',
    annotations: {
      readOnlyHint: true,
      openWorldHint: false,
      destructiveHint: false
    },
    inputSchema: {
      type: 'object',
      properties: {}
    },
    outputSchema: {
      type: 'object',
      properties: {
        customerMessage: { type: 'string', description: 'Pre-formatted customer greeting in natural Uzbek' },
        welcomeMessage: { type: 'string', description: 'Canonical welcome greeting' },
        availableServiceCount: { type: ['number', 'null'], description: 'Total verified service count' },
        dynamicServiceMessage: { type: 'string', description: 'Dynamic service capability summary' }
      },
      required: ['customerMessage']
    },
    handler: async (_args, client) => {
      try {
        const welcomeInfo = await client.getWelcome();
        const message = welcomeInfo.customerMessage || welcomeInfo.welcomeMessage || getWelcomeMessage(welcomeInfo.availableServiceCount);
        return {
          customerMessage: message,
          welcomeMessage: message,
          availableServiceCount: welcomeInfo.availableServiceCount,
          dynamicServiceMessage: welcomeInfo.dynamicServiceMessage
        };
      } catch {
        const fallback = getWelcomeMessage(null);
        return {
          customerMessage: fallback,
          welcomeMessage: fallback,
          availableServiceCount: null,
          dynamicServiceMessage: getDynamicServiceMessage(null)
        };
      }
    }
  },

  // 1. find_providers (Multi-criteria discovery)
  {
    name: 'find_providers',
    description: 'Discover live capability providers by canonical category (e.g. FOOD_AND_DRINK, LOGISTICS, TICKETING), required capability, geographic coverage, or keyword. Legacy category aliases such as food_delivery are accepted. Pass environment explicitly to discover SANDBOX or STAGING providers.',
    annotations: {
      readOnlyHint: true,
      openWorldHint: false,
      destructiveHint: false
    },
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Canonical provider category such as FOOD_AND_DRINK, LOGISTICS, or TICKETING. Legacy aliases such as food_delivery are normalized by the API.'
        },
        environment: {
          type: 'string',
          enum: ['LIVE', 'SANDBOX', 'STAGING'],
          description: 'Deployment environment. Defaults to LIVE; request SANDBOX or STAGING explicitly.'
        },
        capability: {
          type: 'string',
          description: 'Filter by supported capability (e.g. "ACTION_CREATE", "QUOTE", "LOCATIONS", "CATALOG").'
        },
        geography: {
          type: 'string',
          description: 'Filter by country or region coverage (e.g. "UZ", "Tashkent", "Samarkand").'
        },
        query: {
          type: 'string',
          description: 'Search keyword matching provider name or description.'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of providers to return (default: 20).'
        }
      }
    },
    outputSchema: {
      type: 'object',
      properties: {
        customerMessage: { type: 'string', description: 'Pre-formatted discovery summary for customer' },
        providers: {
          type: 'array',
          description: 'List of matching active and certified capability providers',
          items: {
            type: 'object',
            properties: {
              slug: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
              status: { type: 'string' },
              type: { type: 'string' },
              environment: { type: 'string' },
              category: { type: 'string' },
              subcategory: { type: ['string', 'null'] },
              capabilities: { type: 'array', items: { type: 'string' } }
            },
            required: ['slug', 'name', 'status']
          }
        },
        total: { type: 'number' }
      },
      required: ['customerMessage', 'providers']
    },
    handler: async (args, client) => {
      const result = await client.findProviders(args);
      const list = Array.isArray(result) ? result : result?.providers || [];
      const customerMessage = formatCustomerProviders(list);
      return {
        customerMessage,
        providers: list.map(providerSummary), total: result?.total ?? list.length
      };
    }
  },

  // 2. list_providers (Backward compatibility)
  {
    name: 'list_providers',
    description: 'List active capability providers in the LIVE environment by default. Request SANDBOX or STAGING explicitly when test integrations are needed.',
    annotations: {
      readOnlyHint: true,
      openWorldHint: false,
      destructiveHint: false
    },
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['ACTIVE', 'SANDBOX'],
          description: 'Optional operational status filter. Environment is selected separately.'
        },
        environment: {
          type: 'string',
          enum: ['LIVE', 'SANDBOX', 'STAGING'],
          description: 'Deployment environment. Defaults to LIVE.'
        }
      }
    },
    outputSchema: {
      type: 'object',
      properties: {
        customerMessage: { type: 'string', description: 'Pre-formatted provider list for customer' },
        providers: {
          type: 'array',
          description: 'List of active capability providers',
          items: {
            type: 'object',
            properties: {
              slug: { type: 'string' },
              name: { type: 'string' },
              status: { type: 'string' },
              type: { type: 'string' },
              environment: { type: 'string' },
              category: { type: 'string' }
            },
            required: ['slug', 'name', 'status']
          }
        },
        total: { type: 'number' }
      },
      required: ['customerMessage', 'providers']
    },
    handler: async (args, client) => {
      const result = await client.listProviders(args.status, args.environment);
      const list = Array.isArray(result) ? result : result?.providers || [];
      const customerMessage = formatCustomerProviders(list);
      return {
        customerMessage,
        providers: list.map(providerSummary), total: result?.total ?? list.length
      };
    }
  },

  // 3. get_provider
  {
    name: 'get_provider',
    description: 'Get public provider details, capabilities, operational status, and deployment environment by slug. LIVE is the default environment; request SANDBOX or STAGING explicitly.',
    annotations: {
      readOnlyHint: true,
      openWorldHint: false,
      destructiveHint: false
    },
    inputSchema: {
      type: 'object',
      properties: {
        providerSlug: {
          type: 'string',
          description: 'Unique slug of the target capability provider (e.g. "sandbox-provider").'
        },
        environment: {
          type: 'string',
          enum: ['LIVE', 'SANDBOX', 'STAGING'],
          description: 'Deployment environment. Defaults to LIVE.'
        }
      },
      required: ['providerSlug']
    },
    outputSchema: {
      type: 'object',
      properties: {
        customerMessage: { type: 'string', description: 'Pre-formatted provider profile for customer' },
        slug: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        logoUrl: { type: 'string' },
        status: { type: 'string' },
        type: { type: 'string' },
        environment: { type: 'string' },
        category: { type: 'string' },
        subcategory: { type: ['string', 'null'] },
        geography: { type: 'array', items: { type: 'string' } },
        fulfillmentMode: { type: 'string' },
        capabilities: { type: 'array', items: { type: 'string' } },
        supportContact: { type: ['object', 'string', 'null'] }
      },
      required: ['customerMessage', 'slug', 'name']
    },
    handler: async (args, client) => {
      const provider = await client.getProvider(args.providerSlug, args.environment);
      const customerMessage = formatCustomerProvider(provider);
      return {
        customerMessage,
        ...providerSummary(provider)
      };
    }
  },

  // 4. get_provider_capabilities
  {
    name: 'get_provider_capabilities',
    description: 'Retrieve the explicit capability matrix for a provider (e.g. CATALOG, QUOTE, ACTION_CREATE, LOCATIONS, PAYMENT_OPTIONS). LIVE is the default environment; request SANDBOX or STAGING explicitly. Use this to determine which tools can be invoked against the provider.',
    annotations: {
      readOnlyHint: true,
      openWorldHint: false,
      destructiveHint: false
    },
    inputSchema: {
      type: 'object',
      properties: {
        providerSlug: {
          type: 'string',
          description: 'Unique slug of the capability provider.'
        },
        environment: {
          type: 'string',
          enum: ['LIVE', 'SANDBOX', 'STAGING'],
          description: 'Deployment environment. Defaults to LIVE.'
        }
      },
      required: ['providerSlug']
    },
    outputSchema: {
      type: 'object',
      properties: {
        customerMessage: { type: 'string', description: 'Pre-formatted capability summary for customer' },
        providerSlug: { type: 'string' },
        capabilities: { type: 'array', items: { type: 'string' } }
      },
      required: ['customerMessage', 'capabilities']
    },
    handler: async (args, client) => {
      const result = await client.getProviderCapabilities(args.providerSlug, args.environment);
      const caps = Array.isArray(result) ? result : result?.capabilities || [];
      const customerMessage = formatCustomerCapabilities(caps, args.providerSlug);
      return {
        customerMessage,
        ...(Array.isArray(result) ? { capabilities: result, providerSlug: args.providerSlug } : result)
      };
    }
  },

  // 5. get_locations
  {
    name: 'get_locations',
    description: 'Retrieve physical operational locations, fulfillment centers, or branches for a specific provider, including addresses, operating hours, and service radii. LIVE is the default environment; request SANDBOX or STAGING explicitly.',
    annotations: {
      readOnlyHint: true,
      openWorldHint: false,
      destructiveHint: false
    },
    inputSchema: {
      type: 'object',
      properties: {
        providerSlug: {
          type: 'string',
          description: 'Unique slug of the target capability provider.'
        },
        activeOnly: {
          type: 'boolean',
          description: 'Filter only currently active locations (default: true).'
        },
        environment: {
          type: 'string',
          enum: ['LIVE', 'SANDBOX', 'STAGING'],
          description: 'Deployment environment. Defaults to LIVE.'
        }
      },
      required: ['providerSlug']
    },
    outputSchema: {
      type: 'object',
      properties: {
        customerMessage: { type: 'string', description: 'Pre-formatted locations summary for customer' },
        locations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              address: { type: 'string' },
              isActive: { type: 'boolean' }
            },
            required: ['id', 'name']
          }
        }
      },
      required: ['customerMessage', 'locations']
    },
    handler: async (args, client) => {
      const locations = await client.getLocations(args.providerSlug, args.activeOnly, args.environment);
      const list = Array.isArray(locations) ? locations : locations?.locations || [];
      const customerMessage = formatCustomerLocations(list);
      return {
        customerMessage,
        ...(Array.isArray(locations) ? { locations } : locations)
      };
    }
  },

  // 6. get_catalog
  {
    name: 'get_catalog',
    description: 'Use this when the user wants to see a provider menu or choose products. Call with a verified providerSlug; discovery does not return the menu. Returns products and a concise numbered customerMessage with names and prices for ordinary chat. Can be filtered by category or location. Show text only, not buttons or embedded UI. Selecting a product does not confirm an order.',
    annotations: {
      readOnlyHint: true,
      openWorldHint: false,
      destructiveHint: false
    },
    inputSchema: {
      type: 'object',
      properties: {
        providerSlug: {
          type: 'string',
          description: 'Unique slug of the target capability provider (e.g. "sandbox-provider").'
        },
        locationId: {
          type: 'string',
          description: 'Optional location or fulfillment center ID.'
        },
        category: {
          type: 'string',
          description: 'Optional category slug filter.'
        },
        parameters: {
          type: 'object',
          description: 'Optional dynamic catalog context such as date, route, party size, or inventory preferences. Dynamic responses are not cached by Zayuno.'
        }
      },
      required: ['providerSlug']
    },
    outputSchema: {
      type: 'object',
      properties: {
        customerMessage: { type: 'string', description: 'Pre-formatted catalog offerings for customer' },
        offerings: {
          type: 'array',
          items: catalogOfferingOutputSchema
        },
        categories: { type: 'array', items: { type: 'object' } }
      },
      required: ['customerMessage', 'offerings']
    },
    handler: async (args, client) => {
      const catalog = await client.getCatalog(args.providerSlug, args.locationId, args.category, args.parameters);
      const offerings = catalog?.offerings || (Array.isArray(catalog) ? catalog : []);
      const customerMessage = formatNativeCatalog(offerings, args.providerSlug);
      return {
        ...(Array.isArray(catalog) ? {} : catalog), providerSlug: args.providerSlug, locationId: catalog?.locationId ?? args.locationId,
        customerMessage,
        offerings: offerings.map(catalogOffering)
      };
    }
  },

  // 7. search_catalog
  {
    name: 'search_catalog',
    description: 'Search static or real-time provider offerings. If a provider declares CATALOG but not SEARCH, Zayuno automatically filters its catalog locally. For dynamic domains such as tickets, appointments, hotels, and transport, pass structured parameters (dates, origin/destination, passengers, capacity, or preferences).',
    annotations: {
      readOnlyHint: true,
      openWorldHint: false,
      destructiveHint: false
    },
    inputSchema: {
      type: 'object',
      properties: {
        providerSlug: {
          type: 'string',
          description: 'Target provider slug to search within (e.g. "sandbox-provider").'
        },
        query: {
          type: 'string',
          description: 'Search keyword or query string.'
        },
        category: {
          type: 'string',
          description: 'Optional category slug filter.'
        },
        locationId: {
          type: 'string',
          description: 'Optional location ID filter.'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of items to return (default: 20).'
        },
        parameters: {
          type: 'object',
          description: 'Structured provider-specific search context, e.g. { origin, destination, departureDate, adults, children, preferences }. Never include card details or identity-document numbers in search parameters.'
        }
      },
      required: ['providerSlug']
    },
    outputSchema: {
      type: 'object',
      properties: {
        customerMessage: { type: 'string', description: 'Pre-formatted search results for customer' },
        offerings: {
          type: 'array',
          items: catalogOfferingOutputSchema
        },
        total: { type: 'number' }
      },
      required: ['customerMessage', 'offerings']
    },
    handler: async (args, client) => {
      const result = await client.searchCatalog(args.providerSlug, args.query || '', args.category, args.locationId, args.limit, args.parameters);
      const offerings = Array.isArray(result) ? result : result?.offerings || [];
      const customerMessage = formatCustomerOfferings(offerings, args.providerSlug);
      return {
        customerMessage,
        ...(Array.isArray(result) ? { total: result.length } : result), providerSlug: args.providerSlug,
        offerings: offerings.map(catalogOffering)
      };
    }
  },

  // 8. get_offering
  {
    name: 'get_offering',
    description: 'Get deep item details for an offering including variants, modifiers, option groups, required selections, and availability.',
    annotations: {
      readOnlyHint: true,
      openWorldHint: false,
      destructiveHint: false
    },
    inputSchema: {
      type: 'object',
      properties: {
        providerSlug: {
          type: 'string',
          description: 'Unique slug of the capability provider.'
        },
        offeringId: {
          type: 'string',
          description: 'ID or code of the offering.'
        },
        locationId: {
          type: 'string',
          description: 'Optional location ID.'
        },
        parameters: {
          type: 'object',
          description: 'Optional dynamic detail context such as travel date or facility selection.'
        }
      },
      required: ['providerSlug', 'offeringId']
    },
    outputSchema: {
      type: 'object',
      properties: {
        customerMessage: { type: 'string', description: 'Pre-formatted offering details for customer' },
        ...catalogOfferingOutputProperties,
        providerSlug: { type: 'string' }
      },
      required: ['customerMessage', 'id', 'name', 'price']
    },
    handler: async (args, client) => {
      const offering = await client.getOffering(args.providerSlug, args.offeringId, args.locationId, args.parameters);
      const customerMessage = formatCustomerOffering(offering);
      return {
        customerMessage,
        ...catalogOffering(offering), providerSlug: args.providerSlug
      };
    }
  },

  // 9. check_availability
  {
    name: 'check_availability',
    description: 'Read-only real-time inventory check before requesting a quote. Use for seats, appointment slots, rooms, tickets, limited stock, or any capacity that can change. A NOT_SUPPORTED or UNKNOWN result does not confirm inventory; request a quote for final verification. This does not reserve or hold inventory.',
    annotations: {
      readOnlyHint: true,
      openWorldHint: false,
      destructiveHint: false
    },
    inputSchema: {
      type: 'object',
      properties: {
        providerSlug: { type: 'string', description: 'Unique slug of the capability provider.' },
        locationId: { type: 'string', description: 'Optional provider location or station ID.' },
        items: {
          type: 'array',
          description: 'Offerings and quantities whose live availability should be checked.',
          items: {
            type: 'object',
            properties: {
              offeringId: { type: 'string' },
              variantId: { type: 'string' },
              quantity: { type: 'number', description: 'Required capacity, minimum 1.' },
              selectedOptions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    groupId: { type: 'string' },
                    optionId: { type: 'string' },
                    quantity: { type: 'number' }
                  },
                  required: ['groupId', 'optionId']
                }
              }
            },
            required: ['offeringId', 'quantity']
          }
        },
        parameters: {
          type: 'object',
          description: 'Dynamic inventory context such as date, route, passengers, selected car, or seat preferences. This call never creates a hold.'
        }
      },
      required: ['providerSlug', 'items']
    },
    outputSchema: {
      type: 'object',
      properties: {
        customerMessage: { type: 'string', description: 'Pre-formatted availability status for customer' },
        availabilityStatus: { type: 'string', enum: ['AVAILABLE', 'UNAVAILABLE', 'UNKNOWN', 'NOT_SUPPORTED', 'STALE', 'ERROR'] },
        available: { type: ['boolean', 'null'] },
        isAvailable: { type: ['boolean', 'null'] },
        reason: { type: 'string' },
        items: { type: 'array', items: { type: 'object' } }
      },
      required: ['customerMessage', 'availabilityStatus', 'available']
    },
    handler: async (args, client) => {
      const result = await client.checkAvailability(args);
      const availabilityStatus = result?.availabilityStatus || (
        result?.isAvailable === true ? 'AVAILABLE' : result?.isAvailable === false ? 'UNAVAILABLE' : 'UNKNOWN'
      );
      const isAvailable = availabilityStatus === 'AVAILABLE'
        ? true
        : availabilityStatus === 'UNAVAILABLE'
          ? false
          : null;
      const customerMessage = formatCustomerAvailability({ ...result, availabilityStatus, isAvailable });
      return {
        ...result,
        customerMessage,
        availabilityStatus,
        isAvailable,
        available: isAvailable
      };
    }
  },

  // 10. request_quote
  {
    name: 'request_quote',
    description: 'Mandatory pre-requisite before creating an action. Calculates verified real-time pricing and returns pre-formatted customerMessage. The AI assistant must present customerMessage directly to the customer without exposing internal quote IDs.',
    annotations: {
      readOnlyHint: false,
      openWorldHint: false,
      destructiveHint: false
    },
    inputSchema: {
      type: 'object',
      properties: {
        providerSlug: {
          type: 'string',
          description: 'Unique slug of the capability provider.'
        },
        locationId: {
          type: 'string',
          description: 'Optional location or fulfillment center ID.'
        },
        items: {
          type: 'array',
          description: 'Array of items or services requested.',
          items: {
            type: 'object',
            properties: {
              offeringId: { type: 'string', description: 'Offering ID' },
              variantId: { type: 'string', description: 'Optional variant ID' },
              quantity: { type: 'number', description: 'Quantity (minimum: 1)' },
              selectedOptions: {
                type: 'array',
                description: 'Selected option modifiers',
                items: {
                  type: 'object',
                  properties: {
                    groupId: { type: 'string' },
                    optionId: { type: 'string' },
                    quantity: { type: 'number' }
                  },
                  required: ['groupId', 'optionId']
                }
              }
            },
            required: ['offeringId', 'quantity']
          }
        },
        fulfillmentType: {
          type: 'string',
          description: 'Fulfillment method (e.g. STANDARD, EXPRESS, PICKUP, DIGITAL).'
        },
        promoCode: {
          type: 'string',
          description: 'Optional provider-issued promotion code. The provider validates the code and returns any discount in the quote.'
        },
        destination: {
          type: 'object',
          description: 'Destination or fulfillment address.',
          properties: {
            raw: { type: 'string', description: 'Full address string or notes' }
          },
          required: ['raw']
        },
        parameters: {
          type: 'object',
          description: 'Optional custom parameters passed to the provider adapter.'
        }
      },
      required: ['providerSlug', 'items']
    },
    outputSchema: {
      type: 'object',
      properties: {
        customerMessage: { type: 'string', description: 'Pre-formatted quote summary for customer' },
        id: { type: 'string', description: 'Unique verified quote ID required for action creation' },
        quoteId: { type: 'string', description: 'Quote ID alias' },
        providerSlug: { type: 'string' },
        lines: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              offeringId: { type: 'string' },
              offeringTitle: { type: 'string' },
              quantity: { type: 'number' },
              unitPrice: { type: 'number' },
              lineTotal: { type: 'number' }
            },
            required: ['offeringId', 'quantity', 'lineTotal']
          }
        },
        subtotal: { type: 'number' },
        fees: { type: 'array', items: { type: 'object' } },
        totalFees: { type: 'number' },
        discounts: { type: 'array', items: { type: 'object' } },
        totalDiscount: { type: 'number' },
        total: { type: 'number', description: 'Final verified payable amount' },
        currency: { type: 'string' },
        expiresAt: { type: 'string' },
        estimatedDurationMinutes: { type: 'number' }
      },
      required: ['customerMessage', 'id', 'total', 'currency', 'expiresAt']
    },
    handler: async (args, client) => {
      let destination = args.destination;
      if (typeof destination === 'string') {
        destination = { raw: destination };
      }
      const quote = await client.requestQuote({
        ...args,
        ...(destination ? { destination } : {})
      });
      const customerMessage = formatCustomerQuote(quote);
      return {
        customerMessage,
        ...quote
      };
    }
  },

  // 11. create_action
  {
    name: 'create_action',
    description: 'Execute an action with the external provider. MUST only be called after request_quote and AFTER the user has explicitly reviewed and confirmed the quote. Include customer contact or destination only when the quote or provider contract requires it. Returns a pre-formatted customerMessage with secure checkout link. The AI assistant must present customerMessage directly to the customer and keep actionId/tokens internal.',
    annotations: {
      readOnlyHint: false,
      openWorldHint: true,
      destructiveHint: false
    },
    inputSchema: {
      type: 'object',
      properties: {
        idempotencyKey: {
          type: 'string',
          description: 'Optional client-generated key (e.g. UUID) preventing duplicate action submission. If not supplied, server generates and reuses a secure key automatically.'
        },
        providerSlug: {
          type: 'string',
          description: 'Unique slug of the capability provider.'
        },
        quoteId: {
          type: 'string',
          description: 'Verified quote ID obtained from request_quote.'
        },
        locationId: {
          type: 'string',
          description: 'Optional location ID.'
        },
        items: {
          type: 'array',
          description: 'Items or services requested in action.',
          items: {
            type: 'object',
            properties: {
              offeringId: { type: 'string' },
              variantId: { type: 'string' },
              quantity: { type: 'number' },
              selectedOptions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    groupId: { type: 'string' },
                    optionId: { type: 'string' },
                    quantity: { type: 'number' }
                  },
                  required: ['groupId', 'optionId']
                }
              }
            },
            required: ['offeringId', 'quantity']
          }
        },
        customer: {
          type: 'object',
          description: 'Customer contact information only when the provider declares it is required for this action.',
          properties: {
            name: { type: 'string', description: 'Customer full name (optional, defaults to "Mijoz")' },
            phone: { type: 'string', description: 'Customer phone number when the provider requires it, e.g. +998901234567' },
            email: { type: 'string', description: 'Optional customer email' }
          }
        },
        destination: {
          type: 'object',
          description: 'Optional destination address or fulfillment location.',
          properties: {
            raw: { type: 'string', description: 'Full address or delivery instructions' }
          },
          required: ['raw']
        },
        fulfillmentType: {
          type: 'string',
          description: 'e.g. STANDARD, EXPRESS, PICKUP, DIGITAL'
        },
        paymentMethod: {
          type: 'string',
          description: 'e.g. "payme", "card", "cash", "invoice"'
        },
        parameters: {
          type: 'object',
          description: 'Optional custom parameters passed to the provider adapter.'
        },
        userConfirmed: {
          type: 'boolean',
          description: 'Explicit confirmation flag acknowledging pricing review by user (must be true).'
        }
      },
      required: ['providerSlug', 'quoteId', 'items', 'userConfirmed']
    },
    outputSchema: {
      type: 'object',
      properties: {
        customerMessage: { type: 'string', description: 'Pre-formatted confirmation and payment link for customer' },
        actionId: { type: 'string', description: 'Stable Zayuno action reference' },
        providerSlug: { type: 'string' },
        providerName: { type: ['string', 'null'] },
        status: { type: 'string' },
        paymentStatus: { type: 'string' },
        total: { type: 'number' },
        currency: { type: 'string' },
        fulfillmentType: { type: 'string' },
        checkoutUrl: { type: 'string', description: 'Secure external payment URL' },
        nextAction: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            url: { type: 'string' },
            description: { type: 'string' }
          }
        },
        supportContact: { type: ['object', 'null'] },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' }
      },
      required: ['customerMessage', 'actionId', 'providerSlug', 'status', 'paymentStatus', 'total', 'currency', 'fulfillmentType', 'createdAt', 'updatedAt']
    },
    handler: async (args, client) => {
      const idempotencyKey = args.idempotencyKey || getOrCreateActionIdempotencyKey(args.quoteId);
      const rawPhone = String(args.customer?.phone || '').trim();
      let phone = rawPhone;
      if (/^\d{9}$/.test(phone)) {
        phone = `+998${phone}`;
      } else if (/^998\d{9}$/.test(phone)) {
        phone = `+${phone}`;
      }
      const customer = phone
        ? {
            name: args.customer?.name?.trim() || 'Mijoz',
            phone,
            ...(args.customer?.email ? { email: args.customer.email } : {}),
          }
        : undefined;
      let destination = args.destination;
      if (typeof destination === 'string') {
        destination = { raw: destination };
      }
      const action = await client.createAction({
        ...args,
        customer,
        ...(destination ? { destination } : {}),
        idempotencyKey
      });
      // Keep create_action a single API dispatch. The action payload already
      // carries providerSlug, payment URL and sandbox metadata needed by the
      // shared presenter, so a second provider lookup only adds latency and
      // breaks MCP's one-tool/one-request contract.
      const customerMessage = formatCustomerActionConfirmation(action);
      return {
        customerMessage,
        ...toPublicAction(action)
      };
    }
  },

  // 12. get_action
  {
    name: 'get_action',
    description: 'Retrieve live status for an active or completed action. Returns pre-formatted customerMessage in natural Uzbek. The AI assistant must present customerMessage directly to the customer and never expose raw status enums or action IDs.',
    annotations: {
      readOnlyHint: true,
      openWorldHint: false,
      destructiveHint: false
    },
    inputSchema: {
      type: 'object',
      properties: {
        actionId: {
          type: 'string',
          description: 'Public reference ID (e.g. "ZY-SANDBOX-12345") or UUID of the action.'
        }
      },
      required: ['actionId']
    },
    outputSchema: {
      type: 'object',
      properties: {
        customerMessage: { type: 'string', description: 'Pre-formatted action status in natural Uzbek' },
        actionId: { type: 'string', description: 'Stable Zayuno action reference' },
        providerSlug: { type: 'string' },
        providerName: { type: ['string', 'null'] },
        status: { type: 'string' },
        paymentStatus: { type: 'string' },
        total: { type: 'number' },
        currency: { type: 'string' },
        fulfillmentType: { type: 'string' },
        checkoutUrl: { type: 'string' },
        nextAction: { type: 'object' },
        supportContact: { type: ['object', 'null'] },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' }
      },
      required: ['customerMessage', 'actionId', 'providerSlug', 'status', 'paymentStatus', 'total', 'currency', 'fulfillmentType', 'createdAt', 'updatedAt']
    },
    handler: async (args, client) => {
      const action = await client.getAction(args.actionId);
      // The action response carries the public provider/action state needed by
      // the presenter. Avoid a second provider lookup so one MCP tool call
      // maps to one API dispatch and cannot accidentally broaden visibility.
      const customerMessage = formatCustomerActionStatus(action);
      return {
        customerMessage,
        ...toPublicAction(action)
      };
    }
  },

  // 13. cancel_action
  {
    name: 'cancel_action',
    description: 'Cancel an eligible active action before fulfillment lock or completion. Returns pre-formatted customerMessage. The AI assistant must use customerMessage directly.',
    annotations: {
      readOnlyHint: false,
      openWorldHint: true,
      destructiveHint: true
    },
    inputSchema: {
      type: 'object',
      properties: {
        actionId: {
          type: 'string',
          description: 'Public ID or UUID of the action to cancel.'
        },
        reason: {
          type: 'string',
          description: 'Reason for cancellation.'
        },
        reasonCode: {
          type: 'string',
          enum: ['CUSTOMER_CANCELLED', 'PROVIDER_REJECTED', 'ITEM_UNAVAILABLE', 'PAYMENT_TIMEOUT', 'PAYMENT_FAILED', 'DUPLICATE_ACTION', 'INVALID_CUSTOMER_INFORMATION', 'PROVIDER_TIMEOUT', 'SYSTEM_ERROR', 'OTHER'],
          description: 'Stable cancellation category. Defaults to CUSTOMER_CANCELLED.'
        }
      },
      required: ['actionId']
    },
    outputSchema: {
      type: 'object',
      properties: {
        customerMessage: { type: 'string', description: 'Pre-formatted cancellation result' },
        success: { type: 'boolean' },
        actionId: { type: 'string', description: 'Stable Zayuno action reference' },
        externalActionId: { type: ['string', 'null'], description: 'Optional provider reference' },
        previousStatus: { type: 'string' },
        newStatus: { type: 'string' },
        message: { type: 'string' },
        refundInitiated: { type: 'boolean' }
      },
      required: ['customerMessage', 'success', 'actionId', 'previousStatus', 'newStatus', 'message', 'refundInitiated']
    },
    handler: async (args, client) => {
      const result = await client.cancelAction(args.actionId, args.reason, args.reasonCode);
      const customerMessage = formatCustomerActionCancellation(result);
      return {
        customerMessage,
        success: Boolean(result.success),
        actionId: result.actionId || args.actionId,
        ...(result.externalActionId ? { externalActionId: result.externalActionId } : {}),
        previousStatus: result.previousStatus,
        newStatus: result.newStatus,
        message: result.message || 'Action cancelled.',
        refundInitiated: Boolean(result.refundInitiated)
      };
    }
  },

  // 14. get_payment_options
  {
    name: 'get_payment_options',
    description: 'Retrieve provider-supplied checkout URLs and available payment options for an action. Sensitive card data is never handled in chat; payment occurs via secure HTTPS redirection.',
    annotations: {
      readOnlyHint: true,
      openWorldHint: false,
      destructiveHint: false
    },
    inputSchema: {
      type: 'object',
      properties: {
        actionId: {
          type: 'string',
          description: 'Public action ID or UUID for which payment options are requested.'
        }
      },
      required: ['actionId']
    },
    outputSchema: {
      type: 'object',
      properties: {
        customerMessage: { type: 'string', description: 'Pre-formatted payment options for customer' },
        paymentOptions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              type: { type: 'string' },
              isOnline: { type: 'boolean' },
              checkoutUrl: { type: 'string' },
              qrCodeUrl: { type: 'string' },
              instructions: { type: 'string' },
              supportedCurrencies: { type: 'array', items: { type: 'string' } },
              isSandbox: { type: 'boolean' }
            },
            required: ['id', 'name', 'type', 'isOnline', 'isSandbox']
          }
        }
      },
      required: ['customerMessage', 'paymentOptions']
    },
    handler: async (args, client) => {
      const options = await client.getPaymentOptions(args.actionId);
      const rawPaymentOptions = Array.isArray(options)
        ? options
        : Array.isArray(options?.paymentOptions)
          ? options.paymentOptions
          : [];
      const paymentOptions = toPublicPaymentOptions(rawPaymentOptions);
      const customerMessage = formatCustomerPaymentOptions(paymentOptions);
      return {
        customerMessage,
        paymentOptions
      };
    }
  }
];

function jsonSchemaToZodShape(properties: Record<string, any> = {}, requiredList: string[] = []): Record<string, ZodTypeAny> {
  const shape: Record<string, ZodTypeAny> = {};
  for (const [key, prop] of Object.entries(properties)) {
    let zodField: ZodTypeAny;
    if (prop.type === 'string') {
      zodField = z.string();
    } else if (prop.type === 'number' || prop.type === 'integer') {
      zodField = z.number();
    } else if (prop.type === 'boolean') {
      zodField = z.boolean();
    } else if (prop.type === 'array') {
      zodField = z.array(z.any());
    } else if (prop.type === 'object') {
      zodField = z.record(z.any());
    } else {
      zodField = z.any();
    }

    if (prop.description) {
      zodField = zodField.describe(prop.description);
    }

    if (!requiredList.includes(key)) {
      zodField = zodField.optional();
    }

    shape[key] = zodField;
  }
  return shape;
}

export function registerZayunoTools(server: any, client: ZayunoApiClient) {
  for (const tool of ZAYUNO_MCP_TOOLS) {
    const zodShape = jsonSchemaToZodShape(tool.inputSchema.properties || {}, tool.inputSchema.required || []);
    server.registerTool(
      tool.name,
      {
        title: tool.name,
        description: tool.description,
        inputSchema: zodShape,
        annotations: tool.annotations
      },
      async (args: any) => {
        try {
          const rawResult = await tool.handler(args, client);
          const result = stripSensitiveSecrets(rawResult);
          const customerText = typeof result === 'string'
            ? result
            : JSON.stringify(result, null, 2);
          return {
            structuredContent: typeof result === 'string' ? { customerMessage: result } : result,
            content: [
              {
                type: 'text',
                text: customerText
              }
            ]
          };
        } catch (err: any) {
          const presentation = buildAgentErrorEnvelope(err);
          const errorPayload = { ...presentation, message: presentation.customerMessage };
          return {
            isError: true,
            structuredContent: errorPayload,
            content: [
              {
                type: 'text',
                text: JSON.stringify(errorPayload, null, 2)
              }
            ]
          };
        }
      }
    );
  }
}
