# Stage Migrate Deploy Rehearsal

Generated: 2026-03-12

## Goal
Execute `prisma migrate deploy` against a clean PostgreSQL stage database and capture immutable evidence.

## What this patch changes
- Replaces the 16 migration files previously flagged as placeholder or scaffold with curated SQL.
- Leaves the runtime truth explicit: this container does not include a provisioned Stage PostgreSQL database or installed Prisma workspace dependencies, so a real Stage execution could not be claimed from here.

## Exact command sequence
```bash
corepack enable
corepack prepare pnpm@9.15.0 --activate
pnpm install --frozen-lockfile
export DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/atheel_stage_clean?schema=public
pnpm --filter @madar/db prisma:migrate:deploy
```

## Evidence to capture
- full terminal log
- final `_prisma_migrations` table dump
- `prisma migrate status`
- schema diff report between migrations and schema

## Exit criteria
- all migrations apply cleanly
- no failed rows in `_prisma_migrations`
- post-deploy smoke checks pass

## Remaining truth gap
This specific environment cannot prove real Stage success because it lacks:
- live Stage PostgreSQL credentials
- installed workspace dependencies including Prisma CLI
- a clean external database to apply against
