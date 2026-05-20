import 'reflect-metadata';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { CORE_EVENT_TYPES, CORE_MUTATION_ACTIONS } from '../src/common/contracts/resource-action.catalog';
import { ExperiencesModule } from '../src/modules/experiences/experiences.module';
import { ExperienceTwinOrchestratorService } from '../src/modules/experiences/experience-twin-orchestrator.service';
import { OperationalEventOutboxService } from '../src/modules/outbox/operational-event-outbox.service';

describe('Wave98 experience async closure hardening', () => {
  it('extends the core catalog with explicit twin-failure contracts', () => {
    expect(CORE_MUTATION_ACTIONS.experienceTwinEnsureFailed).toBe('experience.twin.ensure.failed');
    expect(CORE_EVENT_TYPES.experienceTwinSyncFailed).toBe('experience.twin_sync_failed');
  });

  it('registers the experience twin orchestrator alongside the outbox-aware write path', () => {
    const providers = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, ExperiencesModule) || [];
    expect(providers).toContain(ExperienceTwinOrchestratorService);
    expect(OperationalEventOutboxService).toBeDefined();
  });
});
