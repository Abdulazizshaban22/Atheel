import { Module } from '@nestjs/common';
import { ObligationsController } from './obligations.controller';
import { ObligationsService } from './obligations.service';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { QueueModule } from '../queue/queue.module';
import { WorkflowsModule } from '../workflows/workflows.module';

@Module({
  imports: [AuditLogsModule, QueueModule, WorkflowsModule],
  controllers: [ObligationsController],
  providers: [ObligationsService],
  exports: [ObligationsService],
})
export class ObligationsModule {}
