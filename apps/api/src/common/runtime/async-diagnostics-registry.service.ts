import { Injectable } from '@nestjs/common';

export type AsyncDiagnosticPhase =
  | 'queued'
  | 'started'
  | 'completed'
  | 'retrying'
  | 'failed'
  | 'terminal_failed'
  | 'fallback_sync'
  | 'replayed';

export type AsyncDiagnosticEvent = {
  kind: string;
  phase: AsyncDiagnosticPhase;
  source?: 'http' | 'worker' | 'system';
  queueName?: string | null;
  workerKey?: string | null;
  jobId?: string | null;
  entityId?: string | null;
  organizationId?: string | null;
  requestId?: string | null;
  correlationId?: string | null;
  traceId?: string | null;
  traceparent?: string | null;
  attempt?: number | null;
  maxAttempts?: number | null;
  message?: string | null;
  timestamp?: string;
};

@Injectable()
export class AsyncDiagnosticsRegistryService {
  private readonly events: AsyncDiagnosticEvent[] = [];
  private readonly maxEvents = Math.max(50, Number(process.env.ASYNC_DIAGNOSTICS_MAX_EVENTS || 250));

  record(event: AsyncDiagnosticEvent) {
    const next: AsyncDiagnosticEvent = {
      ...event,
      kind: String(event.kind || 'unknown'),
      phase: event.phase,
      source: event.source || 'system',
      timestamp: event.timestamp || new Date().toISOString(),
    };
    this.events.unshift(next);
    if (this.events.length > this.maxEvents) {
      this.events.length = this.maxEvents;
    }
    return next;
  }

  getRecent(limit = 50) {
    return this.events.slice(0, Math.max(1, Math.min(200, Number(limit || 50))));
  }

  getSummary() {
    const phases: Record<string, number> = {};
    const byKind: Record<string, number> = {};
    const recent = this.getRecent(20);
    for (const event of this.events) {
      phases[event.phase] = Number(phases[event.phase] || 0) + 1;
      byKind[event.kind] = Number(byKind[event.kind] || 0) + 1;
    }
    return {
      total: this.events.length,
      phases,
      byKind,
      recent,
    };
  }
}
