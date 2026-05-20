import { Body, Controller, Get, Patch, Post, Query, Param, Req } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CreateInternalNotificationDto } from './dto/create-notification.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { Public } from '../auth/decorators/public.decorator';
import type { Request } from 'express';
import { assertWorkerToken } from '../../common/security/worker-token';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Roles('viewer', 'analyst', 'curator', 'content_editor', 'project_manager', 'org_admin', 'super_admin')
  @Get()
  async list(
    @Query('userId') userId?: string,
    @Query('unread') unread?: string,
    @Query('limit') limit?: string,
    @CurrentUser() user?: RequestUser,
  ) {
    const isAdmin = Boolean(user?.roles?.includes('org_admin') || user?.roles?.includes('super_admin'));
    const targetUserId = isAdmin && userId ? String(userId) : String(user?.sub || '');
    const organizationId = user?.activeOrgId || undefined;

    return this.service.listForUser({
      organizationId,
      targetUserId,
      unread: String(unread || '').toLowerCase() === 'true',
      limit: limit ? Number(limit) : undefined,
      requestedBy: user,
    });
  }

  @Roles('viewer', 'analyst', 'curator', 'content_editor', 'project_manager', 'org_admin', 'super_admin')
  @Patch(':id/read')
  async read(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.service.markReadForUser(id, user);
  }

  @Roles('org_admin', 'super_admin')
  @Post()
  async create(@Body() body: CreateInternalNotificationDto, @CurrentUser() user: RequestUser) {
    return this.service.createFromAdmin(body, user);
  }

  // Internal/worker entrypoint: bypass JWT, but require X-Worker-Token.
  @Post('worker')
  @Public()
  @SkipThrottle({ default: true, auth: true })
  async createFromWorker(@Body() body: CreateInternalNotificationDto, @Req() req: Request) {
    assertWorkerToken(req);
    return this.service.createFromWorker(body);
  }
}
