import { Module } from '@nestjs/common';
import { PrismaModule } from '@madar/db';
import { ApprovalsModule } from '../approvals/approvals.module';
import { ObligationsModule } from '../obligations/obligations.module';
import { ComplianceController } from './compliance.controller';
import { ComplianceService } from './compliance.service';

@Module({
  imports: [PrismaModule, ApprovalsModule, ObligationsModule],
  controllers: [ComplianceController],
  providers: [ComplianceService],
  exports: [ComplianceService],
})
export class ComplianceModule {}
