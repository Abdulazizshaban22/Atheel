-- Wave13 Innovation Engine migration
-- Curated PostgreSQL SQL for inspiration boards, narratives, risk, guides, templates, and documentation checks.

DO $$ BEGIN
  CREATE TYPE "InspirationBoardVisibility" AS ENUM ('private','org','public');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "RiskCategory" AS ENUM ('safety','heritage','operations','reputation','compliance');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "RiskLevel" AS ENUM ('low','medium','high');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "RiskStatus" AS ENUM ('open','mitigating','closed');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "NarrativeVariant" AS ENUM ('A','B','single');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "VisitorPersona" AS ENUM ('family','student','tourist','expert');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "DocCheckStatus" AS ENUM ('pass','needs_fix');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "HeritageSourceKind" AS ENUM ('official_sa','unesco','saudipedia','other');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "InspirationBoard" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT,
  "projectId" TEXT,
  "titleAr" TEXT NOT NULL,
  "descriptionAr" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "visibility" "InspirationBoardVisibility" NOT NULL DEFAULT 'org',
  "ownerUserId" TEXT,
  "editorUserIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "viewerUserIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "InspirationBoard_organizationId_idx" ON "InspirationBoard"("organizationId");
CREATE INDEX IF NOT EXISTS "InspirationBoard_projectId_idx" ON "InspirationBoard"("projectId");

CREATE TABLE IF NOT EXISTS "InspirationBoardItem" (
  "id" TEXT PRIMARY KEY,
  "boardId" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "noteAr" TEXT,
  "orderIndex" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "InspirationBoardItem_boardId_orderIndex_idx" ON "InspirationBoardItem"("boardId","orderIndex");
ALTER TABLE "InspirationBoardItem" ADD CONSTRAINT "InspirationBoardItem_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "InspirationBoard"("id") ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS "NarrativeInstance" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT,
  "projectId" TEXT,
  "ideaId" TEXT,
  "experienceId" TEXT,
  "twinId" TEXT,
  "variant" "NarrativeVariant" NOT NULL DEFAULT 'single',
  "titleAr" TEXT NOT NULL,
  "loglineAr" TEXT NOT NULL,
  "beatsJson" TEXT NOT NULL,
  "citationsJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "NarrativeInstance_ideaId_idx" ON "NarrativeInstance"("ideaId");
CREATE INDEX IF NOT EXISTS "NarrativeInstance_experienceId_idx" ON "NarrativeInstance"("experienceId");
CREATE INDEX IF NOT EXISTS "NarrativeInstance_twinId_idx" ON "NarrativeInstance"("twinId");

CREATE TABLE IF NOT EXISTS "ImpactSnapshot" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT,
  "projectId" TEXT,
  "experienceId" TEXT,
  "twinId" TEXT,
  "simulationRunId" TEXT,
  "narrativeId" TEXT,
  "score0to100" DOUBLE PRECISION NOT NULL,
  "breakdownJson" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "ImpactSnapshot_experienceId_idx" ON "ImpactSnapshot"("experienceId");
CREATE INDEX IF NOT EXISTS "ImpactSnapshot_twinId_idx" ON "ImpactSnapshot"("twinId");

CREATE TABLE IF NOT EXISTS "Risk" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT,
  "projectId" TEXT,
  "experienceId" TEXT,
  "twinId" TEXT,
  "category" "RiskCategory" NOT NULL,
  "titleAr" TEXT NOT NULL,
  "descriptionAr" TEXT,
  "likelihood1to5" INTEGER NOT NULL,
  "impact1to5" INTEGER NOT NULL,
  "score" DOUBLE PRECISION NOT NULL,
  "level" "RiskLevel" NOT NULL,
  "mitigationAr" TEXT,
  "ownerAr" TEXT,
  "status" "RiskStatus" NOT NULL DEFAULT 'open',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "Risk_projectId_idx" ON "Risk"("projectId");
CREATE INDEX IF NOT EXISTS "Risk_experienceId_idx" ON "Risk"("experienceId");
CREATE INDEX IF NOT EXISTS "Risk_twinId_idx" ON "Risk"("twinId");
CREATE INDEX IF NOT EXISTS "Risk_level_idx" ON "Risk"("level");

CREATE TABLE IF NOT EXISTS "VisitorGuide" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT,
  "projectId" TEXT,
  "experienceId" TEXT NOT NULL,
  "twinId" TEXT,
  "persona" "VisitorPersona" NOT NULL,
  "languageCode" TEXT NOT NULL DEFAULT 'ar',
  "contentItemIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "summaryAr" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "VisitorGuide_experienceId_idx" ON "VisitorGuide"("experienceId");

CREATE TABLE IF NOT EXISTS "HeritageSource" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT,
  "nameAr" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "kind" "HeritageSourceKind" NOT NULL,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "HeritageSource_organizationId_idx" ON "HeritageSource"("organizationId");
CREATE INDEX IF NOT EXISTS "HeritageSource_kind_idx" ON "HeritageSource"("kind");

CREATE TABLE IF NOT EXISTS "ProgramTemplate" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT,
  "code" TEXT NOT NULL,
  "nameAr" TEXT NOT NULL,
  "domain" TEXT NOT NULL,
  "manifestJson" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "ProgramTemplate_organizationId_idx" ON "ProgramTemplate"("organizationId");
CREATE INDEX IF NOT EXISTS "ProgramTemplate_domain_idx" ON "ProgramTemplate"("domain");

CREATE TABLE IF NOT EXISTS "DocumentationCheck" (
  "id" TEXT PRIMARY KEY,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "status" "DocCheckStatus" NOT NULL,
  "issuesJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "DocumentationCheck_entityType_entityId_idx" ON "DocumentationCheck"("entityType","entityId");
