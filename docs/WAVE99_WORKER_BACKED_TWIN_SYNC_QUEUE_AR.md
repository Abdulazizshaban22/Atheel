# Wave99 — Worker-backed Twin Sync Queue

## ماذا بُني
هذه الموجة تنقل مزامنة Twin الخاصة بالتجارب من خطوة لاحقة متزامنة داخل الطلب إلى مسار queue-aware حقيقي:

- payload typed واضح لوظيفة twin sync
- enqueue صريح داخل QueueService
- worker provider طويل العمر داخل ExperiencesModule
- orchestrator قادر على:
  - queue الطلب
  - fallback للتنفيذ المباشر عند غياب Redis
  - تنفيذ المهمة داخل worker request context
  - تسجيل failure نهائي بعد استنفاد retries

## لماذا هذا مهم
قبل هذه الموجة كان create/ensureTwin ينتهي إلى post-commit step ما يزال داخل نفس عملية الطلب.
الآن أصبح لدينا فصل أوضح بين:
- mutation الأساسية للتجربة
- الجدولة async
- التنفيذ الخلفي
- تسجيل الفشل النهائي

## أهم الملفات
- `apps/api/src/common/events/experience-twin-sync-job.util.ts`
- `apps/api/src/modules/queue/queue.service.ts`
- `apps/api/src/modules/experiences/experience-twin-sync-worker.service.ts`
- `apps/api/src/modules/experiences/experience-twin-orchestrator.service.ts`
- `apps/api/src/modules/experiences/experiences.application-service.ts`
- `apps/api/test/experience-twin-sync-worker.e2e-spec.ts`

## السلوك الحالي
- عند إنشاء تجربة في وضع Redis يتم enqueue لمهمة مزامنة الـ Twin بدل تنفيذها داخل الطلب مباشرة.
- عند طلب ensureTwin يدويًا:
  - في وضع Redis: يعود الرد بأن الطلب queued مع jobId عند توفره
  - في وضع sync: ينفذ الربط مباشرة كـ fallback
- عند فشل worker بعد آخر retry يتم تسجيل audit + operational event صريحين.

## ما يزال ناقصًا
- dead-letter queue مخصصة لهذا المسار
- progress reporting للـ worker
- tracing/span linking فعلي بين HTTP request والـ worker job
- reconciliation job لحالات orphan twin أو queued items العالقة
