# Worker and Async Contracts

Generated at: 2026-03-11T21:35:03.673Z

## API queue defaults
| Env | Default |
|---|---|
| QUEUE_NAME | atheel-workflow-executions |
| ESCALATION_QUEUE | atheel-workflow-escalations |
| TWIN_SIM_QUEUE | atheel-twin-simulations |
| EXPERIENCE_TWIN_SYNC_QUEUE | atheel-experience-twin-sync |
| EXPORT_QUEUE | atheel-exports |
| PUBLISH_QUEUE | atheel-workflow-publish |
| REPORT_QUEUE | atheel-workflow-report |
| COMPETITIONS_QUEUE | atheel-competitions |
| RADAR_SCAN_QUEUE | atheel-radar-scan |
| OBLIGATIONS_QUEUE | atheel-obligations |
| OUTBOX_QUEUE | atheel-outbox |
| SERVICE_OUTBOX_QUEUE | atheel-service-outbox |

## Worker / renderer defaults
| Surface | Env | Default |
|---|---|---|
| worker | QUEUE_NAME | atheel-workflow-executions |
| worker | ESCALATION_QUEUE | atheel-workflow-escalations |
| worker | TWIN_SIM_QUEUE | atheel-twin-simulations |
| worker | EXPORT_QUEUE | atheel-exports |
| worker | PUBLISH_QUEUE | atheel-workflow-publish |
| worker | REPORT_QUEUE | atheel-workflow-report |
| worker | COMPETITIONS_QUEUE | atheel-competitions |
| worker | RADAR_SCAN_QUEUE | atheel-radar-scan |
| worker | OBLIGATIONS_QUEUE | atheel-obligations |
| worker | OUTBOX_QUEUE | atheel-outbox |
| worker | SERVICE_OUTBOX_QUEUE | atheel-service-outbox |
| worker | API_BASE_URL | http://localhost:3001 |
| worker | API_PREFIX | /api |
| worker | ARTIFACTS_DIR | runtime_artifacts |
| worker | RADAR_CONNECTORS | etimad_api,etimad,moc,rcrc,rcrc_opendata,balady,ungm |
| worker | WORKER_TICK_LOOPS | 3 |
| worker | WORKER_CONCURRENCY | 4 |
| worker | ESCALATION_CONCURRENCY | 2 |
| worker | OUTBOX_CONCURRENCY | 2 |
| worker | SERVICE_OUTBOX_CONCURRENCY | 2 |
| worker | TWIN_SIM_CONCURRENCY | 2 |
| worker | EXPORT_CONCURRENCY | 1 |
| worker | PUBLISH_CONCURRENCY | 1 |
| worker | REPORT_CONCURRENCY | 1 |
| worker | COMPETITIONS_CONCURRENCY | 1 |
| worker | RADAR_SCAN_CONCURRENCY | 1 |
| worker | OBLIGATIONS_CONCURRENCY | 1 |
| api->exports | RMQ_URL | amqp://guest:guest@localhost:5672 |
| api->exports | EXPORTS_RMQ_QUEUE | atheel.exports.render |
| api->exports | REDIS_HOST | localhost |
| exports-svc | RMQ_URL | amqp://guest:guest@localhost:5672 |
| exports-svc | EXPORTS_RMQ_QUEUE | atheel.exports.render |
| exports-svc | REDIS_HOST | localhost |

## Closure rule
- Queue names, renderer transport, and worker tokens must be treated as contract-level configuration and frozen before staging rehearsal.