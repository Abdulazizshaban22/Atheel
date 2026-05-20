# Wave56 — عزل الجهات Defense in Depth عبر Row Level Security في PostgreSQL

أَثِيل يطبق عزل جهات Multi-tenant على مستوى التطبيق عبر TenantGuard وحقن organizationId تلقائيًا.
لكن أفضل ممارسة أمنية عند SaaS متعدد الجهات هي إضافة طبقة حماية داخل قاعدة البيانات نفسها بحيث تمنع أي تسرب عابر حتى لو حصل خطأ برمجي.

PostgreSQL يوفر Row Level Security RLS لهذا الغرض، ويتم تفعيل السياسات عبر ENABLE ROW LEVEL SECURITY ثم CREATE POLICY. 

## 1) متى أستخدم RLS
- عندما تكون المنصة SaaS متعددة الجهات وتخدم جهات حساسة
- عندما ترغب دفاعًا في العمق: التطبيق + قاعدة البيانات
- عندما تتوقع تعدد فرق التطوير وكثرة الـ Endpoints

## 2) الفكرة
- كل جدول حساس يحتوي organizationId
- كل اتصال قاعدة بيانات يحدد الجهة النشطة current_tenant (على مستوى الـ session)
- السياسات تسمح فقط برؤية الصفوف التي organizationId تساوي tenant الحالي

## 3) مثال SQL مبسط

هذه أمثلة توضيحية، قبل تطبيقها على الإنتاج يجب اختبارها على Stage:

- تفعيل RLS على جدول
- إضافة سياسة SELECT/UPDATE/DELETE

مثال (تمثيلي):
- ALTER TABLE ... ENABLE ROW LEVEL SECURITY
- CREATE POLICY ... USING (...)

مبدأ هذه الأوامر موثق رسميًا في PostgreSQL. 

## 4) الدمج مع Prisma
هناك أكثر من طريقة:
- استخدام Prisma Client Extensions لتعيين tenant في كل طلب (جلسة) ثم الاعتماد على سياسات PostgreSQL
- أو استخدام Role خاص للتطبيق مع SET LOCAL لمتغير tenant داخل transaction

Prisma يعرض أمثلة تخص client extensions بما فيها سيناريوهات row-level-security. 

## 5) تنبيه تشغيلي مهم
RLS يرفع مستوى الأمان لكنه يضيف متطلبات تشغيل:
- ضبط connection pool بحيث لا يتسرب tenant بين الطلبات
- تعيين tenant داخل transaction أو قبل كل query بشكل مضمون

القاعدة العملية: لا تفعّل RLS على الإنتاج إلا بعد وجود اختبارات تلقائية تمنع cross-tenant data access.


## مراجع أساسية
- PostgreSQL Row Security Policies
- PostgreSQL CREATE POLICY
- Prisma Client Extensions examples
