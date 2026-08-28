import fetch from 'node-fetch';
import { type CatalogCategory, type Location, type Offering } from '@zayuno/contracts';

export interface HhClientConfig {
  clientId: string;
  clientSecret: string;
  userAgent?: string;
  apiBaseUrl?: string;
  authBaseUrl?: string;
}

export interface HhSearchOptions {
  text?: string;
  area?: string;
  salary?: number;
  currency?: string;
  onlyWithSalary?: boolean;
  experience?: string;
  schedule?: string;
  employment?: string;
  page?: number;
  perPage?: number;
}

export class HeadHunterClient {
  private clientId: string;
  private clientSecret: string;
  private userAgent: string;
  private apiBaseUrl: string;
  private authBaseUrl: string;

  private cachedToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(config: HhClientConfig) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.userAgent = config.userAgent || 'Zayuno/1.0 (support@zayuno.uz)';
    this.apiBaseUrl = (config.apiBaseUrl || 'https://api.hh.ru').replace(/\/$/, '');
    this.authBaseUrl = (config.authBaseUrl || 'https://hh.ru').replace(/\/$/, '');
  }

  private get cacheFilePath(): string {
    return require('path').join(process.cwd(), '.cache', '.hh-token-cache.json');
  }

  /**
   * Get a valid OAuth2 Bearer Token with automatic caching and proactive refresh.
   */
  public async getAccessToken(): Promise<string | null> {
    const now = Date.now();
    
    // 1. Try memory cache
    if (this.cachedToken && this.tokenExpiresAt > now + 300000) {
      return this.cachedToken;
    }

    // 2. Try file cache
    try {
      const fs = require('fs');
      if (fs.existsSync(this.cacheFilePath)) {
        const fileData = JSON.parse(fs.readFileSync(this.cacheFilePath, 'utf8'));
        if (fileData.cachedToken && fileData.tokenExpiresAt > now + 300000) {
          this.cachedToken = fileData.cachedToken;
          this.tokenExpiresAt = fileData.tokenExpiresAt;
          return this.cachedToken;
        }
      }
    } catch (err) {
      // Ignore file read errors
    }

    try {
      const response = await fetch(`${this.authBaseUrl}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': this.userAgent,
          'HH-User-Agent': this.userAgent
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret
        })
      });

      if (!response.ok) {
        const errBody: any = await response.json().catch(() => ({}));
        if (errBody?.error_description?.includes('too early') && this.cachedToken) {
          return this.cachedToken;
        }
        return this.cachedToken || null;
      }

      const data: any = await response.json();
      this.cachedToken = data.access_token;
      // Default to 14 days if expiresIn is not explicitly returned
      const expiresInSeconds = Number(data.expires_in) || 14 * 24 * 3600;
      this.tokenExpiresAt = now + expiresInSeconds * 1000;

      // Save to file cache
      try {
        const fs = require('fs');
        const path = require('path');
        const dir = path.dirname(this.cacheFilePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(this.cacheFilePath, JSON.stringify({
          cachedToken: this.cachedToken,
          tokenExpiresAt: this.tokenExpiresAt
        }), 'utf8');
      } catch (err) {
        // Ignore file write errors
      }

      return this.cachedToken;
    } catch (error: any) {
      return this.cachedToken || null;
    }
  }

  private async request<T>(path: string, options: { method?: string; query?: Record<string, any> } = {}): Promise<T> {
    const token = await this.getAccessToken().catch(() => null);
    const url = new URL(`${this.apiBaseUrl}${path}`);
    if (options.query) {
      for (const [key, value] of Object.entries(options.query)) {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const headers: Record<string, string> = {
      'User-Agent': this.userAgent,
      'HH-User-Agent': this.userAgent,
      'Accept': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(url.toString(), {
      method: options.method || 'GET',
      headers
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`HH API error ${res.status} on ${path}: ${errText}`);
    }

    return (await res.json()) as T;
  }

  /**
   * Parse natural language query to extract region, salary, and clean search keywords.
   */
  public parseNaturalQuery(rawText: string): { cleanText: string; area?: string; salary?: number; currency?: string } {
    if (!rawText) return { cleanText: '' };
    let text = rawText.trim();
    let area: string | undefined = undefined;
    let salary: number | undefined = undefined;
    let currency: string | undefined = undefined;

    // 1. Region mappings with regex
    const regionMap: Array<{ regex: RegExp; areaId: string }> = [
      { regex: /\b(sirdaryo[a-z]*|сырдарь[а-я]*|guliston[a-z]*|гулистан[а-я]*)\b/gi, areaId: '2775' },
      { regex: /\b(toshkent[a-z]*|ташкент[а-я]*|tashkent[a-z]*)\b/gi, areaId: '2759' },
      { regex: /\b(samarqand[a-z]*|самарканд[а-я]*|samarkand[a-z]*)\b/gi, areaId: '2774' },
      { regex: /\b(farg['‘`]?ona[a-z]*|ферган[а-я]*|fergana[a-z]*)\b/gi, areaId: '2778' },
      { regex: /\b(andijon[a-z]*|андижан[а-я]*|andijan[a-z]*)\b/gi, areaId: '2758' },
      { regex: /\b(namangan[a-z]*|наманган[а-я]*)\b/gi, areaId: '2771' },
      { regex: /\b(buxoro[a-z]*|бухар[а-я]*|bukhara[a-z]*)\b/gi, areaId: '2761' },
      { regex: /\b(qashqadaryo[a-z]*|кашкадарь[а-я]*|qarshi[a-z]*|карши[а-я]*)\b/gi, areaId: '2764' },
      { regex: /\b(surxondaryo[a-z]*|сурхандарь[а-я]*|termiz[a-z]*|термез[а-я]*)\b/gi, areaId: '2777' },
      { regex: /\b(jizzax[a-z]*|джизак[а-я]*)\b/gi, areaId: '2762' },
      { regex: /\b(xorazm[a-z]*|хорезм[а-я]*|urganch[a-z]*|ургенч[а-я]*)\b/gi, areaId: '2779' },
      { regex: /\b(navoiy[a-z]*|навои[а-я]*)\b/gi, areaId: '2769' },
      { regex: /\b(qoraqalpog['‘`]?iston[a-z]*|каракалпак[а-я]*|nukus[a-z]*|нукус[а-я]*)\b/gi, areaId: '2763' }
    ];

    for (const r of regionMap) {
      if (r.regex.test(text)) {
        area = r.areaId;
        text = text.replace(r.regex, ' ');
        break;
      }
    }

    // 2. Salary extraction (e.g. 10mln, 15 mln, 500$, 10000000)
    const mlnMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:mln|млн|million|миллион)/i);
    if (mlnMatch) {
      const num = parseFloat(mlnMatch[1].replace(',', '.'));
      salary = Math.round(num * 1000000);
      currency = 'UZS';
      text = text.replace(mlnMatch[0], ' ');
    } else {
      const usdMatch = text.match(/\$?\s*(\d+)\s*(?:\$|usd|доллар)/i);
      if (usdMatch) {
        salary = parseInt(usdMatch[1], 10);
        currency = 'USD';
        text = text.replace(usdMatch[0], ' ');
      }
    }

    // 3. Remove conversational noise words
    text = text
      .replace(/\b(kerak|beraman|top|topib\s*ber|qidir|oylik|ish|vakansiya|vakansiyalari|qidiryapman|bo['‘`]?lsin|dasturchisi)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return { cleanText: text, area, salary, currency };
  }

  /**
   * Search vacancies across Uzbekistan with rich filtering.
   */
  public async searchVacancies(opts: HhSearchOptions = {}): Promise<{ total: number; offerings: Offering[] }> {
    let rawText = opts.text || '';
    let area = opts.area;
    let salary = opts.salary;
    let currency = opts.currency;

    if (rawText) {
      const parsed = this.parseNaturalQuery(rawText);
      if (parsed.area && !area) area = parsed.area;
      if (parsed.salary && !salary) salary = parsed.salary;
      if (parsed.currency && !currency) currency = parsed.currency;
      if (parsed.cleanText) rawText = parsed.cleanText;
    }

    const queryParams: Record<string, any> = {
      text: rawText || undefined,
      area: area || '97', // Default to Uzbekistan (97)
      salary: salary || undefined,
      currency: currency || undefined,
      only_with_salary: opts.onlyWithSalary ? 'true' : undefined,
      experience: opts.experience || undefined,
      schedule: opts.schedule || undefined,
      employment: opts.employment || undefined,
      page: opts.page || 0,
      per_page: Math.min(opts.perPage || 20, 100)
    };

    let data: any;
    try {
      data = await this.request('/vacancies', { query: queryParams });
    } catch (err: any) {
      console.error('HH API Search Error:', err.message || err);
      // Do NOT swallow upstream HTTP errors as empty results.
      // Let callers distinguish "0 results found" from "upstream failed".
      throw new Error(`Upstream recruitment service unavailable: ${err.message}`);
    }
    let items: any[] = data.items || [];

    // Fallback: If 0 items found in a specific region, search with Uzbekistan area or fallback keywords
    if (items.length === 0 && area && area !== '97') {
      const fallbackParams = { ...queryParams, area: '97' };
      let fallbackData: any;
      try {
        fallbackData = await this.request('/vacancies', { query: fallbackParams });
      } catch {
        fallbackData = { items: [], found: 0 };
      }
      if (fallbackData.items && fallbackData.items.length > 0) {
        items = fallbackData.items;
        data.found = fallbackData.found;
      }
    }

    const offerings = items.map(item => this.mapVacancyToOffering(item));
    return {
      total: data.found || offerings.length,
      offerings
    };
  }

  /**
   * Get full details for a single vacancy including key skills and employer metadata.
   */
  public async getVacancy(id: string): Promise<Offering | null> {
    try {
      const data: any = await this.request(`/vacancies/${id}`);
      return this.mapVacancyToOffering(data, true);
    } catch (err: any) {
      if (String(err?.message || '').includes('404')) {
        return null;
      }
      throw err;
    }
  }

  /**
   * Check connection health to HeadHunter API.
   * Probe 1: Public vacancy search availability (must succeed for any useful operation).
   * Probe 2: OAuth client credentials token fetch (needed for employer-only features).
   *
   * Status semantics:
   *   HEALTHY  — both probes passed
   *   DEGRADED — public search OK, OAuth credentials unconfigured or failing
   *   DOWN     — public search unreachable (upstream HH API down)
   */
  public async checkHealth(): Promise<{ status: 'HEALTHY' | 'DEGRADED' | 'DOWN'; latencyMs: number; message: string }> {
    const start = Date.now();

    // Probe 1: Vacancy search availability (uses auth if configured)
    let searchOk = false;
    try {
      await this.request('/vacancies', { query: { per_page: 1, area: '97' } });
      searchOk = true;
    } catch {
      searchOk = false;
    }

    if (!searchOk) {
      return {
        status: 'DOWN',
        latencyMs: Date.now() - start,
        message: 'Upstream HeadHunter API unreachable.'
      };
    }

    // Probe 2: OAuth client credentials readiness
    let oauthOk = false;
    try {
      const token = await this.getAccessToken();
      oauthOk = typeof token === 'string' && token.length > 0;
    } catch {
      oauthOk = false;
    }

    const latencyMs = Date.now() - start;

    if (oauthOk) {
      return {
        status: 'HEALTHY',
        latencyMs,
        message: 'HeadHunter Uzbekistan API gateway operational.'
      };
    }

    // Public search works but OAuth is degraded (no credentials configured or token rejected)
    return {
      status: 'DEGRADED',
      latencyMs,
      message: 'Public vacancy search operational; OAuth credentials unconfigured or degraded.'
    };
  }


  /**
   * Convert an HH Vacancy object to a standardized Zayuno Offering.
   */
  public mapVacancyToOffering(item: any, isDetailed: boolean = false): Offering {
    const rawId = String(item.id);
    const id = `hh_${rawId}`;
    const title = item.name || 'Vakansiya';
    const employerName = item.employer?.name || 'Noma\'lum ish beruvchi';
    const areaName = item.area?.name || 'O‘zbekiston';
    
    // Salary calculation
    let basePrice = 0;
    let currency: 'UZS' | 'USD' | 'EUR' = 'UZS';
    let salaryText = 'Kelishilgan maosh';
    if (item.salary) {
      const rawCurr = String(item.salary.currency || 'UZS').toUpperCase();
      if (rawCurr === 'USD') currency = 'USD';
      else if (rawCurr === 'EUR') currency = 'EUR';
      else currency = 'UZS';

      if (item.salary.from && item.salary.to) {
        basePrice = Number(item.salary.from) || 0;
        salaryText = `${item.salary.from.toLocaleString()} - ${item.salary.to.toLocaleString()} ${rawCurr}`;
      } else if (item.salary.from) {
        basePrice = Number(item.salary.from) || 0;
        salaryText = `${item.salary.from.toLocaleString()} ${rawCurr} dan`;
      } else if (item.salary.to) {
        basePrice = Number(item.salary.to) || 0;
        salaryText = `${item.salary.to.toLocaleString()} ${rawCurr} gacha`;
      }
    }

    const exp = item.experience?.name ? `Tajriba: ${item.experience.name}` : '';
    const sched = item.schedule?.name ? `Ish tartibi: ${item.schedule.name}` : '';
    const empType = item.employment?.name ? `Bandlik: ${item.employment.name}` : '';
    const skillsList = Array.isArray(item.key_skills) && item.key_skills.length > 0
      ? `Ko'nikmalar: ${item.key_skills.map((k: any) => k.name).join(', ')}`
      : '';

    let cleanDesc = '';
    if (item.description) {
      cleanDesc = item.description
        .replace(/<[^>]*>?/gm, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    } else if (item.snippet?.requirement || item.snippet?.responsibility) {
      cleanDesc = [item.snippet?.requirement, item.snippet?.responsibility]
        .filter(Boolean)
        .join(' ')
        .replace(/<[^>]*>?/gm, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    const summaryParts = [
      `🏢 Kompaniya: ${employerName}`,
      `📍 Hudud: ${areaName}`,
      `💰 Maosh: ${salaryText}`,
      exp,
      sched,
      empType,
      skillsList,
      cleanDesc ? `\n\nTavsif: ${cleanDesc.substring(0, isDetailed ? 600 : 200)}...` : '',
      `\n🔗 Batafsil va ariza topshirish: ${item.alternate_url || `https://hh.uz/vacancy/${rawId}`}`
    ].filter(Boolean);

    const description = summaryParts.join('\n').substring(0, 1950);
    const categorySlug = this.inferCategorySlug(title, cleanDesc);

    return {
      id,
      providerId: 'hh-uz',
      offeringCode: rawId,
      title: `${title} (${employerName})`.substring(0, 255),
      description,
      categorySlug,
      categoryTitle: this.getCategoryTitle(categorySlug),
      imageUrl: 'https://zayuno.uz/assets/hh-logo.png',
      basePrice,
      currency,
      isAvailable: !item.archived,
      variants: [],
      optionGroups: [],
      tags: [
        'vakansiya',
        'ish',
        'recruitment',
        'job',
        areaName.toLowerCase(),
        employerName.toLowerCase(),
        categorySlug
      ],
      metadata: {
        employerName,
        employerId: item.employer?.id,
        trustedEmployer: item.employer?.trusted,
        alternateUrl: item.alternate_url || `https://hh.uz/vacancy/${rawId}`,
        rawSalary: item.salary
      }
    };
  }

  private inferCategorySlug(title: string, desc: string): string {
    const text = `${title} ${desc}`.toLowerCase();
    if (text.includes('developer') || text.includes('dasturchi') || text.includes('frontend') || text.includes('backend') || text.includes('devops') || text.includes('qa') || text.includes('python') || text.includes('node') || text.includes('react') || text.includes('flutter') || text.includes('java')) {
      return 'it-software';
    }
    if (text.includes('sotuv') || text.includes('savdo') || text.includes('sales') || text.includes('operator') || text.includes('kassir')) {
      return 'sales-commerce';
    }
    if (text.includes('marketing') || text.includes('dizayn') || text.includes('design') || text.includes('smm') || text.includes('target') || text.includes('grafik')) {
      return 'marketing-design';
    }
    if (text.includes('buxgalter') || text.includes('moliya') || text.includes('hisobchi') || text.includes('auditor') || text.includes('finance')) {
      return 'finance-accounting';
    }
    if (text.includes('direktor') || text.includes('rahbar') || text.includes('menejer') || text.includes('manager') || text.includes('lead')) {
      return 'management';
    }
    return 'general';
  }

  private getCategoryTitle(slug: string): string {
    switch (slug) {
      case 'it-software': return 'IT, Dasturlash va Raqamli Texnologiyalar';
      case 'sales-commerce': return 'Savdo, Sotuv va Mijozlar Bilan Ishlash';
      case 'marketing-design': return 'Marketing, Reklama va Dizayn';
      case 'finance-accounting': return 'Moliya, Buxgalteriya va Audit';
      case 'management': return 'Boshqaruv va Loyiha Menejmenti';
      default: return 'Boshqa Kasblar va Xizmatlar';
    }
  }

  public getStandardCategories(): CatalogCategory[] {
    return [
      {
        id: 'cat_it',
        slug: 'it-software',
        title: 'IT, Dasturlash va Raqamli Texnologiyalar',
        description: 'Dasturchilar, DevOps, QA muhandislari va IT mutaxassislari uchun vakansiyalar',
        displayOrder: 1
      },
      {
        id: 'cat_sales',
        slug: 'sales-commerce',
        title: 'Savdo, Sotuv va Mijozlar Bilan Ishlash',
        description: 'Sotuv menejerlari, savdo vakillari, operatorlar va kassa mutaxassislari',
        displayOrder: 2
      },
      {
        id: 'cat_marketing',
        slug: 'marketing-design',
        title: 'Marketing, Reklama va Dizayn',
        description: 'SMM, targetologlar, grafik dizaynerlar va brend menejerlari',
        displayOrder: 3
      },
      {
        id: 'cat_finance',
        slug: 'finance-accounting',
        title: 'Moliya, Buxgalteriya va Audit',
        description: 'Bosh buxgalterlar, moliyaviy tahlilchilar va auditorlar',
        displayOrder: 4
      },
      {
        id: 'cat_management',
        slug: 'management',
        title: 'Boshqaruv va Loyiha Menejmenti',
        description: 'Project managerlar, mahsulot rahbarlari va top-menejerlar',
        displayOrder: 5
      },
      {
        id: 'cat_general',
        slug: 'general',
        title: 'Boshqa Kasblar va Xizmatlar',
        description: 'Barcha yo‘nalishlardagi faol ochiq ish o‘rinlari',
        displayOrder: 6
      }
    ];
  }

  public getStandardLocations(): Location[] {
    const hours = { open: '00:00', close: '23:59', days: [1, 2, 3, 4, 5, 6, 7] };
    return [
      {
        id: 'loc_tashkent',
        providerId: 'hh-uz',
        providerLocationId: '2759',
        name: 'Toshkent shahri va viloyati',
        address: 'O‘zbekiston, Toshkent',
        coordinates: { latitude: 41.311081, longitude: 69.240562 },
        operatingHours: hours,
        serviceRadiusKm: 50,
        isActive: true,
        metadata: {}
      },
      {
        id: 'loc_samarkand',
        providerId: 'hh-uz',
        providerLocationId: '2774',
        name: 'Samarqand viloyati',
        address: 'O‘zbekiston, Samarqand',
        coordinates: { latitude: 39.654167, longitude: 66.959722 },
        operatingHours: hours,
        serviceRadiusKm: 50,
        isActive: true,
        metadata: {}
      },
      {
        id: 'loc_fergana',
        providerId: 'hh-uz',
        providerLocationId: '2778',
        name: 'Farg‘ona viloyati',
        address: 'O‘zbekiston, Farg‘ona',
        coordinates: { latitude: 40.386389, longitude: 71.786389 },
        operatingHours: hours,
        serviceRadiusKm: 50,
        isActive: true,
        metadata: {}
      },
      {
        id: 'loc_andijan',
        providerId: 'hh-uz',
        providerLocationId: '2758',
        name: 'Andijon viloyati',
        address: 'O‘zbekiston, Andijon',
        coordinates: { latitude: 40.782056, longitude: 72.344247 },
        operatingHours: hours,
        serviceRadiusKm: 50,
        isActive: true,
        metadata: {}
      },
      {
        id: 'loc_namangan',
        providerId: 'hh-uz',
        providerLocationId: '2771',
        name: 'Namangan viloyati',
        address: 'O‘zbekiston, Namangan',
        coordinates: { latitude: 40.998301, longitude: 71.672569 },
        operatingHours: hours,
        serviceRadiusKm: 50,
        isActive: true,
        metadata: {}
      },
      {
        id: 'loc_bukhara',
        providerId: 'hh-uz',
        providerLocationId: '2761',
        name: 'Buxoro viloyati',
        address: 'O‘zbekiston, Buxoro',
        coordinates: { latitude: 39.774722, longitude: 64.428611 },
        operatingHours: hours,
        serviceRadiusKm: 50,
        isActive: true,
        metadata: {}
      },
      {
        id: 'loc_syrdarya',
        providerId: 'hh-uz',
        providerLocationId: '2775',
        name: 'Sirdaryo viloyati (Guliston)',
        address: 'O‘zbekiston, Guliston',
        coordinates: { latitude: 40.489722, longitude: 68.784167 },
        operatingHours: hours,
        serviceRadiusKm: 50,
        isActive: true,
        metadata: {}
      },
      {
        id: 'loc_kashkadarya',
        providerId: 'hh-uz',
        providerLocationId: '2764',
        name: 'Qashqadaryo viloyati (Qarshi)',
        address: 'O‘zbekiston, Qarshi',
        coordinates: { latitude: 38.861111, longitude: 65.784722 },
        operatingHours: hours,
        serviceRadiusKm: 50,
        isActive: true,
        metadata: {}
      },
      {
        id: 'loc_surkhandarya',
        providerId: 'hh-uz',
        providerLocationId: '2777',
        name: 'Surxondaryo viloyati (Termiz)',
        address: 'O‘zbekiston, Termiz',
        coordinates: { latitude: 37.224167, longitude: 67.278333 },
        operatingHours: hours,
        serviceRadiusKm: 50,
        isActive: true,
        metadata: {}
      },
      {
        id: 'loc_jizzakh',
        providerId: 'hh-uz',
        providerLocationId: '2762',
        name: 'Jizzax viloyati',
        address: 'O‘zbekiston, Jizzax',
        coordinates: { latitude: 40.115833, longitude: 67.842222 },
        operatingHours: hours,
        serviceRadiusKm: 50,
        isActive: true,
        metadata: {}
      },
      {
        id: 'loc_khorezm',
        providerId: 'hh-uz',
        providerLocationId: '2779',
        name: 'Xorazm viloyati (Urganch)',
        address: 'O‘zbekiston, Urganch',
        coordinates: { latitude: 41.550000, longitude: 60.633333 },
        operatingHours: hours,
        serviceRadiusKm: 50,
        isActive: true,
        metadata: {}
      },
      {
        id: 'loc_navoiy',
        providerId: 'hh-uz',
        providerLocationId: '2769',
        name: 'Navoiy viloyati',
        address: 'O‘zbekiston, Navoiy',
        coordinates: { latitude: 40.084444, longitude: 65.379167 },
        operatingHours: hours,
        serviceRadiusKm: 50,
        isActive: true,
        metadata: {}
      },
      {
        id: 'loc_karakalpakstan',
        providerId: 'hh-uz',
        providerLocationId: '2763',
        name: 'Qoraqalpog‘iston Respublikasi (Nukus)',
        address: 'O‘zbekiston, Nukus',
        coordinates: { latitude: 42.460278, longitude: 59.616667 },
        operatingHours: hours,
        serviceRadiusKm: 100,
        isActive: true,
        metadata: {}
      },
      {
        id: 'loc_remote',
        providerId: 'hh-uz',
        providerLocationId: 'remote',
        name: 'Masofaviy ish (Remote / Uydan ishlash)',
        address: 'Butun O‘zbekiston bo‘ylab masofaviy',
        coordinates: { latitude: 41.311081, longitude: 69.240562 },
        operatingHours: hours,
        serviceRadiusKm: 1000,
        isActive: true,
        metadata: {}
      }
    ];
  }
}
