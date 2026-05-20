# Wave 109 — Compile Closure Sprint and Repo Diet

## الهدف
هذه الموجة جمعت بين مسارين مترابطين:

1. خفض diagnostics المحلية في الملفات الأعلى إزعاجًا داخل `apps/api`.
2. إزالة الملفات المتولدة والمتضخمة من المستودع نفسه، ونقلها إلى مسار artifacts مؤقت يولَّد عند الطلب.

الهدف لم يكن تجميليًا. المطلوب كان تقليل الضجيج، تقوية baseline، ومنع تراكم ملفات لا تضيف قيمة طويلة العمر داخل الريبو.

## ما الذي تغير

### 1) إغلاق دفعة جديدة من hotspots
تم إغلاق diagnostics في الملفات التالية:
- `apps/api/src/common/http/api-exception.filter.ts`
- `apps/api/src/modules/queue/queue.service.ts`
- `apps/api/src/modules/auth/auth.service.ts`
- `apps/api/src/modules/culture-programs-brain/culture-programs-brain.service.ts`
- `apps/api/src/modules/exhibition-brain/exhibition-brain.service.ts`
- `apps/api/src/modules/mega-events-brain/mega-events-brain.service.ts`
- `apps/api/src/modules/urban-experience-brain/urban-experience-brain.service.ts`
- `apps/api/src/modules/destination-brain/destination-brain.service.ts`

### 2) تصحيح import boundaries الفعلية
عدد من وحدات الـ brain كانت تشير إلى `packages/knowledge-kernel` عبر مسار نسبي ناقص بمستوى واحد. تم تصحيح المسارات لتشير إلى الحزمة الحقيقية بدل مسار غير موجود.

### 3) تقوية audit stubs والـ runtime typing
تم توسيع التعريفات الخفيفة لبيئة التدقيق لتشمل:
- `@nestjs/config`
- `@nestjs/jwt`
- `bullmq.Queue`
- بعض خصائص `Job`
- أوامر `IORedis` المستخدمة فعليًا
- خصائص إضافية على `express.Request`

### 4) Repo diet حقيقي
تم حذف الملفات المتولدة التالية من المستودع:
- `docs/api-routes-inventory.md`
- `docs/api-routes-inventory.json`
- `docs/reports/ts-parse-audit.json`
- `docs/reports/ts-type-risk-audit.json`
- `docs/reports/ts-typecheck-audit.json`
- `.package09`

ونُقلت مخرجات السكربتات إلى:
- `.artifacts/audit/`

بحيث تُولد عند الطلب ولا تبقى جزءًا من الريبو نفسه.

### 5) دعم أوضح للتنظيف
تمت إضافة:
- `.gitignore` لإهمال `.artifacts/`
- script جديد: `artifacts:clean`

## نتائج التحقق الفعلية
تم تنفيذ:

```bash
node scripts/audit/ts-parse-audit.mjs
node scripts/audit/ts-type-risk-audit.mjs
node scripts/audit/ts-typecheck-audit.mjs
```

والنتيجة الفعلية:
- parse audit passed for 674 files
- type-risk audit: 0 findings
- typecheck diagnostics انخفضت من 253 إلى 182

## الخلاصة
هذه الموجة حسّنت شيئين مهمين معًا:
- baseline type-level أوضح وأهدأ
- والريبو نفسه صار أنظف وأقل حملًا من ملفات متولدة لا داعي لحفظها داخله
