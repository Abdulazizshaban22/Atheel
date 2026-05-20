# Wave91 — Runtime Foundation Hardening

## الهدف
إغلاق فجوة أساسية في المنصة قبل أي توسع إضافي: جعل التشغيل اليومي أكثر قابلية للمراقبة والفهم عند الفشل، بدل ترك الأخطاء والجاهزية مبعثرة أو غير موحدة.

## ما الذي بُني
1. Global exception filter موحد للـ API
   - كل خطأ HTTP أو خطأ غير متوقع أصبح يخرج بنفس envelope
   - الإخراج يتضمن statusCode و code و message و requestId و correlationId و path و method
   - في non-production يظهر debug مختصر ليسهل التحقيق السريع محليًا

2. Runtime profile service
   - يجمع معلومات البيئة بطريقة مركزية بدل تكرار المنطق عبر endpoints
   - يعرض nodeEnv و apiPrefix و queueMode و startedAt و uptimeSeconds

3. Health module مطور
   - GET /api/health
   - GET /api/health/live
   - GET /api/health/ready
   - GET /api/health/startup

4. Readiness checks فعلية
   - فحص قاعدة البيانات عبر Prisma و SELECT 1
   - فحص وضع الصفوف Queue mode وحالة BullMQ
   - فحص وجود المتغيرات الحساسة المطلوبة دون كشف قيمها

5. E2E test جديد
   - يتحقق من health endpoints
   - يتحقق من envelope الموحد للأخطاء

## لماذا هذه الموجة مهمة
هذه الموجة لا تضيف feature تجارية مباشرة، لكنها تمنع تآكل المشروع مع الوقت. أي منصة enterprise-grade تحتاج منذ البداية إلى:
- أخطاء قابلة للتتبع
- health واضح
- readiness حقيقي
- contract ثابت للـ API عند الفشل
- مخرجات تساعد الفريق التالي على التشخيص السريع

بدون هذا الأساس، كل توسع لاحق في AI أو workflows أو التوأم الرقمي سيزيد صعوبة التشغيل بدل أن يزيد قيمة المنصة.

## الملفات المضافة أو المعدلة
### API
- apps/api/src/common/http/api-exception.filter.ts
- apps/api/src/common/runtime/platform-runtime.service.ts
- apps/api/src/modules/health/health.service.ts
- apps/api/src/modules/health/health.controller.ts
- apps/api/src/modules/health/health.module.ts
- apps/api/src/main.ts
- apps/api/test/runtime-foundation.e2e-spec.ts

### Docs
- docs/WAVE91_RUNTIME_FOUNDATION_AR.md

## ملاحظات هندسية
- لم يتم إدخال مكتبات جديدة لأن الحاجة لا تستدعي ذلك في هذه الموجة
- لم يتم فرض response envelope موحد على responses الناجحة حتى لا نكسر العقود الحالية للموديولات الكثيرة الموجودة
- readiness يعتبر قاعدة البيانات تبعية إلزامية
- عند تشغيل الصفوف في وضع sync يظهر queue على أنه degraded وليس failed، لأن هذا مقبول محليًا لكنه ليس وضع إنتاجي

## طريقة التشغيل
1. انسخ الإعدادات البيئية
   - cp .env.example .env
2. شغّل التبعيات
   - docker compose -f infra/docker-compose.dev.yml up -d
3. ثبّت الحزم
   - pnpm install
4. ولّد Prisma Client
   - pnpm db:generate
5. شغّل الـ API
   - pnpm --filter @madar/api dev

## نقاط الفحص السريعة
- /api/health
- /api/health/live
- /api/health/ready
- /api/health/startup

## ما الذي لم يكتمل بعد
- لا يزال النجاح Success responses غير موحد بين جميع الموديولات
- لا يوجد global interceptor لقياس latency على مستوى handler business semantics
- لا توجد readiness checks مخصصة لـ RabbitMQ أو object store أو exports renderer channel
- لا يوجد structured logger حقيقي بمستوى pino/winston بعد
- لا يوجد ADR رسمي لهذه الموجة بعد

## الخطوة التالية المقترحة
Wave92 يجب أن تنقل المنصة من readiness عام إلى execution governance foundation عبر:
- request-scoped audit writer
- domain event envelope موحد
- outbox event taxonomy واضح
- policy-aware action logging على مستوى العمليات الحساسة
