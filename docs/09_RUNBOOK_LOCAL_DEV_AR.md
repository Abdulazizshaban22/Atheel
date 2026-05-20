# تشغيل محلي

1) تشغيل الخدمات المساندة
docker compose -f infra/docker-compose.dev.yml up -d

2) تثبيت الحزم
pnpm install

3) تشغيل المشروع
pnpm dev

4) التحقق
- Web: http://localhost:3000
- API Health: http://localhost:4000/api/health
- Swagger: http://localhost:4000/api/docs
