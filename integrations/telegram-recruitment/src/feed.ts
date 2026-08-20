import { Offering, CatalogCategory } from '@zayuno/contracts';
import { ParsedRecruitmentPost, RecruitmentSearchFilter } from './types.js';
import { TelegramChannelFetcher } from './mtproto.js';

export const RECRUITMENT_CATEGORIES: CatalogCategory[] = [
  {
    id: 'cat_candidates',
    slug: 'candidate',
    title: 'Nomzodlar / Dasturchilar',
    description: 'Ish qidirayotgan dasturchilar, IT mutaxassislar va shogirdlar bazasi (#xodim)',
    displayOrder: 1
  },
  {
    id: 'cat_jobs',
    slug: 'job',
    title: 'Vakansiyalar / Ish beruvchilar',
    description: 'IT kompaniyalar, studiyalar va korxonalarning bo‘sh ish o‘rinlari (#ishJoyi)',
    displayOrder: 2
  },
  {
    id: 'cat_projects',
    slug: 'project',
    title: 'Loyihalar va Frilans',
    description: 'Buyurtma asosidagi IT loyihalar, frilans va sheriklik takliflari (#sherik)',
    displayOrder: 3
  }
];

export class TelegramRecruitmentFeedService {
  private fetcher: TelegramChannelFetcher;
  private channelName: string;

  constructor(channelName = 'UstozShogird') {
    this.channelName = channelName;
    this.fetcher = new TelegramChannelFetcher();
  }

  /**
   * Fetches real live posts on-demand (Stateless: no DB persistence).
   * Returns empty array [] if source is unreachable (never returns fake demo data).
   */
  async getLivePosts(channelName?: string): Promise<ParsedRecruitmentPost[]> {
    const channel = channelName || this.channelName;
    return this.fetcher.fetchChannelPosts({ channelName: channel, limit: 50 });
  }

  postToOffering(post: ParsedRecruitmentPost, providerId = 'ustoz-shogird'): Offering {
    return {
      id: post.id,
      providerId,
      offeringCode: `US-POST-${post.postId}`,
      title: post.title,
      description: post.summary,
      categorySlug: post.type,
      categoryTitle: post.type === 'candidate' ? 'Nomzodlar' : post.type === 'job' ? 'Vakansiyalar' : 'Loyihalar',
      basePrice: post.salaryAmount || 0,
      currency: 'UZS',
      isAvailable: true,
      variants: [],
      optionGroups: [],
      tags: [...post.skills, post.location, post.channel, post.type],
      metadata: {
        listingType: post.type,
        channel: post.channel,
        postId: post.postId,
        role: post.role,
        skills: post.skills,
        location: post.location,
        salary: post.salary,
        experience: post.experience,
        confidenceScore: post.confidenceScore,
        telegramPostUrl: post.postUrl,
        postedAt: post.postedAt
      }
    };
  }

  async searchOfferings(filter: RecruitmentSearchFilter, providerId = 'ustoz-shogird'): Promise<Offering[]> {
    const posts = await this.getLivePosts();
    if (!posts || posts.length === 0) {
      return [];
    }

    let filtered = posts;

    // Strict Category Filtering
    // candidate = strictly '#xodim' / '#shogird' / 'candidate'
    // job = strictly '#ishJoyi' / '#vakansiya' / 'job'
    if (filter.category) {
      const targetCat = filter.category.toLowerCase().trim();
      filtered = filtered.filter(p => p.type === targetCat);
    }

    // Filter by location
    if (filter.location) {
      const loc = filter.location.toLowerCase().trim();
      filtered = filtered.filter(p => p.location.toLowerCase().includes(loc) || loc.includes(p.location.toLowerCase()));
    }

    // Filter by required skills
    if (filter.skills && filter.skills.length > 0) {
      const requiredSkills = filter.skills.map(s => s.toLowerCase().trim());
      filtered = filtered.filter(p => {
        const postSkills = p.skills.map(s => s.toLowerCase());
        const postText = (p.title + ' ' + p.summary + ' ' + p.hashtags.join(' ')).toLowerCase();
        return requiredSkills.some(req => postSkills.includes(req) || postText.includes(req));
      });
    }

    // Filter by minSalary
    if (filter.minSalary && filter.minSalary > 0) {
      filtered = filtered.filter(p => p.salaryAmount === 0 || p.salaryAmount >= filter.minSalary!);
    }

    // Do not claim an unspecified experience level meets an HR requirement.
    if (filter.minExperienceYears && filter.minExperienceYears > 0) {
      filtered = filtered.filter(p => {
        const match = p.experience.match(/(\d+(?:[.,]\d+)?)\s*(?:yil|year)/i);
        if (!match) return false;
        return Number.parseFloat(match[1].replace(',', '.')) >= filter.minExperienceYears!;
      });
    }

    // Filter by text query
    if (filter.query && filter.query.trim().length > 0) {
      const qTokens = filter.query.toLowerCase().trim().split(/\s+/);
      filtered = filtered.filter(p => {
        const fullContent = (
          p.title + ' ' +
          p.summary + ' ' +
          p.role + ' ' +
          p.skills.join(' ') + ' ' +
          p.location + ' ' +
          p.hashtags.join(' ')
        ).toLowerCase();
        return qTokens.every(tok => fullContent.includes(tok));
      });
    }

    // Filter by minimum confidence if specified
    if (filter.minConfidence && filter.minConfidence > 0) {
      filtered = filtered.filter(p => p.confidenceScore >= filter.minConfidence!);
    }

    // Sort by confidence score descending, then by newest post
    filtered.sort((a, b) => {
      if (b.confidenceScore !== a.confidenceScore) {
        return b.confidenceScore - a.confidenceScore;
      }
      return b.postId - a.postId;
    });

    const limit = filter.limit || 20;
    return filtered.slice(0, limit).map(p => this.postToOffering(p, providerId));
  }
}
