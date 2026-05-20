# Wave94 — Core Domain Extension

## الهدف
هذه الموجة تكمل Wave93 بدل أن تبدأ مسارًا جديدًا. الهدف كان توسيع نمط Application Services إلى وحدات Core إضافية حتى لا تبقى النواة نصفها منظم ونصفها ما يزال CRUD مباشرًا.

## ما الذي تم بناؤه
- إضافة Application Service للتجارب Experience mutations
- إضافة Application Service لطلبات الاعتماد Approval mutations
- إضافة Application Service للمرفقات Attachment mutations
- توحيد كتابة audit للعمليات السابقة مع before/after snapshots عند الحاجة
- إضافة domain mutation event envelope بسيط فوق Operational Events حتى تصبح عمليات الكتابة أقرب إلى outbox-ready behavior
- تحويل controllers لهذه المسارات إلى skipAutoRecord لأن التسجيل صار intentional داخل application services

## لماذا هذا مهم
قبل هذه الموجة كانت النواة مقسومة كالتالي:
- Projects و Content لديهما طبقة كتابة أوضح
- Experiences و Approvals و Attachments ما زالت تعتمد أكثر على services تنفيذية مباشرة

هذا يخلق تفاوتًا في:
- شكل الكود
- دقة الأثر التدقيقي
- قابلية handoff
- قابلية التطوير اللاحق نحو events/outbox/repositories

Wave94 يقلل هذا التفاوت.

## ما الذي تغيّر معماريًا
### 1) Experiences
القراءة ما زالت في `ExperiencesService`.
أما العمليات التالية فأصبحت تمر عبر `ExperiencesApplicationService`:
- create
- update
- remove
- ensureTwin

### 2) Approvals
القراءة والتصفية ما زالت في `ApprovalsService`.
أما العمليات التالية فأصبحت تمر عبر `ApprovalsApplicationService`:
- create
- submit
- approve
- reject
- requestChanges
- cancel

### 3) Attachments
القراءة والتنزيل ما زالت في `AttachmentsService`.
أما العمليات التالية فأصبحت تمر عبر `AttachmentsApplicationService`:
- upload
- createFromBuffer
- createFromFilePath
- link

## audit behavior
لم أستخدم global interceptor هنا للعمليات الحساسة السابقة، لأن المطلوب كان تسجيلًا أدق من مجرد request/result عام. لذلك تم اعتماد:
- skipAutoRecord على المسارات التي أصبحت تسجل audit بنفسها
- buildAuditLogPayload عند نجاح الكتابة على قاعدة البيانات
- fallback إلى AuditLogsService عند عدم توفر writer المباشر

## event behavior
أُضيف utility جديد:
- `common/events/domain-mutation-event.util.ts`

وظيفته بناء envelope موحد للـ operational events من request context الحالي:
- organizationId
- actorUserId
- requestId
- correlationId
- eventType
- subject
- severity

هذا لا يعني أن لدينا outbox domain كاملاً بعد، لكنه يجهز النواة منطقيًا لذلك.

## القيود الحالية
- لم يتم بعد توحيد repositories على مستوى النواة
- لم يتم بعد تحويل كل mutations إلى interactive transactions كاملة
- ما زالت بعض الخدمات تحتوي منطقًا قديمًا لم أزلْه بالكامل لتقليل خطر الكسر
- لا يوجد verification runtime داخل هذه الجلسة بسبب غياب تثبيت dependencies محليًا

## الخطوة التالية
الخطوة الصحيحة بعد Wave94 هي:

### Wave95 — Mutation Contract and Resource Catalog Hardening
وفيها يتم:
- توحيد أسماء resources/actions في catalog مركزي
- تقليل magic strings
- بدء استخراج repository boundaries للكيانات الأساسية
- صقل response contracts لبعض المسارات المتفاوتة
