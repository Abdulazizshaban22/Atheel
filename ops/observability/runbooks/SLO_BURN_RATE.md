# Runbook — SLO Burn Rate Alerts

## المفهوم
Burn rate يعني سرعة استهلاك ميزانية الأخطاء مقارنة بالمسموح ضمن نافذة زمنية.
المشروع يستخدم تنبيهات متعددة النوافذ fast/slow لتقليل الإنذارات الكاذبة.

## إشارات الخطر
- ارتفاع burn rate في نافذة قصيرة (5m/1h)
- تزامن ذلك مع ارتفاع p95 في http_server_duration_seconds
- ارتفاع outbox failures

## خطوات الاستجابة
1) حدد أين الفشل
- API: راقب route latency + status
- Worker: راقب تراكم المهام والـ retries

2) خفف الضرر
- فعّل وضع degraded إن كان متوفرًا لبعض المسارات الثقيلة
- زد سعة worker concurrency بشكل مضبوط

3) أصلح السبب الجذري
- قاعدة البيانات: فهارس أو استعلامات بطيئة
- Redis: اتصال أو ضغط
- مزود خارجي: Slack/Email webhook

4) التحقق
- burn rate يعود لمستوى طبيعي
- incident لا يعيد الظهور بسبب dedup

