import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '@madar/db';
import { UpsertDomainCorpusDto } from './dto/upsert-domain-corpus.dto';
import { SearchDomainKnowledgeDto } from './dto/search-domain-knowledge.dto';

type DomainCorpus = {
  id: string;
  domain: string;
  titleAr: string;
  titleEn?: string;
  descriptionAr?: string;
  taxonomyVersion: string;
  authorityLevel: 'core' | 'sector' | 'client';
  languages: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

type DomainTaxonomy = {
  domain: string;
  titleAr: string;
  subdomains: string[];
  documentTypes: string[];
  authoritySignals: string[];
};

const DEFAULT_TAXONOMIES: DomainTaxonomy[] = [
  {
    domain: 'heritage',
    titleAr: 'التراث',
    subdomains: ['الأصول التراثية', 'الحفظ والأصالة', 'التفسير وتجربة الزائر', 'إدارة الضغط الزائري'],
    documentTypes: ['لوائح', 'تقارير ترميم', 'أدلة تفسير', 'سياسات تشغيل'],
    authoritySignals: ['official', 'heritage', 'authenticity'],
  },
  {
    domain: 'destination',
    titleAr: 'الوجهات',
    subdomains: ['البرمجة الموسمية', 'الشركاء', 'التقويم', 'الأثر الاقتصادي المحلي'],
    documentTypes: ['خطط مواسم', 'دراسات طلب', 'خرائط شركاء', 'تقارير أداء'],
    authoritySignals: ['destination', 'season', 'partner'],
  },
  {
    domain: 'mega_events',
    titleAr: 'الفعاليات الكبرى',
    subdomains: ['الجاهزية', 'الحشود', 'الموردون', 'التصاريح'],
    documentTypes: ['خطط تشغيل', 'مصفوفات مخاطر', 'سجلات تصاريح', 'runbooks'],
    authoritySignals: ['operations', 'crowd', 'permits'],
  },
  {
    domain: 'exhibition',
    titleAr: 'المعارض والتجارب',
    subdomains: ['المسارات', 'السرد', 'النصوص', 'الأصول الإبداعية'],
    documentTypes: ['نصوص معارض', 'blueprints', 'signage packs', 'boards'],
    authoritySignals: ['narrative', 'experience', 'creative'],
  },
  {
    domain: 'culture_programs',
    titleAr: 'البرامج الثقافية',
    subdomains: ['المبادرات', 'الجمهور', 'الشراكات', 'الإرث'],
    documentTypes: ['program charters', 'evaluation reports', 'journey maps', 'partnership notes'],
    authoritySignals: ['program', 'audience', 'legacy'],
  },
  {
    domain: 'urban_experience',
    titleAr: 'التجربة الحضرية',
    subdomains: ['المسارات الحضرية', 'السلامة', 'السلوك الزائري', 'التوزيع المكاني'],
    documentTypes: ['urban guidelines', 'movement studies', 'activation plans', 'risk studies'],
    authoritySignals: ['urban', 'movement', 'public-realm'],
  },
];

@Injectable()
export class KnowledgeSpineService {
  private readonly corpora = new Map<string, DomainCorpus>();

  constructor(private readonly prisma: PrismaService) {
    this.seedDefaults();
  }

  private seedDefaults() {
    if (this.corpora.size > 0) return;
    const now = new Date().toISOString();
    for (const item of DEFAULT_TAXONOMIES) {
      const id = `corpus_${item.domain}`;
      this.corpora.set(id, {
        id,
        domain: item.domain,
        titleAr: `${item.titleAr} — قاعدة معرفة`,
        descriptionAr: `قاعدة معرفة أولية لمجال ${item.titleAr}`,
        taxonomyVersion: '1.0.0',
        authorityLevel: 'core',
        languages: ['ar', 'en'],
        tags: [item.domain, 'core', 'taxonomy'],
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  summary() {
    const docs = await this.prisma.knowledgeDocument.findMany({});
    const chunks = await this.prisma.knowledgeChunk.findMany({});
    const coverage = DEFAULT_TAXONOMIES.map((domain) => {
      const matchingDocs = docs.filter((d) => (d.tags || []).includes(domain.domain));
      const matchingChunks = chunks.filter((c) => (c.tags || []).includes(domain.domain));
      return {
        domain: domain.domain,
        titleAr: domain.titleAr,
        corpora: Array.from(this.corpora.values()).filter((c) => c.domain === domain.domain).length,
        docs: matchingDocs.length,
        chunks: matchingChunks.length,
        taxonomyVersion: Array.from(this.corpora.values()).find((c) => c.domain === domain.domain)?.taxonomyVersion ?? '1.0.0',
      };
    });

    return {
      ok: true,
      totals: {
        corpora: this.corpora.size,
        documents: docs.length,
        chunks: chunks.length,
      },
      coverage,
    };
  }

  listTaxonomies() {
    return { ok: true, items: DEFAULT_TAXONOMIES };
  }

  listCorpora() {
    return { ok: true, items: Array.from(this.corpora.values()) };
  }

  upsertCorpus(input: UpsertDomainCorpusDto) {
    const existing = Array.from(this.corpora.values()).find((c) => c.domain === input.domain && c.authorityLevel === (input.authorityLevel || 'core'));
    const now = new Date().toISOString();
    const record: DomainCorpus = {
      id: existing?.id ?? `corpus_${input.domain}_${randomUUID().slice(0, 8)}`,
      domain: input.domain,
      titleAr: input.titleAr,
      titleEn: input.titleEn,
      descriptionAr: input.descriptionAr,
      taxonomyVersion: input.taxonomyVersion || existing?.taxonomyVersion || '1.0.0',
      authorityLevel: input.authorityLevel || 'core',
      languages: input.languages?.length ? input.languages : existing?.languages || ['ar', 'en'],
      tags: input.tags?.length ? input.tags : existing?.tags || [input.domain],
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    this.corpora.set(record.id, record);
    return { ok: true, item: record };
  }

  async routeSearch(input: SearchDomainKnowledgeDto) {
    const topK = Math.min(Math.max(input.topK || 8, 1), 25);
    const q = (input.query || '').trim().toLowerCase();
    const qTokens = q.split(/\s+/).filter(Boolean);

    const where: Record<string, unknown> = {};
    if (input.domain) where.tags = { has: input.domain };
    if (input.languageCode) where.languageCode = input.languageCode;
    if (input.projectId) where.projectId = input.projectId;
    if (input.organizationId) where.organizationId = input.organizationId;

    const allChunks = await this.prisma.knowledgeChunk.findMany({
      where,
      select: { id: true, documentId: true, title: true, text: true, tags: true, metadata: true },
    });

    const scored = allChunks
      .map((chunk) => {
        const hay = `${chunk.title || ''} ${chunk.text} ${(chunk.tags || []).join(' ')}`.toLowerCase();
        const score = qTokens.reduce((acc, token) => acc + (hay.includes(token) ? 1 : 0), 0) + ((input.domain && (chunk.tags || []).includes(input.domain)) ? 2 : 0);
        return {
          chunkId: chunk.id,
          documentId: chunk.documentId,
          title: chunk.title,
          textPreview: chunk.text.slice(0, 260),
          tags: chunk.tags,
          metadata: chunk.metadata,
          score,
        };
      })
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return {
      ok: true,
      strategy: {
        mode: 'hybrid_keyword_ready',
        noteAr: 'استرجاع من قاعدة بيانات دائمة. الترقية القادمة: vector search + reranking.',
      },
      query: input,
      count: scored.length,
      items: scored,
    };
  }
}
