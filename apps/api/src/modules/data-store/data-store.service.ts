import { Injectable, NotFoundException } from '@nestjs/common';
import type { Organization, Project, ContentItem, VisitorExperience } from '@madar/shared';
import type { PlatformRole } from '../auth/constants';

export interface DemoUserRecord {
  id: string;
  email: string;
  displayName: string;
  isActive: boolean;
  roles: PlatformRole[];
  orgIds?: string[];
  passwordHash?: string;
  refreshTokenHash?: string | null;
  lastLoginAt?: string;
}

export interface AttachmentRecord {
  id: string;
  organizationId: string;
  // generalized polymorphic link
  entityType?: string;
  entityId?: string;
  originalName: string;
  mimeType?: string;
  extension?: string;
  sizeBytes: number;
  storageProvider: 'local' | 's3' | 'minio';
  storagePath: string;
  checksumSha256?: string;
  uploadedByUserId?: string;
  uploadedAt: string;
  metadata?: Record<string, unknown>;
}

export interface ApprovalRecord {
  id: string;
  organizationId: string;
  entityType: 'project' | 'content' | 'experience';
  entityId: string;
  title: string;
  status: 'draft' | 'submitted' | 'in_review' | 'approved' | 'rejected' | 'changes_requested' | 'cancelled';
  submittedByUserId?: string;
  currentApproverId?: string;
  decisionNote?: string;
  requestedChanges?: string;
  submittedAt?: string;
  decidedAt?: string;
  dueAt?: string;
  payloadSnapshot?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// --- Wave26: Competitions / Briefs Intelligence (demo store) ---

export interface CompetitionRecord {
  id: string;
  organizationId: string;
  projectId?: string;
  titleAr: string;
  code?: string;
  dueAt?: string;
  status: 'draft' | 'analyzing' | 'ready' | 'submitted' | 'archived';
  sourceSignalId?: string;
  metaJson?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CompetitionRequirementRecord {
  id: string;
  competitionId: string;
  category: 'general_scope' | 'event_architecture' | 'graphic_design' | 'overall_direction' | 'out_of_scope';
  discipline: 'architecture' | 'graphic' | 'content_experience' | 'visitor_experience' | 'operations' | 'finance' | 'project_management';
  textAr: string;
  cityOrLocation?: string;
  quantitiesJson?: Record<string, unknown>;
  constraintsJson?: Record<string, unknown>;
  inStudioScope: boolean;
  sourceRefJson?: Record<string, unknown>;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'new' | 'triaged' | 'assigned' | 'clarified' | 'done';
  createdAt: string;
  updatedAt: string;
}

export interface CompetitionAssignmentRecord {
  id: string;
  requirementId: string;
  userId: string;
  role: 'owner' | 'contributor' | 'reviewer';
  isOwner: boolean;
  createdAt: string;
}

export interface OrgUserProfileRecord {
  id: string;
  organizationId: string;
  userId: string;
  department: string;
  skills: string[];
  weeklyCapacityHours?: number;
  metaJson?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogRecord {
  id: string;
  organizationId?: string;
  actorUserId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  severity: 'info' | 'warning' | 'critical';
  message?: string;
  before?: unknown;
  after?: unknown;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface ApprovalPacketRecord {
  id: string;
  organizationId?: string;
  projectId?: string;
  experienceId?: string;
  twinId?: string;
  simulationRunId: string;
  scenarioKey: string;
  title: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'archived';
  version: number;
  sections: Record<string, unknown>;
  artifacts: Record<string, unknown>;
  generatedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiProviderRecord {
  id: string;
  organizationId?: string;
  name: string;
  kind: 'mock' | 'vllm_openai_compatible';
  baseUrl?: string;
  apiKeyEnvName?: string;
  modelName?: string;
  isActive: boolean;
  temperatureDefault?: number;
  maxTokensDefault?: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeDocumentRecord {
  id: string;
  organizationId?: string;
  projectId?: string;
  title: string;
  sourceType: 'manual' | 'file' | 'url' | 'template';
  sourceRef?: string;
  languageCode: 'ar' | 'en';
  tags: string[];
  text: string;
  chunkCount: number;
  createdByUserId?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface KnowledgeChunkRecord {
  id: string;
  documentId: string;
  organizationId?: string;
  projectId?: string;
  title?: string;
  sourceType?: 'manual' | 'file' | 'url' | 'template';
  languageCode?: 'ar' | 'en';
  text: string;
  tags: string[];
  chunkIndex: number;
  tokenEstimate: number;
  // Wave33: optional vector embedding for real RAG
  embedding?: number[];
  embeddingDims?: number;
  embeddingModel?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
}


export interface WorkflowInstanceRecord {
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

export interface WorkflowRunRecord {
  id: string;
  instanceId?: string;
  templateId: string;
  organizationId?: string;
  projectId?: string;
  status: 'queued' | 'running' | 'completed' | 'needs_input' | 'failed';
  totalSteps: number;
  estimatedDurationMinutes: number;
  aiCallsEstimate: number;
  humanCheckpoints: number;
  metricsPreview?: Record<string, number>;
  trace: Array<Record<string, unknown>>;
  createdAt: string;
  updatedAt: string;
}


export interface AsyncJobRecord {
  id: string;
  kind: 'ai_decision' | 'twin_simulation' | 'studio_refresh';
  entityType?: string;
  entityId?: string;
  organizationId?: string;
  projectId?: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  queueMode: 'sync' | 'redis' | 'none';
  payload?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  createdAt: string;
  updatedAt: string;
}
export interface WorkflowPackRecord {
  id: string;
  name: string;
  organizationId?: string;
  projectId?: string;
  selectedTemplateIds: string[];
  manifest: Record<string, unknown>;
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  createdByUserId?: string;
}

export interface AgentRunRecord {
  id: string;
  organizationId?: string;
  projectId?: string;
  objective: string;
  status: 'queued' | 'running' | 'completed' | 'needs_input' | 'failed';
  steps: Array<Record<string, unknown>>;
  resultSummary?: string;
  createdByUserId?: string;
  createdAt: string;
  updatedAt: string;
}


export interface WorkspaceRecord {
  id: string;
  organizationId?: string;
  code: string;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'paused' | 'archived';
  defaultLanguage: 'ar' | 'en';
  settings: Record<string, unknown>;
  aiRoutingPolicy?: Record<string, unknown>;
  ragPolicy?: Record<string, unknown>;
  guardrails?: Record<string, unknown>;
  createdByUserId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PromptTemplateRecord {
  id: string;
  workspaceId?: string;
  organizationId?: string;
  code: string;
  name: string;
  description?: string;
  templateBody: string;
  inputSchema?: Record<string, unknown>;
  tags: string[];
  modelClass: 'fast' | 'balanced' | 'reasoning';
  isActive: boolean;
  version: number;
  createdByUserId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProgramRecord {
  id: string;
  organizationId?: string;
  code: string;
  nameAr: string;
  description?: string;
  status: 'draft' | 'active' | 'on_hold' | 'completed' | 'archived';
  strategicValueScore: number;
  readinessScore: number;
  portfolioValueSar?: number;
  metadata?: Record<string, unknown>;
  projectIds: string[];
  workflowInstanceIds: string[];
  createdByUserId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowExecutionRecord {
  id: string;
  workflowRunId?: string;
  instanceId?: string;
  templateId: string;
  organizationId?: string;
  projectId?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'queued' | 'running' | 'waiting_input' | 'completed' | 'failed' | 'paused';
  queueScore: number;
  currentStepIndex: number;
  stepsJson: string;
  inputsJson: string;
  outputsJson: string;
  metricsJson: string;
  slaJson: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface WorkflowExecutionEventRecord {
  id: string;
  executionId: string;
  organizationId?: string;
  projectId?: string;
  type: string;
  stepId?: string;
  messageAr: string;
  idempotencyKey?: string;
  attempt?: number;
  actor?: string;
  payload?: Record<string, unknown>;
  createdAt: string;
}

export interface InspirationSourceRecord {
  id: string;
  organizationId?: string;
  nameAr: string;
  url: string;
  kind: 'official_sa' | 'unesco' | 'saudipedia' | 'misk' | 'alula' | 'other';
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface InspirationAssetRecord {
  id: string;
  organizationId?: string;
  projectId?: string;
  sourceId?: string;
  titleAr: string;
  url: string;
  mediaType: 'image' | 'video' | 'pdf' | 'link';
  regionCode?: string;
  themeCode?: string;
  tags: string[];
  notesAr?: string;
  citationId?: string;
  citationAr?: string;
  createdByUserId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BrainstormBoardRecord {
  id: string;
  organizationId?: string;
  projectId?: string;
  titleAr: string;
  status: 'active' | 'archived';
  miroBoardUrl?: string;
  createdByUserId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BrainstormNoteRecord {
  id: string;
  boardId: string;
  textAr: string;
  tags: string[];
  x?: number;
  y?: number;
  color?: string;
  createdByUserId?: string;
  createdAt: string;
}

export interface BrainstormVoteSessionRecord {
  id: string;
  boardId: string;
  status: 'open' | 'closed';
  votesPerUser: number;
  createdAt: string;
  closedAt?: string;
}

export interface BrainstormVoteRecord {
  id: string;
  sessionId: string;
  noteId: string;
  userId?: string;
  createdAt: string;
}

export interface VaultIdeaRecord {
  id: string;
  organizationId?: string;
  projectId?: string;
  state: 'raw' | 'shortlisted' | 'developed' | 'pitch_ready' | 'delivered' | 'archived';
  domain: string;
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
  brainstormBoardId?: string;
  createdByUserId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VaultEvidenceRecord {
  id: string;
  ideaId: string;
  titleAr: string;
  url?: string;
  kind: 'official_sa' | 'unesco' | 'saudipedia' | 'misk' | 'alula' | 'other';
  citationAr?: string;
  createdAt: string;
}

export interface NarrativeDraftRecord {
  id: string;
  ideaId: string;
  status: 'draft' | 'ready';
  loglineAr: string;
  act1: string;
  act2: string;
  act3: string;
  createdAt: string;
  updatedAt: string;
}

export interface InspirationBoardRecord {
  id: string;
  organizationId?: string;
  projectId?: string;
  titleAr: string;
  descriptionAr?: string;
  status: 'active' | 'archived';
  visibility: 'private' | 'org' | 'public';
  ownerUserId?: string;
  editorUserIds: string[];
  viewerUserIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface InspirationBoardItemRecord {
  id: string;
  boardId: string;
  assetId: string;
  noteAr?: string;
  orderIndex: number;
  createdAt: string;
}

export interface ImpactSnapshotRecord {
  id: string;
  organizationId?: string;
  projectId?: string;
  experienceId?: string;
  twinId?: string;
  simulationRunId?: string;
  narrativeId?: string;
  score0to100: number;
  breakdownJson: string;
  createdAt: string;
}


export interface NarrativePolicyRecord {
  id: string;
  organizationId?: string | null;
  projectId?: string | null;
  nameAr: string;
  expectedTone?: string;
  protectedTerms: string[];
  bannedTerms: string[];
  requiredThemes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface NarrativeCheckRecord {
  id: string;
  organizationId?: string | null;
  projectId?: string | null;
  expectedTone?: string;
  score: number;
  status: 'aligned' | 'needs_review' | 'drifted';
  findings: Array<{ severity: string; code: string; messageAr: string; channel?: string }>;
  channelCount: number;
  createdAt: string;
}

export interface PartnerRecord {
  id: string;
  organizationId: string;
  nameAr: string;
  nameEn?: string | null;
  partnerType: string;
  city?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  capabilities: string[];
  contributionAreas: string[];
  contributionScore: number;
  complianceStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface PartnerInviteRecord {
  id: string;
  partnerId: string;
  contactEmail?: string | null;
  invitedByUserId?: string | null;
  scopes: string[];
  status: string;
  createdAt: string;
}

export interface LocalOfferRecord {
  id: string;
  organizationId: string;
  partnerId?: string | null;
  titleAr: string;
  titleEn?: string | null;
  category: string;
  city?: string | null;
  tags: string[];
  pricingBand: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommerceBundleRecord {
  id: string;
  organizationId: string;
  experienceId?: string | null;
  titleAr: string;
  titleEn?: string | null;
  category: string;
  offerIds: string[];
  pricingBand: string;
  legacyIntent: string;
  linkedOfferCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BookingConnectorRecord {
  id: string;
  organizationId: string;
  provider: string;
  label: string;
  baseUrl?: string | null;
  externalProjectId?: string | null;
  scopes: string[];
  status: string;
  health: string;
  lastSyncAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BookingOrderRecord {
  id: string;
  organizationId: string;
  connectorId: string;
  experienceId?: string | null;
  externalOrderId: string;
  attendeeName?: string | null;
  ticketType: string;
  amount: number;
  currency: string;
  status: string;
  syncedAt: string;
}

export interface VisitorProfileRecord {
  id: string;
  organizationId: string;
  displayName: string;
  homeCity?: string | null;
  persona: string;
  interests: string[];
  accessibilityNeeds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ImpactFrameworkRecord {
  id: string;
  organizationId: string;
  code: string;
  nameAr: string;
  dimensions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LegacyOutcomeRecord {
  id: string;
  organizationId: string;
  seasonId?: string | null;
  projectId: string;
  outcomes: string[];
  localEconomicValueBand: string;
  culturalImpactLevel: string;
  createdAt: string;
  updatedAt: string;
}

export interface RiskRecord {
  id: string;
  organizationId?: string;
  projectId?: string;
  experienceId?: string;
  twinId?: string;
  category: 'safety' | 'heritage' | 'operations' | 'reputation' | 'compliance';
  titleAr: string;
  descriptionAr?: string;
  likelihood1to5: number;
  impact1to5: number;
  score: number;
  level: 'low' | 'medium' | 'high';
  mitigationAr?: string;
  ownerAr?: string;
  status: 'open' | 'mitigating' | 'closed';
  createdAt: string;
  updatedAt: string;
}

export interface NarrativeInstanceRecord {
  id: string;
  organizationId?: string;
  projectId?: string;
  ideaId?: string;
  experienceId?: string;
  twinId?: string;
  variant: 'A' | 'B' | 'single';
  titleAr: string;
  loglineAr: string;
  beatsJson: string;
  citations: Array<{ citationId: string; titleAr: string; url?: string; kind?: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface VisitorGuideRecord {
  id: string;
  organizationId?: string;
  projectId?: string;
  experienceId: string;
  twinId?: string;
  persona: 'family' | 'student' | 'tourist' | 'expert';
  languageCode: 'ar' | 'en';
  contentItemIds: string[];
  summaryAr: string;
  createdAt: string;
  updatedAt: string;
}

export interface HeritageSourceRecord {
  id: string;
  organizationId?: string;
  nameAr: string;
  url: string;
  kind: 'official_sa' | 'unesco' | 'saudipedia' | 'other';
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProgramTemplateRecord {
  id: string;
  organizationId?: string;
  code: string;
  nameAr: string;
  domain: string;
  manifestJson: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentationCheckRecord {
  id: string;
  entityType: 'inspiration_asset' | 'attachment' | 'content';
  entityId: string;
  status: 'pass' | 'needs_fix';
  issues: Array<{ code: string; messageAr: string }>;
  createdAt: string;
}





// Twin (Digital Twin) Records
export interface TwinRecord {
  id: string;
  organizationId?: string;
  projectId?: string;
  kind: 'venue' | 'route' | 'exhibition' | 'district';
  nameAr: string;
  status: 'draft' | 'active' | 'paused' | 'archived';
  coordinateSystem: 'wgs84' | 'local_xy';
  bboxJson: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface TwinNodeRecord {
  id: string;
  twinId: string;
  nameAr: string;
  kind: 'entry' | 'exit' | 'exhibit' | 'activity' | 'service' | 'rest' | 'corridor' | 'staff_only' | 'hazard';
  capacity: number;
  dwellTimeSecondsAvg: number;
  posJson: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TwinEdgeRecord {
  id: string;
  twinId: string;
  fromNodeId: string;
  toNodeId: string;
  kind: 'path' | 'stairs' | 'elevator' | 'queue_lane' | 'restricted';
  distanceMeters: number;
  travelTimeSeconds: number;
  oneWay?: boolean;
  widthMeters?: number;
  capacityPerMinute?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TwinLayerRecord {
  id: string;
  twinId: string;
  nameAr: string;
  kind: 'geojson' | 'gltf' | 'three_d_tiles' | 'image' | 'pdf' | 'link';
  uri: string;
  contentType?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface TwinSimulationRecord {
  id: string;
  twinId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  profileJson: string;
  resultJson: string;
  createdAt: string;
  updatedAt: string;
}

export interface TwinTelemetryRecord {
  id: string;
  twinId: string;
  ts: string;
  kind: 'footfall' | 'occupancy' | 'temperature' | 'noise' | 'incident' | 'manual_note';
  nodeId?: string;
  value?: number;
  payload?: Record<string, unknown>;
  createdAt: string;
}

export interface TwinSpecRecord {
  id: string;
  organizationId?: string;
  projectId?: string;
  twinId: string;
  titleAr: string;
  status: 'draft' | 'compiled' | 'published' | 'archived';
  version: number;
  sourcesJson: string;
  specJson: string;
  scenarioPackJson?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface TwinScenarioPackRecord {
  id: string;
  twinId: string;
  specId: string;
  nameAr: string;
  packJson: string;
  createdAt: string;
  updatedAt: string;
}

export interface IoTDeviceRecord {
  id: string;
  organizationId?: string;
  twinId?: string;
  nameAr: string;
  kind: 'sensor' | 'gateway' | 'camera' | 'counter' | 'beacon' | 'manual';
  // stored as sha256 hex (do NOT store raw secret)
  secretKeyHash: string;
  isActive: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
@Injectable()
export class DataStoreService {
  private organizations: Organization[] = [
    { id: 'org_demo_1', nameAr: 'هيئة ثقافية تجريبية', nameEn: 'Demo Cultural Authority', sector: 'government', city: 'الرياض', country: 'SA' }
  ];
  private projects: Project[] = [
    { id: 'prj_1', organizationId: 'org_demo_1', code: 'MC-001', nameAr: 'مسار تراثي تفاعلي', status: 'in_progress', progressPercent: 42, startDate: '2026-02-01', endDate: '2026-05-30' }
  ];
  private contentItems: ContentItem[] = [
    { id: 'cnt_1', organizationId: 'org_demo_1', projectId: 'prj_1', title: 'قصة الحي التاريخي', languageCode: 'ar', contentType: 'article', status: 'approved', summary: 'مادة تعريفية أولية' }
  ];
  private experiences: VisitorExperience[] = [
    { id: 'exp_1', projectId: 'prj_1', titleAr: 'جولة الحي', twinId: 'twin_demo_1', experienceType: 'route', durationMinutesDefault: 45, publishStatus: 'draft' }
  ];
  private users: DemoUserRecord[] = [];
  private attachments: AttachmentRecord[] = [];
  private approvals: ApprovalRecord[] = [];
  private approvalPackets: ApprovalPacketRecord[] = [];
  private competitions: CompetitionRecord[] = [];
  private competitionRequirements: CompetitionRequirementRecord[] = [];
  private competitionAssignments: CompetitionAssignmentRecord[] = [];
  private orgUserProfiles: OrgUserProfileRecord[] = [];
  private auditLogs: AuditLogRecord[] = [];
  private aiProviders: AiProviderRecord[] = [
    {
      id: 'aip_mock_default',
      organizationId: 'org_demo_1',
      name: 'Mock Provider (Dev)',
      kind: 'mock',
      isActive: true,
      modelName: 'mock-cultural-v1',
      temperatureDefault: 0.2,
      maxTokensDefault: 700,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  ];
  private knowledgeDocuments: KnowledgeDocumentRecord[] = [];
  private knowledgeChunks: KnowledgeChunkRecord[] = [];
  private agentRuns: AgentRunRecord[] = [];
  private workflowInstances: WorkflowInstanceRecord[] = [];
  private workflowRuns: WorkflowRunRecord[] = [];
  private workflowPacks: WorkflowPackRecord[] = [];
  private workspaces: WorkspaceRecord[] = [];
  private promptTemplates: PromptTemplateRecord[] = [];
  private programs: ProgramRecord[] = [];
  private workflowExecutions: WorkflowExecutionRecord[] = [];
  private workflowExecutionEvents: WorkflowExecutionEventRecord[] = [];
  private inspirationSources: InspirationSourceRecord[] = [];
  private inspirationAssets: InspirationAssetRecord[] = [];
  private inspirationBoards: InspirationBoardRecord[] = [];
  private inspirationBoardItems: InspirationBoardItemRecord[] = [];
  private documentationChecks: DocumentationCheckRecord[] = [];
  private narratives: NarrativeInstanceRecord[] = [];
  private narrativePolicies: NarrativePolicyRecord[] = [];
  private narrativeChecks: NarrativeCheckRecord[] = [];
  private impactSnapshots: ImpactSnapshotRecord[] = [];
  private impactFrameworks: ImpactFrameworkRecord[] = [];
  private legacyOutcomes: LegacyOutcomeRecord[] = [];
  private partners: PartnerRecord[] = [];
  private partnerInvites: PartnerInviteRecord[] = [];
  private localOffers: LocalOfferRecord[] = [];
  private commerceBundles: CommerceBundleRecord[] = [];
  private bookingConnectors: BookingConnectorRecord[] = [];
  private bookingOrders: BookingOrderRecord[] = [];
  private visitorProfiles: VisitorProfileRecord[] = [];
  private risks: RiskRecord[] = [];
  private visitorGuides: VisitorGuideRecord[] = [];
  private heritageSources: HeritageSourceRecord[] = [];
  private programTemplates: ProgramTemplateRecord[] = [];
  private brainstormBoards: BrainstormBoardRecord[] = [];
  private brainstormNotes: BrainstormNoteRecord[] = [];
  private brainstormVoteSessions: BrainstormVoteSessionRecord[] = [];
  private brainstormVotes: BrainstormVoteRecord[] = [];
  private vaultIdeas: VaultIdeaRecord[] = [];
  private vaultEvidence: VaultEvidenceRecord[] = [];
  private narrativeDrafts: NarrativeDraftRecord[] = [];

  private twins: TwinRecord[] = [];
  private twinNodes: TwinNodeRecord[] = [];
  private twinEdges: TwinEdgeRecord[] = [];
  private twinLayers: TwinLayerRecord[] = [];
  private twinSimulations: TwinSimulationRecord[] = [];
  private twinTelemetry: TwinTelemetryRecord[] = [];
  private twinSpecs: TwinSpecRecord[] = [];
  private twinScenarioPacks: TwinScenarioPackRecord[] = [];
  private iotDevices: IoTDeviceRecord[] = [];
  private asyncJobs: AsyncJobRecord[] = [];



  constructor() {
    this.seedAiKnowledge();
    this.seedWorkspaceAndTemplates();
    this.seedCreativeLoop();
    this.seedTwinBasics();
    this.seedIoT();
  }

  getOrganizations(){ return this.organizations; }
  addOrganization(v: Organization){ this.organizations.push(v); return v; }

  getProjects(){ return this.projects; }
  getProjectById(id: string){ return this.projects.find((x) => x.id === id); }
  addProject(v: Project){ this.projects.push(v); return v; }
  updateProject(id: string, patch: Partial<Project>){
    const i = this.projects.findIndex((x) => x.id === id);
    if (i < 0) throw new NotFoundException('Project not found');
    this.projects[i] = { ...this.projects[i], ...patch, id: this.projects[i].id };
    return this.projects[i];
  }
  removeProject(id: string){
    const i = this.projects.findIndex((x) => x.id === id);
    if (i < 0) throw new NotFoundException('Project not found');
    const [removed] = this.projects.splice(i, 1);
    this.contentItems = this.contentItems.filter((c) => c.projectId !== removed.id);
    this.experiences = this.experiences.filter((e) => e.projectId !== removed.id);
    return { id: removed.id, deleted: true };
  }

  getContentItems(){ return this.contentItems; }
  getContentItemById(id: string){ return this.contentItems.find((x) => x.id === id); }
  addContentItem(v: ContentItem){ this.contentItems.push(v); return v; }
  updateContentItem(id: string, patch: Partial<ContentItem>){
    const i = this.contentItems.findIndex((x) => x.id === id);
    if (i < 0) throw new NotFoundException('Content item not found');
    this.contentItems[i] = { ...this.contentItems[i], ...patch, id: this.contentItems[i].id };
    return this.contentItems[i];
  }
  removeContentItem(id: string){
    const i = this.contentItems.findIndex((x) => x.id === id);
    if (i < 0) throw new NotFoundException('Content item not found');
    const [removed] = this.contentItems.splice(i, 1);
    return { id: removed.id, deleted: true };
  }

  getExperiences(){ return this.experiences; }
  getExperienceById(id: string){ return this.experiences.find((x) => x.id === id); }
  addExperience(v: VisitorExperience){ this.experiences.push(v); return v; }
  updateExperience(id: string, patch: Partial<VisitorExperience>){
    const i = this.experiences.findIndex((x) => x.id === id);
    if (i < 0) throw new NotFoundException('Experience not found');
    this.experiences[i] = { ...this.experiences[i], ...patch, id: this.experiences[i].id };
    return this.experiences[i];
  }
  removeExperience(id: string){
    const i = this.experiences.findIndex((x) => x.id === id);
    if (i < 0) throw new NotFoundException('Experience not found');
    const [removed] = this.experiences.splice(i, 1);
    return { id: removed.id, deleted: true };
  }

  // Users
  listUsers(){ return this.users; }
  findUserById(id: string){ return this.users.find((x) => x.id === id); }
  findUserByEmail(email: string){ return this.users.find((x) => x.email.toLowerCase() === email.toLowerCase()); }
  addUser(v: DemoUserRecord){ this.users.push(v); return v; }
  updateUser(id: string, patch: Partial<DemoUserRecord>){
    const i = this.users.findIndex((x) => x.id === id);
    if (i < 0) throw new NotFoundException('User not found');
    this.users[i] = { ...this.users[i], ...patch, id: this.users[i].id };
    return this.users[i];
  }
  removeUser(id: string){
    const i = this.users.findIndex((x) => x.id === id);
    if (i < 0) throw new NotFoundException('User not found');
    const [removed] = this.users.splice(i, 1);
    return { id: removed.id, deleted: true };
  }

  // Attachments
  listAttachments(){ return this.attachments; }
  getAttachmentById(id: string){ return this.attachments.find((x) => x.id === id); }
  addAttachment(v: AttachmentRecord){ this.attachments.unshift(v); return v; }
  updateAttachment(id: string, patch: Partial<AttachmentRecord>){
    const i = this.attachments.findIndex((x) => x.id === id);
    if (i < 0) throw new NotFoundException('Attachment not found');
    this.attachments[i] = { ...this.attachments[i], ...patch, id: this.attachments[i].id };
    return this.attachments[i];
  }

  // Approvals
  listApprovals(){ return this.approvals; }
  getApprovalById(id: string){ return this.approvals.find((x) => x.id === id); }
  addApproval(v: ApprovalRecord){ this.approvals.unshift(v); return v; }
  updateApproval(id: string, patch: Partial<ApprovalRecord>){
    const i = this.approvals.findIndex((x) => x.id === id);
    if (i < 0) throw new NotFoundException('Approval not found');
    this.approvals[i] = { ...this.approvals[i], ...patch, id: this.approvals[i].id, updatedAt: new Date().toISOString() };
    return this.approvals[i];
  }

  // Approval packets
  listApprovalPackets(){ return this.approvalPackets; }
  getApprovalPacketById(id: string){ return this.approvalPackets.find((x) => x.id === id); }
  upsertApprovalPacket(v: ApprovalPacketRecord){
    const i = this.approvalPackets.findIndex((x) => x.id === v.id);
    if (i >= 0) {
      this.approvalPackets[i] = { ...this.approvalPackets[i], ...v, id: this.approvalPackets[i].id, updatedAt: new Date().toISOString() };
      return this.approvalPackets[i];
    }
    this.approvalPackets.unshift(v);
    return v;
  }

  // Competitions (Wave26)
  listCompetitions(){ return this.competitions; }
  getCompetitionById(id: string){ return this.competitions.find((x) => x.id === id); }
  addCompetition(v: CompetitionRecord){
    this.competitions.unshift(v);
    return v;
  }
  updateCompetition(id: string, patch: Partial<CompetitionRecord>){
    const i = this.competitions.findIndex((x) => x.id === id);
    if (i < 0) throw new NotFoundException('Competition not found');
    this.competitions[i] = { ...this.competitions[i], ...patch, id: this.competitions[i].id, updatedAt: new Date().toISOString() };
    return this.competitions[i];
  }

  listCompetitionRequirements(competitionId: string){
    return this.competitionRequirements.filter((r) => r.competitionId === competitionId);
  }
  addCompetitionRequirement(v: CompetitionRequirementRecord){
    this.competitionRequirements.unshift(v);
    return v;
  }
  updateCompetitionRequirement(id: string, patch: Partial<CompetitionRequirementRecord>){
    const i = this.competitionRequirements.findIndex((x) => x.id === id);
    if (i < 0) throw new NotFoundException('Competition requirement not found');
    this.competitionRequirements[i] = { ...this.competitionRequirements[i], ...patch, id: this.competitionRequirements[i].id, updatedAt: new Date().toISOString() };
    return this.competitionRequirements[i];
  }

  listCompetitionAssignments(requirementId: string){
    return this.competitionAssignments.filter((a) => a.requirementId === requirementId);
  }
  upsertCompetitionAssignment(v: CompetitionAssignmentRecord){
    const i = this.competitionAssignments.findIndex((x) => x.id === v.id || (x.requirementId === v.requirementId && x.userId === v.userId));
    if (i >= 0) {
      this.competitionAssignments[i] = { ...this.competitionAssignments[i], ...v, id: this.competitionAssignments[i].id };
      return this.competitionAssignments[i];
    }
    this.competitionAssignments.unshift(v);
    return v;
  }

  listOrgUserProfiles(organizationId?: string){
    return this.orgUserProfiles.filter((p) => !organizationId || p.organizationId === organizationId);
  }
  upsertOrgUserProfile(v: OrgUserProfileRecord){
    const i = this.orgUserProfiles.findIndex((x) => x.organizationId === v.organizationId && x.userId === v.userId);
    if (i >= 0) {
      this.orgUserProfiles[i] = { ...this.orgUserProfiles[i], ...v, id: this.orgUserProfiles[i].id, updatedAt: new Date().toISOString() };
      return this.orgUserProfiles[i];
    }
    this.orgUserProfiles.unshift(v);
    return v;
  }

  // Audit logs
  listAuditLogs(){ return this.auditLogs; }
  addAuditLog(v: AuditLogRecord){ this.auditLogs.unshift(v); return v; }

  // AI providers
  listAiProviders(){ return this.aiProviders; }
  getAiProviderById(id: string){ return this.aiProviders.find((x) => x.id === id); }
  upsertAiProvider(v: AiProviderRecord){
    const i = this.aiProviders.findIndex((x) => x.id === v.id);
    if (i >= 0) {
      this.aiProviders[i] = { ...this.aiProviders[i], ...v, id: this.aiProviders[i].id, updatedAt: new Date().toISOString() };
      return this.aiProviders[i];
    }
    this.aiProviders.unshift(v);
    return v;
  }
  deactivateAiProvidersForOrg(organizationId?: string){
    this.aiProviders = this.aiProviders.map((x) => (!organizationId || x.organizationId === organizationId)
      ? { ...x, isActive: false, updatedAt: new Date().toISOString() }
      : x
    );
  }

  // Knowledge base
  listKnowledgeDocuments(){ return this.knowledgeDocuments; }
  getKnowledgeDocumentById(id: string){ return this.knowledgeDocuments.find((x) => x.id === id); }
  listKnowledgeChunks(){ return this.knowledgeChunks; }
  addKnowledgeDocument(v: KnowledgeDocumentRecord){ this.knowledgeDocuments.unshift(v); return v; }
  addKnowledgeChunks(rows: KnowledgeChunkRecord[]){ this.knowledgeChunks.unshift(...rows); return rows; }
  replaceKnowledgeDocumentAndChunks(doc: KnowledgeDocumentRecord, chunks: KnowledgeChunkRecord[]){
    const docIdx = this.knowledgeDocuments.findIndex((x) => x.id === doc.id);
    if (docIdx >= 0) this.knowledgeDocuments[docIdx] = doc;
    else this.knowledgeDocuments.unshift(doc);

    this.knowledgeChunks = this.knowledgeChunks.filter((x) => x.documentId !== doc.id);
    this.knowledgeChunks.unshift(...chunks);
    return { document: doc, chunksAdded: chunks.length };
  }

  setKnowledgeChunkEmbeddings(params: { documentId: string; embeddings: Array<{ chunkId: string; vector: number[] }>; embeddingModel?: string }){
    const now = new Date().toISOString();
    const model = params.embeddingModel || 'unknown';
    const byId: Record<string, number[]> = {};
    for (const e of params.embeddings) byId[e.chunkId] = e.vector;
    for (let i = 0; i < this.knowledgeChunks.length; i++) {
      const c = this.knowledgeChunks[i];
      if (c.documentId !== params.documentId) continue;
      const v = byId[c.id];
      if (!v) continue;
      this.knowledgeChunks[i] = { ...c, embedding: v, embeddingDims: v.length, embeddingModel: model, updatedAt: now };
    }
    return { ok: true, updated: Object.keys(byId).length, embeddingModel: model };
  }

  deleteKnowledgeDocumentAndChunks(id: string){
    const beforeDocs = this.knowledgeDocuments.length;
    const beforeChunks = this.knowledgeChunks.length;
    this.knowledgeDocuments = this.knowledgeDocuments.filter((d) => d.id !== id);
    this.knowledgeChunks = this.knowledgeChunks.filter((c) => c.documentId !== id);
    return {
      ok: true,
      deleted: true,
      id,
      docsRemoved: beforeDocs - this.knowledgeDocuments.length,
      chunksRemoved: beforeChunks - this.knowledgeChunks.length,
    };
  }


  // Agent runs
  listAgentRuns(){ return this.agentRuns; }
  addAgentRun(v: AgentRunRecord){ this.agentRuns.unshift(v); return v; }
  updateAgentRun(id: string, patch: Partial<AgentRunRecord>){
    const i = this.agentRuns.findIndex((x) => x.id === id);
    if (i < 0) throw new NotFoundException('Agent run not found');
    this.agentRuns[i] = { ...this.agentRuns[i], ...patch, id: this.agentRuns[i].id, updatedAt: new Date().toISOString() };
    return this.agentRuns[i];
  }


  // Workflow automation
  listWorkflowInstances(){ return this.workflowInstances; }
  getWorkflowInstanceById(id: string){ return this.workflowInstances.find((x) => x.id === id); }
  addWorkflowInstance(v: WorkflowInstanceRecord){ this.workflowInstances.unshift(v); return v; }
  updateWorkflowInstance(id: string, patch: Partial<WorkflowInstanceRecord>){
    const i = this.workflowInstances.findIndex((x) => x.id === id);
    if (i < 0) throw new NotFoundException('Workflow instance not found');
    this.workflowInstances[i] = { ...this.workflowInstances[i], ...patch, id: this.workflowInstances[i].id, updatedAt: new Date().toISOString() };
    return this.workflowInstances[i];
  }

  listWorkflowRuns(){ return this.workflowRuns; }
  getWorkflowRunById(id: string){ return this.workflowRuns.find((x) => x.id === id); }
  addWorkflowRun(v: WorkflowRunRecord){ this.workflowRuns.unshift(v); return v; }
  updateWorkflowRun(id: string, patch: Partial<WorkflowRunRecord>){
    const i = this.workflowRuns.findIndex((x) => x.id === id);
    if (i < 0) throw new NotFoundException('Workflow run not found');
    this.workflowRuns[i] = { ...this.workflowRuns[i], ...patch, id: this.workflowRuns[i].id, updatedAt: new Date().toISOString() };
    return this.workflowRuns[i];
  }

  listWorkflowPacks(){ return this.workflowPacks; }
  getWorkflowPackById(id: string){ return this.workflowPacks.find((x) => x.id === id); }
  addWorkflowPack(v: WorkflowPackRecord){ this.workflowPacks.unshift(v); return v; }


  // Workspaces
  listWorkspaces(){ return this.workspaces; }
  getWorkspaceById(id: string){ return this.workspaces.find((x) => x.id === id); }
  addWorkspace(v: WorkspaceRecord){ this.workspaces.unshift(v); return v; }
  updateWorkspace(id: string, patch: Partial<WorkspaceRecord>){
    const i = this.workspaces.findIndex((x) => x.id === id);
    if (i < 0) throw new NotFoundException('Workspace not found');
    this.workspaces[i] = { ...this.workspaces[i], ...patch, id: this.workspaces[i].id, updatedAt: new Date().toISOString() };
    return this.workspaces[i];
  }

  // Prompt templates
  listPromptTemplates(){ return this.promptTemplates; }
  getPromptTemplateById(id: string){ return this.promptTemplates.find((x) => x.id === id); }
  addPromptTemplate(v: PromptTemplateRecord){ this.promptTemplates.unshift(v); return v; }
  updatePromptTemplate(id: string, patch: Partial<PromptTemplateRecord>){
    const i = this.promptTemplates.findIndex((x) => x.id === id);
    if (i < 0) throw new NotFoundException('Prompt template not found');
    this.promptTemplates[i] = { ...this.promptTemplates[i], ...patch, id: this.promptTemplates[i].id, updatedAt: new Date().toISOString() };
    return this.promptTemplates[i];
  }

  // Programs
  listPrograms(){ return this.programs; }
  getProgramById(id: string){ return this.programs.find((x) => x.id === id); }
  addProgram(v: ProgramRecord){ this.programs.unshift(v); return v; }
  updateProgram(id: string, patch: Partial<ProgramRecord>){
    const i = this.programs.findIndex((x) => x.id === id);
    if (i < 0) throw new NotFoundException('Program not found');
    this.programs[i] = { ...this.programs[i], ...patch, id: this.programs[i].id, updatedAt: new Date().toISOString() };
    return this.programs[i];
  }

  // Workflow executions
  listWorkflowExecutions(){ return this.workflowExecutions; }
  getWorkflowExecutionById(id: string){ return this.workflowExecutions.find((x) => x.id === id); }
  addWorkflowExecution(v: WorkflowExecutionRecord){ this.workflowExecutions.unshift(v); return v; }
  updateWorkflowExecution(id: string, patch: Partial<WorkflowExecutionRecord>){
    const i = this.workflowExecutions.findIndex((x) => x.id === id);
    if (i < 0) throw new NotFoundException('Workflow execution not found');
    this.workflowExecutions[i] = { ...this.workflowExecutions[i], ...patch, id: this.workflowExecutions[i].id, updatedAt: new Date().toISOString() };
    return this.workflowExecutions[i];
  }
  listWorkflowExecutionEvents(){ return this.workflowExecutionEvents; }
  addWorkflowExecutionEvents(rows: WorkflowExecutionEventRecord[]){ this.workflowExecutionEvents.unshift(...rows); return rows; }

  private seedWorkspaceAndTemplates() {
    const now = new Date().toISOString();
    if (!this.workspaces.find((x) => x.id === 'ws_demo_1')) {
      this.workspaces.push({
        id: 'ws_demo_1',
        organizationId: 'org_demo_1',
        code: 'ATHL-OPS',
        name: 'ATheel Cultural Ops Workspace',
        description: 'مساحة تشغيل ثقافي موحدة للمشاريع والمحتوى وسير العمل الذكي',
        status: 'active',
        defaultLanguage: 'ar',
        settings: { timezone: 'Asia/Riyadh', currency: 'SAR', notifications: { email: true, dashboard: true } },
        aiRoutingPolicy: { defaultModelClass: 'balanced', escalationToReasoningWhen: ['advanced_workflow', 'approval_packet', 'risk_review'] },
        ragPolicy: { topK: 5, maxChunkChars: 1200, minScore: 0.08 },
        guardrails: { requireCitationsInExecutiveOutputs: true, blockPIIExport: true },
        createdByUserId: 'seed',
        createdAt: now,
        updatedAt: now,
      });
    }

    if (this.promptTemplates.length === 0) {
      this.promptTemplates.push(
        {
          id: 'pt_demo_campaign_1',
          workspaceId: 'ws_demo_1',
          organizationId: 'org_demo_1',
          code: 'campaign_launch_brief',
          name: 'مخطط موجز إطلاق حملة ثقافية',
          description: 'يبني موجز حملة ثقافية مع قنوات ورسائل ومؤشرات',
          templateBody: [
            'أنت مدير تشغيل ثقافي وتسويق استراتيجي.',
            'المطلوب إعداد موجز حملة ثقافية منظم.',
            'اسم الجهة: {{organizationName}}',
            'اسم المشروع: {{projectName}}',
            'هدف الحملة: {{goal}}',
            'الجمهور المستهدف: {{audience}}',
            'القيود: {{constraints}}',
            'أخرج النتيجة بالعربية في أقسام واضحة: الفكرة، الرسائل، القنوات، الجدول، مؤشرات الأداء، المخاطر.'
          ].join('\n'),
          inputSchema: { required: ['organizationName', 'projectName', 'goal', 'audience'], optional: ['constraints'] },
          tags: ['culture', 'campaign', 'brief'],
          modelClass: 'balanced',
          isActive: true,
          version: 1,
          createdByUserId: 'seed',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'pt_demo_approval_1',
          workspaceId: 'ws_demo_1',
          organizationId: 'org_demo_1',
          code: 'approval_packet_summary',
          name: 'ملخص حزمة اعتماد',
          description: 'يحضر حزمة اعتماد تنفيذية بمخاطر وقرار مطلوب',
          templateBody: [
            'أنت مساعد حوكمة واعتمادات.',
            'لخص الطلب التالي بشكل تنفيذي مع المخاطر والتوصية.',
            'الطلب: {{requestText}}',
            'سياق المشروع: {{projectContext}}',
            'المعايير: {{criteria}}',
            'اكتب قرار مقترح + أسباب + عناصر تحتاج تحقق.'
          ].join('\n'),
          inputSchema: { required: ['requestText'], optional: ['projectContext', 'criteria'] },
          tags: ['approval', 'governance'],
          modelClass: 'reasoning',
          isActive: true,
          version: 1,
          createdByUserId: 'seed',
          createdAt: now,
          updatedAt: now,
        }
      );
    }

    if (!this.programs.find((x) => x.id === 'prog_demo_1')) {
      this.programs.push({
        id: 'prog_demo_1',
        organizationId: 'org_demo_1',
        code: 'ATHL-TAIF-26',
        nameAr: 'برنامج أثيل لتشغيل التجارب الثقافية 2026',
        description: 'برنامج عالي المستوى يجمع المشاريع وسير العمل والقوالب الذكية ضمن حوكمة واحدة',
        status: 'active',
        strategicValueScore: 82,
        readinessScore: 61,
        portfolioValueSar: 2400000,
        metadata: { phase: 'wave-b', ownerUnit: 'الذكاء الحضري والتقنية' },
        projectIds: ['prj_1'],
        workflowInstanceIds: [],
        createdByUserId: 'seed',
        createdAt: now,
        updatedAt: now,
      });
    }
  }


  // Creative loop: Inspiration + Brainstorm + Idea vault + Narrative
  listInspirationSources(){ return this.inspirationSources; }
  upsertInspirationSource(v: InspirationSourceRecord){
    const i = this.inspirationSources.findIndex((x) => x.id === v.id);
    if (i >= 0) {
      this.inspirationSources[i] = { ...this.inspirationSources[i], ...v, id: this.inspirationSources[i].id, updatedAt: new Date().toISOString() };
      return this.inspirationSources[i];
    }
    this.inspirationSources.unshift(v);
    return v;
  }

  listInspirationAssets(){ return this.inspirationAssets; }
  addInspirationAsset(v: InspirationAssetRecord){ this.inspirationAssets.unshift(v); return v; }


  // Inspiration boards (Pinterest-like Boards)
  listInspirationBoards(){ return this.inspirationBoards; }
  getInspirationBoardById(id: string){ return this.inspirationBoards.find((x) => x.id === id); }
  addInspirationBoard(v: InspirationBoardRecord){ this.inspirationBoards.unshift(v); return v; }
  updateInspirationBoard(id: string, patch: Partial<InspirationBoardRecord>){
    const i = this.inspirationBoards.findIndex((x) => x.id === id);
    if (i < 0) throw new NotFoundException('Inspiration board not found');
    this.inspirationBoards[i] = { ...this.inspirationBoards[i], ...patch, id: this.inspirationBoards[i].id, updatedAt: new Date().toISOString() };
    return this.inspirationBoards[i];
  }
  listInspirationBoardItems(boardId: string){ return this.inspirationBoardItems.filter((x) => x.boardId === boardId).sort((a,b)=>a.orderIndex-b.orderIndex); }
  addInspirationBoardItem(v: InspirationBoardItemRecord){ this.inspirationBoardItems.push(v); return v; }
  removeInspirationBoardItem(boardId: string, itemId: string){
    const before = this.inspirationBoardItems.length;
    this.inspirationBoardItems = this.inspirationBoardItems.filter((x) => !(x.boardId === boardId && x.id === itemId));
    return { deleted: before !== this.inspirationBoardItems.length, id: itemId };
  }

  // Documentation checks
  listDocumentationChecks(entityType?: string, entityId?: string){
    let items = this.documentationChecks;
    if (entityType) items = items.filter((x) => x.entityType === (entityType as any));
    if (entityId) items = items.filter((x) => x.entityId === entityId);
    return items;
  }
  addDocumentationCheck(v: DocumentationCheckRecord){ this.documentationChecks.unshift(v); return v; }

  // Narrative instances
  listNarratives(){ return this.narratives; }
  getNarrativeInstanceById(id: string){ return this.narratives.find((x) => x.id === id); }
  upsertNarrativeInstance(v: NarrativeInstanceRecord){
    const i = this.narratives.findIndex((x) => x.id === v.id);
    if (i >= 0) {
      this.narratives[i] = { ...this.narratives[i], ...v, id: this.narratives[i].id, updatedAt: new Date().toISOString() };
      return this.narratives[i];
    }
    this.narratives.unshift(v);
    return v;
  }
  listNarrativePolicies(projectId?: string){ return this.narrativePolicies.filter((x) => !projectId || x.projectId === projectId); }
  addNarrativePolicy(v: NarrativePolicyRecord){ this.narrativePolicies.unshift(v); return v; }
  findNarrativePolicyByProjectId(projectId?: string){ return this.narrativePolicies.find((x) => !!projectId && x.projectId === projectId) || null; }
  listNarrativeChecks(projectId?: string){ return this.narrativeChecks.filter((x) => !projectId || x.projectId === projectId); }
  addNarrativeCheck(v: NarrativeCheckRecord){ this.narrativeChecks.unshift(v); return v; }

  // Impact
  listImpactSnapshots(){ return this.impactSnapshots; }
  addImpactSnapshot(v: ImpactSnapshotRecord){ this.impactSnapshots.unshift(v); return v; }
  listImpactFrameworks(organizationId?: string){ return this.impactFrameworks.filter((x) => !organizationId || x.organizationId === organizationId); }
  addImpactFramework(v: ImpactFrameworkRecord){ this.impactFrameworks.unshift(v); return v; }
  listLegacyOutcomes(params?: { projectId?: string; seasonId?: string; organizationId?: string }){
    return this.legacyOutcomes.filter((x) => (!params?.projectId || x.projectId === params.projectId) && (!params?.seasonId || x.seasonId === params.seasonId) && (!params?.organizationId || x.organizationId === params.organizationId));
  }
  addLegacyOutcome(v: LegacyOutcomeRecord){ this.legacyOutcomes.unshift(v); return v; }

  // Partners + commerce + connectors
  listPartners(params?: { organizationId?: string; partnerType?: string }){
    return this.partners.filter((x) => (!params?.organizationId || x.organizationId === params.organizationId) && (!params?.partnerType || x.partnerType === params.partnerType));
  }
  getPartnerById(id: string){ return this.partners.find((x) => x.id === id); }
  addPartner(v: PartnerRecord){ this.partners.unshift(v); return v; }
  listPartnerInvites(partnerId?: string){ return this.partnerInvites.filter((x) => !partnerId || x.partnerId === partnerId); }
  addPartnerInvite(v: PartnerInviteRecord){ this.partnerInvites.unshift(v); return v; }
  listLocalOffers(params?: { organizationId?: string; city?: string; category?: string }){
    return this.localOffers.filter((x) => (!params?.organizationId || x.organizationId === params.organizationId) && (!params?.city || x.city === params.city) && (!params?.category || x.category === params.category));
  }
  addLocalOffer(v: LocalOfferRecord){ this.localOffers.unshift(v); return v; }
  listCommerceBundles(params?: { organizationId?: string; experienceId?: string }){
    return this.commerceBundles.filter((x) => (!params?.organizationId || x.organizationId === params.organizationId) && (!params?.experienceId || x.experienceId === params.experienceId));
  }
  getCommerceBundleById(id: string){ return this.commerceBundles.find((x) => x.id === id); }
  addCommerceBundle(v: CommerceBundleRecord){ this.commerceBundles.unshift(v); return v; }
  updateCommerceBundle(id: string, patch: Partial<CommerceBundleRecord>){
    const i = this.commerceBundles.findIndex((x) => x.id === id);
    if (i < 0) throw new NotFoundException('Commerce bundle not found');
    this.commerceBundles[i] = { ...this.commerceBundles[i], ...patch, id: this.commerceBundles[i].id, updatedAt: new Date().toISOString() };
    return this.commerceBundles[i];
  }
  listBookingConnectors(organizationId?: string){ return this.bookingConnectors.filter((x) => !organizationId || x.organizationId === organizationId); }
  getBookingConnectorById(id: string){ return this.bookingConnectors.find((x) => x.id === id); }
  addBookingConnector(v: BookingConnectorRecord){ this.bookingConnectors.unshift(v); return v; }
  updateBookingConnector(id: string, patch: Partial<BookingConnectorRecord>){
    const i = this.bookingConnectors.findIndex((x) => x.id === id);
    if (i < 0) throw new NotFoundException('Booking connector not found');
    this.bookingConnectors[i] = { ...this.bookingConnectors[i], ...patch, id: this.bookingConnectors[i].id, updatedAt: new Date().toISOString() };
    return this.bookingConnectors[i];
  }
  listBookingOrders(params?: { organizationId?: string; connectorId?: string }){
    return this.bookingOrders.filter((x) => (!params?.organizationId || x.organizationId === params.organizationId) && (!params?.connectorId || x.connectorId === params.connectorId));
  }
  addBookingOrders(rows: BookingOrderRecord[]){ this.bookingOrders.unshift(...rows); return rows; }

  // Visitor Graph foundations
  listVisitorProfiles(organizationId?: string){ return this.visitorProfiles.filter((x) => !organizationId || x.organizationId === organizationId); }
  getVisitorProfileById(id: string){ return this.visitorProfiles.find((x) => x.id === id); }
  addVisitorProfile(v: VisitorProfileRecord){ this.visitorProfiles.unshift(v); return v; }

  // Risks
  listRisks(params?: { projectId?: string; experienceId?: string; twinId?: string }){
    let items = this.risks;
    if (params?.projectId) items = items.filter((x) => x.projectId === params.projectId);
    if (params?.experienceId) items = items.filter((x) => x.experienceId === params.experienceId);
    if (params?.twinId) items = items.filter((x) => x.twinId === params.twinId);
    return items;
  }
  getRiskById(id: string){ return this.risks.find((x) => x.id === id); }
  addRisk(v: RiskRecord){ this.risks.unshift(v); return v; }
  updateRisk(id: string, patch: Partial<RiskRecord>){
    const i = this.risks.findIndex((x) => x.id === id);
    if (i < 0) throw new NotFoundException('Risk not found');
    this.risks[i] = { ...this.risks[i], ...patch, id: this.risks[i].id, updatedAt: new Date().toISOString() };
    return this.risks[i];
  }

  // Visitor guides
  listVisitorGuides(experienceId?: string){
    let items = this.visitorGuides;
    if (experienceId) items = items.filter((x) => x.experienceId === experienceId);
    return items;
  }
  getVisitorGuideById(id: string){ return this.visitorGuides.find((x) => x.id === id); }
  addVisitorGuide(v: VisitorGuideRecord){ this.visitorGuides.unshift(v); return v; }

  // Heritage sources
  listHeritageSources(){ return this.heritageSources; }
  addHeritageSource(v: HeritageSourceRecord){ this.heritageSources.unshift(v); return v; }

  // Program templates
  listProgramTemplates(){ return this.programTemplates; }
  addProgramTemplate(v: ProgramTemplateRecord){ this.programTemplates.unshift(v); return v; }


  listBrainstormBoards(){ return this.brainstormBoards; }
  getBrainstormBoardById(id: string){ return this.brainstormBoards.find((x) => x.id === id); }
  addBrainstormBoard(v: BrainstormBoardRecord){ this.brainstormBoards.unshift(v); return v; }
  updateBrainstormBoard(id: string, patch: Partial<BrainstormBoardRecord>){
    const i = this.brainstormBoards.findIndex((x) => x.id === id);
    if (i < 0) throw new NotFoundException('Board not found');
    this.brainstormBoards[i] = { ...this.brainstormBoards[i], ...patch, id: this.brainstormBoards[i].id, updatedAt: new Date().toISOString() };
    return this.brainstormBoards[i];
  }

  listBrainstormNotes(boardId: string){ return this.brainstormNotes.filter((x) => x.boardId === boardId); }
  addBrainstormNote(v: BrainstormNoteRecord){ this.brainstormNotes.unshift(v); return v; }

  listVoteSessions(boardId: string){ return this.brainstormVoteSessions.filter((x) => x.boardId === boardId); }
  getVoteSessionById(id: string){ return this.brainstormVoteSessions.find((x) => x.id === id); }
  addVoteSession(v: BrainstormVoteSessionRecord){ this.brainstormVoteSessions.unshift(v); return v; }
  updateVoteSession(id: string, patch: Partial<BrainstormVoteSessionRecord>){
    const i = this.brainstormVoteSessions.findIndex((x) => x.id === id);
    if (i < 0) throw new NotFoundException('Vote session not found');
    this.brainstormVoteSessions[i] = { ...this.brainstormVoteSessions[i], ...patch, id: this.brainstormVoteSessions[i].id };
    return this.brainstormVoteSessions[i];
  }

  listVotes(sessionId: string){ return this.brainstormVotes.filter((x) => x.sessionId === sessionId); }
  addVote(v: BrainstormVoteRecord){ this.brainstormVotes.unshift(v); return v; }

  listVaultIdeas(){ return this.vaultIdeas; }
  getVaultIdeaById(id: string){ return this.vaultIdeas.find((x) => x.id === id); }
  addVaultIdea(v: VaultIdeaRecord){ this.vaultIdeas.unshift(v); return v; }
  updateVaultIdea(id: string, patch: Partial<VaultIdeaRecord>){
    const i = this.vaultIdeas.findIndex((x) => x.id === id);
    if (i < 0) throw new NotFoundException('Idea not found');
    this.vaultIdeas[i] = { ...this.vaultIdeas[i], ...patch, id: this.vaultIdeas[i].id, updatedAt: new Date().toISOString() };
    return this.vaultIdeas[i];
  }

  listEvidenceForIdea(ideaId: string){ return this.vaultEvidence.filter((x) => x.ideaId === ideaId); }
  addEvidence(v: VaultEvidenceRecord){ this.vaultEvidence.unshift(v); return v; }

  getNarrativeByIdeaId(ideaId: string){ return this.narrativeDrafts.find((x) => x.ideaId === ideaId); }
  upsertNarrative(v: NarrativeDraftRecord){
    const i = this.narrativeDrafts.findIndex((x) => x.ideaId === v.ideaId);
    if (i >= 0) {
      this.narrativeDrafts[i] = { ...this.narrativeDrafts[i], ...v, id: this.narrativeDrafts[i].id, updatedAt: new Date().toISOString() };
      return this.narrativeDrafts[i];
    }
    this.narrativeDrafts.unshift(v);
    return v;
  }

  private seedCreativeLoop() {
    const now = new Date().toISOString();
    if (this.inspirationSources.length === 0) {
      const defaults: InspirationSourceRecord[] = [
        { id: 'src_unesco_ich_sa', nameAr: 'UNESCO التراث غير المادي (السعودية)', url: 'https://ich.unesco.org/en/state/saudi-arabia-SA', kind: 'unesco', tags: ['unesco','ich','saudi'], createdAt: now, updatedAt: now },
        { id: 'src_unesco_wh_sa', nameAr: 'UNESCO التراث العالمي (السعودية)', url: 'https://whc.unesco.org/en/statesparties/sa', kind: 'unesco', tags: ['unesco','world_heritage','saudi'], createdAt: now, updatedAt: now },
        { id: 'src_heritage_commission', nameAr: 'هيئة التراث: مكتبة التراث', url: 'https://heritage.moc.gov.sa/en', kind: 'official_sa', tags: ['heritage','moc','library'], createdAt: now, updatedAt: now },
        { id: 'src_heritage_register', nameAr: 'هيئة التراث: السجل الوطني للآثار', url: 'https://heritage.moc.gov.sa/en/Cultural-Heritage', kind: 'official_sa', tags: ['registry','archive','maps'], createdAt: now, updatedAt: now },
        { id: 'src_moc_media', nameAr: 'وزارة الثقافة: مكتبة صور وأفلام', url: 'https://www.moc.gov.sa/en', kind: 'official_sa', tags: ['moc','media','library'], createdAt: now, updatedAt: now },
        { id: 'src_moc_intangible', nameAr: 'وزارة الثقافة: التراث غير المادي', url: 'https://snc-ecs.moc.gov.sa/intangible-heritage/', kind: 'official_sa', tags: ['moc','intangible'], createdAt: now, updatedAt: now },
        { id: 'src_saudipedia_ich', nameAr: 'سعوديبيديا: عناصر التراث غير المادي', url: 'https://saudipedia.com/en/saudi-intangible-cultural-heritage-inscribed-on-unesco-list', kind: 'saudipedia', tags: ['saudipedia','summary'], createdAt: now, updatedAt: now },
        { id: 'src_misk_art', nameAr: 'معهد مسك للفنون: معارض', url: 'https://miskartinstitute.org/en/exhibitions', kind: 'misk', tags: ['misk','art','exhibitions'], createdAt: now, updatedAt: now },
        { id: 'src_alula_design_space', nameAr: 'Design Space AlUla', url: 'https://www.experiencealula.com/en/places-to-go/design-space', kind: 'alula', tags: ['alula','design','archive'], createdAt: now, updatedAt: now },
      ];
      this.inspirationSources.push(...defaults);
    }


    // Mirror a curated set of Saudi culture sources into Heritage Memory (for later RAG ingestion)
    if (this.heritageSources.length === 0) {
      this.heritageSources.push(
        { id: 'hs_unesco_ich_sa', nameAr: 'UNESCO التراث غير المادي (السعودية)', url: 'https://ich.unesco.org/en/state/saudi-arabia-SA', kind: 'unesco', tags: ['unesco','ich','saudi'], createdAt: now, updatedAt: now },
        { id: 'hs_moc_archive_guide', nameAr: 'دليل توثيق وأرشفة التراث (وزارة الثقافة)', url: 'https://www.moc.gov.sa/-/media/Project/Ministries/Moc/Publications/Cultural-Heritage-Documentation-and-Digital-Archiving-Guide-%281%29.pdf', kind: 'official_sa', tags: ['moc','archiving','guide'], createdAt: now, updatedAt: now },
        { id: 'hs_moc_resource_manual', nameAr: 'الدليل الإرشادي للتوثيق والأرشفة الرقمية V2', url: 'https://www.moc.gov.sa/-/media/Project/Ministries/Moc/Publications/RESOURCE-MANUAL-FOR-DIGITAL-DOCUMENTATION-AND-ARCHIVING-OF-CULTURAL-HERITAGE-IN-SAUDI-ARABIA-V2.pdf', kind: 'official_sa', tags: ['moc','documentation','manual'], createdAt: now, updatedAt: now }
      );
    }

    // Default Inspiration Board (Pinterest-like)
    if (this.inspirationBoards.length === 0) {
      this.inspirationBoards.push({
        id: 'ib_demo_1',
        organizationId: 'org_demo_1',
        projectId: 'prj_1',
        titleAr: 'Board: مراجع وإلهام للمسار التراثي',
        descriptionAr: 'مودبورد محلي بمصادر رسمية لتثبيت السردية قبل العرض',
        status: 'active',
        visibility: 'org',
        ownerUserId: 'seed',
        editorUserIds: [],
        viewerUserIds: [],
        createdAt: now,
        updatedAt: now,
      });

      if (this.inspirationAssets.length === 0) {
        this.inspirationAssets.push({
          id: 'insp_demo_1',
          organizationId: 'org_demo_1',
          projectId: 'prj_1',
          sourceId: 'src_unesco_ich_sa',
          titleAr: 'UNESCO: قائمة التراث غير المادي في السعودية',
          url: 'https://ich.unesco.org/en/state/saudi-arabia-SA',
          mediaType: 'link',
          regionCode: 'SA',
          themeCode: 'heritage',
          tags: ['unesco','ich','source'],
          notesAr: 'مرجع لتثبيت المصطلحات وعدم التفلسف بالسرد.',
          createdByUserId: 'seed',
          createdAt: now,
          updatedAt: now,
        });
      }

      this.inspirationBoardItems.push({
        id: 'ibi_demo_1',
        boardId: 'ib_demo_1',
        assetId: 'insp_demo_1',
        noteAr: 'استخدم كمرجع أساسي داخل Evidence Pack',
        orderIndex: 1,
        createdAt: now,
      });
    }


    if (this.brainstormBoards.length === 0) {
      this.brainstormBoards.push({
        id: 'brd_demo_1',
        organizationId: 'org_demo_1',
        projectId: 'prj_1',
        titleAr: 'عصف ذهني أولي: تجربة مسار تراثي',
        status: 'active',
        miroBoardUrl: 'https://miro.com/app/board/uX_demo_placeholder',
        createdByUserId: 'seed',
        createdAt: now,
        updatedAt: now,
      });
      this.brainstormNotes.push(
        { id: 'note_1', boardId: 'brd_demo_1', textAr: 'تجربة سمعية تفاعلية تروي قصة المكان عبر أصوات الرواة المحليين', tags: ['سردية','صوت'], x: 80, y: 120, color: 'yellow', createdByUserId: 'seed', createdAt: now },
        { id: 'note_2', boardId: 'brd_demo_1', textAr: 'نقاط توقف قصيرة مع ختم تذكاري لكل محطة', tags: ['محطات','تفاعل'], x: 300, y: 120, color: 'blue', createdByUserId: 'seed', createdAt: now },
        { id: 'note_3', boardId: 'brd_demo_1', textAr: 'ممر ضوئي ليلي يحاكي نقوش مستوحاة من التراث', tags: ['ضوء','ليلي'], x: 520, y: 120, color: 'pink', createdByUserId: 'seed', createdAt: now }
      );
      this.brainstormVoteSessions.push({ id: 'vote_demo_1', boardId: 'brd_demo_1', status: 'open', votesPerUser: 5, createdAt: now });
    }

    if (this.vaultIdeas.length === 0) {
      this.vaultIdeas.push({
        id: 'idea_demo_1',
        organizationId: 'org_demo_1',
        projectId: 'prj_1',
        state: 'raw',
        domain: 'heritage_sites',
        titleAr: 'المسار يتكلم',
        oneLinerAr: 'مسار تراثي تفاعلي يجعل الزائر يسمع المكان ويرى طبقاته عبر محطات قصيرة متعددة الحواس',
        audienceAr: 'عائلات وشباب وزوار خارج المنطقة',
        regionAr: 'الرياض',
        formatAr: 'تجربة مسار زائر',
        whyNowAr: 'ارتفاع الطلب على تجارب محلية أصيلة قابلة للقياس ومناسبة للمواسم',
        experienceSketchAr: 'يدخل الزائر عبر بوابة صوتية ثم ينتقل بين محطات 5-7 دقائق، كل محطة قصة + تفاعل بسيط + ختم رقمي، ثم ينتهي بمعرض مصغر للمواد والأرشيف',
        deliverablesAr: ['سردية تجربة', 'خريطة محطات', 'لوحات تعريفية', 'دليل تشغيل', 'خطة قياس'],
        kpisAr: ['معدل إكمال المسار', 'متوسط زمن التوقف', 'رضا الزوار', 'عودة الزيارة'],
        risksAr: ['ازدحام', 'تكرار السرد دون مصادر', 'إرهاق بصري/سمعي'],
        evidenceMinCount: 3,
        brainstormBoardId: 'brd_demo_1',
        createdByUserId: 'seed',
        createdAt: now,
        updatedAt: now,
      });
      this.vaultEvidence.push(
        { id: 'ev_1', ideaId: 'idea_demo_1', titleAr: 'مرجع: UNESCO ICH السعودية', url: 'https://ich.unesco.org/en/state/saudi-arabia-SA', kind: 'unesco', citationAr: 'قائمة التراث غير المادي توفر عناصر سردية قابلة للتضمين في التجارب', createdAt: now },
        { id: 'ev_2', ideaId: 'idea_demo_1', titleAr: 'مرجع: هيئة التراث مكتبة التراث', url: 'https://heritage.moc.gov.sa/en', kind: 'official_sa', citationAr: 'مصدر صور وأفلام ومواد يمكن تحويلها إلى إلهام بصري ورسمي', createdAt: now }
      );
      this.narrativeDrafts.push({
        id: 'nar_demo_1',
        ideaId: 'idea_demo_1',
        status: 'draft',
        loglineAr: 'المكان ليس حجارة فقط؛ هو ذاكرة تتحرك معك خطوة بخطوة.',
        act1: 'الدخول: من أنا وأين أنا؟ تمهيد تاريخي سريع مرتبط بالموقع.',
        act2: 'التجربة: محطات قصيرة تكشف طبقات من الحكاية من خلال أصوات وصور ومواد.',
        act3: 'الخاتمة: أثر شخصي للزائر + تعهد بالمحافظة + مخرجات يمكن مشاركتها.',
        createdAt: now,
        updatedAt: now,
      });
    }
  }


  private seedAiKnowledge() {
    if (this.knowledgeDocuments.length > 0) return;
    const now = new Date().toISOString();
    const docId = 'kdoc_demo_1';
    const text = 'أثيل منصة تشغيل ثقافي لإدارة المشاريع والمحتوى والتجارب والزوار والموافقات والتحليلات مع قابلية التوسع للذكاء الاصطناعي والحوكمة.';
    this.knowledgeDocuments.push({
      id: docId,
      organizationId: 'org_demo_1',
      projectId: 'prj_1',
      title: 'تعريف أثيل الأساسي',
      sourceType: 'manual',
      sourceRef: 'seed',
      languageCode: 'ar',
      tags: ['أثيل','تعريف','منصة','ثقافة'],
      text,
      chunkCount: 1,
      createdByUserId: 'seed',
      createdAt: now,
      updatedAt: now,
    });
    this.knowledgeChunks.push({
      id: 'kch_demo_1',
      documentId: docId,
      organizationId: 'org_demo_1',
      projectId: 'prj_1',
      title: 'تعريف أثيل الأساسي',
      sourceType: 'manual',
      languageCode: 'ar',
      text,
      tags: ['أثيل','تعريف','منصة','ثقافة'],
      chunkIndex: 0,
      tokenEstimate: 30,
      createdAt: now,
    });
  }

  // Twin APIs (in-memory)
  listTwins(){ return this.twins; }
  getTwinById(id: string){ return this.twins.find((x) => x.id === id); }
  upsertTwin(v: TwinRecord){
    const i = this.twins.findIndex((x) => x.id === v.id);
    if (i >= 0) this.twins[i] = v;
    else this.twins.unshift(v);
    return v;
  }

  listTwinNodes(twinId: string){ return this.twinNodes.filter((n) => n.twinId === twinId); }
  upsertTwinNode(v: TwinNodeRecord){
    const i = this.twinNodes.findIndex((x) => x.id === v.id);
    if (i >= 0) this.twinNodes[i] = v;
    else this.twinNodes.push(v);
    return v;
  }

  listTwinEdges(twinId: string){ return this.twinEdges.filter((e) => e.twinId === twinId); }
  upsertTwinEdge(v: TwinEdgeRecord){
    const i = this.twinEdges.findIndex((x) => x.id === v.id);
    if (i >= 0) this.twinEdges[i] = v;
    else this.twinEdges.push(v);
    return v;
  }

  listTwinLayers(twinId: string){ return this.twinLayers.filter((l) => l.twinId === twinId); }
  upsertTwinLayer(v: TwinLayerRecord){
    const i = this.twinLayers.findIndex((x) => x.id === v.id);
    if (i >= 0) this.twinLayers[i] = v;
    else this.twinLayers.push(v);
    return v;
  }

  listTwinSimulations(){ return this.twinSimulations; }
  getTwinSimulationById(id: string){ return this.twinSimulations.find((x) => x.id === id); }
  upsertTwinSimulation(v: TwinSimulationRecord){
    const i = this.twinSimulations.findIndex((x) => x.id === v.id);
    if (i >= 0) this.twinSimulations[i] = v;
    else this.twinSimulations.unshift(v);
    return v;
  }

  addTwinTelemetry(v: TwinTelemetryRecord){ this.twinTelemetry.unshift(v); return v; }
  listTwinTelemetry(twinId: string){ return this.twinTelemetry.filter((x) => x.twinId === twinId); }

  clearTwinGraph(twinId: string){
    this.twinNodes = this.twinNodes.filter((n) => n.twinId !== twinId);
    this.twinEdges = this.twinEdges.filter((e) => e.twinId !== twinId);
    this.twinLayers = this.twinLayers.filter((l) => l.twinId !== twinId);
    // Note: do not delete telemetry/simulations by default
    return { ok: true, twinId };
  }

  // TwinSpec APIs (in-memory)
  listTwinSpecs(params?: { twinId?: string; projectId?: string; organizationId?: string }){
    let items = this.twinSpecs;
    if (params?.organizationId) items = items.filter((x) => x.organizationId === params.organizationId);
    if (params?.projectId) items = items.filter((x) => x.projectId === params.projectId);
    if (params?.twinId) items = items.filter((x) => x.twinId === params.twinId);
    return items;
  }
  getTwinSpecById(id: string){ return this.twinSpecs.find((x) => x.id === id); }
  upsertTwinSpec(v: TwinSpecRecord){
    const i = this.twinSpecs.findIndex((x) => x.id === v.id);
    if (i >= 0) this.twinSpecs[i] = { ...this.twinSpecs[i], ...v, id: this.twinSpecs[i].id, updatedAt: new Date().toISOString() };
    else this.twinSpecs.unshift(v);
    return v;
  }

  listTwinScenarioPacks(twinId?: string){
    let items = this.twinScenarioPacks;
    if (twinId) items = items.filter((x) => x.twinId === twinId);
    return items;
  }
  getTwinScenarioPackById(id: string){ return this.twinScenarioPacks.find((x) => x.id === id); }
  upsertTwinScenarioPack(v: TwinScenarioPackRecord){
    const i = this.twinScenarioPacks.findIndex((x) => x.id === v.id);
    if (i >= 0) this.twinScenarioPacks[i] = { ...this.twinScenarioPacks[i], ...v, id: this.twinScenarioPacks[i].id, updatedAt: new Date().toISOString() };
    else this.twinScenarioPacks.unshift(v);
    return v;
  }

  private seedTwinBasics(){
    const now = new Date().toISOString();
    const twin: TwinRecord = {
      id: 'twin_demo_1',
      organizationId: 'org_demo_1',
      projectId: 'prj_1',
      kind: 'venue',
      nameAr: 'Twin تجريبي: مسار الحي',
      status: 'active',
      coordinateSystem: 'local_xy',
      bboxJson: JSON.stringify({ xMin: 0, yMin: 0, xMax: 120, yMax: 80 }),
      metadata: { note: 'Twin تجريبي لتجربة محاكاة تدفق زوار', experienceId: 'exp_1' },
      createdAt: now,
      updatedAt: now,
    };
    if (!this.getTwinById(twin.id)) this.twins.push(twin);

    const nodes: TwinNodeRecord[] = [
      { id: 'tn_entry', twinId: twin.id, nameAr: 'المدخل', kind: 'entry', capacity: 120, dwellTimeSecondsAvg: 35, posJson: JSON.stringify({ x: 5, y: 10 }), tags: ['entry'], createdAt: now, updatedAt: now },
      { id: 'tn_story', twinId: twin.id, nameAr: 'محطة السردية', kind: 'exhibit', capacity: 60, dwellTimeSecondsAvg: 240, posJson: JSON.stringify({ x: 35, y: 20 }), tags: ['story'], createdAt: now, updatedAt: now },
      { id: 'tn_craft', twinId: twin.id, nameAr: 'حرفة حية', kind: 'activity', capacity: 40, dwellTimeSecondsAvg: 360, posJson: JSON.stringify({ x: 70, y: 30 }), tags: ['craft'], createdAt: now, updatedAt: now },
      { id: 'tn_rest', twinId: twin.id, nameAr: 'استراحة', kind: 'rest', capacity: 50, dwellTimeSecondsAvg: 300, posJson: JSON.stringify({ x: 85, y: 60 }), tags: ['rest'], createdAt: now, updatedAt: now },
      { id: 'tn_exit', twinId: twin.id, nameAr: 'المخرج', kind: 'exit', capacity: 120, dwellTimeSecondsAvg: 10, posJson: JSON.stringify({ x: 110, y: 70 }), tags: ['exit'], createdAt: now, updatedAt: now },
    ];
    for (const n of nodes) if (!this.twinNodes.find((x) => x.id === n.id)) this.twinNodes.push(n);

    const edges: TwinEdgeRecord[] = [
      { id: 'te_1', twinId: twin.id, fromNodeId: 'tn_entry', toNodeId: 'tn_story', kind: 'path', distanceMeters: 20, travelTimeSeconds: 25, oneWay: false, widthMeters: 3, capacityPerMinute: 180, createdAt: now, updatedAt: now },
      { id: 'te_2', twinId: twin.id, fromNodeId: 'tn_story', toNodeId: 'tn_craft', kind: 'path', distanceMeters: 25, travelTimeSeconds: 35, oneWay: false, widthMeters: 2.4, capacityPerMinute: 140, createdAt: now, updatedAt: now },
      { id: 'te_3', twinId: twin.id, fromNodeId: 'tn_craft', toNodeId: 'tn_rest', kind: 'path', distanceMeters: 18, travelTimeSeconds: 25, oneWay: false, widthMeters: 2.2, capacityPerMinute: 120, createdAt: now, updatedAt: now },
      { id: 'te_4', twinId: twin.id, fromNodeId: 'tn_rest', toNodeId: 'tn_exit', kind: 'path', distanceMeters: 22, travelTimeSeconds: 30, oneWay: false, widthMeters: 3.2, capacityPerMinute: 200, createdAt: now, updatedAt: now },
    ];
    for (const e of edges) if (!this.twinEdges.find((x) => x.id === e.id)) this.twinEdges.push(e);

    const layer: TwinLayerRecord = {
      id: 'tl_demo_geo',
      twinId: twin.id,
      nameAr: 'طبقة تخطيط (GeoJSON)',
      kind: 'geojson',
      uri: 'https://example.local/twin/demo.geojson',
      contentType: 'application/geo+json',
      metadata: { note: 'استبدل الرابط بأصل حقيقي أو مرفق داخلي لاحقاً' },
      createdAt: now,
      updatedAt: now,
    };
    if (!this.twinLayers.find((x) => x.id === layer.id)) this.twinLayers.push(layer);

// Simulation seed: يجعل مسار الاعتماد والتصدير يعمل مباشرة بدون إعدادات إضافية
const sim: TwinSimulationRecord = {
  id: 'sim_demo_1',
  twinId: twin.id,
  status: 'completed',
  profileJson: JSON.stringify({
    audience: 'زوار عامون + عائلات',
    peakHour: '20:00',
    accessibility: { wheelchair: true, stroller: true },
    notesAr: 'ملف تعريف زوار تجريبي للتأسيس',
  }),
  resultJson: JSON.stringify({
    baseline: {
      kpis: {
        congestionScore0to100: 38,
        completionRatePct: 91,
        predictedSatisfaction0to100: 84,
      },
      totals: {
        visitorsSimulated: 800,
        completedVisitors: 728,
        avgTotalTimeSeconds: 3120,
        avgWaitSeconds: 260,
        avgTravelSeconds: 540,
      },
      bottlenecks: [
        { nodeId: 'tn_story', nameAr: 'محطة السردية', peakUtilizationPct: 92, avgWaitSeconds: 210, capacity: 60, peakOccupancy: 58 },
        { nodeId: 'tn_craft', nameAr: 'حرفة حية', peakUtilizationPct: 88, avgWaitSeconds: 180, capacity: 40, peakOccupancy: 39 },
      ],
    },
  }),
  createdAt: now,
  updatedAt: now,
};
if (!this.getTwinSimulationById(sim.id)) this.twinSimulations.unshift(sim);

  }
  private seedIoT(){
    const now = new Date().toISOString();
    // Demo device for telemetry injection
    const demo: IoTDeviceRecord = {
      id: 'dev_demo_counter_1',
      organizationId: 'org_demo_1',
      twinId: 'twin_demo_1',
      nameAr: 'عداد زوار تجريبي',
      kind: 'counter',
      secretKeyHash: 'demo', // replaced on first rotation; used فقط للعرض
      isActive: true,
      metadata: { sample: true, mappedKinds: ['footfall','occupancy'] },
      createdAt: now,
      updatedAt: now,
    };
    this.iotDevices = [demo];
  }



  listAsyncJobs(params?: { kind?: AsyncJobRecord['kind']; organizationId?: string; projectId?: string; entityId?: string }) {
    let rows = [...this.asyncJobs];
    if (params?.kind) rows = rows.filter((x) => x.kind === params.kind);
    if (params?.organizationId) rows = rows.filter((x) => x.organizationId === params.organizationId);
    if (params?.projectId) rows = rows.filter((x) => x.projectId === params.projectId);
    if (params?.entityId) rows = rows.filter((x) => x.entityId === params.entityId);
    return rows.sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }
  getAsyncJobById(id: string) { return this.asyncJobs.find((x) => x.id === id); }
  upsertAsyncJob(v: AsyncJobRecord) {
    const idx = this.asyncJobs.findIndex((x) => x.id === v.id);
    if (idx >= 0) this.asyncJobs[idx] = v; else this.asyncJobs.unshift(v);
    return v;
  }

  listIoTDevices(params?: { organizationId?: string; twinId?: string }) {
    let rows = [...this.iotDevices];
    if (params?.organizationId) rows = rows.filter((d) => d.organizationId === params.organizationId);
    if (params?.twinId) rows = rows.filter((d) => d.twinId === params.twinId);
    return rows;
  }
  getIoTDeviceById(id: string) { return this.iotDevices.find((d) => d.id === id); }
  upsertIoTDevice(v: IoTDeviceRecord) {
    const idx = this.iotDevices.findIndex((d) => d.id === v.id);
    if (idx >= 0) this.iotDevices[idx] = v; else this.iotDevices.unshift(v);
    return v;
  }


}
