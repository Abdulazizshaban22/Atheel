# Prisma Baseline Runbook

## متى نستخدم هذا المسار
نستخدم Baselining عندما تكون schema الحالية أوسع من تاريخ migrations الفعلي، أو عندما نرث قاعدة موجودة لا يمكن reset لها.

## المسار المعتمد لأثيل
1. تثبيت dependencies وتشغيل Prisma locally.
2. أخذ نسخة احتياطية من قاعدة البيانات الهدف.
3. إنشاء قاعدة مرجعية نظيفة للمقارنة.
4. استخدام Prisma migrate diff أو migrate dev لإنتاج SQL الحقيقي بدل placeholder files.
5. مراجعة SQL يدويًا قبل commit.
6. تطبيق migrate deploy على Stage نظيفة.
7. توثيق نتيجة التطبيق في docs/closure/STAGING_DRESS_REHEARSAL.md.

## قواعد السلامة
- لا يتم توليد baseline مباشرة على Production.
- لا يتم تمرير release إذا ظل أي migration placeholder.
- أي SQL يدوي يجب أن يوثق سبب وجوده في رأس الملف.

## مخرجات الإغلاق
- migration history قابلة للتطبيق من أولها إلى آخرها
- تقرير readiness بدون blockers
- CI release gate أخضر
