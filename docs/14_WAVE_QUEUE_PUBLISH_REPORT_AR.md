# Wave14 — تحويل publish و report إلى Jobs + سجل أحداث دائم

هذه الموجة تجعل خطوتي publish و report خطوات غير متزامنة تُنفّذ في Worker مستقل عبر BullMQ/Redis، مع توثيق أحداث التنفيذ بآلية idempotency ومحاولات retries.

## ما الذي تغير

### 1) publish و report أصبحت Deferred Steps

- داخل runtime-kernel تم دعم مخرجات خاصة من الـ handler بالشكل:
  - __defer: true
  - noteAr
  - job { queue, jobId, idempotencyKey }
- عند إرجاع __defer لا تُغلق الخطوة، بل تتحول إلى waiting_input ويتم إيقاف التقدم حتى يكمل العامل العمل.

### 2) إضافة طوابير جديدة

- atheel-workflow-publish
- atheel-workflow-report

API يقوم بجدولة العمل عبر QueueService ثم يسجل event من نوع:
- publish.job_enqueued
- report.job_enqueued

### 3) Worker ينفذ المنطق الحقيقي ويكتب ملفات artifacts

- publish job:
  - simulateTwinFlow
  - buildApprovalPacketSections
  - buildPptxFromMarkdown
  - كتابة الملفات إلى runtime_artifacts/executions/<executionId>/publish/
  - ثم استدعاء endpoint العامل لإكمال الخطوة

- report job:
  - قراءة ملف المحاكاة إن كان محفوظًا
  - impactScore / riskScore
  - كتابة ملف تقرير JSON
  - ثم إكمال الخطوة

### 4) سجل أحداث دائم + idempotency

تم توسيع WorkflowExecutionEvent في Prisma ليشمل:
- idempotencyKey (unique)
- attempt
- actor

وعند إكمال الخطوة عبر العامل، يتم إنشاء event من نوع:
- step.completed

## نقاط تشغيل

### إعداد قاعدة البيانات
بعد تحديث schema.prisma:
- pnpm --filter @madar/db prisma:db:push

### تشغيل البيئة
docker compose -f infra/docker-compose.ai-stack.yml up --build

متغيرات البيئة الجديدة:
- PUBLISH_QUEUE
- REPORT_QUEUE
- ARTIFACTS_DIR

## كيف تراقب التنفيذ

1) نفّذ enqueue لمسار عمل
2) راقب /workflows/executions/:id
3) ستجد publish و report في waiting_input مع __defer
4) بعد إتمام العامل ستظهر مخرجات files بدل base64
