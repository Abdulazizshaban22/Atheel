-- Wave08 Creative Loop migration
-- Curated PostgreSQL SQL for inspiration sources, brainstorming, idea vault, and narrative drafts.

DO $$ BEGIN
  CREATE TYPE "EvidenceKind" AS ENUM ('official_sa','unesco','saudipedia','misk','alula','other');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "InspirationMediaType" AS ENUM ('image','video','pdf','link');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "BrainstormBoardStatus" AS ENUM ('active','archived');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "IdeaVaultState" AS ENUM ('raw','shortlisted','developed','pitch_ready','delivered','archived');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "InspirationSource" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT,
  "nameAr" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "kind" "EvidenceKind" NOT NULL DEFAULT 'other',
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "InspirationSource_organizationId_idx" ON "InspirationSource"("organizationId");
CREATE INDEX IF NOT EXISTS "InspirationSource_kind_idx" ON "InspirationSource"("kind");

CREATE TABLE IF NOT EXISTS "InspirationAsset" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT,
  "projectId" TEXT,
  "sourceId" TEXT,
  "titleAr" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "mediaType" "InspirationMediaType" NOT NULL DEFAULT 'link',
  "regionCode" TEXT,
  "themeCode" TEXT,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "notesAr" TEXT,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "InspirationAsset_organizationId_projectId_idx" ON "InspirationAsset"("organizationId","projectId");
CREATE INDEX IF NOT EXISTS "InspirationAsset_sourceId_idx" ON "InspirationAsset"("sourceId");
CREATE INDEX IF NOT EXISTS "InspirationAsset_mediaType_idx" ON "InspirationAsset"("mediaType");

CREATE TABLE IF NOT EXISTS "BrainstormBoard" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT,
  "projectId" TEXT,
  "titleAr" TEXT NOT NULL,
  "status" "BrainstormBoardStatus" NOT NULL DEFAULT 'active',
  "miroBoardUrl" TEXT,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "BrainstormBoard_organizationId_projectId_idx" ON "BrainstormBoard"("organizationId","projectId");
CREATE INDEX IF NOT EXISTS "BrainstormBoard_status_idx" ON "BrainstormBoard"("status");

CREATE TABLE IF NOT EXISTS "BrainstormNote" (
  "id" TEXT PRIMARY KEY,
  "boardId" TEXT NOT NULL,
  "textAr" TEXT NOT NULL,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "x" DOUBLE PRECISION,
  "y" DOUBLE PRECISION,
  "color" TEXT,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "BrainstormNote_boardId_createdAt_idx" ON "BrainstormNote"("boardId","createdAt");

CREATE TABLE IF NOT EXISTS "BrainstormVoteSession" (
  "id" TEXT PRIMARY KEY,
  "boardId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'open',
  "votesPerUser" INTEGER NOT NULL DEFAULT 5,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt" TIMESTAMP(3)
);
CREATE INDEX IF NOT EXISTS "BrainstormVoteSession_boardId_status_idx" ON "BrainstormVoteSession"("boardId","status");

CREATE TABLE IF NOT EXISTS "BrainstormVote" (
  "id" TEXT PRIMARY KEY,
  "sessionId" TEXT NOT NULL,
  "noteId" TEXT NOT NULL,
  "userId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "BrainstormVote_sessionId_noteId_idx" ON "BrainstormVote"("sessionId","noteId");
CREATE INDEX IF NOT EXISTS "BrainstormVote_sessionId_userId_idx" ON "BrainstormVote"("sessionId","userId");

CREATE TABLE IF NOT EXISTS "IdeaVault" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT,
  "projectId" TEXT,
  "state" "IdeaVaultState" NOT NULL DEFAULT 'raw',
  "domain" TEXT NOT NULL,
  "titleAr" TEXT NOT NULL,
  "oneLinerAr" TEXT NOT NULL,
  "audienceAr" TEXT NOT NULL,
  "regionAr" TEXT,
  "formatAr" TEXT NOT NULL,
  "whyNowAr" TEXT NOT NULL,
  "experienceSketchAr" TEXT NOT NULL,
  "deliverablesAr" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "kpisAr" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "risksAr" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "evidenceMinCount" INTEGER NOT NULL DEFAULT 3,
  "brainstormBoardId" TEXT,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "IdeaVault_organizationId_projectId_state_idx" ON "IdeaVault"("organizationId","projectId","state");

CREATE TABLE IF NOT EXISTS "IdeaEvidence" (
  "id" TEXT PRIMARY KEY,
  "ideaId" TEXT NOT NULL,
  "titleAr" TEXT NOT NULL,
  "url" TEXT,
  "kind" "EvidenceKind" NOT NULL DEFAULT 'other',
  "citationAr" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "IdeaEvidence_ideaId_kind_idx" ON "IdeaEvidence"("ideaId","kind");

CREATE TABLE IF NOT EXISTS "NarrativeDraft" (
  "id" TEXT PRIMARY KEY,
  "ideaId" TEXT NOT NULL UNIQUE,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "loglineAr" TEXT NOT NULL,
  "act1" TEXT NOT NULL,
  "act2" TEXT NOT NULL,
  "act3" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
