# WAVE48 — بوابة تراث عامة (IIIF + Fulltext) + تراخيص ومتطلبات سعودية + موسم -> برامج تشغيل

## 1) بوابة نشر عامة للتراث عبر IIIF
تم إضافة واجهة نشر عامة للأصول المنشورة (status=published, accessLevel=public) مع:
- API عام:
  - GET /public/heritage/search
  - GET /public/heritage/assets/:slug
  - GET /public/heritage/assets/:slug/manifest.json (IIIF Presentation 3)
  - GET /public/heritage/assets/:slug/search?q=... (IIIF Content Search 1.0)
  - GET /public/heritage/assets/:slug/attachments/:attachmentId/download (تحميل عام آمن لمرفقات الأصل المنشور)
- Web عام (بدون تسجيل دخول):
  - /public/heritage
  - /public/heritage/[slug]

تحديثات على سجل التراث:
- دعم fulltextAr (تفريغ/نص) + publicSlug + iiifManifestId + publishedAt
- ربط المرفقات عبر Attachment.entityType='heritage_asset' و entityId

## 2) بحث Fulltext على التراث
- فهرس بحث نصي (GIN على to_tsvector) للأصول المنشورة
- API البحث العام يستخدم ranked search (ts_rank + ts_headline) عند توفر DB، ويعود إلى contains fallback عند تعذر ذلك.

## 3) تكاملات تشغيلية للتراخيص والمتطلبات (السعودية)
تم إضافة نموذج تشغيلي موحد لقوائم المتطلبات:
- DB:
  - ComplianceChecklist
  - ComplianceChecklistItem
- API:
  - POST /compliance/checklists/generate/ksa-event-licensing
  - GET /compliance/checklists
  - GET /compliance/checklists/:id
  - PATCH /compliance/checklists/:checklistId/items/:itemId?status=open|done|blocked|waived
- Web:
  - /compliance

مهم: عند توليد قائمة تراخيص، يتم كذلك إنشاء Approval draft من نوع licensing_checklist لتمكين مسار اعتماد رسمي.

## 4) تحويل مولد الموسم إلى مولد برامج تشغيل كاملة
- API جديد:
  - POST /seasons/generate-programs
ينشئ:
- Program للموسم (Program record) + Projects لكل فعالية
- ApprovalRequest لكل Project (اختياري) مع إمكانية auto-submit
- WorkflowExecution جاهزية تشغيلية لكل فعالية باستخدام قالب:
  - wf_events_operations_readiness_event_created
- Licensing checklist لكل فعالية (اختياري)

## 5) تحسينات بنيوية
- ProgramsService أصبح يدعم Prisma عند توفر قاعدة البيانات (مع fallback إلى DataStore)
- إضافة HeritageModule وSeasonsModule وPublicHeritageModule وComplianceModule إلى AppModule (إقفال نقص كان يمنع ظهور المسارات)

