# File Changelog — أَثِيل v0.3 (ملفًا بملف)

## Modified
- apps/api/src/main.ts — تسجيل Global exception filter موحد للأخطاء
- apps/api/src/modules/health/health.controller.ts — تحويل health إلى overview/live/ready/startup
- apps/api/src/modules/health/health.module.ts — إضافة HealthService + PlatformRuntimeService وربط Prisma/Queue

## Added (Runtime Foundation)
- apps/api/src/common/http/api-exception.filter.ts
- apps/api/src/common/runtime/platform-runtime.service.ts
- apps/api/src/modules/health/health.service.ts
- apps/api/test/runtime-foundation.e2e-spec.ts
- docs/WAVE91_RUNTIME_FOUNDATION_AR.md


## Modified
- .env.example — إضافة متغيرات Auth/Refresh/Uploads
- package.json — إضافة أوامر db:migrate:dev و db:seed
- packages/db/package.json — سكربتات Prisma migrate/seed + prisma.seed config
- packages/db/prisma/schema.prisma — توسعة النماذج والجداول (User/Auth/Audit/Approvals/Attachments)
- apps/api/src/app.module.ts — تسجيل الوحدات الجديدة
- apps/api/src/main.ts — رفع إصدار Swagger إلى 0.3.0
- apps/api/src/modules/auth/auth.service.ts — hash + refresh token + logout + fallback persistence
- apps/api/src/modules/auth/auth.controller.ts — endpoints جديدة refresh/logout
- apps/api/src/modules/data-store/data-store.service.ts — كيانات Users/Attachments/Approvals/AuditLogs
- apps/web/lib/api.ts — دعم FormData وطلبات multipart
- apps/web/app/login/page.tsx — دعم refresh/logout + روابط للوحدات الجديدة
- apps/web/app/projects/page.tsx — تحويل الصفحة إلى مدخل تشغيلي مع روابط API modules
- apps/web/app/content/page.tsx — تحويل الصفحة إلى مدخل تشغيلي
- apps/web/app/experiences/page.tsx — تحويل الصفحة إلى مدخل تشغيلي
- docs/11_API_ENDPOINT_CATALOG_AR.md — فهرس محدث يشمل v0.3 endpoints
- release/CHECKLIST_LOCAL_RUN_AR.md — تحديث شامل لأوامر Prisma/تشغيل محلي
- release/FRONTEND_NEXTJS_ROADMAP_AR.md — خارطة v0.4 محدثة
- release/FINAL_DELIVERY_SUMMARY_AR.md — ملخص v0.3 النهائي
- release/FILE_CHANGELOG_AR.md — هذا الملف

## Added (Database)
- packages/db/prisma/seed.ts — بيانات seed تجريبية
- packages/db/prisma/migrations/20260225_atheel_wave03_foundation/migration.sql — placeholder migration

## Added (API Modules)
- apps/api/src/modules/auth/dto/refresh-token.dto.ts
- apps/api/src/modules/auth/dto/logout.dto.ts
- apps/api/src/modules/users/users.module.ts
- apps/api/src/modules/users/users.controller.ts
- apps/api/src/modules/users/users.service.ts
- apps/api/src/modules/users/dto/create-user.dto.ts
- apps/api/src/modules/users/dto/update-user.dto.ts
- apps/api/src/modules/users/dto/query-users.dto.ts
- apps/api/src/modules/audit-logs/audit-logs.module.ts
- apps/api/src/modules/audit-logs/audit-logs.controller.ts
- apps/api/src/modules/audit-logs/audit-logs.service.ts
- apps/api/src/modules/audit-logs/dto/create-audit-log.dto.ts
- apps/api/src/modules/audit-logs/dto/query-audit-logs.dto.ts
- apps/api/src/modules/approvals/approvals.module.ts
- apps/api/src/modules/approvals/approvals.controller.ts
- apps/api/src/modules/approvals/approvals.service.ts
- apps/api/src/modules/approvals/dto/create-approval.dto.ts
- apps/api/src/modules/approvals/dto/query-approvals.dto.ts
- apps/api/src/modules/approvals/dto/decision.dto.ts
- apps/api/src/modules/attachments/attachments.module.ts
- apps/api/src/modules/attachments/attachments.controller.ts
- apps/api/src/modules/attachments/attachments.service.ts
- apps/api/src/modules/attachments/dto/link-attachment.dto.ts
- apps/api/src/modules/attachments/dto/query-attachments.dto.ts

## Added (Web)
- apps/web/app/users/page.tsx
- apps/web/app/approvals/page.tsx
- apps/web/app/attachments/page.tsx

## Added (Docs)
- docs/28_V03_DATABASE_COLUMNS_OVERVIEW_ATHEEL_AR.md


## Wave92 — Policy and Audit Boundary Hardening

### Added
- apps/api/src/common/audit/audit-action.decorator.ts — Decorator صريح لتحديد العمليات التي يجب أن تُسجل في Audit Trail
- apps/api/src/common/audit/audit-trail.interceptor.ts — Interceptor عالمي لتسجيل آثار التدقيق للعمليات المعلّمة فقط
- apps/api/src/common/http/request-tenant.util.ts — Utilities لاستخراج tenant hints واكتشاف التعارض بينها
- apps/api/test/policy-audit-boundary.e2e-spec.ts — اختبار E2E لتعارض tenant hints ولإنشاء audit تلقائي
- docs/WAVE92_POLICY_AUDIT_BOUNDARY_AR.md — توثيق موجة Wave92

### Updated
- apps/api/src/app.module.ts — تسجيل AuditTrailInterceptor كـ APP_INTERCEPTOR
- apps/api/src/modules/auth/guards/tenant.guard.ts — رفض organizationId المتعارض وتثبيت tenant context بشكل أوضح
- apps/api/src/modules/audit-logs/audit-logs.service.ts — إضافة recordAction وتضمين request context داخل fallback payload
- apps/api/src/modules/projects/projects.controller.ts — إضافة Policy + AuditAction للمسارات الأساسية
- apps/api/src/modules/content/content.controller.ts — إضافة Policy + AuditAction للمسارات الأساسية
- apps/api/src/modules/experiences/experiences.controller.ts — إضافة Policy + AuditAction للمسارات المؤثرة تشغيليًا
- apps/api/src/modules/approvals/approvals.controller.ts — إضافة AuditAction لمسارات القرار والاعتماد
- apps/api/src/modules/attachments/attachments.controller.ts — إضافة Policy + AuditAction للرفع والربط
- apps/api/src/modules/users/users.controller.ts — إضافة Policy + AuditAction للإنشاء والتحديث والصلاحيات والحذف
- docs/README.md — إضافة مرجع Wave92 إلى فهرس التوثيق


## Wave93 — Core Application Service Normalization

### Added
- apps/api/src/common/audit/audit-snapshot.util.ts — Utility مشتركة لتوليد snapshots آمنة لأغراض audit
- apps/api/src/common/audit/audit-log-payload.util.ts — بناء payload موحد لسجل التدقيق مع request context
- apps/api/src/modules/projects/projects.application-service.ts — طبقة كتابة منضبطة لمعاملات projects
- apps/api/src/modules/content/content.application-service.ts — طبقة كتابة منضبطة لمعاملات content
- apps/api/test/core-application-services.e2e-spec.ts — اختبار E2E لـ before/after snapshots ومنع النقل بين الجهات
- docs/WAVE93_CORE_APPLICATION_SERVICES_AR.md — توثيق الموجة

### Updated
- apps/api/src/common/audit/audit-action.decorator.ts — دعم skipAutoRecord لتجنب audit duplicate
- apps/api/src/common/audit/audit-trail.interceptor.ts — استخدام snapshot util وتخطي التسجيل التلقائي عند الحاجة
- apps/api/src/modules/projects/projects.controller.ts — فصل القراءة عن الكتابة وتمرير mutations إلى application service
- apps/api/src/modules/projects/projects.module.ts — تسجيل ProjectsApplicationService وربط AuditLogsModule
- apps/api/src/modules/content/content.controller.ts — فصل القراءة عن الكتابة وتمرير mutations إلى application service
- apps/api/src/modules/content/content.module.ts — تسجيل ContentApplicationService وربط AuditLogsModule
- docs/README.md — إضافة Wave93 إلى فهرس التوثيق


## Wave94 — Core Domain Extension

### Added
- apps/api/src/common/events/domain-mutation-event.util.ts — Utility موحد لبناء mutation events من request context
- apps/api/src/modules/experiences/experiences.application-service.ts — طبقة كتابة منضبطة لتجارب الزوار وتجهيز الـ twin والـ audit والـ events
- apps/api/src/modules/approvals/approvals.application-service.ts — طبقة كتابة منضبطة لطلبات الاعتماد وانتقالات الحالة
- apps/api/src/modules/attachments/attachments.application-service.ts — طبقة كتابة منضبطة للمرفقات ورفعها وربطها
- apps/api/test/core-domain-extension.e2e-spec.ts — اختبار E2E يغطي experiences و approvals و attachments
- docs/WAVE94_CORE_DOMAIN_EXTENSION_AR.md — توثيق موجة Wave94

### Updated
- apps/api/src/modules/experiences/experiences.controller.ts — تفعيل skipAutoRecord لمسارات mutations التي أصبحت تُسجل audit داخليًا
- apps/api/src/modules/experiences/experiences.service.ts — فصل write path وتمريره إلى ExperiencesApplicationService
- apps/api/src/modules/experiences/experiences.module.ts — تسجيل ExperiencesApplicationService وربط AuditLogs/OperationalEvents
- apps/api/src/modules/approvals/approvals.controller.ts — تفعيل skipAutoRecord لمسارات قرارات الاعتماد
- apps/api/src/modules/approvals/approvals.service.ts — تمرير mutations إلى ApprovalsApplicationService مع الإبقاء على read path
- apps/api/src/modules/approvals/approvals.module.ts — تسجيل ApprovalsApplicationService
- apps/api/src/modules/attachments/attachments.controller.ts — تفعيل skipAutoRecord لمسارات upload/link
- apps/api/src/modules/attachments/attachments.service.ts — تمرير write path إلى AttachmentsApplicationService
- apps/api/src/modules/attachments/attachments.module.ts — تسجيل AttachmentsApplicationService وربط OperationalEvents
- docs/README.md — إضافة Wave94 إلى فهرس التوثيق


## Wave95 — Mutation Contract and Resource Catalog Hardening

### Added
- apps/api/src/common/contracts/resource-action.catalog.ts — كتالوج مركزي للموارد والأفعال والكيانات والأحداث الأساسية
- apps/api/src/common/contracts/core-mutation-route.decorator.ts — Decorator مركب يجمع Policy و AuditAction للمسارات mutating routes
- apps/api/test/mutation-contract-catalog.e2e-spec.ts — اختبار metadata يحمي العقود الجديدة من الرجوع إلى strings مبعثرة
- docs/WAVE95_MUTATION_CONTRACT_RESOURCE_CATALOG_AR.md — توثيق الموجة

### Updated
- apps/api/src/common/audit/audit-action.decorator.ts — ربط AuditAction بأنواع الكتالوج الجديدة بدل strings حرة فقط
- apps/api/src/common/events/domain-mutation-event.util.ts — eventType أصبح أقرب إلى CoreEventType المعتمد
- apps/api/src/modules/auth/decorators/policy.decorator.ts — Policy أصبح يعتمد على PolicyResource/PolicyAction من الكتالوج
- apps/api/src/modules/auth/guards/policy.guard.ts — استخدام resource typed من metadata بدل fallback string غير منضبط
- apps/api/src/modules/auth/policy/policy.service.ts — baseline policy أصبح مبنيًا على POLICY_RESOURCES و POLICY_ACTIONS
- apps/api/src/modules/projects/projects.controller.ts — استبدال الاقتران اليدوي بين Policy/Audit بـ CoreMutationRoute
- apps/api/src/modules/content/content.controller.ts — استبدال الاقتران اليدوي بين Policy/Audit بـ CoreMutationRoute
- apps/api/src/modules/experiences/experiences.controller.ts — توحيد المسارات الأساسية على catalog-backed contracts
- apps/api/src/modules/approvals/approvals.controller.ts — توحيد مسارات القرار والاعتماد على catalog-backed contracts
- apps/api/src/modules/attachments/attachments.controller.ts — توحيد upload/link contracts على الكتالوج المركزي
- apps/api/src/modules/users/users.controller.ts — توحيد user mutation contracts على الكتالوج المركزي
- apps/api/src/modules/capabilities/capabilities.controller.ts — استخدام constants موحدة للـ Policy resource/action
- apps/api/src/modules/approval-packets/approval-packets.controller.ts — استخدام constants موحدة للـ Policy resource/action
- apps/api/src/modules/exports/exports.controller.ts — استخدام constants موحدة للـ Policy resource/action
- apps/api/src/modules/projects/projects.application-service.ts — استبدال action/entity strings بثوابت مركزية
- apps/api/src/modules/content/content.application-service.ts — استبدال action/entity strings بثوابت مركزية
- apps/api/src/modules/experiences/experiences.application-service.ts — استبدال action/event/subject strings بثوابت مركزية
- apps/api/src/modules/approvals/approvals.application-service.ts — ربط approval actions/events/subjects بالكتالوج المركزي
- apps/api/src/modules/approvals/approvals.service.ts — استخدام subject/event helpers المركزية في المسار legacy
- apps/api/src/modules/attachments/attachments.application-service.ts — ربط attachment actions/events/subjects بالكتالوج المركزي
- docs/README.md — إضافة Wave95 إلى فهرس التوثيق


## Wave96 — Repository Boundaries and Response Contract Hardening

### Added
- apps/api/src/common/http/api-response-envelope.decorator.ts — Decorator opt-in لعقد success response موحد
- apps/api/src/common/http/api-response-envelope.interceptor.ts — Interceptor لتغليف الاستجابات الناجحة ضمن envelope موحد
- apps/api/src/modules/projects/projects.repository.ts — حدود وصول بيانات مستقلة للمشاريع
- apps/api/src/modules/content/content.repository.ts — حدود وصول بيانات مستقلة للمحتوى
- apps/api/src/modules/experiences/experiences.repository.ts — حدود وصول بيانات مستقلة للتجارب
- apps/api/test/response-contract-and-repositories.e2e-spec.ts — اختبار metadata لعقد الاستجابة الجديدة
- docs/WAVE96_REPOSITORY_BOUNDARIES_RESPONSE_CONTRACT_AR.md — توثيق الموجة

### Updated
- apps/api/src/common/audit/audit-trail.interceptor.ts — دعم audit لنتائج response envelope دون تسجيل الغلاف بدل البيانات
- apps/api/src/app.module.ts — تسجيل ApiResponseEnvelopeInterceptor كـ APP_INTERCEPTOR عالمي opt-in
- apps/api/src/modules/projects/projects.service.ts — read path عبر ProjectsRepository
- apps/api/src/modules/projects/projects.application-service.ts — write path عبر ProjectsRepository مع الحفاظ على transaction + audit
- apps/api/src/modules/projects/projects.controller.ts — تطبيق success response envelope على المسارات الأساسية
- apps/api/src/modules/projects/projects.module.ts — تسجيل ProjectsRepository
- apps/api/src/modules/content/content.service.ts — read path عبر ContentRepository
- apps/api/src/modules/content/content.application-service.ts — write path عبر ContentRepository مع الحفاظ على transaction + audit
- apps/api/src/modules/content/content.controller.ts — تطبيق success response envelope على المسارات الأساسية
- apps/api/src/modules/content/content.module.ts — تسجيل ContentRepository
- apps/api/src/modules/experiences/experiences.service.ts — read path عبر ExperiencesRepository والإبقاء على منطق المحاكاة في الخدمة
- apps/api/src/modules/experiences/experiences.application-service.ts — الاعتماد على ExperiencesRepository في CRUD الأساسي وحل organization resolution
- apps/api/src/modules/experiences/experiences.controller.ts — فصل write path عبر ExperiencesApplicationService وتطبيق success response envelope
- apps/api/src/modules/experiences/experiences.module.ts — تسجيل ExperiencesRepository
- apps/api/src/modules/approvals/approvals.controller.ts — تطبيق success response envelope على مسارات approvals الأساسية
- apps/api/src/modules/attachments/attachments.controller.ts — تمرير upload/link مباشرة إلى application service وتطبيق success response envelope على المسارات JSON
- docs/README.md — إضافة Wave96 إلى فهرس التوثيق


## Wave97 — Outbox and Transaction Consistency Hardening

### Added
- apps/api/src/common/events/operational-event-outbox.util.ts — عقد payload داخلي لقناة operational_event داخل outbox
- apps/api/src/modules/outbox/operational-event-outbox.service.ts — خدمة staging + dispatch للأحداث التشغيلية عبر outbox
- apps/api/src/modules/approvals/approvals.repository.ts — حدود وصول بيانات صريحة لطلبات الاعتماد مع دعم TransactionClient
- apps/api/src/modules/attachments/attachments.repository.ts — حدود وصول بيانات صريحة للمرفقات مع دعم TransactionClient وحل مسار الملفات
- apps/api/test/outbox-transaction-consistency.e2e-spec.ts — اختبار يحمي عقد الـ internal outbox وتسجيل providers الجديدة
- docs/WAVE97_OUTBOX_TRANSACTION_CONSISTENCY_AR.md — توثيق الموجة

### Updated
- apps/api/src/modules/outbox/outbox.module.ts — تسجيل OperationalEventOutboxService وتصديره
- apps/api/src/modules/outbox/outbox.service.ts — دعم dispatch لقناة operational_event بدل افتراض webhook خارجي دائمًا
- apps/api/src/modules/approvals/approvals.application-service.ts — stage events داخل outbox خلال المعاملة ثم dispatch بعد commit
- apps/api/src/modules/approvals/approvals.service.ts — read path عبر ApprovalsRepository وتقليل الاعتماد على منطق legacy
- apps/api/src/modules/approvals/approvals.module.ts — تسجيل ApprovalsRepository وربط OutboxModule
- apps/api/src/modules/attachments/attachments.application-service.ts — توحيد create/link paths مع transaction + staged outbox events
- apps/api/src/modules/attachments/attachments.service.ts — read path عبر AttachmentsRepository
- apps/api/src/modules/attachments/attachments.module.ts — تسجيل AttachmentsRepository وربط OutboxModule
- docs/README.md — إضافة Wave97 إلى فهرس التوثيق


## Wave98 — Experience and Async Closure Hardening

### Added
- apps/api/src/modules/experiences/experience-twin-orchestrator.service.ts — فصل ربط الـ Twin عن write path الأساسي للتجارب مع fallback واضح عند الفشل
- apps/api/test/experience-async-closure.e2e-spec.ts — اختبار يحمي عقد twin-failure الجديدة وتسجيل provider الجديد
- docs/WAVE98_EXPERIENCE_ASYNC_CLOSURE_AR.md — توثيق الموجة

### Updated
- apps/api/src/common/contracts/resource-action.catalog.ts — إضافة action/event صريحين لفشل مزامنة Twin في مسار التجارب
- apps/api/src/modules/experiences/experiences.repository.ts — دعم TransactionClient في find/create/update/delete لمسارات التجارب الحرجة
- apps/api/src/modules/experiences/experiences.application-service.ts — إنشاء التجربة عبر transaction + staged outbox ثم تنفيذ twin orchestration بعد commit
- apps/api/src/modules/experiences/experiences.module.ts — تسجيل ExperienceTwinOrchestratorService وربط OutboxModule
- docs/README.md — إضافة Wave98 إلى فهرس التوثيق


## Wave99 — Worker-backed Twin Sync Queue

### Added
- apps/api/src/common/events/experience-twin-sync-job.util.ts — عقد payload typed لوظائف مزامنة Twin الخاصة بالتجارب
- apps/api/src/modules/experiences/experience-twin-sync-worker.service.ts — worker BullMQ طويل العمر لمعالجة مهام مزامنة Twin
- apps/api/test/experience-twin-sync-worker.e2e-spec.ts — اختبار يحمي catalog/job payload/worker provider في مسار التجارب
- docs/WAVE99_WORKER_BACKED_TWIN_SYNC_QUEUE_AR.md — توثيق الموجة

### Updated
- apps/api/src/common/contracts/resource-action.catalog.ts — إضافة actions/events خاصة بصف انتظار twin sync وفشل الـ worker النهائي
- apps/api/src/modules/queue/queue.service.ts — إضافة queue جديدة ومسار enqueueExperienceTwinSync لمهام Twin
- apps/api/src/modules/experiences/experience-twin-orchestrator.service.ts — دعم queueing + worker execution + failure recording لمزامنة Twin
- apps/api/src/modules/experiences/experiences.application-service.ts — تحويل create/manual ensure إلى queue-backed twin sync مع fallback واضح
- apps/api/src/modules/experiences/experiences.controller.ts — ضبط رسالة المسار اليدوي لتصبح طلب مزامنة بدل ادعاء التنفيذ الفوري دائمًا
- apps/api/src/modules/experiences/experiences.module.ts — تسجيل worker provider الجديد
- docs/README.md — إضافة Wave99 إلى فهرس التوثيق


## Wave100 — Queue Observability and Runtime Closure

### Added
- apps/api/src/common/runtime/queue-runtime-registry.service.ts — سجل runtime للعمال والـ queues مع snapshots قابلة للاستخدام في health والتشخيص
- apps/api/test/queue-observability-runtime.e2e-spec.ts — اختبار يحمي عقود queue observability الجديدة
- docs/WAVE100_QUEUE_OBSERVABILITY_RUNTIME_CLOSURE_AR.md — توثيق الموجة

### Updated
- apps/api/src/modules/metrics/metrics.service.ts — إضافة queue gauges وworker state gauges وasync duration histogram
- apps/api/src/modules/queue/queue.module.ts — تصدير QueueRuntimeRegistryService مع الطبقة العامة للـ queue
- apps/api/src/modules/queue/queue.service.ts — إضافة getOperationalSnapshot وcheckRedisConnectivity وتضمين experienceTwinSync في queue stats
- apps/api/src/modules/health/health.service.ts — readiness checks أعمق للـ queue والـ workers مع endpoint queues runtime
- apps/api/src/modules/health/health.controller.ts — إضافة GET /health/queues
- apps/api/src/modules/health/health.module.ts — ربط MetricsModule لاستخدام queue metrics داخل الصحة التشغيلية
- apps/api/src/modules/experiences/experience-twin-sync-worker.service.ts — ربط worker runtime registry وmetrics لحالة worker ونتائج jobs
- apps/api/src/modules/experiences/experiences.module.ts — ربط MetricsModule داخل تجربة الـ twin worker
- docs/README.md — إضافة Wave100 إلى فهرس التوثيق


## Wave101 — Trace Propagation and Async Diagnostics Hardening

### Added
- apps/api/src/common/telemetry/trace-context.util.ts — utilities لتطبيع traceparent وإنشاء child trace context للـ workers
- apps/api/src/common/runtime/async-diagnostics-registry.service.ts — سجل تشخيصي داخلي للمسارات async
- apps/api/test/trace-propagation-async-diagnostics.e2e-spec.ts — اختبار يحمي عقود التتبع والتشخيص الجديدة
- docs/WAVE101_TRACE_PROPAGATION_ASYNC_DIAGNOSTICS_AR.md — توثيق الموجة

### Modified
- apps/api/src/main.ts — حقن trace context في request context وإرجاع X-Trace-Id/traceparent
- apps/api/src/common/request-context.ts — توسيع السياق بطبقة trace + method/path
- apps/api/src/common/events/experience-twin-sync-job.util.ts — إضافة traceId/diagnostics إلى job payload
- apps/api/src/modules/queue/queue.module.ts — تسجيل AsyncDiagnosticsRegistryService كـ global provider
- apps/api/src/modules/metrics/metrics.service.ts — عداد metrics للأحداث التشخيصية async
- apps/api/src/modules/health/health.service.ts — تضمين diagnostics في queue snapshot
- apps/api/src/modules/health/health.controller.ts — endpoint جديد لمسارات async diagnostics
- apps/api/src/modules/experiences/experience-twin-orchestrator.service.ts — child trace context + diagnostics recording
- apps/api/src/modules/experiences/experience-twin-sync-worker.service.ts — تسجيل lifecycle diagnostics وretry/terminal failure markers

- WAVE102: dead-letter inspection and replay closure for experience twin sync.

## Wave 103
- إصلاح syntax/parsing blockers في compliance/workflows/inspiration/knowledge-packs وبعض صفحات الواجهة.
- إضافة ts parse audit على مستوى المستودع.
- إضافة baseline stabilization verify runner.


## Wave 104
- إضافة طبقة typing خفيفة للـ request/response والـ middleware الأساسية.
- تحديث request tenant resolution وinterceptors الأساسية لتقليل الاعتماد على any.
- تحسين type guard الخاص بـ experience twin sync payload.
- إضافة ts type-risk audit + type-risk closure verification scripts.


## Wave 105
- إضافة experience-core.types.ts لتوحيد عقود التجارب والتوأم والمحاكاة.
- إعادة كتابة experiences.repository.ts بعقود typed واضحة بدل casts غير منضبطة.
- تقوية experiences.application-service.ts وexperience-twin-orchestrator.service.ts لتقليل any في مسارات create/update/delete/twin.
- تنظيف queue.service.ts من معظم BullMQ option casts إلى any عبر QueueJobOptions.
- تنظيف operational-event-outbox.util.ts وmain.ts وexperiences.controller.ts وexperience-twin-sync-worker.service.ts من any المتبقي.
- إضافة اختبار type-risk-hotspot-reduction.e2e-spec.ts وإغلاق تقرير type-risk audit إلى صفر findings في النطاق المستهدف.

## Wave106 — Typecheck Audit Sprint and Compile Visibility

### Added
- apps/api/src/@types/runtime-audit-globals.d.ts — تعريفات runtime خفيفة لدعم typecheck audit وتقليل ضجيج Node globals
- scripts/audit/ts-typecheck-audit.mjs — تشغيل tsc على apps/api مع تصنيف diagnostics إلى categories قابلة للتنفيذ
- scripts/typecheck-closure-verify.mjs — أمر تجميعي يشغّل parse audit + type-risk audit + typecheck audit + wiring audit
- docs/WAVE106_TYPECHECK_AUDIT_SPRINT_AR.md — توثيق الموجة ونتائجها الفعلية

### Updated
- apps/api/tsconfig.json — توسيع include ليشمل src/**/*.d.ts
- apps/api/src/common/audit/audit-trail.interceptor.ts — tightening لقراءة response payload من unknown
- apps/api/src/common/http/api-response-envelope.interceptor.ts — جعل body من نوع unknown بدل implicit any
- apps/api/src/main.ts — tightening لتوقيع CORS callback في origin resolver
- package.json — إضافة أوامر audit:ts:typecheck و typecheck:closure:verify
- docs/README.md — إضافة مرجع Wave106 إلى فهرس التوثيق

## Wave107
- Added monorepo path resolution for @madar/* in apps/api tsconfig.
- Expanded runtime audit declarations for Buffer/process/fs/yauzl/qrcode.
- Rewired ApprovalPacketsService to application services and reduced type-risk hotspots.


## Wave108
- إضافة ambient audit stubs لحزم خارجية أساسية لتقليل missing-module noise داخل apps/api.
- إغلاق diagnostics المحلية في risks.service.ts و visitor-guide.service.ts و experience-twin-sync-worker.service.ts و content.application-service.ts و projects.application-service.ts و otel.ts.
- إضافة second-hotspot-sprint.e2e-spec.ts كحارس ضد عودة any إلى الملفات المستهدفة.
- خفض typecheck audit من 722 إلى 253 داخل البيئة الحالية.


## Wave109
- إغلاق diagnostics في api-exception.filter و queue.service و auth.service وعدة brain services بعد تصحيح المسارات النسبية إلى packages/knowledge-kernel.
- توسيع runtime audit declarations لتغطية Queue و IORedis و Config/JWT وخصائص Request الإضافية.
- نقل route inventory وتقارير التدقيق من docs/ إلى .artifacts/audit/ وحذف الملفات المتولدة القديمة من المستودع.
- إضافة .gitignore لـ .artifacts وإضافة script جديد artifacts:clean.
- خفض typecheck audit من 253 إلى 182 داخل البيئة الحالية.

- Wave110: tightened interceptor/guard typing, expanded audit stubs, cleaned shared package diagnostics, removed generated .artifacts from delivery.


## Wave111
- إعادة كتابة repositories الأساسية للتجارب والمحتوى والمشاريع بعقود delegate/client أوضح وتصدير client types إلى application services.
- توسيع Prisma/microservices/rxjs audit stubs لتقليل ضجيج typecheck غير الحقيقي في apps/api.
- tightening إضافي في experiences.application-service وexperience-twin-orchestrator وops.service وexports-renderer.service.
- حذف docs/workflows_catalog_summary.json و release/WAVE83_WAVE86_PRODUCTION_HARDENING.md ضمن repo diet continuation.
- خفض typecheck audit من 128 إلى 82 داخل البيئة الحالية مع بقاء type-risk audit عند 0 findings.

- Wave112: أغلق typecheck الخاص بـ apps/api محليًا، وسّع stubs الأساسية، أصلح آخر hotpaths، وحذف docs مكررة لا حاجة لها.


## Wave113
- إضافة tsconfig.base.json و tsconfig.packages.json لإدخال الحزم المشتركة في مسار تحقق TypeScript منضبط.
- إضافة package audit globals و tsconfigs مستقلة للحزم الحرجة: doc-kernel و object-store و runtime-kernel و packet-kernel و twin-kernel.
- تنظيف typing في doc-kernel و runtime-kernel و packet-kernel و twin-kernel وإزالة استخدامات any المستهدفة.
- إضافة scripts جديدة: audit:ts:packages و packages:closure:verify.
- توجيه tsbuildinfo ومخرجات declarations إلى .artifacts ثم حذفها من التسليم النهائي.
## Wave 114
- إضافة tsconfig مستقلة للحزم المشتركة المتبقية داخل packages
- توسيع tsconfig.packages.json ليغطي كامل الحزم الأساسية
- استبدال سكربتات package-kernels القديمة بسكربت تحقق موحد للحزم
- حذف scripts/audit/ts-package-kernels-audit.mjs
- حذف scripts/package-kernels-closure-verify.mjs
- إضافة docs/WAVE114_FULL_PACKAGE_EXPANSION_AND_WORKSPACE_CORE_CLOSURE_AR.md


## Wave 115
- إضافة `apps/@types/app-audit-globals.d.ts` كطبقة تدقيق مشتركة لتطبيقات worker/exports-svc/web.
- إضافة `tsconfig.audit.json` مستقلة لـ worker bootstrap و exports-svc shell و web shell.
- إضافة `scripts/audit/ts-app-shell-audit.mjs` و `scripts/apps-shell-closure-verify.mjs`.
- tightening في `apps/web/middleware.ts` و `apps/web/next.config.ts` و `apps/web/app/login/page.tsx`.
- حذف verify scripts القديمة الضيقة من package.json ومن مجلد scripts لتخفيف تضخم المستودع.
