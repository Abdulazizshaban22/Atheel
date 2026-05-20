-- ATheel Wave03 foundation migration
-- Curated PostgreSQL migration for the foundational operational domain.

DO $$ BEGIN
  CREATE TYPE "OrgSector" AS ENUM ('government','semi_government','museum','private','developer','ngo');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "ProjectStatus" AS ENUM ('draft','planning','in_progress','paused','completed','archived');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "ContentStatus" AS ENUM ('draft','in_review','approved','published','archived');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "ContentType" AS ENUM ('article','stop_text','audio_script','label','educational','campaign');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "ExperienceType" AS ENUM ('museum','route','event','exhibition','food_culture');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "PlatformRole" AS ENUM ('super_admin','org_admin','project_manager','curator','content_editor','experience_designer','analyst','viewer');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "ApprovalStatus" AS ENUM ('draft','submitted','in_review','approved','rejected','changes_requested','cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "ApprovalEntityType" AS ENUM ('project','content','experience');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "AuditSeverity" AS ENUM ('info','warning','critical');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "displayName" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "passwordHash" TEXT,
  "refreshTokenHash" TEXT,
  "lastLoginAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Organization" (
  "id" TEXT PRIMARY KEY,
  "nameAr" TEXT NOT NULL,
  "nameEn" TEXT,
  "sector" "OrgSector" NOT NULL,
  "city" TEXT,
  "country" TEXT NOT NULL DEFAULT 'SA',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "OrganizationMember" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "role" "PlatformRole" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "OrganizationMember_userId_organizationId_role_key" ON "OrganizationMember"("userId","organizationId","role");
CREATE INDEX IF NOT EXISTS "OrganizationMember_organizationId_role_idx" ON "OrganizationMember"("organizationId","role");
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS "Project" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "nameAr" TEXT NOT NULL,
  "status" "ProjectStatus" NOT NULL DEFAULT 'draft',
  "progressPercent" INTEGER NOT NULL DEFAULT 0,
  "startDate" TIMESTAMP(3),
  "endDate" TIMESTAMP(3),
  "ownerDisplayName" TEXT,
  "budgetEstimate" NUMERIC(14,2),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "Project_organizationId_code_key" ON "Project"("organizationId","code");
CREATE INDEX IF NOT EXISTS "Project_status_idx" ON "Project"("status");
ALTER TABLE "Project" ADD CONSTRAINT "Project_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS "ContentItem" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "projectId" TEXT,
  "title" TEXT NOT NULL,
  "languageCode" TEXT NOT NULL,
  "contentType" "ContentType" NOT NULL,
  "status" "ContentStatus" NOT NULL DEFAULT 'draft',
  "summary" TEXT,
  "versionNo" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "ContentItem_projectId_status_idx" ON "ContentItem"("projectId","status");
CREATE INDEX IF NOT EXISTS "ContentItem_contentType_languageCode_idx" ON "ContentItem"("contentType","languageCode");
ALTER TABLE "ContentItem" ADD CONSTRAINT "ContentItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;
ALTER TABLE "ContentItem" ADD CONSTRAINT "ContentItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS "VisitorExperience" (
  "id" TEXT PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "titleAr" TEXT NOT NULL,
  "experienceType" "ExperienceType" NOT NULL,
  "durationMinutesDefault" INTEGER NOT NULL,
  "publishStatus" TEXT NOT NULL DEFAULT 'draft',
  "targetAudience" TEXT,
  "accessibilityFlags" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "VisitorExperience_projectId_publishStatus_idx" ON "VisitorExperience"("projectId","publishStatus");
CREATE INDEX IF NOT EXISTS "VisitorExperience_experienceType_idx" ON "VisitorExperience"("experienceType");
ALTER TABLE "VisitorExperience" ADD CONSTRAINT "VisitorExperience_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS "Attachment" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "entityType" TEXT,
  "entityId" TEXT,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT,
  "extension" TEXT,
  "sizeBytes" INTEGER NOT NULL,
  "storageProvider" TEXT NOT NULL DEFAULT 'local',
  "storagePath" TEXT NOT NULL,
  "checksumSha256" TEXT,
  "uploadedByUserId" TEXT,
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB
);
CREATE INDEX IF NOT EXISTS "Attachment_organizationId_uploadedAt_idx" ON "Attachment"("organizationId","uploadedAt");
CREATE INDEX IF NOT EXISTS "Attachment_entityType_entityId_idx" ON "Attachment"("entityType","entityId");
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS "ApprovalRequest" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "entityType" "ApprovalEntityType" NOT NULL,
  "entityId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "status" "ApprovalStatus" NOT NULL DEFAULT 'draft',
  "submittedByUserId" TEXT,
  "currentApproverId" TEXT,
  "decisionNote" TEXT,
  "requestedChanges" TEXT,
  "submittedAt" TIMESTAMP(3),
  "decidedAt" TIMESTAMP(3),
  "dueAt" TIMESTAMP(3),
  "payloadSnapshot" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "ApprovalRequest_organizationId_status_idx" ON "ApprovalRequest"("organizationId","status");
CREATE INDEX IF NOT EXISTS "ApprovalRequest_entityType_entityId_idx" ON "ApprovalRequest"("entityType","entityId");
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT,
  "actorUserId" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT,
  "entityId" TEXT,
  "severity" "AuditSeverity" NOT NULL DEFAULT 'info',
  "message" TEXT,
  "before" JSONB,
  "after" JSONB,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "AuditLog_organizationId_createdAt_idx" ON "AuditLog"("organizationId","createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType","entityId");
CREATE INDEX IF NOT EXISTS "AuditLog_severity_idx" ON "AuditLog"("severity");
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL;
