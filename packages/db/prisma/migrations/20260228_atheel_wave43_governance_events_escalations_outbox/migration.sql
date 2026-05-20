-- Wave43: Governance Policy Registry + Operational Events + Escalation State + Outbox
-- Idempotent migration (safe to run multiple times)

-- 1) Enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'GovernancePolicyScope') THEN
    CREATE TYPE "GovernancePolicyScope" AS ENUM ('global','organization');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OperationalActorType') THEN
    CREATE TYPE "OperationalActorType" AS ENUM ('user','service','worker','system');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OperationalEventSeverity') THEN
    CREATE TYPE "OperationalEventSeverity" AS ENUM ('info','warning','critical');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OutboxStatus') THEN
    CREATE TYPE "OutboxStatus" AS ENUM ('pending','sending','sent','failed');
  END IF;
END$$;

-- 2) GovernancePolicyPack
CREATE TABLE IF NOT EXISTS "GovernancePolicyPack" (
  "id" text PRIMARY KEY,
  "scope" "GovernancePolicyScope" NOT NULL DEFAULT 'organization',
  "organizationId" text NULL,
  "name" text NOT NULL,
  "description" text NULL,
  "isArchived" boolean NOT NULL DEFAULT false,
  "createdByUserId" text NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='GovernancePolicyPack' AND column_name='updatedAt') THEN
    -- no-op: Prisma will handle updatedAt on app side; keep default
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS "GovernancePolicyPack_org_arch_created_idx"
  ON "GovernancePolicyPack" ("organizationId", "isArchived", "createdAt");

CREATE INDEX IF NOT EXISTS "GovernancePolicyPack_scope_created_idx"
  ON "GovernancePolicyPack" ("scope", "createdAt");

-- Foreign keys (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'GovernancePolicyPack_organizationId_fkey'
  ) THEN
    ALTER TABLE "GovernancePolicyPack"
      ADD CONSTRAINT "GovernancePolicyPack_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN undefined_table THEN
  -- If Organization table not present in some setups, ignore.
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'GovernancePolicyPack_createdByUserId_fkey'
  ) THEN
    ALTER TABLE "GovernancePolicyPack"
      ADD CONSTRAINT "GovernancePolicyPack_createdByUserId_fkey"
      FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN undefined_table THEN
END$$;

-- 3) GovernancePolicyVersion
CREATE TABLE IF NOT EXISTS "GovernancePolicyVersion" (
  "id" text PRIMARY KEY,
  "packId" text NOT NULL,
  "version" text NOT NULL,
  "policyJson" jsonb NOT NULL,
  "sha256" text NOT NULL,
  "changelog" text NULL,
  "createdByUserId" text NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

-- Unique (packId, version)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'GovernancePolicyVersion_packId_version_key'
  ) THEN
    ALTER TABLE "GovernancePolicyVersion"
      ADD CONSTRAINT "GovernancePolicyVersion_packId_version_key" UNIQUE ("packId","version");
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS "GovernancePolicyVersion_pack_created_idx"
  ON "GovernancePolicyVersion" ("packId", "createdAt");

CREATE INDEX IF NOT EXISTS "GovernancePolicyVersion_sha256_idx"
  ON "GovernancePolicyVersion" ("sha256");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'GovernancePolicyVersion_packId_fkey') THEN
    ALTER TABLE "GovernancePolicyVersion"
      ADD CONSTRAINT "GovernancePolicyVersion_packId_fkey"
      FOREIGN KEY ("packId") REFERENCES "GovernancePolicyPack"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'GovernancePolicyVersion_createdByUserId_fkey') THEN
    ALTER TABLE "GovernancePolicyVersion"
      ADD CONSTRAINT "GovernancePolicyVersion_createdByUserId_fkey"
      FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN undefined_table THEN
END$$;

-- 4) GovernancePolicyAssignment
CREATE TABLE IF NOT EXISTS "GovernancePolicyAssignment" (
  "id" text PRIMARY KEY,
  "organizationId" text NOT NULL,
  "packId" text NOT NULL,
  "versionId" text NOT NULL,
  "isActive" boolean NOT NULL DEFAULT false,
  "effectiveAt" timestamptz NOT NULL DEFAULT now(),
  "deactivatedAt" timestamptz NULL,
  "activatedByUserId" text NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "GovernancePolicyAssignment_org_active_effective_idx"
  ON "GovernancePolicyAssignment" ("organizationId","isActive","effectiveAt");

CREATE INDEX IF NOT EXISTS "GovernancePolicyAssignment_pack_version_idx"
  ON "GovernancePolicyAssignment" ("packId","versionId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='GovernancePolicyAssignment_organizationId_fkey') THEN
    ALTER TABLE "GovernancePolicyAssignment"
      ADD CONSTRAINT "GovernancePolicyAssignment_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN undefined_table THEN
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='GovernancePolicyAssignment_packId_fkey') THEN
    ALTER TABLE "GovernancePolicyAssignment"
      ADD CONSTRAINT "GovernancePolicyAssignment_packId_fkey"
      FOREIGN KEY ("packId") REFERENCES "GovernancePolicyPack"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='GovernancePolicyAssignment_versionId_fkey') THEN
    ALTER TABLE "GovernancePolicyAssignment"
      ADD CONSTRAINT "GovernancePolicyAssignment_versionId_fkey"
      FOREIGN KEY ("versionId") REFERENCES "GovernancePolicyVersion"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='GovernancePolicyAssignment_activatedByUserId_fkey') THEN
    ALTER TABLE "GovernancePolicyAssignment"
      ADD CONSTRAINT "GovernancePolicyAssignment_activatedByUserId_fkey"
      FOREIGN KEY ("activatedByUserId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN undefined_table THEN
END$$;

-- 5) OperationalEvent
CREATE TABLE IF NOT EXISTS "OperationalEvent" (
  "id" text PRIMARY KEY,
  "organizationId" text NULL,
  "actorType" "OperationalActorType" NOT NULL DEFAULT 'user',
  "actorUserId" text NULL,
  "eventType" text NOT NULL,
  "source" text NULL,
  "subject" text NULL,
  "correlationId" text NULL,
  "requestId" text NULL,
  "severity" "OperationalEventSeverity" NOT NULL DEFAULT 'info',
  "data" jsonb NULL,
  "cloudEvent" jsonb NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "OperationalEvent_org_created_idx"
  ON "OperationalEvent" ("organizationId","createdAt");

CREATE INDEX IF NOT EXISTS "OperationalEvent_type_created_idx"
  ON "OperationalEvent" ("eventType","createdAt");

CREATE INDEX IF NOT EXISTS "OperationalEvent_subject_idx"
  ON "OperationalEvent" ("subject");

CREATE INDEX IF NOT EXISTS "OperationalEvent_correlation_idx"
  ON "OperationalEvent" ("correlationId");

CREATE INDEX IF NOT EXISTS "OperationalEvent_request_idx"
  ON "OperationalEvent" ("requestId");

CREATE INDEX IF NOT EXISTS "OperationalEvent_severity_idx"
  ON "OperationalEvent" ("severity");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='OperationalEvent_organizationId_fkey') THEN
    ALTER TABLE "OperationalEvent"
      ADD CONSTRAINT "OperationalEvent_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN undefined_table THEN
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='OperationalEvent_actorUserId_fkey') THEN
    ALTER TABLE "OperationalEvent"
      ADD CONSTRAINT "OperationalEvent_actorUserId_fkey"
      FOREIGN KEY ("actorUserId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN undefined_table THEN
END$$;

-- 6) EscalationState
CREATE TABLE IF NOT EXISTS "EscalationState" (
  "id" text PRIMARY KEY,
  "organizationId" text NOT NULL,
  "entityType" text NOT NULL,
  "entityId" text NOT NULL,
  "lastLevel" integer NOT NULL DEFAULT 0,
  "lastNotifiedAt" timestamptz NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='EscalationState_org_entity_unique') THEN
    ALTER TABLE "EscalationState"
      ADD CONSTRAINT "EscalationState_org_entity_unique" UNIQUE ("organizationId","entityType","entityId");
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS "EscalationState_org_entity_level_idx"
  ON "EscalationState" ("organizationId","entityType","lastLevel");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='EscalationState_organizationId_fkey') THEN
    ALTER TABLE "EscalationState"
      ADD CONSTRAINT "EscalationState_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN undefined_table THEN
END$$;

-- 7) OutboxMessage
CREATE TABLE IF NOT EXISTS "OutboxMessage" (
  "id" text PRIMARY KEY,
  "organizationId" text NULL,
  "channel" text NOT NULL,
  "payload" jsonb NOT NULL,
  "status" "OutboxStatus" NOT NULL DEFAULT 'pending',
  "attempts" integer NOT NULL DEFAULT 0,
  "nextAttemptAt" timestamptz NULL,
  "lastError" text NULL,
  "sentAt" timestamptz NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "OutboxMessage_status_next_created_idx"
  ON "OutboxMessage" ("status","nextAttemptAt","createdAt");

CREATE INDEX IF NOT EXISTS "OutboxMessage_org_status_created_idx"
  ON "OutboxMessage" ("organizationId","status","createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='OutboxMessage_organizationId_fkey') THEN
    ALTER TABLE "OutboxMessage"
      ADD CONSTRAINT "OutboxMessage_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN undefined_table THEN
END$$;
