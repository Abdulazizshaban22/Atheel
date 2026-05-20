import { Injectable } from '@nestjs/common';
import { PrismaService } from '@madar/db';
import { RadarService } from '../radar/radar.service';
import { CultureGraphService } from '../culture-graph/culture-graph.service';

// Seed lists are curated and intentionally extendable.
// الهدف: تحويل المصادر الرسمية إلى OfficialSourceItem ثم توليد Signals + Entities + Provenance.

const CULTURAL_YEARS: Array<{ externalId: string; year: number; titleAr: string; titleEn?: string; url?: string; theme?: string }> = [
  { externalId: 'moc-year-arabic-calligraphy-2021', year: 2021, titleAr: 'عام الخط العربي', titleEn: 'Year of Arabic Calligraphy', theme: 'theme:Poetry_Story' },
  { externalId: 'moc-year-saudi-coffee-2022', year: 2022, titleAr: 'عام القهوة السعودية', titleEn: 'Year of Saudi Coffee', theme: 'theme:Coffee' },
  { externalId: 'moc-year-arabic-poetry-2023', year: 2023, titleAr: 'عام الشعر العربي', titleEn: 'Year of Arabic Poetry', theme: 'theme:Poetry_Story' },
  { externalId: 'moc-year-camel-2024', year: 2024, titleAr: 'عام الإبل', titleEn: 'Year of the Camel', theme: 'theme:Oasis_Desert' },
  { externalId: 'moc-year-handicrafts-2025', year: 2025, titleAr: 'عام الحرف اليدوية', titleEn: 'Year of Handicrafts', theme: 'theme:Crafts' },
];

// UNESCO Intangible Cultural Heritage (Saudi Arabia + shared elements).
// This list is meant as an initial seed; it can be expanded/updated through the UI or direct DB edits.
const UNESCO_ICH_SA: Array<{ externalId: string; titleAr: string; titleEn?: string; year?: number; url?: string; theme?: string }> = [
  // Widely-known elements
  { externalId: 'unesco-ich-majlis', titleAr: 'المجلس: مساحة اجتماعية وثقافية', titleEn: 'Majlis', year: 2015, theme: 'theme:UNESCO_Intangible' },
  { externalId: 'unesco-ich-arabic-coffee', titleAr: 'القهوة العربية: رمز للكرم', titleEn: 'Arabic Coffee', year: 2015, theme: 'theme:Coffee' },
  { externalId: 'unesco-ich-alardah', titleAr: 'العرضة النجدية', titleEn: 'Al-Ardah Al-Najdiyah', year: 2015, theme: 'theme:Music_Performance' },
  { externalId: 'unesco-ich-almizmar', titleAr: 'المزمار: الرقص بالعصي', titleEn: 'Al-Mizmar', year: 2016, theme: 'theme:Music_Performance' },
  { externalId: 'unesco-ich-falconry', titleAr: 'الصقارة', titleEn: 'Falconry', year: 2016, theme: 'theme:Oasis_Desert' },

  // Crafts & visual arts
  { externalId: 'unesco-ich-alqatt', titleAr: 'القط العسيري', titleEn: 'Al-Qatt Al-Asiri', year: 2017, theme: 'theme:Crafts' },
  { externalId: 'unesco-ich-sadu', titleAr: 'حياكة السدو', titleEn: 'Traditional weaving of Al Sadu', year: 2020, theme: 'theme:Crafts' },

  // Nature/food/practices
  { externalId: 'unesco-ich-date-palm', titleAr: 'نخلة التمر: المعارف والمهارات والتقاليد', titleEn: 'Date Palm', year: 2019, theme: 'theme:Food_Heritage' },
  { externalId: 'unesco-ich-khawlani-coffee', titleAr: 'المعارف والممارسات المتعلقة بزراعة البن الخولاني', titleEn: 'Saudi Khawlani Coffee', year: 2022, theme: 'theme:Coffee' },
  { externalId: 'unesco-ich-alhedaa', titleAr: 'الهداء: نداء الإبل', titleEn: 'Al-Heda\'a', year: 2022, theme: 'theme:Oasis_Desert' },
  { externalId: 'unesco-ich-harees', titleAr: 'الهريس: معارف ومهارات وممارسات', titleEn: 'Harees dish', year: 2023, theme: 'theme:Food_Heritage' },
  { externalId: 'unesco-ich-engraving-metals', titleAr: 'فنون ومهارات النقش على المعادن', titleEn: 'Engraving on metals', year: 2023, theme: 'theme:Crafts' },
  { externalId: 'unesco-ich-taif-roses', titleAr: 'الممارسات الثقافية المرتبطة بالورد الطائفي', titleEn: 'Taif Roses', year: 2024, theme: 'theme:Festivals_Seasons' },
  { externalId: 'unesco-ich-henna', titleAr: 'الحناء: طقوس وممارسات جمالية واجتماعية', titleEn: 'Henna', year: 2024, theme: 'theme:Social_Rituals' },
  { externalId: 'unesco-ich-semsemiah', titleAr: 'السمسمية: صناعة الآلة والعزف عليها', titleEn: 'Semsemiah', year: 2024, theme: 'theme:Music_Performance' },

  // Newer / broad shared elements
  { externalId: 'unesco-ich-bisht', titleAr: 'البشت: مهارات وممارسات', titleEn: 'Bisht', year: 2025, theme: 'theme:Crafts' },
  { externalId: 'unesco-ich-arabic-kohl', titleAr: 'الكحل العربي', titleEn: 'Arabic Kohl', year: 2025, theme: 'theme:Social_Rituals' },

  // Additional 2026 items (seed-ready)
  { externalId: 'unesco-ich-oud', titleAr: 'العود: الممارسات والمهارات وفنون الأداء', titleEn: 'Oud instrument', year: 2026, theme: 'theme:Music_Performance' },
  { externalId: 'unesco-ich-saafiyat', titleAr: 'السافيات وألياف النباتات: حرفة وتقاليد اجتماعية', titleEn: 'Al Saafiyat and plant fibers', year: 2026, theme: 'theme:Crafts' },
];

const ICH_DOMAINS: Array<{ externalId: string; titleAr: string; titleEn?: string }> = [
  { externalId: 'ich-domain-oral', titleAr: 'التقاليد وأشكال التعبير الشفهي', titleEn: 'Oral traditions and expressions' },
  { externalId: 'ich-domain-performing', titleAr: 'فنون وتقاليد أداء العروض', titleEn: 'Performing arts' },
  { externalId: 'ich-domain-social', titleAr: 'الممارسات الاجتماعية والطقوس والاحتفالات', titleEn: 'Social practices, rituals and festive events' },
  { externalId: 'ich-domain-nature', titleAr: 'المعارف والممارسات المتعلقة بالطبيعة والكون', titleEn: 'Knowledge and practices concerning nature and the universe' },
  { externalId: 'ich-domain-craftsmanship', titleAr: 'المهارات المرتبطة بالفنون الحرفية التقليدية', titleEn: 'Traditional craftsmanship' },
];

@Injectable()
export class OfficialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly radar: RadarService,
    private readonly cultureGraph: CultureGraphService,
  ) {}

  async seedOfficialPackages(params: { organizationId: string | null }) {
    const organizationId = params.organizationId;
    const model = (this.prisma as Record<string, unknown>).officialSourceItem;
    if (!model?.upsert) return { ok: false, note: 'prisma_not_ready' };

    const rows: any[] = [];
    const upsert = async (item: any) => {
      const id = `${item.sourceKind}:${item.externalId}`;
      const row = await model.upsert({
        where: { id },
        update: {
          organizationId,
          sourceKind: item.sourceKind,
          externalId: item.externalId,
          titleAr: item.titleAr,
          titleEn: item.titleEn || null,
          year: item.year || null,
          url: item.url || null,
          payloadJson: item.payloadJson || null,
        },
        create: {
          id,
          organizationId,
          sourceKind: item.sourceKind,
          externalId: item.externalId,
          titleAr: item.titleAr,
          titleEn: item.titleEn || null,
          year: item.year || null,
          url: item.url || null,
          payloadJson: item.payloadJson || null,
        },
      });
      rows.push(row);
    };

    for (const y of CULTURAL_YEARS) {
      await upsert({
        sourceKind: 'moc_cultural_year',
        externalId: y.externalId,
        titleAr: y.titleAr,
        titleEn: y.titleEn,
        year: y.year,
        url: y.url || null,
        payloadJson: { theme: y.theme },
      });
    }

    for (const u of UNESCO_ICH_SA) {
      await upsert({
        sourceKind: 'unesco_ich_sa',
        externalId: u.externalId,
        titleAr: u.titleAr,
        titleEn: u.titleEn,
        year: u.year || null,
        url: u.url || null,
        payloadJson: { theme: u.theme },
      });
    }

    for (const d of ICH_DOMAINS) {
      await upsert({
        sourceKind: 'ich_domains',
        externalId: d.externalId,
        titleAr: d.titleAr,
        titleEn: d.titleEn,
        year: null,
        url: null,
        payloadJson: { domain: d.externalId },
      });
    }

    // Ensure taxonomy exists (best-effort)
    await this.radar.seedTaxonomy({ organizationId }).catch(() => void 0);

    return { ok: true, upserted: rows.length, items: rows };
  }

  async list(params: { organizationId?: string; sourceKind?: string }) {
    const rows = await (this.prisma as Record<string, unknown>).officialSourceItem
      .findMany({
        where: {
          ...(params.organizationId ? { organizationId: params.organizationId } : {}),
          ...(params.sourceKind ? { sourceKind: params.sourceKind } : {}),
        },
        orderBy: [{ sourceKind: 'asc' }, { year: 'desc' }],
        take: 1000,
      })
      .catch(() => []);
    return { count: rows.length, items: rows };
  }

  private defaultSignalFromOfficial(item: any) {
    const kind = String(item.sourceKind || '');
    const payload = item.payloadJson || {};
    const taxonomyCode = payload?.theme || (kind === 'ich_domains' ? 'theme:UNESCO_Intangible' : null);
    const base = {
      officialPriority: kind.startsWith('moc_') ? 0.95 : 0.9,
      communityInterest: kind.startsWith('moc_') ? 0.65 : 0.6,
      productionFeasibility: kind.startsWith('moc_') ? 0.75 : 0.6,
      lossRisk: kind === 'unesco_ich_sa' ? 0.8 : 0.35,
    };
    return { taxonomyCode, ...base };
  }

  async generateSignalsFromOfficial(params: { organizationId: string | null; projectId: string | null }) {
    const organizationId = params.organizationId;
    const projectId = params.projectId;
    const items = await (this.prisma as Record<string, unknown>).officialSourceItem
      .findMany({
        where: { ...(organizationId ? { organizationId } : {}) },
        take: 2000,
      })
      .catch(() => []);

    let created = 0;
    const createdSignals: any[] = [];

    for (const item of items) {
      // avoid duplicates: same title under org/project
      const existing = await (this.prisma as Record<string, unknown>).culturalSignal
        .findFirst({ where: { organizationId, projectId, titleAr: item.titleAr } })
        .catch(() => null);
      if (existing) continue;

      const defaults = this.defaultSignalFromOfficial(item);
      const signal = await (this.prisma as Record<string, unknown>).culturalSignal
        .create({
          data: {
            organizationId,
            projectId,
            titleAr: item.titleAr,
            descriptionAr: `مستخرج من مصدر رسمي: ${item.sourceKind}`,
            taxonomyCode: defaults.taxonomyCode,
            regionCode: null,
            status: 'new',
            officialPriority: defaults.officialPriority,
            communityInterest: defaults.communityInterest,
            productionFeasibility: defaults.productionFeasibility,
            lossRisk: defaults.lossRisk,
            score: 0,
            metaJson: { officialItemId: item.id, sourceKind: item.sourceKind, url: item.url || null },
          },
        })
        .catch(() => null);
      if (!signal) continue;

      await (this.prisma as Record<string, unknown>).culturalSignalEvidence
        .create({
          data: {
            signalId: signal.id,
            sourceTitle: item.titleAr,
            sourceUrl: item.url || null,
            snippetAr: `عنصر/برنامج رسمي: ${item.sourceKind}${item.year ? ` (${item.year})` : ''}`,
            weight: 2,
          },
        })
        .catch(() => void 0);

      await this.radar.scoreSignal(signal.id, { recompute: true }).catch(() => void 0);

      // Create culture entity + provenance
      const entityRes = await this.cultureGraph
        .createEntity({
          organizationId,
          projectId,
          entityType: 'official_item',
          canonicalNameAr: item.titleAr,
          descriptionAr: `مصدر رسمي: ${item.sourceKind}`,
          cidocClass: null,
          externalRefs: { sourceKind: item.sourceKind, externalId: item.externalId, url: item.url },
          tags: ['official', item.sourceKind],
        })
        .catch(() => null);

      const entityId = (entityRes as any)?.entity?.id;
      if (entityId) {
        await (this.prisma as Record<string, unknown>).culturalSignalEntityLink
          .create({ data: { signalId: signal.id, entityId, relation: 'official_source' } })
          .catch(() => void 0);
        await (this.prisma as Record<string, unknown>).culturalProvenance
          .create({
            data: {
              organizationId,
              projectId,
              entityId,
              sourceTitle: item.titleAr,
              sourceUrl: item.url || null,
              citationAr: item.sourceKind,
              capturedAt: new Date(),
              capturedByUserId: null,
            },
          })
          .catch(() => void 0);
      }

      created += 1;
      createdSignals.push(signal);
    }

    return { ok: true, created, signals: createdSignals };
  }
}
