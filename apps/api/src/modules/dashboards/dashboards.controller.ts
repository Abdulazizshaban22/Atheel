import { Controller, Get, Query } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { DashboardsService } from './dashboards.service';

@Controller('dashboards')
export class DashboardsController {
  constructor(private readonly dashboards: DashboardsService) {}

  @Get('workflows')
  workflows(@Query('organizationId') organizationId?: string, @Query('projectId') projectId?: string) {
    return this.dashboards.workflows({ organizationId, projectId });
  }

  @Get('programs')
  programs(@Query('organizationId') organizationId?: string) {
    return this.dashboards.programs({ organizationId });
  }

  @Get('twin')
  twin(@Query('organizationId') organizationId?: string, @Query('projectId') projectId?: string) {
    return this.dashboards.twin({ organizationId, projectId });
  }

  @Get('command-center')
  commandCenter(@Query('organizationId') organizationId?: string, @Query('projectId') projectId?: string) {
    return this.dashboards.commandCenter({ organizationId, projectId });
  }

  @Get('creative-studio')
  creativeStudio(@Query('projectId') projectId?: string) {
    return this.dashboards.creativeStudio({ projectId });
  }

  @Get('readiness')
  readiness(@Query('organizationId') organizationId?: string) {
    return this.dashboards.readiness({ organizationId });
  }

  @Roles('org_admin', 'super_admin')
  @Get('ops')
  ops(
    @Query('organizationId') organizationId: string | undefined,
    @Query('hours') hours: string | undefined,
    @CurrentUser() user: RequestUser,
  ) {
    return this.dashboards.ops({ organizationId, hours: hours ? Number(hours) : undefined }, user);
  }

}
