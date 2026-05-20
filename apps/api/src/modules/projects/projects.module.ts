import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { ProjectsApplicationService } from './projects.application-service';
import { ProjectsController } from './projects.controller';
import { ProjectsRepository } from './projects.repository';
import { ProjectsService } from './projects.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectsApplicationService, ProjectsRepository],
})
export class ProjectsModule {}
