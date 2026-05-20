# Build Stabilization

## الهدف
هذه المرحلة تحوّل أثيل من دفعات تطوير وظيفية متتالية إلى قاعدة قابلة للنشر والتحقق المستمر.

## المسارات الأساسية
- `pnpm db:generate`
- `pnpm typecheck`
- `pnpm build`
- `pnpm api:smoke`

## آلية العمل المقترحة
1. تشغيل Prisma generate بعد أي تعديل يمس الحزم المرتبطة بقاعدة البيانات.
2. منع دمج أي Pull Request إذا فشل typecheck أو build.
3. تشغيل smoke checks على بيئة staging بعد النشر مباشرة.
4. ربط نتائج smoke checks مع التنبيه التشغيلي.

## ملاحظات
- smoke checks الحالية خفيفة ومقصودة كحد أدنى.
- يفضّل لاحقًا إضافة e2e tests عبر Nest + Supertest.
- يفضّل تنفيذ migrations عبر pipeline وليس يدويًا على الإنتاج.
