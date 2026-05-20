import { Module } from '@nestjs/common';
import { GovernanceModule } from '../governance/governance.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OutboxModule } from '../outbox/outbox.module';
import { OperationalEventsModule } from '../operational-events/operational-events.module';
import { QueueModule } from '../queue/queue.module';
import { EscalationsController } from './escalations.controller';
import { EscalationsService } from './escalations.service';

@Module({
  imports: [GovernanceModule, NotificationsModule, OutboxModule, OperationalEventsModule, QueueModule],
  controllers: [EscalationsController],
  providers: [EscalationsService],
  exports: [EscalationsService],
})
export class EscalationsModule {}
