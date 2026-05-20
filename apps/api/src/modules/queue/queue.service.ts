import { Injectable } from '@nestjs/common';
import { Job, Queue, type JobsOptions } from 'bullmq';
import IORedis from 'ioredis';
import { getRequestContext } from '../../common/request-context';
import { QueueRuntimeRegistryService } from '../../common/runtime/queue-runtime-registry.service';
import { EXPERIENCE_TWIN_SYNC_JOB_NAME, buildExperienceTwinSyncJobPayload, isExperienceTwinSyncJobPayload, type ExperienceTwinSyncJobPayload } from '../../common/events/experience-twin-sync-job.util';

export type QueueMode = 'redis' | 'sync';

type QueueJobOptions = JobsOptions & { deduplication?: { id: string } };

@Injectable()
export class QueueService {
  private readonly mode: QueueMode;
  private readonly redisUrl?: string;
  private connection?: IORedis;
  private executionsQueue?: Queue;
  private escalationsQueue?: Queue;
  private twinSimulationsQueue?: Queue;
  private experienceTwinSyncQueue?: Queue;
  private exportsQueue?: Queue;
  private publishQueue?: Queue;
  private reportQueue?: Queue;
  private competitionsQueue?: Queue;
  private radarScanQueue?: Queue;
  private obligationsQueue?: Queue;
  private outboxQueue?: Queue;
  private serviceOutboxQueue?: Queue;

  constructor(private readonly runtimeRegistry: QueueRuntimeRegistryService) {
    const envMode = (process.env.QUEUE_MODE || '').toLowerCase();
    const redisUrl = process.env.REDIS_URL || process.env.REDIS_CONNECTION_STRING;
    this.redisUrl = redisUrl;

    if (envMode === 'sync') {
      this.mode = 'sync';
    } else if (redisUrl) {
      this.mode = 'redis';
    } else {
      this.mode = 'sync';
    }

    if (this.mode === 'redis' && this.redisUrl) {
      this.connection = new IORedis(this.redisUrl, { maxRetriesPerRequest: null });
      this.executionsQueue = new Queue(process.env.QUEUE_NAME || 'atheel-workflow-executions', { connection: this.connection });
      this.escalationsQueue = new Queue(process.env.ESCALATION_QUEUE || 'atheel-workflow-escalations', { connection: this.connection });
      this.twinSimulationsQueue = new Queue(process.env.TWIN_SIM_QUEUE || 'atheel-twin-simulations', { connection: this.connection });
      this.experienceTwinSyncQueue = new Queue(process.env.EXPERIENCE_TWIN_SYNC_QUEUE || 'atheel-experience-twin-sync', { connection: this.connection });
      this.exportsQueue = new Queue(process.env.EXPORT_QUEUE || 'atheel-exports', { connection: this.connection });
      this.publishQueue = new Queue(process.env.PUBLISH_QUEUE || 'atheel-workflow-publish', { connection: this.connection });
      this.reportQueue = new Queue(process.env.REPORT_QUEUE || 'atheel-workflow-report', { connection: this.connection });
      this.competitionsQueue = new Queue(process.env.COMPETITIONS_QUEUE || 'atheel-competitions', { connection: this.connection });
      this.radarScanQueue = new Queue(process.env.RADAR_SCAN_QUEUE || 'atheel-radar-scan', { connection: this.connection });
      this.obligationsQueue = new Queue(process.env.OBLIGATIONS_QUEUE || 'atheel-obligations', { connection: this.connection });
      this.outboxQueue = new Queue(process.env.OUTBOX_QUEUE || 'atheel-outbox', { connection: this.connection });
      this.serviceOutboxQueue = new Queue(process.env.SERVICE_OUTBOX_QUEUE || 'atheel-service-outbox', { connection: this.connection });
    }
  }

  getMode() {
    return { mode: this.mode, redisUrl: this.redisUrl };
  }

  getRedisUrl() {
    return this.redisUrl;
  }

  getExperienceTwinSyncQueueName() {
    return process.env.EXPERIENCE_TWIN_SYNC_QUEUE || this.experienceTwinSyncQueue?.name || 'atheel-experience-twin-sync';
  }

  async enqueueExecution(executionId: string, opts?: { priority?: 'low' | 'normal' | 'high' | 'urgent'; attempts?: number }) {
    if (this.mode !== 'redis' || !this.executionsQueue) return { enqueued: false, mode: this.mode };

    const priority = opts?.priority || 'normal';
    const bullPriority = priority === 'urgent' ? 1 : priority === 'high' ? 2 : priority === 'normal' ? 3 : 4;
    const job = await this.executionsQueue.add(
      'execute',
      {
        executionId,
        correlationId: getRequestContext().correlationId || null,
        tick: {
          hasKnowledge: true,
          hasApprovalActor: true,
          autoApprove: false,
          maxAutoSteps: 60,
        },
      },
      {
        attempts: Math.max(1, opts?.attempts ?? 5),
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 200,
        removeOnFail: 500,
        priority: bullPriority,
      },
    );

    return { enqueued: true, mode: this.mode, jobId: job.id };
  }



  async enqueueExperienceTwinSync(payload: ExperienceTwinSyncJobPayload, opts?: { attempts?: number; replayTag?: string; dedupe?: boolean }) {
    if (this.mode !== 'redis' || !this.experienceTwinSyncQueue) return { enqueued: false, mode: this.mode };

    const dedupe = opts?.dedupe ?? true;
    const baseKey = opts?.replayTag
      ? `experience_twin_sync_${payload.experienceId}_${opts.replayTag}`
      : `experience_twin_sync_${payload.experienceId}`;
    const idempotencyKey = baseKey;
    const jobId = this.safeJobId(idempotencyKey);
    const job = await this.experienceTwinSyncQueue.add(
      EXPERIENCE_TWIN_SYNC_JOB_NAME,
      payload,
      this.queueJobOptions({
        attempts: Math.max(1, opts?.attempts ?? 4),
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: 200,
        removeOnFail: 500,
        ...(dedupe ? { deduplication: { id: idempotencyKey } } : {}),
        jobId,
      }),
    );

    return { enqueued: true, mode: this.mode, jobId: job.id, queue: this.experienceTwinSyncQueue.name, idempotencyKey };
  }

  async enqueueTwinSimulation(runId: string, opts?: { attempts?: number }) {
    if (this.mode !== 'redis' || !this.twinSimulationsQueue) return { enqueued: false, mode: this.mode };

    const job = await this.twinSimulationsQueue.add(
      'simulate',
      { runId, correlationId: getRequestContext().correlationId || null },
      {
        attempts: Math.max(1, opts?.attempts ?? 3),
        backoff: { type: 'fixed', delay: 5000 },
        removeOnComplete: 200,
        removeOnFail: 500,
      },
    );

    return { enqueued: true, mode: this.mode, jobId: job.id };
  }

  async scheduleEscalation(executionId: string, dueAt?: string) {
    if (this.mode !== 'redis' || !this.escalationsQueue) return { scheduled: false, mode: this.mode };

    const now = Date.now();
    const due = dueAt ? new Date(dueAt).getTime() : now + 30 * 60_000;
    const delay = Math.max(0, due - now);

    const job = await this.escalationsQueue.add(
      'escalate',
      { executionId, dueAt, correlationId: getRequestContext().correlationId || null },
      {
        delay,
        attempts: 3,
        backoff: { type: 'fixed', delay: 10_000 },
        removeOnComplete: 200,
        removeOnFail: 500,
      },
    );

    return { scheduled: true, mode: this.mode, jobId: job.id, delayMs: delay };
  }




  async enqueueAiDecision(job: { jobId: string; recommendationKind: string; organizationId?: string; projectId?: string; entityId?: string; payload?: Record<string, unknown> }) {
    if (this.mode !== 'redis' || !this.reportQueue) return { enqueued: false, mode: this.mode };
    const queueJob = await this.reportQueue.add(
      'ai_decision',
      { ...job, correlationId: getRequestContext().correlationId || null },
      this.queueJobOptions({ attempts: 4, backoff: { type: 'exponential', delay: 2000 }, removeOnComplete: 200, removeOnFail: 500, jobId: this.safeJobId(job.jobId) }),
    );
    return { enqueued: true, mode: this.mode, queue: this.reportQueue.name, jobId: queueJob.id };
  }

  async enqueueStudioRefresh(job: { jobId: string; projectId: string; organizationId?: string; payload?: Record<string, unknown> }) {
    if (this.mode !== 'redis' || !this.publishQueue) return { enqueued: false, mode: this.mode };
    const queueJob = await this.publishQueue.add(
      'studio_refresh',
      { ...job, correlationId: getRequestContext().correlationId || null },
      this.queueJobOptions({ attempts: 3, backoff: { type: 'fixed', delay: 3000 }, removeOnComplete: 200, removeOnFail: 500, jobId: this.safeJobId(job.jobId) }),
    );
    return { enqueued: true, mode: this.mode, queue: this.publishQueue.name, jobId: queueJob.id };
  }

  async enqueueTwinDecision(job: { jobId: string; twinId: string; organizationId?: string; projectId?: string; payload?: Record<string, unknown> }) {
    if (this.mode !== 'redis' || !this.twinSimulationsQueue) return { enqueued: false, mode: this.mode };
    const queueJob = await this.twinSimulationsQueue.add(
      'decision_summary',
      { ...job, correlationId: getRequestContext().correlationId || null },
      this.queueJobOptions({ attempts: 4, backoff: { type: 'fixed', delay: 4000 }, removeOnComplete: 200, removeOnFail: 500, jobId: this.safeJobId(job.jobId) }),
    );
    return { enqueued: true, mode: this.mode, queue: this.twinSimulationsQueue.name, jobId: queueJob.id };
  }
  async scheduleEscalationTask(params: { kind: 'workflow'|'approval'|'obligation'; id: string; dueAt?: string }) {
    if (this.mode !== 'redis' || !this.escalationsQueue) return { scheduled: false, mode: this.mode };

    const now = Date.now();
    const due = params.dueAt ? new Date(params.dueAt).getTime() : now + 30 * 60_000;
    const delay = Math.max(0, due - now);

    const job = await this.escalationsQueue.add(
      'escalate',
      { kind: params.kind, id: params.id, dueAt: params.dueAt },
      {
        delay,
        attempts: 3,
        backoff: { type: 'fixed', delay: 10_000 },
        removeOnComplete: 200,
        removeOnFail: 500,
      },
    );

    return { scheduled: true, mode: this.mode, jobId: job.id, delayMs: delay };
  }


  async enqueueOutbox(outboxId: string, opts?: { attempts?: number }) {
    if (this.mode !== 'redis' || !this.outboxQueue) return { enqueued: false, mode: this.mode };
    const idempotencyKey = `outbox_${outboxId}`;
    const jobId = this.safeJobId(idempotencyKey);
    const job = await this.outboxQueue.add(
      'outbox',
      { outboxId },
      this.queueJobOptions({
        attempts: Math.max(1, opts?.attempts ?? 5),
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 200,
        removeOnFail: 500,
        deduplication: { id: idempotencyKey },
        jobId,
      }),
    );
    return { enqueued: true, mode: this.mode, jobId: job.id, queue: this.outboxQueue.name };
  }

  /**
   * Schedules a future retry for a specific outbox message.
   * Uses a unique jobId (so it can be re-scheduled even if a previous job exists in completed history).
   */
  async scheduleOutboxRetry(outboxId: string, runAt: Date, opts?: { attempts?: number }) {
    if (this.mode !== 'redis' || !this.outboxQueue) return { scheduled: false, mode: this.mode };
    const now = Date.now();
    const at = new Date(runAt).getTime();
    const delay = Math.max(0, at - now);
    const jobId = this.safeJobId(`outbox_${outboxId}_${Date.now()}`);
    const job = await this.outboxQueue.add(
      'outbox',
      { outboxId },
      this.queueJobOptions({
        delay,
        attempts: Math.max(1, opts?.attempts ?? 5),
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 200,
        removeOnFail: 500,
        jobId,
      }),
    );
    return { scheduled: true, mode: this.mode, jobId: job.id, delayMs: delay, queue: this.outboxQueue.name };
  }



  async enqueueServiceOutbox(serviceOutboxId: string, opts?: { attempts?: number }) {
    if (this.mode !== 'redis' || !this.serviceOutboxQueue) return { enqueued: false, mode: this.mode };
    const idempotencyKey = `service_outbox_${serviceOutboxId}`;
    const jobId = this.safeJobId(idempotencyKey);
    const job = await this.serviceOutboxQueue.add(
      'service_outbox',
      { serviceOutboxId, correlationId: getRequestContext().correlationId || null },
      this.queueJobOptions({
        attempts: Math.max(1, opts?.attempts ?? 8),
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 200,
        removeOnFail: 500,
        deduplication: { id: idempotencyKey },
        jobId,
      }),
    );
    return { enqueued: true, mode: this.mode, jobId: job.id, queue: this.serviceOutboxQueue.name };
  }

  async scheduleServiceOutboxRetry(serviceOutboxId: string, runAt: Date, opts?: { attempts?: number }) {
    if (this.mode !== 'redis' || !this.serviceOutboxQueue) return { scheduled: false, mode: this.mode };
    const now = Date.now();
    const at = new Date(runAt).getTime();
    const delay = Math.max(0, at - now);
    const jobId = this.safeJobId(`service_outbox_${serviceOutboxId}_${Date.now()}`);
    const job = await this.serviceOutboxQueue.add(
      'service_outbox',
      { serviceOutboxId, correlationId: getRequestContext().correlationId || null },
      this.queueJobOptions({
        delay,
        attempts: Math.max(1, opts?.attempts ?? 8),
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 200,
        removeOnFail: 500,
        jobId,
      }),
    );
    return { scheduled: true, mode: this.mode, jobId: job.id, delayMs: delay, queue: this.serviceOutboxQueue.name };
  }

  async enqueueExport(exportJobId: string, opts?: { attempts?: number }) {
    if (this.mode !== 'redis' || !this.exportsQueue) return { enqueued: false, mode: this.mode };
    const job = await this.exportsQueue.add(
      'export',
      { exportJobId, correlationId: getRequestContext().correlationId || null },
      {
        attempts: Math.max(1, opts?.attempts ?? 2),
        backoff: { type: 'fixed', delay: 8000 },
        removeOnComplete: 200,
        removeOnFail: 500,
      },
    );
    return { enqueued: true, mode: this.mode, jobId: job.id };
  }

  private queueJobOptions(options: QueueJobOptions): QueueJobOptions {
    return options;
  }

  private safeJobId(s: string) {
    // BullMQ warns that custom job ids must not contain ':' (Redis naming convention).
    return s.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/:+/g, '_');
  }

  async enqueuePublishStep(params: { executionId: string; stepId: string }, opts?: { attempts?: number }) {
    if (this.mode !== 'redis' || !this.publishQueue) return { enqueued: false, mode: this.mode };
    const idempotencyKey = `publish_${params.executionId}_${params.stepId}`;
    const jobId = this.safeJobId(idempotencyKey);
    const job = await this.publishQueue.add(
      'publish',
      { executionId: params.executionId, stepId: params.stepId },
      this.queueJobOptions({
        // attempts + backoff are BullMQ-native retry controls.
        attempts: Math.max(1, opts?.attempts ?? 3),
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 200,
        removeOnFail: 500,
        // Deduplicate while the first job is still running.
        deduplication: { id: idempotencyKey },
        jobId,
      }),
    );
    return { enqueued: true, mode: this.mode, jobId: job.id, idempotencyKey, queue: this.publishQueue.name };
  }

  async enqueueReportStep(params: { executionId: string; stepId: string }, opts?: { attempts?: number }) {
    if (this.mode !== 'redis' || !this.reportQueue) return { enqueued: false, mode: this.mode };
    const idempotencyKey = `report_${params.executionId}_${params.stepId}`;
    const jobId = this.safeJobId(idempotencyKey);
    const job = await this.reportQueue.add(
      'report',
      { executionId: params.executionId, stepId: params.stepId },
      this.queueJobOptions({
        attempts: Math.max(1, opts?.attempts ?? 3),
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 200,
        removeOnFail: 500,
        deduplication: { id: idempotencyKey },
        jobId,
      }),
    );
    return { enqueued: true, mode: this.mode, jobId: job.id, idempotencyKey, queue: this.reportQueue.name };
  }

  async enqueueCompetitionAnalyze(params: { competitionId: string; attachmentId: string }, opts?: { attempts?: number }) {
    if (this.mode !== 'redis' || !this.competitionsQueue) return { enqueued: false, mode: this.mode };
    const idempotencyKey = `competition_analyze_${params.competitionId}_${params.attachmentId}`;
    const jobId = this.safeJobId(idempotencyKey);
    const job = await this.competitionsQueue.add(
      'analyze',
      { competitionId: params.competitionId, attachmentId: params.attachmentId },
      this.queueJobOptions({
        attempts: Math.max(1, opts?.attempts ?? 2),
        backoff: { type: 'exponential', delay: 4000 },
        removeOnComplete: 200,
        removeOnFail: 500,
        deduplication: { id: idempotencyKey },
        jobId,
      }),
    );
    return { enqueued: true, mode: this.mode, jobId: job.id, idempotencyKey, queue: this.competitionsQueue.name };
  }

  async enqueueRadarScan(params: { organizationId?: string }, opts?: { attempts?: number }) {
    if (this.mode !== 'redis' || !this.radarScanQueue) return { enqueued: false, mode: this.mode };
    const idempotencyKey = `radar_scan_${params.organizationId || 'global'}`;
    const jobId = this.safeJobId(`${idempotencyKey}_${Date.now()}`);
    const job = await this.radarScanQueue.add(
      'scan',
      { organizationId: params.organizationId || null },
      {
        attempts: Math.max(1, opts?.attempts ?? 2),
        backoff: { type: 'fixed', delay: 15000 },
        removeOnComplete: 200,
        removeOnFail: 500,
      },
    );
    return { enqueued: true, mode: this.mode, jobId: job.id, queue: this.radarScanQueue.name };
  }

  async scheduleRadarScan(params: { organizationId?: string; everyMs: number }) {
    if (this.mode !== 'redis' || !this.radarScanQueue) return { scheduled: false, mode: this.mode };
    const idempotencyKey = `radar_scan_repeat_${params.organizationId || 'global'}`;
    const jobId = this.safeJobId(idempotencyKey);
    const job = await this.radarScanQueue.add(
      'scan',
      { organizationId: params.organizationId || null },
      this.queueJobOptions({
        repeat: { every: Math.max(60_000, params.everyMs) },
        jobId,
        removeOnComplete: true,
        removeOnFail: false,
      }),
    );
    return { scheduled: true, mode: this.mode, jobId: job.id, everyMs: params.everyMs, queue: this.radarScanQueue.name };
  }

  async scheduleObligationReminder(
    params: { obligationId: string; reminderId: string; remindAtIso: string },
    opts?: { attempts?: number },
  ) {
    if (this.mode !== 'redis' || !this.obligationsQueue) return { scheduled: false, mode: this.mode };

    const now = Date.now();
    const t = new Date(params.remindAtIso).getTime();
    const delay = Math.max(0, t - now);

    const idempotencyKey = `obligation_reminder_${params.reminderId}`;
    const jobId = this.safeJobId(idempotencyKey);

    const job = await this.obligationsQueue.add(
      'remind',
      { obligationId: params.obligationId, reminderId: params.reminderId, remindAtIso: params.remindAtIso },
      this.queueJobOptions({
        delay,
        attempts: Math.max(1, opts?.attempts ?? 3),
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 200,
        removeOnFail: 500,
        deduplication: { id: idempotencyKey },
        jobId,
      }),
    );

    return { scheduled: true, mode: this.mode, jobId: job.id, delayMs: delay, queue: this.obligationsQueue.name, idempotencyKey };
  }


  async getQueueStats() {
    if (this.mode !== 'redis') {
      return {
        ok: true,
        mode: this.mode,
        queues: [],
        totals: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, paused: 0 },
      };
    }

    const defs = [
      ['executions', this.executionsQueue],
      ['escalations', this.escalationsQueue],
      ['twinSimulations', this.twinSimulationsQueue],
      ['experienceTwinSync', this.experienceTwinSyncQueue],
      ['exports', this.exportsQueue],
      ['publish', this.publishQueue],
      ['report', this.reportQueue],
      ['competitions', this.competitionsQueue],
      ['radarScan', this.radarScanQueue],
      ['obligations', this.obligationsQueue],
      ['outbox', this.outboxQueue],
      ['serviceOutbox', this.serviceOutboxQueue],
    ] as const;

    const items = await Promise.all(defs.map(async ([key, queue]) => {
      if (!queue) return null;
      const counts = await queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed', 'paused');
      return {
        key,
        name: queue.name,
        counts: {
          waiting: counts.waiting || 0,
          active: counts.active || 0,
          completed: counts.completed || 0,
          failed: counts.failed || 0,
          delayed: counts.delayed || 0,
          paused: counts.paused || 0,
        },
      };
    }));

    const queues = items.filter(Boolean) as Array<{
      key: string;
      name: string;
      counts: { waiting: number; active: number; completed: number; failed: number; delayed: number; paused: number };
    }>;

    const totals = queues.reduce((acc, q) => ({
      waiting: acc.waiting + q.counts.waiting,
      active: acc.active + q.counts.active,
      completed: acc.completed + q.counts.completed,
      failed: acc.failed + q.counts.failed,
      delayed: acc.delayed + q.counts.delayed,
      paused: acc.paused + q.counts.paused,
    }), { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, paused: 0 });

    for (const queue of queues) {
      this.runtimeRegistry.updateQueueCounts({ key: queue.key, name: queue.name, counts: queue.counts });
    }

    return { ok: true, mode: this.mode, queues, totals };
  }

  async getOperationalSnapshot() {
    const stats = await this.getQueueStats();
    const redis = await this.checkRedisConnectivity();
    return {
      ok: stats.ok && (this.mode !== 'redis' || redis.ok),
      mode: this.mode,
      redis,
      stats,
      runtime: this.runtimeRegistry.getSnapshot(),
      timestamp: new Date().toISOString(),
    };
  }


  async listExperienceTwinSyncDeadLetters(limit = 20) {
    if (this.mode !== 'redis' || !this.experienceTwinSyncQueue) {
      return { ok: false, mode: this.mode, queue: this.getExperienceTwinSyncQueueName(), jobs: [], detail: 'experience_twin_sync_queue_unavailable' };
    }

    const jobs = await this.experienceTwinSyncQueue.getJobs(['failed'], 0, Math.max(0, Number(limit || 20) - 1), false);
    return {
      ok: true,
      mode: this.mode,
      queue: this.experienceTwinSyncQueue.name,
      jobs: jobs
        .map((job) => this.mapExperienceTwinSyncDeadLetter(job as Job<ExperienceTwinSyncJobPayload>))
        .filter(Boolean),
    };
  }

  async getExperienceTwinSyncDeadLetter(jobId: string) {
    if (this.mode !== 'redis' || !this.experienceTwinSyncQueue) {
      return null;
    }

    const job = await this.experienceTwinSyncQueue.getJob(jobId);
    if (!job || job.failedReason == null || !isExperienceTwinSyncJobPayload(job.data)) {
      return null;
    }

    return this.mapExperienceTwinSyncDeadLetter(job as Job<ExperienceTwinSyncJobPayload>);
  }

  async replayExperienceTwinSyncDeadLetter(jobId: string, opts?: { attempts?: number }) {
    const record = await this.getExperienceTwinSyncDeadLetter(jobId);
    if (!record) {
      return { replayed: false, mode: this.mode, reason: 'dead_letter_job_not_found' as const };
    }

    const ctx = getRequestContext();
    const payload = buildExperienceTwinSyncJobPayload({
      experienceId: record.payload.experienceId,
      reason: record.payload.reason,
      organizationId: record.payload.organizationId || null,
      projectId: record.payload.projectId || null,
      correlationId: ctx.correlationId || record.payload.correlationId || null,
      requestId: ctx.requestId || record.payload.requestId || null,
      traceparent: ctx.traceparent || record.payload.traceparent || null,
      traceId: ctx.traceId || record.payload.traceId || null,
      requestedByUserId: ctx.userId || record.payload.requestedByUserId || null,
      diagnostics: {
        ...(record.payload.diagnostics || {}),
        source: 'system',
        enqueuedBy: ctx.userId || record.payload.requestedByUserId || null,
        replayedFromJobId: String(jobId),
        replayRequestedBy: ctx.userId || null,
        replayedAt: new Date().toISOString(),
      },
    });

    const queued = await this.enqueueExperienceTwinSync(payload, {
      attempts: Math.max(1, Number(opts?.attempts || record.maxAttempts || 4)),
      replayTag: `replay_${this.safeJobId(String(jobId))}_${Date.now()}`,
      dedupe: false,
    });

    if (!queued.enqueued) {
      return { replayed: false, mode: this.mode, reason: 'dead_letter_replay_enqueue_failed' as const, jobId, payload };
    }

    return {
      replayed: true,
      mode: this.mode,
      queue: queued.queue,
      originalJobId: String(jobId),
      replayJobId: queued.jobId != null ? String(queued.jobId) : null,
      entityId: payload.experienceId,
      organizationId: payload.organizationId || null,
      requestId: payload.requestId || null,
      correlationId: payload.correlationId || null,
      traceId: payload.traceId || null,
      traceparent: payload.traceparent || null,
      payload,
    };
  }

  private mapExperienceTwinSyncDeadLetter(job: Job<ExperienceTwinSyncJobPayload>) {
    if (!isExperienceTwinSyncJobPayload(job.data)) {
      return null;
    }

    return {
      jobId: job.id != null ? String(job.id) : null,
      name: job.name,
      queue: this.experienceTwinSyncQueue?.name || this.getExperienceTwinSyncQueueName(),
      state: 'failed' as const,
      failedReason: job.failedReason || null,
      attemptsMade: Number(job.attemptsMade || 0),
      maxAttempts: Number(job.opts.attempts || 1),
      timestamp: job.finishedOn ? new Date(Number(job.finishedOn)).toISOString() : null,
      stacktrace: Array.isArray(job.stacktrace) ? job.stacktrace.slice(0, 10) : [],
      payload: job.data,
    };
  }

  async checkRedisConnectivity() {
    if (this.mode !== 'redis' || !this.connection) {
      return {
        ok: this.mode !== 'redis',
        mode: this.mode,
        detail: this.mode === 'redis' ? 'redis_connection_unavailable' : 'queue_mode_sync',
      };
    }

    const startedAt = Date.now();
    try {
      const pong = await this.connection.ping();
      return {
        ok: pong === 'PONG',
        mode: this.mode,
        latencyMs: Date.now() - startedAt,
        detail: pong === 'PONG' ? 'redis_ok' : `redis_unexpected_${String(pong).toLowerCase()}`,
      };
    } catch (error) {
      return {
        ok: false,
        mode: this.mode,
        latencyMs: Date.now() - startedAt,
        detail: error instanceof Error ? error.message : 'redis_ping_failed',
      };
    }
  }

}
