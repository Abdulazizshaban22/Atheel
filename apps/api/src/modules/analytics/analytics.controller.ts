import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}
  @Get('dashboard') dashboard(){ return this.service.dashboard(); }

  @Roles('org_admin', 'super_admin')
  @Get('innovation')
  innovation(
    @Query('organizationId') organizationId: string | undefined,
    @Query('hours') hours: string | undefined,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.innovation({ organizationId, hours: hours ? Number(hours) : undefined }, user);
  }
}
