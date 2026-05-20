# ملخص التسليم النهائي — أَثِيل (Wave46)

## ما الذي تم تسليمه في هذا التحديث

### 1) إقفال مانع التشغيل الحاسم
- إضافة الملف المفقود:
  - apps/api/src/common/security/worker-token.ts
- توحيد جميع مسارات العامل Worker Token لتستخدم دالة واحدة assertWorkerToken بمقارنة آمنة timingSafeEqual.

### 2) Wave44.2 Security Fixes (تثبيت وتشديد)
- حماية tick لسير العمل: Public بدون JWT لكن إلزام X-Worker-Token.
- إصلاح تصعيد سير العمل للعامل عبر:
  - POST /workflows/worker/executions/:id/escalate
- إصلاح Notifications:
  - list للمستخدم الحالي فقط
  - markRead لصاحب التنبيه حتى لو viewer
  - create محصور على org_admin/super_admin أو worker
- Outbox retries فعليًا في Redis mode عبر scheduleOutboxRetry.

### 3) Wave45 — تشغيل متقدم (Auto-Routing + SLO + Incidents)

#### A) Auto-Routing Engine للموافقات
- عند submit للموافقة، يتم اختيار currentApproverId تلقائيًا (بدون تدخل يدوي) عبر خوارزمية قابلة للشرح تعتمد على:
  - Skill Matrix لكل مراجع حسب نوع الكيان entityType
  - Workload metrics: عدد الموافقات النشطة والمتأخرة لكل مراجع
  - Urgency مشتقة من dueAt
- تم إضافة Skill Matrix storage:
  - ApprovalReviewerSkill
- تحديث skill تلقائيًا بعد قرارات المراجعة عبر EMA (Exponential Moving Average) لضمان ثبات وتحسن تدريجي.

#### B) Incident grouping + dedup + quiet hours
- إضافة حقول على OutboxMessage:
  - incidentKey / dedupKey / groupCount / suppressedUntil / lastEmittedAt
- Dedup يمنع تكرار نفس التنبيه الخارجي خلال نافذة زمنية قابلة للتخصيص.
- Quiet hours:
  - يدعم ESCALATION_QUIET_HOURS أو إعدادات OpsSettings
  - يتم تأجيل القنوات الخارجية غير الحرجة تلقائيًا إلى نهاية ساعات الهدوء.

#### C) SLO burn-rate + alert rules
- تعريف سياسات SLO عبر SloPolicy
- احتساب burn-rate القصير والطويل عبر:
  - Outbox delivery (sent vs failed)
  - Workflow SLA breaches (sla.escalation.workflow مقابل executions المكتملة)
  - Approvals SLA breaches (sla.escalation.approval مقابل القرارات)
- نقطة تشغيل: POST /api/ops/slo/evaluate لإطلاق تنبيهات SLO (In-app + Outbox مع dedup + quiet hours).

### 4) Wave46 — ترقية عميقة (Smart Skill Matrix + Fair Routing + Incident Timeline + Multi-window Burn-rate)

#### A) Skill Matrix أذكى يتعلم من نوع المخالفة/المجال/المنطقة
- إضافة حقول سياق على ApprovalRequest:
  - contextViolationType / contextDomain / contextRegion
- توسعة dimension keys في ApprovalReviewerSkill:
  - entityType:... + violationType:... + domain:... + region:...
- تجميع مهارة مركبة Composite Skill عبر أوزان ثابتة + وزن ثقة متدرّج حسب evidenceCount.

#### B) Routing عدالة أعلى + تبريد reviewer cooldown
- إضافة ApprovalRoutingState لحفظ lastAssignedAt و assignedCount لكل مراجع داخل الجهة.
- التوجيه أصبح:
  - يراعي load (العدد النشط)
  - ويضيف fairnessBoost حسب الزمن منذ آخر تكليف
  - ويطبق cooldown لمنع تكديس الحالات على نفس الشخص إلا عند الاستعجال العالي.
- إعدادات التحكم أصبحت ضمن OpsSettings:
  - approvalsReviewerCooldownMinutes
  - approvalsMaxActivePerReviewer

#### C) Incident timeline داخل الواجهة + إغلاق/إقرار/كتم
- تحويل Incidents إلى كيان مستقل بدل تجميع تقارير من Outbox فقط:
  - Incident + IncidentEvent
- إضافة endpoints:
  - /api/ops/incidents + /timeline + ack/close/mute/unmute
- واجهة جديدة في الويب:
  - /ops/incidents/:id لعرض timeline وتنفيذ الإجراءات.

#### D) Multi-window multi-burn-rate حقيقي
- burn-rate لم يعد زوج نافذة واحد فقط.
- تطبيق قواعد Multi-window وفق نمط fast/slow burn:
  - (5m & 1h) threshold ≈ 14.4
  - (30m & 6h) threshold ≈ 6
  - (2h & 24h) threshold ≈ 3
  - (6h & 72h) threshold ≈ 1
- تم دعم تحجيم thresholds تلقائيًا حسب errorBudgetWindowDays عبر معادلة تحفظ نفس نسب استهلاك ميزانية الأخطاء (2%/5%/10%).

## Endpoints الجديدة
- تم تحديث release/ENDPOINTS_RBAC_MATRIX_AR.md لتشمل Ops + SLO + Incidents.

## ملاحظات إطلاق مهمة
- Redis إلزامي عمليًا في الإنتاج إذا كنت تعتمد على:
  - delayed outbox (quiet hours)
  - retries المجدولة
- يلزم ضبط WORKER_TOKEN على بيئات الإنتاج (API + Worker).

## مصادر تصميم Burn-rate (مرجعية تشغيل)
- Google SRE Workbook: Alerting on SLOs
- Grafana Cloud SLO alert conditions
- Datadog burn rate thresholds (30-day examples)


---

# Wave46.1 — إقفال ما قبل الإطلاق (Production Readiness + Brute Force + Observability + RAG Hardening)

## 1) إلزام Redis في الإنتاج + منع sync mode
- تم إضافة فحص إجباري في API و Worker:
  - Production requires REDIS_URL (أو REDIS_CONNECTION_STRING)
  - منع QUEUE_MODE=sync في production

## 2) Rate limiting + قفل مؤقت بعد محاولات فاشلة + تسجيل تشغيلي
- تم تفعيل Rate limiting عالمي عبر @nestjs/throttler مع تخزين Redis
- تم تشديد /auth/login:
  - Limit مخصص لمسار الدخول
  - قفل مؤقت للحساب بعد عدد محاولات فاشلة (مع نافذة زمنية قابلة للضبط)
  - تسجيل جميع محاولات الدخول الفاشلة/القفل ضمن OperationalEvent

## 3) تحقق إدخالات أقوى في WorkflowsController
- إضافة DTOs فعليّة لأهم نقاط العمل الحرجة:
  - instantiate / simulate / enqueue / dispatch-next / tick / complete / action / export
- تفعيل Strict ValidationPipe (whitelist + forbidNonWhitelisted) على هذه المسارات لمنع overposting.

## 4) تفويض أدوار على مستوى واجهة الويب
- تحديث middleware في الويب:
  - التحقق من وجود الجلسة
  - منع صفحات ops/approvals/governance/... لغير org_admin و super_admin
  - صفحة /forbidden واضحة

## 5) نمط تشغيل للمراقبة (Correlation)
- إضافة CorrelationId + RequestId:
  - الويب يرسل X-Correlation-Id تلقائيًا
  - API يولد/يمرر X-Request-Id و X-Correlation-Id
  - تمرير correlationId داخل jobs في Redis
  - العامل يرسل X-Correlation-Id في جميع نداءاته للـ API

## 6) AI/RAG Hardening أقرب للحكومي
- تشديد system prompt للـ RAG مع فصل صارم بين التعليمات والمعرفة (المعرفة بيانات غير موثوقة)
- تصفية دفاعية بسيطة للمقاطع المشبوهة (Prompt Injection-like)
- إضافة endpoint إداري لتقييم الاسترجاع على حالات معنونة:
  - POST /api/ai/rag/evaluate
  - يعيد Precision@K / Recall@K / MRR

## 7) WAVE48 — بوابة تراث عامة + تراخيص ومتطلبات سعودية + موسم -> برامج تشغيل
- بوابة نشر عامة للتراث عبر IIIF Presentation 3 + IIIF Content Search
  - /api/public/heritage/search
  - /api/public/heritage/assets/:slug
  - /api/public/heritage/assets/:slug/manifest.json
  - /api/public/heritage/assets/:slug/search
  - /api/public/heritage/assets/:slug/attachments/:attachmentId/download
- بحث Fulltext على الأصول المنشورة (GIN + ts_rank/ts_headline عند توفر DB)
- قوائم متطلبات وتراخيص (ComplianceChecklist) مع إنشاء Approval draft
- تحويل مولد الموسم إلى توليد برامج تشغيل كاملة:
  - POST /api/seasons/generate-programs
  - إنشاء Program للموسم + Projects للفعاليات + Workflows + Approvals + Licensing checklists

تفاصيل إضافية في: release/WAVE48_RELEASE_NOTES_AR.md


## Wave51
- صفحة تحقق عامة لعرض بيانات الوثيقة الرسمية عبر QR
- Endpoint تدقيقي يقرأ manifest.json داخل Bundle ZIP ويطابق بصمات SHA-256
- إضافة verificationCode داخل المخرجات و manifest لتسهيل التحقق
