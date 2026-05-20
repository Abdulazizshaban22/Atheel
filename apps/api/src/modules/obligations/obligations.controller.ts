import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { ObligationsService } from './obligations.service';
import { UpdateObligationDto } from './dto/update-obligation.dto';
import { ScheduleReminderDto } from './dto/schedule-reminder.dto';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('obligations')
@ApiBearerAuth()
@Controller('obligations')
export class ObligationsController {
  constructor(private readonly service: ObligationsService) {}

  @Roles('viewer', 'analyst', 'curator', 'content_editor', 'project_manager', 'org_admin', 'super_admin')
  @Get()
  list(@Query() q: any, @CurrentUser() user: RequestUser) {
    return this.service.list(q || {}, user);
  }

  @Roles('viewer', 'analyst', 'curator', 'content_editor', 'project_manager', 'org_admin', 'super_admin')
  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.service.get(id, user);
  }

  // Generate/refresh obligations from a competition's compliance matrix.
  @Roles('curator', 'content_editor', 'project_manager', 'org_admin', 'super_admin')
  @Post('refresh/competition/:competitionId')
  refreshFromCompetition(@Param('competitionId') competitionId: string, @CurrentUser() user: RequestUser) {
    return this.service.refreshFromCompetition(competitionId, user);
  }

  @Roles('curator', 'content_editor', 'project_manager', 'org_admin', 'super_admin')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateObligationDto, @CurrentUser() user: RequestUser) {
    return this.service.update(id, dto as any, user);
  }

  @Roles('curator', 'content_editor', 'project_manager', 'org_admin', 'super_admin')
  @Post(':id/reminders')
  scheduleReminder(@Param('id') id: string, @Body() dto: ScheduleReminderDto, @CurrentUser() user: RequestUser) {
    return this.service.scheduleReminder(id, dto as any, user);
  }

  // Worker callback to mark reminders as sent.
  @Post(':id/reminders/:rid/send')
  @Public()
  @SkipThrottle({ default: true, auth: true })
  sendReminderFromWorker(@Param('id') id: string, @Param('rid') rid: string, @Req() req: Request) {
    const token = (req.headers?.['x-worker-token'] || '').toString();
    return this.service.sendReminderFromWorker(id, rid, token);
  }
}
