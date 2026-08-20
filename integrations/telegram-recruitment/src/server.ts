import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import {
  ProviderCapability,
  ProviderStatus,
  ProviderType,
  Catalog,
  AvailabilityResult,
  CheckAvailabilityInput
} from '@zayuno/contracts';
import { TelegramRecruitmentFeedService, RECRUITMENT_CATEGORIES } from './feed.js';

export function createTelegramRecruitmentApp(): Express {
  const app = express();
  app.disable('x-powered-by');

  const apiKey = process.env.PROVIDER_API_KEY || '';
  const feedService = new TelegramRecruitmentFeedService();

  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-provider-api-key', 'idempotency-key']
  }));

  app.use(express.json());

  const auth = (req: Request, res: Response, next: NextFunction) => {
    if (!apiKey) return next();
    const token = req.headers['x-provider-api-key'] || req.headers['authorization']?.replace(/^Bearer\s+/i, '');
    if (token !== apiKey) {
      res.status(401).json({ error: 'Unauthorized: Invalid provider API key.' });
      return;
    }
    next();
  };

  // Health
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'UP',
      service: 'telegram-recruitment-provider',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      channel: 'UstozShogird'
    });
  });

  // Metadata / Provider Info
  app.get('/provider-info', auth, (_req: Request, res: Response) => {
    res.json({
      slug: 'ustoz-shogird',
      name: 'UstozShogird Recruitment Feed',
      status: ProviderStatus.ACTIVE,
      type: ProviderType.SERVICES,
      capabilities: [
        ProviderCapability.METADATA,
        ProviderCapability.HEALTH,
        ProviderCapability.CATALOG,
        ProviderCapability.SEARCH
      ],
      description: 'Real-time IT candidates and job vacancies indexed from public Telegram channels (UstozShogird).',
      config: {
        authMethod: 'API_KEY',
        channel: '@UstozShogird',
        supportContact: {
          telegram: '@UstozShogird',
          supportUrl: 'https://t.me/UstozShogird'
        }
      }
    });
  });

  // Catalog
  app.get('/catalog', auth, async (req: Request, res: Response) => {
    try {
      const category = req.query.category as string | undefined;
      const contextRaw = req.query.context as string | undefined;
      let contextParams: any = {};
      if (contextRaw) {
        try { contextParams = JSON.parse(contextRaw); } catch {}
      }

      const offerings = await feedService.searchOfferings({
        category: category || contextParams.listingType || contextParams.category,
        skills: contextParams.skills,
        location: contextParams.location,
        minSalary: contextParams.minSalary || contextParams.salaryMin,
        limit: 50
      }, 'ustoz-shogird');

      const catalog: Catalog = {
        providerSlug: 'ustoz-shogird',
        categories: RECRUITMENT_CATEGORIES,
        offerings,
        version: '1.0',
        updatedAt: new Date().toISOString()
      };

      res.json(catalog);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to get catalog' });
    }
  });

  // Search Offerings (GET & POST) - MUST be defined before /offerings/:id
  const handleSearch = async (req: Request, res: Response) => {
    try {
      const query = (req.query.q || req.body?.query || '') as string;
      const category = (req.query.category || req.body?.categorySlug || req.body?.category) as string | undefined;
      const limit = parseInt(req.query.limit as string || req.body?.limit || '20', 10);
      
      let contextParams: any = {};
      const contextRaw = req.query.context as string | undefined;
      if (contextRaw) {
        try { contextParams = JSON.parse(contextRaw); } catch {}
      }
      if (req.body?.parameters) {
        contextParams = { ...contextParams, ...req.body.parameters };
      }

      const offerings = await feedService.searchOfferings({
        query,
        category: category || contextParams.listingType || contextParams.category,
        skills: contextParams.skills || (contextParams.skill ? [contextParams.skill] : undefined),
        location: contextParams.location,
        minSalary: contextParams.minSalary || contextParams.salaryMin,
        limit
      }, 'ustoz-shogird');

      res.json(offerings);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Search failed' });
    }
  };

  app.get('/offerings/search', auth, handleSearch);
  app.post('/offerings/search', auth, handleSearch);

  // Offering Details
  app.get('/offerings/:id', auth, async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const offerings = await feedService.searchOfferings({ limit: 100 }, 'ustoz-shogird');
      const found = offerings.find(o => o.id === id || o.offeringCode === id);
      if (!found) {
        res.status(404).json({ error: `Offering "${id}" not found in recruitment feed.` });
        return;
      }
      res.json(found);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to fetch offering' });
    }
  });

  // Availability (all public listings are active until deleted)
  app.post('/availability', auth, async (req: Request, res: Response) => {
    const input: CheckAvailabilityInput = req.body;
    const items = input.items || [];
    const result: AvailabilityResult = {
      isAvailable: true,
      availableItems: items.map((item: any) => ({
        offeringId: item.offeringId,
        variantId: item.variantId,
        requestedQuantity: item.quantity || 1,
        remainingCapacity: 1,
        unitPrice: 0,
        currency: 'UZS',
        metadata: {}
      })),
      unavailableItems: [],
      parameters: input.parameters || {},
      checkedAt: new Date().toISOString()
    };
    res.json(result);
  });

  return app;
}
