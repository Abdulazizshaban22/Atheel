# Wave 113 — Monorepo Package Closure Sprint

## ماذا بُني
تمت إضافة طبقة TypeScript مستقلة للحزم المشتركة بدل ترك التحقق محصورًا في `apps/api` فقط.

### ما أُضيف
- `tsconfig.base.json`
- `packages/tsconfig.package-base.json`
- `tsconfig.packages.json`
- `packages/@types/package-audit-globals.d.ts`
- `packages/*/tsconfig.json` للحزم الحرجة التالية:
  - doc-kernel
  - object-store
  - runtime-kernel
  - packet-kernel
  - twin-kernel
- `scripts/audit/ts-package-kernels-audit.mjs`
- `scripts/package-kernels-closure-verify.mjs`

### ما تم تنظيفه نوعيًا
- `packages/doc-kernel/src/markdown.ts`
- `packages/doc-kernel/src/pdf.ts`
- `packages/doc-kernel/src/pptx.ts`
- `packages/runtime-kernel/src/execution.ts`
- `packages/packet-kernel/src/types.ts`
- `packages/packet-kernel/src/build.ts`
- `packages/twin-kernel/src/simulate.ts`

## لماذا هذا القرار صحيح
بدل ترك الحزم المشتركة خارج أي عقد تحقق واضح، أصبحت الآن تملك tsconfig مستقلًا وقابلة للفحص جماعيًا عبر `tsc -b tsconfig.packages.json`.

كذلك تم توجيه مخرجات declaration وملفات tsbuildinfo إلى `.artifacts/` بدل تلويث جذور الحزم نفسها، ثم تنظيفها بعد التحقق.

## أوامر التشغيل
```bash
node scripts/audit/ts-package-kernels-audit.mjs
node scripts/package-kernels-closure-verify.mjs
```

## النتيجة الفعلية
- `apps/api` بقي مغلقًا على مستوى typecheck المحلي.
- الحزم الخمس المستهدفة نجحت في build مرجعي عبر `tsc -b tsconfig.packages.json`.
- لم تُترك `.artifacts/package-types` أو ملفات `*.tsbuildinfo` داخل الحزمة النهائية.
