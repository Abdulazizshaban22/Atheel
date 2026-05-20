import { Module } from '@nestjs/common';
import { ExportsController } from './exports.controller';
import { ExportsService } from './exports.service';
import { AttachmentsModule } from '../attachments/attachments.module';
import { ContentModule } from '../content/content.module';
import { ApprovalsModule } from '../approvals/approvals.module';
import { QueueModule } from '../queue/queue.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { ServiceOutboxModule } from '../service-outbox/service-outbox.module';

@Module({
  controllers: [ExportsController],
  providers: [ExportsService],
  exports: [ExportsService],
})
export class ExportsModule {}
