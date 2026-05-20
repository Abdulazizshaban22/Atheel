# Wave 102 — Dead-letter and Replay Closure

## الهدف
إضافة إغلاق تشغيلي لمسار experience twin sync عبر:
- inspection للـ dead-letter jobs
- replay/requeue منضبط
- ربط replay بالـ diagnostics

## أهم التعديلات
- QueueService أصبح يدعم list/get/replay للـ experience twin sync dead letters
- ExperienceTwinDeadLetterService أضيف كطبقة تطبيقية خفيفة للفحص وإعادة التشغيل
- Health endpoints جديدة: /health/queues/dead-letter و /health/queues/dead-letter/:jobId
- Experience endpoints جديدة لإعادة تشغيل الـ dead-letter jobs
- توسيع payload diagnostics ببيانات replay

## ملاحظات صريحة
- replay الحالي يعيد enqueue كـ job جديدة ولا يمسح السجل الفاشل الأصلي
- هذا القرار مقصود حتى يبقى الأثر التشخيصي محفوظًا
- ما يزال DLQ هنا مبنيًا فوق failed jobs الخاصة بـ BullMQ وليس storage دائمًا مستقلًا
