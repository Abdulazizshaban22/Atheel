# Checklist تشغيل الحزمة Workflows500

## API
- تثبيت الحزم وإعادة توليد Prisma client بعد إضافة الموديلات
- تشغيل migration: `prisma migrate deploy`
- فحص:
  - `GET /api/workflows/catalog/summary`
  - `GET /api/workflows/catalog?limit=5`
  - `POST /api/workflows/runs/simulate`

## Web
- فتح `/workflows`
- البحث والتصفية حسب المجال
- تشغيل محاكاة قالب والتأكد من ظهور trace والمؤشرات

## تكاملات لاحقة
- ربط queue worker للتنفيذ الحقيقي
- ربط knowledge collections للـ RAG
- ربط approvals notifications الفعلية
