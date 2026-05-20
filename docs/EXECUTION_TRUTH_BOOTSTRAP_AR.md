# دفعة Toolchain Bootstrap + Execution Truth Run

هذه الدفعة تضيف مسارًا أوضح لتجهيز البيئة قبل الإغلاق التنفيذي الحقيقي.

## ما الذي أضيف
- `scripts/toolchain-bootstrap.mjs`
- `scripts/execution-truth-run.mjs`
- تحسين `scripts/runtime-preflight.mjs`
- أوامر جديدة في `package.json`

## الأوامر الجديدة
- `pnpm toolchain:bootstrap`
- `pnpm execution:truth:run`

## الهدف
- تفعيل `pnpm` عبر `corepack` إذا لم يكن موجودًا
- تثبيت الاعتماديات إذا لم تكن موجودة
- تشغيل preflight
- تشغيل runtime closure run
