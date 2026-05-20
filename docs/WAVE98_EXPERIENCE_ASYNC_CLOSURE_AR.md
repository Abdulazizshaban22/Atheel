# Wave98 — Experience and Async Closure Hardening

## الهدف
إغلاق الفجوة المتبقية في مسار التجارب بحيث لا تبقى عملية إنشاء التجربة مربوطة مباشرة بإنشاء الـ Twin داخل نفس write path الأساسي.

## ما الذي تغير
- تم فصل ربط الـ Twin في خدمة مستقلة اسمها ExperienceTwinOrchestratorService
- إنشاء التجربة أصبح يثبت الكيان الأساسي أولًا داخل transaction مع audit + staged outbox event
- بعد نجاح المعاملة يتم تنفيذ ensureLinked للتوأم كخطوة تالية واضحة بدل خلطها داخل mutation الأساسية
- مسارات update و delete في التجارب أصبحت تستخدم staged outbox events مثل بقية النواة
- تمت إضافة عقد صريحة لفشل مزامنة التوأم: action + event type

## لماذا هذا مهم
هذا التعديل يقلل coupling بين:
- core experience mutation
- twin provisioning
- operational event emission

وبالتالي يصبح handoff أوضح، كما يصبح فشل إنشاء التوأم أقل قدرة على كسر إنشاء التجربة نفسها.

## الملفات الرئيسية
- apps/api/src/modules/experiences/experience-twin-orchestrator.service.ts
- apps/api/src/modules/experiences/experiences.application-service.ts
- apps/api/src/modules/experiences/experiences.repository.ts
- apps/api/src/common/contracts/resource-action.catalog.ts
- apps/api/test/experience-async-closure.e2e-spec.ts

## ملاحظة صريحة
ما زال هناك دين تقني معروف: إذا نجح إنشاء الـ Twin ثم فشل ربطه بالـ Experience قد يبقى Twin orphan. لم تتم معالجة garbage collection أو reconciliation الكاملة في هذه الموجة.
