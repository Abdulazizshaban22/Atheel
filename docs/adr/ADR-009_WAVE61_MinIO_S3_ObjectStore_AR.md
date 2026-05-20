# ADR-009: Wave61 تحويل Object Store إلى MinIO S3-compatible

## القرار
اعتماد سواقة Object Store جديدة من نوع S3-compatible (MinIO) داخل `packages/object-store`، بحيث يتم تخزين مخرجات التصدير ككائنات داخل Bucket وإرجاع مؤشرات `object.key` فقط، مع إبقاء مسار الموثوقية عبر Service Outbox و Idempotency كما هو.

## الدافع
في Wave60 تم نقل الملفات الكبيرة خارج الرسائل إلى Object Store محلي لتفادي نقل base64. هذا يعمل للتطوير، لكنه لا يفي بمتطلبات الإنتاج (تعدد السيرفرات، مشاركة الملفات، سعة أكبر، نسخ احتياطي). MinIO يقدم واجهة S3-compatible ويمكن تشغيله داخليًا.

## تفاصيل تقنية
### 1) السواقة
- تمت إضافة `S3ObjectStore` في `packages/object-store` باستخدام AWS SDK v3.
- يتم ضبط `endpoint` للاتصال بـ MinIO، مع تفعيل `forcePathStyle` لأن MinIO في بيئات كثيرة يحتاج path-style عند العمل مع endpoint غير AWS.

### 2) إنشاء الـ Bucket
للتطوير المحلي يتم إنشاء Bucket تلقائيًا عبر حاوية `minio/mc` داخل `infra/docker-compose.dev.yml` باستخدام `mc mb` (make bucket).

### 3) التحويل إلى Attachments
داخل API:
- إذا كان الـ provider = local يتم تحويل `object.key` إلى مسار مباشر كما كان.
- إذا كان الـ provider = s3 يتم تنزيل الكائن إلى ملف مؤقت ثم تحويله إلى Attachment عبر `createFromFilePath`، وبعدها يحذف الملف المؤقت.

## الإعدادات
في `.env`:
- `OBJECT_STORE_PROVIDER=s3`
- `S3_ENDPOINT=http://localhost:9000`
- `S3_BUCKET=atheel`
- `S3_ACCESS_KEY_ID` و `S3_SECRET_ACCESS_KEY`
- `S3_FORCE_PATH_STYLE=1`

## بدائل تم رفضها
1) نقل الملفات داخل الرسائل (base64) مرفوض لأنه يضغط الذاكرة وحدود أحجام الرسائل.
2) الاعتماد على مسارات ملفات مشتركة (NFS) مرفوض لأنه يزيد التعقيد ويجعل التشغيل أصعب.
