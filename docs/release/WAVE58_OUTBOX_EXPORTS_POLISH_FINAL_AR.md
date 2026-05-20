# Release Notes

## الإصدار
Wave58 Outbox للتصدير + صقل الستراكتشر

## التاريخ
2026-03-03

## الهدف
رفع موثوقية التصدير بعد فصل خدمة exports-svc بحيث يصبح التوليد قابلًا لإعادة المحاولة بدون تكرار الأثر، مع تحسين التتبع والدكيومنتيشن.

## التغييرات الأساسية
1) Service Outbox
- إضافة ServiceOutboxEvent في Prisma + Migration
- Module جديد في API: ServiceOutboxModule
- Endpoint محمي للعامل: POST /api/service-outbox/:id/dispatch

2) Export Jobs و Artifacts في قاعدة البيانات
- ExportJob لتوثيق الطلب والنتيجة
- ExportArtifact لربط المرفقات الناتجة ومنع تكرار إدراجها

3) ربط Worker
- إضافة SERVICE_OUTBOX_QUEUE
- Worker يستهلك الطابور وينادي dispatch

4) صقل مسار Exports
- ExportsService.generateArtifacts أصبح:
  - enqueue: ينشئ ServiceOutboxEvent فقط
  - sync: يولد فورًا ويعيد artifacts

5) تتبع موزع
- التقاط traceparent في Request Context
- تمريره إلى renderer ضمن headers عند dispatch

6) Documentation
- إضافة docs/README.md كفهرس رسمي
- إضافة ADR-006
- إضافة Runbooks

## متغيرات جديدة أو مهمة
- SERVICE_OUTBOX_QUEUE
- SERVICE_OUTBOX_CONCURRENCY
- SERVICE_OUTBOX_MAX_ATTEMPTS
- EXPORTS_RENDERER_URL
- EXPORTS_RENDERER_TOKEN

## ملاحظات توافق
- لا يوجد تغيير على واجهات المستخدم
- المسار async أصبح أكثر موثوقية
