export type RuntimePriority = 'low' | 'normal' | 'high' | 'urgent';

export type ExecutionStepState = 'pending' | 'running' | 'completed' | 'waiting_input' | 'skipped' | 'failed';

export interface RuntimeExecutionStep {
  id: string;
  key: string;
  nameAr: string;
  actor: 'system' | 'ai' | 'human';
  type: string;
  requiresRag?: boolean;
  requiresApproval?: boolean;
  state: ExecutionStepState;
  startedAt?: string;
  finishedAt?: string;
  noteAr?: string;
  output?: Record<string, unknown>;
  retries: number;
}

export interface RuntimeExecution {
  id: string;
  templateId: string;
  instanceId?: string;
  organizationId?: string;
  projectId?: string;
  status: 'queued' | 'running' | 'waiting_input' | 'completed' | 'failed' | 'paused';
  priority: RuntimePriority;
  queueScore: number;
  currentStepIndex: number;
  steps: RuntimeExecutionStep[];
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  metrics: {
    estimatedCostUsd: number;
    estimatedLatencyMs: number;
    automationRateTarget: number;
    progressPercent: number;
    humanTouches: number;
    aiCalls: number;
  };
  sla: {
    dueAt?: string;
    targetMinutes?: number;
    breached: boolean;
  };
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface RuntimeTickOptions {
  hasKnowledge?: boolean;
  hasApprovalActor?: boolean;
  autoApprove?: boolean;
  maxAutoSteps?: number;
  aiDraftText?: string;

  /**
   * Optional step handlers to execute real logic per step type.
   * If omitted, tickExecution() runs in simulation mode.
   */
  handlers?: Record<string, RuntimeStepHandler>;

  /** Optional passthrough context available to handlers. */
  handlerContext?: Record<string, unknown>;
}

/**
 * Special handler output to defer a step into an async/background job.
 * When returned, the runtime will keep the step in waiting_input without advancing.
 */
export type RuntimeDeferredStepOutput = {
  __defer: true;
  noteAr?: string;
  job?: {
    queue?: string;
    jobId?: string | number;
    idempotencyKey?: string;
  };
  meta?: Record<string, unknown>;
};

export type RuntimeStepHandler = (ctx: {
  execution: RuntimeExecution;
  step: RuntimeExecutionStep;
  options: RuntimeTickOptions;
}) => Promise<Record<string, unknown> | undefined> | (Record<string, unknown> | undefined);

export interface RuntimeTickResult {
  execution: RuntimeExecution;
  events: Array<{
    type: 'step_started' | 'step_completed' | 'step_waiting' | 'execution_completed' | 'execution_failed';
    stepId?: string;
    messageAr: string;
    at: string;
  }>;
}
