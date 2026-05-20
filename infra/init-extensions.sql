-- Atheel Platform: PostgreSQL Extensions Initialization
-- Run automatically on first container start via docker-entrypoint-initdb.d

-- Wave123: Enable pgvector for real vector search
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable pg_trgm for Arabic text search optimization
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Enable uuid-ossp for server-side UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
