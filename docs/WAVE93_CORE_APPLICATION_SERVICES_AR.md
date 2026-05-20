# Wave93 — Core Application Service Normalization

## الهدف
هذه الموجة تنقل جزءًا من النواة من CRUD services مباشرة إلى Application Services أوضح، حتى تصبح العمليات المؤثرة على الكيانات الحرجة أكثر ضبطًا من ناحية:
- boundaries
- transactions
- audit snapshots
- domain rules

## لماذا هذه الموجة
بعد Wave91 وWave92 أصبح لدينا:
- health/runtime أفضل
- policy/audit boundaries أفضل

لكن mutation logic في الوحدات الأساسية كان ما يزال موزعًا بين controller وservice بشكل مباشر، وبدون before snapshots دقيقة على التحديث والحذف.

## ما الذي بُني

### 1) Application Services لطبقة الكتابة
تمت إضافة:
- `ProjectsApplicationService`
- `ContentApplicationService`

وأصبحت مسؤولة عن:
- create
- update
- delete
- transaction boundaries
- manual audit writes مع before/after snapshots
- domain guardrails البسيطة مثل منع النقل بين organizations عبر مسار update العادي

### 2) فصل القراءة عن الكتابة
- `ProjectsService` و `ContentService` بقيا لعمليات القراءة والاستعلام
- الـ controllers أصبحت تقرأ من services وتكتب عبر application services

هذا الفصل ليس CQRS كامل، لكنه خطوة عملية وصحية نحو عقود أوضح.

### 3) تعطيل auto-audit لبعض المسارات عند الحاجة
أصبح `@AuditAction` يدعم `skipAutoRecord`
حتى لا نحصل على audit duplicate عندما تكون العملية نفسها تسجل أثرًا أغنى داخل transaction.

### 4) snapshot utilities مشتركة
تمت إضافة utilities مشتركة لـ:
- redaction
- truncation
- safe serialization
- audit payload building

## لماذا هذا القرار صحيح
NestJS يدعم استخدام providers قابلة لإعادة الاستخدام مع منطق مقطعي مثل interceptors وdecorators، كما يدعم AsyncLocalStorage كبديل أخف من request-scoped providers لتمرير سياق الطلب. كذلك Prisma يدعم interactive transactions عندما تكون الخطوات اللاحقة تعتمد على نتائج سابقة داخل نفس العملية. citeturn783750search0turn783750search5turn214491search0

## الملفات المضافة
- `apps/api/src/common/audit/audit-snapshot.util.ts`
- `apps/api/src/common/audit/audit-log-payload.util.ts`
- `apps/api/src/modules/projects/projects.application-service.ts`
- `apps/api/src/modules/content/content.application-service.ts`
- `apps/api/test/core-application-services.e2e-spec.ts`

## الملفات المعدلة
- `apps/api/src/common/audit/audit-action.decorator.ts`
- `apps/api/src/common/audit/audit-trail.interceptor.ts`
- `apps/api/src/modules/projects/projects.controller.ts`
- `apps/api/src/modules/projects/projects.module.ts`
- `apps/api/src/modules/content/content.controller.ts`
- `apps/api/src/modules/content/content.module.ts`

## ماذا اكتمل
- before/after snapshots على project/content mutations
- transaction-backed audit logging على المسارات المدعومة بقاعدة البيانات
- fallback audit logging في وضع in-memory
- منع نقل project/content بين organizations عبر update العادي
- اختبار E2E يغطي السلوك الجديد

## ما الذي لم يكتمل بعد
- تعميم نفس النمط على experiences و approvals و attachments
- resource/action catalog مركزي ثابت بدل strings متناثرة
- outbox موحد لأحداث المجال
- repositories/application services أوسع لبقية الوحدات الحرجة

## التشغيل
```bash
pnpm install
pnpm --filter @madar/api dev
pnpm --filter @madar/api test:e2e -- core-application-services.e2e-spec.ts
```
