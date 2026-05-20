# WAVE59: تحويل قناة الاتصال مع exports-svc إلى Nest ClientProxy

## الهدف
تحويل قناة الاستدعاء من HTTP إلى ناقل رسائل عبر Nest ClientProxy مع الحفاظ على سلوك المنتج، مع بقاء Service Outbox طبقة الموثوقية.

## أهم الإضافات
- دعم 3 قنوات
  - http للتوافق والتراجع
  - rmq عبر RabbitMQ
  - redis للتطوير والتجارب
- exports-svc صار تطبيق هجين: HTTP + Microservice listener حسب EXPORTS_RENDERER_CHANNEL
- ServiceOutboxService صار يستدعي التوليد عبر ClientProxy.send عندما تكون القناة rmq أو redis
- ExportsService في وضع sync صار ينشئ Service Outbox event ثم dispatch فوري لتوحيد المسار

## متغيرات البيئة الجديدة
- EXPORTS_RENDERER_CHANNEL
- EXPORTS_RMQ_URL
- EXPORTS_RMQ_QUEUE
- EXPORTS_RMQ_PREFETCH
- EXPORTS_REDIS_HOST
- EXPORTS_REDIS_PORT
- EXPORTS_RENDER_TIMEOUT_MS

## تشغيل محلي
راجع:
- docs/runbooks/RUNBOOK_LOCAL_DEV_AR.md
- docs/runbooks/RUNBOOK_WAVE59_RMQ_AR.md

## ملاحظات تشغيلية
- RabbitMQ موصى به للإنتاج بسبب acknowledgements ودعم queues durable
- Redis ناقل Pub/Sub fire-and-forget ولا يقدم ضمان معالجة أو حفظ للرسائل عند غياب المستهلك
