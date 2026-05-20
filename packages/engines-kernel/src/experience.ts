import type { OpportunityClassification } from './opportunity';

export type ExperienceBlueprint = {
  version: string;
  generatedAt: string;
  basis: {
    competitionId?: string | null;
    titleAr: string;
    sectorCodes: string[];
    audienceEstimate: { min: number | null; max: number | null };
    cities: string[];
  };
  program: {
    zones: Array<{ code: string; nameAr: string; kind: 'entry' | 'stage' | 'exhibit' | 'activity' | 'food' | 'kids' | 'tournament' | 'rest' | 'services' | 'exit'; notesAr?: string }>;
    scheduleTemplate: Array<{ dayIndex: number; blocks: Array<{ start: string; end: string; titleAr: string; zoneCode?: string; notesAr?: string }> }>;
    operations: {
      queueAssumptions: {
        peakFactor: number;
        avgDwellMinutes: number;
        maxQueueTargetMinutes: number;
        notesAr: string;
      };
      wayfinding: { signageLevel: 'basic' | 'standard' | 'high'; notesAr: string };
    };
  };
  visitorJourney: {
    personas: Array<{ code: 'families' | 'youth' | 'tourists' | 'students' | 'experts'; titleAr: string; goalsAr: string[] }>;
    steps: Array<{ order: number; titleAr: string; zoneCode?: string; experienceGoalAr: string; measurementHintAr: string }>;
  };
  interactionLayer: {
    enabled: boolean;
    mechanics: Array<{ code: string; titleAr: string; howItWorksAr: string; avoidsMarketing: boolean }>
  };
};

// Wave32: materialized plan tables for reporting/comparison
export type ExperiencePlanTables = {
  zones: Array<{ code: string; nameAr: string; kind: ExperienceBlueprint['program']['zones'][number]['kind']; notesAr?: string | null }>;
  scheduleItems: Array<{ dayIndex: number; startTime: string; endTime: string; titleAr: string; zoneCode?: string | null; notesAr?: string | null }>;
  journeySteps: Array<{ stepOrder: number; titleAr: string; zoneCode?: string | null; experienceGoalAr: string; measurementHintAr: string }>;
  queueMetrics: Array<{ metricType: 'entry_queue' | 'food_queue' | 'ticket_queue' | 'tournament_queue' | 'general_queue'; zoneCode?: string | null; targetWaitMinutes?: number | null; peakFactor?: number | null; avgDwellMinutes?: number | null; notesAr?: string | null }>;
};

export function materializeExperienceBlueprint(blueprint: ExperienceBlueprint | null | undefined): ExperiencePlanTables {
  const bp = blueprint as any;
  if (!bp) return { zones: [], scheduleItems: [], journeySteps: [], queueMetrics: [] };

  const zones = Array.isArray(bp?.program?.zones)
    ? bp.program.zones.map((z: any) => ({ code: String(z.code), nameAr: String(z.nameAr || z.code), kind: z.kind, notesAr: z.notesAr || null }))
    : [];

  const scheduleItems: ExperiencePlanTables['scheduleItems'] = [];
  for (const d of (bp?.program?.scheduleTemplate || []) as any[]) {
    const dayIndex = Number(d?.dayIndex ?? 0) || 0;
    for (const b of (d?.blocks || []) as any[]) {
      scheduleItems.push({
        dayIndex,
        startTime: String(b?.start || ''),
        endTime: String(b?.end || ''),
        titleAr: String(b?.titleAr || ''),
        zoneCode: b?.zoneCode ? String(b.zoneCode) : null,
        notesAr: b?.notesAr ? String(b.notesAr) : null,
      });
    }
  }

  const journeySteps: ExperiencePlanTables['journeySteps'] = Array.isArray(bp?.visitorJourney?.steps)
    ? bp.visitorJourney.steps
        .slice()
        .sort((a: any, b: any) => Number(a.order) - Number(b.order))
        .map((s: any) => ({
          stepOrder: Number(s?.order ?? 0) || 0,
          titleAr: String(s?.titleAr || ''),
          zoneCode: s?.zoneCode ? String(s.zoneCode) : null,
          experienceGoalAr: String(s?.experienceGoalAr || ''),
          measurementHintAr: String(s?.measurementHintAr || ''),
        }))
    : [];

  const qa = bp?.program?.operations?.queueAssumptions || {};
  const peakFactor = typeof qa.peakFactor === 'number' ? qa.peakFactor : null;
  const avgDwellMinutes = typeof qa.avgDwellMinutes === 'number' ? qa.avgDwellMinutes : null;
  const targetWaitMinutes = typeof qa.maxQueueTargetMinutes === 'number' ? qa.maxQueueTargetMinutes : null;

  const queueMetrics: ExperiencePlanTables['queueMetrics'] = [];
  const makeMetric = (metricType: ExperiencePlanTables['queueMetrics'][number]['metricType'], zoneCode?: string | null, notesAr?: string | null) =>
    queueMetrics.push({ metricType, zoneCode: zoneCode || null, targetWaitMinutes, peakFactor, avgDwellMinutes, notesAr: notesAr || (qa.notesAr ? String(qa.notesAr) : null) });

  // Add base metrics by zone kinds
  for (const z of zones) {
    if (z.kind === 'entry') makeMetric('entry_queue', z.code, 'طابور الدخول');
    if (z.kind === 'food') makeMetric('food_queue', z.code, 'طابور الطعام والخدمات');
    if (z.kind === 'tournament') makeMetric('tournament_queue', z.code, 'طابور البطولات');
  }
  if (!queueMetrics.length) makeMetric('general_queue', null, 'افتراضات عامة للطوابير');

  return { zones, scheduleItems, journeySteps, queueMetrics };
}

function norm(s: any) {
  return String(s ?? '').replace(/\s+/g, ' ').trim();
}

function hasAny(textLower: string, keywords: string[]) {
  return keywords.some((k) => k && textLower.includes(String(k).toLowerCase()));
}

function inferCitiesFromText(text: string): string[] {
  const cities = ['الرياض','جدة','الطائف','الدمام','الخبر','المدينة','العلا','أبها','الظهران','الأحساء','القصيم','حائل','تبوك','جازان','نجران','الباحة'];
  const out: string[] = [];
  for (const c of cities) {
    if (text.includes(c)) out.push(c);
  }
  return Array.from(new Set(out)).slice(0, 6);
}

function buildZones(textLower: string, sectorCodes: string[]): ExperienceBlueprint['program']['zones'] {
  const zones: ExperienceBlueprint['program']['zones'] = [];

  const push = (code: string, nameAr: string, kind: ExperienceBlueprint['program']['zones'][number]['kind'], notesAr?: string) => {
    if (zones.some((z) => z.code === code)) return;
    zones.push({ code, nameAr, kind, notesAr });
  };

  push('entry', 'بوابة الدخول والاستقبال', 'entry', 'نقطة تعريف سريعة + توزيع خريطة مسار.');

  if (hasAny(textLower, ['مسرح', 'منصة', 'حفل', 'أداء', 'عرض', 'performing', 'theater']) || sectorCodes.includes('Music') || sectorCodes.includes('Theater_Performing_Arts')) {
    push('main_stage', 'المسرح الرئيسي', 'stage', 'تجهيز صوت وإضاءة + منطقة انتظار منظمة.');
  }

  if (hasAny(textLower, ['معرض', 'أجنحة', 'جناح', 'بوث', 'معروضات']) || sectorCodes.includes('Museums') || sectorCodes.includes('Visual_Arts') || sectorCodes.includes('Architecture_Design')) {
    push('exhibition', 'منطقة الأجنحة والمعارض', 'exhibit', 'تقسيم أجنحة حسب موضوعات/قطاعات.');
  }

  if (hasAny(textLower, ['ورشة', 'ورش', 'تعليم', 'تدريب', 'جلسات']) || sectorCodes.includes('Books_Publishing') || sectorCodes.includes('Literature')) {
    push('workshops', 'منطقة الورش والجلسات', 'activity', 'ورش قصيرة 30-60 دقيقة بجدول ثابت.');
  }

  if (hasAny(textLower, ['طهي', 'تذوق', 'أكلات', 'مطبخ', 'food', 'culinary']) || sectorCodes.includes('Culinary_Arts') || hasAny(textLower, ['قهوة', 'بن', 'coffee'])) {
    push('food', 'منطقة فنون الطهي والتذوق', 'food', 'تدفقات دخول وخروج لتقليل الازدحام.');
  }

  if (hasAny(textLower, ['أطفال', 'kids', 'عائلات']) ) {
    push('kids', 'منطقة الأطفال والعائلات', 'kids', 'نشاطات قصيرة وإشراف.');
  }

  if (hasAny(textLower, ['ألعاب إلكترونية', 'بطولة', 'gaming', 'esports', 'tournament'])) {
    push('tournament', 'منطقة البطولات والألعاب', 'tournament', 'مقاعد + شاشة + إدارة طوابير.');
  }

  push('rest', 'مناطق الجلوس والاستراحة', 'rest', 'توزيع نقاط جلوس كل 8-12 دقيقة مشي.');
  push('services', 'الخدمات والدعم', 'services', 'معلومات + إسعاف أولي + إتاحة + دورات مياه.');
  push('exit', 'مسار الخروج', 'exit', 'مخارج واضحة مع لوحات وتدفق باتجاه واحد وقت الذروة.');

  return zones;
}

function scheduleTemplate(zones: ExperienceBlueprint['program']['zones']): ExperienceBlueprint['program']['scheduleTemplate'] {
  const hasStage = zones.some((z) => z.kind === 'stage');
  const hasWorkshop = zones.some((z) => z.code === 'workshops');
  const hasTournament = zones.some((z) => z.kind === 'tournament');

  const mkDay = (dayIndex: number) => {
    const blocks: any[] = [];
    blocks.push({ start: '16:00', end: '16:30', titleAr: 'فتح البوابات + استقبال', zoneCode: 'entry' });
    blocks.push({ start: '16:30', end: '18:00', titleAr: 'تجارب مناطق + أجنحة', zoneCode: zones.find((z) => z.kind === 'exhibit')?.code || 'exhibition' });
    if (hasWorkshop) blocks.push({ start: '18:00', end: '19:00', titleAr: 'ورش وجلسات قصيرة', zoneCode: 'workshops' });
    blocks.push({ start: '19:00', end: '20:00', titleAr: 'استراحة وتذوق', zoneCode: zones.find((z) => z.kind === 'food')?.code || 'food' });
    if (hasTournament) blocks.push({ start: '20:00', end: '21:30', titleAr: 'بطولات / نشاطات تفاعلية', zoneCode: 'tournament' });
    if (hasStage) blocks.push({ start: '21:30', end: '22:30', titleAr: 'فقرة رئيسية على المسرح', zoneCode: 'main_stage' });
    blocks.push({ start: '22:30', end: '23:00', titleAr: 'إغلاق تدريجي وخروج منظم', zoneCode: 'exit' });
    return { dayIndex, blocks };
  };

  return [mkDay(1), mkDay(2), mkDay(3)];
}

export function generateExperienceBlueprint(params: {
  titleAr: string;
  fullTextAr: string;
  classification: OpportunityClassification;
}): ExperienceBlueprint {
  const titleAr = norm(params.titleAr);
  const fullTextAr = norm(params.fullTextAr);
  const lower = fullTextAr.toLowerCase();

  const cities = inferCitiesFromText(fullTextAr);
  const zones = buildZones(lower, params.classification.sectorCodes);

  const blueprint: ExperienceBlueprint = {
    version: 'wave31_v1',
    generatedAt: new Date().toISOString(),
    basis: {
      competitionId: null,
      titleAr,
      sectorCodes: params.classification.sectorCodes,
      audienceEstimate: { min: params.classification.audienceEstimate.min, max: params.classification.audienceEstimate.max },
      cities,
    },
    program: {
      zones,
      scheduleTemplate: scheduleTemplate(zones),
      operations: {
        queueAssumptions: {
          peakFactor: 1.8,
          avgDwellMinutes: 75,
          maxQueueTargetMinutes: 18,
          notesAr: 'افتراضات أولية للتشغيل. يمكن معايرتها عند توفر أرقام السعة والذروة في الكراسة.',
        },
        wayfinding: {
          signageLevel: params.classification.audienceEstimate.max && params.classification.audienceEstimate.max > 50000 ? 'high' : 'standard',
          notesAr: 'لوحات إرشاد ومسارات أحادية الاتجاه في الذروة + خرائط جيب/لوحات كبيرة.',
        },
      },
    },
    visitorJourney: {
      personas: [
        { code: 'families', titleAr: 'العائلات', goalsAr: ['سهولة الحركة', 'أنشطة قصيرة للأطفال', 'مناطق جلوس'] },
        { code: 'youth', titleAr: 'الشباب', goalsAr: ['تجارب تفاعلية', 'بطولات/عروض', 'محتوى قابل للمشاركة'] },
        { code: 'tourists', titleAr: 'السياح', goalsAr: ['فهم سريع للهوية', 'لحظات تصوير', 'معلومات ثنائية اللغة'] },
      ],
      steps: [
        { order: 1, titleAr: 'استقبال وتعريف سريع', zoneCode: 'entry', experienceGoalAr: 'توجيه واضح من أول دقيقة', measurementHintAr: 'زمن دخول أقل من 6 دقائق' },
        { order: 2, titleAr: 'استكشاف الأجنحة/المناطق', zoneCode: zones.find((z) => z.kind === 'exhibit')?.code, experienceGoalAr: 'اكتشاف منظم بدون ازدحام', measurementHintAr: 'معدل توقف 2-4 دقائق لكل محطة' },
        { order: 3, titleAr: 'نشاط تفاعلي أو ورشة', zoneCode: zones.find((z) => z.kind === 'activity')?.code, experienceGoalAr: 'تعلم أو تفاعل قصير', measurementHintAr: 'إكمال تجربة واحدة على الأقل' },
        { order: 4, titleAr: 'استراحة وتذوق', zoneCode: zones.find((z) => z.kind === 'food')?.code, experienceGoalAr: 'رفع الرضا وتقليل إرهاق الحركة', measurementHintAr: 'متوسط طابور أقل من 18 دقيقة' },
        { order: 5, titleAr: 'لحظة ذروة', zoneCode: zones.find((z) => z.kind === 'stage')?.code || zones.find((z) => z.kind === 'tournament')?.code, experienceGoalAr: 'ذروة واضحة للحدث', measurementHintAr: 'معدل حضور الذروة مرتفع' },
        { order: 6, titleAr: 'خروج منظم', zoneCode: 'exit', experienceGoalAr: 'تجربة نهاية مريحة وآمنة', measurementHintAr: 'عدم حدوث اختناقات خروج' },
      ],
    },
    interactionLayer: {
      enabled: true,
      mechanics: [
        { code: 'zone-stamps', titleAr: 'أختام مناطق', howItWorksAr: 'يمر الزائر على نقاط داخل المناطق ويجمع أختام رقمية عبر QR داخل الموقع.', avoidsMarketing: true },
        { code: 'micro-quests', titleAr: 'مهام قصيرة داخل التجربة', howItWorksAr: '3 مهام بسيطة مثل تجربة ورشة أو زيارة جناح محدد للحصول على شارة داخلية.', avoidsMarketing: true },
        { code: 'crowd-balancing', titleAr: 'موازنة الحشود', howItWorksAr: 'النظام يقترح مناطق أقل ازدحامًا داخل الموقع عبر شاشات إرشاد أو موظفي الإرشاد.', avoidsMarketing: true },
      ],
    },
  };

  return blueprint;
}
