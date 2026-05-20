import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ProgramsService } from './programs.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { GenerateDestinationRecommendationsDto } from './dto/generate-destination-recommendations.dto';

@Controller('programs')
export class ProgramsController {
  constructor(private readonly service: ProgramsService) {}

  @Get()
  list(@Query('organizationId') organizationId?: string, @Query('status') status?: string, @Query('q') q?: string) {
    return this.service.list({ organizationId, status, q });
  }

  @Get('portfolio/summary')
  portfolioSummary(@Query('organizationId') organizationId?: string) {
    return this.service.portfolioSummary(organizationId);
  }

  @Get('destination-brain/summary')
  destinationBrainSummary(@Query('organizationId') organizationId?: string, @Query('city') city?: string, @Query('destinationType') destinationType?: string) {
    return this.service.destinationBrainSummary({ organizationId, city, destinationType });
  }

  @Get('destination-brain/gaps')
  destinationBrainGaps(@Query('organizationId') organizationId?: string, @Query('city') city?: string, @Query('destinationType') destinationType?: string) {
    return this.service.destinationBrainGaps({ organizationId, city, destinationType });
  }

  @Get('destination-brain/conflicts')
  destinationBrainConflicts(@Query('organizationId') organizationId?: string, @Query('city') city?: string, @Query('destinationType') destinationType?: string) {
    return this.service.destinationBrainConflicts({ organizationId, city, destinationType });
  }

  @Post('destination-brain/recommendations')
  generateDestinationRecommendations(@Body() body: GenerateDestinationRecommendationsDto, @CurrentUser() user?: RequestUser) {
    return this.service.generateDestinationRecommendations(body || {}, user);
  }

  @Post()
  create(@Body() body: any, @CurrentUser() user?: RequestUser) {
    return this.service.create(body || {}, user);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.service.update(id, body || {});
  }

  @Post(':id/projects/attach')
  attachProject(@Param('id') id: string, @Body('projectId') projectId: string) {
    return this.service.attachProject(id, String(projectId || ''));
  }

  @Post(':id/workflow-instances/attach')
  attachWorkflowInstance(@Param('id') id: string, @Body('instanceId') instanceId: string) {
    return this.service.attachWorkflowInstance(id, String(instanceId || ''));
  }
}
