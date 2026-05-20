-- Wave26 Competitions migration
-- Curated PostgreSQL SQL for competitions, requirements, and staffing assignments.

DO $$ BEGIN
  CREATE TYPE "CompetitionStatus" AS ENUM ('draft','analyzing','ready','submitted','archived');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "CompetitionRequirementCategory" AS ENUM ('general_scope','event_architecture','graphic_design','overall_direction','out_of_scope');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "CompetitionDiscipline" AS ENUM ('architecture','graphic','content_experience','visitor_experience','operations','finance','project_management');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "CompetitionRequirementStatus" AS ENUM ('new','triaged','assigned','clarified','done');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "CompetitionAssignmentRole" AS ENUM ('owner','contributor','reviewer');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "Competition" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "projectId" TEXT,
  "titleAr" TEXT NOT NULL,
  "code" TEXT,
  "dueAt" TIMESTAMP(3),
  "status" "CompetitionStatus" NOT NULL DEFAULT 'draft',
  "sourceSignalId" TEXT,
  "metaJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "Competition_organizationId_projectId_status_idx" ON "Competition"("organizationId","projectId","status");
CREATE INDEX IF NOT EXISTS "Competition_dueAt_idx" ON "Competition"("dueAt");
ALTER TABLE "Competition" ADD CONSTRAINT "Competition_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;
ALTER TABLE "Competition" ADD CONSTRAINT "Competition_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS "CompetitionRequirement" (
  "id" TEXT PRIMARY KEY,
  "competitionId" TEXT NOT NULL,
  "category" "CompetitionRequirementCategory" NOT NULL,
  "discipline" "CompetitionDiscipline" NOT NULL,
  "textAr" TEXT NOT NULL,
  "cityOrLocation" TEXT,
  "quantitiesJson" JSONB,
  "constraintsJson" JSONB,
  "inStudioScope" BOOLEAN NOT NULL DEFAULT TRUE,
  "sourceRefJson" JSONB,
  "priority" TEXT NOT NULL DEFAULT 'normal',
  "status" "CompetitionRequirementStatus" NOT NULL DEFAULT 'new',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "CompetitionRequirement_competitionId_category_idx" ON "CompetitionRequirement"("competitionId","category");
CREATE INDEX IF NOT EXISTS "CompetitionRequirement_competitionId_status_idx" ON "CompetitionRequirement"("competitionId","status");
ALTER TABLE "CompetitionRequirement" ADD CONSTRAINT "CompetitionRequirement_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS "CompetitionAssignment" (
  "id" TEXT PRIMARY KEY,
  "requirementId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "CompetitionAssignmentRole" NOT NULL DEFAULT 'contributor',
  "isOwner" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "CompetitionAssignment_requirementId_userId_key" ON "CompetitionAssignment"("requirementId","userId");
CREATE INDEX IF NOT EXISTS "CompetitionAssignment_userId_idx" ON "CompetitionAssignment"("userId");
ALTER TABLE "CompetitionAssignment" ADD CONSTRAINT "CompetitionAssignment_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "CompetitionRequirement"("id") ON DELETE CASCADE;
ALTER TABLE "CompetitionAssignment" ADD CONSTRAINT "CompetitionAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
