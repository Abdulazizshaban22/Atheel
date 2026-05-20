# Wave56 — Capability Packs + Request Context + جاهزية تشغيل متعدد المجالات

تحديث موجّه لتحويل أَثِيل من منصة مجال واحد إلى مشغل عام قابل للتركيب عبر تمكين وتعطيل الحزم لكل جهة.

## ما الجديد
1) Capability Packs
- إضافة نماذج قاعدة بيانات:
  - CapabilityPack
  - OrganizationCapability
- إضافة API:
  - GET /api/capabilities/catalog
  - GET /api/capabilities/me
  - POST /api/capabilities/set

2) Request Context
- تفعيل AsyncLocalStorage لتسجيل requestId و correlationId بشكل موحد
- إعادة إرسال X-Request-Id و X-Correlation-Id ضمن استجابة الـ API

3) إصلاحات جودة
- إزالة تكرار دالة isProd داخل AuthService (منع تعارض TypeScript)
- تحديث Policy baseline لإضافة صلاحيات capabilities

## ملفات تمت إضافتها أو تعديلها
- apps/api/src/common/request-context.ts (تم توسيع السياق)
- apps/api/src/main.ts (middleware للسياق)
- apps/api/src/modules/capabilities/* (وحدة جديدة)
- apps/api/src/app.module.ts (تسجيل الوحدة)
- apps/api/src/modules/auth/policy/policy.service.ts (baseline)
- packages/db/prisma/schema.prisma (CapabilityDomain + جداول جديدة)
- packages/db/prisma/migrations/20260303_wave56_capabilities_packs/migration.sql
- docs/56_PLATFORM_OPERATOR_AND_MICROSERVICE_READY_AR.md
- docs/56_TENANT_RLS_DEFENSE_IN_DEPTH_AR.md

## ملاحظة
إذا لم يتم تطبيق الهجرة الجديدة بعد، ستعمل وحدة capabilities بنمط Dev fallback وستعرض كتالوجًا ثابتًا داخل الكود.

