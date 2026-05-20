# Wave62 — Heritage Safety Layer Lite

تمت إضافة طبقة أولية لسلامة الأصول التراثية داخل `heritage` بدون كسر البنية الحالية أو فرض migration جديد.

## ما أضيف فعليًا

### API Endpoints
- `GET /api/heritage/assets/:id/safety-profile`
- `POST /api/heritage/assets/:id/safety-profile`
- `POST /api/heritage/assets/:id/assessments/run`

### السلوك
- إنشاء ملف سلامة افتراضي حسب نوع الأصل: `architectural` / `material` / `immaterial`
- تخزين ملف السلامة داخل `HeritageAsset.accessPolicy.safetyProfile`
- تقييم المخاطر بناءً على:
  - نوع التجربة
  - عدد الزوار المتوقع
  - ذروة الزوار في الساعة
  - الأنشطة المقترحة
  - الضوابط المتوفرة
- إخراج `riskScore` و `riskLevel` و `findings` و `recommendationAr`

## الملفات المعدلة
- `apps/api/src/modules/heritage/heritage.controller.ts`
- `apps/api/src/modules/heritage/heritage.service.ts`
- `apps/api/src/modules/heritage/dto/update-heritage-safety-profile.dto.ts`
- `apps/api/src/modules/heritage/dto/run-heritage-safety-assessment.dto.ts`

## ملاحظات
- هذه نسخة Lite سريعة وآمنة فوق البنية الحالية.
- لم تتم إضافة جداول جديدة بعد.
- الخطوة التالية المقترحة: ربط نتيجة التقييم تلقائيًا مع `approvals` و `approval-packets` كـ blocker أو warning.
