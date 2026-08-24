import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NormalizedQuoteSchema } from '../packages/contracts/src/quote';
import { PaymentOptionSchema } from '../packages/contracts/src/payment';
import {
  PROVIDER_PROTOCOL_ENDPOINTS,
  createProviderOpenApiDocument,
  createProviderPostmanCollection
} from '../packages/contracts/src/provider-protocol';
import { validateProviderResponse, ProviderContractValidationError } from '../packages/provider-sdk/src/protocol-validation';

const root = resolve(import.meta.dirname, '..');
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');

const quote = PROVIDER_PROTOCOL_ENDPOINTS.find(endpoint => endpoint.id === 'quote');
const webhook = PROVIDER_PROTOCOL_ENDPOINTS.find(endpoint => endpoint.id === 'webhook');
const payment = PROVIDER_PROTOCOL_ENDPOINTS.find(endpoint => endpoint.id === 'payment-options');
assert.ok(quote && webhook && payment);
assert.equal((quote.responseExample as any).id, 'quote_123');
assert.ok(Array.isArray((quote.responseExample as any).lines));
assert.equal(webhook.direction, 'PROVIDER_TO_ZAYUNO');
assert.equal(webhook.path, '/api/v1/webhooks/:providerSlug');
assert.ok(Array.isArray(payment.responseExample));

assert.throws(() => NormalizedQuoteSchema.parse({ id: 'q', providerSlug: 'p', total: 1, expiresAt: new Date(Date.now() + 10000).toISOString() }));
assert.doesNotThrow(() => PaymentOptionSchema.array().parse(payment.responseExample));

try {
  validateProviderResponse('/quote', 'contract-quote', NormalizedQuoteSchema, { id: 'q' });
  assert.fail('Invalid production quote must be rejected.');
} catch (error) {
  assert.ok(error instanceof ProviderContractValidationError);
  assert.ok(error.issue.path.includes('providerSlug') || error.issue.path.includes('lines'));
}

const openapi = createProviderOpenApiDocument() as any;
assert.ok(openapi.paths['/quote']);
assert.equal(openapi.paths['/api/v1/webhooks/{providerSlug}'], undefined, 'Provider OpenAPI must not claim Zayuno ingestion as a provider-hosted endpoint.');
assert.ok(openapi['x-zayuno-webhook-ingestion']);
const postman = createProviderPostmanCollection() as any;
assert.ok(postman.item.some((item: any) => item.request.url.raw.includes('zayunoApiUrl')));

const wizard = read('apps/provider-portal/src/OnboardingWizard.tsx');
assert.ok(!/TRANSACTIONAL_MANDATORY_CAPABILITIES[\s\S]{0,500}PAYMENT_OPTIONS/.test(wizard), 'Optional payment capability must not be silently mandatory.');
assert.ok(wizard.includes('Event → Zayuno webhook URL'));
const docs = read('apps/provider-portal/src/DocsViewer.tsx');
assert.ok(docs.includes('OpenAPI 3.1'));
assert.ok(docs.includes('Postman'));
const cli = read('packages/cli/src/index.ts');
for (const command of ["command === 'init'", "command === 'doctor'", "command === 'test'", "command === 'dev'"]) assert.ok(cli.includes(command));
assert.ok(!cli.includes("command === 'deploy'"));

console.log('Canonical provider contract, production validation, artifacts, onboarding and CLI parity verified.');
