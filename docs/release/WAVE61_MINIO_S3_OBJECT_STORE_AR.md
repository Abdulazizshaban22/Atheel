# Release Notes: Wave61 MinIO / S3 Object Store Driver

## الهدف
تحويل Object Store من تخزين محلي فقط إلى دعم S3-compatible (MinIO) عبر Driver جديد، بدون تغيير منطق الأعمال أو مسارات Service Outbox.

## التغييرات
1) `packages/object-store`
- إضافة `S3ObjectStore` باستخدام AWS SDK v3.
- إضافة `OBJECT_STORE_PROVIDER` لاختيار `local` أو `s3`.

2) `exports-svc`
- استخدام `createObjectStoreFromEnv()` بدل الاعتماد الصريح على LocalObjectStore.
- حفظ Idempotency inbox داخل نفس Object Store.

3) `api` (ServiceOutbox)
- في حالة Object Store = s3: تنزيل الكائن إلى ملف مؤقت ثم إنشاء Attachment عبر `createFromFilePath`.
- خيار حذف المصدر من Object Store بعد التحويل عبر `OBJECT_STORE_GC_AFTER_ATTACH=1`.

4) `infra`
- إضافة MinIO + createbuckets إلى `infra/docker-compose.dev.yml`.

## متغيرات البيئة الجديدة
- `OBJECT_STORE_PROVIDER=local|s3`
- `OBJECT_STORE_TMP_DIR=runtime_object_tmp`
- `S3_ENDPOINT`
- `S3_REGION`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_BUCKET`
- `S3_FORCE_PATH_STYLE`
- `S3_KEY_PREFIX` (اختياري)

## تشغيل
راجع: `docs/runbooks/RUNBOOK_WAVE61_MINIO_S3_OBJECT_STORE_AR.md`
