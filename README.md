# منصة أَثِيل — حزمة التأسيس البرمجي والمنتجي

حزمة تأسيس لمشروع منصة ثقافية سعودية هجينة:
- SaaS + استوديو خدمات ثقافية إبداعية
- إدارة المشاريع الثقافية
- إدارة المحتوى الثقافي
- إدارة التجارب الثقافية وتجربة الزائر
- الذكاء الثقافي والتحليلات
- قاعدة قابلة للتوسع نحو التراث العمراني والميتافيرس الثقافي

## المحتويات
- apps/web (Next.js App Router)
- apps/api (NestJS API)
- packages/shared (أنواع وخوارزميات أولية)
- packages/db (Prisma schema + PrismaService)
- docs (PRD, Wireframes, تسعير, منافسين, تشغيل, هوية المنتج)
- infra (Docker Compose)
- release (ملفات التسليم النهائية والملخصات)

## تشغيل سريع
1. `cp .env.example .env`
2. `docker compose -f infra/docker-compose.dev.yml up -d`
3. `pnpm install`
4. `pnpm db:generate`
5. `pnpm dev`

## ملاحظة مهمة
الاسم الداخلي لبعض الحزم ما زال `@madar/*` داخل الكود كمرحلة انتقالية تقنية، بينما الهوية التجارية في هذه الحزمة هي أَثِيل.


## ATheel v0.3 Foundation Upgrade
- Prisma schema expanded for approvals / attachments / audit logs / auth hashes
- Auth endpoints now support login + refresh + logout + me
- New modules: users, approvals, attachments, audit-logs
- Seed + migration placeholder added
- Web pages added: /users /approvals /attachments

## Wave28 — تغذية معيارية + تصنيف سعودي + استيراد أبحاث
- حزم معرفة جاهزة لتغذية قاعدة المعرفة (RAG): /knowledge-packs
- توسيع تصنيف الرادار ليشمل القطاعات الثقافية 16 لوزارة الثقافة (Sector taxonomy)
- استيراد بحث من رابط (SDL/MDPI وغيرها) مع التقاط metadata + إدخال تلقائي للمعرفة: /research/import/from-url
- مصفوفة امتثال تلقائية من الكراسة (سلامة/استدامة/تراخيص) مع مرجعية الصفحة داخل تصدير نطاق الاستوديو

## Wave29 — موصلات رادار رسمية إضافية + التزامات الامتثال
- توسيع الرادار ليشمل موصلات رسمية إضافية: balady + rcrc_opendata + etimad_api (بتمرير endpoint عبر env عند توفره)
- تحويل مصفوفة الامتثال إلى التزامات فعلية قابلة للتتبع: مالك، موعد، حالة، تذكيرات مجدولة عبر BullMQ
- توثيق الإعدادات في docs/30_WAVE29_OFFICIAL_CONNECTORS_OBLIGATIONS_AR.md


## Wave33 — Vector RAG + vLLM Embeddings + IoT Telemetry + Twin Import
### 1) Vector RAG فعلي
- أثناء تغذية المعرفة عبر /api/ai/knowledge/ingest يمكن تفعيل embedNow لتوليد Embeddings (إن كان vLLM مفعّل)
- تخزين Embeddings في جدول KnowledgeChunkEmbedding (JSON array) لتفعيل استرجاع Vector/Hybrid
- استعلام RAG الآن يدعم strategy: lexical | vector | hybrid عبر /api/ai/rag/query

### 2) إعادة بناء Embeddings
- /api/ai/knowledge/reembed لإعادة توليد embeddings لمستند/مشروع/منظمة مع force

### 3) IoT
- إدارة أجهزة القياس: /api/iot/devices
- تدوير مفتاح الجهاز: /api/iot/devices/:id/rotate-key
- استقبال Telemetry: /api/iot/ingest (headers: x-device-id + x-device-key)
- Telemetry تُحوّل تلقائيا إلى TwinTelemetryEvent لتغذية التوأم 4D

### 4) Import من الكراسة إلى التوأم
- /api/twin/:twinId/import/competition/:competitionId
يحول Zones + JourneySteps إلى Nodes/Edges ويضيف Layer مرجعي للخطة التشغيلية

### متغيرات البيئة المهمة
- VLLM_BASE_URL مثال: http://localhost:8000
- VLLM_MODEL_NAME مثال: Qwen/Qwen2.5-7B-Instruct
- (اختياري) VLLM_API_KEY أو VLLM_API_KEY_ENV


## Wave34 — TwinSpec موحد لتحويل مخرجات الاستوديوهات تلقائيًا
- إضافة TwinSpec كطبقة مواصفة موحدة تجمع مخرجات:
  - الاستوديو التشغيلي (Experience Tables من المنافسات)
  - الاستوديو الإبداعي (Vault Ideas)
  - الاستوديو السردي (Narrative Drafts)
  - الاستوديو الأمني والامتثال (Risks + Obligations)
- إنشاء API جديد:
  - POST /api/twinspec (compile + save)
  - POST /api/twinspec/:id/publish (apply to Twin graph + optional scenario simulations)
- إضافة صفحة Web:
  - /twinspec

## Wave57: Exports Renderer Service

لتوليد ملفات PDF/PPTX/ZIP خارج الـ API الأساسي:
- أضف في `.env` قيمة `EXPORTS_RENDERER_TOKEN`
- شغّل: `pnpm --filter @madar/exports-svc dev`
- الـ API سيستدعي `EXPORTS_RENDERER_URL` تلقائيًا عند تشغيل Jobs

---

## جدول الموجات الرئيسية (مرجع سريع)

| الموجة | المحور | المرجع |
|--------|--------|--------|
| Wave29 | موصلات رادار رسمية + التزامات الامتثال | docs/archive/waves-1-50/ |
| Wave31 | محركات (Engines) | docs/archive/waves-1-50/ |
| Wave32 | جداول التجربة (Experience Tables) | docs/archive/waves-1-50/ |
| Wave33 | Vector RAG + vLLM Embeddings + IoT + Twin Import | README §Wave33 + docs/07_ARCHITECTURE_AR.md |
| Wave34 | TwinSpec موحّد | README §Wave34 + docs/07_ARCHITECTURE_AR.md |
| Wave56 | Capability Packs / Microservice-ready | docs/release/WAVE56_*.md |
| Wave57 | Exports Renderer Microservice | docs/release/WAVE57_*.md |
| Wave58 | Service Outbox للتصدير | docs/adr/ADR-006_*.md |
| Wave59 | ClientProxy Channel (RabbitMQ) | docs/adr/ADR-007_*.md |
| Wave60 | Object Store pointers بدل base64 | docs/adr/ADR-008_*.md |
| Wave61 | MinIO/S3 Driver للـ Object Store | docs/adr/ADR-009_*.md |
| Wave91 | Runtime foundation hardening | docs/WAVE91_*.md |
| Wave92 | Policy + Audit boundary | docs/WAVE92_*.md |
| Wave93–96 | Application services + domain + contracts + repositories | docs/WAVE93..96_*.md |
| Wave97 | Outbox + transaction consistency | docs/WAVE97_*.md |
| Wave98 | Experience async closure | docs/WAVE98_*.md |
| Wave99 | Worker-backed twin sync queue | docs/WAVE99_*.md |
| Wave100 | Queue observability | docs/WAVE100_*.md |
| Wave101 | Trace propagation | docs/WAVE101_*.md |
| Wave102 | Dead-letter replay | docs/WAVE102_*.md |
| Wave103–115 | Type-risk + hotspot + monorepo closure + repo diet | docs/WAVE103..115_*.md |
| Wave121 | Architecture blueprint + executive framing | docs/architecture/WAVE121_*.md |
| Wave122 | Architecture baseline + shell refactor + delivery waves | docs/architecture/WAVE122_*.md, docs/runbooks/WAVE122_LOCAL_BOOTSTRAP_*.md |

> آخر موجة معتمدة: **Wave 122** — Master Technical Blueprint + Shell Refactor.

## المراجع المركزية للوثائق
- فهرس الوثائق: `docs/INDEX_AR.md`
- المعمارية: `docs/07_ARCHITECTURE_AR.md`
- قاعدة البيانات: `docs/08_DATABASE_MAP_AR.md`
- التشغيل المحلي: `docs/09_RUNBOOK_LOCAL_DEV_AR.md`
- متتبع التقدم: `docs/PROGRESS_TRACKER_AR.md`
- إقفال الإنتاج: `docs/closure/`
- ADRs: `docs/adr/`
