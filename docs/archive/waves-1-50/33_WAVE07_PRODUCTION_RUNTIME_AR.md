# Wave07 Production Runtime — تشغيل إنتاجي

## الهدف
رفع تشغيل الـ Workflows من محاكاة داخل الذاكرة إلى Runtime إنتاجي يعتمد على:
- Redis Queue
- Worker Service منفصل
- WebSocket Live Stream
- سياسات SLA وتصعيد تلقائي
- Dashboards تشغيلية
- Integration Tests (Sync fallback)

## المتطلبات
- Node 20+
- pnpm
- Docker (Postgres + Redis)

## تشغيل محلي سريع
1) شغل البنية التحتية
- docker compose -f infra/docker-compose.dev.yml up -d

2) جهز قاعدة البيانات
- pnpm db:generate
- pnpm db:migrate:dev

3) شغل الـ API
- pnpm api:dev

4) شغل الـ Web
- pnpm --filter @madar/web dev

5) شغل الـ Worker
- pnpm --filter @madar/worker build
- REDIS_URL=redis://localhost:6379 API_BASE_URL=http://localhost:4000 API_PREFIX=/api pnpm --filter @madar/worker start

## ملاحظات
- إذا لم يتوفر Redis: ضع QUEUE_MODE=sync وسيعمل التشغيل محليًا (بدون Worker).
- WebSocket عبر /ws ويقوم ببث events مثل execution.updated و execution.event.
