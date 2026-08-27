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
  formatCustomerOffering,
  formatCustomerPaymentOptions,
  formatCustomerError,
  getWelcomeMessage,
  getDynamicServiceMessage,
  stripSensitiveSecrets
} from '@zayuno/shared';

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
    description: 'Discover and filter capability providers across categories (e.g. food_delivery, logistics, bookings, retail), specific required capabilities (e.g. ACTION_CREATE, QUOTE), geographic coverage, or keyword queries.',
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
          description: 'Filter by provider category or industry (e.g. "food_delivery", "logistics", "general_services").'
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
              id: { type: 'string' },
              slug: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
              status: { type: 'string' },
              type: { type: 'string' },
              category: { type: 'string' },
              capabilities: { type: 'array', items: { type: 'string' } }
            },
            required: ['id', 'slug', 'name', 'status']
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
        ...(Array.isArray(result) ? { providers: result, total: result.length } : result)
      };
    }
  },

  // 2. list_providers (Backward compatibility)
  {
    name: 'list_providers',
    description: 'List all registered and active capability providers (e.g. services, logistics, commerce). Returns provider slugs, names, types, and supported capability flags.',
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
          description: 'Filter providers by operational status (default: ACTIVE and SANDBOX).'
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
              id: { type: 'string' },
              slug: { type: 'string' },
              name: { type: 'string' },
              status: { type: 'string' },
              type: { type: 'string' }
            },
            required: ['id', 'slug', 'name', 'status']
          }
        },
        total: { type: 'number' }
      },
      required: ['customerMessage', 'providers']
    },
    handler: async (args, client) => {
      const result = await client.listProviders(args.status);
      const list = Array.isArray(result) ? result : result?.providers || [];
      const customerMessage = formatCustomerProviders(list);
      return {
        customerMessage,
        ...(Array.isArray(result) ? { providers: result, total: result.length } : result)
      };
    }
  },

  // 3. get_provider
  {
    name: 'get_provider',
    description: 'Get comprehensive metadata, supported capabilities, operational status, and details for a specific capability provider by slug.',
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
        }
      },
      required: ['providerSlug']
    },
    outputSchema: {
      type: 'object',
      properties: {
        customerMessage: { type: 'string', description: 'Pre-formatted provider profile for customer' },
        id: { type: 'string' },
        slug: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        status: { type: 'string' },
        type: { type: 'string' },
        capabilities: { type: 'array', items: { type: 'string' } },
        supportContact: { type: 'object' }
      },
      required: ['customerMessage', 'id', 'slug', 'name']
    },
    handler: async (args, client) => {
      const provider = await client.getProvider(args.providerSlug);
      const customerMessage = formatCustomerProvider(provider);
      return {
        customerMessage,
        ...provider
      };
    }
  },

  // 4. get_provider_capabilities
  {
    name: 'get_provider_capabilities',
    description: 'Retrieve the explicit capability matrix for a provider (e.g. CATALOG, QUOTE, ACTION_CREATE, LOCATIONS, PAYMENT_OPTIONS). Use this to determine which tools can be invoked against the provider.',
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
      const result = await client.getProviderCapabilities(args.providerSlug);
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
    description: 'Retrieve physical operational locations, fulfillment centers, or branches for a specific provider, including addresses, operating hours, and service radii.',
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
      const locations = await client.getLocations(args.providerSlug, args.activeOnly);
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
    description: 'Retrieve the full structured catalog, categories, offerings, base pricing, and option groups from a provider. Can be filtered by category or location.',
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
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
              price: { type: 'number' },
              currency: { type: 'string' },
              isAvailable: { type: 'boolean' }
            },
            required: ['id', 'name', 'price']
          }
        },
        categories: { type: 'array', items: { type: 'object' } }
      },
      required: ['customerMessage', 'offerings']
    },
    handler: async (args, client) => {
      const catalog = await client.getCatalog(args.providerSlug, args.locationId, args.category, args.parameters);
      const offerings = catalog?.offerings || (Array.isArray(catalog) ? catalog : []);
      const customerMessage = formatCustomerOfferings(offerings, args.providerSlug);
      return {
        customerMessage,
        ...(Array.isArray(catalog) ? { offerings: catalog } : catalog)
      };
    }
  },

  // 7. search_catalog
  {
    name: 'search_catalog',
    description: 'Search static or real-time provider offerings. For dynamic domains such as tickets, appointments, hotels, and transport, pass structured parameters (dates, origin/destination, passengers, capacity, or preferences).',
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
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
              price: { type: 'number' },
              currency: { type: 'string' }
            },
            required: ['id', 'name', 'price']
          }
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
        ...(Array.isArray(result) ? { offerings: result, total: result.length } : result)
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
        id: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        price: { type: 'number' },
        currency: { type: 'string' },
        isAvailable: { type: 'boolean' },
        optionGroups: { type: 'array', items: { type: 'object' } }
      },
      required: ['customerMessage', 'id', 'name', 'price']
    },
    handler: async (args, client) => {
      const offering = await client.getOffering(args.providerSlug, args.offeringId, args.locationId, args.parameters);
      const customerMessage = formatCustomerOffering(offering);
      return {
        customerMessage,
        ...offering
      };
    }
  },

  // 9. check_availability
  {
    name: 'check_availability',
    description: 'Read-only real-time inventory check before requesting a quote. Use for seats, appointment slots, rooms, tickets, limited stock, or any capacity that can change. This does not reserve or hold inventory.',
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
        available: { type: 'boolean' },
        reason: { type: 'string' },
        items: { type: 'array', items: { type: 'object' } }
      },
      required: ['customerMessage', 'available']
    },
    handler: async (args, client) => {
      const result = await client.checkAvailability(args);
      const customerMessage = formatCustomerAvailability(result);
      const available = typeof result?.available === 'boolean' ? result.available : typeof result?.isAvailable === 'boolean' ? result.isAvailable : true;
      return {
        customerMessage,
        available,
        ...result
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
      const quote = await client.requestQuote(args);
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
    description: 'Execute an action with the external provider. MUST only be called after request_quote and AFTER the user has explicitly reviewed and confirmed the quote. Returns pre-formatted customerMessage with secure checkout link. The AI assistant must present customerMessage directly to the customer and keep actionId/tokens internal.',
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
          description: 'Customer contact information for action fulfillment.',
          properties: {
            name: { type: 'string', description: 'Customer full name' },
            phone: { type: 'string', description: 'Customer phone number e.g. +998901234567' },
            email: { type: 'string', description: 'Optional customer email' }
          },
          required: ['name', 'phone']
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
      required: ['providerSlug', 'quoteId', 'items', 'customer', 'userConfirmed']
    },
    outputSchema: {
      type: 'object',
      properties: {
        customerMessage: { type: 'string', description: 'Pre-formatted confirmation and payment link for customer' },
        id: { type: 'string', description: 'Internal action identifier' },
        actionId: { type: 'string', description: 'Action reference identifier' },
        publicId: { type: 'string', description: 'Public order identifier (e.g. ZY-ORD-123)' },
        providerSlug: { type: 'string' },
        status: { type: 'string' },
        paymentStatus: { type: 'string' },
        total: { type: 'number' },
        currency: { type: 'string' },
        checkoutUrl: { type: 'string', description: 'Secure external payment URL' },
        nextAction: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            url: { type: 'string' },
            description: { type: 'string' }
          }
        }
      },
      required: ['customerMessage', 'id', 'publicId', 'status']
    },
    handler: async (args, client) => {
      const idempotencyKey = args.idempotencyKey || getOrCreateActionIdempotencyKey(args.quoteId);
      const action = await client.createAction({
        ...args,
        idempotencyKey
      });
      const customerMessage = formatCustomerActionConfirmation(action);
      return {
        customerMessage,
        actionId: action.publicId || action.id,
        ...action
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
        id: { type: 'string' },
        actionId: { type: 'string' },
        publicId: { type: 'string' },
        providerSlug: { type: 'string' },
        status: { type: 'string' },
        paymentStatus: { type: 'string' },
        total: { type: 'number' },
        currency: { type: 'string' },
        checkoutUrl: { type: 'string' },
        timeline: { type: 'array', items: { type: 'object' } }
      },
      required: ['customerMessage', 'id', 'publicId', 'status']
    },
    handler: async (args, client) => {
      const action = await client.getAction(args.actionId);
      const customerMessage = formatCustomerActionStatus(action);
      return {
        customerMessage,
        actionId: action.publicId || action.id,
        ...action
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
        id: { type: 'string' },
        actionId: { type: 'string' },
        publicId: { type: 'string' },
        status: { type: 'string' },
        cancellationReason: { type: 'string' }
      },
      required: ['customerMessage', 'id', 'status']
    },
    handler: async (args, client) => {
      const result = await client.cancelAction(args.actionId, args.reason, args.reasonCode);
      const customerMessage = formatCustomerActionCancellation(result);
      return {
        customerMessage,
        actionId: result.publicId || result.id,
        ...result
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
              method: { type: 'string' },
              name: { type: 'string' },
              checkoutUrl: { type: 'string' },
              isAvailable: { type: 'boolean' }
            },
            required: ['method', 'name']
          }
        }
      },
      required: ['customerMessage', 'paymentOptions']
    },
    handler: async (args, client) => {
      const options = await client.getPaymentOptions(args.actionId);
      const customerMessage = formatCustomerPaymentOptions(Array.isArray(options) ? options : options?.paymentOptions);
      return {
        customerMessage,
        ...(Array.isArray(options) ? { paymentOptions: options } : options)
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
    server.tool(
      tool.name,
      tool.description,
      zodShape,
      async (args: any) => {
        try {
          const rawResult = await tool.handler(args, client);
          const result = stripSensitiveSecrets(rawResult);
          return {
            content: [
              {
                type: 'text',
                text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
              }
            ]
          };
        } catch (err: any) {
          const friendlyMessage = formatCustomerError(err);
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  isError: true,
                  customerMessage: friendlyMessage,
                  message: friendlyMessage
                }, null, 2)
              }
            ]
          };
        }
      }
    );
  }
}
