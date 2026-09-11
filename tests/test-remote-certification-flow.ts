import assert from 'node:assert/strict';
import http from 'node:http';
import {
  ProviderCapability,
  ProviderFulfillmentMode,
  ProviderStatus,
  ProviderType
} from '../packages/contracts/src/provider';
import { RemoteHttpProviderAdapter } from '../packages/provider-sdk/src/remote-http-adapter';
import { ProviderCertificationRunner } from '../packages/provider-sdk/src/certification';

console.log('🧪 Starting Remote Fulfillment Mode Certification Tests...');

// 1. Setup a lightweight mock server that mimics an external third-party provider API (like Yes Cofe)
// Crucially, its /provider-info returns type: DELIVERY, but DOES NOT return fulfillmentMode.
const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  res.setHeader('Content-Type', 'application/json');

  if (url.pathname === '/provider-info') {
    res.writeHead(200);
    res.end(JSON.stringify({
      id: 'yes-cofe',
      slug: 'yes-cofe',
      name: 'Yes Cofe',
      status: ProviderStatus.ACTIVE,
      type: ProviderType.DELIVERY, // Food Delivery type
      // Notice: NO fulfillmentMode property here!
      capabilities: [
        ProviderCapability.METADATA,
        ProviderCapability.HEALTH,
        ProviderCapability.CATALOG,
        ProviderCapability.QUOTE,
        ProviderCapability.ACTION_CREATE,
        ProviderCapability.ACTION_STATUS,
        ProviderCapability.WEBHOOK
      ]
    }));
    return;
  }

  if (url.pathname === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'HEALTHY',
      latencyMs: 5,
      timestamp: new Date().toISOString()
    }));
    return;
  }

  if (url.pathname === '/catalog') {
    res.writeHead(200);
    res.end(JSON.stringify({
      providerSlug: 'yes-cofe',
      categories: [{ id: 'coffee', slug: 'coffee', title: 'Kofe', displayOrder: 1 }],
      offerings: [
        {
          id: 'latte',
          providerId: 'yes-cofe',
          offeringCode: 'LATTE',
          title: 'Caffe Latte',
          description: 'Mazali issiq kofe',
          categorySlug: 'coffee',
          categoryTitle: 'Kofe',
          basePrice: 25000,
          currency: 'UZS',
          isAvailable: true,
          variants: [],
          optionGroups: [],
          tags: ['coffee'],
          metadata: {}
        }
      ],
      version: '1.0.0',
      updatedAt: new Date().toISOString()
    }));
    return;
  }

  if (url.pathname === '/offerings/latte' || url.pathname === '/offerings/LATTE') {
    res.writeHead(200);
    res.end(JSON.stringify({
      id: 'latte',
      providerId: 'yes-cofe',
      offeringCode: 'LATTE',
      title: 'Caffe Latte',
      description: 'Mazali issiq kofe',
      categorySlug: 'coffee',
      categoryTitle: 'Kofe',
      basePrice: 25000,
      currency: 'UZS',
      isAvailable: true,
      variants: [],
      optionGroups: [],
      tags: ['coffee'],
      metadata: {}
    }));
    return;
  }

  if (url.pathname === '/quote') {
    res.writeHead(200);
    res.end(JSON.stringify({
      id: 'quote-123',
      providerSlug: 'yes-cofe',
      lines: [
        {
          offeringId: 'latte',
          offeringTitle: 'Caffe Latte',
          unitPrice: 25000,
          quantity: 1,
          optionsTotal: 0,
          lineTotal: 25000,
          selectedOptions: []
        }
      ],
      subtotal: 25000,
      fees: [],
      totalFees: 0,
      discounts: [],
      totalDiscount: 0,
      total: 25000,
      currency: 'UZS',
      expiresAt: new Date(Date.now() + 600000).toISOString(),
      parameters: {}
    }));
    return;
  }

  if (url.pathname === '/actions' && req.method === 'POST') {
    res.writeHead(200);
    res.end(JSON.stringify({
      id: 'act-123',
      publicId: 'ZY-ACT-123456',
      providerSlug: 'yes-cofe',
      providerName: 'Yes Cofe',
      status: 'CONFIRMED',
      paymentStatus: 'PENDING',
      lines: [
        {
          offeringId: 'latte',
          offeringTitle: 'Caffe Latte',
          unitPrice: 25000,
          quantity: 1,
          optionsTotal: 0,
          lineTotal: 25000,
          selectedOptions: []
        }
      ],
      subtotal: 25000,
      fees: 0,
      discount: 0,
      total: 25000,
      currency: 'UZS',
      customer: { name: 'Hurmatli Mijoz', phone: '+998901234567' },
      parameters: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      events: []
    }));
    return;
  }

  if (url.pathname.startsWith('/actions/')) {
    res.writeHead(200);
    res.end(JSON.stringify({
      id: 'act-123',
      publicId: 'ZY-ACT-123456',
      providerSlug: 'yes-cofe',
      providerName: 'Yes Cofe',
      status: 'CONFIRMED',
      paymentStatus: 'PENDING',
      lines: [
        {
          offeringId: 'latte',
          offeringTitle: 'Caffe Latte',
          unitPrice: 25000,
          quantity: 1,
          optionsTotal: 0,
          lineTotal: 25000,
          selectedOptions: []
        }
      ],
      subtotal: 25000,
      fees: 0,
      discount: 0,
      total: 25000,
      currency: 'UZS',
      customer: { name: 'Hurmatli Mijoz', phone: '+998901234567' },
      parameters: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      events: []
    }));
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

await new Promise<void>(resolve => server.listen(0, '127.0.0.1', () => resolve()));
const port = (server.address() as any).port;
const baseUrl = `http://127.0.0.1:${port}`;

try {
  // Test A: RemoteHttpProviderAdapter with configured fulfillmentMode = REMOTE
  console.log('  [1/3] Testing RemoteHttpProviderAdapter getProviderInfo fallback to configured REMOTE...');
  const remoteAdapter = new RemoteHttpProviderAdapter({
    slug: 'yes-cofe',
    baseUrl,
    secret: 'test-secret',
    webhookSecret: 'zy_whsec_test_secret_123456',
    metadata: {
      fulfillmentMode: ProviderFulfillmentMode.REMOTE,
      capabilities: [
        ProviderCapability.METADATA,
        ProviderCapability.HEALTH,
        ProviderCapability.CATALOG,
        ProviderCapability.QUOTE,
        ProviderCapability.ACTION_CREATE,
        ProviderCapability.ACTION_STATUS,
        ProviderCapability.WEBHOOK
      ]
    }
  });

  const info = await remoteAdapter.getProviderInfo();
  assert.equal(info.fulfillmentMode, ProviderFulfillmentMode.REMOTE, 'Adapter must default fulfillmentMode from config metadata');
  console.log('    ✓ getProviderInfo correctly populated fulfillmentMode: REMOTE.');

  // Test B: ProviderCertificationRunner with configured fulfillmentMode = REMOTE
  console.log('  [2/3] Running ProviderCertificationRunner for Food Delivery provider with REMOTE mode...');
  const runner = new ProviderCertificationRunner(remoteAdapter);
  const report = await runner.runAllTests();

  assert.equal(report.fulfillmentMode, ProviderFulfillmentMode.REMOTE, 'Report must reflect REMOTE fulfillment mode');
  if (!report.isProductionReady) {
    console.log('Failed tests:', report.tests.filter(t => !t.passed).map(t => ({ id: t.testId, name: t.name, status: t.status, error: t.error })));
  }
  assert.equal(report.isProductionReady, true, `Report must be production ready. Missing: ${report.missingMandatoryCapabilities.join(', ')}`);
  assert.equal(
    report.missingMandatoryCapabilities.includes(ProviderCapability.LOCATIONS),
    false,
    'LOCATIONS must NOT be required for REMOTE fulfillment mode'
  );
  assert.equal(
    report.tests.some(t => t.testId === 'discovery-readiness'),
    false,
    'discovery-readiness failure must NOT be generated for REMOTE fulfillment mode'
  );
  assert.equal(report.discoveryReadiness.isReady, true, 'discoveryReadiness.isReady must be true');
  console.log('    ✓ Food Delivery provider with REMOTE mode successfully passed certification without LOCATIONS.');

  // Test C: Contrast with configured fulfillmentMode = DELIVERY (where LOCATIONS IS required)
  console.log('  [3/3] Verifying that physical DELIVERY mode STILL requires LOCATIONS...');
  const deliveryAdapter = new RemoteHttpProviderAdapter({
    slug: 'yes-cofe',
    baseUrl,
    secret: 'test-secret',
    webhookSecret: 'zy_whsec_test_secret_123456',
    metadata: {
      fulfillmentMode: ProviderFulfillmentMode.DELIVERY,
      capabilities: [
        ProviderCapability.METADATA,
        ProviderCapability.HEALTH,
        ProviderCapability.CATALOG,
        ProviderCapability.QUOTE,
        ProviderCapability.ACTION_CREATE,
        ProviderCapability.ACTION_STATUS,
        ProviderCapability.WEBHOOK
      ]
    }
  });

  const deliveryRunner = new ProviderCertificationRunner(deliveryAdapter);
  const deliveryReport = await deliveryRunner.runAllTests();
  assert.equal(deliveryReport.isProductionReady, false, 'DELIVERY mode without LOCATIONS must NOT be production ready');
  assert.equal(
    deliveryReport.missingMandatoryCapabilities.includes(ProviderCapability.LOCATIONS),
    true,
    'LOCATIONS MUST be required for physical DELIVERY mode'
  );
  assert.equal(
    deliveryReport.tests.some(t => t.testId === 'discovery-readiness' && t.status === 'FAIL'),
    true,
    'discovery-readiness MUST fail for physical DELIVERY mode without LOCATIONS'
  );
  console.log('    ✓ Physical DELIVERY mode correctly enforces LOCATIONS requirement.');

  console.log('\n🎉 ALL REMOTE FULFILLMENT MODE CERTIFICATION TESTS PASSED CLEANLY!\n');
} finally {
  server.close();
}
