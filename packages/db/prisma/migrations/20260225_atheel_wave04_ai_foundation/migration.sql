-- ATheel Wave04 AI foundation migration
-- Curated PostgreSQL migration for AI providers, knowledge, agents, and prompts.

DO $$ BEGIN
  CREATE TYPE "AiProviderKind" AS ENUM ('mock','vllm_openai_compatible');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "KnowledgeSourceType" AS ENUM ('manual','file','url','template');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "AgentRunStatus" AS ENUM ('queued','running','completed','needs_input','failed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "AiProvider" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT,
  "name" TEXT NOT NULL,
  "kind" "AiProviderKind" NOT NULL,
  "baseUrl" TEXT,
  "apiKeyEnvName" TEXT,
  "modelName" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "temperatureDefault" DOUBLE PRECISION,
  "maxTokensDefault" INTEGER,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "AiProvider_organizationId_isActive_idx" ON "AiProvider"("organizationId","isActive");
ALTER TABLE "AiProvider" ADD CONSTRAINT "AiProvider_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS "KnowledgeDocument" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT,
  "projectId" TEXT,
  "title" TEXT NOT NULL,
  "sourceType" "KnowledgeSourceType" NOT NULL,
  "sourceRef" TEXT,
  "languageCode" TEXT NOT NULL DEFAULT 'ar',
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "text" TEXT NOT NULL,
  "chunkCount" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "KnowledgeDocument_organizationId_projectId_idx" ON "KnowledgeDocument"("organizationId","projectId");
CREATE INDEX IF NOT EXISTS "KnowledgeDocument_sourceType_idx" ON "KnowledgeDocument"("sourceType");
ALTER TABLE "KnowledgeDocument" ADD CONSTRAINT "KnowledgeDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL;
ALTER TABLE "KnowledgeDocument" ADD CONSTRAINT "KnowledgeDocument_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL;
ALTER TABLE "KnowledgeDocument" ADD CONSTRAINT "KnowledgeDocument_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS "KnowledgeChunk" (
  "id" TEXT PRIMARY KEY,
  "documentId" TEXT NOT NULL,
  "organizationId" TEXT,
  "projectId" TEXT,
  "title" TEXT,
  "sourceType" "KnowledgeSourceType",
  "languageCode" TEXT,
  "text" TEXT NOT NULL,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "chunkIndex" INTEGER NOT NULL,
  "tokenEstimate" INTEGER,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "KnowledgeChunk_documentId_chunkIndex_idx" ON "KnowledgeChunk"("documentId","chunkIndex");
CREATE INDEX IF NOT EXISTS "KnowledgeChunk_organizationId_projectId_idx" ON "KnowledgeChunk"("organizationId","projectId");
ALTER TABLE "KnowledgeChunk" ADD CONSTRAINT "KnowledgeChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "KnowledgeDocument"("id") ON DELETE CASCADE;
ALTER TABLE "KnowledgeChunk" ADD CONSTRAINT "KnowledgeChunk_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL;
ALTER TABLE "KnowledgeChunk" ADD CONSTRAINT "KnowledgeChunk_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS "AgentRun" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT,
  "projectId" TEXT,
  "objective" TEXT NOT NULL,
  "status" "AgentRunStatus" NOT NULL,
  "steps" JSONB NOT NULL,
  "resultSummary" TEXT,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "AgentRun_organizationId_projectId_status_idx" ON "AgentRun"("organizationId","projectId","status");
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL;
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL;
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS "PromptTemplate" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "templateBody" TEXT NOT NULL,
  "inputSchema" JSONB,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "PromptTemplate_organizationId_code_version_key" ON "PromptTemplate"("organizationId","code","version");
CREATE INDEX IF NOT EXISTS "PromptTemplate_organizationId_isActive_idx" ON "PromptTemplate"("organizationId","isActive");
ALTER TABLE "PromptTemplate" ADD CONSTRAINT "PromptTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL;
