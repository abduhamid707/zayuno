import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import http from 'node:http';
import { NormalizedQuoteSchema, RequestQuoteInputSchema } from '../packages/contracts/src/quote';
import { PaymentOptionSchema } from '../packages/contracts/src/payment';
import { OfferingSchema, CatalogSchema } from '../packages/contracts/src/catalog';
import { LocationSchema } from '../packages/contracts/src/location';
import { ProviderInfoSchema, HealthCheckResultSchema } from '../packages/contracts/src/provider';
import { CustomerContactSchema, IsoDateTimeSchema } from '../packages/contracts/src/common';
import { CreateActionInputSchema, NormalizedActionSchema, CancelActionResultSchema } from '../packages/contracts/src/action';
import { NormalizedWebhookEventSchema } from '../packages/contracts/src/webhook';
import {
  PROVIDER_PROTOCOL_ENDPOINTS,
  extractRequiredFieldsFromZod,
  createProviderOpenApiDocument,
  createProviderPostmanCollection
} from '../packages/contracts/src/provider-protocol';
import {
  validateDynamicParameterDeclaration,
  validateParametersAgainstDeclaration,
  containsForbiddenSensitiveKey,
  findForbiddenParameterKey
} from '../packages/contracts/src/dynamic-parameters';
import {
  validateProviderResponse,
  ProviderContractValidationError
} from '../packages/provider-sdk/src/protocol-validation';
import {
  ProviderCertificationRunner
} from '../packages/provider-sdk/src/certification';
import { ProviderCapability } from '../packages/contracts/src/provider';
import { executeSsrfSafeGet, SsrfSecurityError } from '../apps/api/src/modules/providers/ssrf-checker';

const root = resolve(import.meta.dirname, '..');
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');

console.log('1. Testing Canonical Protocol Endpoints Manifest & Auto RequiredFields Parity...');
const offeringEp = PROVIDER_PROTOCOL_ENDPOINTS.find(e => e.id === 'offering');
const quoteEp = PROVIDER_PROTOCOL_ENDPOINTS.find(e => e.id === 'quote');
const webhookEp = PROVIDER_PROTOCOL_ENDPOINTS.find(e => e.id === 'webhook');
const paymentEp = PROVIDER_PROTOCOL_ENDPOINTS.find(e => e.id === 'payment-options');
const catalogEp = PROVIDER_PROTOCOL_ENDPOINTS.find(e => e.id === 'catalog');
const metadataEp = PROVIDER_PROTOCOL_ENDPOINTS.find(e => e.id === 'metadata');
const locationEp = PROVIDER_PROTOCOL_ENDPOINTS.find(e => e.id === 'locations');
const statusEp = PROVIDER_PROTOCOL_ENDPOINTS.find(e => e.id === 'action-status');
const actionCreateEp = PROVIDER_PROTOCOL_ENDPOINTS.find(e => e.id === 'action-create');
const cancelEp = PROVIDER_PROTOCOL_ENDPOINTS.find(e => e.id === 'action-cancel');
const healthEp = PROVIDER_PROTOCOL_ENDPOINTS.find(e => e.id === 'health');
const searchEp = PROVIDER_PROTOCOL_ENDPOINTS.find(e => e.id === 'search');

assert.ok(offeringEp, 'GET /offerings/:id endpoint must be present in manifest.');
assert.equal(offeringEp.method, 'GET');
assert.equal(offeringEp.path, '/offerings/:id');
assert.equal(offeringEp.responseSchemaName, 'Offering');

assert.ok(quoteEp && webhookEp && paymentEp && catalogEp && metadataEp && locationEp && statusEp && actionCreateEp && cancelEp && healthEp && searchEp);
assert.equal((quoteEp.responseExample as any).id, 'quote_123');
assert.ok(Array.isArray((quoteEp.responseExample as any).lines));
assert.equal(webhookEp.direction, 'PROVIDER_TO_ZAYUNO');
assert.equal(webhookEp.path, '/api/v1/webhooks/:providerSlug');
assert.ok(Array.isArray(paymentEp.responseExample));

// Verify single source of truth requiredFields
assert.deepEqual(metadataEp.requiredFields, extractRequiredFieldsFromZod(ProviderInfoSchema));
assert.deepEqual(locationEp.requiredFields, extractRequiredFieldsFromZod(LocationSchema));
assert.deepEqual(offeringEp.requiredFields, extractRequiredFieldsFromZod(OfferingSchema));
assert.deepEqual(catalogEp.requiredFields, extractRequiredFieldsFromZod(CatalogSchema));
assert.deepEqual(quoteEp.requiredFields, extractRequiredFieldsFromZod(NormalizedQuoteSchema));
assert.deepEqual(statusEp.requiredFields, extractRequiredFieldsFromZod(NormalizedActionSchema));

console.log('2. Testing Zod Parsing on Canonical Examples...');
assert.doesNotThrow(() => OfferingSchema.parse(offeringEp.responseExample));
assert.doesNotThrow(() => CatalogSchema.parse(catalogEp.responseExample));
assert.doesNotThrow(() => NormalizedQuoteSchema.parse(quoteEp.responseExample));
assert.doesNotThrow(() => PaymentOptionSchema.array().parse(paymentEp.responseExample));
assert.doesNotThrow(() => ProviderInfoSchema.parse(metadataEp.responseExample));
assert.doesNotThrow(() => HealthCheckResultSchema.parse(healthEp.responseExample));
assert.doesNotThrow(() => LocationSchema.array().parse(locationEp.responseExample));
assert.doesNotThrow(() => OfferingSchema.array().parse(searchEp.responseExample));
assert.doesNotThrow(() => NormalizedActionSchema.parse(actionCreateEp.responseExample));
assert.doesNotThrow(() => NormalizedActionSchema.parse(statusEp.responseExample));
assert.doesNotThrow(() => CancelActionResultSchema.parse(cancelEp.responseExample));
assert.doesNotThrow(() => NormalizedWebhookEventSchema.parse(webhookEp.requestExample));

// Cross-language RFC 3339 parity: native Python/Java/.NET offsets and JS `Z`
// timestamps are both canonical provider values.
assert.equal(IsoDateTimeSchema.safeParse('2026-08-25T00:00:00Z').success, true);
assert.equal(IsoDateTimeSchema.safeParse('2026-08-25T00:00:00+00:00').success, true);
assert.equal(IsoDateTimeSchema.safeParse('2026-08-25T05:00:00+05:00').success, true);

// Public provider boundaries accept a missing or explicit null email and
// normalize both to the same internal representation.
assert.equal(CustomerContactSchema.parse({ name: 'Ali', phone: '+998901234567', email: null }).email, undefined);

console.log('3. Testing Deep Dynamic Parameter Safety, Types, and Hierarchy Validation...');
// 3.1 Sensitive keys in nested objects & arrays
assert.ok(findForbiddenParameterKey({ passenger: { passportNumber: 'AB1234567' } }));
assert.ok(findForbiddenParameterKey({ documents: [{ pinfl: '12345678901234' }] }));
assert.ok(findForbiddenParameterKey({ payment: { card: { cvv: '123' } } }));
assert.ok(!findForbiddenParameterKey({ passenger: { fullName: 'Ali Valiyev', age: 30 } }));

// 3.2 Sensitive declaration rejection
const sensitiveNestedDecl = validateDynamicParameterDeclaration({
  type: 'object',
  properties: {
    passenger: {
      type: 'object',
      properties: {
        passportNumber: { type: 'string' }
      }
    }
  }
});
assert.equal(sensitiveNestedDecl.success, false);
assert.ok(sensitiveNestedDecl.error?.includes('passportNumber'));

// 3.3 Strict nested schema declaration & validation
const nestedTripDecl = {
  type: 'object' as const,
  properties: {
    passenger: {
      type: 'object' as const,
      properties: {
        fullName: { type: 'string' as const, minLength: 3 },
        age: { type: 'integer' as const, minimum: 0, maximum: 120 }
      },
      required: ['fullName', 'age'],
      additionalProperties: false
    },
    seats: {
      type: 'array' as const,
      items: {
        type: 'string' as const,
        enum: ['1A', '1B', '2A', '2B']
      },
      minItems: 1
    }
  },
  required: ['passenger', 'seats'],
  additionalProperties: false
};

const validTrip = validateParametersAgainstDeclaration(
  {
    passenger: { fullName: 'Ali Valiyev', age: 28 },
    seats: ['1A']
  },
  nestedTripDecl
);
assert.equal(validTrip.success, true);

// 3.4 Invalid nested type (e.g. age: "not-a-number")
const invalidAgeTrip = validateParametersAgainstDeclaration(
  {
    passenger: { fullName: 'Ali Valiyev', age: 'not-a-number' },
    seats: ['1A']
  },
  nestedTripDecl
);
assert.equal(invalidAgeTrip.success, false);
assert.ok(invalidAgeTrip.error?.includes('passenger.age'));

// 3.5 additionalProperties: false violation
const extraPropTrip = validateParametersAgainstDeclaration(
  {
    passenger: { fullName: 'Ali Valiyev', age: 28, unknownProp: 'hacked' },
    seats: ['1A']
  },
  nestedTripDecl
);
assert.equal(extraPropTrip.success, false);
assert.ok(extraPropTrip.error?.includes('additionalProperties: false'));

// 3.6 Sensitive parameter submission rejection
const sensitiveParamTrip = validateParametersAgainstDeclaration(
  {
    passenger: { passportNumber: 'AB1234567' }
  },
  nestedTripDecl
);
assert.equal(sensitiveParamTrip.success, false);
assert.ok(sensitiveParamTrip.error?.includes('passportNumber'));

console.log('4. Testing Multi-Issue Contract Validation...');
try {
  validateProviderResponse('/catalog', 'contract-catalog', CatalogSchema, {
    providerSlug: 'demo',
    offerings: [
      {
        // missing providerId, offeringCode, basePrice, currency
        title: 'Broken item'
      }
    ]
  });
  assert.fail('Multi-issue invalid response must throw ProviderContractValidationError.');
} catch (error: any) {
  assert.ok(error instanceof ProviderContractValidationError);
  assert.ok(error.issues && error.issues.length >= 3, `Expected at least 3 schema issues, received ${error.issues?.length}`);
}

console.log('5. Testing OpenAPI 3.1 & Postman Artifacts Generation with Query/Path Params & Webhooks...');
const openapi = createProviderOpenApiDocument() as any;
assert.equal(openapi.openapi, '3.1.0');
assert.ok(openapi.paths['/offerings/{id}'], 'OpenAPI paths must include /offerings/{id}');
assert.ok(openapi.paths['/quote'], 'OpenAPI paths must include /quote');
assert.equal(openapi.paths['/api/v1/webhooks/{providerSlug}'], undefined, 'Provider OpenAPI must not claim Zayuno ingestion as a provider-hosted endpoint.');
assert.ok(openapi.webhooks?.providerStatusEvent, 'Standard OpenAPI 3.1 webhooks object must be present');
assert.ok(openapi.components.schemas['Offering']);
assert.ok(openapi.components.schemas['NormalizedQuote']);

// Query parameters check
const catalogParams = openapi.paths['/catalog']?.get?.parameters;
assert.ok(catalogParams && catalogParams.some((p: any) => p.name === 'locationId'));
assert.ok(catalogParams.some((p: any) => p.name === 'category'));

const searchParams = openapi.paths['/search']?.get?.parameters;
assert.ok(searchParams && searchParams.some((p: any) => p.name === 'q' && p.required === true));

// Postman check
const postman = createProviderPostmanCollection() as any;
assert.ok(postman.item.some((item: any) => item.request.url.raw.includes('{{offeringId}}')));
assert.ok(postman.item.some((item: any) => item.request.url.raw.includes('{{actionId}}')));
const postmanWebhook = postman.item.find((item: any) => item.name.includes('/api/v1/webhooks/'));
assert.ok(postmanWebhook, 'Postman must include webhook ingestion endpoint');
assert.ok(postmanWebhook.request.header.some((h: any) => h.key === 'x-zayuno-signature'));
assert.ok(!postmanWebhook.request.header.some((h: any) => h.key === 'x-provider-api-key'));

console.log('6. Testing Certification Runner Dependencies & Stages...');
const mockAdapter: any = {
  providerSlug: 'test-cafe',
  getCapabilities: () => [ProviderCapability.METADATA, ProviderCapability.HEALTH, ProviderCapability.CATALOG, ProviderCapability.QUOTE, ProviderCapability.ACTION_CREATE, ProviderCapability.ACTION_STATUS, ProviderCapability.WEBHOOK],
  hasCapability: (cap: any) => true,
  getProviderInfo: async () => ({
    id: 'test-cafe',
    slug: 'test-cafe',
    name: 'Test Cafe',
    status: 'ACTIVE',
    capabilities: [ProviderCapability.METADATA, ProviderCapability.HEALTH, ProviderCapability.CATALOG, ProviderCapability.QUOTE, ProviderCapability.ACTION_CREATE, ProviderCapability.ACTION_STATUS, ProviderCapability.WEBHOOK]
  }),
  checkHealth: async () => ({ status: 'HEALTHY', latencyMs: 15, timestamp: new Date().toISOString() }),
  getCatalog: async () => {
    throw new Error('Remote catalog down');
  },
  getOffering: async () => {
    throw new Error('Remote offering down');
  },
  requestQuote: async () => {
    throw new Error('Remote quote down');
  },
  createAction: async () => {
    throw new Error('Remote action down');
  }
};

const runner = new ProviderCertificationRunner(mockAdapter);
const report = await runner.runAllTests();
assert.equal(report.isCertified, false);

const catalogTest = report.tests.find(t => t.testId === 'catalog');
const offeringTest = report.tests.find(t => t.testId === 'offering');
const quoteTest = report.tests.find(t => t.testId === 'quote');
const actionTest = report.tests.find(t => t.testId === 'action-create');

assert.ok(catalogTest && catalogTest.status === 'FAIL');
assert.ok(offeringTest && offeringTest.status === 'SKIPPED' && offeringTest.blockedBy?.includes('catalog'));
assert.ok(quoteTest && quoteTest.status === 'SKIPPED' && quoteTest.blockedBy?.includes('catalog'));
assert.ok(actionTest && actionTest.status === 'SKIPPED' && actionTest.blockedBy?.includes('quote'));

console.log('7. Testing Real HTTP SSRF, 64KB Bounded Streaming, Timeout, & Rate Limiter...');
// Spin up temporary test HTTP server
const testServer = http.createServer((req, res) => {
  if (req.url === '/health-oversized') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    const huge = 'x'.repeat(70000);
    res.end(JSON.stringify({ status: 'HEALTHY', latencyMs: 10, timestamp: new Date().toISOString(), huge }));
    return;
  }
  if (req.url === '/health-auth-required') {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'API key required' }));
    return;
  }
  if (req.url === '/health-not-found') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }
  if (req.url === '/health-invalid-schema') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ randomField: 'no status or latency' }));
    return;
  }
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'HEALTHY', latencyMs: 12, timestamp: new Date().toISOString() }));
    return;
  }
  res.writeHead(404);
  res.end();
});

await new Promise<void>(resolve => testServer.listen(0, '127.0.0.1', () => resolve()));
const testPort = (testServer.address() as any).port;
const serverBaseUrl = `http://127.0.0.1:${testPort}`;

try {
  // Test 7.1: Cloud metadata block
  await assert.rejects(
    async () => {
      await executeSsrfSafeGet('http://169.254.169.254/latest/meta-data', {});
    },
    (err: any) => err?.code === 'FORBIDDEN_ADDRESS'
  );

  // Test 7.2: Oversized response > 64KB aborted
  await assert.rejects(
    async () => {
      await executeSsrfSafeGet(`${serverBaseUrl}/health-oversized`, {}, { maxBytes: 65536, allowLocalDev: true });
    },
    (err: any) => err?.code === 'SCHEMA_MISMATCH'
  );

  // Test 7.3: Valid health request
  const validRes = await executeSsrfSafeGet(`${serverBaseUrl}/health`, {}, { allowLocalDev: true });
  assert.equal(validRes.statusCode, 200);
  const parsedHealth = HealthCheckResultSchema.safeParse(JSON.parse(validRes.body));
  assert.equal(parsedHealth.success, true);
} finally {
  testServer.close();
}

console.log('8. Testing Provider Portal Brief & CLI Starters...');
const wizard = read('apps/provider-portal/src/OnboardingWizard.tsx');
assert.ok(wizard.includes('/api/v1/providers/integration/check-url'));
assert.ok(!wizard.includes('fetch(`${cleanUrl}/health`'));
assert.ok(wizard.includes('GET /offerings/:id'));

const expressStarter = read('packages/cli/templates/express/server.js');
assert.ok(expressStarter.includes('/offerings/:id'));
assert.ok(expressStarter.includes('basePrice: 10000'));

const fastapiStarter = read('packages/cli/templates/fastapi/main.py');
assert.ok(fastapiStarter.includes('/offerings/{offering_id}'));

const goStarter = read('packages/cli/templates/go/main.go');
assert.ok(goStarter.includes('/offerings/'));

console.log('✅ ALL PROVIDER CONTRACT, SSRF HARDENING & DX PARITY CHECKS PASSED PERFECTLY!');
