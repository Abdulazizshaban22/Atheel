# Wave 88 — تشغيل حقيقي وتثبيت هندسي

## الهدف
رفع الحزمة الحالية من حالة patch-heavy إلى مسار أقرب للاعتماد عبر:
- clean type fixes تدريجيًا
- build/typecheck verification script
- ربط واجهات إضافية بمسارات الذكاء والحوكمة والتوأم والرصد
- إضافة queue stats إلى dashboards
- إضافة قواعد تنبيه Grafana أولية

## ما الذي تم في هذه الموجة
- إضافة `wave88:verify`
- صفحات واجهة جديدة: بطاقات الذكاء، Board Mode، الرصد التشغيلي، مركز قرار التوأم
- queue stats على مستوى dashboard
- observability summary داخل governance
- قواعد تنبيه Grafana أولية

## ما الذي ما يزال يحتاج تنفيذًا فعليًا على البيئة
- تشغيل `pnpm install`
- تشغيل `pnpm wave88:verify`
- تشغيل قاعدة اختبارية وتطبيق `prisma migrate deploy`
- مراجعة أي أخطاء build/typecheck ناتجة عن الاعتماديات الفعلية أو البيئة
