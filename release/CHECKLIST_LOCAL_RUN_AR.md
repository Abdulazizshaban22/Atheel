# Checklist تشغيل محلي — أَثِيل v0.3

## 1) المتطلبات
- Node.js 20+
- pnpm 9+
- Docker + Docker Compose
- PostgreSQL و Redis (أو عبر docker-compose.dev.yml)

## 2) تشغيل الخدمات المساندة
```bash
cd infra
docker compose -f docker-compose.dev.yml up -d
```

## 3) إعداد البيئة
```bash
cd ..
cp .env.example .env
```

تأكد من DATABASE_URL يشير إلى Postgres المحلي المطابق لـ docker-compose.

## 4) تثبيت الحزم
```bash
pnpm install
```

## 5) توليد Prisma Client
```bash
pnpm db:generate
```

## 6) إنشاء Migration محليًا (توليد SQL فعلي)
```bash
pnpm db:migrate:dev --name atheel_wave03_foundation
```

## 7) Seed البيانات التجريبية
```bash
pnpm db:seed
```

## 8) تشغيل التطوير
```bash
pnpm dev
```
أو تشغيل API فقط:
```bash
pnpm api:dev
```

## 9) التحقق السريع
- API Swagger: http://localhost:4000/api/docs
- Web: http://localhost:3000
- Login: /login
- Users: /users
- Approvals: /approvals
- Attachments: /attachments

## 10) بيانات الدخول التجريبية
- admin@atheel.sa / Admin@1234
- editor@atheel.sa / Editor@1234
- pm@atheel.sa / Pm@1234

## 11) ملاحظة مهمة
إذا تعذر الاتصال بـ Postgres، سيستمر كثير من المسارات في العمل عبر fallback in-memory (خصوصًا CRUD الأساسي وAuth demo)، لكن لن تُحفظ البيانات بشكل دائم.
