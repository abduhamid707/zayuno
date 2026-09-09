import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ActionStatus, prisma } from "@zayuno/database";
import { decryptSecret, redactForLogs, scrubSensitiveString } from "@zayuno/shared";

const CONSENT_VERSION = "consumer-memory-v1";
const ANALYSIS_BATCH_SIZE = 10;
const SIGNAL_LIMIT = 60;
const ALLOWED_KINDS = new Set([
  "INTEREST",
  "PROVIDER_PREFERENCE",
  "OFFERING_PREFERENCE",
  "BUDGET",
  "DIETARY_PREFERENCE",
  "FULFILLMENT_PREFERENCE",
  "LANGUAGE_STYLE",
  "ACTIVITY_WINDOW",
  "ORDER_PATTERN",
  "DISLIKE",
]);
const FORBIDDEN_PROFILE_PATTERN =
  /gender|male|female|jins|erkak|ayol|personality|xarakter|mood|kayfiyat|depress|relig|muslim|christ|politic|ethnic|race|health|kasal|diabet|phone|telefon|email|address|manzil|passport|pinfl|card|karta|cvv|otp|password|parol/i;

type ExtractedSignal = {
  kind: string;
  key: string;
  label: string;
  value: unknown;
  confidence: number;
  evidenceMessageIds: string[];
  expiresInDays: number;
};

@Injectable()
export class ConsumerMemoryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ConsumerMemoryService.name);
  private readonly model: any | null;
  private timer?: NodeJS.Timeout;

  constructor() {
    const key = process.env.GEMINI_API_KEY?.trim();
    const modelName =
      process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite";
    this.model = key
      ? new GoogleGenerativeAI(key).getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: "application/json",
            maxOutputTokens: 1800,
            thinkingConfig: { thinkingBudget: 0 },
          },
        } as any)
      : null;
  }

  onModuleInit() {
    this.timer = setInterval(() => void this.drainJobs(), 30_000);
    this.timer.unref?.();
    void this.recoverAndDrain();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async getMemory(userId: string) {
    await this.expireSignals(userId);
    const profile = await prisma.consumerMemoryProfile.findUnique({
      where: { userId },
    });
    const signals = profile?.enabled
      ? await prisma.consumerMemorySignal.findMany({
          where: {
            userId,
            status: "ACTIVE",
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
          orderBy: [{ confidence: "desc" }, { lastSeenAt: "desc" }],
          take: SIGNAL_LIMIT,
        })
      : [];
    const pendingMessages = profile?.enabled
      ? await this.pendingMessageCount(
          userId,
          profile.lastAnalyzedMessageAt,
          profile.lastAnalyzedMessageId,
        )
      : 0;
    return {
      enabled: Boolean(profile?.enabled),
      consentVersion: profile?.consentVersion || null,
      consentedAt: profile?.consentedAt?.toISOString() || null,
      summary: profile?.enabled ? profile.summary : {},
      signals: signals.map((signal) => ({
        id: signal.id,
        kind: signal.kind,
        label: signal.label,
        value: signal.value,
        confidence: signal.confidence,
        source: signal.source,
        lastSeenAt: signal.lastSeenAt.toISOString(),
        expiresAt: signal.expiresAt?.toISOString() || null,
      })),
      stats: {
        analyzedMessages: profile?.analyzedUserMessageCount || 0,
        pendingMessages,
        nextAnalysisIn: profile?.enabled
          ? Math.max(0, ANALYSIS_BATCH_SIZE - pendingMessages)
          : null,
      },
    };
  }

  async setConsent(userId: string, enabled: boolean) {
    const now = new Date();
    if (enabled) {
      await prisma.consumerMemoryProfile.upsert({
        where: { userId },
        create: {
          userId,
          enabled: true,
          consentVersion: CONSENT_VERSION,
          consentedAt: now,
        },
        update: {
          enabled: true,
          consentVersion: CONSENT_VERSION,
          consentedAt: now,
          revokedAt: null,
        },
      });
      await this.maybeEnqueue(userId);
    } else {
      await prisma.$transaction([
        prisma.consumerMemorySignal.deleteMany({ where: { userId } }),
        prisma.consumerMemoryJob.deleteMany({ where: { userId } }),
        prisma.consumerSuggestionEvent.deleteMany({ where: { userId } }),
        prisma.consumerMemoryProfile.upsert({
          where: { userId },
          create: { userId, enabled: false, revokedAt: now },
          update: {
            enabled: false,
            revokedAt: now,
            summary: {},
            analyzedUserMessageCount: 0,
            lastAnalyzedMessageAt: null,
            lastAnalyzedMessageId: null,
            lastAnalysisAt: null,
            analysisLeaseUntil: null,
          },
        }),
      ]);
    }
    return this.getMemory(userId);
  }

  async clearMemory(userId: string) {
    const profile = await prisma.consumerMemoryProfile.findUnique({
      where: { userId },
    });
    await prisma.$transaction([
      prisma.consumerMemorySignal.deleteMany({ where: { userId } }),
      prisma.consumerMemoryJob.deleteMany({ where: { userId } }),
      prisma.consumerSuggestionEvent.deleteMany({ where: { userId } }),
      prisma.consumerMemoryProfile.upsert({
        where: { userId },
        create: { userId, enabled: false, revokedAt: new Date() },
        update: {
          enabled: false,
          revokedAt: new Date(),
          summary: {},
          analyzedUserMessageCount: 0,
          lastAnalyzedMessageAt: null,
          lastAnalyzedMessageId: null,
          lastAnalysisAt: null,
          analysisLeaseUntil: null,
        },
      }),
    ]);
    return { deleted: true, wasEnabled: Boolean(profile?.enabled) };
  }

  async updateSignal(
    userId: string,
    id: string,
    input: { label?: unknown; value?: unknown },
  ) {
    const existing = await prisma.consumerMemorySignal.findFirst({
      where: { id, userId },
    });
    if (!existing) throw new NotFoundException("Memory signal topilmadi.");
    const label = String(input.label ?? existing.label)
      .trim()
      .slice(0, 120);
    if (!label || FORBIDDEN_PROFILE_PATTERN.test(label))
      throw new BadRequestException(
        "Bu ma’lumot personalization xotirasida saqlanmaydi.",
      );
    const value =
      input.value === undefined
        ? existing.value
        : this.safeJsonValue(input.value);
    const serializedValue = JSON.stringify(value);
    if (
      serializedValue.length > 800 ||
      FORBIDDEN_PROFILE_PATTERN.test(serializedValue)
    )
      throw new BadRequestException(
        "Bu ma’lumot personalization xotirasida saqlanmaydi.",
      );
    await prisma.consumerMemorySignal.update({
      where: { id },
      data: {
        label,
        value,
        confidence: 1,
        source: "USER_EDITED",
        expiresAt: null,
      },
    });
    return this.getMemory(userId);
  }

  async deleteSignal(userId: string, id: string) {
    await prisma.consumerMemorySignal.deleteMany({ where: { id, userId } });
  }

  async exportMemory(userId: string) {
    const memory = await this.getMemory(userId);
    return {
      exportedAt: new Date().toISOString(),
      schemaVersion: 1,
      ...memory,
    };
  }

  async getSuggestions(userId: string) {
    const profile = await prisma.consumerMemoryProfile.findUnique({
      where: { userId },
    });
    if (!profile?.enabled) return { personalized: false, suggestions: [] };
    const [signals, events] = await Promise.all([
      prisma.consumerMemorySignal.findMany({
        where: {
          userId,
          status: "ACTIVE",
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        orderBy: [{ confidence: "desc" }, { lastSeenAt: "desc" }],
        take: 30,
      }),
      prisma.consumerSuggestionEvent.findMany({
        where: {
          userId,
          createdAt: { gt: new Date(Date.now() - 90 * 86_400_000) },
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
    ]);
    const affinity = new Map<string, number>();
    for (const event of events) {
      const delta =
        event.event === "CLICKED" || event.event === "CONVERTED"
          ? 0.12
          : event.event === "DISMISSED"
            ? -0.18
            : 0;
      affinity.set(
        event.suggestionKey,
        (affinity.get(event.suggestionKey) || 0) + delta,
      );
    }
    const suggestions = signals
      .map((signal) => ({
        key: signal.key,
        type: signal.kind.toLowerCase(),
        label: this.suggestionText(signal.kind, signal.label),
        score: signal.confidence + (affinity.get(signal.key) || 0),
      }))
      .filter((item) => item.label)
      .sort((a, b) => b.score - a.score)
      .filter(
        (item, index, all) =>
          all.findIndex((other) => other.label === item.label) === index,
      )
      .slice(0, 3)
      .map(({ score: _score, ...item }) => item);
    if (suggestions.length) {
      await prisma.consumerSuggestionEvent.createMany({
        data: suggestions.map((suggestion) => ({
          userId,
          event: "SHOWN",
          suggestionType: suggestion.type,
          suggestionKey: suggestion.key,
          suggestionText: suggestion.label,
        })),
      });
    }
    return { personalized: suggestions.length > 0, suggestions };
  }

  async recordSuggestion(
    userId: string,
    input: {
      sessionId?: unknown;
      event?: unknown;
      type?: unknown;
      key?: unknown;
      text?: unknown;
    },
  ) {
    const profile = await prisma.consumerMemoryProfile.findUnique({
      where: { userId },
    });
    if (!profile?.enabled) return { recorded: false };
    const event = String(input.event || "CLICKED").toUpperCase();
    if (!["SHOWN", "CLICKED", "DISMISSED", "CONVERTED"].includes(event))
      throw new BadRequestException("Invalid suggestion event.");
    const suggestionText = scrubSensitiveString(
      String(input.text || ""),
      180,
    ).trim();
    const suggestionKey = this.normalizeKey(
      String(input.key || suggestionText),
    );
    if (!suggestionText || !suggestionKey)
      throw new BadRequestException("Invalid suggestion.");
    await prisma.consumerSuggestionEvent.create({
      data: {
        userId,
        sessionId: String(input.sessionId || "").slice(0, 128) || null,
        event,
        suggestionType: String(input.type || "generic").slice(0, 40),
        suggestionKey,
        suggestionText,
      },
    });
    return { recorded: true };
  }

  async onHistorySaved(userId: string) {
    await this.maybeEnqueue(userId);
  }

  async getPromptContext(userId: string) {
    const profile = await prisma.consumerMemoryProfile.findUnique({
      where: { userId },
    });
    if (!profile?.enabled) return "";
    const signals = await prisma.consumerMemorySignal.findMany({
      where: {
        userId,
        status: "ACTIVE",
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: [{ confidence: "desc" }, { lastSeenAt: "desc" }],
      take: 12,
      select: {
        kind: true,
        key: true,
        label: true,
        value: true,
        confidence: true,
      },
    });
    if (!signals.length) return "";
    return JSON.stringify(
      signals.map((signal) => ({
        kind: signal.kind,
        key: signal.key,
        label: signal.label,
        value: signal.value,
        confidence: Number(signal.confidence.toFixed(2)),
      })),
    );
  }

  rankProviders<T extends { slug?: string; name?: string }>(
    providers: T[],
    context: string,
  ) {
    if (!context) return providers;
    const normalized = context.toLowerCase();
    return providers
      .map((provider, index) => ({
        provider,
        index,
        preferred:
          normalized.includes(String(provider.slug || "").toLowerCase()) ||
          normalized.includes(String(provider.name || "").toLowerCase()),
      }))
      .sort(
        (a, b) =>
          Number(b.preferred) - Number(a.preferred) || a.index - b.index,
      )
      .map(({ provider }) => provider);
  }

  private async maybeEnqueue(userId: string) {
    const profile = await prisma.consumerMemoryProfile.findUnique({
      where: { userId },
    });
    if (!profile?.enabled) return;
    const count = await this.pendingMessageCount(
      userId,
      profile.lastAnalyzedMessageAt,
      profile.lastAnalyzedMessageId,
    );
    if (count < ANALYSIS_BATCH_SIZE) return;
    const existing = await prisma.consumerMemoryJob.findFirst({
      where: { userId, status: { in: ["QUEUED", "RUNNING"] } },
    });
    if (existing) return;
    await prisma.consumerMemoryJob.create({
      data: { userId, messageCount: count },
    });
    void this.drainJobs();
  }

  private async drainJobs() {
    await this.cleanupRetention();
    const jobs = await prisma.consumerMemoryJob.findMany({
      where: { status: "QUEUED", runAfter: { lte: new Date() } },
      orderBy: { createdAt: "asc" },
      take: 4,
    });
    for (const job of jobs) {
      const claimed = await prisma.consumerMemoryJob.updateMany({
        where: { id: job.id, status: "QUEUED" },
        data: {
          status: "RUNNING",
          startedAt: new Date(),
          attempts: { increment: 1 },
        },
      });
      if (claimed.count === 1) void this.processJob(job.id, job.userId);
    }
  }

  private async processJob(jobId: string, userId: string) {
    const leaseUntil = new Date(Date.now() + 2 * 60_000);
    try {
      if (!this.model) throw new Error("AI_UNAVAILABLE");
      const profile = await prisma.consumerMemoryProfile.findUnique({
        where: { userId },
      });
      if (!profile?.enabled) {
        await prisma.consumerMemoryJob.update({
          where: { id: jobId },
          data: { status: "CANCELLED", completedAt: new Date() },
        });
        return;
      }
      const leased = await prisma.consumerMemoryProfile.updateMany({
        where: {
          userId,
          enabled: true,
          OR: [
            { analysisLeaseUntil: null },
            { analysisLeaseUntil: { lt: new Date() } },
          ],
        },
        data: { analysisLeaseUntil: leaseUntil },
      });
      if (leased.count !== 1) {
        await prisma.consumerMemoryJob.update({
          where: { id: jobId },
          data: { status: "QUEUED", runAfter: new Date(Date.now() + 30_000) },
        });
        return;
      }
      const messages = await prisma.consumerChatMessage.findMany({
        where: {
          role: "user",
          session: { userId },
          ...this.afterCursor(
            profile.lastAnalyzedMessageAt,
            profile.lastAnalyzedMessageId,
          ),
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        take: ANALYSIS_BATCH_SIZE,
        select: { id: true, content: true, createdAt: true, selections: true },
      });
      if (messages.length < ANALYSIS_BATCH_SIZE) {
        await this.completeJob(jobId, userId);
        return;
      }
      const [existingContext, recentOrders] = await Promise.all([
        this.getPromptContext(userId),
        prisma.action.findMany({
          where: {
            userId,
            status: {
              in: [
                ActionStatus.ACCEPTED,
                ActionStatus.IN_PROGRESS,
                ActionStatus.READY,
                ActionStatus.FULFILLING,
                ActionStatus.COMPLETED,
              ],
            },
            createdAt: { gt: new Date(Date.now() - 365 * 86_400_000) },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            lines: true,
            total: true,
            currency: true,
            createdAt: true,
            provider: { select: { slug: true, name: true } },
          },
        }),
      ]);
      const allowedIds = new Set(messages.map((message) => message.id));
      const sanitizedMessages = messages.map((message) => ({
        id: message.id,
        text: this.redactMemoryInput(this.decryptStoredText(message.content)),
        selections: message.selections,
        localHour: Number(
          new Intl.DateTimeFormat("en-US", {
            timeZone: "Asia/Tashkent",
            hour: "2-digit",
            hour12: false,
          }).format(message.createdAt),
        ),
      }));
      const instruction = `You extract durable, useful food-ordering preferences for Zayuno. Return JSON only:
{"summary":"one short Uzbek sentence","signals":[{"kind":"ALLOWED_KIND","key":"stable_lowercase_key","label":"short Uzbek label","value":"string, number, or compact object","confidence":0.0,"evidenceMessageIds":["id"],"expiresInDays":180}]}

Allowed kinds: ${[...ALLOWED_KINDS].join(", ")}.
Only save facts explicitly stated by the user or directly observed choices/orders. Current messages override old conflicting preferences. Do not infer or store gender, age, personality, mood, health, religion, politics, ethnicity, relationship status, exact location, address, phone, email, identity, payment data, passwords, tokens or secrets. Ignore one-off requests unless repeated or clearly phrased as a preference. Budget, food/provider choices, dietary wishes, delivery/pickup preference, language/style and broad activity window are allowed. Use only supplied message IDs as evidence. Keep at most 8 signals.

EXISTING=${existingContext || "[]"}
VERIFIED_ORDERS=${JSON.stringify(
        recentOrders.map((order) => ({
          provider: order.provider,
          lines: redactForLogs(order.lines),
          total: Number(order.total),
          currency: order.currency,
          createdAt: order.createdAt.toISOString(),
        })),
      )}
NEW_MESSAGES=${JSON.stringify(sanitizedMessages)}`;
      const result = await this.model.generateContent(instruction, {
        timeout: 12_000,
      });
      const parsed = this.parseJson(result.response.text());
      const signals = this.validateSignals(parsed?.signals, allowedIds);
      await this.persistSignals(userId, signals);
      await this.persistDeterministicSignals(userId, messages, recentOrders);
      const safeSummary = this.safeSummary(parsed?.summary, signals);
      const cursor = messages[messages.length - 1].createdAt;
      const cursorId = messages[messages.length - 1].id;
      await prisma.$transaction([
        prisma.consumerMemoryProfile.update({
          where: { userId },
          data: {
            summary: {
              text: safeSummary,
              topPreferences: signals.slice(0, 8).map((s) => s.label),
              updatedAt: new Date().toISOString(),
            },
            analyzedUserMessageCount: { increment: messages.length },
            lastAnalyzedMessageAt: cursor,
            lastAnalyzedMessageId: cursorId,
            lastAnalysisAt: new Date(),
            analysisLeaseUntil: null,
          },
        }),
        prisma.consumerMemoryJob.update({
          where: { id: jobId },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
            errorCode: null,
          },
        }),
      ]);
      await this.maybeEnqueue(userId);
    } catch (error) {
      const job = await prisma.consumerMemoryJob.findUnique({
        where: { id: jobId },
      });
      const retry = (job?.attempts || 0) < 3;
      await prisma.$transaction([
        prisma.consumerMemoryProfile.updateMany({
          where: { userId },
          data: { analysisLeaseUntil: null },
        }),
        prisma.consumerMemoryJob.update({
          where: { id: jobId },
          data: {
            status: retry ? "QUEUED" : "FAILED",
            runAfter: new Date(
              Date.now() + Math.max(1, job?.attempts || 1) * 60_000,
            ),
            errorCode:
              error instanceof Error && error.message === "AI_UNAVAILABLE"
                ? "AI_UNAVAILABLE"
                : "ANALYSIS_FAILED",
          },
        }),
      ]);
      this.logger.warn(
        `Memory analysis job ${jobId} deferred (${retry ? "retry" : "failed"}).`,
      );
    }
  }

  private async completeJob(jobId: string, userId: string) {
    await prisma.$transaction([
      prisma.consumerMemoryProfile.updateMany({
        where: { userId },
        data: { analysisLeaseUntil: null },
      }),
      prisma.consumerMemoryJob.update({
        where: { id: jobId },
        data: { status: "COMPLETED", completedAt: new Date() },
      }),
    ]);
  }

  private async persistSignals(userId: string, signals: ExtractedSignal[]) {
    const now = new Date();
    for (const signal of signals) {
      const current = await prisma.consumerMemorySignal.findUnique({
        where: {
          userId_kind_key: { userId, kind: signal.kind, key: signal.key },
        },
      });
      const evidence = [
        ...new Set([
          ...(current?.evidenceMessageIds || []),
          ...signal.evidenceMessageIds,
        ]),
      ].slice(-30);
      await prisma.consumerMemorySignal.upsert({
        where: {
          userId_kind_key: { userId, kind: signal.kind, key: signal.key },
        },
        create: {
          userId,
          kind: signal.kind,
          key: signal.key,
          label: signal.label,
          value: this.safeJsonValue(signal.value),
          confidence: signal.confidence,
          evidenceMessageIds: evidence,
          expiresAt: new Date(
            now.getTime() + signal.expiresInDays * 86_400_000,
          ),
        },
        update: {
          label: signal.label,
          value: this.safeJsonValue(signal.value),
          confidence: Math.max(current?.confidence || 0, signal.confidence),
          evidenceMessageIds: evidence,
          lastSeenAt: now,
          expiresAt: new Date(
            now.getTime() + signal.expiresInDays * 86_400_000,
          ),
          status: "ACTIVE",
        },
      });
    }
  }

  private async persistDeterministicSignals(
    userId: string,
    messages: Array<{ id: string; createdAt: Date }>,
    orders: Array<{
      id: string;
      lines: unknown;
      total: unknown;
      currency: string;
      createdAt: Date;
      provider: { slug: string; name: string };
    }>,
  ) {
    const hourCounts = new Map<string, number>();
    for (const message of messages) {
      const hour = Number(
        new Intl.DateTimeFormat("en-US", {
          timeZone: "Asia/Tashkent",
          hour: "2-digit",
          hour12: false,
        }).format(message.createdAt),
      );
      const key =
        hour < 6
          ? "night"
          : hour < 12
            ? "morning"
            : hour < 18
              ? "day"
              : "evening";
      hourCounts.set(key, (hourCounts.get(key) || 0) + 1);
    }
    const top = [...hourCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] >= 4) {
      const labels: Record<string, string> = {
        night: "Kechasi faol",
        morning: "Ertalab faol",
        day: "Kunduzi faol",
        evening: "Kechqurun faol",
      };
      await prisma.consumerMemorySignal.upsert({
        where: {
          userId_kind_key: { userId, kind: "ACTIVITY_WINDOW", key: top[0] },
        },
        create: {
          userId,
          kind: "ACTIVITY_WINDOW",
          key: top[0],
          label: labels[top[0]],
          value: { window: top[0] },
          confidence: 0.8,
          source: "OBSERVED",
          evidenceMessageIds: messages.map((m) => m.id),
          expiresAt: new Date(Date.now() + 90 * 86_400_000),
        },
        update: {
          label: labels[top[0]],
          value: { window: top[0] },
          confidence: 0.8,
          source: "OBSERVED",
          evidenceMessageIds: messages.map((m) => m.id),
          lastSeenAt: new Date(),
          expiresAt: new Date(Date.now() + 90 * 86_400_000),
          status: "ACTIVE",
        },
      });
    }

    const providerCounts = new Map<string, { name: string; count: number; last: Date }>();
    for (const order of orders) {
      const current = providerCounts.get(order.provider.slug);
      providerCounts.set(order.provider.slug, {
        name: order.provider.name,
        count: (current?.count || 0) + 1,
        last: current && current.last > order.createdAt ? current.last : order.createdAt,
      });
    }
    for (const [slug, data] of [...providerCounts.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 5)) {
      await prisma.consumerMemorySignal.upsert({
        where: { userId_kind_key: { userId, kind: "PROVIDER_PREFERENCE", key: slug } },
        create: { userId, kind: "PROVIDER_PREFERENCE", key: slug, label: data.name, value: { providerSlug: slug, orderCount: data.count }, confidence: Math.min(0.99, 0.7 + data.count * 0.06), source: "ORDER_HISTORY", evidenceMessageIds: [], lastSeenAt: data.last, expiresAt: new Date(Date.now() + 365 * 86_400_000) },
        update: { label: data.name, value: { providerSlug: slug, orderCount: data.count }, confidence: Math.min(0.99, 0.7 + data.count * 0.06), source: "ORDER_HISTORY", lastSeenAt: data.last, expiresAt: new Date(Date.now() + 365 * 86_400_000), status: "ACTIVE" },
      });
    }
    if (orders.length >= 3) {
      const average = Math.round(orders.reduce((sum, order) => sum + Number(order.total || 0), 0) / orders.length / 5_000) * 5_000;
      if (average > 0) {
        await prisma.consumerMemorySignal.upsert({
          where: { userId_kind_key: { userId, kind: "ORDER_PATTERN", key: "average-order-value" } },
          create: { userId, kind: "ORDER_PATTERN", key: "average-order-value", label: `Odatda ${average.toLocaleString("en-US")} ${orders[0].currency} atrofida buyurtma`, value: { average, currency: orders[0].currency }, confidence: Math.min(0.95, 0.65 + orders.length * 0.03), source: "ORDER_HISTORY", evidenceMessageIds: [], expiresAt: new Date(Date.now() + 180 * 86_400_000) },
          update: { label: `Odatda ${average.toLocaleString("en-US")} ${orders[0].currency} atrofida buyurtma`, value: { average, currency: orders[0].currency }, confidence: Math.min(0.95, 0.65 + orders.length * 0.03), source: "ORDER_HISTORY", lastSeenAt: new Date(), expiresAt: new Date(Date.now() + 180 * 86_400_000), status: "ACTIVE" },
        });
      }
    }
    const excess = await prisma.consumerMemorySignal.findMany({
      where: { userId },
      orderBy: [{ status: "desc" }, { lastSeenAt: "desc" }],
      skip: SIGNAL_LIMIT,
      select: { id: true },
    });
    if (excess.length) {
      await prisma.consumerMemorySignal.deleteMany({ where: { id: { in: excess.map((item) => item.id) } } });
    }
  }

  private async recoverAndDrain() {
    await prisma.consumerMemoryJob.updateMany({
      where: { status: "RUNNING", startedAt: { lt: new Date(Date.now() - 5 * 60_000) } },
      data: { status: "QUEUED", runAfter: new Date(), errorCode: "RECOVERED_STALE_JOB" },
    });
    await this.drainJobs();
  }

  private async cleanupRetention() {
    const now = new Date();
    await Promise.all([
      prisma.consumerMemorySignal.updateMany({
        where: { status: "ACTIVE", expiresAt: { lte: now } },
        data: { status: "EXPIRED" },
      }),
      prisma.consumerSuggestionEvent.deleteMany({
        where: { createdAt: { lt: new Date(now.getTime() - 180 * 86_400_000) } },
      }),
      prisma.consumerMemoryJob.deleteMany({
        where: {
          status: { in: ["COMPLETED", "CANCELLED", "FAILED"] },
          updatedAt: { lt: new Date(now.getTime() - 30 * 86_400_000) },
        },
      }),
    ]);
  }

  private validateSignals(
    raw: unknown,
    allowedIds: Set<string>,
  ): ExtractedSignal[] {
    if (!Array.isArray(raw)) return [];
    return raw.slice(0, 8).flatMap((item: any) => {
      const kind = String(item?.kind || "").toUpperCase();
      const label = scrubSensitiveString(String(item?.label || ""), 120).trim();
      const key = this.normalizeKey(String(item?.key || label));
      const serialized = JSON.stringify(item?.value ?? "");
      if (
        !ALLOWED_KINDS.has(kind) ||
        !key ||
        !label ||
        FORBIDDEN_PROFILE_PATTERN.test(`${key} ${label} ${serialized}`)
      )
        return [];
      const confidence = Math.min(
        1,
        Math.max(0, Number(item?.confidence) || 0),
      );
      if (confidence < 0.55) return [];
      const evidenceMessageIds = Array.isArray(item?.evidenceMessageIds)
        ? item.evidenceMessageIds
            .map(String)
            .filter((id: string) => allowedIds.has(id))
            .slice(0, 10)
        : [];
      if (!evidenceMessageIds.length) return [];
      return [
        {
          kind,
          key,
          label,
          value: item?.value ?? label,
          confidence,
          evidenceMessageIds,
          expiresInDays: Math.min(
            365,
            Math.max(30, Number(item?.expiresInDays) || 180),
          ),
        },
      ];
    });
  }

  private safeSummary(raw: unknown, signals: ExtractedSignal[]) {
    const summary = scrubSensitiveString(String(raw || ""), 500).trim();
    if (summary && !FORBIDDEN_PROFILE_PATTERN.test(summary)) return summary;
    return signals.length
      ? `Asosiy afzalliklar: ${signals
          .slice(0, 5)
          .map((s) => s.label)
          .join(", ")}.`
      : "Yangi foydali afzalliklar hali aniqlanmadi.";
  }

  private redactMemoryInput(value: string) {
    return scrubSensitiveString(value, 1200)
      .replace(
        /\b(otp|sms\s*kod|kod|pin|parol|password)\b\s*[:=-]?\s*\S+/gi,
        "$1 [REDACTED]",
      )
      .replace(
        /\b(manzil|adres|address)\b\s*[:=-]?\s*[^,.\n]+/gi,
        "$1 [REDACTED]",
      );
  }

  private decryptStoredText(value: string) {
    if (!value.startsWith("enc:v1:")) return value;
    const key = process.env.ENCRYPTION_KEY?.trim();
    if (!key || key.length !== 64)
      throw new Error("MEMORY_ENCRYPTION_UNAVAILABLE");
    return decryptSecret(value.slice(7), key);
  }

  private parseJson(raw: string) {
    try {
      const cleaned = raw
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      return JSON.parse(cleaned.match(/\{[\s\S]*\}/)?.[0] || cleaned);
    } catch {
      return null;
    }
  }

  private normalizeKey(value: string) {
    return value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);
  }

  private suggestionText(kind: string, label: string) {
    const clean = scrubSensitiveString(label, 90)
      .replace(/[.!?]+$/g, "")
      .trim();
    if (!clean || FORBIDDEN_PROFILE_PATTERN.test(clean)) return "";
    if (kind === "PROVIDER_PREFERENCE") return `${clean} menyusini ko‘rsat`;
    if (kind === "OFFERING_PREFERENCE") return `${clean}ni ko‘rsat`;
    if (kind === "BUDGET") return `${clean} budjetga mos ovqatlarni ko‘rsat`;
    if (kind === "DISLIKE") return `${clean} bo‘lmagan variantlarni ko‘rsat`;
    return `${clean} bo‘yicha variantlarni ko‘rsat`;
  }

  private safeJsonValue(value: unknown): any {
    try {
      const serialized = JSON.stringify(value ?? null);
      if (serialized.length > 800) throw new Error("memory value too large");
      return JSON.parse(serialized);
    } catch {
      return null;
    }
  }

  private pendingMessageCount(
    userId: string,
    after: Date | null,
    afterId: string | null,
  ) {
    return prisma.consumerChatMessage.count({
      where: {
        role: "user",
        session: { userId },
        ...this.afterCursor(after, afterId),
      },
    });
  }

  private afterCursor(after: Date | null, afterId: string | null) {
    if (!after) return {};
    return {
      OR: [
        { createdAt: { gt: after } },
        { createdAt: after, id: { gt: afterId || "" } },
      ],
    };
  }

  private expireSignals(userId: string) {
    return prisma.consumerMemorySignal.updateMany({
      where: { userId, status: "ACTIVE", expiresAt: { lte: new Date() } },
      data: { status: "EXPIRED" },
    });
  }
}
