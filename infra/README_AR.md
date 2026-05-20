# البنية التحتية المحلية

الخدمات الحالية:
- PostgreSQL
- Redis
- RabbitMQ (Wave59)
- MinIO (Wave61) تخزين كائنات S3-compatible

Wave07 (Production Runtime):
- Worker Service منفصل لمعالجة طوابير Workflows
- WebSocket Live Stream (API /ws)

الخدمات المقترحة لاحقًا:
- OpenSearch للبحث
- Keycloak للهوية
- Grafana/Prometheus للمراقبة
