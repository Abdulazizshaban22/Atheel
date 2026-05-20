export interface AgentPlanStep {
  id: string;
  type: 'clarify' | 'retrieve' | 'draft' | 'review' | 'publish_ready';
  title: string;
  owner: 'ai' | 'human';
  status: 'pending' | 'done' | 'needs_input';
  notes?: string;
}

export function buildCultureAgentPlan(input: {
  objective: string;
  hasKnowledgeContext: boolean;
  requiresApproval?: boolean;
}): AgentPlanStep[] {
  const steps: AgentPlanStep[] = [
    {
      id: 's1',
      type: 'clarify',
      title: 'تحليل الهدف وتحديد نوع المخرج',
      owner: 'ai',
      status: 'done',
      notes: 'تم توليد خطة أولية وفق صياغة الطلب.',
    },
    {
      id: 's2',
      type: 'retrieve',
      title: 'استرجاع المعرفة المرجعية من قاعدة المشروع',
      owner: 'ai',
      status: input.hasKnowledgeContext ? 'done' : 'needs_input',
      notes: input.hasKnowledgeContext ? 'تم العثور على سياقات مناسبة.' : 'لا توجد سياقات كافية، يلزم تغذية معرفة إضافية.',
    },
    {
      id: 's3',
      type: 'draft',
      title: 'توليد مسودة أولية للمحتوى أو المهمة',
      owner: 'ai',
      status: input.hasKnowledgeContext ? 'pending' : 'needs_input',
    },
    {
      id: 's4',
      type: 'review',
      title: 'مراجعة بشرية ثقافية ولغوية',
      owner: 'human',
      status: 'pending',
    },
  ];

  if (input.requiresApproval) {
    steps.push({
      id: 's5',
      type: 'publish_ready',
      title: 'رفع للاعتماد قبل النشر',
      owner: 'human',
      status: 'pending',
      notes: 'يوصى بربطها بمسار الموافقات الحالي داخل النظام.',
    });
  }

  return steps;
}
