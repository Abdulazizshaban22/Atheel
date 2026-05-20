# Wave 67 + Wave 68

## Wave 67 — Memory Engine + Event Genome Lite

Added to `experiments` module:
- `GET /experiments/memory/projects/:projectId/lessons`
- `POST /experiments/genome/events/build`
- `GET /experiments/genome/events/:id`
- `POST /experiments/recommendations/from-memory`

What it does:
- derives lessons learned from prior experiments for a project
- creates an initial event genome record with crowd, heritage, and operations profiles
- exposes genome retrieval for later orchestration
- generates lightweight recommendations from prior memory and matched genomes

## Wave 68 — Partner OS Lite

Added to `organizations` module:
- `GET /organizations/partners`
- `POST /organizations/partners`
- `GET /organizations/partners/:id/contributions`
- `POST /organizations/partners/:id/invite-portal`
- `GET /organizations/vendors/compliance`

What it does:
- introduces an in-memory partner registry for destination and event partners
- stores partner capabilities and contribution areas
- returns contribution summaries and readiness state
- creates lightweight partner portal invites
- exposes vendor compliance monitoring for operating teams
