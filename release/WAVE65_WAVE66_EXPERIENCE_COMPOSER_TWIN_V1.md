# WAVE65 + WAVE66

## Added

### Experience Composer Lite
- POST /experiences/:id/blueprint
- PATCH /experiences/:id/journey
- GET /experiences/:id/touchpoints
- POST /experiences/:id/triggers/simulate

### Cultural Digital Twin V1 Lite
- POST /twin/:id/scenarios
- POST /twin/:id/simulate-flow
- GET /twin/:id/load-thresholds
- GET /twin/:id/scenario-results

## Notes
- Experience Composer persists into twin.metadata.experienceComposer when a twin exists.
- Twin flow simulation reuses existing simulation pipeline and exposes lighter decision-oriented endpoints.
- This patch is intentionally schema-light to avoid breaking the current DB contract.
