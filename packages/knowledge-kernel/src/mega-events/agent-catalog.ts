export const MEGA_EVENTS_AGENT_CATALOG = [
  {
    id: 'mega_event_readiness_agent',
    name: 'Mega Event Readiness Agent',
    purposeAr: 'قراءة الجاهزية التشغيلية والاعتمادات والحواجز التنفيذية قبل الإطلاق.',
    riskLevel: 'high',
    tools: ['governance', 'readiness', 'approvals', 'dashboards'],
  },
  {
    id: 'mega_event_crowd_agent',
    name: 'Mega Event Crowd Agent',
    purposeAr: 'تحليل إشارات الحشود والاختناقات والمخاطر التشغيلية وربطها بالتوأم لاحقًا.',
    riskLevel: 'high',
    tools: ['twin', 'queue', 'risks', 'dashboards'],
  },
  {
    id: 'mega_event_ops_agent',
    name: 'Mega Event Operations Agent',
    purposeAr: 'قراءة أثر الموردين والوظائف الخلفية والمخاطر على التشغيل الفعلي للحدث.',
    riskLevel: 'medium',
    tools: ['organizations', 'queue', 'impact', 'ops'],
  },
] as const;
