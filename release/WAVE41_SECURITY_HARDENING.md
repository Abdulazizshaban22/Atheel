# WAVE41 — Security Hardening (Non‑Negotiables)

This wave closes the core production-blockers:

## 1) Reproducible builds
- Added `pnpm-lock.yaml`
- Updated `@opentelemetry/auto-instrumentations-node` to a published version (`^0.70.1`) in API + Worker
- Docker builds now use `pnpm install --frozen-lockfile`

## 2) Remove demo login defaults from Web
- `/login` no longer pre-fills credentials (optional dev-only prefill via `NEXT_PUBLIC_DEMO_PREFILL=true`)

## 3) Cookie name consistency
- Web middleware now checks `atheel_access` (fallback: legacy `atheel_token`)

## 4) Production compose secrets
- `AUTH_JWT_SECRET` is required
- `WORKER_TOKEN` is required (no insecure default)

## 5) Production start
- API `start:prod` now runs `node dist/main.js` (no ts-node)

## 6) Migrations
- `apps/api/docker-entrypoint.sh` no longer ignores migration/generate failures

## 7) Reduce public routes
- Removed `@Public()` from non-worker routes across controllers.
- Kept only: auth, health, metrics, and worker-token protected endpoints.

## 9) No silent in-memory fallback in production
- Added `apps/api/src/common/db-fallback.ts`
- Applied fail-fast to:
  - Projects, Content, Experiences, Approvals, Attachments, Users
- Override (emergency only): `ALLOW_IN_MEMORY_FALLBACK=true`

## 10) E2E coverage
- Added tests for:
  - Tenant enforcement (multi-org)
  - CSRF enforcement (cookie-auth)
  - Audit log on export download
