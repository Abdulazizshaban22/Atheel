# Wave32

## الهدف
1) تحويل مخطط تجربة الزائر من Json إلى جداول تشغيلية فعلية داخل قاعدة البيانات:
- Zones
- Schedule
- Journey
- QueueMetrics

2) إضافة مولد توصية مسؤول خانة تلقائي يعتمد على:
- مهارات الموظف (OrgUserProfile.skills)
- سجل إنجاز داخلي (Completed obligations + owner assignments)
- العبء الحالي (Open obligations)

## أين تم التنفيذ
- Prisma schema:
  - packages/db/prisma/schema.prisma
  - migration: packages/db/prisma/migrations/20260227_atheel_wave32_experience_tables_and_owner_recommender

- Engines:
  - packages/engines-kernel/src/experience.ts (materializeExperienceBlueprint)
  - packages/engines-kernel/src/staffing.ts (recommendOwners)

- API:
  - apps/api/src/modules/competitions/competitions.service.ts
  - apps/api/src/modules/competitions/competitions.controller.ts

- Web:
  - apps/web/app/competitions/[id]/page.tsx

## واجهات جديدة
- GET /competitions/:id/experience-plan
- POST /competitions/:id/category-assignments/recommend-owners  (body: { apply: boolean })

## ملاحظة تشغيل
- عند اكتمال تحليل الكراسة أو إعادة توليد الخطة يتم تحديث الجداول تلقائيًا.
