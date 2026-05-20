# Wave 107

هذه الموجة ركزت على خفض أخطاء type-level المحلية في أعلى الملفات خطورة، دون ادعاء إغلاق build كامل.

## ما الذي تم
- إضافة `paths` في `apps/api/tsconfig.json` حتى يتم حل حزم `@madar/*` من monorepo بدل اعتبارها مفقودة داخل تدقيق typecheck.
- توسيع `runtime-audit-globals.d.ts` بإعلانات أكثر دقة لـ `Buffer` و`process.cwd()` و`node:fs` و`yauzl` و`qrcode`.
- تصحيح wiring بين `ApprovalPacketsService` وطبقات الكتابة الصحيحة: `ContentApplicationService` و`AttachmentsApplicationService`.
- تصدير application services من `ContentModule` و`AttachmentsModule`.
- تقليل `implicit_any` في `workflows.service.ts`.
- تضييق typing في `verification.service.ts` و`attachments.application-service.ts`.

## ملاحظة صريحة
هذه الموجة تحسن baseline typecheck بشكل عملي، لكنها لا تدعي compile closure كامل للمستودع.
