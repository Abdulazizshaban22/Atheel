import { Module } from '@nestjs/common';
import { TwinController } from './twin.controller';
import { TwinService } from './twin.service';
import { AiModule } from '../ai/ai.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { ApprovalsModule } from '../approvals/approvals.module';
import { WorkflowsModule } from '../workflows/workflows.module';
import { ApprovalPacketsModule } from '../approval-packets/approval-packets.module';

@Module({
  imports: [AiModule, RealtimeModule, ApprovalsModule, WorkflowsModule, ApprovalPacketsModule],
  controllers: [TwinController],
  providers: [TwinService],
  exports: [TwinService],
})
export class TwinModule {}
