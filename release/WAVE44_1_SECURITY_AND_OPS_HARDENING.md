# Wave44.1 — Security & Ops Hardening

## 1) Workflows tick: Public لكن محمي X-Worker-Token
- تم إلزام X-Worker-Token على:
  - POST /workflows/executions/:id/tick
  - POST /workflows/executions/:id/steps/:stepId/complete
- المقارنة أصبحت timingSafeEqual.
- تم تحديث العامل Worker ليستدعي tick عبر postJsonWorker (يرسل X-Worker-Token).

## 2) Workflows escalation: مسار عامل مخصص
- تم إضافة مسار عامل:
  - POST /workflows/worker/executions/:id/escalate
- محمي X-Worker-Token (timingSafeEqual).
- تم الإبقاء على المسار المصادق للعمليات/الإدارة:
  - POST /workflows/executions/:id/escalate
- تم تحديث العامل ليستخدم مسار العامل الجديد.

## 3) Notifications: إصلاح صلاحيات ومنطق
- GET /notifications
  - يعتمد على المستخدم الحالي فقط.
  - لا يقبل userId إلا للـ org_admin/super_admin داخل نفس الجهة.
- PATCH /notifications/:id/read
  - مسموح لصاحب التنبيه دائمًا حتى لو viewer.
  - يمنع تعديل تنبيهات الآخرين.
- POST /notifications
  - محصور على org_admin/super_admin.
- POST /notifications/worker
  - مسار داخلي للعامل/الخدمات، Public لكن محمي X-Worker-Token.

## 4) Outbox: جدولة retry فعلية
- عند فشل الإرسال في dispatchNow:
  - يتم تحديث nextAttemptAt في قاعدة البيانات.
  - يتم جدولة Job جديد في BullMQ ب delay حتى nextAttemptAt عبر scheduleOutboxRetry.

## متطلبات التشغيل
- يجب ضبط WORKER_TOKEN في:
  - API
  - Worker
