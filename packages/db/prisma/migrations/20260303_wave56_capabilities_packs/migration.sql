-- Wave56: Capability Packs (Catalog + per-organization enablement)
-- This migration is intentionally explicit to make the platform usable as a general operating system across domains.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CapabilityDomain') THEN
    CREATE TYPE "CapabilityDomain" AS ENUM ('core','culture','heritage','ops','ai','twin','compliance','radar','integration','other');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "CapabilityPack" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "nameAr" TEXT NOT NULL,
  "nameEn" TEXT,
  "domain" "CapabilityDomain" NOT NULL DEFAULT 'other',
  "descriptionAr" TEXT,
  "modules" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "requires" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "defaultEnabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "manifest" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CapabilityPack_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CapabilityPack_code_key" ON "CapabilityPack"("code");
CREATE INDEX IF NOT EXISTS "CapabilityPack_domain_idx" ON "CapabilityPack"("domain");

CREATE TABLE IF NOT EXISTS "OrganizationCapability" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "packId" TEXT NOT NULL,
  "isEnabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "enabledAt" TIMESTAMP(3),
  "disabledAt" TIMESTAMP(3),
  "config" JSONB,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OrganizationCapability_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "OrganizationCapability_organizationId_packId_key" ON "OrganizationCapability"("organizationId","packId");
CREATE INDEX IF NOT EXISTS "OrganizationCapability_org_enabled_idx" ON "OrganizationCapability"("organizationId","isEnabled");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OrganizationCapability_organizationId_fkey') THEN
    ALTER TABLE "OrganizationCapability" ADD CONSTRAINT "OrganizationCapability_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OrganizationCapability_packId_fkey') THEN
    ALTER TABLE "OrganizationCapability" ADD CONSTRAINT "OrganizationCapability_packId_fkey" FOREIGN KEY ("packId") REFERENCES "CapabilityPack"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OrganizationCapability_updatedByUserId_fkey') THEN
    ALTER TABLE "OrganizationCapability" ADD CONSTRAINT "OrganizationCapability_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
