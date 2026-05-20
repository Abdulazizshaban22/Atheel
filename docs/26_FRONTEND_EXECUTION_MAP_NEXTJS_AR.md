# خارطة تنفيذ الواجهة Next.js — أَثِيل (محدثة v0.3)

## الوضع الحالي v0.3
- صفحة Login تعمل مع login + me + refresh + logout
- Workbench موحد لاختبار CRUD الأساسي (projects/content/experiences)
- صفحات تشغيلية مستقلة لبدء العمل على users / approvals / attachments
- صفحات projects/content/experiences حالياً تعمل كبوابات تشغيلية للوحدات والربط بالـ Workbench

## الشاشات الحالية
- /
- /login
- /workbench
- /projects
- /content
- /experiences
- /users
- /approvals
- /attachments

## شاشات عامة لجهات الاستلام (بدون تسجيل دخول)
- /verify/approval-packets/:id
  - تعرض بيانات الوثيقة الرسمية ورمز التحقق
  - تحتوي نموذج رفع ملف ZIP للتحقق التدقيقي من manifest.json وبصمات SHA-256
  - تتيح تحميل تقرير التحقق (JSON + تقرير نصي)

## المطلوب في v0.4
- تحويل صفحات projects/content/experiences إلى CRUD احترافي مستقل (جداول + نماذج + filters)
- حراسة مسارات حسب الصلاحيات
- Layout موحد للمنصة + sidebar + breadcrumbs
