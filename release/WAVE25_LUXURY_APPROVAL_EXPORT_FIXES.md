# WAVE25_LUXURY_APPROVAL_EXPORT_FIXES

هذا التحديث يرفع مسار الاعتماد ثم حزمة التصدير إلى مستوى مؤسسي: عزل جهات، حوكمة قرار، سلامة ملفات، وتدقيق كامل.

## أهم ما تم إقفاله
1) عزل الجهات Organization Isolation
- تم منع تحميل أي مرفق خارج نطاق الجهة إلا لـ super_admin.
- تم إضافة تحقق صلاحيات على approval-packets (list/get/generate) حسب عضوية الجهة.

2) سلامة التحميل Secure Download
- تم تشديد resolveFile لمنع أي مسار خارج مجلد الرفع.
- تم تسجيل تدقيق عند تنزيل مرفقات التصدير.

3) آلة حالات للموافقات Approval State Machine
- منع الانتقالات غير الصحيحة بين الحالات.
- قرار الاعتماد/الرفض/طلب التعديلات لا يتم إلا من المعتمد الحالي أو org_admin/super_admin.
- submit يتطلب currentApproverId.

4) ترف النزاهة داخل ZIP
- إضافة manifest.json يحوي SHA-256 لكل ملف داخل الحزمة.
- إضافة provenance.json لإثبات مبسط للمصدر والقرار.

5) Seed تشغيلي للعرض التجريبي
- إضافة sim_demo_1 كتشغيل محاكاة جاهز لتمكين توليد حزمة اعتماد مباشرة.

6) واجهة ويب مساعدة
- إضافة زر إنشاء طلب اعتماد مرتبط بالحزمة داخل صفحة approval-packets/[id].
- تحديث صفحة approvals لتتوافق مع submit/approve/reject/request-changes.

7) اختبارات
- إضافة اختبار e2e لمسار: generate -> approval -> approve -> export -> download.

## تشغيل سريع
- pnpm install
- pnpm api:dev
- افتح web ثم سجل دخول:
  - editor@atheel.sa / Editor@1234
  - admin@atheel.sa / Admin@1234

## تدفقات جاهزة
- توليد حزمة اعتماد من sim_demo_1
- إنشاء طلب اعتماد وربطه بالحزمة
- اعتماد ثم تصدير ثم تنزيل ZIP مع manifest/provenance
