# Technical Decisions — Wave 121

## Assumptions

1. الهدف الآن هو بناء نسخة مؤسسية قابلة للتشغيل والتسليم، وليس demo سريع
2. النطاق الأساسي المعتمد هو OS + Heritage + Visitor + Intelligence + Governance
3. Twin وXR وIoT تبقى طبقات متقدمة، وليست قلب النسخة الأولى
4. قاعدة البيانات الوحيدة للحقيقة في المسارات الحرجة هي PostgreSQL عبر Prisma
5. أي in-memory fallback يبقى محصورًا في dev/test فقط

## لماذا Next.js وليس React SPA

تم اعتماد Next.js App Router لأن المشروع الحالي والمنشود يحتاج:
- routing واسع ومنظم
- nested layouts
- dashboard application structure
- server/client component boundaries
- public and private surfaces داخل تطبيق واحد
- route-based organization قابلة للتوسع

لذلك سنبقي على Next.js بدل React SPA مستقلة.

## لماذا NestJS

NestJS مناسب لأن المنصة تحتاج backend modular واضح، مع:
- modules
- controllers
- services
- guards
- DTOs
- validation
- interceptors
- exception filters
- config discipline
- testability

## لماذا Prisma + PostgreSQL

- PostgreSQL هو source of truth الوحيد
- Prisma مناسب للحفاظ على schema واضح، migrations منضبطة، وطبقة وصول موحدة
- سيتم منع أي persistence موازي في المسارات الحرجة

## لماذا Tailwind CSS

- موجود حاليًا ضمن التوجه العام للمشروع
- مناسب لبناء design system داخلي منضبط
- يقلل friction في تكوين واجهات إدارية كبيرة

## Recommended Libraries

### Frontend
1. TanStack Query
   - للـ server state فقط
   - لأن المنصة غنية بالقراءة/التحديث/invalidations ولا نريد خلط server state مع local UI state

2. React Hook Form
   - لبناء forms كبيرة ومعقدة مع أداء جيد

3. Zod
   - لتوحيد schema-based validation على الواجهة
   - مناسب أيضًا لتحويل العقود إلى typing واضح

4. shadcn/ui
   - ليس كـ component library مغلقة، بل كنقطة انطلاق لبناء design system مفتوح الكود داخل المشروع

5. Zustand
   - فقط لحالات UI المحلية المحدودة مثل sidebar, filters draft, wizard state
   - وليس كحل شامل لحالة التطبيق

### Backend
1. class-validator / ValidationPipe في NestJS
2. BullMQ للأعمال الخلفية
3. OpenTelemetry للتتبّع والقياسات
4. MinIO / S3-compatible object storage readiness للمرفقات والتصدير

## كيف سنضمن Scalability

- فصل domains إلى modules واضحة
- الحفاظ على package kernels كـ pure logic قدر الإمكان
- منع imports العشوائية بين التطبيقات
- اعتماد route groups وfeature slices في الويب
- إبقاء background execution خارج request lifecycle
- جعل observability وaudit جزءًا من التصميم لا لاحقًا

## كيف سنضمن Maintainability

- لا giant files
- application services صغيرة ومركبة
- repositories واضحة
- DTOs وview models صريحة
- naming conventions موحدة
- docs + ADRs + runbooks لكل قرار جوهري

## كيف سنضمن Developer Handoff

- Architecture docs داخل المستودع
- Delivery waves موثقة
- Boundary rules قابلة للتدقيق آليًا
- Definition of Done واضح لكل موجة
- لا ادعاء اكتمال بدون evidence

## كيف سنمنع Spaghetti Code

- ممنوع import عبر الحدود بلا سياسة
- ممنوع وضع domain logic في controllers أو pages
- ممنوع coupling مباشر بين web وapi internals
- ممنوع إضافة route جديد قبل entity + workflow + API contract
- أي إضافة جديدة تمر عبر backlog + architecture fit check
