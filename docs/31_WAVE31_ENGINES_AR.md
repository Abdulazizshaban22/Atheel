# Wave31 — مراكز المحركات (بدون توسع عشوائي)

هذه الموجة تضيف أربعة محركات مترابطة تغذي قسم الرادار والكراسات والمنافسات مباشرة:

1) Saudi Cultural Opportunity Engine
- يصنف الفرص على القطاعات الثقافية السعودية 16
- يرفع دقة التقاط الفرص عبر كلمات ومرجعيات
- يضيف: sectorCodes + taxonomyCode + تقدير جمهور + توصية نطاق الاستوديو

2) Entertainment and Visitor Experience Engine
- يولد مخطط برنامج فعالية: مناطق + جدول + افتراضات تشغيل
- يولد رحلة زائر + طبقة تفاعل داخل الموقع بدون تسويق خارجي
- يحفظ المخطط داخل Competition.metaJson.analysis.experienceBlueprint

3) Safety and Sustainability Engine
- يوسع مصفوفة الامتثال وفق: ISO 20121 + ممارسات سلامة الحشود
- يحول عناصر الامتثال إلى Obligations بموعد افتراضي قبل تسليم المنافسة

4) Saudi Research Knowledge Engine
- يستفيد من Research module: استيراد روابط أكاديمية + التقاط metadata + تغذية RAG
- يضيف وظيفة تحويل نتائج بحث إلى قوالب تشغيلية عبر engines-kernel (heuristic الآن)

## مرجعيات رسمية ومعيارية
- القطاعات الثقافية 16: بوابة الحكومة + أسئلة وزارة الثقافة + سعوديبيديا
- ISO 20121: صفحة ISO
- Purple Guide + دليل HSE لإدارة الحشود
- إطار مهارات قطاع الثقافة والترفيه: وزارة الموارد البشرية

## مسارات التنفيذ داخل الريبو
- packages/engines-kernel
- apps/api/src/modules/radar (إثراء الإشارة)
- apps/api/src/modules/competitions (توليد مخطط التجربة بعد التحليل)
- apps/api/src/modules/obligations (اعتماد safety-engine)
- apps/web/app/competitions/[id]/page.tsx (عرض المخطط + زر إعادة توليد)

## نقاط تشغيل
- بعد تحليل PDF: يتم تحديث metaJson.analysis بـ opportunity + safetyComplianceMatrix + experienceBlueprint.
- يمكن إعادة التوليد عبر:
  POST /competitions/:id/experience-blueprint/regenerate
- يمكن إعادة إثراء إشارة الرادار عبر:
  POST /radar/signals/:id/enrich
