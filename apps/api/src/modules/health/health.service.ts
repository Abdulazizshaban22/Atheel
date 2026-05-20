import { Injectable } from '@nestjs/common';
import { PrismaService } from '@madar/db';
import { MetricsService } from '../metrics/metrics.service';
import { QueueService } from '../queue/queue.service';
import { PlatformRuntimeService } from '../../common/runtime/platform-runtime.service';
import { QueueRuntimeRegistryService } from '../../common/runtime/queue-runtime-registry.service';
import { AsyncDiagnosticsRegistryService } from '../../common/runtime/async-diagnostics-registry.service';

export type DependencyStatus = 'up' | 'down' | 'degraded';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
    private readonly runtime: PlatformRuntimeService,
    private readonly queueRuntime: QueueRuntimeRegistryService,
    private readonly asyncDiagnostics: AsyncDiagnosticsRegistryService,
    private readonly metrics: MetricsService,
  ) {}

  overview() {
    const profile = this.runtime.getProfile();
    const runtimeSnapshot = this.queueRuntime.getSnapshot();

    return {
      status: 'ok',
      service: profile.service,
      version: '0.8.0',
      timestamp: new Date().toISOString(),
      runtime: {
        nodeEnv: profile.nodeEnv,
        apiPrefix: profile.apiPrefix,
        startedAt: profile.startedAt,
        uptimeSeconds: profile.uptimeSeconds,
        queue: this.queue.getMode(),
        workers: runtimeSnapshot.summary,
        wsNamespace: '/ws',
      },
    };
  }

  live() {
    const profile = this.runtime.getProfile();

    return {
      status: 'alive',
      service: profile.service,
      timestamp: new Date().toISOString(),
      uptimeSeconds: profile.uptimeSeconds,
    };
  }

  async readiness() {
    const profile = this.runtime.getProfile();
    const config = this.runtime.getConfigPresence();
    const [database, queue, workers] = await Promise.all([this.checkDatabase(), this.checkQueue(), this.checkWorkers()]);

    const blockingFailures = [database, queue, workers].filter((item) => item.required && item.status === 'down');
    const degradedChecks = [database, queue, workers].filter((item) => item.status === 'degraded');

    return {
      ok: blockingFailures.length === 0,
      status: blockingFailures.length ? 'not_ready' : degradedChecks.length ? 'degraded' : 'ready',
      service: profile.service,
      timestamp: new Date().toISOString(),
      profile,
      checks: {
        config,
        database,
        queue,
        workers,
      },
    };
  }

  startup() {
    const profile = this.runtime.getProfile();
    const config = this.runtime.getConfigPresence();

    return {
      service: profile.service,
      timestamp: new Date().toISOString(),
      profile,
      config,
      notes: [
        'هذا endpoint لا يعرض القيم السرية، بل يوضح فقط وجود الإعدادات المطلوبة.',
        'جهوزية startup لا تعني أن التبعيات الخارجية سليمة بالكامل؛ استخدم /health/ready لذلك.',
      ],
    };
  }

  async queues() {
    const snapshot = await this.queue.getOperationalSnapshot();
    this.metrics.applyQueueStats(snapshot.stats);
    return {
      ...snapshot,
      diagnostics: this.asyncDiagnostics.getSummary(),
    };
  }

  queueDiagnostics() {
    return {
      timestamp: new Date().toISOString(),
      diagnostics: this.asyncDiagnostics.getSummary(),
    };
  }

  async deadLetters(limit = 20) {
    return {
      timestamp: new Date().toISOString(),
      deadLetters: await this.queue.listExperienceTwinSyncDeadLetters(limit),
      diagnostics: this.asyncDiagnostics
        .getRecent(Math.max(25, Math.max(1, Math.min(100, Number(limit || 20))) * 3))
        .filter((event) => event.kind === 'experience_twin_sync' && (event.phase === 'terminal_failed' || event.phase === 'replayed')),
    };
  }

  async deadLetter(jobId: string) {
    return {
      timestamp: new Date().toISOString(),
      job: await this.queue.getExperienceTwinSyncDeadLetter(jobId),
      diagnostics: this.asyncDiagnostics
        .getRecent(100)
        .filter((event) => event.kind === 'experience_twin_sync' && (event.jobId === String(jobId) || event.message === `replayed_from_${String(jobId)}`)),
    };
  }

  private async checkDatabase(): Promise<{ status: DependencyStatus; required: boolean; latencyMs?: number; detail: string }> {
    const databaseUrl = (process.env.DATABASE_URL || '').trim();
    if (!databaseUrl) {
      return {
        status: 'down',
        required: true,
        detail: 'DATABASE_URL غير مضبوط',
      };
    }

    const startedAt = Date.now();

    try {
      await (this.prisma as PrismaService & { $queryRawUnsafe(query: string): Promise<unknown> }).$queryRawUnsafe('SELECT 1');

      return {
        status: 'up',
        required: true,
        latencyMs: Date.now() - startedAt,
        detail: 'database_ok',
      };
    } catch (error) {
      return {
        status: 'down',
        required: true,
        latencyMs: Date.now() - startedAt,
        detail: error instanceof Error ? error.message : 'database_check_failed',
      };
    }
  }

  private async checkQueue(): Promise<{ status: DependencyStatus; required: boolean; detail: string; mode?: string; totals?: unknown; redis?: unknown }> {
    const queueMode = this.queue.getMode();

    if (queueMode.mode === 'sync') {
      return {
        status: 'degraded',
        required: false,
        mode: queueMode.mode,
        detail: 'QUEUE_MODE=sync؛ مناسب للتطوير لكنه ليس وضع تشغيل إنتاجي',
      };
    }

    try {
      const snapshot = await this.queue.getOperationalSnapshot();
      this.metrics.applyQueueStats(snapshot.stats);
      return {
        status: snapshot.ok ? 'up' : 'down',
        required: true,
        mode: queueMode.mode,
        detail: snapshot.ok ? 'queue_ok' : String(snapshot.redis?.detail || 'queue_check_failed'),
        totals: snapshot.stats?.totals,
        redis: snapshot.redis,
      };
    } catch (error) {
      return {
        status: 'down',
        required: true,
        mode: queueMode.mode,
        detail: error instanceof Error ? error.message : 'queue_check_failed',
      };
    }
  }

  private async checkWorkers(): Promise<{ status: DependencyStatus; required: boolean; detail: string; workers: unknown[]; summary: unknown }> {
    const mode = this.queue.getMode();
    const snapshot = this.queueRuntime.getSnapshot();
    const workerEnabled = String(process.env.EXPERIENCE_TWIN_SYNC_WORKER_ENABLED || 'true').toLowerCase() !== 'false';
    const twinWorker = this.queueRuntime.getWorker('experience_twin_sync');

    if (mode.mode !== 'redis' || !workerEnabled) {
      return {
        status: 'degraded',
        required: false,
        detail: mode.mode !== 'redis' ? 'workers_not_required_in_sync_mode' : 'experience_twin_sync_worker_disabled',
        workers: snapshot.workers,
        summary: snapshot.summary,
      };
    }

    if (!twinWorker) {
      return {
        status: 'down',
        required: true,
        detail: 'experience_twin_sync_worker_not_registered',
        workers: snapshot.workers,
        summary: snapshot.summary,
      };
    }

    if (twinWorker.state === 'running' || twinWorker.state === 'starting') {
      return {
        status: 'up',
        required: true,
        detail: 'workers_ok',
        workers: snapshot.workers,
        summary: snapshot.summary,
      };
    }

    return {
      status: twinWorker.state === 'degraded' ? 'degraded' : 'down',
      required: true,
      detail: `experience_twin_sync_worker_${twinWorker.state}`,
      workers: snapshot.workers,
      summary: snapshot.summary,
    };
  }
}
