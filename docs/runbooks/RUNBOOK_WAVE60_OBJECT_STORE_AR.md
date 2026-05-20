# تشغيل Wave60 Object Store للمخرجات

## الهدف
جعل مخرجات PDF و PPTX و ZIP تُحفظ خارج الرسائل (RMQ/Redis/HTTP) داخل Object Store، ثم يعود للـ API مؤشر فقط.

## الإعدادات
في .env:
- OBJECT_STORE_DIR=runtime_object_store
- EXPORTS_ARTIFACTS_MODE=object_store
- OBJECT_STORE_GC_AFTER_ATTACH=0

ملاحظة: عند تشغيل API و exports-svc من نفس مجلد المونوريبو، سيتم مشاركة نفس نظام الملفات تلقائيًا.

## تشغيل محلي
1) شغل البنية الأساسية:
- docker compose -f infra/docker-compose.dev.yml up -d

2) شغل التطبيقات:
- pnpm dev

## فحص سريع
1) نفذ توليد حزمة اعتماد
2) راقب أن exports-svc يرجع artifacts تحتوي object.key
3) راقب أن API يحولها إلى Attachments دون base64

## تنظيف ملفات Object Store
إذا ضبطت OBJECT_STORE_GC_AFTER_ATTACH=1 سيحذف API ملف المصدر بعد إنشاء Attachment.
استخدمه عندما تكون Attachments هي التخزين النهائي.

## جاهزية للإنتاج
في الإنتاج يفضّل استبدال السواقة إلى S3/MinIO (عبر إضافة Driver جديد في packages/object-store) ثم تحديث الإعدادات دون تغيير مسار الأعمال.
