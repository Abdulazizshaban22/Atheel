import { Injectable } from '@nestjs/common';
import { PrismaService } from '@madar/db';
import { randomUUID } from 'node:crypto';
import { RunDestinationRetrievalDto } from './dto/run-destination-retrieval.dto';
import { RunDestinationEvalDto } from './dto/run-destination-eval.dto';
import { IngestDestinationCorpusDto } from './dto/ingest-destination-corpus.dto';
import { LinkDestinationEvidenceDto } from './dto/link-destination-evidence.dto';
import { RunDestinationQualityCheckDto } from './dto/run-destination-quality-check.dto';
import { getDestinationVectorStoreStatus } from '../../../../../packages/knowledge-kernel/src/destination/vector-store-manager';
import { DESTINATION_RETRIEVAL_CONTRACTS } from '../../../../../packages/knowledge-kernel/src/destination/retrieval-contracts';
import { summarizeSeasonality } from '../../../../../packages/knowledge-kernel/src/destination/seasonality-linkage';

type DestinationAgent = {
  id: string;
  name: string;
  purposeAr: string;
  riskLevel: 'low' | 'medium' | 'high';
  tools: string[];
};

type DestinationEval = {
  id: string;
  query: string;
  retrievalRecallScore: number;
  groundingScore: number;
  partnerCoverageScore: number;
  programmingScore: number;
  createdAt: string;
};

type DestinationEvidenceLink = {
  id: string;
  destinationId: string;
  documentId: string;
  chunkId?: string;
  linkType: string;
  noteAr?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

const DEFAULT_AGENTS: DestinationAgent[] = [
  {
    id: 'destination_programming_agent',
    name: 'Destination Programming Agent',
    purposeAr: 'اقتراح التوازن البرامجي والموسمي للوجهة وفق الفجوات والزمن والمكان.',
    riskLevel: 'medium',
    tools: ['programs', 'knowledge_search', 'dashboards'],
  },
  {
    id: 'destination_partner_agent',
    name: 'Destination Partner Agent',
    purposeAr: 'تحليل شبكة الشركاء وربطها بالبرامج والاقتصاد المحلي والجاهزية.',
    riskLevel: 'low',
    tools: ['partner_os', 'knowledge_search', 'impact'],
  },
  {
    id: 'destination_demand_agent',
    name: 'Destination Demand Agent',
    purposeAr: 'قراءة الطلب والفرص والفجوات الموضوعية داخل الوجهة أو الموسم.',
    riskLevel: 'medium',
    tools: ['programs', 'analytics', 'knowledge_search'],
  },
];

@Injectable()
export class DestinationBrainService {
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

  summary(params?: { organizationId?: string; city?: string }) {
    const programs = await this.prisma.program.findMany({ where: params?.organizationId ? { organizationId: params.organizationId } : {} });
    const programs = await this.prisma.program.findMany({ where: params?.organizationId ? { organizationId: params.organizationId } : {} });
    const programs = await this.prisma.program.findMany({ where: params?.organizationId ? { organizationId: params.organizationId } : {} });
    const programs = await this.prisma.program.findMany({ where: params?.organizationId ? { organizationId: params.organizationId } : {} });
    const programs = await this.prisma.program.findMany({ where: params?.organizationId ? { organizationId: params.organizationId } : {} });
    const partners = await this.prisma.partnerDirectoryEntry.findMany({ where: params?.organizationId ? { organizationId: params.organizationId } : {} });
    const offers = [] as any[]; // Wave124: TODO add LocalOffer model to Prisma
    const docs = await this.prisma.knowledgeDocument.findMany({ where: { tags: { has: "destination" } } });
    const chunks = await this.prisma.knowledgeChunk.findMany({ where: { tags: { has: "destination" } } });
    const cities = Array.from(new Set(programs.map((x: any /* typed */) => String((x.metadata || {}).city || '')).filter(Boolean)));
    const destinationTypes = Array.from(new Set(programs.map((x: any /* typed */) => String((x.metadata || {}).destinationType || '')).filter(Boolean)));
    const themes = Array.from(new Set(programs.flatMap((x: any /* typed */) => Array.isArray((x.metadata || {}).themes) ? (x.metadata || {}).themes : [])));
    return {
      ok: true,
      domain: 'destination',
      coverage: {
        programs: programs.length,
        activePrograms: programs.filter((x: any /* typed */) => x.status === 'active').length,
        partners: partners.length,
        localOffers: offers.length,
        documents: docs.length,
        chunks: chunks.length,
        cities,
        destinationTypes,
        coveredThemes: themes,
      },
      nextMilestonesAr: [
        'تعميق Destination corpus وربطه لاحقًا بـ vector store حقيقي',
        'إضافة quality and evidence linkage أوضح داخل المجال',
        'توسيع تحليلات partner/programming gaps حسب المدينة والنوع.',
      ],
    };
  }

  agents() { return { ok: true, items: DEFAULT_AGENTS }; }

  ingest(input: IngestDestinationCorpusDto) {
    const now = new Date().toISOString();
    const documentId = `ddoc_${randomUUID().slice(0, 8)}`;
    const chunks = this.chunkText(input.text, 900);
    const tags = Array.from(new Set(['destination', 'programming_ready', ...(input.tags || [])]));
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
        domain: 'destination',
        city: input.metadata?.city,
        destinationType: input.metadata?.destinationType || 'destination',
        seasonWindow: input.metadata?.seasonWindow,
        partnerType: input.metadata?.partnerType,
        audienceSegment: input.metadata?.audienceSegment,
        economicSignal: input.metadata?.economicSignal,
        authorityLevel: input.metadata?.authorityLevel || 'sector',
        ...input.metadata,
      },
    } as any);
    const chunkRows = chunks.map((text, idx) => ({
      id: `dchunk_${randomUUID().slice(0, 8)}`,
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
        domain: 'destination',
        documentTitle: input.title,
        city: input.metadata?.city,
        destinationType: input.metadata?.destinationType || 'destination',
        partnerType: input.metadata?.partnerType,
        audienceSegment: input.metadata?.audienceSegment,
        seasonWindow: input.metadata?.seasonWindow,
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
      noteAr: 'تم إنشاء سجل وثيقة وجهة ومقاطعها داخل Destination corpus foundation. الخطوة التالية: quality checks وربط evidence وvector store فعلي.',
    };
  }

  corpusAdmin(params?: { organizationId?: string }) {
    const docs = await this.prisma.knowledgeDocument.findMany({ where: { tags: { has: "destination" }, ...(params?.organizationId ? { organizationId: params.organizationId } : {}) } });
    const chunks = await this.prisma.knowledgeChunk.findMany({ where: { tags: { has: "destination" }, ...(params?.organizationId ? { organizationId: params.organizationId } : {}) } });
    const byCity: Record<string, number> = {};
    const byType: Record<string, number> = {};
    for (const doc of docs) {
      const city = String((doc.metadata as Record<string, unknown>)?.city || 'unknown');
      const dtype = String((doc.metadata as Record<string, unknown>)?.destinationType || 'unknown');
      byCity[city] = (byCity[city] || 0) + 1;
      byType[dtype] = (byType[dtype] || 0) + 1;
    }
    return {
      ok: true,
      domain: 'destination',
      totals: {
        documents: docs.length,
        chunks: chunks.length,
        evidenceLinks: this.evidenceLinks.length,
      },
      distributions: {
        city: byCity,
        destinationType: byType,
      },
      metadataSchemaAr: ['city', 'destinationType', 'seasonWindow', 'partnerType', 'audienceSegment', 'economicSignal', 'authorityLevel'],
      latestDocuments: docs.slice(0, 12).map((d: any) => ({ id: d.id, title: d.title, chunkCount: d.chunkCount, city: (d.metadata || {}).city || null, destinationType: (d.metadata || {}).destinationType || null, updatedAt: d.updatedAt })),
    };
  }

  retrieve(input: RunDestinationRetrievalDto) {
    const q = String(input.query || '').trim().toLowerCase();
    const tokens = q.split(/\s+/).filter(Boolean);
    const topK = Math.min(Math.max(input.topK || 8, 1), 25);
    const city = input.city ? String(input.city).trim() : null;
    const destinationType = input.destinationType ? String(input.destinationType).trim() : null;
    const rows = (await this.prisma.knowledgeChunk.findMany({ where: { tags: { has: "destination" }, ...(input.organizationId ? { organizationId: input.organizationId } : {}) } }))
      .filter((chunk: any) => {
        if (!(chunk.tags || []).includes('destination')) return false;
        if (input.organizationId && chunk.organizationId && chunk.organizationId !== input.organizationId) return false;
        if (input.languageCode && chunk.languageCode && chunk.languageCode !== input.languageCode) return false;
        if (city && String((chunk.metadata || {}).city || '') !== city) return false;
        if (destinationType && String((chunk.metadata || {}).destinationType || '') !== destinationType) return false;
        return true;
      })
      .map((chunk: any) => {
        const hay = `${chunk.title || ''} ${chunk.text} ${(chunk.tags || []).join(' ')}`.toLowerCase();
        const tokenScore = tokens.reduce((acc: number, t: string) => acc + (hay.includes(t) ? 1 : 0), 0);
        const partnerBoost = (chunk.tags || []).includes('partner') ? 1 : 0;
        const seasonBoost = (chunk.tags || []).includes('season') ? 1 : 0;
        const score = tokenScore + partnerBoost + seasonBoost;
        return {
          chunkId: chunk.id,
          documentId: chunk.documentId,
          title: chunk.title,
          textPreview: String(chunk.text || '').slice(0, 260),
          tags: chunk.tags || [],
          metadata: chunk.metadata || {},
          score,
        };
      })
      .filter((x: any /* typed */) => x.score > 0)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, topK);
    return {
      ok: true,
      strategy: {
        mode: 'destination_domain_routed_search',
        noteAr: 'استرجاع موجّه لمجال الوجهات تمهيدًا لربطه بـ vector store وmetadata filters وreranking خاص بالوجهة.',
      },
      count: rows.length,
      items: rows,
    };
  }

  runEval(input: RunDestinationEvalDto) {
    const retrieval = this.retrieve(input);
    const items = retrieval.items || [];
    const partnerCoverageScore = Math.min(100, items.filter((x: any /* typed */) => (x.tags || []).includes('partner')).length * 25);
    const programmingScore = Math.min(100, items.filter((x: any /* typed */) => (x.tags || []).includes('season') || (x.tags || []).includes('programming')).length * 20);
    const retrievalRecallScore = Math.min(100, items.length * 12);
    const groundingScore = items.length ? Math.min(100, 55 + items.length * 5) : 20;
    const row: DestinationEval = {
      id: `dest_eval_${randomUUID().slice(0,8)}`,
      query: input.query,
      retrievalRecallScore,
      groundingScore,
      partnerCoverageScore,
      programmingScore,
      createdAt: new Date().toISOString(),
    };
    this.evals.unshift(row);
    return { ok: true, eval: row, noteAr: 'تقييم أولي خاص بالوجهة يوازن بين الاسترجاع والتغطية البرمجية والشراكات.' };
  }

  qualityCheck(input?: RunDestinationQualityCheckDto) {
    const docs = await this.prisma.knowledgeDocument.findMany({ where: { tags: { has: "destination" }, ...(input?.organizationId ? { organizationId: input.organizationId } : {}) } });
    const filtered = input?.city ? docs.filter((d: any) => String((d.metadata || {}).city || '') === input.city) : docs;
    const completeness = filtered.length
      ? Math.round(filtered.reduce((acc: number, d: any) => acc + (d.chunkCount > 0 ? 1 : 0) + ((d.metadata || {}).city ? 1 : 0) + ((d.metadata || {}).destinationType ? 1 : 0), 0) / (filtered.length * 3) * 100)
      : 0;
    const partnerCoverage = Math.min(100, filtered.filter((d: any) => (d.tags || []).includes('partner')).length * 20);
    const programmingCoverage = Math.min(100, filtered.filter((d: any) => (d.tags || []).includes('season') || (d.tags || []).includes('programming')).length * 20);
    return {
      ok: true,
      quality: {
        completenessScore: completeness,
        partnerCoverageScore: partnerCoverage,
        programmingCoverageScore: programmingCoverage,
        overallScore: Math.round((completeness + partnerCoverage + programmingCoverage) / 3),
      },
      noteAr: 'فحص جودة أولي لمجال الوجهات يركز على اكتمال metadata، وتغطية الشركاء، وتغطية منطق البرمجة.',
    };
  }

  linkEvidence(input: LinkDestinationEvidenceDto) {
    const row: DestinationEvidenceLink = {
      id: `dev_${randomUUID().slice(0, 8)}`,
      destinationId: input.destinationId,
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
    const posture = summary.coverage.programs >= 2 && summary.coverage.partners >= 1 ? 'expanding' : 'foundation';
    const quality = this.qualityCheck({ organizationId: params?.organizationId });
    return {
      ok: true,
      posture,
      metrics: {
        agents: DEFAULT_AGENTS.length,
        evalRuns: this.evals.length,
        programs: summary.coverage.programs,
        activePrograms: summary.coverage.activePrograms,
        partners: summary.coverage.partners,
        localOffers: summary.coverage.localOffers,
        destinationDocuments: summary.coverage.documents,
        latestGroundingScore: latest?.groundingScore ?? null,
        latestProgrammingScore: latest?.programmingScore ?? null,
        latestPartnerCoverageScore: latest?.partnerCoverageScore ?? null,
        qualityScore: quality.quality.overallScore,
        evidenceLinks: this.evidenceLinks.length,
      },
      quickInsightsAr: [
        summary.coverage.partners === 0 ? 'شبكة الشركاء تحتاج تأسيس أوضح.' : `يوجد ${summary.coverage.partners} شركاء داخل نطاق الوجهة.`,
        summary.coverage.activePrograms === 0 ? 'لا توجد برامج نشطة حاليًا داخل هذا النطاق.' : `يوجد ${summary.coverage.activePrograms} برامج نشطة حاليًا.`,
        quality.quality.overallScore < 60 ? 'جودة corpus تحتاج تحسينًا قبل الاعتماد عليها في توصيات أوسع.' : 'جودة corpus الحالية مناسبة كبداية للتوسع.',
      ],
    };
  }

  vectorStore() {
    return {
      ok: true,
      domain: 'destination',
      status: getDestinationVectorStoreStatus(),
    };
  }

  syncVectorStore(params?: { organizationId?: string; city?: string }) {
    const docs = await this.prisma.knowledgeDocument.findMany({ where: { tags: { has: "destination" }, ...(params?.organizationId ? { organizationId: params.organizationId } : {}) } });
    const chunks = await this.prisma.knowledgeChunk.findMany({ where: { tags: { has: "destination" }, ...(params?.organizationId ? { organizationId: params.organizationId } : {}) } });
    return {
      ok: true,
      domain: 'destination',
      sync: {
        state: docs.length ? 'ready' : 'idle',
        documents: docs.length,
        chunks: chunks.length,
        city: params?.city || null,
      },
      noteAr: 'تم إعداد مزامنة scaffold لمجال الوجهات تمهيدًا لربطه لاحقًا بـ OpenAI Vector Stores أو pgvector.',
    };
  }

  retrievalContracts() {
    return { ok: true, domain: 'destination', contracts: DESTINATION_RETRIEVAL_CONTRACTS };
  }

  readinessLinkage(params?: { organizationId?: string }) {
    const quality = this.qualityCheck({ organizationId: params?.organizationId });
    const linkage = this.partnerProgrammingLinkage({ organizationId: params?.organizationId });
    const ready = quality.quality.overallScore >= 60 && linkage.linkageScore >= 25;
    return {
      ok: true,
      domain: 'destination',
      readiness: {
        score: Math.round((quality.quality.overallScore + Math.min(100, linkage.linkageScore)) / 2),
        posture: ready ? 'expanding' : 'needs_hardening',
        gatesAr: [
          ready ? 'الـ corpus والربط البرامجي مناسبين للتوسع التالي.' : 'الـ corpus أو الربط البرامجي ما زال يحتاج تحسينًا قبل توسع retrieval أعمق.',
          quality.quality.programmingCoverageScore >= 40 ? 'التغطية البرمجية الأساسية موجودة.' : 'تغطية البرمجة الموسمية تحتاج تعزيزًا.',
        ],
      },
    };
  }

    partnerProgrammingLinkage(params?: { organizationId?: string }) {
    const programs = await this.prisma.program.findMany({ where: params?.organizationId ? { organizationId: params.organizationId } : {} });
    const partners = await this.prisma.partnerDirectoryEntry.findMany({ where: params?.organizationId ? { organizationId: params.organizationId } : {} });
    const offers = [] as any[];
    const themes = new Set(programs.flatMap((x: any /* typed */) => Array.isArray((x.metadata || {}).themes) ? (x.metadata || {}).themes : []));
    const capabilityCoverage = new Set(partners.flatMap((x: any /* typed */) => Array.isArray(x.capabilities) ? x.capabilities : []));
    const windows = programs.map((x: any /* typed */) => String((x.metadata || {}).seasonWindow || '')).filter(Boolean);
    const seasonality = summarizeSeasonality(windows);
    const missingThemes = Array.from(themes).filter((t) => !Array.from(capabilityCoverage).some((cap) => String(cap).toLowerCase().includes(String(t).toLowerCase())));
    const linkageScore = Math.min(100, programs.length * 10 + partners.length * 8 + offers.length * 4 + seasonality.seasonalityScore * 0.2);
    return {
      ok: true,
      organizationId: params?.organizationId || null,
      partnerCount: partners.length,
      programCount: programs.length,
      localOfferCount: offers.length,
      coveredThemes: Array.from(themes),
      coveredCapabilities: Array.from(capabilityCoverage),
      missingThemes,
      seasonality,
      linkageScore: Math.round(linkageScore),
      noteAr: 'تحليل مطوّر للفجوة بين themes البرمجية وقدرات الشركاء والعروض المحلية، مع ربط أولي بمنطق الموسمية.',
    };
  }

}
