import { Controller, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';

import { assertWorkerToken } from '../../common/security/worker-token';
import { ServiceOutboxService } from './service-outbox.service';

@Controller('service-outbox')
export class ServiceOutboxController {
  constructor(private readonly svc: ServiceOutboxService) {}

  @Post(':id/dispatch')
  async dispatch(@Param('id') id: string, @Req() req: Request) {
    assertWorkerToken(req);
    return this.svc.dispatch(id, { actor: 'worker' });
  }
}
