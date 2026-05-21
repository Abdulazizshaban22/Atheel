import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CultureProgramsBrainService } from './culture-programs-brain.service';
import { RunCultureProgramsRetrievalDto } from './dto/run-culture-programs-retrieval.dto';
import { RunCultureProgramsEvalDto } from './dto/run-culture-programs-eval.dto';
import { IngestCultureProgramsCorpusDto } from './dto/ingest-culture-programs-corpus.dto';
import { LinkCultureProgramsEvidenceDto } from './dto/link-culture-programs-evidence.dto';
import { RunCultureProgramsQualityCheckDto } from './dto/run-culture-programs-quality-check.dto';

@ApiBearerAuth()
@Controller('domains/culture-programs')
export class CultureProgramsBrainController {
  constructor(private readonly service: CultureProgramsBrainService) {}
  @Roles('viewer','analyst','curator','org_admin','super_admin')
  @Get('summary') summary(@Query('organizationId') organizationId?: string) { return this.service.summary({ organizationId }); }
  @Get('agents') agents() { return this.service.agents(); }
  @Roles('analyst','curator','org_admin','super_admin')
  @Post('retrieve') retrieve(@Body() body: RunCultureProgramsRetrievalDto) { return this.service.retrieve(body); }
  @Post('evals/run') runEval(@Body() body: RunCultureProgramsEvalDto) { return this.service.runEval(body); }
  @Roles('viewer','analyst','curator','org_admin','super_admin')
  @Get('dashboard') dashboard(@Query('organizationId') organizationId?: string) { return this.service.dashboard({ organizationId }); }
  @Get('impact-partner-linkage') impactPartnerLinkage(@Query('organizationId') organizationId?: string) { return this.service.impactPartnerLinkage({ organizationId }); }
  @Roles('viewer','analyst','curator','org_admin','super_admin')
  @Get('corpus-admin') corpusAdmin(@Query('organizationId') organizationId?: string) { return this.service.corpusAdmin({ organizationId }); }
  @Roles('analyst','curator','org_admin','super_admin')
  @Post('ingest') ingest(@Body() body: IngestCultureProgramsCorpusDto) { return this.service.ingest(body); }
  @Roles('analyst','curator','org_admin','super_admin')
  @Post('quality/run') runQuality(@Body() body: RunCultureProgramsQualityCheckDto) { return this.service.runQualityCheck(body); }
  @Post('evidence/link') linkEvidence(@Body() body: LinkCultureProgramsEvidenceDto) { return this.service.linkEvidence(body); }
  @Roles('viewer','analyst','curator','org_admin','super_admin')
  @Get('vector-store') vectorStore(@Query('organizationId') organizationId?: string) { return this.service.vectorStore({ organizationId }); }
  @Roles('analyst','curator','org_admin','super_admin')
  @Post('vector-store/sync') syncVectorStore(@Body('organizationId') organizationId?: string) { return this.service.syncVectorStore({ organizationId }); }
  @Roles('viewer','analyst','curator','org_admin','super_admin')
  @Get('retrieval-contracts') retrievalContracts() { return this.service.retrievalContracts(); }
  @Get('readiness-linkage') readinessLinkage(@Query('organizationId') organizationId?: string) { return this.service.readinessLinkage({ organizationId }); }
}
