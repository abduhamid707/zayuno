import express, { Request, Response, Express } from 'express';
import cors from 'cors';
import { SandboxProviderAdapter } from './sandbox-adapter';

export interface SandboxMockInstance {
  app: Express;
  adapter: SandboxProviderAdapter;
}

export function createSandboxMockApp(port = 4001): SandboxMockInstance {
  const app: Express = express();
  app.use(cors());
  app.use(express.json());

  const adapter = new SandboxProviderAdapter({
    slug: 'sandbox-provider',
    baseUrl: `http://localhost:${port}`,
    secret: 'sandbox_secret_token_live_xyz_987654',
    webhookSecret: 'zy_webhook_secret_sandbox_key_123'
  });

  // Health
  app.get('/health', async (_req: Request, res: Response) => {
    res.json(await adapter.checkHealth());
  });

  // Metadata
  app.get('/api/v1/info', async (_req: Request, res: Response) => {
    res.json(await adapter.getProviderInfo());
  });

  // Locations
  app.get('/api/v1/locations', async (_req: Request, res: Response) => {
    res.json(await adapter.getLocations());
  });

  // Catalog
  app.get('/api/v1/catalog', async (req: Request, res: Response) => {
    res.json(await adapter.getCatalog({
      providerSlug: 'sandbox-provider',
      categorySlug: typeof req.query.category === 'string' ? req.query.category : undefined,
      locationId: typeof req.query.locationId === 'string' ? req.query.locationId : undefined
    }));
  });

  // Offering
  app.get('/api/v1/offerings/:id', async (req: Request, res: Response) => {
    try {
      const offeringId = String(req.params.id);
      res.json(await adapter.getOffering({
        providerSlug: 'sandbox-provider',
        offeringId
      }));
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  });

  // Search
  app.get('/api/v1/search', async (req: Request, res: Response) => {
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const limit = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : 20;
    res.json(await adapter.searchOfferings({
      providerSlug: 'sandbox-provider',
      query: q,
      limit
    }));
  });

  // Quote
  app.post('/api/v1/quotes', async (req: Request, res: Response) => {
    try {
      res.json(await adapter.requestQuote(req.body));
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Actions
  app.post('/api/v1/actions', async (req: Request, res: Response) => {
    try {
      res.json(await adapter.createAction(req.body));
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/v1/actions/:id', async (req: Request, res: Response) => {
    try {
      const actionId = String(req.params.id);
      res.json(await adapter.getAction({ actionId }));
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  });

  app.post('/api/v1/actions/:id/cancel', async (req: Request, res: Response) => {
    try {
      const actionId = String(req.params.id);
      res.json(await adapter.cancelAction({
        actionId,
        reason: req.body.reason
      }));
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/v1/actions/:id/payment-options', async (req: Request, res: Response) => {
    const actionId = String(req.params.id);
    res.json(await adapter.getPaymentOptions({
      providerSlug: 'sandbox-provider',
      actionId
    }));
  });

  return { app, adapter };
}

if (require.main === module) {
  const PORT = parseInt(process.env.PORT || '4001', 10);
  const { app } = createSandboxMockApp(PORT);
  app.listen(PORT, () => {
    console.log(`🚀 Sandbox Provider Mock Server listening on http://localhost:${PORT}`);
  });
}
