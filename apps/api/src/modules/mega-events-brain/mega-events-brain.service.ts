import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '@madar/db';
import { RunMegaEventsRetrievalDto } from './dto/run-mega-events-retrieval.dto';
import { RunMegaEventsEvalDto } from './dto/run-mega-events-eval.dto';
import { IngestMegaEventsCorpusDto } from './dto/ingest-mega-events-corpus.dto';
import { LinkMegaEventsEvidenceDto } from './dto/link-mega-events-evidence.dto';
import { RunMegaEventsQualityCheckDto } from './dto/run-mega-events-quality-check.dto';
import { MEGA_EVENTS_AGENT_CATALOG } from '../../../../../packages/knowledge-kernel/src/mega-events/agent-catalog';
import { MEGA_EVENTS_METADATA_SCHEMA } from '../../../../../packages/knowledge-kernel/src/mega-events/metadata-schema';
import { scoreMegaEventsCorpusQuality } from '../../../../../packages/knowledge-kernel/src/mega-events/corpus-quality';
import { summarizeReadinessOperationsGap } from '../../../../../packages/knowledge-kernel/src/mega-events/readiness-operations-gap';
import { getMegaEventsVectorStoreStatus } from '../../../../../packages/knowledge-kernel/src/mega-events/vector-store-manager';
import { MEGA_EVENTS_RETRIEVAL_CONTRACTS } from '../../../../../packages/knowledge-kernel/src/mega-events/retrieval-contracts';

type MegaEventsEval = {
  id: string;
  query: string;
  retrievalRecallScore: number;
  groundingScore: number;
  readinessScore: number;
  crowdOpsScore: number;
  createdAt: string;
};

type MegaEventsEvidenceLink = {
  id: string;
  eventId: string;
  documentId: string;
  chunkId?: string;
  linkType: string;
  noteAr?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

@Injectable()
export class MegaEventsBrainService {
  /* Wave123: evals persisted in BrainEvalRun table */
  /* Wave123: evidence persisted in BrainEvidenceLink table */

  constructor(private readonly prisma: PrismaService) {}

  private chunkText(text: string, size = 900) {
    const normalized = String(text || '').replace(/\n/g, ' ').trim();
    if (!normalized) return [] as string[];
    const chunks: string[] = [];
    for (let i = 0; i < normalized.length; i += size) chunks.push(normalized.slice(i, i + size));
    return chunks;
  }

  private filteredPrograms(params?: { organizationId?: string; city?: string }) {
    return await this.prisma.program.findMany({ where: params?.organizationId ? { organizationId: params.organizationId } : {} }).filter((x: any /* typed */) => {
      if (params?.organizationId && x.organizationId !== params.organizationId) return false;
      if (params?.city && String((x.metadata || {}).city || '') !== String(params.city)) return false;
      const tags = Array.isArray((x.metadata || {}).tags) ? (x.metadata || {}).tags : [];
      const eventType = String((x.metadata || {}).eventType || '');
      return tags.includes('mega_event') || ['festival', 'conference', 'expo', 'season'].includes(eventType);
    });
  }

  summary(params?: { organizationId?: string; city?: string }) {
    const programs = this.filteredPrograms(params);
    const approvals = await this.prisma.approvalRequest.findMany({ where: params?.organizationId ? { organizationId: params.organizationId } : {} }).filter((x: any /* typed */) => !params?.organizationId || x.organizationId === params.organizationId);
    const risks = await this.prisma.risk.findMany({}).filter((x: any /* typed */) => !params?.organizationId || (x as Record<string, unknown>).organizationId === params.organizationId);
    const jobs = await this.prisma.asyncJob.findMany({ where: params?.organizationId ? { organizationId: params.organizationId } : {} });
    const docs = await this.prisma.knowledgeDocument.findMany({ where: { tags: { has: 'mega_events' } } }) => (x.tags || []).includes('mega_events'));
    const cities = Array.from(new Set(programs.map((x: any /* typed */) => String((x.metadata || {}).city || '')).filter(Boolean)));
    const eventTypes = Array.from(new Set(programs.map((x: any /* typed */) => String((x.metadata || {}).eventType || '')).filter(Boolean)));
    return {
      ok: true,
      domain: 'mega_events',
      coverage: {
        programs: programs.length,
        approvals: approvals.length,
        risks: risks.length,
        asyncJobs: jobs.length,
        documents: docs.length,
        cities,
        eventTypes,
      },
      nextMilestonesAr: [
        'تعميق ingestion وربط evidence linkage بمسارات القرار التنفيذي.',
        'تعميق تقييمات crowd/readiness وربطها بمسارات المحاكاة.',
        'إضافة vector posture وretrieval contracts لمجال الفعاليات الكبرى.',
        'تعميق readiness linkage مع stage-gates وربط crowd posture بتوأم المحاكاة.',
      ],
    };
  }

  agents() {
    return { ok: true, items: MEGA_EVENTS_AGENT_CATALOG };
  }

  ingest(input: IngestMegaEventsCorpusDto) {
    const now = new Date().toISOString();
    const documentId = `medoc_${randomUUID().slice(0, 8)}`;
    const chunks = this.chunkText(input.text, 900);
    const tags = Array.from(new Set(['mega_events', 'readiness', 'operations', ...(input.tags || [])]));
    const document = this.prisma.knowledgeDocument.create({ data: {
      id: documentId,
      organizationId: input.organizationId,
      projectId: input.projectId,
      title: input.title,
      sourceType: 'manual',
      languageCode: (input.languageCode as any) || 'ar',
      tags,
      text: input.text,
      chunkCount: chunks.length,
      createdAt: now,
      updatedAt: now,
      metadata: {
        domain: 'mega_events',
        city: input.metadata?.city,
        eventType: input.metadata?.eventType || 'mega_event',
        venueType: input.metadata?.venueType,
        audienceScale: input.metadata?.audienceScale,
        crowdSensitivity: input.metadata?.crowdSensitivity || 'medium',
        operationsTier: input.metadata?.operationsTier || 'tier_2',
        authorityLevel: input.metadata?.authorityLevel || 'sector',
        seasonWindow: input.metadata?.seasonWindow,
        riskCategory: input.metadata?.riskCategory,
        readinessGate: input.metadata?.readinessGate || 'gate_1',
        ...input.metadata,
      },
    } as any);
    const chunkRows = chunks.map((text, idx) => ({
      id: `mechunk_${randomUUID().slice(0, 8)}`,
      documentId,
      organizationId: input.organizationId,
      projectId: input.projectId,
      title: `${input.title} — مقطع ${idx + 1}`,
      sourceType: 'manual' as const,
      languageCode: (input.languageCode as any) || 'ar',
      text,
      tags,
      chunkIndex: idx,
      tokenEstimate: Math.ceil(text.length / 4),
      metadata: {
        domain: 'mega_events',
        documentTitle: input.title,
        city: input.metadata?.city,
        eventType: input.metadata?.eventType || 'mega_event',
        venueType: input.metadata?.venueType,
        crowdSensitivity: input.metadata?.crowdSensitivity || 'medium',
        operationsTier: input.metadata?.operationsTier || 'tier_2',
        readinessGate: input.metadata?.readinessGate || 'gate_1',
      },
      createdAt: now,
      updatedAt: now,
    }));
    this.prisma.knowledgeChunk.createMany({ data: chunkRows as any);
    return {
      ok: true,
      item: {
        documentId,
        title: document.title,
        chunkCount: chunkRows.length,
        tags,
        metadata: document.metadata,
      },
      noteAr: 'تم إنشاء سجل وثيقة ومقاطعها داخل Mega Events corpus foundation، تمهيدًا لربطها لاحقًا بالاسترجاع الأقوى والمحاكاة والبوابات.',
    };
  }

  corpusAdmin(params?: { organizationId?: string }) {
    const docs = await this.prisma.knowledgeDocument.findMany({ where: { tags: { has: 'mega_events' } } }) => (d.tags || []).includes('mega_events') && (!params?.organizationId || d.organizationId === params.organizationId));
    const chunks = await this.prisma.knowledgeChunk.findMany({ where: { tags: { has: 'mega_events' } } }) => (c.tags || []).includes('mega_events') && (!params?.organizationId || c.organizationId === params.organizationId));
    const byCity: Record<string, number> = {};
    const byType: Record<string, number> = {};
    for (const doc of docs) {
      const city = String((doc.metadata as Record<string, unknown>)?.city || 'unknown');
      const eventType = String((doc.metadata as Record<string, unknown>)?.eventType || 'unknown');
      byCity[city] = (byCity[city] || 0) + 1;
      byType[eventType] = (byType[eventType] || 0) + 1;
    }
    const vector = this.vectorStore();
    const stageTwin = this.twinStageGateLinkage({ organizationId: params?.organizationId });

    return {
      ok: true,
      domain: 'mega_events',
      totals: {
        documents: docs.length,
        chunks: chunks.length,
        evidenceLinks: this.evidenceLinks.length,
        vectorSyncState: vector.status.syncState,
        combinedTwinStageGateScore: stageTwin.linkage.combinedScore,
      },
      distributions: { city: byCity, eventType: byType },
      metadataSchemaAr: [...MEGA_EVENTS_METADATA_SCHEMA],
      latestDocuments: docs.slice(0, 12).map((d: any) => ({ id: d.id, title: d.title, chunkCount: d.chunkCount, city: (d.metadata || {}).city || null, eventType: (d.metadata || {}).eventType || null, updatedAt: d.updatedAt })),
    };
  }

  retrieve(input: RunMegaEventsRetrievalDto) {
    const q = String(input.query || '').trim().toLowerCase();
    const terms = q.split(/\s+/).filter(Boolean);
    const topK = Math.min(Math.max(input.topK || 8, 1), 25);
    const rows = await this.prisma.knowledgeChunk.findMany({ where: { tags: { has: 'mega_events' } } }) => {
      if (!(row.tags || []).includes('mega_events')) return false;
      if (input.organizationId && row.organizationId !== input.organizationId) return false;
      if (input.city && String((row.metadata || {}).city || '') !== String(input.city)) return false;
      if (input.eventType && String((row.metadata || {}).eventType || '') !== String(input.eventType)) return false;
      return true;
    }).map((row: any) => {
      const haystack = `${row.title || ''} ${row.text || ''} ${JSON.stringify(row.metadata || {})}`.toLowerCase();
      const score = terms.length === 0 ? 0 : terms.reduce((acc, term) => acc + (haystack.includes(term) ? 1 : 0), 0) / terms.length;
      return { row, score };
    }).filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map(({ row, score }) => ({
        id: row.id,
        documentId: row.documentId,
        title: row.title,
        text: String(row.text || '').slice(0, 420),
        score: Number(score.toFixed(3)),
        metadata: row.metadata || {},
        tags: row.tags || [],
      }));

    return {
      ok: true,
      domain: 'mega_events',
      retrievalMode: 'domain_routed_foundation',
      query: input.query,
      items: rows,
      noteAr: 'هذه نواة استرجاع أولية لمجال الفعاليات الكبرى. سيتم لاحقًا ربطها بـ vector store وعمليات readiness/crowd أقوى.',
    };
  }

  runEval(input: RunMegaEventsEvalDto) {
    const retrieval = this.retrieve({ query: input.query, organizationId: input.organizationId, topK: 6 });
    const itemCount = retrieval.items.length;
    const approvals = await this.prisma.approvalRequest.findMany({ where: params?.organizationId ? { organizationId: params.organizationId } : {} }).filter((x: any /* typed */) => !input.organizationId || x.organizationId === input.organizationId);
    const risks = await this.prisma.risk.findMany({});
    const queued = (await this.prisma.asyncJob.findMany({ where: { status: { in: ['queued', 'running'] } } })).length;
    const retrievalRecallScore = Math.min(100, 35 + itemCount * 8);
    const groundingScore = Math.min(100, 45 + Math.round((retrieval.items[0]?.score || 0) * 40));
    const readinessScore = Math.max(35, Math.min(100, 80 - queued * 4 + Math.min(approvals.length, 5)));
    const crowdOpsScore = Math.max(30, Math.min(100, 70 - Math.min(risks.length, 8) * 3 + Math.min(itemCount, 5) * 4));
    const stageGateBoost = Math.min(12, approvals.length * 2);
    const twinBoost = Math.min(10, queued > 0 ? 2 : 6);
    const row: MegaEventsEval = {
      id: `me_eval_${Date.now()}`,
      query: input.query,
      retrievalRecallScore,
      groundingScore,
      readinessScore: Math.min(100, readinessScore + stageGateBoost),
      crowdOpsScore: Math.min(100, crowdOpsScore + twinBoost),
      createdAt: new Date().toISOString(),
    };
    this.evals.unshift(row);
    return { ok: true, item: row };
  }

  qualityCheck(input?: RunMegaEventsQualityCheckDto) {
    const docs = await this.prisma.knowledgeDocument.findMany({ where: { tags: { has: 'mega_events' } } }) => (d.tags || []).includes('mega_events') && (!input?.organizationId || d.organizationId === input.organizationId));
    const filtered = docs.filter((d: any) => {
      if (input?.city && String((d.metadata || {}).city || '') !== input.city) return false;
      if (input?.eventType && String((d.metadata || {}).eventType || '') !== input.eventType) return false;
      return true;
    });
    return {
      ok: true,
      quality: scoreMegaEventsCorpusQuality({ docs: filtered }),
      noteAr: 'فحص جودة أولي لمجال الفعاليات الكبرى يركز على اكتمال metadata، readiness coverage، وتغطية الحشود والعمليات.',
    };
  }

  linkEvidence(input: LinkMegaEventsEvidenceDto) {
    const row: MegaEventsEvidenceLink = {
      id: `mev_${randomUUID().slice(0, 8)}`,
      eventId: input.eventId,
      documentId: input.documentId,
      chunkId: input.chunkId,
      linkType: input.linkType,
      noteAr: input.noteAr,
      metadata: input.metadata,
      createdAt: new Date().toISOString(),
    };
    this.evidenceLinks.unshift(row);
    return { ok: true, item: row };
  }

  dashboard(params?: { organizationId?: string }) {
    const summary = this.summary(params);
    const latest = this.evals[0] || null;
    const jobs = await this.prisma.asyncJob.findMany({ where: params?.organizationId ? { organizationId: params.organizationId } : {} });
    const queuedJobs = jobs.filter((x) => x.status === 'queued' || x.status === 'running').length;
    const quality = this.qualityCheck({ organizationId: params?.organizationId });
    const linkage = this.readinessCrowdLinkage({ organizationId: params?.organizationId });
    const vector = this.vectorStore();
    const stageTwin = this.twinStageGateLinkage({ organizationId: params?.organizationId });
    return {
      ok: true,
      domain: 'mega_events',
      posture: quality.quality.overallScore >= 55 ? 'hardening' : 'foundation',
      metrics: {
        agents: MEGA_EVENTS_AGENT_CATALOG.length,
        evalRuns: this.evals.length,
        latestRetrievalRecallScore: latest?.retrievalRecallScore ?? null,
        latestReadinessScore: latest?.readinessScore ?? null,
        latestCrowdOpsScore: latest?.crowdOpsScore ?? null,
        queuedJobs,
        qualityScore: quality.quality.overallScore,
        evidenceLinks: this.evidenceLinks.length,
        vectorSyncState: vector.status.syncState,
        combinedTwinStageGateScore: stageTwin.linkage.combinedScore,
      },
      quickInsightsAr: [
        `يوجد ${summary.coverage.programs} برنامج/فعالية كبرى ضمن التغطية الحالية.`,
        `عدد الوظائف الخلفية النشطة أو المنتظرة: ${queuedJobs}.`,
        quality.quality.overallScore < 60 ? 'جودة corpus تحتاج تحسينًا قبل التوسع في الاسترجاع والمحاكاة.' : 'جودة corpus الحالية مناسبة كبداية للتشغيل القطاعي.',
      ],
      readinessLinkage: linkage,
      vectorStore: vector.status,
      twinStageGateLinkage: stageTwin,
    };
  }

  readinessLinkage(params?: { organizationId?: string }) {
    const approvals = await this.prisma.approvalRequest.findMany({ where: params?.organizationId ? { organizationId: params.organizationId } : {} }).filter((x: any /* typed */) => !params?.organizationId || x.organizationId === params.organizationId);
    const risks = await this.prisma.risk.findMany({});
    const jobs = await this.prisma.asyncJob.findMany({ where: params?.organizationId ? { organizationId: params.organizationId } : {} });
    const activeJobs = jobs.filter((x) => x.status === 'queued' || x.status === 'running').length;
    const score = Math.max(25, Math.min(100, 82 - Math.min(risks.length, 8) * 4 - activeJobs * 2 + Math.min(approvals.length, 5) * 2));
    const posture = score >= 75 ? 'controlled' : score >= 55 ? 'watch' : 'at_risk';
    return {
      readiness: {
        score,
        posture,
        gatesAr: [
          'اعتماد المسارات التشغيلية الأساسية للفعالية.',
          'وجود ملخص مخاطر crowd/operations واضح.',
          'ربط الوظائف الخلفية الحرجة بمركز القيادة والطوابير.',
        ],
      },
    };
  }

  crowdOperationsLinkage(params?: { organizationId?: string }) {
    const risks = await this.prisma.risk.findMany({});
    const jobs = await this.prisma.asyncJob.findMany({ where: params?.organizationId ? { organizationId: params.organizationId } : {} });
    const simulationJobs = jobs.filter((x) => x.kind === 'twin_simulation').length;
    return {
      ok: true,
      riskCount: risks.length,
      simulationJobs,
      operationsPosture: risks.length > 4 ? 'elevated' : 'manageable',
      crowdSignalsAr: [
        'عدد مخاطر crowd/operations الموثقة يجب ربطه لاحقًا بـ twin simulation.',
        'حالة الطوابير الخلفية تؤثر مباشرة على readiness posture في الفعاليات الكبرى.',
      ],
    };
  }

  readinessCrowdLinkage(params?: { organizationId?: string }) {
    const readiness = this.readinessLinkage(params);
    const crowdOps = this.crowdOperationsLinkage(params);
    const programs = this.filteredPrograms(params);
    const approvals = await this.prisma.approvalRequest.findMany({ where: params?.organizationId ? { organizationId: params.organizationId } : {} }).filter((x: any /* typed */) => !params?.organizationId || x.organizationId === params.organizationId);
    const risks = await this.prisma.risk.findMany({}).filter((x: any /* typed */) => !params?.organizationId || (x as Record<string, unknown>).organizationId === params.organizationId);
    const jobs = await this.prisma.asyncJob.findMany({ where: params?.organizationId ? { organizationId: params.organizationId } : {} });
    const gap = summarizeReadinessOperationsGap({ programs, approvals, risks, jobs });
    return {
      ok: true,
      ...readiness,
      crowdOps,
      gapAnalysis: gap,
    };
  }

  vectorStore() {
    return {
      ok: true,
      domain: 'mega_events',
      status: getMegaEventsVectorStoreStatus(),
    };
  }

  syncVectorStore(params?: { organizationId?: string; city?: string }) {
    const docs = await this.prisma.knowledgeDocument.findMany({ where: { tags: { has: 'mega_events' } } }) => (d.tags || []).includes('mega_events') && (!params?.organizationId || d.organizationId === params.organizationId) && (!params?.city || String((d.metadata || {}).city || '') === params.city));
    const chunks = await this.prisma.knowledgeChunk.findMany({ where: { tags: { has: 'mega_events' } } }) => (c.tags || []).includes('mega_events') && (!params?.organizationId || c.organizationId === params.organizationId) && (!params?.city || String((c.metadata || {}).city || '') === params.city));
    const jobs = await this.prisma.asyncJob.findMany({ where: params?.organizationId ? { organizationId: params.organizationId } : {} });
    const simulationJobs = jobs.filter((j) => j.kind === 'twin_simulation').length;
    return {
      ok: true,
      domain: 'mega_events',
      sync: {
        state: docs.length ? 'ready' : 'idle',
        documents: docs.length,
        chunks: chunks.length,
        city: params?.city || null,
        simulationJobs,
      },
      noteAr: 'تم إعداد مزامنة scaffold لمجال الفعاليات الكبرى تمهيدًا لربطه لاحقًا بـ OpenAI Vector Stores أو pgvector مع دعم crowd/readiness retrieval.',
    };
  }

  retrievalContracts() {
    return { ok: true, domain: 'mega_events', contracts: MEGA_EVENTS_RETRIEVAL_CONTRACTS };
  }

  readinessStageGateLinkage(params?: { organizationId?: string }) {
    const approvals = await this.prisma.approvalRequest.findMany({ where: params?.organizationId ? { organizationId: params.organizationId } : {} }).filter((x: any /* typed */) => !params?.organizationId || x.organizationId === params.organizationId);
    const quality = this.qualityCheck({ organizationId: params?.organizationId });
    const gateCoverage = approvals.length;
    const stageGateScore = Math.min(100, gateCoverage * 18 + Math.round(quality.quality.readinessCoverageScore * 0.5));
    return {
      ok: true,
      domain: 'mega_events',
      linkage: {
        stageGateScore,
        approvals: gateCoverage,
        posture: stageGateScore >= 70 ? 'gated' : stageGateScore >= 45 ? 'watch' : 'weak',
        gatesAr: [
          stageGateScore >= 70 ? 'الربط الحالي مع stage-gates مناسب للتوسع التالي.' : 'ربط stage-gates ما زال يحتاج تعزيزًا قبل الاعتماد التنفيذي الكامل.',
          quality.quality.readinessCoverageScore >= 40 ? 'تغطية readiness داخل corpus مقبولة كبداية.' : 'تغطية readiness داخل corpus ما زالت منخفضة.',
        ],
      },
    };
  }

  crowdTwinLinkage(params?: { organizationId?: string }) {
    const crowdOps = this.crowdOperationsLinkage(params);
    const jobs = await this.prisma.asyncJob.findMany({ where: params?.organizationId ? { organizationId: params.organizationId } : {} });
    const twinJobs = jobs.filter((j) => j.kind === 'twin_simulation' || j.kind === 'ai_decision').length;
    const quality = this.qualityCheck({ organizationId: params?.organizationId });
    const twinCrowdScore = Math.min(100, crowdOps.riskCount * 6 + twinJobs * 18 + Math.round(quality.quality.crowdOpsCoverageScore * 0.5));
    return {
      ok: true,
      domain: 'mega_events',
      linkage: {
        twinCrowdScore,
        twinJobs,
        posture: twinCrowdScore >= 65 ? 'linked' : twinCrowdScore >= 40 ? 'partial' : 'weak',
        notesAr: [
          twinJobs > 0 ? 'يوجد ارتباط أولي مع وظائف التوأم والمحاكاة.' : 'لا توجد وظائف twin كافية لاعتبار الربط قويًا بعد.',
          quality.quality.crowdOpsCoverageScore >= 40 ? 'تغطية crowd/operations داخل corpus مناسبة كبداية للربط.' : 'يلزم تعزيز corpus crowd/operations قبل ربط أعمق مع التوأم.',
        ],
      },
    };
  }

  twinStageGateLinkage(params?: { organizationId?: string }) {
    const readinessStageGates = this.readinessStageGateLinkage(params);
    const crowdTwin = this.crowdTwinLinkage(params);
    const combinedScore = Math.round((readinessStageGates.linkage.stageGateScore + crowdTwin.linkage.twinCrowdScore) / 2);
    return {
      ok: true,
      domain: 'mega_events',
      linkage: {
        combinedScore,
        posture: combinedScore >= 68 ? 'connected' : combinedScore >= 45 ? 'emerging' : 'weak',
      },
      readinessStageGates: readinessStageGates.linkage,
      crowdTwin: crowdTwin.linkage,
    };
  }

  metadataSchema() {
    return { ok: true, fields: MEGA_EVENTS_METADATA_SCHEMA };
  }
}
