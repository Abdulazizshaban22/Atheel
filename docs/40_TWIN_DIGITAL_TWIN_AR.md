# Wave09 — التوأم الرقمي (Twin)

## لماذا التوأم الرقمي داخل أثيل
التوأم الرقمي هنا ليس مجرد نموذج 3D.
هو نموذج تشغيل رقمي للتجربة الثقافية يربط:
- المكان/المسار على شكل Graph (محطات Nodes + روابط Edges)
- طبقات الأصول (GeoJSON / glTF / 3D Tiles / روابط)
- محاكاة تدفق الزوار قبل التنفيذ (Simulation)
- تيليمترى بعد التنفيذ (Telemetry)
- توصيات تحسين بالذكاء الاصطناعي (Twin Agent)

ملاحظة معيارية سريعة
- NIST يعرّف التوأم الرقمي كنوع من نماذج الحاسوب لنظام فيزيائي (مثل مبنى) يعتمد على النمذجة والتنبؤ ووظائف مثل المحاكاة والمراقبة والتحسين. 
- مفهوم Graph في Azure Digital Twins يوضح فكرة العلاقات بين الكيانات لتكوين Twin Graph. 

## دعم الأصول ثلاثية الأبعاد
- glTF معيار لنقل أصول 3D بكفاءة (Khronos). 
- 3D Tiles معيار OGC لبث بيانات 3D الجغرافية الضخمة (مباني/نقاط/Photogrammetry). 

## API
### Twins
- GET /api/twin
- POST /api/twin
- GET /api/twin/:id
- PATCH /api/twin/:id

### Graph
- POST /api/twin/:id/nodes
- POST /api/twin/:id/edges
- GET /api/twin/:id/graph

### Layers
- POST /api/twin/:id/layers
- GET /api/twin/:id/layers

### Simulation
- POST /api/twin/:id/simulations
- POST /api/twin/simulations/:runId/run
- POST /api/twin/simulations/:runId/enqueue
- GET /api/twin/simulations/:runId
- GET /api/twin/simulations/list

### Telemetry
- POST /api/twin/:id/telemetry
- GET /api/twin/:id/telemetry

### Twin Agent
- POST /api/twin/:id/agents/optimize

## Web
- /twin
- /dashboards/twin

## Worker + Redis
- Queue: atheel-twin-simulations (ENV: TWIN_SIM_QUEUE)
- Worker job: simulate => calls /api/twin/simulations/:runId/run

