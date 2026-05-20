# أَثِيل — توحيد المونوريبو وربط المسارات (Global-grade)

## لماذا هذا التوحيد
النسخ الموزعة على Waves كانت ممتازة للتسليم المرحلي، لكن التوسع الحقيقي يتطلب:
- مصدر واحد للحقيقة (Single Source of Truth) للكود والتبعيات والوثائق
- ربط واضح بين مسارات العمل: الفكرة → المعرفة → المحاكاة → الاعتماد → التصدير → القياس
- نموذج تشغيل أقرب لمنصات orchestration العالمية: تعريف واضح للـ Workflow + محرك تنفيذ + سجلات + عمال Workers

## ما تم فعله في هذا التحديث
1) اعتماد Wave13 كقاعدة موحدة لأنها الأكثر اكتمالًا (Twin + Packets + Exports + Innovations + Workflows500)
2) إضافة دعم تنفيذ فعلي للخطوات عبر Handlers داخل runtime-kernel:
   - وظيفة جديدة: tickExecutionWithHandlers()
   - خيار تمرير handlers من طبقة الـ API لتنفيذ منطق حقيقي لكل خطوة
3) ربط WorkflowsModule بالـ Kernels عبر Handlers:
   - retrieve: استرجاع RAG من KnowledgeChunks
   - plan: خطة Agent ثقافي
   - draft: بناء RagPrompt + مسودة markdown
   - publish: إن وُجد TwinGraph + SimulationProfile → محاكاة Twin + توليد Approval Packet + توليد PPTX
   - report: حساب Impact/Risk من نتائج المحاكاة

## خريطة الربط بين المسارات (مسار تشغيل واضح)
- Collect (system)
  - توحيد المدخلات (brief / deadline / metadata)
- Classify (ai)
  - تصنيف استدلالي أولي (Theme/Region) — جاهز للترقية إلى تصنيف LLM مضبوط
- Retrieve (ai + RAG)
  - استدعاء retrieveTopChunks من ai-kernel على KnowledgeChunks
- Plan (ai agent)
  - buildCultureAgentPlan (ai-kernel) لتحديد نقاط مراجعة بشرية واعتمادات
- Draft (ai)
  - buildRagPrompt (ai-kernel) + مسودة Markdown
- Score (ai)
  - تقييم جودة أولي + أعلام مخاطر
- Approve (human)
  - نقطة توقف واعتماد (يمكن ربطها لاحقًا بمسار Approvals الرسمي)
- Publish (system)
  - إذا كانت المدخلات تشمل TwinGraph/Profile: محاكاة تدفق الزوار + توليد Approval Packet + PPTX
- Report (system)
  - Impact/Risk Scoring (innovation-kernel)

## ما يلزم للارتقاء لمستوى عالمي (خارطة تطوير مختصرة)
- Event History + Idempotency + Retries (نمط Durable Execution)
- فصل Worker مستقل لمعالجة الخطوات الثقيلة (PDF/PPTX/AI calls)
- تعريف Workflow بصيغة قابلة للعرض بصريًا (BPMN-like) + استيراد/تصدير (n8n-like موجود)
- Observability: traces/metrics/logs (OpenTelemetry)
- Multi-tenancy صارم + RBAC + Audit سجلات قابلة للتدقيق

