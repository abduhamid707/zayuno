import { z, ZodTypeAny } from 'zod';
import { ZayunoApiClient } from './client.js';

export interface McpToolDefinition {
  name: string;
  description: string;
  annotations?: {
    readOnly?: boolean;
    openWorld?: boolean;
    destructive?: boolean;
  };
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  handler: (args: any, client: ZayunoApiClient) => Promise<any>;
}

export const ZAYUNO_MCP_TOOLS: McpToolDefinition[] = [
  // 1. find_providers (Multi-criteria discovery)
  {
    name: 'find_providers',
    description: 'Discover and filter capability providers across categories (e.g. food_delivery, logistics, bookings, retail), specific required capabilities (e.g. ACTION_CREATE, QUOTE), geographic coverage, or keyword queries.',
    annotations: {
      readOnly: true,
      openWorld: false,
      destructive: false
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
    handler: async (args, client) => {
      return client.findProviders(args);
    }
  },

  // 2. list_providers (Backward compatibility)
  {
    name: 'list_providers',
    description: 'List all registered and active capability providers (e.g. services, logistics, commerce). Returns provider slugs, names, types, and supported capability flags.',
    annotations: {
      readOnly: true,
      openWorld: false,
      destructive: false
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
    handler: async (args, client) => {
      return client.listProviders(args.status);
    }
  },

  // 2. get_provider
  {
    name: 'get_provider',
    description: 'Get comprehensive metadata, supported capabilities, operational status, and details for a specific capability provider by slug.',
    annotations: {
      readOnly: true,
      openWorld: false,
      destructive: false
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
    handler: async (args, client) => {
      return client.getProvider(args.providerSlug);
    }
  },

  // 3. get_provider_capabilities
  {
    name: 'get_provider_capabilities',
    description: 'Retrieve the explicit capability matrix for a provider (e.g. CATALOG, QUOTE, ACTION_CREATE, LOCATIONS, PAYMENT_OPTIONS). Use this to determine which tools can be invoked against the provider.',
    annotations: {
      readOnly: true,
      openWorld: false,
      destructive: false
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
    handler: async (args, client) => {
      return client.getProviderCapabilities(args.providerSlug);
    }
  },

  // 4. get_locations
  {
    name: 'get_locations',
    description: 'Retrieve physical operational locations, fulfillment centers, or branches for a specific provider, including addresses, operating hours, and service radii.',
    annotations: {
      readOnly: true,
      openWorld: false,
      destructive: false
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
    handler: async (args, client) => {
      return client.getLocations(args.providerSlug, args.activeOnly);
    }
  },

  // 5. get_catalog
  {
    name: 'get_catalog',
    description: 'Retrieve the full structured catalog, categories, offerings, base pricing, and option groups from a provider. Can be filtered by category or location.',
    annotations: {
      readOnly: true,
      openWorld: false,
      destructive: false
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
    handler: async (args, client) => {
      return client.getCatalog(args.providerSlug, args.locationId, args.category, args.parameters);
    }
  },

  // 6. search_catalog
  {
    name: 'search_catalog',
    description: 'Search static or real-time provider offerings. For dynamic domains such as tickets, appointments, hotels, and transport, pass structured parameters (dates, origin/destination, passengers, capacity, or preferences).',
    annotations: {
      readOnly: true,
      openWorld: false,
      destructive: false
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
    handler: async (args, client) => {
      return client.searchCatalog(args.providerSlug, args.query || '', args.category, args.locationId, args.limit, args.parameters);
    }
  },

  // 7. get_offering
  {
    name: 'get_offering',
    description: 'Get deep item details for an offering including variants, modifiers, option groups, required selections, and availability.',
    annotations: {
      readOnly: true,
      openWorld: false,
      destructive: false
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
    handler: async (args, client) => {
      return client.getOffering(args.providerSlug, args.offeringId, args.locationId, args.parameters);
    }
  },

  // 8. check_availability
  {
    name: 'check_availability',
    description: 'Read-only real-time inventory check before requesting a quote. Use for seats, appointment slots, rooms, tickets, limited stock, or any capacity that can change. This does not reserve or hold inventory.',
    annotations: {
      readOnly: true,
      openWorld: false,
      destructive: false
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
    handler: async (args, client) => client.checkAvailability(args)
  },

  // 9. request_quote
  {
    name: 'request_quote',
    description: 'Mandatory pre-requisite before creating an action. Calculates verified real-time pricing, subtotal, fees, discounts, and itemized breakdown. Presents an exact total for the user to review and confirm.',
    annotations: {
      readOnly: true,
      openWorld: false,
      destructive: false
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
    handler: async (args, client) => {
      return client.requestQuote(args);
    }
  },

  // 9. create_action
  {
    name: 'create_action',
    description: 'Execute an action with the external provider. MUST only be called after request_quote and AFTER the user has explicitly reviewed and confirmed the quote. Requires an idempotencyKey to guarantee exactly-once execution.',
    annotations: {
      readOnly: false,
      openWorld: true,
      destructive: false
    },
    inputSchema: {
      type: 'object',
      properties: {
        idempotencyKey: {
          type: 'string',
          description: 'Unique client-generated key (e.g. UUID) preventing duplicate action submission.'
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
      required: ['idempotencyKey', 'providerSlug', 'quoteId', 'items', 'customer', 'userConfirmed']
    },
    handler: async (args, client) => {
      return client.createAction(args);
    }
  },

  // 10. get_action
  {
    name: 'get_action',
    description: 'Retrieve live status, fulfillment updates, external provider references, and audit timeline for an active or completed action.',
    annotations: {
      readOnly: true,
      openWorld: false,
      destructive: false
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
    handler: async (args, client) => {
      return client.getAction(args.actionId);
    }
  },

  // 11. cancel_action
  {
    name: 'cancel_action',
    description: 'Cancel an eligible active action before fulfillment lock or completion. Releases reservations and initiates settlement adjustments if applicable.',
    annotations: {
      readOnly: false,
      openWorld: true,
      destructive: false
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
    handler: async (args, client) => {
      return client.cancelAction(args.actionId, args.reason, args.reasonCode);
    }
  },

  // 12. get_payment_options
  {
    name: 'get_payment_options',
    description: 'Retrieve provider-supplied checkout URLs and available payment options for an action. Sensitive card data is never handled in chat; payment occurs via secure HTTPS redirection.',
    annotations: {
      readOnly: true,
      openWorld: false,
      destructive: false
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
    handler: async (args, client) => {
      return client.getPaymentOptions(args.actionId);
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
          const result = await tool.handler(args, client);
          return {
            content: [
              {
                type: 'text',
                text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
              }
            ]
          };
        } catch (err: any) {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: `Tool execution error [${tool.name}]: ${err.message || String(err)}`
              }
            ]
          };
        }
      }
    );
  }
}
