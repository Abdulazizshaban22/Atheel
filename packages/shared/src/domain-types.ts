/**
 * Wave123: Domain Types — replaces the most common `any` patterns across the API
 * Import from '@madar/shared' to get type-safe alternatives
 */

// ── Prisma JSON field accessor (replaces `as any` on metadata) ──
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export type PrismaJson = JsonValue | Record<string, unknown>;

/** Safely access a nested JSON field from Prisma Json columns */
export function jsonField<T = string>(obj: PrismaJson | null | undefined, key: string, fallback?: T): T {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return (fallback ?? '') as T;
  const val = (obj as Record<string, unknown>)[key];
  return (val !== undefined && val !== null ? val : fallback ?? '') as T;
}

// ── Knowledge Domain Types ──

export type BrainDomainName = 'heritage' | 'destination' | 'mega_events' | 'culture_programs' | 'urban_experience' | 'exhibition';

export interface KnowledgeMetadata {
  domain?: string;
  authorityLevel?: string;
  assetClass?: string;
  regionCode?: string;
  sourceAuthority?: string;
  validityWindow?: string;
  sensitivity?: string;
  programType?: string;
  audienceSegment?: string;
  culturalTrack?: string;
  impactDimension?: string;
  partnerType?: string;
  exhibitType?: string;
  destinationType?: string;
  city?: string;
  [key: string]: unknown;
}

// ── Retrieval Types ──

export interface RetrievalItem {
  chunkId: string;
  documentId: string;
  title: string | null;
  textPreview: string;
  tags: string[];
  metadata: KnowledgeMetadata | null;
  score: number;
}

export interface RetrievalResponse {
  ok: boolean;
  domain: string;
  strategy?: { mode: string; noteAr: string };
  count: number;
  items: RetrievalItem[];
}

// ── Quality / Eval Types ──

export interface CorpusQualityResult {
  posture: 'good' | 'needs_hardening' | 'critical';
  score: number;
  signals: Record<string, number>;
  actionsAr: string[];
}

export interface EvalRunResult {
  id: string;
  query: string;
  retrievalRecallScore: number;
  groundingScore: number;
  policyScore: number;
  domainScores?: Record<string, number>;
  createdAt: Date | string;
}

// ── Agent Types ──

export interface AgentTool {
  id: string;
  name: string;
  domain: string;
  descriptionAr: string;
}

export interface AgentJobResult {
  id: string;
  domain: string;
  taskType: string;
  status: string;
  confidence: number | null;
  route: string[];
  tools: string[];
  result: Record<string, unknown> | null;
  createdAt: Date | string;
}

// ── Competition / Radar Types ──

export interface RadarFinding {
  titleAr: string;
  descriptionAr?: string | null;
  sourceTitle: string;
  sourceUrl: string;
  snippetAr?: string | null;
  metaJson: Record<string, unknown>;
  officialPriority: number;
  communityInterest: number;
  productionFeasibility: number;
  lossRisk: number;
}

export type CompetitionStatus = 'draft' | 'analyzing' | 'ready' | 'submitted' | 'archived';
export type RequirementCategory = 'general_scope' | 'event_architecture' | 'graphic_design' | 'overall_direction' | 'out_of_scope';
export type RequirementDiscipline = 'architecture' | 'graphic' | 'content_experience' | 'visitor_experience' | 'operations' | 'finance' | 'project_management';

// ── Workflow Types ──

export type WorkflowExecutionStatus = 'draft' | 'running' | 'paused' | 'waiting_input' | 'completed' | 'failed';

export interface WorkflowStepOutput {
  [key: string]: unknown;
}

// ── Twin Types ──

export type TwinKind = 'venue' | 'route' | 'district' | 'city' | 'event';
export type TwinStatus = 'draft' | 'active' | 'published' | 'archived';

// ── API Response Envelope ──

export interface ApiEnvelope<T = unknown> {
  ok: boolean;
  data: T;
  meta: {
    requestId?: string;
    correlationId?: string;
    timestamp: string;
  };
}

export interface PaginatedEnvelope<T = unknown> extends ApiEnvelope<T[]> {
  meta: ApiEnvelope['meta'] & {
    total: number;
    page: number;
    pageSize: number;
  };
}
