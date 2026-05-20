export type WorkflowDomain =
  | 'heritage'
  | 'museums'
  | 'events'
  | 'tourism'
  | 'artisan'
  | 'food_culture'
  | 'literature'
  | 'music'
  | 'performance'
  | 'education'
  | 'community'
  | 'destination';

export type WorkflowIntent =
  | 'campaign_launch'
  | 'editorial_pipeline'
  | 'visitor_experience_design'
  | 'approval_governance'
  | 'curation_programming'
  | 'operations_readiness'
  | 'analytics_reporting'
  | 'partnership_activation'
  // Wave29: operational follow-up for compliance/obligations
  | 'obligation_followup';

export type WorkflowTrigger =
  | 'manual_request'
  | 'scheduled_daily'
  | 'scheduled_weekly'
  | 'event_created'
  | 'content_submitted'
  | 'approval_required';

export type WorkflowComplexity = 'starter' | 'standard' | 'advanced';

export interface WorkflowTemplateStep {
  id: string;
  key: string;
  nameAr: string;
  type:
    | 'collect'
    | 'classify'
    | 'retrieve'
    | 'plan'
    | 'draft'
    | 'review'
    | 'approve'
    | 'publish'
    | 'notify'
    | 'report'
    | 'archive'
    | 'sync'
    | 'score'
    | 'schedule';
  actor: 'system' | 'ai' | 'human';
  isRequired: boolean;
  estimatedMinutes: number;
  usesRag?: boolean;
  usesAgent?: boolean;
  outputs?: string[];
}

export interface WorkflowTemplate {
  id: string;
  code: string;
  version: number;
  nameAr: string;
  summaryAr: string;
  domain: WorkflowDomain;
  intent: WorkflowIntent;
  trigger: WorkflowTrigger;
  audience: 'internal_team' | 'public_visitor' | 'partners' | 'executives' | 'mixed';
  channel: 'web' | 'email' | 'sms' | 'whatsapp' | 'dashboard' | 'api';
  complexity: WorkflowComplexity;
  tags: string[];
  integrations: string[];
  kpis: string[];
  inputSchema: Array<{ key: string; labelAr: string; type: 'string' | 'number' | 'boolean' | 'date' | 'json'; required?: boolean }>;
  outputArtifacts: Array<{ key: string; labelAr: string; format: 'json' | 'markdown' | 'html' | 'pdf' | 'csv' | 'text' }>;
  steps: WorkflowTemplateStep[];
  aiProfile: {
    ragEnabled: boolean;
    agentMode: 'none' | 'single_agent' | 'planner_worker';
    preferredModelClass: 'fast' | 'balanced' | 'reasoning';
    qualityGate: 'manual_review' | 'auto_score_then_review';
  };
}

export interface WorkflowInstance {
  id: string;
  templateId: string;
  code: string;
  nameAr: string;
  organizationId?: string;
  projectId?: string;
  status: 'draft' | 'active' | 'paused' | 'archived';
  parameters: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  createdByUserId?: string;
}

export interface WorkflowRunTraceStep {
  id: string;
  nameAr: string;
  status: 'done' | 'skipped' | 'needs_input' | 'queued';
  durationSecondsEstimate: number;
  noteAr?: string;
}

export interface WorkflowRunSimulation {
  runId: string;
  instanceId?: string;
  templateId: string;
  status: 'completed' | 'needs_input';
  totalSteps: number;
  estimatedDurationMinutes: number;
  aiCallsEstimate: number;
  humanCheckpoints: number;
  generatedArtifacts: string[];
  trace: WorkflowRunTraceStep[];
  metricsPreview: Record<string, number>;
  recommendations: string[];
  createdAt: string;
}
