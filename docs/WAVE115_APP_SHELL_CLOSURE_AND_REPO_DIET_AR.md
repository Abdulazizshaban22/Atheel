# Wave 115 — App Shell Closure and Repo Diet

## الهدف
إدخال `apps/worker` و `apps/exports-svc` و `apps/web` إلى مسار تدقيق TypeScript أخف وأكثر واقعية، بدون الادعاء أن كل صفحات الويب أو كامل worker أُغلق نهائيًا.

## ما الذي تم
- إضافة shared app audit globals تحت `apps/@types/app-audit-globals.d.ts`.
- إضافة `tsconfig.audit.json` مستقلة لـ worker bootstrap و exports-svc shell و web shell.
- إضافة سكربت `scripts/audit/ts-app-shell-audit.mjs` لإخراج تقرير موحد.
- إضافة سكربت `scripts/apps-shell-closure-verify.mjs` لتشغيل parse + type-risk + api + packages + app-shell.
- tightening في `apps/web/middleware.ts` و `apps/web/next.config.ts` و `apps/web/app/login/page.tsx`.
- حذف verify scripts القديمة الضيقة التي لم تعد تضيف قيمة بعد توحيد مسار الإغلاق.

## التحقق
تم تشغيل:
- `node scripts/audit/ts-app-shell-audit.mjs`
- `node scripts/apps-shell-closure-verify.mjs`

ونجح المسار الجديد في البيئة الحالية.

## ماذا لم يُغلق بعد
- worker execution engine الكامل في `apps/worker/src/index.ts`
- جميع صفحات `apps/web`
- full monorepo `pnpm build`
