import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@madar/db';
import { AiService } from '../ai/ai.service';
import { CULTURE_THEMES, SAUDI_REGIONS, MOC_CULTURAL_SECTORS } from '@madar/culture-sa-kernel';
import { extractResearchInsightHeuristic } from '@madar/engines-kernel';

function norm(s?: any) {
  return String(s ?? '').trim();
}

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function extractKeywordsHeuristic(text: string) {
  const out: string[] = [];
  const lower = text;

  // Theme keywords
  for (const t of CULTURE_THEMES) {
    for (const k of t.keywordsAr || []) {
      if (k && lower.includes(k)) out.push(k);
    }
  }

  // MoC sector keywords
  for (const s of MOC_CULTURAL_SECTORS) {
    for (const k of s.keywords || []) {
      if (k && lower.toLowerCase().includes(String(k).toLowerCase())) out.push(k);
    }
  }
  // Region hubs
  for (const r of SAUDI_REGIONS) {
    for (const h of r.hubs || []) {
      if (h && lower.includes(h)) out.push(h);
    }
  }

  // Generic Arabic term extraction (simple)
  const tokens = text
    .replace(/[\u064B-\u0652]/g, '')
    .split(/\s+/g)
    .map((t) => t.replace(/[\W_]+/g, '').trim())
    .filter((t) => t.length >= 4 && t.length <= 18);

  for (const t of tokens.slice(0, 80)) out.push(t);

  return uniq(out).slice(0, 40);
}

async function fetchUrlText(url: string, timeoutMs = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: ctrl.signal,
      headers: {
        // Some academic portals return different content for crawlers; we keep it simple and browser-like.
        'user-agent': 'Mozilla/5.0 (ATheel Research Importer)',
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    } as any);
    const text = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return text;
  } finally {
    clearTimeout(t);
  }
}

function pickMeta(html: string, name: string) {
  const re = new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i');
  const m = re.exec(html);
  return m ? String(m[1]).trim() : '';
}

function stripHtml(html: string) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

@Injectable()
export class ResearchService {
  constructor(private readonly prisma: PrismaService, private readonly ai: AiService) {}

  async listDocuments(params: { organizationId?: string; projectId?: string; q?: string }) {
    const q = norm(params.q);
    const where: any = {
      ...(params.organizationId ? { organizationId: params.organizationId } : {}),
      ...(params.projectId ? { projectId: params.projectId } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: 'insensitive' } },
              { university: { contains: q, mode: 'insensitive' } },
              { authors: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const items = await (this.prisma as Record<string, unknown>).researchDocument
      .findMany({ where, orderBy: { updatedAt: 'desc' }, include: { entityLinks: true } })
      .catch(() => []);
    return { count: items.length, items };
  }

  async createDocument(body: any) {
    const title = norm(body.title);
    if (!title) throw new BadRequestException('title is required');
    const row = await (this.prisma as Record<string, unknown>).researchDocument.create({
      data: {
        organizationId: body.organizationId || null,
        projectId: body.projectId || null,
        title,
        university: body.university || null,
        degree: body.degree || null,
        year: body.year ? Number(body.year) : null,
        authors: body.authors || null,
        sourceUrl: body.sourceUrl || null,
        attachmentId: body.attachmentId || null,
        abstractAr: body.abstractAr || null,
        fullTextAr: body.fullTextAr || null,
        metaJson: body.metaJson || null,
      },
    });
    return { ok: true, document: row };
  }

  async importFromUrl(body: any) {
    const url = norm(body.url || body.sourceUrl);
    if (!url) throw new BadRequestException('url is required');

    const html = await fetchUrlText(url).catch(() => '');
    if (!html) throw new BadRequestException('تعذر جلب الرابط (تحقق من الاتصال/الصلاحيات)');

    // DSpace / Academic common meta tags
    const dcTitle = pickMeta(html, 'DC.title') || pickMeta(html, 'citation_title') || pickMeta(html, 'og:title');
    const dcAuthor = pickMeta(html, 'DC.contributor.author') || pickMeta(html, 'citation_author');
    const dcYear = pickMeta(html, 'DCTERMS.issued') || pickMeta(html, 'DC.date.issued') || pickMeta(html, 'citation_publication_date');
    const dcAbstract = pickMeta(html, 'DCTERMS.abstract') || pickMeta(html, 'DC.description') || pickMeta(html, 'description') || pickMeta(html, 'og:description');

    const title = norm(body.title || dcTitle) || `بحث مستورد: ${url}`;
    const authors = norm(body.authors || dcAuthor) || null;

    const yearGuess = (() => {
      const y = String(body.year || dcYear || '').match(/(19\d{2}|20\d{2})/);
      return y ? Number(y[1]) : null;
    })();

    // Best-effort: include a small text snapshot for downstream extraction
    const textSnapshot = stripHtml(html).slice(0, 12000);

    const row = await (this.prisma as Record<string, unknown>).researchDocument.create({
      data: {
        organizationId: body.organizationId || null,
        projectId: body.projectId || null,
        title,
        university: body.university || null,
        degree: body.degree || null,
        year: yearGuess,
        authors,
        sourceUrl: url,
        attachmentId: null,
        abstractAr: body.abstractAr || (dcAbstract ? String(dcAbstract).slice(0, 4000) : null),
        fullTextAr: body.fullTextAr || (body.storeSnapshot ? textSnapshot : null),
        metaJson: { importedAt: new Date().toISOString(), source: 'url', meta: { dcTitle, dcAuthor, dcYear } },
      },
    });

    // Optional: auto-extract entities
    if (body.autoExtract) {
      await this.extractAndLink(row.id, { mode: body.extractMode || 'heuristic' }).catch(() => void 0);
    }
    // Optional: auto-ingest to Knowledge base
    if (body.autoIngestKnowledge) {
      const txt = String(row.fullTextAr || row.abstractAr || '').trim();
      if (txt) {
        await this.ai.ingestKnowledge(
          {
            organizationId: row.organizationId || undefined,
            projectId: row.projectId || undefined,
            title: row.title,
            text: txt,
            sourceType: 'research',
            sourceRef: row.sourceUrl || row.id,
            languageCode: 'ar',
            tags: ['research', 'sa', 'imported'],
            chunkSizeChars: 1200,
            overlapChars: 150,
          } as any,
          undefined,
        );
      }
    }

    return { ok: true, document: row };
  }



  async generateInsight(documentId: string, body: any) {
    const doc = await (this.prisma as Record<string, unknown>).researchDocument.findUnique({ where: { id: documentId } }).catch(() => null);
    if (!doc) throw new NotFoundException('Research document not found');

    const insight = extractResearchInsightHeuristic({ title: doc.title, abstractAr: doc.abstractAr, fullTextAr: doc.fullTextAr });

    const updated = await (this.prisma as Record<string, unknown>).researchDocument.update({
      where: { id: documentId },
      data: { metaJson: { ...(doc.metaJson || {}), insight } },
    }).catch(() => null);

    // Optional: ingest insight into knowledge base
    if (body?.autoIngestKnowledge !== false) {
      const txt = `بحث: ${doc.title}

ملخص تشغيلي:
${insight.summaryAr}

نتائج:
- ${insight.keyFindingsAr.join('\n- ')}

دلالات تصميم:
- ${insight.designImplicationsAr.join('\n- ')}

أفكار قياس:
- ${insight.measurementIdeasAr.join('\n- ')}`;
      await this.ai.ingestKnowledge(
        {
          organizationId: doc.organizationId || undefined,
          projectId: doc.projectId || undefined,
          title: `Insight: ${doc.title}`,
          text: txt,
          sourceType: 'research_insight',
          sourceRef: doc.sourceUrl || doc.id,
          languageCode: 'ar',
          tags: ['research', 'insight', 'ksa'],
          chunkSizeChars: 1100,
          overlapChars: 140,
        } as any,
        undefined,
      ).catch(() => void 0);
    }

    return { ok: true, documentId, insight, updated };
  }
  async getDocument(id: string) {
    const row = await (this.prisma as Record<string, unknown>).researchDocument
      .findUnique({ where: { id }, include: { entityLinks: true, runs: { orderBy: { createdAt: 'desc' }, take: 10 } } })
      .catch(() => null);
    if (!row) throw new NotFoundException('Research document not found');
    return { ok: true, document: row };
  }

  async extractAndLink(documentId: string, body: any) {
    const doc = await (this.prisma as Record<string, unknown>).researchDocument.findUnique({ where: { id: documentId } });
    if (!doc) throw new NotFoundException('Research document not found');

    const text = String(doc.fullTextAr || doc.abstractAr || '').trim();
    if (!text) throw new BadRequestException('أضف abstractAr أو fullTextAr أولاً');

    const run = await (this.prisma as Record<string, unknown>).researchExtractionRun.create({
      data: {
        documentId,
        status: 'running',
        startedAt: new Date(),
      },
    });

    const mode = body.mode || 'heuristic';
    let extracted: Array<{ nameAr: string; entityType?: string; confidence?: number; snippetAr?: string }> = [];

    if (mode === 'ai') {
      const prompt = `استخرج كيانات ثقافية سعودية من هذا النص الأكاديمي. أعد JSON فقط كمصفوفة عناصر: {"nameAr":"...","entityType":"place|person|practice|artifact|event|food|coffee|craft|source","confidence":0..1,"snippetAr":"..."}.\n\nالنص:\n${text.slice(0, 5500)}`;
      const llm = await this.ai.chat({
        organizationId: doc.organizationId || undefined,
        messages: [
          { role: 'system', content: 'أنت مستخرج كيانات بحثية. أعد JSON فقط.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        maxTokens: 900,
      } as any);
      try {
        const json = JSON.parse(String((llm as Record<string, unknown>).output || '').trim());
        if (Array.isArray(json)) extracted = json;
      } catch {
        // ignore
      }
    }

    if (!extracted.length) {
      const terms = extractKeywordsHeuristic(text);
      extracted = terms.map((t) => ({ nameAr: t, entityType: 'concept', confidence: 0.55, snippetAr: t }));
    }

    let linked = 0;
    for (const item of extracted.slice(0, 30)) {
      const nameAr = norm(item.nameAr);
      if (!nameAr) continue;
      const entityType = norm(item.entityType) || 'concept';

      let entity = await (this.prisma as Record<string, unknown>).culturalEntity
        .findFirst({ where: { organizationId: doc.organizationId || undefined, canonicalNameAr: nameAr, entityType } })
        .catch(() => null);

      if (!entity) {
        entity = await (this.prisma as Record<string, unknown>).culturalEntity
          .create({
            data: {
              organizationId: doc.organizationId || null,
              projectId: doc.projectId || null,
              entityType,
              canonicalNameAr: nameAr,
              canonicalNameEn: null,
              descriptionAr: null,
              descriptionEn: null,
              cidocClass: null,
              externalRefs: { researchDocumentId: doc.id },
              tags: ['research', 'academic'],
              createdByUserId: null,
            },
          })
          .catch(() => null);
      }
      if (!entity) continue;

      await (this.prisma as Record<string, unknown>).researchEntityLink
        .create({
          data: {
            documentId: doc.id,
            entityId: entity.id,
            snippetAr: item.snippetAr || null,
            confidence: Math.max(0, Math.min(1, Number(item.confidence ?? 0.6))),
          },
        })
        .catch(() => void 0);
      linked += 1;

      await (this.prisma as Record<string, unknown>).culturalProvenance
        .create({
          data: {
            organizationId: doc.organizationId || null,
            projectId: doc.projectId || null,
            entityId: entity.id,
            sourceTitle: `بحث: ${doc.title}`,
            sourceUrl: doc.sourceUrl || null,
            citationAr: doc.university ? `${doc.university}${doc.year ? `، ${doc.year}` : ''}` : (doc.year ? `سنة ${doc.year}` : null),
            capturedAt: new Date(),
            capturedByUserId: null,
          },
        })
        .catch(() => void 0);
    }

    await (this.prisma as Record<string, unknown>).researchExtractionRun.update({ where: { id: run.id }, data: { status: 'completed', finishedAt: new Date(), notes: `linked=${linked}` } }).catch(() => void 0);
    return { ok: true, runId: run.id, linked, extractedCount: extracted.length };
  }

  async buildGraph(documentId: string) {
    const doc = await (this.prisma as Record<string, unknown>).researchDocument
      .findUnique({ where: { id: documentId }, include: { entityLinks: true } })
      .catch(() => null);
    if (!doc) throw new NotFoundException('Research document not found');
    const ids = uniq((doc.entityLinks || []).map((l: any) => l.entityId));
    const entities = ids.length ? await (this.prisma as Record<string, unknown>).culturalEntity.findMany({ where: { id: { in: ids } } }).catch(() => []) : [];

    const nodes: any[] = [];
    const edges: any[] = [];
    nodes.push({ id: `doc:${doc.id}`, type: 'default', position: { x: 0, y: 0 }, data: { label: `🎓 ${doc.title}` } });
    entities.slice(0, 25).forEach((e: any, idx: number) => {
      const nid = `entity:${e.id}`;
      nodes.push({ id: nid, type: 'default', position: { x: 340, y: 90 + idx * 70 }, data: { label: `🔖 ${e.canonicalNameAr}` } });
      edges.push({ id: `e_doc_${e.id}`, source: `doc:${doc.id}`, target: nid, type: 'smoothstep' });
    });
    return { ok: true, documentId: doc.id, nodes, edges };
  }
}
