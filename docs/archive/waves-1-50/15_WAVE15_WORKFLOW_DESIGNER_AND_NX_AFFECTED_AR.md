# Wave15 — مصمم مسارات بصري + Nx affected

## 1) مصمم مسارات بصري (React Flow)

### المسار
- Web: `/workflows/designer/:templateId`

### ما الذي يحدث
- تحميل القالب من `GET /workflows/catalog/:idOrCode`
- تحميل Graph من `GET /workflows/catalog/:idOrCode/graph`
  - إذا لم يوجد Graph محفوظ، يتم توليد Graph افتراضي من خطوات القالب
- حفظ Graph عبر:
  - `POST /workflows/catalog/:idOrCode/graph`

### التخزين
- Prisma model: `WorkflowTemplateGraph`
  - `templateId` unique
  - `nodesJson`, `edgesJson`
- Snapshot داخل الـ Instance:
  - `WorkflowInstance.designerGraphJson`
  - وأيضًا داخل `parameters._designerGraph` لسهولة القراءة على runtime في وضع scaffold

## 2) Nx affected

### الملفات المضافة
- `nx.json`
- `workspace.json`
- `.github/workflows/ci.yml`

### أوامر جاهزة
- `pnpm affected:typecheck`
- `pnpm affected:test`
- `pnpm affected:build`

> ملاحظة: تم تعريف مشروع `packages-core` كحاوية للمجلد `packages`، ويتم ربطه كـ implicit dependency على المشاريع الثلاثة (web/api/worker) حتى أي تغيير داخل packages يجعل التطبيقات متأثرة.
