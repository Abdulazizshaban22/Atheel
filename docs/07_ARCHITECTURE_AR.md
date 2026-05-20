# المعمارية المقترحة

## النمط
Modular Monolith في البداية مع حدود واضحة للوحدات:
- Projects
- Content
- Experiences
- AI
- Analytics
- Heritage (قابل للتفعيل لاحقًا)

## الطبقات
- Web: Next.js
- API: NestJS
- DB: PostgreSQL + Prisma
- Cache/Queue: Redis
- Search (مرحلة لاحقة): OpenSearch
- Workflows (مرحلة لاحقة): Temporal

## مبدأ مهم
نبني الأساس كمنصة SaaS قابلة للتوسع مع إمكانية فصل الخدمات لاحقًا دون إعادة بناء كاملة.
