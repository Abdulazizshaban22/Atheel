-- Wave45: Approvals Auto-Routing (Skill Matrix + Workload) + Ops Settings + SLO burn-rate + Incident/Dedup fields
-- Idempotent migration (safe to run multiple times)

-- 1) OutboxMessage: add incident/dedup fields
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='OutboxMessage') THEN
    ALTER TABLE "OutboxMessage" ADD COLUMN IF NOT EXISTS "dedupKey" text;
    ALTER TABLE "OutboxMessage" ADD COLUMN IF NOT EXISTS "incidentKey" text;
    ALTER TABLE "OutboxMessage" ADD COLUMN IF NOT EXISTS "groupCount" integer NOT NULL DEFAULT 1;
    ALTER TABLE "OutboxMessage" ADD COLUMN IF NOT EXISTS "suppressedUntil" timestamptz;
    ALTER TABLE "OutboxMessage" ADD COLUMN IF NOT EXISTS "lastEmittedAt" timestamptz;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS "OutboxMessage_dedupKey_created_idx" ON "OutboxMessage" ("dedupKey", "createdAt");
CREATE INDEX IF NOT EXISTS "OutboxMessage_incidentKey_created_idx" ON "OutboxMessage" ("incidentKey", "createdAt");

-- 2) OpsSettings
CREATE TABLE IF NOT EXISTS "OpsSettings" (
  "id" text PRIMARY KEY,
  "organizationId" text NOT NULL,
  "quietHoursStart" text NULL,
  "quietHoursEnd" text NULL,
  "quietHoursTz" text NOT NULL DEFAULT 'Asia/Riyadh',
  "outboxDedupWindowMinutes" integer NOT NULL DEFAULT 30,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='OpsSettings_organizationId_key') THEN
    ALTER TABLE "OpsSettings" ADD CONSTRAINT "OpsSettings_organizationId_key" UNIQUE ("organizationId");
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='OpsSettings_organizationId_fkey') THEN
    ALTER TABLE "OpsSettings"
      ADD CONSTRAINT "OpsSettings_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN undefined_table THEN
END$$;

-- 3) ApprovalReviewerSkill
CREATE TABLE IF NOT EXISTS "ApprovalReviewerSkill" (
  "id" text PRIMARY KEY,
  "organizationId" text NOT NULL,
  "userId" text NOT NULL,
  "dimension" text NOT NULL,
  "score" double precision NOT NULL DEFAULT 0,
  "evidenceCount" integer NOT NULL DEFAULT 0,
  "lastUpdatedAt" timestamptz NOT NULL DEFAULT now(),
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ApprovalReviewerSkill_org_user_dim_key') THEN
    ALTER TABLE "ApprovalReviewerSkill" ADD CONSTRAINT "ApprovalReviewerSkill_org_user_dim_key" UNIQUE ("organizationId","userId","dimension");
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS "ApprovalReviewerSkill_org_user_idx" ON "ApprovalReviewerSkill" ("organizationId","userId");
CREATE INDEX IF NOT EXISTS "ApprovalReviewerSkill_org_dim_idx" ON "ApprovalReviewerSkill" ("organizationId","dimension");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ApprovalReviewerSkill_organizationId_fkey') THEN
    ALTER TABLE "ApprovalReviewerSkill"
      ADD CONSTRAINT "ApprovalReviewerSkill_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN undefined_table THEN
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ApprovalReviewerSkill_userId_fkey') THEN
    ALTER TABLE "ApprovalReviewerSkill"
      ADD CONSTRAINT "ApprovalReviewerSkill_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN undefined_table THEN
END$$;

-- 4) SLO tables
CREATE TABLE IF NOT EXISTS "SloPolicy" (
  "id" text PRIMARY KEY,
  "organizationId" text NULL,
  "name" text NOT NULL,
  "indicator" text NOT NULL,
  "objectivePercent" double precision NOT NULL DEFAULT 99.9,
  "errorBudgetWindowDays" integer NOT NULL DEFAULT 30,
  "shortWindowMinutes" integer NOT NULL DEFAULT 5,
  "longWindowMinutes" integer NOT NULL DEFAULT 60,
  "isEnabled" boolean NOT NULL DEFAULT true,
  "metaJson" jsonb NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "SloPolicy_org_enabled_updated_idx" ON "SloPolicy" ("organizationId","isEnabled","updatedAt");
CREATE INDEX IF NOT EXISTS "SloPolicy_indicator_enabled_idx" ON "SloPolicy" ("indicator","isEnabled");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='SloPolicy_organizationId_fkey') THEN
    ALTER TABLE "SloPolicy"
      ADD CONSTRAINT "SloPolicy_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN undefined_table THEN
END$$;

CREATE TABLE IF NOT EXISTS "SloAlert" (
  "id" text PRIMARY KEY,
  "organizationId" text NULL,
  "policyId" text NOT NULL,
  "burnRateShort" double precision NOT NULL,
  "burnRateLong" double precision NOT NULL,
  "errorRateShort" double precision NOT NULL,
  "errorRateLong" double precision NOT NULL,
  "windowShortMinutes" integer NOT NULL,
  "windowLongMinutes" integer NOT NULL,
  "status" text NOT NULL DEFAULT 'open',
  "metaJson" jsonb NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "SloAlert_policy_created_idx" ON "SloAlert" ("policyId","createdAt");
CREATE INDEX IF NOT EXISTS "SloAlert_org_created_idx" ON "SloAlert" ("organizationId","createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='SloAlert_policyId_fkey') THEN
    ALTER TABLE "SloAlert"
      ADD CONSTRAINT "SloAlert_policyId_fkey"
      FOREIGN KEY ("policyId") REFERENCES "SloPolicy"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='SloAlert_organizationId_fkey') THEN
    ALTER TABLE "SloAlert"
      ADD CONSTRAINT "SloAlert_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN undefined_table THEN
END$$;
