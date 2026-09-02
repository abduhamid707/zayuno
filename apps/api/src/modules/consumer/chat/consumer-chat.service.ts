import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ProvidersService } from "../../providers/providers.service";
import { CatalogService } from "../../catalog/catalog.service";

type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatRequest = {
  prompt: string;
  messages?: ConversationMessage[];
  userId: string;
};

type LiveContextPlan = {
  needsCatalog: boolean;
  providerSlugs: string[];
  query: string;
};

type PreparedChat = {
  prompt: string;
  history: ConversationMessage[];
  providerIndex: Array<Record<string, unknown>>;
  liveContext: unknown[];
};

@Injectable()
export class ConsumerChatService {
  private readonly logger = new Logger(ConsumerChatService.name);
  private readonly models: Array<{ name: string; client: any }>;

  constructor(
    private readonly providersService: ProvidersService,
    private readonly catalogService: CatalogService,
  ) {
    const systemInstruction = `You are Zayuno, a focused and helpful AI assistant for finding and using real services in Uzbekistan.
Always answer directly and naturally to the user in fluent, polite Uzbek Latin.
Be concise, warm, structured, and helpful.
Never output thinking tags, meta-commentary, planning steps, or English notes.
For provider names, services, availability, locations, and prices, prioritize LIVE_CONTEXT. Never invent false details.
If information is missing, politely explain and guide the user on what to do next.
Do not expose internal technical terms, IDs, or JSON syntax.
Use clean markdown bullet points (• or *) for readability.`;

    const key = process.env.GEMINI_API_KEY?.trim();
    const modelNames = Array.from(
      new Set([
        process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash",
        "gemini-3.5-flash",
        "gemini-3.6-flash",
        "gemini-3.7-flash",
        "gemini-3.5-flash-lite",
      ]),
    );
    const gemini = key ? new GoogleGenerativeAI(key) : null;
    this.models = gemini
      ? modelNames.map((name) => ({
          name,
          client: gemini.getGenerativeModel({
            model: name,
            systemInstruction,
            generationConfig: {
              maxOutputTokens: 2048,
              temperature: 0.6,
            },
          }),
        }))
      : [];
  }

  async processMessage(input: ChatRequest): Promise<{ content: string }> {
    const prepared = await this.prepareChat(input);
    const content = await this.writeAnswer(prepared);
    return { content };
  }

  async streamMessage(
    input: ChatRequest,
    onDelta: (content: string) => void,
  ): Promise<string> {
    const prepared = await this.prepareChat(input);
    const instruction = this.buildInstruction(prepared);

    try {
      for (const model of this.models) {
        let content = "";
        try {
          const result = await model.client.generateContentStream(instruction, {
            timeout: 45_000,
          });
          for await (const chunk of result.stream) {
            const delta = chunk.text();
            if (!delta) continue;
            content += delta;
            onDelta(delta);
          }
          content = content.trim();
          if (!content) throw new Error("empty Gemini stream");
          return content;
        } catch (error) {
          if (content) throw error;
          this.logger.warn(
            `Gemini stream model ${model.name} failed; trying fallback.`,
          );
        }
      }
      throw new Error("all Gemini stream models failed");
    } catch (error) {
      this.logger.error("Gemini streaming response failed", error);
      throw new ServiceUnavailableException(
        "Zayuno hozir javob bera olmadi. Birozdan so‘ng qayta urinib ko‘ring.",
      );
    }
  }

  private async prepareChat(input: ChatRequest): Promise<PreparedChat> {
    const prompt = String(input.prompt || "").trim();
    if (!prompt || prompt.length > 1200) {
      throw new BadRequestException(
        "So‘rov 1–1200 belgi oralig‘ida bo‘lishi kerak.",
      );
    }
    if (!this.models.length) {
      throw new ServiceUnavailableException(
        "Zayuno AI hozir sozlanmagan. Keyinroq qayta urinib ko‘ring.",
      );
    }

    const history = this.normalizeHistory(input.messages);
    const providers = (await this.providersService.listProviders()).sort(
      (left: any, right: any) =>
        this.providerPriority(left.slug) - this.providerPriority(right.slug),
    );
    const providerIndex = providers.slice(0, 20).map((provider: any) => ({
      slug: provider.slug,
      name: provider.name,
      category: provider.category || provider.type,
      description: provider.description,
      geography: provider.geography,
      capabilities: provider.capabilities,
    }));
    const plan = this.planLiveContext(prompt, providers);
    const liveContext = await this.loadLiveContext(plan, providers);

    return { prompt, history, providerIndex, liveContext };
  }

  private providerPriority(slug: string) {
    if (slug === "hh-uz" || slug === "hh-recruitment") return 0;
    if (slug === "coffee-time") return 1;
    return 10;
  }

  private normalizeHistory(messages?: ConversationMessage[]) {
    if (!Array.isArray(messages)) return [];
    return messages
      .filter(
        (message) =>
          (message?.role === "user" || message?.role === "assistant") &&
          typeof message.content === "string" &&
          message.content.trim(),
      )
      .slice(-16)
      .map((message) => ({
        role: message.role,
        content: message.content.trim().slice(0, 2000),
      }));
  }

  private planLiveContext(prompt: string, providers: any[]): LiveContextPlan {
    const normalized = prompt.toLocaleLowerCase("uz-UZ");
    const serviceRequest =
      /top|qidir|buyurtma|xizmat|narx|qancha|dorixona|ovqat|restoran|kafe|cafe|coffee|kofe|chipta|taksi|shifokor|klinika|bron|band|yaqin|manzil|mavjud|sotib|yetkaz|ish|vakansi|headhunter|hh\b|job|resume|rezyume|cv\b|xodim|nomzod|developer|dasturchi/i.test(
        normalized,
      );
    if (!serviceRequest || !providers.length) {
      return { needsCatalog: false, providerSlugs: [], query: prompt };
    }

    const recruitmentRequest =
      /ish|vakansi|headhunter|hh\b|job|resume|rezyume|cv\b|xodim|nomzod|developer|dasturchi/i.test(
        normalized,
      );
    const foodRequest =
      /ovqat|restoran|kafe|cafe|coffee|kofe|cappuccino|latte|espresso|ichimlik|yetkaz/i.test(
        normalized,
      );

    const ranked = providers
      .map((provider: any) => {
        const slug = String(provider.slug || "").toLowerCase();
        const haystack = [
          provider.slug,
          provider.name,
          provider.category,
          provider.type,
          provider.description,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        let score = normalized
          .split(/[^\p{L}\p{N}]+/u)
          .filter((word) => word.length > 2 && haystack.includes(word)).length;
        if (recruitmentRequest && /hh|recruit|job/.test(slug)) score += 20;
        if (foodRequest && /coffee|cafe|food|evos/.test(slug)) score += 20;
        return { slug: provider.slug, score };
      })
      .filter((provider) => provider.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((provider) => provider.slug);

    return {
      needsCatalog: true,
      providerSlugs: ranked.length
        ? ranked
        : providers.slice(0, 4).map((provider: any) => provider.slug),
      query: prompt,
    };
  }

  private async loadLiveContext(plan: LiveContextPlan, providers: any[]) {
    const requested = plan.providerSlugs.length
      ? providers.filter((provider: any) =>
          plan.providerSlugs.includes(provider.slug),
        )
      : plan.needsCatalog
        ? providers.slice(0, 4)
        : [];

    return Promise.all(
      requested.map(async (provider: any) => {
        const base = {
          slug: provider.slug,
          name: provider.name,
          category: provider.category || provider.type,
          description: provider.description,
          geography: provider.geography,
        };
        if (!plan.needsCatalog) return base;

        try {
          let offerings: any[];
          try {
            offerings = await this.catalogService.searchOfferings(
              provider.slug,
              plan.query,
              undefined,
              undefined,
              8,
            );
          } catch {
            const catalog = await this.catalogService.getCatalog(provider.slug);
            offerings = catalog.offerings || [];
          }

          return {
            ...base,
            offerings: offerings
              .filter((item) => item.isAvailable !== false)
              .slice(0, 8)
              .map((item) => ({
                id: item.id,
                title: item.title,
                description: item.description,
                category: item.categoryTitle,
                price: item.basePrice,
                currency: item.currency,
                isAvailable: item.isAvailable !== false,
              })),
          };
        } catch (error) {
          this.logger.warn(
            `Live provider lookup failed for ${provider.slug}: ${String(error)}`,
          );
          return { ...base, liveDataUnavailable: true };
        }
      }),
    );
  }

  private async writeAnswer(input: {
    prompt: string;
    history: ConversationMessage[];
    providerIndex: Array<Record<string, unknown>>;
    liveContext: unknown[];
  }) {
    const instruction = this.buildInstruction(input);

    try {
      for (const model of this.models) {
        try {
          const result = await model.client.generateContent(instruction, {
            timeout: 45_000,
          });
          const content = result.response.text().trim();
          if (!content) throw new Error("empty Gemini response");
          return content;
        } catch {
          this.logger.warn(
            `Gemini model ${model.name} failed; trying fallback.`,
          );
        }
      }
      throw new Error("all Gemini models failed");
    } catch (error) {
      this.logger.error("Gemini response generation failed", error);
      throw new ServiceUnavailableException(
        "Zayuno hozir javob bera olmadi. Birozdan so‘ng qayta urinib ko‘ring.",
      );
    }
  }

  private buildInstruction(input: {
    prompt: string;
    history: ConversationMessage[];
    providerIndex: Array<Record<string, unknown>>;
    liveContext: unknown[];
  }) {
    let contextStr = "";
    if (input.providerIndex && input.providerIndex.length > 0) {
      contextStr += `\n[Tizimdagi xizmatlar]: ${JSON.stringify(input.providerIndex)}`;
    }
    if (input.liveContext && input.liveContext.length > 0) {
      contextStr += `\n[Jonli ma'lumotlar]: ${JSON.stringify(input.liveContext)}`;
    }

    let historyStr = "";
    if (input.history && input.history.length > 0) {
      historyStr = input.history
        .map(
          (m) => `${m.role === "user" ? "Foydalanuvchi" : "Zayuno"}: ${m.content}`,
        )
        .join("\n");
      historyStr = `\n[Oldingi suhbat]:\n${historyStr}\n`;
    }

    return `${contextStr}${historyStr}\nFoydalanuvchi: ${input.prompt}`;
  }
}
