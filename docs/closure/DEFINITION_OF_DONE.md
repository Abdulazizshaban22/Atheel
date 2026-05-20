# Definition of Done

## 1) المصدر الحقيقي للبيانات
- كل مسارات Core CRUD في auth وusers وprojects وcontent وattachments وapprovals تعمل على Prisma فقط.
- لا يوجد أي اعتماد تشغيلي على DataStoreService داخل هذه الوحدات.
- staging وproduction يعملان مع STRICT_PERSISTENCE=true و ALLOW_IN_MEMORY_FALLBACK=false.

## 2) قاعدة البيانات والهجرات
- لا توجد scaffold أو placeholder migrations ضمن مسار الترقية إلى staging.
- `pnpm --filter @madar/db prisma:migrate:deploy` ينجح على قاعدة بيانات نظيفة وعلى قاعدة محدثة.
- seed الافتراضي baseline فقط، وdemo profile منفصل وصريح.

## 3) العقود والواجهات
- endpoint inventory محدث ومجمّد قبل dress rehearsal.
- worker contracts وqueue names موثقة ومثبتة.
- كل endpoint أساسي يمر عبر DTO validation وglobal ValidationPipe.

## 4) الجودة
- smoke tests الأساسية تمر على health + auth + core CRUD + queue health.
- build وtypecheck ناجحان في CI.
- health/live وhealth/ready وmetrics تعمل بعقود ثابتة.

## 5) المنتج والويب
- يوجد shell واضح يقود المستخدم إلى Review Center وOperations Center وAI Center بدل التشتت بين عشرات الصفحات.
- design system أساسي موحد للأزرار والبطاقات والجداول والتنبيهات وحالات الفراغ.
- الرحلات الأساسية يمكن تنفيذها خلال جلسة demo واحدة دون التنقل العشوائي.

## 6) التشغيل والتسليم
- staging dress rehearsal منفذ ومثبت بالملاحظات والنتائج.
- documentation pack كامل لفريق التطوير والاستلام.
- sales/demo pack جاهز بعرض تشغيلي واقعي غير مبالغ.
