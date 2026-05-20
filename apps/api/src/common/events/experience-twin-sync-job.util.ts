export const EXPERIENCE_TWIN_SYNC_JOB_NAME = 'experience_twin_sync' as const;
export const EXPERIENCE_TWIN_SYNC_JOB_KIND = 'experience_twin_sync_v1' as const;

export type ExperienceTwinSyncReason = 'create' | 'manual' | 'simulation';

type ExperienceTwinSyncDiagnostics = {
  source?: 'http' | 'worker' | 'system';
  originMethod?: string | null;
  originPath?: string | null;
  parentSpanId?: string | null;
  enqueuedBy?: string | null;
  replayedFromJobId?: string | null;
  replayRequestedBy?: string | null;
  replayedAt?: string | null;
};

export type ExperienceTwinSyncJobPayload = {
  kind: typeof EXPERIENCE_TWIN_SYNC_JOB_KIND;
  experienceId: string;
  reason: ExperienceTwinSyncReason;
  organizationId?: string | null;
  projectId?: string | null;
  correlationId?: string | null;
  requestId?: string | null;
  traceparent?: string | null;
  traceId?: string | null;
  requestedByUserId?: string | null;
  diagnostics?: ExperienceTwinSyncDiagnostics | null;
  enqueuedAt: string;
};

export function buildExperienceTwinSyncJobPayload(input: {
  experienceId: string;
  reason: ExperienceTwinSyncReason;
  organizationId?: string | null;
  projectId?: string | null;
  correlationId?: string | null;
  requestId?: string | null;
  traceparent?: string | null;
  traceId?: string | null;
  requestedByUserId?: string | null;
  diagnostics?: ExperienceTwinSyncJobPayload['diagnostics'];
}): ExperienceTwinSyncJobPayload {
  return {
    kind: EXPERIENCE_TWIN_SYNC_JOB_KIND,
    experienceId: String(input.experienceId),
    reason: input.reason,
    organizationId: input.organizationId ?? null,
    projectId: input.projectId ?? null,
    correlationId: input.correlationId ?? null,
    requestId: input.requestId ?? null,
    traceparent: input.traceparent ?? null,
    traceId: input.traceId ?? null,
    requestedByUserId: input.requestedByUserId ?? null,
    diagnostics: input.diagnostics ?? null,
    enqueuedAt: new Date().toISOString(),
  };
}

function isExperienceTwinSyncDiagnostics(value: unknown): value is ExperienceTwinSyncDiagnostics {
  if (value == null) return true;
  if (typeof value !== 'object') return false;
  const diagnostics = value as Record<string, unknown>;
  return (
    (diagnostics.source == null || diagnostics.source === 'http' || diagnostics.source === 'worker' || diagnostics.source === 'system') &&
    (diagnostics.originMethod == null || typeof diagnostics.originMethod === 'string') &&
    (diagnostics.originPath == null || typeof diagnostics.originPath === 'string') &&
    (diagnostics.parentSpanId == null || typeof diagnostics.parentSpanId === 'string') &&
    (diagnostics.enqueuedBy == null || typeof diagnostics.enqueuedBy === 'string') &&
    (diagnostics.replayedFromJobId == null || typeof diagnostics.replayedFromJobId === 'string') &&
    (diagnostics.replayRequestedBy == null || typeof diagnostics.replayRequestedBy === 'string') &&
    (diagnostics.replayedAt == null || typeof diagnostics.replayedAt === 'string')
  );
}

export function isExperienceTwinSyncJobPayload(value: unknown): value is ExperienceTwinSyncJobPayload {
  const payload = value as Record<string, unknown> | null | undefined;
  return Boolean(
    payload &&
    payload.kind === EXPERIENCE_TWIN_SYNC_JOB_KIND &&
    typeof payload.experienceId === 'string' &&
    typeof payload.reason === 'string' &&
    (payload.reason === 'create' || payload.reason === 'manual' || payload.reason === 'simulation') &&
    typeof payload.enqueuedAt === 'string' &&
    (payload.traceId == null || typeof payload.traceId === 'string') &&
    isExperienceTwinSyncDiagnostics(payload.diagnostics),
  );
}

