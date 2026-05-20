# Wave60

## العنوان
نقل مخرجات PDF و PPTX خارج الرسائل إلى Object Store وإرجاع مؤشرات فقط

## المشكلة التي تعالجها هذه الموجة
عند نقل ملفات كبيرة داخل الردود أو رسائل الناقل مثل RabbitMQ أو Redis، يحدث:
- ضغط على الناقل وحجم رسائل مرتفع
- بطء وإعادة محاولات مكلفة
- مخاطر حدود الحجم القصوى للرسائل
- استهلاك ذاكرة عالي في API بسبب تحويل base64

## ما الذي تغيّر
1) exports-svc لم يعد يرجع الملفات كـ base64 افتراضيًا
- يرجع قائمة artifacts مع مؤشر object { provider, key }
- يمكن تفعيل وضع inline للتجارب فقط عبر EXPORTS_ARTIFACTS_MODE=inline

2) إضافة Object Store محلي قابل للاستبدال
- مسار التخزين عبر OBJECT_STORE_DIR
- مفاتيح ملفات منظمة تحت exports/<packetId>/<date>/...
- إضافة Inbox بسيطة لضمان Idempotency في exports-svc عبر تخزين نتيجة messageId

3) API صار يقرأ المخرجات من Object Store بدل payload
- دعم مسارين:
  - object.key: إنشاء Attachment من ملف على القرص دون تحميله بالكامل في الذاكرة
  - base64: للتوافق فقط

4) AttachmentsService أضيف له createFromFilePath
- لتفادي تحميل الملفات الكبيرة في الذاكرة

## متغيرات البيئة
- OBJECT_STORE_DIR=runtime_object_store
- OBJECT_STORE_GC_AFTER_ATTACH=0 أو 1
- EXPORTS_ARTIFACTS_MODE=object_store أو inline

## توافق للخلف
تم الحفاظ على خيار base64 كمسار توافق فقط. الموصى به هو object_store.
