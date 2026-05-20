# Package 02 — Knowledge Spine Core

هذه الحزمة تؤسس نواة المعرفة متعددة المجالات داخل أثيل.

## ما تمت إضافته
- موديول API جديد باسم Knowledge Spine
- Taxonomies أولية لستة مجالات:
  - heritage
  - destination
  - mega_events
  - exhibition
  - culture_programs
  - urban_experience
- Domain corpora registry أولي
- Routing أولي للبحث المعرفي حسب المجال والوسوم واللغة
- صفحة واجهة `/knowledge-spine`
- حزمة برمجية أولية `packages/knowledge-kernel`

## Endpoints الجديدة
- `GET /knowledge-spine/summary`
- `GET /knowledge-spine/taxonomies`
- `GET /knowledge-spine/corpora`
- `POST /knowledge-spine/corpora`
- `POST /knowledge-spine/search`

## ملاحظات مهمة
هذه الحزمة ليست بعد vector search production-grade.
هي طبقة تأسيسية تمهد للخطوة التالية:
- vector store manager
- metadata filters
- reranking
- domain-specific retrieval
- ingestion pipelines
