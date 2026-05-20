import { Controller, Param, Post, Req } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import type { Request } from 'express';
import { EscalationsService } from './escalations.service';
import { assertWorkerToken } from '../../common/security/worker-token';

@ApiTags('escalations')
@ApiBearerAuth()
@Controller('escalations')
export class EscalationsController {
  constructor(private readonly service: EscalationsService) {}

  @Public()
  @SkipThrottle({ default: true, auth: true })
  @Post('approvals/:id')
  async escalateApproval(@Param('id') id: string, @Req() req: Request) {
    assertWorkerToken(req);
    return this.service.escalateApproval(id);
  }
}
