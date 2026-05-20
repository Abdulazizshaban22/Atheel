# Release Wave07 — Production Runtime + Saudi Culture Deep Pack

## أبرز الإضافات
- QueueService (BullMQ + Redis) لتنفيذ Workflows عبر طوابير حقيقية
- Worker Service منفصل (apps/worker) لمعالجة execution jobs + SLA escalations
- WebSocket Live Stream عبر /ws لبث حالة التنفيذ والأحداث
- SLA escalation policy: تجاوز dueAt يرفع الأولوية تلقائيًا ويعيد enqueue
- Dashboards API + صفحات Web:
  - /dashboards/workflows
  - /dashboards/programs
- Saudi Culture Deep Pack:
  - Taxonomy + Idea Cards (مولدة برمجيًا)
  - API: /culture/*
  - زر تغذية RAG بحزمة معرفة سعودية أولية

## متغيرات البيئة
- QUEUE_MODE=redis|sync
- REDIS_URL
- QUEUE_NAME
- ESCALATION_QUEUE
- WORKER_CONCURRENCY

## تشغيل Docker
استخدم infra/docker-compose.ai-stack.yml لتشغيل postgres+redis+vllm+api+web+worker.
