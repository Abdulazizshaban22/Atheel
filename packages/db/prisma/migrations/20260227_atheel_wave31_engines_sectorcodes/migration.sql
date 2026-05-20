-- Wave31 sector-code extension for cultural signals and competitions
-- Curated PostgreSQL SQL for 16-sector classification.

ALTER TABLE "CulturalSignal" ADD COLUMN IF NOT EXISTS "sectorCodes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Competition" ADD COLUMN IF NOT EXISTS "sectorCodes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
