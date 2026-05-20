# Wave51 — التحقق التدقيقي للحزم الرسمية (Forensic Verification)

## الهدف
رفع مستوى الثقة والقبول الرسمي عند تسليم حزم أثيل عبر PDF/PPTX/ZIP، عبر:
- صفحة تحقق عامة (بدون تسجيل دخول) تعرض بيانات الوثيقة الرسمية
- Endpoint تحقق يقرأ manifest.json داخل Bundle ZIP ويطابق بصمات SHA-256 لكل ملف

## ما تم تنفيذه

### 1) صفحة تحقق عامة
- مسار ويب جديد:
  - `/verify/approval-packets/:id`
- يعرض:
  - عنوان الوثيقة
  - معرّف الوثيقة documentId
  - رمز تحقق قصير verificationCode
  - بيانات الجهة المصدرة ووقت التوليد
  - تعليمات تحقق مختصرة

### 2) Endpoint تحقق ZIP تدقيقي
- API:
  - `POST /api/verification/bundles/verify?expectedPacketId=<ApprovalPacketId>`
- مدخلات:
  - multipart/form-data: `file` (ZIP)
- ماذا يفعل:
  - يقرأ `manifest.json`
  - يحسب SHA-256 لكل ملف داخل ZIP
  - يرجع:
    - match / mismatch / invalid
    - تفاصيل الملفات: expected vs actual
    - missing / extra
    - بصمة الـ ZIP نفسها `zipSha256`

### 3) تحسينات manifest.json
- إضافة:
  - `verificationCode` (مُشتق من packetId + generatedAt + organizationId)
  - `algorithm: sha256`

### 4) تحديث رابط التحقق داخل المخرجات
- رابط الـ QR داخل PDF/PPTX أصبح يشير إلى:
  - `/verify/approval-packets/:id`
بدل صفحة داخلية تتطلب صلاحيات.

## اعتبارات أمنية وتشغيلية
- استخدام SHA-256 كبصمة قوية موصى بها للاعتمادية والتوافق (NIST).
- التحقق العام يخضع للـ rate limiting الافتراضي.
- تم وضع حد أقصى لحجم ZIP عبر:
  - `VERIFY_MAX_ZIP_BYTES` (افتراضي 120MB)

## اختبار سريع
1) صدّر حزمة رسمية (Wave50)
2) افتح PDF وامسح QR → ستصل لصفحة التحقق العامة
3) ارفع Bundle ZIP في نفس الصفحة → يجب أن تظهر نتيجة مطابقة

