import 'reflect-metadata';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { CORE_EVENT_TYPES, CORE_MUTATION_ACTIONS } from '../src/common/contracts/resource-action.catalog';
import {
  EXPERIENCE_TWIN_SYNC_JOB_KIND,
  EXPERIENCE_TWIN_SYNC_JOB_NAME,
  buildExperienceTwinSyncJobPayload,
  isExperienceTwinSyncJobPayload,
} from '../src/common/events/experience-twin-sync-job.util';
import { ExperiencesModule } from '../src/modules/experiences/experiences.module';
import { ExperienceTwinSyncWorkerService } from '../src/modules/experiences/experience-twin-sync-worker.service';
import { QueueService } from '../src/modules/queue/queue.service';

describe('Wave99 worker-backed twin sync queue', () => {
  it('builds a typed experience twin sync job payload', () => {
    const payload = buildExperienceTwinSyncJobPayload({
      experienceId: 'exp_1',
      reason: 'create',
      organizationId: 'org_1',
      projectId: 'prj_1',
      correlationId: 'corr_1',
      requestId: 'req_1',
      requestedByUserId: 'usr_1',
    });

    expect(EXPERIENCE_TWIN_SYNC_JOB_NAME).toBe('experience_twin_sync');
    expect(payload.kind).toBe(EXPERIENCE_TWIN_SYNC_JOB_KIND);
    expect(isExperienceTwinSyncJobPayload(payload)).toBe(true);
  });

  it('extends the core catalog with explicit queue-backed twin sync contracts', () => {
    expect(CORE_MUTATION_ACTIONS.experienceTwinSyncQueued).toBe('experience.twin.sync.queued');
    expect(CORE_MUTATION_ACTIONS.experienceTwinSyncWorkerFailed).toBe('experience.twin.sync.worker.failed');
    expect(CORE_EVENT_TYPES.experienceTwinSyncQueued).toBe('experience.twin_sync_queued');
    expect(CORE_EVENT_TYPES.experienceTwinSyncWorkerFailed).toBe('experience.twin_sync_worker_failed');
  });

  it('registers the worker provider alongside the experiences module queue-aware write path', () => {
    const providers = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, ExperiencesModule) || [];
    expect(providers).toContain(ExperienceTwinSyncWorkerService);
    expect(typeof QueueService.prototype.enqueueExperienceTwinSync).toBe('function');
  });
});
