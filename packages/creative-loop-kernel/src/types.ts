export type CreativeDomain =
  | 'heritage_intangible'
  | 'heritage_sites'
  | 'crafts'
  | 'food'
  | 'music'
  | 'poetry'
  | 'architecture'
  | 'landscape'
  | 'maritime'
  | 'youth'
  | 'education'
  | 'design'
  | 'festival';

export type IdeaState = 'raw' | 'shortlisted' | 'developed' | 'pitch_ready' | 'delivered' | 'archived';

export type EvidenceSourceKind = 'official_sa' | 'unesco' | 'saudipedia' | 'misk' | 'alula' | 'other';

export type InspirationMediaType = 'image' | 'video' | 'pdf' | 'link';

export type BrainstormNote = {
  id: string;
  boardId: string;
  textAr: string;
  createdAt: string;
  createdByUserId?: string;
  x?: number;
  y?: number;
  color?: string;
  tags?: string[];
};

export type BrainstormBoard = {
  id: string;
  organizationId?: string;
  projectId?: string;
  titleAr: string;
  status: 'active' | 'archived';
  miroBoardUrl?: string;
  createdAt: string;
  updatedAt: string;
};

export type VoteSession = {
  id: string;
  boardId: string;
  status: 'open' | 'closed';
  votesPerUser: number;
  createdAt: string;
  closedAt?: string;
};

export type Vote = {
  id: string;
  sessionId: string;
  noteId: string;
  userId?: string;
  createdAt: string;
};

export type InspirationSource = {
  id: string;
  nameAr: string;
  url: string;
  kind: EvidenceSourceKind;
  tags: string[];
};

export type InspirationAsset = {
  id: string;
  sourceId?: string;
  titleAr: string;
  url: string;
  mediaType: InspirationMediaType;
  regionCode?: string;
  themeCode?: string;
  tags: string[];
  notesAr?: string;
  createdAt: string;
  createdByUserId?: string;
};

export type EvidenceRef = {
  id: string;
  ideaId: string;
  titleAr: string;
  url?: string;
  kind: EvidenceSourceKind;
  citationAr?: string;
  createdAt: string;
};

export type IdeaCard = {
  id: string;
  organizationId?: string;
  projectId?: string;
  state: IdeaState;
  domain: CreativeDomain;
  titleAr: string;
  oneLinerAr: string;
  audienceAr: string;
  regionAr?: string;
  formatAr: string;
  whyNowAr: string;
  experienceSketchAr: string;
  deliverablesAr: string[];
  kpisAr: string[];
  risksAr: string[];
  evidenceMinCount: number;
  evidenceRefs: EvidenceRef[];
  brainstormBoardId?: string;
  createdAt: string;
  updatedAt: string;
};

export type NarrativeDraft = {
  id: string;
  ideaId: string;
  status: 'draft' | 'ready';
  loglineAr: string;
  threeActAr: { act1: string; act2: string; act3: string };
  references: EvidenceRef[];
  createdAt: string;
  updatedAt: string;
};
