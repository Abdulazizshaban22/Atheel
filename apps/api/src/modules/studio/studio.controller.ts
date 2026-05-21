import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { assertWorkerToken } from '../../common/security/worker-token';
import { StudioService } from './studio.service';
import { GenerateConceptDto } from './dto/generate-concept.dto';
import { ComposeStudioNarrativeDto } from './dto/compose-studio-narrative.dto';
import { BuildStudioBlueprintDto } from './dto/build-studio-blueprint.dto';
import { CreateAssetPackDto } from './dto/create-asset-pack.dto';
import { CheckStudioConsistencyDto } from './dto/check-studio-consistency.dto';
import { RefreshCreativeBoardDto } from './dto/refresh-creative-board.dto';

@ApiTags('studio')
@ApiBearerAuth()
@Controller('studio')
export class StudioController {
  constructor(private readonly service: StudioService) {}

  @Post('concepts/generate')
  generateConcept(@Body() dto: GenerateConceptDto) { return this.service.generateConcept(dto); }

  @Post('narratives/compose')
  composeNarrative(@Body() dto: ComposeStudioNarrativeDto) { return this.service.composeNarrative(dto); }

  @Post('experience/blueprint')
  buildBlueprint(@Body() dto: BuildStudioBlueprintDto) { return this.service.buildExperienceBlueprint(dto); }

  @Post('assets/pack')
  createAssetPack(@Body() dto: CreateAssetPackDto) { return this.service.createAssetPack(dto); }

  @Post('consistency/check')
  checkConsistency(@Body() dto: CheckStudioConsistencyDto) { return this.service.checkConsistency(dto); }

  @Get('projects/:id/creative-board')
  getCreativeBoard(@Param('id') id: string) { return this.service.getCreativeBoard(id); }

  @Post('projects/:id/creative-board/refresh')
  refreshCreativeBoard(@Param('id') id: string, @Body() dto: RefreshCreativeBoardDto) { return this.service.refreshCreativeBoard(id, dto as any); }

  @Public()
  @Post('jobs/:jobId/process')
  processStudioJob(@Param('jobId') jobId: string, @Req() req: any) {
    assertWorkerToken(req);
    return this.service.processCreativeBoardJob(jobId);
  }
}
