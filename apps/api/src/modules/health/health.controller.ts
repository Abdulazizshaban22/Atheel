import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Public()
  @Get()
  overview() {
    return this.health.overview();
  }

  @Public()
  @Get('live')
  live() {
    return this.health.live();
  }

  @Public()
  @Get('ready')
  async ready(@Res({ passthrough: true }) response: any) {
    const payload = await this.health.readiness();
    response.status(payload.ok ? 200 : 503);
    return payload;
  }


  @Public()
  @Get('queues')
  async queues() {
    return await this.health.queues();
  }

  @Public()
  @Get('queues/diagnostics')
  queueDiagnostics() {
    return this.health.queueDiagnostics();
  }

  @Public()
  @Get('queues/dead-letter')
  async deadLetters(@Query('limit') limit?: string) {
    return await this.health.deadLetters(Number(limit || 20));
  }

  @Public()
  @Get('queues/dead-letter/:jobId')
  async deadLetter(@Param('jobId') jobId: string) {
    return await this.health.deadLetter(jobId);
  }

  @Public()
  @Get('startup')
  startup() {
    return this.health.startup();
  }
}
