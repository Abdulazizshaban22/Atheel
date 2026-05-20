# ADR-006

## العنوان
Wave58 موثوقية التصدير عبر Service Outbox و Idempotent Dispatch

## الحالة
معتمد

## التاريخ
2026-03-03

## السياق
تم استخراج خدمة exports-svc لتوليد PDF و PPTX و Bundle ZIP كخدمة مستقلة (Wave57). عند الفصل تصبح مشكلة الاعتمادية واضحة: تحديث حالة ExportJob ثم الاتصال بخدمة أخرى قد ينتج عدم اتساق عند الفشل (dual write). كذلك أي آلية إعادة محاولة قد تسبب تكرار تنفيذ الأثر (توليد نفس الملفات مرتين) ما لم يكن الاستقبال Idempotent.

## القرار
اعتماد نمط Service Outbox داخل خدمة الـ API:
- إنشاء سجل ServiceOutboxEvent داخل نفس سياق تعديل حالة ExportJob
- تنفيذ الإرسال والتوليد في عملية منفصلة عبر Worker (BullMQ) مع backoff
- تطبيق Idempotency في الاستهلاك عبر:
  - Claim atomic للحدث قبل التنفيذ
  - اعتبار ExportJob.completed شرطًا لإيقاف التنفيذ (Already completed)
  - تسجيل ExportArtifact وربط اسم الملف بـ exportJobId كقيد uniqueness لمنع تكرار إدراج الأثر

تم تمرير correlationId و traceparent لربط رحلة الطلب في التتبع الموزع.

## البدائل التي تمت دراستها
1) الاتصال المباشر HTTP بدون Outbox
- سريع في التنفيذ لكنه هش: فشل الشبكة قد يترك ExportJob في حالة running بدون مخرجات أو مخرجات بدون تحديث حالة

2) تحويل الاتصال إلى Nest ClientProxy بدل HTTP بدون Outbox
- يغير ناقل الاتصال فقط ولا يحل مشكلة dual write ولا تكرار الرسائل

3) اعتماد Queue مباشرة بدون Outbox
- يقلل ضغط الـ API لكن يبقى خطر عدم الاتساق إذا لم يكن إدراج الرسالة ضمن نفس معاملة تحديث حالة الوظيفة

## النتائج
- تحسن موثوقية التصدير في الإنتاج عبر فصل إنشاء الطلب عن التنفيذ
- يمكن توسيع exports-svc أفقيًا لأن التنفيذ أصبح معزولًا
- وجود سجل ServiceOutboxEvent يجعل التشغيل قابلاً للتدقيق والتحليل

## ملاحظات تنفيذ
- ServiceOutboxEvent يحتوي: kind, status, payload, attempts, nextAttemptAt, correlationId, traceparent
- Worker يسحب eventId من طابور service-outbox وينادي API endpoint محمي بـ X-Worker-Token
- API يقوم بتنفيذ dispatch وكتابة النتيجة في ExportJob.result

## المراجع
- Transactional Outbox pattern
- W3C Trace Context
- NestJS Microservices ClientProxy
