export type RecruitmentListingType = 'candidate' | 'job' | 'project';

export interface ParsedRecruitmentPost {
  id: string;
  postId: number;
  channel: string;
  type: RecruitmentListingType;
  title: string;
  summary: string;
  role: string;
  skills: string[];
  location: string;
  salary: string;
  salaryAmount: number;
  currency: string;
  experience: string;
  confidenceScore: number; // 0.0 to 1.0
  postUrl: string;
  postedAt: string;
  hashtags: string[];
}

export interface RecruitmentSearchFilter {
  query?: string;
  category?: string; // 'candidate' | 'job' | 'project'
  skills?: string[];
  location?: string;
  minSalary?: number;
  minExperienceYears?: number;
  minConfidence?: number;
  limit?: number;
}
