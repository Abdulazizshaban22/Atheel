import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@madar/db';
import {
  buildWorkflowExportPack,
  filterWorkflowCatalog,
  findWorkflowTemplate,
  instantiateWorkflow,
  simulateWorkflowRun,
  summarizeWorkflowCatalog,
} from '@madar/workflow-kernel';
import type { WorkflowComplexity, WorkflowDomain, WorkflowIntent, WorkflowTrigger } from '@madar/workflow-kernel';
import {
  applyExecutionAction,
  createExecutionFromGraph,
  createExecutionFromTemplate,
  sortQueue,
  tickExecution as runtimeTickExecution,
  tickExecutionWithHandlers as runtimeTickExecutionWithHandlers,
} from '@madar/runtime-kernel';
import type { RuntimeExecution } from '@madar/runtime-kernel';
import { QueueService } from '../queue/queue.service';
import { RealtimeService } from '../realtime/realtime.service';
import { GovernanceService } from '../governance/governance.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OutboxService } from '../outbox/outbox.service';
import { OperationalEventsService } from '../operational-events/operational-events.service';
import { throwIfProdDbError } from '../../common/db-fallback';

import { retrieveTopChunks, buildRagPrompt, buildCultureAgentPlan } from '@madar/ai-kernel';
import { SAUDI_REGIONS, CULTURE_THEMES } from '@madar/culture-sa-kernel';
import { simulateTwinFlow } from '@madar/twin-kernel';
import { buildApprovalPacketSections } from '@madar/packet-kernel';
import { buildPptxFromMarkdown } from '@madar/doc-kernel';
import { impactScore, riskScore } from '@madar/innovation-kernel';


type CatalogFilterInput = {
  q?: string;
  domain?: WorkflowDomain;
  intent?: WorkflowIntent;
  trigger?: WorkflowTrigger;
  complexity?: WorkflowComplexity;
  audience?: 'internal_team' | 'public_visitor' | 'partners' | 'executives' | 'mixed';
  limit?: number;
};

@Injectable()
export class WorkflowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
    private readonly realtime: RealtimeService,
    private readonly governance: GovernanceService,
    private readonly notifications: NotificationsService,
    private readonly outbox: OutboxService,
    private readonly events: OperationalEventsService,
  ) {}

  getSummary() {
    const summary = summarizeWorkflowCatalog();
    return {
      ...summary,
      persisted: {
        instances: await this.prisma.workflowInstance.findMany({}).length,
        runs: await this.prisma.workflowRun.findMany({}).length,
        packs: await this.prisma.workflowPack.findMany({}).length,
        executions: await this.prisma.workflowExecution.findMany({}).length,
      },
    };
  }

  listCatalog(filters: CatalogFilterInput) {
    const items = filterWorkflowCatalog(filters);
    return {
      items,
      totalMatched: items.length,
      requestedLimit: filters.limit ?? 50,
      catalogTotal: summarizeWorkflowCatalog().total,
    };
  }

  getTemplate(idOrCode: string) {
    const template = findWorkflowTemplate(idOrCode);
    if (!template) throw new NotFoundException('Workflow template not found');
    return template;
  }


  /**
   * Returns a React Flow compatible graph for the template.
   * If a custom graph is saved, it will be returned; otherwise a default graph is generated from steps.
   */
  async getTemplateGraph(idOrCode: string): Promise<{ nodes: any[]; edges: any[]; version: number; templateId: string }> {
    const template = this.getTemplate(idOrCode) as any;

    const model = (this.prisma as Record<string, unknown>).workflowTemplateGraph;
    let saved: any | null = null;
    if (model?.findUnique) {
      saved = await model.findUnique({ where: { templateId: template.id } }).catch(() => null);
    }

    if (saved?.nodesJson && saved?.edgesJson) {
      return {
        templateId: template.id,
        version: 1,
        nodes: JSON.parse(saved.nodesJson || '[]'),
        edges: JSON.parse(saved.edgesJson || '[]'),
      };
    }

    // Default graph (simple vertical layout)
    const nodes = (template.steps || []).map((s: any, idx: number) => ({
      id: s.id,
      type: 'step',
      position: { x: 40, y: 40 + idx * 120 },
      data: {
        label: s.nameAr || s.titleAr || s.id,
        actor: s.actor || 'system',
        estimatedMinutes: s.estimatedMinutes || s.estimatedMinutesDefault || 0,
      },
    }));

    const edges = (template.steps || []).slice(0, -1).map((s: any, idx: number) => ({
      id: `e_${s.id}_${template.steps[idx + 1].id}`,
      source: s.id,
      target: template.steps[idx + 1].id,
      type: 'smoothstep',
      animated: false,
    }));

    return { templateId: template.id, version: 1, nodes, edges };
  }

  async saveTemplateGraph(idOrCode: string, body: { nodes: any[]; edges: any[]; meta?: any }) {
    const template = this.getTemplate(idOrCode) as any;
    const model = (this.prisma as Record<string, unknown>).workflowTemplateGraph;
    if (!model?.upsert) {
      // scaffold mode: no DB
      return { ok: true, templateId: template.id, persisted: false };
    }

    const nodesJson = JSON.stringify(body.nodes || []);
    const edgesJson = JSON.stringify(body.edges || []);
    const metaJson = body.meta ? JSON.stringify(body.meta) : null;

    await model.upsert({
      where: { templateId: template.id },
      update: { nodesJson, edgesJson, metaJson, updatedAt: new Date() },
      create: { templateId: template.id, nodesJson, edgesJson, metaJson },
    });

    // Best-effort: update instances of the same template to store the latest snapshot (optional).
    const instanceModel = (this.prisma as Record<string, unknown>).workflowInstance;
    if (instanceModel?.updateMany) {
      await instanceModel.updateMany({
        where: { templateId: template.id },
        data: { designerGraphJson: JSON.stringify({ templateId: template.id, version: 1, nodes: body.nodes || [], edges: body.edges || [] }) },
      }).catch(() => void 0);
    }

    return { ok: true, templateId: template.id, persisted: true };
  }

  listInstances(params?: { organizationId?: string; projectId?: string; status?: string }) {
    let items = await this.prisma.workflowInstance.findMany({});
    if (params?.organizationId) items = items.filter((x) => x.organizationId === params.organizationId);
    if (params?.projectId) items = items.filter((x) => x.projectId === params.projectId);
    if (params?.status) items = items.filter((x) => x.status === params.status);
    return { items, total: items.length };
  }

  async instantiate(body: {
    templateId: string;
    organizationId?: string;
    projectId?: string;
    parameters?: Record<string, unknown>;
    autoActivate?: boolean;
    createdByUserId?: string;
  }) {
    const instance = instantiateWorkflow({
      templateId: body.templateId,
      organizationId: body.organizationId,
      projectId: body.projectId,
      parameters: body.parameters,
      createdByUserId: body.createdByUserId,
    });
    if (body.autoActivate) {
      instance.status = 'active';
      instance.updatedAt = new Date().toISOString();
    }
    // Snapshot designer graph into the instance (so instances keep the designed layout)
    const graph = await this.getTemplateGraph(body.templateId);
    (instance as Record<string, unknown>).designerGraphJson = JSON.stringify(graph);
    (instance as Record<string, unknown>).parameters = { ...(instance as Record<string, unknown>).parameters, _designerGraph: graph };
    await this.prisma.workflowInstance.create({ data: instance);
    await this.tryPersistInstance(instance);
    return {
      instance,
      template: this.getTemplate(body.templateId),
      runtime: {
        llm: 'vLLM/OpenAI-compatible supported via AI providers',
        rag: true,
        agent: true,
      },
    };
  }

  async simulateRun(body: {
    templateId?: string;
    instanceId?: string;
    hasKnowledge?: boolean;
    hasApprovalActor?: boolean;
    priority?: 'low' | 'normal' | 'high';
    persistRun?: boolean;
  }) {
    const instance = body.instanceId ? await this.prisma.workflowInstance.findUnique({ where: { id: body.instanceId } }) : undefined;
    const templateId = body.templateId || instance?.templateId;
    if (!templateId) throw new NotFoundException('templateId or instanceId is required');
    const sim = simulateWorkflowRun({
      templateId,
      instanceId: instance?.id,
      hasKnowledge: body.hasKnowledge,
      hasApprovalActor: body.hasApprovalActor,
      priority: body.priority,
    });

    if (body.persistRun !== false) {
      const now = new Date().toISOString();
      await this.prisma.workflowRun.create({ data: {
        id: sim.runId,
        instanceId: sim.instanceId,
        templateId: sim.templateId,
        organizationId: instance?.organizationId,
        projectId: instance?.projectId,
        status: sim.status,
        totalSteps: sim.totalSteps,
        estimatedDurationMinutes: sim.estimatedDurationMinutes,
        aiCallsEstimate: sim.aiCallsEstimate,
        humanCheckpoints: sim.humanCheckpoints,
        metricsPreview: sim.metricsPreview,
        trace: sim.trace as unknown as Array<Record<string, unknown>>,
        createdAt: now,
        updatedAt: now,
      });
      await this.tryPersistRun({
        ...sim,
        organizationId: instance?.organizationId,
        projectId: instance?.projectId,
      });
    }

    return sim;
  }

  listRuns(params?: { organizationId?: string; projectId?: string; status?: string; limit?: number }) {
    let rows = await this.prisma.workflowRun.findMany({});
    if (params?.organizationId) rows = rows.filter((x) => x.organizationId === params.organizationId);
    if (params?.projectId) rows = rows.filter((x) => x.projectId === params.projectId);
    if (params?.status) rows = rows.filter((x) => x.status === params.status);
    const limit = Math.max(1, Math.min(200, params?.limit ?? 50));
    return { items: rows.slice(0, limit), total: rows.length };
  }

  listExecutions(params?: { organizationId?: string; projectId?: string; status?: string; limit?: number; sort?: 'queue' | 'createdAt' }) {
    let rows = await this.prisma.workflowExecution.findMany({});
    if (params?.organizationId) rows = rows.filter((x) => x.organizationId === params.organizationId);
    if (params?.projectId) rows = rows.filter((x) => x.projectId === params.projectId);
    if (params?.status) rows = rows.filter((x) => x.status === params.status);

    let decoded = rows.map((r) => this.decodeExecution(r));
    decoded = (params?.sort || 'queue') === 'queue'
      ? sortQueue(decoded)
      : [...decoded].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const limit = Math.max(1, Math.min(200, params?.limit ?? 50));
    return { items: decoded.slice(0, limit), total: decoded.length };
  }

  getExecution(id: string) {
    const row = await this.prisma.workflowExecution.findUnique({ where: { id: id } });
    if (!row) throw new NotFoundException('Workflow execution not found');
    const execution = this.decodeExecution(row);
    const events = await this.prisma.workflowExecutionEvent.findMany({ where: { executionId:  } }).filter((e) => e.executionId === id);
    return { execution, events };
  }

  async enqueueExecution(body: {
    templateId?: string;
    instanceId?: string;
    workflowRunId?: string;
    organizationId?: string;
    projectId?: string;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    inputs?: Record<string, unknown>;
    strategicValue?: number;
    backlogDepth?: number;
    autoStart?: boolean;
    autoApprove?: boolean;
    hasKnowledge?: boolean;
    hasApprovalActor?: boolean;
  }) {
    const instance = body.instanceId ? await this.prisma.workflowInstance.findUnique({ where: { id: body.instanceId } }) : undefined;
    const templateId = body.templateId || instance?.templateId;
    if (!templateId) throw new NotFoundException('templateId or instanceId is required');
    const template = this.getTemplate(templateId) as any;

    // Prefer designer graph (instance snapshot), otherwise load template graph.
    const designerGraph = (instance as any)?.parameters?._designerGraph || (instance as any)?._designerGraph;
    const graph = designerGraph?.nodes && designerGraph?.edges
      ? designerGraph
      : await this.getTemplateGraph(templateId);

    const execution = (graph?.nodes && graph?.edges)
      ? createExecutionFromGraph({
          id: `wfx_${Math.random().toString(36).slice(2, 10)}`,
          template,
          graph: {
            templateId: (graph as Record<string, unknown>).templateId || template.id,
            version: (graph as Record<string, unknown>).version || 1,
            nodes: (graph as Record<string, unknown>).nodes || [],
            edges: (graph as Record<string, unknown>).edges || [],
          },
          instanceId: instance?.id,
          organizationId: body.organizationId || instance?.organizationId,
          projectId: body.projectId || instance?.projectId,
          priority: body.priority,
          inputs: body.inputs,
          strategicValue: body.strategicValue,
          backlogDepth: body.backlogDepth,
        })
      : createExecutionFromTemplate({
          id: `wfx_${Math.random().toString(36).slice(2, 10)}`,
          template,
          instanceId: instance?.id,
          organizationId: body.organizationId || instance?.organizationId,
          projectId: body.projectId || instance?.projectId,
          priority: body.priority,
          inputs: body.inputs,
          strategicValue: body.strategicValue,
          backlogDepth: body.backlogDepth,
        });

    await this.prisma.workflowExecution.create({ data: this.encodeExecution(execution, body.workflowRunId));
    await this.prisma.workflowExecutionEvent.createMany({ data: [{
      id: `wfxe_${Math.random().toString(36).slice(2, 10)}`,
      executionId: execution.id,
      organizationId: execution.organizationId,
      projectId: execution.projectId,
      type: 'execution_enqueued',
      messageAr: 'تمت إضافة التنفيذ إلى طابور التشغيل',
      payload: { queueScore: execution.queueScore, priority: execution.priority },
      createdAt: new Date().toISOString(),
    }]);

    // Queue mode
    const queueMode = this.queue.getMode().mode;
    const enqueueRes = await this.queue.enqueueExecution(execution.id, { priority: execution.priority });
    const escalationRes = await this.queue.scheduleEscalation(execution.id, execution.sla.dueAt);

    // Realtime
    this.realtime.emit('execution.enqueued', {
      executionId: execution.id,
      templateId: execution.templateId,
      status: execution.status,
      queueScore: execution.queueScore,
      priority: execution.priority,
      dueAt: execution.sla?.dueAt,
      queueMode,
      jobId: (enqueueRes as Record<string, unknown>).jobId,
      escalationJobId: (escalationRes as Record<string, unknown>).jobId,
    });

    if (body.autoStart && queueMode === 'sync') {
      await this.tickExecution(execution.id, {
        hasKnowledge: body.hasKnowledge,
        hasApprovalActor: body.hasApprovalActor,
        autoApprove: body.autoApprove,
      });
      return this.getExecution(execution.id);
    }

    await this.tryPersistExecution(this.encodeExecution(execution, body.workflowRunId));
    return {
      execution,
      queued: true,
      queueMode,
      jobId: (enqueueRes as Record<string, unknown>).jobId,
      escalation: escalationRes,
    };
  }

  async tickExecution(id: string, body?: { hasKnowledge?: boolean; hasApprovalActor?: boolean; autoApprove?: boolean; maxAutoSteps?: number; aiDraftText?: string }) {
    const row = await this.prisma.workflowExecution.findUnique({ where: { id: id } });
    if (!row) throw new NotFoundException('Workflow execution not found');
    const current = this.decodeExecution(row);

    // Build lightweight handlers to connect workflow steps to kernels.
    const handlers = this.buildExecutionHandlers();
    const useHandlers = true;
    const result = useHandlers
      ? await runtimeTickExecutionWithHandlers(current, {
          hasKnowledge: body?.hasKnowledge,
          hasApprovalActor: body?.hasApprovalActor,
          autoApprove: body?.autoApprove,
          maxAutoSteps: body?.maxAutoSteps,
          aiDraftText: body?.aiDraftText,
          handlers,
          handlerContext: {
            organizationId: current.organizationId,
            projectId: current.projectId,
          },
        })
      : runtimeTickExecution(current, {
          hasKnowledge: body?.hasKnowledge,
          hasApprovalActor: body?.hasApprovalActor,
          autoApprove: body?.autoApprove,
          maxAutoSteps: body?.maxAutoSteps,
          aiDraftText: body?.aiDraftText,
        });
    const encoded = this.encodeExecution(result.execution, row.workflowRunId);
    await this.prisma.workflowExecution.update({ where: { id: id }, data: encoded);
    const events = result.events.map((e: { type: string; stepId?: string; messageAr?: string; at: string }) => ({
      id: `wfxe_${Math.random().toString(36).slice(2, 10)}`,
      executionId: id,
      organizationId: result.execution.organizationId,
      projectId: result.execution.projectId,
      type: e.type,
      stepId: e.stepId,
      messageAr: e.messageAr || '',
      createdAt: e.at,
      payload: undefined,
      idempotencyKey: undefined,
      attempt: 0,
      actor: 'api',
    }));
    if (events.length) await this.prisma.workflowExecutionEvent.createMany({ data: events);

    if (row.workflowRunId) {
      const decoded = result.execution;
      const trace = decoded.steps.map((s: { id: string; key?: string; state?: string; actor?: string; type?: string; noteAr?: string }) => ({
        id: s.id, key: s.key, state: s.state, actor: s.actor, type: s.type, noteAr: s.noteAr,
      }));
      await this.prisma.workflowRun.update({ where: { id: row.workflowRunId }, data: {
        status: decoded.status === 'waiting_input' ? 'needs_input' : decoded.status,
        trace: trace as Array<Record<string, unknown>>,
        metricsPreview: {
          progressPercent: decoded.metrics.progressPercent,
          queueScore: decoded.queueScore,
          estimatedCostUsd: decoded.metrics.estimatedCostUsd,
          automationRateTarget: decoded.metrics.automationRateTarget,
        },
      } as any);
      await this.tryPersistRun({
        runId: row.workflowRunId,
        instanceId: decoded.instanceId,
        templateId: decoded.templateId,
        organizationId: decoded.organizationId,
        projectId: decoded.projectId,
        status: decoded.status === 'waiting_input' ? 'needs_input' : decoded.status,
        totalSteps: decoded.steps.length,
        estimatedDurationMinutes: decoded.sla.targetMinutes || 0,
        aiCallsEstimate: decoded.metrics.aiCalls,
        humanCheckpoints: decoded.metrics.humanTouches,
        metricsPreview: {
          progressPercent: decoded.metrics.progressPercent,
          queueScore: decoded.queueScore,
          estimatedCostUsd: decoded.metrics.estimatedCostUsd,
          automationRateTarget: decoded.metrics.automationRateTarget,
        },
        trace,
        createdAt: row.createdAt,
      });
    }

    await this.tryPersistExecution(await this.prisma.workflowExecution.findUnique({ where: { id: id } }));
    await this.tryPersistExecutionEvents(events);

    // Realtime update
    this.realtime.emit('execution.updated', {
      executionId: id,
      status: result.execution.status,
      progressPercent: result.execution.metrics?.progressPercent,
      breached: result.execution.sla?.breached,
      updatedAt: result.execution.updatedAt,
    });
    if (events.length) {
      for (const e of events) {
        this.realtime.emit('execution.event', { ...e, executionId: id });
      }
    }

    return this.getExecution(id);
  }

  /**
   * Worker callback: completes a deferred step and re-queues the execution.
   * This is the bridge that turns async Jobs into deterministic workflow progression.
   */
  async completeDeferredStep(
    executionId: string,
    stepId: string,
    body: {
      output?: Record<string, unknown>;
      noteAr?: string;
      idempotencyKey?: string;
      attempt?: number;
      job?: { queue?: string; jobId?: string | number };
    },
  ) {
    const row = await this.prisma.workflowExecution.findUnique({ where: { id: executionId } });
    if (!row) throw new NotFoundException('Workflow execution not found');

    const execution = this.decodeExecution(row);
    const current = execution.steps[execution.currentStepIndex];
    if (!current || current.id !== stepId) {
      // If already advanced, treat as idempotent success.
      return { ok: true, alreadyAdvanced: true, currentStepId: current?.id };
    }

    if (current.state === 'completed') {
      return { ok: true, alreadyCompleted: true };
    }

    const idempotencyKey = String(body.idempotencyKey || '').trim() || `complete_${executionId}_${stepId}`;

    // Idempotency guard (in-memory)
    const existing = await this.prisma.workflowExecutionEvent.findMany({ where: { executionId:  } }).find((e: any) => e.executionId === executionId && e.idempotencyKey === idempotencyKey);
    if (existing) {
      return { ok: true, idempotent: true, eventId: existing.id };
    }

    const now = new Date().toISOString();
    current.state = 'completed';
    current.finishedAt = now;
    current.noteAr = body.noteAr || 'اكتملت عبر عامل الخلفية';
    current.output = body.output || { ok: true };
    execution.outputs[current.key] = current.output;
    execution.currentStepIndex += 1;
    execution.status = 'queued';
    execution.updatedAt = now;

    await this.prisma.workflowExecution.update({ where: { id: executionId }, data: this.encodeExecution(execution, row.workflowRunId));
    await this.tryPersistExecution(await this.prisma.workflowExecution.findUnique({ where: { id: executionId } }));

    const event = {
      id: `wfxe_${Math.random().toString(36).slice(2, 10)}`,
      executionId,
      organizationId: execution.organizationId,
      projectId: execution.projectId,
      type: 'step.completed',
      stepId,
      messageAr: `اكتملت خطوة ${current.nameAr} عبر عامل الخلفية`,
      payload: {
        key: current.key,
        job: body.job,
        attempt: Number(body.attempt ?? 0),
      },
      idempotencyKey,
      attempt: Number(body.attempt ?? 0),
      actor: 'worker',
      createdAt: now,
    };
    await this.prisma.workflowExecutionEvent.createMany({ data: [event as any]);
    await this.tryPersistExecutionEvents([event as any]);

    // Re-enqueue execution to continue steps.
    if (this.queue.getMode().mode === 'redis') {
      await this.queue.enqueueExecution(executionId, { priority: execution.priority });
    }

    this.realtime.emit('execution.step.completed', { executionId, stepId, key: current.key, ts: now });
    return { ok: true, executionId, stepId, nextStepId: execution.steps[execution.currentStepIndex]?.id };
  }

  /**
   * Connect the generic workflow steps to Atheel kernels.
   * This keeps a clear mapping similar to global process orchestration platforms:
   * - RAG retrieval (ai-kernel)
   * - Twin simulation (twin-kernel)
   * - Approval packet generation (packet-kernel)
   * - PPTX export (doc-kernel)
   * - Impact/Risk scoring (innovation-kernel)
   */
  private buildExecutionHandlers() {
    return {
      collect: ({ execution }: any) => {
        const brief = String((execution.inputs?.brief as any) || '').trim();
        return {
          normalized_input: {
            organizationId: execution.organizationId,
            projectId: execution.projectId,
            brief,
            deadline: execution.inputs?.deadline,
            metadata: execution.inputs?.metadata || {},
          },
        };
      },

      classify: ({ execution }: any) => {
        const text = String(execution.inputs?.brief || '').toLowerCase();

        const themeScores = CULTURE_THEMES.map((t: any) => {
          const hits = (t.keywordsAr || []).filter((k: string) => text.includes(k.toLowerCase())).length;
          return { code: t.code, nameAr: t.nameAr, hits };
        }).sort((a: any, b: any) => b.hits - a.hits);
        const topTheme = themeScores[0]?.hits ? themeScores[0] : undefined;

        const regionScores = SAUDI_REGIONS.map((r: any) => {
          const hubs = (r.hubs || []).map((h: string) => h.toLowerCase());
          const hits = hubs.filter((h: string) => text.includes(h)).length;
          return { code: r.code, nameAr: r.nameAr, hits };
        }).sort((a: any, b: any) => b.hits - a.hits);
        const topRegion = regionScores[0]?.hits ? regionScores[0] : undefined;

        return {
          workflow_context: {
            theme: topTheme?.code,
            themeNameAr: topTheme?.nameAr,
            region: topRegion?.code,
            regionNameAr: topRegion?.nameAr,
            notesAr: 'تصنيف استدلالي مبسط (يمكن ترقيته لاحقًا إلى تصنيف LLM مضبوط).',
          },
        };
      },

      retrieve: ({ execution, options }: any) => {
        const q = String(execution.inputs?.brief || '').trim();
        const chunks = await this.prisma.knowledgeChunk.findMany({});
        const top = retrieveTopChunks({
          query: q,
          chunks: chunks as any,
          topK: 6,
          organizationId: execution.organizationId,
          projectId: execution.projectId,
        });
        return {
          rag_context: {
            query: q,
            topChunks: top,
            hasKnowledge: top.length > 0,
            noteAr: top.length ? 'تم استرجاع سياقات مرجعية.' : 'لا توجد سياقات كافية، يلزم تغذية معرفة.',
          },
          _flags: {
            requiresKnowledge: true,
            hasKnowledge: options?.hasKnowledge !== false && top.length > 0,
          }
        };
      },

      plan: ({ execution, options }: any) => {
        const brief = String(execution.inputs?.brief || '').trim();
        const rag = (execution.outputs?.retrieve as any)?.rag_context;
        const hasKnowledgeContext = Boolean(rag?.hasKnowledge);
        const steps = buildCultureAgentPlan({
          objective: brief || 'تشغيل سير عمل ثقافي',
          hasKnowledgeContext: options?.hasKnowledge !== false && hasKnowledgeContext,
          requiresApproval: true,
        });
        return { execution_plan: { steps } };
      },

      draft: ({ execution }: any) => {
        const brief = String(execution.inputs?.brief || '').trim();
        const ctx = (execution.outputs?.retrieve as any)?.rag_context?.topChunks || [];
        const prompt = buildRagPrompt({
          userQuestion: brief,
          contexts: ctx,
          outputLanguage: 'ar',
          mode: 'draft_content',
        });
        return {
          draft_markdown: `# مسودة أولية\n\n${brief || '—'}\n\n## سياقات\n${ctx.length ? `تم استخدام ${ctx.length} سياق.` : 'لا يوجد سياق كافٍ بعد.'}`,
          rag_prompt: prompt,
        };
      },

      score: ({ execution }: any) => {
        const hasCtx = Boolean((execution.outputs?.retrieve as any)?.rag_context?.topChunks?.length);
        const hasDraft = Boolean((execution.outputs?.draft as any)?.draft_markdown);
        const score0to100 = Math.round((hasCtx ? 55 : 25) + (hasDraft ? 30 : 0) + 10);
        return {
          quality_score: score0to100,
          risk_flags: hasCtx ? [] : ['missing_knowledge_context'],
          noteAr: hasCtx ? 'جودة أولية مقبولة.' : 'الجودة منخفضة بسبب غياب سياقات مرجعية.',
        };
      },

      publish: async ({ execution, step }: any) => {
        // Convert publish into an async job (Worker + Queue). The job will complete the step later.
        const already = (execution.outputs?.publish as any)?.__defer;
        if (already) {
          return {
            __defer: true,
            noteAr: 'بانتظار اكتمال مهمة النشر في الخلفية',
            job: (execution.outputs?.publish as any)?.job,
          };
        }

        const queueMode = this.queue.getMode().mode;
        if (queueMode !== 'redis') {
          // Fallback to sync mode (development without Redis/Worker).
          return { delivery_bundle: { ok: true, noteAr: 'وضع تشغيل متزامن: لم يتم تفعيل طابور الخلفية للنشر.' } };
        }

        const enq = await this.queue.enqueuePublishStep({ executionId: execution.id, stepId: step?.id || 'publish' }, { attempts: 3 });
        const event = {
          id: `wfxe_${Math.random().toString(36).slice(2, 10)}`,
          executionId: execution.id,
          organizationId: execution.organizationId,
          projectId: execution.projectId,
          type: 'publish.job_enqueued',
          stepId: step?.id,
          messageAr: 'تم جدولة مهمة النشر في الخلفية',
          payload: { queue: (enq as Record<string, unknown>).queue, jobId: enq.jobId, idempotencyKey: (enq as Record<string, unknown>).idempotencyKey },
          idempotencyKey: (enq as Record<string, unknown>).idempotencyKey,
          attempt: 0,
          actor: 'api',
          createdAt: new Date().toISOString(),
        };
        await this.prisma.workflowExecutionEvent.createMany({ data: [event as any]);
        await this.tryPersistExecutionEvents([event as any]);

        return {
          __defer: true,
          noteAr: 'تم جدولة مهمة النشر في الخلفية',
          job: { queue: (enq as Record<string, unknown>).queue, jobId: enq.jobId, idempotencyKey: (enq as Record<string, unknown>).idempotencyKey },
        };
      },

      report: async ({ execution, step }: any) => {
        const already = (execution.outputs?.report as any)?.__defer;
        if (already) {
          return {
            __defer: true,
            noteAr: 'بانتظار اكتمال مهمة التقرير في الخلفية',
            job: (execution.outputs?.report as any)?.job,
          };
        }

        const queueMode = this.queue.getMode().mode;
        if (queueMode !== 'redis') {
          // Fallback: keep previous behavior minimal in sync mode.
          return { run_metrics: { noteAr: 'وضع تشغيل متزامن: لم يتم تفعيل طابور الخلفية للتقرير.' } };
        }

        const enq = await this.queue.enqueueReportStep({ executionId: execution.id, stepId: step?.id || 'report' }, { attempts: 3 });
        const event = {
          id: `wfxe_${Math.random().toString(36).slice(2, 10)}`,
          executionId: execution.id,
          organizationId: execution.organizationId,
          projectId: execution.projectId,
          type: 'report.job_enqueued',
          stepId: step?.id,
          messageAr: 'تم جدولة مهمة التقرير في الخلفية',
          payload: { queue: (enq as Record<string, unknown>).queue, jobId: enq.jobId, idempotencyKey: (enq as Record<string, unknown>).idempotencyKey },
          idempotencyKey: (enq as Record<string, unknown>).idempotencyKey,
          attempt: 0,
          actor: 'api',
          createdAt: new Date().toISOString(),
        };
        await this.prisma.workflowExecutionEvent.createMany({ data: [event as any]);
        await this.tryPersistExecutionEvents([event as any]);

        return {
          __defer: true,
          noteAr: 'تم جدولة مهمة التقرير في الخلفية',
          job: { queue: (enq as Record<string, unknown>).queue, jobId: enq.jobId, idempotencyKey: (enq as Record<string, unknown>).idempotencyKey },
        };
      },

      notify: ({ execution }: any) => {
        return {
          notifications: [
            {
              channel: 'dashboard',
              messageAr: `تم تحديث تنفيذ سير العمل (${execution.id})، الحالة: ${execution.status}.`,
            }
          ],
        };
      },
    };
  }

  async evaluateSlaAndEscalate(id: string) {
    const row = await this.prisma.workflowExecution.findUnique({ where: { id: id } });
    if (!row) throw new NotFoundException('Workflow execution not found');
    const exec = this.decodeExecution(row);

    const dueAt = exec.sla?.dueAt ? new Date(exec.sla.dueAt).getTime() : undefined;
    const now = Date.now();
    const breached = Boolean(dueAt && dueAt < now && exec.status !== 'completed');

    if (!breached) {
      return { ok: true, breached: false, dueAt: exec.sla?.dueAt, status: exec.status };
    }

    exec.sla.breached = true;
    // Hard escalation policy (Wave07): if breached, raise priority one level and re-enqueue if possible
    exec.priority = exec.priority === 'low' ? 'normal' : exec.priority === 'normal' ? 'high' : 'urgent';
    exec.updatedAt = new Date().toISOString();

    await this.prisma.workflowExecution.update({ where: { id: id }, data: this.encodeExecution(exec, row.workflowRunId));
    const event = {
      id: `wfxe_${Math.random().toString(36).slice(2, 10)}`,
      executionId: id,
      organizationId: exec.organizationId,
      projectId: exec.projectId,
      type: 'sla_breached',
      messageAr: 'تم تجاوز SLA — تم تصعيد الأولوية تلقائيًا',
      payload: { dueAt: exec.sla?.dueAt, priority: exec.priority },
      createdAt: new Date().toISOString(),
    };
    await this.prisma.workflowExecutionEvent.createMany({ data: [event]);
    await this.tryPersistExecution(await this.prisma.workflowExecution.findUnique({ where: { id: id } }));
    await this.tryPersistExecutionEvents([event]);

    const queueMode = this.queue.getMode().mode;
    if (queueMode === 'redis' && exec.status === 'queued') {
      await this.queue.enqueueExecution(id, { priority: exec.priority });
    }


    // Wave43: governance-driven escalation notifications (in-app + outbox)
    try {
      const policy = await this.governance.getActivePolicy(exec.organizationId || 'org_demo_1');
      const plan = this.governance.computeWorkflowEscalationPlan(policy);
      const minutesOverdue = dueAt ? Math.max(0, Math.floor((now - dueAt) / 60000)) : 0;
      let targetLevel = 0;
      for (let i = 0; i < plan.length; i++) if (minutesOverdue >= plan[i].afterMinutes) targetLevel = i + 1;

      if (targetLevel > 0) {
        // state check
        let state: any = null;
        try {
          state = await (this.prisma as Record<string, unknown>).escalationState.findFirst({ where: { organizationId: exec.organizationId || '', entityType: 'WorkflowExecution', entityId: id } });
        } catch (err) {
          throwIfProdDbError(err, 'WorkflowsService.evaluateSlaAndEscalate.stateLoad');
        }
        const lastLevel = Number(state?.lastLevel || 0);
        if (targetLevel > lastLevel) {
          const def = plan[targetLevel - 1];
          const titleAr = def.titleAr || 'تصعيد SLA';
          const messageAr = def.messageAr || 'تم تجاوز SLA في تنفيذ سير عمل.';
          const severity = def.severity || 'warning';
          const channels = Array.isArray(def.channels) ? def.channels : ['in_app'];
          const notifyRoles = Array.isArray(def.notify) ? def.notify : ['org_admin'];

          // users by roles
          const members = await (this.prisma as Record<string, unknown>).organizationMember.findMany({ where: { organizationId: exec.organizationId, role: { in: notifyRoles } } }).catch(() => []);
          const userIds = Array.from(new Set(members.map((m: any) => m.userId).filter(Boolean)));

          if (channels.includes('in_app')) {
            for (const uid of userIds) {
              await this.notifications.create({
                organizationId: exec.organizationId,
                userId: uid,
                severity,
                titleAr,
                messageAr,
                entityType: 'WorkflowExecution',
                entityId: id,
                metaJson: { level: targetLevel, minutesOverdue, dueAt: exec.sla?.dueAt, priority: exec.priority },
              }).catch(() => null);
            }
          }

          for (const ch of channels.filter((c: string) => c !== 'in_app')) {
            await this.outbox.create({
              organizationId: exec.organizationId,
              channel: ch,
              payload: {
                titleAr,
                messageAr,
                severity,
                entityType: 'WorkflowExecution',
                entityId: id,
                minutesOverdue,
                dueAt: exec.sla?.dueAt,
                priority: exec.priority,
                text: `⚠️ ${titleAr}\n${messageAr}\nExecution: ${id}\nOrg: ${exec.organizationId}`,
              },
              // Wave45: incident grouping + dedup + quiet hours for external channels
              dedupKey: `sla:workflow:${id}:level:${targetLevel}:ch:${ch}` ,
              incidentKey: `sla:workflow:${id}` ,
              respectQuietHours: { severity },
            } as any).catch(() => null);
          }

          // upsert state + emit operational event
          try {
            const st = (this.prisma as Record<string, unknown>).escalationState;
            const ex = await st.findFirst({ where: { organizationId: exec.organizationId, entityType: 'WorkflowExecution', entityId: id } });
            if (!ex) await st.create({ data: { organizationId: exec.organizationId, entityType: 'WorkflowExecution', entityId: id, lastLevel: targetLevel, lastNotifiedAt: new Date() } });
            else await st.update({ where: { id: ex.id }, data: { lastLevel: targetLevel, lastNotifiedAt: new Date() } });
          } catch (err) {
            throwIfProdDbError(err, 'WorkflowsService.evaluateSlaAndEscalate.stateUpsert');
          }

          await this.events.emit({
            organizationId: exec.organizationId,
            actorType: 'worker',
            eventType: 'sla.escalation.workflow',
            severity: severity === 'critical' ? 'critical' : 'warning',
            subject: `WorkflowExecution/${id}`,
            data: { level: targetLevel, minutesOverdue, dueAt: exec.sla?.dueAt, priority: exec.priority, channels, notifyRoles, userCount: userIds.length },
          }).catch(() => null);

          // schedule next check if there is a next level
          const next = plan[targetLevel];
          if (next && dueAt) {
            const at = new Date(dueAt + Math.max(0, Number(next.afterMinutes || 0)) * 60_000);
            await this.queue.scheduleEscalationTask({ kind: 'workflow', id, dueAt: at.toISOString() }).catch(() => null);
          }
        }
      }
    } catch {
      // ignore escalation notification errors to avoid breaking SLA handling
    }

    this.realtime.emit('execution.sla', { executionId: id, breached: true, dueAt: exec.sla?.dueAt, priority: exec.priority });
    return { ok: true, breached: true, dueAt: exec.sla?.dueAt, newPriority: exec.priority, queueMode };
  }

  async dispatchNextFromQueue(body?: { organizationId?: string; projectId?: string; autoApprove?: boolean; hasKnowledge?: boolean; hasApprovalActor?: boolean }) {
    const queueMode = this.queue.getMode().mode;

    const queue = this.listExecutions({
      organizationId: body?.organizationId,
      projectId: body?.projectId,
      status: 'queued',
      limit: 1,
      sort: 'queue',
    }).items;

    if (!queue.length) return { dispatched: false, reason: 'queue_empty', queueMode };
    const next = queue[0];

    if (queueMode === 'redis') {
      const enq = await this.queue.enqueueExecution(next.id, { priority: next.priority });
      this.realtime.emit('execution.dispatched', { executionId: next.id, queueMode, jobId: (enq as Record<string, unknown>).jobId });
      return { dispatched: true, executionId: next.id, queueMode, jobId: (enq as Record<string, unknown>).jobId };
    }

    const result = await this.tickExecution(next.id, {
      autoApprove: body?.autoApprove,
      hasKnowledge: body?.hasKnowledge,
      hasApprovalActor: body?.hasApprovalActor,
    });
    return { dispatched: true, executionId: next.id, queueMode, result };
  }

  async executionAction(id: string, body: { type: 'approve' | 'provide_input' | 'retry' | 'pause' | 'resume'; noteAr?: string; payload?: Record<string, unknown>; autoTick?: boolean; hasKnowledge?: boolean; hasApprovalActor?: boolean; autoApprove?: boolean }) {
    const row = await this.prisma.workflowExecution.findUnique({ where: { id: id } });
    if (!row) throw new NotFoundException('Workflow execution not found');
    const execution = this.decodeExecution(row);
    const updated = applyExecutionAction(execution, { type: body.type, noteAr: body.noteAr, payload: body.payload });
    await this.prisma.workflowExecution.update({ where: { id: id }, data: this.encodeExecution(updated, row.workflowRunId));
    await this.prisma.workflowExecutionEvent.createMany({ data: [{
      id: `wfxe_${Math.random().toString(36).slice(2, 10)}`,
      executionId: id,
      organizationId: updated.organizationId,
      projectId: updated.projectId,
      type: `manual_${body.type}`,
      messageAr: body.noteAr || `تنفيذ إجراء ${body.type} يدويًا`,
      payload: body.payload,
      createdAt: new Date().toISOString(),
    }]);
    await this.tryPersistExecution(await this.prisma.workflowExecution.findUnique({ where: { id: id } }));

    const queueMode = this.queue.getMode().mode;
    if (queueMode === 'redis' && updated.status === 'queued' && !body.autoTick) {
      await this.queue.enqueueExecution(id, { priority: updated.priority });
    }

    this.realtime.emit('execution.updated', {
      executionId: id,
      status: updated.status,
      progressPercent: (JSON.parse((await this.prisma.workflowExecution.findUnique({ where: { id: id } }) as any)?.metricsJson || '{}') as any)?.progressPercent,
      updatedAt: new Date().toISOString(),
    });

    if (body.autoTick) {
      return this.tickExecution(id, {
        hasKnowledge: body.hasKnowledge,
        hasApprovalActor: body.hasApprovalActor,
        autoApprove: body.autoApprove,
      });
    }
    return this.getExecution(id);
  }

  schedulerSnapshot(params?: { organizationId?: string; projectId?: string }) {
    const queued = this.listExecutions({ ...params, status: 'queued', limit: 1000, sort: 'queue' }).items;
    const waiting = this.listExecutions({ ...params, status: 'waiting_input', limit: 1000 }).items;
    const running = this.listExecutions({ ...params, status: 'running', limit: 1000 }).items;
    return {
      queue: {
        queuedCount: queued.length,
        runningCount: running.length,
        waitingInputCount: waiting.length,
        topQueued: queued.slice(0, 10).map((x) => ({
          id: x.id,
          templateId: x.templateId,
          priority: x.priority,
          queueScore: x.queueScore,
          dueAt: x.sla.dueAt,
          progressPercent: x.metrics.progressPercent,
        })),
      },
      formulas: {
        queueScore: 'priority + dueBoost + strategicBoost - complexityPenalty - backlogPenalty',
        estimatedCostUsd: 'aiCalls * (prompt_tokens/1000*in_rate + completion_tokens/1000*out_rate)',
      }
    };
  }

  async exportPack(body: { ids: string[]; name?: string; organizationId?: string; projectId?: string; createdByUserId?: string }) {
    const ids = Array.from(new Set((body.ids || []).filter(Boolean)));
    const pack = buildWorkflowExportPack(ids);
    const now = new Date().toISOString();
    const record = {
      id: `wfp_${Math.random().toString(36).slice(2, 10)}`,
      name: body.name || `workflow-pack-${ids.length}`,
      organizationId: body.organizationId,
      projectId: body.projectId,
      selectedTemplateIds: ids,
      manifest: pack.manifest as unknown as Record<string, unknown>,
      payload: pack as unknown as Record<string, unknown>,
      createdAt: now,
      updatedAt: now,
      createdByUserId: body.createdByUserId,
    };
    await this.prisma.workflowPack.create({ data: record);
    await this.tryPersistPack(record);
    return { packId: record.id, ...pack };
  }

  listPacks() {
    const items = await this.prisma.workflowPack.findMany({});
    return { items, total: items.length };
  }

  private decodeExecution(row: any): RuntimeExecution {
    return {
      id: row.id,
      templateId: row.templateId,
      instanceId: row.instanceId || undefined,
      organizationId: row.organizationId || undefined,
      projectId: row.projectId || undefined,
      priority: row.priority,
      status: row.status,
      queueScore: row.queueScore,
      currentStepIndex: row.currentStepIndex,
      steps: JSON.parse(row.stepsJson || '[]'),
      inputs: JSON.parse(row.inputsJson || '{}'),
      outputs: JSON.parse(row.outputsJson || '{}'),
      metrics: JSON.parse(row.metricsJson || '{}'),
      sla: JSON.parse(row.slaJson || '{}'),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      startedAt: row.startedAt || undefined,
      completedAt: row.completedAt || undefined,
    } as RuntimeExecution;
  }

  private encodeExecution(execution: RuntimeExecution, workflowRunId?: string) {
    return {
      id: execution.id,
      workflowRunId,
      instanceId: execution.instanceId,
      templateId: execution.templateId,
      organizationId: execution.organizationId,
      projectId: execution.projectId,
      priority: execution.priority,
      status: execution.status,
      queueScore: execution.queueScore,
      currentStepIndex: execution.currentStepIndex,
      stepsJson: JSON.stringify(execution.steps || []),
      inputsJson: JSON.stringify(execution.inputs || {}),
      outputsJson: JSON.stringify(execution.outputs || {}),
      metricsJson: JSON.stringify(execution.metrics || {}),
      slaJson: JSON.stringify(execution.sla || {}),
      createdAt: execution.createdAt,
      updatedAt: execution.updatedAt,
      startedAt: execution.startedAt,
      completedAt: execution.completedAt,
    };
  }

  private async tryPersistInstance(instance: any) {
    try {
      const model = (this.prisma as Record<string, unknown>).workflowInstance;
      if (!model?.upsert) return;
      await model.upsert({
        where: { id: instance.id },
        update: {
          templateId: instance.templateId,
          code: instance.code,
          nameAr: instance.nameAr,
          organizationId: instance.organizationId ?? null,
          projectId: instance.projectId ?? null,
          status: instance.status,
          parametersJson: JSON.stringify(instance.parameters || {}),
          designerGraphJson: (instance as Record<string, unknown>).designerGraphJson ?? null,
          updatedAt: new Date(instance.updatedAt),
        },
        create: {
          id: instance.id,
          templateId: instance.templateId,
          code: instance.code,
          nameAr: instance.nameAr,
          organizationId: instance.organizationId ?? null,
          projectId: instance.projectId ?? null,
          status: instance.status,
          parametersJson: JSON.stringify(instance.parameters || {}),
          designerGraphJson: (instance as Record<string, unknown>).designerGraphJson ?? null,
          createdAt: new Date(instance.createdAt),
          updatedAt: new Date(instance.updatedAt),
          createdByUserId: instance.createdByUserId ?? null,
        },
      });
    } catch {
      // noop in scaffold mode
    }
  }

  private async tryPersistRun(run: any) {
    try {
      const model = (this.prisma as Record<string, unknown>).workflowRun;
      if (!model?.upsert) return;
      await model.upsert({
        where: { id: run.runId },
        update: {
          status: run.status,
          totalSteps: run.totalSteps,
          estimatedDurationMinutes: run.estimatedDurationMinutes,
          aiCallsEstimate: run.aiCallsEstimate,
          humanCheckpoints: run.humanCheckpoints,
          metricsJson: JSON.stringify(run.metricsPreview || {}),
          traceJson: JSON.stringify(run.trace || []),
          updatedAt: new Date(),
        },
        create: {
          id: run.runId,
          instanceId: run.instanceId ?? null,
          templateId: run.templateId,
          organizationId: run.organizationId ?? null,
          projectId: run.projectId ?? null,
          status: run.status,
          totalSteps: run.totalSteps,
          estimatedDurationMinutes: run.estimatedDurationMinutes,
          aiCallsEstimate: run.aiCallsEstimate,
          humanCheckpoints: run.humanCheckpoints,
          metricsJson: JSON.stringify(run.metricsPreview || {}),
          traceJson: JSON.stringify(run.trace || []),
          createdAt: new Date(run.createdAt || new Date()),
          updatedAt: new Date(run.createdAt || new Date()),
        },
      });
    } catch {
      // noop in scaffold mode
    }
  }

  private async tryPersistExecution(executionRow: any) {
    try {
      const model = (this.prisma as Record<string, unknown>).workflowExecution;
      if (!model?.upsert || !executionRow) return;
      await model.upsert({
        where: { id: executionRow.id },
        update: {
          workflowRunId: executionRow.workflowRunId ?? null,
          instanceId: executionRow.instanceId ?? null,
          templateId: executionRow.templateId,
          organizationId: executionRow.organizationId ?? null,
          projectId: executionRow.projectId ?? null,
          priority: executionRow.priority,
          status: executionRow.status,
          queueScore: executionRow.queueScore,
          currentStepIndex: executionRow.currentStepIndex,
          stepsJson: executionRow.stepsJson,
          inputsJson: executionRow.inputsJson,
          outputsJson: executionRow.outputsJson,
          metricsJson: executionRow.metricsJson,
          slaJson: executionRow.slaJson,
          startedAt: executionRow.startedAt ? new Date(executionRow.startedAt) : null,
          completedAt: executionRow.completedAt ? new Date(executionRow.completedAt) : null,
          updatedAt: new Date(executionRow.updatedAt),
        },
        create: {
          id: executionRow.id,
          workflowRunId: executionRow.workflowRunId ?? null,
          instanceId: executionRow.instanceId ?? null,
          templateId: executionRow.templateId,
          organizationId: executionRow.organizationId ?? null,
          projectId: executionRow.projectId ?? null,
          priority: executionRow.priority,
          status: executionRow.status,
          queueScore: executionRow.queueScore,
          currentStepIndex: executionRow.currentStepIndex,
          stepsJson: executionRow.stepsJson,
          inputsJson: executionRow.inputsJson,
          outputsJson: executionRow.outputsJson,
          metricsJson: executionRow.metricsJson,
          slaJson: executionRow.slaJson,
          createdAt: new Date(executionRow.createdAt),
          updatedAt: new Date(executionRow.updatedAt),
          startedAt: executionRow.startedAt ? new Date(executionRow.startedAt) : null,
          completedAt: executionRow.completedAt ? new Date(executionRow.completedAt) : null,
        },
      });
    } catch {
      // noop in scaffold mode
    }
  }

  private async tryPersistExecutionEvents(events: any[]) {
    try {
      const model = (this.prisma as Record<string, unknown>).workflowExecutionEvent;
      if (!model?.createMany || !events?.length) return;
      await model.createMany({
        data: events.map((e) => ({
          id: e.id,
          executionId: e.executionId,
          organizationId: e.organizationId ?? null,
          projectId: e.projectId ?? null,
          type: e.type,
          stepId: e.stepId ?? null,
          messageAr: e.messageAr || '',
          payloadJson: JSON.stringify(e.payload || {}),
          idempotencyKey: (e as Record<string, unknown>).idempotencyKey ?? null,
          attempt: Number((e as Record<string, unknown>).attempt ?? 0),
          actor: (e as Record<string, unknown>).actor ?? null,
          createdAt: new Date(e.createdAt),
        })),
        skipDuplicates: true,
      });
    } catch {
      // noop in scaffold mode
    }
  }

  private async tryPersistPack(pack: any) {
    try {
      const model = (this.prisma as Record<string, unknown>).workflowPack;
      if (!model?.upsert) return;
      await model.upsert({
        where: { id: pack.id },
        update: {
          name: pack.name,
          organizationId: pack.organizationId ?? null,
          projectId: pack.projectId ?? null,
          selectedTemplateIdsJson: JSON.stringify(pack.selectedTemplateIds || []),
          manifestJson: JSON.stringify(pack.manifest || {}),
          payloadJson: JSON.stringify(pack.payload || {}),
          updatedAt: new Date(pack.updatedAt),
        },
        create: {
          id: pack.id,
          name: pack.name,
          organizationId: pack.organizationId ?? null,
          projectId: pack.projectId ?? null,
          selectedTemplateIdsJson: JSON.stringify(pack.selectedTemplateIds || []),
          manifestJson: JSON.stringify(pack.manifest || {}),
          payloadJson: JSON.stringify(pack.payload || {}),
          createdAt: new Date(pack.createdAt),
          updatedAt: new Date(pack.updatedAt),
          createdByUserId: pack.createdByUserId ?? null,
        },
      });
    } catch {
      // noop in scaffold mode
    }
  }
}
