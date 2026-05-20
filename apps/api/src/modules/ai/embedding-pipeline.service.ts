import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@madar/db';
import { hashEmbed } from '@madar/ai-kernel';

/**
 * Wave123: Embedding Pipeline Service
 * Generates and stores embeddings for knowledge chunks
 * Supports: hashEmbed (deterministic fallback) + vLLM (production)
 */
@Injectable()
export class EmbeddingPipelineService {
  private readonly logger = new Logger(EmbeddingPipelineService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate and store embeddings for all chunks of a document
   */
  async embedDocument(documentId: string, options?: { dims?: number; modelName?: string; force?: boolean }) {
    const dims = options?.dims || 256;
    const modelName = options?.modelName || 'hash-embed-v2';

    const chunks = await this.prisma.knowledgeChunk.findMany({
      where: { documentId },
      select: { id: true, text: true },
    });

    if (!chunks.length) return { ok: true, embedded: 0, documentId };

    let embedded = 0;
    let skipped = 0;

    for (const chunk of chunks) {
      // Check if embedding exists and skip if not forced
      if (!options?.force) {
        const existing = await this.prisma.knowledgeChunkEmbedding.findUnique({
          where: { chunkId: chunk.id },
          select: { id: true },
        });
        if (existing) { skipped++; continue; }
      }

      const vector = hashEmbed(chunk.text, dims);

      await this.prisma.knowledgeChunkEmbedding.upsert({
        where: { chunkId: chunk.id },
        update: {
          embeddingJson: vector,
          dims,
          modelName,
          updatedAt: new Date(),
        },
        create: {
          id: `emb_${chunk.id}`,
          documentId,
          chunkId: chunk.id,
          embeddingJson: vector,
          dims,
          modelName,
        },
      });

      embedded++;
    }

    this.logger.log(`Embedded ${embedded} chunks for document ${documentId} (skipped ${skipped})`);
    return { ok: true, embedded, skipped, documentId, dims, modelName };
  }

  /**
   * Embed all un-embedded chunks for a domain
   */
  async embedDomain(domain: string, options?: { dims?: number; batchSize?: number }) {
    const dims = options?.dims || 256;
    const batchSize = options?.batchSize || 50;

    // Find chunks with domain tag that don't have embeddings yet
    const chunks = await this.prisma.knowledgeChunk.findMany({
      where: {
        tags: { has: domain },
        NOT: { id: { in: (await this.prisma.knowledgeChunkEmbedding.findMany({ select: { chunkId: true } })).map(e => e.chunkId) } },
      },
      select: { id: true, documentId: true, text: true },
      take: batchSize,
    });

    let embedded = 0;
    for (const chunk of chunks) {
      const vector = hashEmbed(chunk.text, dims);
      await this.prisma.knowledgeChunkEmbedding.upsert({
        where: { chunkId: chunk.id },
        update: { embeddingJson: vector, dims, modelName: 'hash-embed-v2', updatedAt: new Date() },
        create: { id: `emb_${chunk.id}`, documentId: chunk.documentId, chunkId: chunk.id, embeddingJson: vector, dims, modelName: 'hash-embed-v2' },
      });
      embedded++;
    }

    return { ok: true, domain, embedded, remaining: Math.max(0, chunks.length - embedded) };
  }

  /**
   * Get embedding stats per domain
   */
  async stats() {
    const [totalChunks, totalEmbeddings] = await Promise.all([
      this.prisma.knowledgeChunk.count(),
      this.prisma.knowledgeChunkEmbedding.count(),
    ]);

    return {
      ok: true,
      totalChunks,
      totalEmbeddings,
      coverage: totalChunks > 0 ? Number((totalEmbeddings / totalChunks * 100).toFixed(1)) : 0,
      pgvectorEnabled: Boolean(process.env.RAG_PGVECTOR_ENABLED === 'true'),
    };
  }

  /**
   * Load embeddings as a Map for vector search
   */
  async loadEmbeddingsMap(chunkIds: string[]): Promise<Map<string, number[]>> {
    const embeddings = await this.prisma.knowledgeChunkEmbedding.findMany({
      where: { chunkId: { in: chunkIds } },
      select: { chunkId: true, embeddingJson: true },
    });

    const map = new Map<string, number[]>();
    for (const e of embeddings) {
      if (Array.isArray(e.embeddingJson)) {
        map.set(e.chunkId, e.embeddingJson as number[]);
      }
    }
    return map;
  }
}
