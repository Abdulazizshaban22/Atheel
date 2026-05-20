import { forwardRef, Module } from '@nestjs/common';
import { ExperiencesApplicationService } from './experiences.application-service';
import { ExperienceTwinOrchestratorService } from './experience-twin-orchestrator.service';
import { ExperienceTwinSyncWorkerService } from './experience-twin-sync-worker.service';
import { ExperienceTwinDeadLetterService } from './experience-twin-dead-letter.service';
import { ExperiencesController } from './experiences.controller';
import { ExperiencesRepository } from './experiences.repository';
import { ExperiencesService } from './experiences.service';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { OperationalEventsModule } from '../operational-events/operational-events.module';
import { OutboxModule } from '../outbox/outbox.module';
import { MetricsModule } from '../metrics/metrics.module';
import { TwinModule } from '../twin/twin.module';

@Module({
  imports: [forwardRef(() => TwinModule), AuditLogsModule, OperationalEventsModule, OutboxModule, MetricsModule],
  controllers: [ExperiencesController],
  providers: [ExperiencesService, ExperiencesApplicationService, ExperienceTwinOrchestratorService, ExperienceTwinSyncWorkerService, ExperienceTwinDeadLetterService, ExperiencesRepository],
  exports: [ExperiencesService, ExperienceTwinOrchestratorService, ExperienceTwinDeadLetterService],
})
export class ExperiencesModule {}
