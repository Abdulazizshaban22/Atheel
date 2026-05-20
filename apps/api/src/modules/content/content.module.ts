import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { ContentApplicationService } from './content.application-service';
import { ContentController } from './content.controller';
import { ContentRepository } from './content.repository';
import { ContentService } from './content.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [ContentController],
  providers: [ContentService, ContentApplicationService, ContentRepository],
  exports: [ContentService, ContentApplicationService],
})
export class ContentModule {}
