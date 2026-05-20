import { Injectable } from '@nestjs/common';
import { AiService } from '../ai/ai.service';

type KnowledgePack = {
  id: string;
  titleAr: string;
  tags: string[];
  sourceRefs: string[];
  text: string;
};

const PACKS: KnowledgePack[] = [
  {
    id: 'ksa_culture_sectors',
    titleAr: 'القطاعات الثقافية في السعودية',
    tags: ['ksa', 'culture', 'taxonomy'],
    sourceRefs: [
      'https://www.moc.gov.sa/-/media/Files/MOC_Cultural_Vision_EN_NEW.pdf',
      'https://saudipedia.com/en/ministry-of-culture',
      'https://my.gov.sa/en/content/culture',
    ],
    text: 'مرجعية عملية لتصنيف المشاريع الثقافية داخل أثيل. تستخدم هذه الحزمة القطاعات الثقافية السعودية كقاموس تشغيل للرادار وتحليل الكراسات وربط الأبحاث.\n\nالقطاعات الأساسية: التراث، المتاحف، المسرح والفنون الأدائية، المهرجانات والفعاليات، الكتب والنشر، العمارة والتصميم، الأفلام، الأزياء، اللغة والترجمة، فنون الطهي، الأدب، المكتبات، الفنون البصرية، الموسيقى.',
  },
  {
    id: 'event_sustainability_safety',
    titleAr: 'الاستدامة والسلامة للفعاليات',
    tags: ['events', 'safety', 'iso20121', 'compliance'],
    sourceRefs: [
      'https://www.iso.org/standard/54552.html',
      'https://www.iso.org/news/2013/01/Ref1690.html',
      'https://www.thepurpleguide.co.uk/',
    ],
    text: 'تضيف هذه الحزمة طبقة امتثال عملية عند تحليل كراسة فعالية. تغطي الاستدامة، إدارة الحشود، المخارج، الطوارئ، وسلاسل التوريد.\n\nداخل أثيل: تُحوَّل الإشارات المرتبطة بالسلامة أو الإخلاء أو الحشود أو الاستدامة إلى مصفوفة امتثال قابلة للتكليف والمتابعة.',
  },
  {
    id: 'ksa_entertainment_context',
    titleAr: 'سياق الترفيه والفعاليات الكبرى في السعودية',
    tags: ['ksa', 'entertainment', 'benchmark'],
    sourceRefs: [
      'https://spa.gov.sa/en/N2478714',
      'https://saudigazette.com.sa/article/658294',
      'https://gea.gov.sa/en/media-center/news/one-million-visitors-rs25/',
    ],
    text: 'توفر هذه الحزمة لغة تشغيلية تساعد في تقييم الفرص الثقافية والفعاليات الكبرى، مع مؤشرات على كثافة الحشود، تعدد المواقع، وطبيعة التشغيل.\n\nداخل أثيل: تُستخدم هذه المؤشرات لرفع حساسية المخاطر والأولوية الرسمية وتعميق تحليل تجربة الزائر.',
  },
  {
    id: 'hrsd_culture_entertainment_skills',
    titleAr: 'إطار مهارات قطاع الثقافة والترفيه',
    tags: ['ksa', 'hrsd', 'skills', 'workforce'],
    sourceRefs: [
      'https://www.hrsd.gov.sa/sites/default/files/2025-02/Culture%20and%20Entertainment%20Sector%20Skills%20Intro%20Report_EN.pdf',
      'https://www.hrsd.gov.sa/sites/default/files/2025-02/Culture%20and%20Entertainment%20Sector%20Skills%20Dictionary_EN.pdf',
    ],
    text: 'مرجعية تشغيلية لتوزيع الأدوار داخل الاستوديو والفرق المساندة عند تحليل كراسة فعالية أو مشروع ثقافي.\n\nالاستخدام داخل أثيل: ربط البنود بمسارات وظيفية واضحة، اقتراح مسؤول نهائي مناسب، وتقدير الجهد والاعتمادات.',
  },
  {
    id: 'competitor_landscape',
    titleAr: 'مشهد المنافسين العالمي',
    tags: ['market', 'competitors', 'rfp', 'bid-management'],
    sourceRefs: [
      'https://www.deltek.com/en/government-contracting/govwin',
      'https://www.bidprime.com/',
      'https://www.responsive.io/product/requirements-analysis',
      'https://loopio.com/rfp-automation-software/',
      'https://uplandsoftware.com/qvidian/',
      'https://support.ironcladapp.com/hc/en-us/articles/31128326700183-Obligations-Overview',
      'https://standard.open-contracting.org/',
    ],
    text: 'ملخص عملي لما نتعلمه من المنافسين: الالتقاط المبكر للفرص، تحليل المتطلبات، إعادة استخدام المعرفة، وتحويل البنود الحرجة إلى التزامات قابلة للمتابعة.\n\nميزة أثيل الفارقة: رادار + تحليل كراسة عربي مع مرجعية صفحة + توزيع مسؤول نهائي + مصفوفة امتثال.',
  },
  {
    id: 'saudi_theses_index',
    titleAr: 'فهرس رسائل وأبحاث مرتبطة بالثقافة السعودية',
    tags: ['research', 'sdl', 'thesis', 'ksa'],
    sourceRefs: [
      'https://drepo.sdl.edu.sa/communities/5f071cac-8e45-4e6c-ae98-48caac89b2e5?f.subject=Riyadh+Season%2Cequals&spc.page=1',
      'https://drepo.sdl.edu.sa/items/835bc3f6-bb2b-4755-8e9a-10d5f8d18d31/full',
      'https://drepo.sdl.edu.sa/items/c9e2ed67-6f81-48fa-8254-79fc686101b8',
    ],
    text: 'نقطة بداية لتغذية أثيل بأبحاث أكاديمية يمكن تحويلها إلى قواعد تصميم وتجربة زائر ومؤشرات تشغيلية.\n\nتساعد هذه الحزمة في بناء قاعدة معرفة أقرب إلى السياق السعودي بدل الاكتفاء بمراجع عامة.',
  },
];

@Injectable()
export class KnowledgePacksService {
  constructor(private readonly ai: AiService) {}

  list() {
    return {
      count: PACKS.length,
      items: PACKS.map((p) => ({ id: p.id, titleAr: p.titleAr, tags: p.tags, sourceRefs: p.sourceRefs })),
    };
  }

  preview(id: string) {
    const pack = PACKS.find((item) => item.id === id);
    if (!pack) return { ok: false, error: 'not_found' };
    return { ok: true, item: pack };
  }

  async seed(body: any) {
    const organizationId = body.organizationId;
    const projectId = body.projectId;
    const selected = Array.isArray(body.packIds) && body.packIds.length
      ? PACKS.filter((pack) => body.packIds.includes(pack.id))
      : PACKS;

    const results: any[] = [];
    for (const pack of selected) {
      const sourceRef = pack.sourceRefs.slice(0, 3).join(' | ');
      const res = await this.ai.ingestKnowledge(
        {
          organizationId,
          projectId,
          title: pack.titleAr,
          text: `${pack.text}\n\nالمراجع: ${sourceRef}`,
          sourceType: 'manual',
          sourceRef: sourceRef || pack.id,
          languageCode: 'ar',
          tags: pack.tags,
          chunkSizeChars: 1200,
          overlapChars: 160,
        } as any,
        undefined,
      );
      results.push({ id: pack.id, titleAr: pack.titleAr, ok: true, chunks: (res as any)?.chunks?.count ?? null });
    }

    return { ok: true, seeded: results.length, results };
  }
}
