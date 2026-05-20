# Wave100 — Queue Observability and Runtime Closure

## الهدف
إغلاق فجوة المراقبة والتشغيل حول المسارات غير المتزامنة التي دخلت النواة في Wave97 إلى Wave99، خصوصًا:
- صف انتظار مزامنة Twin الخاصة بالتجارب
- حالة الـ worker طويل العمر
- إظهار صورة تشغيلية موحدة عبر health وmetrics بدل الاكتفاء بوجود queue فقط

## ما الذي بُني

### 1) Queue Runtime Registry
تمت إضافة `QueueRuntimeRegistryService` لحفظ لقطة runtime داخل الذاكرة عن:
- العمال workers المسجلين
- حالاتهم الحالية
- آخر heartbeat
- آخر job تم تشغيله أو فشل
- counters أساسية للمعالجة والفشل
- آخر counts تم التقاطها من queues

هذا ليس بديلًا عن Prometheus أو APM، لكنه طبقة تشغيلية مفيدة جدًا للتشخيص الفوري والـ handoff.

### 2) Metrics أوسع للـ queues والـ workers
تم تطوير `MetricsService` ليدعم:
- Gauge لحالة العمال `atheel_async_worker_state`
- Gauge لأعداد jobs لكل queue وحالة `atheel_queue_jobs`
- Histogram لمدة jobs غير المتزامنة `atheel_async_job_duration_seconds`

### 3) Health endpoint تشغيلي للـ queues
تمت إضافة `GET /health/queues` لإرجاع:
- queue mode
- redis ping
- queue stats
- worker runtime snapshot
- timestamp

كما تم توسيع `GET /health/ready` ليشمل:
- queue check أعمق
- workers check مستقل

### 4) ربط worker الخاص بـ experience twin sync بالمراقبة
أصبح `ExperienceTwinSyncWorkerService` يقوم بـ:
- register عند startup
- state transitions بين starting/running/degraded/failed/stopped
- metrics للنجاح والفشل ومدة التنفيذ
- runtime snapshots لآخر job ومعرفه والوقت والحالة

## الملفات الأساسية
- `apps/api/src/common/runtime/queue-runtime-registry.service.ts`
- `apps/api/src/modules/metrics/metrics.service.ts`
- `apps/api/src/modules/queue/queue.service.ts`
- `apps/api/src/modules/queue/queue.module.ts`
- `apps/api/src/modules/health/health.service.ts`
- `apps/api/src/modules/health/health.controller.ts`
- `apps/api/src/modules/health/health.module.ts`
- `apps/api/src/modules/experiences/experience-twin-sync-worker.service.ts`
- `apps/api/src/modules/experiences/experiences.module.ts`
- `apps/api/test/queue-observability-runtime.e2e-spec.ts`

## لماذا هذا مهم
حتى هذه الموجة كانت المنصة تعرف أن لديها Queue وWorker، لكنها لا تعرض بشكل كافٍ:
- هل worker مسجل فعلًا
- هل يعمل أم متوقف أم degraded
- ما آخر job عالجه
- ما counts الحالية للـ queue نفسها

هذا يخلق blind spot تشغيليًا كبيرًا.

بعد هذه الموجة أصبح لدينا حد أدنى محترم من:
- runtime introspection
- queue readiness visibility
- worker state visibility
- metrics قابلة للتوصيل بمراقبة خارجية لاحقًا

## كيفية التشغيل
```bash
cp .env.example .env
docker compose -f infra/docker-compose.dev.yml up -d
pnpm install
pnpm db:generate
pnpm --filter @madar/api dev
```

### فحص الحالة العامة
```bash
curl http://localhost:4000/api/health
curl http://localhost:4000/api/health/ready
curl http://localhost:4000/api/health/queues
curl http://localhost:4000/api/metrics
```

## ما الذي اكتمل
- Queue runtime registry
- Queue operational snapshot endpoint
- Redis connectivity check
- Worker state metrics
- Queue count metrics
- Worker runtime transitions في experience twin sync
- تحديث readiness checks

## ما الذي ما زال ناقصًا
- traces مترابطة فعليًا عبر request → queue → worker
- dead-letter visibility مخصصة لمسار twin sync
- dashboards خارجية جاهزة على Grafana/Prometheus
- worker process isolation كسيرفس منفصلة إن لزم لاحقًا
