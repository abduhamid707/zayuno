import crypto from 'node:crypto';
import {
  Injectable,
  ForbiddenException,
  UnauthorizedException,
  NotFoundException,
  InternalServerErrorException,
  HttpException,
  HttpStatus
} from '@nestjs/common';
import { RequestQuoteInput, CreateActionInput } from '@zayuno/contracts';
import { QuotesService } from '../quotes/quotes.service';
import { ActionsService } from '../actions/actions.service';
import { RedisService } from '../../common/services/redis.service';
import { prisma } from '@zayuno/database';

// Ephemeral in-memory secret generated once per process for development/testing when no env secret is supplied.
// This prevents ANY predictable hardcoded secrets in source code while allowing dev/test to function.
const DEV_EPHEMERAL_SECRET = crypto.randomBytes(32).toString('hex');
const SESSION_TTL_SECONDS = 15 * 60; // 15 minutes (900 seconds)
const SESSION_TTL_MS = SESSION_TTL_SECONDS * 1000;
const MAX_ACTIVE_SESSIONS_PER_IP = 5;

export interface SimulatorSessionPayload {
  sessionId: string;
  providerSlug: 'sandbox-provider';
  issuedAt: number;
  expiresAt: number;
  nonce: string;
}

export interface SimulatorSessionState {
  sessionId: string;
  providerSlug: 'sandbox-provider';
  issuedAt: number;
  expiresAt: number;
  ip: string;
  allowedQuoteIds: string[];
  allowedActionIds: string[];
}

@Injectable()
export class DeveloperSandboxService {
  // In-memory fallback state store for development and testing environments when Redis is not available
  private memorySessions = new Map<string, SimulatorSessionState>();
  private ipSessionCreations = new Map<string, { count: number; resetAt: number }>();
  private sessionOpCounters = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private quotesService: QuotesService,
    private actionsService: ActionsService,
    private redisService?: RedisService
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      const existing = await prisma.provider.findUnique({ where: { slug: 'sandbox-provider' } });
      if (!existing) {
        await prisma.provider.create({
          data: {
            slug: 'sandbox-provider',
            name: 'Zayuno Sandbox Demonstration Provider',
            status: 'ACTIVE',
            type: 'SERVICES',
            adapterType: 'sandbox',
            capabilities: [
              'METADATA',
              'HEALTH',
              'LOCATIONS',
              'CATALOG',
              'SEARCH',
              'QUOTE',
              'ACTION_CREATE',
              'ACTION_STATUS',
              'ACTION_CANCEL',
              'PAYMENT_OPTIONS',
              'WEBHOOK'
            ],
            encryptedSecret: 'dev_sandbox_secret',
            webhookSecret: 'dev_sandbox_webhook_secret',
            config: {},
            metadata: {
              category: 'general_services',
              description: 'Demonstration provider for developer simulator.'
            }
          }
        });
      }
    } catch {
      // Ignored if DB is unavailable during early tests
    }
  }

  async discoverSandboxProvider() {
    return {
      providers: [
        {
          slug: 'sandbox-provider',
          name: 'Zayuno Sandbox Demonstration Provider',
          description: 'Universal sandbox provider simulating discovery, quote, action, and payment handoff.',
          category: 'general_services',
          capabilities: [
            'METADATA',
            'HEALTH',
            'CATALOG',
            'QUOTE',
            'ACTION_CREATE',
            'ACTION_STATUS',
            'WEBHOOK'
          ],
          offerings: [
            {
              id: 'offering_standard_pkg',
              name: 'Standard Developer Package',
              price: 100000,
              currency: 'UZS'
            }
          ]
        }
      ]
    };
  }

  /**
   * Enforces fail-closed production prerequisites:
   * 1. SIMULATOR_SESSION_SECRET must be configured.
   * 2. Redis must be connected and ready.
   */
  private ensureProductionPrerequisites(): void {
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
      const envSecret = process.env.SIMULATOR_SESSION_SECRET;
      if (!envSecret || envSecret.trim().length === 0) {
        throw new InternalServerErrorException(
          'SIMULATOR_SESSION_SECRET is not configured in production. Developer Sandbox is disabled.'
        );
      }
      if (!this.redisService || !this.redisService.isReady()) {
        throw new InternalServerErrorException(
          'Redis is required for Developer Sandbox in production. Developer Sandbox is disabled.'
        );
      }
    }
  }

  /**
   * Retrieves the HMAC secret used for signing simulator session tokens.
   */
  private getSimulatorSecret(): string {
    this.ensureProductionPrerequisites();

    const envSecret = process.env.SIMULATOR_SESSION_SECRET;
    if (envSecret && envSecret.trim().length > 0) {
      return envSecret.trim();
    }

    return DEV_EPHEMERAL_SECRET;
  }

  /**
   * Checks and increments the IP-level session creation rate limit.
   */
  private async checkIpRateLimit(ip: string): Promise<void> {
    const maxCreationsPerMinute = 10;
    const windowSeconds = 60;

    if (this.redisService && this.redisService.isReady()) {
      const rateKey = `dev_sandbox:ip-rate:${ip}`;
      const count = await this.redisService.incr(rateKey, windowSeconds);
      if (count > maxCreationsPerMinute) {
        throw new HttpException(
          'Too many simulator session creation requests. Please wait a moment before creating a new session.',
          HttpStatus.TOO_MANY_REQUESTS
        );
      }

      // Check active concurrent sessions for IP
      const activeKey = `dev_sandbox:active-sessions:${ip}`;
      const activeCount = await this.redisService.scard(activeKey);
      if (activeCount >= MAX_ACTIVE_SESSIONS_PER_IP) {
        throw new HttpException(
          `Maximum concurrent simulator sessions (${MAX_ACTIVE_SESSIONS_PER_IP}) reached for this client. Please wait for an existing session to expire.`,
          HttpStatus.TOO_MANY_REQUESTS
        );
      }
    } else {
      // In-memory fallback for non-production environments
      const now = Date.now();
      const record = this.ipSessionCreations.get(ip);
      if (!record || now > record.resetAt) {
        this.ipSessionCreations.set(ip, { count: 1, resetAt: now + windowSeconds * 1000 });
      } else {
        if (record.count >= maxCreationsPerMinute) {
          throw new HttpException(
            'Too many simulator session creation requests. Please wait a moment before creating a new session.',
            HttpStatus.TOO_MANY_REQUESTS
          );
        }
        record.count += 1;
      }

      let activeSessionsForIp = 0;
      for (const [_, state] of this.memorySessions.entries()) {
        if (state.ip === ip && now < state.expiresAt) {
          activeSessionsForIp += 1;
        }
      }
      if (activeSessionsForIp >= MAX_ACTIVE_SESSIONS_PER_IP) {
        throw new HttpException(
          `Maximum concurrent simulator sessions (${MAX_ACTIVE_SESSIONS_PER_IP}) reached for this client. Please wait for an existing session to expire.`,
          HttpStatus.TOO_MANY_REQUESTS
        );
      }
    }
  }

  /**
   * Checks and increments per-session rate limits.
   */
  private async checkSessionOpRateLimit(sessionId: string, opType: 'quote' | 'action' | 'status'): Promise<void> {
    const limits = { quote: 30, action: 20, status: 60 };
    const maxLimit = limits[opType];
    const windowSeconds = 60;

    if (this.redisService && this.redisService.isReady()) {
      const rateKey = `dev_sandbox:rate:${sessionId}:${opType}`;
      const count = await this.redisService.incr(rateKey, windowSeconds);
      if (count > maxLimit) {
        throw new HttpException(
          `Simulator ${opType} rate limit exceeded (max ${maxLimit}/min). Please slow down.`,
          HttpStatus.TOO_MANY_REQUESTS
        );
      }
    } else {
      // In-memory fallback
      const now = Date.now();
      const counterKey = `${sessionId}:${opType}`;
      const record = this.sessionOpCounters.get(counterKey);
      if (!record || now > record.resetAt) {
        this.sessionOpCounters.set(counterKey, { count: 1, resetAt: now + windowSeconds * 1000 });
      } else {
        if (record.count >= maxLimit) {
          throw new HttpException(
            `Simulator ${opType} rate limit exceeded (max ${maxLimit}/min). Please slow down.`,
            HttpStatus.TOO_MANY_REQUESTS
          );
        }
        record.count += 1;
      }
    }
  }

  /**
   * Saves or updates session state in Redis or in-memory store with remaining TTL.
   */
  private async saveSessionState(state: SimulatorSessionState): Promise<void> {
    const remainingSeconds = Math.max(1, Math.floor((state.expiresAt - Date.now()) / 1000));

    if (this.redisService && this.redisService.isReady()) {
      const sessionKey = `dev_sandbox:session:${state.sessionId}`;
      await this.redisService.set(sessionKey, JSON.stringify(state), remainingSeconds);
      const activeKey = `dev_sandbox:active-sessions:${state.ip}`;
      await this.redisService.sadd(activeKey, state.sessionId, remainingSeconds);
    } else {
      this.memorySessions.set(state.sessionId, state);
    }
  }

  /**
   * Retrieves session state from Redis or in-memory store.
   */
  private async getSessionState(sessionId: string): Promise<SimulatorSessionState | null> {
    if (this.redisService && this.redisService.isReady()) {
      const sessionKey = `dev_sandbox:session:${sessionId}`;
      const raw = await this.redisService.get(sessionKey);
      if (!raw) {
        return null;
      }
      try {
        const parsed = JSON.parse(raw);
        if (Date.now() > parsed.expiresAt) {
          await this.redisService.del(sessionKey);
          return null;
        }
        return parsed;
      } catch {
        return null;
      }
    }

    const state = this.memorySessions.get(sessionId);
    if (!state) return null;
    if (Date.now() > state.expiresAt) {
      this.memorySessions.delete(sessionId);
      return null;
    }
    return state;
  }

  async createSession(clientIp = '127.0.0.1'): Promise<{ sessionToken: string; providerSlug: string; expiresInSeconds: number }> {
    this.ensureProductionPrerequisites();
    await this.checkIpRateLimit(clientIp);

    const secret = this.getSimulatorSecret();
    const now = Date.now();
    const sessionId = crypto.randomUUID();
    const expiresAt = now + SESSION_TTL_MS;

    const payload: SimulatorSessionPayload = {
      sessionId,
      providerSlug: 'sandbox-provider',
      issuedAt: now,
      expiresAt,
      nonce: crypto.randomBytes(16).toString('hex')
    };

    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', secret)
      .update(payloadBase64)
      .digest('base64url');

    const sessionState: SimulatorSessionState = {
      sessionId,
      providerSlug: 'sandbox-provider',
      issuedAt: now,
      expiresAt,
      ip: clientIp,
      allowedQuoteIds: [],
      allowedActionIds: []
    };

    await this.saveSessionState(sessionState);

    return {
      sessionToken: `${payloadBase64}.${signature}`,
      providerSlug: 'sandbox-provider',
      expiresInSeconds: SESSION_TTL_SECONDS
    };
  }

  async verifySessionToken(token?: string): Promise<{ payload: SimulatorSessionPayload; state: SimulatorSessionState }> {
    this.ensureProductionPrerequisites();

    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      throw new UnauthorizedException('Simulator session token is required in X-Simulator-Session header.');
    }

    const secret = this.getSimulatorSecret();
    const cleanToken = token.trim();
    const parts = cleanToken.split('.');
    if (parts.length !== 2) {
      throw new UnauthorizedException('Invalid simulator session token format.');
    }

    const [payloadBase64, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(payloadBase64)
      .digest('base64url');

    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSig);
    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      throw new UnauthorizedException('Invalid simulator session token signature.');
    }

    let payload: SimulatorSessionPayload;
    try {
      payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf-8'));
    } catch {
      throw new UnauthorizedException('Malformed simulator session payload.');
    }

    if (Date.now() > payload.expiresAt) {
      throw new UnauthorizedException('Simulator session has expired. Request a fresh session.');
    }

    if (payload.providerSlug !== 'sandbox-provider') {
      throw new ForbiddenException('Simulator session is restricted exclusively to sandbox-provider.');
    }

    // Server-side state lookup. A valid HMAC token alone is NOT sufficient if state is absent!
    const sessionState = await this.getSessionState(payload.sessionId);
    if (!sessionState) {
      throw new UnauthorizedException('Simulator session not found or expired. Please create a new session.');
    }

    return { payload, state: sessionState };
  }

  async requestQuote(body: RequestQuoteInput, token?: string) {
    const { payload, state } = await this.verifySessionToken(token);
    await this.checkSessionOpRateLimit(payload.sessionId, 'quote');

    const slug = (body.providerSlug || '').toLowerCase().trim();
    if (slug !== 'sandbox-provider') {
      throw new ForbiddenException(`Simulator session cannot quote "${body.providerSlug}". Only "sandbox-provider" is allowed.`);
    }

    const quote = await this.quotesService.requestQuote(
      { ...body, providerSlug: 'sandbox-provider' },
      { allowSandboxSimulator: true }
    );

    // Bind created quote ID to this session state
    if (quote?.id && !state.allowedQuoteIds.includes(quote.id)) {
      state.allowedQuoteIds.push(quote.id);
    }
    if ((quote as any)?.quoteId && !state.allowedQuoteIds.includes((quote as any).quoteId)) {
      state.allowedQuoteIds.push((quote as any).quoteId);
    }

    await this.saveSessionState(state);
    return quote;
  }

  async createAction(body: CreateActionInput, token?: string) {
    const { payload, state } = await this.verifySessionToken(token);
    await this.checkSessionOpRateLimit(payload.sessionId, 'action');

    const slug = (body.providerSlug || '').toLowerCase().trim();
    if (slug !== 'sandbox-provider') {
      throw new ForbiddenException(`Simulator session cannot execute actions for "${body.providerSlug}". Only "sandbox-provider" is allowed.`);
    }

    // Enforce Quote Ownership: body.quoteId must have been created under this exact sessionId
    if (!body.quoteId || !state.allowedQuoteIds.includes(body.quoteId)) {
      throw new ForbiddenException('The specified quote was created under a different simulator session or has expired.');
    }

    const action = await this.actionsService.createAction(
      { ...body, providerSlug: 'sandbox-provider' },
      undefined,
      { allowSandboxSimulator: true }
    );

    // Bind created action ID to this session state
    if (action?.id && !state.allowedActionIds.includes(action.id)) {
      state.allowedActionIds.push(action.id);
    }
    if ((action as any)?.actionId && !state.allowedActionIds.includes((action as any).actionId)) {
      state.allowedActionIds.push((action as any).actionId);
    }
    if ((action as any)?.publicId && !state.allowedActionIds.includes((action as any).publicId)) {
      state.allowedActionIds.push((action as any).publicId);
    }

    await this.saveSessionState(state);
    return action;
  }

  async getAction(actionId: string, token?: string) {
    const { payload, state } = await this.verifySessionToken(token);
    await this.checkSessionOpRateLimit(payload.sessionId, 'status');

    // Enforce Action Ownership: actionId must belong to this exact sessionId
    if (!state.allowedActionIds.includes(actionId)) {
      throw new NotFoundException(`Action "${actionId}" not found for this simulator session.`);
    }

    const action = await prisma.action.findFirst({
      where: {
        OR: [{ id: actionId }, { publicId: actionId }]
      },
      include: { provider: true }
    });

    if (!action || action.provider.slug !== 'sandbox-provider') {
      throw new NotFoundException(`Action "${actionId}" not found for this simulator session.`);
    }

    return this.actionsService.getAction({ actionId }, undefined);
  }
}
