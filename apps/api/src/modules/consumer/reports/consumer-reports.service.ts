import { BadRequestException, Injectable } from "@nestjs/common";
import { prisma } from "@zayuno/database";

type ReportMessage = {
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
  latencyMs?: number;
};

@Injectable()
export class ConsumerReportsService {
  async create(
    userId: string,
    input: {
      description?: string;
      category?: string;
      screenshotDataUrl?: string;
      messages?: ReportMessage[];
      metadata?: Record<string, unknown>;
    },
  ) {
    const description = String(input.description || "")
      .trim()
      .slice(0, 4000);
    const messages = Array.isArray(input.messages)
      ? input.messages
          .filter(
            (message) =>
              (message?.role === "user" || message?.role === "assistant") &&
              typeof message.content === "string",
          )
          .slice(-100)
          .map((message) => ({
            role: message.role,
            content: this.removeSecrets(message.content).slice(0, 6000),
            createdAt:
              String(message.createdAt || "").slice(0, 40) || undefined,
            latencyMs: Number.isFinite(message.latencyMs)
              ? Math.max(0, Number(message.latencyMs))
              : undefined,
          }))
      : [];
    if (!description && messages.length === 0) {
      throw new BadRequestException("Izoh yoki chat tarixini yuboring.");
    }
    const screenshot = String(input.screenshotDataUrl || "");
    if (
      screenshot &&
      (!/^data:image\/(png|jpe?g);base64,/i.test(screenshot) ||
        screenshot.length > 2_800_000)
    ) {
      throw new BadRequestException("Screenshot formati yoki hajmi noto‘g‘ri.");
    }
    const markdown = [
      `# Zayuno support report`,
      ``,
      `**Izoh:** ${description || "Kiritilmagan"}`,
      ``,
      `## Chat`,
      ...messages.flatMap((message) => [
        ``,
        `### ${message.role === "user" ? "Foydalanuvchi" : "Zayuno"}${message.latencyMs !== undefined ? ` · ${message.latencyMs} ms` : ""}`,
        message.content,
      ]),
    ].join("\n");
    const report = await prisma.userReport.create({
      data: {
        userId,
        category: String(input.category || "TECHNICAL").slice(0, 40),
        description: this.removeSecrets(description),
        screenshotDataUrl: screenshot || null,
        transcript: messages as any,
        transcriptMarkdown: markdown,
        metadata: this.sanitizeMetadata(input.metadata || {}) as any,
      },
      select: { id: true, status: true, createdAt: true },
    });
    return report;
  }

  private removeSecrets(value: string): string {
    return value
      .replace(/\b(Bearer\s+)[A-Za-z0-9._~-]+/gi, "$1[REDACTED]")
      .replace(/\bAIza[A-Za-z0-9_-]{20,}\b/g, "[REDACTED_KEY]")
      .replace(/\b(sk-[A-Za-z0-9_-]{16,})\b/g, "[REDACTED_KEY]");
  }

  private sanitizeMetadata(value: Record<string, unknown>) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(
          ([key]) =>
            !/(token|secret|password|authorization|cookie|api.?key)/i.test(key),
        )
        .slice(0, 40)
        .map(([key, item]) => [key.slice(0, 80), String(item).slice(0, 500)]),
    );
  }
}
