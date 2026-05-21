import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ExhibitionBrainService } from './exhibition-brain.service';
import { RunExhibitionRetrievalDto } from './dto/run-exhibition-retrieval.dto';
import { RunExhibitionEvalDto } from './dto/run-exhibition-eval.dto';
import { IngestExhibitionCorpusDto } from './dto/ingest-exhibition-corpus.dto';
import { LinkExhibitionEvidenceDto } from './dto/link-exhibition-evidence.dto';
import { RunExhibitionQualityCheckDto } from './dto/run-exhibition-quality-check.dto';

@ApiBearerAuth()
@Controller('domains/exhibition')
export class ExhibitionBrainController {
  constructor(private readonly service: ExhibitionBrainService) {}
  @Roles('viewer','analyst','curator','org_admin','super_admin')
  @Get('summary') summary(@Query('organizationId') organizationId?: string) { return this.service.summary({ organizationId }); }
  @Get('agents') agents() { return this.service.agents(); }
  @Roles('analyst','curator','org_admin','super_admin')
  @Post('retrieve') retrieve(@Body() body: RunExhibitionRetrievalDto) { return this.service.retrieve(body); }
  @Post('evals/run') runEval(@Body() body: RunExhibitionEvalDto) { return this.service.runEval(body); }
  @Roles('viewer','analyst','curator','org_admin','super_admin')
  @Get('dashboard') dashboard(@Query('organizationId') organizationId?: string) { return this.service.dashboard({ organizationId }); }
  @Get('studio-experience-linkage') studioExperienceLinkage(@Query('organizationId') organizationId?: string) { return this.service.studioExperienceLinkage({ organizationId }); }
  @Roles('viewer','analyst','curator','org_admin','super_admin')
  @Get('corpus-admin') corpusAdmin(@Query('organizationId') organizationId?: string) { return this.service.corpusAdmin({ organizationId }); }
  @Roles('analyst','curator','org_admin','super_admin')
  @Post('ingest') ingest(@Body() body: IngestExhibitionCorpusDto) { return this.service.ingest(body); }
  @Roles('analyst','curator','org_admin','super_admin')
  @Post('quality/run') runQuality(@Body() body: RunExhibitionQualityCheckDto) { return this.service.runQualityCheck(body); }
  @Post('evidence/link') linkEvidence(@Body() body: LinkExhibitionEvidenceDto) { return this.service.linkEvidence(body); }
  @Roles('viewer','analyst','curator','org_admin','super_admin')
  @Get('vector-store') vectorStore(@Query('organizationId') organizationId?: string) { return this.service.vectorStore({ organizationId }); }
  @Roles('analyst','curator','org_admin','super_admin')
  @Post('vector-store/sync') syncVectorStore(@Body('organizationId') organizationId?: string) { return this.service.syncVectorStore({ organizationId }); }
  @Roles('viewer','analyst','curator','org_admin','super_admin')
  @Get('retrieval-contracts') retrievalContracts() { return this.service.retrievalContracts(); }
  @Get('readiness-linkage') readinessLinkage(@Query('organizationId') organizationId?: string) { return this.service.readinessLinkage({ organizationId }); }
}
