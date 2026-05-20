import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiTags } from '@nestjs/swagger';
import { AgentRuntimeService } from './agent-runtime.service';
import { ExecuteAgentRuntimeDto } from './dto/execute-agent-runtime.dto';

@ApiTags('agent-runtime')
@ApiBearerAuth()
@Controller('ai/runtime')
export class AgentRuntimeController {
  constructor(private readonly service: AgentRuntimeService) {}

  @Post('execute')
  execute(@Body() dto: ExecuteAgentRuntimeDto) {
    return this.service.execute(dto, false);
  }

  @Post('execute/background')
  executeBackground(@Body() dto: ExecuteAgentRuntimeDto) {
    return this.service.execute(dto, true);
  }

  @Get('jobs/:id')
  getJob(@Param('id') id: string) {
    return this.service.getJob(id);
  }

  @Get('jobs')
  listJobs(@Query('domain') domain?: string) {
    return this.service.listJobs(domain);
  }

  @Post('jobs/:id/retry')
  retry(@Param('id') id: string) {
    return this.service.retryJob(id);
  }

  @Post('jobs/:id/escalate')
  escalate(@Param('id') id: string) {
    return this.service.escalateJob(id);
  }

  @Post('jobs/:id/process')
  process(@Param('id') id: string) {
    return this.service.processJob(id);
  }

  @Get('overview')
  overview() {
    return this.service.executionOverview();
  }
}
