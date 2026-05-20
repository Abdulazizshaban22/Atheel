# Wave92 — Policy and Audit Boundary Hardening

## لماذا هذه الموجة
بعد Wave91 أصبح لدينا Runtime Foundation أفضل، لكن المشروع كان ما يزال يفتقد طبقة أكثر صرامة في حدود الهوية والجهة والتدقيق التشغيلي. المشكلة لم تكن في وجود Auth فقط، بل في 3 فجوات عملية:

1. إمكانية إرسال أكثر من organizationId بقيم متعارضة بين header و body و query
2. عدم وجود Audit Trail تلقائي على عمليات التعديل الحرجة
3. اعتماد بعض الوحدات على RBAC ضمني فقط بدون توصيف أوضح لمورد العملية resource/action

هذه الموجة تعالج ذلك بدون تكسير المشروع أو إعادة كتابة الـ modules.

---

## ما الذي بُني

### 1) تشديد حدود الـ tenant
تمت إضافة Utility مشتركة لاستخراج tenant candidates من:
- X-Org-Id
- query.organizationId
- params.organizationId
- body.organizationId

وأصبح `TenantGuard` يرفض الطلب إذا وجد أكثر من قيمة متعارضة بدل اختيار إحداها بصمت.

### 2) Global Audit Trail Interceptor
تمت إضافة Interceptor عالمي، لكنه لا يعمل على كل endpoint عشوائيًا. يعمل فقط عندما يتم وضع decorator صريح:
- `@AuditAction(...)`

هذا القرار مهم لأنه:
- يمنع audit spam
- يجعل كل أثر تدقيقي intentional
- يربط الـ audit بعمليات business mutation الحرجة فقط

### 3) AuditAction metadata contract
تم تعريف metadata موحدة لكل عملية تدقيقية تتضمن:
- action
- entityType
- entityIdParam أو entityIdBodyField عند الحاجة
- organizationIdBodyField عند الحاجة
- message

### 4) تطوير AuditLogsService
تمت إضافة `recordAction()` كمدخل أوضح من `create()` اليدوي، مع تضمين request context داخل fallback payload عند عدم توفر Prisma.

### 5) توضيح policy contracts على core controllers
تمت إضافة `@Policy(resource, action)` بشكل صريح على المسارات الأساسية في:
- projects
- content
- experiences
- approvals
- attachments
- users

وهذا لا يغير المعمارية، لكنه يجعل القرار الأمني أوضح وقابلًا للتوسع لاحقًا.

---

## الملفات المضافة
- `apps/api/src/common/audit/audit-action.decorator.ts`
- `apps/api/src/common/audit/audit-trail.interceptor.ts`
- `apps/api/src/common/http/request-tenant.util.ts`
- `apps/api/test/policy-audit-boundary.e2e-spec.ts`

## الملفات المعدلة
- `apps/api/src/app.module.ts`
- `apps/api/src/modules/auth/guards/tenant.guard.ts`
- `apps/api/src/modules/audit-logs/audit-logs.service.ts`
- `apps/api/src/modules/projects/projects.controller.ts`
- `apps/api/src/modules/content/content.controller.ts`
- `apps/api/src/modules/experiences/experiences.controller.ts`
- `apps/api/src/modules/approvals/approvals.controller.ts`
- `apps/api/src/modules/attachments/attachments.controller.ts`
- `apps/api/src/modules/users/users.controller.ts`
- `docs/README.md`
- `release/FILE_CHANGELOG_AR.md`

---

## كيف تعمل هذه الموجة

### Tenant resolution
1. يتم جمع كل الإشارات المحتملة للجهة
2. إذا كانت القيم متعددة ومتعارضة يتم رفض الطلب 400
3. إذا كانت القيمة واحدة وصحيحة يتم تثبيتها في:
   - `req.__orgId`
   - `req.organizationIdHint`
   - `user.activeOrgId`
   - `requestContext.organizationId`

### Audit flow
1. يدخل الطلب إلى controller method
2. إذا كان method يحمل `@AuditAction` يستمر interceptor بالمراقبة
3. بعد نجاح العملية فقط، يتم إنشاء سجل تدقيق تلقائي
4. السجل يلتقط:
   - actorUserId
   - organizationId
   - action
   - entityType
   - entityId
   - request metadata مختصرة
   - body/result preview بعد redaction

### Policy flow
1. `@Roles` يبقى مسؤولًا عن RBAC
2. `@Policy` يضيف contract صريح لمفهوم المورد والفعل
3. `PolicyGuard` يستخدم هذا العقد إذا وُجد

---

## لماذا هذا التصميم أفضل من logging داخل كل service
لأن كتابة audit داخل كل service كانت ستسبب:
- تكرارًا كبيرًا
- تفاوتًا في الجودة بين الوحدات
- نسيان تسجيل بعض العمليات
- خلط business logic مع cross-cutting concerns

الـ Interceptor + Decorator pattern هنا أوضح وأنظف وأقرب لسلوك الفرق الكبيرة.

---

## ما الذي لم يكتمل بعد
هذه الموجة لا تزال لا تغطي:
- before snapshots الحقيقية قبل كل update/delete
- audit على مستوى download/view للأصول الحساسة
- outbox/event emission موحد لكل audit record
- resource catalog مركزي يمنع magic strings في أسماء الموارد
- policy conditions متقدمة attribute-based
- tenant resolution على مستوى nested routes/domain-specific entities

---

## طريقة التشغيل
```bash
cp .env.example .env
docker compose -f infra/docker-compose.dev.yml up -d
pnpm install
pnpm db:generate
pnpm --filter @madar/api dev
```

### اختبارات هذه الموجة
```bash
pnpm --filter @madar/api test:e2e -- policy-audit-boundary.e2e-spec.ts
```

أو تشغيل كل اختبارات e2e:
```bash
pnpm --filter @madar/api test:e2e
```

---

## الخطوة التالية المنطقية
Wave93 يجب أن تكون:
Core Application Service Normalization

وفيها يتم:
- إدخال application services للكيانات الأساسية
- تقليل منطق controllers المباشر
- تأسيس transaction boundaries أوضح
- تجهيز before/after audit snapshots بشكل أدق
