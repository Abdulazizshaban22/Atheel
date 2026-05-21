# فهرس وثائق منصة أَثِيل

> الفهرس الرسمي الموحّد. يحدّث مع كل موجة جديدة. آخر مراجعة: بعد Wave 122.

## 1) Living docs (المراجع الحيّة)

| المحور | المسار |
|--------|--------|
| المعمارية | `docs/07_ARCHITECTURE_AR.md` |
| قاعدة البيانات | `docs/08_DATABASE_MAP_AR.md` |
| التشغيل المحلي | `docs/09_RUNBOOK_LOCAL_DEV_AR.md` |
| متتبع التقدم | `docs/PROGRESS_TRACKER_AR.md` |
| RBAC | `docs/12_RBAC_PLAN_AR.md` |
| AI Governance | `docs/13_AI_GOVERNANCE_AR.md` |
| Data Migration Strategy | `docs/17_DATA_MIGRATION_STRATEGY_AR.md` |
| UX Copy Guide | `docs/18_UX_COPY_GUIDE_AR.md` |
| Security Baseline | `docs/19_SECURITY_BASELINE_AR.md` |
| Go-to-Market | `docs/20_GO_TO_MARKET_AR.md` |
| Frontend Execution Map | `docs/26_FRONTEND_EXECUTION_MAP_NEXTJS_AR.md` |
| AI Runtime (LLM + RAG + Agent + vLLM) | `docs/29_AI_RUNTIME_LLM_RAG_AGENT_VLLM_ENABLEMENT_AR.md` |
| Saudi Culture Deep Pack | `docs/34_SAUDI_CULTURE_DEEP_PACK_AR.md` |
| Observability Runbook | `docs/52_RUNBOOK_OBSERVABILITY_AR.md` |
| Tenant RLS Defense-in-Depth | `docs/56_TENANT_RLS_DEFENSE_IN_DEPTH_AR.md` |
| Platform Operator + Microservice-ready | `docs/56_PLATFORM_OPERATOR_AND_MICROSERVICE_READY_AR.md` |
| Global Unification + Orchestration | `docs/99_GLOBAL_UNIFICATION_AND_ORCHESTRATION_AR.md` |
| Production Readiness | `docs/PRODUCTION_READINESS_AR.md` |
| Build Stabilization | `docs/BUILD_STABILIZATION.md` |
| Boundary Rules | `docs/engineering/BOUNDARY_RULES_AR.md` |

## 2) PRDs & Specs

| المحور | المسار |
|--------|--------|
| PRD V1 (تاريخي + امتدادات) | `docs/21_PRD_DETAILED_V1_ATHEEL_AR.md` |
| Wireframes | `docs/02_WIREFRAMES_AR.md` |
| Service Catalog (Sales) | `docs/03_SERVICE_CATALOG_SALES_AR.md` |
| Pricing Packages | `docs/04_PRICING_PACKAGES_AR.md` |
| Brand & Product Architecture | `docs/24_ATHEEL_BRAND_PRODUCT_ARCHITECTURE_AR.md` |
| Gov-Ready Messaging | `docs/25_ATHEEL_GOV_READY_MESSAGING_AR.md` |
| Competitor Matrix Weighted | `docs/22_COMPETITOR_MATRIX_WEIGHTED_ATHEEL_AR.csv` |
| Competitor Scoring Methodology | `docs/23_COMPETITOR_SCORING_METHODOLOGY_ATHEEL_AR.md` |
| Competitor Evidence Sources | `docs/27_COMPETITOR_EVIDENCE_SOURCES_NOTES_ATHEEL_AR.md` |
| V0.3 Database Columns Overview | `docs/28_V03_DATABASE_COLUMNS_OVERVIEW_ATHEEL_AR.md` |

## 3) Architecture deep dives (Wave121–122)

| المحور | المسار |
|--------|--------|
| Modular → Microservices transition | `docs/architecture/ARCH_MODULAR_TO_MICROSERVICES_AR.md` |
| Wave121 Architecture Blueprint | `docs/architecture/WAVE121_ARCHITECTURE_BLUEPRINT_AR.md` |
| Wave121 Executive Technical Framing | `docs/architecture/WAVE121_EXECUTIVE_TECHNICAL_FRAMING_AR.md` |
| Wave121 Product Scope | `docs/architecture/WAVE121_PRODUCT_SCOPE_AR.md` |
| Wave121 Technical Decisions | `docs/architecture/WAVE121_TECHNICAL_DECISIONS_AR.md` |
| Wave122 Delivery Waves | `docs/architecture/WAVE122_DELIVERY_WAVES_AR.md` |
| Wave122 Master Technical Blueprint | `docs/architecture/WAVE122_MASTER_TECHNICAL_BLUEPRINT_AR.md` |

## 4) Runbooks (تشغيل + dispatch + storage)

| المحور | المسار |
|--------|--------|
| Local Dev | `docs/runbooks/RUNBOOK_LOCAL_DEV_AR.md` |
| Exports Reliable Dispatch | `docs/runbooks/RUNBOOK_EXPORTS_RELIABLE_DISPATCH_AR.md` |
| Wave59 RabbitMQ Channel | `docs/runbooks/RUNBOOK_WAVE59_RMQ_AR.md` |
| Wave60 Object Store | `docs/runbooks/RUNBOOK_WAVE60_OBJECT_STORE_AR.md` |
| Wave61 MinIO/S3 | `docs/runbooks/RUNBOOK_WAVE61_MINIO_S3_OBJECT_STORE_AR.md` |
| Wave122 Local Bootstrap + Handoff | `docs/runbooks/WAVE122_LOCAL_BOOTSTRAP_AND_HANDOFF_AR.md` |

## 5) ADRs (قرارات معمارية)

| الرقم | المحور | المسار |
|------|--------|--------|
| ADR-006 | Wave58 Service Outbox + Idempotency للتصدير | `docs/adr/ADR-006_WAVE58_ServiceOutbox_Exports_AR.md` |
| ADR-007 | Wave59 ClientProxy Channel للتصدير | `docs/adr/ADR-007_WAVE59_Exports_Channel_ClientProxy_AR.md` |
| ADR-008 | Wave60 Object Store pointers بدل base64 | `docs/adr/ADR-008_WAVE60_ObjectStore_Pointers_AR.md` |
| ADR-009 | Wave61 MinIO/S3 Driver | `docs/adr/ADR-009_WAVE61_MinIO_S3_ObjectStore_AR.md` |

## 6) Database governance

| المحور | المسار |
|--------|--------|
| Migration Policy | `docs/database/MIGRATION_POLICY.md` |
| Prisma Baseline Runbook | `docs/database/PRISMA_BASELINE_RUNBOOK.md` |
| Stage Migrate Deploy Rehearsal | `docs/database/STAGE_MIGRATE_DEPLOY_REHEARSAL.md` |

## 7) Closure artifacts (Pre-prod truth)

| المحور | المسار |
|--------|--------|
| Documentation Pack | `docs/closure/DOCUMENTATION_PACK.md` |
| Definition of Done | `docs/closure/DEFINITION_OF_DONE.md` |
| Implementation Summary | `docs/closure/IMPLEMENTATION_SUMMARY.md` |
| Implementation Status Matrix | `docs/closure/IMPLEMENTATION_STATUS_MATRIX.md` |
| Truth Matrix | `docs/closure/TRUTH_MATRIX.md` |
| DataStore Usage Inventory | `docs/closure/DATASTORE_USAGE_INVENTORY.md` |
| Placeholder Migrations | `docs/closure/PLACEHOLDER_MIGRATIONS.md` |
| Endpoint Inventory | `docs/closure/ENDPOINT_INVENTORY.md` |
| Module Boundary Audit | `docs/closure/MODULE_BOUNDARY_AUDIT.md` |
| Worker Contracts | `docs/closure/WORKER_CONTRACTS.md` |
| Staging Dress Rehearsal | `docs/closure/STAGING_DRESS_REHEARSAL.md` |
| Stage Deploy Execution Log | `docs/closure/STAGE_DEPLOY_EXECUTION_LOG.md` |
| Migration Closure Readiness | `docs/closure/MIGRATION_CLOSURE_READINESS.md` |
| Migration Execution Truth | `docs/closure/MIGRATION_EXECUTION_TRUTH.md` |
| Final Readiness Review | `docs/closure/FINAL_READINESS_REVIEW.md` |
| Sales Demo Pack | `docs/closure/SALES_DEMO_PACK.md` |

## 8) Wave history (تقارير الموجات الحالية بعد Wave 90)

ملفات `docs/WAVE91..WAVE115_*.md` تحتوي تفاصيل كل موجة. أيضاً:
- `docs/WAVE77_PERSISTENCE_AND_E2E.md`
- `docs/WAVE78_WAVE82_INTELLIGENCE_GOV_SIM_STUDIO.md`
- `docs/WAVE87_ENGINEERING_HARDENING_AR.md`
- `docs/WAVE88_REAL_EXECUTION_AR.md`
- `docs/WAVE89_READINESS_QUEUE_HEALTH_AR.md`
- `docs/WAVE90_EXECUTION_STATUS_AR.md`

موجات Wave1–50 منقولة إلى: `docs/archive/waves-1-50/`.

## 9) Release notes

| المحور | المسار |
|--------|--------|
| Wave56 Capabilities Microservice-Ready | `docs/release/WAVE56_CAPABILITIES_MICROSERVICE_READY_AR.md` |
| Wave57 Exports Renderer Microservice | `docs/release/WAVE57_EXPORTS_RENDERER_MICROSERVICE_AR.md` |
| Wave58 Outbox Exports Polish Final | `docs/release/WAVE58_OUTBOX_EXPORTS_POLISH_FINAL_AR.md` |
| Wave59 ClientProxy Channel | `docs/release/WAVE59_CLIENTPROXY_CHANNEL_AR.md` |
| Wave60 Object Store Pointers | `docs/release/WAVE60_OBJECT_STORE_POINTERS_AR.md` |
| Wave61 MinIO/S3 Object Store | `docs/release/WAVE61_MINIO_S3_OBJECT_STORE_AR.md` |
| Wave122 Architecture Baseline + Shell Refactor | `docs/release/WAVE122_ARCHITECTURE_BASELINE_AND_SHELL_REFACTOR_AR.md` |
| AI Production Closure Batch | `docs/release/AI_PRODUCTION_CLOSURE_BATCH.md` |
| AI Runtime E2E Closure Expansion | `docs/release/AI_RUNTIME_E2E_CLOSURE_EXPANSION.md` |
| AI Runtime Execution Closure Finalizer | `docs/release/AI_RUNTIME_EXECUTION_CLOSURE_FINALIZER.md` |
| AI Runtime Execution Closure Next | `docs/release/AI_RUNTIME_EXECUTION_CLOSURE_NEXT.md` |
| Batch Final Closure | `docs/release/BATCH_FINAL_CLOSURE.md` |
| Batch AI Runtime Enterprise | `docs/release/BATCH_AI_RUNTIME_ENTERPRISE.md` |
| Batch Runtime Closure Run | `docs/release/BATCH_RUNTIME_CLOSURE_RUN.md` |
| Batch Runtime Execution Findings | `docs/release/BATCH_RUNTIME_EXECUTION_FINDINGS.md` |
| Batch Runtime Verification Next | `docs/release/BATCH_RUNTIME_VERIFICATION_NEXT.md` |
| Package01–11 Closure series | `docs/release/PACKAGE0[1-9]_*.md`, `docs/release/PACKAGE1[01]_*.md` |
| BatchB Culture Programs (15–17) | `docs/release/BATCHB_PACKAGE15_17_CULTURE_PROGRAMS.md` |
| BatchC Urban Experience (18–20) | `docs/release/BATCHC_PACKAGE18_20_URBAN_EXPERIENCE.md` |

## 10) Packages & Programs (PACKAGE01–11)

ملفات `docs/PACKAGE01_*..PACKAGE11_*.md` تحتوي تخطيط الحزم الإنتاجية حسب المسار:
- Production Closure Foundation
- Knowledge Spine Core
- Domain Brain Foundation
- Heritage / Destination / Mega-Events Brains + Ingestion + Vector Retrieval Evals

## 11) قواعد إدارة الفهرس
- أي وثيقة جديدة تُضاف هنا مع وصف سطر واحد ومسار كامل.
- الموجات بعد Wave90 تبقى في `docs/WAVE*_*.md`.
- موجات Wave1–50 تذهب إلى `docs/archive/waves-1-50/`.
- الـ Runbooks الجديدة تذهب إلى `docs/runbooks/`.
- ADRs الجديدة تذهب إلى `docs/adr/` بصيغة `ADR-XXX_WAVEYY_TITLE_AR.md`.
- Release notes الجديدة تذهب إلى `docs/release/`.
