# Wave96 — Repository Boundaries and Response Contract Hardening

## الهدف
تثبيت حدين مهمين داخل النواة الأساسية:
- فصل الوصول للبيانات في domains الأساسية عالية الاستخدام عن services المباشرة
- توحيد success response envelope بشكل opt-in على المسارات الأساسية بدل إرجاع أجسام متفاوتة

## ماذا تم
- إضافة Response Envelope decorator/interceptor للمسارات الأساسية
- تسجيل interceptor عالمي opt-in لا يلف إلا المسارات المعلّمة صراحة
- إضافة repositories صريحة لـ projects و content و experiences
- نقل read path في هذه الوحدات إلى repositories بدل Prisma/DataStore المباشرين
- ربط application services في projects و content بهذه repositories مع دعم transactions
- تصحيح write path في experiences controller ليمر عبر ExperiencesApplicationService بدل service العام
- إضافة response contract واضح على controllers الأساسية: projects, content, experiences, approvals, attachments
- تحديث AuditTrailInterceptor ليتعامل مع response envelopes دون تلويث سجل التدقيق

## لماذا هذه الموجة مهمة
قبل هذه الموجة كانت الخدمات الأساسية مسؤولة عن:
- الوصول للبيانات
- منطق العمل
- تنسيق الاستجابة

وهذا يرفع coupling ويصعب handoff. بعد هذه الموجة صار لدينا:
- data access boundary أوضح
- success contract أوضح للواجهة والاختبارات
- controller intent أوضح بين read/write

## ملاحظات صريحة
- تبني repository pattern بدأ بالوحدات الأعلى استخدامًا ولم يُعمم بعد على كل المنصة
- لم يتم توحيد error envelope لأنها كانت موحدة أصلًا منذ Wave91
- لم أتحقق runtime داخل هذه الجلسة بسبب غياب تثبيت dependencies في البيئة الحالية
