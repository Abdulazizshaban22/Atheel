# Wave 122 — Local Bootstrap and Handoff Runbook

## الهدف

هذا الملف يشرح كيف يبدأ مطور جديد مع المستودع بعد Wave 122، وما الذي تغير، وما الذي يجب قراءته أولًا.

## اقرأ أولًا

1. docs/architecture/WAVE122_MASTER_TECHNICAL_BLUEPRINT_AR.md
2. docs/release/WAVE122_ARCHITECTURE_BASELINE_AND_SHELL_REFACTOR_AR.md
3. apps/api/src/common/config/runtime-env.ts
4. apps/web/lib/navigation.ts

## ما الذي تغير في هذه الموجة

- تم إنشاء Blueprint مركزي يحدد scope وroles وmodules وworkflows وdata model وarchitecture وdelivery waves
- تم نقل navigation من قائمة مسطحة داخل AppShell إلى config مركزية قابلة للصيانة
- تم نقل منطق runtime env في API إلى ملف واضح ومختبر يدويًا بدل بعثرة process.env

## كيف أشغّل المشروع محليًا

### المتطلبات
- Node.js 20+
- pnpm 9+
- PostgreSQL
- Redis

### الخطوات
1. انسخ .env.example إلى .env
2. شغّل الخدمات المساندة عبر Docker Compose إن توفرت
3. ثبّت الاعتماديات
4. ولّد Prisma Client
5. شغّل التطبيقات

### أوامر مرجعية
- pnpm install
- pnpm db:generate
- pnpm dev

## ما الذي لا يزال ناقصًا

- route groups حقيقية في web
- data layer موحدة على TanStack Query
- تدقيق boundary imports بين الوحدات
- حصر نهائي لاستخدام DataStoreService داخل API

## ملاحظات استلام

- لا تضف route جديدًا قبل تحديث blueprint أو delivery wave المناسبة
- لا تعد إلى nav مسطحة داخل AppShell
- لا تضف process.env usage جديدًا في bootstrap أو داخل logic حساس دون تحديث runtime env contract
