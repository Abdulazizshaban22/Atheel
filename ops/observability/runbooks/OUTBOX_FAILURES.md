# Runbook: Outbox failures / Incident storm

## Symptoms
- ارتفاع atheel_outbox_failed_total
- زيادة Incidents أو تكرار IncidentKey نفسه
- Burn-rate سريع على SLO outbox

## Immediate checks (5 دقائق)
1) تحقق من Redis
- اتصال Redis فعال
- لا يوجد timeouts أو maxmemory eviction
2) تحقق من قناة الإرسال
- SMTP / WhatsApp / Webhook endpoint
- DNS / TLS / rate limits
3) تحقق من queue lag
- عدد jobs pending/active في BullMQ

## Mitigation
- فعّل quiet hours مؤقتًا إذا الضوضاء عالية وغير حرجة
- زد dedup window مؤقتًا
- عطل channel الخارجي المتعطل مع إبقاء in-app notifications

## Recovery
- أعد تفعيل القناة تدريجيًا
- راقب burn-rate على نافذتين (fast/slow)
- أغلق الحادثة بعد استقرار 30 دقيقة

## Post-incident
- وثّق السبب الجذري
- أضف اختبار تكاملي للقناة
- أضف alert rule مبكر على error budget
