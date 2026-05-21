# خريطة قاعدة البيانات — أَثِيل

> Prisma schema يحوي اليوم ~125 model و ~240 index.
> هذه الوثيقة مرجع مجموعات (groups) — التفاصيل الكاملة في `packages/db/prisma/schema.prisma`.

## 1) المجموعات الرئيسية

### 1.1 الحوكمة والمستخدمون
- Organization, OrganizationMember
- User, Role, Permission, AuthHash, RefreshToken
- AuditLog, ActivityLog
- ApiKey, ApiKeyUsage

### 1.2 المشاريع والمحتوى
- Project, ProjectMember, Milestone, Task
- ContentItem, ContentVersion, ContentLanguage
- Tag, Taxonomy
- Attachment, AttachmentLink

### 1.3 التجارب والمسارات
- VisitorExperience, ExperienceRoute, ExperienceStep
- ExperienceTable (Wave32)
- VisitorSession, VisitorEvent, VisitorFeedback
- Booking, BookingSlot

### 1.4 التراث والوجهة والأحداث الكبرى
- HeritageProperty, HeritageAsset, HeritageCondition
- HeritageEvidence, HeritageEvidenceLink
- Destination, DestinationProgram, DestinationPartner
- MegaEvent, MegaEventReadiness, MegaEventStageGate

### 1.5 المعرفة و RAG (Wave33)
- KnowledgePack, KnowledgeDocument, KnowledgeChunk
- KnowledgeChunkEmbedding (Vector / JSON)
- RagQuery, RagQueryResult, RagEval

### 1.6 الذكاء الاصطناعي والوكلاء
- AIRequest, AIOutput, AIPolicy
- AgentRun, AgentStep, AgentTool, AgentToolCall
- LLMProvider, LLMModel, LLMUsage

### 1.7 التوأم الرقمي والمحاكاة (Wave10, Wave34, Wave99)
- Twin, TwinNode, TwinEdge, TwinLayer
- TwinSpec, TwinSpecPublish
- TwinTelemetryEvent
- SimulationScenario, SimulationRun, SimulationResult

### 1.8 الاعتمادات والامتثال والمخاطر
- Approval, ApprovalStep, ApprovalPacket
- Risk, RiskAssessment
- Obligation, ObligationReminder (Wave29)
- CompliancePolicy, ComplianceCheck

### 1.9 الموثوقية والاتساق (Wave97)
- ServiceOutbox, OutboxEntry, OutboxDispatch
- IdempotencyKey
- DeadLetter, DeadLetterReplay (Wave102)
- QueueMetric, QueueHealthSnapshot

### 1.10 المخرجات وكائنات التخزين (Wave57–61)
- ExportJob, ExportArtifact
- ObjectStoreRef (Wave60)
- ExportChannelMessage (Wave59)

### 1.11 IoT والقياسات
- IotDevice, IotDeviceKey
- TelemetryEvent
- TelemetryAggregation

### 1.12 KPIs والتحليلات
- Kpi, KpiSnapshot, KpiSeries
- DashboardConfig, DashboardWidget

## 2) المؤشرات (Indexes)

- إجمالي ~240 index.
- مؤشرات متعددة الأعمدة (composite) لحالات الاستعلام الشائعة (organizationId + status + createdAt …).
- pgvector index على KnowledgeChunkEmbedding (HNSW) عند تفعيل pgvector.
- pg_trgm indexes للبحث النصي على الحقول العربية الرئيسية.

## 3) الامتدادات (Extensions)
- `pgvector` (للـ embeddings)
- `pg_trgm` (للبحث النصي العربي والمرونة في similarity)
- `uuid-ossp` / `pgcrypto` (للمعرّفات)

## 4) السياسات
- RLS مفعّل على الجداول متعددة المستأجرين (Wave56).
- Migrations تُدار عبر pipeline — راجع `docs/database/MIGRATION_POLICY.md` و `docs/database/PRISMA_BASELINE_RUNBOOK.md`.

## 5) المرجع الأصلي
- مصدر الحقيقة: `packages/db/prisma/schema.prisma`
- توليد الـ client: `pnpm db:generate`
- مزامنة Schema للتطوير: `pnpm db:push`
- Migration رسمي: `pnpm db:migrate:dev`
