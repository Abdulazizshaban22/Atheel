-- Wave46: incidents timeline + approvals routing fairness/cooldown + multi-window multi-burn-rate
-- Idempotent migration (safe to run multiple times)

-- 1) ApprovalRequest: add routing context fields (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='ApprovalRequest') THEN
    ALTER TABLE "ApprovalRequest" ADD COLUMN IF NOT EXISTS "contextViolationType" text;
    ALTER TABLE "ApprovalRequest" ADD COLUMN IF NOT EXISTS "contextDomain" text;
    ALTER TABLE "ApprovalRequest" ADD COLUMN IF NOT EXISTS "contextRegion" text;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS "ApprovalRequest_org_violation_idx" ON "ApprovalRequest" ("organizationId", "contextViolationType");
CREATE INDEX IF NOT EXISTS "ApprovalRequest_org_domain_idx" ON "ApprovalRequest" ("organizationId", "contextDomain");
CREATE INDEX IF NOT EXISTS "ApprovalRequest_org_region_idx" ON "ApprovalRequest" ("organizationId", "contextRegion");

-- 2) OpsSettings: add approvals routing tuning
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='OpsSettings') THEN
    ALTER TABLE "OpsSettings" ADD COLUMN IF NOT EXISTS "approvalsReviewerCooldownMinutes" integer NOT NULL DEFAULT 5;
    ALTER TABLE "OpsSettings" ADD COLUMN IF NOT EXISTS "approvalsMaxActivePerReviewer" integer NOT NULL DEFAULT 10;
  END IF;
END$$;

-- 3) ApprovalRoutingState: fairness state
CREATE TABLE IF NOT EXISTS "ApprovalRoutingState" (
  "id" text PRIMARY KEY,
  "organizationId" text NOT NULL,
  "userId" text NOT NULL,
  "lastAssignedAt" timestamptz NULL,
  "assignedCount" integer NOT NULL DEFAULT 0,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ApprovalRoutingState_org_user_key') THEN
    ALTER TABLE "ApprovalRoutingState" ADD CONSTRAINT "ApprovalRoutingState_org_user_key" UNIQUE ("organizationId","userId");
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS "ApprovalRoutingState_org_lastAssigned_idx" ON "ApprovalRoutingState" ("organizationId","lastAssignedAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ApprovalRoutingState_organizationId_fkey') THEN
    ALTER TABLE "ApprovalRoutingState"
      ADD CONSTRAINT "ApprovalRoutingState_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN undefined_table THEN
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ApprovalRoutingState_userId_fkey') THEN
    ALTER TABLE "ApprovalRoutingState"
      ADD CONSTRAINT "ApprovalRoutingState_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN undefined_table THEN
END$$;

-- 4) Incidents tables
CREATE TABLE IF NOT EXISTS "Incident" (
  "id" text PRIMARY KEY,
  "organizationId" text NOT NULL,
  "incidentKey" text NOT NULL,
  "title" text NULL,
  "severity" text NOT NULL DEFAULT 'warning',
  "status" text NOT NULL DEFAULT 'open',
  "mutedUntil" timestamptz NULL,
  "ackedAt" timestamptz NULL,
  "ackedByUserId" text NULL,
  "closedAt" timestamptz NULL,
  "closedByUserId" text NULL,
  "firstSeenAt" timestamptz NOT NULL DEFAULT now(),
  "lastSeenAt" timestamptz NOT NULL DEFAULT now(),
  "eventCount" integer NOT NULL DEFAULT 0,
  "metaJson" jsonb NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='Incident_org_key_key') THEN
    ALTER TABLE "Incident" ADD CONSTRAINT "Incident_org_key_key" UNIQUE ("organizationId","incidentKey");
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS "Incident_org_status_lastSeen_idx" ON "Incident" ("organizationId","status","lastSeenAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='Incident_organizationId_fkey') THEN
    ALTER TABLE "Incident"
      ADD CONSTRAINT "Incident_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN undefined_table THEN
END$$;

-- optional actor FK constraints are not strictly required for incidents

CREATE TABLE IF NOT EXISTS "IncidentEvent" (
  "id" text PRIMARY KEY,
  "incidentId" text NOT NULL,
  "organizationId" text NOT NULL,
  "eventType" text NOT NULL,
  "actorType" text NOT NULL DEFAULT 'system',
  "actorUserId" text NULL,
  "message" text NULL,
  "payload" jsonb NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "IncidentEvent_incident_created_idx" ON "IncidentEvent" ("incidentId","createdAt");
CREATE INDEX IF NOT EXISTS "IncidentEvent_org_created_idx" ON "IncidentEvent" ("organizationId","createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='IncidentEvent_incidentId_fkey') THEN
    ALTER TABLE "IncidentEvent"
      ADD CONSTRAINT "IncidentEvent_incidentId_fkey"
      FOREIGN KEY ("incidentId") REFERENCES "Incident"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN undefined_table THEN
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='IncidentEvent_organizationId_fkey') THEN
    ALTER TABLE "IncidentEvent"
      ADD CONSTRAINT "IncidentEvent_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN undefined_table THEN
END$$;
