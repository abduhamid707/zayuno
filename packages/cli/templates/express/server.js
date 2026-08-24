import express from 'express';

const app = express();
app.use(express.json());

const auth = (req, res, next) => {
  const expected = process.env.PROVIDER_API_KEY;
  if (!expected || req.header('x-provider-api-key') === expected) {
    return next();
  }
  return res.status(401).json({ message: 'Invalid provider API key.' });
};

const sampleOffering = {
  id: 'service-1',
  providerId: 'my-provider',
  offeringCode: 'service-1',
  title: 'Example service',
  categorySlug: 'services',
  basePrice: 10000,
  currency: 'UZS',
  isAvailable: true
};

app.get('/health', (_req, res) => res.json({ status: 'HEALTHY', latencyMs: 1, timestamp: new Date().toISOString() }));

app.get('/provider-info', auth, (_req, res) => res.json({
  id: 'my-provider',
  slug: 'my-provider',
  name: 'My Provider',
  status: 'DRAFT',
  type: 'SERVICES',
  category: 'services',
  geography: ['UZ'],
  adapterType: 'remote-http',
  authMethod: 'API_KEY',
  capabilities: ['METADATA', 'HEALTH', 'CATALOG']
}));

app.get('/catalog', auth, (_req, res) => res.json({
  providerSlug: 'my-provider',
  categories: [{ id: 'services', slug: 'services', title: 'Services', displayOrder: 0 }],
  offerings: [sampleOffering]
}));

app.get('/offerings/:id', auth, (req, res) => {
  if (req.params.id === 'service-1') {
    return res.json(sampleOffering);
  }
  return res.status(404).json({ message: 'Offering not found.' });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`Provider listening on ${port}`));
