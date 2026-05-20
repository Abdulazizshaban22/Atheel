# Product Definition + User Roles + Core Modules — Wave 121

## Product Definition

أَثِيل منصة تشغيل وقرار للتجارب والوجهات والبرامج الثقافية والسياحية والتراثية.

المنصة تخدم 6 قدرات أساسية:

1. تشغيل الجهة والمشاريع والبرامج
2. إدارة الأصول التراثية والمعرفة المرتبطة بها
3. تصميم التجربة والسرد والمحتوى
4. الحوكمة والمراجعة والاعتماد
5. دعم القرار بالمعرفة والذكاء المتخصص
6. القياس والتشغيل والنشر العام للزائر

## User Roles

### 1. Platform Super Admin
- إدارة البيئات والجهات
- إدارة سياسات الوصول
- الإشراف على الصحة التشغيلية
- دعم الإطلاقات والامتثال

### 2. Tenant Admin
- إدارة الجهة وأعضائها
- ضبط السياسات والأدوار
- اعتماد الإعدادات الأساسية

### 3. Program Director
- إنشاء البرامج والمبادرات
- متابعة الجاهزية والتقدم
- اتخاذ القرارات المرحلية

### 4. Project Manager
- إدارة المشاريع والمسارات الزمنية
- تنسيق الفرق
- إغلاق المتطلبات والمخاطر

### 5. Heritage Curator
- إدارة الأصول التراثية
- مراجعة الأصالة والسياق والمراجع
- اعتماد السرد المرتبط بالأصل

### 6. Content / Narrative Lead
- بناء السرد والمحتوى
- ربط المحتوى بالأدلة والمراجع
- تجهيز المخرجات للنشر أو الاعتماد

### 7. Experience Designer
- تصميم المسارات والتجارب
- ربط السرد بالمكان وبالزائر
- تجهيز visitor flows

### 8. Reviewer / Governance Officer
- مراجعة الأدلة
- إدارة الموافقات
- تقييم الجاهزية والمخاطر
- توثيق القرار

### 9. Operations Lead
- متابعة الحوادث والتنبيهات
- تتبع التشغيل والطوابير
- التنسيق مع فرق الدعم

### 10. Visitor / Public User
- تصفح المواقع والأصول والمسارات
- البحث والاستكشاف
- استهلاك القصص والوسائط

## Core Modules

### A. Platform & Identity
- Auth
- Users
- Roles / Policies
- Organizations
- Workspaces
- Audit Logs

### B. Delivery Core
- Projects
- Programs
- Content
- Attachments
- Approvals
- Approval Packets

### C. Heritage Core
- Heritage Assets
- Sites
- Collections
- References
- Evidence
- Narratives
- IIIF / Public Heritage

### D. Visitor Layer
- Visitor Guide
- Stories
- Routes / QR Journeys
- Public Pages
- Search / Discovery

### E. Intelligence Layer
- Knowledge Packs
- Knowledge Spine
- AI Assist
- Retrieval
- Research Import
- Domain Brains

### F. Governance & Operations
- Governance
- Risks
- Obligations
- Incidents
- Observability
- Queues
- Health / Metrics

### G. Advanced Layers
- Twin
- TwinSpec
- IoT
- 3D Asset Registry
- Impact / Analytics

## Main Workflows

### Workflow 1 — جهة جديدة
1. إنشاء organization
2. دعوة المستخدمين
3. تعيين الأدوار
4. إنشاء workspace
5. ضبط السياسات الأساسية

### Workflow 2 — مشروع / برنامج جديد
1. إنشاء program أو project
2. تحديد المالك والفريق
3. تحديد المرحلة والحالة
4. ربط المحتوى والمرفقات
5. فتح مسار مراجعة عند الحاجة

### Workflow 3 — أصل تراثي
1. إنشاء asset
2. ربط الموقع والحقبة والوسائط
3. إضافة المراجع والأدلة
4. صياغة سردية أولية
5. إرسال للمراجعة
6. اعتماد
7. نشر للزائر

### Workflow 4 — محتوى وسردية
1. إنشاء draft
2. ربط الأدلة والمراجع
3. مراجعة الجودة
4. اعتماد
5. تصدير أو نشر

### Workflow 5 — استعلام معرفي مدعوم بالذكاء
1. اختيار نطاق المعرفة
2. تنفيذ retrieval
3. توليد draft مساعد
4. عرض المصادر
5. مراجعة بشرية
6. اعتماد أو رفض

### Workflow 6 — حزمة اعتماد
1. تجميع الأدلة
2. إنشاء approval packet
3. مراجعة القرار
4. تصدير PDF/PPTX/ZIP
5. حفظ السجل

## Data Model Draft

### Platform
- User
- Session
- Role
- Permission
- Organization
- OrganizationMember
- Workspace
- AuditLog

### Delivery
- Program
- Project
- ProjectStage
- ContentItem
- Attachment
- Approval
- ApprovalStep
- ApprovalPacket

### Heritage
- HeritageAsset
- HeritageSite
- HeritageCollection
- HeritageReference
- HeritageEvidence
- NarrativeDraft
- MediaAsset
- PublicationRecord

### Visitor
- VisitorRoute
- VisitorStory
- PublicPage
- QrEntryPoint
- VisitorEvent

### Intelligence
- KnowledgeDocument
- KnowledgeChunk
- RetrievalRun
- EmbeddingJob
- AiAction
- PromptTemplate

### Governance / Ops
- RiskRegisterItem
- Obligation
- Incident
- OperationalMetric
- QueueJobRecord

### Advanced
- Twin
- TwinNode
- TwinEdge
- TwinLayer
- TwinSimulationRun
- TwinTelemetryEvent
- IoTDevice
