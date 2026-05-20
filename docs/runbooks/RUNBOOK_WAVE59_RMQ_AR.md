# RUNBOOK: Wave59 تشغيل قناة RabbitMQ بين API و exports-svc

## الهدف
تشغيل توليد المخرجات الثقيلة عبر RabbitMQ باستخدام Nest ClientProxy بدون تغيير سلوك المنتج، مع بقاء Service Outbox هو طبقة الموثوقية.

## المتطلبات
- RabbitMQ يعمل محليا عبر docker-compose.dev.yml
- ضبط متغيرات البيئة في .env

RabbitMQ في Nest يتطلب تثبيت amqplib و amqp-connection-manager. citeturn1view0

## الإعدادات المطلوبة
في .env:
- EXPORTS_RENDERER_CHANNEL=rmq
- EXPORTS_RMQ_URL=amqp://guest:guest@localhost:5672
- EXPORTS_RMQ_QUEUE=atheel.exports.render
- EXPORTS_RENDERER_TOKEN=قيمة قوية

## التشغيل محليا
1) شغل البنية المساندة
- docker compose -f infra/docker-compose.dev.yml up -d

2) شغل API + Worker + exports-svc
- pnpm dev

3) تحقق
- GET /health على exports-svc
- ثم نفذ طلب تصدير من API

## ملاحظة عن acknowledgements
تم تفعيل noAck=false على خادم RMQ داخل exports-svc، ويتم ack بعد اكتمال التوليد لضمان إعادة جدولة الرسالة عند فشل المستهلك قبل الإنهاء. citeturn1view0
