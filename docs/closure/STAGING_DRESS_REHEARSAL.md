# Staging Dress Rehearsal

## الهدف
محاكاة go-live كامل قبل أي تسليم أو تفاوض أو ترخيص.

## البيئة المطلوبة
- Postgres مطابق بنيويًا للإنتاج
- Redis شغال
- Object storage أو local object store وفق الخطة
- API + Web + Worker + exports-svc
- STRICT_PERSISTENCE=true
- ALLOW_IN_MEMORY_FALLBACK=false

## خطوات اليوم التجريبي
1. تطبيق migrations عبر `prisma migrate deploy`
2. تشغيل baseline seed فقط
3. تسجيل دخول مستخدم حقيقي من Prisma
4. إنشاء مشروع جديد
5. إنشاء عنصر محتوى وربطه بالمشروع
6. رفع مرفق وربطه بالكيان
7. إرسال طلب اعتماد وتحويل حالته
8. فحص health/ready وhealth/queues وmetrics
9. تجربة export أو مسار worker واحد على الأقل
10. توثيق أي خطأ أو انقطاع أو اعتماد مخفي

## شروط النجاح
- لا يظهر أي fallback_in_memory في core flows
- لا توجد بيانات demo غير مقصودة
- جميع المسارات الأساسية ترجع IDs من Prisma
- health/ready يرجع 200 في وضع جاهز أو 503 واضح عند فشل dependency
- trace/correlation IDs تظهر في الاستجابات والسجلات

## مخرجات الجلسة
- قائمة نجاح/فشل لكل رحلة
- blockers مصنفة إلى critical / high / medium
- قرار واضح: hold أو conditional go أو go
