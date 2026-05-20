import 'reflect-metadata';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { HealthController } from '../src/modules/health/health.controller';
import { ExperiencesController } from '../src/modules/experiences/experiences.controller';
import { ExperiencesModule } from '../src/modules/experiences/experiences.module';
import { QueueService } from '../src/modules/queue/queue.service';
import { ExperienceTwinDeadLetterService } from '../src/modules/experiences/experience-twin-dead-letter.service';
import { buildExperienceTwinSyncJobPayload, isExperienceTwinSyncJobPayload } from '../src/common/events/experience-twin-sync-job.util';

describe('Wave102 dead-letter and replay closure', () => {
  it('extends twin sync payload diagnostics with replay metadata', () => {
    const payload = buildExperienceTwinSyncJobPayload({
      experienceId: 'exp_dead_1',
      reason: 'manual',
      diagnostics: {
        source: 'system',
        replayedFromJobId: 'job_123',
        replayRequestedBy: 'user_1',
        replayedAt: new Date().toISOString(),
      },
    });
    expect(isExperienceTwinSyncJobPayload(payload)).toBe(true);
    expect(payload.diagnostics?.replayedFromJobId).toBe('job_123');
  });

  it('adds queue APIs for dead-letter inspection and replay', () => {
    expect(typeof QueueService.prototype.listExperienceTwinSyncDeadLetters).toBe('function');
    expect(typeof QueueService.prototype.getExperienceTwinSyncDeadLetter).toBe('function');
    expect(typeof QueueService.prototype.replayExperienceTwinSyncDeadLetter).toBe('function');
  });

  it('registers dead-letter replay service in experiences module', () => {
    const providers = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, ExperiencesModule) || [];
    expect(providers).toContain(ExperienceTwinDeadLetterService);
  });

  it('exposes inspection and replay endpoints on health and experiences controllers', () => {
    expect(typeof HealthController.prototype.deadLetters).toBe('function');
    expect(typeof HealthController.prototype.deadLetter).toBe('function');
    expect(typeof ExperiencesController.prototype.getTwinSyncDeadLetters).toBe('function');
    expect(typeof ExperiencesController.prototype.getTwinSyncDeadLetter).toBe('function');
    expect(typeof ExperiencesController.prototype.replayTwinSyncDeadLetter).toBe('function');
  });
});
