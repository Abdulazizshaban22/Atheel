import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { MegaEventsBrainService } from './mega-events-brain.service';
import { RunMegaEventsRetrievalDto } from './dto/run-mega-events-retrieval.dto';
import { RunMegaEventsEvalDto } from './dto/run-mega-events-eval.dto';
import { IngestMegaEventsCorpusDto } from './dto/ingest-mega-events-corpus.dto';
import { LinkMegaEventsEvidenceDto } from './dto/link-mega-events-evidence.dto';
import { RunMegaEventsQualityCheckDto } from './dto/run-mega-events-quality-check.dto';

@ApiBearerAuth()
@Controller('domains/mega-events')
export class MegaEventsBrainController {
  constructor(private readonly service: MegaEventsBrainService) {}

  @Roles('''viewer''','''analyst''','''curator''','''org_admin''','''super_admin''')
  @Get('summary')
  summary(@Query('organizationId') organizationId?: string, @Query('city') city?: string) {
    return this.service.summary({ organizationId, city });
  }

  @Roles('''viewer''','''analyst''','''curator''','''org_admin''','''super_admin''')
  @Get('agents')
  agents() {
    return this.service.agents();
  }

  @Roles('''viewer''','''analyst''','''curator''','''org_admin''','''super_admin''')
  @Get('corpus-admin')
  corpusAdmin(@Query('organizationId') organizationId?: string) {
    return this.service.corpusAdmin({ organizationId });
  }

  @Roles('''analyst''','''curator''','''org_admin''','''super_admin''')
  @Post('ingest')
  ingest(@Body() input: IngestMegaEventsCorpusDto) {
    return this.service.ingest(input);
  }

  @Roles('''analyst''','''curator''','''org_admin''','''super_admin''')
  @Post('retrieve')
  retrieve(@Body() input: RunMegaEventsRetrievalDto) {
    return this.service.retrieve(input);
  }

  @Roles('''analyst''','''curator''','''org_admin''','''super_admin''')
  @Post('evals/run')
  runEval(@Body() input: RunMegaEventsEvalDto) {
    return this.service.runEval(input);
  }

  @Roles('''analyst''','''curator''','''org_admin''','''super_admin''')
  @Post('quality/run')
  qualityRun(@Body() input: RunMegaEventsQualityCheckDto) {
    return this.service.qualityCheck(input);
  }

  @Roles('''viewer''','''analyst''','''curator''','''org_admin''','''super_admin''')
  @Get('vector-store')
  vectorStore() {
    return this.service.vectorStore();
  }

  @Roles('''analyst''','''curator''','''org_admin''','''super_admin''')
  @Post('vector-store/sync')
  syncVectorStore(@Query('organizationId') organizationId?: string, @Query('city') city?: string) {
    return this.service.syncVectorStore({ organizationId, city });
  }

  @Roles('''viewer''','''analyst''','''curator''','''org_admin''','''super_admin''')
  @Get('retrieval-contracts')
  retrievalContracts() {
    return this.service.retrievalContracts();
  }

  @Roles('''viewer''','''analyst''','''curator''','''org_admin''','''super_admin''')
  @Get('readiness-stage-gate-linkage')
  readinessStageGateLinkage(@Query('organizationId') organizationId?: string) {
    return this.service.readinessStageGateLinkage({ organizationId });
  }

  @Roles('''viewer''','''analyst''','''curator''','''org_admin''','''super_admin''')
  @Get('crowd-twin-linkage')
  crowdTwinLinkage(@Query('organizationId') organizationId?: string) {
    return this.service.crowdTwinLinkage({ organizationId });
  }

  @Roles('''viewer''','''analyst''','''curator''','''org_admin''','''super_admin''')
  @Get('twin-stage-gate-linkage')
  twinStageGateLinkage(@Query('organizationId') organizationId?: string) {
    return this.service.twinStageGateLinkage({ organizationId });
  }

  @Roles('''analyst''','''curator''','''org_admin''','''super_admin''')
  @Post('evidence/link')
  linkEvidence(@Body() input: LinkMegaEventsEvidenceDto) {
    return this.service.linkEvidence(input);
  }

  @Roles('''viewer''','''analyst''','''curator''','''org_admin''','''super_admin''')
  @Get('dashboard')
  dashboard(@Query('organizationId') organizationId?: string) {
    return this.service.dashboard({ organizationId });
  }

  @Roles('''viewer''','''analyst''','''curator''','''org_admin''','''super_admin''')
  @Get('readiness-crowd-linkage')
  linkage(@Query('organizationId') organizationId?: string) {
    return this.service.readinessCrowdLinkage({ organizationId });
  }

  @Roles('''viewer''','''analyst''','''curator''','''org_admin''','''super_admin''')
  @Get('metadata-schema')
  metadataSchema() {
    return this.service.metadataSchema();
  }
}
