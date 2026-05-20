# Runbook — Redis / Queues Down

## لماذا هذا حاسم
في الإنتاج تم إلزام Redis لأن الميزات التالية تعتمد عليه:
- retries المؤجلة للـ Outbox
- quiet hours suppression
- تشغيل العامل Worker عبر BullMQ

## إشارات الخطر
- تراكم رسائل Outbox بحالة failed أو pending
- توقف تنفيذ Workflows أو تأخر ticks
- رسائل خطأ اتصال Redis في API/Worker logs

## خطوات الاستجابة
1) تحقق من متغيرات البيئة
- REDIS_URL موجود في API و Worker
- QUEUE_MODE=redis

2) تحقق من اتصال Redis
- ping من داخل الحاوية
- راقب latency والذاكرة

3) استعادة الخدمة
- إعادة تشغيل Redis أو ترقية الموارد
- إعادة تشغيل Worker

4) بعد الاستعادة
- راقب إعادة جدولة outbox retries
- راقب مقاييس http_server_duration_seconds و outbox failed rate

## بعد الحادثة
- سجّل OperationalEvent من نوع ops.redis.recovered
- اربط الحادثة بـ Incident وحدث runbook عند الحاجة
