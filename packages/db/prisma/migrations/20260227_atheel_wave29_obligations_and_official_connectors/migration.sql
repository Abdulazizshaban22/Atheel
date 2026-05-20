-- Wave29 obligations migration
-- Curated PostgreSQL SQL for obligations and reminders.

DO $$ BEGIN
  CREATE TYPE "ObligationType" AS ENUM ('compliance','crowd_safety','sustainability','licensing','security','accessibility','insurance','documentation');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "ObligationStatus" AS ENUM ('open','in_progress','done','waived','overdue');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "ObligationReminderChannel" AS ENUM ('in_app','email');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "ObligationReminderStatus" AS ENUM ('pending','sent','cancelled','failed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "Obligation" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "competitionId" TEXT,
  "requirementId" TEXT,
  "obligationKey" TEXT NOT NULL UNIQUE,
  "type" "ObligationType" NOT NULL DEFAULT 'compliance',
  "status" "ObligationStatus" NOT NULL DEFAULT 'open',
  "titleAr" TEXT NOT NULL,
  "descriptionAr" TEXT,
  "ownerUserId" TEXT,
  "dueAt" TIMESTAMP(3),
  "workflowExecutionId" TEXT,
  "metaJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "Obligation_organizationId_status_idx" ON "Obligation"("organizationId","status");
CREATE INDEX IF NOT EXISTS "Obligation_competitionId_status_idx" ON "Obligation"("competitionId","status");
CREATE INDEX IF NOT EXISTS "Obligation_requirementId_idx" ON "Obligation"("requirementId");
CREATE INDEX IF NOT EXISTS "Obligation_type_idx" ON "Obligation"("type");
ALTER TABLE "Obligation" ADD CONSTRAINT "Obligation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;
ALTER TABLE "Obligation" ADD CONSTRAINT "Obligation_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE SET NULL;
ALTER TABLE "Obligation" ADD CONSTRAINT "Obligation_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "CompetitionRequirement"("id") ON DELETE SET NULL;
ALTER TABLE "Obligation" ADD CONSTRAINT "Obligation_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS "ObligationReminder" (
  "id" TEXT PRIMARY KEY,
  "obligationId" TEXT NOT NULL,
  "remindAt" TIMESTAMP(3) NOT NULL,
  "channel" "ObligationReminderChannel" NOT NULL DEFAULT 'in_app',
  "status" "ObligationReminderStatus" NOT NULL DEFAULT 'pending',
  "sentAt" TIMESTAMP(3),
  "errorMessage" TEXT,
  "metaJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "ObligationReminder_obligationId_remindAt_idx" ON "ObligationReminder"("obligationId","remindAt");
CREATE INDEX IF NOT EXISTS "ObligationReminder_status_remindAt_idx" ON "ObligationReminder"("status","remindAt");
ALTER TABLE "ObligationReminder" ADD CONSTRAINT "ObligationReminder_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "Obligation"("id") ON DELETE CASCADE;
