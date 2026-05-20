import { Module } from '@nestjs/common';
import { ApprovalsApplicationService } from './approvals.application-service';
import { ApprovalsController } from './approvals.controller';
import { ApprovalsService } from './approvals.service';
import { ApprovalsRepository } from './approvals.repository';
import { ApprovalsRoutingService } from './approvals-routing.service';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { GovernanceModule } from '../governance/governance.module';
import { QueueModule } from '../queue/queue.module';
import { OperationalEventsModule } from '../operational-events/operational-events.module';
import { OutboxModule } from '../outbox/outbox.module';

@Module({
  imports: [AuditLogsModule, GovernanceModule, QueueModule, OperationalEventsModule, OutboxModule],
  controllers: [ApprovalsController],
  providers: [ApprovalsService, ApprovalsRoutingService, ApprovalsApplicationService, ApprovalsRepository],
  exports: [ApprovalsService, ApprovalsRoutingService],
})
export class ApprovalsModule {}
