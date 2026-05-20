import type {
  WorkflowTemplate,
  WorkflowTemplateStep,
  WorkflowDomain,
  WorkflowIntent,
  WorkflowTrigger,
  WorkflowComplexity,
  WorkflowInstance,
  WorkflowRunSimulation,
} from './types';

type DomainMeta = { key: WorkflowDomain; titleAr: string; tags: string[]; defaultAudience: WorkflowTemplate['audience'] };
type IntentMeta = { key: WorkflowIntent; titleAr: string; baseKpis: string[]; outputs: string[]; requiresApproval: boolean };
type TriggerMeta = { key: WorkflowTrigger; titleAr: string; channel: WorkflowTemplate['channel']; scheduleBias: boolean };

const DOMAINS: DomainMeta[] = [
  { key: 'heritage', titleAr: 'التراث', tags: ['تراث', 'توثيق', 'حماية'], defaultAudience: 'mixed' },
  { key: 'museums', titleAr: 'المتاحف', tags: ['متحف', 'زوار', 'مقتنيات'], defaultAudience: 'public_visitor' },
  { key: 'events', titleAr: 'الفعاليات', tags: ['فعالية', 'برنامج', 'تشغيل'], defaultAudience: 'mixed' },
  { key: 'tourism', titleAr: 'السياحة الثقافية', tags: ['سياحة', 'مسارات', 'تجربة'], defaultAudience: 'public_visitor' },
  { key: 'artisan', titleAr: 'الحرف', tags: ['حرف', 'منتجات', 'تمكين'], defaultAudience: 'partners' },
  { key: 'food_culture', titleAr: 'الثقافة الغذائية', tags: ['مذاق', 'تراث غذائي', 'وصفات'], defaultAudience: 'public_visitor' },
  { key: 'literature', titleAr: 'الأدب', tags: ['أدب', 'نصوص', 'قراءة'], defaultAudience: 'mixed' },
  { key: 'music', titleAr: 'الموسيقى', tags: ['موسيقى', 'عروض', 'برنامج'], defaultAudience: 'public_visitor' },
  { key: 'performance', titleAr: 'الفنون الأدائية', tags: ['عرض', 'مسرح', 'برمجة'], defaultAudience: 'mixed' },
  { key: 'education', titleAr: 'التعليم الثقافي', tags: ['تعلم', 'ورش', 'محتوى'], defaultAudience: 'mixed' },
  { key: 'community', titleAr: 'المجتمع', tags: ['مبادرات', 'مشاركة', 'متطوعين'], defaultAudience: 'mixed' },
  { key: 'destination', titleAr: 'الوجهات', tags: ['وجهة', 'تموضع', 'هوية'], defaultAudience: 'executives' },
];

const INTENTS: IntentMeta[] = [
  { key: 'campaign_launch', titleAr: 'إطلاق حملة', baseKpis: ['Reach', 'CTR', 'Leads'], outputs: ['campaign_brief', 'content_plan', 'channel_matrix'], requiresApproval: true },
  { key: 'editorial_pipeline', titleAr: 'خط تحرير محتوى', baseKpis: ['Turnaround', 'QualityScore', 'PublishRate'], outputs: ['draft_article', 'editorial_checklist'], requiresApproval: true },
  { key: 'visitor_experience_design', titleAr: 'تصميم تجربة زائر', baseKpis: ['NPS', 'CompletionRate', 'DwellTime'], outputs: ['experience_script', 'wayfinding_notes'], requiresApproval: true },
  { key: 'approval_governance', titleAr: 'حوكمة واعتمادات', baseKpis: ['SLA Compliance', 'ReworkRate', 'DecisionTime'], outputs: ['approval_packet', 'risk_register'], requiresApproval: true },
  { key: 'curation_programming', titleAr: 'برمجة وقيّمية', baseKpis: ['ProgramFill', 'AudienceMix', 'ContentUtilization'], outputs: ['program_schedule', 'curation_notes'], requiresApproval: false },
  { key: 'operations_readiness', titleAr: 'جاهزية تشغيلية', baseKpis: ['ChecklistCoverage', 'IssueClosure', 'ReadinessScore'], outputs: ['ops_checklist', 'incident_playbook'], requiresApproval: false },
  { key: 'analytics_reporting', titleAr: 'تحليلات وتقارير', baseKpis: ['DataFreshness', 'InsightCount', 'Actionability'], outputs: ['exec_report', 'dashboard_snapshot'], requiresApproval: false },
  { key: 'partnership_activation', titleAr: 'تفعيل شراكات', baseKpis: ['PartnerActivation', 'PipelineValue', 'Conversion'], outputs: ['partner_brief', 'proposal_pack'], requiresApproval: true },
  { key: 'obligation_followup', titleAr: 'متابعة الالتزامات', baseKpis: ['OnTimeRate', 'OverdueCount', 'ClosureTime'], outputs: ['obligation_status', 'reminder_log'], requiresApproval: false },
];

const TRIGGERS: TriggerMeta[] = [
  { key: 'manual_request', titleAr: 'طلب يدوي', channel: 'dashboard', scheduleBias: false },
  { key: 'scheduled_daily', titleAr: 'تشغيل يومي مجدول', channel: 'dashboard', scheduleBias: true },
  { key: 'scheduled_weekly', titleAr: 'تشغيل أسبوعي مجدول', channel: 'email', scheduleBias: true },
  { key: 'event_created', titleAr: 'عند إنشاء فعالية', channel: 'api', scheduleBias: false },
  { key: 'content_submitted', titleAr: 'عند إرسال محتوى', channel: 'web', scheduleBias: false },
  { key: 'approval_required', titleAr: 'عند الحاجة لاعتماد', channel: 'whatsapp', scheduleBias: false },
];

const BASE_INPUTS: WorkflowTemplate['inputSchema'] = [
  { key: 'organizationId', labelAr: 'معرف الجهة', type: 'string', required: true },
  { key: 'projectId', labelAr: 'معرف المشروع', type: 'string', required: false },
  { key: 'brief', labelAr: 'وصف الطلب', type: 'string', required: true },
  { key: 'deadline', labelAr: 'الموعد النهائي', type: 'date', required: false },
  { key: 'metadata', labelAr: 'بيانات إضافية', type: 'json', required: false },
];

function slug(...parts: string[]) {
  return parts.join('_').replace(/[^a-z0-9_]+/g, '_');
}

function titleize(domain: DomainMeta, intent: IntentMeta, trigger: TriggerMeta) {
  return `${intent.titleAr} ${domain.titleAr} - ${trigger.titleAr}`;
}

function buildSteps(domain: DomainMeta, intent: IntentMeta, trigger: TriggerMeta, complexity: WorkflowComplexity): WorkflowTemplateStep[] {
  const advanced = complexity === 'advanced';
  const standardOrMore = complexity !== 'starter';
  const steps: WorkflowTemplateStep[] = [
    { id: 's1', key: 'collect', nameAr: 'استقبال الطلب وتجهيز المدخلات', type: 'collect', actor: 'system', isRequired: true, estimatedMinutes: 2, outputs: ['normalized_input'] },
    { id: 's2', key: 'classify', nameAr: `تصنيف الطلب ضمن ${domain.titleAr}`, type: 'classify', actor: 'ai', isRequired: true, estimatedMinutes: 2, usesAgent: standardOrMore, outputs: ['workflow_context'] },
    { id: 's3', key: 'retrieve', nameAr: 'استرجاع المعرفة المرجعية RAG', type: 'retrieve', actor: 'ai', isRequired: true, estimatedMinutes: 3, usesRag: true, outputs: ['rag_context'] },
    { id: 's4', key: 'plan', nameAr: 'بناء خطة التنفيذ وخريطة المهام', type: 'plan', actor: 'ai', isRequired: true, estimatedMinutes: 3, usesAgent: true, outputs: ['execution_plan'] },
    { id: 's5', key: 'draft', nameAr: 'توليد المسودة الأولية', type: 'draft', actor: 'ai', isRequired: true, estimatedMinutes: 6, usesRag: true, usesAgent: standardOrMore, outputs: intent.outputs.slice(0, 2) },
    { id: 's6', key: 'score', nameAr: 'تقييم الجودة والمخاطر آليًا', type: 'score', actor: 'ai', isRequired: standardOrMore, estimatedMinutes: 2, outputs: ['quality_score', 'risk_flags'] },
    { id: 's7', key: 'review', nameAr: 'مراجعة بشرية تخصصية', type: 'review', actor: 'human', isRequired: true, estimatedMinutes: advanced ? 12 : 8, outputs: ['review_notes'] },
  ];

  if (intent.requiresApproval || trigger.key === 'approval_required') {
    steps.push({ id: 's8', key: 'approve', nameAr: 'تمرير حوكمة واعتماد', type: 'approve', actor: 'human', isRequired: true, estimatedMinutes: 6, outputs: ['approval_decision'] });
  }

  steps.push(
    { id: 's9', key: 'publish', nameAr: 'إخراج وتسليم المخرجات', type: 'publish', actor: 'system', isRequired: true, estimatedMinutes: 2, outputs: ['delivery_bundle'] },
    { id: 's10', key: 'notify', nameAr: 'إشعار الأطراف المعنية', type: 'notify', actor: 'system', isRequired: true, estimatedMinutes: 1, outputs: ['notifications'] },
    { id: 's11', key: 'report', nameAr: 'تحديث مؤشرات الأداء وسجل التشغيل', type: 'report', actor: 'system', isRequired: true, estimatedMinutes: 2, outputs: ['run_metrics'] },
  );

  if (advanced || trigger.scheduleBias) {
    steps.push({ id: 's12', key: 'archive', nameAr: 'أرشفة السياق وإعادة الاستخدام', type: 'archive', actor: 'system', isRequired: true, estimatedMinutes: 1, outputs: ['knowledge_snapshot'] });
  }

  if (advanced) {
    steps.push({ id: 's13', key: 'sync', nameAr: 'مزامنة مع الأنظمة الخارجية', type: 'sync', actor: 'system', isRequired: true, estimatedMinutes: 2, outputs: ['sync_receipts'] });
  }

  return steps;
}

export function generateCulturalWorkflowCatalog(): WorkflowTemplate[] {
  const out: WorkflowTemplate[] = [];
  let n = 0;
  for (const domain of DOMAINS) {
    for (const intent of INTENTS) {
      for (const trigger of TRIGGERS) {
        n += 1;
        const complexity: WorkflowComplexity = n % 5 === 0 ? 'advanced' : (n % 2 === 0 ? 'standard' : 'starter');
        const steps = buildSteps(domain, intent, trigger, complexity);
        const ragEnabled = steps.some((s) => s.usesRag);
        const agentMode = complexity === 'advanced' ? 'planner_worker' : (complexity === 'standard' ? 'single_agent' : 'none');
        const code = slug('wf', domain.key, intent.key, trigger.key);
        out.push({
          id: `wft_${String(n).padStart(4, '0')}`,
          code,
          version: 1,
          nameAr: titleize(domain, intent, trigger),
          summaryAr: `سير عمل ثقافي جاهز يغطي ${intent.titleAr} في مجال ${domain.titleAr} ويتم تشغيله عبر ${trigger.titleAr}.`,
          domain: domain.key,
          intent: intent.key,
          trigger: trigger.key,
          audience: domain.defaultAudience,
          channel: trigger.channel,
          complexity,
          tags: [...domain.tags, trigger.titleAr, intent.titleAr, 'LLM', 'RAG', 'Agent'],
          integrations: [
            'projects',
            'content',
            'approvals',
            'analytics',
            ragEnabled ? 'knowledge_base' : 'knowledge_optional',
            'notifications',
          ],
          kpis: [...intent.baseKpis, 'CycleTime', 'HumanTouches', 'AutomationRate'],
          inputSchema: [
            ...BASE_INPUTS,
            { key: 'language', labelAr: 'لغة الإخراج', type: 'string', required: false },
            { key: 'audienceSegment', labelAr: 'الشريحة المستهدفة', type: 'string', required: false },
            { key: 'priority', labelAr: 'الأولوية', type: 'string', required: false },
          ],
          outputArtifacts: [
            { key: 'primary_output', labelAr: 'المخرج الرئيسي', format: 'markdown' },
            { key: 'run_summary', labelAr: 'ملخص التنفيذ', format: 'json' },
            { key: 'audit_note', labelAr: 'ملاحظة تدقيق', format: 'text' },
            ...(intent.key === 'analytics_reporting' ? [{ key: 'metrics_csv', labelAr: 'مؤشرات CSV', format: 'csv' as const }] : []),
          ],
          steps,
          aiProfile: {
            ragEnabled,
            agentMode,
            preferredModelClass: complexity === 'advanced' ? 'reasoning' : (complexity === 'standard' ? 'balanced' : 'fast'),
            qualityGate: complexity === 'starter' ? 'manual_review' : 'auto_score_then_review',
          },
        });
      }
    }
  }
  return out;
}

let _catalogCache: WorkflowTemplate[] | null = null;
export function getWorkflowCatalog(): WorkflowTemplate[] {
  if (!_catalogCache) _catalogCache = generateCulturalWorkflowCatalog();
  return _catalogCache;
}

export function summarizeWorkflowCatalog() {
  const catalog = getWorkflowCatalog();
  const byDomain: Record<string, number> = {};
  const byIntent: Record<string, number> = {};
  const byTrigger: Record<string, number> = {};
  const byComplexity: Record<string, number> = {};
  for (const w of catalog) {
    byDomain[w.domain] = (byDomain[w.domain] || 0) + 1;
    byIntent[w.intent] = (byIntent[w.intent] || 0) + 1;
    byTrigger[w.trigger] = (byTrigger[w.trigger] || 0) + 1;
    byComplexity[w.complexity] = (byComplexity[w.complexity] || 0) + 1;
  }
  return { total: catalog.length, byDomain, byIntent, byTrigger, byComplexity };
}

export function findWorkflowTemplate(idOrCode: string): WorkflowTemplate | undefined {
  const v = String(idOrCode || '').trim();
  if (!v) return undefined;
  return getWorkflowCatalog().find((x) => x.id === v || x.code === v);
}

export function filterWorkflowCatalog(params?: {
  q?: string;
  domain?: WorkflowDomain;
  intent?: WorkflowIntent;
  trigger?: WorkflowTrigger;
  complexity?: WorkflowComplexity;
  audience?: WorkflowTemplate['audience'];
  limit?: number;
}): WorkflowTemplate[] {
  const q = (params?.q || '').trim().toLowerCase();
  const rows = getWorkflowCatalog().filter((x) =>
    (!params?.domain || x.domain === params.domain) &&
    (!params?.intent || x.intent === params.intent) &&
    (!params?.trigger || x.trigger === params.trigger) &&
    (!params?.complexity || x.complexity === params.complexity) &&
    (!params?.audience || x.audience === params.audience) &&
    (!q || x.nameAr.toLowerCase().includes(q) || x.summaryAr.toLowerCase().includes(q) || x.tags.some((t) => t.toLowerCase().includes(q)) || x.code.toLowerCase().includes(q))
  );
  const limit = Math.max(1, Math.min(200, params?.limit ?? 50));
  return rows.slice(0, limit);
}

export function instantiateWorkflow(params: {
  templateId: string;
  organizationId?: string;
  projectId?: string;
  createdByUserId?: string;
  parameters?: Record<string, unknown>;
}): WorkflowInstance {
  const t = findWorkflowTemplate(params.templateId);
  if (!t) throw new Error('Workflow template not found');
  const now = new Date().toISOString();
  return {
    id: `wfi_${Math.random().toString(36).slice(2, 10)}`,
    templateId: t.id,
    code: t.code,
    nameAr: t.nameAr,
    organizationId: params.organizationId,
    projectId: params.projectId,
    status: 'draft',
    parameters: { language: 'ar', priority: 'normal', ...(params.parameters || {}) },
    createdAt: now,
    updatedAt: now,
    createdByUserId: params.createdByUserId,
  };
}

export function simulateWorkflowRun(input: {
  templateId: string;
  instanceId?: string;
  hasKnowledge?: boolean;
  hasApprovalActor?: boolean;
  priority?: 'low' | 'normal' | 'high';
}): WorkflowRunSimulation {
  const t = findWorkflowTemplate(input.templateId);
  if (!t) throw new Error('Workflow template not found');
  const trace = t.steps.map((s, idx) => {
    let status: 'done' | 'skipped' | 'needs_input' | 'queued' = 'done';
    let noteAr = '';
    if (s.type === 'retrieve' && input.hasKnowledge === false) {
      status = 'needs_input';
      noteAr = 'لا توجد قاعدة معرفة كافية لهذا التشغيل';
    }
    if (s.type === 'approve' && input.hasApprovalActor === false) {
      status = 'needs_input';
      noteAr = 'لا يوجد معتمد مخصص للمسار';
    }
    if (status === 'done' && s.actor === 'ai' && t.aiProfile.preferredModelClass === 'reasoning') {
      noteAr = 'تم اقتراح استخدام نموذج reasoning عبر vLLM';
    }
    return {
      id: `${s.id}_${idx + 1}`,
      nameAr: s.nameAr,
      status,
      durationSecondsEstimate: s.estimatedMinutes * 60,
      noteAr: noteAr || undefined,
    };
  });

  const hasBlockingNeedsInput = trace.some((x) => x.status === 'needs_input');
  const aiCallsEstimate = t.steps.filter((s) => s.actor === 'ai').length + (t.aiProfile.agentMode === 'planner_worker' ? 2 : 0);
  const humanCheckpoints = t.steps.filter((s) => s.actor === 'human').length;
  const totalMinutes = Math.ceil(t.steps.reduce((sum, s) => sum + s.estimatedMinutes, 0) * (input.priority === 'high' ? 0.85 : 1));
  const generatedArtifacts = t.outputArtifacts.map((x) => `${x.key}.${x.format === 'markdown' ? 'md' : x.format}`);
  const automationRate = Number((((t.steps.length - humanCheckpoints) / t.steps.length) * 100).toFixed(1));
  const qualityScore = hasBlockingNeedsInput ? 62 : (t.aiProfile.preferredModelClass === 'reasoning' ? 88 : 81);

  return {
    runId: `wfr_${Math.random().toString(36).slice(2, 10)}`,
    instanceId: input.instanceId,
    templateId: t.id,
    status: hasBlockingNeedsInput ? 'needs_input' : 'completed',
    totalSteps: t.steps.length,
    estimatedDurationMinutes: totalMinutes,
    aiCallsEstimate,
    humanCheckpoints,
    generatedArtifacts,
    trace,
    metricsPreview: {
      automationRate,
      qualityScore,
      cycleTimeMinutes: totalMinutes,
      manualTouches: humanCheckpoints,
    },
    recommendations: [
      t.aiProfile.ragEnabled ? 'فعّل RAG بالمراجع المحلية لرفع الدقة قبل النشر' : 'RAG اختياري لهذا القالب',
      t.aiProfile.agentMode !== 'none' ? 'يفضل تشغيل Agent planner-worker عند المهام المركبة' : 'قالب سريع يمكن تشغيله بوضع LLM مباشر',
      'اربط التتبع بسجل التدقيق ومؤشرات SLA داخل لوحة التحليلات',
    ],
    createdAt: new Date().toISOString(),
  };
}

export function buildWorkflowExportPack(ids: string[]) {
  const selected = ids.map((id) => findWorkflowTemplate(id)).filter(Boolean) as WorkflowTemplate[];
  const manifest = {
    exportedAt: new Date().toISOString(),
    count: selected.length,
    ids: selected.map((x) => x.id),
    codes: selected.map((x) => x.code),
  };
  const n8nLike = selected.map((x) => ({
    name: x.nameAr,
    nodes: x.steps.map((s, i) => ({
      id: `${x.id}_${s.id}`,
      name: s.nameAr,
      type: `atheel.${s.type}`,
      position: [i * 220, 100],
      parameters: { actor: s.actor, usesRag: !!s.usesRag, usesAgent: !!s.usesAgent },
    })),
    connections: x.steps.slice(0, -1).reduce((acc, _s, i) => {
      const from = `${x.id}_${x.steps[i].id}`;
      const to = `${x.id}_${x.steps[i + 1].id}`;
      acc[from] = [{ node: to, type: 'main' }];
      return acc;
    }, {} as Record<string, Array<{ node: string; type: string }>>),
    meta: { code: x.code, domain: x.domain, intent: x.intent, trigger: x.trigger, complexity: x.complexity, aiProfile: x.aiProfile },
  }));
  return { manifest, templates: selected, n8nLike };
}
