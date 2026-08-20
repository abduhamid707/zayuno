import { ParsedRecruitmentPost, RecruitmentListingType } from './types.js';

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#036;/g, '$')
    .replace(/&nbsp;/g, ' ');
}

function extractHashtags(text: string): string[] {
  const matches = text.match(/#[a-zA-Z0-9_]+/g);
  if (!matches) return [];
  return matches.map(tag => tag.substring(1).toLowerCase());
}

function determineListingType(text: string, hashtags: string[]): RecruitmentListingType {
  const lowerText = text.toLowerCase();
  const tagSet = new Set(hashtags);

  // Strict Candidate Identification
  if (tagSet.has('xodim') || tagSet.has('shogird') || lowerText.includes('ish joyi kerak') || lowerText.includes('ish kerak')) {
    return 'candidate';
  }

  // Strict Job Vacancy Identification
  if (tagSet.has('ishjoyi') || tagSet.has('ish_joyi') || tagSet.has('vakansiya') || lowerText.includes('hodim kerak') || lowerText.includes('xodim kerak')) {
    return 'job';
  }

  // Project / Freelance
  if (tagSet.has('sherik') || tagSet.has('frilans') || tagSet.has('loyiha') || lowerText.includes('sherik kerak') || lowerText.includes('loyiha uchun')) {
    return 'project';
  }

  return 'candidate';
}

function extractField(text: string, patterns: RegExp[]): string {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return '';
}

function parseSalaryAmount(salaryStr: string): { amount: number; currency: string } {
  if (!salaryStr) return { amount: 0, currency: 'UZS' };
  const clean = salaryStr.toLowerCase().trim();

  // Check USD ($500, 500$, 500 usd)
  if (clean.includes('$') || clean.includes('usd') || clean.includes('dollar')) {
    const numMatch = clean.match(/(\d+(?:[.,]\d+)?)/);
    if (numMatch) {
      const usdVal = parseFloat(numMatch[1].replace(',', '.'));
      return { amount: usdVal * 12800, currency: 'UZS' };
    }
  }

  // Check million (5mln, 5 mln, 5 000 000)
  if (clean.includes('mln') || clean.includes('million')) {
    const numMatch = clean.match(/(\d+(?:[.,]\d+)?)/);
    if (numMatch) {
      const val = parseFloat(numMatch[1].replace(',', '.'));
      return { amount: Math.round(val * 1_000_000), currency: 'UZS' };
    }
  }

  // Check thousand (450 ming, 500k)
  if (clean.includes('ming') || clean.includes('k')) {
    const numMatch = clean.match(/(\d+(?:[.,]\d+)?)/);
    if (numMatch) {
      const val = parseFloat(numMatch[1].replace(',', '.'));
      return { amount: Math.round(val * 1_000), currency: 'UZS' };
    }
  }

  // Pure digits
  const pureDigits = clean.replace(/[^0-9]/g, '');
  if (pureDigits.length >= 4) {
    return { amount: parseInt(pureDigits, 10), currency: 'UZS' };
  }

  return { amount: 0, currency: 'UZS' };
}

function extractSkills(rawSkills: string, hashtags: string[]): string[] {
  const skillsSet = new Set<string>();

  if (rawSkills) {
    const cleaned = rawSkills
      .replace(/backend:?/gi, '')
      .replace(/frontend:?/gi, '')
      .replace(/mobile:?/gi, '')
      .replace(/devops:?/gi, '');

    const tokens = cleaned.split(/[,;\n\/\+]+/).map(s => s.trim()).filter(s => s.length > 1);
    for (const t of tokens) {
      skillsSet.add(t);
    }
  }

  const skipTags = new Set([
    'xodim', 'shogird', 'ishjoyi', 'ish_joyi', 'vakansiya', 'sherik', 'frilans', 'loyiha',
    'toshkent', 'samarqand', 'fargona', 'andijon', 'namangan', 'buxoro', 'navoiy',
    'qashqadaryo', 'surxondaryo', 'jizzax', 'sirdaryo', 'xorazm', 'qoraqalpogiston'
  ]);

  for (const tag of hashtags) {
    if (!skipTags.has(tag) && tag.length > 1) {
      skillsSet.add(tag);
    }
  }

  return Array.from(skillsSet);
}

/**
 * Remove PII (phone numbers, telegram handles, emails) from public text presentation
 * while preserving the canonical Telegram post URL.
 */
export function sanitizeRecruitmentText(text: string): string {
  return text
    .replace(/(?:📞|Aloqa|Telefon|Tel|Phone|Aloqa uchun|Bog'lanish|Murojaat vaqti)[^\n]*(\+?998[\d\s-]{7,}|[\d\s-]{9,})[^\n]*/gi, '')
    .replace(/(?:🇺🇿|Telegram|Tg|User|Username)[^\n]*@[a-zA-Z0-9_]{4,}[^\n]*/gi, '')
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi, '[email himoyalangan]')
    .replace(/👉\s*@[a-zA-Z0-9_]+\s*kanaliga ulanish/gi, '')
    .trim();
}

function calculateConfidenceScore(params: {
  hasCategoryTag: boolean;
  hasRole: boolean;
  skillsCount: number;
  hasLocation: boolean;
  hasSalary: boolean;
}): number {
  let score = 0.2; // base score
  if (params.hasCategoryTag) score += 0.3;
  if (params.hasRole) score += 0.2;
  if (params.skillsCount >= 1) score += 0.2;
  if (params.hasLocation || params.hasSalary) score += 0.1;
  return Math.min(1.0, Math.round(score * 100) / 100);
}

export function parseTelegramChannelPost(rawHtmlOrText: string, postUrl: string, postedAt?: string): ParsedRecruitmentPost | null {
  const decoded = decodeHtmlEntities(rawHtmlOrText);
  const cleanText = decoded
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .trim();

  if (!cleanText || cleanText.length < 20) return null;

  const postIdMatch = postUrl.match(/\/(\d+)$/);
  const postId = postIdMatch ? parseInt(postIdMatch[1], 10) : Date.now();
  const hashtags = extractHashtags(cleanText);
  const type = determineListingType(cleanText, hashtags);

  // Extract fields
  const candidateName = extractField(cleanText, [
    /(?:👨‍💼|🎓|👤)?\s*(?:Xodim|Ustoz|Talabgor):\s*([^\n]+)/i
  ]);

  const companyName = extractField(cleanText, [
    /(?:🏢|🏬)?\s*(?:Idora|Kompaniya|Korxona|Loyiha):\s*([^\n]+)/i
  ]);

  const profession = extractField(cleanText, [
    /(?:👨🏻‍💻|💼)?\s*(?:Kasbi|Lavozim|Mutaxassislik|Yo'nalish):\s*([^\n]+)/i
  ]);

  const techField = extractField(cleanText, [
    /(?:📚)?\s*(?:Texnologiya|Texnologiyalar|Talablar|Ko'nikmalar):\s*([^\n]+(?:\n(?!\s*(?:🇺🇿|📞|🌐|💰|🕰|🔎|#))[^\n]+)*)/i
  ]);

  const locationField = extractField(cleanText, [
    /(?:🌐|📍)?\s*(?:Hudud|Joylashuv|Shahar):\s*([^\n]+)/i
  ]);

  const salaryField = extractField(cleanText, [
    /(?:💰|💵)?\s*(?:Narxi|Maosh|Oylik|Kutilayotgan maosh):\s*([^\n]+)/i
  ]);

  const experienceField = extractField(cleanText, [
    /(?:⏱|⏳)?\s*(?:Tajriba|Ish staji):\s*([^\n]+)/i,
    /(?:🔎\s*Maqsad:[^\n]*?(\d+(?:\.\d+)?\s*(?:yil|oy)[^\n]*tajriba)[^\n]*)/i
  ]);

  const purposeField = extractField(cleanText, [
    /(?:🔎)?\s*(?:Maqsad|Talablar|Vazifalar|Qo'shimcha):\s*([\s\S]*?)(?=(?:#|$))/i
  ]);

  const skills = extractSkills(techField, hashtags);
  const { amount: salaryAmount, currency } = parseSalaryAmount(salaryField);

  // Build clean title
  let roleTitle = profession;
  if (!roleTitle && skills.length > 0) {
    roleTitle = `${skills.slice(0, 3).join(' / ')} Mutaxassis`;
  }
  if (!roleTitle) {
    roleTitle = type === 'candidate' ? 'Dasturchi / Mutaxassis' : 'IT Vakansiya';
  }

  const prefix = type === 'candidate' ? '[Nomzod]' : type === 'job' ? '[Vakansiya]' : '[Loyiha]';
  const nameOrCompany = candidateName || companyName;
  const title = nameOrCompany ? `${prefix} ${roleTitle} (${nameOrCompany})` : `${prefix} ${roleTitle}`;

  // Build clean summary without leaked PII
  const summaryParts: string[] = [];
  if (roleTitle) summaryParts.push(`Mutaxassislik: ${roleTitle}`);
  if (skills.length > 0) summaryParts.push(`Texnologiyalar: ${skills.join(', ')}`);
  if (locationField) summaryParts.push(`Hudud: ${locationField}`);
  if (experienceField) summaryParts.push(`Tajriba: ${experienceField}`);
  if (salaryField) summaryParts.push(`Maosh: ${salaryField}`);
  if (purposeField) {
    const cleanPurpose = sanitizeRecruitmentText(purposeField).trim();
    if (cleanPurpose) summaryParts.push(`Qisqacha: ${cleanPurpose.slice(0, 200)}...`);
  }

  const confidenceScore = calculateConfidenceScore({
    hasCategoryTag: hashtags.includes('xodim') || hashtags.includes('shogird') || hashtags.includes('ishjoyi') || hashtags.includes('vakansiya'),
    hasRole: Boolean(profession),
    skillsCount: skills.length,
    hasLocation: Boolean(locationField),
    hasSalary: Boolean(salaryField && salaryAmount > 0)
  });

  return {
    id: `us_${type}_${postId}`,
    postId,
    channel: 'UstozShogird',
    type,
    title,
    summary: summaryParts.join(' | '),
    role: roleTitle,
    skills,
    location: locationField || 'O‘zbekiston / Masofaviy',
    salary: salaryField || 'Kelishuv asosida',
    salaryAmount,
    currency,
    experience: experienceField || 'Ko‘rsatilmagan',
    confidenceScore,
    postUrl,
    postedAt: postedAt || new Date().toISOString(),
    hashtags
  };
}

export function parseTelegramChannelHtml(html: string, channelName = 'UstozShogird'): ParsedRecruitmentPost[] {
  const posts: ParsedRecruitmentPost[] = [];
  const messageBlocks = [...html.matchAll(/class="tgme_widget_message_wrap[^\"]*"[\s\S]*?(?=class="tgme_widget_message_wrap|$)/g)];

  for (const blockMatch of messageBlocks) {
    const block = blockMatch[0];
    const linkMatch = block.match(/href="(https:\/\/t\.me\/[a-zA-Z0-9_]+\/\d+)"/i);
    const textMatch = block.match(/<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    const timeMatch = block.match(/datetime="([^"]+)"/i);

    if (textMatch && linkMatch) {
      const post = parseTelegramChannelPost(textMatch[1], linkMatch[1], timeMatch ? timeMatch[1] : undefined);
      if (post) {
        post.channel = channelName;
        posts.push(post);
      }
    }
  }

  return posts;
}
