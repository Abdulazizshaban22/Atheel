# حزمة الثقافة السعودية — Deep Pack

## ما الذي تمت إضافته
- مكتبة أفكار ثقافية سعودية مولدة برمجيًا (آلاف التركيبات)
- Taxonomy واضح: مناطق × محاور × صيغ × جماهير
- API endpoints:
  - GET /culture/taxonomy
  - GET /culture/ideas
  - GET /culture/ideas/:id
  - POST /culture/knowledge/install

## الفكرة التشغيلية
بدل كتابة أفكار يدوية غير قابلة للقياس:
- تُولد المنصة Idea Cards قابلة للفرز والتخصيص
- يتم تحويل الفكرة إلى Workflow Template/Instance ثم Execution
- يتم تغذية RAG بمصادر أساسية (حزمة جاهزة) لتقليل الهلوسة

## كيف تستخدمها
1) افتح صفحة: /culture
2) اضغط: تغذية RAG بمصادر أساسية
3) استخدم الفلاتر للوصول إلى فكرة مناسبة
4) انسخ workflowHints واربطها بقالب تشغيل من /workflows

## المخرجات المقترحة التالية
- تحويل Idea Card إلى Program تلقائيًا
- توليد Budget + Risk Register + KPI Plan عبر PromptTemplates
- ربط الفكرة بمسار موافقات وإشعارات
