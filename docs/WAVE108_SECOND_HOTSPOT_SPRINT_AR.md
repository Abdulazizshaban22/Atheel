# Wave 108 — Second Hotspot Sprint and External Audit Stubs

## الهدف
تسريع إغلاق ضجيج النوع في `apps/api` بدون الادعاء الكاذب بأن الاعتماديات مثبتة أو أن `pnpm typecheck` أصبح مغلقًا بالكامل.

التركيز كان على محورين:
1. تنظيف ثاني مجموعة من الـ hotspots المحلية الأعلى أثرًا
2. تقليل ضجيج missing-module داخل بيئة التدقيق نفسها حتى تصبح الصورة أقرب إلى الديون المحلية الحقيقية

## ماذا تغيّر
- إضافة ambient audit stubs منضبطة لـ:
  - `@nestjs/common`
  - `class-validator`
  - `@nestjs/swagger`
  - `@prisma/client`
  - `bullmq`
  - `ioredis`
  - `express`
- تحسين `process` و `require` و `console` داخل بيئة تدقيق الأنواع
- إعادة كتابة `risks.service.ts` بعقود typed أوضح حول Prisma facade والـ risk normalization
- إعادة كتابة `visitor-guide.service.ts` بعقود typed أوضح للـ guide generation والـ fallback
- إغلاق worker typing في `experience-twin-sync-worker.service.ts`
- إغلاق transaction typing في:
  - `content.application-service.ts`
  - `projects.application-service.ts`
- إعادة كتابة `otel.ts` بـ typed runtime require بدل property access على `unknown`
- إضافة test حارس يمنع عودة `: any` و `as any` إلى الملفات المستهدفة

## التحقق الفعلي
تم تشغيل الآتي فعليًا داخل البيئة:

```bash
node scripts/audit/ts-parse-audit.mjs
node scripts/audit/ts-typecheck-audit.mjs
```

### النتيجة
- قبل الموجة: 722 diagnostics
- بعد الموجة: 253 diagnostics
- التحسن الصافي: 469 diagnostic أقل

## الإغلاق الفعلي للملفات المستهدفة
الملفات التالية أصبحت صفر diagnostics في تقرير `ts-typecheck-audit.json`:
- `apps/api/src/modules/risks/risks.service.ts`
- `apps/api/src/modules/visitor-guide/visitor-guide.service.ts`
- `apps/api/src/modules/experiences/experience-twin-sync-worker.service.ts`
- `apps/api/src/modules/content/content.application-service.ts`
- `apps/api/src/modules/projects/projects.application-service.ts`
- `apps/api/src/otel.ts`

## ما لم يُغلق بعد
- ما زالت هناك ديون محلية واضحة في:
  - `culture-programs-brain.service.ts`
  - `api-exception.filter.ts`
  - `queue.service.ts`
  - بعض وحدات الـ brains الأقدم
- missing external packages انخفضت كثيرًا، لكنها لم تختفِ بالكامل
- هذا لا يساوي build closure كامل للمستودع

## لماذا هذا القرار صحيح
لأن المشروع كان يحتاج أولًا إلى جعل type-level debt مرئية وقابلة للتنظيف بترتيب صحيح، بدل بقاء التقييم غارقًا في missing-module noise يمنعنا من رؤية الملفات المحلية الأشد خطرًا.
