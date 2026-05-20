import { Injectable } from '@nestjs/common';

export type QueueWorkerState = 'disabled' | 'starting' | 'running' | 'degraded' | 'failed' | 'stopped';

export type QueueWorkerRuntimeSnapshot = {
  workerKey: string;
  queueName: string;
  enabled: boolean;
  mode: 'redis' | 'sync';
  state: QueueWorkerState;
  concurrency?: number;
  registeredAt: string;
  startedAt?: string;
  lastHeartbeatAt?: string;
  lastJobId?: string | null;
  lastJobName?: string | null;
  lastJobStartedAt?: string;
  lastJobCompletedAt?: string;
  lastJobFailedAt?: string;
  processedJobs: number;
  failedJobs: number;
  lastError?: string | null;
};

export type QueueCountsSnapshot = {
  key: string;
  name: string;
  counts: { waiting: number; active: number; completed: number; failed: number; delayed: number; paused: number };
  capturedAt: string;
};

@Injectable()
export class QueueRuntimeRegistryService {
  private readonly workers = new Map<string, QueueWorkerRuntimeSnapshot>();
  private readonly queueCounts = new Map<string, QueueCountsSnapshot>();

  registerWorker(input: {
    workerKey: string;
    queueName: string;
    enabled: boolean;
    mode: 'redis' | 'sync';
    state?: QueueWorkerState;
    concurrency?: number;
  }) {
    const now = new Date().toISOString();
    const existing = this.workers.get(input.workerKey);
    const snapshot: QueueWorkerRuntimeSnapshot = {
      workerKey: input.workerKey,
      queueName: input.queueName,
      enabled: input.enabled,
      mode: input.mode,
      state: input.state || (input.enabled ? 'starting' : 'disabled'),
      concurrency: input.concurrency,
      registeredAt: existing?.registeredAt || now,
      startedAt: existing?.startedAt,
      lastHeartbeatAt: now,
      lastJobId: existing?.lastJobId || null,
      lastJobName: existing?.lastJobName || null,
      lastJobStartedAt: existing?.lastJobStartedAt,
      lastJobCompletedAt: existing?.lastJobCompletedAt,
      lastJobFailedAt: existing?.lastJobFailedAt,
      processedJobs: existing?.processedJobs || 0,
      failedJobs: existing?.failedJobs || 0,
      lastError: existing?.lastError || null,
    };

    this.workers.set(input.workerKey, snapshot);
    return snapshot;
  }

  markWorkerState(workerKey: string, state: QueueWorkerState, patch?: { error?: string | null }) {
    const existing = this.workers.get(workerKey);
    if (!existing) return null;
    const now = new Date().toISOString();
    const next: QueueWorkerRuntimeSnapshot = {
      ...existing,
      state,
      startedAt: state === 'running' && !existing.startedAt ? now : existing.startedAt,
      lastHeartbeatAt: now,
      lastError: patch?.error ?? existing.lastError ?? null,
    };
    this.workers.set(workerKey, next);
    return next;
  }

  recordJobStarted(workerKey: string, input: { jobId?: string | number | null; jobName?: string | null }) {
    const existing = this.workers.get(workerKey);
    if (!existing) return null;
    const now = new Date().toISOString();
    const next: QueueWorkerRuntimeSnapshot = {
      ...existing,
      state: 'running',
      startedAt: existing.startedAt || now,
      lastHeartbeatAt: now,
      lastJobId: input.jobId != null ? String(input.jobId) : null,
      lastJobName: input.jobName ?? null,
      lastJobStartedAt: now,
      lastError: null,
    };
    this.workers.set(workerKey, next);
    return next;
  }

  recordJobCompleted(workerKey: string, input: { jobId?: string | number | null; jobName?: string | null }) {
    const existing = this.workers.get(workerKey);
    if (!existing) return null;
    const now = new Date().toISOString();
    const next: QueueWorkerRuntimeSnapshot = {
      ...existing,
      state: 'running',
      lastHeartbeatAt: now,
      lastJobId: input.jobId != null ? String(input.jobId) : existing.lastJobId,
      lastJobName: input.jobName ?? existing.lastJobName,
      lastJobCompletedAt: now,
      processedJobs: existing.processedJobs + 1,
      lastError: null,
    };
    this.workers.set(workerKey, next);
    return next;
  }

  recordJobFailed(workerKey: string, input: { jobId?: string | number | null; jobName?: string | null; error?: string | null }) {
    const existing = this.workers.get(workerKey);
    if (!existing) return null;
    const now = new Date().toISOString();
    const next: QueueWorkerRuntimeSnapshot = {
      ...existing,
      state: 'degraded',
      lastHeartbeatAt: now,
      lastJobId: input.jobId != null ? String(input.jobId) : existing.lastJobId,
      lastJobName: input.jobName ?? existing.lastJobName,
      lastJobFailedAt: now,
      failedJobs: existing.failedJobs + 1,
      lastError: input.error ?? existing.lastError ?? null,
    };
    this.workers.set(workerKey, next);
    return next;
  }

  unregisterWorker(workerKey: string) {
    const existing = this.workers.get(workerKey);
    if (!existing) return null;
    const now = new Date().toISOString();
    const next: QueueWorkerRuntimeSnapshot = {
      ...existing,
      state: 'stopped',
      lastHeartbeatAt: now,
    };
    this.workers.set(workerKey, next);
    return next;
  }

  updateQueueCounts(input: { key: string; name: string; counts: QueueCountsSnapshot['counts'] }) {
    this.queueCounts.set(input.key, {
      key: input.key,
      name: input.name,
      counts: input.counts,
      capturedAt: new Date().toISOString(),
    });
  }

  getWorker(workerKey: string) {
    return this.workers.get(workerKey) || null;
  }

  getWorkers() {
    return Array.from(this.workers.values()).sort((a, b) => a.workerKey.localeCompare(b.workerKey));
  }

  getQueueCounts() {
    return Array.from(this.queueCounts.values()).sort((a, b) => a.key.localeCompare(b.key));
  }

  getSnapshot() {
    const workers = this.getWorkers();
    const queues = this.getQueueCounts();
    return {
      workers,
      queues,
      summary: {
        workersTotal: workers.length,
        runningWorkers: workers.filter((worker) => worker.state === 'running').length,
        degradedWorkers: workers.filter((worker) => worker.state === 'degraded' || worker.state === 'failed').length,
        stoppedWorkers: workers.filter((worker) => worker.state === 'stopped' || worker.state === 'disabled').length,
      },
    };
  }
}
