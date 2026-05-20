import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { Request } from 'express';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { OutboxService } from './outbox.service';
import { QueryOutboxDto } from './dto/query-outbox.dto';
import { OutboxMarkFailedDto } from './dto/mark-failed.dto';
import { assertWorkerToken } from '../../common/security/worker-token';

@ApiTags('outbox')
@ApiBearerAuth()
@Controller('outbox')
export class OutboxController {
  constructor(private readonly service: OutboxService) {}

  @Roles('org_admin', 'super_admin')
  @Get()
  list(@Query() query: QueryOutboxDto, @CurrentUser() user: RequestUser) {
    const isSuper = Boolean(user?.roles?.includes('super_admin'));
    const orgId = isSuper ? (query as any)?.organizationId : user?.activeOrgId;
    return this.service.list({ ...(query as any), organizationId: orgId });
  }

  // Worker read
  @Public()
  @SkipThrottle({ default: true, auth: true })
  @Get(':id')
  async getForWorker(@Param('id') id: string, @Req() req: Request) {
    assertWorkerToken(req);
    const row = await this.service.get(id);
    return { ok: true, message: row };
  }

  @Public()
  @SkipThrottle({ default: true, auth: true })
  @Post(':id/dispatch')
  async dispatchForWorker(@Param('id') id: string, @Req() req: Request) {
    assertWorkerToken(req);
    return this.service.dispatchNow(id);
  }

  @Public()
  @SkipThrottle({ default: true, auth: true })
  @Post(':id/mark-sent')
  async markSent(@Param('id') id: string, @Req() req: Request) {
    assertWorkerToken(req);
    const row = await this.service.markSent(id);
    return { ok: true, message: row };
  }

  @Public()
  @SkipThrottle({ default: true, auth: true })
  @Post(':id/mark-failed')
  async markFailed(@Param('id') id: string, @Body() body: OutboxMarkFailedDto, @Req() req: Request) {
    assertWorkerToken(req);
    const row = await this.service.markFailed(id, body?.error || body?.message || 'failed');
    return { ok: true, message: row };
  }
}
