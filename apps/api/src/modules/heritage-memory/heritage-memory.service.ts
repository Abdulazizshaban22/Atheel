import { Injectable } from '@nestjs/common';
import { chunkText, estimateTokens } from '@madar/ai-kernel';
import { jaccardSimilarity, createCitationId } from '@madar/innovation-kernel';

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

@Injectable()
export class HeritageMemoryService {
  constructor(private readonly prisma: PrismaService) {}

  status() {
    return {
      sources: await this.prisma.heritageSource.findMany().length,
      knowledgeDocs: await this.prisma.knowledgeDocument.findMany({}).length,
      knowledgeChunks: await this.prisma.knowledgeChunk.findMany({}).length,
    };
  }

  listSources() {
    return { items: await this.prisma.heritageSource.findMany() };
  }

  addSource(input: { organizationId?: string; nameAr: string; url: string; kind?: HeritageSourceRecord['kind']; tags?: string[] }) {
    const now = new Date().toISOString();
    const row: HeritageSourceRecord = {
      id: uid('hs'),
      organizationId: input.organizationId,
      nameAr: input.nameAr,
      url: input.url,
      kind: input.kind || 'other',
      tags: input.tags || [],
      createdAt: now,
      updatedAt: now,
    };
    await this.prisma.heritageSource.create({ data: row);
    return row;
  }

  ingestText(input: { organizationId?: string; projectId?: string; title: string; text: string; sourceUrl?: string; tags?: string[]; languageCode?: 'ar' | 'en' }) {
    const now = new Date().toISOString();
    const docId = uid('kdoc');
    const languageCode = input.languageCode || 'ar';
    const doc: KnowledgeDocumentRecord = {
      id: docId,
      organizationId: input.organizationId,
      projectId: input.projectId,
      title: input.title,
      sourceType: input.sourceUrl ? 'url' : 'manual',
      sourceRef: input.sourceUrl,
      languageCode,
      tags: input.tags || ['heritage_memory'],
      text: input.text,
      chunkCount: 0,
      createdByUserId: 'system',
      createdAt: now,
      updatedAt: now,
    };

    const chunks = chunkText(input.text, { targetChars: 1200, overlapChars: 120 }).map((c, idx) => {
      const ch: KnowledgeChunkRecord = {
        id: uid('kch'),
        documentId: docId,
        organizationId: input.organizationId,
        projectId: input.projectId,
        title: input.title,
        sourceType: doc.sourceType,
        languageCode,
        text: c,
        tags: doc.tags,
        chunkIndex: idx,
        tokenEstimate: estimateTokens(c),
        metadata: {
          citationId: createCitationId({ sourceKind: input.sourceUrl ? 'OFFICIAL_SA' : 'OTHER', seed: input.sourceUrl || input.title }),
          sourceUrl: input.sourceUrl,
        },
        createdAt: now,
      };
      return ch;
    });

    doc.chunkCount = chunks.length;
    await this.prisma.knowledgeChunk.deleteMany({ where: { documentId: doc.id } }); await this.prisma.knowledgeDocument.update({ where: { id: doc.id }, data: { text: doc.text, metadata: doc.metadata, updatedAt: new Date() } });
    return { ok: true, document: doc, chunksAdded: chunks.length };
  }

  query(input: { q: string; topK?: number }) {
    const q = (input.q || '').trim();
    if (!q) return { returned: 0, items: [] };
    const topK = Math.max(1, Math.min(20, input.topK || 6));

    const chunks = await this.prisma.knowledgeChunk.findMany({});
    const scored = chunks
      .map((c) => ({
        chunk: c,
        score: jaccardSimilarity(q, c.text),
      }))
      .filter((x) => x.score > 0.05)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map((x) => ({
        id: x.chunk.id,
        documentId: x.chunk.documentId,
        score: Math.round(x.score * 1000) / 10,
        snippet: x.chunk.text.slice(0, 320),
        citationId: (x.chunk.metadata as any)?.citationId,
        sourceUrl: (x.chunk.metadata as any)?.sourceUrl,
        tags: x.chunk.tags,
      }));

    return { returned: scored.length, items: scored };
  }
}
