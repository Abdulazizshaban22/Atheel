# Wave10 — Twin Viewer + Experience Link + Auto Approval + Multi-Scenario

هذه الموجة تضيف حلقة كاملة قبل التنفيذ الميداني:

1) **Twin 3D Viewer داخل الويب**
- عرض طبقات **glTF/GLB** (عارض ثلاثي الأبعاد سريع باستخدام three.js)
- عرض طبقات **3D Tiles** (Tileset viewer عبر CesiumJS)

2) **ربط Twin بالتجارب Experiences**
- عند إنشاء تجربة VisitorExperience يتم إنشاء Twin تلقائياً وربطه بالحقل `twinId`
- Endpoint لإصلاح البيانات القديمة: `POST /api/experiences/:id/twin/ensure`

3) **تحويل نتائج المحاكاة إلى Approval Packet ثم Workflow Execution تلقائياً**
- عند اكتمال المحاكاة، يتم إنشاء طلب موافقة مرتبط بالمشروع/التجربة
- يتم إرسال طلب الموافقة إلى حالة submitted تلقائياً
- يتم إضافة تنفيذ Workflow Governance إلى طابور التنفيذ

4) **محاكاة سيناريوهات متعددة**
- دخول دفعات (Arrival batches)
- إغلاق محطة (Node closed)
- عكس اتجاه المسار (Reverse direction)
- اختبار A/B لسرديتين (مسارات مختلفة)

## Endpoints
- `POST /api/twin/simulations/:runId/run`  (baseline + pipeline)
- `POST /api/twin/simulations/:runId/run-multi`  (multi-scenario + pipeline)

## صفحات الويب
- `/twin`  إدارة الـ Twin ومحاكاة baseline وسيناريوهات
- `/twin/[id]/viewer`  عارض 3D (glTF + 3D Tiles)

## ملاحظة Cesium
Cesium يحتاج أصول ثابتة (Workers/Widgets). الحزمة توفر سكربت postinstall:
- `apps/web/scripts/copy-cesium-assets.mjs`
ينسخ `node_modules/cesium/Build/Cesium` إلى `apps/web/public/cesium`.

ضع:
- `NEXT_PUBLIC_CESIUM_BASE_URL=/cesium`

