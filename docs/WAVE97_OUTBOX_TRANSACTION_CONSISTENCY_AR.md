# Wave97 — Outbox and Transaction Consistency Hardening

## الهدف
هذه الموجة تعالج فجوة مهمة بقيت بعد Wave96:

- جزء من النواة ما زال يصدر operational events مباشرة من داخل application services
- approvals و attachments لم يكن لديهما repository boundaries صريحة مثل بقية النواة
- mutation path كان يربط التغيير في البيانات وإرسال الحدث في نفس المسار المباشر، وهذا يضعف handoff ويجعل السلوك أقل انضباطًا عند التوسع

الهدف هنا ليس تحويل المنصة إلى event-driven system كامل، بل بناء خطوة عملية ومحددة:
- stage event داخل قاعدة البيانات أولًا
- ثم dispatch بعد نجاح المعاملة
- مع repositories أوضح لـ approvals و attachments

## ما الذي بُني

### 1) Internal operational-event outbox contract
أُضيفت أداة مركزية جديدة:
- `apps/api/src/common/events/operational-event-outbox.util.ts`

وظيفتها:
- تعريف channel داخلي ثابت `operational_event`
- تعريف payload kind واضح `operational_event_v1`
- بناء payload موحد لأي domain mutation event يراد ترحيله عبر outbox
- فحص payload عند الاستهلاك بدل الاعتماد على JSON حر

### 2) OperationalEventOutboxService
أُضيفت خدمة جديدة:
- `apps/api/src/modules/outbox/operational-event-outbox.service.ts`

هذه الخدمة تقدم عقدين واضحين:
- `stageEvent(...)` لإنشاء outbox row داخل Prisma أو TransactionClient
- `dispatchStaged(...)` لتسليم الرسالة بعد نجاح المعاملة

القرار هنا مقصود:
- staging يمكن أن يحدث داخل transaction
- dispatch لا يحدث إلا بعدها
- في Redis mode يتم enqueue
- في sync mode يتم dispatchNow عبر `OutboxService`

### 3) دعم OutboxService لقناة operational_event
تم تطوير:
- `apps/api/src/modules/outbox/outbox.service.ts`

حتى يستطيع:
- التعرف على رسائل القناة الداخلية `operational_event`
- استخراج الـ payload المنضبط
- تحويله إلى `OperationalEventsService.emit(...)`
- ثم تعليم الرسالة كـ sent

وبذلك أصبح لدينا outbox فعلي للأحداث التشغيلية الداخلية دون الحاجة إلى schema جديدة في هذه الموجة.

### 4) ApprovalsRepository
أُضيف:
- `apps/api/src/modules/approvals/approvals.repository.ts`

ويغطي:
- findMany
- findById
- create
- update
- دعم `Prisma.TransactionClient`
- fallback إلى `DataStoreService`

### 5) AttachmentsRepository
أُضيف:
- `apps/api/src/modules/attachments/attachments.repository.ts`

ويغطي:
- findMany
- findById
- create
- update
- resolveLocalPath
- دعم `Prisma.TransactionClient`
- fallback إلى `DataStoreService`

### 6) tightening للـ approvals write path
تم تحديث:
- `apps/api/src/modules/approvals/approvals.application-service.ts`
- `apps/api/src/modules/approvals/approvals.service.ts`
- `apps/api/src/modules/approvals/approvals.module.ts`

النتيجة:
- create / transition أصبحت تستخدم repository صريح
- audit log يُكتب داخل transaction عند نجاح قاعدة البيانات
- domain event يُstage داخل outbox في نفس المعاملة
- dispatch يتم بعد commit
- fallback ما زال موجودًا عند تعذر المسار المعتمد على قاعدة البيانات

### 7) tightening للـ attachments boundary
تم تحديث:
- `apps/api/src/modules/attachments/attachments.application-service.ts`
- `apps/api/src/modules/attachments/attachments.service.ts`
- `apps/api/src/modules/attachments/attachments.module.ts`

النتيجة:
- DB write path للمرفقات صار يعتمد على repository واضح
- link صار يكتب audit + staged event داخل transaction
- upload / createFromBuffer / createFromFilePath توحدت تحت helper داخلي واحد
- بعد commit يتم dispatch للحدث staged بدل emit مباشر في المسار الأساسي

## ماذا لم يُبنَ بعد
- لم يتحول كل core domain إلى internal outbox بعد
- experiences ما زال يحتاج tightening أعمق في create flow بسبب ربطه بإنشاء twin في نفس المسار
- لا يوجد outbox consumer منفصل طويل العمر للأحداث التشغيلية الداخلية؛ ما زلنا نستخدم `OutboxService.dispatchNow` أو queue enqueue بحسب الوضع
- لا يوجد dead-letter policy مخصصة لقناة `operational_event`

## لماذا هذا التصميم صحيح الآن
لأن المرحلة الحالية تحتاج تحسينًا تدريجيًا لا يعيد تشكيل المنصة بالكامل.

لو أدخلنا event bus أكبر أو schema جديدة الآن سنرفع المخاطر دون حاجة مباشرة. أما هذا المسار فيعطي:
- consistency أفضل
- handoff أوضح
- أقل coupling بين mutation والemit
- قابلية توسع لاحقة نحو outbox worker أو outbox topic متخصص

## ملفات هذه الموجة
### Added
- `apps/api/src/common/events/operational-event-outbox.util.ts`
- `apps/api/src/modules/outbox/operational-event-outbox.service.ts`
- `apps/api/src/modules/approvals/approvals.repository.ts`
- `apps/api/src/modules/attachments/attachments.repository.ts`
- `apps/api/test/outbox-transaction-consistency.e2e-spec.ts`
- `docs/WAVE97_OUTBOX_TRANSACTION_CONSISTENCY_AR.md`

### Updated
- `apps/api/src/modules/outbox/outbox.module.ts`
- `apps/api/src/modules/outbox/outbox.service.ts`
- `apps/api/src/modules/approvals/approvals.application-service.ts`
- `apps/api/src/modules/approvals/approvals.service.ts`
- `apps/api/src/modules/approvals/approvals.module.ts`
- `apps/api/src/modules/attachments/attachments.application-service.ts`
- `apps/api/src/modules/attachments/attachments.service.ts`
- `apps/api/src/modules/attachments/attachments.module.ts`
- `docs/README.md`
- `release/FILE_CHANGELOG_AR.md`

## أثر الموجة على المعمارية
بعد Wave97 صار لدينا في النواة الأساسية ثلاثة أنماط أوضح:

1. repositories صريحة على مزيد من الكيانات الحرجة
2. audit داخل transaction حيث أمكن
3. outbox staging قبل dispatch في المسارات الأكثر حساسية

هذا لا يعني اكتمال النواة، لكنه يقربها من سلوك production-grade حقيقي بدل بقاء جزء من الأحداث في مسار مباشر غير منضبط.
