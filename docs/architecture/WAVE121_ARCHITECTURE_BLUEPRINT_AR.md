# Architecture Blueprint — Wave 121

## High-Level Architecture

### التطبيقات
- apps/web
  - الواجهة الإدارية + الواجهة العامة للزائر
- apps/api
  - REST API + orchestration + governance + auth + domain modules
- apps/worker
  - background execution, exports triggers, re-embedding, scheduled jobs
- apps/exports-svc
  - rendering-heavy export service

### الحزم
- packages/db
  - Prisma schema + migrations + client
- packages/shared
  - shared types/constants/helpers فقط
- packages/*-kernel
  - domain kernels pure logic where appropriate
- packages/object-store
  - file/object storage abstraction

## Frontend Architecture

### Target Route Groups
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
  - public heritage pages
  - stories
  - routes
  - visitor pages

- app/(system)
  - login
  - forbidden
  - verify

### Frontend Internal Layers
- app routes
- features
- widgets
- entities
- shared ui
- shared lib
- api client layer

### Design System Scope
- typography
- spacing
- colors / semantic tokens
- data table
- filter bar
- form fields
- dialogs / drawers
- status badges
- empty/loading/error states

## Backend Architecture

### Per-Module Structure
- controller
- application-service
- repository
- dto
- policy / guard hooks if needed
- mapper / presenter where useful

### Cross-Cutting Concerns
- auth guard chain
- org scoping
- audit logging
- validation
- exception normalization
- tracing
- metrics
- file storage abstraction
- queue dispatch

## Database Design Direction

### قواعد أساسية
- UUID primary keys where appropriate
- createdAt / updatedAt mandatory
- soft delete فقط عند وجود حاجة تشغيلية حقيقية
- org scoping لكل الكيانات المؤسسية
- indexes على orgId + status + updatedAt + foreign keys
- publication tables منفصلة عند الحاجة بين draft وpublic exposure

## API Design Direction

### مبادئ
- version-ready under /v1
- resource-oriented endpoints
- search endpoints منفصلة عند الحاجة
- bulk operations قليلة ومضبوطة
- standard response envelope where helpful
- cursor pagination حيث يلزم
- filters explicit

## Observability Direction
- health endpoints
- readiness/liveness
- traces across web/api/worker/exports
- queue metrics
- export metrics
- AI action audit

## Security Direction
- RBAC
- tenant isolation
- input validation
- upload validation
- secrets discipline
- audit trail for sensitive actions
