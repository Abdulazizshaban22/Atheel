-- Wave58: Reliable internal service dispatch (Service Outbox) + persistent Export Jobs
-- This migration is written for PostgreSQL. If you prefer, you can re-generate via Prisma migrate using this name.

DO $$ BEGIN
  CREATE TYPE "ExportJobStatus" AS ENUM ('queued','running','completed','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ServiceOutboxKind" AS ENUM ('exports_render');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ServiceOutboxStatus" AS ENUM ('pending','processing','dispatched','failed','dead');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "ExportJob" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "approvalPacketId" TEXT NOT NULL,
  "requestedByUserId" TEXT NULL,
  "status" "ExportJobStatus" NOT NULL DEFAULT 'queued',
  "request" JSONB NOT NULL,
  "payloadHash" TEXT NULL,
  "idempotencyKey" TEXT NULL,
  "result" JSONB NULL,
  "warnings" TEXT[] NOT NULL DEFAULT '{}',
  "error" TEXT NULL,
  "correlationId" TEXT NULL,
  "traceparent" TEXT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "ExportJob_idempotencyKey_key" ON "ExportJob" ("idempotencyKey") WHERE "idempotencyKey" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "ExportJob_org_packet_idx" ON "ExportJob" ("organizationId", "approvalPacketId");
CREATE INDEX IF NOT EXISTS "ExportJob_org_status_idx" ON "ExportJob" ("organizationId", "status");
CREATE INDEX IF NOT EXISTS "ExportJob_createdAt_idx" ON "ExportJob" ("createdAt");

ALTER TABLE "ExportJob"
  ADD CONSTRAINT IF NOT EXISTS "ExportJob_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;

ALTER TABLE "ExportJob"
  ADD CONSTRAINT IF NOT EXISTS "ExportJob_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE SET NULL;


CREATE TABLE IF NOT EXISTS "ExportArtifact" (
  "id" TEXT PRIMARY KEY,
  "exportJobId" TEXT NOT NULL,
  "attachmentId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sha256" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "ExportArtifact_exportJobId_name_key" ON "ExportArtifact" ("exportJobId", "name");
CREATE INDEX IF NOT EXISTS "ExportArtifact_exportJobId_idx" ON "ExportArtifact" ("exportJobId");

ALTER TABLE "ExportArtifact"
  ADD CONSTRAINT IF NOT EXISTS "ExportArtifact_exportJobId_fkey" FOREIGN KEY ("exportJobId") REFERENCES "ExportJob"("id") ON DELETE CASCADE;

ALTER TABLE "ExportArtifact"
  ADD CONSTRAINT IF NOT EXISTS "ExportArtifact_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "Attachment"("id") ON DELETE CASCADE;


CREATE TABLE IF NOT EXISTS "ServiceOutboxEvent" (
  "id" TEXT PRIMARY KEY,
  "kind" "ServiceOutboxKind" NOT NULL,
  "status" "ServiceOutboxStatus" NOT NULL DEFAULT 'pending',
  "organizationId" TEXT NULL,
  "aggregateType" TEXT NOT NULL,
  "aggregateId" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "dedupKey" TEXT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMPTZ NULL,
  "lockedAt" TIMESTAMPTZ NULL,
  "lockedBy" TEXT NULL,
  "lastError" TEXT NULL,
  "correlationId" TEXT NULL,
  "traceparent" TEXT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "dispatchedAt" TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS "ServiceOutboxEvent_status_nextAttemptAt_idx" ON "ServiceOutboxEvent" ("status", "nextAttemptAt");
CREATE INDEX IF NOT EXISTS "ServiceOutboxEvent_kind_idx" ON "ServiceOutboxEvent" ("kind");
CREATE INDEX IF NOT EXISTS "ServiceOutboxEvent_agg_idx" ON "ServiceOutboxEvent" ("aggregateType", "aggregateId");
CREATE INDEX IF NOT EXISTS "ServiceOutboxEvent_org_idx" ON "ServiceOutboxEvent" ("organizationId");

ALTER TABLE "ServiceOutboxEvent"
  ADD CONSTRAINT IF NOT EXISTS "ServiceOutboxEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL;

-- Prisma auto-updates updatedAt via @updatedAt; when running raw SQL we keep updatedAt via application writes.
