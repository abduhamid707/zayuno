import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import cors, { type CorsOptions } from 'cors';
import crypto from 'crypto';
import {
  ProviderCapability,
  ProviderStatus,
  ProviderType,
  type Catalog
} from '@zayuno/contracts';
import { HeadHunterClient } from './hh-client';

export interface HhServerConfig {
  clientId?: string;
  clientSecret?: string;
  userAgent?: string;
  apiKey?: string;
  port?: number;
  corsAllowedOrigins?: string;
}

export function createHhRecruitmentApp(customConfig: HhServerConfig = {}): Express {
  const app = express();

  // Credentials — env-only; no hardcoded fallbacks in production.
  // customConfig fields are accepted in test fixtures only.
  const clientId = customConfig.clientId || process.env.HH_CLIENT_ID || '';
  const clientSecret = customConfig.clientSecret || process.env.HH_CLIENT_SECRET || '';
  const userAgent = customConfig.userAgent || process.env.HH_USER_AGENT || 'Zayuno/1.0 (support@zayuno.uz)';
  const apiKey = customConfig.apiKey || process.env.PROVIDER_API_KEY || process.env.HH_PROVIDER_API_KEY || '';

  // Fail closed: refuse to start if required credentials are missing in production
  if (process.env.NODE_ENV === 'production') {
    if (!clientId || !clientSecret) {
      throw new Error('HH_CLIENT_ID and HH_CLIENT_SECRET environment variables are required in production.');
    }
    if (!apiKey) {
      throw new Error('PROVIDER_API_KEY (or HH_PROVIDER_API_KEY) environment variable is required in production.');
    }
  }

  const hhClient = new HeadHunterClient({
    clientId,
    clientSecret,
    userAgent
  });

  const allowedOrigins = new Set((customConfig.corsAllowedOrigins || process.env.CORS_ALLOWED_ORIGINS || [
    'https://zayuno.uz',
    'https://admin.zayuno.uz',
    'https://partners.zayuno.uz',
    'https://developers.zayuno.uz',
    'https://mcp.zayuno.uz'
  ].join(',')).split(',').map(v => v.trim()).filter(Boolean));

  const corsOptions: CorsOptions = {
    origin(origin, callback) {
      const localDev = process.env.NODE_ENV !== 'production' && !!origin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
      if (!origin || allowedOrigins.has(origin) || localDev) return callback(null, true);
      return callback(new Error('Origin is not allowed by CORS.'));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-provider-api-key', 'idempotency-key'],
    credentials: false,
    maxAge: 86400,
    optionsSuccessStatus: 204
  };

  app.use(cors(corsOptions));
  app.use((error: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (error instanceof Error && error.message === 'Origin is not allowed by CORS.') {
      return res.status(403).json({ message: error.message });
    }
    return next(error);
  });
  app.use(express.json());

  /**
   * Strict provider API key authentication middleware.
   * - /health is always public — no auth required.
   * - All other routes require x-provider-api-key or Authorization: Bearer <key>.
   * - Uses crypto.timingSafeEqual to prevent timing attacks.
   * - No includes(':') bypass or any other special-case shortcut.
   * - Missing or invalid key → 401 with a generic message (no key details in response).
   * - Always fail-closed: if PROVIDER_API_KEY is not configured, ALL requests return 401.
   */
  const auth = (req: Request, res: Response, next: () => void) => {
    const receivedKey = (
      req.header('x-provider-api-key') ||
      req.header('authorization')?.replace(/^Bearer\s+/i, '') ||
      ''
    ).trim();

    // Missing key → always 401
    if (!receivedKey) {
      return void res.status(401).json({ message: 'Invalid or missing provider API key.' });
    }

    // Fail-closed: if server has no configured API key, reject everything.
    // A misconfigured container must NOT become an open proxy.
    if (!apiKey) {
      return void res.status(401).json({ message: 'Invalid or missing provider API key.' });
    }

    // Timing-safe comparison to prevent side-channel timing attacks
    const expected = Buffer.from(apiKey);
    const received = Buffer.from(receivedKey);
    // Pad to equal length before comparison (timingSafeEqual requires same length)
    const maxLen = Math.max(expected.length, received.length);
    const paddedExpected = Buffer.concat([expected, Buffer.alloc(maxLen - expected.length)]);
    const paddedReceived = Buffer.concat([received, Buffer.alloc(maxLen - received.length)]);

    const isValid = crypto.timingSafeEqual(paddedExpected, paddedReceived) && expected.length === received.length;
    if (!isValid) {
      return void res.status(401).json({ message: 'Invalid or missing provider API key.' });
    }
    next();
  };

  // 1. Health check endpoint (No auth required)
  app.get('/health', async (_req: Request, res: Response) => {
    const result = await hhClient.checkHealth();
    return res.status(result.status === 'DOWN' ? 503 : 200).json({
      status: result.status,
      latencyMs: result.latencyMs,
      message: result.message,
      timestamp: new Date().toISOString()
    });
  });

  // Protect internal provider operations
  app.use(['/provider-info', '/locations', '/catalog', '/offerings', '/search'], auth);

  // 2. Provider Info Metadata
  app.get('/provider-info', (_req: Request, res: Response) => {
    res.json({
      id: 'hh-uz',
      slug: 'hh-uz',
      name: 'HeadHunter Uzbekistan Jobs',
      description: 'HeadHunter (hh.uz) — O‘zbekistondagi eng yirik rasmiy ish va vakansiyalar qidiruv platformasi.',
      status: ProviderStatus.ACTIVE,
      type: ProviderType.SERVICES,
      category: 'recruitment',
      geography: ['UZ', 'Tashkent', 'Samarkand', 'Bukhara', 'Fergana'],
      adapterType: 'remote-http',
      authMethod: 'API_KEY',
      capabilities: [
        ProviderCapability.METADATA,
        ProviderCapability.HEALTH,
        ProviderCapability.LOCATIONS,
        ProviderCapability.CATALOG,
        ProviderCapability.SEARCH
      ],
      baseUrl: 'https://hh.uz',
      isCertified: true,
      isPublished: true,
      metadata: {
        provider: 'HeadHunter',
        officialSite: 'https://hh.uz',
        isReadOnly: true,
        supportContact: {
          phone: '+998712000000',
          email: 'support@hh.uz',
          workingHours: '24/7',
          supportUrl: 'https://hh.uz'
        }
      }
    });
  });

  // 3. Locations
  app.get('/locations', (_req: Request, res: Response) => {
    res.json(hhClient.getStandardLocations());
  });

  // 4. Catalog
  app.get('/catalog', async (req: Request, res: Response) => {
    try {
      const category = req.query.category ? String(req.query.category) : '';
      const locationId = req.query.locationId ? String(req.query.locationId) : undefined;
      const categories = hhClient.getStandardCategories();

      // Resolve area ID if provided
      let area: string | undefined = undefined;
      if (locationId) {
        const matchedLoc = hhClient.getStandardLocations().find(l => l.id === locationId || l.providerLocationId === locationId);
        if (matchedLoc && matchedLoc.providerLocationId !== 'remote') {
          area = matchedLoc.providerLocationId;
        }
      }

      // Fetch featured offerings from HH
      const searchResult = await hhClient.searchVacancies({
        text: category ? category.replace(/-/g, ' ') : undefined,
        area,
        perPage: 20
      });

      const catalog: Catalog = {
        providerSlug: 'hh-uz',
        locationId,
        categories,
        offerings: searchResult.offerings,
        version: '1.0.0',
        updatedAt: new Date().toISOString()
      };

      return res.json(catalog);
    } catch (err: any) {
      return res.status(500).json({ message: `Failed to load catalog: ${err.message}` });
    }
  });

  // 5. Single Offering Inspection
  app.get('/offerings/:id', async (req: Request, res: Response) => {
    try {
      const rawId = String(req.params.id || '').replace(/^hh_/, '');
      const item = await hhClient.getVacancy(rawId);
      if (!item) {
        return res.status(404).json({ message: 'Vacancy offering not found on HeadHunter.' });
      }
      return res.json(item);
    } catch (err: any) {
      return res.status(500).json({ message: `Failed to retrieve offering: ${err.message}` });
    }
  });

  // 6. Real-time Search
  app.get('/search', async (req: Request, res: Response) => {
    try {
      const q = String(req.query.q || req.query.query || req.query.text || '').trim();
      const locationId = req.query.locationId ? String(req.query.locationId) : undefined;
      const salaryMin = req.query.salaryMin || req.query.salary ? Number(req.query.salaryMin || req.query.salary) : undefined;
      const currency = req.query.currency ? String(req.query.currency).toUpperCase() : undefined;
      const onlyWithSalary = req.query.onlyWithSalary === 'true' || req.query.only_with_salary === 'true';
      const experience = req.query.experience ? String(req.query.experience) : undefined;
      const schedule = req.query.schedule ? String(req.query.schedule) : undefined;
      const limit = Number(req.query.limit || 20);

      // Resolve area ID
      let area: string | undefined = undefined;
      if (locationId) {
        const matchedLoc = hhClient.getStandardLocations().find(l => l.id === locationId || l.providerLocationId === locationId);
        if (matchedLoc && matchedLoc.providerLocationId !== 'remote') {
          area = matchedLoc.providerLocationId;
        }
      }

      const searchResult = await hhClient.searchVacancies({
        text: q || undefined,
        area,
        salary: salaryMin,
        currency,
        onlyWithSalary,
        experience,
        schedule,
        perPage: limit
      });

      return res.json(searchResult.offerings);
    } catch (err: any) {
      return res.status(500).json({ message: `Failed to search vacancies: ${err.message}` });
    }
  });

  return app;
}
