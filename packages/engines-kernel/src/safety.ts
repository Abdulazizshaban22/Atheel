export type SafetyComplianceItem = {
  topicKey: string;
  topicLabelAr: string;
  severity: 'low' | 'medium' | 'high';
  requirementId?: string | null;
  snippetAr: string;
  page?: number | null;
  standardRefs: Array<{ name: string; ref: string }>; // citations as URLs or standard IDs
  obligationSuggestion?: {
    type: string;
    titleAr: string;
    dueOffsetDaysBeforeSubmission: number; // relative to competition dueAt
  };
};

function uniqBy<T>(arr: T[], keyFn: (x: T) => string) {
  const out: T[] = [];
  const seen = new Set<string>();
  for (const x of arr) {
    const k = keyFn(x);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(x);
  }
  return out;
}

export function detectSafetyCompliance(requirements: Array<{ id?: string; textAr?: string; sourceRefJson?: any }>): SafetyComplianceItem[] {
  const topics: Array<{ key: string; labelAr: string; severity: SafetyComplianceItem['severity']; keywords: string[]; refs: Array<{ name: string; ref: string }>; suggestion: SafetyComplianceItem['obligationSuggestion'] }>= [
    {
      key: 'sustainability',
      labelAr: 'استدامة الفعالية',
      severity: 'medium',
      keywords: ['استدامة', 'ISO 20121', 'مخلفات', 'نفايات', 'طاقة', 'مياه', 'انبعاث', 'recycle', 'waste', 'energy', 'water'],
      refs: [{ name: 'ISO 20121', ref: 'https://www.iso.org/standard/54552.html' }],
      suggestion: { type: 'sustainability', titleAr: 'خطة استدامة الفعالية وفق ISO 20121', dueOffsetDaysBeforeSubmission: 3 },
    },
    {
      key: 'crowd_safety',
      labelAr: 'سلامة الحشود والإخلاء',
      severity: 'high',
      keywords: ['حشود', 'إخلاء', 'مخارج', 'سعة', 'ازدحام', 'حواجز', 'بوابات', 'طوارئ', 'الدفاع المدني', 'إطفاء', 'NFPA', 'crowd', 'evacuation'],
      refs: [
        { name: 'The Purple Guide', ref: 'https://www.thepurpleguide.co.uk/' },
        { name: 'HSE crowd safety guide', ref: 'https://www.dorsetcouncil.gov.uk/documents/35024/295806/HSE%2Bpurple%2Bguide.pdf/4d4626a7-9062-d246-b901-f7b26a7b2b9e' },
      ],
      suggestion: { type: 'crowd_safety', titleAr: 'خطة إدارة الحشود ومسارات الإخلاء', dueOffsetDaysBeforeSubmission: 2 },
    },
    {
      key: 'medical',
      labelAr: 'الإسعافات الأولية والرعاية الطبية',
      severity: 'high',
      keywords: ['إسعاف', 'طب', 'medical', 'first aid', 'عيادة', 'نقطة إسعاف'],
      refs: [{ name: 'The Purple Guide', ref: 'https://www.thepurpleguide.co.uk/' }],
      suggestion: { type: 'compliance', titleAr: 'خطة الإسعافات الأولية ونقاط الرعاية', dueOffsetDaysBeforeSubmission: 2 },
    },
    {
      key: 'fire_safety',
      labelAr: 'سلامة الحريق والوقاية',
      severity: 'high',
      keywords: ['حريق', 'إطفاء', 'طفايات', 'fire', 'طفاية', 'إنذار'],
      refs: [{ name: 'NFPA crowd safety note', ref: 'https://www.nfpa.org/news-blogs-and-articles/blogs/2022/11/01/strategies-for-crowd-management-safety' }],
      suggestion: { type: 'compliance', titleAr: 'خطة سلامة الحريق والوقاية', dueOffsetDaysBeforeSubmission: 2 },
    },
    {
      key: 'security',
      labelAr: 'الأمن والحراسة والتفتيش',
      severity: 'medium',
      keywords: ['أمن', 'حراسة', 'تفتيش', 'بوابات أمنية', 'كاميرات', 'security'],
      refs: [{ name: 'Best practice safety', ref: 'https://www.thepurpleguide.co.uk/' }],
      suggestion: { type: 'security', titleAr: 'خطة الأمن والتفتيش ونقاط التحكم', dueOffsetDaysBeforeSubmission: 2 },
    },
    {
      key: 'accessibility',
      labelAr: 'الإتاحة وذوو الإعاقة',
      severity: 'medium',
      keywords: ['ذوي الإعاقة', 'إتاحة', 'accessibility', 'منحدر', 'كرسي متحرك', 'لغة إشارة'],
      refs: [{ name: 'Inclusive access best practice', ref: 'https://www.thepurpleguide.co.uk/' }],
      suggestion: { type: 'accessibility', titleAr: 'خطة الإتاحة وتجربة ذوي الإعاقة', dueOffsetDaysBeforeSubmission: 3 },
    },
    {
      key: 'licensing',
      labelAr: 'التراخيص والتصاريح',
      severity: 'high',
      keywords: ['ترخيص', 'تصاريح', 'تصريح', 'رخصة', 'اعتماد', 'اشتراطات', 'permit', 'license'],
      refs: [{ name: 'OCDS lifecycle note', ref: 'https://standard.open-contracting.org/latest/en/' }],
      suggestion: { type: 'licensing', titleAr: 'تجهيز مسار التراخيص والتصاريح المطلوبة', dueOffsetDaysBeforeSubmission: 4 },
    },
    {
      key: 'insurance',
      labelAr: 'التأمين والمسؤولية',
      severity: 'medium',
      keywords: ['تأمين', 'مسؤولية', 'liability', 'insurance'],
      refs: [{ name: 'Event risk best practice', ref: 'https://www.thepurpleguide.co.uk/' }],
      suggestion: { type: 'insurance', titleAr: 'تحديد التأمينات والمسؤوليات', dueOffsetDaysBeforeSubmission: 4 },
    },
  ];

  const out: SafetyComplianceItem[] = [];
  for (const r of requirements || []) {
    const text = String((r as any).textAr || '').trim();
    if (!text) continue;
    const lower = text.toLowerCase();

    for (const t of topics) {
      if (t.keywords.some((k) => lower.includes(String(k).toLowerCase()))) {
        out.push({
          topicKey: t.key,
          topicLabelAr: t.labelAr,
          severity: t.severity,
          requirementId: (r as any).id || null,
          snippetAr: text.slice(0, 260),
          page: (r as any).sourceRefJson?.page ?? null,
          standardRefs: t.refs,
          obligationSuggestion: t.suggestion,
        });
      }
    }
  }

  return uniqBy(out, (x) => `${x.topicKey}|${x.requirementId || ''}|${x.snippetAr}`);
}
