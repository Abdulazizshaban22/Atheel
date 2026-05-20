# ADR-007: Wave59 تحويل قناة الاتصال مع exports-svc إلى Nest ClientProxy

## الحالة
مقبول

## السياق
في Wave58 تم بناء Service Outbox داخل API لضمان تنفيذ موثوق وإعادة محاولات عند استدعاء خدمة التصدير exports-svc، مع إيديمبوتنسي على مستوى ExportJob ومنع تكرار التنفيذ غير المقصود.

كانت القناة بين API و exports-svc في Wave58 تعتمد على HTTP عبر مسار /internal/render.

## القرار
في Wave59 تم إضافة خيار قناة اتصال عبر Nest ClientProxy باستخدام أحد ناقلين:

- RabbitMQ كخيار إنتاجي افتراضي
- Redis كخيار تطوير وتجارب
- HTTP يبقى كمسار توافق وتراجع

يتم استخدام نمط Request-Response عبر ClientProxy.send للحفاظ على السلوك الحالي بدون تغيير نتائج المنتج أو مسارات البيانات، مع بقاء ضمانات الموثوقية في Service Outbox.

ClientProxy في Nest يوفر send للطلب مع رد و emit للأحداث. citeturn0search0

## لماذا RabbitMQ هو الافتراضي
RabbitMQ يدعم message acknowledgements وإعادة جدولة الرسالة عند تعطل المستهلك قبل الإقرار، إضافة لإمكانية تفعيل دوام الرسائل وطابور durable. citeturn1view0

## لماذا Redis ليس كافيا للإنتاج
ناقل Redis في Nest مبني على Pub/Sub وهو fire-and-forget، ولا يقدم ضمان معالجة أو حفظ للرسائل عند عدم وجود مشتركين. citeturn2view0

## تبعات القرار
- exports-svc صار تطبيق هجين: HTTP + Microservice server حسب EXPORTS_RENDERER_CHANNEL
- API صار يختار القناة حسب EXPORTS_RENDERER_CHANNEL
- Service Outbox يبقى مصدر الموثوقية الرئيسي، ولا يتم الاعتماد على الناقل وحده لضمان الاتساق

## خيارات بديلة تم رفضها
- نقل ملفات PDF و PPTX داخل الرسائل بشكل دائم بدون تخزين خارجي
  تم قبول ذلك مؤقتا للحفاظ على السلوك الحالي، لكن يوصى في Wave لاحق بنقل الملفات إلى Object Storage وإرسال المؤشرات فقط.
