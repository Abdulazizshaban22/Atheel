import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { DestinationBrainService } from './destination-brain.service';
import { RunDestinationRetrievalDto } from './dto/run-destination-retrieval.dto';
import { RunDestinationEvalDto } from './dto/run-destination-eval.dto';
import { IngestDestinationCorpusDto } from './dto/ingest-destination-corpus.dto';
import { LinkDestinationEvidenceDto } from './dto/link-destination-evidence.dto';
import { RunDestinationQualityCheckDto } from './dto/run-destination-quality-check.dto';

@ApiBearerAuth()
@Controller('domains/destination')
export class DestinationBrainController {
  constructor(private readonly service: DestinationBrainService) {}

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
  ingest(@Body() body: IngestDestinationCorpusDto) {
    return this.service.ingest(body);
  }

  @Roles('''analyst''','''curator''','''org_admin''','''super_admin''')
  @Post('retrieve')
  retrieve(@Body() body: RunDestinationRetrievalDto) {
    return this.service.retrieve(body);
  }

  @Roles('''analyst''','''curator''','''org_admin''','''super_admin''')
  @Post('evals/run')
  runEval(@Body() body: RunDestinationEvalDto) {
    return this.service.runEval(body);
  }

  @Roles('''analyst''','''curator''','''org_admin''','''super_admin''')
  @Post('quality/run')
  qualityRun(@Body() body: RunDestinationQualityCheckDto) {
    return this.service.qualityCheck(body);
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
  @Get('readiness-linkage')
  readinessLinkage(@Query('organizationId') organizationId?: string) {
    return this.service.readinessLinkage({ organizationId });
  }

  @Roles('''analyst''','''curator''','''org_admin''','''super_admin''')
  @Post('evidence/link')
  linkEvidence(@Body() body: LinkDestinationEvidenceDto) {
    return this.service.linkEvidence(body);
  }

  @Roles('''viewer''','''analyst''','''curator''','''org_admin''','''super_admin''')
  @Get('dashboard')
  dashboard(@Query('organizationId') organizationId?: string) {
    return this.service.dashboard({ organizationId });
  }

  @Roles('''viewer''','''analyst''','''curator''','''org_admin''','''super_admin''')
  @Get('partner-programming-linkage')
  partnerProgrammingLinkage(@Query('organizationId') organizationId?: string) {
    return this.service.partnerProgrammingLinkage({ organizationId });
  }
}
