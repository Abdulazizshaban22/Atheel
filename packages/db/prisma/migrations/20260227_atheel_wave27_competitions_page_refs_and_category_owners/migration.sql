-- Wave27 Competition category assignments migration
-- Curated PostgreSQL SQL for category-level owners.

CREATE TABLE IF NOT EXISTS "CompetitionCategoryAssignment" (
  "id" TEXT PRIMARY KEY,
  "competitionId" TEXT NOT NULL,
  "category" "CompetitionRequirementCategory" NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "CompetitionAssignmentRole" NOT NULL DEFAULT 'contributor',
  "isOwner" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "CompetitionCategoryAssignment_competitionId_category_userId_key" ON "CompetitionCategoryAssignment"("competitionId","category","userId");
CREATE INDEX IF NOT EXISTS "CompetitionCategoryAssignment_competitionId_category_idx" ON "CompetitionCategoryAssignment"("competitionId","category");
CREATE INDEX IF NOT EXISTS "CompetitionCategoryAssignment_userId_idx" ON "CompetitionCategoryAssignment"("userId");
ALTER TABLE "CompetitionCategoryAssignment" ADD CONSTRAINT "CompetitionCategoryAssignment_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE;
ALTER TABLE "CompetitionCategoryAssignment" ADD CONSTRAINT "CompetitionCategoryAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
