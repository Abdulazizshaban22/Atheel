import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { assertWorkerToken } from '../../common/security/worker-token';
import { TwinService } from './twin.service';
import { RefreshTwinDecisionDto } from './dto/refresh-twin-decision.dto';

@Controller('twin')
export class TwinController {
  constructor(private readonly twin: TwinService) {}

  @Get()
  list(@Query('organizationId') organizationId?: string, @Query('projectId') projectId?: string) {
    return this.twin.listTwins({ organizationId, projectId });
  }

  @Post()
  create(@Body() body: any) {
    return this.twin.createTwin(body || {});
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.twin.getTwin(id);
  }

  @Patch(':id')
  patch(@Param('id') id: string, @Body() body: any) {
    return this.twin.updateTwin(id, body || {});
  }

  @Post(':id/nodes')
  addNode(@Param('id') id: string, @Body() body: any) {
    return this.twin.addNode(id, body || {});
  }

  @Post(':id/edges')
  addEdge(@Param('id') id: string, @Body() body: any) {
    return this.twin.addEdge(id, body || {});
  }

  @Get(':id/graph')
  graph(@Param('id') id: string) {
    return this.twin.getGraph(id);
  }

  @Post(':id/layers')
  addLayer(@Param('id') id: string, @Body() body: any) {
    return this.twin.addLayer(id, body || {});
  }

  @Get(':id/layers')
  layers(@Param('id') id: string) {
    return this.twin.listLayers(id);
  }

  // Wave33: Import operational Experience Plan from competition into the Twin graph
  @Post(':id/import/competition/:competitionId')
  importFromCompetition(@Param('id') id: string, @Param('competitionId') competitionId: string, @Body() body: any) {
    return this.twin.importFromCompetitionPlan(id, competitionId, body || {});
  }

  @Post(':id/simulations')
  createSimulation(@Param('id') id: string, @Body() body: any) {
    return this.twin.createSimulation(id, body || {});
  }

  @Get('simulations/list')
  listSimulations(@Query('twinId') twinId?: string, @Query('limit') limit?: string) {
    return this.twin.listSimulations({ twinId, limit: limit ? Number(limit) : undefined });
  }

  @Get('simulations/:runId')
  getSimulation(@Param('runId') runId: string) {
    return this.twin.getSimulation(runId);
  }

  @Post('simulations/:runId/run')
  runSimulation(@Param('runId') runId: string, @Body() body: any) {
    return this.twin.runSimulation(runId, body || {});
  }

  // Wave10: multi-scenario run (batch arrivals / closing station / reverse direction / A-B narrative)
  @Post('simulations/:runId/run-multi')
  runSimulationMulti(@Param('runId') runId: string, @Body() body: any) {
    return this.twin.runSimulationMulti(runId, body || {});
  }

  @Post('simulations/:runId/enqueue')
  enqueueSimulation(@Param('runId') runId: string) {
    return this.twin.enqueueSimulation(runId);
  }


  @Post(':id/scenarios')
  createScenario(@Param('id') id: string, @Body() body: any) {
    return this.twin.createScenario(id, body || {});
  }

  @Post(':id/simulate-flow')
  simulateFlow(@Param('id') id: string, @Body() body: any) {
    return this.twin.simulateFlowLite(id, body || {});
  }

  @Get(':id/load-thresholds')
  loadThresholds(@Param('id') id: string) {
    return this.twin.getLoadThresholds(id);
  }

  @Get(':id/scenario-results')
  scenarioResults(@Param('id') id: string, @Query('limit') limit?: string) {
    return this.twin.getScenarioResults(id, { limit: limit ? Number(limit) : undefined });
  }

  

@Post(':id/simulate-crowd')
simulateCrowd(@Param('id') id: string, @Body() body: any) {
  return this.twin.simulateCrowd(id, body || {});
}

@Post(':id/simulate-heritage-load')
simulateHeritageLoad(@Param('id') id: string, @Body() body: any) {
  return this.twin.simulateHeritageLoad(id, body || {});
}

@Post(':id/simulate-experience')
simulateExperience(@Param('id') id: string, @Body() body: any) {
  return this.twin.simulateExperienceOutcome(id, body || {});
}

@Get(':id/risk-zones')
riskZones(@Param('id') id: string) {
  return this.twin.getRiskZones(id);
}

@Get(':id/decision-summary')
decisionSummary(@Param('id') id: string) {
  return this.twin.getDecisionSummary(id);
}

@Post(':id/decision-summary/refresh')
refreshDecisionSummary(@Param('id') id: string, @Body() dto: RefreshTwinDecisionDto) {
  return this.twin.refreshDecisionSummary(id, dto as any);
}


@Public()
@Post('jobs/:jobId/process')
processTwinJob(@Param('jobId') jobId: string, @Req() req: any) {
  assertWorkerToken(req);
  return this.twin.processDecisionSummaryJob(jobId);
}

  @Post(':id/telemetry')
  ingestTelemetry(@Param('id') id: string, @Body() body: any) {
    return this.twin.ingestTelemetry(id, body || {});
  }

  @Get(':id/telemetry')
  telemetry(@Param('id') id: string, @Query('limit') limit?: string) {
    return this.twin.listTelemetry(id, { limit: limit ? Number(limit) : undefined });
  }

  // Wave33: 3D AI helper - analyze layers metadata and suggest tagging / placement
  @Post(':id/ai/analyze-layers')
  analyzeLayers(@Param('id') id: string, @Body() body: any) {
    return this.twin.analyzeLayersAi(id, body || {});
  }

  // Twin Agent: propose improvements based on latest simulation + telemetry
  @Post(':id/agents/optimize')
  optimize(@Param('id') id: string, @Body() body: any) {
    return this.twin.optimizeTwin(id, body || {});
  }
}
