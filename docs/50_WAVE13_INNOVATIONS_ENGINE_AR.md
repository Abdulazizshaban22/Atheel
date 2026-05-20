# Wave13 — Innovation Engine Suite (الأفكار 1–14)

هذا الإصدار يكمّل حلقة الإبداع الثقافي داخل أثيل ويحوّلها إلى منظومة تشغيل مترابطة.

## لماذا هذا البناء
- لوحات الإلهام (Boards) تماثل فكرة تنظيم الإلهام إلى لوحات قابلة للفرز والتعاون كما في Pinterest. 
- التصويت وتصفية الأفكار تماثل آلية Voting في Miro لتحديد عدد أصوات لكل مشارك.
- السرديات مرتبطة بالموقع والتجربة (Twin Graph) لتخفيض السرد العام وربطه بالمكان.
- التوأم الرقمي للمحاكاة مبني كمنهج للتنبؤ والمراقبة واتخاذ القرار.

## الوحدات الجديدة
- API
  - /inspiration/boards + items + citation
  - /documentation/rules + validate
  - /vault/ideas/similar
  - /narratives + generate + generate/ab
  - /impact/score + leaderboard
  - /risks/templates + register + assess/twin
  - /visitor-guide/generate
  - /program-templates (generate + instantiate)
  - /heritage-memory (sources + ingest-text + query)

- Web
  - /narratives
  - /impact
  - /risks
  - /visitor-guide
  - /program-templates
  - /heritage-memory
  - /documentation

## ملاحظات تشغيل
- كل المخرجات ما زالت تعمل على DataStore in-memory في هذه النسخة (Demo). ويمكن ترحيلها لPrisma بسهولة لأن نماذج Prisma تمت إضافتها في schema.
- التوثيق: يتم تسجيل DocumentationCheck لكل أصل إلهام للتحقق قبل بناء سردية أو عرض.
- الذاكرة: ingest-text يحول أي نص داخلي (أرشيف الاستديو) إلى KnowledgeChunks قابلة للاسترجاع.

