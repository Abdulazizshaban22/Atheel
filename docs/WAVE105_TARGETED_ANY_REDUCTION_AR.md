# Wave 105 — Targeted Any-Reduction in Experiences and Queue Core

## الهدف
خفض مخاطر `any` في أعلى الملفات سخونة بدل تنظيف منتشر ضعيف الأثر.

## النطاق
- experiences.application-service
- experiences.repository
- experiences.service
- experience-twin-orchestrator.service
- experience-twin-sync-worker.service
- queue.service
- operational-event-outbox.util
- main.ts

## ما الذي تغيّر
- إدخال ملف أنواع مركزي للتجارب `experience-core.types.ts`
- تحويل repository إلى عقود create/update/find/delete أوضح
- إزالة معظم `as any` من مسارات التجارب الحرجة
- إدخال wrapper typed لخيارات BullMQ داخل `queue.service`
- إزالة cast إلى `any` من `job.opts`, `job.stacktrace`, `processedOn`, `finishedOn`
- استبدال `app as any` في `main.ts` بوصول أوضح إلى http adapter instance
- تنظيف `operational-event-outbox.util` من casts إلى `any`

## النتيجة المتوقعة
خفض واضح في type-risk داخل قلب التجارب والـ queue، وتحويل الموجة التالية من cleanup واسع إلى إغلاق أشد تحديدًا.
