import { Module } from '@nestjs/common';
import { PrismaModule } from '@madar/db';

import { QueueModule } from '../queue/queue.module';
import { AttachmentsModule } from '../attachments/attachments.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { RealtimeModule } from '../realtime/realtime.module';

import { ExportsRendererModule } from '../../integrations/exports-renderer/exports-renderer.module';

import { ServiceOutboxController } from './service-outbox.controller';
import { ServiceOutboxService } from './service-outbox.service';

@Module({
  imports: [PrismaModule, QueueModule, AttachmentsModule, AuditLogsModule, RealtimeModule, ExportsRendererModule],
  controllers: [ServiceOutboxController],
  providers: [ServiceOutboxService],
  exports: [ServiceOutboxService],
})
export class ServiceOutboxModule {}
