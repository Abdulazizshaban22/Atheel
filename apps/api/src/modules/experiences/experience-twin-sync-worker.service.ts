import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { ExperienceTwinSyncJobPayload, isExperienceTwinSyncJobPayload } from '../../common/events/experience-twin-sync-job.util';
import { QueueRuntimeRegistryService } from '../../common/runtime/queue-runtime-registry.service';
import { AsyncDiagnosticsRegistryService } from '../../common/runtime/async-diagnostics-registry.service';
import { MetricsService } from '../metrics/metrics.service';
import { QueueService } from '../queue/queue.service';
import { ExperienceTwinOrchestratorService } from './experience-twin-orchestrator.service';

const WORKER_KEY = 'experience_twin_sync';

@Injectable()
export class ExperienceTwinSyncWorkerService implements OnModuleInit, OnModuleDestroy {
  private connection?: IORedis;
  private worker?: Worker<ExperienceTwinSyncJobPayload>;

  constructor(
    private readonly queue: QueueService,
    private readonly orchestrator: ExperienceTwinOrchestratorService,
    private readonly runtimeRegistry: QueueRuntimeRegistryService,
    private readonly diagnostics: AsyncDiagnosticsRegistryService,
    private readonly metrics: MetricsService,
  ) {}

  async onModuleInit() {
    const mode = this.queue.getMode();
    const enabled = String(process.env.EXPERIENCE_TWIN_SYNC_WORKER_ENABLED || 'true').toLowerCase() !== 'false';
    const redisUrl = this.queue.getRedisUrl();
    const queueName = this.queue.getExperienceTwinSyncQueueName();
    const concurrency = Math.max(1, Number(process.env.EXPERIENCE_TWIN_SYNC_WORKER_CONCURRENCY || 2));

    this.runtimeRegistry.registerWorker({
      workerKey: WORKER_KEY,
      queueName,
      enabled,
      mode: mode.mode,
      concurrency,
      state: enabled ? 'starting' : 'disabled',
    });
    this.metrics.setWorkerState(WORKER_KEY, enabled ? 'starting' : 'disabled');

    if (!enabled || mode.mode !== 'redis' || !redisUrl) {
      this.runtimeRegistry.markWorkerState(WORKER_KEY, enabled ? 'stopped' : 'disabled');
      this.metrics.setWorkerState(WORKER_KEY, enabled ? 'stopped' : 'disabled');
      return;
    }

    this.connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
    this.worker = new Worker<ExperienceTwinSyncJobPayload>(
      queueName,
      async (job) => this.processJob(job),
      {
        connection: this.connection,
        concurrency,
      },
    );

    this.worker.on('ready', () => {
      this.runtimeRegistry.markWorkerState(WORKER_KEY, 'running');
      this.metrics.setWorkerState(WORKER_KEY, 'running');
    });

    this.worker.on('active', (job: Job<ExperienceTwinSyncJobPayload>) => {
      if (!job || !isExperienceTwinSyncJobPayload(job.data)) return;
      this.runtimeRegistry.recordJobStarted(WORKER_KEY, { jobId: job.id, jobName: job.name });
      this.diagnostics.record({
        kind: 'experience_twin_sync',
        phase: 'started',
        source: 'worker',
        workerKey: WORKER_KEY,
        queueName,
        jobId: job.id != null ? String(job.id) : null,
        entityId: job.data.experienceId,
        organizationId: job.data.organizationId || null,
        requestId: job.data.requestId || null,
        correlationId: job.data.correlationId || null,
        traceId: job.data.traceId || null,
        traceparent: job.data.traceparent || null,
        attempt: Number(job.attemptsMade || 0) + 1,
        maxAttempts: Number(job.opts.attempts || 1),
      });
      this.metrics.setWorkerState(WORKER_KEY, 'running');
      this.metrics.incAsyncJob(WORKER_KEY, 'started');
      this.metrics.incAsyncDiagnostic('experience_twin_sync', 'started');
    });

    this.worker.on('completed', (job: Job<ExperienceTwinSyncJobPayload>) => {
      if (!job || !isExperienceTwinSyncJobPayload(job.data)) return;
      this.runtimeRegistry.recordJobCompleted(WORKER_KEY, { jobId: job.id, jobName: job.name });
      this.diagnostics.record({
        kind: 'experience_twin_sync',
        phase: 'completed',
        source: 'worker',
        workerKey: WORKER_KEY,
        queueName,
        jobId: job.id != null ? String(job.id) : null,
        entityId: job.data.experienceId,
        organizationId: job.data.organizationId || null,
        requestId: job.data.requestId || null,
        correlationId: job.data.correlationId || null,
        traceId: job.data.traceId || null,
        traceparent: job.data.traceparent || null,
        attempt: Number(job.attemptsMade || 0) + 1,
        maxAttempts: Number(job.opts.attempts || 1),
      });
      this.metrics.setWorkerState(WORKER_KEY, 'running');
      this.metrics.incAsyncJob(WORKER_KEY, 'completed');
      this.metrics.incAsyncDiagnostic('experience_twin_sync', 'completed');
      this.metrics.observeAsyncJobDuration(WORKER_KEY, 'completed', this.resolveJobDurationMs(job));
    });

    this.worker.on('failed', async (job: Job<ExperienceTwinSyncJobPayload> | undefined, err: Error | undefined) => {
      if (!job || !isExperienceTwinSyncJobPayload(job.data)) return;
      this.runtimeRegistry.recordJobFailed(WORKER_KEY, {
        jobId: job.id,
        jobName: job.name,
        error: String(err?.message || 'experience_twin_sync_worker_failed'),
      });
      this.metrics.setWorkerState(WORKER_KEY, 'degraded');
      this.metrics.incAsyncJob(WORKER_KEY, 'failed');
      this.metrics.observeAsyncJobDuration(WORKER_KEY, 'failed', this.resolveJobDurationMs(job));

      const attemptsMade = Number(job.attemptsMade || 0);
      const maxAttempts = Number(job.opts.attempts || 1);
      const terminal = attemptsMade >= maxAttempts;
      this.diagnostics.record({
        kind: 'experience_twin_sync',
        phase: terminal ? 'terminal_failed' : 'retrying',
        source: 'worker',
        workerKey: WORKER_KEY,
        queueName,
        jobId: job.id != null ? String(job.id) : null,
        entityId: job.data.experienceId,
        organizationId: job.data.organizationId || null,
        requestId: job.data.requestId || null,
        correlationId: job.data.correlationId || null,
        traceId: job.data.traceId || null,
        traceparent: job.data.traceparent || null,
        attempt: attemptsMade,
        maxAttempts,
        message: String(err?.message || 'experience_twin_sync_worker_failed'),
      });
      this.metrics.incAsyncDiagnostic('experience_twin_sync', terminal ? 'terminal_failed' : 'retrying');
      if (terminal) {
        await this.orchestrator.recordQueuedSyncFailure({
          payload: job.data,
          message: String(err?.message || 'experience_twin_sync_worker_failed'),
          attemptsMade,
          maxAttempts,
        }).catch(() => null);
      }
    });

    this.worker.on('error', (err: Error | undefined) => {
      this.runtimeRegistry.markWorkerState(WORKER_KEY, 'failed', {
        error: String(err?.message || 'experience_twin_sync_worker_error'),
      });
      this.metrics.setWorkerState(WORKER_KEY, 'failed');
    });
  }

  async onModuleDestroy() {
    await this.worker?.close().catch(() => null);
    await this.connection?.quit().catch(() => null);
    this.runtimeRegistry.unregisterWorker(WORKER_KEY);
    this.metrics.setWorkerState(WORKER_KEY, 'stopped');
  }

  private async processJob(job: Job<ExperienceTwinSyncJobPayload>) {
    if (!isExperienceTwinSyncJobPayload(job.data)) {
      throw new Error('invalid_experience_twin_sync_job_payload');
    }

    const result = await this.orchestrator.processQueuedSync(job.data);
    if (!result.ok) {
      throw new Error(String(result.error || 'experience_twin_sync_failed'));
    }
    return result;
  }

  private resolveJobDurationMs(job: Job<ExperienceTwinSyncJobPayload>) {
    const processedOn = Number(job.processedOn || 0);
    const finishedOn = Number(job.finishedOn || 0);
    if (processedOn > 0 && finishedOn >= processedOn) {
      return finishedOn - processedOn;
    }
    return null;
  }
}
