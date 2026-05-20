# Boundary Rules — Wave 121

## الهدف

منع الانزلاق التدريجي إلى مشروع متشابك يصعب صيانته أو تسليمه.

## القواعد

### 1. التطبيقات لا تستورد من بعضها مباشرة
- apps/web لا يستورد من apps/api أو apps/worker أو apps/exports-svc
- apps/api لا يستورد من apps/web
- apps/worker لا يستورد من apps/web أو apps/api internals
- apps/exports-svc لا يستورد من apps الأخرى داخليًا

### 2. الحزم لا تستورد من التطبيقات
- packages/* ممنوع أن تعتمد على apps/*

### 3. الويب لا يعتمد على طبقات Node-only
- apps/web ممنوع أن يستورد @madar/db
- apps/web ممنوع أن يستورد object-store أو أي package تعتمد على Node runtime فقط

### 4. الدومين لا يعيش داخل page.tsx أو controller.ts
- pages وcontrollers تبقى thin
- business rules تنتقل إلى application services أو kernels أو repositories

### 5. shared ليس سلة مهملات
- packages/shared يحتوي فقط على الثوابت والأنواع والمساعدات الخفيفة المشتركة
- أي domain logic يخرج منه إلى kernel أو module واضح

### 6. كل route جديد يحتاج 4 أشياء قبل اعتماده
- workflow معروف
- entity / data shape معروف
- API contract واضح
- ownership واضح في المنصة

## الحالة الحالية

المستودع يملك أساسًا مناسبًا للمونوربو، لكنه يحتاج المزيد من boundary enforcement الآلي مع تطور الموجات القادمة.

## خطة التشديد لاحقًا

1. تدقيق imports آلي
2. route surface rationalization
3. ESLint boundaries policy
4. package dependency audits
5. ADR لكل boundary استثنائي
