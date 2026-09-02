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
    const systemInstruction = `You are Zayuno, a focused and helpful AI assistant for finding real services and jobs in Uzbekistan.
Always answer directly and naturally to the user in fluent, polite Uzbek Latin.
Be concise, warm, structured, and helpful.
Never output thinking tags, meta-commentary, planning steps, or English notes.

CRITICAL INSTRUCTION FOR LIVE DATA:
1. When LIVE_DATA contains offerings/vacancies:
   - YOU MUST IMMEDIATELY LIST AND PRESENT THEM TO THE USER.
   - For each vacancy or service, clearly list:
     • Nomi (Position / Service Title)
     • Kompaniya / Muassasa (Employer / Company)
     • Maosh / Narx (Salary / Price)
     • Ariza topshirish / Havola (Application link from live context)
   - NEVER say "hozircha takliflar mavjud emas" or "tizim yangilanmoqda" if offerings exist in LIVE_DATA.
2. Only if LIVE_DATA is completely empty, explain what is available in Uzbekistan and ask a helpful follow-up question.
3. Do not expose internal technical terms (like slugs, JSON keys, provider IDs).
4. Use clean markdown bullet points (• or *) for readability.`;

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
    const plan = this.planLiveContext(prompt, history, providers);
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

  private isGeneralGreeting(prompt: string, history: ConversationMessage[]): boolean {
    const raw = prompt.toLowerCase().trim();
    const isShort = raw.split(/\s+/).length <= 4;
    const isGreetingPattern =
      /^(salom|assalomu\s+alaykum|assalom|salom\s+alaykum|qandaysiz|qandaysan|qalaysiz|qalaysan|privet|hello|hi|hey|hayrli\s+tong|hayrli\s+kun|hayrli\s+kech|xush\s+kelibsiz)[\s!.,?]*$/i.test(
        raw,
      );
    // Only treat as general greeting if it's a greeting pattern and history is short or empty
    return isShort && isGreetingPattern && history.length <= 1;
  }

  private expandSearchTerms(term: string): string[] {
    const t = term.toLowerCase().trim();
    const synonyms: string[] = [];

    if (/web\s*dastur|veb\s*dastur|sayt|web/i.test(t)) {
      synonyms.push("web developer", "full stack", "frontend", "backend", "web dasturchi");
    }
    if (/node|express|nestjs/i.test(t)) {
      synonyms.push("node.js", "backend developer", "full stack");
    }
    if (/react|vue|angular|frontend/i.test(t)) {
      synonyms.push("react", "frontend developer", "javascript");
    }
    if (/python|django|fastapi/i.test(t)) {
      synonyms.push("python", "backend developer");
    }
    if (/dastur|program|it\b|kod|software/i.test(t)) {
      synonyms.push("developer", "dasturchi", "programmer");
    }
    if (/buxg|hisobchi|moliya|finans/i.test(t)) {
      synonyms.push("бухгалтер", "hisobchi", "accountant");
    }
    if (/dizayn|grafik|ui|ux|figma/i.test(t)) {
      synonyms.push("дизайнер", "designer", "ui ux");
    }
    if (/sotuv|menejer|sales|savdo/i.test(t)) {
      synonyms.push("менеджер", "sotuvchi", "sales");
    }
    if (/haydov|shof/i.test(t)) {
      synonyms.push("водитель", "haydovchi");
    }
    if (/oshpaz|povar/i.test(t)) {
      synonyms.push("повар", "oshpaz");
    }

    return Array.from(new Set([term, ...synonyms])).filter(Boolean);
  }

  private extractSearchKeywords(
    prompt: string,
    history: ConversationMessage[],
  ): string {
    const raw = prompt.toLowerCase();

    // Stopwords to strip
    const stopwords = [
      "menga", "bizga", "sizga", "sizdan", "uchun", "boyicha", "bo'yicha", "bo‘yicha", "haqida",
      "topib", "top", "ber", "bera", "olasanmi", "olasan", "bormi", "qanaqa", "qanday", "nima",
      "iltimos", "kerak", "qidir", "qidirib", "vakansiya", "vakansiyalar", "vakansiyakar", "vakansiyalari",
      "ishlar", "ish", "ishga", "taklif", "mavjud", "salom", "qani", "ko'rsat", "korsat", "aytib",
      "boladimi", "bo'ladimi", "yordam", "qilmoqchiman", "izlayapman",
      "мне", "для", "по", "про", "найди", "есть", "какие", "пожалуйста", "вакансии", "работа",
      "find", "get", "for", "me", "please", "can", "you", "show", "jobs", "vacancies",
    ];

    let cleaned = raw;
    for (const w of stopwords) {
      cleaned = cleaned.replace(new RegExp(`\\b${w}\\b`, "gi"), " ");
    }
    cleaned = cleaned
      .replace(/[^\p{L}\p{N}\s+#.-]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();

    // If prompt is just a short follow-up (e.g. "Toshkent", "Senior", "Ha")
    if (cleaned.length <= 2 && history.length > 0) {
      const prevUserMsgs = history.filter((m) => m.role === "user");
      if (prevUserMsgs.length > 0) {
        const lastUserMsg = prevUserMsgs[prevUserMsgs.length - 1].content;
        return this.extractSearchKeywords(lastUserMsg, []);
      }
    }

    if (cleaned.length > 0) return cleaned;

    // Fallback: check if prompt mentions general domains
    if (/dasturchi|developer|it\b|program/i.test(raw)) return "developer";
    if (/buxgalter|hisobchi|account/i.test(raw)) return "buxgalter";
    if (/marketing|smm/i.test(raw)) return "marketing";
    if (/haydovchi|driver/i.test(raw)) return "haydovchi";
    if (/kofe|coffee/i.test(raw)) return "coffee";
    if (/ovqat|food|lavash|burger/i.test(raw)) return "lavash";

    return prompt.trim();
  }

  private planLiveContext(
    prompt: string,
    history: ConversationMessage[],
    providers: any[],
  ): LiveContextPlan {
    // 1. If it is just a greeting, do NOT pull random provider offerings
    if (this.isGeneralGreeting(prompt, history)) {
      return {
        needsCatalog: false,
        providerSlugs: [],
        query: "",
      };
    }

    const fullContextText = (
      prompt +
      " " +
      history.map((h) => h.content).join(" ")
    ).toLowerCase();

    const recruitment =
      /ish|vakansi|headhunter|hh\b|job|resume|rezyume|cv\b|xodim|nomzod|developer|dasturchi|web|full|stack|frontend|backend|python|react|node|java|buxgalter|menejer|marketing/i.test(
        fullContextText,
      );
    const food =
      /ovqat|restoran|kafe|cafe|coffee|kofe|cappuccino|latte|espresso|ichimlik|yetkaz|lavash|burger|pizza/i.test(
        fullContextText,
      );

    const query = this.extractSearchKeywords(prompt, history);

    const providerSlugs: string[] = [];
    if (recruitment) {
      providerSlugs.push("hh-uz");
    }
    if (food) {
      providerSlugs.push("coffee-time");
    }

    // Only fallback to first providers if user explicitly asks for services
    const isServiceQuery = /xizmat|buyurtma|narx|qancha|qayerda|bor|top|qidir/i.test(fullContextText);
    if (providerSlugs.length === 0 && isServiceQuery) {
      providerSlugs.push(...providers.slice(0, 3).map((p) => p.slug));
    }

    return {
      needsCatalog: providerSlugs.length > 0,
      providerSlugs: Array.from(new Set(providerSlugs)),
      query,
    };
  }

  private async loadLiveContext(plan: LiveContextPlan, providers: any[]) {
    if (!plan.needsCatalog || plan.providerSlugs.length === 0) {
      return [];
    }

    const requested = providers.filter((provider: any) =>
      plan.providerSlugs.includes(provider.slug),
    );

    return Promise.all(
      requested.map(async (provider: any) => {
        const base = {
          slug: provider.slug,
          name: provider.name,
          category: provider.category || provider.type,
          description: provider.description,
          geography: provider.geography,
        };

        try {
          const rawOfferings: any[] = [];
          const seenIds = new Set<string>();

          // 1. Expand search terms and query provider
          const searchTerms = plan.query
            ? this.expandSearchTerms(plan.query)
            : [];

          for (const term of searchTerms) {
            try {
              const results = await this.catalogService.searchOfferings(
                provider.slug,
                term,
                undefined,
                undefined,
                8,
              );
              if (Array.isArray(results)) {
                for (const item of results) {
                  if (!seenIds.has(item.id)) {
                    seenIds.add(item.id);
                    rawOfferings.push(item);
                  }
                }
              }
            } catch (err) {
              this.logger.warn(
                `Search failed for ${provider.slug} term "${term}": ${String(err)}`,
              );
            }
            if (rawOfferings.length >= 8) break;
          }

          // 2. If 0 results, try fallback catalog
          if (rawOfferings.length === 0) {
            try {
              const catalog = await this.catalogService.getCatalog(
                provider.slug,
              );
              if (Array.isArray(catalog.offerings)) {
                for (const item of catalog.offerings) {
                  if (!seenIds.has(item.id)) {
                    seenIds.add(item.id);
                    rawOfferings.push(item);
                  }
                }
              }
            } catch (err) {
              this.logger.warn(
                `Catalog fallback failed for ${provider.slug}: ${String(err)}`,
              );
            }
          }

          return {
            ...base,
            offeringsCount: rawOfferings.length,
            offerings: rawOfferings
              .filter((item) => item.isAvailable !== false)
              .slice(0, 6)
              .map((item) => ({
                id: item.id,
                title: item.title,
                employer:
                  item.metadata?.employerName ||
                  item.description?.match(/Kompaniya:\s*([^\n]+)/)?.[1] ||
                  "Kompaniya",
                salary: item.metadata?.rawSalary
                  ? `${item.metadata.rawSalary.from || ""} - ${item.metadata.rawSalary.to || ""} ${item.metadata.rawSalary.currency || ""}`.trim()
                  : item.basePrice > 0
                    ? `${item.basePrice} ${item.currency}`
                    : "Kelishilgan maosh",
                location:
                  item.description?.match(/Hudud:\s*([^\n]+)/)?.[1] ||
                  "O'zbekiston",
                applicationLink:
                  item.metadata?.alternateUrl ||
                  item.description?.match(/https:\/\/[^\s]+/)?.[0] ||
                  "",
                summary: item.description?.substring(0, 200) || "",
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
