import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request } from 'express';
import { RadarService } from './radar.service';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { assertWorkerToken } from '../../common/security/worker-token';

@Controller('radar')
export class RadarController {
  constructor(private readonly radar: RadarService) {}

  @Get('taxonomy')
  listTaxonomy(@Query('organizationId') organizationId?: string) {
    return this.radar.listTaxonomy({ organizationId });
  }

  @Post('taxonomy/seed')
  seedTaxonomy(@Body() body: any) {
    return this.radar.seedTaxonomy({ organizationId: body.organizationId || null });
  }

  @Get('signals')
  listSignals(
    @Query('organizationId') organizationId?: string,
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
    @Query('q') q?: string,
  ) {
    return this.radar.listSignals({ organizationId, projectId, status, q });
  }

  @Post('signals')
  createSignal(@Body() body: any) {
    return this.radar.createSignal(body);
  }

  @Get('signals/:id')
  getSignal(@Param('id') id: string) {
    return this.radar.getSignal(id);
  }


  @Get('signals/:id/changes')
  listChanges(@Param('id') id: string, @Query('limit') limit?: string) {
    return this.radar.listSignalChanges(id, { limit: limit ? Number(limit) : 50 });
  }

  @Post('signals/:id/evidence')
  addEvidence(@Param('id') id: string, @Body() body: any) {
    return this.radar.addEvidence(id, body);
  }

  @Post('signals/:id/score')
  scoreSignal(@Param('id') id: string, @Body() body: any) {
    return this.radar.scoreSignal(id, body);
  }


  @Post('signals/:id/enrich')
  @Roles('analyst', 'curator', 'project_manager', 'org_admin', 'super_admin')
  enrich(@Param('id') id: string) {
    return this.radar.enrichSignal(id);
  }

  @Post('signals/:id/convert')
  convertToWorkflow(@Param('id') id: string, @Body() body: any) {
    return this.radar.convertSignalToWorkflow(id, body);
  }

  // Wave26: background scan control (requires Redis mode to actually enqueue)
  @Post('scan/enqueue')
  @Roles('project_manager', 'org_admin', 'super_admin')
  enqueueScan(@Body() body: any) {
    return this.radar.enqueueScan({ organizationId: body.organizationId || null });
  }

  @Post('scan/schedule')
  @Roles('org_admin', 'super_admin')
  scheduleScan(@Body() body: any) {
    return this.radar.scheduleScan({ organizationId: body.organizationId || null, everyMinutes: Number(body.everyMinutes || 60) });
  }

  // Worker ingestion endpoint (bypasses JWT; protected by X-Worker-Token)
  @Post('scan/ingest')
  @Public()
  @SkipThrottle({ default: true, auth: true })
  ingestFromWorker(@Body() body: any, @Req() req: Request) {
    assertWorkerToken(req);
    return this.radar.ingestScanFindings(body || {});
  }
}
