# منصة أَثِيل — دليل التشغيل الكامل
## Wave 123 | النسخة الإنتاجية

---

## التشغيل السريع (5 دقائق)

```bash
# 1. فك الضغط
unzip ATHEEL_COMPLETE_WAVE123.zip -d atheel
cd atheel

# 2. نسخ ملف البيئة
cp .env.example .env

# 3. تشغيل البنية التحتية (PostgreSQL + Redis + RabbitMQ + MinIO)
docker compose -f infra/docker-compose.dev.yml up -d

# 4. تثبيت المكتبات
pnpm install

# 5. توليد Prisma Client
pnpm db:generate

# 6. تطبيق Schema على قاعدة البيانات
pnpm db:push

# 7. تشغيل المنصة
pnpm dev

# 8. تشغيل الاختبارات
npx tsx apps/api/test/wave123-vector-agent-integration.e2e-spec.ts
npx tsx apps/api/test/wave123-e2e-contracts.e2e-spec.ts
```

**API:** http://localhost:3001/api
**Web:** http://localhost:3000
**Swagger:** http://localhost:3001/api/docs
**RabbitMQ:** http://localhost:15672 (guest/guest)
**MinIO:** http://localhost:9001 (minioadmin/minioadmin)

---

## التشغيل الإنتاجي

```bash
# 1. توليد الأسرار
bash infra/init-secrets.sh

# 2. تشغيل الإنتاج
docker compose -f infra/docker-compose.prod.yml up -d

# 3. التحقق
curl http://localhost:3001/api/health
```

---

## بنية المشروع

```
atheel/
├── apps/
│   ├── api/          → NestJS API (75 modules, 591 endpoints)
│   ├── web/          → Next.js Frontend (86 pages)
│   ├── worker/       → BullMQ Worker (11 queues)
│   └── exports-svc/  → PDF/PPTX Generator
├── packages/
│   ├── ai-kernel/    → Vector Search + RAG + Agent Planning
│   ├── db/           → Prisma Schema (125 models, 240 indexes)
│   ├── shared/       → Domain Types + Utilities
│   ├── twin-kernel/  → Digital Twin Simulation
│   └── ... (16 packages total)
├── infra/
│   ├── docker-compose.dev.yml   → Development
│   ├── docker-compose.prod.yml  → Production
│   ├── init-extensions.sql      → pgvector + pg_trgm
│   └── init-secrets.sh          → Secrets generator
└── .github/workflows/ci.yml     → CI Pipeline
```

---

## Wave 123 — ملخص التعديلات

### ✅ تم إنجازه (184 ملف)

| البند | التفاصيل |
|-------|---------|
| ترحيل الثبات | 32 وحدة من DataStore → Prisma |
| DataStore refs | 0 (كان ~380) |
| أدمغة AI | 6 أدمغة محوّلة بالكامل |
| Vector Search | 3 استراتيجيات (lexical/vector/hybrid) |
| Arabic NLP | مطابقة جذع عربي |
| Agent Runtime | Prisma + 12 أداة + تقييمات |
| RBAC | كل Controllers محمية |
| DTO Validation | 168/168 = 100% |
| Database Indexes | 240 (كان 215) |
| Swagger | محمي في Production |
| Docker Prod | مكتمل مع secrets |
| CI Pipeline | مع اختبارات |
| Grafana | Dashboard جاهز |
| Design System | 8 components |
| Prisma Migration | SQL كامل |
| Embedding Pipeline | pgvector-ready |
| any cleanup | 608 سطر تم إصلاحه |
| اختبارات | 100/100 ✅ |

### أرقام المشروع النهائية

| المقياس | القيمة |
|---------|--------|
| ملفات TypeScript | 692 |
| سطور كود | ~66,000 |
| Prisma Models | 125 |
| Database Indexes | 240 |
| API Modules | 75 |
| API Endpoints | ~591 |
| Web Pages | 86 |
| Worker Queues | 11 |
| Kernel Packages | 16 |
| Test Files | 26 |
| Docker Files | 7 |
| CI Workflows | 6 |

---

## الأوامر المتاحة

```bash
pnpm dev                    # تشغيل التطوير
pnpm build                  # بناء الإنتاج
pnpm typecheck              # فحص الأنواع
pnpm db:generate            # توليد Prisma Client
pnpm db:push                # تطبيق Schema
pnpm db:migrate:dev         # إنشاء migration
pnpm api:smoke              # اختبار سريع للـ API
pnpm closure:generate       # توليد تقارير الإقفال
pnpm audit:truth-matrix     # مصفوفة الحقيقة
pnpm audit:endpoints        # جرد الـ Endpoints
pnpm audit:module-boundaries # حدود الوحدات
```
