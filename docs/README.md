# فهرس وثائق منصة أَثِيل

هذا المجلد هو المرجع الرسمي للتوثيق. الهدف أن يكون الوصول سريعًا وأن تكون الوثائق قابلة للتشغيل وليس مجرد شرح نظري.

## 1) وثائق سريعة البدء
- التشغيل المحلي: docs/runbooks/RUNBOOK_LOCAL_DEV_AR.md
- تشغيل خدمة التصدير المستقلة: docs/runbooks/RUNBOOK_EXPORTS_RELIABLE_DISPATCH_AR.md
- تشغيل قناة RabbitMQ للتصدير Wave59: docs/runbooks/RUNBOOK_WAVE59_RMQ_AR.md
- تشغيل Object Store للمخرجات Wave60: docs/runbooks/RUNBOOK_WAVE60_OBJECT_STORE_AR.md
- تشغيل MinIO (S3-compatible) للمخرجات Wave61: docs/runbooks/RUNBOOK_WAVE61_MINIO_S3_OBJECT_STORE_AR.md

## 2) معمارية المنصة
- نظرة عامة على المعمارية: 07_ARCHITECTURE_AR.md
- انتقال المنصة من Monolith منظم إلى خدمات قابلة للاستخراج: docs/architecture/ARCH_MODULAR_TO_MICROSERVICES_AR.md

## 3) قرارات هندسية ADR
- ADR-006: Wave58 موثوقية التصدير عبر Service Outbox و Idempotency: docs/adr/ADR-006_WAVE58_ServiceOutbox_Exports_AR.md
- ADR-007: Wave59 قناة ClientProxy بين API و exports-svc: docs/adr/ADR-007_WAVE59_Exports_Channel_ClientProxy_AR.md
- ADR-008: Wave60 مؤشرات Object Store بدل base64: docs/adr/ADR-008_WAVE60_ObjectStore_Pointers_AR.md
- ADR-009: Wave61 Driver MinIO/S3 لـ Object Store: docs/adr/ADR-009_WAVE61_MinIO_S3_ObjectStore_AR.md

## 3.5) موجات التأسيس الأخيرة
- Wave91: Runtime foundation hardening: docs/WAVE91_RUNTIME_FOUNDATION_AR.md
- Wave92: Policy and audit boundary hardening: docs/WAVE92_POLICY_AUDIT_BOUNDARY_AR.md
- Wave93: Core application service normalization: docs/WAVE93_CORE_APPLICATION_SERVICES_AR.md
- Wave94: Core domain extension: docs/WAVE94_CORE_DOMAIN_EXTENSION_AR.md
- Wave95: Mutation contract and resource catalog hardening: docs/WAVE95_MUTATION_CONTRACT_RESOURCE_CATALOG_AR.md
- Wave96: Repository boundaries and response contract hardening: docs/WAVE96_REPOSITORY_BOUNDARIES_RESPONSE_CONTRACT_AR.md
- Wave97: Outbox and transaction consistency hardening: docs/WAVE97_OUTBOX_TRANSACTION_CONSISTENCY_AR.md
- Wave98: Experience and async closure hardening: docs/WAVE98_EXPERIENCE_ASYNC_CLOSURE_AR.md
- Wave99: Worker-backed twin sync queue: docs/WAVE99_WORKER_BACKED_TWIN_SYNC_QUEUE_AR.md
- Wave100: Queue observability and runtime closure: docs/WAVE100_QUEUE_OBSERVABILITY_RUNTIME_CLOSURE_AR.md
- Wave101: Trace propagation and async diagnostics hardening: docs/WAVE101_TRACE_PROPAGATION_ASYNC_DIAGNOSTICS_AR.md

## 4) الإصدارات Release Notes
- Wave56: Capability Packs: docs/release/WAVE56_CAPABILITIES_MICROSERVICE_READY_AR.md
- Wave57: Exports Renderer Microservice: docs/release/WAVE57_EXPORTS_RENDERER_MICROSERVICE_AR.md
- Wave58: Outbox للتصدير + صقل الستراكتشر: docs/release/WAVE58_OUTBOX_EXPORTS_POLISH_FINAL_AR.md
- Wave59: ClientProxy Channel للتصدير: docs/release/WAVE59_CLIENTPROXY_CHANNEL_AR.md
- Wave60: Object Store pointers للمخرجات: docs/release/WAVE60_OBJECT_STORE_POINTERS_AR.md
- Wave61: MinIO/S3 Object Store Driver: docs/release/WAVE61_MINIO_S3_OBJECT_STORE_AR.md

## 5) وثائق المنتج والبيع
- PRD: 01_PRD_MVP_AR.md
- Wireframes: 02_WIREFRAMES_AR.md
- كتالوج الخدمات: 03_SERVICE_CATALOG_SALES_AR.md
- الباقات والتسعير: 04_PRICING_PACKAGES_AR.md

## 6) وثائق الذكاء الاصطناعي والمعرفة
- تشغيل نماذج LLM و RAG والوكلاء: 29_AI_RUNTIME_LLM_RAG_AGENT_VLLM_ENABLEMENT_AR.md

## 7) مخططات التنفيذ
- خطة 90 يوم: 10_IMPLEMENTATION_PLAN_90D_AR.md

ملاحظة تنظيمية: أي وثيقة جديدة يجب أن تُضاف إلى هذا الفهرس مع وصف سطر واحد، وأن يكون لها اسم واضح غير معتمد على أرقام فقط.

- WAVE102: dead-letter inspection and replay closure for experience twin sync.

- [Wave 103 — Baseline Stabilization and Parse-Closure](./WAVE103_BASELINE_STABILIZATION_COMPILE_CLOSURE_AR.md)

- Wave104: Type-risk audit and request typing hardening: docs/WAVE104_TYPE_RISK_AND_REQUEST_TYPING_AR.md

- Wave105: targeted any-reduction in experiences and queue core: docs/WAVE105_TARGETED_ANY_REDUCTION_AR.md

- Wave106: typecheck audit sprint and compile visibility: docs/WAVE106_TYPECHECK_AUDIT_SPRINT_AR.md

- Wave107: hotspot reduction, workspace path resolution, and module export cleanup.

- Wave108: second hotspot sprint + external audit stubs + typed closure for risks/visitor-guide/worker/content/projects/otel.


- Wave109: compile closure sprint + repo diet + نقل الملفات المتولدة إلى .artifacts/audit.
- Wave110: Interceptor/guard closure, shared package typing cleanup, and repo artifact diet continuation.

- Wave111: repository closure sprint + repo diet continuation + deletion of redundant/generated files.

- WAVE112_API_TYPECHECK_CLOSURE_AND_REPO_DIET_AR.md

- Wave113: monorepo package closure sprint + package tsconfig references + package audit/build cleanup.
- Wave114: توسيع إغلاق الحزم المشتركة إلى كامل نواة packages وربطها بسكربت تحقق موحد.

- Wave115: app shell closure audit for worker bootstrap, exports-svc shell, and web shell + shared app audit globals + repo diet for obsolete verify scripts.
