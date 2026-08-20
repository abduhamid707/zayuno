import {
  BaseProviderAdapter,
  ProviderAdapterConfig
} from '@zayuno/provider-sdk';
import {
  ProviderCapability,
  ProviderInfo,
  ProviderStatus,
  ProviderType,
  HealthCheckResult,
  Location,
  GetLocationsInput,
  Catalog,
  GetCatalogInput,
  Offering,
  GetOfferingInput,
  SearchCatalogInput,
  RequestQuoteInput,
  NormalizedQuote,
  QuoteLine,
  CreateActionInput,
  NormalizedAction,
  GetActionInput,
  CancelActionInput,
  CancelActionResult,
  ActionStatus,
  PaymentStatus,
  GetPaymentOptionsInput,
  PaymentOption,
  PaymentMethodType,
  NormalizedWebhookEvent
} from '@zayuno/contracts';
import { SANDBOX_LOCATIONS, SANDBOX_CATEGORIES, SANDBOX_OFFERINGS } from './data';

export class SandboxProviderAdapter extends BaseProviderAdapter {
  private actions = new Map<string, NormalizedAction>();

  constructor(config: ProviderAdapterConfig) {
    super(config, [
      ProviderCapability.METADATA,
      ProviderCapability.HEALTH,
      ProviderCapability.LOCATIONS,
      ProviderCapability.CATALOG,
      ProviderCapability.SEARCH,
      ProviderCapability.QUOTE,
      ProviderCapability.ACTION_CREATE,
      ProviderCapability.ACTION_STATUS,
      ProviderCapability.ACTION_CANCEL,
      ProviderCapability.PAYMENT_OPTIONS,
      ProviderCapability.WEBHOOK
    ]);
  }

  // 1. Metadata Capability
  async getProviderInfo(): Promise<ProviderInfo> {
    return {
      id: 'provider_sandbox',
      slug: this.providerSlug,
      name: 'Sandbox Capability Provider',
      description: 'Domain-neutral fictional reference provider implementing all 11 capabilities.',
      logoUrl: 'https://zayuno.uz/assets/sandbox-logo.png',
      status: ProviderStatus.ACTIVE,
      type: ProviderType.SERVICES,
      category: 'general_services',
      geography: ['UZ', 'Tashkent'],
      adapterType: 'sandbox',
      authMethod: 'API_KEY' as any,
      capabilities: this.getCapabilities(),
      baseUrl: this.config.baseUrl,
      supportContact: '+998900000000',
      isCertified: true,
      isPublished: true,
      metadata: {
        environment: 'SANDBOX',
        tier: 'STANDARD'
      }
    };
  }

  // 2. Health Capability
  async checkHealth(): Promise<HealthCheckResult> {
    return {
      status: 'HEALTHY',
      latencyMs: 2,
      message: 'Sandbox provider mock backend is operational.',
      timestamp: new Date().toISOString()
    };
  }

  // 3. Locations Capability
  async getLocations(_input?: GetLocationsInput): Promise<Location[]> {
    return SANDBOX_LOCATIONS;
  }

  // 4. Catalog Capability
  async getCatalog(input: GetCatalogInput): Promise<Catalog> {
    let offerings = SANDBOX_OFFERINGS;
    if (input.categorySlug) {
      offerings = offerings.filter(o => o.categorySlug === input.categorySlug);
    }
    return {
      providerSlug: this.providerSlug,
      locationId: input.locationId,
      categories: SANDBOX_CATEGORIES,
      offerings,
      version: '1.0.0',
      updatedAt: new Date().toISOString()
    };
  }

  async getOffering(input: GetOfferingInput): Promise<Offering> {
    const found = SANDBOX_OFFERINGS.find(o => o.id === input.offeringId || o.offeringCode === input.offeringId);
    if (!found) {
      throw new Error(`Offering "${input.offeringId}" not found in sandbox catalog.`);
    }
    return found;
  }

  // 5. Search Capability
  async searchOfferings(input: SearchCatalogInput): Promise<Offering[]> {
    const q = input.query.toLowerCase();
    return SANDBOX_OFFERINGS.filter(o =>
      o.title.toLowerCase().includes(q) ||
      (o.description && o.description.toLowerCase().includes(q)) ||
      (o.tags && o.tags.some((t: string) => t.toLowerCase().includes(q)))
    ).slice(0, input.limit || 20);
  }

  // 6. Quote Capability
  async requestQuote(input: RequestQuoteInput): Promise<NormalizedQuote> {
    let subtotal = 0;
    const lines: QuoteLine[] = [];

    for (const item of input.items) {
      const offering = SANDBOX_OFFERINGS.find(o => o.id === item.offeringId || o.offeringCode === item.offeringId);
      const unitPrice = offering ? offering.basePrice : 50000;
      const title = offering ? offering.title : 'Standard Sandbox Offering';

      let optionsTotal = 0;
      if (item.selectedOptions && item.selectedOptions.length > 0) {
        optionsTotal = item.selectedOptions.reduce((acc: number, opt: any) => acc + (opt.quantity || 1) * 15000, 0);
      }

      const lineTotal = (unitPrice * item.quantity) + optionsTotal;
      subtotal += lineTotal;

      lines.push({
        offeringId: item.offeringId,
        offeringTitle: title,
        variantId: item.variantId,
        unitPrice,
        quantity: item.quantity,
        optionsTotal,
        lineTotal,
        selectedOptions: item.selectedOptions || []
      });
    }

    const feeAmount = input.fulfillmentType === 'EXPRESS' ? 25000 : 10000;
    const total = subtotal + feeAmount;

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    return {
      id: `quote_sb_${Date.now()}`,
      providerSlug: this.providerSlug,
      locationId: input.locationId,
      lines,
      subtotal,
      fees: [{ name: 'Standard Fulfillment Fee', amount: feeAmount }],
      totalFees: feeAmount,
      discounts: [],
      totalDiscount: 0,
      total,
      currency: 'UZS',
      expiresAt,
      estimatedDurationMinutes: 30,
      parameters: input.parameters || {}
    };
  }

  // 7. Action Create Capability
  async createAction(input: CreateActionInput): Promise<NormalizedAction> {
    // Idempotency check: Return existing action if same idempotencyKey provided
    if (input.idempotencyKey && this.actions.has(input.idempotencyKey)) {
      return this.actions.get(input.idempotencyKey)!;
    }

    const actionId = `act_sb_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const publicId = `ZY-SANDBOX-${Math.floor(10000 + Math.random() * 90000)}`;

    let subtotal = 0;
    const lines: QuoteLine[] = [];

    for (const item of input.items) {
      const offering = SANDBOX_OFFERINGS.find(o => o.id === item.offeringId || o.offeringCode === item.offeringId);
      const unitPrice = offering ? offering.basePrice : 50000;
      const title = offering ? offering.title : 'Standard Sandbox Offering';

      let optionsTotal = 0;
      if (item.selectedOptions && item.selectedOptions.length > 0) {
        optionsTotal = item.selectedOptions.reduce((acc: number, opt: any) => acc + (opt.quantity || 1) * 15000, 0);
      }

      const lineTotal = (unitPrice * item.quantity) + optionsTotal;
      subtotal += lineTotal;

      lines.push({
        offeringId: item.offeringId,
        offeringTitle: title,
        variantId: item.variantId,
        unitPrice,
        quantity: item.quantity,
        optionsTotal,
        lineTotal,
        selectedOptions: item.selectedOptions || []
      });
    }

    const fees = 10000;
    const total = subtotal + fees;
    const checkoutUrl = `https://checkout.sandbox-provider.example/pay/${actionId}`;

    const action: NormalizedAction = {
      id: actionId,
      publicId,
      providerSlug: this.providerSlug,
      providerName: 'Sandbox Capability Provider',
      externalActionId: `ext_${actionId}`,
      quoteId: input.quoteId,
      locationId: input.locationId,
      status: ActionStatus.AWAITING_PAYMENT,
      nextAction: {
        type: 'OPEN_URL',
        url: checkoutUrl,
        label: 'Pay now',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
      },
      lines,
      subtotal,
      fees,
      discount: 0,
      total,
      currency: 'UZS',
      customer: input.customer,
      destination: input.destination,
      fulfillmentType: input.fulfillmentType || 'STANDARD',
      paymentMethod: input.paymentMethod || 'PAYME',
      paymentStatus: PaymentStatus.PENDING,
      paymentUrl: checkoutUrl,
      idempotencyKey: input.idempotencyKey,
      parameters: input.parameters || {},
      metadata: {},
      timeline: [
        {
          id: `evt_init_${Date.now()}`,
          status: ActionStatus.AWAITING_PAYMENT,
          description: `Action initiated (${publicId}). Awaiting payment or confirmation.`,
          source: 'AI_AGENT',
          createdAt: new Date().toISOString()
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.actions.set(actionId, action);
    this.actions.set(publicId, action);
    if (action.externalActionId) {
      this.actions.set(action.externalActionId, action);
    }
    if (input.idempotencyKey) {
      this.actions.set(input.idempotencyKey, action);
    }

    return action;
  }

  // 8. Action Status Capability
  async getAction(input: GetActionInput): Promise<NormalizedAction> {
    const found = this.actions.get(input.actionId);
    if (!found) {
      throw new Error(`Action "${input.actionId}" not found in sandbox provider.`);
    }
    return found;
  }

  // 9. Action Cancel Capability
  async cancelAction(input: CancelActionInput): Promise<CancelActionResult> {
    const found = this.actions.get(input.actionId);
    const publicId = found ? found.publicId : input.actionId;
    const previousStatus = found ? found.status : ActionStatus.AWAITING_PAYMENT;

    if (found) {
      found.status = ActionStatus.CANCELLED;
      found.updatedAt = new Date().toISOString();
      found.timeline?.push({
        id: `evt_cancel_${Date.now()}`,
        status: ActionStatus.CANCELLED,
        description: `Action cancelled: ${input.reason || 'User requested cancellation'}`,
        source: 'USER',
        createdAt: new Date().toISOString()
      });
    }

    return {
      success: true,
      actionId: publicId,
      previousStatus,
      newStatus: ActionStatus.CANCELLED,
      message: 'Action successfully cancelled.',
      refundInitiated: previousStatus === ActionStatus.AWAITING_PAYMENT ? false : true
    };
  }

  // 10. Payment Options Capability
  async getPaymentOptions(input: GetPaymentOptionsInput): Promise<PaymentOption[]> {
    const actionId = input.actionId;
    return [
      {
        id: 'opt_payme',
        name: 'Payme Checkout',
        type: PaymentMethodType.PAYME,
        isOnline: true,
        checkoutUrl: `https://checkout.sandbox-provider.example/payme/${actionId}`,
        supportedCurrencies: ['UZS'],
        metadata: {}
      },
      {
        id: 'opt_card',
        name: 'Bank Card (Uzcard / Humo / Visa)',
        type: PaymentMethodType.CARD_ONLINE,
        isOnline: true,
        checkoutUrl: `https://checkout.sandbox-provider.example/card/${actionId}`,
        supportedCurrencies: ['UZS'],
        metadata: {}
      },
      {
        id: 'opt_offline',
        name: 'Offline Settlement / Invoice',
        type: PaymentMethodType.INVOICE,
        isOnline: false,
        instructions: 'Present verified Action ID upon delivery or completion.',
        supportedCurrencies: ['UZS'],
        metadata: {}
      }
    ];
  }

  // 11. Webhook Capability
  async parseWebhookEvent(
    _headers: Record<string, string | string[] | undefined>,
    rawBody: string | any
  ): Promise<NormalizedWebhookEvent> {
    const body = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
    return {
      eventId: body.eventId || `evt_${Date.now()}`,
      eventType: body.eventType || body.event || 'action.status_updated',
      providerSlug: body.providerSlug || this.providerSlug || 'sandbox-provider',
      actionId: body.actionId,
      externalActionId: body.externalActionId,
      newStatus: body.newStatus as ActionStatus,
      newPaymentStatus: body.newPaymentStatus as PaymentStatus,
      timestamp: new Date().toISOString(),
      description: body.description || 'Sandbox status update',
      payload: body
    };
  }
}
