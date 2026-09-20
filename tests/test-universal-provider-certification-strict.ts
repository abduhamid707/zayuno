import assert from 'node:assert/strict';
import http from 'node:http';
import crypto from 'node:crypto';
import {
  ProviderCapability,
  ProviderFulfillmentMode,
  ProviderStatus,
  ProviderType,
} from '../packages/contracts/src/provider';
import { ActionStatus, PaymentStatus } from '../packages/contracts/src/action';
import { RemoteHttpProviderAdapter } from '../packages/provider-sdk/src/remote-http-adapter';
import { ProviderCertificationRunner } from '../packages/provider-sdk/src/certification';
import { certificationWebhookEvidence } from '../apps/api/src/modules/providers/certification-webhook-evidence';

console.log('🧪 Starting Universal Provider Strict Certification & False-PASS Elimination Test Suite...\n');

interface MockServerOptions {
  slug: string;
  name: string;
  apiKey: string;
  webhookSecret: string;
  capabilities: ProviderCapability[];
  fulfillmentMode?: ProviderFulfillmentMode;
  providerType?: ProviderType;
  manifest: any;
  catalogData?: any;
  // Flaws to inject for negative verification
  flaw?:
    | 'auth_missing_accepts'
    | 'auth_invalid_accepts'
    | 'safe_env_missing'
    | 'missing_field_accepts'
    | 'invalid_param_accepts'
    | 'unconfirmed_action_accepts'
    | 'unknown_quote_accepts'
    | 'idempotency_collision_accepts'
    | 'expired_quote_accepts'
    | 'webhook_missing'
    | 'webhook_wrong_action'
    | 'webhook_unprocessed'
    | 'unrelated_rejection_on_missing_field';
  onActionCreated?: (action: any) => Promise<void> | void;
}

class SimulatedWebhookPipeline {
  private actions = new Map<string, { id: string; status: ActionStatus; timeline: any[] }>();
  public webhookLogs: any[] = [];

  registerAction(action: any) {
    const entry = {
      id: action.id,
      externalActionId: action.externalActionId || action.id,
      status: ActionStatus.AWAITING_PAYMENT,
      timeline: []
    };
    this.actions.set(action.id, entry);
    if (action.externalActionId) {
      this.actions.set(action.externalActionId, entry);
    }
  }

  async dispatchWebhook(
    providerSlug: string,
    webhookSecret: string,
    actionId: string,
    newStatus: ActionStatus,
    options?: { failProcessing?: boolean; tamperSignature?: boolean; unknownAction?: boolean }
  ) {
    const eventId = `evt-${crypto.randomUUID().slice(0, 8)}`;
    const targetActionId = options?.unknownAction ? `unknown-${crypto.randomUUID().slice(0, 6)}` : actionId;
    const payload = {
      eventId,
      eventType: 'action.status_updated',
      providerSlug,
      actionId: targetActionId,
      externalActionId: targetActionId,
      newStatus,
      timestamp: new Date().toISOString()
    };
    const rawBody = JSON.stringify(payload);
    const signature = options?.tamperSignature
      ? 'tampered_invalid_signature'
      : crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

    const expectedSignature = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
    const isVerified = signature === expectedSignature;

    const logEntry: any = {
      id: `whlog-${crypto.randomUUID().slice(0, 8)}`,
      providerId: providerSlug,
      event: 'action.status_updated',
      signature,
      isVerified,
      isProcessed: false,
      payload: {
        ...payload,
        certificationEvidence: {
          eventId,
          actionId: targetActionId,
          externalActionId: targetActionId,
          newStatus
        }
      },
      createdAt: new Date().toISOString()
    };
    this.webhookLogs.push(logEntry);

    if (!isVerified) {
      return { success: false, reason: 'Invalid HMAC signature', log: logEntry };
    }

    if (options?.failProcessing) {
      return { success: true, processed: false, reason: 'Simulated order processing failure', log: logEntry };
    }

    let action = this.actions.get(targetActionId);
    if (!action && !options?.unknownAction && !options?.failProcessing) {
      await new Promise(resolve => setTimeout(resolve, 50));
      action = this.actions.get(targetActionId);
    }
    if (!action) {
      return { success: true, processed: false, reason: 'Action not found in database', log: logEntry };
    }

    action.status = newStatus;
    action.timeline.push({ status: newStatus, createdAt: new Date().toISOString() });
    logEntry.isProcessed = true;
    return { success: true, processed: true, log: logEntry };
  }

  async getEvidence(providerSlug: string, actionIds: string[], since: Date) {
    const deadline = Date.now() + 2000;
    do {
      const evidence = certificationWebhookEvidence(this.webhookLogs, providerSlug, actionIds, since);
      if (evidence) return evidence;
      await new Promise(resolve => setTimeout(resolve, 50));
    } while (Date.now() < deadline);
    return null;
  }
}

function setupAdapterWithPipeline(adapter: RemoteHttpProviderAdapter, pipeline: SimulatedWebhookPipeline): RemoteHttpProviderAdapter {
  const certAdapter = typeof (adapter as any).forCertification === 'function' && !(adapter as any).config?.config?.certificationRunId
    ? (adapter as any).forCertification(crypto.randomUUID())
    : adapter;
  const orig = certAdapter.createAction.bind(certAdapter);
  certAdapter.createAction = async (input: any) => {
    const res = await orig(input);
    pipeline.registerAction(res);
    return res;
  };
  return certAdapter;
}

function createMockProviderServer(opts: MockServerOptions) {
  const quotesDb = new Map<string, any>();
  const actionsDb = new Map<string, any>();
  const idempotencyDb = new Map<string, any>();

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const method = req.method || 'GET';
    const authHeader = req.headers['x-provider-api-key'] || req.headers['authorization'];

    const sendJson = (status: number, data: any) => {
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(status);
      res.end(JSON.stringify(data));
    };

    // Check Auth
    const isAuthValid =
      authHeader === opts.apiKey ||
      authHeader === `Bearer ${opts.apiKey}`;

    // Negative flaw: auth_missing_accepts ignores missing auth on /provider-info
    if (opts.flaw === 'auth_missing_accepts' && !authHeader && url.pathname === '/provider-info') {
      // Intentionally accepts missing auth!
    } else if (opts.flaw === 'auth_invalid_accepts' && authHeader && !isAuthValid && url.pathname === '/provider-info') {
      // Intentionally accepts invalid auth!
    } else {
      if (!authHeader) {
        return sendJson(401, { errorCode: 'PROVIDER_AUTHENTICATION_ERROR', message: 'Missing API key' });
      }
      if (!isAuthValid) {
        return sendJson(403, { errorCode: 'PROVIDER_AUTHENTICATION_ERROR', message: 'Invalid API key' });
      }
    }

    // 1. GET /provider-info
    if (url.pathname === '/provider-info' && method === 'GET') {
      const manifest = structuredClone(opts.manifest);
      if (opts.flaw === 'safe_env_missing' && manifest.certification) {
        delete manifest.certification.safeTestEnvironment;
      }
      return sendJson(200, {
        id: opts.slug,
        slug: opts.slug,
        name: opts.name,
        status: ProviderStatus.ACTIVE,
        type: opts.providerType || ProviderType.SERVICES,
        fulfillmentMode: opts.fulfillmentMode || ProviderFulfillmentMode.REMOTE,
        capabilities: opts.capabilities,
        manifest
      });
    }

    // 2. GET /health
    if (url.pathname === '/health' && method === 'GET') {
      return sendJson(200, {
        status: 'HEALTHY',
        latencyMs: 5,
        timestamp: new Date().toISOString()
      });
    }

    // 3. GET /catalog
    if (url.pathname === '/catalog' && method === 'GET') {
      return sendJson(200, opts.catalogData || {
        providerSlug: opts.slug,
        categories: [{ id: 'cat-1', slug: 'cat-1', title: 'Category 1' }],
        offerings: [
          {
            id: 'offering-1',
            providerId: opts.slug,
            offeringCode: 'OFF-1',
            title: 'Test Offering',
            categorySlug: 'cat-1',
            basePrice: 10000,
            currency: 'UZS',
            isAvailable: true,
            variants: [],
            optionGroups: []
          }
        ]
      });
    }

    // 4. GET /offerings/:id
    if (url.pathname.startsWith('/offerings/') && method === 'GET') {
      const offeringId = url.pathname.replace('/offerings/', '');
      const offering = opts.catalogData?.offerings?.find((o: any) => o.id === offeringId || o.offeringCode === offeringId);
      if (!offering && offeringId !== 'offering-1') {
        return sendJson(404, { errorCode: 'OFFERING_NOT_FOUND', message: 'Offering not found' });
      }
      return sendJson(200, offering || {
        id: 'offering-1',
        providerId: opts.slug,
        offeringCode: 'OFF-1',
        title: 'Test Offering',
        categorySlug: 'cat-1',
        basePrice: 10000,
        currency: 'UZS',
        isAvailable: true,
        variants: [],
        optionGroups: []
      });
    }

    // 5. GET /search
    if (url.pathname === '/search' && method === 'GET') {
      return sendJson(200, opts.catalogData?.offerings || []);
    }

    // Read body for POST endpoints
    let rawBody = '';
    for await (const chunk of req) rawBody += chunk;
    let body: any = {};
    if (rawBody) {
      try { body = JSON.parse(rawBody); } catch { body = {}; }
    }

    const validateManifestRequirements = (reqBody: any, capability: 'QUOTE' | 'ACTION_CREATE') => {
      if (opts.flaw === 'missing_field_accepts') return null;
      const customerReqs = opts.manifest?.requirements?.[capability]?.customerRequirements || opts.manifest?.customerRequirements;
      if (customerReqs?.email === 'REQUIRED' && !reqBody.customer?.email) {
        return { status: 400, body: { errorCode: 'VALIDATION_ERROR', message: 'Missing required customer.email' } };
      }
      if (customerReqs?.name === 'REQUIRED' && !reqBody.customer?.name) {
        return { status: 400, body: { errorCode: 'VALIDATION_ERROR', message: 'Missing required customer.name' } };
      }
      if (customerReqs?.phone === 'REQUIRED' && !reqBody.customer?.phone) {
        return { status: 400, body: { errorCode: 'VALIDATION_ERROR', message: 'Missing required customer.phone' } };
      }
      if (opts.manifest?.supportedLocationRoles) {
        for (const locRole of opts.manifest.supportedLocationRoles) {
          if (locRole.required && !reqBody.locations?.some((l: any) => l.role === locRole.role && (l.address?.raw || l.locationId))) {
            return { status: 400, body: { errorCode: 'VALIDATION_ERROR', message: `Missing required location: ${locRole.role}` } };
          }
        }
      }
      const schemaProps = opts.manifest?.parametersSchema?.properties || {};
      const requiredParams = opts.manifest?.parametersSchema?.required || [];
      for (const reqP of requiredParams) {
        if (reqBody.parameters?.[reqP] === undefined) {
          return { status: 400, body: { errorCode: 'VALIDATION_ERROR', message: `Missing required parameter ${reqP}` } };
        }
      }
      if (opts.flaw !== 'invalid_param_accepts') {
        for (const [pName, prop] of Object.entries(schemaProps) as any) {
          const val = reqBody.parameters?.[pName];
          if (val !== undefined) {
            if (prop.type === 'integer' || prop.type === 'number') {
              if (typeof val !== 'number') {
                return { status: 422, body: { errorCode: 'VALIDATION_ERROR', message: `Parameter ${pName} must be number` } };
              }
              if (typeof prop.minimum === 'number' && val < prop.minimum) {
                return { status: 422, body: { errorCode: 'VALIDATION_ERROR', message: `Parameter ${pName} minimum is ${prop.minimum}` } };
              }
              if (typeof prop.maximum === 'number' && val > prop.maximum) {
                return { status: 422, body: { errorCode: 'VALIDATION_ERROR', message: `Parameter ${pName} maximum is ${prop.maximum}` } };
              }
            }
            if (prop.type === 'string') {
              if (typeof val !== 'string') {
                return { status: 422, body: { errorCode: 'VALIDATION_ERROR', message: `Parameter ${pName} must be string` } };
              }
              if (Array.isArray(prop.enum) && !prop.enum.includes(val)) {
                return { status: 422, body: { errorCode: 'VALIDATION_ERROR', message: `Parameter ${pName} invalid enum` } };
              }
            }
          }
        }
      }
      return null;
    };

    // 6. POST /quote
    if (url.pathname === '/quote' && method === 'POST') {
      // Validate items for non-parameter-only
      const isParameterOnly = opts.manifest?.requirements?.QUOTE?.inputMode === 'PARAMETERS';
      if (!isParameterOnly) {
        if (!Array.isArray(body.items) || body.items.length === 0) {
          return sendJson(400, { errorCode: 'VALIDATION_ERROR', message: 'items array cannot be empty' });
        }
        for (const item of body.items) {
          if (typeof item.quantity !== 'number' || item.quantity <= 0 || !Number.isInteger(item.quantity)) {
            return sendJson(422, { errorCode: 'INVALID_QUANTITY', message: 'Quantity must be positive integer' });
          }
          if (item.offeringId && item.offeringId !== 'offering-1' && !opts.catalogData?.offerings?.some((o: any) => o.id === item.offeringId)) {
            return sendJson(404, { errorCode: 'OFFERING_NOT_FOUND', message: 'Unknown offeringId' });
          }
          if (item.variantId && !opts.catalogData?.offerings?.some((o: any) => o.variants?.some((v: any) => v.id === item.variantId))) {
            return sendJson(404, { errorCode: 'INVALID_VARIANT', message: 'Unknown variantId' });
          }
          if (item.selectedOptions?.some((o: any) => o.groupId === 'missing-group' || o.optionId === 'missing-option')) {
            return sendJson(400, { errorCode: 'INVALID_OPTION', message: 'Unknown option' });
          }
        }
      }

      const reqCheck = validateManifestRequirements(body, 'QUOTE');
      if (reqCheck) return sendJson(reqCheck.status, reqCheck.body);

      // Check option quantity math if options are provided
      let optionsTotal = 0;
      if (!isParameterOnly && body.items?.[0]?.selectedOptions?.length) {
        for (const opt of body.items[0].selectedOptions) {
          const priced = opts.catalogData?.offerings?.[0]?.optionGroups
            ?.flatMap((g: any) => g.options)
            ?.find((o: any) => o.id === opt.optionId);
          if (priced?.priceDelta) {
            optionsTotal += Number(priced.priceDelta) * Number(opt.quantity || 1) * Number(body.items[0].quantity || 1);
          }
        }
      }

      let unitPrice = 10000;
      let offeringTitle = 'Test Offering';
      if (isParameterOnly) {
        unitPrice = 50000;
      } else {
        const foundOffering = opts.catalogData?.offerings?.find((o: any) => o.id === body.items?.[0]?.offeringId) || opts.catalogData?.offerings?.[0];
        if (foundOffering) {
          offeringTitle = foundOffering.title || 'Test Offering';
          if (body.items?.[0]?.variantId) {
            const variant = foundOffering.variants?.find((v: any) => v.id === body.items[0].variantId);
            unitPrice = variant?.basePrice ?? foundOffering.basePrice ?? 10000;
          } else {
            unitPrice = foundOffering.basePrice ?? 10000;
          }
        }
      }
      const quantity = isParameterOnly ? 1 : (body.items?.[0]?.quantity || 1);
      const subtotal = unitPrice * quantity + optionsTotal;
      const total = subtotal;

      const quoteId = `quote-${crypto.randomUUID().slice(0, 8)}`;
      // When testing certification run, quote expires in 2 seconds
      const isCertRun = req.headers['x-zayuno-certification-run'];
      const ttlMs = isCertRun ? 2000 : 300000;
      const quoteObj = {
        id: quoteId,
        providerSlug: opts.slug,
        lines: isParameterOnly ? [] : [
          {
            offeringId: body.items[0].offeringId,
            offeringTitle,
            unitPrice,
            quantity,
            optionsTotal,
            lineTotal: subtotal,
            selectedOptions: body.items[0].selectedOptions || []
          }
        ],
        subtotal,
        fees: [],
        totalFees: 0,
        discounts: [],
        totalDiscount: 0,
        total,
        currency: 'UZS',
        expiresAt: new Date(Date.now() + ttlMs).toISOString(),
        parameters: body.parameters || {},
        items: body.items || []
      };
      quotesDb.set(quoteId, quoteObj);
      return sendJson(200, quoteObj);
    }

    // 7. POST /actions
    if (url.pathname === '/actions' && method === 'POST') {
      if (opts.flaw === 'unconfirmed_action_accepts') {
        // Intentionally accepts unconfirmed action!
      } else if (!body.userConfirmed) {
        return sendJson(400, { errorCode: 'ACTION_NOT_CONFIRMED', message: 'Action not confirmed by user' });
      }

      if (opts.flaw === 'unrelated_rejection_on_missing_field') {
        const customerReqs = opts.manifest?.requirements?.['ACTION_CREATE']?.customerRequirements || opts.manifest?.customerRequirements;
        if (customerReqs?.phone === 'REQUIRED' && !body.customer?.phone) {
          return sendJson(400, { errorCode: 'QUOTE_EXPIRED', message: 'Quote has expired' });
        }
      }

      const reqCheck = validateManifestRequirements(body, 'ACTION_CREATE');
      if (reqCheck) return sendJson(reqCheck.status, reqCheck.body);

      // Check quote existence
      if (opts.flaw === 'unknown_quote_accepts') {
        // Intentionally accepts unknown quote!
      } else if (!quotesDb.has(body.quoteId)) {
        return sendJson(404, { errorCode: 'QUOTE_NOT_FOUND', message: 'Quote not found' });
      }

      const quote = quotesDb.get(body.quoteId);
      if (quote) {
        // Check quote expiry
        const isExpired = Date.now() > Date.parse(quote.expiresAt);
        if (opts.flaw === 'expired_quote_accepts') {
          // Intentionally accepts expired quote!
        } else if (isExpired) {
          return sendJson(410, { errorCode: 'QUOTE_EXPIRED', message: 'Quote has expired' });
        }

        // Check quote-to-action match
        const isParameterOnly = opts.manifest?.requirements?.ACTION_CREATE?.inputMode === 'PARAMETERS';
        if (!isParameterOnly && body.items?.[0] && quote.items?.[0]) {
          if (body.items[0].quantity !== quote.items[0].quantity || body.items[0].offeringId !== quote.items[0].offeringId) {
            return sendJson(400, { errorCode: 'QUOTE_MISMATCH', message: 'Action items do not match quote' });
          }
        }
      }

      // Check Idempotency
      const idempKey = body.idempotencyKey;
      if (idempKey) {
        if (idempotencyDb.has(idempKey)) {
          const stored = idempotencyDb.get(idempKey);
          const payloadHash = crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');
          if (stored.payloadHash !== payloadHash) {
            if (opts.flaw === 'idempotency_collision_accepts') {
              // Intentionally accepts collision!
            } else {
              return sendJson(409, {
                errorCode: 'IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD',
                message: 'Idempotency key reused with different payload'
              });
            }
          }
          return sendJson(200, stored.action);
        }
      }

      const actionId = `act-${crypto.randomUUID().slice(0, 8)}`;
      const actionObj = {
        id: actionId,
        externalActionId: actionId,
        publicId: `ZY-${actionId.toUpperCase()}`,
        providerSlug: opts.slug,
        quoteId: body.quoteId,
        status: ActionStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PAID,
        currency: quote?.currency || 'UZS',
        total: quote?.total || 50000,
        subtotal: quote?.subtotal || 50000,
        lines: quote?.lines || [],
        parameters: body.parameters || {},
        customer: body.customer || {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (idempKey) {
        const payloadHash = crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');
        idempotencyDb.set(idempKey, { action: actionObj, payloadHash });
      }
      actionsDb.set(actionId, actionObj);

      sendJson(200, actionObj);

      // Trigger webhook callback if handler provided
      if (opts.onActionCreated) {
        setImmediate(() => {
          opts.onActionCreated?.(actionObj);
        });
      }
      return;
    }

    // 8. GET /actions/:id
    if (url.pathname.startsWith('/actions/') && method === 'GET') {
      const actionId = url.pathname.replace('/actions/', '');
      if (actionsDb.has(actionId)) {
        return sendJson(200, actionsDb.get(actionId));
      }
      return sendJson(404, { errorCode: 'ACTION_NOT_FOUND', message: 'Action not found' });
    }

    return sendJson(404, { error: 'Not found' });
  });

  return {
    server,
    async start(): Promise<string> {
      await new Promise<void>(resolve => server.listen(0, '127.0.0.1', () => resolve()));
      const port = (server.address() as any).port;
      return `http://127.0.0.1:${port}`;
    },
    async stop(): Promise<void> {
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  };
}

async function runTests() {
  const commonCapabilities = [
    ProviderCapability.METADATA,
    ProviderCapability.HEALTH,
    ProviderCapability.CATALOG,
    ProviderCapability.QUOTE,
    ProviderCapability.ACTION_CREATE,
    ProviderCapability.ACTION_STATUS,
    ProviderCapability.WEBHOOK
  ];

  // =========================================================================
  // DOMAIN 1: No Contact Required Provider (Digital Token / API credits)
  // =========================================================================
  console.log('--- Domain 1: No Contact Required Provider (e.g. Digital Token) ---');
  {
    const pipeline = new SimulatedWebhookPipeline();
    const mock = createMockProviderServer({
      slug: 'digital-token',
      name: 'Digital Token Service',
      apiKey: 'zy_key_domain_1',
      webhookSecret: 'zy_whsec_domain_1',
      capabilities: commonCapabilities,
      fulfillmentMode: ProviderFulfillmentMode.REMOTE,
      manifest: {
        version: 1,
        certification: { safeTestEnvironment: true },
        customerRequirements: {}, // Zero customer contact required!
        requirements: {
          QUOTE: { inputMode: 'OFFERING' },
          ACTION_CREATE: { inputMode: 'OFFERING', customerRequirements: {} }
        },
        certificationInput: { parameters: {} }
      },
      onActionCreated: (action) => {
        pipeline.dispatchWebhook('digital-token', 'zy_whsec_domain_1', action.id, ActionStatus.CONFIRMED);
      }
    });

    const baseUrl = await mock.start();
    try {
      const adapter = new RemoteHttpProviderAdapter({
        slug: 'digital-token',
        baseUrl,
        secret: 'zy_key_domain_1',
        webhookSecret: 'zy_whsec_domain_1',
        metadata: { capabilities: commonCapabilities }
      });
      const runner = new ProviderCertificationRunner(setupAdapterWithPipeline(adapter, pipeline));
      const report = await runner.runAllTests({
        mode: 'STRICT',
        verifyWebhookDelivery: async (actionIds, since) => pipeline.getEvidence('digital-token', actionIds, since)
      });

      if (!report.isCertified) {
        console.error('Domain 1 failed tests:', report.tests.filter(t => !t.passed));
      }
      assert.equal(report.isCertified, true, 'Digital token provider must be certified');
      assert.equal(report.isProductionReady, true, 'Digital token provider must be production ready');
      assert.equal(report.scope, 'AUTOMATED_INTEGRATION');
      assert.equal(report.operationalReviewRequired, true);
      assert.ok(report.tests.some(t => t.testId === 'webhook-delivery' && t.status === 'PASS'));
      console.log('  ✓ Domain 1 (No Contact) PASSED Strict Certification cleanly.');
    } finally {
      await mock.stop();
    }
  }

  // =========================================================================
  // DOMAIN 2: Email Only Provider (Software License / SaaS)
  // =========================================================================
  console.log('\n--- Domain 2: Email Only Provider (e.g. Software License) ---');
  {
    const pipeline = new SimulatedWebhookPipeline();
    const mock = createMockProviderServer({
      slug: 'saas-license',
      name: 'SaaS License Store',
      apiKey: 'zy_key_domain_2',
      webhookSecret: 'zy_whsec_domain_2',
      capabilities: commonCapabilities,
      fulfillmentMode: ProviderFulfillmentMode.REMOTE,
      manifest: {
        version: 1,
        certification: { safeTestEnvironment: true },
        customerRequirements: { email: 'REQUIRED' },
        requirements: {
          QUOTE: { inputMode: 'OFFERING' },
          ACTION_CREATE: { inputMode: 'OFFERING' }
        },
        certificationInput: {
          customer: { email: 'licensee@zayuno.uz' } // Email only, no phone or name!
        }
      },
      onActionCreated: (action) => {
        pipeline.dispatchWebhook('saas-license', 'zy_whsec_domain_2', action.id, ActionStatus.CONFIRMED);
      }
    });

    const baseUrl = await mock.start();
    try {
      const adapter = new RemoteHttpProviderAdapter({
        slug: 'saas-license',
        baseUrl,
        secret: 'zy_key_domain_2',
        webhookSecret: 'zy_whsec_domain_2',
        metadata: { capabilities: commonCapabilities }
      });
      const runner = new ProviderCertificationRunner(setupAdapterWithPipeline(adapter, pipeline));
      const report = await runner.runAllTests({
        mode: 'STRICT',
        verifyWebhookDelivery: async (actionIds, since) => pipeline.getEvidence('saas-license', actionIds, since)
      });

      assert.equal(report.isCertified, true, 'Email only provider must be certified');
      assert.equal(report.isProductionReady, true, 'Email only provider must be production ready');
      assert.ok(report.tests.some(t => t.testId === 'required-fields-ACTION_CREATE' && t.status === 'PASS'));
      console.log('  ✓ Domain 2 (Email Only) PASSED Strict Certification cleanly.');
    } finally {
      await mock.stop();
    }
  }

  // =========================================================================
  // DOMAIN 3: Date & Guest Count Provider (Table Reservation / Experience)
  // =========================================================================
  console.log('\n--- Domain 3: Date & Guest Count Provider (Table Reservation) ---');
  {
    const pipeline = new SimulatedWebhookPipeline();
    const mock = createMockProviderServer({
      slug: 'restaurant-booking',
      name: 'Table Reservation',
      apiKey: 'zy_key_domain_3',
      webhookSecret: 'zy_whsec_domain_3',
      capabilities: commonCapabilities,
      fulfillmentMode: ProviderFulfillmentMode.REMOTE,
      manifest: {
        version: 1,
        certification: { safeTestEnvironment: true },
        customerRequirements: { name: 'REQUIRED', phone: 'REQUIRED' },
        parametersSchema: {
          type: 'object',
          required: ['bookingDate', 'guestCount'],
          properties: {
            bookingDate: { type: 'string' },
            guestCount: { type: 'integer', minimum: 1, maximum: 20 }
          }
        },
        requirements: {
          QUOTE: { inputMode: 'OFFERING' },
          ACTION_CREATE: { inputMode: 'OFFERING' }
        },
        certificationInput: {
          customer: { name: 'Sardor', phone: '+998901234567' },
          parameters: { bookingDate: '2026-10-15', guestCount: 4 }
        }
      },
      onActionCreated: (action) => {
        pipeline.dispatchWebhook('restaurant-booking', 'zy_whsec_domain_3', action.id, ActionStatus.CONFIRMED);
      }
    });

    const baseUrl = await mock.start();
    try {
      const adapter = new RemoteHttpProviderAdapter({
        slug: 'restaurant-booking',
        baseUrl,
        secret: 'zy_key_domain_3',
        webhookSecret: 'zy_whsec_domain_3',
        metadata: { capabilities: commonCapabilities }
      });
      const runner = new ProviderCertificationRunner(setupAdapterWithPipeline(adapter, pipeline));
      const report = await runner.runAllTests({
        mode: 'STRICT',
        verifyWebhookDelivery: async (actionIds, since) => pipeline.getEvidence('restaurant-booking', actionIds, since)
      });

      assert.equal(report.isCertified, true, 'Booking provider must be certified');
      assert.equal(report.isProductionReady, true, 'Booking provider must be production ready');
      console.log('  ✓ Domain 3 (Date & Guest Count) PASSED Strict Certification cleanly.');
    } finally {
      await mock.stop();
    }
  }

  // =========================================================================
  // DOMAIN 4: Source & Destination Provider (Ride Hailing / Courier)
  // =========================================================================
  console.log('\n--- Domain 4: Source & Destination Provider (Ride Hailing) ---');
  {
    const pipeline = new SimulatedWebhookPipeline();
    const mock = createMockProviderServer({
      slug: 'ride-hail',
      name: 'Express Ride Service',
      apiKey: 'zy_key_domain_4',
      webhookSecret: 'zy_whsec_domain_4',
      capabilities: commonCapabilities,
      fulfillmentMode: ProviderFulfillmentMode.REMOTE,
      manifest: {
        version: 1,
        certification: { safeTestEnvironment: true },
        customerRequirements: { phone: 'REQUIRED' },
        supportedLocationRoles: [
          { role: 'pickup', required: true, title: 'Boshlang‘ich manzil' },
          { role: 'dropoff', required: true, title: 'Yetkazish manzili' }
        ],
        requirements: {
          QUOTE: { inputMode: 'OFFERING' },
          ACTION_CREATE: { inputMode: 'OFFERING' }
        },
        certificationInput: {
          customer: { phone: '+998901112233' },
          locations: [
            { role: 'pickup', address: { raw: 'Tashkent Airport', coordinates: { latitude: 41.257, longitude: 69.281 } } },
            { role: 'dropoff', address: { raw: 'Amir Timur Square', coordinates: { latitude: 41.311, longitude: 69.279 } } }
          ]
        }
      },
      onActionCreated: (action) => {
        pipeline.dispatchWebhook('ride-hail', 'zy_whsec_domain_4', action.id, ActionStatus.CONFIRMED);
      }
    });

    const baseUrl = await mock.start();
    try {
      const adapter = new RemoteHttpProviderAdapter({
        slug: 'ride-hail',
        baseUrl,
        secret: 'zy_key_domain_4',
        webhookSecret: 'zy_whsec_domain_4',
        metadata: { capabilities: commonCapabilities }
      });
      const runner = new ProviderCertificationRunner(setupAdapterWithPipeline(adapter, pipeline));
      const report = await runner.runAllTests({
        mode: 'STRICT',
        verifyWebhookDelivery: async (actionIds, since) => pipeline.getEvidence('ride-hail', actionIds, since)
      });

      assert.equal(report.isCertified, true, 'Ride provider must be certified');
      assert.equal(report.isProductionReady, true, 'Ride provider must be production ready');
      console.log('  ✓ Domain 4 (Source & Destination) PASSED Strict Certification cleanly.');
    } finally {
      await mock.stop();
    }
  }

  // =========================================================================
  // DOMAIN 5: Variants & Priced Options Provider (Apparel / Food)
  // =========================================================================
  console.log('\n--- Domain 5: Variants & Priced Options Provider (Apparel / Food) ---');
  {
    const pipeline = new SimulatedWebhookPipeline();
    const mock = createMockProviderServer({
      slug: 'burger-house',
      name: 'Burger House',
      apiKey: 'zy_key_domain_5',
      webhookSecret: 'zy_whsec_domain_5',
      capabilities: commonCapabilities,
      fulfillmentMode: ProviderFulfillmentMode.REMOTE,
      catalogData: {
        providerSlug: 'burger-house',
        categories: [{ id: 'burgers', slug: 'burgers', title: 'Burgers' }],
        offerings: [
          {
            id: 'cheese-burger',
            providerId: 'burger-house',
            offeringCode: 'CB-1',
            title: 'Cheeseburger',
            categorySlug: 'burgers',
            basePrice: 35000,
            currency: 'UZS',
            isAvailable: true,
            variants: [
              { id: 'size-single', name: 'Single Patty', basePrice: 35000, isAvailable: true },
              { id: 'size-double', name: 'Double Patty', basePrice: 50000, isAvailable: true }
            ],
            optionGroups: [
              {
                id: 'sauce-group',
                name: 'Souslar',
                isRequired: true,
                minSelections: 1,
                maxSelections: 2,
                options: [
                  { id: 'sauce-bbq', name: 'BBQ Sauce', priceDelta: 4000, isAvailable: true },
                  { id: 'sauce-garlic', name: 'Garlic Sauce', priceDelta: 4000, isAvailable: true }
                ]
              }
            ]
          }
        ]
      },
      manifest: {
        version: 1,
        certification: { safeTestEnvironment: true },
        customerRequirements: { name: 'REQUIRED', phone: 'REQUIRED' },
        requirements: {
          QUOTE: { inputMode: 'OFFERING' },
          ACTION_CREATE: { inputMode: 'OFFERING' }
        },
        certificationInput: {
          customer: { name: 'Aziz', phone: '+998909998877' }
        }
      },
      onActionCreated: (action) => {
        pipeline.dispatchWebhook('burger-house', 'zy_whsec_domain_5', action.id, ActionStatus.CONFIRMED);
      }
    });

    const baseUrl = await mock.start();
    try {
      const adapter = new RemoteHttpProviderAdapter({
        slug: 'burger-house',
        baseUrl,
        secret: 'zy_key_domain_5',
        webhookSecret: 'zy_whsec_domain_5',
        metadata: { capabilities: commonCapabilities }
      });
      const runner = new ProviderCertificationRunner(setupAdapterWithPipeline(adapter, pipeline));
      const report = await runner.runAllTests({
        mode: 'STRICT',
        verifyWebhookDelivery: async (actionIds, since) => pipeline.getEvidence('burger-house', actionIds, since)
      });

      assert.equal(report.isCertified, true, 'Burger house provider must be certified');
      assert.equal(report.isProductionReady, true, 'Burger house provider must be production ready');
      assert.ok(report.tests.some(t => t.testId === 'adversarial-option-quantity-math' && t.status === 'PASS'));
      assert.ok(report.tests.some(t => t.testId === 'upstream-unknown-variant' && t.status === 'PASS'));
      assert.ok(report.tests.some(t => t.testId === 'upstream-unknown-option' && t.status === 'PASS'));
      console.log('  ✓ Domain 5 (Variants & Options) PASSED Strict Certification cleanly.');
    } finally {
      await mock.stop();
    }
  }

  // =========================================================================
  // DOMAIN 6: Parameter-Only Provider (Utility Bill Payment / Tax Calculation)
  // =========================================================================
  console.log('\n--- Domain 6: Parameter-Only Provider (Utility Bill Payment) ---');
  {
    const pipeline = new SimulatedWebhookPipeline();
    const parameterOnlyCaps = [
      ProviderCapability.METADATA,
      ProviderCapability.HEALTH,
      ProviderCapability.CATALOG,
      ProviderCapability.QUOTE,
      ProviderCapability.ACTION_CREATE,
      ProviderCapability.ACTION_STATUS,
      ProviderCapability.WEBHOOK
    ];
    const mock = createMockProviderServer({
      slug: 'utility-bills',
      name: 'Utility Bill Payment',
      apiKey: 'zy_key_domain_6',
      webhookSecret: 'zy_whsec_domain_6',
      capabilities: parameterOnlyCaps,
      fulfillmentMode: ProviderFulfillmentMode.REMOTE,
      manifest: {
        version: 1,
        certification: { safeTestEnvironment: true },
        customerRequirements: {},
        parametersSchema: {
          type: 'object',
          required: ['accountNumber', 'utilityType'],
          properties: {
            accountNumber: { type: 'string' },
            utilityType: { type: 'string', enum: ['ELECTRIC', 'GAS', 'WATER'] }
          }
        },
        requirements: {
          QUOTE: { inputMode: 'PARAMETERS' },
          ACTION_CREATE: { inputMode: 'PARAMETERS', customerRequirements: {} }
        },
        certificationInput: {
          parameters: { accountNumber: 'ACC-123456', utilityType: 'ELECTRIC' }
        }
      },
      onActionCreated: (action) => {
        pipeline.dispatchWebhook('utility-bills', 'zy_whsec_domain_6', action.id, ActionStatus.CONFIRMED);
      }
    });

    const baseUrl = await mock.start();
    try {
      const adapter = new RemoteHttpProviderAdapter({
        slug: 'utility-bills',
        baseUrl,
        secret: 'zy_key_domain_6',
        webhookSecret: 'zy_whsec_domain_6',
        metadata: { capabilities: parameterOnlyCaps }
      });
      const runner = new ProviderCertificationRunner(setupAdapterWithPipeline(adapter, pipeline));
      const report = await runner.runAllTests({
        mode: 'STRICT',
        verifyWebhookDelivery: async (actionIds, since) => pipeline.getEvidence('utility-bills', actionIds, since)
      });

      assert.equal(report.isCertified, true, 'Parameter-only provider must be certified');
      assert.equal(report.isProductionReady, true, 'Parameter-only provider must be production ready');
      console.log('  ✓ Domain 6 (Parameter-Only) PASSED Strict Certification cleanly.');
    } finally {
      await mock.stop();
    }
  }

  // =========================================================================
  // DOMAIN 7: Read-Only Provider (Currency Exchange / Transit Schedule)
  // =========================================================================
  console.log('\n--- Domain 7: Read-Only Provider (Currency Exchange) ---');
  {
    const readOnlyCaps = [
      ProviderCapability.METADATA,
      ProviderCapability.HEALTH,
      ProviderCapability.CATALOG,
      ProviderCapability.SEARCH
    ];
    const mock = createMockProviderServer({
      slug: 'forex-rates',
      name: 'Forex Rates Feed',
      apiKey: 'zy_key_domain_7',
      webhookSecret: '',
      capabilities: readOnlyCaps,
      fulfillmentMode: ProviderFulfillmentMode.REMOTE,
      providerType: ProviderType.SERVICES,
      manifest: {
        version: 1,
        certification: { safeTestEnvironment: true },
        customerRequirements: {}
      }
    });

    const baseUrl = await mock.start();
    try {
      const adapter = new RemoteHttpProviderAdapter({
        slug: 'forex-rates',
        baseUrl,
        secret: 'zy_key_domain_7',
        metadata: { capabilities: readOnlyCaps }
      });
      const runner = new ProviderCertificationRunner(adapter);
      const report = await runner.runAllTests({ mode: 'STRICT' });

      assert.equal(report.isCertified, true, 'Read-only provider must be certified');
      assert.equal(report.isProductionReady, true, 'Read-only provider must be production ready');
      assert.equal(report.operationalReviewRequired, false, 'Read-only provider requires zero operational review');
      console.log('  ✓ Domain 7 (Read-Only) PASSED Strict Certification cleanly.');
    } finally {
      await mock.stop();
    }
  }

  // =========================================================================
  // ADVERSARIAL FLAWS: Deliberately Broken Invariants MUST FAIL
  // =========================================================================
  console.log('\n================================================================');
  console.log('🛡️ Testing Adversarial Flaws: Broken Invariants MUST FAIL');
  console.log('================================================================\n');

  async function testFlaw(flaw: MockServerOptions['flaw'], expectedFailedTestId: string, label: string) {
    const pipeline = new SimulatedWebhookPipeline();
    const mock = createMockProviderServer({
      slug: `broken-${flaw}`,
      name: `Broken Provider: ${flaw}`,
      apiKey: 'valid_key',
      webhookSecret: 'valid_whsec',
      capabilities: commonCapabilities,
      fulfillmentMode: ProviderFulfillmentMode.REMOTE,
      manifest: {
        version: 1,
        certification: { safeTestEnvironment: true },
        customerRequirements: { phone: 'REQUIRED' },
        requirements: { QUOTE: { inputMode: 'OFFERING' }, ACTION_CREATE: { inputMode: 'OFFERING' } },
        certificationInput: { customer: { phone: '+998901234567' } }
      },
      flaw,
      onActionCreated: (action) => {
        if (flaw === 'webhook_missing') return;
        if (flaw === 'webhook_unprocessed') {
          pipeline.dispatchWebhook(`broken-${flaw}`, 'valid_whsec', action.id, ActionStatus.CONFIRMED, { failProcessing: true });
          return;
        }
        pipeline.dispatchWebhook(`broken-${flaw}`, 'valid_whsec', action.id, ActionStatus.CONFIRMED);
      }
    });

    const baseUrl = await mock.start();
    try {
      const adapter = new RemoteHttpProviderAdapter({
        slug: `broken-${flaw}`,
        baseUrl,
        secret: 'valid_key',
        webhookSecret: 'valid_whsec',
        metadata: { capabilities: commonCapabilities }
      });
      const runner = new ProviderCertificationRunner(setupAdapterWithPipeline(adapter, pipeline));
      const report = await runner.runAllTests({
        mode: 'STRICT',
        verifyWebhookDelivery: async (actionIds, since) => {
          if (flaw === 'webhook_missing') return null;
          return pipeline.getEvidence(`broken-${flaw}`, actionIds, since);
        }
      });

      assert.equal(report.isCertified, false, `Provider with flaw ${flaw} must NOT be certified`);
      assert.equal(report.isProductionReady, false, `Provider with flaw ${flaw} must NOT be production ready`);
      const failedTest = report.tests.find(t => t.testId === expectedFailedTestId);
      assert.ok(failedTest && (failedTest.status === 'FAIL' || !failedTest.passed),
        `Flaw ${flaw} must fail test ${expectedFailedTestId}. Test results: ${JSON.stringify(report.tests.filter(t => !t.passed).map(t => ({ id: t.testId, err: t.error })))}`);
      console.log(`  ✓ Flaw "${label}" caught by test "${expectedFailedTestId}".`);
    } finally {
      await mock.stop();
    }
  }

  // 1. Missing Auth Accepts
  await testFlaw('auth_missing_accepts', 'auth-missing', 'Accepts request without API key');

  // 2. Invalid Auth Accepts
  await testFlaw('auth_invalid_accepts', 'auth-invalid', 'Accepts request with invalid API key');

  // 3. Missing safeTestEnvironment
  await testFlaw('safe_env_missing', 'metadata', 'Does not declare safeTestEnvironment=true in manifest');

  // 4. Missing required field accepted
  await testFlaw('missing_field_accepts', 'required-fields-ACTION_CREATE', 'Accepts action without required customer.phone');

  // 5. Unconfirmed action accepted
  await testFlaw('unconfirmed_action_accepts', 'upstream-unconfirmed-action', 'Accepts action when userConfirmed=false');

  // 6. Unknown quote accepted
  await testFlaw('unknown_quote_accepts', 'upstream-unknown-quote', 'Accepts action for non-existent quoteId');

  // 7. Idempotency collision accepted
  await testFlaw('idempotency_collision_accepts', 'upstream-idempotency-collision', 'Accepts same idempotencyKey with altered payload');

  // 8. Expired quote accepted
  await testFlaw('expired_quote_accepts', 'upstream-expired-quote', 'Accepts action for expired quote');

  // 9. Webhook missing / never delivered
  await testFlaw('webhook_missing', 'webhook-delivery', 'Never dispatches verified signed webhook for test action');

  // 10. Webhook received with valid signature but order processing fails (isProcessed: false)
  await testFlaw('webhook_unprocessed', 'webhook-delivery', 'Webhook received with valid HMAC but cannot be applied to database order (isProcessed=false)');

  // 11. Rejects missing required field with unrelated QUOTE_EXPIRED error
  await testFlaw('unrelated_rejection_on_missing_field', 'required-fields-ACTION_CREATE', 'Rejects missing field with unrelated QUOTE_EXPIRED error instead of field validation');

  console.log('\n================================================================');
  console.log('🎉 ALL 7 DOMAINS & ALL 11 ADVERSARIAL FLAWS PASSED AS EXPECTED!');
  console.log('================================================================\n');
}

runTests().catch(err => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
