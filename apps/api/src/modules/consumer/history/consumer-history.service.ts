import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { prisma } from "@zayuno/database";
import { decryptSecret, encryptSecret } from "@zayuno/shared";
import { ConsumerMemoryService } from "../memory/consumer-memory.service";

type HistoryMessageInput = {
  id?: string;
  role?: string;
  content?: string;
  createdAt?: string;
  latencyMs?: number;
  interaction?: unknown;
  selections?: unknown;
};

type HistorySessionInput = {
  id?: string;
  title?: string;
  createdAt?: string;
  updatedAt?: string;
  messages?: HistoryMessageInput[];
};

@Injectable()
export class ConsumerHistoryService {
  constructor(private readonly memory: ConsumerMemoryService) {}

  async list(userId: string) {
    const sessions = await prisma.consumerChatSession.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: { messages: { orderBy: { createdAt: "asc" }, take: 250 } },
    });
    return sessions.map((session) => ({
      id: session.id,
      title: this.decrypt(session.title),
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
      messages: session.messages.map((message) => ({
        id: message.id,
        role: message.role,
        content: this.decrypt(message.content),
        createdAt: message.createdAt.toISOString(),
        latencyMs: message.latencyMs ?? undefined,
        interaction: message.interaction ?? undefined,
        selections: message.selections ?? undefined,
      })),
    }));
  }

  async save(userId: string, input: HistorySessionInput) {
    const session = this.validateSession(input);
    await prisma.$transaction(async (tx) => {
      const existing = await tx.consumerChatSession.findUnique({
        where: { id: session.id },
        select: { userId: true, updatedAt: true },
      });
      if (existing && existing.userId !== userId)
        throw new ForbiddenException(
          "Chat session belongs to another account.",
        );

      // An offline device can upload an older snapshot after another device has
      // already saved newer messages. Never let that stale snapshot win.
      if (existing && existing.updatedAt > session.updatedAt) return;

      await tx.consumerChatSession.upsert({
        where: { id: session.id },
        create: {
          id: session.id,
          userId,
          title: this.encrypt(session.title),
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
        },
        update: {
          title: this.encrypt(session.title),
          updatedAt: session.updatedAt,
        },
      });
      await tx.consumerChatMessage.deleteMany({
        where: { sessionId: session.id },
      });
      if (session.messages.length) {
        await tx.consumerChatMessage.createMany({
          data: session.messages.map((message) => ({
            ...message,
            content: this.encrypt(message.content),
            sessionId: session.id,
          })),
        });
      }
    });
    void this.memory.onHistorySaved(userId).catch(() => undefined);
    return { saved: true };
  }

  async remove(userId: string, id: string) {
    this.validateId(id, "session");
    await prisma.consumerChatSession.deleteMany({ where: { id, userId } });
  }

  private validateSession(input: HistorySessionInput) {
    const id = this.validateId(input.id, "session");
    const title =
      String(input.title || "Yangi suhbat")
        .trim()
        .slice(0, 120) || "Yangi suhbat";
    const createdAt = this.date(input.createdAt);
    const updatedAt = this.date(input.updatedAt);
    const rawMessages = Array.isArray(input.messages)
      ? input.messages.slice(-250)
      : [];
    const messages = rawMessages.map((message) => {
      const role =
        message.role === "user" || message.role === "assistant"
          ? message.role
          : null;
      if (!role) throw new BadRequestException("Invalid chat message role.");
      const content = String(message.content || "").trim();
      if (!content || content.length > 20_000)
        throw new BadRequestException("Invalid chat message content.");
      return {
        id: this.validateId(message.id, "message"),
        role,
        content,
        createdAt: this.date(message.createdAt),
        latencyMs:
          Number.isFinite(message.latencyMs) && Number(message.latencyMs) >= 0
            ? Math.round(Number(message.latencyMs))
            : null,
        interaction:
          message.interaction == null
            ? undefined
            : (message.interaction as any),
        selections:
          message.selections == null ? undefined : (message.selections as any),
      };
    });
    return { id, title, createdAt, updatedAt, messages };
  }

  private validateId(value: unknown, label: string) {
    const id = String(value || "");
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(id))
      throw new BadRequestException(`Invalid ${label} id.`);
    return id;
  }

  private date(value: unknown) {
    const date = new Date(String(value || ""));
    if (!Number.isFinite(date.getTime()))
      throw new BadRequestException("Invalid timestamp.");
    return date;
  }

  private encrypt(value: string) {
    return `enc:v1:${encryptSecret(value, this.encryptionKey())}`;
  }

  private decrypt(value: string) {
    if (!value.startsWith("enc:v1:")) return value;
    try {
      return decryptSecret(value.slice(7), this.encryptionKey());
    } catch {
      throw new ServiceUnavailableException(
        "Chat tarixini xavfsiz o‘qib bo‘lmadi.",
      );
    }
  }

  private encryptionKey() {
    const key = process.env.ENCRYPTION_KEY?.trim();
    if (!key || key.length !== 64)
      throw new ServiceUnavailableException(
        "Chat encryption is not configured.",
      );
    return key;
  }
}
