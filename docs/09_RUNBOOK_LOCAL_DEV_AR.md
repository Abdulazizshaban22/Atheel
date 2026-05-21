# تشغيل محلي — أَثِيل

> هذه الوثيقة موجز سريع. الإجراءات الموسعة في `docs/runbooks/RUNBOOK_LOCAL_DEV_AR.md` و
> `docs/runbooks/WAVE122_LOCAL_BOOTSTRAP_AND_HANDOFF_AR.md`.

## 1) المتطلبات
- Node.js LTS
- pnpm
- Docker + Docker Compose
- (اختياري) MinIO client `mc` للتجارب على Object Store

## 2) خطوات التشغيل

```bash
# 1. متغيرات البيئة
cp .env.example .env

# 2. البنية التحتية (Postgres + Redis + RabbitMQ + MinIO)
docker compose -f infra/docker-compose.dev.yml up -d

# 3. الحزم
pnpm install

# 4. Prisma client
pnpm db:generate

# 5. مزامنة Schema للتطوير
pnpm db:push

# 6. تشغيل المنصة (API + Web + Worker)
pnpm dev
```

## 3) تشغيل خدمات اختيارية بشكل مستقل

```bash
# Exports renderer microservice
pnpm --filter @madar/exports-svc dev

# Worker فقط
pnpm --filter @madar/worker dev
```

## 4) المنافذ الافتراضية
- API: http://localhost:3001/api
- Web: http://localhost:3000
- Swagger: http://localhost:3001/api/docs
- RabbitMQ Management: http://localhost:15672 (guest/guest)
- MinIO Console: http://localhost:9001 (minioadmin/minioadmin)

## 5) الفحوصات السريعة
- `pnpm typecheck`
- `pnpm build`
- `pnpm api:smoke`
- `pnpm audit:endpoints`

## 6) الـ Runbooks المتخصصة
- `docs/runbooks/RUNBOOK_EXPORTS_RELIABLE_DISPATCH_AR.md`
- `docs/runbooks/RUNBOOK_WAVE59_RMQ_AR.md`
- `docs/runbooks/RUNBOOK_WAVE60_OBJECT_STORE_AR.md`
- `docs/runbooks/RUNBOOK_WAVE61_MINIO_S3_OBJECT_STORE_AR.md`
- `docs/runbooks/WAVE122_LOCAL_BOOTSTRAP_AND_HANDOFF_AR.md`

## 7) مشاكل شائعة
- إن فشل `pnpm db:generate` تأكد أن Postgres يعمل وأن DATABASE_URL صحيح.
- إن لم تتولد ملفات pgvector تأكد من تنفيذ `infra/init-extensions.sql`.
- إن فشل dispatch للتصدير تأكد أن RabbitMQ يعمل وأن EXPORTS_RENDERER_TOKEN موجود.
