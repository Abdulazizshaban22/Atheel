# Wave11 — حزم الاعتماد الرسمية (من المحاكاة إلى العرض)

## الهدف
تحويل نتائج محاكاة التوأم الرقمي إلى حزمة اعتماد رسمية، مع توليد تلقائي لـ:
- عرض الفعالية (Outline 12 شريحة)
- استراتيجية التجربة
- دراسة تشغيلية مبسطة

ثم ربطها داخل أثيل كعناصر محتوى (ContentItems) مع مرفقات Markdown جاهزة للعرض.

## كيف تعمل
1) عند اكتمال محاكاة Twin (baseline أو multi) تقوم خدمة Twin تلقائيًا بـ:
- توليد Approval Packet عبر ApprovalPacketsService
- إنشاء 4 عناصر محتوى وربط مرفقات Markdown بها
- تضمين references داخل payloadSnapshot لطلب الموافقة ApprovalRequest
- Enqueue لسير عمل الحوكمة

2) يمكن أيضًا توليد الحزمة يدويًا عبر:
- POST /api/approval-packets/generate

## API
- GET /api/approval-packets
- GET /api/approval-packets/:id
- POST /api/approval-packets/generate

## Web
- /approval-packets
- /approval-packets/:id

## ملاحظات
- المنصة تولّد مستندات Markdown قابلة للتحويل لاحقًا إلى PDF/PPTX.
- عند ربط مزود vLLM يمكن استبدال الصياغة الآلية الحالية بصياغة LLM مع RAG (مع guardrails).
