# Migration Policy

## الهدف
هذا المستند يقفل مسار قاعدة البيانات لأثيل بحيث لا تنتقل أي بيئة Stage أو Production مع تاريخ هجرات غير موثوق.

## القاعدة الحاكمة
- التطوير المحلي يستخدم Prisma Migrate Dev فقط.
- بيئات CI و Stage و Production تستخدم Prisma Migrate Deploy فقط.
- أي migration تحمل كلمات placeholder أو scaffold أو use prisma migrate تعتبر غير قابلة للترقية إلى staging حتى يتم استبدالها بـ SQL مولد أو SQL منسق ومراجع.

## لماذا هذا مهم
- أثيل أصبح يعتمد على Prisma كمسار الحقيقة في المسارات الجوهرية.
- وجود placeholders داخل التاريخ يعني أن schema الحالية لا يمكن الدفاع عنها كأصل production-ready.
- الإصلاح الصحيح ليس حذف التاريخ عشوائيا، بل تحويله إلى migration history قابلة للتطبيق والتدقيق.

## السياسة التنفيذية
1. لا يتم تعديل migration مطبقة سابقًا في بيئة مشتركة.
2. عند اكتشاف scaffold قديم:
   - يتم حصره في تقرير readiness.
   - يتم توليد SQL الحقيقي محليًا من Prisma.
   - تتم مراجعة SQL يدويًا.
   - يتم اختبار migrate deploy على قاعدة Stage نظيفة.
3. يمنع تمرير Release Channel من نوع staging أو production إذا بقي أي scaffold أو placeholder.

## الملفات المرتبطة
- docs/closure/PLACEHOLDER_MIGRATIONS.md
- docs/closure/MIGRATION_CLOSURE_READINESS.md
- docs/database/PRISMA_BASELINE_RUNBOOK.md
- .github/workflows/release-gate.yml
