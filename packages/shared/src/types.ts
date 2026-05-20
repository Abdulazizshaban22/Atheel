export type LocaleCode = 'ar' | 'en';

export interface Organization {
  id: string;
  nameAr: string;
  nameEn?: string;
  sector: 'government' | 'semi_government' | 'museum' | 'private' | 'developer' | 'ngo';
  city?: string;
  country: string;
}

export interface Project {
  id: string;
  organizationId: string;
  code: string;
  nameAr: string;
  status: 'draft' | 'planning' | 'in_progress' | 'paused' | 'completed' | 'archived';
  progressPercent: number;
  startDate?: string;
  endDate?: string;
}

export interface ContentItem {
  id: string;
  organizationId: string;
  projectId?: string;
  title: string;
  languageCode: LocaleCode;
  contentType: 'article' | 'stop_text' | 'audio_script' | 'label' | 'educational' | 'campaign' | 'presentation' | 'strategy' | 'feasibility' | 'approval_packet';
  status: 'draft' | 'in_review' | 'approved' | 'published' | 'archived';
  summary?: string;
}

export interface VisitorExperience {
  id: string;
  projectId: string;
  titleAr: string;
  /** Optional link to a Digital Twin that models this experience (Graph + Layers + Simulation). */
  twinId?: string;
  experienceType: 'museum' | 'route' | 'event' | 'exhibition' | 'food_culture';
  durationMinutesDefault: number;
  publishStatus: 'draft' | 'published' | 'archived';
}
