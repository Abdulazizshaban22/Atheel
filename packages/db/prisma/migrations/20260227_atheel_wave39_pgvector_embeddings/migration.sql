-- Wave39: pgvector support for production-grade RAG
-- Idempotent migration (safe to run multiple times)

-- Enable extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add vector column (dimension-less to support multiple embedding sizes)
ALTER TABLE IF EXISTS "KnowledgeChunkEmbedding"
  ADD COLUMN IF NOT EXISTS "embeddingVec" vector;

-- Index for fast cosine similarity (HNSW)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'KnowledgeChunkEmbedding_embeddingVec_hnsw_idx'
  ) THEN
    CREATE INDEX "KnowledgeChunkEmbedding_embeddingVec_hnsw_idx"
      ON "KnowledgeChunkEmbedding" USING hnsw ("embeddingVec" vector_cosine_ops);
  END IF;
END$$;
