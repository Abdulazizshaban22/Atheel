import { Module } from '@nestjs/common';
import { AttachmentsApplicationService } from './attachments.application-service';
import { AttachmentsController } from './attachments.controller';
import { AttachmentsService } from './attachments.service';
import { AttachmentsRepository } from './attachments.repository';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { OperationalEventsModule } from '../operational-events/operational-events.module';
import { OutboxModule } from '../outbox/outbox.module';

@Module({
  imports: [AuditLogsModule, OperationalEventsModule, OutboxModule],
  controllers: [AttachmentsController],
  providers: [AttachmentsService, AttachmentsApplicationService, AttachmentsRepository],
  exports: [AttachmentsService, AttachmentsApplicationService],
})
export class AttachmentsModule {}
