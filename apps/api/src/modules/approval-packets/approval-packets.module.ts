import { Module } from '@nestjs/common';
import { ApprovalPacketsController } from './approval-packets.controller';
import { ApprovalPacketsService } from './approval-packets.service';
import { AttachmentsModule } from '../attachments/attachments.module';
import { AiModule } from '../ai/ai.module';
import { ContentModule } from '../content/content.module';

@Module({
  imports: [AttachmentsModule, AiModule, ContentModule],
  controllers: [ApprovalPacketsController],
  providers: [ApprovalPacketsService],
  exports: [ApprovalPacketsService],
})
export class ApprovalPacketsModule {}
