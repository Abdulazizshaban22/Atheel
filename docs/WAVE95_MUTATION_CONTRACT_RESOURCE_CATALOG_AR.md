# Wave95 — Mutation Contract and Resource Catalog Hardening

## الهدف
هذه الموجة لا تضيف Feature جديدة للمستخدم النهائي، بل تقلل التشتت الداخلي في النواة.

التركيز كان على ثلاث مشاكل حقيقية:
- تكرار magic strings داخل Policy و Audit و mutation events
- تكرار اقتران `@Policy` مع `@AuditAction` عبر عدد من controllers الأساسية
- تفاوت أسماء الموارد والأفعال بين controller و service و event emission

## ما الذي تم بناؤه

### 1) كتالوج مركزي للموارد والأفعال
تمت إضافة ملف:
- `apps/api/src/common/contracts/resource-action.catalog.ts`

ويجمع بشكل صريح:
- Policy actions
- Policy resources
- Audit entity types
- Core mutation actions
- Core event types
- Mutation subject kinds
- مبدّل موحد لحالات approval إلى event types

الهدف من ذلك هو تقليل الأخطاء الناتجة عن الكتابة الحرة للنصوص مثل:
- approvals
- approval_packets
- approval_request
- attachment.link
- experience.twin.ensure

### 2) Decorator موحد لمسارات mutation الأساسية
تمت إضافة:
- `apps/api/src/common/contracts/core-mutation-route.decorator.ts`

وهو decorator مركب يجمع:
- `@Policy(...)`
- `@AuditAction(...)`

في عقد واحد مقروء. هذا يقلل التكرار ويجعل mutation routes الأساسية أكثر اتساقًا.

### 3) تحويل الـ core controllers إلى catalog-backed contracts
تم تحديث controllers الأساسية بحيث تعتمد على الكتالوج بدل النصوص المباشرة، خصوصًا في:
- projects
- content
- experiences
- approvals
- attachments
- users

كما تم تحديث controllers غير الأساسية التي تستخدم Policy فقط مثل:
- capabilities
- approval-packets
- exports

### 4) ربط application services بالكتالوج المركزي
تم تحديث application services الأساسية لاستخدام constants موحدة في:
- audit actions
- entity types
- event types
- subject building

ويشمل ذلك:
- projects
- content
- experiences
- approvals
- attachments

### 5) اختبار يحمي العقد الجديدة
تمت إضافة اختبار:
- `apps/api/test/mutation-contract-catalog.e2e-spec.ts`

وهذا الاختبار لا يعتمد على تدفق تشغيلي طويل، بل يتحقق مباشرة من metadata المطبقة على المسارات الأساسية، حتى لا يرجع المشروع إلى strings مبعثرة في المستقبل دون ملاحظة.

## لماذا هذا مهم
المشروع الآن كبر بما يكفي بحيث تصبح مشكلة التسمية نفسها مشكلة تشغيلية.

بدون كتالوج مركزي، يحدث الآتي مع الوقت:
- route يستخدم resource باسم
- service يستخدم action باسم قريب لكن مختلف
- audit يستخدم entityType مختلفة حرفيًا
- event subject يتغير من ملف إلى آخر

وهذا يسبب:
- صعوبة في handoff
- تضخم تكلفة refactor
- أخطاء silent في السياسات أو التدقيق أو التقارير

## ما الذي اكتمل
- catalog مركزي للموارد والأفعال الأساسية
- decorator موحد للمسارات mutating routes
- تحديث controllers الأساسية إلى contract أوضح
- تحديث core application services لتقليل magic strings
- تحديث policy typing لتصبح أقرب إلى الكتالوج
- اختبار metadata لحماية العقد الجديدة

## ما الذي لم يكتمل بعد
- ما زالت هناك وحدات خارج النواة تعتمد strings حرة في audit/actions/events
- لا يوجد بعد resource registry كامل لكل المنصة الواسعة
- لم ندخل بعد repository layer رسمية للـ core entities
- لا يوجد بعد OpenAPI response contract موحد لكل mutations

## النتيجة
Wave95 لم تكبّر المشروع من الخارج، لكنها جعلت النواة أقل هشاشة.

وهذا مهم جدًا قبل الدخول في موجات:
- repositories
- outbox الحقيقي
- response contract polishing
- frontend shell hardening
