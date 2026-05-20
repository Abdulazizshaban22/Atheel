# WAVE47 — Production Readiness + Observability + Saudi Cultural Features

## 1) DTO coverage للأطراف الحساسة + منع Overposting
تم تحويل Bodies غير المقيّدة إلى DTOs في نقاط تشغيل حساسة لمنع overposting ولتقليل أخطاء المنطق:
- AI (مسارات قد تُستغل لاستهلاك موارد أو تمرير حقول غير متوقعة)
  - POST /ai/routing/model
  - POST /ai/embeddings
  - POST /ai/rerank
  - POST /ai/eval/output
  - POST /ai/prompt-templates/execute
- توليد المحتوى التشغيلي
  - POST /narratives/generate
  - POST /narratives/generate/ab
  - POST /program-templates/generate
  - POST /program-templates/:id/instantiate
  - POST /visitor-guide/generate
  - POST /documentation/validate/inspiration-asset
- وحدات التشغيل الحساسة المذكورة سابقًا في Wave47
  - notifications create + worker create
  - outbox mark-failed
  - ops settings/skills/slo/incident actions

تم تشديد ValidationPipe عالميًا:
- whitelist=true
- forbidNonWhitelisted=true
- transform=true مع enableImplicitConversion

## 2) OTLP exporters + Dashboards + Runbooks
### 2.1 OTLP
تم اعتماد bootstrap آمن لـ OpenTelemetry:
- لا يكسر التشغيل إذا كانت الاعتماديات غير موجودة أو OTEL غير مفعّل
- يدعم OTLP HTTP traces + metrics عند توفر:
  - OTEL_EXPORTER_OTLP_ENDPOINT
  - OTEL_EXPORTER_OTLP_HEADERS

### 2.2 Dashboards
تم إضافة لوحات Grafana جاهزة كبداية:
- ops/observability/grafana/atheel_ops_overview.json
- ops/observability/grafana/atheel_security_overview.json
- ops/observability/grafana/atheel_http_errors.json

ملاحظة: تم إضافة مقاييس إضافية في /metrics:
- http_server_requests_total
- atheel_outbox_sent_total
- atheel_outbox_failed_total

### 2.3 Runbooks
تم إضافة Runbooks تشغيلية عملية:
- ops/observability/runbooks/OUTBOX_FAILURES.md
- ops/observability/runbooks/AUTH_BRUTE_FORCE.md
- ops/observability/runbooks/REDIS_QUEUE_DOWN.md
- ops/observability/runbooks/SLO_BURN_RATE.md
- ops/observability/runbooks/WORKFLOWS_SLA_BREACH.md

## 3) ميزتين سعوديتين
### 3.1 مولد موسم سعودي
- API:
  - POST /seasons/generate
- Web:
  - /seasons
- يعتمد على culture-sa-kernel لتوليد أفكار متوازنة مع KPIs و Assets و Workflow hints

### 3.2 سجل التراث + بروتوكولات الوصول
- DB:
  - HeritageAsset + HeritageAccessProtocol
- API:
  - GET/POST/PATCH /heritage/assets
  - POST /heritage/assets/:id/protocols
- Web:
  - /heritage/assets
- دعم مستويات وصول: public/researchers/internal/restricted مع سياسة JSON للقيود الدقيقة
