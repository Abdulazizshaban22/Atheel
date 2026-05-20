# Runbook موثوقية التصدير Exports

هذا الدليل يشرح تشغيل مسار التصدير بعد فصل خدمة التوليد exports-svc واعتماد Service Outbox (Wave57 + Wave58).

## الهدف
- منع تعطل واجهة المستخدم بسبب توليد ملفات ثقيلة
- ضمان أن ExportJob ينتقل لحالة completed حتى عند فشل مؤقت
- منع تكرار التوليد عبر Idempotency

## البنية المختصرة
- apps/api
  - إنشاء ExportJob
  - إنشاء ServiceOutboxEvent عند التشغيل غير المتزامن
  - حفظ النتائج في ExportJob.result
- apps/worker
  - يستهلك طابور SERVICE_OUTBOX_QUEUE
  - ينادي /api/service-outbox/:id/dispatch
- apps/exports-svc
  - يطبق POST /internal/render
  - يعيد artifacts كـ base64

## متغيرات البيئة المطلوبة
- EXPORTS_RENDERER_URL
- EXPORTS_RENDERER_TOKEN
- SERVICE_OUTBOX_QUEUE
- SERVICE_OUTBOX_CONCURRENCY
- SERVICE_OUTBOX_MAX_ATTEMPTS
- WORKER_TOKEN

## تشغيل exports-svc
1) داخل المونوريبو
- pnpm --filter @madar/exports-svc dev

2) تحقق
- GET http://localhost:3101/health

## مسار التنفيذ
1) المستخدم يطلب توليد
- POST /api/exports/approval-packets/:id/generate

2) API ينشئ ExportJob
- status: queued

3) إذا async
- Worker ينادي POST /api/exports/jobs/:id/run
- ExportsService ينشئ ServiceOutboxEvent kind=exports_render

4) Worker يلتقط event ويشغله
- POST /api/service-outbox/:eventId/dispatch

5) عند النجاح
- ExportJob.status = completed
- ExportJob.result يحتوي attachment ids

## استكشاف الأخطاء
### حالة ServiceOutboxEvent stuck في processing
- افحص lockedAt و attempts
- راجع logs للـ worker
- زد SERVICE_OUTBOX_MAX_ATTEMPTS عند الحاجة

### خطأ missing EXPORTS_RENDERER_TOKEN
- ضع EXPORTS_RENDERER_TOKEN في API
- ضع x-internal-token في exports-svc

### تكرار artifacts
- ExportArtifact لديه unique على exportJobId + name
- إذا ظهرت duplicates غالبًا السبب تغيير أسماء الملفات في renderer

## ملاحظات تشغيلية
- هذا المسار يعتمد على نمط outbox لتجنب dual write
- تمرير traceparent يحافظ على التتبع الموزع عبر الخدمات
