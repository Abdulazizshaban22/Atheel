/**
 * Wave123: Real Vector Search Engine
 * Supports: lexical | vector | hybrid retrieval strategies
 * Architecture: pgvector-ready with in-process fallback
 */

import { tokenize, normalizeText } from './text';
import type { KnowledgeChunk, RetrievalResult } from './types';

// ── Types ──

export interface EmbeddingVector {
  chunkId: string;
  documentId: string;
  embedding: number[];
  dims: number;
}

export interface VectorSearchOptions {
  query: string;
  queryEmbedding?: number[];
  chunks: KnowledgeChunk[];
  embeddings?: Map<string, number[]>;
  strategy: 'lexical' | 'vector' | 'hybrid';
  topK?: number;
  organizationId?: string;
  projectId?: string;
  domain?: string;
  tags?: string[];
  /** Weight for lexical score in hybrid mode (0..1, default 0.35) */
  lexicalWeight?: number;
  /** Weight for vector score in hybrid mode (0..1, default 0.55) */
  vectorWeight?: number;
  /** Weight for metadata/authority boost (0..1, default 0.10) */
  metadataWeight?: number;
  /** Minimum score threshold to include result */
  minScore?: number;
}

export interface VectorSearchResult {
  chunkId: string;
  documentId: string;
  title: string | null | undefined;
  textPreview: string;
  tags: string[];
  metadata: Record<string, unknown> | null;
  score: number;
  lexicalScore: number;
  vectorScore: number;
  metadataScore: number;
}

// ── Cosine Similarity ──

export function cosineSimilarity(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (!n) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom > 0 ? dot / denom : 0;
}

// ── Deterministic Hash Embedding (fallback when no LLM is available) ──

export function hashEmbed(text: string, dims = 256): number[] {
  const norm = normalizeText(text);
  const tokens = norm.split(/\s+/).filter(Boolean);
  const vec = new Float64Array(dims);

  for (let t = 0; t < tokens.length; t++) {
    const token = tokens[t];
    for (let i = 0; i < token.length; i++) {
      const code = token.charCodeAt(i);
      // Distribute token contributions across dimensions using a hash-like spread
      const bucket = ((code * 31 + i * 17 + t * 7) & 0x7FFFFFFF) % dims;
      vec[bucket] += 1.0 / Math.sqrt(tokens.length);
      // Secondary bucket for richer representation
      const bucket2 = ((code * 53 + i * 23 + t * 13) & 0x7FFFFFFF) % dims;
      vec[bucket2] += 0.5 / Math.sqrt(tokens.length);
    }
  }

  // L2 normalize
  let magnitude = 0;
  for (let i = 0; i < dims; i++) magnitude += vec[i] * vec[i];
  magnitude = Math.sqrt(magnitude) || 1;
  const result = new Array(dims);
  for (let i = 0; i < dims; i++) result[i] = Number((vec[i] / magnitude).toFixed(6));
  return result;
}

// ── Lexical Scoring (with Arabic partial stem matching) ──

function lexicalScore(queryTokens: string[], chunk: KnowledgeChunk): number {
  if (!queryTokens.length) return 0;
  const hay = normalizeText(`${chunk.title || ''} ${chunk.text} ${(chunk.tags || []).join(' ')}`);
  const hayTokens = hay.split(/\s+/).filter(Boolean);
  const haySet = new Set(hayTokens);

  let matchCount = 0;
  for (const qt of queryTokens) {
    // Exact match first
    if (haySet.has(qt)) {
      matchCount += 1;
      continue;
    }
    // Arabic partial/stem match: check if query token is a prefix/substring of any hay token or vice versa
    // This handles التراث matching التراثي, ثقاف matching ثقافية, etc.
    const partialMatch = hayTokens.some((ht) =>
      (ht.length >= 3 && qt.length >= 3) && (ht.startsWith(qt) || qt.startsWith(ht) || ht.includes(qt) || qt.includes(ht)),
    );
    if (partialMatch) matchCount += 0.75;
  }

  const titleTokens = tokenize(chunk.title || '');
  const titleBoost = titleTokens.filter((t) => queryTokens.includes(t)).length * 0.12;

  return Math.min(1, (matchCount / queryTokens.length) + titleBoost);
}

// ── Metadata Authority Scoring ──

function metadataScore(chunk: KnowledgeChunk, domain?: string): number {
  let score = 0;
  const tags = chunk.tags || [];

  // Authority signal boosts
  if (tags.includes('official')) score += 0.3;
  if (tags.includes('authenticity')) score += 0.25;
  if (tags.includes('policy')) score += 0.2;
  if (domain && tags.includes(domain)) score += 0.15;

  // Metadata completeness boost
  const meta = chunk.metadata || {};
  const metaKeys = Object.keys(meta).filter((k) => meta[k] !== null && meta[k] !== undefined);
  score += Math.min(0.1, metaKeys.length * 0.02);

  return Math.min(1, score);
}

// ── Main Vector Search ──

export function vectorSearch(options: VectorSearchOptions): VectorSearchResult[] {
  const {
    query,
    queryEmbedding,
    chunks,
    embeddings,
    strategy,
    topK = 8,
    organizationId,
    projectId,
    domain,
    tags,
    lexicalWeight = 0.35,
    vectorWeight = 0.55,
    metadataWeight = 0.10,
    minScore = 0.01,
  } = options;

  // Guard: empty query returns nothing
  const trimmedQuery = (query || '').trim();
  if (!trimmedQuery && !queryEmbedding) return [];

  const queryTokens = tokenize(query);

  // Pre-compute query embedding for vector/hybrid strategies
  const qEmb = queryEmbedding || (strategy !== 'lexical' ? hashEmbed(query) : undefined);

  // Filter chunks by scope
  const filtered = chunks.filter((c) => {
    if (organizationId && c.organizationId && c.organizationId !== organizationId) return false;
    if (projectId && c.projectId && c.projectId !== projectId) return false;
    if (domain && !(c.tags || []).includes(domain)) return false;
    if (tags?.length && !tags.every((t) => (c.tags || []).includes(t))) return false;
    return true;
  });

  // Score each chunk
  const scored: VectorSearchResult[] = filtered.map((chunk) => {
    const ls = strategy !== 'vector' ? lexicalScore(queryTokens, chunk) : 0;

    let vs = 0;
    if (strategy !== 'lexical' && qEmb) {
      const chunkEmb = embeddings?.get(chunk.id) || hashEmbed(chunk.text);
      vs = cosineSimilarity(qEmb, chunkEmb);
    }

    const ms = metadataScore(chunk, domain);

    let finalScore: number;
    if (strategy === 'lexical') {
      finalScore = ls * 0.85 + ms * 0.15;
    } else if (strategy === 'vector') {
      finalScore = vs * 0.85 + ms * 0.15;
    } else {
      // hybrid
      finalScore = ls * lexicalWeight + vs * vectorWeight + ms * metadataWeight;
    }

    return {
      chunkId: chunk.id,
      documentId: chunk.documentId,
      title: chunk.title,
      textPreview: chunk.text.slice(0, 300),
      tags: chunk.tags || [],
      metadata: (chunk.metadata as Record<string, unknown>) || null,
      score: Number(finalScore.toFixed(4)),
      lexicalScore: Number(ls.toFixed(4)),
      vectorScore: Number(vs.toFixed(4)),
      metadataScore: Number(ms.toFixed(4)),
    };
  });

  return scored
    .filter((r) => r.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, topK));
}

// ── Reciprocal Rank Fusion (for combining multiple retrieval strategies) ──

export function reciprocalRankFusion(
  rankings: VectorSearchResult[][],
  k = 60,
  topK = 10,
): VectorSearchResult[] {
  const scores = new Map<string, { score: number; item: VectorSearchResult }>();

  for (const ranking of rankings) {
    for (let rank = 0; rank < ranking.length; rank++) {
      const item = ranking[rank];
      const rrf = 1 / (k + rank + 1);
      const existing = scores.get(item.chunkId);
      if (existing) {
        existing.score += rrf;
      } else {
        scores.set(item.chunkId, { score: rrf, item });
      }
    }
  }

  return Array.from(scores.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(({ score, item }) => ({ ...item, score: Number(score.toFixed(4)) }));
}
