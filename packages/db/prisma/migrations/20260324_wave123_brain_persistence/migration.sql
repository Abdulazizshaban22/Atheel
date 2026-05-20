-- Wave123: Brain Persistence + Agent Runtime + Indexes
-- This migration adds:
-- 1. BrainEvalRun — persisted eval runs for all 6 domain brains
-- 2. BrainEvidenceLink — persisted evidence links
-- 3. BrainVectorStoreState — persisted vector store state per domain
-- 4. New fields on AiAgent (domain, descriptionAr, status, toolIds, config)
-- 5. New fields on AiAgentEvalRun (query, domain, score, latencyMs, toolsUsed, result)
-- 6. 25+ new indexes across existing models

-- CreateEnum
CREATE TYPE "BrainDomain" AS ENUM ('heritage', 'destination', 'mega_events', 'culture_programs', 'urban_experience', 'exhibition');

-- CreateTable: BrainEvalRun
CREATE TABLE "BrainEvalRun" (
    "id" TEXT NOT NULL,
    "domain" "BrainDomain" NOT NULL,
    "organizationId" TEXT,
    "query" TEXT NOT NULL,
    "retrievalRecallScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "groundingScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "policyScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "domainScores" JSONB,
    "basedOnRetrievalJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BrainEvalRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable: BrainEvidenceLink
CREATE TABLE "BrainEvidenceLink" (
    "id" TEXT NOT NULL,
    "domain" "BrainDomain" NOT NULL,
    "organizationId" TEXT,
    "entityId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "chunkId" TEXT,
    "linkType" TEXT NOT NULL,
    "noteAr" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BrainEvidenceLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable: BrainVectorStoreState
CREATE TABLE "BrainVectorStoreState" (
    "id" TEXT NOT NULL,
    "domain" "BrainDomain" NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'pgvector',
    "status" TEXT NOT NULL DEFAULT 'scaffolded',
    "corpusId" TEXT,
    "fileCount" INTEGER NOT NULL DEFAULT 0,
    "chunkCount" INTEGER NOT NULL DEFAULT 0,
    "lastSyncAt" TIMESTAMP(3),
    "retrievalMode" TEXT NOT NULL DEFAULT 'hybrid_foundation',
    "metadataFilters" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BrainVectorStoreState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: BrainEvalRun
CREATE INDEX "BrainEvalRun_domain_organizationId_idx" ON "BrainEvalRun"("domain", "organizationId");
CREATE INDEX "BrainEvalRun_domain_createdAt_idx" ON "BrainEvalRun"("domain", "createdAt");

-- CreateIndex: BrainEvidenceLink
CREATE INDEX "BrainEvidenceLink_domain_entityId_idx" ON "BrainEvidenceLink"("domain", "entityId");
CREATE INDEX "BrainEvidenceLink_domain_organizationId_idx" ON "BrainEvidenceLink"("domain", "organizationId");
CREATE INDEX "BrainEvidenceLink_documentId_idx" ON "BrainEvidenceLink"("documentId");

-- CreateIndex: BrainVectorStoreState
CREATE UNIQUE INDEX "BrainVectorStoreState_domain_key" ON "BrainVectorStoreState"("domain");
CREATE INDEX "BrainVectorStoreState_domain_status_idx" ON "BrainVectorStoreState"("domain", "status");

-- AlterTable: AiAgent — add new fields
ALTER TABLE "AiAgent" ADD COLUMN IF NOT EXISTS "domain" TEXT DEFAULT 'core';
ALTER TABLE "AiAgent" ADD COLUMN IF NOT EXISTS "descriptionAr" TEXT;
ALTER TABLE "AiAgent" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'active';
ALTER TABLE "AiAgent" ADD COLUMN IF NOT EXISTS "toolIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "AiAgent" ADD COLUMN IF NOT EXISTS "config" JSONB;

-- AlterTable: AiAgentEvalRun — add new fields
ALTER TABLE "AiAgentEvalRun" ADD COLUMN IF NOT EXISTS "query" TEXT DEFAULT '';
ALTER TABLE "AiAgentEvalRun" ADD COLUMN IF NOT EXISTS "domain" TEXT DEFAULT 'core';
ALTER TABLE "AiAgentEvalRun" ADD COLUMN IF NOT EXISTS "score" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "AiAgentEvalRun" ADD COLUMN IF NOT EXISTS "latencyMs" INTEGER DEFAULT 0;
ALTER TABLE "AiAgentEvalRun" ADD COLUMN IF NOT EXISTS "toolsUsed" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "AiAgentEvalRun" ADD COLUMN IF NOT EXISTS "result" JSONB;

-- AddIndex: User
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");
CREATE INDEX IF NOT EXISTS "User_isActive_idx" ON "User"("isActive");

-- AddIndex: Organization
CREATE INDEX IF NOT EXISTS "Organization_sector_idx" ON "Organization"("sector");
CREATE INDEX IF NOT EXISTS "Organization_country_city_idx" ON "Organization"("country", "city");

-- AddIndex: NarrativeDraft
CREATE INDEX IF NOT EXISTS "NarrativeDraft_organizationId_idx" ON "NarrativeDraft"("organizationId");
CREATE INDEX IF NOT EXISTS "NarrativeDraft_projectId_idx" ON "NarrativeDraft"("projectId");

-- AddIndex: NarrativePolicyRuntime
CREATE INDEX IF NOT EXISTS "NarrativePolicyRuntime_organizationId_idx" ON "NarrativePolicyRuntime"("organizationId");
CREATE INDEX IF NOT EXISTS "NarrativePolicyRuntime_projectId_idx" ON "NarrativePolicyRuntime"("projectId");

-- AddIndex: PartnerDirectoryEntry
CREATE INDEX IF NOT EXISTS "PartnerDirectoryEntry_organizationId_idx" ON "PartnerDirectoryEntry"("organizationId");

-- AddIndex: BookingConnector
CREATE INDEX IF NOT EXISTS "BookingConnector_organizationId_idx" ON "BookingConnector"("organizationId");

-- AddIndex: VisitorProfileLite
CREATE INDEX IF NOT EXISTS "VisitorProfileLite_organizationId_idx" ON "VisitorProfileLite"("organizationId");
CREATE INDEX IF NOT EXISTS "VisitorProfileLite_externalRef_idx" ON "VisitorProfileLite"("externalRef");

-- AddIndex: ImpactFramework
CREATE INDEX IF NOT EXISTS "ImpactFramework_organizationId_idx" ON "ImpactFramework"("organizationId");
CREATE INDEX IF NOT EXISTS "ImpactFramework_projectId_idx" ON "ImpactFramework"("projectId");

-- AddIndex: KnowledgeDocument (tags for brain queries)
CREATE INDEX IF NOT EXISTS "KnowledgeDocument_tags_idx" ON "KnowledgeDocument" USING GIN ("tags");

-- AddIndex: KnowledgeChunk (tags for brain queries)
CREATE INDEX IF NOT EXISTS "KnowledgeChunk_tags_idx" ON "KnowledgeChunk" USING GIN ("tags");
