# خارطة تنفيذ الواجهة Next.js — أَثِيل v0.4

## الهدف
الانتقال من صفحات تشغيلية تقنية (MVP) إلى تجربة إدارة احترافية للجهات الحكومية والخاصة.

## المحور 1 — الهيكل العام للواجهة
- App Shell ثابت: شريط علوي + قائمة جانبية + Breadcrumb + selector للجهة/المشروع
- Layout لكل وحدة: Projects / Content / Experiences / Approvals / Attachments / Users / Analytics
- Route Groups وProtected Routes داخل App Router

## المحور 2 — المصادقة والجلسات
- Session Provider (client store)
- Auto refresh token rotation قبل انتهاء Access Token
- Redirect logic حسب الصلاحيات
- شاشة Unauthorized / Forbidden واضحة

## المحور 3 — صفحات CRUD احترافية
### Projects
- Table + search + filters + bulk actions
- Create/Edit drawer
- Project detail tabs (overview / content / experiences / approvals / attachments / audit)

### Content
- Rich metadata forms
- Version history
- Submit for approval action
- AI assist inline panel

### Experiences
- Route builder (مرحلة لاحقة)
- Stops list + durations + publish workflow
- Score simulation UI

### Users & Roles
- Table + invite user + role assignment matrix
- Organization membership editor
- Activation/deactivation + reset password flow (v0.5)

### Approvals
- Inbox / My requests / SLA
- Timeline لكل طلب موافقة
- Decision modal (approve/reject/request changes)
- Escalation badges (v0.4+) 

### Attachments
- Drag & drop uploader
- Progress bar
- File preview cards
- Link/unlink attachment dialogs

## المحور 4 — UI Components المقترحة
- DataTable (sorting/filtering/pagination)
- Form primitives + schema validation
- Dialogs / Drawer / Toast / Empty states
- Timeline component للموافقات والتدقيق
- File uploader component

## المحور 5 — جودة وتجربة
- RTL متقن + دعم عربي/إنجليزي
- Loading skeletons
- Error boundaries
- Accessibility labels + keyboard navigation

## المحور 6 — تكامل API
- api client موحد + typed contracts
- retry for idempotent GETs
- interceptors لتحديث access token باستخدام refresh

## مخرجات v0.4 المقترحة
1. Admin shell كامل
2. Users/Roles UI احترافي
3. Approvals UI مع timeline
4. Attachments drag-drop + preview
5. Projects/Content CRUD مستقل كامل بدل الاعتماد على Workbench
