# Wave 106 — Typecheck Audit Sprint and Compile Visibility

## الهدف
إغلاق الفجوة بين:
- parse closure
- type-risk audit
- وtypecheck visibility الفعلية على `apps/api`

هذه الموجة لا تدّعي build closure كاملًا، لكنها تجعلنا نعرف بدقة:
- كم diagnostics فعلية موجودة
- ما الذي سببه dependencies المفقودة
- وما الذي سببه كود محلي داخل المستودع

## ما الذي أُضيف
- `apps/api/src/@types/runtime-audit-globals.d.ts`
  - تعريفات خفيفة لبيئة Node runtime داخل audit path
  - تخفيف ضجيج `process` و`Buffer` وبعض `node:*` imports في التدقيق
- `scripts/audit/ts-typecheck-audit.mjs`
  - تشغيل `tsc` على `apps/api`
  - تحليل diagnostics
  - تصنيفها إلى categories قابلة للتنفيذ
  - إخراج تقرير JSON
- `scripts/typecheck-closure-verify.mjs`
  - تجميع parse audit + type-risk audit + typecheck audit + wiring audit في أمر واحد

## ما الذي عُدّل
- `apps/api/tsconfig.json`
  - إضافة `src/**/*.d.ts` إلى `include`
- `apps/api/src/common/audit/audit-trail.interceptor.ts`
  - إزالة property access رخوة على `unknown`
  - إضافة helpers أوضح لقراءة حقول response payload
- `apps/api/src/common/http/api-response-envelope.interceptor.ts`
  - تقييد body إلى `unknown`
- `apps/api/src/main.ts`
  - tightening لتوقيع callback في CORS origin resolver
- `package.json`
  - إضافة:
    - `audit:ts:typecheck`
    - `typecheck:closure:verify`

## النتائج الفعلية داخل البيئة
تم تشغيل:
- `node scripts/audit/ts-parse-audit.mjs`
- `node scripts/audit/ts-type-risk-audit.mjs`
- `node scripts/audit/ts-typecheck-audit.mjs`
- `node scripts/typecheck-closure-verify.mjs`

والنتيجة:
- parse audit passed for 672 files
- type-risk audit completed for 38 files with 0 findings
- typecheck audit produced 864 diagnostics on `apps/api`

## التوزيع الأهم
أكبر الفئات الحالية:
- `missing_module:external_package`
- `missing_module:workspace_package`
- `unsafe_property_access`
- `implicit_any`

أعلى hotspots:
- `approval-packets.service.ts`
- `attachments.application-service.ts`
- `exports.service.ts`
- `verification.service.ts`
- `workflows.service.ts`

## لماذا هذه الموجة مهمة
قبلها كان عندنا:
- parse صالح
- وtype-risk محدود على نطاق مستهدف

لكن لم يكن عندنا صورة كمية دقيقة عن:
- ماذا يمنع typecheck
- وما الذي يجب تنظيفه أولًا

الآن أصبح عندنا baseline عملي للموجة التالية.

## الخطوة التالية
Wave 107 يجب أن تدخل مباشرة على:
- `approval-packets.service.ts`
- `attachments.application-service.ts`
- `verification.service.ts`
- `workflows.service.ts`

مع هدف واضح:
خفض `unsafe_property_access` و`implicit_any` في أعلى 4 hotspots قبل أي ادعاء أقوى حول typecheck closure.
