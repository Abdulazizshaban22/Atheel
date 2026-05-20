-- Workflow automation bundle (500+ templates runtime persistence)
CREATE TABLE IF NOT EXISTS "WorkflowInstance" (
  "id" TEXT PRIMARY KEY,
  "templateId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "nameAr" TEXT NOT NULL,
  "organizationId" TEXT,
  "projectId" TEXT,
  "status" TEXT NOT NULL,
  "parametersJson" TEXT NOT NULL,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "WorkflowInstance_templateId_idx" ON "WorkflowInstance" ("templateId");
CREATE INDEX IF NOT EXISTS "WorkflowInstance_status_idx" ON "WorkflowInstance" ("status");
CREATE INDEX IF NOT EXISTS "WorkflowInstance_org_proj_idx" ON "WorkflowInstance" ("organizationId", "projectId");

CREATE TABLE IF NOT EXISTS "WorkflowRun" (
  "id" TEXT PRIMARY KEY,
  "instanceId" TEXT,
  "templateId" TEXT NOT NULL,
  "organizationId" TEXT,
  "projectId" TEXT,
  "status" TEXT NOT NULL,
  "totalSteps" INTEGER NOT NULL,
  "estimatedDurationMinutes" INTEGER NOT NULL,
  "aiCallsEstimate" INTEGER NOT NULL,
  "humanCheckpoints" INTEGER NOT NULL,
  "metricsJson" TEXT NOT NULL,
  "traceJson" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "WorkflowRun_templateId_idx" ON "WorkflowRun" ("templateId");
CREATE INDEX IF NOT EXISTS "WorkflowRun_status_idx" ON "WorkflowRun" ("status");
CREATE INDEX IF NOT EXISTS "WorkflowRun_org_proj_idx" ON "WorkflowRun" ("organizationId", "projectId");

CREATE TABLE IF NOT EXISTS "WorkflowPack" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "organizationId" TEXT,
  "projectId" TEXT,
  "selectedTemplateIdsJson" TEXT NOT NULL,
  "manifestJson" TEXT NOT NULL,
  "payloadJson" TEXT NOT NULL,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "WorkflowPack_org_proj_idx" ON "WorkflowPack" ("organizationId", "projectId");
