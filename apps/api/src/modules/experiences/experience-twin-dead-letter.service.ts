import { Injectable } from '@nestjs/common';
import { AsyncDiagnosticsRegistryService } from '../../common/runtime/async-diagnostics-registry.service';
import { MetricsService } from '../metrics/metrics.service';
import { QueueService } from '../queue/queue.service';

@Injectable()
export class ExperienceTwinDeadLetterService {
  constructor(
    private readonly queue: QueueService,
    private readonly diagnostics: AsyncDiagnosticsRegistryService,
    private readonly metrics: MetricsService,
  ) {}

  async list(limit = 20) {
    const size = Math.max(1, Math.min(100, Number(limit || 20)));
    const queue = await this.queue.listExperienceTwinSyncDeadLetters(size);
    const diagnosticEvents = this.diagnostics
      .getRecent(Math.max(25, size * 3))
      .filter((event) => event.kind === 'experience_twin_sync' && (event.phase === 'terminal_failed' || event.phase === 'replayed'))
      .slice(0, size);

    return {
      timestamp: new Date().toISOString(),
      queue,
      diagnostics: diagnosticEvents,
    };
  }

  async inspect(jobId: string) {
    const job = await this.queue.getExperienceTwinSyncDeadLetter(jobId);
    const diagnostics = this.diagnostics
      .getRecent(100)
      .filter((event) => event.kind === 'experience_twin_sync' && (event.jobId === String(jobId) || event.message === `replayed_from_${String(jobId)}`));

    return {
      timestamp: new Date().toISOString(),
      found: Boolean(job),
      job,
      diagnostics,
    };
  }

  async replay(jobId: string, input?: { attempts?: number }) {
    const replay = await this.queue.replayExperienceTwinSyncDeadLetter(jobId, { attempts: input?.attempts });

    if (replay.replayed) {
      this.diagnostics.record({
        kind: 'experience_twin_sync',
        phase: 'replayed',
        source: 'system',
        queueName: replay.queue || null,
        jobId: replay.replayJobId || null,
        entityId: replay.entityId || null,
        organizationId: replay.organizationId || null,
        requestId: replay.requestId || null,
        correlationId: replay.correlationId || null,
        traceId: replay.traceId || null,
        traceparent: replay.traceparent || null,
        message: `replayed_from_${String(jobId)}`,
      });
      this.metrics.incAsyncDiagnostic('experience_twin_sync', 'replayed');
    }

    return replay;
  }
}
