# Wave06 API Examples

## Workspaces

### إنشاء Workspace
```bash
curl -X POST http://localhost:3000/workspaces \
  -H 'Content-Type: application/json' \
  -d '{
    "organizationId":"org_demo_1",
    "code":"ATHL-RUNTIME",
    "name":"ATheel Runtime Workspace",
    "status":"active",
    "aiRoutingPolicy":{"defaultModelClass":"balanced"},
    "ragPolicy":{"topK":6,"minScore":0.1}
  }'
```

### إنشاء Prompt Template
```bash
curl -X POST http://localhost:3000/workspaces/prompt-templates \
  -H 'Content-Type: application/json' \
  -d '{
    "workspaceId":"ws_demo_1",
    "organizationId":"org_demo_1",
    "code":"visitor_experience_script",
    "name":"سكريبت تجربة زائر",
    "templateBody":"اكتب سيناريو تجربة زائر لمعرض {{eventName}} في مدينة {{city}} مع 5 محطات.",
    "tags":["visitor","experience"],
    "modelClass":"balanced"
  }'
```

### Render القالب
```bash
curl -X POST http://localhost:3000/workspaces/prompt-templates/render \
  -H 'Content-Type: application/json' \
  -d '{
    "code":"visitor_experience_script",
    "variables":{"eventName":"أثيل","city":"الطائف"}
  }'
```

## Programs

### إنشاء Program
```bash
curl -X POST http://localhost:3000/programs \
  -H 'Content-Type: application/json' \
  -d '{
    "organizationId":"org_demo_1",
    "code":"ATHL-EXP-2026",
    "nameAr":"برنامج تجارب أثيل 2026",
    "status":"active",
    "strategicValueScore":88,
    "portfolioValueSar":3200000
  }'
```

### ملخص المحفظة
```bash
curl http://localhost:3000/programs/portfolio/summary?organizationId=org_demo_1
```

## Workflow Executions Runtime

### إنشاء instance من template
```bash
curl -X POST http://localhost:3000/workflows/instances \
  -H 'Content-Type: application/json' \
  -d '{
    "templateId":"wf_culture_campaign_launch_001",
    "organizationId":"org_demo_1",
    "projectId":"prj_1",
    "autoActivate":true
  }'
```

### Enqueue execution
```bash
curl -X POST http://localhost:3000/workflows/executions/enqueue \
  -H 'Content-Type: application/json' \
  -d '{
    "templateId":"wf_culture_campaign_launch_001",
    "organizationId":"org_demo_1",
    "projectId":"prj_1",
    "priority":"high",
    "strategicValue":90,
    "backlogDepth":12,
    "autoStart":true,
    "hasKnowledge":true,
    "hasApprovalActor":true,
    "autoApprove":false
  }'
```

### Tick execution
```bash
curl -X POST http://localhost:3000/workflows/executions/<EXEC_ID>/tick \
  -H 'Content-Type: application/json' \
  -d '{"hasKnowledge":true,"hasApprovalActor":true}'
```

### إجراء يدوي (approve / provide_input / retry / pause / resume)
```bash
curl -X POST http://localhost:3000/workflows/executions/<EXEC_ID>/action \
  -H 'Content-Type: application/json' \
  -d '{
    "type":"approve",
    "noteAr":"اعتماد مدير البرنامج",
    "payload":{"approvedBy":"director_1"},
    "autoTick":true,
    "hasKnowledge":true,
    "hasApprovalActor":true
  }'
```

### Scheduler snapshot
```bash
curl http://localhost:3000/workflows/executions/scheduler/snapshot?organizationId=org_demo_1
```

## AI Utilities

### Model routing
```bash
curl -X POST http://localhost:3000/ai/routing/model \
  -H 'Content-Type: application/json' \
  -d '{
    "objective":"تحليل مخاطر واعتماد حزمة تنفيذية",
    "complexity":"advanced",
    "requiresCitations":true,
    "latencySensitive":false,
    "tokenBudget":1800
  }'
```

### Embeddings / Rerank / Eval
```bash
curl -X POST http://localhost:3000/ai/embeddings -H 'Content-Type: application/json' -d '{"texts":["نص 1","نص 2"],"dimensions":64}'
curl -X POST http://localhost:3000/ai/rerank -H 'Content-Type: application/json' -d '{"query":"الهوية الثقافية", "candidates":[{"id":"1","text":"هوية ثقافية سعودية"},{"id":"2","text":"رواتب الموارد البشرية"}]}'
curl -X POST http://localhost:3000/ai/eval/output -H 'Content-Type: application/json' -d '{"objective":"إعداد موجز حملة", "output":"الفكرة\nالرسائل\nالقنوات", "requireArabic":true, "requireSections":true}'
```
