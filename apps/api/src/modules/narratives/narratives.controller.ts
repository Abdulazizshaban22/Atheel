import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { GenerateNarrativeDto } from './dto/generate-narrative.dto';
import { GenerateNarrativeABDto } from './dto/generate-narrative-ab.dto';
import { NarrativesService } from './narratives.service';
import { CheckNarrativeConsistencyDto } from './dto/check-narrative-consistency.dto';
import { CreateNarrativePolicyDto } from './dto/create-narrative-policy.dto';

@ApiBearerAuth()
@Controller('narratives')
export class NarrativesController {
  constructor(private readonly narratives: NarrativesService) {}

  @Get()
  list(@Query('ideaId') ideaId?: string, @Query('experienceId') experienceId?: string, @Query('twinId') twinId?: string) {
    return this.narratives.list({ ideaId, experienceId, twinId });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.narratives.get(id);
  }

  @Post('generate')
  generate(@Body() dto: GenerateNarrativeDto) {
    return this.narratives.generate(dto || {} as any);
  }

  @Post('generate/ab')
  generateAB(@Body() dto: GenerateNarrativeABDto) {
    return this.narratives.generateAB(dto || {} as any);
  }

  @Post('check-consistency')
  checkConsistency(@Body() dto: CheckNarrativeConsistencyDto) {
    return this.narratives.checkConsistency(dto || {} as any);
  }

  @Get('projects/:projectId/alignment')
  alignment(@Param('projectId') projectId: string) {
    return this.narratives.projectAlignment(projectId);
  }

  @Post('policies')
  createPolicy(@Body() dto: CreateNarrativePolicyDto) {
    return this.narratives.createPolicy(dto || {} as any);
  }
}
