# Wave 63 + Wave 64

## What was added

### Wave 63 — Destination Brain Lite
New API capabilities inside `programs` module:
- `GET /programs/destination-brain/summary`
- `GET /programs/destination-brain/gaps`
- `GET /programs/destination-brain/conflicts`
- `POST /programs/destination-brain/recommendations`

This layer analyzes the current portfolio of programs using existing `Program.metadataJson` and derives:
- theme coverage
- readiness gaps
- active program counts
- city / destination filtering
- calendar overlap detection for city / venue
- recommendation generation for missing themes and calendar rebalance

### Wave 64 — Stage-Gate Governance OS Lite
New API capabilities inside `governance` module:
- `GET /governance/stage-gates/templates`
- `POST /governance/stage-gates/evaluate`
- `POST /governance/stage-gates/board-packet`

This layer adds a lightweight stage-gate operating model without requiring a schema migration yet.
It includes:
- default stage-gate templates for heritage intervention, destination program, and mega event
- evidence completeness evaluation
- decision-readiness status
- board packet JSON generation for approvals / governance reviews

## Files changed
- `apps/api/src/modules/programs/programs.controller.ts`
- `apps/api/src/modules/programs/programs.service.ts`
- `apps/api/src/modules/programs/dto/generate-destination-recommendations.dto.ts`
- `apps/api/src/modules/governance/governance.controller.ts`
- `apps/api/src/modules/governance/governance.service.ts`
- `apps/api/src/modules/governance/dto/query-stage-gates.dto.ts`
- `apps/api/src/modules/governance/dto/evaluate-stage-gate.dto.ts`
- `apps/api/src/modules/governance/dto/generate-board-packet.dto.ts`

## Notes
- This is a real code patch, but it is still a Lite implementation.
- No Prisma migration was introduced in this step.
- Stage-gate templates are currently service-backed defaults.
- The next logical upgrade is to persist templates and evidence policies in dedicated tables and connect board packets to the export pipeline.
