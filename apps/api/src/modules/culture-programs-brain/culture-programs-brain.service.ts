
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '@madar/db';
import { RunCultureProgramsRetrievalDto } from './dto/run-culture-programs-retrieval.dto';
import { RunCultureProgramsEvalDto } from './dto/run-culture-programs-eval.dto';
import { IngestCultureProgramsCorpusDto } from './dto/ingest-culture-programs-corpus.dto';
import { LinkCultureProgramsEvidenceDto } from './dto/link-culture-programs-evidence.dto';
import { RunCultureProgramsQualityCheckDto } from './dto/run-culture-programs-quality-check.dto';
import { CULTURE_PROGRAMS_AGENT_CATALOG } from '../../../../../packages/knowledge-kernel/src/culture-programs/agent-catalog';
import { CULTURE_PROGRAMS_METADATA_SCHEMA } from '../../../../../packages/knowledge-kernel/src/culture-programs/metadata-schema';
import { scoreCultureProgramsCorpusQuality } from '../../../../../packages/knowledge-kernel/src/culture-programs/corpus-quality';
import { summarizeImpactPartnerLinkage } from '../../../../../packages/knowledge-kernel/src/culture-programs/impact-partner-linkage';
import { getCultureProgramsVectorStoreStatus } from '../../../../../packages/knowledge-kernel/src/culture-programs/vector-store-manager';
import { CULTURE_PROGRAMS_RETRIEVAL_CONTRACTS } from '../../../../../packages/knowledge-kernel/src/culture-programs/retrieval-contracts';

const DOMAIN = 'culture_programs' as const;
const BRAIN_DOMAIN = 'culture_programs' as const;

@Injectable()
export class CultureProgramsBrainService {
  constructor(private readonly prisma: PrismaService) {}

  private chunkText(text: string, size = 850) {
    const normalized = String(text || '').replace(/\n/g, ' ').trim();
    if (!normalized) return [] as string[];
    const chunks: string[] = [];
    for (let i = 0; i < normalized.length; i += size) chunks.push(normalized.slice(i, i + size));
    return chunks;
  }

  private docWhere(params?: { organizationId?: string }) {
    return { tags: { has: DOMAIN }, ...(params?.organizationId ? { organizationId: params.organizationId } : {}) };
  }
  private chunkWhere(params?: { organizationId?: string; programType?: string; audienceSegment?: string }) {
    const w: Record<string, unknown> = { tags: { has: DOMAIN } };
    if (params?.organizationId) w.organizationId = params.organizationId;
    return w;
  }

  async summary(params?: { organizationId?: string }) {
    const [docs, chunkCount, evidenceCount] = await Promise.all([
      this.prisma.knowledgeDocument.findMany({ where: this.docWhere(params), select: { metadata: true } }),
      this.prisma.knowledgeChunk.count({ where: this.chunkWhere(params) }),
      this.prisma.brainEvidenceLink.count({ where: { domain: BRAIN_DOMAIN } }),
    ]);
    return {
      ok: true, domain: DOMAIN,
      coverage: {
        documents: docs.length, chunks: chunkCount, evidenceLinks: evidenceCount,
        programTypes: Array.from(new Set(docs.map((d: any) => String((d.metadata || {}).programType || '')).filter(Boolean))),
        impactDimensions: Array.from(new Set(docs.map((d: any) => String((d.metadata || {}).impactDimension || '')).filter(Boolean))),
      },
    };
  }

  agents() { return { ok: true, items: CULTURE_PROGRAMS_AGENT_CATALOG }; }

  async ingest(input: IngestCultureProgramsCorpusDto) {
    const now = new Date();
    const documentId = `cpdoc_${randomUUID().slice(0, 8)}`;
    const chunks = this.chunkText(input.text, 850);
    const tags = Array.from(new Set(['culture_programs', 'impact', 'partners', ...(input.tags || [])]));
    const metadata = { domain: DOMAIN, programType: input.metadata?.programType || 'general_program', audienceSegment: input.metadata?.audienceSegment, culturalTrack: input.metadata?.culturalTrack, impactDimension: input.metadata?.impactDimension, partnerType: input.metadata?.partnerType, authorityLevel: input.metadata?.authorityLevel || 'institutional', ...(input.metadata || {}) };

    const document = await this.prisma.knowledgeDocument.create({
      data: { id: documentId, organizationId: input.organizationId || null, projectId: input.projectId || null, title: input.title, sourceType: 'manual', languageCode: (input.languageCode as any) || 'ar', tags, text: input.text, chunkCount: chunks.length, metadata, createdAt: now },
    });

    if (chunks.length > 0) {
      await this.prisma.knowledgeChunk.createMany({
        data: chunks.map((text, idx) => ({
          id: `cpchunk_${randomUUID().slice(0, 8)}`, documentId, organizationId: input.organizationId || null, projectId: input.projectId || null,
          title: `${input.title} — مقطع ${idx + 1}`, sourceType: 'manual', languageCode: (input.languageCode as any) || 'ar',
          text, tags, chunkIndex: idx, tokenEstimate: Math.ceil(text.length / 4),
          metadata: { domain: DOMAIN, documentTitle: input.title, programType: input.metadata?.programType || 'general_program', audienceSegment: input.metadata?.audienceSegment, culturalTrack: input.metadata?.culturalTrack, impactDimension: input.metadata?.impactDimension, partnerType: input.metadata?.partnerType },
          createdAt: now,
        })),
      });
    }

    return { ok: true, item: { documentId, title: document.title, chunkCount: chunks.length, tags, metadata: document.metadata }, noteAr: 'تم إنشاء سجل وثيقة برامج ثقافية في قاعدة البيانات الدائمة.' };
  }

  async corpusAdmin(params?: { organizationId?: string }) {
    const [docs, chunkCount, evidenceCount] = await Promise.all([
      this.prisma.knowledgeDocument.findMany({ where: this.docWhere(params), select: { id: true, title: true, chunkCount: true, metadata: true, updatedAt: true }, orderBy: { createdAt: 'desc' }, take: 200 }),
      this.prisma.knowledgeChunk.count({ where: this.chunkWhere(params) }),
      this.prisma.brainEvidenceLink.count({ where: { domain: BRAIN_DOMAIN } }),
    ]);
    const byType: Record<string, number> = {}; const byImpact: Record<string, number> = {};
    for (const d of docs) { const t = String((d.metadata as Record<string, unknown>)?.programType || 'unknown'); const i = String((d.metadata as Record<string, unknown>)?.impactDimension || 'unknown'); byType[t] = (byType[t] || 0) + 1; byImpact[i] = (byImpact[i] || 0) + 1; }
    const vector = getCultureProgramsVectorStoreStatus({ documents: docs.length, chunks: chunkCount, syncCount: docs.length });
    const linkage = await this.impactPartnerLinkage(params);
    return { ok: true, domain: DOMAIN, totals: { documents: docs.length, chunks: chunkCount, evidenceLinks: evidenceCount, vectorSyncState: vector.syncState, impactPartnerScore: linkage.linkageScore }, distributions: { programType: byType, impactDimension: byImpact }, metadataSchemaAr: [...CULTURE_PROGRAMS_METADATA_SCHEMA], latestDocuments: docs.slice(0, 12).map((d: any) => ({ id: d.id, title: d.title, chunkCount: d.chunkCount, programType: (d.metadata || {}).programType || null, impactDimension: (d.metadata || {}).impactDimension || null, updatedAt: d.updatedAt })) };
  }

  async retrieve(input: RunCultureProgramsRetrievalDto) {
    const q = String(input.query || '').trim().toLowerCase(); const terms = q.split(/\s+/).filter(Boolean); const topK = Math.min(Math.max(input.topK || 8, 1), 25);
    const allChunks = await this.prisma.knowledgeChunk.findMany({
      where: this.chunkWhere({ organizationId: input.organizationId }),
      select: { id: true, documentId: true, title: true, text: true, score: false, metadata: true, tags: true },
    });
    const rows = allChunks.map((row: any) => {
      const haystack = `${row.title || ''} ${row.text || ''} ${JSON.stringify(row.metadata || {})}`.toLowerCase();
      const score = terms.length === 0 ? 0 : terms.reduce((acc: number, term: string) => acc + (haystack.includes(term) ? 1 : 0), 0) / terms.length;
      return { id: row.id, documentId: row.documentId, title: row.title, text: String(row.text || '').slice(0, 420), score: Number(score.toFixed(3)), metadata: row.metadata || {}, tags: row.tags || [] };
    }).filter((x: any /* typed */) => x.score > 0).sort((a: any, b: any) => b.score - a.score).slice(0, topK);
    return { ok: true, domain: DOMAIN, retrievalMode: 'domain_routed_foundation', query: input.query, items: rows, noteAr: 'استرجاع من قاعدة بيانات دائمة لمجال البرامج الثقافية.' };
  }

  async runEval(input: RunCultureProgramsEvalDto) {
    const retrieval = await this.retrieve({ query: input.query, organizationId: input.organizationId, topK: 6 });
    const retrievalRecallScore = Math.min(100, 35 + retrieval.items.length * 8);
    const groundingScore = Math.min(100, 45 + Math.round((retrieval.items[0]?.score || 0) * 40));
    const impactScore = Math.max(35, Math.min(100, 50 + retrieval.items.length * 4));
    const partnerCoverageScore = Math.max(35, Math.min(100, 50 + retrieval.items.length * 4));

    const row = await this.prisma.brainEvalRun.create({
      data: { domain: BRAIN_DOMAIN, organizationId: input.organizationId || null, query: input.query,
        retrievalRecallScore, groundingScore, policyScore: 0,
        domainScores: { impactScore, partnerCoverageScore },
      },
    });
    return { ok: true, item: { ...row, impactScore, partnerCoverageScore }, noteAr: 'تقييم محفوظ في قاعدة البيانات.' };
  }

  async linkEvidence(input: LinkCultureProgramsEvidenceDto) {
    const row = await this.prisma.brainEvidenceLink.create({
      data: { domain: BRAIN_DOMAIN, entityId: input.programId, documentId: input.documentId, chunkId: input.chunkId || null, linkType: input.linkType, noteAr: input.noteAr || null, metadata: input.metadata || null },
    });
    return { ok: true, item: row };
  }

  async runQualityCheck(input: RunCultureProgramsQualityCheckDto) {
    const [docCount, chunkCount, evidenceCount] = await Promise.all([
      this.prisma.knowledgeDocument.count({ where: this.docWhere({ organizationId: input.organizationId }) }),
      this.prisma.knowledgeChunk.count({ where: this.chunkWhere({ organizationId: input.organizationId }) }),
      this.prisma.brainEvidenceLink.count({ where: { domain: BRAIN_DOMAIN } }),
    ]);
    const quality = scoreCultureProgramsCorpusQuality({ documents: docCount, chunks: chunkCount, evidenceLinks: evidenceCount, partnerRecords: 0, impactFrameworks: 0 });
    return { ok: true, domain: DOMAIN, quality, noteAr: 'جودة corpus محسوبة من قاعدة بيانات دائمة.' };
  }

  async vectorStore(params?: { organizationId?: string }) {
    const [docCount, chunkCount] = await Promise.all([
      this.prisma.knowledgeDocument.count({ where: this.docWhere(params) }),
      this.prisma.knowledgeChunk.count({ where: this.chunkWhere(params) }),
    ]);
    return { ok: true, status: getCultureProgramsVectorStoreStatus({ documents: docCount, chunks: chunkCount, syncCount: docCount }) };
  }

  async syncVectorStore(params?: { organizationId?: string }) {
    const status = (await this.vectorStore(params)).status;
    return { ok: true, status: { ...status, syncState: status.mode === 'scaffolded_vector_store' ? 'in_sync' : status.syncState }, noteAr: 'sync posture أولي.' };
  }

  retrievalContracts() { return { ok: true, contracts: CULTURE_PROGRAMS_RETRIEVAL_CONTRACTS }; }

  async impactPartnerLinkage(params?: { organizationId?: string }) {
    const docCount = await this.prisma.knowledgeDocument.count({ where: this.docWhere(params) });
    return { ok: true, ...summarizeImpactPartnerLinkage({ partners: 0, impactFrameworks: 0, documents: docCount }), partners: 0, impactFrameworks: 0, documents: docCount };
  }

  async readinessLinkage(params?: { organizationId?: string }) {
    const docCount = await this.prisma.knowledgeDocument.count({ where: this.docWhere(params) });
    const score = Math.max(40, Math.min(100, 68 + Math.min(docCount, 8) * 3));
    return { ok: true, readiness: { score, posture: score >= 85 ? 'ready' : score >= 70 ? 'warming_up' : 'needs_work', gatesAr: ['تثبيت مسار الأثر والإرث', 'تحقق من تغطية الشركاء', 'مراجعة اتساق corpus البرامج الثقافية'] } };
  }

  async dashboard(params?: { organizationId?: string }) {
    const summary = await this.summary(params);
    const quality = await this.runQualityCheck({ organizationId: params?.organizationId });
    const vector = await this.vectorStore(params);
    const linkage = await this.impactPartnerLinkage(params);
    const readiness = await this.readinessLinkage(params);
    const recentEvals = await this.prisma.brainEvalRun.findMany({ where: { domain: BRAIN_DOMAIN }, orderBy: { createdAt: 'desc' }, take: 8 });
    const recentLinks = await this.prisma.brainEvidenceLink.findMany({ where: { domain: BRAIN_DOMAIN }, orderBy: { createdAt: 'desc' }, take: 8 });
    return { ok: true, domain: DOMAIN, summary: summary.coverage, quality: quality.quality, vector: vector.status, linkage, readiness: readiness.readiness, recentEvals, recentEvidenceLinks: recentLinks };
  }
}
