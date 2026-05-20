import { Module } from '@nestjs/common';
import { QueueModule } from '../queue/queue.module';
import { OperationalEventsModule } from '../operational-events/operational-events.module';
import { IncidentsModule } from '../incidents/incidents.module';
import { MetricsModule } from '../metrics/metrics.module';
import { OutboxController } from './outbox.controller';
import { OutboxService } from './outbox.service';
import { OperationalEventOutboxService } from './operational-event-outbox.service';

@Module({
  imports: [QueueModule, OperationalEventsModule, IncidentsModule, MetricsModule],
  controllers: [OutboxController],
  providers: [OutboxService, OperationalEventOutboxService],
  exports: [OutboxService, OperationalEventOutboxService],
})
export class OutboxModule {}
