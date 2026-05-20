import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiTags } from '@nestjs/swagger';
import { MemoryRuntimeService } from './memory-runtime.service';

@ApiTags('memory-runtime')
@ApiBearerAuth()
@Controller('memory')
export class MemoryRuntimeController {
  constructor(private readonly service: MemoryRuntimeService) {}

  @Post('projects/:id/capture')
  capture(@Param('id') id: string, @Body() dto: any) {
    return this.service.captureProjectOutcome(id, dto);
  }

  @Get('domains/:domain/patterns')
  patterns(@Param('domain') domain: string) {
    return this.service.getPatterns(domain);
  }

  @Post('promote-pattern')
  promote(@Body() dto: any) {
    return this.service.promotePattern(dto);
  }

  @Post('agents/:id/feedback')
  feedback(@Param('id') id: string, @Body() dto: any) {
    return this.service.captureAgentFeedback(id, dto);
  }

  @Get('agents/:id/feedback')
  agentFeedback(@Param('id') id: string) {
    return this.service.getAgentFeedback(id);
  }

  @Get('domains/overview')
  domainOverview() {
    return this.service.domainOverview();
  }
}
