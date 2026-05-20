# دليل الإطلاق التشغيلي — Atheel

## 1) متطلبات إلزامية قبل أي إطلاق Production

### أسرار وبيئة
- DATABASE_URL
- AUTH_JWT_SECRET
- WORKER_TOKEN
- REDIS_URL (أو REDIS_CONNECTION_STRING)

### إعدادات حظر وضع sync
- NODE_ENV=production
- QUEUE_MODE يجب أن يكون redis (ولا يسمح بـ sync في الإنتاج)

## 2) حماية الدخول Brute Force / Credential Stuffing

### Rate limiting
- تم تفعيل rate limiting عالميًا عبر ThrottlerGuard
- تم تشديد /auth/login عبر throttler مخصص باسم auth

### قفل مؤقت للحساب
- متغيرات الضبط:
  - AUTH_MAX_FAILED_ATTEMPTS (افتراضي 5)
  - AUTH_FAIL_WINDOW_SEC (افتراضي 900 ثانية)
  - AUTH_LOCKOUT_SEC (افتراضي 900 ثانية)

### التسجيل التشغيلي
- كل محاولة فاشلة أو قفل يتم تسجيلها كـ OperationalEvent:
  - auth.login.failed
  - auth.login.locked
  - auth.login.blocked

## 3) Observability Mode (Correlation)

### الهدف
ربط أي حدث تشغيل/تنبيه/فشل عبر سلسلة واحدة:
الويب → API → Redis Job → Worker → API

### ما الذي تم تطبيقه
- الويب يرسل X-Correlation-Id تلقائيًا لكل طلب API
- API يولد X-Request-Id ويمرر X-Correlation-Id ويعيدهما في الاستجابة
- API يمرر correlationId إلى بيانات الـ jobs عند جدولة الأعمال
- العامل يرسل X-Correlation-Id في نداءاته (يُسجّل في OperationalEvents ويمكّن تتبع OTEL)

## 4) AI/RAG ما قبل الحكومي

### قواعد دفاع أساسية
- فصل صارم بين التعليمات والمعرفة
- اعتبار المقاطع المسترجعة بيانات غير موثوقة
- رفض أي محاولة لتغيير سياسة النظام عبر المحتوى المسترجع

### تقييم الاسترجاع
- POST /api/ai/rag/evaluate
- يعيد:
  - Precision@K
  - Recall@K
  - MRR

## 5) تشغيل سريع (Smoke)
- تشغيل Redis
- تشغيل API + Worker
- تنفيذ:
  - /api/health
  - /api/auth/csrf ثم /api/auth/login
  - enqueue workflow execution ثم التأكد من تقدمها (tick/complete)
  - تشغيل /api/ops/slo/evaluate للتأكد من عدم وجود أخطاء تكامل
