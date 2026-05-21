import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { HeritageBrainService } from './heritage-brain.service';
import { RunHeritageRetrievalDto } from './dto/run-heritage-retrieval.dto';
import { IngestHeritageCorpusDto } from './dto/ingest-heritage-corpus.dto';
import { PolicyAwareHeritageRetrievalDto } from './dto/policy-aware-heritage-retrieval.dto';
import { LinkHeritageEvidenceDto } from './dto/link-heritage-evidence.dto';
import { GetHeritageVectorStoreDto } from './dto/get-heritage-vector-store.dto';
import { SyncHeritageVectorStoreDto } from './dto/sync-heritage-vector-store.dto';
import { RunHeritageQualityCheckDto } from './dto/run-heritage-quality-check.dto';

@ApiTags('domains/heritage')
@ApiBearerAuth()
@Controller('domains/heritage')
export class HeritageBrainController {
  constructor(private readonly service: HeritageBrainService) {}

  @Roles('viewer','analyst','curator','content_editor','experience_designer','org_admin','super_admin')
  @Get('summary')
  summary() {
    return this.service.summary();
  }

  @Roles('viewer','analyst','curator','content_editor','experience_designer','org_admin','super_admin')
  @Get('agents')
  agents() {
    return this.service.agents();
  }

  @Roles('analyst','curator','content_editor','experience_designer','org_admin','super_admin')
  @Post('retrieve')
  retrieve(@Body() body: RunHeritageRetrievalDto) {
    return this.service.retrieve(body);
  }

  @Roles('analyst','org_admin','super_admin')
  @Post('evals/run')
  runEval(@Body() body: RunHeritageRetrievalDto) {
    return this.service.runEval(body);
  }

  @Roles('viewer','analyst','curator','org_admin','super_admin')
  @Get('dashboard')
  dashboard() {
    return this.service.dashboard();
  }

  @Roles('analyst','curator','org_admin','super_admin')
  @Get('corpus-admin')
  corpusAdmin() {
    return this.service.corpusAdmin();
  }

  @Roles('curator','content_editor','org_admin','super_admin')
  @Post('ingest')
  ingest(@Body() body: IngestHeritageCorpusDto) {
    return this.service.ingest(body);
  }

  @Roles('analyst','curator','experience_designer','org_admin','super_admin')
  @Post('retrieve/policy-aware')
  policyAwareRetrieve(@Body() body: PolicyAwareHeritageRetrievalDto) {
    return this.service.policyAwareRetrieve(body);
  }

  @Roles('curator','content_editor','org_admin','super_admin')
  @Post('evidence/link')
  linkEvidence(@Body() body: LinkHeritageEvidenceDto) {
    return this.service.linkEvidence(body);
  }

  @Roles('analyst','org_admin','super_admin')
  @Get('vector-store')
  vectorStore(@Body() body: GetHeritageVectorStoreDto) {
    return this.service.vectorStore(body);
  }

  @Roles('org_admin','super_admin')
  @Post('vector-store/sync')
  syncVectorStore(@Body() body: SyncHeritageVectorStoreDto) {
    return this.service.syncVectorStore(body);
  }

  @Roles('analyst','org_admin','super_admin')
  @Get('retrieval-contracts')
  retrievalContracts() {
    return this.service.retrievalContracts();
  }

  @Roles('analyst','org_admin','super_admin')
  @Post('quality/run')
  qualityRun(@Body() body: RunHeritageQualityCheckDto) {
    return this.service.runQualityCheck(body);
  }

  @Roles('analyst','org_admin','super_admin')
  @Get('readiness-linkage')
  readinessLinkage() {
    return this.service.readinessLinkage();
  }

}

