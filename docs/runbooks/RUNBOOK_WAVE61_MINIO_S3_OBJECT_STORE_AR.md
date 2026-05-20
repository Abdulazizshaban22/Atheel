# RUNBOOK: Wave61 تشغيل MinIO (S3-compatible) كـ Object Store

## الهدف
تشغيل MinIO محليًا ليكون Object Store لمخرجات التصدير (PDF/PPTX/ZIP) بدل التخزين المحلي، بحيث يرجع exports-svc مؤشرات `object.key` فقط.

## 1) تشغيل الخدمات الداعمة
من جذر المشروع:

```bash
docker compose -f infra/docker-compose.dev.yml up -d
```

هذا الملف يشغل:
- PostgreSQL
- Redis
- RabbitMQ
- MinIO
- createbuckets (ينشئ Bucket تلقائيًا عبر mc mb)

## 2) ضبط .env
انسخ المثال ثم عدّل:

```bash
cp .env.example .env
```

القيم الأساسية:

```env
OBJECT_STORE_PROVIDER=s3

S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_BUCKET=atheel
S3_FORCE_PATH_STYLE=1
```

ملاحظة: تفعيل path-style مفيد خصوصًا مع MinIO عند استخدام endpoint غير AWS.

## 3) تشغيل المنصة

```bash
pnpm install
pnpm db:generate
pnpm db:migrate:dev
pnpm db:seed
pnpm dev
```

## 4) تحقق سريع
1) نفّذ أي عملية Export.
2) تأكد أن الرد من exports-svc يحتوي على:
- `artifacts[].object.key`
ولا يحتوي على base64 (إلا إذا `EXPORTS_ARTIFACTS_MODE=inline`).
3) تأكد أن API يحول الملفات إلى Attachments ويكتب export artifacts metadata.

## 5) استكشاف أعطال شائعة
### Signature mismatch / Access denied
- تأكد أن `S3_ENDPOINT` صحيح.
- تأكد من `S3_FORCE_PATH_STYLE=1`.
- تأكد من Bucket موجود (createbuckets).
