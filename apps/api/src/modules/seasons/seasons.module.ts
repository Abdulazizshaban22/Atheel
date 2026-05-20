import { Module } from '@nestjs/common';
import { ProgramsModule } from '../programs/programs.module';
import { ProjectsModule } from '../projects/projects.module';
import { WorkflowsModule } from '../workflows/workflows.module';
import { ApprovalsModule } from '../approvals/approvals.module';
import { ComplianceModule } from '../compliance/compliance.module';
import { ApprovalPacketsModule } from '../approval-packets/approval-packets.module';
import { ExportsModule } from '../exports/exports.module';
import { SeasonsController } from './seasons.controller';
import { SeasonsService } from './seasons.service';

@Module({
  imports: [ProgramsModule, ProjectsModule, WorkflowsModule, ApprovalsModule, ComplianceModule, ApprovalPacketsModule, ExportsModule],
  controllers: [SeasonsController],
  providers: [SeasonsService],
})
export class SeasonsModule {}
