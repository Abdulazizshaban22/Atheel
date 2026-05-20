-- Wave32 materialized experience operations tables and owner recommender
-- Curated PostgreSQL SQL for competition operational tables.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CompetitionZoneKind') THEN
    CREATE TYPE "CompetitionZoneKind" AS ENUM ('entry','stage','exhibit','activity','food','kids','tournament','rest','services','exit');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CompetitionQueueMetricType') THEN
    CREATE TYPE "CompetitionQueueMetricType" AS ENUM ('entry_queue','food_queue','ticket_queue','tournament_queue','general_queue');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS "CompetitionZone" (
  "id" TEXT PRIMARY KEY,
  "competitionId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "nameAr" TEXT NOT NULL,
  "kind" "CompetitionZoneKind" NOT NULL,
  "areaSqm" NUMERIC(12,2),
  "capacityEstimate" INTEGER,
  "notesAr" TEXT,
  "metaJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CompetitionZone_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "CompetitionZone_competitionId_code_key" ON "CompetitionZone"("competitionId","code");
CREATE INDEX IF NOT EXISTS "CompetitionZone_competitionId_kind_idx" ON "CompetitionZone"("competitionId","kind");

CREATE TABLE IF NOT EXISTS "CompetitionScheduleItem" (
  "id" TEXT PRIMARY KEY,
  "competitionId" TEXT NOT NULL,
  "dayIndex" INTEGER NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "titleAr" TEXT NOT NULL,
  "zoneCode" TEXT,
  "notesAr" TEXT,
  "metaJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CompetitionScheduleItem_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "CompetitionScheduleItem_competitionId_dayIndex_idx" ON "CompetitionScheduleItem"("competitionId","dayIndex");
CREATE INDEX IF NOT EXISTS "CompetitionScheduleItem_competitionId_zoneCode_idx" ON "CompetitionScheduleItem"("competitionId","zoneCode");

CREATE TABLE IF NOT EXISTS "CompetitionJourneyStep" (
  "id" TEXT PRIMARY KEY,
  "competitionId" TEXT NOT NULL,
  "stepOrder" INTEGER NOT NULL,
  "titleAr" TEXT NOT NULL,
  "zoneCode" TEXT,
  "experienceGoalAr" TEXT NOT NULL,
  "measurementHintAr" TEXT NOT NULL,
  "metaJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CompetitionJourneyStep_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "CompetitionJourneyStep_competitionId_stepOrder_idx" ON "CompetitionJourneyStep"("competitionId","stepOrder");

CREATE TABLE IF NOT EXISTS "CompetitionQueueMetric" (
  "id" TEXT PRIMARY KEY,
  "competitionId" TEXT NOT NULL,
  "metricType" "CompetitionQueueMetricType" NOT NULL,
  "zoneCode" TEXT,
  "targetWaitMinutes" INTEGER,
  "peakFactor" NUMERIC(6,3),
  "avgDwellMinutes" INTEGER,
  "notesAr" TEXT,
  "metaJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CompetitionQueueMetric_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "CompetitionQueueMetric_competitionId_metricType_idx" ON "CompetitionQueueMetric"("competitionId","metricType");
CREATE INDEX IF NOT EXISTS "CompetitionQueueMetric_competitionId_zoneCode_idx" ON "CompetitionQueueMetric"("competitionId","zoneCode");

CREATE TABLE IF NOT EXISTS "CompetitionCategoryOwnerRecommendation" (
  "id" TEXT PRIMARY KEY,
  "competitionId" TEXT NOT NULL,
  "category" "CompetitionRequirementCategory" NOT NULL,
  "recommendedUserId" TEXT NOT NULL,
  "score" NUMERIC(6,3) NOT NULL,
  "reasonsJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CompetitionCategoryOwnerRecommendation_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE,
  CONSTRAINT "CompetitionCategoryOwnerRecommendation_recommendedUserId_fkey" FOREIGN KEY ("recommendedUserId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "CompetitionCategoryOwnerRecommendation_competitionId_category_key" ON "CompetitionCategoryOwnerRecommendation"("competitionId","category");
CREATE INDEX IF NOT EXISTS "CompetitionCategoryOwnerRecommendation_competitionId_idx" ON "CompetitionCategoryOwnerRecommendation"("competitionId");
