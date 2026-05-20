# Wave57 — Exports Renderer Microservice

## الهدف
نقل الحمل الثقيل لتوليد ملفات PDF/PPTX/ZIP خارج الـ API الأساسي إلى خدمة مستقلة قابلة للتوسع.

## ما تغير
- إضافة تطبيق جديد: `apps/exports-svc`
  - Endpoint داخلي: `POST /internal/render`
  - Health: `GET /health`
  - الحماية: `X-Internal-Token` يطابق `EXPORTS_RENDERER_TOKEN`
- تعديل `ExportsService` في الـ API
  - تجهيز Markdown + TemplateMeta داخل الـ API
  - استدعاء خدمة التوليد `exports-svc` لإنشاء الملفات
  - تخزين الملفات الناتجة كمرفقات عبر `AttachmentsService.createFromBuffer`

## إعدادات جديدة
في `.env`:
- `EXPORTS_RENDERER_URL=http://localhost:3101`
- `EXPORTS_RENDERER_PORT=3101`
- `EXPORTS_RENDERER_TOKEN=...`

## تشغيل محلي
- شغّل الخدمات المساندة: `docker compose -f infra/docker-compose.dev.yml up -d`
- شغّل الكل: `pnpm dev`
  - سيقوم Turbo بتشغيل `api` و `web` و `exports-svc` بالتوازي.

## ملاحظات تشغيلية
- هذا الاستخراج هو خطوة آمنة أولى: فصل CPU-heavy workload دون تفكيك نطاق الدومين وبدون تعقيد قاعدة بيانات موزعة.
- الخطوة التالية (Wave58) إذا رغبت: إدخال Outbox/Inbox للرسائل بين الخدمات + Idempotency.
