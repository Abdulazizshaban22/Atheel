# @madar/exports-svc

خدمة مستقلة لتوليد مخرجات التصدير الثقيلة (PDF / PPTX / Bundle ZIP) باستخدام @madar/doc-kernel.

- هذه الخدمة لا تتعامل مع قاعدة البيانات ولا ترفع المرفقات.
- الـ API الرئيسي هو الذي يجهّز البيانات (Markdown + TemplateMeta) ثم يطلب من هذه الخدمة توليد الملفات.
- التواصل يتم عبر HTTP داخلي محمي بتوكن.

## Environment
- EXPORTS_RENDERER_PORT (default: 3101)
- EXPORTS_RENDERER_TOKEN (required)

## Run
pnpm --filter @madar/exports-svc dev
