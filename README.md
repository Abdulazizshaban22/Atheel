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
