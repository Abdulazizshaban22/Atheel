import { Injectable } from '@nestjs/common';
import { PrismaService } from '@madar/db';
import type { Prisma } from '@prisma/client';
import { buildAuditLogPayload } from '../../common/audit/audit-log-payload.util';
import { AUDIT_ENTITY_TYPES, CORE_EVENT_TYPES, CORE_MUTATION_ACTIONS, MUTATION_SUBJECT_KINDS, buildMutationSubject } from '../../common/contracts/resource-action.catalog';
import { buildDomainMutationEvent } from '../../common/events/domain-mutation-event.util';
import { buildExperienceTwinSyncJobPayload, type ExperienceTwinSyncJobPayload, type ExperienceTwinSyncReason } from '../../common/events/experience-twin-sync-job.util';
import { getRequestContext, withRequestContext } from '../../common/request-context';
import { createChildTraceContext } from '../../common/telemetry/trace-context.util';
import { AsyncDiagnosticsRegistryService } from '../../common/runtime/async-diagnostics-registry.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { OperationalEventsService } from '../operational-events/operational-events.service';
import { OperationalEventOutboxService } from '../outbox/operational-event-outbox.service';
import { QueueService } from '../queue/queue.service';
import { TwinService } from '../twin/twin.service';
import { ExperiencesRepository, type ExperienceDbClient } from './experiences.repository';
import type { EnsureTwinResult, ExperienceRecord } from './experience-core.types';

type ExperienceAuditTx = ExperienceDbClient & {
  auditLog: { create(args: { data: ReturnType<typeof buildAuditLogPayload> }): Promise<unknown> };
};
type TwinCreateResponse = { ok?: boolean; twin?: TwinRecord | null };
type TwinCreateInput = {
  projectId: string;
  kind: 'route';
  nameAr: string;
  metadata: Record<string, unknown>;
};

@Injectable()
export class ExperienceTwinOrchestratorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: ExperiencesRepository,
    private readonly twin: TwinService,
    private readonly queue: QueueService,
    private readonly auditLogs: AuditLogsService,
    private readonly events: OperationalEventsService,
    private readonly eventOutbox: OperationalEventOutboxService,
    private readonly diagnostics: AsyncDiagnosticsRegistryService,
  ) {}

  async ensureLinked(experienceId: string, input?: { reason?: ExperienceTwinSyncReason }) {
    return this.ensureLinkedNow(experienceId, { reason: input?.reason || 'manual' });
  }

  async enqueueEnsureLinked(experienceId: string, input?: { reason?: ExperienceTwinSyncReason; recordQueueAudit?: boolean }): Promise<EnsureTwinResult> {
    const reason = input?.reason || 'manual';
    const recordQueueAudit = input?.recordQueueAudit ?? true;
    const before = await this.repository.findById(experienceId);
    if (before.twinId) {
      return { ok: true, alreadyLinked: true, linked: false, reason, experience: before, twin: null, queued: false, mode: 'noop' };
    }

    const organizationId = await this.repository.resolveOrganizationIdForProject(before.projectId);
    const context = getRequestContext();
    const payload = buildExperienceTwinSyncJobPayload({
      experienceId,
      reason,
      organizationId,
      projectId: before.projectId,
      correlationId: context.correlationId || null,
      requestId: context.requestId || null,
      traceparent: context.traceparent || null,
      traceId: context.traceId || null,
      requestedByUserId: context.userId || null,
      diagnostics: {
        source: context.authSource === 'worker' ? 'worker' : 'http',
        originMethod: context.method || null,
        originPath: context.path || null,
        parentSpanId: context.spanId || null,
        enqueuedBy: context.userId || null,
      },
    });

    const queued = await this.queue.enqueueExperienceTwinSync(payload);
    if (!queued.enqueued) {
      this.diagnostics.record({
        kind: 'experience_twin_sync',
        phase: 'fallback_sync',
        source: payload.diagnostics?.source || 'system',
        entityId: experienceId,
        organizationId: organizationId || null,
        requestId: payload.requestId || null,
        correlationId: payload.correlationId || null,
        traceId: payload.traceId || null,
        traceparent: payload.traceparent || null,
        message: 'queue_unavailable_fallback_to_sync',
      });
      return this.ensureLinkedNow(experienceId, { reason });
    }

    this.diagnostics.record({
      kind: 'experience_twin_sync',
      phase: 'queued',
      source: payload.diagnostics?.source || 'system',
      queueName: queued.queue || null,
      jobId: queued.jobId != null ? String(queued.jobId) : null,
      entityId: experienceId,
      organizationId: organizationId || null,
      requestId: payload.requestId || null,
      correlationId: payload.correlationId || null,
      traceId: payload.traceId || null,
      traceparent: payload.traceparent || null,
      message: 'experience_twin_sync_job_enqueued',
    });

    if (recordQueueAudit) {
      await this.auditLogs.recordAction({
        organizationId,
        actorUserId: context.userId,
        action: CORE_MUTATION_ACTIONS.experienceTwinSyncQueued,
        entityType: AUDIT_ENTITY_TYPES.experience,
        entityId: experienceId,
        message: 'Experience twin sync queued',
        before,
        after: {
          reason,
          queue: queued.queue,
          jobId: queued.jobId ?? null,
          mode: queued.mode,
        },
      }).catch(() => null);
    }

    await this.emitQueuedEvent({ payload, queue: queued.queue, jobId: queued.jobId ?? null }).catch(() => null);

    return {
      ok: true,
      alreadyLinked: false,
      linked: false,
      queued: true,
      mode: queued.mode,
      queue: queued.queue,
      jobId: queued.jobId ? String(queued.jobId) : null,
      reason,
      experience: before,
      twin: null,
    };
  }

  async processQueuedSync(payload: ExperienceTwinSyncJobPayload) {
    const childTrace = createChildTraceContext(payload.traceparent || undefined);
    return withRequestContext(
      {
        requestId: payload.requestId || undefined,
        correlationId: payload.correlationId || undefined,
        traceparent: childTrace.traceparent,
        traceId: childTrace.traceId,
        spanId: childTrace.spanId,
        parentSpanId: childTrace.parentSpanId || undefined,
        organizationId: payload.organizationId || undefined,
        userId: payload.requestedByUserId || undefined,
        authSource: 'worker',
        method: 'QUEUE',
        path: `bullmq://${String(payload.kind || 'experience_twin_sync')}`,
      },
      () => this.ensureLinkedNow(payload.experienceId, { reason: payload.reason }),
    );
  }

  async recordQueuedSyncFailure(input: { payload: ExperienceTwinSyncJobPayload; message: string; attemptsMade?: number; maxAttempts?: number }) {
    const before = await this.repository.findById(input.payload.experienceId).catch(() => null);
    const organizationId = input.payload.organizationId || (before?.projectId ? await this.repository.resolveOrganizationIdForProject(before.projectId) : undefined);

    this.diagnostics.record({
      kind: 'experience_twin_sync',
      phase: 'terminal_failed',
      source: 'worker',
      entityId: input.payload.experienceId,
      organizationId: organizationId || null,
      requestId: input.payload.requestId || null,
      correlationId: input.payload.correlationId || null,
      traceId: input.payload.traceId || null,
      traceparent: input.payload.traceparent || null,
      attempt: input.attemptsMade ?? null,
      maxAttempts: input.maxAttempts ?? null,
      message: input.message,
    });

    await this.auditLogs.recordAction({
      organizationId,
      actorUserId: input.payload.requestedByUserId || undefined,
      action: CORE_MUTATION_ACTIONS.experienceTwinSyncWorkerFailed,
      entityType: AUDIT_ENTITY_TYPES.experience,
      entityId: input.payload.experienceId,
      message: 'Experience twin sync worker failed',
      before,
      after: {
        reason: input.payload.reason,
        error: input.message,
        attemptsMade: input.attemptsMade ?? null,
        maxAttempts: input.maxAttempts ?? null,
      },
    }).catch(() => null);

    const event = buildDomainMutationEvent({
      organizationId,
      actorType: 'worker',
      actorUserId: input.payload.requestedByUserId || null,
      correlationId: input.payload.correlationId || null,
      requestId: input.payload.requestId || null,
      eventType: CORE_EVENT_TYPES.experienceTwinSyncWorkerFailed,
      subject: buildMutationSubject(MUTATION_SUBJECT_KINDS.experience, input.payload.experienceId),
      severity: 'critical',
      data: {
        projectId: input.payload.projectId ?? before?.projectId ?? null,
        reason: input.payload.reason,
        error: input.message,
        attemptsMade: input.attemptsMade ?? null,
        maxAttempts: input.maxAttempts ?? null,
      },
    });

    try {
      const staged = await this.eventOutbox.stageEvent(event);
      await this.eventOutbox.dispatchStaged(staged.id);
    } catch {
      await this.events.emit(event).catch(() => null);
    }
  }

  private async emitQueuedEvent(input: { payload: ExperienceTwinSyncJobPayload; queue?: string | null; jobId?: string | number | null }) {
    const event = buildDomainMutationEvent({
      organizationId: input.payload.organizationId || undefined,
      correlationId: input.payload.correlationId || null,
      requestId: input.payload.requestId || null,
      eventType: CORE_EVENT_TYPES.experienceTwinSyncQueued,
      subject: buildMutationSubject(MUTATION_SUBJECT_KINDS.experience, input.payload.experienceId),
      data: {
        projectId: input.payload.projectId ?? null,
        reason: input.payload.reason,
        queue: input.queue ?? null,
        jobId: input.jobId != null ? String(input.jobId) : null,
      },
    });

    try {
      const staged = await this.eventOutbox.stageEvent(event);
      await this.eventOutbox.dispatchStaged(staged.id);
    } catch {
      await this.events.emit(event).catch(() => null);
    }
  }

  private async ensureLinkedNow(experienceId: string, input?: { reason?: ExperienceTwinSyncReason }): Promise<EnsureTwinResult> {
    const reason = input?.reason || 'manual';
    const before = await this.repository.findById(experienceId);
    if (before.twinId) {
      return { ok: true, alreadyLinked: true, linked: false, reason, experience: before, twin: null, queued: false, mode: 'direct' };
    }

    const organizationId = await this.repository.resolveOrganizationIdForProject(before.projectId);

    try {
      const createdTwin = await this.createTwinForExperience(before, reason);
      const result = await (this.prisma as PrismaService & { $transaction<T>(fn: (tx: ExperienceAuditTx) => Promise<T>): Promise<T> }).$transaction(async (tx: ExperienceAuditTx) => {
        const updated = await this.repository.update(experienceId, { twinId: createdTwin?.twin?.id ?? undefined }, tx as ExperienceDbClient);
        await this.writeTwinAudit(tx, {
          organizationId,
          experienceId,
          before,
          after: { twinId: updated.twinId ?? null, reason },
        });
        const staged = await this.eventOutbox.stageEvent(buildDomainMutationEvent({
          organizationId,
          eventType: CORE_EVENT_TYPES.experienceTwinEnsured,
          subject: buildMutationSubject(MUTATION_SUBJECT_KINDS.experience, experienceId),
          data: {
            projectId: updated.projectId,
            twinId: updated.twinId,
            reason,
          },
        }), tx as unknown as Prisma.TransactionClient);
        return { updated, outboxId: staged.id, twin: createdTwin?.twin ?? null };
      });

      await this.eventOutbox.dispatchStaged(result.outboxId);
      return { ok: true, linked: true, alreadyLinked: false, reason, experience: result.updated, twin: result.twin, queued: false, mode: 'direct' };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'experience_twin_ensure_failed';
      await this.recordTwinEnsureFailure({ experienceId, organizationId, before, reason, message });
      return { ok: false, linked: false, alreadyLinked: false, reason, experience: before, twin: null, error: message, queued: false, mode: 'direct' };
    }
  }

  private async createTwinForExperience(before: ExperienceRecord, reason: ExperienceTwinSyncReason): Promise<TwinCreateResponse> {
    const payload: TwinCreateInput = {
      projectId: before.projectId,
      kind: 'route',
      nameAr: `Twin تجربة: ${before.titleAr}`,
      metadata: { source: `experience_${reason}`, experienceId: before.id, experienceTitle: before.titleAr },
    };
    return this.twin.createTwin(payload);
  }

  private async writeTwinAudit(
    tx: ExperienceAuditTx,
    input: { organizationId?: string; experienceId: string; before: ExperienceRecord; after: { twinId: string | null; reason: ExperienceTwinSyncReason } },
  ) {
    await tx.auditLog.create({
      data: buildAuditLogPayload({
        organizationId: input.organizationId,
        action: CORE_MUTATION_ACTIONS.experienceTwinEnsure,
        entityType: AUDIT_ENTITY_TYPES.experience,
        entityId: input.experienceId,
        message: 'Experience twin ensured',
        before: input.before,
        after: input.after,
      }),
    });
  }

  private async recordTwinEnsureFailure(input: {
    experienceId: string;
    organizationId?: string;
    before: ExperienceRecord;
    reason: ExperienceTwinSyncReason;
    message: string;
  }) {
    await this.auditLogs.recordAction({
      organizationId: input.organizationId,
      actorUserId: getRequestContext().userId,
      action: CORE_MUTATION_ACTIONS.experienceTwinEnsureFailed,
      entityType: AUDIT_ENTITY_TYPES.experience,
      entityId: input.experienceId,
      message: 'Experience twin ensure failed',
      before: input.before,
      after: { reason: input.reason, error: input.message },
    }).catch(() => null);

    const event = buildDomainMutationEvent({
      organizationId: input.organizationId,
      eventType: CORE_EVENT_TYPES.experienceTwinSyncFailed,
      subject: buildMutationSubject(MUTATION_SUBJECT_KINDS.experience, input.experienceId),
      severity: 'warning',
      data: {
        projectId: input.before.projectId ?? null,
        reason: input.reason,
        error: input.message,
      },
    });

    try {
      const staged = await this.eventOutbox.stageEvent(event);
      await this.eventOutbox.dispatchStaged(staged.id);
    } catch {
      await this.events.emit(event).catch(() => null);
    }
  }
}
