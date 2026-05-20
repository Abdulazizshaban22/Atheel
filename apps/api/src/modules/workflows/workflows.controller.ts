import { Body, Controller, Get, Param, Post, Query, Req, UsePipes, ValidationPipe } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../auth/decorators/public.decorator';
import { WorkflowsService } from './workflows.service';
import { EnqueueWorkflowExecutionDto } from './dto/enqueue-execution.dto';
import { DispatchNextWorkflowDto } from './dto/dispatch-next.dto';
import { TickExecutionDto } from './dto/tick-execution.dto';
import { CompleteDeferredStepDto } from './dto/complete-step.dto';
import { ExecutionActionDto } from './dto/execution-action.dto';
import { ExportPackDto } from './dto/export-pack.dto';
import { InstantiateWorkflowDto } from './dto/instantiate.dto';
import { SimulateWorkflowRunDto } from './dto/simulate-run.dto';
import { SaveTemplateGraphDto } from './dto/save-template-graph.dto';
import type { Request } from 'express';
import { assertWorkerToken } from '../../common/security/worker-token';

const StrictBodyPipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });

@Controller('workflows')
export class WorkflowsController {
  constructor(private readonly workflows: WorkflowsService) {}

  @Get('catalog/summary')
  summary() {
    return this.workflows.getSummary();
  }

  @Get('catalog')
  listCatalog(
    @Query('q') q?: string,
    @Query('domain') domain?: any,
    @Query('intent') intent?: any,
    @Query('trigger') trigger?: any,
    @Query('complexity') complexity?: any,
    @Query('audience') audience?: any,
    @Query('limit') limit?: string,
  ) {
    return this.workflows.listCatalog({
      q,
      domain,
      intent,
      trigger,
      complexity,
      audience,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('catalog/:idOrCode')
  getTemplate(@Param('idOrCode') idOrCode: string) {
    return this.workflows.getTemplate(idOrCode);
  }

  @Get('catalog/:idOrCode/graph')
  getTemplateGraph(@Param('idOrCode') idOrCode: string) {
    return this.workflows.getTemplateGraph(idOrCode);
  }

  @Post('catalog/:idOrCode/graph')
  @UsePipes(StrictBodyPipe)
  saveTemplateGraph(@Param('idOrCode') idOrCode: string, @Body() dto: SaveTemplateGraphDto) {
    return this.workflows.saveTemplateGraph(idOrCode, { nodes: dto?.nodes ?? [], edges: dto?.edges ?? [], meta: dto?.viewport });
  }


  @Get('instances')
  listInstances(
    @Query('organizationId') organizationId?: string,
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
  ) {
    return this.workflows.listInstances({ organizationId, projectId, status });
  }

  @Post('instances')
  @UsePipes(StrictBodyPipe)
  instantiate(@Body() dto: InstantiateWorkflowDto) {
    return this.workflows.instantiate(dto || {});
  }

  @Get('runs')
  listRuns(
    @Query('organizationId') organizationId?: string,
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    return this.workflows.listRuns({ organizationId, projectId, status, limit: limit ? Number(limit) : undefined });
  }

  @Post('runs/simulate')
  @UsePipes(StrictBodyPipe)
  simulate(@Body() dto: SimulateWorkflowRunDto) {
    return this.workflows.simulateRun(dto || {});
  }

  @Get('executions')
  listExecutions(
    @Query('organizationId') organizationId?: string,
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('sort') sort?: 'queue' | 'createdAt',
  ) {
    return this.workflows.listExecutions({ organizationId, projectId, status, limit: limit ? Number(limit) : undefined, sort });
  }

  @Get('executions/scheduler/snapshot')
  schedulerSnapshot(
    @Query('organizationId') organizationId?: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.workflows.schedulerSnapshot({ organizationId, projectId });
  }

  @Post('executions/enqueue')
  @UsePipes(StrictBodyPipe)
  enqueueExecution(@Body() dto: EnqueueWorkflowExecutionDto) {
    return this.workflows.enqueueExecution(dto || {});
  }

  @Post('executions/dispatch-next')
  @UsePipes(StrictBodyPipe)
  dispatchNext(@Body() dto: DispatchNextWorkflowDto) {
    return this.workflows.dispatchNextFromQueue(dto || {});
  }

  @Get('executions/:id')
  getExecution(@Param('id') id: string) {
    return this.workflows.getExecution(id);
  }

  @Post('executions/:id/tick')
  @Public()
  @SkipThrottle({ default: true, auth: true })
  @UsePipes(StrictBodyPipe)
  tickExecution(@Param('id') id: string, @Body() dto: TickExecutionDto, @Req() req: Request) {
    // Worker-only public endpoint: protected by X-Worker-Token
    assertWorkerToken(req);
    return this.workflows.tickExecution(id, dto || {});
  }

  // Worker endpoint: completes an async-deferred step and re-queues the execution.
  @Post('executions/:id/steps/:stepId/complete')
  @Public()
  @SkipThrottle({ default: true, auth: true })
  @UsePipes(StrictBodyPipe)
  completeStepFromWorker(@Param('id') id: string, @Param('stepId') stepId: string, @Body() dto: CompleteDeferredStepDto, @Req() req: Request) {
    assertWorkerToken(req);
    return this.workflows.completeDeferredStep(id, stepId, dto || {});
  }


  // Worker-only escalation endpoint (bypasses JWT; protected by X-Worker-Token)
  @Post('worker/executions/:id/escalate')
  @Public()
  @SkipThrottle({ default: true, auth: true })
  escalateExecutionFromWorker(@Param('id') id: string, @Req() req: Request) {
    assertWorkerToken(req);
    return this.workflows.evaluateSlaAndEscalate(id);
  }

  // Authenticated escalation endpoint (kept for admins / ops tooling)
  @Post('executions/:id/escalate')
  escalateExecution(@Param('id') id: string) {
    return this.workflows.evaluateSlaAndEscalate(id);
  }

  @Post('executions/:id/action')
  @UsePipes(StrictBodyPipe)
  executionAction(@Param('id') id: string, @Body() dto: ExecutionActionDto) {
    return this.workflows.executionAction(id, dto || {});
  }

  @Get('packs')
  listPacks() {
    return this.workflows.listPacks();
  }

  @Post('packs/export')
  @UsePipes(StrictBodyPipe)
  exportPack(@Body() dto: ExportPackDto) {
    return this.workflows.exportPack(dto || {});
  }
}
