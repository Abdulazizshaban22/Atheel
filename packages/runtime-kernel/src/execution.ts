import type { RuntimeDeferredStepOutput, RuntimeExecution, RuntimeExecutionStep, RuntimeTickOptions, RuntimeTickResult } from './types';
import { computeDueAt } from './scheduler';
import { computeProgressPercent, computeQueueScore, estimateExecutionCostUsd, estimateLatencyMs } from './scoring';

export type TemplateLike = {
  id: string;
  complexity: 'starter' | 'standard' | 'advanced';
  aiProfile: { preferredModelClass: 'fast' | 'balanced' | 'reasoning' };
  steps: Array<{
    id: string;
    key: string;
    nameAr: string;
    actor: 'system' | 'ai' | 'human';
    type: string;
    estimatedMinutes: number;
    usesRag?: boolean;
  }>;
};

// --- Graph (designer) execution support ------------------------------------

export type DesignerGraphNode = {
  id: string;
  type?: string;
  data?: Record<string, unknown>;
};

export type DesignerGraphEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
};

export type DesignerGraph = {
  templateId: string;
  version?: number;
  nodes: DesignerGraphNode[];
  edges: DesignerGraphEdge[];
};

type GraphRuntimeState = {
  version: 1;
  templateId: string;
  nodes: DesignerGraphNode[];
  edges: DesignerGraphEdge[];
  ready: string[];
  blocked?: string;
  joins: Record<string, { arrivedFrom: string[]; fired: boolean; winnerFrom?: string }>;
};

type GraphExecutionOutputs = RuntimeExecution['outputs'] & { __graph?: GraphRuntimeState };

function normalizeNodeType(t?: string) {
  return (t || 'step') as string;
}

function buildGraphIndex(nodes: DesignerGraphNode[], edges: DesignerGraphEdge[]) {
  const byId = new Map<string, DesignerGraphNode>();
  for (const n of nodes) byId.set(n.id, n);

  const out = new Map<string, DesignerGraphEdge[]>();
  const inc = new Map<string, DesignerGraphEdge[]>();
  for (const n of nodes) {
    out.set(n.id, []);
    inc.set(n.id, []);
  }
  for (const e of edges) {
    if (!byId.has(e.source) || !byId.has(e.target)) continue;
    out.get(e.source)!.push(e);
    inc.get(e.target)!.push(e);
  }
  return { byId, out, inc };
}

function initGraphState(graph: DesignerGraph): GraphRuntimeState {
  const { inc } = buildGraphIndex(graph.nodes || [], graph.edges || []);
  const startNodes = (graph.nodes || [])
    .filter((n) => (inc.get(n.id)?.length || 0) === 0)
    .map((n) => n.id);

  return {
    version: 1,
    templateId: graph.templateId,
    nodes: graph.nodes || [],
    edges: graph.edges || [],
    ready: [...startNodes],
    joins: {},
  };
}

function getGraphOutputs(execution: RuntimeExecution): GraphExecutionOutputs {
  return execution.outputs as GraphExecutionOutputs;
}

function getGraphState(execution: RuntimeExecution): GraphRuntimeState | null {
  const s = getGraphOutputs(execution).__graph;
  if (!s || !Array.isArray(s.nodes) || !Array.isArray(s.edges)) return null;
  if (!Array.isArray(s.ready)) s.ready = [];
  if (!s.joins) s.joins = {};
  return s;
}

function setGraphState(execution: RuntimeExecution, state: GraphRuntimeState) {
  getGraphOutputs(execution).__graph = state;
}

function getNodeLabel(node: DesignerGraphNode): string | undefined {
  return typeof node.data?.label === 'string' ? node.data.label : undefined;
}

function getNodeMode(data?: Record<string, unknown>): 'AND' | 'OR' {
  const mode = typeof data?.mode === 'string' ? data.mode.toUpperCase() : 'AND';
  return mode === 'OR' ? 'OR' : 'AND';
}

export function createExecutionFromGraph(input: {
  id: string;
  template: TemplateLike;
  graph: DesignerGraph;
  organizationId?: string;
  projectId?: string;
  instanceId?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  inputs?: Record<string, unknown>;
  strategicValue?: number;
  backlogDepth?: number;
}): RuntimeExecution {
  const now = new Date().toISOString();
  const priority = input.priority ?? 'normal';
  const graph = input.graph;
  const templateStepsById = new Map(input.template.steps.map((s) => [s.id, s]));

  const steps: RuntimeExecutionStep[] = (graph.nodes || []).map((n) => {
    const t = normalizeNodeType(n.type);
    if (t === 'step') {
      const s = templateStepsById.get(n.id);
      return {
        id: n.id,
        key: s?.key || n.id,
        nameAr: s?.nameAr || getNodeLabel(n) || n.id,
        actor: s?.actor ?? 'system',
        type: s?.type || 'noop',
        requiresRag: Boolean(s?.usesRag),
        requiresApproval: s?.type === 'approve',
        state: 'pending',
        retries: 0,
      };
    }

    if (t === 'humanGate') {
      return {
        id: n.id,
        key: `gate_${n.id}`,
        nameAr: getNodeLabel(n) || 'بوابة بشرية',
        actor: 'human',
        type: 'human_gate',
        requiresApproval: true,
        state: 'pending',
        retries: 0,
      };
    }

    if (t === 'aiAction') {
      return {
        id: n.id,
        key: `ai_${n.id}`,
        nameAr: getNodeLabel(n) || 'AI Action',
        actor: 'ai',
        type: 'ai_action',
        state: 'pending',
        retries: 0,
      };
    }

    if (t === 'systemTask') {
      return {
        id: n.id,
        key: `sys_${n.id}`,
        nameAr: getNodeLabel(n) || 'System Task',
        actor: 'system',
        type: 'system_task',
        state: 'pending',
        retries: 0,
      };
    }

    if (t === 'splitGate') {
      const mode = ((n.data?.mode as string) || 'AND').toUpperCase();
      return {
        id: n.id,
        key: `split_${n.id}`,
        nameAr: getNodeLabel(n) || 'Split',
        actor: 'system',
        type: mode === 'OR' ? 'split_or' : 'split_and',
        state: 'pending',
        retries: 0,
      };
    }

    if (t === 'joinGate') {
      const mode = ((n.data?.mode as string) || 'AND').toUpperCase();
      return {
        id: n.id,
        key: `join_${n.id}`,
        nameAr: getNodeLabel(n) || 'Join',
        actor: 'system',
        type: mode === 'OR' ? 'join_or' : 'join_and',
        state: 'pending',
        retries: 0,
      };
    }

    // Unknown node type: treat as no-op system node
    return {
      id: n.id,
      key: `node_${n.id}`,
      nameAr: getNodeLabel(n) || n.id,
      actor: 'system',
      type: 'noop',
      state: 'pending',
      retries: 0,
    };
  });

  const humanTouches = steps.filter((s) => s.actor === 'human').length;
  const aiCalls = steps.filter((s) => s.actor === 'ai').length;
  const targetMinutes = input.template.steps.reduce((sum, s) => sum + (s.estimatedMinutes || 0), 0);
  const dueAt = computeDueAt({ startedAt: now, targetMinutes });
  const queueScore = computeQueueScore({
    priority,
    complexity: input.template.complexity,
    minutesToDue: targetMinutes,
    backlogDepth: input.backlogDepth,
    strategicValue: input.strategicValue,
  });

  const execution: RuntimeExecution = {
    id: input.id,
    templateId: input.template.id,
    instanceId: input.instanceId,
    organizationId: input.organizationId,
    projectId: input.projectId,
    status: 'queued',
    priority,
    queueScore,
    currentStepIndex: 0,
    steps,
    inputs: input.inputs || {},
    outputs: {},
    metrics: {
      estimatedCostUsd: estimateExecutionCostUsd({ aiCalls, modelClass: input.template.aiProfile.preferredModelClass }),
      estimatedLatencyMs: estimateLatencyMs({ stepCount: steps.length, aiCalls, modelClass: input.template.aiProfile.preferredModelClass }),
      automationRateTarget: Number(((steps.length - humanTouches) / Math.max(1, steps.length)).toFixed(2)),
      progressPercent: 0,
      humanTouches,
      aiCalls,
    },
    sla: { dueAt, targetMinutes, breached: false },
    createdAt: now,
    updatedAt: now,
  };

  setGraphState(execution, initGraphState(graph));
  return execution;
}

export function createExecutionFromTemplate(input: {
  id: string;
  template: TemplateLike;
  organizationId?: string;
  projectId?: string;
  instanceId?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  inputs?: Record<string, unknown>;
  strategicValue?: number;
  backlogDepth?: number;
}) : RuntimeExecution {
  const now = new Date().toISOString();
  const priority = input.priority ?? 'normal';
  const humanTouches = input.template.steps.filter((s) => s.actor === 'human').length;
  const aiCalls = input.template.steps.filter((s) => s.actor === 'ai').length;
  const targetMinutes = input.template.steps.reduce((sum, s) => sum + (s.estimatedMinutes || 0), 0);
  const dueAt = computeDueAt({ startedAt: now, targetMinutes });
  const queueScore = computeQueueScore({
    priority,
    complexity: input.template.complexity,
    minutesToDue: targetMinutes,
    backlogDepth: input.backlogDepth,
    strategicValue: input.strategicValue,
  });

  const steps: RuntimeExecutionStep[] = input.template.steps.map((s) => ({
    id: s.id,
    key: s.key,
    nameAr: s.nameAr,
    actor: s.actor,
    type: s.type,
    requiresRag: Boolean(s.usesRag),
    requiresApproval: s.type === 'approve',
    state: 'pending',
    retries: 0,
  }));

  return {
    id: input.id,
    templateId: input.template.id,
    instanceId: input.instanceId,
    organizationId: input.organizationId,
    projectId: input.projectId,
    status: 'queued',
    priority,
    queueScore,
    currentStepIndex: 0,
    steps,
    inputs: input.inputs || {},
    outputs: {},
    metrics: {
      estimatedCostUsd: estimateExecutionCostUsd({ aiCalls, modelClass: input.template.aiProfile.preferredModelClass }),
      estimatedLatencyMs: estimateLatencyMs({ stepCount: steps.length, aiCalls, modelClass: input.template.aiProfile.preferredModelClass }),
      automationRateTarget: Number(((steps.length - humanTouches) / Math.max(1, steps.length)).toFixed(2)),
      progressPercent: 0,
      humanTouches,
      aiCalls,
    },
    sla: { dueAt, targetMinutes, breached: false },
    createdAt: now,
    updatedAt: now,
  };
}

export function applyExecutionAction(execution: RuntimeExecution, action: { type: 'approve' | 'provide_input' | 'retry' | 'pause' | 'resume'; noteAr?: string; payload?: Record<string, unknown> }) {
  const now = new Date().toISOString();
  const graphState = getGraphState(execution);
  const current = execution.steps[execution.currentStepIndex];
  if (action.type === 'pause') {
    execution.status = 'paused';
    execution.updatedAt = now;
    return execution;
  }
  if (action.type === 'resume' && execution.status === 'paused') {
    execution.status = 'queued';
    execution.updatedAt = now;
    return execution;
  }
  if (!current) return execution;
  if (action.type === 'retry') {
    current.state = 'pending';
    current.retries += 1;
    current.noteAr = action.noteAr || 'إعادة محاولة يدوية';
    execution.status = 'queued';
    execution.updatedAt = now;
    return execution;
  }
  if (current.state === 'waiting_input') {
    current.state = 'completed';
    current.finishedAt = now;
    current.output = { ...(current.output || {}), ...(action.payload || {}), manual: true };
    current.noteAr = action.noteAr || (action.type === 'approve' ? 'اعتماد يدوي مكتمل' : 'تم إدخال بيانات يدوية');
    execution.outputs[current.key] = current.output;

    // Graph mode: enqueue next nodes based on edges and join semantics
    if (graphState) {
      const { byId, out, inc } = buildGraphIndex(graphState.nodes, graphState.edges);
      const nodeId = current.id;
      const nodeType = (id: string) => normalizeNodeType(byId.get(id)?.type);

      const arrive = (targetId: string, fromId: string) => {
        const tgtType = nodeType(targetId);
        if (tgtType !== 'joinGate') {
          if (!graphState.ready.includes(targetId)) graphState.ready.push(targetId);
          return;
        }
        const joinNode = byId.get(targetId);
        const mode = getNodeMode(joinNode?.data);
        const incoming = inc.get(targetId) || [];
        const key = targetId;
        graphState.joins[key] ||= { arrivedFrom: [], fired: false };
        const st = graphState.joins[key];
        if (st.fired) return;

        if (!st.arrivedFrom.includes(fromId)) st.arrivedFrom.push(fromId);

        if (mode === 'OR') {
          st.fired = true;
          st.winnerFrom = fromId;
          if (!graphState.ready.includes(targetId)) graphState.ready.push(targetId);
          return;
        }

        // AND join: wait for all incoming
        if (st.arrivedFrom.length >= incoming.length) {
          st.fired = true;
          if (!graphState.ready.includes(targetId)) graphState.ready.push(targetId);
        }
      };

      const outs = out.get(nodeId) || [];
      for (const e of outs) arrive(e.target, nodeId);

      graphState.blocked = undefined;
      setGraphState(execution, graphState);
      execution.status = 'queued';
      execution.updatedAt = now;
      return execution;
    }

    // Linear mode
    execution.currentStepIndex += 1;
    execution.status = 'queued';
    execution.updatedAt = now;
  }
  return execution;
}

export function tickExecution(execution: RuntimeExecution, options?: RuntimeTickOptions): RuntimeTickResult {
  const now = new Date().toISOString();
  const events: RuntimeTickResult['events'] = [];
  if (isExecutionTerminalOrCompleted(execution.status)) return { execution, events };

  execution.status = 'running';
  execution.startedAt ||= now;
  const maxSteps = Math.max(1, options?.maxAutoSteps ?? 100);
  let iterations = 0;

  while (iterations < maxSteps && execution.currentStepIndex < execution.steps.length) {
    iterations += 1;
    const step = execution.steps[execution.currentStepIndex];
    step.startedAt ||= new Date().toISOString();
    if (step.state === 'pending') {
      step.state = 'running';
      events.push({ type: 'step_started', stepId: step.id, messageAr: `بدء خطوة ${step.nameAr}`, at: new Date().toISOString() });
    }

    if (step.actor === 'human' && !(step.requiresApproval && options?.autoApprove)) {
      step.state = 'waiting_input';
      step.noteAr = step.requiresApproval ? 'بانتظار اعتماد بشري' : 'بانتظار إدخال/مراجعة بشرية';
      execution.status = 'waiting_input';
      events.push({ type: 'step_waiting', stepId: step.id, messageAr: step.noteAr, at: new Date().toISOString() });
      break;
    }

    if (step.requiresRag && options?.hasKnowledge === false) {
      step.state = 'waiting_input';
      step.noteAr = 'يلزم تغذية معرفة قبل متابعة خطوة تعتمد على RAG';
      execution.status = 'waiting_input';
      events.push({ type: 'step_waiting', stepId: step.id, messageAr: step.noteAr, at: new Date().toISOString() });
      break;
    }

    if (step.requiresApproval && options?.hasApprovalActor === false) {
      step.state = 'waiting_input';
      step.noteAr = 'لا يوجد معتمد مخصص لهذا المسار';
      execution.status = 'waiting_input';
      events.push({ type: 'step_waiting', stepId: step.id, messageAr: step.noteAr, at: new Date().toISOString() });
      break;
    }

    step.state = 'completed';
    step.finishedAt = new Date().toISOString();
    const output = step.actor === 'ai'
      ? { kind: 'ai', draft: step.type === 'draft' ? (options?.aiDraftText || 'مسودة أولية مولدة من محرك الذكاء') : undefined }
      : step.actor === 'human'
        ? { kind: 'human', note: 'اعتماد تلقائي (محاكاة)' }
        : { kind: 'system', ok: true };
    step.output = output;
    execution.outputs[step.key] = output;
    events.push({ type: 'step_completed', stepId: step.id, messageAr: `اكتملت خطوة ${step.nameAr}`, at: step.finishedAt });
    execution.currentStepIndex += 1;
  }

  const done = execution.steps.filter((s) => s.state === 'completed' || s.state === 'skipped').length;
  execution.metrics.progressPercent = computeProgressPercent(done, execution.steps.length);
  execution.sla.breached = Boolean(execution.sla.dueAt && new Date(execution.sla.dueAt).getTime() < Date.now() && isExecutionActive(execution.status));
  execution.updatedAt = new Date().toISOString();

  if (execution.currentStepIndex >= execution.steps.length && execution.steps.every((s) => s.state === 'completed' || s.state === 'skipped')) {
    execution.status = 'completed';
    execution.completedAt = new Date().toISOString();
    execution.metrics.progressPercent = 100;
    events.push({ type: 'execution_completed', messageAr: 'اكتمل تنفيذ سير العمل', at: execution.completedAt });
  }

  return { execution, events };
}

/**
 * Graph-based tick engine.
 * - Supports semantic branching via Split (AND/OR) and Join (AND/OR).
 * - Executes ready nodes until a blocking wait (human input, missing RAG, deferred job).
 * - Stores graph runtime state inside execution.outputs.__graph.
 */
export async function tickExecutionGraphWithHandlers(execution: RuntimeExecution, options?: RuntimeTickOptions): Promise<RuntimeTickResult> {
  const now = new Date().toISOString();
  const events: RuntimeTickResult['events'] = [];
  if (isExecutionTerminalOrCompleted(execution.status)) return { execution, events };

  const graphState = getGraphState(execution);
  if (!graphState) return { execution, events };

  execution.status = 'running';
  execution.startedAt ||= now;
  const maxSteps = Math.max(1, options?.maxAutoSteps ?? 100);
  let iterations = 0;

  const handlers = options?.handlers || {};
  const pickHandler = (step: RuntimeExecutionStep) => handlers[step.type] || handlers[step.key];

  const { byId, out, inc } = buildGraphIndex(graphState.nodes, graphState.edges);
  const nodeType = (id: string) => normalizeNodeType(byId.get(id)?.type);
  const nodeData = (id: string): Record<string, unknown> => byId.get(id)?.data || {};

  const stepIndexById = new Map(execution.steps.map((s, idx) => [s.id, idx] as const));

  const arrive = (targetId: string, fromId: string) => {
    const tgtType = nodeType(targetId);
    if (tgtType !== 'joinGate') {
      if (!graphState.ready.includes(targetId)) graphState.ready.push(targetId);
      return;
    }

    const mode = getNodeMode(nodeData(targetId));
    const incoming = inc.get(targetId) || [];
    graphState.joins[targetId] ||= { arrivedFrom: [], fired: false };
    const st = graphState.joins[targetId];
    if (st.fired) return;

    if (!st.arrivedFrom.includes(fromId)) st.arrivedFrom.push(fromId);

    if (mode === 'OR') {
      st.fired = true;
      st.winnerFrom = fromId;
      if (!graphState.ready.includes(targetId)) graphState.ready.push(targetId);
      return;
    }

    // AND join: wait for all incoming
    if (st.arrivedFrom.length >= incoming.length) {
      st.fired = true;
      if (!graphState.ready.includes(targetId)) graphState.ready.push(targetId);
    }
  };

  const enqueueFromNode = (nodeId: string, selection?: { edgeId?: string; handle?: string }) => {
    const outs = out.get(nodeId) || [];
    if (!outs.length) return;

    const t = nodeType(nodeId);
    if (t === 'splitGate') {
      const mode = getNodeMode(nodeData(nodeId));
      if (mode === 'OR') {
        let chosen: DesignerGraphEdge | undefined;
        if (selection?.edgeId) chosen = outs.find((e) => e.id === selection.edgeId);
        if (!chosen && selection?.handle) chosen = outs.find((e) => (e.sourceHandle || '') === selection.handle);
        if (!chosen) chosen = outs[0];
        if (chosen) arrive(chosen.target, nodeId);
        return;
      }
      // AND split
      for (const e of outs) arrive(e.target, nodeId);
      return;
    }

    // Default behavior
    for (const e of outs) arrive(e.target, nodeId);
  };

  // If ready queue is empty (e.g., legacy execution), initialize from graph
  if (!graphState.ready.length) {
    const startNodes = graphState.nodes
      .filter((n) => (inc.get(n.id)?.length || 0) === 0)
      .map((n) => n.id);
    graphState.ready.push(...startNodes);
  }

  while (iterations < maxSteps) {
    iterations += 1;
    const nodeId = graphState.ready.shift();
    if (!nodeId) break;

    const idx = stepIndexById.get(nodeId);
    const step = typeof idx === 'number' ? execution.steps[idx] : undefined;
    if (!step) continue;

    // Skip if already completed
    if (step.state === 'completed' || step.state === 'skipped') continue;

    // If deferred job, keep waiting
    if (step.state === 'waiting_input' && isDeferredOutput(step.output)) {
      execution.status = 'waiting_input';
      graphState.blocked = nodeId;
      execution.currentStepIndex = typeof idx === 'number' ? idx : execution.currentStepIndex;
      break;
    }

    step.startedAt ||= new Date().toISOString();
    if (step.state === 'pending') {
      step.state = 'running';
      events.push({ type: 'step_started', stepId: step.id, messageAr: `بدء خطوة ${step.nameAr}`, at: new Date().toISOString() });
    }

    // Control nodes are auto-completed
    if (step.type === 'split_and' || step.type === 'split_or' || step.type === 'join_and' || step.type === 'join_or') {
      // For split OR, allow deterministic selection via inputs.__branchSelections
      const branchSelections = (execution.inputs.__branchSelections as Record<string, unknown> | undefined);
      const sel = branchSelections?.[nodeId];
      const selection = typeof sel === 'string'
        ? (sel.startsWith('e_') ? { edgeId: sel } : { handle: sel })
        : undefined;

      if (step.type === 'split_or') {
        step.output = { kind: 'control', selection: selection?.edgeId || selection?.handle || 'auto:first' };
      } else {
        step.output = { kind: 'control', ok: true };
      }

      step.state = 'completed';
      step.finishedAt = new Date().toISOString();
      execution.outputs[step.key] = step.output;
      events.push({ type: 'step_completed', stepId: step.id, messageAr: `اكتملت خطوة ${step.nameAr}`, at: step.finishedAt });

      enqueueFromNode(nodeId, selection);
      continue;
    }

    // Human steps: block unless autoApprove is enabled
    if (step.actor === 'human' && !(step.requiresApproval && options?.autoApprove)) {
      step.state = 'waiting_input';
      step.noteAr = step.requiresApproval ? 'بانتظار اعتماد بشري' : 'بانتظار إدخال/مراجعة بشرية';
      execution.status = 'waiting_input';
      graphState.blocked = nodeId;
      execution.currentStepIndex = typeof idx === 'number' ? idx : execution.currentStepIndex;
      events.push({ type: 'step_waiting', stepId: step.id, messageAr: step.noteAr, at: new Date().toISOString() });
      break;
    }

    if (step.requiresRag && options?.hasKnowledge === false) {
      step.state = 'waiting_input';
      step.noteAr = 'يلزم تغذية معرفة قبل متابعة خطوة تعتمد على RAG';
      execution.status = 'waiting_input';
      graphState.blocked = nodeId;
      execution.currentStepIndex = typeof idx === 'number' ? idx : execution.currentStepIndex;
      events.push({ type: 'step_waiting', stepId: step.id, messageAr: step.noteAr, at: new Date().toISOString() });
      break;
    }

    if (step.requiresApproval && options?.hasApprovalActor === false) {
      step.state = 'waiting_input';
      step.noteAr = 'لا يوجد معتمد مخصص لهذا المسار';
      execution.status = 'waiting_input';
      graphState.blocked = nodeId;
      execution.currentStepIndex = typeof idx === 'number' ? idx : execution.currentStepIndex;
      events.push({ type: 'step_waiting', stepId: step.id, messageAr: step.noteAr, at: new Date().toISOString() });
      break;
    }

    // Execute handler if available
    const h = pickHandler(step);
    let output: Record<string, unknown> | RuntimeDeferredStepOutput | undefined;
    if (h) {
      output = await h({ execution, step, options: options || {} });
      if (isDeferredOutput(output)) {
        step.state = 'waiting_input';
        step.output = output;
        step.noteAr = output.noteAr || 'تم تحويل الخطوة إلى مهمة خلفية';
        execution.status = 'waiting_input';
        graphState.blocked = nodeId;
        execution.currentStepIndex = typeof idx === 'number' ? idx : execution.currentStepIndex;
        events.push({ type: 'step_waiting', stepId: step.id, messageAr: step.noteAr, at: new Date().toISOString() });
        break;
      }
    }

    // Fallback simulation
    if (!output) {
      output = step.actor === 'ai'
        ? { kind: 'ai', draft: step.type === 'draft' ? (options?.aiDraftText || 'مسودة أولية مولدة') : undefined }
        : step.actor === 'human'
          ? { kind: 'human', note: 'اعتماد تلقائي (محاكاة)' }
          : { kind: 'system', ok: true };
    }

    step.state = 'completed';
    step.finishedAt = new Date().toISOString();
    step.output = output;
    execution.outputs[step.key] = output;
    events.push({ type: 'step_completed', stepId: step.id, messageAr: `اكتملت خطوة ${step.nameAr}`, at: step.finishedAt });

    enqueueFromNode(nodeId);
  }

  const done = execution.steps.filter((s) => s.state === 'completed' || s.state === 'skipped').length;
  execution.metrics.progressPercent = computeProgressPercent(done, execution.steps.length);
  execution.sla.breached = Boolean(execution.sla.dueAt && new Date(execution.sla.dueAt).getTime() < Date.now() && isExecutionActive(execution.status));
  execution.updatedAt = new Date().toISOString();

  if (execution.steps.every((s) => s.state === 'completed' || s.state === 'skipped')) {
    execution.status = 'completed';
    execution.completedAt = new Date().toISOString();
    execution.metrics.progressPercent = 100;
    events.push({ type: 'execution_completed', messageAr: 'اكتمل تنفيذ سير العمل', at: execution.completedAt });
  }

  setGraphState(execution, graphState);
  return { execution, events };
}

/**
 * Execute a tick using real step handlers when provided.
 * - Human steps still block unless autoApprove is enabled.
 * - If a handler exists for a step type (or key), it will be invoked.
 * - If no handler exists, it falls back to simulation output.
 */
export async function tickExecutionWithHandlers(execution: RuntimeExecution, options?: RuntimeTickOptions): Promise<RuntimeTickResult> {
  const now = new Date().toISOString();
  const events: RuntimeTickResult['events'] = [];
  if (isExecutionTerminalOrCompleted(execution.status)) return { execution, events };

  // Graph mode
  if (getGraphState(execution)) {
    return tickExecutionGraphWithHandlers(execution, options);
  }

  execution.status = 'running';
  execution.startedAt ||= now;
  const maxSteps = Math.max(1, options?.maxAutoSteps ?? 100);
  let iterations = 0;

  const handlers = options?.handlers || {};
  const pickHandler = (step: RuntimeExecutionStep) => handlers[step.type] || handlers[step.key];

  while (iterations < maxSteps && execution.currentStepIndex < execution.steps.length) {
    iterations += 1;
    const step = execution.steps[execution.currentStepIndex];
    step.startedAt ||= new Date().toISOString();

    // If this step is already deferred (async job) keep waiting until an external actor completes it.
    if (step.state === 'waiting_input' && isDeferredOutput(step.output)) {
      execution.status = 'waiting_input';
      break;
    }
    if (step.state === 'pending') {
      step.state = 'running';
      events.push({ type: 'step_started', stepId: step.id, messageAr: `بدء خطوة ${step.nameAr}`, at: new Date().toISOString() });
    }

    if (step.actor === 'human' && !(step.requiresApproval && options?.autoApprove)) {
      step.state = 'waiting_input';
      step.noteAr = step.requiresApproval ? 'بانتظار اعتماد بشري' : 'بانتظار إدخال/مراجعة بشرية';
      execution.status = 'waiting_input';
      events.push({ type: 'step_waiting', stepId: step.id, messageAr: step.noteAr, at: new Date().toISOString() });
      break;
    }

    if (step.requiresRag && options?.hasKnowledge === false) {
      step.state = 'waiting_input';
      step.noteAr = 'يلزم تغذية معرفة قبل متابعة خطوة تعتمد على RAG';
      execution.status = 'waiting_input';
      events.push({ type: 'step_waiting', stepId: step.id, messageAr: step.noteAr, at: new Date().toISOString() });
      break;
    }

    if (step.requiresApproval && options?.hasApprovalActor === false) {
      step.state = 'waiting_input';
      step.noteAr = 'لا يوجد معتمد مخصص لهذا المسار';
      execution.status = 'waiting_input';
      events.push({ type: 'step_waiting', stepId: step.id, messageAr: step.noteAr, at: new Date().toISOString() });
      break;
    }

    let output: Record<string, unknown> | RuntimeDeferredStepOutput | undefined;
    try {
      const handler = pickHandler(step);
      if (handler) {
        output = (await handler({ execution, step, options: options || {} })) || undefined;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err || 'unknown error');
      step.state = 'failed';
      step.finishedAt = new Date().toISOString();
      step.noteAr = `فشلت الخطوة: ${message}`;
      execution.status = 'failed';
      execution.updatedAt = new Date().toISOString();
      events.push({ type: 'execution_failed', stepId: step.id, messageAr: step.noteAr, at: step.finishedAt });
      return { execution, events };
    }

    // Deferred async job output: do not complete the step.
    if (isDeferredOutput(output)) {
      const defer = output;
      step.state = 'waiting_input';
      step.noteAr = defer.noteAr || 'بانتظار اكتمال مهمة خلفية';
      step.output = defer;
      execution.outputs[step.key] = step.output;
      execution.status = 'waiting_input';
      execution.updatedAt = new Date().toISOString();
      events.push({ type: 'step_waiting', stepId: step.id, messageAr: step.noteAr, at: execution.updatedAt });
      break;
    }

    // Fallback simulation output when no handler
    if (!output) {
      output = step.actor === 'ai'
        ? { kind: 'ai', draft: step.type === 'draft' ? (options?.aiDraftText || 'مسودة أولية مولدة من محرك الذكاء') : undefined }
        : step.actor === 'human'
          ? { kind: 'human', note: 'اعتماد تلقائي (محاكاة)' }
          : { kind: 'system', ok: true };
    }

    step.state = 'completed';
    step.finishedAt = new Date().toISOString();
    step.output = output;
    execution.outputs[step.key] = output;
    events.push({ type: 'step_completed', stepId: step.id, messageAr: `اكتملت خطوة ${step.nameAr}`, at: step.finishedAt });
    execution.currentStepIndex += 1;
  }

  const done = execution.steps.filter((s) => s.state === 'completed' || s.state === 'skipped').length;
  execution.metrics.progressPercent = computeProgressPercent(done, execution.steps.length);
  execution.sla.breached = Boolean(execution.sla.dueAt && new Date(execution.sla.dueAt).getTime() < Date.now() && isExecutionActive(execution.status));
  execution.updatedAt = new Date().toISOString();

  if (execution.currentStepIndex >= execution.steps.length && execution.steps.every((s) => s.state === 'completed' || s.state === 'skipped')) {
    execution.status = 'completed';
    execution.completedAt = new Date().toISOString();
    execution.metrics.progressPercent = 100;
    events.push({ type: 'execution_completed', messageAr: 'اكتمل تنفيذ سير العمل', at: execution.completedAt });
  }

  return { execution, events };
}

/**
 * Execution status state machine:
 *   queued        -> running | paused
 *   running       -> waiting_input | completed | failed | paused
 *   waiting_input -> queued (via applyExecutionAction) | running | failed
 *   paused        -> queued (via resume)
 *   completed     -> (terminal)
 *   failed        -> (terminal)
 */
function isExecutionTerminalOrCompleted(status: RuntimeExecution['status']) {
  return status === 'completed' || status === 'failed' || status === 'paused';
}

function isExecutionActive(status: RuntimeExecution['status']) {
  return status === 'running' || status === 'waiting_input';
}

function isDeferredOutput(value: unknown): value is RuntimeDeferredStepOutput {
  return Boolean(value && typeof value === 'object' && '__defer' in (value as Record<string, unknown>));
}

