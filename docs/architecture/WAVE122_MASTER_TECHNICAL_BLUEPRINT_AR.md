# WAVE122 — Master Technical Blueprint

## Executive Technical Framing

أَثِيل ليس لوحة فعاليات، ولا CMS محتوى، ولا واجهة عرض ثلاثية الأبعاد تبحث عن مشكلة تحلها.

أَثِيل في شكله الصحيح هو منصة تشغيل وقرار للتجارب والوجهات والبرامج الثقافية والسياحية والتراثية. القيمة ليست في عدد الوحدات، بل في ربط ست طبقات داخل نظام واحد:

- التشغيل اليومي للجهات والمشاريع والبرامج
- إدارة الأصل الثقافي والتراثي كمعرفة قابلة للتشغيل
- بناء المحتوى والسرد والتجربة
- الحوكمة والمراجعة والاعتماد
- الذكاء المتخصص المدعوم بالمصادر
- القياس والتشغيل والرصد

المشكلة الحالية في المستودع ليست غياب الكود، بل اتساع السطح أسرع من نضج القلب. لذلك الاتجاه المعتمد من هذه الموجة هو:

- تقليل العشوائية
- رفع قابلية الاستلام
- توحيد القرارات التقنية
- تحسين الفصل بين الطبقات
- تجهيز المشروع ليكمله فريق حقيقي لسنوات

## Assumptions

1. الهدف الحالي هو إنتاج أساس مؤسسي قابل للتوسع، وليس نسخة Demo أو MVP رخو.
2. الويب الحالي سيبقى Next.js App Router لأن المنصة تحتاج مساحات خاصة وعامة ضمن تطبيق واحد.
3. الواجهة العامة للزائر ستعيش داخل نفس تطبيق الويب في النسخة الأولى.
4. API ستبقى REST-first في المدى القريب مع جاهزية للتوسع لاحقًا.
5. PostgreSQL عبر Prisma هي الحقيقة الوحيدة لكل المسارات الحرجة.
6. DataStoreService يجب أن يبقى في dev/test فقط، ولا يحق له حمل منطق إنتاجي جديد.
7. Twin وXR وIoT تبقى طبقات متقدمة، وليست محور الإغلاق الحالي.
8. team handoff requirement جزء من تعريف النجاح، وليس توثيقًا لاحقًا.

## Technical Decisions

### لماذا Next.js

تم تثبيت Next.js App Router لأن المنصة تحتاج:

- route groups ومساحات متعددة
- layouts متداخلة
- dashboard structure واضحة
- فصل private platform عن public visitor ضمن مشروع واحد
- إمكانات server/client boundaries على مستوى الصفحة والمكوّن

اعتماد React SPA هنا سيزيد التعقيد بدل أن يقلله، لأنه سيدفعنا إلى بناء طبقات routing وهيكلة ومشاركة جلسة بطريقة سنعيد اختراعها بلا داع.

### لماذا NestJS

NestJS مناسب لأن المستودع الحالي مبني عليه أصلًا، ولأن المنصة تحتاج:

- modular structure صريحة
- DTOs وvalidation وguards وinterceptors
- تنظيم cross-cutting concerns مثل audit وauth وobservability
- قابلية استلام أعلى لفريق هندسي مؤسسي

### لماذا Prisma + PostgreSQL

- PostgreSQL هي قاعدة بيانات مناسبة للنطاق المؤسسي والتقارير والربط بين الكيانات
- Prisma موجودة فعليًا داخل المستودع وتوفر schema موحدة وmigrations منضبطة
- أي persistence بديل للمسارات الحرجة يضعف المشروع ويشوّه الحقيقة التشغيلية

### لماذا Tailwind CSS

- مناسب لمنصة واسعة فيها dashboards وforms وtables كثيرة
- يخدم بناء design system داخلي دون طبقة CSS متشعبة
- يخفف تكاليف الصيانة مقارنة بملفات CSS مجزأة بلا نظام

### المكتبات الموصى بها

#### Frontend

- TanStack Query
  - لإدارة server state فقط
  - لأن الواجهة تعتمد على جلب بيانات، تحديثات، invalidation، وcache متوقعة
- React Hook Form
  - لبناء نماذج كبيرة ومعقدة مع أداء جيد
- Zod
  - لتوحيد validation contracts على الواجهة
- shadcn/ui
  - كنقطة انطلاق لبناء design system مفتوح الكود داخل المشروع
- Zustand
  - فقط لحالات UI المحلية التي لا تستحق store شامل

#### Backend

- ValidationPipe + class-validator / class-transformer
- BullMQ للأعمال الخلفية والمهام الثقيلة
- OpenTelemetry للتتبّع والقياسات
- Object storage abstraction للمرفقات والتصدير

### كيف سنضمن القابلية للتوسع

- boundaries واضحة بين domain وapplication وinfrastructure وUI
- نقل configuration logic إلى طبقة واضحة بدل الانتشار العشوائي
- توحيد الواجهة حول shell ومسارات مصنفة بدل nav ضخم مسطح
- إبقاء background work خارج request lifecycle
- توثيق القرارات في docs وADRs بدل تركها implicit

### كيف سنضمن قابلية الاستلام

- ملف blueprint مركزي
- runbooks واضحة
- naming conventions ثابتة
- موجات تطوير قابلة للقياس والتسليم
- no fake completeness

### كيف سنمنع spaghetti code

- منع giant files قدر الإمكان
- central navigation config بدل تكرار روابط الواجهة
- explicit runtime env contract بدل scattered process.env usage بغير انضباط
- عدم إضافة routes جديدة قبل وضوح workflow وentity وAPI contract

## Product Definition

أَثِيل منصة تشغيل وقرار للتجارب والوجهات والبرامج الثقافية والسياحية والتراثية.

تدير ستة محاور تشغيلية:

1. Platform & Identity
2. Delivery Core
3. Heritage Core
4. Visitor Layer
5. Intelligence Layer
6. Governance & Operations

## User Roles

- Platform Super Admin
- Tenant Admin
- Program Director
- Project Manager
- Heritage Curator
- Content / Narrative Lead
- Experience Designer
- Reviewer / Governance Officer
- Operations Lead
- Visitor / Public User

## Core Modules

### Platform & Identity
- Auth
- Users
- Organizations
- Memberships
- Roles / Policies
- Audit Logs

### Delivery Core
- Projects
- Programs
- Workspaces
- Content
- Attachments
- Approvals
- Approval Packets

### Heritage Core
- Heritage Assets
- Heritage Sites
- Collections
- References
- Evidence
- Narratives
- Publication Records

### Visitor Layer
- Public Heritage
- Visitor Guide
- Stories
- Routes / QR Journeys
- Search / Discovery

### Intelligence Layer
- Knowledge Packs
- Knowledge Spine
- AI Assist
- Retrieval
- Research Import
- Domain Brains

### Governance & Operations
- Governance
- Risks
- Obligations
- Incidents
- Observability
- Metrics
- Queues

### Advanced Layers
- Twin
- TwinSpec
- IoT
- 3D Asset Registry
- Impact / Analytics

## Main Workflows

### Workflow 1 — Organization Bootstrap
- إنشاء الجهة
- دعوة الأعضاء
- تعيين الأدوار
- إنشاء workspace
- تفعيل القدرات الأساسية

### Workflow 2 — Program / Project Delivery
- إنشاء البرنامج أو المشروع
- تعيين الفريق والمالك
- ضبط المراحل والحالة
- ربط المحتوى والمرفقات
- فتح مسار مراجعة عند الحاجة

### Workflow 3 — Heritage Asset Lifecycle
- إنشاء الأصل
- ربط الموقع والحقبة والوسائط
- إضافة الأدلة والمراجع
- كتابة السردية
- إرسال للمراجعة
- اعتماد ونشر

### Workflow 4 — Intelligence-Assisted Authoring
- اختيار نطاق المعرفة
- تنفيذ retrieval
- توليد draft مساعد
- إظهار المصادر
- مراجعة بشرية
- اعتماد أو رفض

### Workflow 5 — Approval Packet
- تجميع الأدلة
- مراجعة المخاطر والالتزامات
- إنشاء packet
- تصدير PDF/PPTX/ZIP
- حفظ السجل

## Data Model Draft

### Core Identity
- User
- RefreshSession
- RefreshSessionToken
- PolicyRule
- Organization
- OrganizationMember

### Delivery
- Program
- Project
- ContentItem
- Attachment
- ApprovalRequest
- ApprovalPacket

### Heritage
- HeritageAsset
- HeritageSite
- HeritageCollection
- HeritageReference
- HeritageEvidence
- NarrativeDraft
- PublicationRecord

### Visitor
- VisitorStory
- VisitorRoute
- PublicPage
- VisitorEvent
- QrEntryPoint

### Intelligence
- KnowledgeDocument
- KnowledgeChunk
- KnowledgeChunkEmbedding
- RetrievalRun
- AiAction
- PromptTemplate

### Governance / Ops
- RiskRegisterItem
- Obligation
- Incident
- ServiceOutbox
- QueueJobRecord
- AuditLog

### Advanced
- Twin
- TwinNode
- TwinEdge
- TwinLayer
- TwinSimulationRun
- TwinTelemetryEvent
- IoTDevice

## Frontend Architecture

### Route Groups Target

- app/(platform)
  - dashboard
  - projects
  - programs
  - content
  - attachments
  - approvals
  - heritage
  - knowledge
  - governance
  - operations
  - ai

- app/(public)
  - heritage
  - stories
  - routes
  - visitor
  - verification

- app/(system)
  - login
  - forbidden

### Frontend Internal Layers

- app routes
- features
- widgets
- entities
- shared/ui
- shared/lib
- api client layer
- navigation config

## Backend Architecture

### Per Module Structure
- controller
- application-service
- repository
- dto
- mapper or presenter when needed
- policy hooks when needed

### Cross-Cutting Concerns
- auth guard chain
- org scoping
- validation
- audit trail
- exception normalization
- tracing
- metrics
- queue dispatch
- file storage abstraction

## Recommended Folder Structure

### apps/web
- app
- components
- features
- lib
- styles
- types

### apps/api/src
- modules
- common
- config
- infrastructure

### packages
- db
- shared
- object-store
- runtime-kernel
- twin-kernel
- knowledge-kernel
- packet-kernel

### docs
- architecture
- adr
- runbooks
- release
- closure

## Delivery Plan by Waves

### Wave 1 — Architecture Baseline and Shell Discipline
- تثبيت blueprint المركزي
- توحيد navigation
- تأسيس runtime env contract
- تجهيز handoff docs

### Wave 2 — API Foundation Hardening
- فصل config
- توحيد module contracts
- DTO cleanup
- auth/org scoping audit

### Wave 3 — OS Core Closure
- organizations
- users
- projects
- programs
- content
- attachments
- approvals

### Wave 4 — Heritage Core Closure
- heritage assets
- references
- evidence
- narratives
- public heritage

### Wave 5 — Visitor + Publishing
- visitor pages
- stories
- QR journeys
- search/discovery
- publication flow

### Wave 6 — Intelligence + Knowledge Spine
- retrieval
- prompt templates
- AI assist
- governance of AI output

### Wave 7 — Review + Governance + Packets
- review center
- obligations
- risks
- approval packets

### Wave 8 — Operations + Observability + Release Discipline
- CI/CD
- health/readiness
- metrics/traces
- queue reliability

### Wave 9 — Twin Foundation
- 3D registry
- glTF/3D Tiles references
- viewer integration
- limited operational twin

## Definition of Done for the first shippable line

لا نعتبر أَثِيل جاهزًا للإطلاق المؤسسي إلا إذا تحققت هذه الشروط:

1. auth وorganization scoping تعملان فعلًا
2. core CRUD الحرجة كلها على Prisma فقط
3. heritage asset lifecycle قابل للتنفيذ والمراجعة
4. public publishing path موجود ومضبوط
5. AI output لا ينشر بلا مراجعة بشرية
6. stage deploy واضح وموثق
7. observability والصحة التشغيلية ظاهرة
8. handoff docs تسمح لمهندس جديد أن يبدأ خلال يوم واحد
