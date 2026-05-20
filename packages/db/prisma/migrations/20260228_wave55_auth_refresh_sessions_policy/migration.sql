-- Wave55: Refresh sessions (multi-device) + rotation/reuse detection + Policy rules

-- Enums
DO $$ BEGIN
  CREATE TYPE "RefreshSessionState" AS ENUM ('active','revoked','compromised','expired');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "PolicyEffect" AS ENUM ('allow','deny');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- RefreshSessionToken
CREATE TABLE IF NOT EXISTS "RefreshSessionToken" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "usedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "replacedByTokenId" TEXT,
  CONSTRAINT "RefreshSessionToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "RefreshSessionToken_tokenHash_key" ON "RefreshSessionToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "RefreshSessionToken_sessionId_issuedAt_idx" ON "RefreshSessionToken"("sessionId","issuedAt");
CREATE INDEX IF NOT EXISTS "RefreshSessionToken_sessionId_usedAt_idx" ON "RefreshSessionToken"("sessionId","usedAt");

-- RefreshSession
CREATE TABLE IF NOT EXISTS "RefreshSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "familyId" TEXT NOT NULL,
  "state" "RefreshSessionState" NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "lastSeenAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "compromisedAt" TIMESTAMP(3),
  "ip" TEXT,
  "userAgent" TEXT,
  "deviceName" TEXT,
  "currentTokenId" TEXT NOT NULL,
  CONSTRAINT "RefreshSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "RefreshSession_userId_state_idx" ON "RefreshSession"("userId","state");
CREATE INDEX IF NOT EXISTS "RefreshSession_familyId_idx" ON "RefreshSession"("familyId");

-- PolicyRule
CREATE TABLE IF NOT EXISTS "PolicyRule" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "role" "PlatformRole",
  "userId" TEXT,
  "resource" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "effect" "PolicyEffect" NOT NULL DEFAULT 'allow',
  "conditions" JSONB,
  "priority" INTEGER NOT NULL DEFAULT 100,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PolicyRule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PolicyRule_org_role_resource_action_idx" ON "PolicyRule"("organizationId","role","resource","action");
CREATE INDEX IF NOT EXISTS "PolicyRule_org_user_idx" ON "PolicyRule"("organizationId","userId");

-- Foreign keys
ALTER TABLE "RefreshSessionToken"
  DROP CONSTRAINT IF EXISTS "RefreshSessionToken_sessionId_fkey";
ALTER TABLE "RefreshSessionToken"
  ADD CONSTRAINT "RefreshSessionToken_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "RefreshSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RefreshSession"
  DROP CONSTRAINT IF EXISTS "RefreshSession_userId_fkey";
ALTER TABLE "RefreshSession"
  ADD CONSTRAINT "RefreshSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RefreshSession"
  DROP CONSTRAINT IF EXISTS "RefreshSession_currentTokenId_fkey";
ALTER TABLE "RefreshSession"
  ADD CONSTRAINT "RefreshSession_currentTokenId_fkey" FOREIGN KEY ("currentTokenId") REFERENCES "RefreshSessionToken"("id") ON DELETE RESTRICT ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE "PolicyRule"
  DROP CONSTRAINT IF EXISTS "PolicyRule_organizationId_fkey";
ALTER TABLE "PolicyRule"
  ADD CONSTRAINT "PolicyRule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PolicyRule"
  DROP CONSTRAINT IF EXISTS "PolicyRule_userId_fkey";
ALTER TABLE "PolicyRule"
  ADD CONSTRAINT "PolicyRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
