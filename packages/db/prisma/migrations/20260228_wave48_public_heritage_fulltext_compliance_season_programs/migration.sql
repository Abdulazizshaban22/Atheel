-- Wave48: Public heritage portal (IIIF + fulltext) + Saudi licensing checklists + season->program automation

-- 1) Extend ApprovalEntityType enum to support programs/seasons/heritage/checklists
DO $$ BEGIN
  ALTER TYPE "ApprovalEntityType" ADD VALUE IF NOT EXISTS 'program';
  ALTER TYPE "ApprovalEntityType" ADD VALUE IF NOT EXISTS 'season';
  ALTER TYPE "ApprovalEntityType" ADD VALUE IF NOT EXISTS 'heritage_asset';
  ALTER TYPE "ApprovalEntityType" ADD VALUE IF NOT EXISTS 'licensing_checklist';
EXCEPTION
  WHEN undefined_object THEN null;
END $$;

-- 2) HeritageAsset: add publish + fulltext + iiif link
ALTER TABLE "HeritageAsset" ADD COLUMN IF NOT EXISTS "publicSlug" TEXT;
ALTER TABLE "HeritageAsset" ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3);
ALTER TABLE "HeritageAsset" ADD COLUMN IF NOT EXISTS "iiifManifestId" TEXT;
ALTER TABLE "HeritageAsset" ADD COLUMN IF NOT EXISTS "fulltextAr" TEXT;

CREATE INDEX IF NOT EXISTS "HeritageAsset_org_status_access_idx" ON "HeritageAsset"("organizationId", "status", "accessLevel");
CREATE INDEX IF NOT EXISTS "HeritageAsset_publicSlug_idx" ON "HeritageAsset"("publicSlug");

-- Full-text index (expression). Use 'simple' config for predictable behavior.
CREATE INDEX IF NOT EXISTS "HeritageAsset_fulltext_gin" ON "HeritageAsset" USING GIN (
  to_tsvector('simple', coalesce("titleAr",'') || ' ' || coalesce("descriptionAr",'') || ' ' || coalesce("fulltextAr",''))
);

-- 3) Compliance checklists for licensing/requirements
CREATE TABLE IF NOT EXISTS "ComplianceChecklist" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "subjectType" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "titleAr" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "authorityKey" TEXT,
  "externalRefUrl" TEXT,
  "metaJson" JSONB,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ComplianceChecklistItem" (
  "id" TEXT PRIMARY KEY,
  "checklistId" TEXT NOT NULL,
  "titleAr" TEXT NOT NULL,
  "descriptionAr" TEXT,
  "required" BOOLEAN NOT NULL DEFAULT TRUE,
  "status" TEXT NOT NULL DEFAULT 'open',
  "severity" TEXT,
  "externalUrl" TEXT,
  "dueAt" TIMESTAMP(3),
  "metaJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "ComplianceChecklist_org_subject_idx" ON "ComplianceChecklist"("organizationId", "subjectType", "subjectId");
CREATE INDEX IF NOT EXISTS "ComplianceChecklist_org_status_idx" ON "ComplianceChecklist"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "ComplianceChecklistItem_checklist_status_idx" ON "ComplianceChecklistItem"("checklistId", "status");

ALTER TABLE "ComplianceChecklist" 
  ADD CONSTRAINT IF NOT EXISTS "ComplianceChecklist_org_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ComplianceChecklistItem"
  ADD CONSTRAINT IF NOT EXISTS "ComplianceChecklistItem_checklist_fkey"
  FOREIGN KEY ("checklistId") REFERENCES "ComplianceChecklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
