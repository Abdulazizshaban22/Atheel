-- Wave09 Digital Twin foundation migration
-- Curated PostgreSQL SQL for Twin, nodes, edges, layers, simulations, and telemetry.

DO $$ BEGIN
  CREATE TYPE "TwinKind" AS ENUM ('venue','route','exhibition','district');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "TwinStatus" AS ENUM ('draft','active','paused','archived');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "TwinCoordinateSystem" AS ENUM ('wgs84','local_xy');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "TwinNodeKind" AS ENUM ('entry','exit','exhibit','activity','service','rest','corridor','staff_only','hazard');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "TwinEdgeKind" AS ENUM ('path','stairs','elevator','queue_lane','restricted');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "TwinLayerKind" AS ENUM ('geojson','gltf','three_d_tiles','image','pdf','link');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "TwinTelemetryKind" AS ENUM ('footfall','occupancy','temperature','noise','incident','manual_note');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "Twin" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT,
  "projectId" TEXT,
  "kind" "TwinKind" NOT NULL,
  "nameAr" TEXT NOT NULL,
  "status" "TwinStatus" NOT NULL DEFAULT 'draft',
  "coordinateSystem" "TwinCoordinateSystem" NOT NULL DEFAULT 'local_xy',
  "bboxJson" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "Twin_organizationId_projectId_idx" ON "Twin"("organizationId","projectId");
CREATE INDEX IF NOT EXISTS "Twin_status_idx" ON "Twin"("status");
ALTER TABLE "Twin" ADD CONSTRAINT "Twin_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL;
ALTER TABLE "Twin" ADD CONSTRAINT "Twin_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS "TwinNode" (
  "id" TEXT PRIMARY KEY,
  "twinId" TEXT NOT NULL,
  "nameAr" TEXT NOT NULL,
  "kind" "TwinNodeKind" NOT NULL,
  "capacity" INTEGER NOT NULL,
  "dwellTimeSecondsAvg" INTEGER NOT NULL,
  "posJson" TEXT NOT NULL,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "TwinNode_twinId_kind_idx" ON "TwinNode"("twinId","kind");
ALTER TABLE "TwinNode" ADD CONSTRAINT "TwinNode_twinId_fkey" FOREIGN KEY ("twinId") REFERENCES "Twin"("id") ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS "TwinEdge" (
  "id" TEXT PRIMARY KEY,
  "twinId" TEXT NOT NULL,
  "fromNodeId" TEXT NOT NULL,
  "toNodeId" TEXT NOT NULL,
  "kind" "TwinEdgeKind" NOT NULL,
  "distanceMeters" INTEGER NOT NULL,
  "travelTimeSeconds" INTEGER NOT NULL,
  "oneWay" BOOLEAN NOT NULL DEFAULT FALSE,
  "widthMeters" DOUBLE PRECISION,
  "capacityPerMinute" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "TwinEdge_twinId_idx" ON "TwinEdge"("twinId");
CREATE INDEX IF NOT EXISTS "TwinEdge_fromNodeId_toNodeId_idx" ON "TwinEdge"("fromNodeId","toNodeId");
ALTER TABLE "TwinEdge" ADD CONSTRAINT "TwinEdge_twinId_fkey" FOREIGN KEY ("twinId") REFERENCES "Twin"("id") ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS "TwinLayer" (
  "id" TEXT PRIMARY KEY,
  "twinId" TEXT NOT NULL,
  "nameAr" TEXT NOT NULL,
  "kind" "TwinLayerKind" NOT NULL,
  "uri" TEXT NOT NULL,
  "contentType" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "TwinLayer_twinId_kind_idx" ON "TwinLayer"("twinId","kind");
ALTER TABLE "TwinLayer" ADD CONSTRAINT "TwinLayer_twinId_fkey" FOREIGN KEY ("twinId") REFERENCES "Twin"("id") ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS "TwinSimulationRun" (
  "id" TEXT PRIMARY KEY,
  "twinId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "profileJson" TEXT NOT NULL,
  "resultJson" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "TwinSimulationRun_twinId_status_idx" ON "TwinSimulationRun"("twinId","status");
ALTER TABLE "TwinSimulationRun" ADD CONSTRAINT "TwinSimulationRun_twinId_fkey" FOREIGN KEY ("twinId") REFERENCES "Twin"("id") ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS "TwinTelemetryEvent" (
  "id" TEXT PRIMARY KEY,
  "twinId" TEXT NOT NULL,
  "ts" TIMESTAMP(3) NOT NULL,
  "kind" "TwinTelemetryKind" NOT NULL,
  "nodeId" TEXT,
  "value" DOUBLE PRECISION,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "TwinTelemetryEvent_twinId_ts_idx" ON "TwinTelemetryEvent"("twinId","ts");
CREATE INDEX IF NOT EXISTS "TwinTelemetryEvent_kind_idx" ON "TwinTelemetryEvent"("kind");
ALTER TABLE "TwinTelemetryEvent" ADD CONSTRAINT "TwinTelemetryEvent_twinId_fkey" FOREIGN KEY ("twinId") REFERENCES "Twin"("id") ON DELETE CASCADE;
