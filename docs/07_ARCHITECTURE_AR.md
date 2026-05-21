# المعمارية الحالية لمنصة أَثِيل

> هذه الوثيقة تعكس المعمارية بعد موجات 91–122. الإطار التفصيلي الموسع موجود في
> `docs/architecture/WAVE121_ARCHITECTURE_BLUEPRINT_AR.md` و
> `docs/architecture/WAVE122_MASTER_TECHNICAL_BLUEPRINT_AR.md`.

## 1) النمط
Modular Monolith مع حدود وحدات صلبة، وقابلية استخراج الخدمات.
بدأت رحلة الاستخراج فعلياً عبر:
- `apps/exports-svc` (microservice مستقل لتوليد PDF/PPTX/ZIP)
- `apps/worker` (BullMQ worker مستقل عن API)

## 2) الوحدات الأساسية
- Projects
- Content
- Experiences
- Approvals / Attachments / Audit Logs
- AI Kernel (Vector + RAG + Agent)
- Twin Kernel (Digital Twin + TwinSpec + Simulation)
- Heritage / Destination / Mega-Events brains
- Governance + RBAC + Policy + DTO Validation
- Exports (renderer + dispatcher + object store)
- Knowledge Spine (PACKAGE02 + RAG packs)

## 3) الطبقات والبنية التحتية
- Web: Next.js App Router (`apps/web`)
- API: NestJS (`apps/api`) — ~75 module، ~546 endpoint
- DB: PostgreSQL + Prisma (~125 model، ~240 index)
- Cache/Queue: Redis + BullMQ (11 queue)
- Message Bus / Channels: RabbitMQ (Wave59 ClientProxy)
- Object Store: MinIO/S3 (Wave60–61)
- Vector: pgvector + Embeddings (Wave33)
- Worker: `apps/worker` للوظائف غير المتزامنة
- Exports: `apps/exports-svc`
- Observability: Tracing + Queue metrics + DLQ inspection

## 4) ركائز Wave-by-Wave

### 4.1 Vector RAG (Wave33)
- استرجاع lexical / vector / hybrid عبر `/api/ai/rag/query`.
- Embeddings تُخزَّن في `KnowledgeChunkEmbedding` (إما JSON أو pgvector).
- إعادة بناء عبر `/api/ai/knowledge/reembed`.
- يدعم vLLM كمزوّد embeddings (متغيرات `VLLM_*`).

### 4.2 TwinSpec (Wave34)
- طبقة مواصفة موحدة تجمع مخرجات الاستديوهات (تشغيلي، إبداعي، سردي، أمني/امتثال).
- `POST /api/twinspec` للتجميع، `POST /api/twinspec/:id/publish` للنشر إلى Twin graph وتشغيل سيناريوهات اختياريّة.

### 4.3 Exports Microservice (Wave57–61)
- خدمة مستقلة `apps/exports-svc` تولّد PDF/PPTX/ZIP.
- Wave58: Service Outbox + Idempotency.
- Wave59: ClientProxy channel فوق RabbitMQ بين API و exports-svc.
- Wave60: Object Store pointers بدل base64 في الردود.
- Wave61: Driver فعلي لـ MinIO/S3.
- المراجع: `docs/adr/ADR-006..009` و `docs/release/WAVE57..61`.

### 4.4 Runtime Hardening (Wave91–114)
- Wave91: Runtime foundation.
- Wave92: Policy + Audit boundary.
- Wave93–96: Application services normalization، domain extension، mutation contract، response contract، repository boundaries.
- Wave97: Outbox + transaction consistency.
- Wave98: Experience async closure.
- Wave99: Worker-backed twin sync queue.
- Wave103–115: Type-risk audit, hotspot reduction, monorepo package closure, app shell closure, repo diet.

### 4.5 Queue Observability (Wave100–102)
- Wave100: queue observability + runtime closure.
- Wave101: trace propagation عبر الاستدعاءات غير المتزامنة.
- Wave102: dead-letter inspection + replay closure (خصوصاً لـ experience twin sync).

## 5) مبادئ المعمارية
- Multi-tenancy عبر RLS (Wave56 defense-in-depth).
- Boundary-rules صلبة بين الوحدات (`docs/engineering/BOUNDARY_RULES_AR.md`).
- استبدالية بين DataStore التجريبي و Prisma — اليوم تم ترحيل الكتلة الأكبر إلى Prisma-only (راجع `docs/closure/MIGRATION_EXECUTION_TRUTH.md`).
- AI Governance قابلة للتدقيق: audit-logs لكل طلب AI + retention قابلة للضبط.
- Observability: OpenTelemetry + DLQ + queue metrics.

## 6) قابلية الاستخراج
المخطط الحالي يتيح فصل الوحدات التالية كخدمات مستقلة عند الحاجة:
- Exports (مفصول فعلياً)
- Worker (مفصول فعلياً)
- AI Kernel + Embeddings (مُهيأ للفصل)
- Twin Kernel + Simulation (مُهيأ للفصل)
- Heritage / Destination / Mega-Events brains (مُهيأة للفصل عبر API gateway داخلي)

## 7) المراجع الفعّالة
- ADR: `docs/adr/`
- Runbooks: `docs/runbooks/`
- Architecture deep dives: `docs/architecture/`
- Closure artifacts: `docs/closure/`
