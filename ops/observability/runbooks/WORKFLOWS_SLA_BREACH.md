# Runbook — Workflows SLA Breach / Stuck Executions

## إشارات الخطر
- تصعيد escalations متكرر على نفس execution
- بطء شديد في tick أو توقف executions في حالة running دون تقدم

## خطوات الاستجابة
1) تحقق من العامل
- Worker يعمل؟
- WORKER_TOKEN صحيح؟
- QUEUE_MODE=redis و Redis متاح؟

2) تحقق من التنفيذ
- راقب execution events
- راقب الخطوة الحالية وسبب الفشل

3) إعادة تشغيل آمن
- إذا كان tick محميًا بـ X-Worker-Token: أعد تشغيل worker فقط
- لا تشغل tick من طرف خارجي

4) بعد الاستعادة
- راقب metrics
- اغلق incident أو فعّل mute إذا كانت ضوضاء
