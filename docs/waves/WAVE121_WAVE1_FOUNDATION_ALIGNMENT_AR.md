# Wave 1 — Foundation Alignment & Boundary Enforcement

## الهدف

تحويل البداية من كلام متفرق إلى أساس هندسي مُنفّذ داخل المستودع نفسه.

هذه الموجة لا تضيف feature business جديدة، لكنها تضيف شيئًا أهم في هذه المرحلة:

- تعريف رسمي للمنتج والنطاق
- blueprint معماري واضح
- قواعد حدود بين التطبيقات والحزم
- تدقيق آلي يمنع الانزلاق التدريجي إلى spaghetti code
- بداية handoff-ready documentation حقيقية

## ما بُني في هذه الموجة

1. Executive Technical Framing
2. Product scope + roles + modules + workflows + data model draft
3. Technical decisions مع تبرير واضح
4. Architecture blueprint للمستودع الحالي والمستهدف
5. Delivery waves plan
6. Module boundary rules
7. Script آلي لتدقيق boundary violations
8. GitHub Action لتشغيل التدقيق ورفع تقرير artifact

## الملفات المضافة أو المعدلة

### Docs
- docs/architecture/WAVE121_EXECUTIVE_TECHNICAL_FRAMING_AR.md
- docs/architecture/WAVE121_PRODUCT_SCOPE_AR.md
- docs/architecture/WAVE121_TECHNICAL_DECISIONS_AR.md
- docs/architecture/WAVE121_ARCHITECTURE_BLUEPRINT_AR.md
- docs/engineering/BOUNDARY_RULES_AR.md
- docs/waves/WAVE121_DELIVERY_WAVES_AR.md
- docs/waves/WAVE121_WAVE1_FOUNDATION_ALIGNMENT_AR.md

### Automation
- scripts/audit/module-boundaries.mjs
- .github/workflows/architecture-audit.yml
- package.json

### Generated Artifacts
- docs/closure/MODULE_BOUNDARY_AUDIT.md
- .artifacts/architecture/module-boundary-audit.json

## لماذا هذه الموجة أولًا

لأن المستودع الحالي واسع، وفيه عدد كبير من الوحدات والصفحات.

إذا دخلنا مباشرة على feature work إضافي، سنزيد الاتساع من غير أن نغلق الحدود. هذا يرفع تكلفة الصيانة، ويصعّب handoff، ويزيد خطر تضخم الاعتماديات المتبادلة بين الطبقات.

لذلك هذه الموجة تعتبر baseline alignment وليست تنظيرًا.

## كيفية التشغيل

من جذر المستودع:

```bash
pnpm audit:module-boundaries
```

ولتشغيل بقية تدقيقات الإغلاق الحالية:

```bash
pnpm closure:generate
```

## ما اكتمل

- تم اعتماد framing رسمي داخل المستودع
- تم توثيق النطاق والقرارات التقنية
- تم بناء أول أداة آلية لحراسة الحدود
- تم توليد تقرير تنفيذي يوضح المخالفات أو سلامة الحدود

## ما لم يكتمل بعد

- إعادة تنظيم app routes إلى route groups فعلية داخل الويب
- فرض boundary rules عبر ESLint rule مخصص أو plugin إضافي
- نقل الوحدات الأساسية إلى package/feature boundaries أوضح
- إغلاق OS Core business paths end-to-end

## الخطوة التالية المنطقية

Wave 2: OS Core Closure

وهي الموجة التي ستنقلنا من alignment إلى business closure حقيقي في:
- auth
- organizations
- users
- roles / policy
- projects / programs
- Prisma-only core persistence
