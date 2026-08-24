import crypto from 'crypto';
import http from 'http';
import { createMockEvosApp } from '../integrations/mock-evos/src/server';
import { ProviderCapability } from '../packages/contracts/src/provider';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const providerPort = 4401;
  const webhookPort = 4400;
  const sharedSecret = 'local_mock_evos_test_secret';
  let receivedWebhook: { body: string; signature: string } | undefined;

  process.env.NODE_ENV = 'test';
  process.env.PROVIDER_API_KEY = sharedSecret;
  process.env.ZAYUNO_WEBHOOK_SECRET = sharedSecret;
  process.env.ZAYUNO_API_URL = `http://127.0.0.1:${webhookPort}`;
  process.env.MOCK_EVOS_CHECKOUT_BASE_URL = 'https://checkout.mock-provider.example';
  process.env.PROVIDER_SLUG = 'mock-evos';

  const webhookServer = http.createServer((req, res) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      receivedWebhook = { body, signature: String(req.headers['x-provider-signature'] || '') };
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end('{"success":true}');
    });
  });
  const providerServer = createMockEvosApp().listen(providerPort, '127.0.0.1');

  await Promise.all([
    new Promise<void>(resolve => webhookServer.listen(webhookPort, '127.0.0.1', resolve)),
    new Promise<void>(resolve => providerServer.once('listening', resolve))
  ]);

  const providerBase = `http://127.0.0.1:${providerPort}`;
  const headers = { 'content-type': 'application/json', 'x-provider-api-key': sharedSecret };

  try {
    const catalogResponse = await fetch(`${providerBase}/catalog`, { headers });
    assert(catalogResponse.ok, 'Catalog request failed.');
    const catalog: any = await catalogResponse.json();
    assert(catalog.providerSlug === 'mock-evos', 'Unexpected provider slug.');
    assert(catalog.offerings.length >= 3, 'Mock catalog is incomplete.');

    const quoteResponse = await fetch(`${providerBase}/quote`, {
      method: 'POST', headers,
      body: JSON.stringify({
        providerSlug: 'mock-evos',
        locationId: 'mock-evos-chilonzor',
        items: [{ offeringId: 'mock_burger_double', quantity: 1 }],
        fulfillmentType: 'STANDARD',
        destination: { raw: 'Tashkent sandbox address' }
      })
    });
    assert(quoteResponse.ok, 'Quote request failed.');
    const quote: any = await quoteResponse.json();
    assert(quote.total === 47000, `Unexpected quote total: ${quote.total}`);

    const baseAction = {
      idempotencyKey: 'mock-evos-e2e-idempotency-key',
      providerSlug: 'mock-evos',
      quoteId: quote.id,
      locationId: 'mock-evos-chilonzor',
      items: [{ offeringId: 'mock_burger_double', quantity: 1 }],
      customer: { name: 'Sandbox User', phone: '+998901234567' },
      destination: { raw: 'Tashkent sandbox address' },
      fulfillmentType: 'STANDARD',
      paymentMethod: 'payme'
    };

    const unconfirmed = await fetch(`${providerBase}/actions`, {
      method: 'POST', headers,
      body: JSON.stringify({ ...baseAction, idempotencyKey: 'unconfirmed-key', userConfirmed: false })
    });
    assert(unconfirmed.status === 400, 'Unconfirmed action was not rejected.');

    const createResponse = await fetch(`${providerBase}/actions`, {
      method: 'POST', headers: { ...headers, 'idempotency-key': baseAction.idempotencyKey },
      body: JSON.stringify({ ...baseAction, userConfirmed: true })
    });
    assert(createResponse.status === 201, 'Confirmed action was not created.');
    const action: any = await createResponse.json();
    assert(action.status === 'AWAITING_PAYMENT', 'Action is not awaiting payment.');
    assert(action.nextAction.url.startsWith('https://checkout.mock-provider.example/pay/'), 'Checkout URL is not provider-owned.');
    assert(!action.nextAction.url.includes('zayuno'), 'Checkout URL unexpectedly contains Zayuno.');

    const duplicateResponse = await fetch(`${providerBase}/actions`, {
      method: 'POST', headers: { ...headers, 'idempotency-key': baseAction.idempotencyKey },
      body: JSON.stringify({ ...baseAction, userConfirmed: true })
    });
    const duplicate: any = await duplicateResponse.json();
    assert(duplicate.id === action.id, 'Idempotent replay created a different action.');

    const checkoutPath = new URL(action.nextAction.url).pathname;
    const checkoutResponse = await fetch(`${providerBase}${checkoutPath}`);
    assert(checkoutResponse.ok && (await checkoutResponse.text()).includes('SANDBOX DEMO'), 'Checkout page did not render.');

    const paymentResponse = await fetch(`${providerBase}${checkoutPath}/simulate-success`, {
      method: 'POST', redirect: 'manual'
    });
    assert(paymentResponse.status === 303, 'Mock payment did not redirect after success.');
    assert(receivedWebhook, 'Mock payment did not dispatch a webhook.');
    const expectedSignature = crypto.createHmac('sha256', sharedSecret).update(receivedWebhook.body).digest('hex');
    assert(receivedWebhook.signature === expectedSignature, 'Webhook HMAC signature is invalid.');

    const updatedResponse = await fetch(`${providerBase}/actions/${action.externalActionId}`, { headers });
    const updated: any = await updatedResponse.json();
    assert(updated.paymentStatus === 'PAID', 'Mock payment status was not updated.');
    assert(updated.status === 'CONFIRMED', 'Mock action was not confirmed after payment.');

    // A cancellation is terminal: an old checkout URL must never be able to
    // turn the same action into PAID/CONFIRMED afterwards.
    const cancellationQuoteResponse = await fetch(`${providerBase}/quote`, {
      method: 'POST', headers,
      body: JSON.stringify({
        providerSlug: 'mock-evos', locationId: 'mock-evos-chilonzor',
        items: [{ offeringId: 'mock_drink', quantity: 1 }],
        fulfillmentType: 'STANDARD', destination: { raw: 'Tashkent sandbox address' }
      })
    });
    const cancellationQuote: any = await cancellationQuoteResponse.json();
    const cancellationActionResponse = await fetch(`${providerBase}/actions`, {
      method: 'POST', headers: { ...headers, 'idempotency-key': 'cancelled-action-key' },
      body: JSON.stringify({ ...baseAction, idempotencyKey: 'cancelled-action-key', quoteId: cancellationQuote.id, items: [{ offeringId: 'mock_drink', quantity: 1 }], userConfirmed: true })
    });
    assert(cancellationActionResponse.status === 201, 'Cancellation test action was not created.');
    const cancellationAction: any = await cancellationActionResponse.json();
    const cancellationPath = new URL(cancellationAction.nextAction.url).pathname;
    const cancelled = await fetch(`${providerBase}${cancellationPath}/cancel`, { method: 'POST', redirect: 'manual' });
    assert(cancelled.status === 303, 'Sandbox cancellation did not redirect.');
    const afterCancellationPayment = await fetch(`${providerBase}${cancellationPath}/simulate-success`, { method: 'POST', redirect: 'manual' });
    assert(afterCancellationPayment.status === 409, 'Cancelled action accepted a payment transition.');
    // Certification runner verification against Mock EVOS
    const { RemoteHttpProviderAdapter } = await import('../packages/provider-sdk/src/remote-http-adapter.ts');
    const { ProviderCertificationRunner } = await import('../packages/provider-sdk/src/certification.ts');
    const remoteAdapter = new RemoteHttpProviderAdapter({
      slug: 'mock-evos',
      baseUrl: providerBase,
      secret: sharedSecret,
      webhookSecret: sharedSecret,
      metadata: { capabilities: Object.values(ProviderCapability) }
    });

    const certRunner = new ProviderCertificationRunner(remoteAdapter);
    const certReport = await certRunner.runAllTests();
    assert(certReport.isCertified, `Mock EVOS certification failed: ${certReport.tests.filter(t => !t.passed).map(t => t.error).join('; ')}`);
    assert(certReport.failedCount === 0, 'Mock EVOS must have 0 failed certification tests.');

    console.log('Mock EVOS E2E passed: catalog, quote, confirmation, idempotency, provider checkout, HMAC webhook, payment status, terminal-state protection, and automated capability certification.');
  } finally {
    await Promise.all([
      new Promise<void>(resolve => providerServer.close(() => resolve())),
      new Promise<void>(resolve => webhookServer.close(() => resolve()))
    ]);
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
