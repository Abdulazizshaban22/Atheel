# Wave101 — Trace Propagation and Async Diagnostics Hardening

## ما الهدف
إغلاق فجوة التشخيص بين:
- الطلب الأصلي HTTP
- مهمة BullMQ
- الـ worker المنفذ
- والفشل أو إعادة المحاولة

## ماذا أُضيف
- utility مركزية لتطبيع traceparent وإنشاء child trace context داخل worker
- AsyncDiagnosticsRegistryService لحفظ recent lifecycle events للمسارات async
- توسيع payload الخاصة بـ experience twin sync لتشمل traceId وdiagnostics
- endpoint جديد: /health/queues/diagnostics
- metrics counter جديد للأحداث التشخيصية async

## لماذا هذا مهم
بعد Wave100 أصبحت الـ queue مرئية، لكن لم يكن لدينا correlation كافٍ بين:
- من أنشأ المهمة
- أي trace/request أنشأها
- ماذا حدث داخل worker
- وهل كان الفشل retryable أم terminal

هذه الموجة حسّنت handoff والتشخيص دون فرض OpenTelemetry كامل على كل الوحدات.
