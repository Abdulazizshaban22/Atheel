import 'reflect-metadata';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { HealthController } from '../src/modules/health/health.controller';
import { MetricsService } from '../src/modules/metrics/metrics.service';
import { QueueModule } from '../src/modules/queue/queue.module';
import { QueueService } from '../src/modules/queue/queue.service';
import { QueueRuntimeRegistryService } from '../src/common/runtime/queue-runtime-registry.service';

describe('Wave100 queue observability and runtime closure', () => {
  it('extends queue runtime services with operational snapshot methods', () => {
    expect(typeof QueueService.prototype.getOperationalSnapshot).toBe('function');
    expect(typeof QueueService.prototype.checkRedisConnectivity).toBe('function');
  });

  it('registers queue runtime registry as a global queue provider', () => {
    const providers = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, QueueModule) || [];
    const exportsList = Reflect.getMetadata(MODULE_METADATA.EXPORTS, QueueModule) || [];
    expect(providers).toContain(QueueRuntimeRegistryService);
    expect(exportsList).toContain(QueueRuntimeRegistryService);
  });

  it('exposes queue runtime metrics helpers and health queues endpoint', () => {
    expect(typeof MetricsService.prototype.setWorkerState).toBe('function');
    expect(typeof MetricsService.prototype.applyQueueStats).toBe('function');
    expect(typeof HealthController.prototype.queues).toBe('function');
  });
});
