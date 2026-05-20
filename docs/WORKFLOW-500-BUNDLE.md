# Atheel Wave05 Workflow Library Bundle

## What was added
- Workflow kernel package `@madar/workflow-kernel`
- Generated catalog of **576 cultural workflow templates** (12 domains × 8 intents × 6 triggers)
- API module `/api/workflows/*` for catalog, instantiate, simulate runs, and export packs
- Web page `/workflows` to browse and simulate workflows
- Prisma schema + SQL migration scaffolding for persistence
- In-memory persistence fallback via `DataStoreService`

## Key endpoints
- `GET /api/workflows/catalog/summary`
- `GET /api/workflows/catalog?limit=60&q=&domain=`
- `GET /api/workflows/catalog/:idOrCode`
- `POST /api/workflows/instances`
- `POST /api/workflows/runs/simulate`
- `GET /api/workflows/runs`
- `POST /api/workflows/packs/export`

## Example simulate request
```json
{
  "templateId": "wft_0001",
  "hasKnowledge": true,
  "hasApprovalActor": true,
  "priority": "normal",
  "persistRun": false
}
```

## LLM / RAG / Agent integration direction
- RAG is modeled per-step and exposed in `aiProfile`
- Agent mode supports `none`, `single_agent`, `planner_worker`
- Runtime simulation emits AI call estimates and human checkpoints
- Export pack includes n8n-like graph JSON for future workflow engine integration

## Next recommended production steps
1. Connect real queue/worker (Redis + BullMQ or Temporal)
2. Attach actual RAG connectors to knowledge collections
3. Bind step adapters to project/content/approval services
4. Add execution state machine + retries + idempotency keys
5. Enable observability traces per workflow run
