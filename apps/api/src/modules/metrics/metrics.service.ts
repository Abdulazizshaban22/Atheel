import { Injectable } from '@nestjs/common';

// prom-client is an optional dependency.
// If missing, the service still loads and /metrics returns a helpful message.

const WORKER_STATES = ['disabled', 'starting', 'running', 'degraded', 'failed', 'stopped'] as const;
const QUEUE_STATUSES = ['waiting', 'active', 'completed', 'failed', 'delayed', 'paused'] as const;

type QueueStatsSnapshot = {
  queues?: Array<{ key?: string; name: string; counts: Record<string, number> }>;
};

@Injectable()
export class MetricsService {
  private client: any;
  private httpHistogram: any;
  private httpCounter: any;
  private outboxSentCounter: any;
  private outboxFailedCounter: any;
  private jobCounter: any;
  private asyncJobDurationHistogram: any;
  private workerStateGauge: any;
  private queueJobsGauge: any;
  private asyncDiagnosticsCounter: any;

  constructor() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      this.client = require('prom-client');
      this.client.collectDefaultMetrics?.();

      this.httpHistogram = new this.client.Histogram({
        name: 'http_server_duration_seconds',
        help: 'HTTP server request duration in seconds',
        labelNames: ['method', 'route', 'status'],
        buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      });

      this.httpCounter = new this.client.Counter({
        name: 'http_server_requests_total',
        help: 'Total number of HTTP requests',
        labelNames: ['method', 'route', 'status'],
      });

      this.outboxSentCounter = new this.client.Counter({
        name: 'atheel_outbox_sent_total',
        help: 'Total number of outbox messages successfully sent',
        labelNames: ['channel'],
      });

      this.outboxFailedCounter = new this.client.Counter({
        name: 'atheel_outbox_failed_total',
        help: 'Total number of outbox messages failed to send',
        labelNames: ['channel'],
      });

      this.jobCounter = new this.client.Counter({
        name: 'atheel_async_jobs_total',
        help: 'Total number of async jobs observed by kind and status',
        labelNames: ['kind', 'status'],
      });

      this.asyncJobDurationHistogram = new this.client.Histogram({
        name: 'atheel_async_job_duration_seconds',
        help: 'Observed duration of async jobs in seconds',
        labelNames: ['kind', 'status'],
        buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60],
      });

      this.workerStateGauge = new this.client.Gauge({
        name: 'atheel_async_worker_state',
        help: 'Current state of long-lived async workers',
        labelNames: ['worker', 'state'],
      });

      this.queueJobsGauge = new this.client.Gauge({
        name: 'atheel_queue_jobs',
        help: 'Current queue job counts by queue and status',
        labelNames: ['queue', 'status'],
      });

      this.asyncDiagnosticsCounter = new this.client.Counter({
        name: 'atheel_async_diagnostics_total',
        help: 'Total async diagnostic lifecycle events',
        labelNames: ['kind', 'phase'],
      });
    } catch {
      this.client = null;
      this.httpHistogram = null;
      this.httpCounter = null;
      this.outboxSentCounter = null;
      this.outboxFailedCounter = null;
      this.jobCounter = null;
      this.asyncJobDurationHistogram = null;
      this.workerStateGauge = null;
      this.queueJobsGauge = null;
      this.asyncDiagnosticsCounter = null;
    }
  }

  middleware() {
    return (req: any, res: any, next: any) => {
      if (!this.httpHistogram || !this.httpCounter) return next();
      const end = this.httpHistogram.startTimer();
      res.on('finish', () => {
        try {
          const route = req?.route?.path || req?.originalUrl || 'unknown';
          const labels = { method: req.method, route: String(route), status: String(res.statusCode) };
          end(labels);
          this.httpCounter.inc(labels, 1);
        } catch {
          // ignore
        }
      });
      next();
    };
  }

  incOutboxSent(channel: string) {
    try {
      this.outboxSentCounter?.inc({ channel: String(channel || 'unknown') }, 1);
    } catch {}
  }

  incOutboxFailed(channel: string) {
    try {
      this.outboxFailedCounter?.inc({ channel: String(channel || 'unknown') }, 1);
    } catch {}
  }

  incAsyncJob(kind: string, status: string) {
    try {
      this.jobCounter?.inc({ kind: String(kind || 'unknown'), status: String(status || 'unknown') }, 1);
    } catch {}
  }

  observeAsyncJobDuration(kind: string, status: string, durationMs?: number | null) {
    if (typeof durationMs !== 'number' || !Number.isFinite(durationMs) || durationMs < 0) return;
    try {
      this.asyncJobDurationHistogram?.observe({ kind: String(kind || 'unknown'), status: String(status || 'unknown') }, durationMs / 1000);
    } catch {}
  }


  incAsyncDiagnostic(kind: string, phase: string) {
    try {
      this.asyncDiagnosticsCounter?.inc({ kind: String(kind || 'unknown'), phase: String(phase || 'unknown') }, 1);
    } catch {}
  }

  setWorkerState(worker: string, state: (typeof WORKER_STATES)[number]) {
    if (!this.workerStateGauge) return;
    for (const candidate of WORKER_STATES) {
      try {
        this.workerStateGauge.set({ worker: String(worker || 'unknown'), state: candidate }, candidate === state ? 1 : 0);
      } catch {}
    }
  }

  setQueueJobCount(queue: string, status: (typeof QUEUE_STATUSES)[number], count: number) {
    try {
      this.queueJobsGauge?.set({ queue: String(queue || 'unknown'), status }, Number(count || 0));
    } catch {}
  }

  applyQueueStats(snapshot: QueueStatsSnapshot | null | undefined) {
    if (!snapshot?.queues?.length) return;
    for (const queue of snapshot.queues) {
      for (const status of QUEUE_STATUSES) {
        this.setQueueJobCount(queue.name || queue.key || 'unknown', status, Number(queue.counts?.[status] || 0));
      }
    }
  }

  async metricsText(): Promise<string> {
    if (!this.client) {
      return '# prom-client is not installed. Add prom-client dependency to enable /metrics\n';
    }
    return await this.client.register.metrics();
  }
}
