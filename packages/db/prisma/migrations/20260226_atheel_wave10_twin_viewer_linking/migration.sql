-- Wave10 VisitorExperience to Twin one-to-one linking

ALTER TABLE "VisitorExperience" ADD COLUMN IF NOT EXISTS "twinId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "VisitorExperience_twinId_key" ON "VisitorExperience"("twinId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'VisitorExperience_twinId_fkey'
  ) THEN
    ALTER TABLE "VisitorExperience" ADD CONSTRAINT "VisitorExperience_twinId_fkey"
      FOREIGN KEY ("twinId") REFERENCES "Twin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
