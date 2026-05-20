import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '@madar/db';
import { RunHeritageRetrievalDto } from './dto/run-heritage-retrieval.dto';
import { IngestHeritageCorpusDto } from './dto/ingest-heritage-corpus.dto';
import { PolicyAwareHeritageRetrievalDto } from './dto/policy-aware-heritage-retrieval.dto';
import { LinkHeritageEvidenceDto } from './dto/link-heritage-evidence.dto';
import { GetHeritageVectorStoreDto } from './dto/get-heritage-vector-store.dto';
import { SyncHeritageVectorStoreDto } from './dto/sync-heritage-vector-store.dto';
import { RunHeritageQualityCheckDto } from './dto/run-heritage-quality-check.dto';

type HeritageAgent = {
  id: string;
  name: string;
  purposeAr: string;
  riskLevel: 'low' | 'medium' | 'high';
  tools: string[];
};

const DOMAIN = 'heritage' as const;
const BRAIN_DOMAIN = 'heritage' as const;

const DEFAULT_AGENTS: HeritageAgent[] = [
  {
    id: 'heritage_safety_agent',
    name: 'Heritage Safety Agent',
    purposeAr: 'تقييم مخاطر الأنشطة والتدخلات على الأصل التراثي.',
    riskLevel: 'high',
    tools: ['heritage_safety', 'knowledge_search', 'policy_runtime'],
  },
  {
    id: 'authenticity_agent',
    name: 'Authenticity Agent',
    purposeAr: 'فحص اتساق السرد والتجربة مع روح المكان والأصالة.',
    riskLevel: 'medium',
    tools: ['knowledge_search', 'narrative_alignment', 'evidence_graph'],
  },
  {
    id: 'interpretation_agent',
    name: 'Interpretation Agent',
    purposeAr: 'اقتراح منطق التفسير والمحتوى الإرشادي للزائر.',
    riskLevel: 'low',
    tools: ['knowledge_search', 'studio', 'visitor_guide'],
  },
];

@Injectable()
export class HeritageBrainService {
  constructor(private readonly prisma: PrismaService) {}

  /* ── Prisma where helpers for domain-scoped queries ── */
  private docWhere(p?: { organizationId?: string; projectId?: string }) {
    return { tags: { has: DOMAIN }, ...(p?.organizationId ? { organizationId: p.organizationId } : {}), ...(p?.projectId ? { projectId: p.projectId } : {}) };
  }
  private chunkWhere(p?: { organizationId?: string; projectId?: string; languageCode?: string; tags?: string[] }) {
    const w: Record<string, unknown> = { tags: { has: DOMAIN } };
    if (p?.organizationId) w.organizationId = p.organizationId;
    if (p?.projectId) w.projectId = p.projectId;
    if (p?.languageCode) w.languageCode = p.languageCode;
    if (p?.tags?.length) w.tags = { hasEvery: [DOMAIN, ...p.tags] };
    return w;
  }


  private chunkText(text: string, size = 900) {
    const normalized = String(text || '').replace(/\n/g, ' ').trim();
    if (!normalized) return [] as string[];
    const chunks: string[] = [];
    for (let i = 0; i < normalized.length; i += size) chunks.push(normalized.slice(i, i + size));
    return chunks;
  }

  async ingest(input: IngestHeritageCorpusDto) {
    const now = new Date();
    const documentId = `hdoc_${randomUUID().slice(0, 8)}`;
    const chunks = this.chunkText(input.text, 900);
    const tags = Array.from(new Set(['heritage', 'policy_ready', ...(input.tags || [])]));
    const metadata = {
      domain: 'heritage',
      authorityLevel: (input.metadata?.authorityLevel as string) || 'sector',
      assetClass: (input.metadata?.assetClass as string) || 'heritage_asset',
      regionCode: input.metadata?.regionCode,
      sourceAuthority: input.metadata?.sourceAuthority,
      validityWindow: input.metadata?.validityWindow,
      ...input.metadata,
    };

    const document = await this.prisma.knowledgeDocument.create({
      data: {
        id: documentId,
        organizationId: input.organizationId || null,
        projectId: input.projectId || null,
        title: input.title,
        sourceType: 'manual',
        languageCode: input.languageCode || 'ar',
        tags, text: input.text, chunkCount: chunks.length,
        metadata, createdAt: now,
      },
    });

    if (chunks.length > 0) {
      await this.prisma.knowledgeChunk.createMany({
        data: chunks.map((text, idx) => ({
          id: `hchunk_${randomUUID().slice(0, 8)}`,
          documentId, organizationId: input.organizationId || null,
          projectId: input.projectId || null,
          title: `${input.title} — مقطع ${idx + 1}`,
          sourceType: 'manual', languageCode: input.languageCode || 'ar',
          text, tags, chunkIndex: idx,
          tokenEstimate: Math.ceil(text.length / 4),
          metadata: { domain: 'heritage', documentTitle: input.title,
            authorityLevel: (input.metadata?.authorityLevel as string) || 'sector',
            assetClass: (input.metadata?.assetClass as string) || 'heritage_asset',
            sensitivity: input.metadata?.sensitivity || 'medium',
            regionCode: input.metadata?.regionCode,
          },
          createdAt: now,
        })),
      });
    }

    return {
      ok: true,
      item: { documentId, title: document.title, chunkCount: chunks.length, tags, metadata: document.metadata },
      noteAr: 'تم إنشاء سجل وثيقة تراثية ومقاطعها في قاعدة البيانات الدائمة.',
    };
  }

  async corpusAdmin() {
    const [docs, chunkCount, evidenceCount] = await Promise.all([
      this.prisma.knowledgeDocument.findMany({ where: this.docWhere(), select: { id: true, title: true, chunkCount: true, metadata: true, languageCode: true, updatedAt: true }, orderBy: { createdAt: 'desc' }, take: 200 }),
      this.prisma.knowledgeChunk.count({ where: this.chunkWhere() }),
      this.prisma.brainEvidenceLink.count({ where: { domain: BRAIN_DOMAIN } }),
    ]);
    const byAuthority: Record<string, number> = {};
    const byLanguage: Record<string, number> = {};
    for (const doc of docs) {
      const authority = String((doc.metadata as Record<string, unknown>)?.authorityLevel || 'unknown');
      byAuthority[authority] = (byAuthority[authority] || 0) + 1;
      byLanguage[doc.languageCode] = (byLanguage[doc.languageCode] || 0) + 1;
    }
    return {
      ok: true, domain: DOMAIN,
      totals: { documents: docs.length, chunks: chunkCount, evidenceLinks: evidenceCount },
      distributions: { authorityLevel: byAuthority, language: byLanguage },
      latestDocuments: docs.slice(0, 12).map((d) => ({
        id: d.id, title: d.title, chunkCount: d.chunkCount,
        authorityLevel: (d.metadata as Record<string, unknown>)?.authorityLevel || 'unknown',
        sourceAuthority: (d.metadata as Record<string, unknown>)?.sourceAuthority || null,
        updatedAt: d.updatedAt,
      })),
      metadataSchemaAr: ['authorityLevel', 'assetClass', 'regionCode', 'sourceAuthority', 'validityWindow', 'sensitivity'],
    };
  }

  async policyAwareRetrieve(input: PolicyAwareHeritageRetrievalDto) {
    const base = await this.retrieve(input);
    const sensitivity = input.sensitivity || 'medium';
    const useCase = input.useCase || 'research';
    const blockedTags = sensitivity === 'high' ? ['activation_only'] : [];
    const filtered = base.items.filter((item: any) => !(item.tags || []).some((t: string) => blockedTags.includes(t)));
    return {
      ok: true, domain: DOMAIN,
      strategy: { mode: 'policy_aware_heritage_retrieval', noteAr: 'استرجاع مرتبط بحساسية الأصل وسيناريو الاستخدام.' },
      governanceSignals: {
        useCase, sensitivity,
        requiresHumanApproval: sensitivity === 'high' || useCase === 'activation',
        heritageSafetyMode: sensitivity === 'high' ? 'strict' : 'standard',
        recommendedGate: useCase === 'conservation' ? 'heritage_intervention' : 'destination_program',
      },
      count: filtered.length, items: filtered,
    };
  }

  async linkEvidence(input: LinkHeritageEvidenceDto) {
    const link = await this.prisma.brainEvidenceLink.create({
      data: {
        domain: BRAIN_DOMAIN, entityId: input.assetId, documentId: input.documentId,
        chunkId: input.chunkId || null, linkType: input.linkType,
        noteAr: input.noteAr || null, metadata: input.metadata || null,
      },
    });
    return { ok: true, item: link };
  }

  async vectorStore(input?: GetHeritageVectorStoreDto) {
    const provider = input?.provider || 'pgvector';
    let state = await this.prisma.brainVectorStoreState.findUnique({ where: { domain: BRAIN_DOMAIN } });
    if (!state) {
      state = await this.prisma.brainVectorStoreState.create({
        data: { domain: BRAIN_DOMAIN, provider, status: 'scaffolded', corpusId: 'heritage_default_corpus',
          retrievalMode: 'hybrid_foundation',
          metadataFilters: ['authorityLevel', 'assetClass', 'regionCode', 'sourceAuthority', 'sensitivity', 'validityWindow'],
        },
      });
    }
    const [fileCount, chunkCount] = await Promise.all([
      this.prisma.knowledgeDocument.count({ where: this.docWhere() }),
      this.prisma.knowledgeChunk.count({ where: this.chunkWhere() }),
    ]);
    return { ok: true, domain: DOMAIN, item: { ...state, provider, fileCount, chunkCount },
      noteAr: 'طبقة vector store مع حالة محفوظة في قاعدة البيانات.',
    };
  }

  async syncVectorStore(input: SyncHeritageVectorStoreDto) {
    const [fileCount, chunkCount] = await Promise.all([
      this.prisma.knowledgeDocument.count({ where: this.docWhere() }),
      this.prisma.knowledgeChunk.count({ where: this.chunkWhere() }),
    ]);
    const state = await this.prisma.brainVectorStoreState.upsert({
      where: { domain: BRAIN_DOMAIN },
      update: { provider: input.provider || 'pgvector', corpusId: input.corpusId || 'heritage_default_corpus',
        status: chunkCount > 0 ? 'ready' : 'scaffolded', fileCount, chunkCount,
        lastSyncAt: new Date(), retrievalMode: chunkCount > 0 ? 'vector_ready' : 'hybrid_foundation',
      },
      create: { domain: BRAIN_DOMAIN, provider: input.provider || 'pgvector',
        corpusId: input.corpusId || 'heritage_default_corpus',
        status: chunkCount > 0 ? 'ready' : 'scaffolded', fileCount, chunkCount,
        lastSyncAt: new Date(), retrievalMode: chunkCount > 0 ? 'vector_ready' : 'hybrid_foundation',
        metadataFilters: ['authorityLevel', 'assetClass', 'regionCode', 'sourceAuthority', 'sensitivity', 'validityWindow'],
      },
    });
    return { ok: true, item: state, noteAr: 'تم تحديث حالة Heritage vector store. الحالة محفوظة بشكل دائم.' };
  }

  retrievalContracts() {
    return {
      ok: true, domain: DOMAIN,
      items: [
        { mode: 'foundation', topKMax: 20, requiredMetadata: ['authorityLevel', 'assetClass'], optionalMetadata: ['regionCode', 'sourceAuthority', 'sensitivity', 'validityWindow'], scoringSignals: ['keyword_overlap', 'authority_boost', 'tag_match'], requiredGroundingTags: ['heritage'] },
        { mode: 'policy_aware', topKMax: 12, requiredMetadata: ['authorityLevel', 'assetClass', 'sensitivity'], optionalMetadata: ['regionCode', 'sourceAuthority', 'validityWindow'], scoringSignals: ['keyword_overlap', 'authority_boost', 'policy_match', 'sensitivity_guardrail'], requiredGroundingTags: ['heritage', 'policy'] },
        { mode: 'vector_candidate', topKMax: 10, requiredMetadata: ['authorityLevel', 'assetClass'], optionalMetadata: ['regionCode', 'sourceAuthority', 'validityWindow'], scoringSignals: ['semantic_similarity', 'keyword_overlap', 'authority_boost', 'rerank'], requiredGroundingTags: ['heritage'] },
      ],
    };
  }

  async runQualityCheck(_input?: RunHeritageQualityCheckDto) {
    const [docs, chunks] = await Promise.all([
      this.prisma.knowledgeDocument.findMany({ where: this.docWhere(), select: { id: true, title: true, metadata: true, tags: true, languageCode: true } }),
      this.prisma.knowledgeChunk.findMany({ where: this.chunkWhere(), select: { id: true, tags: true } }),
    ]);
    const metadataReadyDocs = docs.filter((d) => (d.metadata as Record<string, unknown>)?.authorityLevel && (d.metadata as Record<string, unknown>)?.assetClass);
    const authorityDocs = docs.filter((d) => ['official', 'authenticity', 'policy'].some((tag) => (d.tags || []).includes(tag)));
    const policyChunks = chunks.filter((c) => (c.tags || []).includes('policy'));
    const langs = new Set(docs.map((d) => d.languageCode).filter(Boolean));
    const duplicateTitleCount = Math.max(0, docs.length - new Set(docs.map((d) => d.title.trim().toLowerCase())).size);
    const metadataCoverage = docs.length ? metadataReadyDocs.length / docs.length : 0;
    const authorityCoverage = docs.length ? authorityDocs.length / docs.length : 0;
    const policyCoverage = chunks.length ? policyChunks.length / chunks.length : 0;
    const duplicationRisk = docs.length ? duplicateTitleCount / docs.length : 0;
    const languageBalance = langs.size >= 2 ? 1 : (langs.size === 1 ? 0.6 : 0);
    const score = Number(((metadataCoverage * 0.35) + (authorityCoverage * 0.25) + (policyCoverage * 0.2) + ((1 - duplicationRisk) * 0.1) + (languageBalance * 0.1)).toFixed(2));
    const posture = score >= 0.8 ? 'good' : score >= 0.55 ? 'needs_hardening' : 'critical';
    const actions: string[] = [];
    if (metadataCoverage < 0.8) actions.push('رفع اكتمال metadata التراثية قبل أي فهرسة production-grade.');
    if (authorityCoverage < 0.5) actions.push('زيادة corpus الرسمية وعالية الثقة لمجال التراث.');
    if (policyCoverage < 0.15) actions.push('رفع نسبة المقاطع المرتبطة بالسياسات والحماية.');
    if (duplicationRisk > 0.15) actions.push('تقليل التكرار وتوحيد الإصدارات داخل Heritage corpus.');
    if (languageBalance < 1) actions.push('تحسين توازن اللغات إذا كان المجال يتطلب corpus ثنائية اللغة.');
    return {
      ok: true, domain: DOMAIN,
      result: { posture, score, signals: {
        metadataCoverage: Number(metadataCoverage.toFixed(2)), authorityCoverage: Number(authorityCoverage.toFixed(2)),
        policyCoverage: Number(policyCoverage.toFixed(2)), duplicationRisk: Number(duplicationRisk.toFixed(2)),
        languageBalance: Number(languageBalance.toFixed(2)),
      }, actionsAr: actions.length ? actions : ['الوضع جيد مبدئيًا.'] },
    };
  }

  async readinessLinkage() {
    const quality = await this.runQualityCheck();
    const latest = await this.prisma.brainEvalRun.findFirst({ where: { domain: BRAIN_DOMAIN }, orderBy: { createdAt: 'desc' } });
    const vector = await this.vectorStore();
    const evidenceCount = await this.prisma.brainEvidenceLink.count({ where: { domain: BRAIN_DOMAIN } });
    const readinessScore = Number((((quality.result.score || 0) * 0.45) + ((latest?.groundingScore || 0) * 0.25) + ((latest?.policyScore || 0) * 0.2) + ((vector.item.status === 'ready' ? 1 : 0.5) * 0.1)).toFixed(2));
    const posture = readinessScore >= 0.8 ? 'readying_up' : readinessScore >= 0.6 ? 'partial' : 'fragile';
    return {
      ok: true, domain: DOMAIN, posture, readinessScore,
      releaseGate: readinessScore >= 0.75 ? 'conditional_go' : 'hold',
      linkedSignals: {
        latestGroundingScore: latest?.groundingScore ?? 0, latestPolicyScore: latest?.policyScore ?? 0,
        vectorStoreStatus: vector.item.status, corpusQualityScore: quality.result.score, evidenceLinks: evidenceCount,
      },
      actionsAr: [
        'اجعل sync للـ vector store جزءًا من خط ingest.',
        'ارفع تغطية metadata والسياسات الرسمية قبل الإنتاج.',
        'اربط Heritage readiness بلوحة command center.',
      ],
    };
  }

  async summary() {
    const [docCount, chunkCount, evidenceCount, evalCount, authorityDocs] = await Promise.all([
      this.prisma.knowledgeDocument.count({ where: this.docWhere() }),
      this.prisma.knowledgeChunk.count({ where: this.chunkWhere() }),
      this.prisma.brainEvidenceLink.count({ where: { domain: BRAIN_DOMAIN } }),
      this.prisma.brainEvalRun.count({ where: { domain: BRAIN_DOMAIN } }),
      this.prisma.knowledgeDocument.count({ where: { tags: { hasSome: ['authenticity', 'official'] } } }),
    ]);
    return {
      ok: true, domain: DOMAIN,
      coverage: { documents: docCount, chunks: chunkCount, authoritySignals: authorityDocs,
        agents: DEFAULT_AGENTS.length, evalRuns: evalCount, evidenceLinks: evidenceCount },
      nextMilestonesAr: ['ربط vector store فعلي لمجال التراث', 'رفع تقييمات الاسترجاع grounding/evals', 'ربط الوكلاء بمركز الجاهزية ولوحة القرار'],
    };
  }

  agents() { return { ok: true, items: DEFAULT_AGENTS }; }

  async retrieve(input: RunHeritageRetrievalDto) {
    const topK = Math.min(Math.max(input.topK || 8, 1), 20);
    const q = String(input.query || '').trim().toLowerCase();
    const tokens = q.split(/\s+/).filter(Boolean);
    const allChunks = await this.prisma.knowledgeChunk.findMany({
      where: this.chunkWhere({ organizationId: input.organizationId, projectId: input.projectId, languageCode: input.languageCode, tags: input.tags }),
      select: { id: true, documentId: true, title: true, text: true, tags: true, metadata: true },
    });
    const rows = allChunks
      .map((chunk) => {
        const hay = `${chunk.title || ''} ${chunk.text} ${(chunk.tags || []).join(' ')}`.toLowerCase();
        const keywordScore = tokens.reduce((acc, token) => acc + (hay.includes(token) ? 1 : 0), 0);
        const authorityBoost = ['official', 'authenticity', 'policy', 'heritage'].reduce((acc, tag) => acc + ((chunk.tags || []).includes(tag) ? 0.25 : 0), 0);
        return { chunkId: chunk.id, documentId: chunk.documentId, title: chunk.title, textPreview: chunk.text.slice(0, 280), tags: chunk.tags, metadata: chunk.metadata, score: keywordScore + authorityBoost };
      })
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
    return {
      ok: true, domain: DOMAIN,
      strategy: { mode: 'domain_grounded_foundation', noteAr: 'استرجاع تأسيسي من قاعدة بيانات دائمة. الترقية القادمة: vector search.' },
      count: rows.length, items: rows,
    };
  }

  async runEval(input: RunHeritageRetrievalDto) {
    const retrieval = await this.retrieve({ ...input, topK: input.topK || 6 });
    const itemCount = retrieval.count;
    const officialCoverage = retrieval.items.filter((x) => (x.tags || []).includes('official') || (x.tags || []).includes('authenticity')).length;
    const retrievalRecallScore = Math.min(1, itemCount / 6);
    const groundingScore = itemCount ? Math.min(1, officialCoverage / Math.max(1, itemCount)) : 0;
    const policyScore = retrieval.items.some((x) => (x.tags || []).includes('policy')) ? 0.9 : 0.65;
    const evalRun = await this.prisma.brainEvalRun.create({
      data: { domain: BRAIN_DOMAIN, organizationId: input.organizationId || null, query: input.query,
        retrievalRecallScore: Number(retrievalRecallScore.toFixed(2)),
        groundingScore: Number(groundingScore.toFixed(2)),
        policyScore: Number(policyScore.toFixed(2)),
      },
    });
    return { ok: true, item: evalRun, basedOn: retrieval };
  }

  async dashboard() {
    const [latest, evalCount, evidenceCount, docCount] = await Promise.all([
      this.prisma.brainEvalRun.findFirst({ where: { domain: BRAIN_DOMAIN }, orderBy: { createdAt: 'desc' } }),
      this.prisma.brainEvalRun.count({ where: { domain: BRAIN_DOMAIN } }),
      this.prisma.brainEvidenceLink.count({ where: { domain: BRAIN_DOMAIN } }),
      this.prisma.knowledgeDocument.count({ where: this.docWhere() }),
    ]);
    const vector = await this.vectorStore();
    const quality = await this.runQualityCheck();
    const readiness = await this.readinessLinkage();
    return {
      ok: true, domain: DOMAIN,
      posture: latest && latest.groundingScore >= 0.75 ? 'good' : 'needs_hardening',
      metrics: {
        agents: DEFAULT_AGENTS.length, evalRuns: evalCount,
        latestGroundingScore: latest?.groundingScore ?? 0, latestRecallScore: latest?.retrievalRecallScore ?? 0,
        latestPolicyScore: latest?.policyScore ?? 0, evidenceLinks: evidenceCount,
        corpusDocuments: docCount, vectorStoreStatus: vector.item.status,
        vectorRetrievalMode: vector.item.retrievalMode, corpusQualityScore: quality.result.score,
        readinessScore: readiness.readinessScore,
      },
      recommendedActionsAr: ['إضافة corpus رسمية وتراثية أعلى ثقة', 'ربط الاسترجاع بسياسات الاعتماد', 'رفع تقييمات grounding قبل البيع المؤسسي'],
    };
  }
}
