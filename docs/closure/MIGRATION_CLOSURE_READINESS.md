# Migration Closure Readiness

Generated at: 2026-03-11T21:50:09.972Z

- Release channel: ci
- Total migrations: 26
- Generated or curated: 26
- Placeholder only: 0
- Mixed placeholder: 0
- Empty migrations: 0
- Release blocked: no

## Rules
- CI may inventory placeholder migrations, but staging/production promotion must fail while any placeholder or mixed-placeholder migration remains.
- Use Prisma Migrate generated SQL for schema history, and keep hand-edited SQL only when reviewed and intentionally curated.

| Migration | Status | Statements | Keywords | File |
|---|---|---:|---|---|
| 20260225_atheel_wave03_foundation | generated_or_curated | 52 | — | packages/db/prisma/migrations/20260225_atheel_wave03_foundation/migration.sql |
| 20260225_atheel_wave04_ai_foundation | generated_or_curated | 29 | — | packages/db/prisma/migrations/20260225_atheel_wave04_ai_foundation/migration.sql |
| 20260225_atheel_wave05_workflows500 | generated_or_curated | 9 | — | packages/db/prisma/migrations/20260225_atheel_wave05_workflows500/migration.sql |
| 20260225_atheel_wave06_runtime_workspace_programs | generated_or_curated | 16 | — | packages/db/prisma/migrations/20260225_atheel_wave06_runtime_workspace_programs/migration.sql |
| 20260226_atheel_wave08_creative_loop | generated_or_curated | 29 | — | packages/db/prisma/migrations/20260226_atheel_wave08_creative_loop/migration.sql |
| 20260226_atheel_wave09_twin | generated_or_curated | 35 | — | packages/db/prisma/migrations/20260226_atheel_wave09_twin/migration.sql |
| 20260226_atheel_wave10_twin_viewer_linking | generated_or_curated | 4 | — | packages/db/prisma/migrations/20260226_atheel_wave10_twin_viewer_linking/migration.sql |
| 20260226_atheel_wave11_approval_packets | generated_or_curated | 11 | — | packages/db/prisma/migrations/20260226_atheel_wave11_approval_packets/migration.sql |
| 20260226_wave13_innovation_engine | generated_or_curated | 43 | — | packages/db/prisma/migrations/20260226_wave13_innovation_engine/migration.sql |
| 20260227_atheel_wave26_competitions | generated_or_curated | 23 | — | packages/db/prisma/migrations/20260227_atheel_wave26_competitions/migration.sql |
| 20260227_atheel_wave27_competitions_page_refs_and_category_owners | generated_or_curated | 5 | — | packages/db/prisma/migrations/20260227_atheel_wave27_competitions_page_refs_and_category_owners/migration.sql |
| 20260227_atheel_wave29_obligations_and_official_connectors | generated_or_curated | 20 | — | packages/db/prisma/migrations/20260227_atheel_wave29_obligations_and_official_connectors/migration.sql |
| 20260227_atheel_wave30_radar_changes_notifications_balady_api | generated_or_curated | 26 | — | packages/db/prisma/migrations/20260227_atheel_wave30_radar_changes_notifications_balady_api/migration.sql |
| 20260227_atheel_wave31_engines_sectorcodes | generated_or_curated | 1 | — | packages/db/prisma/migrations/20260227_atheel_wave31_engines_sectorcodes/migration.sql |
| 20260227_atheel_wave32_experience_tables_and_owner_recommender | generated_or_curated | 18 | — | packages/db/prisma/migrations/20260227_atheel_wave32_experience_tables_and_owner_recommender/migration.sql |
| 20260227_atheel_wave33_iot_embeddings | generated_or_curated | 12 | — | packages/db/prisma/migrations/20260227_atheel_wave33_iot_embeddings/migration.sql |
| 20260227_atheel_wave39_pgvector_embeddings | generated_or_curated | 2 | — | packages/db/prisma/migrations/20260227_atheel_wave39_pgvector_embeddings/migration.sql |
| 20260228_atheel_wave43_governance_events_escalations_outbox | generated_or_curated | 68 | — | packages/db/prisma/migrations/20260228_atheel_wave43_governance_events_escalations_outbox/migration.sql |
| 20260228_atheel_wave45_routing_slo_incidents | generated_or_curated | 39 | — | packages/db/prisma/migrations/20260228_atheel_wave45_routing_slo_incidents/migration.sql |
| 20260228_atheel_wave46_incidents_multislo_fair_routing | generated_or_curated | 35 | — | packages/db/prisma/migrations/20260228_atheel_wave46_incidents_multislo_fair_routing/migration.sql |
| 20260228_wave47_heritage_access_protocols | generated_or_curated | 12 | — | packages/db/prisma/migrations/20260228_wave47_heritage_access_protocols/migration.sql |
| 20260228_wave48_public_heritage_fulltext_compliance_season_programs | generated_or_curated | 16 | — | packages/db/prisma/migrations/20260228_wave48_public_heritage_fulltext_compliance_season_programs/migration.sql |
| 20260228_wave55_auth_refresh_sessions_policy | generated_or_curated | 21 | — | packages/db/prisma/migrations/20260228_wave55_auth_refresh_sessions_policy/migration.sql |
| 20260303_atheel_wave58_service_outbox_exports_jobs | generated_or_curated | 23 | — | packages/db/prisma/migrations/20260303_atheel_wave58_service_outbox_exports_jobs/migration.sql |
| 20260303_wave56_capabilities_packs | generated_or_curated | 15 | — | packages/db/prisma/migrations/20260303_wave56_capabilities_packs/migration.sql |
| 20260307_wave83_wave86_prisma_promotion | generated_or_curated | 9 | — | packages/db/prisma/migrations/20260307_wave83_wave86_prisma_promotion/migration.sql |

## Blocking set
- None