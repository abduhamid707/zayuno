import assert from 'node:assert/strict';
import http from 'node:http';
import { ProviderCapability } from '../packages/contracts/src/provider.ts';
import {
  buildAgentErrorEnvelope,
  NotFoundError,
  ProviderIntegrationError
} from '../packages/shared/src/errors.ts';
import { CapabilityNotSupportedError } from '../packages/provider-sdk/src/errors.ts';
import { RemoteHttpProviderAdapter } from '../packages/provider-sdk/src/remote-http-adapter.ts';
import { AllExceptionsFilter } from '../apps/api/src/common/filters/http-exception.filter.ts';
import { CatalogService } from '../apps/api/src/modules/catalog/catalog.service.ts';
import { registerZayunoTools } from '../apps/mcp/src/tools.ts';

async function listen(server: http.Server): Promise<number> {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Test HTTP server did not bind.');
  return address.port;
}

async function close(server: http.Server): Promise<void> {
  if (!server.listening) return;
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

async function main() {
  const providerMissing = buildAgentErrorEnvelope(new NotFoundError('Provider', 'does-not-exist'));
  assert.equal(providerMissing.errorCode, 'PROVIDER_NOT_FOUND');
  assert.equal(providerMissing.retryable, false);
  assert.equal(providerMissing.recommendedAction, 'DISCOVER_PROVIDER');

  const unsupported = new CapabilityNotSupportedError('catalog-only', ProviderCapability.SEARCH);
  const unsupportedEnvelope = buildAgentErrorEnvelope(unsupported);
  assert.equal(unsupportedEnvelope.errorCode, 'CAPABILITY_NOT_SUPPORTED');
  assert.equal(unsupportedEnvelope.retryable, false);
  assert.equal(unsupportedEnvelope.recommendedAction, 'USE_CATALOG');

  const filter = new AllExceptionsFilter();
  let apiPayload: any;
  const response = {
    status: (statusCode: number) => ({
      json: (payload: any) => {
        apiPayload = { statusCode, ...payload };
      }
    })
  };
  filter.catch(unsupported, {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => ({ method: 'GET', url: '/api/v1/search', headers: {} })
    })
  } as any);
  assert.equal(apiPayload.statusCode, 400);
  assert.equal(apiPayload.errorCode, 'CAPABILITY_NOT_SUPPORTED');
  assert.equal(apiPayload.retryable, false);
  assert.equal(apiPayload.recommendedAction, 'USE_CATALOG');
  assert.equal(apiPayload.details, undefined);

  let redactedApiPayload: any;
  const redactedResponse = {
    status: (statusCode: number) => ({
      json: (payload: any) => {
        redactedApiPayload = { statusCode, ...payload };
      }
    })
  };
  filter.catch(
    new ProviderIntegrationError(
      'redaction-provider',
      'upstream rejected key secret-provider-token',
      502,
      { responseBody: { token: 'secret-provider-token' } }
    ),
    {
      switchToHttp: () => ({
        getResponse: () => redactedResponse,
        getRequest: () => ({ method: 'GET', url: '/api/v1/catalog', headers: {} })
      })
    } as any
  );
  assert.equal(redactedApiPayload.errorCode, 'PROVIDER_UNAVAILABLE');
  assert.equal(redactedApiPayload.message, redactedApiPayload.customerMessage);
  assert.doesNotMatch(JSON.stringify(redactedApiPayload), /secret-provider-token/i);
  assert.equal(redactedApiPayload.details, undefined);

  const registered = new Map<string, any>();
  registerZayunoTools({
    registerTool: (name: string, _definition: any, handler: any) => registered.set(name, handler)
  }, {
    searchCatalog: async () => { throw unsupported; }
  } as any);
  const mcpError = await registered.get('search_catalog')({ providerSlug: 'catalog-only', query: 'tea' });
  assert.equal(mcpError.isError, true);
  assert.equal(mcpError.structuredContent.errorCode, 'CAPABILITY_NOT_SUPPORTED');
  assert.equal(mcpError.structuredContent.retryable, false);
  assert.equal(mcpError.structuredContent.recommendedAction, 'USE_CATALOG');

  const catalogAdapter = {
    hasCapability: (capability: ProviderCapability) => capability === ProviderCapability.CATALOG,
    getCatalog: async () => ({
      providerSlug: 'catalog-only',
      categories: [],
      offerings: [
        {
          id: 'tea-green', providerId: 'catalog-only', offeringCode: 'tea-green', title: 'Green Tea',
          description: 'Fresh green tea', categorySlug: 'drinks', basePrice: 12_000, currency: 'UZS'
        },
        {
          id: 'coffee-latte', providerId: 'catalog-only', offeringCode: 'coffee-latte', title: 'Latte',
          description: 'Coffee with milk', categorySlug: 'drinks', basePrice: 18_000, currency: 'UZS'
        }
      ]
    })
  };
  const cache = new Map<string, string>();
  const catalog = new CatalogService(
    {
      assertAndGetCapability: async (_slug: string, capability: ProviderCapability) => {
        if (capability === ProviderCapability.SEARCH) throw unsupported;
        if (capability === ProviderCapability.CATALOG) return catalogAdapter;
        throw new Error(`Unexpected capability: ${capability}`);
      }
    } as any,
    {
      assertProviderPublished: async () => undefined,
      assertProviderCapabilityEligible: async () => undefined,
      getProviderBySlug: async () => ({ metadata: {} })
    } as any,
    {
      get: async (key: string) => cache.get(key) || null,
      set: async (key: string, value: string) => void cache.set(key, value),
      acquireLock: async () => true,
      releaseLock: async () => undefined,
      delByPattern: async () => 0
    } as any
  );
  await assert.rejects(
    () => catalog.searchOfferings('catalog-only', 'green tea', 'drinks', 'main-store', 10),
    (error: any) => error?.code === 'CAPABILITY_NOT_SUPPORTED' && error?.details?.capability === ProviderCapability.SEARCH,
    'A provider without declared SEARCH must never silently fall back to CATALOG.',
  );
  const catalogOnlyResult = await catalog.getCatalog('catalog-only');
  assert.deepEqual(catalogOnlyResult.offerings.map((item) => item.id), ['tea-green', 'coffee-latte']);

  const originalNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  const capabilityServer = http.createServer((request, response) => {
    const path = new URL(request.url || '/', 'http://provider.test').pathname;
    response.setHeader('content-type', 'application/json');
    if (path === '/catalog') {
      return response.end(JSON.stringify({
        providerSlug: 'json-error-provider',
        categories: [],
        offerings: [{
          id: 'green-tea', providerId: 'json-error-provider', offeringCode: 'GREEN_TEA', title: 'Green Tea',
          categorySlug: 'drinks', basePrice: 12_000, currency: 'UZS'
        }]
      }));
    }
    if (path === '/availability' || path === '/search' || path.startsWith('/offerings/')) {
      return response.writeHead(404).end(JSON.stringify({ error: 'Not Found' }));
    }
    if (path === '/auth/catalog') {
      return response.writeHead(401).end(JSON.stringify({ code: 'UNAUTHORIZED' }));
    }
    return response.writeHead(404).end(JSON.stringify({ error: 'Not Found' }));
  });
  const slowResponseTimers = new Set<ReturnType<typeof setTimeout>>();
  const slowBodyServer = http.createServer((request, response) => {
    const path = new URL(request.url || '/', 'http://provider.test').pathname;
    if (path !== '/catalog') return response.writeHead(404).end();
    response.writeHead(200, { 'content-type': 'application/json' });
    response.flushHeaders();
    const timer = setTimeout(() => {
      slowResponseTimers.delete(timer);
      response.end(JSON.stringify({ providerSlug: 'slow-provider', categories: [], offerings: [] }));
    }, 2_500);
    slowResponseTimers.add(timer);
    response.once('close', () => {
      clearTimeout(timer);
      slowResponseTimers.delete(timer);
    });
  });

  try {
    const capabilityPort = await listen(capabilityServer);
    const remoteAdapter = new RemoteHttpProviderAdapter({
      slug: 'json-error-provider',
      baseUrl: `http://127.0.0.1:${capabilityPort}`,
      metadata: { capabilities: [ProviderCapability.CATALOG, ProviderCapability.SEARCH] }
    });
    const remoteCatalog = new CatalogService(
      {
        assertAndGetCapability: async (_slug: string, capability: ProviderCapability) => {
          if (capability === ProviderCapability.CATALOG || capability === ProviderCapability.SEARCH) return remoteAdapter;
          throw new CapabilityNotSupportedError('json-error-provider', capability);
        }
      } as any,
      {
        assertProviderPublished: async () => undefined,
        assertProviderCapabilityEligible: async () => undefined,
        getProviderBySlug: async () => ({ metadata: {} })
      } as any,
      {
        get: async () => null,
        set: async () => undefined,
        acquireLock: async () => true,
        releaseLock: async () => undefined,
        delByPattern: async () => 0
      } as any
    );

    const fallbackMatches = await remoteCatalog.searchOfferings(
      'json-error-provider',
      'green tea',
      'drinks',
      undefined,
      10,
    );
    assert.deepEqual(fallbackMatches.map((item) => item.id), ['green-tea']);
    const remoteCatalogResult = await remoteCatalog.getCatalog('json-error-provider');
    assert.deepEqual(remoteCatalogResult.offerings.map((item) => item.id), ['green-tea']);

    const availability = await remoteAdapter.checkAvailability({
      providerSlug: 'json-error-provider',
      items: [{ offeringId: 'green-tea', quantity: 1, selectedOptions: [] }]
    });
    assert.equal(availability.availabilityStatus, 'NOT_SUPPORTED');
    assert.equal(availability.isAvailable, null);

    await assert.rejects(
      () => remoteAdapter.getOffering({ providerSlug: 'json-error-provider', offeringId: 'missing' }),
      (error: any) => error?.code === 'OFFERING_NOT_FOUND' && error?.statusCode === 404
    );

    const authAdapter = new RemoteHttpProviderAdapter({
      slug: 'json-error-provider',
      baseUrl: `http://127.0.0.1:${capabilityPort}/auth`,
      metadata: { capabilities: [ProviderCapability.CATALOG] }
    });
    await assert.rejects(
      () => authAdapter.getCatalog({ providerSlug: 'json-error-provider' }),
      (error: any) => error?.code === 'PROVIDER_AUTHENTICATION_ERROR' && error?.statusCode === 502
    );

    const slowPort = await listen(slowBodyServer);
    const slowAdapter = new RemoteHttpProviderAdapter({
      slug: 'slow-provider',
      baseUrl: `http://127.0.0.1:${slowPort}`,
      timeoutMs: 1_000,
      metadata: { capabilities: [ProviderCapability.CATALOG] }
    });
    const startedAt = Date.now();
    await assert.rejects(
      () => slowAdapter.getCatalog({ providerSlug: 'slow-provider' }),
      (error: any) => error?.code === 'PROVIDER_TIMEOUT' && error?.statusCode === 504
    );
    assert.ok(Date.now() - startedAt < 2_000, 'Timeout must cover body consumption, not only response headers.');
  } finally {
    for (const timer of slowResponseTimers) clearTimeout(timer);
    await Promise.all([close(capabilityServer), close(slowBodyServer)]);
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  }

  console.log('Typed error taxonomy, MCP envelope, remote capability fallback, and full-response timeout passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
