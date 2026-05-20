# Wave12 — تحويل Markdown إلى PDF و PPTX + حزمة تسليم

## الفكرة
بعد توليد حزمة الاعتماد Wave11، يتم تحويل المستندات الناتجة (Markdown) إلى ملفات فعلية:

- عرض الفعالية: PPTX
- الاستراتيجية: PDF
- الدراسة التشغيلية: PDF
- حزمة الاعتماد: PDF
- حزمة تسليم ZIP تشمل كل الملفات + metadata

## متطلبات تشغيل PDF
يعتمد توليد PDF على Headless Chromium عبر puppeteer-core.

- اضبط المتغير `CHROME_EXECUTABLE_PATH`
- في Docker (Alpine) تم تثبيت chromium داخل صورة API

## واجهات API

### توليد الحزمة
POST `/api/exports/approval-packets/:id/generate`

Body مثال:
```json
{
  "async": false,
  "includePptx": true,
  "includePdf": true,
  "includeBundleZip": true,
  "includeSignatures": true,
  "pageSize": "A4"
}
```

### حالة Job
GET `/api/exports/jobs/:id`

### تنزيل ملف ناتج
GET `/api/exports/download/:attachmentId`

## Worker
عند تفعيل Queue Mode = redis:

- يتم دفع Job إلى `EXPORT_QUEUE` (الافتراضي: atheel-exports)
- يلتقطه Worker ويستدعي:
  POST `/api/exports/jobs/:id/run`
  مع Header: `X-Worker-Token`
