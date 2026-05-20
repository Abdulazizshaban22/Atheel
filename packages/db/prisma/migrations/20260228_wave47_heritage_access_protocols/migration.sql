-- Wave47: Heritage registry + access protocols

DO $$ BEGIN
  CREATE TYPE "HeritageAssetType" AS ENUM ('material','immaterial','architectural');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "HeritageAccessLevel" AS ENUM ('public','researchers','internal','restricted');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "HeritageAsset" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "titleAr" TEXT NOT NULL,
  "descriptionAr" TEXT,
  "assetType" "HeritageAssetType" NOT NULL,
  "region" TEXT,
  "city" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "accessLevel" "HeritageAccessLevel" NOT NULL DEFAULT 'internal',
  "accessPolicy" JSONB,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "HeritageAsset_org_idx" ON "HeritageAsset"("organizationId");

ALTER TABLE "HeritageAsset" 
  ADD CONSTRAINT IF NOT EXISTS "HeritageAsset_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HeritageAsset"
  ADD CONSTRAINT IF NOT EXISTS "HeritageAsset_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "HeritageAccessProtocol" (
  "id" TEXT PRIMARY KEY,
  "heritageAssetId" TEXT NOT NULL,
  "nameAr" TEXT NOT NULL,
  "rulesJson" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "HeritageAccessProtocol_asset_idx" ON "HeritageAccessProtocol"("heritageAssetId");

ALTER TABLE "HeritageAccessProtocol"
  ADD CONSTRAINT IF NOT EXISTS "HeritageAccessProtocol_asset_fkey"
  FOREIGN KEY ("heritageAssetId") REFERENCES "HeritageAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
