# WAVE69–WAVE72

## Included Lite Deliverables

### Wave 69 — Cultural Commerce Layer Lite
- Added local offers registry under organizations module
- Added commerce bundles and link-to-experience flow
- New endpoints:
  - GET /organizations/commerce/bundles
  - POST /organizations/commerce/bundles
  - GET /organizations/offers/local
  - POST /organizations/offers/local
  - POST /organizations/experiences/:experienceId/link-bundle

### Wave 70 — Visitor Graph Foundations Lite
- Added visitor profiles, segments, recommendations, and inferred history
- New endpoints:
  - POST /visitor-guide/profiles
  - GET /visitor-guide/segments
  - POST /visitor-guide/recommend
  - GET /visitor-guide/profiles/:id/history

### Wave 72 — Impact & Legacy Engine Lite
- Added impact frameworks
- Added project impact summary
- Added legacy outcomes and season legacy reporting
- New endpoints:
  - POST /impact/frameworks
  - GET /impact/projects/:projectId
  - POST /impact/legacy/projects/:projectId/outcomes
  - GET /impact/legacy/seasons/:seasonId/report

## Notes
- Current implementation is deliberately lightweight and in-memory-first for fast iteration.
- No Prisma schema migrations were introduced in this patch.
- Next recommended step: persist these models into Prisma and expose corresponding Next.js dashboards.
