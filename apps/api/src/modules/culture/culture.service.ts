import { Injectable, NotFoundException } from '@nestjs/common';
import { filterIdeaCards, generateSaudiCultureIdeaCards } from '@madar/culture-sa-kernel';
import { CULTURE_AUDIENCES, CULTURE_FORMATS, CULTURE_THEMES, SAUDI_REGIONS } from '@madar/culture-sa-kernel';
import { PrismaService } from '@madar/db';

@Injectable()
export class CultureService {
  private readonly cards = generateSaudiCultureIdeaCards();

  constructor(private readonly prisma: PrismaService) {}

  taxonomy() {
    return {
      regions: SAUDI_REGIONS,
      themes: CULTURE_THEMES,
      formats: CULTURE_FORMATS,
      audiences: CULTURE_AUDIENCES,
      counts: {
        ideasGenerated: this.cards.length,
      },
      noteAr: 'هذه مكتبة مولدة برمجيًا لأفكار ثقافية سعودية قابلة للتوسع. استخدم /culture/knowledge/install لتغذية RAG بمصادر أساسية.',
    };
  }

  listIdeas(params?: { q?: string; region?: string; theme?: string; format?: string; audience?: string; limit?: number }) {
    const items = filterIdeaCards(this.cards, {
      q: params?.q,
      region: params?.region as any,
      theme: params?.theme as any,
      format: params?.format as any,
      audience: params?.audience as any,
      limit: params?.limit,
    });
    return {
      totalGenerated: this.cards.length,
      returned: items.length,
      items,
    };
  }

  getIdea(id: string) {
    const item = this.cards.find((c) => c.id === id);
    if (!item) throw new NotFoundException('Idea not found');
    return item;
  }

  installSaudiCultureKnowledge(body: { organizationId?: string; projectId?: string; overwrite?: boolean }) {
    // Seed a concise knowledge pack (safe for demos). Real deployment should ingest from verified sources.
    const now = new Date().toISOString();
    const org = body.organizationId;
    const projectId = body.projectId;

    const docs = [
      {
        id: 'kdoc_sa_ich_core',
        title: 'ملخص التراث الثقافي غير المادي في السعودية (UNESCO) — نقاط تشغيلية',
        sourceType: 'template',
        sourceRef: 'UNESCO ICH + هيئة التراث + وزارة الثقافة',
        languageCode: 'ar',
        tags: ['saudi', 'ich', 'unesco', 'heritage'],
        text: [
          'يتضمن التراث الثقافي غير المادي عناصر مثل: العرضة النجدية، المجلس، القهوة العربية، السدو، القط العسيري، المزمار، الصقارة، الخط العربي وغيرها.',
          'تشغيليًا: كل عنصر يحتاج توصيف (القصة)، ممارسة (الطقوس/الأداء)، الحرفيين/الروّاة، المواد، آلية نقل المعرفة، ومعايير احترام المجتمع المحلي.',
          'توظيفه في المنصة: تحويل كل عنصر إلى قوالب برامج وتجارب وزيارات ولوحات تعريفية ومسارات موافقات وإسناد مهام للحرفيين/الفرق.',
        ].join('\n'),
      },
      {
        id: 'kdoc_sa_wh_core',
        title: 'ملخص مواقع التراث العالمي في السعودية (UNESCO WHC) — استخدامات في تجربة الزائر',
        sourceType: 'template',
        sourceRef: 'UNESCO WHC',
        languageCode: 'ar',
        tags: ['saudi', 'world_heritage', 'unesco'],
        text: [
          'أمثلة لمواقع التراث العالمي: الحِجر (مدائن صالح) في العلا، حي الطريف بالدرعية، جدة التاريخية، واحة الأحساء، منطقة حِمى الثقافية، فنون الصخور في حائل وغيرها.',
          'تشغيليًا: ربط الموقع بخريطة مسار زائر، نقاط سرد قصصي، قواعد حماية، طاقة استيعابية، لافتات، وإرشاد متعدد اللغات.',
        ].join('\n'),
      },
      {
        id: 'kdoc_sa_cultural_years',
        title: 'الأعوام الثقافية والمبادرات الوطنية (وزارة الثقافة)',
        sourceType: 'template',
        sourceRef: 'Ministry of Culture Cultural Years',
        languageCode: 'ar',
        tags: ['saudi', 'moc', 'initiatives', 'coffee'],
        text: [
          'وزارة الثقافة تعلن أعوامًا ثقافية تركز على عنصر محدد؛ مثال: عام القهوة السعودية 2022.',
          'تشغيليًا: تحويل العام الثقافي إلى برنامج (High Program) يشمل فعاليات ومحتوى وتجارب وشراكات ومؤشرات قياس.',
        ].join('\n'),
      },
    ];

    if (body.overwrite) {
      // remove existing by ids
      for (const d of docs) {
        await this.prisma.knowledgeChunk.deleteMany({ where: { documentId: d.id } }); await this.prisma.knowledgeDocument.delete({ where: { id: d.id } });
      }
    }

    for (const d of docs) {
      await this.prisma.knowledgeChunk.deleteMany({ where: { documentId: d.id } }); await this.prisma.knowledgeDocument.delete({ where: { id: d.id } });
        {
          id: d.id,
          organizationId: org,
          projectId,
          title: d.title,
          sourceType: d.sourceType as any,
          sourceRef: d.sourceRef,
          languageCode: 'ar',
          tags: d.tags,
          text: d.text,
          chunkCount: 1,
          createdAt: now,
          updatedAt: now,
          metadata: { seeded: true },
        } as any,
        [
          {
            id: `${d.id}_c1`,
            documentId: d.id,
            organizationId: org,
            projectId,
            title: d.title,
            sourceType: d.sourceType as any,
            languageCode: 'ar',
            text: d.text,
            tags: d.tags,
            chunkIndex: 0,
            tokenEstimate: d.text.length / 4,
            metadata: { sourceRef: d.sourceRef },
            createdAt: now,
          } as any,
        ],
      );
    }

    return {
      ok: true,
      installed: docs.map((d) => ({ id: d.id, title: d.title })),
      noteAr: 'تمت تغذية قاعدة المعرفة بحزمة سعودية أولية. يمكنك الآن استخدام /api/ai/rag/query مع preferKnowledge=true.',
    };
  }
}
