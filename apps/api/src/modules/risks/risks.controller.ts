import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { RisksService } from './risks.service';

@ApiTags('risks')
@ApiBearerAuth()
@Controller('risks')
export class RisksController {
  constructor(private readonly risks: RisksService) {}

  @Roles('viewer', 'analyst', 'curator', 'content_editor', 'project_manager', 'org_admin', 'super_admin')
  @Get('templates')
  templates() {
    return this.risks.listTemplates();
  }

  @Roles('viewer', 'analyst', 'curator', 'content_editor', 'project_manager', 'org_admin', 'super_admin')
  @Get('register')
  list(
    @Query('organizationId') organizationId?: string,
    @Query('projectId') projectId?: string,
    @Query('experienceId') experienceId?: string,
    @Query('twinId') twinId?: string,
  ) {
    return this.risks.listRegister({ organizationId, projectId, experienceId, twinId });
  }

  @Roles('analyst', 'project_manager', 'org_admin', 'super_admin')
  @Post('register')
  create(@Body() body: any) {
    return this.risks.createRisk(body || {});
  }

  @Roles('analyst', 'project_manager', 'org_admin', 'super_admin')
  @Post('assess/twin/:twinId')
  assessTwin(@Param('twinId') twinId: string, @Body() body: any) {
    return this.risks.assessTwin({ twinId, ...(body || {}) });
  }
}
