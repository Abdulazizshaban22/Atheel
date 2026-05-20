# Wave 104 — Type-risk Audit and Request Typing Hardening

## الهدف
إضافة طبقة إغلاق صادقة بين parse closure وtypecheck closure الكامل، مع تقليل عدد من فجوات `any` في المسارات الحرجة للنواة الخلفية.

## ما الذي بُني
- تعريف `ApiRequestLike` و`ApiResponseLike` وhelpers لقراءة headers/records بدون اعتماد واسع على `any`.
- تحديث `main.ts` و`request-tenant.util.ts` وinterceptors الأساسية لتستخدم الأنواع الجديدة.
- تحسين `experience-twin-sync-job.util.ts` باستبدال فحص diagnostics المعتمد على `as any` بحارس نوع صريح.
- إضافة `scripts/audit/ts-type-risk-audit.mjs` لتوليد تقرير `docs/reports/ts-type-risk-audit.json`.
- إضافة `scripts/type-risk-closure-verify.mjs` لتشغيل parse audit + type-risk audit + domain wiring في أمر واحد.

## لماذا هذه الموجة
الانتقال من parsing صالح إلى typecheck صالح يحتاج رؤية على مخاطر الأنواع نفسها، لا الاكتفاء بسلامة syntax فقط. لذلك هذه الموجة لا تدّعي compile closure كامل، لكنها تبني baseline واضحًا للمخاطر النوعية وتزيل بعض أكثرها وضوحًا من المسارات الحرجة.

## الأوامر
```bash
node scripts/audit/ts-type-risk-audit.mjs
node scripts/type-risk-closure-verify.mjs
```
