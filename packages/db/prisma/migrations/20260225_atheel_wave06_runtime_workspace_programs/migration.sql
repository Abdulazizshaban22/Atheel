-- ATheel Wave06 workspace, programs, and workflow execution runtime persistence

ALTER TABLE "PromptTemplate" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "PromptTemplate" ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "PromptTemplate" ADD COLUMN IF NOT EXISTS "modelClass" TEXT;
ALTER TABLE "PromptTemplate" ADD COLUMN IF NOT EXISTS "createdByUserId" TEXT;

CREATE TABLE IF NOT EXISTS "Workspace" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "defaultLanguage" TEXT NOT NULL DEFAULT 'ar',
  "settingsJson" TEXT NOT NULL,
  "aiRoutingPolicy" JSONB,
  "ragPolicy" JSONB,
  "guardrails" JSONB,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "Workspace_org_code_uidx" ON "Workspace" ("organizationId", "code");
CREATE INDEX IF NOT EXISTS "Workspace_org_status_idx" ON "Workspace" ("organizationId", "status");

CREATE TABLE IF NOT EXISTS "Program" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT,
  "code" TEXT NOT NULL,
  "nameAr" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "strategicValueScore" INTEGER NOT NULL DEFAULT 0,
  "readinessScore" INTEGER NOT NULL DEFAULT 0,
  "portfolioValueSar" DOUBLE PRECISION,
  "metadataJson" TEXT NOT NULL,
  "projectIdsJson" TEXT NOT NULL,
  "workflowInstanceIdsJson" TEXT NOT NULL,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "Program_org_code_uidx" ON "Program" ("organizationId", "code");
CREATE INDEX IF NOT EXISTS "Program_org_status_idx" ON "Program" ("organizationId", "status");

CREATE TABLE IF NOT EXISTS "WorkflowExecution" (
  "id" TEXT PRIMARY KEY,
  "workflowRunId" TEXT,
  "instanceId" TEXT,
  "templateId" TEXT NOT NULL,
  "organizationId" TEXT,
  "projectId" TEXT,
  "priority" TEXT NOT NULL DEFAULT 'normal',
  "status" TEXT NOT NULL DEFAULT 'queued',
  "queueScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "currentStepIndex" INTEGER NOT NULL DEFAULT 0,
  "stepsJson" TEXT NOT NULL,
  "inputsJson" TEXT NOT NULL,
  "outputsJson" TEXT NOT NULL,
  "metricsJson" TEXT NOT NULL,
  "slaJson" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3)
);
CREATE INDEX IF NOT EXISTS "WorkflowExecution_status_priority_idx" ON "WorkflowExecution" ("status", "priority");
CREATE INDEX IF NOT EXISTS "WorkflowExecution_org_proj_idx" ON "WorkflowExecution" ("organizationId", "projectId");
CREATE INDEX IF NOT EXISTS "WorkflowExecution_instance_idx" ON "WorkflowExecution" ("instanceId");

CREATE TABLE IF NOT EXISTS "WorkflowExecutionEvent" (
  "id" TEXT PRIMARY KEY,
  "executionId" TEXT NOT NULL,
  "organizationId" TEXT,
  "projectId" TEXT,
  "type" TEXT NOT NULL,
  "stepId" TEXT,
  "messageAr" TEXT NOT NULL,
  "payloadJson" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "WorkflowExecutionEvent_exec_created_idx" ON "WorkflowExecutionEvent" ("executionId", "createdAt");
CREATE INDEX IF NOT EXISTS "WorkflowExecutionEvent_org_proj_idx" ON "WorkflowExecutionEvent" ("organizationId", "projectId");
