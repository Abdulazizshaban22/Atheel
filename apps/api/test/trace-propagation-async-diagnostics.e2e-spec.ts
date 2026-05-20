import 'reflect-metadata';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { HealthController } from '../src/modules/health/health.controller';
import { QueueModule } from '../src/modules/queue/queue.module';
import { MetricsService } from '../src/modules/metrics/metrics.service';
import { AsyncDiagnosticsRegistryService } from '../src/common/runtime/async-diagnostics-registry.service';
import { ensureTraceContext, createChildTraceContext } from '../src/common/telemetry/trace-context.util';
import { buildExperienceTwinSyncJobPayload, isExperienceTwinSyncJobPayload } from '../src/common/events/experience-twin-sync-job.util';

describe('Wave101 trace propagation and async diagnostics hardening', () => {
  it('adds trace context helpers for synthetic and child contexts', () => {
    const root = ensureTraceContext({ traceparent: null });
    const child = createChildTraceContext(root.traceparent);
    expect(root.traceId).toHaveLength(32);
    expect(child.traceId).toBe(root.traceId);
    expect(child.spanId).toHaveLength(16);
    expect(child.parentSpanId).toBe(root.spanId);
  });

  it('extends twin sync payload with typed diagnostics metadata', () => {
    const payload = buildExperienceTwinSyncJobPayload({
      experienceId: 'exp_1',
      reason: 'manual',
      traceparent: ensureTraceContext({ traceparent: null }).traceparent,
      traceId: '1234567890abcdef1234567890abcdef',
      diagnostics: {
        source: 'http',
        originMethod: 'POST',
        originPath: '/api/experiences/exp_1/ensure-twin',
        parentSpanId: '1234567890abcdef',
      },
    });
    expect(isExperienceTwinSyncJobPayload(payload)).toBe(true);
    expect(payload.diagnostics?.originMethod).toBe('POST');
    expect(payload.traceId).toBe('1234567890abcdef1234567890abcdef');
  });

  it('registers async diagnostics registry as a global queue provider', () => {
    const providers = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, QueueModule) || [];
    const exportsList = Reflect.getMetadata(MODULE_METADATA.EXPORTS, QueueModule) || [];
    expect(providers).toContain(AsyncDiagnosticsRegistryService);
    expect(exportsList).toContain(AsyncDiagnosticsRegistryService);
  });

  it('exposes metrics and health hooks for async diagnostics', () => {
    expect(typeof MetricsService.prototype.incAsyncDiagnostic).toBe('function');
    expect(typeof HealthController.prototype.queueDiagnostics).toBe('function');
  });
});
