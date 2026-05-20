# فهرس واجهات API — أَثِيل v0.3

## Auth
- POST /api/auth/login — Public — تسجيل دخول وإصدار Access + Refresh
- POST /api/auth/refresh — Public — تدوير جلسة Refresh
- POST /api/auth/logout — مستخدم مسجل الدخول — إبطال الجلسة الحالية
- GET /api/auth/me — أي مستخدم مسجل الدخول
- GET /api/auth/sessions — أي مستخدم مسجل الدخول — عرض جلسات Refresh الفعّالة (متعددة الأجهزة)
- POST /api/auth/sessions/:id/revoke — أي مستخدم مسجل الدخول — إبطال جلسة محددة
- POST /api/auth/sessions/revoke-all — أي مستخدم مسجل الدخول — إبطال جميع الجلسات

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
- POST /api/experiences/:id/simulate — viewer | analyst | experience_designer | project_manager | org_admin | super_admin (Wave54)
- POST /api/experiences — experience_designer | project_manager | org_admin | super_admin
- PATCH /api/experiences/:id — experience_designer | project_manager | org_admin | super_admin
- DELETE /api/experiences/:id — org_admin | super_admin
- GET /api/experiences/simulate-route-score — viewer | analyst | experience_designer | project_manager | org_admin | super_admin

- GET /api/visitor-guide?experienceId=... — Public (list)
- GET /api/visitor-guide/:id — Public (details)
- POST /api/visitor-guide/generate — analyst | project_manager | org_admin | super_admin

- GET /api/risks/templates — viewer | analyst | curator | content_editor | project_manager | org_admin | super_admin
- GET /api/risks/register?organizationId=...&projectId=...&experienceId=...&twinId=... — viewer | analyst | curator | content_editor | project_manager | org_admin | super_admin
- POST /api/risks/register — analyst | project_manager | org_admin | super_admin
- POST /api/risks/assess/twin/:twinId — analyst | project_manager | org_admin | super_admin

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

## Verification
- GET /api/verification/approval-packets/:id — Public — صفحة تحقق رسمية تعرض بيانات الوثيقة ورمز التحقق (تعتمد على قاعدة البيانات؛ في حال تعطلها ترجع 503)
- POST /api/verification/bundles/verify?expectedPacketId=:id — Public — رفع Bundle ZIP للتحقق التدقيقي من manifest.json وبصمات الملفات

ملاحظات تشغيلية
- المتغيرات: VERIFY_MAX_ZIP_BYTES / VERIFY_MAX_ZIP_ENTRIES / VERIFY_MAX_UNCOMPRESSED_BYTES / VERIFY_MAX_ENTRY_UNCOMPRESSED_BYTES
