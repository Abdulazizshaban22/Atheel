import type { ApprovalPacketBottleneck, ApprovalPacketCitation, ApprovalPacketKpis, ApprovalPacketSections, PacketBuildInput } from './types';

function fmtTime(seconds?: number) {
  if (!seconds && seconds !== 0) return 'غير متاح';
  const m = Math.round(seconds / 60);
  return `${m} دقيقة`;
}

function topBottleneckLine(b: ApprovalPacketBottleneck | undefined) {
  if (!b) return 'لا توجد اختناقات رئيسية (حسب البيانات الحالية).';
  return `أعلى نقطة اختناق: ${b.nameAr} (استغلال ${b.peakUtilizationPct}%، انتظار متوسط ${Math.round(b.avgWaitSeconds/60)} دقيقة).`;
}

function buildExecutiveSummary(input: PacketBuildInput, top: ApprovalPacketBottleneck | undefined) {
  const k = input.kpis;
  const visitors = k.visitorsSimulated ? `تمت محاكاة ${k.visitorsSimulated} زائر.` : 'تمت محاكاة التدفق الزائري.';
  return [
    `هذه حزمة اعتماد رسمية مبنية على نتائج محاكاة التوأم الرقمي للتجربة${input.experienceTitleAr ? `: ${input.experienceTitleAr}` : ''}${input.twinNameAr ? ` ضمن ${input.twinNameAr}` : ''}.`,
    `السيناريو: ${input.scenarioKey || 'baseline'}. تاريخ التوليد: ${input.generatedAtIso}.`,
    visitors,
    `المؤشرات: رضا متوقع ${k.predictedSatisfaction0to100}/100، ازدحام ${k.congestionScore0to100}/100 (الأعلى أفضل)، نسبة إكمال ${k.completionRatePct}%.`,
    topBottleneckLine(top),
  ].join('\n');
}

function buildDecisionRequest(k: ApprovalPacketKpis) {
  const severity = k.predictedSatisfaction0to100 >= 80 ? 'جاهز للاعتماد' : k.predictedSatisfaction0to100 >= 65 ? 'جاهز مع تحسينات' : 'يحتاج إعادة تصميم';
  return [
    `قرار مطلوب: اعتماد الفكرة والتجربة على مستوى التشغيل وفق مستوى: ${severity}.`,
    `المطلوب من لجنة الاعتماد:`,
    `1) اعتماد السيناريو الأساسي أو اختيار سيناريو بديل.`,
    `2) اعتماد توصيات تقليل الاختناقات وخطة إدارة التدفق.`,
    `3) اعتماد خطة القياس والمؤشرات قبل الإطلاق وبعده.`,
  ].join('\n');
}

function buildAssumptions(profile?: import('./types').PacketSimulationProfile) {
  const a: string[] = [];
  if (!profile) {
    return [
      'تم بناء الافتراضات اعتمادًا على قيم افتراضية عندما لا تتوفر بيانات تشغيل دقيقة.',
      'أي اختلافات في الطاقة الاستيعابية، زمن التوقف، أو معدلات الدخول قد تغير النتائج بشكل ملحوظ.',
    ];
  }
  if (profile.durationMinutes) a.push(`مدة التجربة الافتراضية: ${profile.durationMinutes} دقيقة.`);
  if (profile.arrivalsPerMinute !== undefined) a.push(`معدل الدخول: ${profile.arrivalsPerMinute} زائر/دقيقة (قابل للتعديل حسب التشغيل).`);
  if (profile.stepSeconds) a.push(`دقة المحاكاة: خطوة زمنية ${profile.stepSeconds} ثوان.`);
  if (profile.shortestPathBias !== undefined) a.push(`نزعة اختيار المسار الأقصر: ${Math.round(profile.shortestPathBias * 100)}%.`);
  if (Array.isArray(profile.arrivalBatches) && profile.arrivalBatches.length) a.push(`تم تضمين دفعات دخول (arrival batches) لمحاكاة ذروات الدخول.`);
  if (Array.isArray(profile.closedNodeIds) && profile.closedNodeIds.length) a.push(`تم محاكاة إغلاق محطات: ${profile.closedNodeIds.join(', ')}.`);
  if (profile.reverseEdges) a.push('تم محاكاة عكس اتجاه المسار.' );
  a.push('المخرجات تقديرية وتُستخدم لاتخاذ قرار تصميم وتشغيل قبل التنفيذ.' );
  return a;
}

function buildRecommendations(k: ApprovalPacketKpis, bottlenecks: ApprovalPacketBottleneck[]) {
  const rec: string[] = [];
  const top = bottlenecks[0];
  if (top) {
    rec.push(`تخفيف اختناق ${top.nameAr}: زيادة الطاقة الاستيعابية أو تقليل زمن التوقف أو تفريغ المسار عبر تحويل جزء من المحتوى إلى محطة بديلة.`);
    rec.push(`إدارة صفوف الانتظار: إضافة مسار Queue Lane أو منطقة انتظار مريحة قبل ${top.nameAr} مع محتوى قصير يقلل الإحساس بالزمن.`);
  }
  if (k.completionRatePct < 85) {
    rec.push('تحسين نسبة الإكمال: تقليل عدد المحطات أو تقليل زمن التوقف في منتصف التجربة، أو تقديم نقاط اختصار اختيارية.' );
  }
  if (k.predictedSatisfaction0to100 < 75) {
    rec.push('رفع الرضا المتوقع: تحسين الإيقاع السردي عبر توزيع “محطات عالية التأثير” كل 10–15 دقيقة.' );
  }
  rec.push('خطة قياس قبل/بعد: عدادات دخول، وقت بقاء، نقاط تفاعل، رضا، وملاحظات نوعية مرتبطة بكل محطة.' );
  return rec;
}

function buildDeckOutline(input: PacketBuildInput) {
  const k = input.kpis;
  const title = input.titleAr;
  const exp = input.experienceTitleAr || input.twinNameAr || 'التجربة';
  const slides = [
    { t: '1. الغلاف', b: `${title} — ${exp}` },
    { t: '2. المشكلة والفرصة', b: 'لماذا هذه التجربة الآن؟ ما الفجوة الثقافية/الزائرية التي تعالجها؟' },
    { t: '3. الفكرة في سطر', b: 'وصف مختصر جدًا وواضح' },
    { t: '4. الجمهور المستهدف', b: 'شرائح، دوافع، احتياجات، وصول' },
    { t: '5. السردية', b: 'Logline + 3 لحظات ذروة' },
    { t: '6. تصميم التجربة', b: 'المسار، المحطات، الزمن، التفاعل' },
    { t: '7. نتائج المحاكاة', b: `رضا ${k.predictedSatisfaction0to100}/100، ازدحام ${k.congestionScore0to100}/100، إكمال ${k.completionRatePct}%` },
    { t: '8. الاختناقات والتعديلات', b: 'أهم نقاط الاختناق وما الذي سنغيره' },
    { t: '9. التشغيل', b: 'طاقم، أدوار، تشغيل يومي، سلامة، وصول' },
    { t: '10. خطة القياس', b: 'KPIs + آلية جمع البيانات + تحسين مستمر' },
    { t: '11. المخاطر والتخفيف', b: 'مخاطر تشغيل/زحام/سلامة/سمعة' },
    { t: '12. قرار الاعتماد', b: 'ماذا نحتاج من اللجنة اليوم' },
  ];
  const md = [
    `# عرض الفعالية — Outline (12 شريحة)`,
    `- عنوان: ${title}`,
    `- التجربة: ${exp}`,
    `- تاريخ: ${input.generatedAtIso}`,
    '',
    ...slides.map((s) => `## ${s.t}\n${s.b}`),
  ].join('\n');
  return md;
}

function buildStrategyDoc(input: PacketBuildInput) {
  const k = input.kpis;
  const md = [
    `# استراتيجية التجربة الثقافية`,
    `## التعريف`,
    `- العنوان: ${input.titleAr}`,
    `- السيناريو: ${input.scenarioKey || 'baseline'}`,
    '',
    `## الأهداف`,
    `- هدف زائري: رفع الرضا إلى 80/100 أو أكثر.`,
    `- هدف تشغيلي: ازدحام ضمن نطاق صحي (مؤشر ≥ 70/100).`,
    `- هدف أثر: زيادة التفاعل والعودة والتوصية.`,
    '',
    `## مؤشرات الأداء`,
    `- الرضا المتوقع: ${k.predictedSatisfaction0to100}/100`,
    `- الازدحام: ${k.congestionScore0to100}/100`,
    `- الإكمال: ${k.completionRatePct}%`,
    '',
    `## استراتيجية السردية`,
    `- ثلاث لحظات ذروة موزعة على المسار`,
    `- لغة واضحة دون مبالغات، مع إحالات لمصادر داخل حزمة الأدلة`,
    '',
    `## استراتيجية المحتوى`,
    `- محتوى تمهيدي قبل الدخول`,
    `- محتوى قصير أثناء الانتظار`,
    `- محتوى ختامي للذاكرة والمشاركة`,
    '',
    `## استراتيجية التشغيل`,
    `- إدارة الصفوف`,
    `- إدارة السعة`,
    `- جاهزية السلامة والوصول`,
    '',
    `## خطة التحسين`,
    `- تشغيل تجريبي`,
    `- مراجعة أسبوعية للبيانات`,
    `- تعديل المسار والسعة بناء على نتائج القياس`,
  ].join('\n');
  return md;
}

function buildOperationalFeasibility(input: PacketBuildInput) {
  const k = input.kpis;
  const md = [
    `# دراسة تشغيلية مبسطة`,
    `## ملخص`,
    `هذه الدراسة مبنية على المحاكاة وتُستخدم لاتخاذ قرار تشغيل أولي قبل التنفيذ.`,
    '',
    `## افتراضات التشغيل`,
    ...buildAssumptions(input.profile).map((x) => `- ${x}`),
    '',
    `## طاقة واستيعاب`,
    `- رضا متوقع: ${k.predictedSatisfaction0to100}/100`,
    `- ازدحام: ${k.congestionScore0to100}/100`,
    `- إكمال: ${k.completionRatePct}%`,
    `- متوسط زمن التجربة: ${fmtTime(k.avgTotalTimeSeconds)}`,
    '',
    `## الموارد`,
    `- طاقم استقبال`,
    `- مشرف مسار`,
    `- مسؤولو محطات`,
    `- أمن وسلامة`,
    `- دعم تقني/إعلامي`,
    '',
    `## المخاطر`,
    `- ازدحام/اختناقات`,
    `- تعطل محطة`,
    `- تدفق غير متوقع (دفعات)`,
    `- وصول ذوي الإعاقة`,
    '',
    `## توصيات قبل الإطلاق`,
    `- تشغيل تجريبي محدود`,
    `- اختبار سيناريو دفعات الدخول وإغلاق محطة`,
    `- تجهيز خطة تحويل مسار في حالة الاختناق`,
  ].join('\n');
  return md;
}

function buildPacketMarkdown(input: PacketBuildInput, citations: ApprovalPacketCitation[]) {
  const top = input.bottlenecks[0];
  const md = [
    `# حزمة اعتماد رسمية`,
    `## معلومات عامة`,
    `- العنوان: ${input.titleAr}`,
    `- السيناريو: ${input.scenarioKey || 'baseline'}`,
    `- تاريخ التوليد: ${input.generatedAtIso}`,
    '',
    `## ملخص تنفيذي`,
    buildExecutiveSummary(input, top),
    '',
    `## قرار الاعتماد`,
    buildDecisionRequest(input.kpis),
    '',
    `## مؤشرات المحاكاة`,
    `- رضا متوقع: ${input.kpis.predictedSatisfaction0to100}/100`,
    `- ازدحام: ${input.kpis.congestionScore0to100}/100`,
    `- إكمال: ${input.kpis.completionRatePct}%`,
    '',
    `## نقاط الاختناق`,
    ...(input.bottlenecks.length ? input.bottlenecks.map((b) => `- ${b.nameAr}: استغلال ${b.peakUtilizationPct}%, انتظار ${Math.round(b.avgWaitSeconds/60)} دقيقة`) : ['- لا يوجد']),
    '',
    `## توصيات`,
    ...buildRecommendations(input.kpis, input.bottlenecks).map((x) => `- ${x}`),
    '',
    `## افتراضات`,
    ...buildAssumptions(input.profile).map((x) => `- ${x}`),
    '',
    `## المراجع والاستشهادات`,
    ...(citations.length ? citations.map((c, i) => `- [${i + 1}] ${c.titleAr}${c.url ? ` — ${c.url}` : ''}${c.noteAr ? ` — ${c.noteAr}` : ''}`) : ['- لا يوجد']),
  ].join('\n');
  return md;
}

export function buildApprovalPacketSections(input: PacketBuildInput): ApprovalPacketSections {
  const top = input.bottlenecks[0];
  const citations = input.citations || [];

  const recommendationsAr = buildRecommendations(input.kpis, input.bottlenecks);
  const executiveSummaryAr = buildExecutiveSummary(input, top);
  const decisionRequestAr = buildDecisionRequest(input.kpis);
  const assumptionsAr = buildAssumptions(input.profile);

  const eventDeckOutlineMarkdown = buildDeckOutline(input);
  const strategyMarkdown = buildStrategyDoc(input);
  const operationalFeasibilityMarkdown = buildOperationalFeasibility(input);
  const packetMarkdown = buildPacketMarkdown(input, citations);

  return {
    executiveSummaryAr,
    decisionRequestAr,
    assumptionsAr,
    kpis: input.kpis,
    bottlenecks: input.bottlenecks,
    recommendationsAr,
    scenarioNotesAr: input.scenarioNotesAr,
    citations,
    artifacts: {
      eventDeckOutlineMarkdown,
      strategyMarkdown,
      operationalFeasibilityMarkdown,
      packetMarkdown,
    },
  };
}
