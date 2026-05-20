-- Wave83-Wave86 production promotion migration
-- Curated PostgreSQL SQL for agent governance, async jobs, partner directory, connectors, visitor profiles, and impact frameworks.

CREATE TABLE IF NOT EXISTS "AiAgent" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT,
  "name" TEXT NOT NULL,
  "purpose" TEXT,
  "riskLevel" TEXT NOT NULL DEFAULT 'medium',
  "allowedTools" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "allowedDomains" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "requiresHumanReview" BOOLEAN NOT NULL DEFAULT TRUE,
  "outputSchemaName" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "AiAgentEvalRun" (
  "id" TEXT PRIMARY KEY,
  "agentId" TEXT NOT NULL,
  "datasetName" TEXT,
  "samples" INTEGER NOT NULL DEFAULT 0,
  "scores" JSONB,
  "passed" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "AsyncJob" (
  "id" TEXT PRIMARY KEY,
  "kind" TEXT NOT NULL,
  "entityType" TEXT,
  "entityId" TEXT,
  "organizationId" TEXT,
  "projectId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "queueMode" TEXT NOT NULL DEFAULT 'sync',
  "payload" JSONB,
  "result" JSONB,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "AsyncJob_kind_status_idx" ON "AsyncJob"("kind","status");
CREATE INDEX IF NOT EXISTS "AsyncJob_organizationId_projectId_idx" ON "AsyncJob"("organizationId","projectId");

CREATE TABLE IF NOT EXISTS "NarrativePolicyRuntime" (
  "id" TEXT PRIMARY KEY,
  "projectId" TEXT,
  "organizationId" TEXT,
  "tone" TEXT,
  "placeIdentity" TEXT,
  "rules" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "PartnerDirectoryEntry" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT,
  "name" TEXT NOT NULL,
  "kind" TEXT,
  "capabilities" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "contributionAreas" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "BookingConnector" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT,
  "provider" TEXT NOT NULL,
  "baseUrl" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "settings" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "VisitorProfileLite" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT,
  "externalRef" TEXT,
  "profile" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ImpactFramework" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT,
  "projectId" TEXT,
  "name" TEXT NOT NULL,
  "pillars" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
