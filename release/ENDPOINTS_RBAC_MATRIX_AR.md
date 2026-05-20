# ملخص كل Endpoint جديد + صلاحياته — أَثِيل v0.3

الملف المختصر المطلوب. التفاصيل الموسعة موجودة أيضًا في docs/11 و docs/12.

## endpoints الجديدة المضافة في v0.3
- Auth: login / refresh / logout / me
- Users: list / create / activate-deactivate
- Approvals: list / create / update-status
- Attachments: upload / list
- Audit Logs: list (للاستعراض والتتبع)

## الصلاحيات (مختصر تنفيذي)
- ADMIN: وصول كامل لوحدات الإدارة والتكوين
- REVIEWER: إدارة قرارات المراجعة والاعتماد ضمن النطاق
- EDITOR: إنشاء/تحرير وإرسال للموافقة ورفع ملفات
- VIEWER: قراءة فقط حسب النطاق

## المرجع التفصيلي

# فهرس واجهات API — أَثِيل v0.3

## Auth
- POST /api/auth/login — Public — تسجيل دخول وإصدار Access + Refresh
- POST /api/auth/refresh — Public — تدوير جلسة Refresh
- POST /api/auth/logout — مستخدم مسجل الدخول — إبطال الجلسة الحالية
- GET /api/auth/me — أي مستخدم مسجل الدخول

## Projects
- GET /api/projects — viewer | analyst | project_manager | org_admin | super_admin
- GET /api/projects/:id — viewer | analyst | project_manager | org_admin | super_admin
- POST /api/projects — project_manager | org_admin | super_admin
- PATCH /api/projects/:id — project_manager | org_admin | super_admin
- DELETE /api/projects/:id — org_admin | super_admin

## Content
- GET /api/content — viewer | analyst | curator | content_editor | org_admin | super_admin
- GET /api/content/:id — viewer | analyst | curator | content_editor | org_admin | super_admin
- POST /api/content — curator | content_editor | org_admin | super_admin
- PATCH /api/content/:id — curator | content_editor | org_admin | super_admin
- DELETE /api/content/:id — org_admin | super_admin

## Experiences
- GET /api/experiences — viewer | analyst | experience_designer | project_manager | org_admin | super_admin
- GET /api/experiences/:id — viewer | analyst | experience_designer | project_manager | org_admin | super_admin
- POST /api/experiences — experience_designer | project_manager | org_admin | super_admin
- PATCH /api/experiences/:id — experience_designer | project_manager | org_admin | super_admin
- DELETE /api/experiences/:id — org_admin | super_admin
- GET /api/experiences/simulate-route-score — viewer | analyst | experience_designer | project_manager | org_admin | super_admin

## Users / Roles
- GET /api/users — org_admin | super_admin
- GET /api/users/roles/catalog — org_admin | super_admin
- POST /api/users — org_admin | super_admin
- PATCH /api/users/:id — org_admin | super_admin
- PATCH /api/users/:id/roles — org_admin | super_admin
- DELETE /api/users/:id — super_admin

## Attachments
- GET /api/attachments — viewer | analyst | curator | content_editor | project_manager | org_admin | super_admin
- POST /api/attachments/upload — curator | content_editor | project_manager | org_admin | super_admin
- PATCH /api/attachments/:id/link — curator | content_editor | project_manager | org_admin | super_admin

## Approvals
- GET /api/approvals — viewer | analyst | curator | content_editor | project_manager | org_admin | super_admin
- POST /api/approvals — curator | content_editor | project_manager | org_admin | super_admin
- POST /api/approvals/:id/submit — curator | content_editor | project_manager | org_admin | super_admin
- POST /api/approvals/:id/approve — org_admin | super_admin
- POST /api/approvals/:id/reject — org_admin | super_admin
- POST /api/approvals/:id/request-changes — org_admin | super_admin
- POST /api/approvals/:id/cancel — curator | content_editor | project_manager | org_admin | super_admin

## Audit Logs
- GET /api/audit-logs — analyst | org_admin | super_admin
- POST /api/audit-logs — analyst | org_admin | super_admin

## Other modules (من النسخة السابقة)
- GET /api/health
- GET /api/organizations / POST /api/organizations
- GET /api/analytics/dashboard
- POST /api/ai/content-assist


# خطة الصلاحيات RBAC (المرحلة التالية)

## الأدوار الأساسية
- مالك الجهة
- مدير برنامج ثقافي
- مدير مشروع
- محرر محتوى
- مراجع محتوى
- مشغل تجربة
- محلل بيانات
- زائر لوحة تنفيذية (قراءة فقط)

## مبادئ
- أقل صلاحية ممكنة
- فصل بين التحرير والاعتماد
- عزل بيانات كل جهة (Tenant)

---

# إضافات Wave45 (تشغيل متقدم)

## Ops (Auto-Routing + SLO + Incidents)
- GET /api/ops/settings — org_admin | super_admin
- POST /api/ops/settings — org_admin | super_admin

- GET /api/ops/approvals/routing/simulate?contextViolationType&contextDomain&contextRegion — org_admin | super_admin
- GET /api/ops/approvals/skills — org_admin | super_admin
- POST /api/ops/approvals/skills — org_admin | super_admin
- GET /api/ops/approvals/workload — org_admin | super_admin

- GET /api/ops/slo/policies — org_admin | super_admin
- POST /api/ops/slo/policies — org_admin | super_admin
- GET /api/ops/slo/burn-rate — org_admin | super_admin
- POST /api/ops/slo/evaluate — org_admin | super_admin

- GET /api/ops/incidents?status&limit — org_admin | super_admin
- GET /api/ops/incidents/:id/timeline?limit — org_admin | super_admin
- POST /api/ops/incidents/:id/ack — org_admin | super_admin
- POST /api/ops/incidents/:id/mute — org_admin | super_admin
- POST /api/ops/incidents/:id/unmute — org_admin | super_admin
- POST /api/ops/incidents/:id/close — org_admin | super_admin

## Outbox (تحسينات استعلام)
- GET /api/outbox?channel=slack&incidentKey=... — org_admin | super_admin

---

# إضافات Wave46.1 (Hardening)

## AI / RAG Evaluation
- POST /api/ai/rag/evaluate — org_admin | super_admin

## ملاحظة ترويسات التشغيل
- يدعم API ترويسة X-Correlation-Id لتتبع الطلبات عبر الويب → API → العامل.
