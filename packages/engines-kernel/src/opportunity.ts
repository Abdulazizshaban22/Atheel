import { MOC_CULTURAL_SECTORS, CULTURE_THEMES, SAUDI_REGIONS } from '@madar/culture-sa-kernel';

export type OpportunityClassification = {
  primaryTaxonomyCode: string | null; // e.g., sector:Music
  sectorCodes: string[]; // MocCulturalSector codes
  themeCodes: string[]; // CultureTheme codes
  regionCode: string | null; // SaudiRegion
  confidence: number; // 0..1
  audienceEstimate: { min: number | null; max: number | null; rationaleAr: string };
  recommendedStudioScope: {
    general_scope: boolean;
    event_architecture: boolean;
    graphic_design: boolean;
    overall_direction: boolean;
  };
  signals: {
    detectedEventTypeAr: string | null;
    multiCity: boolean;
    durationDays: number | null;
    hasGamesTournament: boolean;
  };
};

function clamp01(v: number) {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

function norm(s: any) {
  return String(s ?? '').replace(/\s+/g, ' ').trim();
}

function extractNumbers(text: string): number[] {
  const nums: number[] = [];
  // Western digits
  for (const m of text.matchAll(/\b(\d{1,7})\b/g)) {
    const n = Number(m[1]);
    if (Number.isFinite(n)) nums.push(n);
  }
  // Arabic-Indic digits
  const arabicIndicMap: Record<string, string> = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
  };
  const normalized = text.replace(/[٠-٩]/g, (d) => arabicIndicMap[d] || d);
  for (const m of normalized.matchAll(/\b(\d{1,7})\b/g)) {
    const n = Number(m[1]);
    if (Number.isFinite(n)) nums.push(n);
  }
  return nums.slice(0, 20);
}

function scoreKeywords(textLower: string, keywords: string[]): number {
  let score = 0;
  for (const k of keywords) {
    const kk = String(k || '').toLowerCase().trim();
    if (!kk) continue;
    if (textLower.includes(kk)) score += 1;
  }
  return score;
}

function guessRegionCode(textLower: string): string | null {
  for (const r of SAUDI_REGIONS) {
    if (textLower.includes(String(r.nameAr).toLowerCase())) return r.code;
    for (const h of r.hubs || []) {
      if (h && textLower.includes(String(h).toLowerCase())) return r.code;
    }
  }
  return null;
}

function guessEventSignals(textLower: string) {
  const eventTypes: Array<{ key: string; labelAr: string; score: number }> = [
    { key: 'season', labelAr: 'موسم', score: 0 },
    { key: 'festival', labelAr: 'مهرجان', score: 0 },
    { key: 'carnival', labelAr: 'كرنفال', score: 0 },
    { key: 'exhibition', labelAr: 'معرض', score: 0 },
    { key: 'competition', labelAr: 'مسابقة/بطولة', score: 0 },
    { key: 'concert', labelAr: 'حفل/موسيقى', score: 0 },
  ];

  const bump = (key: string, inc = 1) => {
    const it = eventTypes.find((x) => x.key === key);
    if (it) it.score += inc;
  };

  if (/(موسم|season)/.test(textLower)) bump('season', 2);
  if (/(مهرجان|festival)/.test(textLower)) bump('festival', 2);
  if (/(كرنفال|carnival)/.test(textLower)) bump('carnival', 2);
  if (/(معرض|exhibition|expo)/.test(textLower)) bump('exhibition', 2);
  if (/(بطولة|مسابقة|tournament|gaming|ألعاب إلكترونية|esports)/.test(textLower)) bump('competition', 2);
  if (/(حفل|موسيقى|concert|orchestra|أوركسترا)/.test(textLower)) bump('concert', 2);

  eventTypes.sort((a, b) => b.score - a.score);
  const top = eventTypes[0];
  return top.score > 0 ? top.labelAr : null;
}

function estimateAudience(text: string, textLower: string): OpportunityClassification['audienceEstimate'] {
  const numbers = extractNumbers(text);

  // If explicit capacity/visitors appear
  const hasVisitorWord = /(زائر|زوار|visitors|attendees|حضور)/.test(textLower);
  const hasCapacityWord = /(سعة|capacity|seats|مقاعد)/.test(textLower);

  // Heuristic: take numbers in plausible range
  const plausible = numbers.filter((n) => n >= 200 && n <= 5_000_000);

  if ((hasVisitorWord || hasCapacityWord) && plausible.length) {
    const max = Math.max(...plausible);
    const min = Math.min(...plausible);
    return {
      min,
      max,
      rationaleAr: 'تم تقدير الجمهور اعتمادًا على أرقام صريحة مرتبطة بكلمات مثل زوار أو سعة في النص.',
    };
  }

  // Heuristic by event type
  const eventType = guessEventSignals(textLower);
  if (eventType === 'موسم') return { min: 50_000, max: 2_000_000, rationaleAr: 'موسم عادة يستقبل أعدادًا كبيرة على مدى أسابيع. التقدير هنا أولي ويحتاج تأكيد من الكراسة أو الجهة.' };
  if (eventType === 'مهرجان' || eventType === 'كرنفال') return { min: 8_000, max: 250_000, rationaleAr: 'مهرجان أو كرنفال غالبًا يستقبل آلافًا إلى مئات الآلاف حسب المدة والموقع.' };
  if (eventType === 'معرض') return { min: 3_000, max: 120_000, rationaleAr: 'المعارض تتفاوت حسب المكان والمدة؛ التقدير أولي.' };
  if (eventType === 'حفل/موسيقى') return { min: 1_000, max: 40_000, rationaleAr: 'الحفلات عادة تقاس بسعة الموقع. التقدير أولي.' };
  if (eventType === 'مسابقة/بطولة') return { min: 2_000, max: 80_000, rationaleAr: 'البطولات تعتمد على نوع البطولة وحجم الجمهور وسعة القاعة.' };

  return { min: null, max: null, rationaleAr: 'لا توجد مؤشرات كافية لتقدير الجمهور من النص الحالي. يفضّل وجود أرقام سعة أو زوار في الكراسة.' };
}

function recommendedScopeFromSignals(textLower: string, sectorCodes: string[]): OpportunityClassification['recommendedStudioScope'] {
  const has = (re: RegExp) => re.test(textLower);

  const event_architecture = has(/(بوث|جناح|مسرح|منصة|بوابة|جلسات|ديكور|مساحة|متر|مخطط)/);
  const graphic_design = has(/(هوية|مطبوع|لوحات|لافت|بوستر|ملصق|سوشال|digital|موشن|قوالب)/);
  const overall_direction = has(/(مسار|تجربة|رحلة الزائر|تقسيم|برنامج|جدول|خارطة|zones|مناطق)/);

  // Sector-driven defaults
  const sectorBoost = {
    event_architecture: ['Architecture_Design', 'Museums', 'Cultural_Archaeological_Sites', 'Festivals_Events', 'Visual_Arts', 'Film'],
    graphic_design: ['Visual_Arts', 'Fashion', 'Books_Publishing', 'Film', 'Festivals_Events'],
    overall_direction: ['Festivals_Events', 'Theater_Performing_Arts', 'Museums', 'Film', 'Music', 'Culinary_Arts'],
  };

  const hasSector = (arr: string[]) => sectorCodes.some((s) => arr.includes(s));

  return {
    general_scope: true,
    event_architecture: event_architecture || hasSector(sectorBoost.event_architecture),
    graphic_design: graphic_design || hasSector(sectorBoost.graphic_design),
    overall_direction: overall_direction || hasSector(sectorBoost.overall_direction),
  };
}

export function classifyOpportunity(input: { titleAr: string; descriptionAr?: string | null; metaJson?: any }): OpportunityClassification {
  const text = `${norm(input.titleAr)} ${norm(input.descriptionAr || '')}`.trim();
  const lower = text.toLowerCase();

  // sectors scoring
  const sectorScores = MOC_CULTURAL_SECTORS.map((s) => {
    const sc = scoreKeywords(lower, s.keywords || []);
    return { code: s.code as unknown as string, nameAr: s.nameAr, score: sc };
  }).sort((a, b) => b.score - a.score);

  const topSector = sectorScores[0];
  const sectorCodes = sectorScores.filter((x) => x.score > 0).slice(0, 4).map((x) => x.code);

  // themes
  const themeScores = CULTURE_THEMES.map((t) => {
    const sc = scoreKeywords(lower, t.keywordsAr || []);
    return { code: t.code as unknown as string, nameAr: t.nameAr, score: sc };
  }).sort((a, b) => b.score - a.score);

  const themeCodes = themeScores.filter((x) => x.score > 0).slice(0, 3).map((x) => x.code);

  const regionCode = guessRegionCode(lower);

  const primaryTaxonomyCode = (sectorCodes.length ? `sector:${sectorCodes[0]}` : (themeCodes.length ? `theme:${themeCodes[0]}` : null));

  // confidence
  const raw = (topSector?.score || 0);
  const confidence = clamp01(raw >= 4 ? 0.9 : raw === 3 ? 0.8 : raw === 2 ? 0.65 : raw === 1 ? 0.5 : 0.25);

  const audienceEstimate = estimateAudience(text, lower);
  const recommendedStudioScope = recommendedScopeFromSignals(lower, sectorCodes);

  const detectedEventTypeAr = guessEventSignals(lower);
  const multiCity = /(الرياض|جدة|الطائف|الدمام|الخبر|المدينة|العلا|أبها|الظهران).*(الرياض|جدة|الطائف|الدمام|الخبر|المدينة|العلا|أبها|الظهران)/.test(text);
  const durationDays = (() => {
    const m = text.match(/(\d{1,3})\s*(?:يوم|أيام|day|days)/i);
    if (!m) return null;
    const n = Number(m[1]);
    return Number.isFinite(n) ? n : null;
  })();
  const hasGamesTournament = /(ألعاب إلكترونية|بطولة|gaming|esports|tournament)/i.test(text);

  return {
    primaryTaxonomyCode,
    sectorCodes,
    themeCodes,
    regionCode,
    confidence,
    audienceEstimate,
    recommendedStudioScope,
    signals: { detectedEventTypeAr, multiCity, durationDays, hasGamesTournament },
  };
}
