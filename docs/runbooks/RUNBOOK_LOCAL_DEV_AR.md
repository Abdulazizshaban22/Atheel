# Runbook التشغيل المحلي

## المتطلبات
- Node.js LTS
- pnpm
- Docker

## 1) إعداد البيئة
1) انسخ ملف البيئة
- cp .env.example .env

2) عدل المتغيرات الأساسية
- DATABASE_URL
- REDIS_URL
- AUTH_JWT_SECRET
- WORKER_TOKEN

## 2) تشغيل الخدمات المساندة
- docker compose -f infra/docker-compose.dev.yml up -d

## 3) تثبيت الحزم
- pnpm install

## 4) قاعدة البيانات
- pnpm db:generate
- pnpm db:migrate:dev
- pnpm db:seed

## 5) تشغيل المنصة
- pnpm dev

## 6) التحقق
- API Health
  - GET /api/health
- Web
  - http://localhost:3000

## ملاحظات
- في وضع الإنتاج يجب تعطيل أي fallback داخل الذاكرة عبر ALLOW_IN_MEMORY_FALLBACK=false
- التشغيل المحلي يسمح بالمرونة لتسهيل التطوير
