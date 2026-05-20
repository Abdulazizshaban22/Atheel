# Wave06 Runtime + Workspaces + Programs + AI Routing

## ما تمت إضافته فعليًا

### 1) Workspaces API
- إدارة مساحات العمل التشغيلية
- سياسات التوجيه الذكي للنماذج
- سياسات RAG والحوكمة
- قوالب Prompt Templates مرتبطة بالمساحة
- معاينة rendering للقالب قبل تشغيل النموذج

### 2) Programs API
- إدارة البرامج عالية المستوى
- ربط المشاريع وسير العمل بالبرنامج
- احتساب جاهزية البرنامج readiness بشكل ديناميكي
- ملخص محفظة البرامج portfolio summary

### 3) Workflow Executions Runtime
- طابور تنفيذ فعلي لسير العمل Workflow Executions
- حساب queueScore بالأولوية + موعد الاستحقاق + القيمة الاستراتيجية
- حالات تنفيذ: queued / running / waiting_input / completed / failed / paused
- أحداث تنفيذ Execution Events لتتبع كل خطوة
- أوامر تشغيل: enqueue / tick / dispatch-next / manual actions

### 4) AI Utilities
- محاكاة توجيه النموذج Model Routing
- توليد Embeddings (محاكاة deterministic قابلة للاستبدال)
- Reranking للنصوص
- تقييم جودة المخرجات
- تشغيل Prompt Template مباشرة عبر LLM API الحالي

## ملاحظات هندسية
- التخزين الداخلي الحالي In-Memory في DataStoreService مع محاولات Persist إلى Prisma بشكل آمن عند توفر الجداول
- تم إضافة Prisma models + migration scaffold لحفظ Workspace / Program / WorkflowExecution / WorkflowExecutionEvent
- التنفيذ متوافق مع بنية workflow-kernel الحالية (القوالب الـ 500)

## الصيغ الحسابية الأساسية
- queueScore = priority + dueBoost + strategicBoost - complexityPenalty - backlogPenalty
- estimatedCostUsd = aiCalls × (prompt_tokens/1000 × in_rate + completion_tokens/1000 × out_rate)
- readinessScore (برنامج) = 65% متوسط تقدم المشاريع + تأثير الحالات النشطة + 15% القيمة الاستراتيجية

## حالات الاستخدام المباشرة
- تشغيل مسارات اعتماد ومحتوى ثقافي على طابور واحد
- تكوين قوالب prompts لكل Workspace
- بناء Program يضم مشاريع + Workflow Instances
- جدولة وتشغيل executions مع انتظار إدخال بشري عند نقاط الاعتماد
