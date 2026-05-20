# موجة Runtime Closure Run

هذه الدفعة لا تضيف مجالًا جديدًا، بل تجهز الإغلاق التشغيلي الفعلي عبر أدوات تشغيل واضحة:

- تشغيل `db:generate`
- تشغيل `typecheck`
- تشغيل `build`
- تشغيل `api:smoke`
- وتشغيل `migrate deploy` و `test:e2e` عند تفعيل المتغيرات المناسبة

## الأوامر

```bash
pnpm runtime:closure:run
RUN_MIGRATE_DEPLOY=1 pnpm runtime:closure:run
RUN_MIGRATE_DEPLOY=1 RUN_E2E=1 pnpm runtime:closure:run
pnpm runtime:wiring:audit
```

## الهدف

- توحيد مسار التحقق النهائي
- كشف أي كسر في wiring بين المجالات والواجهة
- تجهيز الموجة الأخيرة الخاصة بإغلاق الأخطاء الفعلية
