-- Wave11 Approval Packet migration
-- Curated PostgreSQL SQL for approval packets and content-type extension.

DO $$ BEGIN
  ALTER TYPE "ContentType" ADD VALUE IF NOT EXISTS 'presentation';
  ALTER TYPE "ContentType" ADD VALUE IF NOT EXISTS 'strategy';
  ALTER TYPE "ContentType" ADD VALUE IF NOT EXISTS 'feasibility';
  ALTER TYPE "ContentType" ADD VALUE IF NOT EXISTS 'approval_packet';
EXCEPTION WHEN undefined_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "ApprovalPacketStatus" AS ENUM ('draft','submitted','approved','rejected','archived');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "ApprovalPacket" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT,
  "projectId" TEXT,
  "experienceId" TEXT,
  "twinId" TEXT,
  "simulationRunId" TEXT NOT NULL,
  "scenarioKey" TEXT NOT NULL DEFAULT 'baseline',
  "title" TEXT NOT NULL,
  "status" "ApprovalPacketStatus" NOT NULL DEFAULT 'draft',
  "version" INTEGER NOT NULL DEFAULT 1,
  "sectionsJson" TEXT NOT NULL,
  "artifactsJson" TEXT NOT NULL,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "ApprovalPacket_organizationId_projectId_idx" ON "ApprovalPacket"("organizationId", "projectId");
CREATE INDEX IF NOT EXISTS "ApprovalPacket_experienceId_idx" ON "ApprovalPacket"("experienceId");
CREATE INDEX IF NOT EXISTS "ApprovalPacket_twinId_idx" ON "ApprovalPacket"("twinId");
CREATE INDEX IF NOT EXISTS "ApprovalPacket_simulationRunId_idx" ON "ApprovalPacket"("simulationRunId");
