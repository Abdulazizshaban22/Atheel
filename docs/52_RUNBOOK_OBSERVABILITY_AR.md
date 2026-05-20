# Runbook — Observability (Wave38)

هذا الدليل يشغّل المراقبة والتتبّع والقياس للمشروع عبر OpenTelemetry + Prometheus + Grafana.

## 1) تشغيل حزمة المراقبة

من مجلد infra:

```bash
cd infra
docker compose -f docker-compose.observability.yml up -d
```

المنافذ:

- Grafana: http://localhost:3005 (admin / admin)
- Prometheus: http://localhost:9090
- OTLP HTTP (Collector): http://localhost:4318

## 2) تفعيل OpenTelemetry في API/Worker

أضف المتغيرات التالية في بيئة التشغيل:

```bash
OTEL_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
OTEL_SERVICE_NAME=atheel-api
```

ملاحظة:
عند تشغيل API خارج شبكة docker-compose، غيّر OTEL_EXPORTER_OTLP_ENDPOINT إلى عنوان مناسب.

## 3) تفعيل قياسات Prometheus من API

Endpoint القياسات:

```
/api/metrics
```

في Prometheus (infra/prometheus/prometheus.yml) فعّل job `atheel-api` إذا كانت خدمة API داخل نفس الشبكة.
