export const heritageAgentCatalog = [
  {
    id: 'heritage_safety_agent',
    purposeAr: 'فحص المخاطر على الأصل التراثي واقتراح الضوابط.',
    defaultTools: ['knowledge_search', 'heritage_safety', 'policy_runtime'],
  },
  {
    id: 'authenticity_agent',
    purposeAr: 'قياس اتساق التجربة والسرد مع روح المكان والأصالة.',
    defaultTools: ['knowledge_search', 'narratives', 'evidence_graph'],
  },
  {
    id: 'interpretation_agent',
    purposeAr: 'بناء طبقة تفسيرية للزائر والمحتوى الإرشادي.',
    defaultTools: ['knowledge_search', 'visitor_guide', 'studio'],
  },
] as const;
