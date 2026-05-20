-- Wave33 IoT devices, telemetry, and embedding persistence
-- Curated PostgreSQL SQL using JSONB storage for embeddings.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'IoTDeviceKind') THEN
    CREATE TYPE "IoTDeviceKind" AS ENUM ('sensor','gateway','camera','counter','beacon','manual');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS "KnowledgeChunkEmbedding" (
  "id" TEXT PRIMARY KEY,
  "documentId" TEXT NOT NULL,
  "chunkId" TEXT NOT NULL UNIQUE,
  "embeddingJson" JSONB NOT NULL,
  "dims" INTEGER NOT NULL,
  "modelName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KnowledgeChunkEmbedding_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "KnowledgeDocument"("id") ON DELETE CASCADE,
  CONSTRAINT "KnowledgeChunkEmbedding_chunkId_fkey" FOREIGN KEY ("chunkId") REFERENCES "KnowledgeChunk"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "KnowledgeChunkEmbedding_documentId_idx" ON "KnowledgeChunkEmbedding"("documentId");
CREATE INDEX IF NOT EXISTS "KnowledgeChunkEmbedding_modelName_idx" ON "KnowledgeChunkEmbedding"("modelName");

CREATE TABLE IF NOT EXISTS "IoTDevice" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT,
  "twinId" TEXT,
  "nameAr" TEXT NOT NULL,
  "kind" "IoTDeviceKind" NOT NULL,
  "secretKeyHash" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IoTDevice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL,
  CONSTRAINT "IoTDevice_twinId_fkey" FOREIGN KEY ("twinId") REFERENCES "Twin"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "IoTDevice_org_twin_idx" ON "IoTDevice"("organizationId","twinId");
CREATE INDEX IF NOT EXISTS "IoTDevice_isActive_idx" ON "IoTDevice"("isActive");

CREATE TABLE IF NOT EXISTS "IoTTelemetryEvent" (
  "id" TEXT PRIMARY KEY,
  "deviceId" TEXT NOT NULL,
  "organizationId" TEXT,
  "twinId" TEXT,
  "nodeId" TEXT,
  "ts" TIMESTAMP(3) NOT NULL,
  "kind" "TwinTelemetryKind" NOT NULL,
  "value" DOUBLE PRECISION,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IoTTelemetryEvent_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "IoTDevice"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IoTTelemetryEvent_device_ts_idx" ON "IoTTelemetryEvent"("deviceId","ts");
CREATE INDEX IF NOT EXISTS "IoTTelemetryEvent_twin_ts_idx" ON "IoTTelemetryEvent"("twinId","ts");
CREATE INDEX IF NOT EXISTS "IoTTelemetryEvent_kind_idx" ON "IoTTelemetryEvent"("kind");
