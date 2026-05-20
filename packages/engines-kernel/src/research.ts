export type ResearchInsight = {
  version: string;
  generatedAt: string;
  titleAr: string;
  summaryAr: string;
  keyFindingsAr: string[];
  designImplicationsAr: string[];
  measurementIdeasAr: string[];
  recommendedTemplates: Array<{ code: string; titleAr: string; applyTo: 'visitor_journey' | 'program_zones' | 'interaction' | 'operations'; notesAr: string }>;
};

function norm(s: any) {
  return String(s ?? '').replace(/\s+/g, ' ').trim();
}

export function extractResearchInsightHeuristic(input: { title: string; abstractAr?: string | null; fullTextAr?: string | null }): ResearchInsight {
  const titleAr = norm(input.title);
  const text = norm(input.fullTextAr || input.abstractAr || '').slice(0, 9000);
  const lower = text.toLowerCase();

  const findings: string[] = [];
  const implications: string[] = [];
  const measures: string[] = [];

  if (/(نية|revisit|العودة|intention)/.test(lower)) {
    findings.push('النية للعودة ترتبط غالبًا بتجربة متماسكة وسهولة الحركة وجودة الخدمات.');
    implications.push('تصميم رحلة زائر واضحة، وتخفيف الاحتكاك في الدخول والطوابير، يرفع نية العودة.');
    measures.push('قياس نية العودة عبر استبيان قصير عند الخروج.');
  }

  if (/(صورة الوجهة|destination image|سمعة)/.test(lower)) {
    findings.push('الحدث الكبير يعيد تشكيل صورة المدينة أو الوجهة لدى الزوار.');
    implications.push('إبراز الهوية المحلية عبر السرد والتجربة يزيد أثر الحدث على صورة الوجهة.');
    measures.push('قياس تحسن صورة الوجهة عبر أسئلة قبل وبعد الزيارة.');
  }

  if (/(دوافع|push|pull|motivation)/.test(lower)) {
    findings.push('الدوافع تتوزع بين تجربة جديدة، تواصل اجتماعي، تعلم، وهروب من الروتين.');
    implications.push('وزن البرنامج بين محتوى تعلمي وتجارب تفاعلية ومناطق تواصل اجتماعي.');
    measures.push('قياس الدوافع عبر فئات اختيارية عند حجز التذكرة أو عند الدخول.');
  }

  if (/(ازدحام|crowd|طوابير|queue)/.test(lower)) {
    findings.push('الازدحام والطوابير من أكبر مسببات انخفاض الرضا.');
    implications.push('توزيع مناطق جاذبة متعددة وتطبيق موازنة الحشود يقلل الضغط.');
    measures.push('قياس متوسط زمن الطابور في نقاط رئيسية.');
  }

  if (!findings.length) {
    findings.push('تم التقاط إشارات عامة قابلة للتحويل إلى قوالب تشغيلية داخل أثيل.');
    implications.push('استخرج الفرضيات التشغيلية من النص ثم اربطها بمقاييس داخل الرادار وتجربة الزائر.');
    measures.push('تحديد KPI واحد على الأقل لكل فرضية.');
  }

  const templates = [
    {
      code: 'vj_core_flow',
      titleAr: 'قالب رحلة زائر أساسي',
      applyTo: 'visitor_journey' as const,
      notesAr: '6 خطوات: استقبال، اكتشاف، تفاعل، استراحة، ذروة، خروج. يثبت نفسه في الفعاليات الكبرى.',
    },
    {
      code: 'queue_control',
      titleAr: 'قالب موازنة الحشود والطوابير',
      applyTo: 'operations' as const,
      notesAr: 'نقاط قياس، أهداف زمن طابور، وخطة تحويل الزوار لمناطق بديلة.',
    },
    {
      code: 'micro_quests',
      titleAr: 'قالب تفاعل داخل الموقع',
      applyTo: 'interaction' as const,
      notesAr: 'مهام قصيرة وأختام مناطق بدون تسويق خارجي، لرفع التفاعل وتوزيع الحشود.',
    },
  ];

  return {
    version: 'wave31_v1',
    generatedAt: new Date().toISOString(),
    titleAr,
    summaryAr: 'ملخص تشغيلي مستخرج من نص أكاديمي، محول إلى نتائج قابلة للتطبيق داخل تجربة الزائر ومسارات الفعالية.',
    keyFindingsAr: findings.slice(0, 7),
    designImplicationsAr: implications.slice(0, 7),
    measurementIdeasAr: measures.slice(0, 7),
    recommendedTemplates: templates,
  };
}
