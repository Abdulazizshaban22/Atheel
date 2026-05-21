import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { ImpactService } from './impact.service';
import { CreateImpactFrameworkDto } from './dto/create-impact-framework.dto';
import { CreateLegacyOutcomeDto } from './dto/create-legacy-outcome.dto';

@ApiBearerAuth()
@Controller('impact')
export class ImpactController {
  constructor(private readonly impact: ImpactService) {}

  @Post('score')
  score(@Body() body: any) {
    return this.impact.scoreFromSimulation(body || {});
  }

  @Get('snapshots')
  snapshots(@Query('projectId') projectId?: string, @Query('experienceId') experienceId?: string) {
    return this.impact.listSnapshots({ projectId, experienceId });
  }

  @Get('leaderboard')
  leaderboard(@Query('limit') limit?: string) {
    return this.impact.leaderboard(limit ? Number(limit) : 20);
  }

  @Post('frameworks')
  createFramework(@Body() body: CreateImpactFrameworkDto) {
    return this.impact.createFramework(body || {} as any);
  }

  @Get('projects/:projectId')
  projectImpact(@Query() _q: any, @Param('projectId') projectId: string) {
    return this.impact.projectImpact(projectId);
  }

  @Post('legacy/projects/:projectId/outcomes')
  createLegacy(@Param('projectId') projectId: string, @Body() body: CreateLegacyOutcomeDto) {
    return this.impact.createLegacyOutcome({ ...(body || {}), projectId });
  }

  @Get('legacy/seasons/:seasonId/report')
  seasonLegacyReport(@Param('seasonId') seasonId: string) {
    return this.impact.seasonLegacyReport(seasonId);
  }

}

