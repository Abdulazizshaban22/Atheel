-- Wave30 radar change detection and internal notifications migration
-- Curated PostgreSQL SQL for cultural signals, change tracking, and notifications.

CREATE TABLE IF NOT EXISTS "CulturalSignal" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT,
  "projectId" TEXT,
  "titleAr" TEXT NOT NULL,
  "descriptionAr" TEXT,
  "taxonomyCode" TEXT,
  "regionCode" TEXT,
  "status" TEXT NOT NULL DEFAULT 'new',
  "officialPriority" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "communityInterest" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "productionFeasibility" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "lossRisk" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "metaJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "CulturalSignal_organizationId_projectId_status_idx" ON "CulturalSignal"("organizationId","projectId","status");
CREATE INDEX IF NOT EXISTS "CulturalSignal_taxonomyCode_idx" ON "CulturalSignal"("taxonomyCode");
CREATE INDEX IF NOT EXISTS "CulturalSignal_regionCode_idx" ON "CulturalSignal"("regionCode");
CREATE INDEX IF NOT EXISTS "CulturalSignal_score_idx" ON "CulturalSignal"("score");
ALTER TABLE "CulturalSignal" ADD CONSTRAINT "CulturalSignal_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL;
ALTER TABLE "CulturalSignal" ADD CONSTRAINT "CulturalSignal_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS "CulturalSignalEvidence" (
  "id" TEXT PRIMARY KEY,
  "signalId" TEXT NOT NULL,
  "sourceTitle" TEXT NOT NULL,
  "sourceUrl" TEXT,
  "snippetAr" TEXT,
  "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "CulturalSignalEvidence_signalId_createdAt_idx" ON "CulturalSignalEvidence"("signalId","createdAt");
ALTER TABLE "CulturalSignalEvidence" ADD CONSTRAINT "CulturalSignalEvidence_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "CulturalSignal"("id") ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS "CulturalSignalEntityLink" (
  "id" TEXT PRIMARY KEY,
  "signalId" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "relation" TEXT NOT NULL DEFAULT 'related',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "CulturalSignalEntityLink_signalId_idx" ON "CulturalSignalEntityLink"("signalId");
CREATE INDEX IF NOT EXISTS "CulturalSignalEntityLink_entityId_idx" ON "CulturalSignalEntityLink"("entityId");
ALTER TABLE "CulturalSignalEntityLink" ADD CONSTRAINT "CulturalSignalEntityLink_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "CulturalSignal"("id") ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS "CulturalSignalChange" (
  "id" TEXT PRIMARY KEY,
  "signalId" TEXT NOT NULL,
  "changeType" TEXT NOT NULL DEFAULT 'updated',
  "previousHash" TEXT,
  "newHash" TEXT NOT NULL,
  "diffJson" JSONB,
  "actor" TEXT NOT NULL DEFAULT 'radar_worker',
  "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "CulturalSignalChange_signalId_detectedAt_idx" ON "CulturalSignalChange"("signalId","detectedAt");
CREATE INDEX IF NOT EXISTS "CulturalSignalChange_changeType_idx" ON "CulturalSignalChange"("changeType");
ALTER TABLE "CulturalSignalChange" ADD CONSTRAINT "CulturalSignalChange_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "CulturalSignal"("id") ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS "InternalNotification" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT,
  "userId" TEXT,
  "severity" TEXT NOT NULL DEFAULT 'info',
  "titleAr" TEXT NOT NULL,
  "messageAr" TEXT NOT NULL,
  "entityType" TEXT,
  "entityId" TEXT,
  "metaJson" JSONB,
  "isRead" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readAt" TIMESTAMP(3)
);
CREATE INDEX IF NOT EXISTS "InternalNotification_organizationId_userId_isRead_createdAt_idx" ON "InternalNotification"("organizationId","userId","isRead","createdAt");
CREATE INDEX IF NOT EXISTS "InternalNotification_entityType_entityId_idx" ON "InternalNotification"("entityType","entityId");
ALTER TABLE "InternalNotification" ADD CONSTRAINT "InternalNotification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL;
ALTER TABLE "InternalNotification" ADD CONSTRAINT "InternalNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Competition' AND column_name = 'sourceSignalId') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Competition_sourceSignalId_fkey') THEN
      ALTER TABLE "Competition" ADD CONSTRAINT "Competition_sourceSignalId_fkey"
      FOREIGN KEY ("sourceSignalId") REFERENCES "CulturalSignal"("id") ON DELETE SET NULL;
    END IF;
  END IF;
END $$;
